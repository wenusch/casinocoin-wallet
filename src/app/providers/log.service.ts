import { Injectable } from '@angular/core';
import { Logger } from 'angular2-logger/core';
import { ElectronService } from './electron.service';

@Injectable()
export class LogService {

    electronLogger: any;
    loglevel: string = "error";

    constructor(private logger: Logger,
                private electronService: ElectronService) {
        this.logger.debug("### INIT LogService");
        this.electronLogger = this.electronService.remote.getGlobal("logger");
        this.loglevel = this.electronService.remote.getGlobal("loglevel");
    }

    debug(content:string){
        // write debug log
        if(this.loglevel == 'debug'){
            this.logger.debug(content);
            this.electronLogger.log("debug", content);
        }
    }

    info(content:string){
        // write info log
        if(this.loglevel == 'debug' || this.loglevel == 'info'){
            this.logger.info(content);
            this.electronLogger.log("info", content);
        }
    }

    error(content:string){
        // write error log
        if(this.loglevel == 'debug' || this.loglevel == 'info' || this.loglevel == 'error'){
            this.logger.error(content);
            this.electronLogger.log("error", content);
        }
    }

}