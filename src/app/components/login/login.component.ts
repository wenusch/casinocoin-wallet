import { Component, OnInit, ViewEncapsulation, ViewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { WalletService } from '../../providers/wallet.service';
import { LocalStorage, SessionStorage, LocalStorageService } from "ngx-store";
import { SelectItem } from 'primeng/primeng';
import { CSCUtil } from '../../domain/csc-util';
import { AppConstants } from '../../domain/app-constants';
import { LogService } from '../../providers/log.service';
import { MessageService } from 'primeng/components/common/messageservice';
import { AppComponent } from 'app/app.component';
import { setTimeout } from 'timers';
 
@Component({
    moduleId: module.id,
    templateUrl: 'login.component.html',
    styleUrls: ['./login.component.scss'],
    providers: [ DatePipe ]
})
 
export class LoginComponent implements OnInit {
    
    @ViewChild('inputWallet') inputWalletElementRef;
    @ViewChild('inputPassword') inputPasswordElementRef;

    @SessionStorage() public currentWallet: string = "";

    wallets: SelectItem[];
    selectedWallet: string;
    walletPassword: string;

    returnUrl: string;
    footer_visible: boolean = false;
    error_message: string = "";
 
    login_icon: string = "fa-check";

    dialog_visible: boolean = true;

    public availableWallets: Array<Object>;

    constructor(
        private logger: LogService,
        private route: ActivatedRoute,
        private router: Router,
        private walletService: WalletService,
        private messageService: MessageService,
        private datePipe: DatePipe,
        private localStorageService: LocalStorageService) { 
    }
 
    ngOnInit() {
        this.logger.debug("### LoginComponent onInit");
        // get available wallets
        this.availableWallets = this.localStorageService.get(AppConstants.KEY_AVAILABLE_WALLETS);
        // get return url from route parameters or default to '/'
        this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
        this.wallets = [];
        this.logger.debug("Wallet Count: " + this.availableWallets.length);
        for(let i=0; i< this.availableWallets.length; i++){
            this.logger.debug("Wallet: " + JSON.stringify(this.availableWallets[i]));
            let walletLabel = this.availableWallets[i]['walletUUID'].substring(0,12);
            let walletCreationDate = new Date(CSCUtil.casinocoinToUnixTimestamp(this.availableWallets[i]['creationDate']));
            if(this.availableWallets[i]['importedDate']){
                let walletImportDate = new Date(CSCUtil.casinocoinToUnixTimestamp(this.availableWallets[i]['importedDate']));
                walletLabel = walletLabel + "... [Imported: " + this.datePipe.transform(walletImportDate, "yyyy-MM-dd") + "]";
            } else {
                walletLabel = walletLabel + "... [Created: " + this.datePipe.transform(walletCreationDate, "yyyy-MM-dd") + "]";
            }
            if(this.availableWallets[i]['network']){
                walletLabel = walletLabel + " " + this.availableWallets[i]['network'];
            }
            this.logger.debug("Wallet Label: " + walletLabel);
            this.wallets.push({label: walletLabel, value: this.availableWallets[i]['walletUUID']});
        }
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
            this.login_icon = "fa fa-refresh fa-spin";
            setTimeout( ()=>{
                this.currentWallet = this.selectedWallet;
                // get the complete wallet object
                let walletIndex = this.availableWallets.findIndex( item => item['walletUUID'] == this.selectedWallet);
                let walletObject = this.availableWallets[walletIndex];
                this.footer_visible = false;
                this.logger.debug("### LoginComponent - Check Wallet Password: " + JSON.stringify(walletObject));
                if(this.walletService.checkWalletPasswordHash(this.walletPassword, this.selectedWallet, walletObject['hash'])){
                    this.logger.debug("### LoginComponent - Open Wallet Location: " + walletObject['location']);
                    this.walletService.openWallet( walletObject['location'], 
                                                   walletObject['walletUUID'],
                                                   this.walletPassword ).subscribe( result => {
                        this.logger.debug("### LoginComponent - Open Wallet Response: " + result);
                        if(result == AppConstants.KEY_INIT){
                            this.footer_visible = false;
                            this.error_message = "";
                            this.login_icon = "fa fa-check";
                        } else if (result == AppConstants.KEY_LOADED){
                            // set network to Production or Test
                            if(walletObject['network'] == "TEST"){
                                this.localStorageService.set(AppConstants.KEY_PRODUCTION_NETWORK, false);
                            } else {
                                this.localStorageService.set(AppConstants.KEY_PRODUCTION_NETWORK, true);
                            }
                            // Navigate to Home 
                            this.currentWallet = walletObject['walletUUID'];
                            this.localStorageService.set(AppConstants.KEY_WALLET_LOCATION, walletObject['location']);
                            this.router.navigate(['home','transactions']);
                        } else if (result == AppConstants.KEY_ERRORED) {
                            // there was an error opening the wallet
                            this.logger.debug("### LoginComponent - there was an error opening the wallet");
                            this.error_message = "There was an error opening the wallet!!";
                            this.footer_visible = true;
                            this.login_icon = "fa fa-check";
                        } else {
                            this.logger.error("### Error Opening Wallet !!!!");
                            this.login_icon = "fa fa-check";
                        }
                    });
                } else {
                    // Invalid Wallet Password !!!
                    this.footer_visible = true;
                    this.error_message = "You entered the wrong wallet password!";
                    this.login_icon = "fa-check";
                    this.inputPasswordElementRef.nativeElement.value = "";
                    this.inputPasswordElementRef.nativeElement.focus();
                }    
            }, 1000);            
        }
    }
}