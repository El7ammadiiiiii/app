/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * REASONING DISPLAY
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * المكون الرئيسي الذي يجمع كل عناصر عرض التفكير
 * يُستخدم فوق فقاعة رد الـ Assistant مباشرة
 * 
 * @version 1.0.0
 */

'use client';

import { memo } from 'react';
import { AnimatePresence } from 'framer-motion';
import ReasoningLive from '@/components/reasoning/ReasoningLive';
import ReasoningHeader from '@/components/reasoning/ReasoningHeader';
import ReasoningPanel from '@/components/reasoning/ReasoningPanel';
import { useTrace, useDisplayState } from '@/store/reasoningStore';
import { TraceStatus } from '@/types/reasoning';
import { cn } from '@/lib/utils';

interface ReasoningDisplayProps {
  messageId: string;
  className?: string;
}

const ReasoningDisplay = memo(function ReasoningDisplay({
  messageId,
  className,
}: ReasoningDisplayProps) {
  const trace = useTrace(messageId);
  const displayState = useDisplayState(messageId);

  // لا تظهر شيء إذا لم يكن هناك trace
  if (!trace) return null;

  const isRunning = trace.status === TraceStatus.RUNNING;
  const isComplete = trace.status === TraceStatus.COMPLETED || 
                     trace.status === TraceStatus.FAILED ||
                     trace.status === TraceStatus.CANCELLED;
  
  // Default values إذا لم يكن هناك displayState
  const isLiveVisible = displayState?.isLiveVisible ?? true;
  const isPanelOpen = displayState?.isPanelOpen ?? false;

  return (
    <div className={cn('w-full', className)}>
      <AnimatePresence mode="wait">
        {/* Live Bubble - أثناء المعالجة */}
        {isRunning && isLiveVisible && (
          <ReasoningLive 
            key="live" 
            messageId={messageId} 
            className="mb-2"
          />
        )}
      </AnimatePresence>

      {/* Header - بعد الاكتمال */}
      {isComplete && (
        <ReasoningHeader 
          messageId={messageId} 
          className="mb-2"
        />
      )}

      {/* Panel - عند الفتح */}
      <ReasoningPanel messageId={messageId} />
    </div>
  );
});

export default ReasoningDisplay;
