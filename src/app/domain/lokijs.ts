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