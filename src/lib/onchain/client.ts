import type {
    ChainRegistryResponse,
    IntelligenceSearchResponse,
    TraceBuildRequest,
    TraceBuildResponse,
    TraceExpandRequest,
    TraceExpandResponse,
    TraceEdgeRequest,
    TraceEdgeResponse,
    TraceNodeRequest,
    TraceNodeResponse
} from './types';

async function requestJson<T> ( url: string, init?: RequestInit ): Promise<T>
{
    const response = await fetch( url, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...( init?.headers || {} )
        }
    } );

    const data = await response.json();
    return data as T;
}

export async function fetchChainRegistry ( view: 'enabled' | 'all' = 'enabled' )
{
    return requestJson<ChainRegistryResponse>( `/api/onchain/chains?view=${ view }` );
}

export async function buildTraceGraph ( payload: TraceBuildRequest )
{
    return requestJson<TraceBuildResponse>( '/api/onchain/trace/build', {
        method: 'POST',
        body: JSON.stringify( payload )
    } );
}

export async function expandTraceNode ( payload: TraceExpandRequest )
{
    return requestJson<TraceExpandResponse>( '/api/onchain/trace/expand', {
        method: 'POST',
        body: JSON.stringify( payload )
    } );
}

export async function fetchEdgeDrilldown ( payload: TraceEdgeRequest )
{
    return requestJson<TraceEdgeResponse>( '/api/onchain/trace/edge', {
        method: 'POST',
        body: JSON.stringify( payload )
    } );
}

export async function fetchNodeDetails ( payload: TraceNodeRequest )
{
    return requestJson<TraceNodeResponse>( '/api/onchain/trace/node', {
        method: 'POST',
        body: JSON.stringify( payload )
    } );
}

export async function searchIntelligence ( q: string )
{
    const encoded = encodeURIComponent( q );
    return requestJson<IntelligenceSearchResponse>( `/api/onchain/intelligence/search?q=${ encoded }` );
}
