import { Component, OnInit } from '@angular/core';
import { Logger } from 'angular2-logger/core';
import { AppConstants } from '../../../domain/app-constants';
import { ElectronService } from '../../../providers/electron.service';

@Component({
  selector: 'app-support',
  templateUrl: './support.component.html',
  styleUrls: ['./support.component.scss']
})
export class SupportComponent implements OnInit {

  constructor(private logger: Logger,
              private electronService: ElectronService) { 
          this.logger.debug("### INIT Support ###");
  }

  ngOnInit() {

  }

  openFAQ(){
    event.preventDefault();
    this.electronService.remote.shell.openExternal("https://casinocoin.org/faq/");
  }

  openReddit(){
    event.preventDefault();
    this.electronService.remote.shell.openExternal("https://www.reddit.com/r/casinocoin/");
  }

  openDiscord(){
    event.preventDefault();
    this.electronService.remote.shell.openExternal("http://casinocoin.chat/");
  }

  openWebsite(){
    event.preventDefault();
    this.electronService.remote.shell.openExternal("https://casinocoin.org");
  }

  openGithub(){
    event.preventDefault();
    this.electronService.remote.shell.openExternal("https://github.com/casinocoin/casinocoin-wallet/issues");
  }

  openContactForm(){
    event.preventDefault();
    this.electronService.remote.shell.openExternal("https://casinocoin.org/contact");
  }

  openEmail(){
    event.preventDefault();
    this.electronService.remote.shell.openExternal("mailto:support@casinocoin.org");
  }

  openFacebook(){
    event.preventDefault();
    this.electronService.remote.shell.openExternal("https://www.facebook.com/casinocoin.org/");
  }

  openTwitter(){
    event.preventDefault();
    this.electronService.remote.shell.openExternal("https://twitter.com/CasinoCoin_org");
  }
}
