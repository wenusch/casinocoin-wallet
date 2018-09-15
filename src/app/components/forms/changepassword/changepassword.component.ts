import { Component, OnInit } from '@angular/core';
import { WalletService } from '../../../providers/wallet.service';
import { CSCCrypto } from '../../../domain/csc-crypto';
import { Router, ActivatedRoute } from '@angular/router';
import { LogService } from '../../../providers/log.service';

@Component({
  selector: 'app-changepassword',
  templateUrl: './changepassword.component.html',
  styleUrls: ['./changepassword.component.scss']
})
export class ChangepasswordComponent implements OnInit {
  currentWalletPassword: string = "";
  newWalletPassword: string = "";
  newWalletPasswordConfirmed: string = "";
  errorMessage: string = "";
  activeIndex: number = 1;
  showError: boolean = false;
  showCurrentPassword: boolean = true;
  showNewPassword: boolean = false;
  showPassphrase: boolean = false;
  paswordConfirmationEnabled: boolean = false;
  nextButtonEnabled: boolean = false;
  newWalletMnemonic: Array<string>;
  mnemonicHash: string = "";

  passwordPattern: string = "(?=.*[0-9])(?=.*[a-z]).{8,}";

  constructor(private logger: LogService,
              private walletService: WalletService,
              private router: Router) { }

  ngOnInit() {
    this.logger.debug("### ChangePasswordComponent onInit");
  }

  doNext() {
    if (this.activeIndex == 1) {
      this.finishStep1();
    } else if (this.activeIndex == 2) {
      this.finishStep2();
    } else if (this.activeIndex == 3) {
      this.finishStep3();
    }
  }

  finishStep1() {
    // toggle to step 2
    if (this.currentWalletPassword.length == 0) {
      this.errorMessage = "Please enter your current password.";
      this.showError = true;
    } else if (!this.walletService.checkWalletPasswordHash(this.currentWalletPassword)) {
      this.errorMessage = "You entered an invalid password.";
      this.showError = true;
    } else {
      this.activeIndex += 1;
      this.errorMessage = "";
      this.showError = false;
      this.showCurrentPassword = false;
      this.showNewPassword = true;
      this.nextButtonEnabled = true;
    }
  }

  finishStep2() {
    // toggle to step 3
    this.newWalletMnemonic = CSCCrypto.getRandomMnemonic();
    this.showPassphrase = true;
    this.showNewPassword = false;
    this.activeIndex += 1;
    this.nextButtonEnabled = true;
  }

  finishStep3() {
    // Finish change password
    this.nextButtonEnabled = true;
    // generate mnemonic hash with new password and new mnemonic recovery
    this.mnemonicHash = new CSCCrypto(this.newWalletMnemonic).encrypt(this.newWalletPassword);
    this.logger.debug("### ChangePasswordComponent - Mnemonic Recovery Hash Created: " + this.mnemonicHash);
    this.walletService.changePassword(this.currentWalletPassword, this.newWalletPassword, this.mnemonicHash);
    this.errorMessage = "Your Password has been changed Successfully.";
    this.showError = true;
    setTimeout(() => {
      this.logger.debug("### ChangePasswordComponent - Password changed Successfully.");
      this.router.navigate(['home','transactions']);
    }, 2000);
  }

  checkPasswordUpdate(newValue: string) {
    // set password match
    let testResult = newValue.match(this.passwordPattern);
    if (testResult != null) {
      this.paswordConfirmationEnabled = true;
    } else {
      this.paswordConfirmationEnabled = false;
    }
  }

  checkPasswordConfirmedUpdate(newConfirmValue: string) {
    if (newConfirmValue == this.newWalletPassword) {
      this.nextButtonEnabled = false;
    } else {
      this.nextButtonEnabled = true;
    }
  }

  onRecoveryAcceptChanged(newValue) {
    // checkbox for mnemonic recovery
    if (newValue) {
      this.nextButtonEnabled = false;
    } else {
      this.nextButtonEnabled = true;
    }
  }

}
