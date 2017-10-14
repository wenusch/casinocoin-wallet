export interface ServerDefinition {
    server_id: string,
    server_url: string,
    response_time: number
}

export interface LedgerStreamMessages {
    type: string,
    fee_base: Uint32Array,
    fee_ref: Uint32Array,
    ledger_hash: string,
    ledger_index: Uint32Array,
    ledger_time: Uint32Array,
    reserve_base: Uint32Array,
    reserve_inc: Uint32Array,
    txn_count: Uint32Array,
    validated_ledgers: string
}

export interface ValidationStreamMessages {
    type: string
}

export interface TransactionStreamMessages {
    type: string
}