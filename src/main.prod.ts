import 'reflect-metadata';
import './polyfills';

import { platformBrowser } from '@angular/platform-browser';
import { AppModuleNgFactory } from './app/app.module.ngfactory';
import { enableProdMode } from '@angular/core';

// Launch with the app module factory.
enableProdMode();
platformBrowser().bootstrapModuleFactory(AppModuleNgFactory);
