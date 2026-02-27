import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET ( req: NextRequest )
{
    try
    {
        const { searchParams } = new URL( req.url );
        const view = searchParams.get( 'view' ) || 'enabled';

        // Read from local JSON file
        const filePath = path.join( process.cwd(), 'public', 'data', 'omnichain-registry.json' );
        const fileContent = fs.readFileSync( filePath, 'utf-8' );
        const registry = JSON.parse( fileContent );

        // Filter based on view parameter
        let chains = registry.chains;
        if ( view === 'enabled' )
        {
            chains = chains.filter( ( chain: any ) => chain.enabled === true );
        }

        return NextResponse.json( {
            success: true,
            data: {
                chains: chains,
                totalChains: chains.length,
                version: registry.version
            }
        } );
    } catch ( error )
    {
        console.error( 'Failed to load chains registry:', error );
        return NextResponse.json( {
            success: false,
            error: {
                message: 'Failed to load blockchain registry'
            }
        }, { status: 500 } );
    }
}
