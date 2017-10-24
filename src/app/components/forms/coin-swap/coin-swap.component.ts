import { Component, OnInit, ViewChild } from '@angular/core';
import { Logger } from 'angular2-logger/core';
import { SelectItem, Dropdown } from 'primeng/primeng';
import { WalletService } from '../../../providers/wallet.service';
import { SwapService } from '../../../providers/swap.service';
import { CSCUtil } from '../../../domain/cscutil';
import { LokiSwap } from '../../../domain/lokijs';

@Component({
  selector: 'app-coin-swap',
  templateUrl: './coin-swap.component.html',
  styleUrls: ['./coin-swap.component.scss']
})

export class CoinSwapComponent implements OnInit {

  @ViewChild('accountDropdown') accountDropdown: Dropdown;
  accounts: SelectItem[] = [];
  selectedAccount: string;
  swaps: LokiSwap[] = [];

  constructor(private logger: Logger, 
              private walletService: WalletService,
              private swapService: SwapService) { }

  ngOnInit() {
    this.logger.debug("### INIT CoinSwapComponent ###");
    this.swaps = this.swapService.swaps;
    this.walletService.getAllAccounts().forEach( element => {
      let accountLabel = element.accountID;
      if(element.label.length > 0){
        accountLabel = accountLabel + " [" + element.label + "]";
      }
      this.accounts.push({label: accountLabel, value: element.accountID});
    });
  }

  doCreateSwap(){
    this.logger.debug("### Create Swap for: " + this.selectedAccount);
    this.swapService.createSwap(this.selectedAccount);
    this.accountDropdown.resetFilter();
  }

  convertCscTimestamp(inputTime) {
    return CSCUtil.casinocoinToUnixTimestamp(inputTime);
  }

}
