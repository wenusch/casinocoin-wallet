import { Component, OnInit, ViewChild } from '@angular/core';
import { InputText } from 'primeng/primeng';
import { Logger } from 'angular2-logger/core';
import { SelectItem, Dropdown, MenuItem, Message } from 'primeng/primeng';
import { MessageService } from 'primeng/components/common/messageservice';
import { CasinocoinService } from '../../../providers/casinocoin.service';
import { WalletService } from '../../../providers/wallet.service';
import { CSCUtil } from '../../../domain/csc-util';
import { AppConstants } from '../../../domain/app-constants';

@Component({
  selector: 'app-send-coins',
  templateUrl: './send-coins.component.html',
  styleUrls: ['./send-coins.component.scss']
})
export class SendCoinsComponent implements OnInit {

  @ViewChild('receipientInput') receipientInput;
  @ViewChild('descriptionInput') descriptionInput;
  @ViewChild('amountInput') amounttInput;
  @ViewChild('accountDropdown') accountDropdown: Dropdown;
  
  accounts: SelectItem[] = [];
  selectedAccount: string;
  receipient: string;
  description: string;
  amount: string;
  walletPassword: string;
  showPasswordDialog:boolean = false;
  
  constructor(private logger:Logger, 
              private casinocoinService: CasinocoinService,
              private walletService: WalletService,
              private messageSerice: MessageService ) { }

  ngOnInit() {
    // get accounts from wallet
    if(this.walletService.isWalletOpen){
      this.walletService.getAllAccounts().forEach( element => {
        let accountLabel = element.accountID;
        if(element.label.length > 0){
          accountLabel = accountLabel + " [Balance: " + CSCUtil.dropsToCsc(element.balance) + "]";
        }
        this.accounts.push({label: accountLabel, value: element.accountID});
      });
    }
  }

  focusDescription(){
    this.descriptionInput.nativeElement.focus();
  }

  focusAmount(){
    this.amounttInput.nativeElement.focus();
  }

  doCancelSignAndSubmitTx(){
    this.showPasswordDialog = false;
  }

  doSignAndSubmitTx(){
    this.showPasswordDialog = false;
    let txObject = this.casinocoinService.createPaymentTx(this.selectedAccount, this.receipient, CSCUtil.cscToDrops(this.amount));
    this.logger.debug("### Sign: " + JSON.stringify(txObject));
    let txBlob:string = this.casinocoinService.signTx(txObject, this.walletPassword);
    if(txBlob == AppConstants.KEY_ERRORED){
      // probably a wrong password!
      this.messageSerice.add({severity:'error', summary:'Transaction Signing', detail:'There was an error signing the transactions. Verify your password.'});
    } else {
      this.casinocoinService.submitTx(txBlob);
    }
  }

  doSendCoins(){
    this.logger.debug("### SendCoinsComponent - doSendCoins ###");
    this.showPasswordDialog = true;
  }
}
