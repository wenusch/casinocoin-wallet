import { Injectable, OnInit, OnDestroy } from '@angular/core';
import { LogService } from './log.service';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { CoinMarketCapType } from '../domain/service-types';
import { LocalStorageService } from "ngx-store";
import { AppConstants } from '../domain/app-constants';

@Injectable()
export class MarketService {
  
    private coinmarketCapURL: string = "https://api.coinmarketcap.com/v1/ticker/casinocoin/";
    public coinMarketInfo: CoinMarketCapType;
    private checkInterval: any;

    constructor(private logger: LogService, 
                private http: HttpClient,
                private localStorageService: LocalStorageService) {
        logger.debug("### INIT  MarketService ###");
        // get the stored coin info from localstorage
        this.coinMarketInfo = this.localStorageService.get(AppConstants.KEY_COININFO);
        this.initMarketService();
    }

    initMarketService(){
        // run the getCoinInfo method
        this.getCoinInfo();
        // run a timer to get the coininfo every set interval of 120 seconds
        this.checkInterval = setInterval(() => {
            this.getCoinInfo();
        }, 120000);
    }

    getCoinInfo(): Observable<CoinMarketCapType> {
        let options = {
            headers: new HttpHeaders().set('Content-Type', 'application/json')
        };
        let serviceResponse = new Subject<CoinMarketCapType>();
        this.http.get(this.coinmarketCapURL, options).subscribe(result => {
            this.logger.debug("### MarketService: " + JSON.stringify(result));
            let coinInfo = result[0];
            if(coinInfo){
                this.coinMarketInfo = {
                    id: coinInfo.id,
                    name: coinInfo.name,
                    symbol: coinInfo.symbol,
                    rank: coinInfo.rank,
                    price_usd: coinInfo.price_usd,
                    price_btc: coinInfo.price_btc,
                    market_24h_volume_usd: coinInfo['24h_volume_usd'],
                    market_cap_usd: coinInfo.market_cap_usd,
                    available_supply: coinInfo.available_supply,
                    total_supply: coinInfo.total_supply,
                    last_updated: coinInfo.last_updated
                }
                // store in localstorage
                this.localStorageService.set(AppConstants.KEY_COININFO, this.coinMarketInfo);
                // put onto subject
                serviceResponse.next(this.coinMarketInfo);
            }
        });
        return serviceResponse.asObservable();
    }
}
// http://api.casinocoin.org/CSCPublicAPI/CoinInfo
// https://api.coinmarketcap.com/v1/ticker/casinocoin/
/*
[
{
id: "casinocoin",
name: "CasinoCoin",
symbol: "CSC",
rank: "256",
price_usd: "0.239458",
price_btc: "0.00003332",
24h_volume_usd: "2196.13",
market_cap_usd: "9243363.0",
available_supply: "38601187.0",
total_supply: "38601187.0",
max_supply: null,
percent_change_1h: "62.39",
percent_change_24h: "20.99",
percent_change_7d: "20.61",
last_updated: "1510303441"
}
]
*/