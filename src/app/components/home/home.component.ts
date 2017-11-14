import { Component, OnInit, trigger, state, animate, transition, style, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { Logger } from 'angular2-logger/core';
import { LocalStorage, SessionStorage, LocalStorageService, SessionStorageService } from 'ngx-store';
import { ElectronService } from '../../providers/electron.service';
import { Menu as ElectronMenu, MenuItem as ElectronMenuItem } from 'electron';
import { CasinocoinService } from '../../providers/casinocoin.service';
import { ServerDefinition } from '../../domain/websocket-types';
import { WalletService } from '../../providers/wallet.service';
import { MarketService } from '../../providers/market.service';
import { MenuItem as PrimeMenuItem, Message, ContextMenu } from 'primeng/primeng';
import { MatListModule, MatSidenavModule } from '@angular/material';
import { AppConstants } from '../../domain/app-constants';
import { CSCUtil } from '../../domain/csc-util';
import { LedgerStreamMessages, ServerStateMessage } from '../../domain/websocket-types';

import * as LokiTypes from '../../domain/lokijs';
import Big from 'big.js';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  animations: [
    trigger('component_visibility', [
        state('shown', style({
            opacity: 1
        })),
        state('hidden', style({
            opacity: 0
        })),
        transition('* => *', animate('.75s'))
    ])
  ]
})

export class HomeComponent implements OnInit {

  @SessionStorage() public currentWallet: string;
    
  @ViewChild('contextMenu') contextMenu: ContextMenu;

  //show_menu: string = 'shown';
  show_menu: string = 'small';
  menu_items: PrimeMenuItem[];
  tools_context_menu: ElectronMenu;
  connection_context_menu: ElectronMenu;

  dbMetadata: LokiTypes.LokiDBMetadata;

  showPrivateKeyImportDialog:boolean = false;
  showSettingsDialog:boolean = false;
  showServerInfoDialog:boolean = false;
  showPasswordDialog:boolean = false;
  privateKeySeed:string;
  walletPassword:string;
  importWalletPassword:string;
  importFileObject:Object;

  privateKeyExportLocation: string = "";

  // Growl messages
  msgs: Message[] = [];

  overview_image: string = require("./assets/overview_active.png");
  overview_text_class: string = "active_text_color";
  send_image: string = require("./assets/send.png");
  send_text_class: string = "inactive_text_color";
  receive_image: string = require("./assets/receive.png");
  receive_text_class: string = "inactive_text_color";
  addressbook_image: string = require("./assets/addressbook.png");
  addressbook_text_class: string = "inactive_text_color";
  swap_image: string = require('./assets/swap.png');
  swap_text_class: string = "inactive_text_color";

  active_menu_item: string = "transactions";

  isConnected: boolean = false;
  connected_icon: string = "fa fa-wifi fa-2x";
  connected_tooltip: string = "Disconnected";
  connection_image: string = "assets/icons/connected-red.png";

  searchDate: Date;

  serverState: ServerStateMessage;
  currentServer: ServerDefinition = { server_id: '', server_url: '', response_time: -1 };

  balance:string;;
  fiat_balance:string;
  transaction_count:number;
  last_transaction:number;

  constructor( private logger: Logger, 
               private router: Router,
               private electron: ElectronService,
               private walletService: WalletService,
               private casinocoinService: CasinocoinService ,
               private localStorageService: LocalStorageService,
               private sessionStorageService: SessionStorageService,
               private marketService: MarketService,
               private datePipe: DatePipe,
               private currenyPipe: CurrencyPipe ) {
    this.logger.debug("### INIT HOME ###");
    this.dbMetadata = {
      dbVersion: AppConstants.KEY_DB_VERSION,
      appVersion: this.electron.remote.app.getVersion(),
      environment: LokiTypes.LokiDBEnvironment.prod,
      walletUUID: "",
      walletHash: "",
      creationTimestamp: 0,
      updatedTimestamp: 0,
      location: "",
      lastOpenedTimestamp: 0
    }
  }

