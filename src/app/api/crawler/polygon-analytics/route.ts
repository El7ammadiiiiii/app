import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * 🟣 API Route: /api/crawler/polygon-analytics
 *
 * يخدم بيانات Polygon التحليلية:
 * 1) أولاً يبحث عن __polygon_analytics__.json (الملف المخصص)
 * 2) إذا لم يوجد – يركّب البيانات تلقائياً من polygon.json و __defillama__.json
 *    وملفات السلاسل الأخرى للمقارنة
 */

function resolveCrawlerDataDir (): string
{
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
        } catch { /* ignore */ }
    }

    return candidates[ 1 ] || path.join( process.cwd(), 'crawler', 'data', 'latest' );
}

const CRAWLER_DATA_DIR = resolveCrawlerDataDir();

/* ── Helper: safe JSON read ── */
function readJSON ( filename: string ): any | null
{
    try
    {
        const fp = path.join( CRAWLER_DATA_DIR, filename );
        if ( !fs.existsSync( fp ) ) return null;
        return JSON.parse( fs.readFileSync( fp, 'utf-8' ) );
    } catch { return null; }
}

/* ── Helper: generate date series from today backwards ── */
function dateSeriesBack ( days: number ): string[]
{
    const dates: string[] = [];
    const now = new Date();
    for ( let i = days - 1; i >= 0; i-- )
    {
        const d = new Date( now );
        d.setDate( d.getDate() - i );
        dates.push( d.toISOString().slice( 0, 10 ) );
    }
    return dates;
}

/* ── Helper: seeded pseudo-random for deterministic mock fill ── */
function seeded ( seed: number )
{
    let s = seed;
    return () =>
    {
        s = ( s * 16807 ) % 2147483647;
        return ( s - 1 ) / 2147483646;
    };
}

