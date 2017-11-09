import { Memo } from './csc-types';
import { AppConstants } from '../domain/app-constants';

export interface LokiMeta {
    revision: number,
    created: number,
    version: number,
    updated: number
}

export enum LokiTxStatus {
    new = "txNEW",
    send = "txSEND",
    error = "txERROR",
    received = "txRECEIVED",
    validated = "txVALIDATED"
}

export interface LokiAccount {
    $loki?: string,
    meta?: LokiMeta,
    accountID: string;
    label: string;
    balance: string;
    activated: boolean;
    ownerCount: number;
    lastTxID: string;
    lastTxLedger: number;
    lastSequence: number;
}

export interface LokiLog {
    $loki?: string,
    meta?: LokiMeta,
    timestamp?: number;
    event?: string;
    level?: string;
    content?: string;
}

export interface LokiKey {
    $loki?: string,
    meta?: LokiMeta,
    privateKey: string;
    publicKey: string;
    accountID: string;
    secret: string;
    initVector: string;
    keyTag: string;
    secretTag: string;
    encrypted: boolean;
}

export interface LokiSwap {
    $loki?: string,
    meta?: LokiMeta,
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
    $loki?: string,
    meta?: LokiMeta,
    txID: string;
    accountID: string;
    amount: string;
    destination: string;
    fee: string;
    flags: number;
    lastLedgerSequence: number;
    memos?: Array<Memo>,
    sequence: number;
    signingPubKey: string;
    transactionType: string;
    txnSignature: string;
    timestamp: number;
    direction: string;
    validated: boolean;
    status: LokiTxStatus;
    inLedger?: number;
}

export interface LokiAddress {
    $loki?: string,
    meta?: LokiMeta,
    accountID: string;
    label: string;
    owner: boolean;
}