  ngOnInit() {
    this.logger.debug("### HOME currentWallet: " + this.currentWallet);
    // get server state
    this.serverState = this.casinocoinService.serverState;
    this.casinocoinService.serverStateSubject.subscribe( state => {
      this.serverState = state;
    });

    // define Tools context menu
    let tools_context_menu_template = [
      { label: 'Import Private Key', 
        click(menuItem, browserWindow, event) {
          browserWindow.webContents.send('tools-context-menu-event', 'import-priv-key');
        }
      },  
      { label: 'Export Private Keys', 
        click(menuItem, browserWindow, event) { 
          browserWindow.webContents.send('tools-context-menu-event', 'export-priv-keys');
        }
      },
      { label: 'Import Existing Wallet', 
        click(menuItem, browserWindow, event) { 
          browserWindow.webContents.send('tools-context-menu-event', 'add-wallet');
        }
      }
    ];
    this.tools_context_menu = this.electron.remote.Menu.buildFromTemplate(tools_context_menu_template);
    this.tools_context_menu.append(new this.electron.remote.MenuItem({ type: 'separator' }));
    this.tools_context_menu.append(new this.electron.remote.MenuItem(
      { label: 'Close Wallet', 
        click(menuItem, browserWindow, event) { 
          browserWindow.webContents.send('tools-context-menu-event', 'close-wallet');
        }
      })
    );
    this.tools_context_menu.append(new this.electron.remote.MenuItem({ type: 'separator' }));
    this.tools_context_menu.append(new this.electron.remote.MenuItem(
      { label: 'Quit', 
        click(menuItem, browserWindow, event) { 
          browserWindow.webContents.send('tools-context-menu-event', 'quit');
        }
      })
    );

    // define Connection context menu
    let connect_context_menu_template = [
     { label: 'Connect to Network', 
       click(menuItem, browserWindow, event) { 
          browserWindow.webContents.send('connection-context-menu-event', 'connect'); }, visible: true
      },
      { label: 'Disconnect from Network', 
        click(menuItem, browserWindow, event) { 
            browserWindow.webContents.send('connection-context-menu-event', 'disconnect'); }, visible: false
      },
      { label: 'Server Information', 
        click(menuItem, browserWindow, event) { 
            browserWindow.webContents.send('connection-context-menu-event', 'server-info'); }, visible: false
      }
    ];
    this.connection_context_menu = this.electron.remote.Menu.buildFromTemplate(connect_context_menu_template);
    

    // listen to tools context menu events
    this.electron.ipcRenderer.on('tools-context-menu-event', (event, arg) => {
      this.logger.debug("### HOME Menu Event: " + arg);
      if(arg == 'import-priv-key')
        this.onPrivateKeyImport();
      else if(arg == 'export-priv-keys')
        this.onPrivateKeysExport();
      else if(arg == 'backup-wallet')
        this.onBackupWallet();
      else if(arg == 'restore-backup')
        this.onRestoreBackup();
      else if(arg == 'add-wallet')
        this.onAddWallet();
      else if(arg == 'close-wallet')
        this.closeWallet();
      else if(arg == 'quit')
        this.onQuit();
      else
        this.logger.debug("### Context menu not implemented: " + arg);
    });

    // listen to connection context menu events
    this.electron.ipcRenderer.on('connection-context-menu-event', (event, arg) => {
      if(arg == 'connect')
        this.onConnect();
      else if(arg == 'disconnect')
        this.onDisconnect();
      else if(arg == 'server-info')
        this.onServerInfo();
      else
        this.logger.debug("### Context menu not implemented: " + arg);
    });

    // navigate to the transactions
    this.router.navigate(['transactions']);
    // subscribe to the openWallet subject
    this.walletService.openWalletSubject.subscribe( result => {
      if(result == AppConstants.KEY_LOADED){
        this.logger.debug("### HOME Wallet Open ###");
        // get the DB Metadata
        this.dbMetadata = this.walletService.getDBMetadata();
        this.logger.debug("### HOME DB Metadata: " + JSON.stringify(this.dbMetadata));
        // get balance and transaction count
        this.balance = this.walletService.getWalletBalance() ? this.walletService.getWalletBalance() : "0";
        this.transaction_count = this.walletService.getWalletTxCount() ? this.walletService.getWalletTxCount() : 0;
        let lastTX = this.walletService.getWalletLastTx();
        if(lastTX != null){
            this.last_transaction = lastTX.timestamp;
        }
        // until there is valid market info on new CSC we calculate market value against 1:1000 ratio
        let balanceOldCSC = new Big(CSCUtil.dropsToCsc(this.balance)).div(1000);
        let cscFiat = "0.00";
        if(this.marketService.coinMarketInfo){
          cscFiat = balanceOldCSC.times(this.marketService.coinMarketInfo.price_usd).toString();
        }
        this.fiat_balance = this.currenyPipe.transform(cscFiat, "USD", true, "1.2-2");
        // subscribe to transaction updates
        this.casinocoinService.transactionSubject.subscribe( tx => {
          this.transaction_count = this.walletService.getWalletTxCount() ? this.walletService.getWalletTxCount() : 0;
        });
        // subscribe to account updates
        this.casinocoinService.accountSubject.subscribe( account => {
          this.logger.debug("### HOME Account Update: " + JSON.stringify(account));
        });
      } else if(result == AppConstants.KEY_INIT && this.currentWallet){
        // wallet is not open but we seem to have a session, not good so redirect to login
        this.router.navigate(['/login']);
      }
    });
    // connect to the network
    this.connectToCasinocoinNetwork();
    // generate mnemonic
    let mnemonicArray = CSCUtil.getRandomMnemonic();
    let mnemonicString = mnemonicArray.join(',');
    this.logger.debug("### HOME mnemonic: " + mnemonicString);
    // crypto.createHmac('sha256', password).update(walletUUID).digest('hex');
    let mnemonicHash = crypto.createHash("sha512");
    mnemonicHash.update(mnemonicString);
    let finalHash = mnemonicHash.digest("hex");
    this.logger.debug("### HOME mnemonic hash: " + finalHash);

    let cipher = crypto.createCipher("aes-256-gcm", finalHash); 
    let encrypted = cipher.update("test1234", "utf8", "hex");
    encrypted += cipher.final("hex");
    this.logger.debug("### HOME Encrypted Password: " + encrypted);

    // let decipher = crypto.createDecipher("aes-256-gcm", finalHash);
    // let decrypted = decipher.update(encrypted, "hex", "utf8");
    // decrypted += decipher.final("utf8");
    // this.logger.debug("### HOME Decrypted Password: " + decrypted);

  }

