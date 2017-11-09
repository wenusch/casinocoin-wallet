import { Component, OnInit } from '@angular/core';
import { LokiAddress } from '../../../domain/lokijs';
import { CasinocoinService } from '../../../providers/casinocoin.service';
import { WalletService } from '../../../providers/wallet.service';
import { Logger } from 'angular2-logger/core';
import { AppConstants } from '../../../domain/app-constants';
import { Menu as ElectronMenu, MenuItem as ElectronMenuItem } from "electron"; 
import { ElectronService } from '../../../providers/electron.service';
import { SelectItem, MenuItem } from 'primeng/primeng';

@Component({
  selector: 'app-addressbook',
  templateUrl: './addressbook.component.html',
  styleUrls: ['./addressbook.component.scss']
})
export class AddressbookComponent implements OnInit {

  addresses: Array<LokiAddress> = [];
  showCreateAddressDialog: boolean = false;
  addressLabel: string = "";
  showDialogFooter: boolean = false;
  errorMessage: string = "";
  addressMenuItems: MenuItem[];
  selectedAddressRow: LokiAddress;

  constructor(private logger: Logger,
              private casinocoinService: CasinocoinService,
              private walletService: WalletService,
              private electronService: ElectronService) { 
          this.logger.debug("### INIT Addressbook ###");
  }

  ngOnInit() {
    this.walletService.openWalletSubject.subscribe( result => {
      if(result == AppConstants.KEY_LOADED){
        this.logger.debug("### Addressbook Wallet Open ###");
        this.addresses = this.walletService.getAllAddresses();
      }
    });

    // init address context menu

  }

  onAddressRowClick(e:any) {
    this.logger.debug("### onAddressRowClick: " + JSON.stringify(e));
    this.selectedAddressRow = e.data;
  }

  onAddressEditComplete(event){
    this.logger.debug("### onAddressEditComplete: " + JSON.stringify(event.data));
    // save changed address to database
    this.walletService.updateAddress(event.data);
  }

  onAddressEditCancel(event){
    this.logger.debug("### onAddressEditCancel: " + JSON.stringify(event));
  }

  onContextMenu(event){
    this.logger.debug("### onContextMenu: " + JSON.stringify(event));
    this.selectedAddressRow = event.data;
  }

  copyAddress(){
    this.logger.debug("Copy to clipboard: " + this.selectedAddressRow.accountID);
    this.electronService.clipboard.writeText(this.selectedAddressRow.accountID);
  }

  showCreateAddress(){
    this.showDialogFooter = false;
    this.showCreateAddressDialog = true;
  }

  doCreateNewAddressbookEntry(){
    // first disable footer on submit
    this.showDialogFooter = false;
    // create addressbook entry

    // hide dialog
    this.showCreateAddressDialog = false;
  }
}
