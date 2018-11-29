import { Component, OnInit } from '@angular/core';
import { LokiAddress } from '../../../domain/lokijs';
import { CasinocoinService } from '../../../providers/casinocoin.service';
import { WalletService } from '../../../providers/wallet.service';
import { LogService } from '../../../providers/log.service';
import { AppConstants } from '../../../domain/app-constants';
import { Menu as ElectronMenu, MenuItem as ElectronMenuItem } from "electron"; 
import { ElectronService } from '../../../providers/electron.service';
import { SelectItem, MenuItem } from 'primeng/primeng';
import { CSCUtil } from '../../../domain/csc-util';

@Component({
  selector: 'app-addressbook',
  templateUrl: './addressbook.component.html',
  styleUrls: ['./addressbook.component.scss']
})
export class AddressbookComponent implements OnInit {

  addresses: Array<LokiAddress> = [];
  showCreateAddressDialog: boolean = false;
  addressLabel: string = "";
  accountID: string = "";
  showDialogFooter: boolean = false;
  errorMessage: string = "";
  addressMenuItems: MenuItem[];
  selectedAddressRow: LokiAddress;
  address_context_menu: ElectronMenu;
  invalidAccountID: boolean = true;

  constructor(private logger: LogService,
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
    let address_context_menu_template = [
      { label: 'Copy Address', 
        click(menuItem, browserWindow, event) {
          browserWindow.webContents.send('address-context-menu-event', 'copy-address');
        }
      }
    ];
    this.address_context_menu = this.electronService.remote.Menu.buildFromTemplate(address_context_menu_template);
    
    // listen to address context menu events
    this.electronService.ipcRenderer.on('address-context-menu-event', (event, arg) => {
      this.logger.debug("### Addressbook Menu Event: " + arg);
      if(arg == 'copy-address')
        this.copyAddress();
      else
        this.logger.debug("### Context menu not implemented: " + arg);
    });
  }

  onAddressContextMenu(event){
    this.selectedAddressRow = event.data;
    this.logger.debug("### onAddressContextMenu: " + JSON.stringify(this.selectedAddressRow));
    this.address_context_menu.popup({window: this.electronService.remote.getCurrentWindow()});
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

  copyAddress(){
    if(this.selectedAddressRow){
      this.logger.debug("Copy to clipboard: " + this.selectedAddressRow.accountID);
      this.electronService.clipboard.writeText(this.selectedAddressRow.accountID);
    }
  }

  showCreateAddress(){
    this.showDialogFooter = false;
    this.showCreateAddressDialog = true;
  }

  onAccountIDChange(event){
    let valid:boolean = CSCUtil.validateAccountID(event);
    this.logger.debug("### Address book - accountID: " + event + " valid: " + valid);
    this.invalidAccountID = !valid;
  }

  doCreateNewAddressbookEntry(){
    // first disable footer on submit
    this.showDialogFooter = false;
    this.errorMessage = "";
    if((this.addressLabel.length == 0) || (this.accountID.length == 0)){
      this.errorMessage = "Both account label and account id must be entered.";
      this.showDialogFooter = true;
    } else {
      // create addressbook entry
      let newAddress:LokiAddress = {
        accountID: this.accountID,
        label: this.addressLabel,
        owner: false
      }
      this.walletService.addAddress(newAddress);
      this.accountID = "";
      this.addressLabel = "";
      // hide dialog
      this.showCreateAddressDialog = false;
      // refresh addresses
      this.addresses = this.walletService.getAllAddresses();
    }
  }
}