  onMenuClick() {
    this.logger.debug("Menu Clicked !!");
    this.show_menu = this.show_menu == 'small' ? 'wide' : 'small';
  }

  onSettingsMenuClick(event) {
    this.showSettingsDialog = true;
  }

  onToolsMenuClick(event) {
    this.tools_context_menu.popup(this.electron.remote.getCurrentWindow());
  }

  onConnectionClick(event) {
    this.connection_context_menu.popup(this.electron.remote.getCurrentWindow());
  }

  selectedMenuItem(item) {
    item.command();
  }

  onConnect(){
    this.logger.debug("### HOME Connect ###");
    this.connectToCasinocoinNetwork();
  }

  onDisconnect(){
    this.logger.debug("### HOME Disconnect ###");
    this.casinocoinService.disconnect();
  }

  onServerInfo() {
    this.showServerInfoDialog = true;
  }

  onQuit() {
    this.logger.debug("Quit Clicked !!");
    // Close the windows to cause an application exit
    this.electron.remote.getCurrentWindow.call( close() );
  }

  onPrivateKeyImport() {
    this.showPrivateKeyImportDialog = true;
  }

  onPrivateKeysExport() {
    this.logger.debug('Open File Dialog: ' + this.electron.remote.app.getPath("documents"));
    this.electron.remote.dialog.showOpenDialog(
        { title: 'Private Key Export Location',
          defaultPath: this.electron.remote.app.getPath("documents"), 
          properties: ['openDirectory','createDirectory']}, (result) => {
          this.logger.debug('File Dialog Result: ' + JSON.stringify(result));
          if(result && result.length>0) {
            this.privateKeyExportLocation = result[0];
            // get all decrypted private keys
            let allPrivateKeys = this.walletService.decryptAllKeys("test1234");
            // create a filename
            let keyFilePath = path.join(result[0], (this.currentWallet + '.keys'));
            // Write the JSON array to the file 
            fs.writeFile(keyFilePath, JSON.stringify(allPrivateKeys), (err) => {
              if(err){
                  alert("An error ocurred creating the file "+ err.message)
              }
                          
              alert("The file has been succesfully saved");
            });
          }
        }
    );
  }

