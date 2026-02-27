import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function resolveHoldersDir (): string
{
    const candidates = [
        process.env.CRAWLER_DATA_DIR
            ? path.join( process.env.CRAWLER_DATA_DIR, 'tokenterminal_holders' )
            : null,
        path.join( process.cwd(), 'crawler', 'data', 'latest', 'tokenterminal_holders' ),
        path.join( process.cwd(), '..', 'crawler', 'data', 'latest', 'tokenterminal_holders' ),
    ].filter( Boolean ) as string[];

    for ( const dir of candidates )
    {
        try
        {
            if ( fs.existsSync( dir ) && fs.statSync( dir ).isDirectory() ) return dir;
        } catch { /* ignore */ }
    }
    return candidates[ 1 ] || path.join( process.cwd(), 'crawler', 'data', 'latest', 'tokenterminal_holders' );
}

const HOLDERS_DIR = resolveHoldersDir();

function readJson ( filePath: string ): any
{
    try
    {
        if ( fs.existsSync( filePath ) )
        {
            return JSON.parse( fs.readFileSync( filePath, 'utf-8' ) );
        }
    } catch { /* ignore */ }
    return null;
}

export async function GET ( req: NextRequest )
{
    try
    {
        const { searchParams } = new URL( req.url );
        const action = searchParams.get( 'action' ) || 'list';
        const project = searchParams.get( 'project' );

        // ─── action=list → Return project index ───
        if ( action === 'list' )
        {
            const indexPath = path.join( HOLDERS_DIR, '_index.json' );
            const index = readJson( indexPath );

            if ( !index )
            {
                // Build index from individual files
                if ( !fs.existsSync( HOLDERS_DIR ) )
                {
                    // Return empty list instead of 404 — crawler hasn't run yet
                    return NextResponse.json( {
                        success: true,
                        data: { projects: [], total: 0 },
                        meta: { message: 'No holders data yet. Run the tokenterminal crawler to populate.' },
                    }, {
                        headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
                    } );
                }

                const files = fs.readdirSync( HOLDERS_DIR )
                    .filter( f => f.endsWith( '.json' ) && !f.startsWith( '_' ) );

                const projects = files.map( f =>
                {
                    const data = readJson( path.join( HOLDERS_DIR, f ) );
                    if ( !data ) return null;
                    return {
                        id: data.project_id || f.replace( '.json', '' ),
                        name: data.project_name || f.replace( '.json', '' ),
                        symbol: data.token_symbol || '',
                        chain: data.chain || '',
                        logo_url: data.logo_url || '',
                        holders_count: data.holders_count || 0,
                        crawled_at: data.crawled_at || null,
                    };
                } ).filter( Boolean );

                return NextResponse.json( {
                    success: true,
                    data: { projects, total: projects.length },
                }, {
                    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
                } );
            }

            return NextResponse.json( {
                success: true,
                data: index,
            }, {
                headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
            } );
        }

        // ─── action=holders → Return holders for a specific project ───
        if ( action === 'holders' && project )
        {
            const sanitized = project.replace( /[^a-zA-Z0-9_-]/g, '' );
            const filePath = path.join( HOLDERS_DIR, `${ sanitized }.json` );
            const data = readJson( filePath );

            if ( !data )
            {
                return NextResponse.json( {
                    success: false,
                    error: { message: `No holders data found for project: ${ sanitized }` },
                }, { status: 404 } );
            }

            return NextResponse.json( {
                success: true,
                data,
            }, {
                headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' },
            } );
        }

        // ─── action=summary → Return crawl summary ───
        if ( action === 'summary' )
        {
            const summaryPath = path.join( HOLDERS_DIR, '_summary.json' );
            const summary = readJson( summaryPath );

            return NextResponse.json( {
                success: true,
                data: summary || { message: 'No summary available' },
            } );
        }

        return NextResponse.json( {
            success: false,
            error: { message: 'Invalid action. Use: list, holders, summary' },
        }, { status: 400 } );

    } catch ( error )
    {
        console.error( 'Top holders API error:', error );
        return NextResponse.json( {
            success: false,
            error: { message: 'Failed to load holders data' },
        }, { status: 500 } );
    }
}
