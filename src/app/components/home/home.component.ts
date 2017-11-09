import { Component, OnInit, trigger, state, animate, transition, style, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Logger } from 'angular2-logger/core';
import { LocalStorage, SessionStorage } from "ngx-store";
import { ElectronService } from "../../providers/electron.service";
import { Menu as ElectronMenu, MenuItem as ElectronMenuItem } from "electron"; 
import { CasinocoinService } from "../../providers/casinocoin.service";
import { WalletService } from "../../providers/wallet.service";
import { MenuItem as PrimeMenuItem, Message, ContextMenu } from 'primeng/primeng';
import { MessageService } from 'primeng/components/common/messageservice';
import { MatListModule, MatSidenavModule } from '@angular/material';
import { AppConstants } from '../../domain/app-constants';
import { AlertComponent } from '../alert/alert.component';
import { CSCUtil } from '../../domain/csc-util';
import { LedgerStreamMessages, ServerStateMessage } from '../../domain/websocket-types';

import * as LokiTypes from '../../domain/lokijs';

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
  @LocalStorage() public walletLocation: string;

  @ViewChild('contextMenu') contextMenu: ContextMenu;

  //show_menu: string = 'shown';
  show_menu: string = 'small';
  menu_items: PrimeMenuItem[];
  context_menu: ElectronMenu;

  showPrivateKeyImportDialog:boolean = false;
  showSettingsDialog:boolean = false;
  privateKeySeed:string;
  walletPassword:string;

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

  balance:string;;
  fiat_balance:string;
  transaction_count:number;
  last_transaction:number;

  constructor(private logger: Logger, 
              private router: Router,
              private electron: ElectronService,
              private walletService: WalletService,
              private casinocoinService: CasinocoinService ,
              private messageService: MessageService) { }

  ngOnInit() {
    this.logger.debug("### HOME currentWallet: " + this.currentWallet);
    // define menu 
    this.menu_items = [
        { label: 'Overview', icon: 'fa fa-home fa-2x', command: (event) => { this.onOverview() } },
        { label: 'Send', icon: 'fa fa-sign-out fa-2x', command: (event) => { this.onSendCoins() } },
        { label: 'Receive', icon: 'fa fa-sign-in fa-2x', command: (event) => { this.onReceiveCoins() } },
        { label: 'Addressbook', icon: 'fa fa-address-book fa-2x', command: (event) => { this.onAddressbook() } },
        { label: 'Swap', icon: 'fa fa-exchange fa-2x', command: (event) => { this.onCoinSwap() } }
    ];

    
    // define context menu when COG is clicked
    let context_menu_template = [
      // { label: 'Connect to Network', icon: __dirname+ '/assets/icons/compress_black_16.png', click(menuItem, browserWindow, event) { 
      //     browserWindow.webContents.send('context-menu-event', 'connect'); }, visible: true
      // },
      // { label: 'Disconnect from Network', icon: __dirname+ '/assets/icons/expand_black_16.png', click(menuItem, browserWindow, event) { 
      //     browserWindow.webContents.send('context-menu-event', 'disconnect'); }, visible: false
      // },
      // { label: 'Tools', submenu: [
          {label: 'Import Private Key', click(menuItem, browserWindow, event) {
            browserWindow.webContents.send('context-menu-event', 'import-priv-key'); }
          },
          {label: 'Export Private Keys', click(menuItem, browserWindow, event) { 
            browserWindow.webContents.send('context-menu-event', 'export-priv-keys'); }
          },
          {label: 'Backup Wallet', click(menuItem, browserWindow, event) { 
            browserWindow.webContents.send('context-menu-event', 'export-priv-keys'); }
          }
        // ]
      // }
    ];
    this.context_menu = this.electron.remote.Menu.buildFromTemplate(context_menu_template);
    this.context_menu.append(new this.electron.remote.MenuItem({ type: 'separator' }));
    this.context_menu.append(new this.electron.remote.MenuItem(
      { label: 'Quit', click(menuItem, browserWindow, event) { 
        browserWindow.webContents.send('context-menu-event', 'quit'); }
      })
    );

    // listen to context menu events
    this.electron.ipcRenderer.on('context-menu-event', (event, arg) => {
      if(arg == 'import-priv-key')
        this.onPrivateKeyImport();
      else if(arg == 'export-priv-keys')
        this.onPrivateKeysExport();
      else if(arg == 'connect')
        this.onConnect();
      else if(arg == 'disconnect')
        this.onDisconnect();
      else if(arg == 'quit')
        this.onQuit();
      else
        this.logger.debug("### Context menu not implemented: " + arg);
    });
    // navigate to the transactions
    this.router.navigate(['transactions']);
    // subscribe to the openWallet subject
    this.walletService.openWalletSubject.subscribe( result => {
      if(result == AppConstants.KEY_LOADED){
        this.logger.debug("### HOME Wallet Open ###");
        this.messageService.add({severity:'info', summary:'Service Message', detail:'Succesfully opened the wallet.'});
        this.balance = this.walletService.getWalletBalance() ? this.walletService.getWalletBalance() : "0";
        this.transaction_count = this.walletService.getWalletTxCount() ? this.walletService.getWalletTxCount() : 0;
        let lastTX = this.walletService.getWalletLastTx();
        if(lastTX != null){
            this.last_transaction = lastTX.timestamp;
        }
        this.fiat_balance = "0.00";
      } else if(result == AppConstants.KEY_INIT && this.currentWallet){
        // wallet is not open but we seem to have a session, not good so redirect to login
        this.router.navigate(['/login']);
      }
    });
    // connect to the network
    this.connectToCasinocoinNetwork();
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
    this.context_menu.popup(this.electron.remote.getCurrentWindow());
  }

  onConnectionClick(event) {
    this.logger.debug("Connection Clicked !!");
  }

  selectedMenuItem(item) {
    item.command();
  }

  onConnect(){
    this.connectToCasinocoinNetwork();
  }

  onDisconnect(){
    this.casinocoinService.disconnect();
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

  connectToCasinocoinNetwork(){
    this.casinocoinService.connect().subscribe( connectResult => {
      this.logger.debug("### HOME Connect Result: " + connectResult);
      if(connectResult == AppConstants.KEY_CONNECTED){
        this.isConnected = true;
        this.connected_icon = "fa fa-wifi connected_color";
        this.connection_image = "assets/icons/connected.png";
        this.connected_tooltip = "Connected";
        this.messageService.add({severity:'info', summary:'Service Message', detail:'Connected to the Casinocoin network.'});
        this.setConnectedMenuItem(true);
      } else if (connectResult == AppConstants.KEY_DISCONNECTED){
        this.isConnected = false;
        this.connected_icon = "fa fa-wifi disconnected_color";
        this.connection_image = "assets/icons/connected-red.png";
        this.connected_tooltip = "Disconnected";
        this.messageService.add({severity:'info', summary:'Service Message', detail:'Disconnected from the Casinocoin network!'});
        this.setConnectedMenuItem(false);
      }
    });
  }

  setConnectedMenuItem(connected: boolean){
    if(connected){
      // enable disconnect
      this.context_menu.items[1].visible = false;
      this.context_menu.items[2].visible = true;
    } else {
      // enable connect
      this.context_menu.items[1].visible = true;
      this.context_menu.items[2].visible = false;
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
