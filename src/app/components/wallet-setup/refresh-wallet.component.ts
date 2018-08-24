import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { WalletService } from '../../providers/wallet.service';
import { CasinocoinService } from '../../providers/casinocoin.service';
import { LokiTransaction, LokiAccount } from '../../domain/lokijs';
import { AppConstants } from '../../domain/app-constants';

@Component({
    templateUrl: './refresh-wallet.component.html',
})

export class RefreshWalletComponent implements OnInit {
    accounts: Array<LokiAccount> = [];
    transactions: Array<LokiTransaction> = [];

    constructor(
        private router: Router,
        private walletService: WalletService,
        private casinocoinService: CasinocoinService
    ){}

    ngOnInit() {
        this.walletService.clearTransactions();
        this.accounts = this.walletService.getAllAccounts();
        this.accounts.forEach(account => {
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
        // subscribe to tx changes to catch new incomming tx
        this.casinocoinService.transactionSubject.subscribe( tx => {
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
            // notify account change
            this.casinocoinService.accountSubject.next(accountInfo);
        });
        // loop over all accounts and get their transactions
        this.accounts.forEach(account => {
            this.casinocoinService.getAccountTx(account.accountID, 1);
        });
        // navigate back to Home
        this.router.navigate(['home','transactions']);
    }
}