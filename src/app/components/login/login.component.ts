import { Component, OnInit, ViewEncapsulation, ViewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { WalletService } from '../../providers/wallet.service';
import { AlertService } from '../../providers/alert.service';
import { LocalStorage, SessionStorage } from "ngx-store";
import { SelectItem } from 'primeng/primeng';
import { CSCUtil } from '../../domain/csc-util';
import { AppConstants } from '../../domain/app-constants';
import { Logger } from 'angular2-logger/core';
import { MessageService } from 'primeng/components/common/messageservice';
 
@Component({
    moduleId: module.id,
    templateUrl: 'login.component.html',
    styleUrls: ['./login.component.scss'],
    providers: [ DatePipe ]
})
 
export class LoginComponent implements OnInit {
    
    @ViewChild('inputWallet') inputWalletElementRef;
    @ViewChild('inputPassword') inputPasswordElementRef;

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
        private alertService: AlertService,
        private router: Router,
        private walletService: WalletService,
        private messageService: MessageService,
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
        if (this.selectedWallet == null || this.selectedWallet.length == 0){
            this.footer_visible = true;
            this.error_message = "Please select a wallet to open!"
            this.inputWalletElementRef.nativeElement.focus();
            // this.messageService.add({severity:'error', summary:'Open Wallet Error', detail:'Please select a wallet to open!'});
        } else if (this.walletPassword == null || this.walletPassword.length == 0){
            this.footer_visible = true;
            this.error_message = "Please enter the wallet password!"
            this.inputPasswordElementRef.nativeElement.focus();
            // this.messageService.add({severity:'error', summary:'Open Wallet Error', detail:'Please select a wallet to open!'});
        } else {
            this.currentWallet = this.selectedWallet;
            // get the complete wallet object
            let walletIndex = this.availableWallets.findIndex( item => item['walletUUID'] == this.selectedWallet);
            let walletObject = this.availableWallets[walletIndex];
            this.footer_visible = false;
            this.logger.debug("### Check Wallet Password: " + JSON.stringify(walletObject));
            if(this.walletService.checkWalletPasswordHash(this.selectedWallet, this.walletPassword, walletObject['hash'])){
                this.walletLocation = walletObject['location'];
                this.walletService.openWallet(this.walletLocation, this.currentWallet).subscribe( result => {
                    this.logger.debug("### Open Wallet Response: " + result);
                    if(result == AppConstants.KEY_INIT){
                        this.footer_visible = false;
                        this.error_message = "";
                    } else if (result == AppConstants.KEY_LOADED){
                        // Navigate to Home 
                        this.router.navigate([this.returnUrl]);
                    } else if (result == AppConstants.KEY_ERRORED) {
                        // there was an error opening the wallet
                        this.error_message = "There was an error opening the wallet!!";
                        this.footer_visible = true;
                    } else {
                        // this.logger.error("### Error Opening Wallet !!!!");
                    }
                });
            } else {
                // Invalid Wallet Password !!!
                this.footer_visible = true;
                this.error_message = "You entered the wrong wallet password!"
                this.inputPasswordElementRef.nativeElement.value = "";
                this.inputPasswordElementRef.nativeElement.focus();
            }
            
        }
    }
}