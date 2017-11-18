import { Component, OnInit, ViewChild } from '@angular/core';
import { InputText } from 'primeng/primeng';
import { Logger } from 'angular2-logger/core';
import { SelectItem, Dropdown, MenuItem, Message } from 'primeng/primeng';
import { MessageService } from 'primeng/components/common/messageservice';
import { CasinocoinService } from '../../../providers/casinocoin.service';
import { WalletService } from '../../../providers/wallet.service';
import { CSCUtil } from '../../../domain/csc-util';
import { AppConstants } from '../../../domain/app-constants';
import Big from 'big.js';
import { CasinocoinTxObject, PrepareTxPayment } from 'app/domain/csc-types';

@Component({
  selector: 'app-send-coins',
  templateUrl: './send-coins.component.html',
  styleUrls: ['./send-coins.component.scss']
})
export class SendCoinsComponent implements OnInit {

  @ViewChild('receipientInput') receipientInput;
  @ViewChild('descriptionInput') descriptionInput;
  @ViewChild('amountInput') amountInput;
  @ViewChild('accountDropdown') accountDropdown: Dropdown;
  @ViewChild('passwordInput') passwordInput;
  @ViewChild('feesInput') feesInput;

  accounts: SelectItem[] = [];
  selectedAccount: string;
  receipient: string = "";
  description: string = "";
  invoiceID: string;
  destinationTag: number;
  amount: string = "";
  fees: string = "";
  minimalFee: string = "";
  accountReserve: string = "";
  totalSend: string = "";
  walletPassword: string;
  showPasswordDialog:boolean = false;
  signAndSubmitIcon:string = "fa-check";
  reserve_tooltip:string = "The reserve is necessary to keep your account activated.";
  total_tooltip:string = "Total amount necessary to sent " + this.amount;
  includeReserve:boolean = false;
  invalidReceipient: boolean = true;
  isSendValid:boolean = true;

  constructor(private logger:Logger, 
              private casinocoinService: CasinocoinService,
              private walletService: WalletService,
              private messageService: MessageService ) { }

  ngOnInit() {
    this.logger.debug("### SendCoin onInit ###")
    // get accounts from wallet once its open
    this.walletService.openWalletSubject.subscribe( result => {
      if(result == AppConstants.KEY_LOADED){
        this.walletService.getAllAccounts().forEach( element => {
          if(new Big(element.balance) > 0){
            let accountLabel = element.label + " - " + element.accountID.substring(0,10) + '...' + " [Balance: " + CSCUtil.dropsToCsc(element.balance) + "]";
            this.accounts.push({label: accountLabel, value: element.accountID});
          }
        });
      }
    });
    // set the default fee and account reserve
    this.casinocoinService.serverStateSubject.subscribe(serverState => {
      this.logger.debug("### SendCoins - serverState: " + JSON.stringify(serverState));
      if(serverState.validated_ledger.base_fee != null){
        this.fees = CSCUtil.dropsToCsc(serverState.validated_ledger.base_fee.toString());
        this.minimalFee = this.fees;
        this.accountReserve = CSCUtil.dropsToCsc(serverState.validated_ledger.reserve_base.toString());
      }
    })
    // this.casinocoinService.ledgerSubject.subscribe( ledger => {
    //   this.logger.debug("### SendCoins - ledger: " + JSON.stringify(ledger));
    //   this.fees = CSCUtil.dropsToCsc(ledger.fee_base.toString());
    //   this.minimalFee = this.fees;
    //   this.logger.debug("### SendCoins - minimalFee: " + this.minimalFee);
    // });
  }

  onAmountChange(event){
    this.calculateTotal(this.includeReserve);
    this.checkSendValid();
  }

  onFeesChange(event){
    this.calculateTotal(this.includeReserve);
    this.checkSendValid();
  }

  onIncludeReserveChange(event){
    this.calculateTotal(this.includeReserve);
    this.checkSendValid();
  }

  onReceipientChange(event){
    let valid:boolean = CSCUtil.validateAccountID(event);
    this.logger.debug("### SendCoins - receipient: " + event + " valid: " + valid);
    this.invalidReceipient = !valid;
    this.checkSendValid();
  }

  focusDescription(){
    this.descriptionInput.nativeElement.focus();
  }

  focusAmount(){
    this.amountInput.nativeElement.focus();
  }

  focusFees(){
    this.feesInput.nativeElement.focus();
  }

  doCancelSignAndSubmitTx(){
    this.showPasswordDialog = false;
  }

