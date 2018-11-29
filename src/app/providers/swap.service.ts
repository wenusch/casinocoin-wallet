import { Injectable, OnInit, OnDestroy } from '@angular/core';
import { LogService } from './log.service';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { WalletService } from './wallet.service';
import { LokiSwap } from '../domain/lokijs';
import { CSCUtil } from '../domain/csc-util';
import { environment } from '../../environments';
import { AppConstants } from '../domain/app-constants';

@Injectable()
export class SwapService {
  
    private swapURL: string = environment.swap_endpoint_url;
    public swaps: Array<LokiSwap> = [];
    private refreshSubject = new BehaviorSubject<boolean>(false);

    constructor(private logger: LogService, 
                private http: HttpClient,
                private walletService: WalletService) {
        logger.debug("### INIT  SwapService ###");
        // subscribe to the open wallet subject to ensure the wallet is open before we execute commands on it
        this.walletService.openWalletSubject.subscribe(result => {
            logger.debug("### SwapService openWallet: " + result);
            if(result == AppConstants.KEY_LOADED){
                this.swaps = this.walletService.getAllSwaps();
            }
        });
    }

    createSwap(accountID: string){
        // add parameter through body form parameters
        let body = new URLSearchParams();
        body.set('account_id', accountID);
        let options = {
            headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded')
        };
        // post to swap service
        this.http.post(this.swapURL, body.toString(), options).subscribe(response => {
            this.logger.debug("### SwapService, new swap: " + JSON.stringify(response));
            let depositAddress = response['deposit_address'];
            // get the full swap info
            this.getSwap(response['swap_id']).subscribe(swap => {
                this.logger.debug("### SwapService Swap: " + JSON.stringify(swap));
                // find swap based on depositAddress
                // let createdSwap = swap.filter(function(s) {
                //     return s.swap_address === depositAddress;
                //   })[0];
                // let createdSwap = swap.find(x => x.swap_address === depositAddress);
                if(swap.length > 0){
                    let createdSwap = swap[0];
                    this.logger.debug("### SwapService, get swap: " + JSON.stringify(createdSwap));
                    //response
                    // {"swap_id":"e27647a3-f7d9-3b5a-7b67-b82ddf7206a0","deposit_address":"CS68a7KByjE6yCMWyMyvNLD3TZD2SVM4Zg"}
                    let newSwap: LokiSwap = {
                        accountID: accountID, 
                        swapID: createdSwap.public_id,
                        swapAmount: createdSwap.swap_amount,
                        initiatedTimestamp: CSCUtil.iso8601ToCasinocoinTime(createdSwap.created_date),
                        updatedTimestamp: CSCUtil.iso8601ToCasinocoinTime(createdSwap.updated_date),
                        depositAddress: createdSwap.swap_address,
                        swapStatus: createdSwap.status[0]
                    };
                    if(createdSwap.storage){
                        newSwap.storage = createdSwap.storage;
                    }
                    if(createdSwap.deposit){
                        newSwap.deposit = createdSwap.deposit;
                    }
                    let insertedSwap = this.walletService.addSwap(newSwap);
                    this.swaps.splice(0,0,insertedSwap);
                }
            });
        });
    }

    getSwap(swapID: string): Observable<any> {
        let options = {
            headers: new HttpHeaders().set('Content-Type', 'application/json')
        };
        let swapIDURL = this.swapURL + "/" + swapID;
        this.logger.debug("### SwapService URL: " + swapIDURL);
        return this.http.get(swapIDURL, options);
    }

    refreshSwaps(): Observable<boolean> {
        // get all swaps from the wallet
        let mySwaps: Array<LokiSwap> = this.walletService.getAllSwaps();
        if(mySwaps.length > 0){
            mySwaps.forEach( (swap, index, arr) => {
                // only process unfinished swaps
                if(swap.swapStatus != 'swap_completed'){
                    // refresh swap info
                    this.getSwap(swap.swapID).subscribe(onlineSwap => {
                        if(onlineSwap.length > 0){
                            let updateSwapIndex = this.swaps.findIndex( item => item.swapID == swap.swapID);
                            if(onlineSwap[0].status){
                                this.swaps[updateSwapIndex].swapStatus = onlineSwap[0].status[0];
                            }
                            if(onlineSwap[0].deposit){
                                this.swaps[updateSwapIndex].swapAmount = onlineSwap[0].deposit.amount;
                                this.swaps[updateSwapIndex].deposit = onlineSwap[0].deposit;
                            }
                            if(onlineSwap[0].storage){
                                this.swaps[updateSwapIndex].storage = onlineSwap[0].storage;
                            }
                            this.swaps[updateSwapIndex].updatedTimestamp = CSCUtil.iso8601ToCasinocoinTime(onlineSwap[0].updated_date);
                            // save updated swap to the database
                            this.walletService.updateSwap(this.swaps[updateSwapIndex]);
                        }
                    });
                }
                if(index == (arr.length - 1)){
                    // we updated the last item so signal complete
                    this.refreshSubject.next(true);
                }
            });
        } else {
            this.refreshSubject.next(true);
        }
        return this.refreshSubject.asObservable();
    }
}