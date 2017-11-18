import { Component } from '@angular/core';
import { Logger } from 'angular2-logger/core';
import { NotificationService } from './providers/notification.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  
  constructor(private notificationService: NotificationService ) {
  }

}
