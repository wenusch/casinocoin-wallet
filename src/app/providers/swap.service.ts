import { Injectable, OnInit, OnDestroy } from '@angular/core';
import { Logger } from 'angular2-logger/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';

@Injectable()
export class SwapService {
  
    private swapURL: string = "http://138.197.172.77:3000/swap";

    constructor(private logger: Logger, private http: HttpClient) {
        logger.debug("### INIT  SwapService ###");
    }

    createSwap(accountID: string){
        let body = new URLSearchParams();
        body.set('account_id', accountID);
        
        let options = {
            headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded')
        };
        
        this.http.post(this.swapURL, body.toString(), options).subscribe(response => {
            this.logger.debug("### SwapService, new swap: " + JSON.stringify(response));
        });
    }

    getSwap(swapID: string){
        let options = {
            headers: new HttpHeaders().set('Content-Type', 'application/json')
        };
        let swapIDURL = this.swapURL + "/" + swapID;
        this.http.get(swapIDURL, options).subscribe(response => {
            this.logger.debug("### SwapService, get swap: " + JSON.stringify(response));
        });
    }
}