import { Component, OnInit, ViewEncapsulation, Input } from '@angular/core';
import { trigger, state, transition, style, animate } from '@angular/animations';
import { LogService } from '../../providers/log.service';
import { ElectronService } from '../../providers/electron.service';
import { MenuItem, MessagesModule, Message } from 'primeng/primeng';

@Component({
    selector: 'setup-step6',
    templateUrl: './step6-component.html',
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
  export class SetupStep6Component {
    @Input() walletCreated:boolean;
    @Input() accountCreated:boolean;
    @Input() keysEncrypted:boolean;
    @Input() keyBackupCompleted:boolean;
    // @Input() connectedToNetwork:boolean;
  }