import { Component, OnInit, ViewChild } from '@angular/core';
import { LokiAccount } from '../../../domain/lokijs';
import { CSCUtil } from '../../../domain/csc-util';

@Component({
  selector: 'app-receive-coins',
  templateUrl: './receive-coins.component.html',
  styleUrls: ['./receive-coins.component.scss']
})
export class ReceiveCoinsComponent implements OnInit {

  accounts: Array<LokiAccount> = [];

  constructor() { }

  ngOnInit() {
  }

  convertCscTimestamp(inputTime) {
    return CSCUtil.casinocoinToUnixTimestamp(inputTime);
  }
}
