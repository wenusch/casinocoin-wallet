import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs/Rx';
import * as Rx from 'rxjs/Rx';
import { Logger } from 'angular2-logger/core';
import { ServerDefinition } from '../domain/websocket-types';
import { LocalStorageService } from "ngx-store";
import { AppConstants } from '../domain/app-constants';

import { QueueingSubject } from 'queueing-subject'
import websocketConnect from 'rxjs-websockets'

@Injectable()
export class WebsocketService {

    private current_server: ServerDefinition;

    private TEST_SERVERS: Array<ServerDefinition> = [
        { server_id: 'wst01', server_url: 'ws://lnx06.jochems.com:7007/', response_time: -1 },
        { server_id: 'wst02', server_url: 'ws://lnx07.jochems.com:7007/', response_time: -1 }
    ];
    private PROD_SERVERS: Array<any> = [
        { server_id: 'ws01', server_url: 'ws://ws01.casinocoin.org:7007/', response_time: -1 },
        { server_id: 'ws02', server_url: 'ws://ws02.casinocoin.org:7007/', response_time: -1 },
        { server_id: 'ws03', server_url: 'ws://ws03.casinocoin.org:7007/', response_time: -1 },
        { server_id: 'ws04', server_url: 'ws://ws04.casinocoin.org:7007/', response_time: -1 }
    ];

    private socketSubject: Rx.Subject<MessageEvent>;    
    private ws : any;
    public ws_messages: Subject<any>;

    private input = new QueueingSubject<string>();

  constructor( private logger:Logger, private localStorageService: LocalStorageService ) {
    logger.debug("### INIT WebsocketService ###");
    const connectToProduction: boolean = localStorageService.get(AppConstants.KEY_PRODUCTION_NETWORK);
    this.findBestServer(false);
    //this.messages = <Subject<any>>this.connect(connectToProduction);
        // .map((response: MessageEvent): any => {
        //     let data = JSON.parse(response.data);
        //     return data;
        // });
  }


  findBestServer(production: boolean){
//    if( !production || (production === null)) {
      // let observableArray: Observable<any>[] = [];
      if(!this.current_server){
        this.current_server = { server_id: '', server_url: '', response_time: -1 };
      }
      
      this.TEST_SERVERS.forEach( (value, index, arr) => {
        this.logger.debug("### connect to: " + JSON.stringify(value));
        const inputObservable = new QueueingSubject<string>()
        // inputObservable.error( () => {
        //   this.logger.debug('Socket Error: ');
        // });
        let request_time = Date.now();

        const { messages, connectionStatus } = websocketConnect(value.server_url, inputObservable);
        // the connectionStatus stream will provides the current number of websocket
        // connections immediately to each new observer and updates as it changes
        const connectionStatusSubscription = connectionStatus.subscribe(numberConnected => {
          this.logger.debug('id: '+value.server_id + ' number of connected websockets:', numberConnected);
          if(numberConnected > 0) {
            // we have an open socket now send a ping
            inputObservable.next(JSON.stringify({id: value.server_id, command: 'ping'}));
            inputObservable.next(JSON.stringify({id: 'wallet_propose', command: 'wallet_propose'}));
          }
        });
        // the websocket connection is created lazily when the messages observable is subscribed to
        const messagesSubscription = messages.subscribe((message: string) => {
          this.logger.debug('id: ' + value.server_id + ', received message:' + message);
          let response_time = Date.now() - request_time;
          this.logger.debug('id: ' + value.server_id + ' response: ' + response_time);
          if(this.current_server.response_time == -1){
            this.current_server = value;
            this.current_server.response_time = response_time;
          } else if (response_time < this.current_server.response_time){
            this.current_server = value;
            this.current_server.response_time = response_time;
          }
          this.logger.debug("Current Server: " + JSON.stringify(this.current_server));
        }, (error) => {
          this.logger.debug('id: ' + value.server_id + ', error: ' + ', response time: ' + (Date.now() - request_time));
        }, () => {
          this.logger.debug('id: ' + value.server_id + ', completed');
        });
      });
//    }
  }

  connect(production: boolean) : Rx.Subject<MessageEvent> {
    // Check if we have an open WebSocket already
    let server_index = 0;
    if (!this.socketSubject) {
      // loop over TEST or PROD servers to get all response times and decide the fastest
      this.logger.debug("### No soccket -> open new, connect to prod?: " + production);
      if( !production || (production === null)) {
        let observableArray: Observable<any>[] = [];
        this.TEST_SERVERS.forEach( (value, index, arr) => {
          this.logger.debug("### connect to: " + JSON.stringify(value));
          let request_time = Date.now();
          let server_subject: Subject<any> = <Subject<any>>this.create(value.server_url);
          server_subject.error(wserror => {
            this.logger.debug("### WebSocket Error: " + wserror);
          });
          if(server_subject != null ){
            server_subject.subscribe(message => {
              this.logger.debug("WebSocket connect(): " + JSON.stringify(value) + " message: " + message);
              if(message['id'] == 'ping'){
                let response_time = Date.now() - request_time;
                arr[index].response_time = response_time;
                this.logger.debug("Test Server: " + JSON.stringify(arr[index]));
              }
            });
            observableArray.push(server_subject);
          }
        });
        Observable.forkJoin(observableArray).subscribe(t=> {
          this.logger.debug(t);
          // return the Socket to the requester
          return this.socketSubject;
      });
      } else {
        // return the Socket to the requester
        return this.socketSubject;
      }      

      // this.socketSubject = this.create(this.current_server.server_url);
      // this.logger.debug("WebsocketService Successfully connected: " + this.current_server.server_url);
    } 
    
  }

  private create(url): Rx.Subject<MessageEvent> {
    this.ws = new WebSocket(url);
    let observable = Rx.Observable.create(
      (obs: Rx.Observer<MessageEvent>) => {
          this.ws.onmessage = obs.next.bind(obs);
          this.ws.onerror = obs.error.bind(obs);
          this.ws.onclose = obs.complete.bind(obs);
          return this.ws.close.bind(this.ws);
      });
    let observer = {
        next: (data: Object) => {
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify(data));
            }
        }
    }
    return Rx.Subject.create(observer, observable);
  }

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