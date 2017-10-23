export interface LokiAccount {
    accountID?: string;
    secret?: string;
    label?: string;
    lastSequence?: number;
    balance?: number;
}

export interface LokiLog {
    event?: string;
    timestamp?: number;
    content?: string;
}

export interface LokiKey {
    privateKey: string;
    publicKey: string;
    accountID: string;
    secret: string;
    encrypted: boolean;
}

export interface LokiSwap {
    accountID: string;
    swapID: string;
    swapObject?: Object;
}

export interface LokiTransaction {
    txID: string;
    txType: string;
    sendingAddress: string;
    receivingAddress: string;
    amount: number;
    fees: number;
    txTimestamp: number;
}