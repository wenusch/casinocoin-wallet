import { Component, OnInit } from '@angular/core';
import { LokiAddress, LokiAccount, LokiKey } from '../../../domain/lokijs';
import { CasinocoinService } from '../../../providers/casinocoin.service';
import { WalletService } from '../../../providers/wallet.service';
import { LogService } from '../../../providers/log.service';
import { AppConstants } from '../../../domain/app-constants';
import { Menu as ElectronMenu, MenuItem as ElectronMenuItem } from "electron"; 
import { ElectronService } from '../../../providers/electron.service';
import { SelectItem, MenuItem } from 'primeng/primeng';
import { CSCUtil } from '../../../domain/csc-util';
import * as keypairs from 'casinocoin-libjs-keypairs';
import { QRCodeModule } from 'angular2-qrcode';
import { Router } from '@angular/router';

import { WindowRef } from './WindowRef';

@Component({
    selector: 'app-paperwallet',
    templateUrl: './paperwallet.component.html',
    styleUrls: ['./paperwallet.component.scss']
})
export class PaperwalletComponent implements OnInit {
    newAddress:string;
    newSecretKey:string;
    checkBox: boolean = true;
    accounts: Array<LokiAccount> = [];
    keySet: any[] = [];
    showInstructions: boolean = false;
    address_context_menu: ElectronMenu;

    constructor(private winRef: WindowRef,
        private logger: LogService, 
        private casinocoinService: CasinocoinService, 
        private walletService: WalletService, 
        private electronService: ElectronService,
        private router: Router,) { 
        this.logger.debug("### INIT Paperwallet ###");
    }

    ngOnInit() {
    }

    print(): void {

        const BrowserWindow = this.electronService.remote.BrowserWindow;;

        let printContents = this.winRef.nativeWindow.document.getElementById('printsection').innerHTML;

        let win = new BrowserWindow({width: 800, height: 700,icon: __dirname + '/favicon.ico'});

        win.on('closed', () => {
          win = null;
        });
        
        const loadView = ({title,scriptUrl}) => {
          return (`
          <html>
            <head>
              <title>Paper Wallet</title>
              <style>
              //........Customized style.......
                .csc-logo{
                    width: 100px;
                    float: left;
                    position: relative;
                }
                .key_box{
                    width: 48%;
                    height: 45%;
                    float: left;
                    text-align: center;
                    border: 1px solid black;
                    margin: 2% 0 0 0;
                }
                .key_box1{
                    width: 48%;
                    height: 45%;
                    float: left;
                    text-align: center;
                    border: 1px solid black;
                    margin: 2% 0 0 0;
                }
              </style>
            </head>
            <body onload="window.print()" onfocus="window.close()">
            <img src="https://casinocoin.org/wp-content/uploads/2018/02/Chip_Red-3.svg" alt="CasinoCoin" class="csc-logo" />
            <h1 align="center">Casino Coin Paper Wallet</h1>
            <h2>About</h2>
            <p> A CasinoCoin Paper Wallet is an offline mechanism for storing CasinoCoin. The process involves printing the public and private keys onto paper.</p>
            <strong>Disclaimer:</strong> xxxxxxxxx xxxxxxxxxx xxxxxxxxxx xxxxxxxxxx
            ${printContents}
            <div>
                <h2>Instructions</h2>
                <b>Step 0. Follow the security checklist recommendation</b><br>
                <p>First step is to download this web page from Github and open the index.html file directly from your computer. It's just too easy to sneak some evil code in the 6000+ lines of javascript to leak your private key, and you don't want to see your fund stolen. Code version control make it much easier to cross-check what actually run. For extra security, unplug your Internet access while generating your wallet.<br>
                </p><br>
                <b>Step 1. Generate New Address</b><br>
                <p>Click on the "Generate New Address" button.<br>
                </p><br>
                <b>Step 2. Print the Paper Wallet</b><br>
                <p>Print the page on high quality setting. Never save the page as a PDF file to print it later since a file is more likely to be hacked than a piece of paper.<br>
                </p><br>
                <b>Step 3. Share your public address</b><br>
                <p>Use your public address to receive CasinoCoin from other users. You can share your public address as much as you want.<br>
                </p><br>
                <b>Step 4. Keep your private key secret</b><br>
                <p>The private key is literally the keys to your coins, if someone was to obtain it, they could withdraw the funds currently in the wallet, and any funds that might be deposited in that wallet.<br>
                </p><br>
                <p>Please test sending a small amount before receiving any large payments.<br></p> 
            </div>
            </body>
          </html>`)
        }
        let file = 'data:text/html;charset=UTF-8,' + encodeURIComponent(loadView({
          title: "PaperWallet",
          scriptUrl: "./paperWallet.view.js"
        }));
        win.setMenu(null);
        win.loadURL(file);
    }

    instructions() {
        this.showInstructions = true;
    }

    showCreateAddress(){
        let seed = keypairs.generateSeed();
        let keypair = keypairs.deriveKeypair(seed);
        let address = keypairs.deriveAddress(keypair.publicKey);

        //var secret = casinocoin.Seed.from_bits(casinocoin.sjcl.random.randomWords(4));
        //var address = secret.get_key().get_address().to_json();
        this.newAddress = address;
        //this.newSecretKey = secret.to_json();
        this.newSecretKey = seed;
        document.getElementById("qrcode_address").style.display = "block";
        document.getElementById("qrcode_secret").style.display = "block";
    }

}
