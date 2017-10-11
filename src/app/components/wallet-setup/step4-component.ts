import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { trigger, state, transition, style, animate } from '@angular/animations';
import { Logger } from 'angular2-logger/core';
import { ElectronService } from '../../providers/electron.service';
import { MenuItem, MessagesModule, Message } from 'primeng/primeng';

@Component({
    selector: 'setup-step4',
    templateUrl: './step4-component.html',
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
  export class SetupStep4Component {

  }