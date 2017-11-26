import { Injectable } from '@angular/core';
import { Logger } from 'angular2-logger/core';
import { ElectronService } from './electron.service';

@Injectable()
export class LogService {

    electronLogger: any;

    constructor(private logger: Logger,
                private electronService: ElectronService) {
        this.logger.debug("### INIT LogService");
        this.electronLogger = this.electronService.remote.getGlobal("logger");
    }

    debug(content:string){
        // write debug log
        this.logger.debug(content);
        this.electronLogger.log("debug", content);
    }

    info(content:string){
        // write info log
        this.logger.info(content);
        this.electronLogger.log("info", content);
    }

    error(content:string){
        // write error log
        this.logger.error(content);
        this.electronLogger.log("error", content);
    }

}