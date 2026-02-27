import { NextRequest, NextResponse } from 'next/server';
import { checkVideoStatus } from '@/services/veoService';

export async function GET (
    request: NextRequest,
    { params }: { params: { operationName: string } }
)
{
    try
    {
        const operationName = params.operationName;

        if ( !operationName )
        {
            return NextResponse.json(
                { error: 'Operation name is required' },
                { status: 400 }
            );
        }

        const result = await checkVideoStatus( operationName );

        if ( result.status === 'failed' )
        {
            return NextResponse.json(
                { error: result.error || 'Failed to check video status' },
                { status: 500 }
            );
        }

        return NextResponse.json( result );
    } catch ( error )
    {
        console.error( 'Video status check error:', error );
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
