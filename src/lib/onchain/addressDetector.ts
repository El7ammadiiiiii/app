/**
 * Address and Transaction Hash Detection Utility
 * Detects blockchain type from address format or transaction hash
 */

export type ChainFamily =
    | 'evm'
    | 'bitcoin'
    | 'litecoin'
    | 'dogecoin'
    | 'tron'
    | 'ton'
    | 'xrp'
    | 'cosmos'
    | 'solana'
    | 'near'
    | 'aptos'
    | 'sui'
    | 'algorand'
    | 'flow'
    | 'unknown';

export type InputType = 'address' | 'txid' | 'unknown';

export interface DetectionResult
{
    inputType: InputType;
    isValid: boolean;
    chainFamily: ChainFamily;
    suggestedChainUid?: string;
    confidence: 'high' | 'medium' | 'low';
    searchAllEVM?: boolean; // Flag to search all EVM chains
}

// Address patterns for different blockchains
const ADDRESS_PATTERNS = {
    // EVM: 0x followed by 40 hex characters
    evm: /^0x[a-fA-F0-9]{40}$/,

    // Bitcoin: Legacy (1/3) or Bech32 (bc1)
    bitcoin_legacy: /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/,
    bitcoin_bech32: /^bc1[a-z0-9]{39,59}$/,

    // Litecoin: L or M prefix
    litecoin: /^[LM][a-km-zA-HJ-NP-Z1-9]{33}$/,
    litecoin_bech32: /^ltc1[a-z0-9]{39,59}$/,

    // Dogecoin: D prefix
    dogecoin: /^D[5-9A-HJ-NP-U]{33}$/,

    // Tron: T followed by 33 base58 characters
    tron: /^T[a-zA-Z0-9]{33}$/,

    // TON: EQ or UQ prefix
    ton: /^(EQ|UQ)[a-zA-Z0-9_-]{46}$/,

    // XRP: r prefix
    xrp: /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/,

    // Cosmos: cosmos1 prefix
    cosmos: /^cosmos1[a-z0-9]{38}$/,

    // Solana: Base58, 32-44 characters
    solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,

    // NEAR: .near or implicit account
    near: /^([a-z0-9_-]+\.near|[a-f0-9]{64})$/,

    // Aptos: 0x followed by 1-64 hex
    aptos: /^0x[a-fA-F0-9]{1,64}$/,

    // Sui: 0x followed by exactly 64 hex
    sui: /^0x[a-fA-F0-9]{64}$/,

    // Algorand: 58 character base32
    algorand: /^[A-Z2-7]{58}$/,

    // Flow: 0x followed by 16 hex
    flow: /^0x[a-fA-F0-9]{16}$/,
};

// Transaction hash patterns
const TXID_PATTERNS = {
    // EVM: 0x followed by 64 hex characters (32 bytes)
    evm: /^0x[a-fA-F0-9]{64}$/,

    // Bitcoin: 64 hex characters (no 0x prefix)
    bitcoin: /^[a-fA-F0-9]{64}$/,

    // Solana: Base58 signature (87-88 characters)
    solana: /^[1-9A-HJ-NP-Za-km-z]{87,88}$/,

    // Tron: 64 hex characters
    tron: /^[a-fA-F0-9]{64}$/,
};

/**
 * Detect input type and blockchain from user input
 * Handles addresses, transaction hashes, and CEX platform transactions
 */
