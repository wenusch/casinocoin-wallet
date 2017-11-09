import { Injectable, OnInit, OnDestroy } from '@angular/core';
import { Logger } from 'angular2-logger/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';

@Injectable()
export class MarketService {
  
    private coinmarketCapURL: string = "https://api.coinmarketcap.com/v1/ticker/casinocoin/";

    constructor(private logger: Logger, 
                private http: HttpClient) {
        logger.debug("### INIT  MarketService ###");
        // subscribe to the open wallet subject to ensure the wallet is open before we execute commands on it
    }

    getCoinInfo(): Observable<any> {
        let options = {
            headers: new HttpHeaders().set('Content-Type', 'application/json')
        };
        return this.http.get(this.coinmarketCapURL, options);
    }
}
// http://api.casinocoin.org/CSCPublicAPI/CoinInfo
// https://api.coinmarketcap.com/v1/ticker/casinocoin/