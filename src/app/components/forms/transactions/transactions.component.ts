import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { InputText, DataTable, LazyLoadEvent } from 'primeng/primeng';
import { LogService } from '../../../providers/log.service';
import { SelectItem, Dropdown, MenuItem, Message } from 'primeng/primeng';
import { CasinocoinService } from '../../../providers/casinocoin.service';
import { WalletService } from '../../../providers/wallet.service';
import { LedgerStreamMessages } from '../../../domain/websocket-types';
import { CSCUtil } from '../../../domain/csc-util';
import { AppConstants } from '../../../domain/app-constants';
import { LokiTransaction } from '../../../domain/lokijs';
import { ElectronService } from '../../../providers/electron.service';
import { Menu as ElectronMenu, MenuItem as ElectronMenuItem } from 'electron';
import { environment } from '../../../../environments';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import Big from 'big.js';

@Component({
  selector: 'app-transactions',
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.scss']
})
export class TransactionsComponent implements OnInit, AfterViewInit {

  @ViewChild('dtTX') dtTX: DataTable;
  @ViewChild('recipientInput') recipientInput;
  @ViewChild('descriptionInput') descriptionInput;
  @ViewChild('amountInput') amountInput;
  @ViewChild('accountDropdown') accountDropdown: Dropdown;
  @ViewChild('passwordInput') passwordInput;

  transactions: Array<LokiTransaction> = [];
  accounts: SelectItem[] = [];
  ledgers: LedgerStreamMessages[] = [];
  selectedAccount: string;
  selectedTxRow: LokiTransaction;
  recipient: string;
  description: string;
  amount: string;
  walletPassword: string;
  showPasswordDialog:boolean = false;
  showLedgerDialog:boolean = false;
  signAndSubmitIcon:string = "fa-check";
  tx_context_menu: ElectronMenu;
  lazyTransactions: Array<LokiTransaction>;
  loadingTX: boolean = false;
  totalTXRecords: number;
  viewInitComplete: boolean = false;
  initialBatchLoaded: boolean = false;
  uiChangeSubject = new BehaviorSubject<string>(AppConstants.KEY_INIT);
  
  constructor(private logger:LogService, 
              private casinocoinService: CasinocoinService,
              private walletService: WalletService,
              private electronService: ElectronService,
              private router: Router,
              private route: ActivatedRoute ) { }

  ngOnInit() {
    this.logger.debug("### Transactions ngOnInit() ###");
    // define Transaction Context menu
    let tx_context_menu_template = [
      { label: 'Copy From Address', 
        click(menuItem, browserWindow, event) { 
          browserWindow.webContents.send('tx-context-menu-event', 'copy-from'); }
      },
      { label: 'Copy To Address', 
        click(menuItem, browserWindow, event) { 
           browserWindow.webContents.send('tx-context-menu-event', 'copy-to'); }
      },
      { label: 'Copy Transaction ID', 
         click(menuItem, browserWindow, event) { 
             browserWindow.webContents.send('tx-context-menu-event', 'copy-txid'); }
      },
      { label: 'Show in Block Explorer', 
          click(menuItem, browserWindow, event) { 
              browserWindow.webContents.send('tx-context-menu-event', 'show-explorer'); }
      }
    ];
    this.tx_context_menu = this.electronService.remote.Menu.buildFromTemplate(tx_context_menu_template);
    // listen to connection context menu events
    this.electronService.ipcRenderer.on('tx-context-menu-event', (event, arg) => {
      if(arg == 'copy-to'){
        if(this.selectedTxRow){
          this.electronService.clipboard.writeText(this.selectedTxRow.destination);
        }
      } else if(arg == 'copy-from'){
        if(this.selectedTxRow){
          this.electronService.clipboard.writeText(this.selectedTxRow.accountID);
        }
      } else if(arg == 'copy-txid'){
        if(this.selectedTxRow){
          this.electronService.clipboard.writeText(this.selectedTxRow.txID);
        }
      } else if(arg == 'show-explorer'){
        this.showTransactionDetails();
      } else {
        this.logger.debug("### Context menu not implemented: " + arg);
      }        
    });
    // get transactions from wallet
    this.walletService.openWalletSubject.subscribe( result => {
      if(result == AppConstants.KEY_LOADED){
        this.transactions = this.walletService.getAllTransactions();
        this.uiChangeSubject.next(AppConstants.KEY_LOADED);
        // add empty item to accounts dropdown
        this.accounts.push({label:'Select Account ...', value:null});
        this.walletService.getAllAccounts().forEach( element => {
          if(new Big(element.balance) > 0){
            let accountLabel = element.label + "(" + element.accountID.substring(0,8)+ "...) [Balance: " + CSCUtil.dropsToCsc(element.balance) + "]";
            this.accounts.push({label: accountLabel, value: element.accountID});
          }
        });
        // subscribe to account updates
        this.casinocoinService.accountSubject.subscribe( account => {
          this.logger.debug("### TransactionsComponent Account Updated");
          this.doBalanceUpdate();
          this.dtTX.paginate();
        });
        // subscribe to transaction updates
        this.casinocoinService.transactionSubject.subscribe( tx => {
          this.logger.debug("### TransactionsComponent TX Update: " + JSON.stringify(tx));
          let updateTxIndex = this.transactions.findIndex( item => item.txID == tx.txID);
          if( updateTxIndex >= 0 ){
            this.transactions[updateTxIndex] = tx;
          } else {
            this.transactions.splice(0,0,tx);
          }
          let accountIDTX = tx.destination;
          if(tx.direction === AppConstants.KEY_WALLET_TX_IN){
              accountIDTX = tx.destination;
          }else if(tx.direction === AppConstants.KEY_WALLET_TX_OUT){
              accountIDTX = tx.accountID;
          }
          let accountInfo = this.walletService.getAccount(accountIDTX);
          if(!accountInfo.activated){
              accountInfo.activated = true;
              this.walletService.updateAccount(accountInfo);
          }
          // update balances
          this.doBalanceUpdate();
        });
      }
    });
    // get network ledgers
    this.ledgers = this.casinocoinService.ledgers;
  }

