import { Injectable, OnInit, OnDestroy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Subscription } from 'rxjs/Subscription';
import { Subject } from 'rxjs/Subject';
import { WebsocketService } from './websocket.service';
import { WalletService } from './wallet.service';
import { LocalStorageService } from "ngx-store";
import { LedgerStreamMessages, ServerStateMessage, 
         ServerDefinition } from '../domain/websocket-types';
import { LogService } from './log.service';
// import { CasinocoinBinaryCodec, CasinocoinKeypairs } from 'casinocoin-libjs';
import { LokiKey, LokiAccount, LokiTransaction, LokiTxStatus } from '../domain/lokijs';
import { AppConstants } from '../domain/app-constants';
import { CasinocoinTxObject, PrepareTxPayment } from '../domain/csc-types';
import { CSCUtil } from '../domain/csc-util';
import { NotificationService } from './notification.service';
import { ElectronService } from './electron.service';
import Big from 'big.js';

const crypto = require('crypto');

@Injectable()
export class CasinocoinService implements OnDestroy {

    private defaultMinimalFee = 100000;

    private isConnected: boolean = false;
    private makingConnectionStarted: boolean = false;
    private disconnectStarted: boolean = false;
    private reconnectOnDisconnect: boolean = false;
    private ledgersLoaded: boolean = false;
    private connectedSubscription: Subscription;
    private socketSubscription: Subscription;
    public ledgerSubject = new Subject<LedgerStreamMessages>();
    public ledgers: Array<LedgerStreamMessages> = [];
    public serverStateSubject = new BehaviorSubject<ServerStateMessage>(this.initServerState());
    public accounts: Array<LokiAccount> = [];
    public accountSubject = new Subject<LokiAccount>();
    public transactions: Array<LokiTransaction> = [];
    public transactionSubject = new Subject<LokiTransaction>();
    public lastTransactionHash: string = "";
    public casinocoinConnectedSubject = new BehaviorSubject<boolean>(false);

    constructor(private logger: LogService, 
                private wsService: WebsocketService,
                private walletService: WalletService,
                private notificationService: NotificationService,
                private decimalPipe: DecimalPipe,
                private localStorageService: LocalStorageService,
                private electron: ElectronService ) {
        logger.debug("### INIT  CasinocoinService ###");
        // Initialize server state
        this.initServerState();
    }

    ngOnDestroy() {
        this.logger.debug("### CasinocoinService onDestroy ###");
        if(this.socketSubscription != undefined){
            this.socketSubscription.unsubscribe();
        }
    }

