import { Component, OnInit } from '@angular/core';
import { ElectronService } from './providers/electron.service';
import { Logger } from 'angular2-logger/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  constructor(private logger: Logger, public electronService: ElectronService) {

    if (electronService.isElectron()) {
      logger.debug('Mode electron');
      // Check if electron is correctly injected (see externals in webpack.config.js)
      logger.info('App Path: ' + electronService.remote.app.getAppPath());
    } else {
      logger.debug('Mode web');
    }
  }

  ngOnInit() {
    this.logger.debug("### INIT App Component ###");
  }
}
