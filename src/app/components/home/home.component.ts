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

import * as LokiTypes from '../../domain/lokijs';

const path = require('path');
const fs = require('fs');

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

  connected_icon: string = "fa fa-wifi fa-2x";
  connected_tooltip: string = "Disconnected";

  searchDate: Date;

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
      { label: 'Settings', icon: __dirname+ '/assets/icons/cogs_black_16.png', click(menuItem, browserWindow, event) { 
          browserWindow.webContents.send('context-menu-event', 'settings'); }
      },
      { label: 'Connect to Network', icon: __dirname+ '/assets/icons/compress_black_16.png', click(menuItem, browserWindow, event) { 
          browserWindow.webContents.send('context-menu-event', 'connect'); }, visible: true
      },
      { label: 'Disconnect from Network', icon: __dirname+ '/assets/icons/expand_black_16.png', click(menuItem, browserWindow, event) { 
          browserWindow.webContents.send('context-menu-event', 'disconnect'); }, visible: false
      },
      { label: 'Tools', submenu: [
          {label: 'Import Private Key', icon: __dirname+'/assets/icons/sign-in_black_16.png', click(menuItem, browserWindow, event) { 
            browserWindow.webContents.send('context-menu-event', 'import-priv-key'); }
          },
          {label: 'Export Private Keys', icon: __dirname+'/assets/icons/sign-out_black_16.png', click(menuItem, browserWindow, event) { 
            browserWindow.webContents.send('context-menu-event', 'export-priv-keys'); }
          },
          {label: 'Backup Wallet', icon: __dirname+'/assets/icons/file-zip_black_16.png', click(menuItem, browserWindow, event) { 
            browserWindow.webContents.send('context-menu-event', 'export-priv-keys'); }
          }
        ]
      }
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
      if(arg == 'settings')
        this.onSettings();
      else if(arg == 'import-priv-key')
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
    // navigate to the overview
    this.router.navigate(['overview']);
    // open the wallet if not yet open
    if(!this.walletService.isWalletOpen){
      this.logger.debug("### HOME open the wallet ###");
      this.walletService.openWallet(this.walletLocation, this.currentWallet).subscribe( result => {
        if(result == AppConstants.KEY_LOADED){
          this.logger.debug("### HOME load the accounts ###");
          this.messageService.add({severity:'info', summary:'Service Message', detail:'Succesfully opened the wallet.'});
        }
      });
    }
    // connect to the network
    this.connectToCasinocoinNetwork();
  }

  onMenuClick() {
    this.logger.debug("Menu Clicked !!");
    this.show_menu = this.show_menu == 'small' ? 'wide' : 'small';
  }

  onContextMenuClick(event) {
    this.context_menu.popup(this.electron.remote.getCurrentWindow());
  }

  onConnectionContextMenuClick(event) {
    
  }

  selectedMenuItem(item) {
    item.command();
  }

  onSettings() {
    this.logger.debug("Settings Clicked !!");
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
        this.connected_icon = "fa fa-wifi fa-2x connected_color";
        this.connected_tooltip = "Connected";
        this.messageService.add({severity:'info', summary:'Service Message', detail:'Connected to the Casinocoin network.'});
        this.setConnectedMenuItem(true);
      } else if (connectResult == AppConstants.KEY_DISCONNECTED){
        this.connected_icon = "fa fa-wifi fa-2x";
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

  onOverview() {
    this.logger.debug("Home Clicked !!");
    // make overview active and others inactive
    this.overview_image = require("./assets/overview_active.png");
    this.overview_text_class = "active_text_color";
    this.send_image = require("./assets/send.png");
    this.send_text_class = "inactive_text_color";
    this.receive_image = require("./assets/receive.png");
    this.receive_text_class = "inactive_text_color";
    this.addressbook_image = require("./assets/addressbook.png");
    this.addressbook_text_class = "inactive_text_color";
    this.swap_image = require("./assets/swap.png");
    this.swap_text_class = "inactive_text_color";
    // navigate to overview
    this.router.navigate(['overview']);
  }

  onSendCoins() {
    this.logger.debug("Send Coins Clicked !!");
    // make send active and others inactive
    this.overview_image = require("./assets/overview.png");
    this.overview_text_class = "inactive_text_color";
    this.send_image = require("./assets/send_active.png");
    this.send_text_class = "active_text_color";
    this.receive_image = require("./assets/receive.png");
    this.receive_text_class = "inactive_text_color";
    this.addressbook_image = require("./assets/addressbook.png");
    this.addressbook_text_class = "inactive_text_color";
    this.swap_image = require("./assets/swap.png");
    this.swap_text_class = "inactive_text_color";
    // navigate to send
    this.router.navigate(['send']);
  }

  onReceiveCoins() {
    this.logger.debug("Receive Coins Clicked !!");
    // make receive active and others inactive
    this.overview_image = require("./assets/overview.png");
    this.overview_text_class = "inactive_text_color";
    this.send_image = require("./assets/send.png");
    this.send_text_class = "inactive_text_color";
    this.receive_image = require("./assets/receive_active.png");
    this.receive_text_class = "active_text_color";
    this.addressbook_image = require("./assets/addressbook.png");
    this.addressbook_text_class = "inactive_text_color";
    this.swap_image = require("./assets/swap.png");
    this.swap_text_class = "inactive_text_color";
    // navigate to receive
    this.router.navigate(['receive']);
  }

  onAddressbook() {
    this.logger.debug("Addressbook Clicked !!");
    // make addressbook active and others inactive
    this.overview_image = require("./assets/overview.png");
    this.overview_text_class = "inactive_text_color";
    this.send_image = require("./assets/send.png");
    this.send_text_class = "inactive_text_color";
    this.receive_image = require("./assets/receive.png");
    this.receive_text_class = "inactive_text_color";
    this.addressbook_image = require("./assets/addressbook_active.png");
    this.addressbook_text_class = "active_text_color";
    this.swap_image = require("./assets/swap.png");
    this.swap_text_class = "inactive_text_color";
    // navigate to addressbook
    this.router.navigate(['addressbook']);
  }

  onCoinSwap() {
    this.logger.debug("Coin Swap Clicked !!");
    // make swap active and others inactive
    this.overview_image = require("./assets/overview.png");
    this.overview_text_class = "inactive_text_color";
    this.send_image = require("./assets/send.png");
    this.send_text_class = "inactive_text_color";
    this.receive_image = require("./assets/receive.png");
    this.receive_text_class = "inactive_text_color";
    this.addressbook_image = require("./assets/addressbook.png");
    this.addressbook_text_class = "inactive_text_color";
    this.swap_image = require("./assets/swap_active.png");
    this.swap_text_class = "active_text_color";
    // navigate to swap
    this.router.navigate(['swap']);
  }

  onImportPrivateKey(){
    this.logger.debug("Import Private Key: " + this.privateKeySeed);
    this.walletService.importPrivateKey(this.privateKeySeed, this.walletPassword);
    // refresh accounts
    this.casinocoinService.checkAllAccounts();
    this.showPrivateKeyImportDialog = false;
  }
}
