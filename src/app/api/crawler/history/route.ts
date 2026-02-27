import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * 📜 API Route: /api/crawler/history
 * 
 * يخدم البيانات التاريخية من أرشيف الزاحف:
 * - ?chain=polygon&days=30   → آخر 30 لقطة لـ Polygon
 * - ?chain=bitcoin&days=7    → آخر 7 أيام Bitcoin
 * 
 * يقرأ من crawler/data/history/YYYY-MM-DD/*.json
 * ويبني Time Series من اللقطات المتراكمة.
 */

function resolveCrawlerHistoryDir (): string
{
    const envDir = process.env.CRAWLER_DATA_DIR;
    const candidates = [
        envDir ? path.join( path.dirname( envDir ), 'history' ) : null,
        path.join( process.cwd(), 'crawler', 'data', 'history' ),
        path.join( process.cwd(), '..', 'crawler', 'data', 'history' ),
        path.join( process.cwd(), '..', '..', 'crawler', 'data', 'history' ),
    ].filter( Boolean ) as string[];

    for ( const dir of candidates )
    {
        try
        {
            if ( fs.existsSync( dir ) && fs.statSync( dir ).isDirectory() ) return dir;
        } catch { /* ignore */ }
    }

    return candidates[ 1 ] || path.join( process.cwd(), 'crawler', 'data', 'history' );
}

const HISTORY_DIR = resolveCrawlerHistoryDir();

export async function GET ( req: NextRequest )
{
    try
    {
        if ( !fs.existsSync( HISTORY_DIR ) )
        {
            return NextResponse.json( {
                success: false,
                error: { message: 'History directory not found. Crawler needs to run for a few days to accumulate history.' },
            }, { status: 404 } );
        }

        const { searchParams } = new URL( req.url );
        const chain = searchParams.get( 'chain' ) || 'polygon';
        const days = Math.min( parseInt( searchParams.get( 'days' ) || '30' ), 90 );
        const metric = searchParams.get( 'metric' ); // optional: return specific fields only

        // Get date directories sorted
        const dateDirs = fs.readdirSync( HISTORY_DIR )
            .filter( d => /^\d{4}-\d{2}-\d{2}$/.test( d ) )
            .sort()
            .slice( -days );

        const timeSeries: Array<Record<string, any>> = [];

        for ( const dateDir of dateDirs )
        {
            const dayPath = path.join( HISTORY_DIR, dateDir );
            if ( !fs.statSync( dayPath ).isDirectory() ) continue;

            // Find files for this chain on this day
            const files = fs.readdirSync( dayPath )
                .filter( f => f.startsWith( chain + '_' ) && f.endsWith( '.json' ) )
                .sort();

            // Take the last snapshot of each day
            const lastFile = files[ files.length - 1 ];
            if ( !lastFile ) continue;

            try
            {
                const raw = fs.readFileSync( path.join( dayPath, lastFile ), 'utf-8' );
                const data = JSON.parse( raw );

                const point: Record<string, any> = {
                    date: dateDir,
                    timestamp: data.timestamp,
                };

                if ( metric )
                {
                    // Return only the requested metric path
                    const parts = metric.split( '.' );
                    let val: any = data;
                    for ( const p of parts )
                    {
                        val = val?.[ p ];
                    }
                    point[ metric ] = val;
                } else
                {
                    // Return key metrics
                    point.total_addresses = data.network?.total_addresses ?? null;
                    point.total_transactions = data.network?.total_transactions ?? null;
                    point.tps = data.network?.tps ?? null;
                    point.active_addresses_daily = data.network?.active_addresses_daily ?? null;
                    point.gas_price_avg = data.transactions?.gas_price_avg ?? null;
                    point.native_price_usd = data.tokens?.native_price_usd ?? null;
                    point.native_market_cap = data.tokens?.native_market_cap ?? null;
                    point.total_nodes = data.health?.total_nodes ?? null;
                    point.new_contracts_daily = data.contracts?.new_contracts_daily ?? null;
                }

                timeSeries.push( point );
            } catch
            {
                // Skip corrupted files
            }
        }

        return NextResponse.json( {
            success: true,
            chain,
            days: dateDirs.length,
            data: timeSeries,
        }, {
            headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
        } );

    } catch ( error: any )
    {
        return NextResponse.json( {
            success: false,
            error: { message: error.message },
        }, { status: 500 } );
    }
}
