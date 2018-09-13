import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LokiAccount, LokiKey } from '../../../domain/lokijs';
import { ElectronService } from '../../../providers/electron.service';
import { WalletService } from '../../../providers/wallet.service';
import { LogService } from '../../../providers/log.service';
import { AppConstants } from '../../../domain/app-constants';
// import { CasinocoinKeypairs as keypairs } from 'casinocoin-libjs';
// import { CasinocoinKeypairs } from 'casinocoin-libjs';

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
  importHeaderLabel:string = "Import Paper Wallet";
  importFooterLabel:string = "Paper Wallet Imported Successfully.";
  alreadyImportedLabel:string = "Paper Wallet already Imported.";

  constructor( private electron: ElectronService, 
               private walletService: WalletService, 
               private logger: LogService,
               private router: Router,
               private route: ActivatedRoute ) { }

  ngOnInit() {
    this.route.params.subscribe(params => {
      if (params['keyimport']) {
        this.importHeaderLabel = "Import Private Key";
        this.importFooterLabel = "Private Key Imported Successfully.";
        this.alreadyImportedLabel = "Private Key already Imported.";
      } else {
        this.importHeaderLabel = "Import Paper Wallet";
        this.importFooterLabel = "Paper Wallet Imported Successfully.";
        this.alreadyImportedLabel = "Paper Wallet already Imported.";
      }
    });
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
        this.keypair = this.electron.remote.getGlobal("vars").cscKeypairs.deriveKeypair(this.privateKey.trim());
      }
      catch(e) {
        this.errorMessage = "Invalid Private Key";
        this.privateKey = "";
        this.showDialogFooter = true;
        return;
      }
      this.address = this.electron.remote.getGlobal("vars").cscKeypairs.deriveAddress(this.keypair.publicKey);
      this.allAccounts = this.walletService.getAllAccounts();
      for(let account of this.allAccounts){
        if(account.accountID === this.address){
          this.errorMessage = this.alreadyImportedLabel;
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
      this.errorMessage = this.importFooterLabel;
      this.label = "";
      this.privateKey = "";
      this.walletPassword = "";
      this.showDialogFooter = true;
    }
  }

}