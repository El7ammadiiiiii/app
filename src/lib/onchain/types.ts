export type ChainFamily = 'evm' | 'utxo' | 'account' | 'cosmos' | 'solana' | 'other';
export type ChainNetwork = 'mainnet' | 'testnet';

export interface ChainCapabilityMatrix
{
    balances: boolean;
    transactions: boolean;
    internalTransactions: boolean;
    tokenTransfersErc20: boolean;
    tokenTransfersErc721: boolean;
    tokenTransfersErc1155: boolean;
    logs: boolean;
    contractMetadata: boolean;
    rateLimited: boolean;
}

export interface ChainRegistryEntry
{
    chainUid: string;
    chainKey: string;
    displayName: string;
    family: ChainFamily;
    network: ChainNetwork;
    reference: Record<string, string | number>;
    nativeAsset: {
        symbol: string;
        decimals: number;
    };
    explorer?: {
        url: string;
    };
    sources: Array<{
        provider: string;
        notes?: string;
    }>;
    capabilities: ChainCapabilityMatrix;
    enabled: boolean;
    enabledByDefault: boolean;
    disabledReasons?: string[];
}

export interface ChainRegistryResponse
{
    success: boolean;
    data?: {
        registryVersion: string;
        defaultView: {
            enabledOnly: boolean;
        };
        chains: ChainRegistryEntry[];
    };
    error?: {
        message: string;
    };
}

export interface TraceBuildRequest
{
    chains: string[];
    start: {
        nodeKind: 'account';
        accountId: string;
    };
    direction: 'in' | 'out' | 'both';
    maxDepth: number;
    limits: {
        maxNeighborsPerNode: number;
        maxTotalEdges: number;
    };
    timeRange?: {
        from?: number;
        to?: number;
    };
    include: {
        nativeTransfers: boolean;
        erc20Transfers: boolean;
        internalTransactions: boolean;
    };
}

export interface TraceBuildResponse
{
    success: boolean;
    data?: {
        traceId: string;
        createdAt: number;
        graph: {
            elements: CytoscapeElement[];
            stats: {
                nodes: number;
                edges: number;
                depthBuilt: number;
                chainsUsed: string[];
            };
        };
        warnings?: Array<{ code: string; message: string }>;
    };
    error?: {
        message: string;
    };
}

export interface TraceExpandRequest
{
    traceId: string;
    nodeId: string;
    direction: 'in' | 'out' | 'both';
    depth: number;
    limits: {
        maxNeighbors: number;
        maxNewEdges: number;
    };
    include: {
        nativeTransfers: boolean;
        erc20Transfers: boolean;
        internalTransactions?: boolean;
    };
}

export interface TraceExpandResponse
{
    success: boolean;
    data?: {
        traceId: string;
        delta: {
            elementsAdded: CytoscapeElement[];
            elementsUpdated?: CytoscapeElement[];
        };
        stats: {
            newNodes: number;
            newEdges: number;
        };
    };
    error?: {
        message: string;
    };
}

export interface TraceEdgeRequest
{
    traceId: string;
    edgeId: string;
    pagination?: {
        cursor?: string | null;
        limit?: number;
    };
    detailLevel?: 'transfers' | 'transactions';
}

export interface TraceEdgeResponse
{
    success: boolean;
    data?: {
        edge: {
            edgeId: string;
            source: string;
            target: string;
            chainUid: string;
            kind: string;
            summary: {
                count: number;
                totalValueRaw?: string;
                token?: {
                    contract: string;
                    symbol?: string;
                    decimals?: number;
                };
            };
        };
        items: Array<Record<string, any>>;
        nextCursor?: string | null;
    };
    error?: {
        message: string;
    };
}

export interface TraceNodeRequest
{
    chainUid: string;
    nodeId: string;
    include: {
        balance: boolean;
        recentActivity: boolean;
        labels: boolean;
        contractMetadata: boolean;
    };
}

export interface TraceNodeResponse
{
    success: boolean;
    data?: Record<string, any>;
    error?: {
        message: string;
    };
}

export type CytoscapeElement = {
    group?: 'nodes' | 'edges';
    data: Record<string, any>;
    classes?: string;
    position?: { x: number; y: number };
};

export interface IntelligenceSuggestion
{
    id: string;
    kind?: 'entity' | 'address' | 'token' | string;
    name: string;
    type?: string;
    symbol?: string;
    chain?: string;
    entityName?: string;
    label?: string;
    pricingId?: string;
    source?: string;
    addresses?: Array<{
        address: string;
        chain?: string;
    }>;
}

export interface IntelligenceSearchResponse
{
    success: boolean;
    data?: IntelligenceSuggestion[];
    error?: {
        message: string;
    };
}
