// This file contains production variables. (When you work in PROD MODE)
// This file is use by webpack. Please don't rename it and don't move it to another directory.
import { Logger, Options, Level } from 'angular2-logger/core';
export const environment = {
  production: true,
  loglevel: Level.ERROR,
  swap_endpoint_url: "http://138.197.172.77:3000/swap",
  market_endpoint_url: "https://api.coinmarketcap.com/v1/ticker/casinocoin/",
  insight_endpoint_url: "http://insight.casinocoin.info"
};