  ngAfterViewInit(){
    this.logger.debug("### Transactions - ngAfterViewInit() ###");
    this.viewInitComplete = true;
    
    // this.doBalanceUpdate();
    // this.dtTX.paginate();

    // We use setTimeout to avoid the `ExpressionChangedAfterItHasBeenCheckedError`
    // See: https://github.com/angular/angular/issues/6005

    // setTimeout(_ => {
    //   this.viewInitComplete = true;
    //   this.doBalanceUpdate();
    //   this.dtTX.paginate();

      // check if Refresh Wallet was called
    this.route.params.subscribe(params => {
      if(params['refreshWallet']){
        this.logger.debug("### Transactions - Refresh Wallet");
        this.executeWalletRefresh();
      }
      else 
        this.logger.debug("### Transactions - Refresh Wallet IS FALSE");
    });

    // }, 0);
  }

  loadTXLazy(event: LazyLoadEvent) {
    setTimeout(() => {
      this.loadingTX = true;
      this.totalTXRecords = this.walletService.getWalletTxCount() ? this.walletService.getWalletTxCount() : 0;
      if(this.transactions !== undefined && this.transactions.length > 0){
        this.lazyTransactions = this.transactions.slice(event.first, (event.first + event.rows));
      }
      this.loadingTX = false;
    }, 0);
  }

  doBalanceUpdate(){
    // add empty item to accounts dropdown
    this.accounts = [];
    this.accounts.push({label:'Select Account ...', value:null});
    this.walletService.getAllAccounts().forEach( element => {
      if(new Big(element.balance) > 0){
        let accountLabel = element.label + "(" + element.accountID.substring(0,8)+ "...) [Balance: " + CSCUtil.dropsToCsc(element.balance) + "]";
        this.accounts.push({label: accountLabel, value: element.accountID});
      }
    });
  }

  getTXTextColor(cell, rowData){
    if(rowData.direction == AppConstants.KEY_WALLET_TX_OUT){
      // outgoing tx
      cell.parentNode.parentNode.style.color = "#bf0a0a";
    } else if(rowData.direction == AppConstants.KEY_WALLET_TX_IN){
      // incomming tx
      cell.parentNode.parentNode.style.color = "#119022";
    } else {
      // wallet tx
      cell.parentNode.parentNode.style.color = "#114490";
    }
  }

