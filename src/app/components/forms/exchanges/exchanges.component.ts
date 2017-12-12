import { Component, OnInit } from '@angular/core';
import { LogService } from '../../../providers/log.service';
import { AppConstants } from '../../../domain/app-constants';
import { Menu as ElectronMenu, MenuItem as ElectronMenuItem } from "electron"; 
import { ElectronService } from '../../../providers/electron.service';
import { MarketService } from '../../../providers/market.service';
import { CSCUtil } from '../../../domain/csc-util';
import { ExchangesType } from '../../../domain/service-types';

@Component({
  selector: 'app-exchanges',
  templateUrl: './exchanges.component.html',
  styleUrls: ['./exchanges.component.scss']
})
export class ExchangesComponent implements OnInit {

  exchange_context_menu: ElectronMenu;
  selectedExchangeRow: ExchangesType;
  exchanges: Array<ExchangesType> = [];

  constructor(private logger: LogService,
              private electronService: ElectronService,
              private marketService: MarketService ) { 
    this.logger.debug("### INIT Exchanges ###");
    this.exchanges = this.marketService.exchanges;
  }

  ngOnInit() {
    // init exchanges context menu
    let exchanges_context_menu_template = [
      { label: 'Visit Exchange', 
        click(menuItem, browserWindow, event) {
          browserWindow.webContents.send('exchanges-context-menu-event', 'visit-exchange');
        }
      }
    ];
    this.exchange_context_menu = this.electronService.remote.Menu.buildFromTemplate(exchanges_context_menu_template);
    
    // listen to address context menu events
    this.electronService.ipcRenderer.on('exchanges-context-menu-event', (event, arg) => {
      this.logger.debug("### Exchanges Menu Event: " + arg);
      if(arg == 'visit-exchange')
        this.visitExchange();
      else
        this.logger.debug("### Context menu not implemented: " + arg);
    });

    // listen to exchange updates
    this.marketService.exchangeUpdates.subscribe( result =>{
      this.exchanges = result;
    });
  }

  onExchangeContextMenu(event){
    this.selectedExchangeRow = event.data;
    this.logger.debug("### onExchangeContextMenu: " + JSON.stringify(this.selectedExchangeRow));
    this.exchange_context_menu.popup(this.electronService.remote.getCurrentWindow());
  }

  onExchangeRowClick(e:any) {
    this.logger.debug("### onExchangeRowClick: " + JSON.stringify(e));
    this.selectedExchangeRow = e.data;
  }

  
  visitExchange(){
    if(this.selectedExchangeRow){
      this.electronService.remote.shell.openExternal(this.selectedExchangeRow.tradeURL);
    }
    return false;
  }

}
