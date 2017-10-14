import { Injectable, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { Subscription } from 'rxjs/Subscription';
import { Subject } from 'rxjs/Subject';
import { WebsocketService } from './websocket.service';
import { LedgerStreamMessages, ValidationStreamMessages, TransactionStreamMessages } from '../domain/websocket-types';
import { Logger } from 'angular2-logger/core';
import * as cscKeyAPI from 'casinocoin-libjs-keypairs';

@Injectable()
export class CasinocoinService implements OnDestroy {

    private 
    private socketSubscription: Subscription;
    private subject = new Subject<any>();
  
    constructor(private logger: Logger, private wsService: WebsocketService) {
        logger.debug("### INIT CasinocoinService ###");

        const seed = cscKeyAPI.generateSeed();
        logger.debug("Seed: " + seed);
        const keypair = cscKeyAPI.deriveKeypair(seed);
        logger.debug(keypair);
        const address = cscKeyAPI.deriveAddress(keypair.publicKey);
        logger.debug("Address: " + address);
    }
    
    ngOnDestroy() {
        this.socketSubscription.unsubscribe();
    }

    connect(): Observable<any> {
        this.logger.debug("### CasinocoinService Connect() ###");
        // this.wsService.connect();
        this.socketSubscription = this.wsService.ws_messages.subscribe((message: any) => {
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
              } else if(message['wallet_propose']){
                // we received a wallet_propose
                this.logger.debug("Wallet Propose: " + JSON.stringify(message.result));
                this.subject.next(message.result);
            }
          } else { 
              this.logger.debug("unmapped message: " + JSON.stringify(message));
          }
        });
        return this.subject.asObservable();
    }


    pingServer() {
        this.wsService.ws_messages.next({id: "ping",command: "ping"});
    }

    getServerState() {
        this.wsService.ws_messages.next({id: "server_state", command: "server_state"});
    }

    getWalletProposal() {
        this.wsService.ws_messages.next({id: "wallet_propose", command: "wallet_propose"});
    }

    subscribeToLedgerStream() {
        this.wsService.ws_messages.next({
            id: "Listen for new validated ledgers",
            command: "subscribe",
            streams: ["ledger","server"]
          });
    }

    subscribeToAccountsStream(accountArray: Array<string>) {
        this.wsService.ws_messages.next({
            id: "Listen for account updates",
            command: "subscribe",
            accounts: accountArray
          }

        );
    }

}
