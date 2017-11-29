import { Component, OnInit, ViewChild } from '@angular/core';
import { InputText } from 'primeng/primeng';
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
import Big from 'big.js';

@Component({
  selector: 'app-transactions',
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.scss']
})
export class TransactionsComponent implements OnInit {

  @ViewChild('receipientInput') receipientInput;
  @ViewChild('descriptionInput') descriptionInput;
  @ViewChild('amountInput') amountInput;
  @ViewChild('accountDropdown') accountDropdown: Dropdown;
  @ViewChild('passwordInput') passwordInput;

  transactions: Array<LokiTransaction>;
  accounts: SelectItem[] = [];
  ledgers: LedgerStreamMessages[] = [];
  selectedAccount: string;
  selectedTxRow: LokiTransaction;
  receipient: string;
  description: string;
  amount: string;
  walletPassword: string;
  showPasswordDialog:boolean = false;
  showLedgerDialog:boolean = false;
  signAndSubmitIcon:string = "fa-check";
  tx_context_menu: ElectronMenu;
  
  constructor(private logger:LogService, 
              private casinocoinService: CasinocoinService,
              private walletService: WalletService,
              private electronService: ElectronService, ) { }

  ngOnInit() {
    this.logger.debug("### Online: " + navigator.onLine);
    // get transactions from wallet
    this.walletService.openWalletSubject.subscribe( result => {
      if(result == AppConstants.KEY_LOADED){
        this.transactions = this.walletService.getAllTransactions();
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
          this.doBalanceUpdate();
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
        });
      }
    });
    // get network ledgers
    this.ledgers = this.casinocoinService.ledgers;
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
      } else {
        this.logger.debug("### Context menu not implemented: " + arg);
      }        
    });
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
      cell.parentNode.parentNode.style.color = "#901119";
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
    if(event.value == null){
      this.transactions = this.walletService.getAllTransactions();
    } else {
      this.transactions = this.walletService.getAccountTransactions(event.value);
    }
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
    this.tx_context_menu.popup(this.electronService.remote.getCurrentWindow());
  }

  onTxRowClick(event){
    this.logger.debug("### onTxRowClick: " + JSON.stringify(event));
  }
}