  getDirectionIconClasses(rowData){
    if(rowData.direction == AppConstants.KEY_WALLET_TX_OUT){
      // outgoing tx
      return ["fa", "fa-minus", "color_red", "text-large"];
    } else if(rowData.direction == AppConstants.KEY_WALLET_TX_IN){
      // incomming tx
      if(rowData.transactionType == "SetCRNRound")
        return ["fa", "fa-star", "color_green", "text-large"];
      else
        return ["fa", "fa-plus", "color_green", "text-large"];
    } else {
      // wallet tx
      return ["fa", "fa-minus", "color_blue", "text-large"];
    }
  }

  getStatusIconClasses(tx: LokiTransaction){
    if(tx.validated){
      return ["fa", "fa-check", "color_green"];
    } else if((this.ledgers[0] != undefined) && (tx.lastLedgerSequence > this.ledgers[0].ledger_index)){
      return ["fa", "fa-clock-o", "color_orange"];
    } else {
      return ["fa", "fa-ban", "color_red"];
    }
  }

  getStatusTooltipText(tx: LokiTransaction){
    if(tx.validated){
      return "Transaction validated and final.";
    } else if((this.ledgers[0] != undefined) && (tx.lastLedgerSequence > this.ledgers[0].ledger_index)){
      return "Transaction not yet validated. Waiting to be included until ledger " + tx.lastLedgerSequence + 
              " (current ledger: "+this.ledgers[0].ledger_index+ ").";
    } else {
      return "Transaction cancelled.";
    }
  }

  getDescription(rowData){
    if(rowData.memos && rowData.memos.length > 0){
      return rowData.memos[0].memo.memoData;
    } else {
      return null;
    }
  }

  accountSelected(event){
    this.logger.debug("value selected: " + JSON.stringify(event));
    this.loadingTX = true;
    if(event.value == null){
      this.transactions = this.walletService.getAllTransactions();
    } else {
      this.transactions = this.walletService.getAccountTransactions(event.value);
    }
    this.lazyTransactions = this.transactions.slice(0, 20);
    this.loadingTX = false;
    this.dtTX.paginate();
  }

  doShowLedgers(){
    this.showLedgerDialog = true;
  }

  convertCscTimestamp(inputTime) {
    return CSCUtil.casinocoinToUnixTimestamp(inputTime);
  }

  showTxContextMenu(event){
    this.logger.debug("### showTxContextMenu: " + JSON.stringify(event));
    this.selectedTxRow = event.data;
    this.tx_context_menu.popup({window: this.electronService.remote.getCurrentWindow()});
  }

  onTxRowClick(event){
    this.logger.debug("### onTxRowClick: " + JSON.stringify(event));
  }

  showTransactionDetails(){
    if(this.selectedTxRow){
      this.logger.debug("showTransactionDetails: " + JSON.stringify(this.selectedTxRow));
      let infoUrl = environment.explorer_endpoint_url + "/tx/" + this.selectedTxRow.txID;
      this.electronService.remote.shell.openExternal(infoUrl);
    }
  }

  doShowExchanges(){
    this.logger.debug("### Transactions -> Show Exchanges");
    this.router.navigate(['home', 'exchanges']);
  }

  executeWalletRefresh(){
    this.logger.debug("### Transactions - executeWalletRefresh() ###");
    // clear wallet transactions
    this.walletService.clearTransactions();
    // clear UI transactions
    this.transactions = [];
    this.lazyTransactions = [];
    // get all accounts and reset their info
    let refreshAccounts = this.walletService.getAllAccounts();
    refreshAccounts.forEach(account => {
        // reset account data
        account.activated = false;
        account.balance = "0";
        account.lastSequence = 0;
        account.ownerCount = 0;
        account.lastTxID = "";
        account.lastTxLedger = 0;
        if(account.meta == undefined){
            account.meta = {
                revision: 1,
                created: (new Date()).getTime(),
                version: 1,
                updated: (new Date()).getTime()
            }
        }
        this.walletService.updateAccount(account);
        // notify account change
        this.casinocoinService.accountSubject.next(account);
    });
    // loop over all accounts and get their transactions
    refreshAccounts.forEach(account => {
        this.logger.debug("### Refresh Account: " + account.accountID);
        this.casinocoinService.getAccountTx(account.accountID, 1);
    });
  }
}
