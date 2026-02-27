/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * THINKING TOGGLE - Expand/Collapse Button
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use client';
import { useThinkingStore, useThinkingSession } from '@/store/thinkingStore';

interface ThinkingToggleProps
{
  messageId: string;
}

export function ThinkingToggle ( { messageId }: ThinkingToggleProps )
{
  const session = useThinkingSession( messageId );
  const toggleExpanded = useThinkingStore( ( state ) => state.toggleExpanded );

  if ( !session ) return null;

  return (
    <button
      onClick={ () => toggleExpanded( messageId ) }
      className="thinking-toggle-btn"
      aria-label={ session.summary.isExpanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل' }
    >
      <span className="thinking-toggle-text">
        { session.summary.isExpanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل' }
      </span>
    </button>
  );
}
