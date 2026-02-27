/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * REASONING SUMMARY
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * عرض ملخص مسار التفكير
 * 
 * @version 1.0.0
 */

'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Clock, Layers, CheckCircle, XCircle, Zap } from 'lucide-react';
import { TraceSummary, TaskComplexity, formatDuration } from '@/types/reasoning';
import { cn } from '@/lib/utils';

interface ReasoningSummaryProps {
  summary: TraceSummary;
  className?: string;
}

const COMPLEXITY_LABELS: Record<TaskComplexity, { label: string; color: string }> = {
  [TaskComplexity.QUICK]: { label: 'سريع', color: 'text-green-400' },
  [TaskComplexity.MEDIUM]: { label: 'متوسط', color: 'text-blue-400' },
  [TaskComplexity.HEAVY]: { label: 'ثقيل', color: 'text-orange-400' },
  [TaskComplexity.RESEARCH]: { label: 'بحثي', color: 'text-purple-400' },
};

const ReasoningSummary = memo(function ReasoningSummary({
  summary,
  className,
}: ReasoningSummaryProps) {
  const complexityConfig = COMPLEXITY_LABELS[summary.complexity];

  return (
    <div className={cn('', className)}>
      <h3 className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mb-3 px-1">
        ملخص
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total Duration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0 }}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg',
            'bg-white/[0.02] border border-white/[0.05]'
          )}
        >
          <Clock className="w-4 h-4 text-muted-foreground/60" />
          <div>
            <p className="text-[10px] text-muted-foreground/50">المدة</p>
            <p className="text-sm font-mono text-foreground/80">
              {formatDuration(summary.totalDuration)}
            </p>
          </div>
        </motion.div>

        {/* Steps Count */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg',
            'bg-white/[0.02] border border-white/[0.05]'
          )}
        >
          <Layers className="w-4 h-4 text-muted-foreground/60" />
          <div>
            <p className="text-[10px] text-muted-foreground/50">الخطوات</p>
            <p className="text-sm font-mono text-foreground/80">
              {summary.completedSteps}/{summary.totalSteps}
            </p>
          </div>
        </motion.div>

        {/* Success/Failure */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg',
            'bg-white/[0.02] border border-white/[0.05]'
          )}
        >
          {summary.failedSteps > 0 ? (
            <XCircle className="w-4 h-4 text-red-400" />
          ) : (
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          )}
          <div>
            <p className="text-[10px] text-muted-foreground/50">الحالة</p>
            <p className={cn(
              'text-sm font-medium',
              summary.failedSteps > 0 ? 'text-red-400' : 'text-emerald-400'
            )}>
              {summary.failedSteps > 0 ? `${summary.failedSteps} فشل` : 'نجاح'}
            </p>
          </div>
        </motion.div>

        {/* Complexity */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg',
            'bg-white/[0.02] border border-white/[0.05]'
          )}
        >
          <Zap className={cn('w-4 h-4', complexityConfig.color)} />
          <div>
            <p className="text-[10px] text-muted-foreground/50">التعقيد</p>
            <p className={cn('text-sm font-medium', complexityConfig.color)}>
              {complexityConfig.label}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Average Step Duration */}
      {summary.averageStepDuration > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-[10px] text-muted-foreground/40 text-center mt-3"
        >
          متوسط وقت الخطوة: {formatDuration(summary.averageStepDuration)}
        </motion.p>
      )}
    </div>
  );
});

export default ReasoningSummary;
