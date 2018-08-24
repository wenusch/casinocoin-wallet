import { Component, OnInit, ViewChild } from '@angular/core';
import { LokiAccount, LokiKey, LokiAddress } from '../../../domain/lokijs';
import { CSCUtil } from '../../../domain/csc-util';
import { LocalStorage, SessionStorage } from "ngx-store";
import { CasinocoinService } from '../../../providers/casinocoin.service';
import { WalletService } from '../../../providers/wallet.service';
import { LogService } from '../../../providers/log.service';
import { AppConstants } from '../../../domain/app-constants';
import { ElectronService } from '../../../providers/electron.service';
import { Menu as ElectronMenu, MenuItem as ElectronMenuItem } from 'electron';
import { DatePipe } from '@angular/common';

const path = require('path');
const fs = require('fs');

@Component({
  selector: 'app-receive-coins',
  templateUrl: './receive-coins.component.html',
  styleUrls: ['./receive-coins.component.scss']
})
export class ReceiveCoinsComponent implements OnInit {

  @LocalStorage() public availableWallets: Array<Object>;
  @SessionStorage() public currentWallet: string = "";

  create_icon: string = "icon icon-save";
  accounts: Array<LokiAccount> = [];
  showCreateAccountDialog: boolean = false;
  walletPassword: string = "";
  error_message: string = "";
  accountLabel: string = "";
  showDialogFooter: boolean = false;
  errorMessage: string = "";
  selectedReceiveRow: LokiAccount;
  receive_context_menu: ElectronMenu;
  showReceiveQRCodeDialog: boolean = false;
  cscReceiveURI: string = "";
  sendAmount:string;
  destinationTag: number;
  label: string;
  privateKeyExportLocation: string = "";

  constructor(private logger: LogService,
              private casinocoinService: CasinocoinService,
              private walletService: WalletService,
              private datePipe: DatePipe,
              private electronService: ElectronService) { 
          this.logger.debug("### INIT ReceiveCoins ###");
  }

  ngOnInit() {
    this.walletService.openWalletSubject.subscribe( result => {
      if(result == AppConstants.KEY_LOADED){
        this.logger.debug("### ReceiveCoins Wallet Open ###");
        this.accounts = this.walletService.getAllAccounts();
        if(this.accounts == null){
          this.accounts = [];
        }
      }
    });

    // subscribe to account updates
    this.casinocoinService.accountSubject.subscribe( account => {
      this.accounts = this.walletService.getAllAccounts();
    });

    // define receive context menu
    let receive_context_menu_template = [
      { label: 'Copy Address', 
        click(menuItem, browserWindow, event) {
          browserWindow.webContents.send('receive-context-menu-event', 'copy-address');
        }
      },
      { label: 'Receive QRCode', 
        click(menuItem, browserWindow, event) {
          browserWindow.webContents.send('receive-context-menu-event', 'receive-qrcode');
        }
      },
      { label: 'Delete Account', 
        click(menuItem, browserWindow, event) {
          browserWindow.webContents.send('receive-context-menu-event', 'delete-account');
        }, visible: false
      }
    ];
    this.receive_context_menu = this.electronService.remote.Menu.buildFromTemplate(receive_context_menu_template);
    
    // listen to receive context menu events
    this.electronService.ipcRenderer.on('receive-context-menu-event', (event, arg) => {
      this.logger.debug("### Receive Menu Event: " + arg);
      if(arg == 'copy-address')
        this.copyReceiveAddress();
      else if(arg == 'receive-qrcode')
        this.showReceiveQRCode();
      else if(arg == 'delete-account')
        this.deleteAccount();
      else
        this.logger.debug("### Context menu not implemented: " + arg);
    });

  }

  convertCscTimestamp(inputTime) {
    return CSCUtil.casinocoinToUnixTimestamp(inputTime);
  }

  showReceiveContextMenu(event){
    this.selectedReceiveRow = event.data;
    this.logger.debug("### showReceiveContextMenu: " + JSON.stringify(this.selectedReceiveRow));
    if(this.selectedReceiveRow.activated == false || this.selectedReceiveRow.balance == "0"){
      this.logger.debug("### showReceiveContextMenu - visible = false for: " + this.receive_context_menu.items[2].label);
      this.receive_context_menu.items[2].visible = true;
    } else {
      this.receive_context_menu.items[2].visible = false;
    }
    this.receive_context_menu.popup({window: this.electronService.remote.getCurrentWindow()});
  }

  onLabelEditComplete(event){
    this.logger.debug("### onLabelEditComplete: " + JSON.stringify(event.data));
    // save changed account to database
    this.walletService.updateAccount(event.data);
  }

  onLabelEditCancel(event){
    this.logger.debug("### onLabelEditCancel: " + JSON.stringify(event));
  }

  copyReceiveAddress(){
    if(this.selectedReceiveRow) {
      this.logger.debug("Copy to clipboard: " + this.selectedReceiveRow.accountID);
      this.electronService.clipboard.writeText(this.selectedReceiveRow.accountID);
    }
  }

