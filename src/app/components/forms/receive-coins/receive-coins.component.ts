import { Component, OnInit } from '@angular/core';
import { LokiAccount } from '../../../domain/lokijs';
import { CSCUtil } from '../../../domain/cscutil';

@Component({
  selector: 'app-receive-coins',
  templateUrl: './receive-coins.component.html',
  styleUrls: ['./receive-coins.component.scss']
})
export class ReceiveCoinsComponent implements OnInit {

  accounts: LokiAccount[] = [];

  constructor() { }

  ngOnInit() {
  }

  convertCscTimestamp(inputTime) {
    return CSCUtil.casinocoinToUnixTimestamp(inputTime);
  }
}
