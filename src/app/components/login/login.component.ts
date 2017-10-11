import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { WalletService } from '../../providers/wallet.service';
import { LocalStorage, SessionStorage } from "ngx-store";
import { SelectItem } from 'primeng/primeng';
import { CSCUtil } from '../../domain/cscutil';
import { Logger } from 'angular2-logger/core';
 
@Component({
    moduleId: module.id,
    templateUrl: 'login.component.html',
    styleUrls: ['./login.component.css'],
    providers: [ DatePipe ]
})
 
export class LoginComponent implements OnInit {
    
    @LocalStorage() public availableWallets: Array<Object>;
    @LocalStorage() public walletLocation: string;
    @SessionStorage() public currentWallet: string = "";

    wallets: SelectItem[];
    selectedWallet: string;
    walletPassword: string;

    returnUrl: string;
    footer_visible: boolean = false;
    error_message: string = "";
 
    constructor(
        private logger: Logger,
        private route: ActivatedRoute,
        private router: Router,
        private walletService: WalletService,
        private datePipe: DatePipe) { 
            this.wallets = [];
            this.logger.debug("Wallet Count: " + this.availableWallets.length);
            for(let i=0; i< this.availableWallets.length; i++){
                this.logger.debug("Wallet: " + JSON.stringify(this.availableWallets[i]));
                let walletCreationDate = new Date(CSCUtil.casinocoinToUnixTimestamp(this.availableWallets[i]['creationDate']));
                let walletLabel = this.availableWallets[i]['walletUUID'].substring(0,12) + "... [Created: " + 
                        this.datePipe.transform(walletCreationDate, "yyyy-MM-dd") + "]";
                this.logger.debug("Wallet Label: " + walletLabel);
                this.wallets.push({label: walletLabel, value: this.availableWallets[i]['walletUUID']});
            }
    }
 
    ngOnInit() {
        this.logger.debug("LoginComponent onInit");
        // get return url from route parameters or default to '/'
        this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
    }
 
    doOpenWallet() {
        this.currentWallet = this.selectedWallet;
        this.logger.debug("Open Wallet: " + this.currentWallet);
        this.walletService.openWallet(this.walletLocation, this.currentWallet, this.walletPassword).subscribe( result => {
            if(result == 'LOADED'){
                // Navigate to Home 
                this.router.navigate([this.returnUrl]);
            } else {
                this.logger.error("Error Opening Wallet !!!!")
            }
        });   
    }
}