import { Injectable } from '@angular/core';

// If you import a module but never use any of the imported values other than as TypeScript types,
// the resulting javascript file will look as if you never imported the module at all.
import { ipcRenderer, remote, autoUpdater, clipboard } from 'electron';
import * as childProcess from 'child_process';

@Injectable()
export class ElectronService {

  ipcRenderer: typeof ipcRenderer;
  childProcess: typeof childProcess;
  remote: typeof remote;
  autoUpdater: typeof autoUpdater;
  clipboard: typeof clipboard;

  constructor() {
    // Conditional imports
    if (this.isElectron()) {
      this.ipcRenderer = window.require('electron').ipcRenderer;
      this.childProcess = window.require('child_process');
      this.remote = window.require('electron').remote;
      this.autoUpdater = window.require('electron').autoUpdater;
      this.clipboard = window.require('electron').clipboard;
    }
  }

  isElectron = () => {
    return window && window.process && window.process.type;
  }

}
