import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// ══════════════════════════════════════════════════════════════════
// 📈 CryptoQuant Studio API Route
// ══════════════════════════════════════════════════════════════════
// Serves CryptoQuant Studio data for multiple assets (BTC, ETH, XRP, Stablecoins)
// GET /api/crawler/cryptoquant-studio
// GET /api/crawler/cryptoquant-studio?asset=btc
// GET /api/crawler/cryptoquant-studio?asset=btc&category=exchange-flows

const ASSET_FILES: Record<string, string> = {
    btc: "bitcoin.json",
    eth: "ethereum.json",
    xrp: "xrp.json",
    "usdt-eth": "tether_erc20.json",
    usdc: "usdc_erc20.json",
};

const STUDIO_KEYS = {
    charts: "cryptoquant_studio_charts",
    categories: "cryptoquant_studio_categories",
    categoriesMap: "cryptoquant_studio_categories_map",
    updated: "cryptoquant_studio_charts_updated",
    count: "cryptoquant_studio_charts_count",
};

function resolveCrawlerDataDir (): string
{
    const candidates = [
        process.env.CRAWLER_DATA_DIR,
        path.join( process.cwd(), 'crawler', 'data', 'latest' ),
        path.join( process.cwd(), '..', 'crawler', 'data', 'latest' ),
        path.join( process.cwd(), '..', '..', 'crawler', 'data', 'latest' ),
    ].filter( Boolean ) as string[];

    for ( const dir of candidates )
    {
        try
        {
            if ( fs.existsSync( dir ) && fs.statSync( dir ).isDirectory() ) return dir;
        } catch { }
    }
    return candidates[ 1 ] || path.join( process.cwd(), 'crawler', 'data', 'latest' );
}

const CRAWLER_DATA_DIR = resolveCrawlerDataDir();

function readAssetData ( filename: string ): any | null
{
    const filePath = path.join( CRAWLER_DATA_DIR, filename );
    try
    {
        if ( !fs.existsSync( filePath ) ) return null;
        const raw = fs.readFileSync( filePath, 'utf-8' );
        return JSON.parse( raw );
    } catch
    {
        return null;
    }
}

export async function GET ( request: NextRequest )
{
    try
    {
        const { searchParams } = new URL( request.url );
        const assetFilter = searchParams.get( 'asset' ); // btc, eth, xrp, all-stablecoins
        const categoryFilter = searchParams.get( 'category' ); // exchange-flows, etc.

        const assets = assetFilter
            ? { [ assetFilter ]: ASSET_FILES[ assetFilter ] }
            : ASSET_FILES;

        if ( assetFilter && !ASSET_FILES[ assetFilter ] )
        {
            return NextResponse.json(
                { success: false, error: { message: `Unknown asset: ${ assetFilter }` } },
                { status: 400 }
            );
        }

        const result: Record<string, any> = {};
        let totalCharts = 0;

        for ( const [ symbol, filename ] of Object.entries( assets ) )
        {
            const data = readAssetData( filename );
            if ( !data )
            {
                result[ symbol ] = { charts: {}, categories: [], updated: null, count: 0 };
                continue;
            }

            let charts = data[ STUDIO_KEYS.charts ] || {};
            const categories = data[ STUDIO_KEYS.categories ] || [];
            const categoriesMap = data[ STUDIO_KEYS.categoriesMap ] || {};
            const updated = data[ STUDIO_KEYS.updated ] || null;

            // Filter by category if specified
            if ( categoryFilter && categoriesMap[ categoryFilter ] )
            {
                const catMetrics = categoriesMap[ categoryFilter ].metrics || [];
                const filtered: Record<string, any> = {};
                for ( const key of catMetrics )
                {
                    if ( charts[ key ] ) filtered[ key ] = charts[ key ];
                }
                charts = filtered;
            }

            const count = Object.keys( charts ).length;
            totalCharts += count;

            result[ symbol ] = {
                name: data.chain_name || symbol.toUpperCase(),
                charts,
                categories,
                categoriesMap,
                updated,
                count,
            };
        }

        return NextResponse.json( {
            success: true,
            data: {
                assets: result,
                totalCharts,
                availableAssets: Object.keys( ASSET_FILES ),
                timestamp: new Date().toISOString(),
            },
        } );
    } catch ( err: any )
    {
        return NextResponse.json(
            { success: false, error: { message: err.message || 'Internal error' } },
            { status: 500 }
        );
    }
}
