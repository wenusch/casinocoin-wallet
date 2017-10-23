import { Injectable } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { Observable } from 'rxjs';
import { Subject } from 'rxjs/Subject';
 
@Injectable()
export class AlertService {
    
    private messagesSubject = new Subject<any>();
    private growlsSubject = new Subject<any>();
    private keepAfterNavigationChange = false;
 
    constructor(private router: Router) {
        // clear alert message on route change
        router.events.subscribe(event => {
            if (event instanceof NavigationStart) {
                if (this.keepAfterNavigationChange) {
                    // only keep for a single location change
                    this.keepAfterNavigationChange = false;
                } else {
                    // clear alert
                    this.messagesSubject.next();
                    this.growlsSubject.next();
                }
            }
        });
    }
 
    success(message: string, keepAfterNavigationChange = false, growl: boolean = true) {
        this.keepAfterNavigationChange = keepAfterNavigationChange;
        if(growl){
            this.growlsSubject.next({type: 'success', text: message});
        } else {
            this.messagesSubject.next({ type: 'success', text: message });
        }
    }
 
    error(message: string, keepAfterNavigationChange = false, growl: boolean = true) {
        this.keepAfterNavigationChange = keepAfterNavigationChange;
        if(growl){
            this.growlsSubject.next({type: ' error', text: message});
        } else {
            this.messagesSubject.next({ type: 'error', text: message });   
        }
    }
 
    getMessage(): Observable<any> {
        return this.messagesSubject.asObservable();
    }

    getGrowls(): Observable<any> {
        return this.growlsSubject.asObservable();
    }
}