  doSignAndSubmitTx(){
    this.signAndSubmitIcon = "fa-refresh";
    let preparePayment: PrepareTxPayment = 
      { source: this.selectedAccount, 
        destination: this.receipient, 
        amountDrops: CSCUtil.cscToDrops(this.amount),
        feeDrops: CSCUtil.cscToDrops(this.fees),
        description: this.description
      };
    if(this.destinationTag){
      preparePayment.destinationTag = this.destinationTag;
    }
    if(this.invoiceID && this.invoiceID.length > 0){
      preparePayment.invoiceID = CSCUtil.encodeInvoiceID(this.invoiceID);
    }
    let txObject = this.casinocoinService.createPaymentTx(preparePayment);
    this.logger.debug("### Sign: " + JSON.stringify(txObject));
    let txBlob:string = this.casinocoinService.signTx(txObject, this.walletPassword);
    if(txBlob == AppConstants.KEY_ERRORED){
      // probably a wrong password!
      this.messageService.add({severity:'error', summary:'Transaction Signing', detail:'There was an error signing the transactions. Verify your password.'});
    } else {
      this.casinocoinService.submitTx(txBlob);
      // reset form and dialog fields
      this.selectedAccount = "";
      this.receipient = "";
      this.description = "";
      this.walletPassword = "";
      this.amount = "";
      this.accountDropdown.resetFilter();
      this.invoiceID = "";
      this.destinationTag = undefined;
      this.totalSend = "";
    }
    this.showPasswordDialog = false;
    this.signAndSubmitIcon = "fa-check";
  }

  doSendCoins(){
    this.logger.debug("### SendCoinsComponent - doSendCoins ###");
    this.showPasswordDialog = true;
    this.passwordInput.nativeElement.focus();
  }

  calculateTotal(includeReserve: boolean){
    this.logger.debug("### SendCoins - calculateTotal: " + this.amount + " fees: " + this.fees);
    if(new Big(this.amount) > 0 && new Big(this.fees) > 0){
      // let totalSendSatoshi = new Big(CSCUtil.cscToDrops(this.amount)).plus(new Big(CSCUtil.cscToDrops(this.fees)));
      // this.totalSend = CSCUtil.dropsToCsc(totalSendSatoshi.toString());
      let amountToSend = new Big(CSCUtil.cscToDrops(this.amount));
      let maxToSend = new Big(this.walletService.getAccountBalance(this.selectedAccount))
                        .minus(new Big(CSCUtil.cscToDrops(this.fees)));
      if(!includeReserve){
        maxToSend = maxToSend.minus(new Big(CSCUtil.cscToDrops(this.accountReserve)));
      }
      this.logger.debug("amountToSend: " + amountToSend + " maxToSend: " + maxToSend + " this.accountReserve: " + this.accountReserve);
      if(amountToSend.gt(maxToSend)){
        // we need to reduce the amount so we do not pass maxToSend
        amountToSend = maxToSend;
        this.amount = CSCUtil.dropsToCsc(amountToSend.toString());
      }
      // set total to send
      if(!includeReserve){
        this.totalSend = CSCUtil.dropsToCsc(
          amountToSend.plus(new Big(CSCUtil.cscToDrops(this.fees)))
        );
      } else {
        this.totalSend = CSCUtil.dropsToCsc(
          amountToSend.plus(new Big(CSCUtil.cscToDrops(this.fees)))
                      .plus(new Big(CSCUtil.cscToDrops(this.accountReserve)))
        );
      }
      
    } else {
      this.totalSend = "0.00";
    }
    
  }

  checkSendValid(){
    if( CSCUtil.validateAccountID(this.receipient) && this.amount){
      if(this.receipient == this.selectedAccount){
        this.isSendValid = false;
      } else if (new Big(CSCUtil.cscToDrops(this.totalSend)) > 0) {
         this.isSendValid = true;
      } else {
        this.isSendValid = false;
      }
    } else {
      this.isSendValid = false;
    }
  }

  sendAllCoins(){
    this.logger.debug("### Send All coins !!");
    if(!this.includeReserve){
      this.amount = CSCUtil.dropsToCsc(
        new Big(this.walletService.getAccountBalance(this.selectedAccount))
        .minus(new Big(CSCUtil.cscToDrops(this.fees)))
        .minus(new Big(CSCUtil.cscToDrops(this.accountReserve)))
      );
    } else {
      this.amount = CSCUtil.dropsToCsc(
        new Big(this.walletService.getAccountBalance(this.selectedAccount))
        .minus(new Big(CSCUtil.cscToDrops(this.fees)))
      );
    }
    this.calculateTotal(this.includeReserve);
  }

}
