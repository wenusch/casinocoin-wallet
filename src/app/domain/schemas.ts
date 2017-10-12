export class JSONSchemas {
    public static account = {
        title: "Account object schema",
        version: 0,
        description: "JSON Schema for an account object",
        type: "object",
        properties: {
            accountID: {
                type: "string",
                primary: true
            },
            secret: {
                type: "string",
                encrypted: true
            },
            label: {
                type: "string"
            },
            lastSequence: {
                type: "integer",
                min: 0,
                default : 0
            },
            balance: {
                type: "number",
                default : 0
            }
        },
        required: ["secret", "lastSequence"]
    }

    public static transaction = {
        "title": "Transaction object schema",
        "version": 0,
        "description": "JSON Schema for a transaction object",
        "type": "object",
        "properties": {
            "txID": {
                "type": "string",
                "primary": true
            },
            "timestamp": {
                "type": "integer",
                "min": 0,
                "default" : 0
            },
            "sender": {
                "type": "string",
                "index": true
            },
            "receiver": {
                "type": "string",
                "index": true
            },
            "includedInLedger": {
                "type": "integer",
                "min": 0,
                "default" : 0
            },
            "amount": {
                "type": "integer",
                "minimum": 0,
                "default" : 0
            },
            "validated": {
                "type": "boolean",
                "default" : false
            }
        },
        "required": ["timestamp"]
    }

    public static address = {
        "title": "Address object schema",
        "version": 0,
        "description": "JSON Schema for an address object",
        "type": "object",
        "properties": {
            "accountID": {
                "type": "string",
                "primary": true
            },
            "label": {
                "type": "string"
            },
            "description": {
                "type": "string"
            }
        },
        "required": []
    }
}