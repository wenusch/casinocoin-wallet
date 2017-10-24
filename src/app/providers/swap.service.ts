import { Injectable, OnInit, OnDestroy } from '@angular/core';
import { Logger } from 'angular2-logger/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { WalletService } from './wallet.service';
import { LokiSwap } from '../domain/lokijs';
import { CSCUtil } from '../domain/cscutil';

@Injectable()
export class SwapService {
  
    private swapURL: string = "http://138.197.172.77:3000/swap";
    public swaps: Array<LokiSwap> = [];

    constructor(private logger: Logger, 
                private http: HttpClient,
                private walletService: WalletService) {
        logger.debug("### INIT  SwapService ###");
        this.swaps = this.walletService.getAllSwaps();
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
                // find swap based on depositAddress
                let createdSwap = swap.filter(function(s) {
                    return s.swap_address === depositAddress;
                  })[0];
                // let createdSwap = swap.find(x => x.swap_address === depositAddress);
                this.logger.debug("### SwapService, get swap: " + JSON.stringify(createdSwap));
                //response
                // {"swap_id":"e27647a3-f7d9-3b5a-7b67-b82ddf7206a0","deposit_address":"CS68a7KByjE6yCMWyMyvNLD3TZD2SVM4Zg"}
                let newSwap: LokiSwap = {
                    accountID: accountID, 
                    swapID: createdSwap._id, 
                    initiatedTimestamp: CSCUtil.iso8601ToCasinocoinTime(createdSwap.created_date),
                    swapStatus: createdSwap.status[0],
                    swapObject: createdSwap
                };
                this.walletService.addSwap(newSwap);
                this.swaps.splice(0,0,newSwap);
            });
        });
    }

    getSwap(swapID: string): Observable<any>{
        let options = {
            headers: new HttpHeaders().set('Content-Type', 'application/json')
        };
        let swapIDURL = this.swapURL + "/" + swapID;
        this.logger.debug("### SwapService URL: " + swapIDURL);
        return this.http.get(swapIDURL, options);
    }
}