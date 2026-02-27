/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * REASONING PANEL
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * اللوحة الكاملة لعرض مسار التفكير
 * تحتوي على: Timeline + Sources + Summary
 * 
 * @version 1.0.0
 */

'use client';

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReasoningStep from '@/components/reasoning/ReasoningStep';
import ReasoningSources from '@/components/reasoning/ReasoningSources';
import ReasoningSummary from '@/components/reasoning/ReasoningSummary';
import { useTrace, useDisplayState, useTraceSummary } from '@/store/reasoningStore';
import { cn } from '@/lib/utils';
import type { TraceSummary, TaskComplexity } from '@/types/reasoning';

// Helper to calculate summary if not provided in store
const calculateSummary = (trace: any): TraceSummary | null => {
  if (!trace || !trace.steps.length) return null;
  const lastStep = trace.steps[trace.steps.length - 1];
  const totalSteps = trace.steps.length;
  const completedSteps = trace.steps.filter((step: any) => step.status === 'completed').length;
  const failedSteps = trace.steps.filter((step: any) => step.status === 'error').length;
  const totalDuration = trace.steps.reduce((acc: number, step: any) => acc + (step.duration || 0), 0);
  const sourcesCount = trace.sources?.length || 0;
  
  const complexity = (totalSteps <= 3 ? 'low' : totalSteps <= 6 ? 'medium' : 'high') as TaskComplexity;
  
  return {
    totalDuration,
    totalSteps,
    completedSteps,
    failedSteps,
    averageStepDuration: totalSteps > 0 ? totalDuration / totalSteps : 0,
    complexity,
    sourcesCount,
  };
};

interface ReasoningPanelProps {
  messageId: string;
  className?: string;
}

const ReasoningPanel = memo(function ReasoningPanel({
  messageId,
  className,
}: ReasoningPanelProps) {
  const trace = useTrace(messageId);
  const displayState = useDisplayState(messageId);
  const summary = useTraceSummary(messageId);
  
  const isPanelOpen = displayState?.isPanelOpen ?? false;

  if (!trace || !isPanelOpen) return null;

  const actualSummary = summary || calculateSummary(trace);

  return (
    <AnimatePresence mode="wait">
      {isPanelOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0, marginBottom: 0 }}
          animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ 
            duration: 0.3, 
            ease: [0.4, 0, 0.2, 1],
            height: { duration: 0.4 },
          }}
          className={cn(
            'overflow-hidden rounded-2xl',
            'bg-gradient-to-b from-white/[0.03] to-transparent',
            'border border-white/[0.08]',
            'backdrop-blur-xl',
            'shadow-xl shadow-black/20',
            className
          )}
        >
          <div className="p-4 space-y-4">
            {/* Timeline Section */}
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mb-3 px-1">
                مسار التفكير
              </h3>
              
              <div className="space-y-0.5">
                {trace.steps.map((step, index) => (
                  <ReasoningStep
                    key={step.id}
                    step={step}
                    messageId={messageId}
                    index={index}
                    isLast={index === trace.steps.length - 1}
                  />
                ))}

                {/* Empty State */}
                {trace.steps.length === 0 && (
                  <div className="py-6 text-center">
                    <p className="text-xs text-muted-foreground/50">
                      لا توجد خطوات مسجلة
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {/* Sources Section */}
            <section>
              <ReasoningSources sources={trace.sources} />
            </section>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {/* Summary Section */}
            {actualSummary && (
              <section>
                <ReasoningSummary summary={actualSummary} />
              </section>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default ReasoningPanel;