export function detectInput ( input: string ): DetectionResult
{
    if ( !input || typeof input !== 'string' )
    {
        return {
            inputType: 'unknown',
            isValid: false,
            chainFamily: 'unknown',
            confidence: 'low'
        };
    }

    const trimmed = input.trim();

    // 1. Check if it's an EVM transaction hash (0x + 64 hex)
    if ( TXID_PATTERNS.evm.test( trimmed ) )
    {
        return {
            inputType: 'txid',
            isValid: true,
            chainFamily: 'evm',
            searchAllEVM: true, // Search all EVM chains for this transaction
            confidence: 'high'
        };
    }

    // 2. Check if it's an EVM address (0x + 40 hex)
    if ( ADDRESS_PATTERNS.evm.test( trimmed ) )
    {
        return {
            inputType: 'address',
            isValid: true,
            chainFamily: 'evm',
            searchAllEVM: true, // Search all EVM chains for this address
            confidence: 'high'
        };
    }

    // 3. Check Bitcoin transaction hash (64 hex, no 0x)
    // Must check before address to avoid false positives
    if ( TXID_PATTERNS.bitcoin.test( trimmed ) && !ADDRESS_PATTERNS.bitcoin_legacy.test( trimmed ) )
    {
        return {
            inputType: 'txid',
            isValid: true,
            chainFamily: 'bitcoin',
            suggestedChainUid: 'bip122:000000000019d6689c085ae165831e93',
            confidence: 'medium' // Medium because could also be Tron
        };
    }

    // 4. Check Bitcoin addresses
    if ( ADDRESS_PATTERNS.bitcoin_legacy.test( trimmed ) || ADDRESS_PATTERNS.bitcoin_bech32.test( trimmed ) )
    {
        return {
            inputType: 'address',
            isValid: true,
            chainFamily: 'bitcoin',
            suggestedChainUid: 'bip122:000000000019d6689c085ae165831e93',
            confidence: 'high'
        };
    }

    // 5. Check Tron address FIRST (T + 33 base58) - Must check before Solana!
    if ( ADDRESS_PATTERNS.tron.test( trimmed ) )
    {
        return {
            inputType: 'address',
            isValid: true,
            chainFamily: 'tron',
            suggestedChainUid: 'non-evm:tron',
            confidence: 'high'
        };
    }

    // 6. Check Solana transaction signature
    if ( TXID_PATTERNS.solana.test( trimmed ) )
    {
        return {
            inputType: 'txid',
            isValid: true,
            chainFamily: 'solana',
            suggestedChainUid: 'non-evm:solana',
            confidence: 'high'
        };
    }

    // 7. Check Solana address (32-44 base58) - After Tron to avoid conflict
    if ( ADDRESS_PATTERNS.solana.test( trimmed ) )
    {
        return {
            inputType: 'address',
            isValid: true,
            chainFamily: 'solana',
            suggestedChainUid: 'non-evm:solana',
            confidence: 'medium' // Medium due to base58 ambiguity
        };
    }

    // 8. Check TON address
    if ( ADDRESS_PATTERNS.ton.test( trimmed ) )
    {
        return {
            inputType: 'address',
            isValid: true,
            chainFamily: 'ton',
            suggestedChainUid: 'non-evm:ton',
            confidence: 'high'
        };
    }

    // 9. Check XRP address
    if ( ADDRESS_PATTERNS.xrp.test( trimmed ) )
    {
        return {
            inputType: 'address',
            isValid: true,
            chainFamily: 'xrp',
            suggestedChainUid: 'non-evm:xrp',
            confidence: 'high'
        };
    }

    // 10. Check Cosmos address
    if ( ADDRESS_PATTERNS.cosmos.test( trimmed ) )
    {
        return {
            inputType: 'address',
            isValid: true,
            chainFamily: 'cosmos',
            suggestedChainUid: 'non-evm:cosmos',
            confidence: 'high'
        };
    }

    // 11. Check Litecoin
    if ( ADDRESS_PATTERNS.litecoin.test( trimmed ) || ADDRESS_PATTERNS.litecoin_bech32.test( trimmed ) )
    {
        return {
            inputType: 'address',
            isValid: true,
            chainFamily: 'litecoin',
            suggestedChainUid: 'non-evm:litecoin',
            confidence: 'high'
        };
    }

    // 12. Check Dogecoin
    if ( ADDRESS_PATTERNS.dogecoin.test( trimmed ) )
    {
        return {
            inputType: 'address',
            isValid: true,
            chainFamily: 'dogecoin',
            suggestedChainUid: 'non-evm:dogecoin',
            confidence: 'high'
        };
    }

    // 13. Check NEAR
    if ( ADDRESS_PATTERNS.near.test( trimmed ) )
    {
        return {
            inputType: 'address',
            isValid: true,
            chainFamily: 'near',
            suggestedChainUid: 'non-evm:near',
            confidence: 'high'
        };
    }

    // 14. Check Aptos (must be before Sui to avoid confusion)
    if ( ADDRESS_PATTERNS.aptos.test( trimmed ) && trimmed.length < 66 )
    {
        return {
            inputType: 'address',
            isValid: true,
            chainFamily: 'aptos',
            suggestedChainUid: 'non-evm:aptos',
            confidence: 'medium'
        };
    }

    // 15. Check Sui
    if ( ADDRESS_PATTERNS.sui.test( trimmed ) )
    {
        return {
            inputType: 'address',
            isValid: true,
            chainFamily: 'sui',
            suggestedChainUid: 'non-evm:sui',
            confidence: 'high'
        };
    }

    // 16. Check Algorand
    if ( ADDRESS_PATTERNS.algorand.test( trimmed ) )
    {
        return {
            inputType: 'address',
            isValid: true,
            chainFamily: 'algorand',
            suggestedChainUid: 'non-evm:algorand',
            confidence: 'high'
        };
    }

    // 17. Check Flow
    if ( ADDRESS_PATTERNS.flow.test( trimmed ) )
    {
        return {
            inputType: 'address',
            isValid: true,
            chainFamily: 'flow',
            suggestedChainUid: 'non-evm:flow',
            confidence: 'high'
        };
    }

    // Unknown format
    return {
        inputType: 'unknown',
        isValid: false,
        chainFamily: 'unknown',
        confidence: 'low'
    };
}

/**
 * Get a friendly name for the detected chain family
 */
export function getChainFamilyName ( family: ChainFamily ): string
{
    const names: Record<ChainFamily, string> = {
        evm: 'EVM',
        bitcoin: 'Bitcoin',
        litecoin: 'Litecoin',
        dogecoin: 'Dogecoin',
        tron: 'Tron',
        ton: 'TON',
        xrp: 'XRP Ledger',
        cosmos: 'Cosmos Hub',
        solana: 'Solana',
        near: 'NEAR Protocol',
        aptos: 'Aptos',
        sui: 'Sui',
        algorand: 'Algorand',
        flow: 'Flow',
        unknown: 'غير معروف'
    };
    return names[ family ] || 'غير معروف';
}

/**
 * Get list of all EVM chain UIDs to search
 */
export function getEVMChainUIDs ( chains: any[] ): string[]
{
    return chains
        .filter( chain => chain.chainUid && chain.chainUid.startsWith( 'eip155:' ) )
        .map( chain => chain.chainUid );
}
