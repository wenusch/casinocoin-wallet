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
import { Menu as ElectronMenu, MenuItem as ElectronMenuItem } from 'electron';

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
  private refreshInterval: any;
  swap_context_menu: ElectronMenu;

  refresh_icon: string = "fa-refresh";

  constructor(private logger: Logger, 
              private walletService: WalletService,
              private swapService: SwapService,
              private electronService: ElectronService,
              private messageService: MessageService ) { }

  ngOnInit() {
    this.logger.debug("### INIT CoinSwapComponent ###");
    // define Swap context menu
    let swap_context_menu_template = [
      { label: 'Copy Deposit Address', 
        click(menuItem, browserWindow, event) {
          browserWindow.webContents.send('swap-context-menu-event', 'copy-deposit-address');
        }
      },
      { label: 'Copy Swap ID', 
        click(menuItem, browserWindow, event) {
          browserWindow.webContents.send('swap-context-menu-event', 'copy-swap-id');
        }
      },
      { label: 'Show Deposit Transaction', 
        click(menuItem, browserWindow, event) { 
          browserWindow.webContents.send('swap-context-menu-event', 'show-transaction');
        }
      },
      { label: 'Refresh', 
        click(menuItem, browserWindow, event) { 
          browserWindow.webContents.send('swap-context-menu-event', 'refresh');
        }
      }
    ];
    this.swap_context_menu = this.electronService.remote.Menu.buildFromTemplate(swap_context_menu_template);
    
    // listen to tools context menu events
    this.electronService.ipcRenderer.on('swap-context-menu-event', (event, arg) => {
      this.logger.debug("### SWAP Menu Event: " + arg);
      if(arg == 'copy-deposit-address')
        this.copyDepositAddress();
      if(arg == 'copy-swap-id')
        this.copySwapID();
      else if(arg == 'show-transaction')
        this.showTransactionDetails();
      else if(arg == 'refresh')
        this.doRefreshSwaps();
      else
        this.logger.debug("### Context menu not implemented: " + arg);
    });

    // get swaps
    this.swaps = this.swapService.swaps;
    // get accounts from wallet
    if(this.walletService.isWalletOpen){
      this.walletService.getAllAccounts().forEach( element => {
        let accountLabel = element.label + " [" + element.accountID.substring(0,15) + '...' + "]";
        this.accounts.push({label: accountLabel, value: element.accountID});
      });
      // refresh the swaps to the latest status
      this.swapService.refreshSwaps();
      // run a timer to refresh the swap status every set interval of 30 seconds
      this.refreshInterval = setInterval(() => {
        this.swapService.refreshSwaps();
      }, 30000);
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
    } else if(status == 'waiting_for_confirmations') {
      return "Waiting for Confirmations";
    } else if(status == 'moved_to_storage') {
      return "Moved to Cold Storage";
    } else if(status == 'new_coins_transferred') {
      return "New Coins Transfered";
    } else if(status == 'swap_completed') {
      return "Swap Complete";
    } else {
      return status;
    }
  }

  showSwapContextMenu(event){
    this.selectedSwap = event.data;
    this.logger.debug("### showSwapContextMenu: " + JSON.stringify(this.selectedSwap));
    this.swap_context_menu.popup(this.electronService.remote.getCurrentWindow());
  }

  // onSwapRowSelect(event) {
  //   this.logger.debug("Swap Selected: " + JSON.stringify(event.data));
  //   this.logger.debug("Swap Selected: " + this.selectedSwap);
  // }

  copySwapID(){
    this.logger.debug("Copy to clipboard: " + this.selectedSwap.swapID);
    this.electronService.clipboard.writeText(this.selectedSwap.swapID);
  }
  copyDepositAddress(){
    if(this.selectedSwap){
      this.logger.debug("Copy to clipboard: " + this.selectedSwap.depositAddress);
      this.electronService.clipboard.writeText(this.selectedSwap.depositAddress);
    }
  }

  showTransactionDetails(){
    if(this.selectedSwap){
      this.logger.debug("showTransactionDetails: " + JSON.stringify(this.selectedSwap));
      if(this.selectedSwap.deposit){
        let infoUrl = environment.insight_endpoint_url + "/tx/" + this.selectedSwap.deposit['txid'];
        this.electronService.remote.shell.openExternal(infoUrl);
      }
    }
  }

  doRefreshSwaps(){
    if(this.selectedSwap){
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

}
