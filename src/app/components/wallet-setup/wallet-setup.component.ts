import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { trigger, state, transition, style, animate } from '@angular/animations';
import { Router } from '@angular/router';
import { Logger } from 'angular2-logger/core';
import { ElectronService } from '../../providers/electron.service';
import { SessionStorageService, LocalStorageService } from "ngx-store";
import { AppConstants } from '../../domain/app-constants';
import { CSCUtil } from '../../domain/csc-util';
import * as LokiTypes from '../../domain/lokijs';
import { MenuItem, MessagesModule, Message } from 'primeng/primeng';
import { UUID } from 'angular2-uuid';
// import { CasinocoinAPI } from 'casinocoin-libjs';
import { WalletService } from '../../providers/wallet.service';
import { CasinocoinService } from '../../providers/casinocoin.service';
import { WebsocketService } from '../../providers/websocket.service';
import { SetupStep1Component } from './step1-component';

let path = require('path');

@Component({
  selector: 'app-wallet-setup',
  templateUrl: './wallet-setup.component.html',
  styleUrls: ['./wallet-setup.component.scss'],
  encapsulation: ViewEncapsulation.None,
  animations: [
    trigger('slideInOut', [
      state('in-left', style({
        transform: 'translate3d(0, 0, 0)'
      })),
      state('in-right', style({
        transform: 'translate3d(0, 0, 0)'
      })),
      state('out', style({
        transform: 'translate3d(100%, 0, 0)'
      })),
      transition('in-left => out', animate('400ms ease-in-out')),
      transition('in-right => out', animate('400ms ease-in-out')),
      transition('out => in-left', animate('400ms ease-in-out')),
      transition('out => in-right', animate('400ms ease-in-out'))
    ])
  ]
})

export class WalletSetupComponent implements OnInit {

  steps: MenuItem[];
  msgs: Message[] = [];
  activeIndex: number = 1;
  maxActiveIndex: number = 4;
  enableFinishPassword: boolean = false;
  enableFinishLocation: boolean = false;
  enableFinishCreation: boolean = false;

  step1State: string = 'in-left';
  step2State: string = 'out';
  step3State: string = 'out';
  step4State: string = 'out';

  walletTestNetwork: boolean;
  walletLocation: string;
  walletPassword: string;
  walletUUID: string;
  walletAccount: Object;

  walletCreated: boolean = false;
  accountCreated:boolean = false;
  keysEncrypted:boolean = false;
  connectedToNetwork: boolean = false;

  private walletHash: string;

  // Create an offline CasinocoinAPI
  // Server connection will be done via native WebSockets instead of casinocoin libjs
  // cscAPI = new CasinocoinAPI({ server: 'ws://158.69.59.142:7007' });
  // cscAPI = new CasinocoinAPI();

  constructor( private logger: Logger, 
               private electron: ElectronService,
               private router: Router,
               private localStorageService: LocalStorageService,
               private sessionStorageService: SessionStorageService,
               private walletService: WalletService,
               private casinocoinService: CasinocoinService,
               private websocketService: WebsocketService ) { }

  ngOnInit() {
    let userHome = this.electron.remote.app.getPath("home");
    this.walletLocation = path.join(userHome, '.casinocoin');
    this.walletTestNetwork = false;

    // if(userHome.indexOf(':\\') > 0) {
    //   this.walletLocation = userHome + '\\' + 'Casinocoin'; 
    // } else if(userHome.startsWith('/')){
    //   this.walletLocation = userHome + '/' + 'Casinocoin'; 
    // } else {
    //   this.walletLocation = userHome;
    // }
    
    this.steps = [{
          label: 'Start',
          command: (event: any) => {
              this.activeIndex = 1;
              this.msgs.length = 0;
              this.msgs.push({severity:'info', summary:'Start', detail: event.item.label});
          }
      },
      {
          label: 'Set Password',
          command: (event: any) => {
              this.activeIndex = 2;
              this.msgs.length = 0;
              this.msgs.push({severity:'info', summary:'Wallet Password', detail: event.item.label});
          }
      },
      {
          label: 'Wallet Location',
          command: (event: any) => {
              this.activeIndex = 3;
              this.msgs.length = 0;
              this.msgs.push({severity:'info', summary:'Wallet Location', detail: event.item.label});
          }
      },
      {
          label: 'Create Wallet',
          command: (event: any) => {
              this.activeIndex = 4;
              this.msgs.length = 0;
              this.msgs.push({severity:'info', summary:'Create Wallet', detail: event.item.label});
          }
      }
    ];    
  }
  
  navigateToNextStep() {
    if(this.activeIndex < this.maxActiveIndex){
      this.activeIndex += 1;
    }
    if(this.activeIndex == 2) {
      this.finishStep1();
    } else if (this.activeIndex == 3) {
      this.finishStep2();
    } else if(this.activeIndex == 4) {
      this.finishStep3();
    }
    
    this.logger.debug("Next, New Active Step: " + this.activeIndex);
  }

  navigateToPreviousStep() {
    if(this.activeIndex == 2) {
      this.cancelStep2();
    } else if (this.activeIndex == 3) {
      this.cancelStep3();
    } else if(this.activeIndex == 4) {
      this.cancelStep4();
    }
    if(this.activeIndex > 1){
      this.activeIndex -= 1;
    }
    this.logger.debug("Previous, New Active Step: " + this.activeIndex);
  }

  finishStep1() {
    // toggle to step 2
    this.logger.debug("Wallet Testnetwork: " + this.walletTestNetwork);
  }

