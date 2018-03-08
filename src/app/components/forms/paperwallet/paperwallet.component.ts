import { Component, OnInit } from '@angular/core';
import { LokiAddress } from '../../../domain/lokijs';
import { CasinocoinService } from '../../../providers/casinocoin.service';
import { WalletService } from '../../../providers/wallet.service';
import { LogService } from '../../../providers/log.service';
import { AppConstants } from '../../../domain/app-constants';
import { Menu as ElectronMenu, MenuItem as ElectronMenuItem } from "electron"; 
import { ElectronService } from '../../../providers/electron.service';
import { SelectItem, MenuItem } from 'primeng/primeng';
import { CSCUtil } from '../../../domain/csc-util';
declare var casinocoin: any;
declare var QRCode: any;

@Component({
    selector: 'app-paperwallet',
    templateUrl: './paperwallet.component.html',
    styleUrls: ['./paperwallet.component.scss']
})
export class PaperwalletComponent implements OnInit {
    newAddress:string;
    newSecretKey:string;

    constructor(private logger: LogService, private casinocoinService: CasinocoinService, private walletService: WalletService, private electronService: ElectronService) { 
        this.logger.debug("### INIT Paperwallet ###");
    }

    ngOnInit() {
    }

    showCreateAddress(){
        var secret = casinocoin.Seed.from_bits(casinocoin.sjcl.random.randomWords(4));
        var address = secret.get_key().get_address().to_json();
        this.newAddress = address;
        this.newSecretKey = secret.to_json();
        this.generateQRCode();
    }

    generateQRCode(){
        document.getElementById("qrcodeAddress").innerHTML = "";
        document.getElementById("qrcodeSecret").innerHTML = "";
        
        var qrcodeAddress = new QRCode(
                                document.getElementById("qrcodeAddress"), {
                                    width : 100,
                                    height : 100
                            });

        var qrcodeSecret = new QRCode(
                                document.getElementById("qrcodeSecret"), {
                                    width : 100,
                                    height : 100
                            });

        qrcodeAddress.makeCode(this.newAddress);
        qrcodeSecret.makeCode(this.newSecretKey);
    }
}
