import { Injectable } from '@angular/core';
import { Logger } from 'angular2-logger/core';
import { LedgerStreamMessages, TransactionStreamMessages } from '../domain/websocket-types';
import { Observable } from 'rxjs';
import { Subject } from 'rxjs/Subject';
import { SessionStorageService, LocalStorageService } from "ngx-store";
import { AppConstants } from '../domain/app-constants';
import { ElectronService } from '../providers/electron.service';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');


import * as loki from 'lokijs';
import * as LokiTypes from '../domain/lokijs';

const lfsa = require('../../../node_modules/lokijs/src/loki-fs-structured-adapter.js');
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
  
  public isWalletOpen: boolean = false;

  constructor(private logger: Logger, 
              private electron: ElectronService,
              private localStorageService: LocalStorageService) {
    this.logger.debug("### INIT WalletService ###");
   }

  autoLoadCompleted() {
    return new Promise((resolve, reject) => {
        resolve();
    });
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
    let walletDB = new loki(dbPath, 
      { adapter: lokiFsAdapter,
        autoloadCallback: createCollections,
        autoload: true, 
        autosave: true, 
        autosaveInterval: 5000
    });

    function createCollections() {
      collectionSubject.next(walletDB.addCollection("accounts", {unique: ["accountID"]}));
      collectionSubject.next(walletDB.addCollection("transactions"));
      collectionSubject.next(walletDB.addCollection("addressbook"));
      collectionSubject.next(walletDB.addCollection("log"));
      collectionSubject.next(walletDB.addCollection("keys", {unique: ["accountID"]}));
      collectionSubject.next(walletDB.addCollection("swaps", {unique: ["accountID", "swapID"]}));
      createSubject.next(AppConstants.KEY_FINISHED);
    }
    this.walletDB = walletDB;
    return createSubject.asObservable();
  }
  
  openWallet(walletLocation: string, walletUUID: string): Observable<any> {
    let dbPath = path.join(walletLocation, (walletUUID + '.db'));
    this.logger.debug("### WalletService Open Wallet location: " + dbPath);

    let collectionSubject = new Subject<any>();
    let openSubject = new Subject<any>();

    collectionSubject.subscribe( collection => {
      this.logger.debug("openWallet:")
      this.logger.debug(collection);
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
      openSubject.next(AppConstants.KEY_LOADED);
    }
    this.walletDB = walletDB;
    return openSubject.asObservable();
  }
  
  saveWallet(){
    this.walletDB.saveDatabase();
  }

  // #########################################
  // Accounts Collection
  // #########################################
  addAccount(newAccount: LokiTypes.LokiAccount) {
    let insertAccount = this.accounts.insert(newAccount);
    this.saveWallet();
  }

  getAccount(accountID: string): LokiTypes.LokiAccount {
    return this.accounts.by("accountID", accountID);
  }

  getAllAccounts(): Array<LokiTypes.LokiAccount> {
    return this.accounts.find();
  }

  getWalletBalance(): number {
    let totalBalance:number = 0;
    // loop over all accounts
    let accounts: Array<LokiTypes.LokiAccount> = this.accounts.find();
    accounts.forEach(element => {
      totalBalance = totalBalance + element.balance;
    });
    return totalBalance;
  }

  getAccountBalance(accountID: string): number {
    let account = this.getAccount(accountID);
    return account.balance;
  }

  // #########################################
  // Keys Collection
  // #########################################
  addKey(newKey: LokiTypes.LokiKey) {
    let insertedKey = this.keys.insert(newKey);
    this.saveWallet();
  }

  getKey(accountID: string): LokiTypes.LokiKey {
    return this.keys.by("accountID", accountID);
  }

  getAllKeys(): Array<LokiTypes.LokiKey> {
    return this.keys.find();
  }

  encryptAllKeys(password: string){
    // get all keys
    let allKeys: Array<LokiTypes.LokiKey> = this.keys.find();
    allKeys.forEach( (element, index, array) => {
      if(!element.encrypted){
        // encrypt key
        array[index].privateKey = element.privateKey;
        array[index].secret = element.secret;
      }
    })
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

  // #########################################
  // Swaps Collection
  // #########################################
  addSwap(newSwap: LokiTypes.LokiSwap){
    this.swaps.insert(newSwap);
  }

  getSwap(swapID: string): LokiTypes.LokiSwap {
    return this.swaps.by("swapID", swapID);
  }

  getAllSwaps(): Array<LokiTypes.LokiSwap> {
    return this.swaps.find();
  }

}
