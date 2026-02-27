/**
 * Deep Research Detail API Route
 * GET: استرجاع تفاصيل بحث محدد
 * DELETE: حذف بحث محدد
 */

import { NextRequest, NextResponse } from 'next/server';
import { getResearch, deleteResearch } from '@/lib/ai/deepResearch/firestoreService';
import { getAuth } from 'firebase-admin/auth';

async function verifyAuth ( request: NextRequest ): Promise<string | null>
{
    const authHeader = request.headers.get( 'Authorization' );

    if ( !authHeader?.startsWith( 'Bearer ' ) )
    {
        return null;
    }

    const token = authHeader.slice( 7 );

    try
    {
        const auth = getAuth();
        const decoded = await auth.verifyIdToken( token );
        return decoded.uid;
    } catch ( error )
    {
        console.error( 'Auth verification failed:', error );
        return null;
    }
}

interface RouteContext
{
    params: Promise<{ id: string }>;
}

export async function GET (
    request: NextRequest,
    context: RouteContext
)
{
    try
    {
        const userId = await verifyAuth( request );

        if ( !userId )
        {
            return NextResponse.json( { error: 'Unauthorized' }, { status: 401 } );
        }

        const { id } = await context.params;

        const research = await getResearch( id );

        if ( !research )
        {
            return NextResponse.json( { error: 'Research not found' }, { status: 404 } );
        }

        // التحقق من ملكية البحث
        if ( research.userId !== userId )
        {
            return NextResponse.json( { error: 'Forbidden' }, { status: 403 } );
        }

        return NextResponse.json( {
            success: true,
            research,
        } );

    } catch ( error )
    {
        console.error( '[DeepResearch Detail] Error:', error );
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function DELETE (
    request: NextRequest,
    context: RouteContext
)
{
    try
    {
        const userId = await verifyAuth( request );

        if ( !userId )
        {
            return NextResponse.json( { error: 'Unauthorized' }, { status: 401 } );
        }

        const { id } = await context.params;

        const research = await getResearch( id );

        if ( !research )
        {
            return NextResponse.json( { error: 'Research not found' }, { status: 404 } );
        }

        // التحقق من ملكية البحث
        if ( research.userId !== userId )
        {
            return NextResponse.json( { error: 'Forbidden' }, { status: 403 } );
        }

        await deleteResearch( id );

        return NextResponse.json( {
            success: true,
            message: 'Research deleted',
        } );

    } catch ( error )
    {
        console.error( '[DeepResearch Detail] Delete error:', error );
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
