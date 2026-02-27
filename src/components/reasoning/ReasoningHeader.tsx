/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * REASONING HEADER
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * شريط عنوان يظهر فوق الرد مباشرة بعد اكتمال المعالجة
 * يحتوي على اللوجو وزر لفتح/إغلاق لوحة التفاصيل
 * 
 * @version 1.0.0
 */

'use client';

import { memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Clock, Layers, FileText, Play } from 'lucide-react';
import InfinityLogo from '../ui/InfinityLogo';
import { useReasoningStore, useTrace, useDisplayState, useTraceSummary } from '@/store/reasoningStore';
import { cn } from '@/lib/utils';

const TraceStatus = {
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

interface ReasoningHeaderProps {
  messageId: string;
  className?: string;
}

const ReasoningHeader = memo(function ReasoningHeader({
  messageId,
  className,
}: ReasoningHeaderProps) {
  const trace = useTrace(messageId);
  const displayState = useDisplayState(messageId);
  const summary = useTraceSummary(messageId);
  const { togglePanel, isReplayAvailable } = useReasoningStore();

  const handleToggle = useCallback(() => {
    togglePanel(messageId);
  }, [togglePanel, messageId]);

  // لا تظهر إذا لم يكتمل
  if (!trace || trace.status === TraceStatus.RUNNING) {
    return null;
  }

  const isOpen = displayState?.isPanelOpen ?? false;
  const isCompleted = trace.status === TraceStatus.COMPLETED;
  const isFailed = trace.status === TraceStatus.FAILED;

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className={cn(
        'group flex items-center justify-between',
        'px-3 py-2 rounded-xl cursor-pointer',
        'bg-gradient-to-r from-white/[0.03] to-transparent',
        'border border-white/[0.06]',
        'hover:bg-white/[0.05] hover:border-white/[0.1]',
        'transition-all duration-300',
        className
      )}
      onClick={handleToggle}
    >
      {/* Left Section - Logo & Title */}
      <div className="flex items-center gap-2.5">
        {/* Infinity Logo - ثابت بعد الاكتمال */}
        <InfinityLogo 
          size={28} 
          speed={isOpen ? 0.008 : 0.004} 
          isAnimating={true} 
        />

        {/* Toggle Arrow */}
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-muted-foreground/60"
        >
          <ChevronDown className="w-4 h-4" />
        </motion.div>

        {/* Title */}
        <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
          عرض طريقة التفكير
        </span>

        {/* Status Badge */}
        {isFailed && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-red-500/10 text-red-400 border border-red-500/20">
            فشل
          </span>
        )}
      </div>

      {/* Right Section - Summary */}
      <AnimatePresence mode="wait">
        {!isOpen && summary && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="flex items-center gap-3 text-[11px] text-muted-foreground/70"
          >
            {/* Steps Count */}
            <div className="flex items-center gap-1">
              <Layers className="w-3 h-3" />
              <span>{summary.completedSteps} خطوات</span>
            </div>

            {/* Sources Count */}
            {summary.sourcesCount > 0 && (
              <div className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                <span>{summary.sourcesCount} مصادر</span>
              </div>
            )}

            {/* Duration */}
            {trace.endTime && trace.startTime && (
              <div className="flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3" />
                <span className={cn(
                  isCompleted ? 'text-emerald-400/80' : 'text-red-400/80'
                )}>
                  {(trace.endTime - trace.startTime) >= 1000 
                    ? `${((trace.endTime - trace.startTime) / 1000).toFixed(1)}s` 
                    : `${trace.endTime - trace.startTime}ms`}
                </span>
              </div>
            )}

            {/* Replay Button (معطل) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                // TODO: تفعيل لاحقاً
              }}
              disabled={!isReplayAvailable}
              className={cn(
                'p-1 rounded-md transition-all',
                isReplayAvailable 
                  ? 'hover:bg-white/10 text-muted-foreground hover:text-foreground' 
                  : 'text-muted-foreground/30 cursor-not-allowed'
              )}
              title={isReplayAvailable ? 'إعادة العرض' : 'قريباً'}
            >
              <Play className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

export default ReasoningHeader;
