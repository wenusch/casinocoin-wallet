import { Component, OnInit } from '@angular/core';
import { CasinocoinService } from '../../../providers/casinocoin.service';
import { WalletService } from '../../../providers/wallet.service';
import { CSCUtil } from '../../../domain/csc-util';
import { LedgerStreamMessages, ServerStateMessage } from '../../../domain/websocket-types';
import { LokiTransaction } from '../../../domain/lokijs';
import { LogService } from '../../../providers/log.service';
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

  constructor(private logger: LogService,
              private casinocoinService: CasinocoinService,
              private walletService: WalletService) { 
    this.logger.debug("### INIT Overview ###");
  }

  ngOnInit() {
    this.logger.debug("### Overview ngOnInit() ###");
    this.ledgers = this.casinocoinService.ledgers;
    this.casinocoinService.serverStateSubject.subscribe( state => {
      this.serverState = state;
    });
    this.walletService.openWalletSubject.subscribe( result => {
      if(result == AppConstants.KEY_LOADED){
        this.logger.debug("### Overview Wallet Open ###");
        this.balance = this.walletService.getWalletBalance() ? this.walletService.getWalletBalance() : "0";
        this.transaction_count = this.walletService.getWalletTxCount() ? this.walletService.getWalletTxCount() : 0;
        let lastTX = this.walletService.getWalletLastTx();
        if(lastTX != null){
          this.last_transaction = lastTX.timestamp;
        }
        this.fiat_balance = "0.00";
        this.transactions = this.walletService.getAllTransactions();
        // subcribe to transaction updates
        this.casinocoinService.transactionSubject.subscribe( tx => {
          this.logger.debug("### Overview TX Update: " + JSON.stringify(tx));
          let updateTxIndex = this.transactions.findIndex( item => item.txID == tx.txID);
          if( updateTxIndex >= 0 ){
            this.transactions[updateTxIndex] = tx;
          } else {
            this.transactions.splice(0,0,tx);
          }
          
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
