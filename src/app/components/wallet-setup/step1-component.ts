import { Component, OnInit, ViewEncapsulation, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { trigger, state, transition, style, animate } from '@angular/animations';
import { Logger } from 'angular2-logger/core';
import { MenuItem, MessagesModule, Message, CheckboxModule } from 'primeng/primeng';

@Component({
    selector: 'setup-step1',
    templateUrl: './step1-component.html',
    encapsulation: ViewEncapsulation.None
  })
  export class SetupStep1Component {

    constructor( ) { }

    @Input() walletTestNetwork: boolean;
    @Output() walletNetworkChange:EventEmitter<boolean> = new EventEmitter();

    networkChoiceDisabled:boolean = false;
    keys_pressed: string = "";

    // @HostListener('document:keypress', ['$event'])
    // handleKeyboardEvent(event: KeyboardEvent) { 
    //   this.keys_pressed = this.keys_pressed + event.key;
    //   if(this.keys_pressed === "allowlive"){
    //     this.networkChoiceDisabled = false;
    //     this.keys_pressed = "";
    //   }
    // }
    
    onNetworkChanged(newValue) {
      this.walletNetworkChange.emit(newValue);
    }

  }