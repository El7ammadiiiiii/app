/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ALTRA API ROUTE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * POST: بدء عملية ALTRA مع SSE streaming
 * GET: التحقق من حالة الخدمة
 * 
 * الأحداث (SSE Events):
 * - altra_progress: تحديث التقدم في كل مرحلة
 * - altra_reasoning: نتيجة التحليل
 * - altra_result: النتيجة النهائية
 * - altra_error: خطأ
 * - altra_done: اكتمال العملية
 */

import { NextRequest } from 'next/server';
import { createAltraOrchestrator, type AltraProgress, type AltraResult } from '@/lib/ai/altra/AltraOrchestrator';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// ═══════════════════════════════════════════════════════════════════════════════
// FIREBASE ADMIN INIT
// ═══════════════════════════════════════════════════════════════════════════════

if ( getApps().length === 0 )
{
    try
    {
        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace( /\\n/g, '\n' );
        if ( privateKey && process.env.FIREBASE_PROJECT_ID )
        {
            initializeApp( {
                credential: cert( {
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey,
                } ),
            } );
        }
    } catch ( e )
    {
        console.error( 'Firebase Admin initialization error:', e );
    }
}

export const runtime = 'nodejs';
export const maxDuration = 180; // 3 دقائق

// ═══════════════════════════════════════════════════════════════════════════════
// SSE TYPES & HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

interface SSEMessage
{
    type: 'altra_progress' | 'altra_reasoning' | 'altra_result' | 'altra_error' | 'altra_done';
    data: unknown;
    id?: string; // cursor-based reconnection
}

function createSSEResponse (
    onData: ( send: ( message: SSEMessage ) => void ) => Promise<void>
): Response
{
    const encoder = new TextEncoder();
    let messageCounter = 0;

    const stream = new ReadableStream( {
        async start ( controller )
        {
            const send = ( message: SSEMessage ) =>
            {
                messageCounter++;
                const id = message.id || `altra-${ messageCounter }`;
                // إرسال مع cursor ID للإعادة الاتصال
                const data = `id: ${ id }\ndata: ${ JSON.stringify( message ) }\n\n`;
                try
                {
                    controller.enqueue( encoder.encode( data ) );
                } catch
                {
                    // Controller already closed
                }
            };

            try
            {
                await onData( send );
            } catch ( error )
            {
                if ( ( error as Error ).name !== 'AbortError' )
                {
                    const errorMessage = error instanceof Error ? error.message : 'خطأ غير متوقع';
                    send( { type: 'altra_error', data: { message: errorMessage } } );
                }
            } finally
            {
                // Triple completion signals
                send( { type: 'altra_done', data: { status: 'complete' } } );
                try
                {
                    controller.close();
                } catch
                {
                    // Already closed
                }
            }
        },
    } );

    return new Response( stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    } );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════════════════

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
        console.error( '[Altra] Auth verification failed:', error );
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST - بدء عملية ALTRA
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST ( request: NextRequest )
{
    try
    {
        // التحقق من المصادقة
        const userId = await verifyAuth( request );

        if ( !userId )
        {
            return new Response( JSON.stringify( { error: 'Unauthorized' } ), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            } );
        }

        // قراءة الطلب
        const body = await request.json();
        const { query, conversationId, config: userConfig } = body;

        if ( !query || typeof query !== 'string' )
        {
            return new Response( JSON.stringify( { error: 'Query is required' } ), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            } );
        }

        if ( query.length > 5000 )
        {
            return new Response( JSON.stringify( { error: 'Query too long (max 5000 chars)' } ), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            } );
        }

        console.log( `[Altra] Starting for user=${ userId }, query="${ query.substring( 0, 100 ) }"` );

        // إنشاء SSE response
        return createSSEResponse( async ( send ) =>
        {
            const orchestrator = createAltraOrchestrator( userConfig );

            // تنفيذ Pipeline
            const result = await orchestrator.execute(
                query,
                ( progress: AltraProgress ) =>
                {
                    // إرسال تحديث التقدم
                    send( {
                        type: 'altra_progress',
                        data: {
                            conversationId,
                            ...progress,
                        },
                    } );
                }
            );

            // إرسال التحليل
            send( {
                type: 'altra_reasoning',
                data: {
                    reasoning: result.reasoning,
                    category: result.category,
                    subQueries: result.subQueries,
                },
            } );

            // إرسال النتيجة النهائية
            send( {
                type: 'altra_result',
                data: {
                    id: result.id,
                    synthesis: result.synthesis,
                    citations: result.citations,
                    blocks: result.blocks,
                    sources: result.sources.slice( 0, 30 ).map( s => ( {
                        title: s.title,
                        url: s.url,
                        domain: s.domain,
                        snippet: s.snippet?.substring( 0, 200 ),
                    } ) ),
                    metadata: result.metadata,
                },
            } );
        } );

    } catch ( error )
    {
        console.error( '[Altra API] Error:', error );

        return new Response(
            JSON.stringify( {
                error: error instanceof Error ? error.message : 'Internal server error',
            } ),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET - حالة الخدمة
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET ( request: NextRequest )
{
    try
    {
        const userId = await verifyAuth( request );

        if ( !userId )
        {
            return new Response( JSON.stringify( { error: 'Unauthorized' } ), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            } );
        }

        return new Response(
            JSON.stringify( {
                status: 'ready',
                message: 'ALTRA Engine is ready',
                version: '1.0.0',
                phases: [
                    'classify',
                    'decompose',
                    'search',
                    'collect',
                    'reason',
                    'synthesize',
                ],
                search_engines: [ 'serper', 'tavily' ],
                capabilities: {
                    parallel_search: true,
                    news_search: true,
                    citation_system: true,
                    cursor_reconnection: true,
                },
            } ),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    } catch ( error )
    {
        return new Response(
            JSON.stringify( { error: 'Internal server error' } ),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }
}
