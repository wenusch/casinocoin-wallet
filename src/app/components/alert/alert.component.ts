import { Component, OnInit } from '@angular/core';
import { MessagesModule, Message } from 'primeng/primeng';

import { AlertService } from '../../providers/alert.service';
 
@Component({
    moduleId: module.id,
    selector: 'alert',
    templateUrl: 'alert.component.html'
})
 
export class AlertComponent {
    
  message: any;
  msgs: Message[] = [];
 
  constructor(private alertService: AlertService) { }
 
  ngOnInit() {
      this.alertService.getMessage().subscribe(message => {
          if(message){
            console.log(message);
            this.msgs.push({severity: message.type, summary: message.text});
          }
        }
    );
  }
}