  onBackupWallet(){
    this.logger.debug('Open File Dialog: ' + this.electron.remote.app.getPath("documents"));
    this.electron.remote.dialog.showOpenDialog(
        { title: 'Wallet Backup Location',
          defaultPath: this.electron.remote.app.getPath("documents"), 
          properties: ['openDirectory','createDirectory']}, (result) => {
          this.logger.debug('File Dialog Result: ' + JSON.stringify(result));
          if(result && result.length>0) {
            let dbDump = this.walletService.getWalletDump();
            // create a filename
            let filename = this.datePipe.transform(Date.now(), "yyyy-MM-dd-HH-mm-ss") + "-csc-wallet.backup";
            let backupFilePath = path.join(result[0], filename);
            // Write the JSON array to the file 
            fs.writeFile(backupFilePath, dbDump, (err) => {
              if(err){
                  alert("An error ocurred creating the backup file: "+ err.message)
              }
                          
              alert("The backup has been succesfully saved to: " + filename);
            });
          }
        }
    );
  }

  onRestoreBackup(){
    this.logger.debug('Open File Dialog: ' + this.electron.remote.app.getPath("documents"));
    this.electron.remote.dialog.showOpenDialog(
        { title: 'Select Wallet Backup File',
          defaultPath: this.electron.remote.app.getPath("documents"),
          filters: [
            { name: 'CSC Wallet Backups', extensions: ['backup'] }
          ],
          properties: ['openFile']
        }, (result) => {
          this.logger.debug('File Dialog Result: ' + JSON.stringify(result));
          if(result && result.length > 0) {
            let dbDump = fs.readFileSync(result[0]);
            if(dbDump.length > 0){
              this.walletService.importWalletDump(dbDump);
              // redirect to login
              this.router.navigate(['/login']);
            }
          } else {
            alert("An error ocurred reading the backup file: "+ result[0]);
          }
        }
    );
  }

  onAddWallet(){
    this.logger.debug('Open File Dialog: ' + this.electron.remote.app.getPath("documents"));
    this.electron.remote.dialog.showOpenDialog(
        { title: 'Select Wallet',
          defaultPath: this.electron.remote.app.getPath("documents"),
          filters: [
            { name: 'CSC Wallet', extensions: ['db'] }
          ],
          properties: ['openFile']
        }, (result) => {
          this.logger.debug('File Dialog Result: ' + JSON.stringify(result));
          if(result && result.length > 0) {
            this.importFileObject = path.parse(result[0]);
            this.showPasswordDialog = true;
            return;
          } else {
            return;
          }
        }
    );
  }

