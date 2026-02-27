import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * ₿📈 API Route: /api/crawler/etf
 * 
 * يخدم بيانات ETF (Bitcoin + Ethereum):
 * - ?asset=bitcoin    → Bitcoin ETF data (flows, issuers, price history)
 * - ?asset=ethereum   → Ethereum ETF data
 * - بدون asset       → كل البيانات
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
        const filePath = path.join( CRAWLER_DATA_DIR, '__etf_data__.json' );

        if ( !fs.existsSync( filePath ) )
        {
            return NextResponse.json( {
                success: false,
                error: {
                    message: 'ETF data not found. Run the ETF crawler first.',
                    hint: 'python -m crawler.runner --etf',
                },
            }, { status: 404 } );
        }

        const raw = fs.readFileSync( filePath, 'utf-8' );
        const data = JSON.parse( raw );

        const { searchParams } = new URL( req.url );
        const asset = searchParams.get( 'asset' );

        if ( asset === 'bitcoin' && data.bitcoin_etf )
        {
            return NextResponse.json( {
                success: true,
                asset: 'bitcoin',
                data: data.bitcoin_etf,
                timestamp: data.timestamp,
            }, {
                headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
            } );
        }

        if ( asset === 'ethereum' && data.ethereum_etf )
        {
            return NextResponse.json( {
                success: true,
                asset: 'ethereum',
                data: data.ethereum_etf,
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
