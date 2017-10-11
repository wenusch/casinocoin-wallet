import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs/Rx';
import * as Rx from 'rxjs/Rx';
import { Logger } from 'angular2-logger/core';

@Injectable()
export class WebsocketService {

    private socketUrl: any = 'ws://lnx07.jochems.com:7007/';
    private subject: Rx.Subject<MessageEvent>;    
    private ws : any;
    public messages: Subject<any>;

    constructor(private logger:Logger) {
        this.messages = <Subject<any>>this.connect()
          .map((response: MessageEvent): any => {
              let data = JSON.parse(response.data);
              return data;
          });
    }

  connect() : Rx.Subject<MessageEvent> {
    if (!this.subject) {
      this.subject = this.create(this.socketUrl);
      this.logger.debug("WebsocketService Successfully connected: " + this.socketUrl);
    } 
    return this.subject;
  }

  private create(url): Rx.Subject<MessageEvent> {
    this.ws = new WebSocket(url);

    let observable = Rx.Observable.create(
    (obs: Rx.Observer<MessageEvent>) => {
        this.ws.onmessage = obs.next.bind(obs);
        this.ws.onerror = obs.error.bind(obs);
        this.ws.onclose = obs.complete.bind(obs);
        return this.ws.close.bind(this.ws);
    })
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