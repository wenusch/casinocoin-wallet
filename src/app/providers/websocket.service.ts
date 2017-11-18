import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { Subject } from 'rxjs/Subject';
import { Logger } from 'angular2-logger/core';
import { ServerDefinition } from '../domain/websocket-types';
import { LocalStorageService, SessionStorageService } from "ngx-store";
import { AppConstants } from '../domain/app-constants';

import { QueueingSubject } from 'queueing-subject';
import websocketConnect from 'rxjs-websockets';
import { Connection } from 'rxjs-websockets';

@Injectable()
export class WebsocketService {

    private TEST_SERVERS: Array<ServerDefinition> = [
        { server_id: 'wst01.casinocoin.org', server_url: 'ws://wst01.casinocoin.org:7007/', response_time: -1 },
        { server_id: 'wst02.casinocoin.org', server_url: 'ws://wst02.casinocoin.org:7007/', response_time: -1 }
    ];
    private PROD_SERVERS: Array<ServerDefinition> = [
        { server_id: 'ws01.casinocoin.org', server_url: 'wss://ws01.casinocoin.org:4443/', response_time: -1 },
        { server_id: 'ws02.casinocoin.org', server_url: 'wss://ws02.casinocoin.org:4443/', response_time: -1 },
        { server_id: 'ws03.casinocoin.org', server_url: 'wss://ws03.casinocoin.org:4443/', response_time: -1 },
        { server_id: 'ws04.casinocoin.org', server_url: 'wss://ws04.casinocoin.org:4443/', response_time: -1 }
    ];

    private currentServerFound: boolean = false;
    private productionConnection: boolean = true;
    public currentServer: ServerDefinition;
    private socketSubject: Subject<MessageEvent>;    
    private ws : any;
    public sendingCommands = new QueueingSubject<string>();
    public websocketConnection: Connection;

    private connected = new BehaviorSubject<boolean>(false); // false is your initial value
    public isConnected$ = this.connected.asObservable();
    public connectionCount: number = 0;
    private set isConnected(value: boolean) { this.connected.next(value); }
    private get isConnected():boolean { return this.connected.getValue(); }

    private serverFindComplete = new BehaviorSubject<boolean>(false); // false is your initial value
    public isServerFindComplete$ = this.serverFindComplete.asObservable();
    private set isServerFindComplete(value: boolean) { this.serverFindComplete.next(value); }
    private get isServerFindComplete():boolean { return this.serverFindComplete.getValue(); }

    private input = new QueueingSubject<string>();

  constructor( private logger:Logger, 
               private localStorageService: LocalStorageService,
               private sessionStorageService: SessionStorageService ) {
    logger.debug("### INIT WebsocketService ###");
    // check if we already have a user session
    // let sessionCurrentWallet = sessionStorageService.get(AppConstants.KEY_CURRENT_WALLET);
    // if(sessionCurrentWallet != null && sessionCurrentWallet.length > 0){
    //   const connectToProduction: boolean = localStorageService.get(AppConstants.KEY_PRODUCTION_NETWORK);
    //   logger.debug("### WebsocketService - connect to production?: " + connectToProduction);
    //   if(connectToProduction != null) {
    //     this.findBestServer(connectToProduction).subscribe( result => {
    //       if(result){
    //         this.handleCurrentServerFound();
    //       } else {
    //         if(!this.currentServerFound){
    //           this.logger.debug("### findBestServer - No best server found yet!!");
    //         }
    //       }
    //     });
    //   } else {
    //     // setup has not being done so divert server connect
    //     logger.debug("### WebsocketService - Setup not done so divert server connect!");
    //   }
    // } else {
    //   // not logged in yet so divert server connect
    //   logger.debug("### WebsocketService - Not logged in so divert server connect!");
    // }
    //this.messages = <Subject<any>>this.connect(connectToProduction);
        // .map((response: MessageEvent): any => {
        //     let data = JSON.parse(response.data);
        //     return data;
        // });
  }

  handleCurrentServerFound(){
    if(!this.currentServerFound){
      this.currentServerFound = true;
    } else {
      // faster server found so reconnect ...

      // this.logger.debug("### findBestServer - Faster Server Found -> Connect: " + JSON.stringify(this.currentServer));
    }
    // connect to the server
    this.connect();
    // indicate server find complete
    if(!this.isServerFindComplete) {
      this.isServerFindComplete = true;
    }
  }

