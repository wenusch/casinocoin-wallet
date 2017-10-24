import { Injectable, OnInit, OnDestroy } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { Subscription } from 'rxjs/Subscription';
import { Subject } from 'rxjs/Subject';
import { WebsocketService } from './websocket.service';
import { WalletService } from './wallet.service';
import { LedgerStreamMessages, ValidationStreamMessages, TransactionStreamMessages } from '../domain/websocket-types';
import { Logger } from 'angular2-logger/core';
import * as cscKeyAPI from 'casinocoin-libjs-keypairs';
import { LokiKey } from '../domain/lokijs';

const crypto = require('crypto');

@Injectable()
export class CasinocoinService implements OnDestroy {

    private isConnected: boolean = false;
    private ledgersLoaded: boolean = false;
    private connectedSubscription: Subscription;
    private socketSubscription: Subscription;
    private subject = new Subject<any>();
    public ledgerSubject = new Subject<LedgerStreamMessages>();
    public ledgers: Array<LedgerStreamMessages> = [];
  
    constructor(private logger: Logger, 
                private wsService: WebsocketService,
                private walletService: WalletService ) {
        logger.debug("### INIT  CasinocoinService ###");
    }

    ngOnDestroy() {
        this.logger.debug("### CasinocoinService onDestroy ###");
        this.socketSubscription.unsubscribe();
    }

    connect(): Observable<any> {
        this.logger.debug("### CasinocoinService Connect() - isConnected: " + this.isConnected);
        if(!this.isConnected){
            // check if websocket is open, otherwise wait till it is
            const connectedSubscription = this.wsService.isConnected$.subscribe(connected => {
                this.logger.debug("### CasinocoinService isConnected: " + connected);
                if(connected && !this.isConnected){
                    this.isConnected = true;
                    this.subscribeToMessages();
                    // get the current ledger
                    // this.getLedger(-1);
                    // subscribe to ledger stream
                    this.subscribeToLedgerStream();
                    // get accounts and subscribe to accountstream
                    let subscribeAccounts = [];
                    this.walletService.getAllKeys().forEach(element => {
                        subscribeAccounts.push(element.accountID);
                    });
                    this.logger.debug("### CasinocoinService Accounts: " + JSON.stringify(subscribeAccounts));
                    this.subscribeToAccountsStream(subscribeAccounts);
                    // // subscribe to socket connection updates
                    // const connectionStatusSubscription = this.wsService.websocketConnection.connectionStatus.subscribe(numberConnected => {
                    //     this.logger.debug('### CasinocoinService, connected websockets:', numberConnected);
                    //     if(numberConnected > 0) {
                    //         this.isConnected = true;
                    //         // get the server state
                    //         this.getServerState();
                    //     } else {
                    //         this.isConnected = false;
                    //     }
                    // });
                }
            });
        }
        // return observable with incomming message
        return this.subject.asObservable();
    }

    addLedger(ledger: LedgerStreamMessages){
        // this.ledgerSubject.next(ledger);
        this.ledgers.splice(0,0,ledger);
    }

