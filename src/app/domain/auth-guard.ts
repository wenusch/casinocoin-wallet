import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { SessionStorageService, LocalStorageService } from "ngx-store";
import { Logger } from "angular2-logger/core";
import { AppConstants } from './app-constants';

@Injectable()
export class AuthGuard implements CanActivate {

    constructor(private router: Router,
                private sessionStorageService: SessionStorageService,
                private localStorageService: LocalStorageService,
                private logger: Logger
            ) { logger.debug("AuthGuard");}

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) : boolean {
        // Check if we have an opened wallet
        if (this.sessionStorageService.get(AppConstants.KEY_CURRENT_WALLET)) {
            // wallet open so return true
            this.logger.debug('### AuthGuard - Wallet Selected?: ' + this.sessionStorageService.get(AppConstants.KEY_CURRENT_WALLET));
            return true;
        }
        // Wallet not open, check if setup has been completed
        if (this.localStorageService.get(AppConstants.KEY_SETUP_COMPLETED)) {
            // setup complete but wallet not open so redirect to login
            this.logger.debug('### Setup complete, User not Logged in, redirect to Login ###');
            this.router.navigate(['/login'], { queryParams: { returnUrl: state.url }});
            return false;
        } else {
            // Run Setup
            this.logger.debug('### No wallet, redirect to Setup ###');
            this.router.navigate(['/wallet-setup'], { queryParams: { returnUrl: state.url }});
            return false;
        }
    }

    canActivateChild() : boolean {
        return true;
      }
}

