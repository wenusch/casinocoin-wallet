import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AuthGuard } from './domain/auth-guard';

import { HomeComponent }            from './components/home/home.component';
import { WalletSetupComponent }     from './components/wallet-setup/wallet-setup.component';
import { LoginComponent }           from './components/login/login.component';
import { RecoverPasswordComponent } from './components/login/recover-password.component';
import { SendCoinsComponent }       from './components/forms/send-coins/send-coins.component';
import { ReceiveCoinsComponent }    from './components/forms/receive-coins/receive-coins.component';
import { AddressbookComponent }     from './components/forms/addressbook/addressbook.component';
import { CoinSwapComponent }        from './components/forms/coin-swap/coin-swap.component';
import { TransactionsComponent }    from './components/forms/transactions/transactions.component';
import { PaperwalletComponent }     from './components/forms/paperwallet/paperwallet.component';
import { SupportComponent }         from './components/forms/support/support.component';
import { ExchangesComponent }       from './components/forms/exchanges/exchanges.component';
import { ImportpaperwalletComponent } from './components/forms/importpaperwallet/importpaperwallet.component';
import { ChangepasswordComponent } from './components/forms/changepassword/changepassword.component';

const routes: Routes = [
    { path: 'home', component: HomeComponent, canActivate: [AuthGuard],
        children: [
            { path: 'send', component: SendCoinsComponent },
            { path: 'receive', component: ReceiveCoinsComponent },
            { path: 'addressbook', component: AddressbookComponent },
            { path: 'paperwallet', component: PaperwalletComponent },
            { path: 'importpaperwallet', component: ImportpaperwalletComponent },
            { path: 'changepassword', component: ChangepasswordComponent },
            { path: 'swap', component: CoinSwapComponent },
            { path: 'transactions', component: TransactionsComponent },
            { path: 'support', component: SupportComponent },
            { path: 'exchanges', component: ExchangesComponent },
            { path: '', redirectTo: 'transactions', pathMatch: 'full'}
            ] 
    },
    { path: 'wallet-setup', component: WalletSetupComponent },
    { path: 'login', component: LoginComponent },
    { path: 'recoverPassword', component: RecoverPasswordComponent, canActivate: [AuthGuard]},

    // otherwise redirect to home
    { path: '**', redirectTo: 'home' }
];

@NgModule({
    imports: [RouterModule.forRoot(routes, {useHash: true, enableTracing: false})],
    exports: [RouterModule]
})
export class AppRoutingModule { }
