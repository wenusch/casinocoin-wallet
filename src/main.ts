import 'reflect-metadata';
import './polyfills';

import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { enableProdMode } from '@angular/core';
import { environment } from 'environments';

if (environment.production) {
  enableProdMode();
}
platformBrowserDynamic().bootstrapModule(AppModule);

// import { platformBrowser } from '@angular/platform-browser';
// import { AppModuleNgFactory }              from './app/app.module.ngfactory';

// platformBrowser().bootstrapModuleFactory(AppModuleNgFactory);