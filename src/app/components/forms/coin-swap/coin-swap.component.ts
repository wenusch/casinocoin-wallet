import { Component, OnInit, ViewChild } from '@angular/core';
import { Logger } from 'angular2-logger/core';
import { SelectItem, Dropdown, MenuItem } from 'primeng/primeng';
import { MessageService } from 'primeng/components/common/messageservice';
import { WalletService } from '../../../providers/wallet.service';
import { SwapService } from '../../../providers/swap.service';
import { ElectronService } from '../../../providers/electron.service';
import { CSCUtil } from '../../../domain/csc-util';
import { LokiSwap } from '../../../domain/lokijs';
import { environment } from '../../../../environments';

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
  selectedSwap: LokiSwap;
  swapMenuItems: MenuItem[];

  refresh_icon: string = "fa-refresh";

  constructor(private logger: Logger, 
              private walletService: WalletService,
              private swapService: SwapService,
              private electronService: ElectronService,
              private messageService: MessageService ) { }

  ngOnInit() {
    this.logger.debug("### INIT CoinSwapComponent ###");
    // init swap context menu
    this.swapMenuItems = [
      {label: 'Copy Deposit Address', icon: 'fa-copy', command: (event) => this.copyDepositAddress()},
      {label: 'Show Deposit Transaction', icon: 'fa-info', command: (event) => this.showTransactionDetails()},
      {label: 'Refresh', icon: 'fa-refresh', command: (event) => this.doRefreshSwaps()}
    ];
    // get swaps
    this.swaps = this.swapService.swaps;
    // get accounts from wallet
    if(this.walletService.isWalletOpen){
      this.walletService.getAllAccounts().forEach( element => {
        let accountLabel = element.accountID;
        if(element.label.length > 0){
          accountLabel = accountLabel + " [" + element.label + "]";
        }
        this.accounts.push({label: accountLabel, value: element.accountID});
      });
      // refresh the swaps to the latest status
      this.swapService.refreshSwaps();
    }
  }

  doCreateSwap(){
    this.logger.debug("### Create Swap for: " + this.selectedAccount);
    if(this.selectedAccount){
      this.swapService.createSwap(this.selectedAccount);
      this.accountDropdown.resetFilter();
    } else {
      this.messageService.add({severity:'error', summary:'Create New Swap', detail:'No account selected to create a new swap.'});
    }
  }

  convertCscTimestamp(inputTime) {
    return CSCUtil.casinocoinToUnixTimestamp(inputTime);
  }

  getDepositAmount(deposit){
    if(deposit != undefined ){
      return deposit.amount;
    } else {
      return 0;
    }
  }

  getSwapStatus(status){
    if(status == 'swap_created'){
      return "Swap Created";
    } else {
      return status;
    }
  }

  onSwapRowSelect(event) {
    this.logger.debug("Swap Selected: " + JSON.stringify(event.data));
    this.logger.debug("Swap Selected: " + this.selectedSwap);
  }

  copySwapID(){
    this.logger.debug("Copy to clipboard: " + this.selectedSwap.swapID);
    this.electronService.clipboard.writeText(this.selectedSwap.swapID);
  }
  copyDepositAddress(){
    this.logger.debug("Copy to clipboard: " + this.selectedSwap.depositAddress);
    this.electronService.clipboard.writeText(this.selectedSwap.depositAddress);
  }

  showTransactionDetails(){
    if(this.selectedSwap.deposit){
      let infoUrl = environment.insight_endpoint_url + "/tx/" + this.selectedSwap.deposit['txid'];
      this.electronService.remote.shell.openExternal(infoUrl);
    }
  }

  doRefreshSwaps(){
    this.logger.debug("### Refresh Swaps");
    this.refresh_icon = "fa-refresh fa-spin";
    this.swapService.refreshSwaps().subscribe(result => {
      this.logger.debug("### Refresh Swaps Result: " + result);
      if(result){
        this.refresh_icon = "fa-refresh";
      }
    });
  }

}
