import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * 🦙 API Route: /api/crawler/defillama
 * 
 * يخدم بيانات DeFiLlama الشاملة (cross-chain):
 * - ?section=tvl          → TVL لكل السلاسل
 * - ?section=protocols    → البروتوكولات
 * - ?section=dex          → DEX volumes
 * - ?section=fees         → الرسوم
 * - ?section=yields       → العوائد
 * - ?section=stablecoins  → العملات المستقرة
 * - ?section=bridges      → الجسور
 * - بدون section         → كل البيانات
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

export async function GET ( req: NextRequest )
{
    try
    {
        const filePath = path.join( CRAWLER_DATA_DIR, '__defillama__.json' );

        if ( !fs.existsSync( filePath ) )
        {
            return NextResponse.json( {
                success: false,
                error: {
                    message: 'DeFiLlama data not found. Run the DeFiLlama scraper first.',
                    hint: 'python -m crawler.runner --defillama',
                },
            }, { status: 404 } );
        }

        const raw = fs.readFileSync( filePath, 'utf-8' );
        const data = JSON.parse( raw );

        const { searchParams } = new URL( req.url );
        const section = searchParams.get( 'section' );

        // Map section names to data fields
        const sectionMap: Record<string, () => any> = {
            tvl: () => ( {
                total_defi_tvl: data.total_defi_tvl,
                chains_tvl: data.chains_tvl,
            } ),
            protocols: () => ( {
                protocols_count: data.protocols_count,
                top_protocols: data.top_protocols,
            } ),
            dex: () => ( {
                dex_total_24h: data.dex_total_24h,
                dex_total_7d: data.dex_total_7d,
                dex_total_30d: data.dex_total_30d,
                dex_change_1d: data.dex_change_1d,
                top_dexes: data.top_dexes,
            } ),
            fees: () => ( {
                fees_total_24h: data.fees_total_24h,
                fees_total_30d: data.fees_total_30d,
                top_fees: data.top_fees,
            } ),
            yields: () => ( {
                total_yield_pools: data.total_yield_pools,
                top_yield_pools: data.top_yield_pools,
            } ),
            stablecoins: () => ( {
                total_stablecoin_mcap: data.total_stablecoin_mcap,
                stablecoins_count: data.stablecoins_count,
                top_stablecoins: data.top_stablecoins,
            } ),
            bridges: () => ( {
                bridges_count: data.bridges_count,
                top_bridges: data.top_bridges,
            } ),
        };

        if ( section && sectionMap[ section ] )
        {
            return NextResponse.json( {
                success: true,
                section,
                data: sectionMap[ section ](),
                timestamp: data.timestamp,
            }, {
                headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
            } );
        }

        return NextResponse.json( {
            success: true,
            data,
        }, {
            headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
        } );

    } catch ( error: any )
    {
        return NextResponse.json( {
            success: false,
            error: { message: error.message },
        }, { status: 500 } );
    }
}
