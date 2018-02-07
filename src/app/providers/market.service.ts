import {Injectable, OnInit, OnDestroy} from '@angular/core';
import {LogService} from './log.service';
import {HttpClient, HttpParams, HttpHeaders} from '@angular/common/http';
import {Observable, Subject} from 'rxjs';
import {CoinMarketCapType, ExchangesType} from '../domain/service-types';
import {LocalStorageService} from "ngx-store";
import {AppConstants} from '../domain/app-constants';

@Injectable()
export class MarketService {

    private coinmarketCapURLCSC = 'https://api.coinmarketcap.com/v1/ticker/casinocoin/?convert=';
    private coinmarketCapURLBTC = 'https://api.coinmarketcap.com/v1/ticker/bitcoin/?convert=';
    private exchangesURL = 'http://api.casinocoin.org/exchanges';
    public coinMarketInfo: CoinMarketCapType;
    public exchanges: Array<ExchangesType>;
    private checkInterval: any;
    public exchangeUpdates = new Subject<Array<ExchangesType>>();
    public btcPrice: number = 1;
    public cscPrice: number = 0.00000001;
    public fiatCurrency = 'USD';

    constructor(private logger: LogService,
                private http: HttpClient,
                private localStorageService: LocalStorageService) {
        logger.debug("### INIT  MarketService ###");
        // get the stored coin info from localstorage
        this.coinMarketInfo = this.localStorageService.get(AppConstants.KEY_COININFO);
        this.initAutoUpdateServices();
    }

    initAutoUpdateServices() {
        // run the getCoinInfo method
        this.getCoinInfo();
        // run a timer to get the coininfo every set interval of 120 seconds
        this.checkInterval = setInterval(() => {
            this.getCoinInfo();
        }, 120000);
        // get exchanges
        this.getExchanges();
        // run a timer to get the exchange info every set interval of 60 seconds
        this.checkInterval = setInterval(() => {
            this.getExchanges();
        }, 60000);
    }

    changeCurrency(currency) {
        console.log("changing currency");
        this.fiatCurrency = currency;
        this.getCoinInfo();
    }

    getCoinInfo(): Observable<CoinMarketCapType> {
        let options = {
            headers: new HttpHeaders().set('Content-Type', 'application/json')
        };
        let serviceResponse = new Subject<CoinMarketCapType>();
        this.http.get(this.coinmarketCapURLCSC + this.fiatCurrency, options).subscribe(result => {
            this.logger.debug("### MarketService: " + JSON.stringify(result));
            let coinInfo = result[0];
            if (coinInfo) {
                this.coinMarketInfo = {
                    id: coinInfo.id,
                    name: coinInfo.name,
                    symbol: coinInfo.symbol,
                    rank: coinInfo.rank,
                    price_fiat: coinInfo['price_' + this.fiatCurrency.toLowerCase()],
                    selected_fiat: this.fiatCurrency,
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
        this.http.get(this.coinmarketCapURLBTC + this.fiatCurrency, options).subscribe(result => {
            let coinInfo = result[0];
            if (coinInfo) {
                this.btcPrice = Number(coinInfo['price_' + this.fiatCurrency.toLowerCase()]);
            }
        });
        return serviceResponse.asObservable();
    }

    getExchanges() {
        let options = {
            headers: new HttpHeaders().set('Content-Type', 'application/json')
        };
        this.http.get<Array<ExchangesType>>(this.exchangesURL, options).subscribe(result => {
            this.exchanges = result;
            // get max last price
            this.cscPrice = 0.00000001;
            this.exchanges.forEach(exchange => {
                if (exchange.last > this.cscPrice) {
                    this.cscPrice = exchange.last;
                }
            });
            this.exchangeUpdates.next(this.exchanges);
        });
    }
}
