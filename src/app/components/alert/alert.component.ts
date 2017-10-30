import { Component, OnInit } from '@angular/core';
import { MessagesModule, Message, Growl } from 'primeng/primeng';
import {MessageService} from 'primeng/components/common/messageservice';

import { AlertService } from '../../providers/alert.service';
 
@Component({
    moduleId: module.id,
    selector: 'alert',
    templateUrl: 'alert.component.html'
})
 
export class AlertComponent {
    
  message: any;
  msgs: Message[] = [];
  growls: Growl[] = [];
 
  constructor(private alertService: AlertService, private messageService: MessageService) { }
 
  ngOnInit() {
      this.alertService.getMessage().subscribe(message => {
          if(message){
            console.log(message);
            this.msgs.push({severity: message.type, summary: message.text});
          }
      });
  }
}
