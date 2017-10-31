import { Injectable } from '@angular/core';
import { Logger } from 'angular2-logger/core';
import { LedgerStreamMessages, TransactionStreamMessages } from '../domain/websocket-types';
import { Observable, BehaviorSubject } from 'rxjs';
import { Subject } from 'rxjs/Subject';
import { SessionStorageService, LocalStorageService } from "ngx-store";
import { AppConstants } from '../domain/app-constants';
import { ElectronService } from '../providers/electron.service';
import { MessageService } from 'primeng/components/common/messageservice';
import * as cscKeyAPI from 'casinocoin-libjs-keypairs';
import Big from 'big.js';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');


import * as loki from 'lokijs';
import * as LokiTypes from '../domain/lokijs';

const lfsa = require('../../../node_modules/lokijs/src/loki-fs-structured-adapter.js');
// const LokiIndexedAdapter = require('../../../node_modules/lokijs/src/loki-indexed-adapter.js');
const walletSubject = new Subject<any>();

@Injectable()
export class WalletService {

  private accountSubject = new Subject<any>();

  private walletDB
  private accounts;
  private transactions;
  private addressbook;
  private logs;
  private keys;
  private swaps;
  private ledgers: Array<LedgerStreamMessages>;

  private algorithm = "aes-256-gcm";
  
  public isWalletOpen: boolean = false;
  public openWalletSubject = new BehaviorSubject<string>(AppConstants.KEY_INIT);

  public balance:string = this.getWalletBalance();
  public txCount:number = this.getWalletTxCount();
  public lastTx:LokiTypes.LokiTransaction = this.getWalletLastTx();

  constructor(private logger: Logger, 
              private electron: ElectronService,
              private localStorageService: LocalStorageService,
              private messageService: MessageService) {
    this.logger.debug("### INIT WalletService ###");
   }

  createWallet(walletLocation: string, walletUUID: string, walletSecret: string): Observable<any> {
    // create wallet for UUID
    this.logger.debug("### WalletService Create UUID: " + walletUUID);   
    function createWalletComplete(thisobject){
      this.logger.debug("### WalletService DB Created");
    }
    let userPath = this.electron.remote.app.getPath("home");
    if(walletLocation.length == 0){
      walletLocation = path.join(userPath, '.casinocoin');
    }
    // check if path exists, else create
    this.logger.debug("### WalletService, check if wallet location exists");
    if (!fs.existsSync(walletLocation)){
      this.logger.debug("### WalletService, location does not exist: " + walletLocation);
      fs.mkdirSync(walletLocation);
    }
    let dbPath = path.join(walletLocation, (walletUUID + '.db'));
    this.logger.debug("### WalletService Database File: " + dbPath);
    this.localStorageService.set(AppConstants.KEY_WALLET_LOCATION, dbPath);

    let collectionSubject = new Subject<any>();
    let createSubject = new Subject<any>();

    collectionSubject.subscribe( collection => {
      if(collection.name == "accounts")
        this.accounts = collection;
      else if(collection.name == "transactions")
        this.transactions = collection;
      else if(collection.name == "addressbook")
        this.addressbook = collection;
      else if(collection.name == "log")
        this.logs = collection;
      else if(collection.name == "keys")
        this.keys = collection;
      else if(collection.name == "swaps")
        this.swaps = collection;
      this.isWalletOpen = true;
    });
    
    let lokiFsAdapter = new lfsa();
    // let idbAdapter = new LokiIndexedAdapter('casinocoin');
    let walletDB = new loki(dbPath, 
      { adapter: lokiFsAdapter,
        autoloadCallback: createCollections,
        autoload: true, 
        autosave: true, 
        autosaveInterval: 5000
    });

    function createCollections() {
      collectionSubject.next(walletDB.addCollection("accounts", {unique: ["accountID"]}));
      collectionSubject.next(walletDB.addCollection("transactions", {unique: ["txID"]}));
      collectionSubject.next(walletDB.addCollection("addressbook", {unique: ["accountID"]}));
      collectionSubject.next(walletDB.addCollection("log"));
      collectionSubject.next(walletDB.addCollection("keys", {unique: ["accountID"]}));
      collectionSubject.next(walletDB.addCollection("swaps", {unique: ["swapID"]}));
      createSubject.next(AppConstants.KEY_FINISHED);
    }
    this.walletDB = walletDB;
    return createSubject.asObservable();
  }
  
