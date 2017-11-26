import { LogService } from '../log.service';
import { WalletService } from '../wallet.service';
import { LokiKey, LokiAccount } from '../../domain/lokijs';

export class WalletUpgrade {
    constructor(
        private logger: LogService,
        private walletService: WalletService
    ) { }

    applyv101(){
        this.logger.debug("### WalletUpgrade - v101");
        // get all accounts
        let accounts: LokiAccount[] = this.walletService.getAllAccounts();
        // loop all accounts and find non-Default and non-Import labels
        accounts.forEach((value, index, array) => {
            if( !value.label.startsWith("Default") && !value.label.startsWith("Imported")){
                // get the key object
                let key:LokiKey = this.walletService.getKey(value.accountID);
                let decryptedPrivateKey = this.walletService.getDecryptPrivateKey("", key);
                this.logger.debug("### Decrypted Private Key: " + decryptedPrivateKey);
                let decryptedSecret = this.walletService.getDecryptSecret("", key);
                this.logger.debug("### Decrypted Secret: " + decryptedSecret);
                // update account
                this.logger.debug("### Update Account Keys: " + value.accountID);
                key.encrypted = false;
                key.privateKey = decryptedPrivateKey;
                key.secret = decryptedSecret;
                this.walletService.updateKey(key);
            }
        });
    }
}