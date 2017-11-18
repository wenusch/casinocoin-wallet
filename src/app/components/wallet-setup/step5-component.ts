import { Component, OnInit, ViewEncapsulation, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { trigger, state, transition, style, animate } from '@angular/animations';
import { Logger } from 'angular2-logger/core';
import { ElectronService } from '../../providers/electron.service';
import { MenuItem, MessagesModule, Message } from 'primeng/primeng';
import { SessionStorageService, LocalStorageService } from "ngx-store";
import { WalletService } from '../../providers/wallet.service';

@Component({
    selector: 'setup-step5',
    templateUrl: './step5-component.html',
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
  export class SetupStep5Component {

    constructor( private logger: Logger, 
      private electron: ElectronService,
      private localStorageService: LocalStorageService,
      private sessionStorageService: SessionStorageService,
      private walletService: WalletService ) { }

    @ViewChild('inputWalletLocation') inputWalletLocation;
    @Input() newWalletLocation:string;
    @Output() locationChange:EventEmitter<string> = new EventEmitter();

    selectWalletLocation() {    
        this.logger.debug('Open File Dialog: ' + this.electron.remote.app.getPath("home"));
        this.electron.remote.dialog.showOpenDialog(
            { title: 'Wallet Location',
            properties: ['openDirectory','createDirectory']}, (result) => {
              this.logger.debug('File Dialog Result: ' + JSON.stringify(result));
              if(result && result.length>0) {
                  this.newWalletLocation = result[0];
                  this.locationChange.emit(this.newWalletLocation);
                  this.inputWalletLocation.nativeElement.focus();
              }
            }
        );
    }

  }