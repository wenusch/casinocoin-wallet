import { Component, OnInit } from '@angular/core';
import { LokiAddress, LokiAccount, LokiKey } from '../../../domain/lokijs';
import { CasinocoinService } from '../../../providers/casinocoin.service';
import { WalletService } from '../../../providers/wallet.service';
import { LogService } from '../../../providers/log.service';
import { AppConstants } from '../../../domain/app-constants';
import { Menu as ElectronMenu, MenuItem as ElectronMenuItem } from "electron"; 
import { ElectronService } from '../../../providers/electron.service';
import { SelectItem, MenuItem } from 'primeng/primeng';
import { CSCUtil } from '../../../domain/csc-util';
import * as keypairs from 'casinocoin-libjs-keypairs';
import { QRCodeModule } from 'angular2-qrcode';


@Component({
  selector: 'app-importpaperwallet',
  templateUrl: './importpaperwallet.component.html',
  styleUrls: ['./importpaperwallet.component.scss']
})
export class ImportpaperwalletComponent implements OnInit {
  label:string = "";
  privateKey:string = "";
  walletPassword: string = "";
  showDialogFooter:boolean = false;
  errorMessage: string = "";
  keypair: any;
  address: any;
  allAccounts: any;

  constructor(private casinocoinService: CasinocoinService, private walletService: WalletService, private logger: LogService) { }

  ngOnInit() {
  }

  doSubmit() {
    if((this.label.length == 0) || (this.privateKey.length == 0) || (this.walletPassword.length == 0)){
      this.errorMessage = "All fields must be entered.";
      this.showDialogFooter = true;
      return;
    } else if(!this.walletService.checkWalletPasswordHash(this.walletPassword)){
      this.errorMessage = "You entered an invalid password.";
      return;
    } else {
      this.errorMessage = "";
      this.showDialogFooter = false;
      try {        
        this.keypair = keypairs.deriveKeypair(this.privateKey.trim());
      }
      catch(e) {
        this.errorMessage = "Invalid Private Key";
        this.privateKey = "";
        this.showDialogFooter = true;
        return;
      }
      this.address = keypairs.deriveAddress(this.keypair.publicKey);
      this.allAccounts = this.walletService.getAllAccounts();
      for(let account of this.allAccounts){
        if(account.accountID === this.address){
          this.errorMessage = "Paper Wallet already Imported.";
          this.label = "";
          this.privateKey = "";
          this.walletPassword = "";
          this.showDialogFooter = true;
          return;
        }
      }

      //let newKeyPair:LokiKey = this.casinocoinService.generateNewKeyPair();
      let newKeyPair: LokiKey = { 
        privateKey: "", 
        publicKey: "", 
        accountID: "", 
        secret: "", 
        encrypted: false
    };
    newKeyPair.secret = this.privateKey.trim();
    newKeyPair.privateKey = this.keypair.privateKey;
    newKeyPair.publicKey = this.keypair.publicKey;
    newKeyPair.accountID = this.address;

      this.walletService.addKey(newKeyPair);
      let walletAccount: LokiAccount = {
        accountID: this.address, 
        balance: "0", 
        lastSequence: 0, 
        label: this.label,
        activated: false,
        ownerCount: 0,
        lastTxID: "",
        lastTxLedger: 0
      };
      this.walletService.addAccount(walletAccount);
      this.walletService.encryptAllKeys(this.walletPassword).subscribe( result => {
          if(result == AppConstants.KEY_FINISHED){
            this.logger.debug("### Account Created: " + walletAccount.accountID);
          }
        });
      this.logger.debug("### Account Added with Paper Wallet: " + walletAccount.accountID);
      this.errorMessage = "Paper Wallet Imported Successfully.";
      this.label = "";
      this.privateKey = "";
      this.walletPassword = "";
      this.showDialogFooter = true;
    }
  }

}