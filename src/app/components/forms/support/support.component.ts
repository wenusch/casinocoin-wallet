import { Component, OnInit } from '@angular/core';
import { Logger } from 'angular2-logger/core';
import { AppConstants } from '../../../domain/app-constants';

@Component({
  selector: 'app-support',
  templateUrl: './support.component.html',
  styleUrls: ['./support.component.scss']
})
export class SupportComponent implements OnInit {

  constructor(private logger: Logger) { 
          this.logger.debug("### INIT Support ###");
  }

  ngOnInit() {

  }

}
