import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { WalletService } from '../../providers/wallet.service';
import { CasinocoinService } from '../../providers/casinocoin.service';
import { LokiAddress, LokiTransaction, LokiAccount } from '../../domain/lokijs';
import * as LokiTypes from '../../domain/lokijs';

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
        /*let tempAccount: LokiTypes.LokiAccount = {
            accountID: "cHb9CJAWyB4cj91VRWn96DkukG4bwdtyTh", 
            balance: "0", 
            lastSequence: 0, 
            label: "Default Account",
            activated: false,
            ownerCount: 0,
            lastTxID: "",
            lastTxLedger: 0
        };
        this.walletService.addAccount(tempAccount);*/
        //this.transactions = this.walletService.getAllTransactions();
        //console.log(this.accounts);
        this.accounts.forEach(event => {
            //let accountTransactions = this.walletService.getAccountTransactions(event.accountID);
            let accountTransactions = this.casinocoinService.getAccountTx(event.accountID, 1);
            //console.log(accountTransactions);
            event.activated = false;
            if(event.meta == undefined){
                event.meta = {
                    revision: 1,
                    created: (new Date()).getTime(),
                    version: 1,
                    updated: (new Date()).getTime()
                }
            }
            //event.meta.updated = (new Date()).getTime();
            //event.meta.revision += 0;
            //console.log(event);

            this.walletService.updateAccount(event);
        });

        this.casinocoinService.transactionSubject.subscribe( tx => {
            //console.log(tx);
            let updateTxIndex = this.transactions.findIndex( item => item.txID == tx.txID);
            if( updateTxIndex >= 0 ){
                this.transactions[updateTxIndex] = tx;
            } else {
                this.transactions.splice(0,0,tx);
            }

            let accountInfo = this.walletService.getAccount(tx.accountID);
            if(!accountInfo.activated){
                accountInfo.activated = true;
                this.walletService.updateAccount(accountInfo);
            }
        });
        this.router.navigate(['home','transactions']);
    }
}