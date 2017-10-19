export interface ServerDefinition {
    server_id: string,
    server_url: string,
    response_time: number
}

export interface LedgerStreamMessages {
    fee_base: number,
    fee_ref: number,
    ledger_hash: string,
    ledger_index: number,
    ledger_time: number,
    reserve_base: number,
    reserve_inc: number,
    txn_count?: number,
    type?: string,
    validated_ledgers: string
}

export interface ValidationStreamMessages {
    type: string
}

export interface TransactionStreamMessages {
    type: string
}