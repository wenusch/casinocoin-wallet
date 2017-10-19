import { Injectable } from '@angular/core';
import { Logger } from 'angular2-logger/core';
import { JSONSchemas } from '../domain/schemas';
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
      openSubject.next(AppConstants.KEY_LOADED);
    }
    this.walletDB = walletDB;
    return openSubject.asObservable();
  }
  
  saveWallet(){
    this.walletDB.saveDatabase();
  }

  addKeys(newKey: LokiTypes.LokiKey) {
    let insertedKey = this.keys.insert(newKey);
    this.saveWallet();
  }

  getKey(accountID: string): LokiTypes.LokiKey {
    return this.keys.by("accountID", accountID);
  }

  encryptKeys() {
    // find all unencrypted keys and do encryption
  }

  getAllAccounts(): Array<LokiTypes.LokiKey> {
    return this.keys.find();
  }
}
