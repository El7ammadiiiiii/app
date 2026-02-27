/**
 * Deep Research API Route
 * POST: بدء بحث عميق جديد مع SSE streaming
 */

import { NextRequest } from 'next/server';
import { createDeepResearchOrchestrator, type ResearchProgress } from '@/lib/ai/deepResearch/DeepResearchOrchestratorV2';
import
    {
        createResearch,
        updateResearchStatus,
        saveResearchResult,
    } from '@/lib/ai/deepResearch/firestoreService';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// تأكد من تهيئة Firebase Admin
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
export const maxDuration = 300; // 5 دقائق

interface SSEMessage
{
    type: 'progress' | 'result' | 'error' | 'done';
    data: unknown;
}

function createSSEResponse (
    onData: ( send: ( message: SSEMessage ) => void ) => Promise<void>
): Response
{
    const encoder = new TextEncoder();

    const stream = new ReadableStream( {
        async start ( controller )
        {
            const send = ( message: SSEMessage ) =>
            {
                const data = `data: ${ JSON.stringify( message ) }\n\n`;
                controller.enqueue( encoder.encode( data ) );
            };

            try
            {
                await onData( send );
            } catch ( error )
            {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                send( { type: 'error', data: { message: errorMessage } } );
            } finally
            {
                send( { type: 'done', data: {} } );
                controller.close();
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
        const { query, conversationId, config } = body;

        if ( !query || typeof query !== 'string' )
        {
            return new Response( JSON.stringify( { error: 'Query is required' } ), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            } );
        }

        // إنشاء سجل البحث في Firestore
        const researchId = await createResearch( userId, query, conversationId );

        // إنشاء SSE response
        return createSSEResponse( async ( send ) =>
        {
            const orchestrator = createDeepResearchOrchestrator( config );

            // تحديث الحالة
            await updateResearchStatus( researchId, 'in_progress' );

            // تنفيذ البحث مع تتبع التقدم
            const result = await orchestrator.research( query, ( progress: ResearchProgress ) =>
            {
                send( {
                    type: 'progress',
                    data: {
                        researchId,
                        ...progress,
                    },
                } );

                // تحديث التقدم في Firestore (كل 10%)
                if ( progress.progress % 10 === 0 )
                {
                    updateResearchStatus( researchId, 'in_progress', progress ).catch( console.error );
                }
            } );

            // حفظ النتيجة
            await saveResearchResult( researchId, result );

            // إرسال النتيجة النهائية
            send( {
                type: 'result',
                data: {
                    researchId,
                    synthesis: result.synthesis,
                    citations: result.citations,
                    metadata: result.metadata,
                    sourcesPreview: result.uniqueSources.slice( 0, 20 ).map( s => ( {
                        title: s.title,
                        url: s.url,
                        domain: s.domain,
                    } ) ),
                },
            } );
        } );

    } catch ( error )
    {
        console.error( '[DeepResearch API] Error:', error );

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

// GET: التحقق من حالة البحث
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
                message: 'Deep Research API is ready',
                engines: {
                    api: [ 'bing', 'serper' ],
                    scrape: [ 'duckduckgo', 'brave', 'mojeek', 'yep', 'youcom', 'yandex', 'naver', 'startpage' ],
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