  finishStep2() {
    // toggle to step 3
    this.logger.debug("User Password: " + this.walletPassword);
  }

  cancelStep2() {
    // toggle to step 1

  }

  finishStep3() {
    // toggle to step 4
    this.logger.debug("Wallet Location: " + this.walletLocation);
    this.logger.debug("### WalletSetup - Create Wallet");
    // generate wallet UUID
    this.walletUUID = UUID.UUID();
    // create the wallet
    this.walletService.createWallet(this.walletLocation, this.walletUUID, this.walletPassword).subscribe(createResult => {
      if(createResult == AppConstants.KEY_FINISHED){
        this.walletCreated = true;
        this.logger.debug("### WalletSetup - Create new Account");
        // generate new account key pair
        let newKeyPair:LokiTypes.LokiKey = this.casinocoinService.generateNewKeyPair();
        if (newKeyPair.accountID.length > 0){
          this.walletService.addKey(newKeyPair);
          // create new account
          let walletAccount: LokiTypes.LokiAccount = {
            accountID: newKeyPair.accountID, 
            balance: "0", 
            lastSequence: 0, 
            label: "Default Account",
            activated: false,
            ownerCount: 0,
            lastTxID: "",
            lastTxLedger: 0
          };
          this.walletService.addAccount(walletAccount);
          this.accountCreated = true;
          this.logger.debug("### WalletSetup - Encrypt Wallet Password");
          this.walletHash = this.walletService.generateWalletPasswordHash(this.walletUUID, this.walletPassword);
          this.logger.debug("### WalletSetup - Encrypt Wallet Keys");
          this.walletService.encryptAllKeys(this.walletPassword).subscribe( result => {
            if(result == AppConstants.KEY_FINISHED){
              this.keysEncrypted = true;
            }
          });
          this.logger.debug("### WalletSetup - Find Server to connect to");
          let serverFound = false;
          this.websocketService.findBestServer(!this.walletTestNetwork).subscribe( result => {
            if(result && !serverFound){
              serverFound = true;
              // server found to connect to
              this.logger.debug("### WalletSetup - Connect to Network");
              this.websocketService.connect();
              // subscribe to incomming messages
              this.casinocoinService.connect().subscribe((message: any) => {
                this.connectedToNetwork = true;
                this.logger.debug("### Received Network Message: " + JSON.stringify(message));
              });
              // the websocket has a queued subject so send out the messages
              this.casinocoinService.getServerState();
              this.casinocoinService.subscribeToLedgerStream();
              this.casinocoinService.subscribeToAccountsStream([walletAccount.accountID]);
            }
            this.enableFinishCreation = true;
          });
        }
      }
    });
  }

  cancelStep3() {
    // toggle to step 2
    this.step3State = 'out';
    this.step2State = 'in-right';
  }

  finishSetup() {
    // Close dialog and wallet setup and go to Home screen
    this.logger.debug("Setup Finished");
    this.logger.debug("Current Timestamp CSC: " + CSCUtil.unixToCasinocoinTimestamp(Date.now()));
    let walletArray = [
      { "walletUUID": this.walletUUID, 
        "creationDate": CSCUtil.iso8601ToCasinocoinTime(new Date().toISOString()),
        "location": this.walletLocation,
        "hash": this.walletHash
      }
    ];
    this.sessionStorageService.set(AppConstants.KEY_CURRENT_WALLET, this.walletUUID);
    this.localStorageService.set(AppConstants.KEY_CURRENT_WALLET, this.walletUUID);
    this.localStorageService.set(AppConstants.KEY_AVAILABLE_WALLETS, walletArray);
    this.localStorageService.set(AppConstants.KEY_WALLET_LOCATION, this.walletLocation);
    this.localStorageService.set(AppConstants.KEY_PRODUCTION_NETWORK, !this.walletTestNetwork);
    this.localStorageService.set(AppConstants.KEY_SETUP_COMPLETED, true);
    this.router.navigate(['']);
  }

  cancelStep4() {
    // toggle to step 3
    this.step4State = 'out';
    this.step3State = 'in-right';
  }

  onLocationUpdated(newLocation: string) {
    this.logger.debug("onLocationUpdated: " + newLocation);
    this.walletLocation = newLocation;
    this.enableFinishLocation = true;
  }
  
  onNetworkUpdated(testNetwork: boolean) {
    this.logger.debug("onNetworkUpdated: " + testNetwork);
    this.walletTestNetwork = testNetwork;
  }

  onPasswordUpdated(newPassword: string) {
    this.logger.debug("onPasswordUpdated: " + newPassword);
    this.walletPassword = newPassword;
    this.enableFinishPassword = true;
  }

  generateWalletAccount() {
    // this.walletAccount = this.cscAPI.generateAddress();
    this.logger.debug("### WalletSetup - Account: " + JSON.stringify(this.walletAccount));
    // let account = this.walletService.addAccount(this.walletAccount['address'], this.walletAccount['secret'], "Default Account");
    // this.logger.debug("### WalletSetup - Account Created: " + JSON.stringify(account));
  }

  createWallet() {
    this.logger.debug("### WalletSetup - Execute Wallet Creation");
    
    // this.walletService.createWallet(this.walletLocation, this.walletUUID, this.walletPassword).subscribe((message: any) => {
    //   this.logger.debug('### WalletSetup - Create Wallet Message: ' + JSON.stringify(message));
    //   if(message['status'] === 1){
    //     this.logger.debug('### WalletSetup - Wallet Creation Finished');
    //     this.generateWalletAccount();
    //     this.enableFinishCreation = true;
    //   }
    // });
  }

}
