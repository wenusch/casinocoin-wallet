import { Injectable, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { Subscription } from 'rxjs/Subscription';
import { Subject } from 'rxjs/Subject';
import { WebsocketService } from './websocket.service';
import { LedgerStreamMessages, ValidationStreamMessages, TransactionStreamMessages } from '../domain/websocket-messages';
import { Logger } from 'angular2-logger/core';

const WS_URL = 'ws://lnx07.jochems.com:7007/';

@Injectable()
export class CasinocoinService implements OnDestroy {

    private socketSubscription: Subscription;
    private subject = new Subject<any>();
  
    constructor(private logger: Logger, private wsService: WebsocketService) {
        this.logger.debug("### INIT CasinocoinService ###");
    }
    
    ngOnDestroy() {
        this.socketSubscription.unsubscribe();
    }

    connect(): Observable<any> {
        this.logger.debug("### CasinocoinService Connect() ###");
        // this.wsService.connect();
        this.socketSubscription = this.wsService.messages.subscribe((message: any) => {
          // this.logger.debug('received message from server: ', JSON.stringify(message));
          if(message['type'] == 'ledgerClosed'){
              this.logger.debug("closed ledger: " + message['ledger_index']);
              this.subject.next(message);
          } else if(message['type'] == 'serverStatus'){
            this.logger.debug("server state: " + message['server_status']);
            this.subject.next(message);
          } else if(message['type'] == 'transaction'){
            this.logger.debug("transaction: " + JSON.stringify(message['transaction']));
            this.subject.next(message);
          }  else if(message['type'] == 'response'){
              // we received a response on a request
              if(message['id'] == 'ping'){
                  // we received a pong
                  this.logger.debug("Pong");
              } else if(message['server_state']){
                  // we received a server_state
                  this.logger.debug("Server State: " + JSON.stringify(message.result));
                  this.subject.next(message.result);
              }
          } else { 
              this.logger.debug("unmapped message: " + JSON.stringify(message));
          }
        });
        return this.subject.asObservable();
    }

    pingServer() {
        this.wsService.messages.next({id: "ping",command: "ping"});
    }

    serverState() {
        this.wsService.messages.next({id: "server_state", command: "server_state"})
    }

    subscribeToLedgerStream() {
        this.wsService.messages.next({
            id: "Listen for new validated ledgers",
            command: "subscribe",
            streams: ["ledger","server"]
          });
    }

    subscribeToAccountsStream(accountArray: Array<string>) {
        this.wsService.messages.next({
            id: "Listen for account updates",
            command: "subscribe",
            accounts: accountArray
          }

        );
    }

}
