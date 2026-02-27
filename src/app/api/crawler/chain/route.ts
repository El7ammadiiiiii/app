import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// ── DeFiLlama chain name mapping (same as chain-name-map.ts) ──
const CRAWLER_TO_DEFILLAMA: Record<string, string> = {
    ethereum: "Ethereum", polygon: "Polygon", bsc: "BSC", arbitrum: "Arbitrum",
    optimism: "Optimism", base: "Base", linea: "Linea", scroll: "Scroll",
    mantle: "Mantle", blast: "Blast", celo: "Celo", gnosis: "Gnosis",
    moonbeam: "Moonbeam", moonriver: "Moonriver", polygon_zkevm: "Polygon zkEVM",
    taiko: "Taiko", fraxtal: "Fraxtal", berachain: "Berachain", harmony: "Harmony",
    manta_pacific: "Manta", zora: "Zora", bob: "BOB", bitcoin: "Bitcoin",
    litecoin: "Litecoin", celestia: "Celestia", stacks: "Stacks", tezos: "Tezos",
    hedera: "Hedera", aptos: "Aptos", iota: "IOTA", cosmos: "CosmosHub",
    polkadot: "Polkadot", multiversx: "MultiversX", kaspa: "Kaspa", ergo: "Ergo",
    decred: "Decred", radix: "Radix", theta: "Theta", telos: "Telos",
    worldcoin: "World Chain", core_dao: "CORE",
    fantom: "Fantom", avalanche: "Avalanche", cronos: "Cronos",
    aurora: "Aurora", metis: "Metis", kava: "Kava", sei: "Sei",
    zksync: "zkSync Era", mode: "Mode", opbnb: "opBNB",
};

function resolveCrawlerDataDir (): string
{
    // Support running `next dev` from either:
    // - repo root (c:\Users\GAME\elhammadi)
    // - app folder (c:\Users\GAME\elhammadi\nexus-webapp)
    // Also allow overriding via env var if needed.
    const envDir = process.env.CRAWLER_DATA_DIR;
    const candidates = [
        envDir,
        path.join( process.cwd(), 'crawler', 'data', 'latest' ),
        path.join( process.cwd(), '..', 'crawler', 'data', 'latest' ),
        path.join( process.cwd(), '..', '..', 'crawler', 'data', 'latest' ),
    ].filter( Boolean ) as string[];

    for ( const dir of candidates )
    {
        try
        {
            if ( fs.existsSync( dir ) && fs.statSync( dir ).isDirectory() ) return dir;
        } catch
        {
            // ignore and keep trying
        }
    }

    // Fall back to the most likely location to keep the error message predictable.
    return candidates[ 1 ] || path.join( process.cwd(), 'crawler', 'data', 'latest' );
}

const CRAWLER_DATA_DIR = resolveCrawlerDataDir();

// ══════════════════════════════════════════════════════════════════
// 🦙 DeFiLlama Server-Side Fetcher (time-series for Historical Trends)
// ══════════════════════════════════════════════════════════════════

const LLAMA_BASE = 'https://api.llama.fi';
const LLAMA_TIMEOUT = 12_000; // 12 seconds
const MAX_POINTS = 365;

interface ChartDataPoint
{
    date: string;
    value: number;
    timestamp: number;
}

interface ChartTimeSeries
{
    metric_key: string;
    metric_name: string;
    data: ChartDataPoint[];
    unit: string;
    description: string;
}

