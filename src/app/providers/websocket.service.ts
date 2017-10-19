import { Injectable } from '@angular/core';
import { Observable, Subject, BehaviorSubject } from 'rxjs/Rx';
import * as Rx from 'rxjs/Rx';
import { Logger } from 'angular2-logger/core';
import { ServerDefinition } from '../domain/websocket-types';
import { LocalStorageService } from "ngx-store";
import { AppConstants } from '../domain/app-constants';

import { QueueingSubject } from 'queueing-subject';
import websocketConnect from 'rxjs-websockets';
import { Connection } from 'rxjs-websockets';

@Injectable()
export class WebsocketService {

    private TEST_SERVERS: Array<ServerDefinition> = [
        { server_id: 'wst01', server_url: 'ws://lnx06.jochems.com:7007/', response_time: -1 },
        { server_id: 'wst02', server_url: 'ws://lnx07.jochems.com:7007/', response_time: -1 }
    ];
    private PROD_SERVERS: Array<any> = [
        { server_id: 'ws01', server_url: 'wss://ws01.casinocoin.org:7007/', response_time: -1 },
        { server_id: 'ws02', server_url: 'wss://ws02.casinocoin.org:7007/', response_time: -1 },
        { server_id: 'ws03', server_url: 'wss://ws03.casinocoin.org:7007/', response_time: -1 },
        { server_id: 'ws04', server_url: 'wss://ws04.casinocoin.org:7007/', response_time: -1 }
    ];

    private currentServerFound: boolean = false;
    private currentServer: ServerDefinition;
    private socketSubject: Rx.Subject<MessageEvent>;    
    private ws : any;
    public sendingCommands = new QueueingSubject<string>();
    public websocketConnection: Connection;

    private connected = new BehaviorSubject<boolean>(false); // true is your initial value
    isConnected$ = this.connected.asObservable();
    private set isConnected(value: boolean) { this.connected.next(value); }
    private get isConnected():boolean { return this.connected.getValue(); }

    private input = new QueueingSubject<string>();

  constructor( private logger:Logger, private localStorageService: LocalStorageService ) {
    logger.debug("### INIT WebsocketService ###");
    const connectToProduction: boolean = localStorageService.get(AppConstants.KEY_PRODUCTION_NETWORK);
    logger.debug("### WebsocketService - connect to production?: " + connectToProduction);
    if(connectToProduction != null) {
      this.findBestServer(connectToProduction).subscribe( result => {
        if(result){
          if(!this.currentServerFound){
            this.logger.debug("### findBestServer - Connect Current Server: " + JSON.stringify(this.currentServer));
            this.currentServerFound = true;
          } else {
            this.logger.debug("### findBestServer - Faster Server Found -> Connect: " + JSON.stringify(this.currentServer));
          }
          this.connect();
        } else {
          if(!this.currentServerFound){
            this.logger.debug("### findBestServer - No best server found yet!!");
          }
        }
      });
    } else {
      // setup has not being done so divert server connect
      logger.debug("### WebsocketService - Setup not done so divert server connect!");
    }
    //this.messages = <Subject<any>>this.connect(connectToProduction);
        // .map((response: MessageEvent): any => {
        //     let data = JSON.parse(response.data);
        //     return data;
        // });
  }


  findBestServer(production: boolean): Observable<boolean> {
    let findCompleteSubject = new Subject<boolean>();
    if( !production || (production === null)) {
      // Find TEST Server
      if(!this.currentServer){
        this.currentServer = { server_id: '', server_url: '', response_time: -1 };
      }
      let serverResponses = 0;
      this.TEST_SERVERS.forEach( (value, index, arr) => {
        this.logger.debug("### findBestServer - connect to: " + JSON.stringify(value));
        let request_time = Date.now();
        const commands = new QueueingSubject<string>();
        const websocket: Connection = websocketConnect(value.server_url, commands);
        // the connectionStatus stream will provides the current number of websocket
        // connections immediately to each new observer and updates as it changes
        const connectionStatusSubscription = websocket.connectionStatus.subscribe(numberConnected => {
          this.logger.debug('### findBestServer - id: '+value.server_id + ' number of connected websockets:', numberConnected);
          if(numberConnected > 0) {
            // we have an open socket now send a ping
            commands.next(JSON.stringify({id: value.server_id, command: 'ping'}));
          }
        });
        // the websocket connection is created lazily when the messages observable is subscribed to
        const messagesSubscription = websocket.messages.subscribe((message: string) => {
          this.logger.debug('### findBestServer - id: ' + value.server_id + ', received message:' + message);
          let responseTime = Date.now() - request_time;
          this.logger.debug('### findBestServer id: ' + value.server_id + ' response: ' + responseTime);
          // only connect to a server if its response time was below 10 seconds otherwise its of no use
          if((this.currentServer.response_time == -1) && responseTime < 10000){
            // we found our first server
            this.currentServer = value;
            this.currentServer.response_time = responseTime;
            serverResponses += 1;
            findCompleteSubject.next(true);
          } else if (this.currentServer.response_time > 0 && (responseTime < this.currentServer.response_time)) {
            // we found a faster server than before
            this.currentServer = value;
            this.currentServer.response_time = responseTime;
            serverResponses += 1;
            findCompleteSubject.next(true);
          } else {
            findCompleteSubject.next(false);
          }
          // check if all servers responded or timed-out
          this.logger.debug("### findBestServer - serverResponses: ", serverResponses, " total servers: ", this.TEST_SERVERS.length);
          if(serverResponses == this.TEST_SERVERS.length){
            // close find server subscriptions
            this.logger.debug("### findBestServer - Unsubscribe and Close");
            connectionStatusSubscription.unsubscribe();
            messagesSubscription.unsubscribe();
          }
        }, (error) => {
          this.logger.debug('### findBestServer - id: ' + value.server_id + ', error: ' + ', response time: ' + (Date.now() - request_time));
          serverResponses += 1;
          findCompleteSubject.next(false);
          // check if all servers responded or timed-out
          this.logger.debug("### findBestServer - serverResponses: ", serverResponses, " total servers: ", this.TEST_SERVERS.length);
          if(serverResponses == this.TEST_SERVERS.length){
            // close find server subscriptions
            this.logger.debug("### findBestServer - Unsubscribe and Close");
            connectionStatusSubscription.unsubscribe();
            messagesSubscription.unsubscribe();
          }
        }, () => {
          this.logger.debug('### findBestServer - id: ' + value.server_id + ', completed');
        });
      });
    }
    return findCompleteSubject.asObservable();
  }

