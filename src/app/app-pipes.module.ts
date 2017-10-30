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

    transform(value): string {
        if(value == null){
            return "-";
        } else if(isNaN(value)){
            return CSCUtil.dropsToCsc(value);
        } else {
            return CSCUtil.dropsToCsc(value.toString());
        }
    }
}