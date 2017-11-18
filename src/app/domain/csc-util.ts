import Big from 'big.js';
import int from 'int';

import { Amount, Memo, CasinocoindAmount, CasinocoinMemo }  from './csc-types';

export class CSCUtil {

    static casinocoinToUnixTimestamp(rpepoch: number): number {
        return (rpepoch + 0x386D4380) * 1000
    }
    
    static unixToCasinocoinTimestamp(timestamp: number): number {
        return Math.round(timestamp / 1000) - 0x386D4380
    }
    
    static casinocoinTimeToISO8601(casinocoinTime: number): string {
        return new Date(this.casinocoinToUnixTimestamp(casinocoinTime)).toISOString()
    }
    
    static iso8601ToCasinocoinTime(iso8601: string): number {
        return this.unixToCasinocoinTimestamp(Date.parse(iso8601))
    }

    static casinocoinTimeNow(): number {
        return this.unixToCasinocoinTimestamp(Date.now());
    }

    static dropsToCsc(drops: string): string {
        let bigDrops = new Big(drops);
        if(bigDrops > 0){
            return (bigDrops).div(100000000.0).toString();
        } else {
            return "0.00";
        }
        
    }

    static cscToDrops(csc: string): string {
        let csc_drops = (new Big(csc)).times(100000000.0);
        return csc_drops.toString();
    }

    static toCasinocoindAmount(amount: Amount): CasinocoindAmount {
        if (amount.currency === 'CSC') {
            let csc_drops = this.cscToDrops(amount.value);
            return csc_drops;
        }
        let default_object: CasinocoindAmount = {
            currency: amount.currency,
            issuer: amount.counterparty ? amount.counterparty :  undefined,
            value: amount.value
        };
        return default_object;
    }

    static decodeMemos(memos: Array<CasinocoinMemo>) : Array<Memo> {
        function removeUndefined(obj: Object): Object {
            // return _.omit(obj, _.isUndefined)
            Object.keys(obj).forEach(key => obj[key] === undefined && delete obj[key]);
            return obj;
        }
        function hexToString(hex: string) : string {
            return hex ? new Buffer(hex, 'hex').toString('utf-8') : undefined;
        }

        if (!Array.isArray(memos) || memos.length === 0) {
            return undefined;
        }
        return memos.map(m => {
            let memoObject = { memo:
                removeUndefined({
                    memoType: hexToString(m['Memo'].MemoType),
                    memoFormat: hexToString(m['Memo'].MemoFormat),
                    memoData: hexToString(m['Memo'].MemoData)
                })
            };
            return memoObject;
        });
    }

    static encodeMemo(inputMemo: Memo): CasinocoinMemo {
        function removeUndefined(obj: Object): Object {
            // return _.omit(obj, _.isUndefined)
            Object.keys(obj).forEach(key => obj[key] === undefined && delete obj[key]);
            return obj;
        }
        function stringToHex(string: string) : string {
            // limit data to 256 bytes
            return string ? (new Buffer(string.substring(0,256), 'utf8')).toString('hex').toUpperCase() : undefined;
        }
        return {
            Memo: removeUndefined({
                MemoData: stringToHex(inputMemo.memo.memoData), 
                MemoType: stringToHex(inputMemo.memo.memoType),
                MemoFormat: stringToHex(inputMemo.memo.memoFormat)
            })
        };
    }

    static decodeInvoiceID(hex: string) : string {
        // remove start padding
        function removePadStart(string, padString){
            // hex encoding -> remove every "00"
            let resultString = string;
            while(resultString.startsWith(padString)){
                resultString = resultString.substring(2);
            }
            return resultString;
        }
        let unpaddedString = removePadStart(hex, "00");
        return (unpaddedString ? new Buffer(unpaddedString, 'hex').toString('utf-8') : "");
    }

    static encodeInvoiceID(string: string) : string {
        // limit data to 32 bytes (256 bit) left padded with 0 to 64 length for double digit hex
        function padStart(string, padString) {
            let targetLength = 64;
            targetLength = targetLength>>0; //floor if number or convert non-number to 0;
            padString = String(padString || ' ');
            if (string.length > targetLength) {
                return string;
            }
            else {
                targetLength = targetLength-string.length;
                if (targetLength > padString.length) {
                    padString += padString.repeat(targetLength/padString.length); //append to original to ensure we are longer than needed
                }
                return padString.slice(0,targetLength) + string;
            }
        }
        // encode
        let encoded = string ? (new Buffer(string.substring(0,32), 'utf8')).toString('hex').toUpperCase() : "";
        encoded = padStart(encoded, "0");
        return encoded;
    }

    private bytesToHex(byteArray) {
        return Array.from(byteArray, function(byte: number) {
          return ('0' + (byte & 0xFF).toString(16).toUpperCase()).slice(-2);
        }).join('')
    }

    static validateAccountID(accountID: string): boolean {
        // prepare position lookup table with casinocoin alphabet
        var vals = 'cpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2brdeCg65jkm8oFqi1tuvAxyz';
        // check if address starts with lowercase 'c'
        if(!accountID.startsWith('c')){
            return false;
        }
        // decode the the address
        var positions = {};
        for (var i=0 ; i < vals.length ; ++i) {
            positions[vals[i]] = i;
        }
        var base = 58;
        var length = accountID.length;
        var num = int(0);
        var leading_zero = 0;
        var seen_other = false;
        for (var i=0; i<length ; ++i) {
            var char = accountID[i];
            var p = positions[char];
    
            // if we encounter an invalid character, decoding fails
            if (p === undefined) {
                return false;
            }
            num = num.mul(base).add(p);
            if (char == '1' && !seen_other) {
                ++leading_zero;
            }
            else {
                seen_other = true;
            }
        }
        var hex = num.toString(16);        
        // num.toString(16) does not have leading 0
        if (hex.length % 2 !== 0) {
            hex = '0' + hex;
        }
        // strings starting with only ones need to be adjusted
        // e.g. '1' should map to '00' and not '0000'
        if (leading_zero && !seen_other) {
            --leading_zero;
        }
        while (leading_zero-- > 0) {
            hex = '00' + hex;
        }
        // addresses should always be 48 positions long
        if(hex.length == 48){
            return true;
        } else {
            return false;
        }
    }
}
