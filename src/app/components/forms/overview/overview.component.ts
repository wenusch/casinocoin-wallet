import { Component, OnInit } from '@angular/core';
import { CasinocoinService } from '../../../providers/casinocoin.service';
import { WalletService } from '../../../providers/wallet.service';
import { CSCUtil } from '../../../domain/csc-util';
import { LedgerStreamMessages, ServerStateMessage } from '../../../domain/websocket-types';
import { LokiTransaction } from '../../../domain/lokijs';
import { Logger } from 'angular2-logger/core';
import { AppConstants } from '../../../domain/app-constants';

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss']
})
export class OverviewComponent implements OnInit {

  transactions: LokiTransaction[] = [];
  ledgers: LedgerStreamMessages[] = [];
  serverState: ServerStateMessage;

  balance:string;;
  fiat_balance:string;
  transaction_count:number;
  last_transaction:number;

  constructor(private logger: Logger,
              private casinocoinService: CasinocoinService,
              private walletService: WalletService) { 
    this.logger.debug("### INIT Overview ###");
    // this.transactions = [
    //   {time: Date.now(), amount: 2344, account: "cpcPqHu4TpXwF34LN5TGvB31QE5L3bNYWy", ledger: 245, validated: false},
    //   {time: Date.now(), amount: 1003, account: "cpcPqHu4TpXwF34LN5TGvB31QE5L3bNYWy", ledger: 215, validated: true},
    //   {time: Date.now(), amount: -200, account: "cpcPqHu4TpXwF34LN5TGvB31QE5L3bNYWy", ledger: 195, validated: true},
    //   {time: Date.now(), amount: 23, account: "cpcPqHu4TpXwF34LN5TGvB31QE5L3bNYWy", ledger: 165, validated: true},
    //   {time: Date.now(), amount: 1644, account: "cpcPqHu4TpXwF34LN5TGvB31QE5L3bNYWy", ledger: 154, validated: true},
    //   {time: Date.now(), amount: -3, account: "cpcPqHu4TpXwF34LN5TGvB31QE5L3bNYWy", ledger: 125, validated: true},
    //   {time: Date.now(), amount: -1988, account: "cpcPqHu4TpXwF34LN5TGvB31QE5L3bNYWy", ledger: 92, validated: true},
    //   {time: Date.now(), amount: 23275, account: "cpcPqHu4TpXwF34LN5TGvB31QE5L3bNYWy", ledger: 88, validated: true},
    //   {time: Date.now(), amount: 20000, account: "cpcPqHu4TpXwF34LN5TGvB31QE5L3bNYWy", ledger: 61, validated: true},
    //   {time: Date.now(), amount: 1000, account: "cpcPqHu4TpXwF34LN5TGvB31QE5L3bNYWy", ledger: 32, validated: true}
    // ];
  }

  ngOnInit() {
    this.logger.debug("### Overview ngOnInit() ###");
    this.ledgers = this.casinocoinService.ledgers;
    this.serverState = this.casinocoinService.serverState;
    this.casinocoinService.serverStateSubject.subscribe( state => {
      this.serverState = state;
    });
    this.walletService.openWalletSubject.subscribe( result => {
      if(result == AppConstants.KEY_LOADED){
        this.logger.debug("### Overview Wallet Open ###");
        this.balance = this.walletService.getWalletBalance();
        this.transaction_count = this.walletService.getWalletTxCount();
        let lastTX = this.walletService.getWalletLastTx();
        if(lastTX != null){
          this.last_transaction = lastTX.timestamp;
        }
        this.fiat_balance = "0.00";
        this.transactions = this.walletService.getAllTransactions();
        // subcribe to transaction updates
        this.casinocoinService.transactionSubject.subscribe( tx => {
          this.logger.debug("### Overview TX Update: " + JSON.stringify(tx));
        });
      }
    });
  }

  getDescription(rowData){
    if(rowData.memos && rowData.memos.length > 0){
      return rowData.memos[0].memo.memoData;
    } else {
      return"-";
    }
  }

  convertCscTimestamp(inputTime) {
    return CSCUtil.casinocoinToUnixTimestamp(inputTime);
  }

  getTXAccount(rowData){
    if(rowData.direction == AppConstants.KEY_WALLET_TX_IN){
      return rowData.destination;
    } else {
      return rowData.accountID;
    }
  }

  getTXCellColor(cell, rowData){
    if(rowData.direction == AppConstants.KEY_WALLET_TX_OUT){
      cell.parentNode.parentNode.style.background = "#901119";
    } else if(rowData.direction == AppConstants.KEY_WALLET_TX_IN){
      cell.parentNode.parentNode.style.background = "#119022";
    } else {
      cell.parentNode.parentNode.style.background = "#114490";
    }
  }

  getTXTextColor(cell, rowData){
    if(rowData.direction == AppConstants.KEY_WALLET_TX_OUT){
      // outgoing tx
      cell.parentNode.parentNode.style.color = "#901119";
    } else if(rowData.direction == AppConstants.KEY_WALLET_TX_IN){
      // incomming tx
      cell.parentNode.parentNode.style.color = "#119022";
    } else {
      // wallet tx
      cell.parentNode.parentNode.style.color = "#114490";
    }
  }

  getValidatedIconClasses(validated: boolean){
    if(validated){
      return ["fa", "fa-check", "color_green"];
    } else {
      return ["fa", "fa-times", "color_red"];
    }
  }

}
