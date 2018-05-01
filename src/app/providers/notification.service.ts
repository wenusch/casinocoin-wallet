import { Injectable } from '@angular/core';
import { LogService } from './log.service';
import { Router, NavigationStart } from '@angular/router';
import { Observable } from 'rxjs';
import { Subject } from 'rxjs/Subject';
import { MessageService } from 'primeng/components/common/messageservice';
import { ElectronService } from './electron.service';

// var notifier = require('node-notifier');
var path = require('path');

export enum SeverityType {
    info = "Info",
    error = "Error",
    warning = "Warning"
}

export interface NotificationType {
    severity?: SeverityType;
    title: string; 
    body: string;
}

@Injectable()
export class NotificationService {
    
    private messagesSubject = new Subject<NotificationType>();
    private nativeNotificationSupported: boolean;
 
    constructor(private router: Router,
                private logger: LogService,
                private electronService: ElectronService,
                private messageService: MessageService) {
        this.logger.debug("### INIT NotificationService");
        this.nativeNotificationSupported = this.electronService.remote.Notification.isSupported();
        this.logger.debug("### NotificationService - Native Support?: " + this.nativeNotificationSupported);
    }

    addMessage(msg: NotificationType){
        this.logger.debug("### NotificationService: " + JSON.stringify(msg));
        this.electronService.ipcRenderer.send('push-notification', msg);
        /*let notificationOptions: NotificationOptions = {
            tag: "CasinoCoin",
            icon: path.join(__dirname, 'assets/brand/casinocoin-icon-256x256.png'),
            body: msg.body
        }
        let notification = new Notification(msg.title, notificationOptions);*/
    }
}