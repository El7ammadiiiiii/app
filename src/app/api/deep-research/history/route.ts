/**
 * Deep Research History API Route
 * GET: استرجاع تاريخ البحث العميق للمستخدم
 * DELETE: حذف تاريخ البحث
 */

import { NextRequest, NextResponse } from 'next/server';
import
    {
        getUserResearchHistory,
        deleteUserResearchHistory,
        searchResearchHistory,
    } from '@/lib/ai/deepResearch/firestoreService';
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

export async function GET ( request: NextRequest )
{
    try
    {
        const userId = await verifyAuth( request );

        if ( !userId )
        {
            return NextResponse.json( { error: 'Unauthorized' }, { status: 401 } );
        }

        const { searchParams } = new URL( request.url );
        const limit = parseInt( searchParams.get( 'limit' ) || '20', 10 );
        const search = searchParams.get( 'search' );

        let history;

        if ( search )
        {
            history = await searchResearchHistory( userId, search, limit );
        } else
        {
            history = await getUserResearchHistory( userId, limit );
        }

        return NextResponse.json( {
            success: true,
            history,
            count: history.length,
        } );

    } catch ( error )
    {
        console.error( '[DeepResearch History] Error:', error );
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function DELETE ( request: NextRequest )
{
    try
    {
        const userId = await verifyAuth( request );

        if ( !userId )
        {
            return NextResponse.json( { error: 'Unauthorized' }, { status: 401 } );
        }

        const deletedCount = await deleteUserResearchHistory( userId );

        return NextResponse.json( {
            success: true,
            deletedCount,
        } );

    } catch ( error )
    {
        console.error( '[DeepResearch History] Delete error:', error );
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