  connect() {
    this.logger.debug("### WebsocketService - connect(): ", this.currentServer.server_url);
    this.websocketConnection = websocketConnect(this.currentServer.server_url, this.sendingCommands);
    const connectionStatusSubscription = this.websocketConnection.connectionStatus.subscribe(numberConnected => {
      this.logger.debug('### WebsocketService - server: '+ this.currentServer.server_id + ' number of connected websockets:', numberConnected);
      this.isConnected = true;
      if(numberConnected > 0) {
        // we have an open socket now send a ping
        this.logger.debug("### WebsocketService - Connected to server: " + this.currentServer.server_url);
      }
    });
  }

  // connect(): Rx.Subject<MessageEvent> {
  //   // Check if we have an open WebSocket already
  //   let server_index = 0;
  //   if (!this.socketSubject) {
  //     this.logger.debug("### No soccket -> open new");
  //     this.logger.debug("### connect to: " + JSON.stringify(this.current_server));
  //     this.socketSubject = this.create(this.current_server.server_url);
  //   } 
  //   // return the Socket to the requester
  //   return this.socketSubject;
  // }

  // private create(url): Rx.Subject<MessageEvent> {
  //   this.ws = new WebSocket(url);
  //   let observable = Rx.Observable.create(
  //     (obs: Rx.Observer<MessageEvent>) => {
  //         this.ws.onmessage = obs.next.bind(obs);
  //         this.ws.onerror = obs.error.bind(obs);
  //         this.ws.onclose = obs.complete.bind(obs);
  //         return this.ws.close.bind(this.ws);
  //     });
  //   let observer = {
  //       next: (data: Object) => {
  //         this.logger.debug(data);
  //           if (this.ws.readyState === WebSocket.OPEN) {
  //               this.ws.send(JSON.stringify(data));
  //           }
  //       }
  //   }
  //   return Rx.Subject.create(observer, observable);
  // }

}

/*
import { Injectable } from '@angular/core';
import { QueueingSubject } from 'queueing-subject';
import { Observable } from 'rxjs/Observable';
import   websocketConnect from 'rxjs-websockets';
import { Logger } from 'angular2-logger/core';


@Injectable()
export class WebsocketService {

  private inputStream: QueueingSubject<string>;
  public messages: Observable<string>;

  constructor(private logger: Logger) {
    this.logger.debug("### INIT WebsocketService ###");
  }

  public connect(url: string) {
    this.logger.debug("WebsocketService Connect: " + url);
    if (this.messages)
      return;

    // Using share() causes a single websocket to be created when the first
    // observer subscribes. This socket is shared with subsequent observers
    // and closed when the observer count falls to zero.
    this.messages = websocketConnect(
      url,
      this.inputStream = new QueueingSubject<string>()
    ).messages.share()
  }

  public send(message: Object):void {
    // If the websocket is not connected then the QueueingSubject will ensure
    // that messages are queued and delivered when the websocket reconnects.
    // A regular Subject can be used to discard messages sent when the websocket
    // is disconnected.
    this.inputStream.next(JSON.stringify(message));
  }
}
*/

/*
import { Injectable } from '@angular/core';
import * as Rx from 'rxjs/Rx';
import { Logger } from 'angular2-logger/core';

@Injectable()
export class WebsocketService {

  constructor(private logger: Logger) { }

  private subject: Rx.Subject<MessageEvent>;

  public connect(url): Rx.Subject<MessageEvent> {
    if (!this.subject) {
      this.subject = this.create(url);
      this.logger.info("Successfully connected: " + url);
    } 
    return this.subject;
  }

  private create(url): Rx.Subject<MessageEvent> {
    let ws = new WebSocket(url);

    let observable = Rx.Observable.create(
    (obs: Rx.Observer<MessageEvent>) => {
        ws.onmessage = obs.next.bind(obs);
        ws.onerror = obs.error.bind(obs);
        ws.onclose = obs.complete.bind(obs);
        return ws.close.bind(ws);
    })
  
    let observer = {
        next: (data: Object) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(data));
            }
        }
    }
    return Rx.Subject.create(observer, observable);
  }

}
*/