    connect(): Observable<any> {
        this.logger.debug("### CasinocoinService Connect() - isConnected: " + this.isConnected);
        let connectToProduction: boolean = this.localStorageService.get(AppConstants.KEY_PRODUCTION_NETWORK);
        this.logger.debug("### CasinocoinService Connect() - Connect To Production?: " + connectToProduction);
        let connectSubject;
        if(!this.isConnected){
            connectSubject = new BehaviorSubject<string>(AppConstants.KEY_INIT);
            // re-initialize server state
            this.initServerState();
            this.disconnectStarted = false;
            // find server to connect to 
            this.wsService.findBestServer(connectToProduction);
            // check if the server is found, otherwise wait till it is
            const serverFoundSubscription = this.wsService.isServerFindComplete$.subscribe(serverFound => {
                if(serverFound && !this.makingConnectionStarted){
                    this.logger.debug("### CasinocoinService serverFound - Wait for websocket connected");
                    // check if websocket is open, otherwise wait till it is
                    this.connectedSubscription = this.wsService.isConnected$.subscribe(connected => {
                        this.logger.debug("### CasinocoinService connected: " + connected + " isConnected: " + this.isConnected + " disconnectStarted: " + this.disconnectStarted);
                        if(!connected && !this.isConnected){
                            if(this.disconnectStarted){
                                // disconnect complete
                                this.disconnectStarted = false;
                                this.casinocoinConnectedSubject.next(false);
                                // check if we need to reconnect?
                                if(this.reconnectOnDisconnect){
                                    this.connect();
                                }
                            } else {
                                // subscribe to incomming messages on the websocket to initiate connection
                                this.subscribeToMessages();
                                this.makingConnectionStarted = true;
                            }
                        } else if(connected && !this.isConnected){
                            this.isConnected = true;
                            this.reconnectOnDisconnect = false;
                            this.casinocoinConnectedSubject.next(true);
                            // inform listeners we are connected
                            connectSubject.next(AppConstants.KEY_CONNECTED);
                            // get the current server state
                            this.getServerState();
                            // subsribe to server status stream
                            this.subscribeToServerStream();
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
                                    // do some checks on all transactions
                                    // this.checkAllTransactions();
                                }
                            });
                        } else if(!connected && this.isConnected) {
                            this.logger.debug("### CasinocoinService Connect Closed !! - isConnected: " + connected);
                            // inform listeners we are disconnected
                            connectSubject.next(AppConstants.KEY_DISCONNECTED);
                            this.isConnected = false;
                            this.casinocoinConnectedSubject.next(false);
                            // reconnect if requested
                            if(this.reconnectOnDisconnect){
                                this.connect();
                            }
                        } else if(!connected){
                            connectSubject.next(AppConstants.KEY_DISCONNECTED);
                            this.casinocoinConnectedSubject.next(false);
                        }
                    });
                }
            });
        } else {
           connectSubject = new BehaviorSubject<string>(AppConstants.KEY_CONNECTED);
        }
        // return observable with incomming message
        return connectSubject.asObservable();
    }

    disconnect(){
        this.logger.debug("### CasinocoinService - disconnect");
        // let disconnectSubject = new Subject<string>();
        this.disconnectStarted = true;
        // disconnect socket
        if(this.socketSubscription != undefined){
            this.socketSubscription.unsubscribe();
        }
        if(this.connectedSubscription != undefined){
            this.connectedSubscription.unsubscribe();
        }
        // empty command queue
        this.wsService.initCommandQueue();
        // reset server state
        this.initServerState();
        // set disconnected
        this.isConnected = false;
        this.makingConnectionStarted = false;
    }

    reconnect(){
        this.logger.debug("### CasinocoinService - reconnect");
        this.reconnectOnDisconnect = true;
        this.disconnect();
    }

    initServerState(): ServerStateMessage {
       return {
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
        this.ledgerSubject.next(ledger);
        this.ledgers.splice(0,0,ledger);
    }

    subscribeToMessages() {
        // subscribe to incomming messages
        this.logger.debug("### CasinocoinService - subscribeToMessages");
        this.socketSubscription = this.wsService.websocketConnection.messages.subscribe((message: any) => {
            let incommingMessage = JSON.parse(message);
            // this.logger.debug('### CasinocoinService received message from server: ', JSON.stringify(incommingMessage));
            if(incommingMessage['type'] == 'ledgerClosed'){
                this.logger.debug("### CasinocoinService - ledgerClosed: " + JSON.stringify(incommingMessage));
                this.addLedger(incommingMessage);
                // get the new server state
                this.getServerState();
                // check for any transactions that are not validated yet
                this.walletService.openWalletSubject.subscribe( result => {
                    if(result == AppConstants.KEY_LOADED){
                        this.walletService.getUnvalidatedTransactions().forEach( tx => {
                            if(! (tx.txID == this.lastTransactionHash)){
                                if(incommingMessage.ledger_index <= tx.lastLedgerSequence){
                                    this.logger.debug("### CasinocoinService - check TX: " + JSON.stringify(tx));
                                    // get the tx to check its status
                                    this.getTransaction(tx.txID);    
                                }
                            }
                        });
                    }
                });
            } else if(incommingMessage['type'] == 'serverStatus'){
                this.logger.debug("server state: " + incommingMessage['server_status']);
                if(incommingMessage['server_status'] != 'full'){
                    this.logger.debug("### CasinocoinService - server_status: " + incommingMessage['server_status'] + " -> Reconnect !!!");
                    this.reconnect();
                }
            } else if(incommingMessage['type'] == 'transaction'){
                this.logger.debug("### CasinocoinService - Incoming TX: " + JSON.stringify(incommingMessage));
                let msg_tx = incommingMessage['transaction'];
                if(msg_tx.TransactionType === "Payment"){
                    this.handlePayment(incommingMessage);
                } else if(msg_tx.TransactionType === "SetCRNRound"){
                    this.handleCRNRound(msg_tx, incommingMessage['meta']);
                }
            }  else if((incommingMessage['type'] == 'response') && incommingMessage.status === 'success'){
                // this.logger.debug('### CasinocoinService received message from server: ', JSON.stringify(incommingMessage));
                // we received a response on a request
                if(incommingMessage['id'] == 'ping'){
                    // we received a pong
                    this.logger.debug("### CasinocoinService - Pong");
                } else if(incommingMessage['id'] == 'server_state'){
                    // we received a server_state
                    this.serverStateSubject.next(incommingMessage.result.state);
                    if(incommingMessage.result.state.server_state !== 'full'){
                        // server is not in full state so reconnect to other server
                        this.reconnect();
                    }
                } else if(incommingMessage['id'] == 'getLedger'){
                    // we received a ledger
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
                    this.ledgerSubject.next(ledgerMessage);
                } else if (incommingMessage['id'].startsWith('getAccountInfo')){
                    // we received account info
                    this.logger.debug("### CasinocoinService - getAccountInfo: " + JSON.stringify(incommingMessage.result));
                    let account_result = incommingMessage.result.account_data;
                    // get the account from the wallet
                    let walletAccount: LokiAccount = this.walletService.getAccount(account_result.Account);
                    // update the info
                    if(new Big(account_result.Balance).gt(Big(0)))
                        walletAccount.activated = true;
                    else
                        walletAccount.activated = false;
                    walletAccount.balance = account_result.Balance;
                    walletAccount.lastSequence = account_result.Sequence;
                    walletAccount.lastTxID = account_result.PreviousTxnID;
                    walletAccount.lastTxLedger = account_result.PreviousTxnLgrSeq;
                    // save back to the wallet
                    this.walletService.updateAccount(walletAccount);
                    // update accounts array
                    this.accounts = this.walletService.getAllAccounts();
                    this.logger.debug("### CasinocoinService - getAccountInfo - walletAccount: " + JSON.stringify(walletAccount));
                    // notify change
                    this.accountSubject.next(walletAccount);
                    // get account transactions from database to check sequence and total
                    let dbAccountTransactions = this.walletService.getAccountTransactions(walletAccount.accountID);
                    let outgoingCount = 0;
                    let lastSequence = 0;
                    let lastTxLedgerIndex = 1;
                    dbAccountTransactions.forEach(tx => {
                        if((tx.direction == AppConstants.KEY_WALLET_TX_OUT) || (tx.direction == AppConstants.KEY_WALLET_TX_BOTH)){
                            outgoingCount = outgoingCount + 1;
                            if(tx.sequence > lastSequence){
                                lastSequence = tx.sequence;
                                lastTxLedgerIndex = tx.inLedger;
                            }
                        }
                    });
                    this.logger.debug("### CasinocoinService - Account TX - OUT: " + outgoingCount + 
                                        " TOTAL: " + dbAccountTransactions.length + 
                                        " Sequence: " + account_result.Sequence +
                                        " Last DB Sequence: " + lastSequence + 
                                        " Get Ledgers From: " + lastTxLedgerIndex);
                    // the account transaction total from the database to check if we are missing transactions
                    let accountTxBalance = this.walletService.getAccountTXBalance(walletAccount.accountID);
                    this.logger.debug("### CasinocoinService - Account DB TX Balance: " + walletAccount.accountID + " => " + accountTxBalance);
                    this.logger.debug("### CasinocoinService - Account Online TX Balance: " + walletAccount.accountID + " => " + walletAccount.balance);
                    if(incommingMessage['id'] == 'getAccountInfoRefresh'){
                        this.logger.debug("### CasinocoinService - Refresh Tx");
                        if(walletAccount.balance !== accountTxBalance){
                            // we are missing transactions or have still unvalidated transactions for this account so check all
                            this.getAccountTx(walletAccount.accountID, lastTxLedgerIndex);
                        }
                    } else {
                        this.logger.debug("### CasinocoinService - AccountInfo without Refresh Tx");
                    }
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
                } else if(incommingMessage['id'] == 'submitTx'){
                    this.logger.debug("### CasinocoinService - TX Submitted: " + JSON.stringify(incommingMessage));
                    if(incommingMessage.result.engine_result == "tesSUCCESS"){
                        let msg_tx = incommingMessage.result.tx_json;
                        this.lastTransactionHash = msg_tx.hash;
                        // determine tx direction
                        let txDirection:string;
                        if(this.walletService.isAccountMine(msg_tx.Destination)){
                            txDirection = AppConstants.KEY_WALLET_TX_IN;
                            if(this.walletService.isAccountMine(msg_tx.Account)){
                                txDirection = AppConstants.KEY_WALLET_TX_BOTH;
                            }
                        } else if (this.walletService.isAccountMine(msg_tx.Account)){
                            txDirection = AppConstants.KEY_WALLET_TX_OUT;
                        }
                        // create new transaction object
                        let dbTX: LokiTransaction = {
                            accountID: msg_tx.Account,
                            amount: msg_tx.Amount,
                            destination: msg_tx.Destination,
                            fee: msg_tx.Fee,
                            flags: msg_tx.Flags,
                            lastLedgerSequence: msg_tx.LastLedgerSequence,
                            sequence: msg_tx.Sequence,
                            signingPubKey: msg_tx.SigningPubKey,
                            timestamp: CSCUtil.casinocoinTimeNow(),
                            transactionType: msg_tx.TransactionType,
                            txID: msg_tx.hash,
                            txnSignature: msg_tx.TxnSignature,
                            direction: txDirection,
                            validated: false,
                            status: LokiTxStatus.send,
                            engineResult: msg_tx.engine_result,
                            engineResultMessage: msg_tx.engine_result_message
                        }
                        // add Memos if defined
                        if(msg_tx.Memos){
                            dbTX.memos = CSCUtil.decodeMemos(msg_tx.Memos);
                        }
                        // add Destination Tag if defined
                        if(msg_tx.DestinationTag){
                            dbTX.destinationTag = msg_tx.DestinationTag;
                        }
                        // add Invoice ID if defined
                        if(msg_tx.InvoiceID && msg_tx.InvoiceID.length > 0){
                            dbTX.invoiceID = CSCUtil.decodeInvoiceID(msg_tx.InvoiceID);
                        }
                        // insert into the wallet
                        this.walletService.addTransaction(dbTX);
                        this.notificationService.addMessage(
                            { title:'Transaction Submitted', 
                              body:'Your transaction has been submitted succesfully to the network.'
                            });
                    } else {
                        this.notificationService.addMessage(
                            { title:'Transaction Submit Error', 
                              body: incommingMessage.result.engine_result_message
                            });
                    }
                } else if(incommingMessage['id'] == 'getTransaction'){
                    this.logger.debug("### CasinocoinService - Transaction: " + JSON.stringify(incommingMessage.result));
                    // get the tx from the database
                    let tx:LokiTransaction = this.walletService.getTransaction(incommingMessage.result.hash);
                    if(tx == null) {
                        this.logger.debug("### CasinocoinService DB Transactions does not Exist !");
                    } else {
                        this.logger.debug("### CasinocoinService DB TX: " + JSON.stringify(tx));
                    }
                    let notifyUser = ((tx.validated == false) && (incommingMessage.result.validated == true));
                    if(notifyUser){
                        tx.validated = incommingMessage.result.validated;
                        tx.inLedger = incommingMessage.result.inLedger;
                        // save updated record
                        this.walletService.updateTransaction(tx);
                        let updateTxIndex = this.transactions.findIndex( item => item.txID == tx.txID);
                        this.transactions[updateTxIndex] = tx;    
                    }
                    // update accounts
                    if(tx.direction == AppConstants.KEY_WALLET_TX_IN){
                        this.getAccountInfo(tx.destination, false);
                        if(notifyUser){
                            this.notificationService.addMessage(
                                {title: 'Incoming CSC Transaction', 
                                body: 'You received '+ this.decimalPipe.transform(CSCUtil.dropsToCsc(tx.amount), "1.2-8") +
                                    ' coins from ' + tx.accountID});
                        }
                    } else if(tx.direction == AppConstants.KEY_WALLET_TX_OUT){
                        this.getAccountInfo(tx.accountID, false);
                        if(notifyUser){
                            this.notificationService.addMessage(
                                {title: 'Outgoing CSC Transaction', 
                                body: 'You sent '+ this.decimalPipe.transform(CSCUtil.dropsToCsc(tx.amount), "1.2-8") +
                                    ' coins to ' + tx.destination});
                        }
                    } else {
                        this.getAccountInfo(tx.destination, false);
                        this.getAccountInfo(tx.accountID, false);
                        if(notifyUser){
                            this.notificationService.addMessage(
                                {title: 'Wallet Transaction', 
                                body: 'You sent '+ this.decimalPipe.transform(CSCUtil.dropsToCsc(tx.amount), "1.2-8") +
                                    ' coins to your own address ' + tx.destination});
                        }
                    }
                    this.logger.debug("### CasinocoinService - updated TX: " + JSON.stringify(tx));
                } else if(incommingMessage['id'] == 'getAccountTx'){
                    let accountTxArray: Array<any> = incommingMessage.result.transactions;
                    this.logger.debug("### CasinocoinService - getAccountTx message TX Count: " + accountTxArray.length);
                    // Check all transactions against DB
                    accountTxArray.forEach(element => {
                        // check the TransactionType
                        if(element.tx.TransactionType == 'Payment'){
                            this.logger.debug("### CasinocoinService - Payment Tx: " + element.tx.hash);
                            let tx = { 
                                validated: element.validated,
                                ledger_index: element.tx.ledger_index,
                                transaction: element.tx,
                                engine_result: element.meta.TransactionResult,
                                engine_result_message: ""
                            };
                            this.handlePayment(tx);
                        } else if(element.tx.TransactionType == 'SetCRNRound'){
                            this.logger.debug("### CasinocoinService - SetCRNRound Tx: " + element.tx.hash);
                            this.handleCRNRound(element.tx, element.meta);
                        }
                    });
                    // refresh balance
                    this.electron.ipcRenderer.send("action", "refresh-balance");
                    // if we received a marker then there is more so get next batch
                    if(incommingMessage.result.marker){
                        this.logger.debug("### CasinocoinService - getAccountTx - Get Next Batch");
                        this.getAccountTx(incommingMessage.result.account, -1, incommingMessage.result.marker);
                    }
                }
            } else if(incommingMessage.status === 'error'){
                this.logger.debug("### CasinocoinService - Error Received: " + JSON.stringify(incommingMessage));

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

    getAccountInfo(accountID: string, refresh: boolean){
        let accountInfoRequest = {
            id: "getAccountInfo",
            command: "account_info",
            ledger_index: "validated",
            account: accountID
        }
        if(refresh)
            accountInfoRequest.id = "getAccountInfoRefresh";
        this.sendCommand(accountInfoRequest);
    }

    getAccountTx(accountID: string, fromLedger: number, startMarker?: Object){
        let accountTxRequest = {
            id: "getAccountTx",
            command: "account_tx",
            account: accountID,
            ledger_index_min: fromLedger,
            ledger_index_max: -1,
            forward: true,
            limit: 10
        }
        // check if we have a marker to start from
        if(startMarker){
            this.logger.debug("### CasinocoinService - getAccountTx - addMarker: " + JSON.stringify(startMarker));
            accountTxRequest['marker'] = startMarker; 
        }
        this.sendCommand(accountTxRequest);
    }

    getTransaction(txID: string){
        let txRequest = {
            id: "getTransaction",
            command: "tx",
            transaction: txID
        }
        this.sendCommand(txRequest);
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

    generateNewKeyPair(): LokiKey {
        let newKeyPair: LokiKey = { 
            privateKey: "", 
            publicKey: "", 
            accountID: "", 
            secret: "", 
            encrypted: false
        };
        newKeyPair.secret = this.electron.remote.getGlobal("vars").cscKeypairs.generateSeed();
        const keypair = this.electron.remote.getGlobal("vars").cscKeypairs.deriveKeypair(newKeyPair.secret);
        newKeyPair.privateKey = keypair.privateKey;
        newKeyPair.publicKey = keypair.publicKey;
        newKeyPair.accountID = this.electron.remote.getGlobal("vars").cscKeypairs.deriveAddress(keypair.publicKey);
        return newKeyPair;
    }

    // startServerStateJob(){
    //     // start job after 1 minute and then repeat every 2 minutes
    //     let timer = Observable.timer(60000,120000);
    //     timer.subscribe(t => {
    //         this.getServerState();
    //     });
    // }

    checkAllAccounts(){
        // loop over all accounts
        let accounts:Array<LokiAccount> = this.walletService.getAllAccounts();
        accounts.forEach((account, index, arr) => {
            // get the account info for every account
            // accounts are already updated in the wallet on receiving
            this.getAccountInfo(account.accountID, true);
        });
    }

    checkAllTransactions(){
        // loop all wallet transactions
        let transactions:Array<LokiTransaction> = this.walletService.getAllTransactions();
        transactions.forEach((tx, index, arr) => {
            // check if the inLedger property is set
            if(tx.inLedger == null && tx.validated){
                this.getTransaction(tx.txID);
            }
        });
    }

    createPaymentTx(input: PrepareTxPayment): CasinocoinTxObject {
        // we allow the transaction to be included in the next 10 ledgers
        let lastLedgerForTx = this.ledgers[0].ledger_index + 10;
        // get account sequence
        let txWalletAccount:LokiAccount = this.walletService.getAccount(input.source);
        let txJSON: CasinocoinTxObject = {
            TransactionType: 'Payment',
            Account: input.source,
            Destination: input.destination,
            Amount: input.amountDrops,
            Fee: input.feeDrops,
            Flags: AppConstants.tfFullyCanonicalSig,
            Sequence: txWalletAccount.lastSequence,
            LastLedgerSequence: lastLedgerForTx
        }
    
        if (input.invoiceID !== undefined) {
            txJSON.InvoiceID = input.invoiceID;
        }
        if (input.sourceTag !== undefined) {
            txJSON.SourceTag = input.sourceTag.valueOf();
        }
        if (input.destinationTag !== undefined) {
            txJSON.DestinationTag = input.destinationTag.valueOf();
        }
        if (input.description !== undefined && input.description.length > 0) {
            txJSON.Memos = [ CSCUtil.encodeMemo({ memo: { memoData: input.description, memoFormat: "plain/text"}})];
        }
        return txJSON;
    }

    signTx(tx: CasinocoinTxObject, password: string): string{
        // get keypair for sending account
        let accountKey: LokiKey = this.walletService.getKey(tx.Account);
        // decrypt private key
        let privateKey = this.walletService.getDecryptPrivateKey(password, accountKey);
        if(privateKey != AppConstants.KEY_ERRORED){
            // set the linked public key
            tx.SigningPubKey = accountKey.publicKey;
            // encode tx
            let encodedTx = this.electron.remote.getGlobal("vars").cscBinaryCodec.encodeForSigning(tx);
            // sign transaction
            tx.TxnSignature = this.electron.remote.getGlobal("vars").cscKeypairs.sign(encodedTx, privateKey);
            return this.electron.remote.getGlobal("vars").cscBinaryCodec.encode(tx);   
        } else {
            // something went wrong, probably a wrong password
            return AppConstants.KEY_ERRORED;
        }
    }

    submitTx(txBlob: string){
        let submitRequest = {
            id: "submitTx",
            command: "submit",
            tx_blob: txBlob
        }
        this.sendCommand(submitRequest);
    }

    addTxToWallet(tx, validated, inLedger): LokiTransaction {
        this.logger.debug("### CasinocoinService - addTxToWallet");
        let txDirection:string;
        if(this.walletService.isAccountMine(tx.Destination)){
            txDirection = AppConstants.KEY_WALLET_TX_IN;
            if(this.walletService.isAccountMine(tx.Account)){
                txDirection = AppConstants.KEY_WALLET_TX_BOTH;
            }
        } else if (this.walletService.isAccountMine(tx.Account)){
            txDirection = AppConstants.KEY_WALLET_TX_OUT;
        }
        // create new transaction object
        let dbTX: LokiTransaction = {
            accountID: tx.Account,
            amount: tx.Amount,
            destination: tx.Destination,
            fee: tx.Fee,
            flags: tx.Flags,
            lastLedgerSequence: tx.LastLedgerSequence,
            sequence: tx.Sequence,
            signingPubKey: tx.SigningPubKey,
            timestamp: tx.date,
            transactionType: tx.TransactionType,
            txID: tx.hash,
            txnSignature: tx.TxnSignature,
            direction: txDirection,
            validated: validated,
            status: LokiTxStatus.received,
            inLedger: inLedger
        }
        // add Memos if defined
        if(tx.Memos){
            dbTX.memos = CSCUtil.decodeMemos(tx.Memos);
        }
        // add Destination Tag if defined
        if(tx.DestinationTag){
            dbTX.destinationTag = tx.DestinationTag;
        }
        // add Invoice ID if defined
        if(tx.InvoiceID && tx.InvoiceID.length > 0){
            dbTX.invoiceID = CSCUtil.decodeInvoiceID(tx.InvoiceID);
        }
        // insert into the wallet
        this.walletService.addTransaction(dbTX);
        return dbTX;
    }

    getCurrentServer(): ServerDefinition {
        return this.wsService.currentServer;
    }

    handlePayment(tx) {
        this.logger.debug("### CasinocoinService - handlePayment: " + JSON.stringify(tx));
        // check if we already have the TX
        let dbTX: LokiTransaction = this.walletService.getTransaction(tx.transaction.hash);
        if(dbTX == null){
            dbTX = this.addTxToWallet(tx.transaction, tx.validated, tx.ledger_index);
        } else {
            // update transaction object
            dbTX.timestamp = tx.transaction.date;
            dbTX.status = LokiTxStatus.received;
            dbTX.validated = tx.validated;
            dbTX.inLedger = tx.ledger_index;
            dbTX.engineResult = tx.engine_result;
            dbTX.engineResultMessage = tx.engine_result_message;
            // update into the wallet
            this.walletService.updateTransaction(dbTX);
        }
        // notify tx change
        this.transactionSubject.next(dbTX);
        // update accounts
        if(dbTX.direction == AppConstants.KEY_WALLET_TX_IN){
            this.getAccountInfo(dbTX.destination, false);
            this.notificationService.addMessage(
                {title: 'Incoming CSC Transaction', 
                body: 'You received '+ this.decimalPipe.transform(CSCUtil.dropsToCsc(dbTX.amount), "1.2-8") +
                    ' coins from ' + dbTX.accountID});
        } else if(dbTX.direction == AppConstants.KEY_WALLET_TX_OUT){
            this.getAccountInfo(dbTX.accountID, false);
            this.notificationService.addMessage(
                {title: 'Outgoing CSC Transaction', 
                body: 'You sent '+ this.decimalPipe.transform(CSCUtil.dropsToCsc(dbTX.amount), "1.2-8") +
                    ' coins to ' + dbTX.destination});
        } else {
            this.getAccountInfo(dbTX.destination, false);
            this.getAccountInfo(dbTX.accountID, false);
            this.notificationService.addMessage(
                {title: 'Wallet Transaction', 
                body: 'You sent '+ this.decimalPipe.transform(CSCUtil.dropsToCsc(dbTX.amount), "1.2-8") +
                    ' coins to your own address ' + dbTX.destination});
        }
    }

    handleCRNRound(tx, meta) {
        // check if we already have the TX
        let dbTX: LokiTransaction = this.walletService.getTransaction(tx.hash);
        // this.logger.debug("### CasinocoinService - handleCRNRound tx: " + JSON.stringify(tx) + " meta: " + JSON.stringify(meta));
        // this.logger.debug("### CasinocoinService - handleCRNRound dbTX: " + JSON.stringify(dbTX));
        if(dbTX == null){
            // check if the destination account is ours
            meta['AffectedNodes'].forEach(node => {
                if(node.ModifiedNode !== undefined && node.ModifiedNode.LedgerEntryType === "AccountRoot"){
                    this.logger.debug("### CasinocoinService - handleCRNRound node: " + JSON.stringify(node));
                    if(this.walletService.isAccountMine(node.ModifiedNode.FinalFields.Account)){
                        this.logger.debug("### CasinocoinService - Account is mine: " + node.ModifiedNode.FinalFields.Account);
                        // calculate amount
                        let txAmount: Big = new Big(node.ModifiedNode.FinalFields.Balance);
                        txAmount = txAmount.minus(node.ModifiedNode.PreviousFields.Balance);
                        // create new transaction object
                        dbTX = {
                            accountID: tx.Account,
                            amount: txAmount.toString(),
                            destination: node.ModifiedNode.FinalFields.Account,
                            fee: tx.Fee,
                            flags: 0,
                            lastLedgerSequence: tx.LedgerSequence,
                            sequence: node.ModifiedNode.FinalFields.Sequence,
                            signingPubKey: "",
                            timestamp: tx.date,
                            transactionType: tx.TransactionType,
                            txID: tx.hash,
                            txnSignature: "",
                            direction: AppConstants.KEY_WALLET_TX_IN,
                            validated: true,
                            status: LokiTxStatus.received,
                            inLedger: tx.LedgerSequence
                        }
                        // insert into the wallet
                        this.walletService.addTransaction(dbTX);
                        this.logger.debug("### CasinocoinService - dbTX: " + JSON.stringify(dbTX));
                        // notify tx change
                        this.transactionSubject.next(dbTX);
                        // update accounts
                        this.getAccountInfo(dbTX.destination, false);
                        this.notificationService.addMessage(
                            {title: 'Incoming CRN Fee Transaction', 
                            body: 'You received '+ this.decimalPipe.transform(CSCUtil.dropsToCsc(dbTX.amount), "1.2-8") +
                                ' coins for CRN Ledger Round ' + dbTX.lastLedgerSequence});
                    } else {
                        this.logger.debug("### CasinocoinService - Account NOT mine: " + node.ModifiedNode.FinalFields.Account);
                    }
                } else {
                    this.logger.debug("### CasinocoinService - node.ModifiedNode undefined");
                }
            });
        } else {
            // update transaction object
            dbTX.timestamp = tx.date;
            dbTX.status = LokiTxStatus.received;
            // update into the wallet
            this.walletService.updateTransaction(dbTX);
        }
    }
}
