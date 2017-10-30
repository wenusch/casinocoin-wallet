import { Injectable, OnInit, OnDestroy } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { Subscription } from 'rxjs/Subscription';
import { Subject } from 'rxjs/Subject';
import { WebsocketService } from './websocket.service';
import { WalletService } from './wallet.service';
import { LedgerStreamMessages, ValidationStreamMessages, 
         TransactionStreamMessages, ServerStateMessage } from '../domain/websocket-types';
import { Logger } from 'angular2-logger/core';
import * as cscKeyAPI from 'casinocoin-libjs-keypairs';
import * as cscBinaryAPI from 'casinocoin-libjs-binary-codec';
import { LokiKey, LokiAccount, LokiTransaction } from '../domain/lokijs';
import { AppConstants } from '../domain/app-constants';
import { CasinocoinTxObject } from '../domain/csc-types';

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
    public serverState: ServerStateMessage;
    public serverStateSubject = new Subject<ServerStateMessage>();
    public accounts: Array<LokiAccount> = [];
    public accountSubject = new Subject<LokiAccount>();
    public transactions: Array<LokiTransaction> = [];
    public transactionSubject = new Subject<LokiTransaction>();

    constructor(private logger: Logger, 
                private wsService: WebsocketService,
                private walletService: WalletService ) {
        logger.debug("### INIT  CasinocoinService ###");
        // Initialize server state
        this.initServerState();
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
                    // subscribe to incomming messages on the websocket
                    this.subscribeToMessages();
                    // get the current server state
                    this.getServerState();
                    // subscribe to ledger stream
                    this.subscribeToLedgerStream();
                    // get accounts and subscribe to accountstream
                    let subscribeAccounts = [];
                    // make sure the wallet is openend
                    this.walletService.openWalletSubject.subscribe(result => {
                        if(result == AppConstants.KEY_LOADED){
                            this.walletService.getAllKeys().forEach(element => {
                                subscribeAccounts.push(element.accountID);
                            });
                            this.logger.debug("### CasinocoinService Accounts: " + JSON.stringify(subscribeAccounts));
                            this.subscribeToAccountsStream(subscribeAccounts);
                            // update all accounts from the network
                            this.checkAllAccounts();
                        }
                    });
                }
            });
        }
        // return observable with incomming message
        return this.subject.asObservable();
    }

    initServerState(){
        this.serverState = {
            build_version: "",
            complete_ledgers: "",
            io_latency_ms: null,
            last_close: {
                converge_time: null,
                proposers: null,
            },
            peers: null,
            pubkey_node: "",
            server_state: "",
            uptime: null,
            validated_ledger: {
                base_fee: null,
                close_time: null,
                hash: "",
                reserve_base: null,
                reserve_inc: null,
                seq: null,
            },
            validation_quorum: null
        };
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
                // this.logger.debug("ledger closed: " + JSON.stringify(incommingMessage));
                this.addLedger(incommingMessage);
                // get the new server state
                this.getServerState();
            } else if(incommingMessage['type'] == 'serverStatus'){
                // this.logger.debug("server state: " + incommingMessage['server_status']);
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
                    if(incommingMessage.status === 'success'){
                        this.serverState = incommingMessage.result.state;
                        this.serverStateSubject.next(this.serverState);
                    } else {
                        this.logger.debug("### CasinocoinService - Server State: " + JSON.stringify(incommingMessage));
                    }
                } else if(incommingMessage['id'] == 'getLedger'){
                    // we received a ledger
                    if(incommingMessage.status === 'success'){
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
                    } else {
                        this.logger.debug("### CasinocoinService - Get Ledger Error: " + JSON.stringify(incommingMessage));
                    }
                } else if (incommingMessage['id'] == 'getAccountInfo'){
                    // we received account info
                    if(incommingMessage.status === 'success'){
                        let account_result = incommingMessage.result.account_data;
                        // get the account from the wallet
                        let walletAccount: LokiAccount = this.walletService.getAccount(account_result.Account);

                        if(walletAccount.lastSequence < account_result.Sequence){
                            // we need to get the missing transactions

                        }
                        // update the info
                        walletAccount.activated = true;
                        walletAccount.balance = account_result.Balance;
                        walletAccount.lastSequence = account_result.Sequence;
                        walletAccount.lastTxID = account_result.PreviousTxnID;
                        walletAccount.lastTxLedger = account_result.PreviousTxnLgrSeq;
                        // save back to the wallet
                        this.walletService.updateAccount(walletAccount);
                        // update accounts array
                        this.accounts = this.walletService.getAllAccounts();
                        // notify change
                        this.accountSubject.next(walletAccount);
                    } else {
                        // there was an error
                        if(incommingMessage.error == "actNotFound"){
                            this.logger.error("Account " + incommingMessage.account + "does not yet exist on the ledger.")
                        }
                    }
                } else if(incommingMessage['id'] == 'ValidatedLedgers'){
                    this.logger.debug("### CasinocoinService - Validated Ledger: " + JSON.stringify(incommingMessage.result));
                    if(incommingMessage.status === 'success'){
                        if(!this.ledgersLoaded){
                            // get the last 10 ledgers
                            let startIndex = incommingMessage.result.ledger_index - 10;
                            let endIndex = incommingMessage.result.ledger_index;
                            for (let i=startIndex; i <= endIndex; i++){
                                this.getLedger(i);
                            }
                            this.ledgersLoaded = true;   
                        }
                    }
                } else if(incommingMessage['id'] == 'AccountUpdates'){
                    this.logger.debug("### CasinocoinService - Account Update: " + JSON.stringify(incommingMessage.result));
                    this.logger.debug("Account: " + JSON.stringify(incommingMessage.result));
                } else if(incommingMessage['id'] == 'submitTx'){
                    this.logger.debug("### CasinocoinService - TX Submitted: " + JSON.stringify(incommingMessage));
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

    getAccountInfo(accountID: string){
        let accountInfoRequest = {
            id: "getAccountInfo",
            command: "account_info",
            account: accountID
        }
        this.sendCommand(accountInfoRequest);
    }

    getAccountTx(accountID: string){
        let accountTxRequest = {
            id: "getAccountTx",
            command: "account_tx",
            account: accountID,
            ledger_index_min: -1,
            ledger_index_max: -1
        }
        this.sendCommand(accountTxRequest);
    }

    subscribeToServerStream() {
        this.sendCommand({ id: "ServerState", command: "subscribe", streams: ["server"]});
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

    checkAllAccounts(){
        // loop over all accounts
        let accounts:Array<LokiAccount> = this.walletService.getAllAccounts();
        accounts.forEach((account, index, arr) => {
            // get the account info for every account
            // accounts are already updated in the wallet on receiving
            this.getAccountInfo(account.accountID);
        });
    }

    handleIncommingTransaction(){

    }

    createPaymentTx(source:string, 
                    destination:string, 
                    amountDrops:string,
                    invoiceID?: string,
                    sourceTag?: string,
                    destinationTag?: string): CasinocoinTxObject {
        // get server transaction fee
        let txFee = this.ledgers[0].fee_base;
        // get account sequence
        let txWalletAccount:LokiAccount = this.walletService.getAccount(source);
        let txJSON: CasinocoinTxObject = {
            TransactionType: 'Payment',
            Account: source,
            Destination: destination,
            Amount: amountDrops,
            Fee: txFee.toString(),
            Flags: 0,
            Sequence: txWalletAccount.lastSequence
        }
    
        if (invoiceID !== undefined) {
            txJSON.InvoiceID = invoiceID;
        }
        if (sourceTag !== undefined) {
            txJSON.SourceTag = sourceTag;
        }
        if (destinationTag !== undefined) {
            txJSON.DestinationTag = destinationTag;
        }
        return txJSON;
    }

    signTx(tx: CasinocoinTxObject, password: string): string{
        // get keypair for sending account
        let accountKey: LokiKey = this.walletService.getKey(tx.Account);
        this.logger.debug("### CasinocoinService - signTx with key: " + JSON.stringify(accountKey));
        // decrypt private key
        let privateKey = this.walletService.getDecryptPrivateKey(password, accountKey);
        this.logger.debug("### CasinocoinService - signTx privateKey: " + privateKey);
        if(privateKey != AppConstants.KEY_ERRORED){
            // sign transaction
            tx['TxnSignature'] = cscKeyAPI.sign(cscBinaryAPI.encodeForSigning(tx), privateKey);
            // set the linked public key
            tx['SigningPubKey'] = accountKey.publicKey;
            return cscBinaryAPI.encode(tx);   
        } else {
            // something went wrong, probably a wrong password
            return AppConstants.KEY_ERRORED;
        }
    }

    submitTx(txBlob: string){
        this.logger.debug("### CasinocoinService - txBlob: " + txBlob);
        let submitRequest = {
            id: "submitTx",
            command: "submit",
            tx_blob: txBlob
        }
        this.sendCommand(submitRequest);
    }
}
