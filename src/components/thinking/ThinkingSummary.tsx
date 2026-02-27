/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * THINKING SUMMARY - Steps Display
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useThinkingSession } from '@/store/thinkingStore';
import { PHASE_TEXTS, getModePhaseText, type ThinkingMode } from '@/types/thinking';

interface ThinkingSummaryProps
{
  messageId: string;
  mode?: ThinkingMode;
}

export function ThinkingSummary ( { messageId, mode }: ThinkingSummaryProps )
{
  const session = useThinkingSession( messageId );

  if ( !session || !session.summary.isExpanded ) return null;

  const { steps, isComplete, error } = session.summary;

  return (
    <div className={ `thinking-summary ${ session.summary.isExpanded ? '' : 'collapsed' }` }>
      {/* Steps */ }
      <div className="space-y-2">
        { steps.map( ( step ) => (
          <div key={ step.id } className="thinking-step">
            <div className="thinking-step-content">
              <div className="thinking-step-phase">
                { mode ? getModePhaseText( mode, step.phase ) : PHASE_TEXTS[ step.phase ] }
              </div>
              <div className="thinking-step-text">
                { step.content }
              </div>
              { step.duration && (
                <div className="thinking-step-duration">
                  المدة { Math.max( 1, Math.round( step.duration / 1000 ) ) } ثوان
                </div>
              ) }
            </div>
          </div>
        ) ) }
      </div>

      {/* Complete State */ }
      { isComplete && !error && (
        <div className="thinking-complete">
          <span className="thinking-complete-text">
            اكتمل التفكير
          </span>
          <span className="thinking-complete-count">
            عدد المراحل { steps.length }
          </span>
        </div>
      ) }

      {/* Error State */ }
      { error && (
        <div className="thinking-error">
          <span className="thinking-error-text">
            حدث خطا { error }
          </span>
        </div>
      ) }
    </div>
  );
}
