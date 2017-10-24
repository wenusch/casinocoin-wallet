import { Component, OnInit } from '@angular/core';
import { CasinocoinService } from '../../../providers/casinocoin.service';
import { CSCUtil } from '../../../domain/cscutil';
import { LedgerStreamMessages } from '../../../domain/websocket-types';
import { Logger } from 'angular2-logger/core';

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss']
})
export class OverviewComponent implements OnInit {

  transactions: any[];
  ledgers: LedgerStreamMessages[] = [];

  balance: string = "19982.44";
  fiat_balance: string = "$23.75";
  transaction_count: number = 14;
  last_transaction: Date = new Date(1507812301);

  constructor(private casinocoinService: CasinocoinService, private logger: Logger) { 
    this.logger.debug("### INIT Overview ###");
    this.transactions = [
      {time: Date.now(), amount: 2344, account: "cpcPqHu4TpXwF34LN5TGvB31QE5L3bNYWy", ledger: 245, validated: false},
      {time: Date.now(), amount: 1003, account: "cpcPqHu4TpXwF34LN5TGvB31QE5L3bNYWy", ledger: 215, validated: true},
      {time: Date.now(), amount: -200, account: "cpcPqHu4TpXwF34LN5TGvB31QE5L3bNYWy", ledger: 195, validated: true},
      {time: Date.now(), amount: 23, account: "cpcPqHu4TpXwF34LN5TGvB31QE5L3bNYWy", ledger: 165, validated: true},
      {time: Date.now(), amount: 1644, account: "cpcPqHu4TpXwF34LN5TGvB31QE5L3bNYWy", ledger: 154, validated: true},
      {time: Date.now(), amount: -3, account: "cpcPqHu4TpXwF34LN5TGvB31QE5L3bNYWy", ledger: 125, validated: true},
      {time: Date.now(), amount: -1988, account: "cpcPqHu4TpXwF34LN5TGvB31QE5L3bNYWy", ledger: 92, validated: true},
      {time: Date.now(), amount: 23275, account: "cpcPqHu4TpXwF34LN5TGvB31QE5L3bNYWy", ledger: 88, validated: true},
      {time: Date.now(), amount: 20000, account: "cpcPqHu4TpXwF34LN5TGvB31QE5L3bNYWy", ledger: 61, validated: true},
      {time: Date.now(), amount: 1000, account: "cpcPqHu4TpXwF34LN5TGvB31QE5L3bNYWy", ledger: 32, validated: true}
    ];
  }

  ngOnInit() {
    this.logger.debug("### Overview ngOnInit() ###");
    this.ledgers = this.casinocoinService.ledgers;
    // this.casinocoinService.ledgerSubject.subscribe((ledger: LedgerStreamMessages) => {
    //   this.ledgers.splice(0, 0, ledger);
    // });
  }

  convertCscTimestamp(inputTime) {
    return CSCUtil.casinocoinToUnixTimestamp(inputTime);
  }

  getTXCellColor(cell, rowData){
    if(rowData.amount < 0){
      cell.parentNode.parentNode.style.background = "#901119";
    } else {
      cell.parentNode.parentNode.style.background = "#119022";
    }
  }

  getTXTextColor(cell, rowData){
    if(rowData.amount < 0){
      cell.parentNode.parentNode.style.color = "#901119";
    } else {
      cell.parentNode.parentNode.style.color = "#119022";
    }
  }

  getValidatedIconClasses(validated: boolean){
    if(validated){
      return ["fa", "fa-check"];
    } else {
      return ["fa", "fa-times"];
    }
  }

}
