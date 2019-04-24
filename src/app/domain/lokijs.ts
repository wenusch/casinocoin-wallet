import { Memo } from './csc-types';
import { AppConstants } from '../domain/app-constants';

export interface LokiMeta {
    revision: number;
    created: number;
    version: number;
    updated: number;
}

export enum LokiTxStatus {
    new = "txNEW",
    send = "txSEND",
    error = "txERROR",
    received = "txRECEIVED",
    validated = "txVALIDATED"
}

export enum LokiDBEnvironment {
    prod = "Production",
    test = "Test"
}

export interface LokiDBMetadata {
    $loki?: number;
    meta?: LokiMeta;
    dbVersion: string;
    appVersion: string;
    walletUUID: string;
    walletHash: string;
    environment: LokiDBEnvironment;
    mnemonicRecovery: string;
    creationTimestamp: number;
    updatedTimestamp: number;
    location: string;
    lastOpenedTimestamp: number;
}

export interface LokiAccount {
    $loki?: number;
    meta?: LokiMeta;
    accountID: string;
    label: string;
    balance: string;
    activated: boolean;
    ownerCount: number;
    lastTxID: string;
    lastTxLedger: number;
    lastSequence: number;
    signerQuorum?: number;
    signers?: Array<LokiSigner>;
}

export interface LokiAccountSettings {
    accountID: string,
    Sequence: number,
    passwordSpent?: boolean,
    requireDestinationTag?: boolean,
    requireAuthorization?: boolean,
    disallowIncomingCSC?: boolean,
    disableMasterKey?: boolean,
    enableTransactionIDTracking?: boolean,
    noFreeze?: boolean,
    globalFreeze?: boolean,
    defaultCasinocoin?: boolean,
    emailHash?: string|null,
    messageKey?: string,
    domain?: string,
    transferRate?: number|null,
    regularKey?: string,
    signers?: Array<LokiSigner>
    signerQuorum?: number
}

export interface LokiSigner{
    accountID:string;
    weight: number;
}

export interface LokiLog {
    $loki?: number;
    meta?: LokiMeta;
    timestamp?: number;
    event?: string;
    level?: string;
    content?: string;
}

export interface LokiKey {
    $loki?: number;
    meta?: LokiMeta;
    privateKey: string;
    publicKey: string;
    accountID: string;
    secret: string;
    encrypted: boolean;
}

export interface LokiSwap {
    $loki?: number;
    meta?: LokiMeta;
    accountID: string;
    swapID: string;
    initiatedTimestamp: number;
    updatedTimestamp: number;
    depositAddress: string;
    swapStatus: string;
    swapAmount: number;
    storage?: Object;
    deposit?: Object;
}

export interface LokiTransaction {
    $loki?: number;
    meta?: LokiMeta;
    txID: string;
    accountID: string;
    amount: string;
    destination: string;
    destinationTag?: number;
    invoiceID?: string;
    fee: string;
    flags: number;
    lastLedgerSequence: number;
    memos?: Array<Memo>;
    sequence: number;
    signingPubKey: string;
    transactionType: string;
    txnSignature: string;
    timestamp: number;
    direction: string;
    validated: boolean;
    status: LokiTxStatus;
    inLedger?: number;
    engineResult?: string;
    engineResultMessage?: string;
}

export interface LokiAddress {
    $loki?: number;
    meta?: LokiMeta;
    accountID: string;
    label: string;
    owner: boolean;
}

export interface LokiSignedTransaction {
    id: string;
    signedTransaction: string;
}
