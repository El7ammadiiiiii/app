/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * THINKING API ROUTE - SSE Streaming (Mode-Aware)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * API endpoint لتوليد خطوات تفكير ديناميكية حسب الوضع والعمق
 * كل وضع له مراحل مختلفة بأسماء مخصصة
 * 
 * @version 2.0.0
 */

import { NextRequest } from 'next/server';
import
  {
    ThinkingLevel,
    ThinkingPhase,
    THINKING_DURATIONS,
    PHASE_TEXTS,
    type ThinkingMode,
    type ThinkingDepthKey,
    getModePhases,
    getModePhaseText,
  } from '@/types/thinking';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * توليد محتوى خطوة التفكير — يستخدم الوضع للنص المخصص
 */
function generateStepContent ( phase: ThinkingPhase, mode?: ThinkingMode ): string
{
  if ( mode )
  {
    return getModePhaseText( mode, phase );
  }
  return PHASE_TEXTS[ phase ] || '';
}

/**
 * اختيار المراحل بناءً على الوضع والعمق (أو fallback للمستوى القديم)
 */
function selectPhases ( level: ThinkingLevel, mode?: ThinkingMode, depth?: ThinkingDepthKey ): ThinkingPhase[]
{
  // إذا وُجد الوضع والعمق → استخدم القوالب الديناميكية الجديدة
  if ( mode && depth )
  {
    return getModePhases( mode, depth );
  }

  // Fallback: السلوك القديم (عدد عشوائي من المراحل حسب المستوى)
  const allPhases = Object.values( ThinkingPhase );
  const depthFromLevel: ThinkingDepthKey =
    level === ThinkingLevel.MINIMAL ? 'min'
    : level === ThinkingLevel.LOW ? 'standard'
    : level === ThinkingLevel.MEDIUM ? 'extended'
    : 'max';

  if ( mode )
  {
    return getModePhases( mode, depthFromLevel );
  }

  // Generic fallback without mode
  const count = level === ThinkingLevel.MINIMAL ? 2
    : level === ThinkingLevel.LOW ? 3
    : level === ThinkingLevel.MEDIUM ? 5
    : allPhases.length;

  return allPhases.slice( 0, count );
}

/**
 * حساب مدة كل خطوة
 */
function calculateStepDuration ( level: ThinkingLevel, totalSteps: number, stepIndex: number ): number
{
  const { min, max } = THINKING_DURATIONS[ level ];
  const totalMs = ( min + Math.random() * ( max - min ) ) * 1000;

  // توزيع الوقت بشكل غير متساوٍ (بعض الخطوات أطول)
  const weights = Array.from( { length: totalSteps }, ( _, i ) =>
    i === 0 ? 1.5 : i === totalSteps - 1 ? 1.2 : 1
  );
  const totalWeight = weights.reduce( ( a, b ) => a + b, 0 );

  return Math.floor( ( totalMs * weights[ stepIndex ] ) / totalWeight );
}

/**
 * إرسال SSE event
 */
function sendSSE ( controller: ReadableStreamDefaultController, event: any )
{
  const data = `data: ${ JSON.stringify( event ) }\n\n`;
  controller.enqueue( new TextEncoder().encode( data ) );
}

/**
 * انتظار مدة محددة
 */
function sleep ( ms: number ): Promise<void>
{
  return new Promise( resolve => setTimeout( resolve, ms ) );
}

// ═══════════════════════════════════════════════════════════════════════════════
// API HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST ( request: NextRequest )
{
  try
  {
    const body = await request.json();
    const { messageId, query, level, mode, depth } = body as {
      messageId: string;
      query: string;
      level: ThinkingLevel;
      mode?: ThinkingMode;
      depth?: ThinkingDepthKey;
    };

    if ( !messageId || !query || !level )
    {
      return new Response( 'Missing required fields', { status: 400 } );
    }

    // إنشاء SSE Stream
    const stream = new ReadableStream( {
      async start ( controller )
      {
        try
        {
          // اختيار المراحل — ديناميكي حسب الوضع والعمق
          const phases = selectPhases( level, mode, depth );
          const totalSteps = phases.length;

          // إرسال كل خطوة
          for ( let i = 0; i < totalSteps; i++ )
          {
            const phase = phases[ i ];
            const duration = calculateStepDuration( level, totalSteps, i );
            const content = generateStepContent( phase, mode );

            // إرسال الخطوة
            sendSSE( controller, {
              type: 'step',
              data: {
                messageId,
                step: {
                  id: `step_${ Date.now() }_${ Math.random().toString( 36 ).substr( 2, 9 ) }`,
                  phase,
                  content,
                  timestamp: Date.now(),
                  duration,
                },
              },
            } );

            // انتظار مدة الخطوة
            await sleep( duration );
          }

          // إرسال الملخص النهائي
          const modeLabel = mode === 'thinking' ? 'التفكير العميق'
            : mode === 'deep research' ? 'البحث العميق'
            : mode === 'agent' ? 'الوكيل الذكي'
            : mode === 'coder' ? 'التطوير البرمجي'
            : mode === 'cways altra' ? 'الاستدلال المتقدم'
            : 'التفكير';

          sendSSE( controller, {
            type: 'summary',
            data: {
              messageId,
              summary: `اكتمل ${ modeLabel } بنجاح عبر ${ totalSteps } مراحل`,
            },
          } );

          // إرسال حدث الاكتمال
          sendSSE( controller, {
            type: 'complete',
            data: { messageId },
          } );

          controller.close();
        } catch ( error )
        {
          // إرسال خطأ
          sendSSE( controller, {
            type: 'error',
            data: {
              messageId,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          } );
          controller.close();
        }
      },
    } );

    return new Response( stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    } );
  } catch ( error )
  {
    console.error( 'Thinking API error:', error );
    return new Response( 'Internal server error', { status: 500 } );
  }
}
