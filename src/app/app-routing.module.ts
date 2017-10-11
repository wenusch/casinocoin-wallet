import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AuthGuard } from './domain/auth-guard';

import { HomeComponent }            from './components/home/home.component';
import { WalletSetupComponent }     from './components/wallet-setup/wallet-setup.component';
import { LoginComponent }           from './components/login/login.component';
import { OverviewComponent }        from './components/forms/overview/overview.component';
import { SendCoinsComponent }       from './components/forms/send-coins/send-coins.component';
import { ReceiveCoinsComponent }    from './components/forms/receive-coins/receive-coins.component';
import { AddressbookComponent }     from './components/forms/addressbook/addressbook.component';
import { CoinSwapComponent }        from './components/forms/coin-swap/coin-swap.component';

const routes: Routes = [
    { path: '', component: HomeComponent, canActivate: [AuthGuard],
        children: [
            { path: 'overview', component: OverviewComponent },
            { path: 'send', component: SendCoinsComponent },
            { path: 'receive', component: ReceiveCoinsComponent },
            { path: 'addressbook', component: AddressbookComponent },
            { path: 'swap', component: CoinSwapComponent },
            { path: '', redirectTo: 'overview', pathMatch: 'full'}
            ] },
    { path: 'wallet-setup', component: WalletSetupComponent },
    { path: 'login', component: LoginComponent },

    // otherwise redirect to home
    { path: '**', redirectTo: 'login' }
];

@NgModule({
    imports: [RouterModule.forRoot(routes, {useHash: true})],
    exports: [RouterModule]
})
export class AppRoutingModule { }
