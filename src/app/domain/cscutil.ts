import BigNumber from 'bignumber';

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
        return (new BigNumber(drops)).dividedBy(100000000.0).toString()
    }

    static cscToDrops(csc: string): string {
        let csc_drops = (new BigNumber(csc)).times(100000000.0);
        return csc_drops.floor().toString();
    }
}