// Simple in-memory cache: chain → { data, fetchedAt }
const llamaCache = new Map<string, { data: Record<string, ChartTimeSeries>; fetchedAt: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function downsample ( points: ChartDataPoint[] ): ChartDataPoint[]
{
    if ( points.length <= MAX_POINTS ) return points;
    return points.slice( -MAX_POINTS );
}

function parseChartArray ( items: any[], valueKey?: string ): ChartDataPoint[]
{
    const points: ChartDataPoint[] = [];
    for ( const item of items )
    {
        let ts = 0;
        let val = 0;

        if ( Array.isArray( item ) && item.length >= 2 )
        {
            ts = Number( item[ 0 ] );
            val = Number( item[ 1 ] );
        } else if ( item && typeof item === 'object' )
        {
            ts = Number( item.date ?? item.timestamp ?? 0 );
            if ( valueKey && item[ valueKey ] !== undefined )
            {
                const raw = item[ valueKey ];
                if ( typeof raw === 'object' && raw !== null )
                {
                    // Stablecoins: { peggedUSD: val, ... }
                    val = Object.values( raw ).reduce( ( s: number, v ) =>
                        s + ( typeof v === 'number' ? v : 0 ), 0 );
                } else
                {
                    val = Number( raw );
                }
            } else if ( item.tvl !== undefined )
            {
                val = Number( item.tvl );
            }
        }

        if ( ts > 0 && val >= 0 && !isNaN( val ) )
        {
            const dt = new Date( ts * 1000 );
            points.push( {
                date: dt.toISOString().slice( 0, 10 ),
                value: Math.round( val * 100 ) / 100,
                timestamp: ts * 1000,
            } );
        }
    }
    points.sort( ( a, b ) => a.timestamp - b.timestamp );
    return points;
}

async function fetchWithTimeout ( url: string ): Promise<any | null>
{
    try
    {
        const controller = new AbortController();
        const timer = setTimeout( () => controller.abort(), LLAMA_TIMEOUT );
        const resp = await fetch( url, { signal: controller.signal } );
        clearTimeout( timer );
        if ( !resp.ok ) return null;
        return await resp.json();
    } catch
    {
        return null;
    }
}

async function fetchDefillamaSeries ( chainName: string ): Promise<Record<string, ChartTimeSeries>>
{
    const results: Record<string, ChartTimeSeries> = {};

    // Fetch all endpoints in parallel
    const [ tvlData, feesData, dexData, revenueData, stablecoinData ] = await Promise.all( [
        fetchWithTimeout( `${ LLAMA_BASE }/v2/historicalChainTvl/${ chainName }` ),
        fetchWithTimeout( `${ LLAMA_BASE }/overview/fees/${ chainName }` ),
        fetchWithTimeout( `${ LLAMA_BASE }/overview/dexs/${ chainName }` ),
        fetchWithTimeout( `${ LLAMA_BASE }/overview/fees/${ chainName }?dataType=dailyRevenue` ),
        fetchWithTimeout( `https://stablecoins.llama.fi/stablecoincharts/${ chainName }` ),
    ] );

    // 1. TVL
    if ( Array.isArray( tvlData ) && tvlData.length > 2 )
    {
        const pts = downsample( parseChartArray( tvlData, 'tvl' ) );
        if ( pts.length > 0 )
        {
            results.tvl = {
                metric_key: 'tvl', metric_name: 'Total Value Locked (TVL)',
                data: pts, unit: 'USD', description: 'Source: DeFiLlama',
            };
        }
    }

    // 2. Fees
    if ( feesData?.totalDataChart )
    {
        const pts = downsample( parseChartArray( feesData.totalDataChart ) );
        if ( pts.length > 0 )
        {
            results.fees = {
                metric_key: 'fees', metric_name: 'Daily Fees',
                data: pts, unit: 'USD', description: 'Source: DeFiLlama (chain aggregate)',
            };
        }
    }

    // 3. DEX Volume
    if ( dexData?.totalDataChart )
    {
        const pts = downsample( parseChartArray( dexData.totalDataChart ) );
        if ( pts.length > 0 )
        {
            results.volume = {
                metric_key: 'volume', metric_name: 'DEX Volume (24h)',
                data: pts, unit: 'USD', description: 'Source: DeFiLlama (chain aggregate)',
            };
        }
    }

    // 4. Revenue
    if ( revenueData?.totalDataChart )
    {
        const pts = downsample( parseChartArray( revenueData.totalDataChart ) );
        if ( pts.length > 0 )
        {
            results.revenue = {
                metric_key: 'revenue', metric_name: 'Daily Revenue',
                data: pts, unit: 'USD', description: 'Source: DeFiLlama (chain aggregate)',
            };
        }
    }

    // 5. Stablecoins
    if ( Array.isArray( stablecoinData ) && stablecoinData.length > 2 )
    {
        const pts = downsample( parseChartArray( stablecoinData, 'totalCirculatingUSD' ) );
        if ( pts.length > 0 )
        {
            results.stablecoins = {
                metric_key: 'stablecoins', metric_name: 'Stablecoin Supply',
                data: pts, unit: 'USD', description: 'Source: DeFiLlama',
            };
        }
    }

    return results;
}

async function getCachedDefillamaSeries ( chainKey: string ): Promise<Record<string, ChartTimeSeries>>
{
    const chainName = CRAWLER_TO_DEFILLAMA[ chainKey ];
    if ( !chainName ) return {};

    const cached = llamaCache.get( chainKey );
    if ( cached && ( Date.now() - cached.fetchedAt ) < CACHE_TTL_MS )
    {
        return cached.data;
    }

    try
    {
        const data = await fetchDefillamaSeries( chainName );
        llamaCache.set( chainKey, { data, fetchedAt: Date.now() } );
        return data;
    } catch
    {
        return cached?.data || {};
    }
}

export async function GET ( req: NextRequest )
{
    try
    {
        if ( !fs.existsSync( CRAWLER_DATA_DIR ) )
        {
            return NextResponse.json( {
                success: false,
                error: {
                    message: 'Crawler data directory not found',
                    details: {
                        cwd: process.cwd(),
                        resolvedDir: CRAWLER_DATA_DIR,
                        hint: 'Start the dev server from repo root or nexus-webapp, and ensure crawler/data/latest exists.',
                    },
                },
            }, { status: 500 } );
        }

        const { searchParams } = new URL( req.url );
        const chain = searchParams.get( 'chain' );

        // Return summary of all chains
        if ( !chain || chain === '__all__' )
        {
            // ── Load DeFiLlama data for enrichment ──
            const llamaPath = path.join( CRAWLER_DATA_DIR, '__defillama__.json' );
            let llamaChainsTvl: any[] = [];
            try
            {
                if ( fs.existsSync( llamaPath ) )
                {
                    const llamaRaw = fs.readFileSync( llamaPath, 'utf-8' );
                    const llamaData = JSON.parse( llamaRaw );
                    llamaChainsTvl = llamaData.chains_tvl || [];
                }
            } catch { /* ignore */ }

            // Build a quick lookup: lowercase llama name → tvl object
            const llamaTvlMap = new Map<string, any>();
            for ( const ch of llamaChainsTvl )
            {
                if ( ch.name ) llamaTvlMap.set( ch.name.toLowerCase(), ch );
            }

            const files = fs.readdirSync( CRAWLER_DATA_DIR )
                .filter( f => f.endsWith( '.json' ) && !f.startsWith( '__' ) );

            const chains = files.map( f =>
            {
                try
                {
                    const raw = fs.readFileSync( path.join( CRAWLER_DATA_DIR, f ), 'utf-8' );
                    const data = JSON.parse( raw );

                    const pagesCrawledCount = Array.isArray( data.pages_crawled ) ? data.pages_crawled.length : 0;
                    const pagesFailedCount = Array.isArray( data.pages_failed ) ? data.pages_failed.length : 0;
                    const topTokensCount = Array.isArray( data.tokens?.top_tokens ) ? data.tokens.top_tokens.length : 0;
                    const topAccountsCount = Array.isArray( data.wallets?.top_accounts ) ? data.wallets.top_accounts.length : 0;
                    const recentBlocksCount = Array.isArray( data.recent_blocks ) ? data.recent_blocks.length : 0;
                    const recentDexTradesCount = Array.isArray( data.recent_dex_trades ) ? data.recent_dex_trades.length : 0;

                    const coreFields: Array<any> = [
                        data.network?.total_transactions,
                        data.network?.tps,
                        data.network?.total_blocks,
                        data.network?.avg_block_time_seconds,
                        data.network?.total_addresses,
                        data.transactions?.gas_price_avg,
                        data.transactions?.pending_txs,
                        data.tokens?.native_price_usd,
                        data.tokens?.native_market_cap,
                        data.health?.total_nodes,
                    ];
                    const coreNonNullCount = coreFields.filter( ( v ) => v !== null && v !== undefined ).length;

                    // ── Enrich with DeFiLlama TVL ──
                    const chainKey = f.replace( '.json', '' );
                    const llamaName = CRAWLER_TO_DEFILLAMA[ chainKey ];
                    const llamaEntry = llamaName ? llamaTvlMap.get( llamaName.toLowerCase() ) : null;
                    const tvl = llamaEntry?.tvl ?? null;

                    // Lightweight quality scoring (0..100) to help the UI filter chains with empty/partial data.
                    const llamaBonus = tvl ? 15 : 0;
                    const qualityScore = Math.max( 0, Math.min( 100,
                        ( pagesCrawledCount * 9 ) +
                        ( coreNonNullCount * 6 ) +
                        ( topTokensCount > 0 ? 10 : 0 ) +
                        ( topAccountsCount > 0 ? 8 : 0 ) +
                        ( recentBlocksCount > 0 ? 8 : 0 ) +
                        ( recentDexTradesCount > 0 ? 5 : 0 ) +
                        llamaBonus -
                        ( pagesFailedCount * 5 )
                    ) );
                    const dataQuality = qualityScore >= 65 ? 'good' : qualityScore >= 35 ? 'partial' : 'empty';

                    return {
                        key: chainKey,
                        chain_name: data.chain_name || chainKey,
                        chain_symbol: data.chain_symbol || '?',
                        chain_id: data.chain_id ?? null,
                        native_price_usd: data.tokens?.native_price_usd ?? null,
                        native_market_cap: data.tokens?.native_market_cap ?? null,
                        total_transactions: data.network?.total_transactions ?? null,
                        tps: data.network?.tps ?? null,
                        total_nodes: data.health?.total_nodes ?? null,
                        total_addresses: data.network?.total_addresses ?? null,
                        tvl: tvl,
                        timestamp: data.timestamp || null,

                        pages_crawled_count: pagesCrawledCount,
                        pages_failed_count: pagesFailedCount,
                        top_tokens_count: topTokensCount,
                        top_accounts_count: topAccountsCount,
                        recent_blocks_count: recentBlocksCount,
                        recent_dex_trades_count: recentDexTradesCount,
                        core_non_null_count: coreNonNullCount,
                        quality_score: qualityScore,
                        data_quality: dataQuality,
                    };
                } catch
                {
                    return null;
                }
            } ).filter( Boolean );

            return NextResponse.json( {
                success: true,
                data: { chains, count: chains.length },
            }, {
                headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
            } );
        }

        // Return single chain data
        const sanitized = chain.replace( /[^a-zA-Z0-9_-]/g, '' );
        const filePath = path.join( CRAWLER_DATA_DIR, `${ sanitized }.json` );

        if ( !fs.existsSync( filePath ) )
        {
            return NextResponse.json( {
                success: false,
                error: { message: `Chain data not found: ${ sanitized }` },
            }, { status: 404 } );
        }

        const raw = fs.readFileSync( filePath, 'utf-8' );
        const data = JSON.parse( raw );

        // ── Enrich with DeFiLlama time-series if missing ──
        if ( !data.defillama_series || Object.keys( data.defillama_series ).length === 0 )
        {
            try
            {
                const series = await getCachedDefillamaSeries( sanitized );
                if ( Object.keys( series ).length > 0 )
                {
                    data.defillama_series = series;
                }
            } catch
            {
                // Non-blocking — page still works without historical charts
            }
        }

        return NextResponse.json( {
            success: true,
            data,
        }, {
            headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
        } );
    } catch ( error )
    {
        console.error( 'Crawler chain API error:', error );
        return NextResponse.json( {
            success: false,
            error: { message: 'Failed to load chain data' },
        }, { status: 500 } );
    }
}