  openWallet(walletLocation: string, walletUUID: string): Observable<any> {
    let dbPath = path.join(walletLocation, (walletUUID + '.db'));
    this.logger.debug("### WalletService Open Wallet location: " + dbPath);

    let collectionSubject = new Subject<any>();
    let openSubject = new Subject<string>();
    openSubject.subscribe(result => {
      this.openWalletSubject.next(result);
    });
    let openError = false;

    if (!fs.existsSync(dbPath)){
      this.logger.debug("### WalletService, DB does not exist: " + dbPath);
      openSubject.next(AppConstants.KEY_ERRORED);
    } else {
      collectionSubject.subscribe( collection => {
        if(collection != null) {
          this.logger.debug("### WalletService Open Collection: " + collection.name)
          if(collection.name == "accounts")
            this.accounts = collection;
          else if(collection.name == "transactions")
            this.transactions = collection;
          else if(collection.name == "addressbook")
            this.addressbook = collection;
          else if(collection.name == "log")
            this.logs = collection;
          else if(collection.name == "keys")
            this.keys = collection;
          else if(collection.name == "swaps")
            this.swaps = collection;
          this.isWalletOpen = true;
        } else {
          openError = true;
          openSubject.next(AppConstants.KEY_ERRORED);
        }
      });
  
      let lokiFsAdapter = new lfsa();
      // let idbAdapter = new LokiIndexedAdapter('casinocoin');
      let walletDB = new loki(dbPath, 
        { adapter: lokiFsAdapter,
          autoloadCallback: openCollections,
          autoload: true, 
          autosave: true, 
          autosaveInterval: 5000
      });
  
      function openCollections(result){
        collectionSubject.next(walletDB.getCollection("accounts"));
        collectionSubject.next(walletDB.getCollection("transactions"));
        collectionSubject.next(walletDB.getCollection("addressbook"));
        collectionSubject.next(walletDB.getCollection("log"));
        collectionSubject.next(walletDB.getCollection("keys"));
        collectionSubject.next(walletDB.getCollection("swaps"));
        if(!openError){
          openSubject.next(AppConstants.KEY_LOADED);
        }
      }

      this.walletDB = walletDB;
    }
    return openSubject.asObservable();
  }
  
  // allow for a hard save on app exit
  saveWallet(){
    this.walletDB.saveDatabase();
  }

  // #########################################
  // Accounts Collection
  // #########################################
  addAccount(newAccount: LokiTypes.LokiAccount): LokiTypes.LokiAccount {
    let insertAccount = this.accounts.insert(newAccount);
    return insertAccount;
  }

  getAccount(accountID: string): LokiTypes.LokiAccount {
    return this.accounts.by("accountID", accountID);
  }

  getAllAccounts(): Array<LokiTypes.LokiAccount> {
    return this.accounts.find();
  }

  updateAccount(account: LokiTypes.LokiAccount){
    this.accounts.update(account);
  }

  getAccountBalance(accountID: string): string {
    let account = this.getAccount(accountID);
    return account.balance;
  }

  isAccountMine(accountID: string): boolean {
    return (this.accounts.by("accountID", accountID) != null);
  }

  // #########################################
  // Keys Collection
  // #########################################
  addKey(newKey: LokiTypes.LokiKey): LokiTypes.LokiKey {
    let insertedKey = this.keys.insert(newKey);
    return insertedKey;
  }

  getKey(accountID: string): LokiTypes.LokiKey {
    return this.keys.by("accountID", accountID);
  }

  getAllKeys(): Array<LokiTypes.LokiKey> {
    return this.keys.find();
  }

  updateKey(key: LokiTypes.LokiKey){
    this.keys.update(key);
  }

  // #########################################
  // Swaps Collection
  // #########################################
  addSwap(newSwap: LokiTypes.LokiSwap): LokiTypes.LokiSwap{
    let insertedSwap = this.swaps.insert(newSwap);
    return insertedSwap;
  }

