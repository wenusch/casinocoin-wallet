import { Component, OnInit, ViewEncapsulation, Input, Output, EventEmitter } from '@angular/core';
import { trigger, state, transition, style, animate } from '@angular/animations';
import { Logger } from 'angular2-logger/core';
import { MenuItem, MessagesModule, Message, CheckboxModule } from 'primeng/primeng';

@Component({
    selector: 'setup-step1',
    templateUrl: './step1-component.html',
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
  export class SetupStep1Component {

    constructor( private logger: Logger ) { }

    @Input() walletTestNetwork: boolean;
    @Output() walletNetworkChange:EventEmitter<boolean> = new EventEmitter();

    onNetworkChanged(newValue) {
      this.walletNetworkChange.emit(newValue);
    }

  }