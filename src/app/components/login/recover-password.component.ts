import { Component, OnInit, ViewEncapsulation, ViewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { WalletService } from '../../providers/wallet.service';
import { ElectronService } from '../../providers/electron.service';
import { SelectItem } from 'primeng/primeng';
import { CSCUtil } from '../../domain/csc-util';
import { CSCCrypto } from '../../domain/csc-crypto';
import { AppConstants } from '../../domain/app-constants';
import { LogService } from '../../providers/log.service';
import { MessageService } from 'primeng/components/common/messageservice';
import { AppComponent } from 'app/app.component';
import { setTimeout } from 'timers';
 
@Component({
    moduleId: module.id,
    templateUrl: 'recover-password.component.html',
    styleUrls: ['./login.component.scss'],
    providers: [ ]
})
 
export class RecoverPasswordComponent implements OnInit {
    
    selectedWallet: string;
    walletLocation: string;

    returnUrl: string;
    footer_visible: boolean = false;
    error_message: string = "";
 
    login_icon: string = "fa-check";

    dialog_visible: boolean = true;

    recoveryWords = {
        word1: "",
        word2: "",
        word3: "",
        word4: "",
        word5: "",
        word6: "",
        word7: "",
        word8: ""
    }

    constructor(
        private logger: LogService,
        private route: ActivatedRoute,
        private router: Router,
        private walletService: WalletService,
        private messageService: MessageService,
        private electron: ElectronService
    ) { }
 
    ngOnInit() {
        this.logger.debug("### RecoverPassword onInit");
        // get return url from route parameters or default to '/'
        this.selectedWallet = this.route.snapshot.queryParams['walletUUID'];
        this.walletLocation = this.route.snapshot.queryParams['walletLocation'];
        this.logger.debug("### RecoverPassword for: " + this.selectedWallet + " and path: " + this.walletLocation);
    }
 
    doRecoverPassword(){
        this.error_message = "";
        this.footer_visible = false;
        if (this.recoveryWords.word1.length == 0 ||
            this.recoveryWords.word2.length == 0 ||
            this.recoveryWords.word3.length == 0 ||
            this.recoveryWords.word4.length == 0 ||
            this.recoveryWords.word5.length == 0 ||
            this.recoveryWords.word6.length == 0 ||
            this.recoveryWords.word7.length == 0 ||
            this.recoveryWords.word8.length == 0){
                this.footer_visible = true;
                this.error_message = "Please enter all 8 words!"
        } else {
            this.logger.debug("### Recover with words: " + this.recoveryWords);
            let recoveryArray = [];
            recoveryArray.push([this.recoveryWords.word1, 
                                this.recoveryWords.word2,
                                this.recoveryWords.word3,
                                this.recoveryWords.word4,
                                this.recoveryWords.word5,
                                this.recoveryWords.word6,
                                this.recoveryWords.word7,
                                this.recoveryWords.word8
                              ]);
            // open the wallet
            this.walletService.getWalletMnemonic( this.selectedWallet, this.walletLocation ).subscribe( result => {
                this.logger.debug("### Mnemonic Response: " + result);
                if (result.length > 0 && result != AppConstants.KEY_ERRORED){
                    try{
                        let password = new CSCCrypto(recoveryArray).decrypt(result);
                        this.logger.debug("### Mnemonic Password: " + password);
                        this.electron.remote.dialog.showMessageBox(
                            { message: "Your wallet password is: " + password, 
                                buttons: ["OK"] 
                            }, (result) => { 
                                this.dialog_visible = false;
                                this.router.navigate(['login']);
                            }
                        );
                    } catch (error) {
                        this.logger.error("### Decrypt Error: " + error);
                        this.error_message = "Can not decrypt password with entered words.";
                        this.footer_visible = true;
                    }
                }
            });
        }
    }

    onHideRecoverPassword(){
        this.logger.debug("### Return to Login")
        this.router.navigate(['login']);
    }
}