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
import { CSCCrypto } from 'app/domain/csc-crypto';

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
  maxActiveIndex: number = 6;
  enableFinishDisclaimer: boolean = false;
  enableFinishPassword: boolean = false;
  enableFinishLocation: boolean = false;
  enableFinishCreation: boolean = false;
  enableCancelCreation: boolean = false;

  walletTestNetwork: boolean;
  disclaimerAccepted: boolean;
  walletLocation: string;
  walletPassword: string;
  recoveryMnemonicWords: Array<string>;
  recoveryAccepted:boolean;
  recoveryHash: string;
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
    // until we go live we set this to TRUE !!!!
    this.walletTestNetwork = true;

    let availableWallets: Array<any> = this.localStorageService.get(AppConstants.KEY_AVAILABLE_WALLETS);
    if(availableWallets != null &&  availableWallets.length >= 1){
      this.enableCancelCreation = true;
    }

    this.recoveryMnemonicWords = CSCCrypto.getRandomMnemonic();

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
          label: 'Disclaimer',
          command: (event: any) => {
              this.activeIndex = 2;
              this.msgs.length = 0;
              this.msgs.push({severity:'info', summary:'Accept Disclaimer', detail: event.item.label});
          }
      },
      {
          label: 'Password',
          command: (event: any) => {
              this.activeIndex = 3;
              this.msgs.length = 0;
              this.msgs.push({severity:'info', summary:'Wallet Password', detail: event.item.label});
          }
      },
      {
          label: 'Recovery',
          command: (event: any) => {
              this.activeIndex = 4;
              this.msgs.length = 0;
              this.msgs.push({severity:'info', summary:'Recovery Passphrase', detail: event.item.label});
          }
      },
      {
          label: 'Location',
          command: (event: any) => {
              this.activeIndex = 5;
              this.msgs.length = 0;
              this.msgs.push({severity:'info', summary:'Wallet Location', detail: event.item.label});
          }
      },
      {
          label: 'Finish',
          command: (event: any) => {
              this.activeIndex = 6;
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
    } else if(this.activeIndex == 5) {
      this.finishStep4();
    } else if(this.activeIndex == 6) {
      this.finishStep5();
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
    } else if(this.activeIndex == 5) {
      this.cancelStep5();
    } else if(this.activeIndex == 6) {
      this.cancelStep6();
    }
    if(this.activeIndex > 1){
      this.activeIndex -= 1;
    }
    this.logger.debug("Previous, New Active Step: " + this.activeIndex);
  }

  finishStep1() {
    // toggle to step 2
    this.logger.debug("### Wallet Testnetwork: " + this.walletTestNetwork);
  }

  finishStep2() {
    // toggle to step 3
    this.logger.debug("### Disclaimer Accepted?: " + this.disclaimerAccepted);
  }

  finishStep3() {
    // toggle to step 4
    this.logger.debug("Wallet Password: " + this.walletPassword);
  }

  finishStep4() {
    // toggle to step 5
    this.recoveryHash = new CSCCrypto(this.recoveryMnemonicWords).encrypt(this.walletPassword);
    this.logger.debug("Mnemonic Recovery Hash Created: " + this.recoveryHash);
  }

  finishStep5() {
    // toggle to step 4
    this.logger.debug("Wallet Location: " + this.walletLocation);
    this.logger.debug("### WalletSetup - Create Wallet");
    // generate wallet UUID
    this.walletUUID = UUID.UUID();
    // get environment 
    let walletEnvironment = LokiTypes.LokiDBEnvironment.prod;
    if(this.walletTestNetwork){
      walletEnvironment = LokiTypes.LokiDBEnvironment.test;
    }

    let mnemonic = "";
    // create the wallet
    this.walletService.createWallet( this.walletLocation, 
                                     this.walletUUID, 
                                     this.walletPassword,
                                     walletEnvironment,
                                     this.recoveryHash ).subscribe(createResult => {
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
            this.logger.debug("### WalletSetup - findBestServer Result: " + result);
            if(result && !serverFound){
              serverFound = true;
              // server found to connect to
              this.logger.debug("### WalletSetup - Connect to Network");
              // connect and subscribe to Casinocoin Service messages
              this.casinocoinService.connect().subscribe((message: any) => {
                this.logger.debug("### WalletSetup - Connect Message: " + message);
                if(message == AppConstants.KEY_CONNECTED){
                  this.connectedToNetwork = true;
                  this.enableFinishCreation = true;
                  // the websocket has a queued subject so send out the messages
                  this.casinocoinService.getServerState();
                  this.casinocoinService.subscribeToLedgerStream();
                  this.casinocoinService.subscribeToAccountsStream([walletAccount.accountID]);
                }
                
              });
            }
          });
        }
      }
    });
  }

  finishSetup() {
    // Close dialog and wallet setup and go to Home screen
    this.logger.debug("Setup Finished");
    this.logger.debug("Current Timestamp CSC: " + CSCUtil.unixToCasinocoinTimestamp(Date.now()));
    let newAvailableWallet = 
      { "walletUUID": this.walletUUID, 
        "creationDate": CSCUtil.iso8601ToCasinocoinTime(new Date().toISOString()),
        "location": this.walletLocation,
        "hash": this.walletHash,
        "network" : (this.walletTestNetwork ? "TEST" : "LIVE")
      };
    let walletArray: Array<any> = this.localStorageService.get(AppConstants.KEY_AVAILABLE_WALLETS);
    if(walletArray == null){
      // first wallet so init array
      walletArray = [];
    }
    walletArray.push(newAvailableWallet);
    this.sessionStorageService.set(AppConstants.KEY_CURRENT_WALLET, this.walletUUID);
    this.localStorageService.set(AppConstants.KEY_CURRENT_WALLET, this.walletUUID);
    this.localStorageService.set(AppConstants.KEY_AVAILABLE_WALLETS, walletArray);
    this.localStorageService.set(AppConstants.KEY_WALLET_LOCATION, this.walletLocation);
    this.localStorageService.set(AppConstants.KEY_PRODUCTION_NETWORK, !this.walletTestNetwork);
    this.localStorageService.set(AppConstants.KEY_SETUP_COMPLETED, true);
    this.router.navigate(['']);
  }

  cancelSetup(){
    this.logger.debug("Setup New Wallet Canceled");
    this.router.navigate(['/login']);
  }

  cancelStep2() {
    // toggle to step 1
  }

  cancelStep3() {
    // toggle to step 2 
  }

  cancelStep4() {
    // toggle to step 3  
  }

  cancelStep5() {
    // toggle to step 4
  }

  cancelStep6() {
    // toggle to step 5
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

  onDisclaimerAcceptedUpdated(newDisclaimerAccepted: boolean) {
    this.logger.debug("onDisclaimerAcceptedUpdated: " + newDisclaimerAccepted);
    this.disclaimerAccepted = newDisclaimerAccepted;
    this.enableFinishDisclaimer = newDisclaimerAccepted;
  }

  onPasswordUpdated(newPassword: string) {
    this.logger.debug("onPasswordUpdated: " + newPassword);
    if(newPassword.length > 0){
      this.walletPassword = newPassword;
      this.enableFinishPassword = true;
    } else {
      this.enableFinishPassword = false;
    }
  }

  onRecoveryAcceptChanged(recoveryAccepted: boolean) {
    this.logger.debug("onRecoveryAcceptChanged: " + recoveryAccepted);
    this.recoveryAccepted = recoveryAccepted;
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
