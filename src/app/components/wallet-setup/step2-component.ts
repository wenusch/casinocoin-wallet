import { Component, OnInit, ViewEncapsulation, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { trigger, state, transition, style, animate } from '@angular/animations';
import { Logger } from 'angular2-logger/core';
import { PasswordModule } from 'primeng/primeng';

@Component({
    selector: 'setup-step2',
    templateUrl: './step2-component.html',
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
  export class SetupStep2Component {
    @Input() newWalletPassword:string;
    @Output() passwordChange:EventEmitter<string> = new EventEmitter();

    passwordPattern: string = "(?=.*[0-9])(?=.*[a-z]).{8,}";

    constructor( ) { }

    checkPasswordUpdate(newValue: string) {
      let testResult = newValue.match(this.passwordPattern);
      if(testResult != null) {
        this.passwordChange.emit(newValue);
      }
    }

  }