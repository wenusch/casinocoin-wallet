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

// let collections = [
//   {
//       name: 'accounts',
//       schema: JSONSchemas.account
//   },
//   {
//     name: 'transactions',
//     schema: JSONSchemas.transaction
//   },
//   {
//     name: 'addressbook',
//     schema: JSONSchemas.address
//   }
// ];

@Injectable()
export class WalletService {

  // public walletDB: RxDBTypes.RxWalletDatabase;
  private subject = new Subject<any>();
  private accountSubject = new Subject<any>();

  private walletDB
  private accounts;
  private transactions;
  private addressbook;
  private logs;
  private keys;

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
    let lokiFsAdapter = new lfsa();
    let walletDB = new loki(dbPath, 
      { adapter: lokiFsAdapter,
        autoloadCallback: createCollections,
        autoload: true, 
        autosave: true, 
        autosaveInterval: 5000
    });

    function createCollections() {
      walletDB.addCollection("accounts");
      walletDB.addCollection("transactions");
      walletDB.addCollection("addressbook");
      walletDB.addCollection("log");
      walletDB.addCollection("keys")
      createSubject.next("FINISHED");
    }
    let createSubject = new Subject<any>();
    return createSubject.asObservable();
    // walletDB.on('init', (data) => {
    //   this.logger.debug("### WalletService Init Event");
    // });
    // walletDB.loadDatabase({},() => {
    //   this.logger.debug("### WalletService Loaded");
    // });
    // return this.subject.asObservable();
  }
  
  openWallet(walletLocation: string, walletUUID: string, walletSecret: string): Observable<any> {
    this.logger.debug("### WalletService Open Wallet location: " + walletLocation);
    this.logger.debug("### WalletService Open Wallet UUID: " + walletUUID);
    this.logger.debug("### WalletService Open Wallet password: " + walletSecret);
    
    // subscribe to messages
    walletSubject.subscribe( message => {
      this.logger.debug("### WalletService Open Wallet Message: " + message);
      if(message == 'LOADED'){
        this.accounts = walletDB.getCollection("accounts");
        this.transactions = walletDB.getCollection("transactions");
        this.addressbook = walletDB.getCollection("addressbook");
        this.logs = walletDB.getCollection("log");
        this.keys = walletDB.getCollection("keys");
        this.subject.next("LOADED");
      }
    });

    let lokiFsAdapter = new lfsa();
    let walletDB = new loki(walletLocation, 
      { adapter: lokiFsAdapter,
        autosave: true, 
        autosaveInterval: 5000
    });

    walletDB.loadDatabase({}, function(err) {
      if (err) {
        walletSubject.next("ERROR " + err);
      }
      else {
        walletSubject.next("LOADED");
      }
    });
    return this.subject.asObservable();
  }
  
  saveWallet(){
    this.walletDB.save();
  }
/*
    // create database name hash
    let hash = crypto.createHash('sha1');
    hash.update(walletUUID);
    let walletHash = 'db' + hash.digest('hex');
    this.logger.debug('Wallet Hash: ' + walletHash);
    this.logger.debug('Wallet Password: ' + walletSecret);
    // RxDB.plugin(require('pouchdb-adapter-indexeddb'));
    this.walletDB = await RxDB.create({
      name: walletHash,           // <- name
      adapter: 'websql',          // <- storage-adapter
      password: walletSecret,     // <- password (optional)
      multiInstance: false         // <- multiInstance (default: true)
    });
    // create collections
    await Promise.all(collections.map(colData => this.walletDB.collection(colData)));
    return this.walletDB;
    // .then( database => {
    //   this.walletDB = database;
    //   this.logger.debug("Wallet Created");
    //   this.subject.next({ status: 0, text: 'Wallet Created' });
    //   // create wallet collections
    //   // let walletObject = { _id: "1234abcd", accounts: [{accountID: "cASDFA234234sfsfd", secret: "thisisascecret"}], transactions: []};
    //   this.walletDB.collection({
    //     name: 'accounts',
    //     schema: JSONSchemas.account
    //   }).then(collection => {
    //     // set the accounts collection
    //     this.accountcollection = collection;
    //     this.subject.next({ status: 0, text: 'Accounts Collection Created' });
    //     // create transactions collection
    //     this.walletDB.collection({
    //       name: 'transactions',
    //       schema: JSONSchemas.transaction
    //     }).then(collection => {
    //       this.transactionsCollection = collection;
    //       this.subject.next({ status: 0, text: 'Transactions Collection Created' });
    //       // create addressbook collection
    //       this.walletDB.collection({
    //         name: 'addressbook',
    //         schema: JSONSchemas.address
    //       }).then(collection => {
    //         this.addressbookCollection = collection;
    //         this.subject.next({ status: 1, text: 'Addressbook Collection Created' });
    //       });
    //     });
    //   });
    // }).catch( error => {
    //   this.logger.error(error);
    // });
    // return this.subject.asObservable();
  }
*/

  // async addAccount(accountID: string, accountSecret: string, accountLabel: string) {
  //   let account = await this.accountcollection.insert({accountID: accountID, secret: accountSecret, label: accountLabel, lastSequence: 0});
  //   return account;
  // }

  
}