  executeServerFind(value: ServerDefinition, findCompleteSubject: Subject<boolean>){
    let serverResponses = 0;
    let request_time = Date.now();
    const commands = new QueueingSubject<string>();
    const websocket: Connection = websocketConnect(value.server_url, commands);
    // the connectionStatus stream will provides the current number of websocket
    // connections immediately to each new observer and updates as it changes
    const connectionStatusSubscription = websocket.connectionStatus.subscribe(numberConnected => {
      this.logger.debug('### findBestServer - id: '+value.server_id + ' connected sockets:', numberConnected);
      if(numberConnected > 0) {
        // we have an open socket now send a ping
        commands.next(JSON.stringify({id: value.server_id, command: 'ping'}));
      }
    });
    // the websocket connection is created lazily when the messages observable is subscribed to
    const messagesSubscription = websocket.messages.subscribe((message: string) => {
      // this.logger.debug('### findBestServer - id: ' + value.server_id + ', received message:' + message);
      let responseTime = Date.now() - request_time;
      this.logger.debug('### findBestServer id: ' + value.server_id + ' response: ' + responseTime + ' msec');
      // only connect to a server if its response time was below 10 seconds otherwise its of no use
      if((this.currentServer.response_time == -1) && responseTime < 10000){
        // we found our first server
        this.logger.debug("### findBestServer - we found our first server: " + JSON.stringify(value));
        this.currentServer = value;
        this.currentServer.response_time = responseTime;
        serverResponses =  serverResponses + 1;
        this.connect();
        findCompleteSubject.next(true);
        // indicate server find complete
        if(!this.isServerFindComplete) {
          this.isServerFindComplete = true;
        }
      // } else if (this.currentServer.response_time > 0 && (responseTime < this.currentServer.response_time)) {
      //   // we found a faster server than before
      //   this.logger.debug("### findBestServer - we found a faster server: " + JSON.stringify(value));
      //   this.currentServer = value;
      //   this.currentServer.response_time = responseTime;
      //   serverResponses = serverResponses + 1;
      //   findCompleteSubject.next(true);
      //   // indicate server find complete
      //   if(!this.isServerFindComplete) {
      //     this.isServerFindComplete = true;
      //   }
      // } else {
      //   // we found a server but slower than before
      //   this.logger.debug("### findBestServer - we found a slower server: " + JSON.stringify(value));
      //   serverResponses = serverResponses + 1;
      //   findCompleteSubject.next(false);
      }
      // check if all servers responded or timed-out
      if(!this.productionConnection){
        this.logger.debug("### findBestServer - serverResponses: ", serverResponses, " total servers: ", this.TEST_SERVERS.length);
        if(serverResponses == this.TEST_SERVERS.length){
          // close find server subscriptions
          // this.logger.debug("### findBestServer - Unsubscribe and Close");
          connectionStatusSubscription.unsubscribe();
          messagesSubscription.unsubscribe();
        }
      } else {
        this.logger.debug("### findBestServer - serverResponses: ", serverResponses, " total servers: ", this.PROD_SERVERS.length);
        if(serverResponses == this.PROD_SERVERS.length){
          // close find server subscriptions
          // this.logger.debug("### findBestServer - Unsubscribe and Close");
          connectionStatusSubscription.unsubscribe();
          messagesSubscription.unsubscribe();
        }
      }
      
    }, (error) => {
      this.logger.debug('### findBestServer - id: ' + value.server_id + ', error: ' + ', response time: ' + (Date.now() - request_time));
      serverResponses = serverResponses + 1;
      findCompleteSubject.next(false);
      // check if all servers responded or timed-out
      // this.logger.debug("### findBestServer - serverResponses: ", serverResponses, " total servers: ", this.TEST_SERVERS.length);
      if(! this.productionConnection){
        if(serverResponses == this.TEST_SERVERS.length){
          // close find server subscriptions
          // this.logger.debug("### findBestServer - Unsubscribe and Close");
          connectionStatusSubscription.unsubscribe();
          messagesSubscription.unsubscribe();
        }
      } else {
        if(serverResponses == this.PROD_SERVERS.length){
          // close find server subscriptions
          // this.logger.debug("### findBestServer - Unsubscribe and Close");
          connectionStatusSubscription.unsubscribe();
          messagesSubscription.unsubscribe();
        }
      }
    }, () => {
      this.logger.debug('### findBestServer - id: ' + value.server_id + ', completed');
    });
  }

  findBestServer(production: boolean): Observable<boolean> {
    let findCompleteSubject = new Subject<boolean>();
    // init current server object
    // if(!this.currentServer){
    this.currentServer = { server_id: '', server_url: '', response_time: -1 };
    this.isServerFindComplete = false;
    // }
    if( !production || (production === null)) {
      // Find TEST Server
      this.logger.debug("### executeServerFind for TEST");
      this.productionConnection = false;
      this.TEST_SERVERS.forEach( (value, index, arr) => {
        this.executeServerFind(value, findCompleteSubject);
      });
    } else {
      //Find PRODUCTION Server
      this.logger.debug("### executeServerFind for PRODUCTION");
      this.productionConnection = true;
      this.PROD_SERVERS.forEach( (value, index, arr) => {
        this.executeServerFind(value, findCompleteSubject);        
      });
    }
    return findCompleteSubject.asObservable();
  }

  connect() {
    this.logger.debug("### WebsocketService - connect(): ", this.currentServer.server_url);
    this.websocketConnection = websocketConnect(this.currentServer.server_url, this.sendingCommands);
    const connectionStatusSubscription = this.websocketConnection.connectionStatus.subscribe(numberConnected => {
      this.logger.debug('### WebsocketService - server: '+ this.currentServer.server_id + ' number of connected websockets:', numberConnected);
      this.connectionCount = numberConnected;
      if(numberConnected > 0) {
        this.isConnected = true;
      } else {
        if(this.isConnected){
          // we were connected but now have 0 connections
          this.isConnected = false;
        }
      }
    });
  }

  initCommandQueue(){
    this.sendingCommands = new QueueingSubject<string>();
  }

}