    subscribeToMessages() {
        // subscribe to incomming messages
        this.logger.debug("### CasinocoinService - subscribeToMessages");
        this.socketSubscription = this.wsService.websocketConnection.messages.subscribe((message: any) => {
            let incommingMessage = JSON.parse(message);
            // this.logger.debug('### CasinocoinService received message from server: ', JSON.stringify(incommingMessage));
            if(incommingMessage['type'] == 'ledgerClosed'){
                this.logger.debug("ledger closed: " + JSON.stringify(incommingMessage));
                this.addLedger(incommingMessage);
            } else if(incommingMessage['type'] == 'serverStatus'){
                this.logger.debug("server state: " + incommingMessage['server_status']);
                this.subject.next(incommingMessage);
            } else if(incommingMessage['type'] == 'transaction'){
                this.logger.debug("transaction: " + JSON.stringify(incommingMessage['transaction']));
                this.subject.next(incommingMessage);
            }  else if(incommingMessage['type'] == 'response'){
                // this.logger.debug('### CasinocoinService received message from server: ', JSON.stringify(incommingMessage));
                // we received a response on a request
                if(incommingMessage['id'] == 'ping'){
                    // we received a pong
                    this.logger.debug("### CasinocoinService - Pong");
                } else if(incommingMessage['id'] == 'server_state'){
                    // we received a server_state
                    this.logger.debug("### CasinocoinService - Server State: " + JSON.stringify(incommingMessage.result));
                    this.subject.next(incommingMessage.result);
                } else if(incommingMessage['id'] == 'getLedger'){
                    // we received a ledger
                    // this.logger.debug("### CasinocoinService - Get Ledger: " + JSON.stringify(incommingMessage));
                    let ledgerMessage: LedgerStreamMessages = {
                        fee_base: 0,
                        fee_ref: 0,
                        ledger_index: incommingMessage.result.ledger_index,
                        ledger_time: incommingMessage.result.ledger.close_time,
                        txn_count: incommingMessage.result.ledger.transactions.length,
                        ledger_hash: incommingMessage.result.ledger_hash,
                        reserve_base: 0,
                        reserve_inc: 0,
                        validated_ledgers: incommingMessage.result.ledger.seqNum
                    }
                    this.addLedger(ledgerMessage);
                    this.subject.next(incommingMessage.result);
                } else if(incommingMessage['id'] == 'ValidatedLedgers'){
                    this.logger.debug("### CasinocoinService - Validated Ledger: " + JSON.stringify(incommingMessage.result));
                    if(!this.ledgersLoaded){
                        // get the last 10 ledgers
                        let startIndex = incommingMessage.result.ledger_index - 10;
                        let endIndex = incommingMessage.result.ledger_index;
                        for (let i=startIndex; i <= endIndex; i++){
                            this.getLedger(i);
                        }
                        this.ledgersLoaded = true;   
                    }
                } else if(incommingMessage['id'] == 'AccountUpdates'){
                    this.logger.debug("### CasinocoinService - Account Update: " + JSON.stringify(incommingMessage.result));
                    this.logger.debug("Account: " + JSON.stringify(incommingMessage.result));
                }
            } else { 
                this.logger.debug("unmapped message: " + JSON.stringify(incommingMessage));
            }
        });
    }

    sendCommand(command: Object){
        this.wsService.sendingCommands.next(JSON.stringify(command));
    }

    pingServer() {
        this.sendCommand({id: "ping",command: "ping"});
    }

    getServerState() {
        this.sendCommand({id: "server_state", command: "server_state"});
    }

    getLedger(ledgerIndex: number){
        let ledgerType = "validated";
        let ledgerRequest = {
            id: "getLedger",
            command: "ledger",
            ledger_index: null,
            full: false,
            accounts: false,
            transactions: true,
            expand: false,
            owner_funds: false
        }
        if(ledgerIndex && ledgerIndex > 0){
            ledgerRequest.ledger_index = ledgerIndex;
        } else {
            ledgerRequest.ledger_index = ledgerType;
        }
        this.sendCommand(ledgerRequest);
    }

    subscribeToLedgerStream() {
        this.sendCommand({ id: "ValidatedLedgers", command: "subscribe", streams: ["ledger"]});
    }

    subscribeToAccountsStream(accountArray: Array<string>) {
        this.sendCommand({ id: "AccountUpdates", command: "subscribe", accounts: accountArray});
    }

    generateNewKeyPair(): Observable<LokiKey> {
        let newKeyPair: LokiKey = { 
            privateKey: "", 
            publicKey: "", 
            accountID: "", 
            secret: "", 
            initVector: "", 
            keyTag: "",
            secretTag: "",
            encrypted: false
        };
        let keyPairSubject = new BehaviorSubject<LokiKey>(newKeyPair);
        const initVector = crypto.randomBytes(16, function(err, buffer) {
            newKeyPair.secret = cscKeyAPI.generateSeed();
            const keypair = cscKeyAPI.deriveKeypair(newKeyPair.secret);
            newKeyPair.privateKey = keypair.privateKey;
            newKeyPair.publicKey = keypair.publicKey;
            newKeyPair.accountID = cscKeyAPI.deriveAddress(keypair.publicKey);
            newKeyPair.initVector = buffer.toString('hex');
            keyPairSubject.next(newKeyPair);
        });
        return keyPairSubject.asObservable();
    }

    startServerStateJob(){
        // start job after 1 minute and then repeat every 5 minutes
        let timer = Observable.timer(60000,300000);
        timer.subscribe(t => {
            this.getServerState();
        });
    }
}
