export class LokiAccount {
    accountID?: string;
    secret?: string;
    label?: string;
    lastSequence?: number;
    balance?: number;

    // ORM methods
    // hpPercent(): number;
}

export class LokiLog {
    event?: string;
    timestamp?: number;
    content?: string;
}