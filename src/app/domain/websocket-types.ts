export interface ServerDefinition {
    server_id: string;
    server_url: string;
    response_time: number;
}

export interface LedgerStreamMessages {
    fee_base: number;
    fee_ref: number;
    ledger_hash: string;
    ledger_index: number;
    ledger_time: number;
    reserve_base: number;
    reserve_inc: number;
    txn_count?: number;
    type?: string;
    validated_ledgers: string;
}

export interface ValidationStreamMessages {
    type: string;
}

export interface TransactionStreamMessages {
    type: string;
}

export interface ServerStateMessage {
    build_version: string;
    complete_ledgers: string;
    io_latency_ms: number;
    last_close: {
        converge_time: number;
        proposers: number;
    };
    peers: number;
    pubkey_node: string;
    server_state: string;
    uptime: number;
    validated_ledger: {
        base_fee: number;
        close_time: number;
        hash: string;
        reserve_base: number;
        reserve_inc: number;
        seq: number;
    };
    validation_quorum: number;
}