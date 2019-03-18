import { Injectable } from '@angular/core';
import { Logger } from "angular2-logger/core";
import { Payment, PaymentFlags, Instructions, Prepare, Amount } from './csc-types';
import { CSCUtil } from './csc-util';
import * as _ from "lodash";

@Injectable()
export class CSC {

    constructor(private logger: Logger) {}

    isCSCToCSCPayment(payment: Payment): boolean {
        let sourceCurrency = _.get(payment, 'source.maxAmount.currency', _.get(payment, 'source.amount.currency'))
        let destinationCurrency = _.get(payment, 'destination.amount.currency',  _.get(payment, 'destination.minAmount.currency'))
        return sourceCurrency === 'CSC' && destinationCurrency === 'CSC';
    }
    
    isIOUWithoutCounterparty(amount: Amount): boolean {
        return amount && amount.currency !== 'CSC' && amount.counterparty === undefined;
    }
    
    applyAnyCounterpartyEncoding(payment: Payment): void {
        // Convert blank counterparty to sender or receiver's address
        _.forEach([payment.source, payment.destination], adjustment => {
            _.forEach(['amount', 'minAmount', 'maxAmount'], key => {
                if (this.isIOUWithoutCounterparty(adjustment[key])) {
                    adjustment[key].counterparty = adjustment.address;
                }
            });
        });
    }

    createMaximalAmount(amount: Amount): Amount {
        const maxCSCValue = '40000000000'
        const maxIOUValue = '9999999999999999e80'
        const maxValue = amount.currency === 'CSC' ? maxCSCValue : maxIOUValue
        return _.assign({}, amount, { value: maxValue })
    }

    createPaymentTransaction(address: string, paymentArgument: Payment): Object {
        let payment = _.cloneDeep(paymentArgument)
        this.applyAnyCounterpartyEncoding(payment)
    
        if (address !== payment.source.address) {
            this.logger.error("### CSC: address must match payment.source.address");
            return;
        }
    
        if ((payment.source.maxAmount && payment.destination.minAmount) ||
            (payment.source.amount && payment.destination.amount)) {
                this.logger.error("### CSC: payment must specify either (source.maxAmount " +
                "and destination.amount) or (source.amount and destination.minAmount)");
                return;
        }
    
        // when using destination.minAmount, casinocoind still requires that we set
        // a destination amount in addition to DeliverMin. the destination amount
        // is interpreted as the maximum amount to send. we want to be sure to
        // send the whole source amount, so we set the destination amount to the
        // maximum possible amount. otherwise it's possible that the destination
        // cap could be hit before the source cap.
        let amount = payment.destination.minAmount && !this.isCSCToCSCPayment(payment) ?
            this.createMaximalAmount(payment.destination.minAmount) :
            (payment.destination.amount || payment.destination.minAmount)
    
        let paymentFlags: PaymentFlags;
        let txJSON: Object = {
            TransactionType: 'Payment',
            Account: payment.source.address,
            Destination: payment.destination.address,
            Amount: CSCUtil.toCasinocoindAmount(amount),
            Flags: 0
        }
    
        if (payment.invoiceID !== undefined) {
            txJSON['InvoiceID'] = payment.invoiceID;
        }
        if (payment.source.tag !== undefined) {
            txJSON['SourceTag'] = payment.source.tag;
        }
        if (payment.destination.tag !== undefined) {
            txJSON['DestinationTag'] = payment.destination.tag;
        }
        if (payment.memos !== undefined) {
            txJSON['Memos'] = _.map(payment.memos, CSCUtil.encodeMemo);
        }
        if (payment.noDirectCasinocoin === true) {
            txJSON['Flags'] |= paymentFlags.NoCasinocoinDirect;
        }
        if (payment.limitQuality === true) {
            txJSON['Flags'] |= paymentFlags.LimitQuality;
        }
        // set Account Sequence
        txJSON['Sequence'] = 10;

        // Set last allow ledger sequence if required
        txJSON['LastLedgerSequence'] = 123;

        // Transaction Fee
        txJSON['Fee'] = 1000000;

        // Future use of non CSC payments
        // if (!this.isCSCToCSCPayment(payment)) {
        //     // Don't set SendMax for CSC->CSC payment
        //     if (payment.allowPartialPayment === true ||
        //         payment.destination.minAmount !== undefined) {
        //         txJSON['Flags'] |= paymentFlags.PartialPayment;
        //     }
    
        //     txJSON['SendMax'] = CSCUtil.toCasinocoindAmount(payment.source.maxAmount || payment.source.amount);
    
        //     if (payment.destination.minAmount !== undefined) {
        //         txJSON['DeliverMin'] = CSCUtil.toCasinocoindAmount(payment.destination.minAmount);
        //     }
    
        //     if (payment.paths !== undefined) {
        //         txJSON['Paths'] = JSON.parse(payment.paths);
        //     }
        // } else if (payment.allowPartialPayment === true) {
        //     this.logger.error("### CSC: CSC to CSC payments cannot be partial payments");
        // }
        return txJSON;
    }

    // preparePayment(address: string, payment: Payment, instructions: Instructions = {}): Prepare {
    //     let txJSON = this.createPaymentTransaction(address, payment)
    //     return utils.prepareTransaction(txJSON, this, instructions)
    // }

    // computeSignature(tx: Object, privateKey: string, signAs: ? string) {
    //     const signingData = signAs ?
    //         binary.encodeForMultisigning(tx, signAs) : binary.encodeForSigning(tx)
    //     return keypairs.sign(signingData, privateKey)
    // }

    // sign(tx: Object, secret: string, options: Object = {}): { signedTransaction: string;id: string } {

    //     if (tx.TxnSignature || tx.Signers) {
    //         throw new utils.common.errors.ValidationError(
    //             'txJSON must not contain "TxnSignature" or "Signers" properties')
    //     }

    //     const keypair = keypairs.deriveKeypair(secret)
    //     tx.SigningPubKey = options.signAs ? '' : keypair.publicKey

    //     if (options.signAs) {
    //         const signer = {
    //             Account: options.signAs,
    //             SigningPubKey: keypair.publicKey,
    //             TxnSignature: computeSignature(tx, keypair.privateKey, options.signAs)
    //         }
    //         tx.Signers = [{ Signer: signer }]
    //     } else {
    //         tx.TxnSignature = computeSignature(tx, keypair.privateKey)
    //     }
    //     const serialized = binary.encode(tx)
    //     return {
    //         signedTransaction: serialized,
    //         id: computeBinaryTransactionHash(serialized)
    //     }
    // }

}