  getSwap(swapID: string): LokiTypes.LokiSwap {
    return this.swaps.by("swapID", swapID);
  }

  getAllSwaps(): Array<LokiTypes.LokiSwap> {
    if(this.isWalletOpen){
      return this.swaps.chain().find().simplesort("updatedTimestamp", true).data();
    } else {
      return [];
    }
  }

  updateSwap(swap: LokiTypes.LokiSwap){
    this.swaps.update(swap);
  }

  // #########################################
  // Logs Collection
  // #########################################
  addLog(newLog: LokiTypes.LokiLog): LokiTypes.LokiLog{
    let insertedLog = this.logs.insert(newLog);
    return insertedLog;
  }

  getLog(timestamp: number): LokiTypes.LokiLog {
    return this.logs.by("timestamp", timestamp);
  }

  getAllLogs(): Array<LokiTypes.LokiLog> {
    if(this.isWalletOpen){
      return this.logs.find();
    } else {
      return [];
    }
  }

  // #########################################
  // Transactions Collection
  // #########################################
  addTransaction(newTransaction: LokiTypes.LokiTransaction): LokiTypes.LokiTransaction {
    let insertedTx = this.transactions.insert(newTransaction);
    return insertedTx;
  }

  getTransaction(txID: string): LokiTypes.LokiTransaction {
    return this.transactions.by("txID", txID);
  }

  getAllTransactions(): Array<LokiTypes.LokiTransaction> {
    return this.transactions.chain().find().simplesort("timestamp", true).data();
  }

  getUnvalidatedTransactions(): Array<LokiTypes.LokiTransaction> {
    return this.transactions.find({ validated:  false });
  }

  updateTransaction(transaction: LokiTypes.LokiTransaction){
    this.transactions.update(transaction);
  }

  // #########################################
  // Addressbook Collection
  // #########################################
  addAddress(newAddress: LokiTypes.LokiAddress): LokiTypes.LokiAddress{
    let insertedAddress = this.addressbook.insert(newAddress);
    return insertedAddress;
  }

  getAddress(accountID: string): LokiTypes.LokiAddress {
    return this.addressbook.by("accountID", accountID);
  }

  getAllAddresses(): Array<LokiTypes.LokiAddress> {
      return this.addressbook.find();
  }

  updateAddress(address: LokiTypes.LokiAddress){
    this.addressbook.update(address);
  }

  // #########################################
  // Wallet Methods
  // #########################################
  generateWalletPasswordHash(walletUUID:string, password:string): string{
    let passwordHash = crypto.createHmac('sha256', password).update(walletUUID).digest('hex');
    return passwordHash;
  }

  checkWalletPasswordHash(walletUUID:string, password:string, walletHash: string): boolean {
    let passwordHash = crypto.createHmac('sha256', password).update(walletUUID).digest('hex');
    return (walletHash == passwordHash);
  }

  encryptAllKeys(password: string): Observable<string>{
    this.logger.debug("### WalletService encryptAllKeys ###");
    let encryptSubject = new BehaviorSubject<string>(AppConstants.KEY_INIT);
    // get all keys
    let allKeys: Array<LokiTypes.LokiKey> = this.keys.find();
    this.logger.debug(allKeys);
    allKeys.forEach( (element, index, array) => {
      if(!element.encrypted){
        let passwordHash = crypto.createHash('sha256').update(password).digest('hex');
        passwordHash = passwordHash.slice(0, 32);
        let cipher = crypto.createCipheriv(this.algorithm, passwordHash, element.initVector);
        // encrypt key
        let cryptedKey = cipher.update(element.privateKey, 'utf8', 'hex');
        cryptedKey += cipher.final("hex");
        array[index].keyTag = cipher.getAuthTag().toString('hex');
        array[index].privateKey = cryptedKey;
        cipher = crypto.createCipheriv(this.algorithm, passwordHash, element.initVector);
        let cryptedSecret = cipher.update(element.secret, 'utf8', 'hex');
        cryptedSecret += cipher.final("hex");
        array[index].secretTag = cipher.getAuthTag().toString('hex');
        array[index].secret = cryptedSecret;
        array[index].encrypted = true;
      }
      if(index == (array.length - 1)){
        encryptSubject.next(AppConstants.KEY_FINISHED);
      }
    });
    return encryptSubject.asObservable();
  }

