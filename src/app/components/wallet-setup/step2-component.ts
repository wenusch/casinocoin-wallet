import { Component, OnInit, ViewEncapsulation, Input, Output, EventEmitter } from '@angular/core';
import { LogService } from '../../providers/log.service';
import { AppConstants } from '../../domain/app-constants';

import { MenuItem, MessagesModule, Message, CheckboxModule } from 'primeng/primeng';

@Component({
    selector: 'setup-step2',
    templateUrl: './step2-component.html',
    encapsulation: ViewEncapsulation.None,
  })
  export class SetupStep2Component {

    disclaimerText: string;

    constructor( ) { 
      this.disclaimerText = AppConstants.DISLAIMER_TEXT;
    }

    @Input() disclaimerAccepted: boolean;
    @Output() disclaimerAcceptedChange:EventEmitter<boolean> = new EventEmitter();

    onDisclaimerAcceptChanged(newValue) {
      this.disclaimerAcceptedChange.emit(newValue);
    }

  }