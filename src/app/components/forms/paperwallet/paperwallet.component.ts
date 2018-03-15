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
    checkBox: boolean = true;
    accounts: Array<LokiAccount> = [];
    keySet: any[] = [];

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

    //the method we are using currently
    print(): void {

        const electron = require('electron');
        const BrowserWindow = electron.remote.BrowserWindow;

        let printContents;
        printContents = this.winRef.nativeWindow.document.getElementById('printsection').innerHTML;
        /*this.winRef.nativeWindow.document.open();
        this.winRef.nativeWindow.document.write(`
          <html>
            <head>
              <title>Print tab</title>
              <style>
              //........Customized style.......
              </style>
            </head>
            <body align="center"><h1>Paper Wallet</h1>${printContents}
                <button type="button" onclick="redirect()">GO Back</button>
                <nav>
                <a routerLink="/paperwallet" href="#"> Anchor </a>
                </nav>
                <nav>
                <button routerLink="/paperwallet"> Anchor </button>
                </nav>
                <button routerLink="/paperwallet"> Anchor </button>
                <script>
                    function redirect() {
                        console.log(document.location.href);
                        window.location = document.location.href;
                    }
                </script>
            </body>
          </html>`
        );
        this.winRef.nativeWindow.print();    
        this.winRef.nativeWindow.document.close();  
        this.winRef.nativeWindow.location = __dirname + '/index.html#/home/paperwallet';
        this.router.navigate(['home','transactions']); */

        let win = new BrowserWindow({width: 800, height: 700,icon: __dirname + '/favicon.ico'})
        win.on('closed', () => {
          win = null;
        })
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
            </body>
          </html>`)
        }
        var file = 'data:text/html;charset=UTF-8,' + encodeURIComponent(loadView({
          title: "PaperWallet",
          scriptUrl: "./paperWallet.view.js"
        }));
        win.setMenu(null);
        win.loadURL(file);
        // setTimeout( ()=>{
        //     win.close();
        // }, 1000);
        //win.webContents.print();
    }

    showCreateAddress(){
        var seed = keypairs.generateSeed();
        var keypair = keypairs.deriveKeypair(seed);
        var address = keypairs.deriveAddress(keypair.publicKey);

        //var secret = casinocoin.Seed.from_bits(casinocoin.sjcl.random.randomWords(4));
        //var address = secret.get_key().get_address().to_json();
        this.newAddress = address;
        //this.newSecretKey = secret.to_json();
        this.newSecretKey = seed;
        document.getElementById("qrcode_address").style.display = "block";
        document.getElementById("qrcode_secret").style.display = "block";
        //this.generateQRCode();

        if(this.checkBox){
        this.accounts = this.walletService.getAllAccounts();
            this.keySet.push({
                account: this.accounts[0].accountID,
                public_key: address,
                private_key: seed
            })
        }
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
