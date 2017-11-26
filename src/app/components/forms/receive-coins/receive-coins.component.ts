import { Component, OnInit, ViewChild } from '@angular/core';
import { LokiAccount, LokiKey, LokiAddress } from '../../../domain/lokijs';
import { CSCUtil } from '../../../domain/csc-util';
import { LocalStorage, SessionStorage } from "ngx-store";
import { CasinocoinService } from '../../../providers/casinocoin.service';
import { WalletService } from '../../../providers/wallet.service';
import { LogService } from '../../../providers/log.service';
import { AppConstants } from '../../../domain/app-constants';
import { ElectronService } from '../../../providers/electron.service';
import { SelectItem, MenuItem } from 'primeng/primeng';
import { Menu as ElectronMenu, MenuItem as ElectronMenuItem } from 'electron';

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
  selectedReceiveRow: LokiAccount;
  receive_context_menu: ElectronMenu;

  constructor(private logger: LogService,
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

    // define receive context menu
    let receive_context_menu_template = [
      { label: 'Copy Address', 
        click(menuItem, browserWindow, event) {
          browserWindow.webContents.send('receive-context-menu-event', 'copy-address');
        }
      }
    ];
    this.receive_context_menu = this.electronService.remote.Menu.buildFromTemplate(receive_context_menu_template);
    
    // listen to receive context menu events
    this.electronService.ipcRenderer.on('receive-context-menu-event', (event, arg) => {
      this.logger.debug("### Receive Menu Event: " + arg);
      if(arg == 'copy-address')
        this.copyReceiveAddress();
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
    this.receive_context_menu.popup(this.electronService.remote.getCurrentWindow());
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
    } else if(!this.walletService.checkWalletPasswordHash(this.walletPassword)){
      this.errorMessage = "You entered an invalid password.";
      this.showDialogFooter = true;
      this.walletPassword = "";
    } else {
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
            this.showCreateAccountDialog = false;
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
}
