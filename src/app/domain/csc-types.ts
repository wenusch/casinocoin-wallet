import int from 'int';

export type PrepareTxPayment = {
    source:string;
    destination:string;
    amountDrops:string;
    feeDrops: string;
    description?: string;
    invoiceID?: string;
    sourceTag?: int;
    destinationTag?: int;
}

export type CasinocoinTxObject = {
    TransactionType: string;
    Account: string;
    Destination: string;
    Amount: string;
    Fee: string;
    Flags: number;
    Sequence: number;
    LastLedgerSequence : number;
    InvoiceID?: string;
    Memos?: Array<CasinocoinMemo>;
    SourceTag?: int;
    DestinationTag?: int;
    TxnSignature?: string;
    SigningPubKey?: string;
}

export type CasinocoinMemo = {
    Memo: {
        MemoData?: string;
        MemoFormat?: string;
        MemoType?: string;
    }
}

export type CasinocoindAmountIOU = {
    currency: string,
    value: string,
    issuer ? : string
}

export type CasinocoindAmount = string | CasinocoindAmountIOU


export type Amount = {
    value: string,
    currency: string,
    counterparty ? : string
}

// Amount where counterparty and value are optional
export type LaxLaxAmount = {
    currency: string,
    value ? : string,
    counterparty ? : string
}

// A currency-counterparty pair, or just currency if it's CSC
export type Issue = {
    currency: string,
    counterparty ? : string
}

export type Adjustment = {
    address: string,
    amount: Amount,
    tag ? : number
}

export type MaxAdjustment = {
    address: string,
    maxAmount: Amount,
    tag ? : number
}

export type MinAdjustment = {
    address: string,
    minAmount: Amount,
    tag ? : number
}

export type Memo = {
    memo: {
        memoType ? : string,
        memoFormat ? : string,
        memoData ? : string
    }
}

export type PaymentFlags = {
    NoCasinocoinDirect: 0x00010000,
    PartialPayment: 0x00020000,
    LimitQuality: 0x00040000
}

export type Payment = {
    source: Adjustment | MaxAdjustment,
    destination: Adjustment | MinAdjustment,
    paths ? : string,
    memos ? : Array < Memo > ,
    // A 256-bit hash that can be used to identify a particular payment
    invoiceID ? : string,
    // A boolean that, if set to true, indicates that this payment should go
    // through even if the whole amount cannot be delivered because of a lack of
    // liquidity or funds in the source_account account
    allowPartialPayment ? : boolean,
    // A boolean that can be set to true if paths are specified and the sender
    // would like the Casinocoin Network to disregard any direct paths from
    // the source_account to the destination_account. This may be used to take
    // advantage of an arbitrage opportunity or by gateways wishing to issue
    // balances from a hot wallet to a user who has mistakenly set a trustline
    // directly to the hot wallet
    noDirectCasinocoin ? : boolean,
    limitQuality ? : boolean
}

export type Instructions = {
    sequence?: number,
    fee?: string,
    maxFee?: string,
    maxLedgerVersion?: number,
    maxLedgerVersionOffset?: number,
    signersCount?: number
}
  
export type Prepare = {
    txJSON: string,
    instructions: {
        fee: string,
        sequence: number,
        maxLedgerVersion?: number
    }
}

export type CSCURI = {
    address: string, 
    amount?: string, 
    destinationTag?: number, 
    label?: string
}

export type WalletSettings = {
    showNotifications: boolean;
    fiatCurrency: string;
}