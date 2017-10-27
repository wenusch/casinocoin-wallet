import { Pipe, PipeTransform } from '@angular/core';
import { DatePipe } from '@angular/common';
import { CSCUtil } from './domain/cscutil';

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