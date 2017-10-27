import { Component, OnInit, ViewChild } from '@angular/core';
import { InputText } from 'primeng/primeng';

@Component({
  selector: 'app-send-coins',
  templateUrl: './send-coins.component.html',
  styleUrls: ['./send-coins.component.scss']
})
export class SendCoinsComponent implements OnInit {

  @ViewChild('accountInput') accountInput;
  @ViewChild('descriptionInput') descriptionInput;

  receipient: string;
  description: string;
  amount: string;
  
  constructor() { }

  ngOnInit() {
  }

  focusDescription(){
    this.descriptionInput.nativeElement.focus();
  }

  focusAmount(){
    this.accountInput.nativeElement.focus();
  }

  doSendCoins(){

  }
}