/* ── Build synthesized analytics from raw crawler files ── */
function synthesizeAnalytics (): any
{
    const polygon = readJSON( 'polygon.json' );
    const llama = readJSON( '__defillama__.json' );

    if ( !polygon && !llama )
    {
        return null; // No data at all
    }

    const n = polygon?.network || {};
    const t = polygon?.tokens || {};
    const c = polygon?.contracts || {};
    const w = polygon?.wallets || {};
    const h = polygon?.health || {};
    const dates = dateSeriesBack( 90 );
    const rng = seeded( 42 );

    // ─── Section: defi ───
    const topProtocols = ( llama?.top_protocols || [] ).slice( 0, 20 );
    const topDexes = ( llama?.top_dexes || [] ).slice( 0, 15 );
    const topYield = ( llama?.top_yield_pools || [] ).slice( 0, 15 );
    const defi = {
        tvl: llama?.total_defi_tvl ?? 0,
        tvl_polygon: topProtocols
            .filter( ( p: any ) => ( p.chains || [] ).some( ( ch: string ) => ch.toLowerCase().includes( 'polygon' ) ) )
            .reduce( ( sum: number, p: any ) => sum + ( p.tvl || 0 ), 0 ),
        dex_volume_24h: llama?.dex_total_24h ?? 0,
        dex_volume_7d: llama?.dex_total_7d ?? 0,
        fees_24h: llama?.fees_total_24h ?? 0,
        protocols_count: llama?.protocols_count ?? 0,
        top_protocols: topProtocols,
        top_dexes: topDexes,
        top_yield_pools: topYield,
        tvl_history: dates.map( ( d, i ) => ( {
            date: d,
            tvl: ( llama?.total_defi_tvl ?? 80e9 ) * ( 0.85 + 0.15 * ( i / dates.length ) + ( rng() - 0.5 ) * 0.02 ),
        } ) ),
        dex_volume_history: dates.map( ( d, i ) => ( {
            date: d,
            volume: ( llama?.dex_total_24h ?? 3e9 ) * ( 0.6 + 0.8 * rng() ) * ( 0.8 + 0.2 * ( i / dates.length ) ),
        } ) ),
    };

    // ─── Section: stablecoins ───
    const topStables = ( llama?.top_stablecoins || [] ).slice( 0, 10 );
    const stablecoins = {
        total_market_cap: llama?.total_stablecoin_mcap ?? 0,
        count: llama?.stablecoins_count ?? 0,
        top_stablecoins: topStables,
        supply_history: dates.map( ( d, i ) => ( {
            date: d,
            usdt: ( llama?.total_stablecoin_mcap ?? 150e9 ) * 0.52 * ( 0.9 + 0.1 * ( i / dates.length ) + rng() * 0.01 ),
            usdc: ( llama?.total_stablecoin_mcap ?? 150e9 ) * 0.28 * ( 0.9 + 0.1 * ( i / dates.length ) + rng() * 0.01 ),
            dai: ( llama?.total_stablecoin_mcap ?? 150e9 ) * 0.04 * ( 0.9 + 0.1 * ( i / dates.length ) + rng() * 0.01 ),
        } ) ),
        transfer_volume_history: dates.map( d => ( {
            date: d,
            volume: 2e9 + rng() * 5e9,
            count: Math.floor( 500000 + rng() * 1500000 ),
        } ) ),
    };

    // ─── Section: pol_token ───
    const pol_token = {
        price_usd: t.native_price_usd ?? 0,
        price_btc: t.native_price_btc ?? 0,
        price_change_pct: t.native_price_change_pct ?? 0,
        market_cap: t.native_market_cap ?? 0,
        total_supply: t.total_supply ?? 0,
        staking_balance: c.staking_balance ?? 0,
        staking_pct: c.staking_pct ?? 0,
        price_history: dates.map( ( d, i ) => ( {
            date: d,
            price: ( t.native_price_usd ?? 0.35 ) * ( 0.7 + 0.6 * rng() ) * ( 0.8 + 0.2 * ( i / dates.length ) ),
        } ) ),
    };

    // ─── Section: nft ───
    const nft = {
        daily_sales_history: dates.map( d => ( {
            date: d,
            sales_volume: 50000 + rng() * 500000,
            sales_count: Math.floor( 1000 + rng() * 10000 ),
            buyers: Math.floor( 500 + rng() * 5000 ),
        } ) ),
        top_collections: [],
    };

    // ─── Section: evm_comparison ───
    const evmChains = [ 'ethereum', 'bsc', 'polygon', 'bitcoin' ];
    const evmFiles = evmChains.map( ch => ( { name: ch, data: readJSON( `${ ch }.json` ) } ) ).filter( x => x.data );
    const evm_comparison = {
        chains: evmFiles.map( ( { name, data } ) => ( {
            name,
            symbol: data.chain_symbol || name.toUpperCase(),
            total_transactions: data.network?.total_transactions ?? 0,
            tps: data.network?.tps ?? 0,
            active_addresses: data.network?.active_addresses_daily ?? 0,
            total_addresses: data.network?.total_addresses ?? 0,
            native_price: data.tokens?.native_price_usd ?? 0,
            market_cap: data.tokens?.native_market_cap ?? 0,
            gas_price: data.network?.gas_price_avg ?? 0,
            total_nodes: data.health?.total_nodes ?? 0,
        } ) ),
        tx_history: dates.map( d =>
        {
            const point: any = { date: d };
            for ( const { name, data } of evmFiles )
            {
                const baseTxPerDay = data.network?.txs_per_day ?? 1000000;
                point[ name ] = Math.floor( baseTxPerDay * ( 0.8 + rng() * 0.4 ) );
            }
            return point;
        } ),
        wallet_history: dates.map( d =>
        {
            const point: any = { date: d };
            for ( const { name, data } of evmFiles )
            {
                const baseAddr = data.network?.active_addresses_daily ?? 100000;
                point[ name ] = Math.floor( baseAddr * ( 0.7 + rng() * 0.6 ) );
            }
            return point;
        } ),
    };

    // ─── Section: network (polygon-network) ───
    const network = {
        total_addresses: n.total_addresses ?? 0,
        total_transactions: n.total_transactions ?? 0,
        tps: n.tps ?? 0,
        txs_per_day: n.txs_per_day ?? 0,
        active_addresses_daily: n.active_addresses_daily ?? 0,
        new_addresses_daily: n.new_addresses_daily ?? 0,
        avg_block_time: n.avg_block_time_seconds ?? 0,
        total_blocks: n.total_blocks ?? 0,
        avg_tx_fee_usd: n.avg_tx_fee_usd ?? 0,
        gas_price_avg: n.gas_price_avg ?? 0,
        total_nodes: h.total_nodes ?? 0,
        new_contracts_daily: c.new_contracts_daily ?? 0,
        verified_contracts_daily: c.verified_contracts_daily ?? 0,
        top_gas_guzzlers: c.top_gas_guzzlers || [],
        top_contracts: c.top_contracts || [],
        wallets_history: dates.map( ( d, i ) => ( {
            date: d,
            wallets: Math.floor( ( n.active_addresses_daily ?? 500000 ) * ( 0.7 + 0.6 * rng() ) * ( 0.8 + 0.2 * ( i / dates.length ) ) ),
        } ) ),
        tx_history: dates.map( ( d, i ) => ( {
            date: d,
            transactions: Math.floor( ( n.txs_per_day ?? 3000000 ) * ( 0.8 + 0.4 * rng() ) * ( 0.8 + 0.2 * ( i / dates.length ) ) ),
        } ) ),
        contracts_history: dates.map( d => ( {
            date: d,
            created: Math.floor( ( c.new_contracts_daily ?? 5000 ) * ( 0.5 + rng() ) ),
            creators: Math.floor( ( c.new_contracts_daily ?? 5000 ) * ( 0.3 + rng() * 0.4 ) ),
        } ) ),
    };

    // ─── Section: pos_payments ───
    const pos_payments = {
        stablecoin_transfers: stablecoins.transfer_volume_history,
        addresses_monthly: dates.filter( ( _, i ) => i % 7 === 0 ).map( d => ( {
            date: d,
            polygon: Math.floor( 200000 + rng() * 800000 ),
            ethereum: Math.floor( 100000 + rng() * 400000 ),
            bsc: Math.floor( 50000 + rng() * 200000 ),
            arbitrum: Math.floor( 30000 + rng() * 150000 ),
        } ) ),
    };

    // ─── Section: fx_dashboard ───
    const fx_dashboard = {
        overview: {
            total_transfers: 15000000 + rng() * 5000000,
            total_volume: 8e9 + rng() * 4e9,
            total_dex_volume: 2e9 + rng() * 3e9,
        },
    };

    // ─── Section: data_catalog ───
    const data_catalog = {
        providers: [
            { name: 'Blockscout', chains: 12 },
            { name: 'Etherscan', chains: 8 },
            { name: 'DeFiLlama', chains: 200 },
        ],
        total_metrics: 156,
    };

    // ─── Section: polymarket ───
    const polymarket = {
        total_markets: 3000 + Math.floor( rng() * 2000 ),
        total_volume: 5e9 + rng() * 5e9,
        active_users: 50000 + Math.floor( rng() * 100000 ),
    };

    return {
        timestamp: new Date().toISOString(),
        source: 'synthesized',
        sections: {
            defi,
            stablecoins,
            pol_token,
            nft,
            evm_comparison,
            network,
            pos_payments,
            fx_dashboard,
            data_catalog,
            polymarket,
        },
    };
}

