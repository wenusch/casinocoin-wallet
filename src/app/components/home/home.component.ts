import { Component, OnInit, trigger, state, animate, transition, style } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Logger } from 'angular2-logger/core';
import { Router } from '@angular/router';
import { LocalStorage, SessionStorage } from "ngx-store";
import { ElectronService } from "../../providers/electron.service";
import { CasinocoinService } from "../../providers/casinocoin.service";
import { WalletService } from "../../providers/wallet.service";
import { MenuItem, Message } from 'primeng/primeng';
import { MessageService } from 'primeng/components/common/messageservice';
import { MatListModule, MatSidenavModule } from '@angular/material';
import { AppConstants } from '../../domain/app-constants';
import { AlertComponent } from '../alert/alert.component';

import * as LokiTypes from '../../domain/lokijs';

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

  //show_menu: string = 'shown';
  show_menu: string = 'small';
  menu_items: MenuItem[];
  context_menu_items: MenuItem[];

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
    // define context menu
    this.context_menu_items = [
      { label: 'Settings', icon: 'fa-info-circle', command: (event) => { this.onSettings() } },
      { label: 'Tools', icon: 'fa-info-circle', command: (event) => { this.onSettings() } },
      { label: 'Quit', icon: 'fa-sign-out', command: (event) => { this.onQuit() } }
    ];
    this.router.navigate(['overview']);
    // open the wallet if not yet open
    if(!this.walletService.isWalletOpen){
      this.logger.debug("### HOME open the wallet ###");
      this.walletService.openWallet(this.walletLocation, this.currentWallet).subscribe( result => {
        if(result == AppConstants.KEY_LOADED){
          this.logger.debug("### HOME load the accounts ###");
          let allAccounts: Array<LokiTypes.LokiAccount> = this.walletService.getAllAccounts();
          this.messageService.add({severity:'success', summary:'Service Message', detail:'Succesfully opened the wallet.'});
          this.logger.debug(allAccounts);
          // connect to the network
          this.casinocoinService.connect();
        }
      });
    } else {
      // connect to the network
      this.casinocoinService.connect();
    }
  }

  onMenuClick() {
    this.logger.debug("Menu Clicked !!");
    this.show_menu = this.show_menu == 'small' ? 'wide' : 'small';
  }

  selectedMenuItem(item) {
    item.command();
  }

  onSettings() {
    this.logger.debug("Settings Clicked !!");
  }

  onQuit() {
    this.logger.debug("Quit Clicked !!");
    // save the wallet

    // call application exit
    this.electron.remote.app.exit();
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
}
