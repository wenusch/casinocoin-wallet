import { Injectable } from '@angular/core';
import { Logger } from 'angular2-logger/core';
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
                private logger: Logger,
                private electronService: ElectronService,
                private messageService: MessageService) {
        this.logger.debug("### INIT NotificationService");
        this.nativeNotificationSupported = this.electronService.remote.Notification.isSupported();
        this.logger.debug("### NotificationService - Native Support?: " + this.nativeNotificationSupported);
    }

    addMessage(msg: NotificationType){
        this.logger.debug("### NotificationService: " + JSON.stringify(msg));
        let notificationOptions: NotificationOptions = {
            tag: "Casinocoin",
            icon: path.join(__dirname, 'assets/casinocoin-icon-256x256.png'),
            body: msg.body
        }
        let notification = new Notification(msg.title, notificationOptions);
        // let options: Electron.NotificationConstructorOptions = {
        //     title: msg.title,
        //     body: msg.body
        // }
        // new this.electronService.remote.Notification({title: 'test', body: 'test body'});
        // notifier.notify({
        //     title: msg.title,
        //     message: msg.body,
        //     icon: path.join(__dirname, 'assets/casinocoin-icon-256x256.png'),
        //     sound: false,
        //     wait: false
        // });
    }
 
    // success(message: string, keepAfterNavigationChange = false, growl: boolean = true) {
    //     this.keepAfterNavigationChange = keepAfterNavigationChange;
    //     if(growl){
    //         this.growlsSubject.next({type: 'success', text: message});
    //     } else {
    //         this.messagesSubject.next({ type: 'success', text: message });
    //     }
    // }
 
    // error(message: string, keepAfterNavigationChange = false, growl: boolean = true) {
    //     this.keepAfterNavigationChange = keepAfterNavigationChange;
    //     if(growl){
    //         this.growlsSubject.next({type: ' error', text: message});
    //     } else {
    //         this.messagesSubject.next({ type: 'error', text: message });   
    //     }
    // }
 
    // getMessage(): Observable<any> {
    //     return this.messagesSubject.asObservable();
    // }

    // getGrowls(): Observable<any> {
    //     return this.growlsSubject.asObservable();
    // }
}