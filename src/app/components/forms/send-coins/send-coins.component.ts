import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-send-coins',
  templateUrl: './send-coins.component.html',
  styleUrls: ['./send-coins.component.scss']
})
export class SendCoinsComponent implements OnInit {

  receipient: string;
  description: string;
  amount: string;
  
  constructor() { }

  ngOnInit() {
  }

}
