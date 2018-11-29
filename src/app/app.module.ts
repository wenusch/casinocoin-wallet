import { BrowserModule }            from '@angular/platform-browser';
import { BrowserAnimationsModule }  from '@angular/platform-browser/animations';
import { NgModule }                 from '@angular/core';
import { FormsModule, FormBuilder } from '@angular/forms';
import { HttpModule }               from '@angular/http';
import { HttpClient, 
         HttpClientModule }         from '@angular/common/http';
import { Logger, Options, Level }   from 'angular2-logger/core';
import { environment }              from '../environments/index';

import { AppRoutingModule }         from './app-routing.module';

import { ElectronService }          from './providers/electron.service';
import { LogService }               from './providers/log.service';
import { WalletService }            from './providers/wallet.service';
import { CasinocoinService }        from './providers/casinocoin.service';
import { WebsocketService }         from './providers/websocket.service';
import { SwapService }              from './providers/swap.service';
import { NotificationService }      from './providers/notification.service';
import { MarketService }            from './providers/market.service';
import { ValidatorService }         from './providers/validator.service';

import { AuthGuard }                from './domain/auth-guard';
import { QRCodeModule }             from 'angular2-qrcode';

import { WebStorageModule, 
         LocalStorageService, 
         SessionStorageService, 
         CookiesStorageService }    from 'ngx-store';

import { DatePipe, DecimalPipe,
         CurrencyPipe }             from '@angular/common';
import { CSCDatePipe, 
         CSCAmountPipe,
         ToNumberPipe }             from './app-pipes.module';

import { AppComponent }             from './app.component';
import { HomeComponent }            from './components/home/home.component';
import { WalletSetupComponent }     from './components/wallet-setup/wallet-setup.component';
import { SetupStep1Component }      from './components/wallet-setup/step1-component';
import { SetupStep2Component }      from './components/wallet-setup/step2-component';
import { SetupStep3Component }      from './components/wallet-setup/step3-component';
import { SetupStep4Component }      from './components/wallet-setup/step4-component';
import { SetupStep5Component }      from './components/wallet-setup/step5-component';
import { SetupStep6Component }      from './components/wallet-setup/step6-component';
import { LoginComponent }           from './components/login/login.component';
import { RecoverPasswordComponent } from './components/login/recover-password.component';
import { SendCoinsComponent }       from './components/forms/send-coins/send-coins.component';
import { ReceiveCoinsComponent }    from './components/forms/receive-coins/receive-coins.component';
import { AddressbookComponent }     from './components/forms/addressbook/addressbook.component';
import { CoinSwapComponent }        from './components/forms/coin-swap/coin-swap.component';
import { OverviewComponent }        from './components/forms/overview/overview.component';
import { TransactionsComponent }    from './components/forms/transactions/transactions.component';
import { PaperwalletComponent }    from './components/forms/paperwallet/paperwallet.component';
import { ImportpaperwalletComponent } from './components/forms/importpaperwallet/importpaperwallet.component';
import { ChangepasswordComponent } from './components/forms/changepassword/changepassword.component';
import { SupportComponent }         from './components/forms/support/support.component';
import { ExchangesComponent }       from './components/forms/exchanges/exchanges.component';
import { WindowRef } from './components/forms/paperwallet/WindowRef';

// import PrimeNG, Material and Bootstrap modules
import { DialogModule, ButtonModule, CheckboxModule,
         MessagesModule, ToolbarModule, AccordionModule,
         MenuModule, PanelModule, CalendarModule,
         DataTableModule, SharedModule, DropdownModule,
         StepsModule, PasswordModule, GrowlModule,
         ContextMenuModule, TieredMenuModule, InputTextareaModule,
         ProgressSpinnerModule } from 'primeng/primeng';
import { MessageService } from 'primeng/components/common/messageservice';
import { MatListModule, MatSidenavModule, MatTooltipModule,
         MatButtonModule } from '@angular/material';

@NgModule({
  declarations: [
    AppComponent,
    CSCDatePipe, CSCAmountPipe,ToNumberPipe,
    HomeComponent,
    WalletSetupComponent,
    SetupStep1Component, SetupStep2Component, 
    SetupStep3Component, SetupStep4Component,
    SetupStep5Component, SetupStep6Component,
    LoginComponent, RecoverPasswordComponent,
    SendCoinsComponent,
    ReceiveCoinsComponent,
    AddressbookComponent,
    CoinSwapComponent,
    OverviewComponent,
    TransactionsComponent,
    PaperwalletComponent,
    SupportComponent,
    ExchangesComponent,
    ImportpaperwalletComponent,
    ChangepasswordComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    HttpModule,
    AppRoutingModule,
    WebStorageModule,
    QRCodeModule,
    DialogModule, ButtonModule, CheckboxModule,
    MessagesModule, ToolbarModule, AccordionModule,
    MenuModule, PanelModule, CalendarModule,
    DataTableModule, SharedModule, DropdownModule,
    StepsModule, PasswordModule, GrowlModule,
    MatListModule, MatSidenavModule, ContextMenuModule,
    TieredMenuModule, MatTooltipModule, MatButtonModule,
    InputTextareaModule, ProgressSpinnerModule
  ],
  providers: [
    Logger, Options,FormBuilder,
    DatePipe, DecimalPipe, CurrencyPipe,
    CSCDatePipe, CSCAmountPipe, ToNumberPipe,
    HttpClient,
    ElectronService,
    LogService,
    AuthGuard,
    WebsocketService,
    WalletService,
    CasinocoinService,
    SwapService,
    MessageService,
    NotificationService,
    MarketService,
    ValidatorService,
    WindowRef
  ],
  bootstrap: [AppComponent]
})
export class AppModule { 
  constructor(private logger: Logger) {
    this.logger.debug("AppModule");
    this.logger.level = environment.loglevel;
    this.logger.debug("Log Level: " + this.logger.level);
  }
}
