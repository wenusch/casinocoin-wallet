import { Component, OnInit, ViewEncapsulation, Input, Output, 
         EventEmitter, SimpleChanges, ViewChild } from '@angular/core';
import { trigger, state, transition, style, animate } from '@angular/animations';
import { LogService } from '../../providers/log.service';
import { PasswordModule } from 'primeng/primeng';

@Component({
    selector: 'setup-step3',
    templateUrl: './step3-component.html',
    encapsulation: ViewEncapsulation.None,
    animations: [
      trigger('slideInOut', [
        state('in', style({
          transform: 'translate3d(0, 0, 0)'
        })),
        // state('out', style({
        //   transform: 'translate3d(100%, 0, 0)'
        // })),
        transition('in => out', animate('400ms ease-in-out')),
        transition('out => in', animate('400ms ease-in-out'))
      ])
    ]
  })
  export class SetupStep3Component {

    @Input() newWalletPassword:string;
    @Output() passwordChange:EventEmitter<string> = new EventEmitter();
    @ViewChild('passwordInput') passwordInput;
    @ViewChild('passwordInputConfirmed') passwordInputConfirmed;

    newWalletPasswordConfirmed: string = "";
    paswordConfirmationEnabled: boolean = false;

    passwordPattern: string = "(?=.*[0-9])(?=.*[a-z]).{8,}";

    constructor( ) { }

    checkPasswordUpdate(newValue: string) {
      let testResult = newValue.match(this.passwordPattern);
      if(testResult != null) {
        this.paswordConfirmationEnabled = true;
      } else {
        this.passwordChange.emit("");
        this.paswordConfirmationEnabled = false;
      }
    }

    checkPasswordConfirmedUpdate(newConfirmValue: string){
      if(newConfirmValue == this.newWalletPassword){
        this.passwordChange.emit(this.newWalletPassword);
      } else {
        this.passwordChange.emit("");
      }
    }

  }