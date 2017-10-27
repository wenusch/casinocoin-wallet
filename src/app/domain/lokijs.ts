export interface LokiAccount {
    $loki?: string,
    accountID: string;
    label: string;
    lastSequence: number;
    balance: number;
}

export interface LokiLog {
    $loki?: string,
    timestamp?: number;
    event?: string;
    level?: string;
    content?: string;
}

export interface LokiKey {
    $loki?: string,
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
    txID: string;
    txType: string;
    sendingAddress: string;
    receivingAddress: string;
    amount: number;
    fees: number;
    txTimestamp: number;
}