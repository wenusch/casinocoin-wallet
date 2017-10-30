import Big from 'big.js';
import { Amount, CasinocoindAmount }  from './csc-types';

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

    static decodeMemos(memos: Array<Object>) : Array<Object> {
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
            return removeUndefined({
                type: hexToString(m['Memo'].MemoType),
                format: hexToString(m['Memo'].MemoFormat),
                data: hexToString(m['Memo'].MemoData)
            });
        });
    }

    static encodeMemo(memo: Object): Object {
        function removeUndefined(obj: Object): Object {
            // return _.omit(obj, _.isUndefined)
            Object.keys(obj).forEach(key => obj[key] === undefined && delete obj[key]);
            return obj;
        }
        function stringToHex(string: string) : string {
            return string ? (new Buffer(string, 'utf8')).toString('hex').toUpperCase() : undefined;
        }
        return {
            Memo: removeUndefined({
                MemoData: stringToHex(memo['data']),
                MemoType: stringToHex(memo['type']),
                MemoFormat: stringToHex(memo['format'])
            })
        };
    }

    
    private bytesToHex(byteArray) {
        return Array.from(byteArray, function(byte: number) {
          return ('0' + (byte & 0xFF).toString(16).toUpperCase()).slice(-2);
        }).join('')
    }

}