  doWalletImport(){
    this.logger.debug("Add Wallet Location: " + JSON.stringify(this.importFileObject));
    let walletHash = this.walletService.generateWalletPasswordHash(this.importFileObject['name'], this.importWalletPassword);
    let newWallet =
        { "walletUUID": this.importFileObject['name'], 
          "importedDate": CSCUtil.iso8601ToCasinocoinTime(new Date().toISOString()),
          "location": this.importFileObject['dir'],
          "hash": walletHash
        };
    let availableWallets = this.localStorageService.get(AppConstants.KEY_AVAILABLE_WALLETS);
    availableWallets.push(newWallet);
    this.localStorageService.set(AppConstants.KEY_AVAILABLE_WALLETS, availableWallets);
    // redirect to login
    this.sessionStorageService.remove(AppConstants.KEY_CURRENT_WALLET);
    this.router.navigate(['/login']);
  }

  closeWallet(){
    this.sessionStorageService.remove(AppConstants.KEY_CURRENT_WALLET);
    this.router.navigate(['/login']);
  }

  connectToCasinocoinNetwork(){
    this.casinocoinService.connect().subscribe( connectResult => {
      this.logger.debug("### HOME Connect Result: " + connectResult);
      if(connectResult == AppConstants.KEY_CONNECTED){
        this.isConnected = true;
        this.connection_image = "assets/icons/connected.png";
        this.connected_tooltip = "Connected";
        this.setConnectedMenuItem(true);
        this.currentServer = this.casinocoinService.currentServer;
      } else if (connectResult == AppConstants.KEY_DISCONNECTED){
        this.isConnected = false;
        this.connection_image = "assets/icons/connected-red.png";
        this.connected_tooltip = "Disconnected";
        this.setConnectedMenuItem(false);
        this.currentServer = { server_id: '', server_url: '', response_time: -1 };
      }
    });
  }

  setConnectedMenuItem(connected: boolean){
    if(connected){
      // enable disconnect
      this.connection_context_menu.items[0].visible = false;
      this.connection_context_menu.items[1].visible = true;
      this.connection_context_menu.items[2].visible = true;
    } else {
      // enable connect
      this.connection_context_menu.items[0].visible = true;
      this.connection_context_menu.items[1].visible = false;
      this.connection_context_menu.items[2].visible = false;
    }
  }

  getConnectionColorClass(){
    if(this.isConnected){
      return "connected-color";
    } else {
      return "disconnected-color"
    }
  }

  getConnectionImage(){
    if(this.isConnected){
      return "../../../assets/icons/connected.png";
    } else {
      return "../../../assets/icons/connected-red.png"
    }
  }

  onOverview() {
    this.logger.debug("Home Clicked !!");
    // make overview active and others inactive

    // navigate to overview
    this.router.navigate(['overview']);
  }

  onTransactions() {
    this.logger.debug("Transactions Clicked !!");
    this.active_menu_item = "transactions";
    // navigate to transactions
    this.router.navigate(['transactions']);
  }

  onSendCoins() {
    this.logger.debug("Send Coins Clicked !!");
    this.active_menu_item = "send";
    // navigate to send
    this.router.navigate(['send']);
  }

  onReceiveCoins() {
    this.logger.debug("Receive Coins Clicked !!");
    this.active_menu_item = "receive";
    // navigate to receive
    this.router.navigate(['receive']);
  }

  onAddressbook() {
    this.logger.debug("Addressbook Clicked !!");
    this.active_menu_item = "addressbook";
    // navigate to addressbook
    this.router.navigate(['addressbook']);
  }

  onCoinSwap() {
    this.logger.debug("Coin Swap Clicked !!");
    this.active_menu_item = "coinswap";
    // navigate to swap
    this.router.navigate(['swap']);
  }

  onSupport() {
    this.logger.debug("Support Clicked !!");
    this.active_menu_item = "support";
    // navigate to support
    this.router.navigate(['support']);
  }

  onImportPrivateKey(){
    this.logger.debug("Import Private Key: " + this.privateKeySeed);
    this.walletService.importPrivateKey(this.privateKeySeed, this.walletPassword);
    // refresh accounts
    this.casinocoinService.checkAllAccounts();
    this.showPrivateKeyImportDialog = false;
  }

  onSettingsSave(){
    
  }
}