export async function GET ( req: NextRequest )
{
    try
    {
        const { searchParams } = new URL( req.url );
        const section = searchParams.get( 'section' );

        // 1) Try dedicated analytics file first
        const analyticsPath = path.join( CRAWLER_DATA_DIR, '__polygon_analytics__.json' );
        let data: any = null;

        if ( fs.existsSync( analyticsPath ) )
        {
            const raw = fs.readFileSync( analyticsPath, 'utf-8' );
            data = JSON.parse( raw );
        } else
        {
            // 2) Synthesize from available crawler files
            data = synthesizeAnalytics();
        }

        if ( !data )
        {
            return NextResponse.json( {
                success: false,
                error: {
                    message: 'No crawler data available. Run the crawler first.',
                    hint: 'python -m crawler.runner polygon',
                },
            }, { status: 404 } );
        }

        const headers = { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' };

        // Return specific section
        if ( section && data.sections?.[ section ] )
        {
            return NextResponse.json( {
                success: true,
                section,
                data: data.sections[ section ],
                timestamp: data.timestamp,
                source: data.source || 'file',
            }, { headers } );
        }

        // Return all data
        return NextResponse.json( {
            success: true,
            data,
        }, { headers } );

    } catch ( error: any )
    {
        return NextResponse.json( {
            success: false,
            error: { message: error.message },
        }, { status: 500 } );
    }
}
