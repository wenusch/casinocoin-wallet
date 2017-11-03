import { Component, OnInit, ViewChild } from '@angular/core';
import { LokiAccount, LokiKey, LokiAddress } from '../../../domain/lokijs';
import { CSCUtil } from '../../../domain/csc-util';
import { LocalStorage, SessionStorage } from "ngx-store";
import { CasinocoinService } from '../../../providers/casinocoin.service';
import { WalletService } from '../../../providers/wallet.service';
import { Logger } from 'angular2-logger/core';
import { AppConstants } from '../../../domain/app-constants';
import { Menu as ElectronMenu, MenuItem as ElectronMenuItem } from "electron"; 
import { ElectronService } from '../../../providers/electron.service';
import { SelectItem, MenuItem } from 'primeng/primeng';

@Component({
  selector: 'app-receive-coins',
  templateUrl: './receive-coins.component.html',
  styleUrls: ['./receive-coins.component.scss']
})
export class ReceiveCoinsComponent implements OnInit {

  @LocalStorage() public availableWallets: Array<Object>;
  @SessionStorage() public currentWallet: string = "";

  accounts: Array<LokiAccount> = [];
  showCreateAccountDialog: boolean = false;
  walletPassword: string = "";
  accountLabel: string = "";
  showDialogFooter: boolean = false;
  errorMessage: string = "";
  receiveMenuItems: MenuItem[];
  selectedReceiveRow: LokiAccount;

  constructor(private logger: Logger,
              private casinocoinService: CasinocoinService,
              private walletService: WalletService,
              private electronService: ElectronService) { 
          this.logger.debug("### INIT ReceiveCoins ###");
  }

  ngOnInit() {
    this.walletService.openWalletSubject.subscribe( result => {
      if(result == AppConstants.KEY_LOADED){
        this.logger.debug("### ReceiveCoins Wallet Open ###");
        this.accounts = this.walletService.getAllAccounts();
        this.logger.debug("Created [0]: " + this.accounts[0].meta.created);
      }
    });

    // init swap context menu
    this.receiveMenuItems = [
      {label: 'Copy Address', icon: 'fa-copy', command: (event) => this.copyAddress()}
    ];

  }

  convertCscTimestamp(inputTime) {
    return CSCUtil.casinocoinToUnixTimestamp(inputTime);
  }

  onReceiveRowClick(e:any) {
    this.logger.debug("### onReceiveRowClick: " + JSON.stringify(e));
    this.selectedReceiveRow = e.data;
  }

  onLabelEditComplete(event){
    this.logger.debug("### onLabelEditComplete: " + JSON.stringify(event.data));
    // save changed account to database
    this.walletService.updateAccount(event.data);
  }

  onLabelEditCancel(event){
    this.logger.debug("### onLabelEditCancel: " + JSON.stringify(event));
  }

  onContextMenu(event){
    this.logger.debug("### onContextMenu: " + JSON.stringify(event));
    this.selectedReceiveRow = event.data;
  }

  copyAddress(){
    this.logger.debug("Copy to clipboard: " + this.selectedReceiveRow.accountID);
    this.electronService.clipboard.writeText(this.selectedReceiveRow.accountID);
  }

  editLabel(){
    this.logger.debug("Copy to clipboard: " + this.selectedReceiveRow.accountID);
    this.electronService.clipboard.writeText(this.selectedReceiveRow.accountID);
  }

  showCreateAccount(){
    this.showDialogFooter = false;
    this.showCreateAccountDialog = true;
  }

  doCreateNewAccount(){
    // first disable footer on submit
    this.showDialogFooter = false;
    this.errorMessage = "";
    if((this.walletPassword.length == 0) || (this.accountLabel.length == 0)){
      this.errorMessage = "Both account label and password must be entered.";
      this.showDialogFooter = true;
    } else {
      // check the wallet password
      let walletIndex = this.availableWallets.findIndex( item => item['walletUUID'] == this.currentWallet);
      let walletObject = this.availableWallets[walletIndex];
      this.logger.debug("### Check Wallet Password: " + JSON.stringify(walletObject));
      if(this.walletService.checkWalletPasswordHash(this.currentWallet, this.walletPassword, walletObject['hash'])){
        // generate new key pair offline
        let newKeyPair:LokiKey = this.casinocoinService.generateNewKeyPair();
        let password = "";
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
          this.walletService.encryptAllKeys(password).subscribe( result => {
            if(result == AppConstants.KEY_FINISHED){
              this.logger.debug("### Account Created: " + walletAccount.accountID);
              // refresh account list
              this.accounts = this.walletService.getAllAccounts();
              // hide dialog
              this.showCreateAccountDialog = false;
            }
          });
        }
      } else {
        this.errorMessage = "Invalid wallet password!!";
        this.walletPassword = "";
        this.showDialogFooter = true;
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
}
