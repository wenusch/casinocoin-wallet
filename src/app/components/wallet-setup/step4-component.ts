import { Component, OnInit, ViewEncapsulation, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { trigger, state, transition, style, animate } from '@angular/animations';
import { Logger } from 'angular2-logger/core';
import { PasswordModule } from 'primeng/primeng';

@Component({
    selector: 'setup-step4',
    templateUrl: './step4-component.html',
    encapsulation: ViewEncapsulation.None
  })
  export class SetupStep4Component {
    @Input() newWalletMnemonic: Array<string>;
    @Input() recoveryAccepted: boolean;
    @Output() recoveryAcceptChanged:EventEmitter<boolean> = new EventEmitter();

    onRecoveryAcceptChanged(newValue) {
      this.recoveryAcceptChanged.emit(newValue);
    }

    constructor( ) { }

  }