  showReceiveQRCode(){
    if(this.selectedReceiveRow){
      this.logger.debug("showReceiveQRCode: " + JSON.stringify(this.selectedReceiveRow));
      this.cscReceiveURI = CSCUtil.generateCSCQRCodeURI({ address: this.selectedReceiveRow.accountID });
      this.showReceiveQRCodeDialog = true;
    }
  }

  showCreateAccount(){
    this.showDialogFooter = false;
    this.accountLabel = "";
    this.walletPassword = "";
    this.create_icon = "icon icon-save";
    this.showCreateAccountDialog = true;
  }

  deleteAccount(){
    if(this.selectedReceiveRow){
      this.logger.debug("deleteAccount: " + JSON.stringify(this.selectedReceiveRow));
      if(this.selectedReceiveRow.activated == false || this.selectedReceiveRow.balance == "0"){
        // remove key and account
        this.walletService.removeKey(this.selectedReceiveRow.accountID);
        this.walletService.removeAccount(this.selectedReceiveRow.accountID);
        // refresh account list
        this.accounts = this.walletService.getAllAccounts();
      }
    }
  }

  doCreateNewAccount(){
    // first disable footer on submit
    this.showDialogFooter = false;
    this.errorMessage = "";
    if((this.walletPassword.length == 0) || (this.accountLabel.length == 0)){
      this.errorMessage = "Both account label and password must be entered.";
      this.showDialogFooter = true;
    } else if(!this.walletService.checkWalletPasswordHash(this.walletPassword)){
      this.errorMessage = "You entered an invalid password.";
      this.showDialogFooter = true;
      this.walletPassword = "";
    } else {
      this.create_icon = "fa fa-refresh fa-spin";
      // generate new key pair offline
      let newKeyPair:LokiKey = this.casinocoinService.generateNewKeyPair();
      let accountLabel = "";
      if (newKeyPair.accountID.length > 0){
        // add keypair to database
        this.walletService.addKey(newKeyPair);
        // create new account
        let walletAccount: LokiAccount = {
          accountID: newKeyPair.accountID, 
          balance: "0", 
          lastSequence: 0, 
          label: this.accountLabel,
          activated: false,
          ownerCount: 0,
          lastTxID: "",
          lastTxLedger: 0
        };
        this.walletService.addAccount(walletAccount);
        this.logger.debug("### Create Account - Encrypt Wallet Keys");
        this.walletService.encryptAllKeys(this.walletPassword).subscribe( result => {
          if(result == AppConstants.KEY_FINISHED){
            this.logger.debug("### Account Created: " + walletAccount.accountID);
            // refresh account list
            this.accounts = this.walletService.getAllAccounts();
            // hide dialog
            this.create_icon = "icon icon-save";
            this.showCreateAccountDialog = false;
            this.selectPrivateKeysExportLocation();
          }
        });
      }
    }
  }

  getActivatedIconClasses(activated: boolean){
    if(activated){
      return ["fa", "fa-check", "color_green"];
    } else {
      return ["fa", "fa-times", "color_red"];
    }
  }

  updateQRCode(){
    let uriObject = { address: this.selectedReceiveRow.accountID };
    if(this.sendAmount && this.sendAmount.length > 0){
      uriObject['amount'] = this.sendAmount;
    }
    if(this.destinationTag && (this.destinationTag > 0 && this.destinationTag < 2147483647)){
      uriObject['destinationTag'] = this.destinationTag;
    }
    if(this.label && this.label.length > 0){
      uriObject['label'] = this.label;
    }
    this.cscReceiveURI = CSCUtil.generateCSCQRCodeURI(uriObject);
  }

  selectPrivateKeysExportLocation() {
    this.logger.debug("### selectPrivateKeysExportLocation()");
    // first check the password
    this.logger.debug('Open File Dialog: ' + this.electronService.remote.app.getPath("documents"));
    this.electronService.remote.dialog.showOpenDialog(
        { title: 'Private Key Export Location',
          defaultPath: this.electronService.remote.app.getPath("documents"), 
          properties: ['openDirectory']}, (result) => {
          this.logger.debug('File Dialog Result: ' + JSON.stringify(result));
          if(result && result.length>0) {
            this.privateKeyExportLocation = result[0];
            // get all decrypted private keys
            let allPrivateKeys = this.walletService.decryptAllKeys(this.walletPassword);
            // create a filename
            let filename = this.datePipe.transform(Date.now(), "yyyy-MM-dd-HH-mm-ss-") + this.currentWallet + '.keys';
            let keyFilePath = path.join(result[0], filename);
            // Write the JSON array to the file 
            fs.writeFile(keyFilePath, JSON.stringify(allPrivateKeys), (err) => {
              if(err){
                this.electronService.remote.dialog.showErrorBox("Error saving private keys", "An error occurred writing your private keys to a file: " + err.message);
              }
              this.electronService.remote.dialog.showMessageBox(
                { message: "Your private keys have been saved to a file in the chosen directory. Make sure you put it in a safe place as it contains your decrypted private keys!", 
                  buttons: ["OK"] 
                });
            });
          }
        }
    );
  }

}