  decryptAllKeys(password: string){
    // get all keys
    let allKeys: Array<LokiTypes.LokiKey> = this.keys.find();
    allKeys.forEach( (element, index, array) => {
      // decrypt key
      array[index].privateKey = element.privateKey;
      array[index].secret = element.secret;
    })
  }

  getDecryptPrivateKey(password: string, walletKey: LokiTypes.LokiKey): string {
    let passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    passwordHash = passwordHash.slice(0, 32);
    let decipher = crypto.createDecipheriv(this.algorithm, passwordHash, walletKey.initVector);
    let secretTagBuffer = Buffer.from(walletKey.secretTag, 'hex');
    decipher.setAuthTag(secretTagBuffer);
    let decodedSecret:string = decipher.update(walletKey.secret, 'hex', 'utf8');
    decodedSecret += decipher.final('utf8');
    let decodedKeypair = cscKeyAPI.deriveKeypair(decodedSecret);
    if(decodedKeypair.publicKey == walletKey.publicKey){
      // password was correct, return decoded private key
      return decodedKeypair.privateKey;
    } else {
      return AppConstants.KEY_ERRORED;
    }
  }

  encryptWalletPassword(password: string, words:Array<string>){
    // encrypt the wallet password with the words
    let encryptedPassword;
    // store the wallet password
    this.localStorageService.set(AppConstants.KEY_WALLET_PASSWORD, encryptedPassword);
  }

  decryptWalletPassword(words: Array<string>): string {
    // get the encrypted password
    let encryptedPassword = this.localStorageService.get(AppConstants.KEY_WALLET_PASSWORD);
    // decrypt the password
    let decryptedPassword;
    return decryptedPassword;
  }

  importPrivateKey(keySeed:string, password:string){
    let newKeyPair: LokiTypes.LokiKey = { 
      privateKey: "", 
      publicKey: "", 
      accountID: "", 
      secret: "", 
      initVector: "", 
      keyTag: "",
      secretTag: "",
      encrypted: false
    };
    let keypair = cscKeyAPI.deriveKeypair(keySeed);
    newKeyPair.privateKey = keypair.privateKey;
    newKeyPair.publicKey = keypair.publicKey;
    newKeyPair.accountID = cscKeyAPI.deriveAddress(keypair.publicKey);
    newKeyPair.initVector = crypto.randomBytes(32).toString('hex');
    newKeyPair.secret = keySeed;
    // save the new private key
    this.addKey(newKeyPair);
    // add new account
    let walletAccount: LokiTypes.LokiAccount = {
      accountID: newKeyPair.accountID, 
      balance: "0", 
      lastSequence: 0, 
      label: "Imported Private Key",
      activated: false,
      ownerCount: 0,
      lastTxID: "",
      lastTxLedger: 0
    };
    this.addAccount(walletAccount);
    // encrypt the keys
    this.encryptAllKeys(password).subscribe(result => {
      this.messageService.add( {severity:'info', 
                                summary:'Private Key Import', 
                                detail:'The Private Key import is complete.'
                              });
    });
  }
  
  getWalletBalance(): string {
    let totalBalance = new Big("0");
    this.logger.debug("### WalletService getWalletBalance, isWalletOpen: " + this.isWalletOpen);
    if(this.isWalletOpen){
      // loop over all accounts
      let accounts: Array<LokiTypes.LokiAccount> = this.accounts.find();
      accounts.forEach(element => {
        totalBalance = totalBalance.plus(element.balance);
      });
    }
    return totalBalance.toString();
  }

  getWalletTxCount(): number {
    if(this.isWalletOpen){
      return this.transactions.count();
    } else {
      return 0;
    }
  }

  getWalletLastTx(): LokiTypes.LokiTransaction {
    if(this.isWalletOpen){
      let txArray: Array<LokiTypes.LokiTransaction> = this.transactions.chain().find().simplesort("timestamp", true).data();
      if(txArray.length > 0){
        return txArray[0];
      } else {
        return null;
      }
    } else {
      return null;
    }
  }
}
