import { Pipe, PipeTransform } from '@angular/core';
import { DatePipe } from '@angular/common';
import { CSCUtil } from './domain/csc-util';

/*
 * Transform CSC date to indicated format
 * Usage:
 *   value | cscDate:"date_format"
*/
@Pipe({name: 'cscDate'})
export class CSCDatePipe implements PipeTransform {
    constructor(private datePipe: DatePipe){}

    transform(value: number, format: string): string {
        let unixTimestamp = CSCUtil.casinocoinToUnixTimestamp(value);
        return this.datePipe.transform(unixTimestamp, format);
    }
}

@Pipe({name: 'cscAmount'})
export class CSCAmountPipe implements PipeTransform {
    constructor(){}

    transform(value, includeCurrency: boolean): string {
        if(value == null){
            return "-";
        } else if(isNaN(value)){
            let amount = CSCUtil.dropsToCsc(value);
            if(includeCurrency){
                amount = amount + " CSC";
            }
            return amount;
        } else {
            let amount = CSCUtil.dropsToCsc(value.toString());
            if(includeCurrency){
                amount = amount + " CSC";
            }
            return amount;
        }
    }
}