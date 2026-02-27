/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * REASONING LIVE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * فقاعة عرض التفكير الحية أثناء المعالجة
 * تظهر أثناء تشغيل الـ trace وتختفي عند الاكتمال
 * 
 * @version 1.0.0
 */

'use client';

import { memo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import InfinityLogo from '../ui/InfinityLogo';
import { useTrace } from '@/store/reasoningStore';
import { StepStatus } from '@/types/reasoning';
import { cn } from '@/lib/utils';

interface ReasoningLiveProps {
  messageId: string;
  className?: string;
}

const ReasoningLive = memo(function ReasoningLive({
  messageId,
  className,
}: ReasoningLiveProps) {
  const trace = useTrace(messageId);
  const [elapsedTime, setElapsedTime] = useState(0);

  // تحديث الوقت المنقضي كل ثانية
  useEffect(() => {
    if (!trace) return;
    
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - trace.startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [trace]);

  if (!trace) return null;

  // الحصول على الخطوة الحالية (آخر خطوة نشطة)
  const currentStep = trace.steps.find(s => s.status === StepStatus.RUNNING) 
    || trace.steps[trace.steps.length - 1];

  const currentTitle = currentStep?.title || 'جاري التفكير...';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        'flex items-center gap-3',
        'px-4 py-3 rounded-2xl',
        'bg-gradient-to-r from-white/[0.05] to-white/[0.02]',
        'border border-white/[0.08]',
        'backdrop-blur-xl',
        'shadow-lg shadow-black/10',
        className
      )}
    >
      {/* Animated Infinity Logo */}
      <InfinityLogo 
        size={32} 
        speed={0.015} 
        isAnimating={true} 
      />

      {/* Live Content */}
      <div className="flex-1 min-w-0">
        {/* Current Step Title */}
        <motion.p
          key={currentStep?.id}
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="text-sm font-medium text-foreground/90 truncate"
        >
          {currentTitle}
        </motion.p>

        {/* Progress Dots */}
        <div className="flex items-center gap-1.5 mt-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary/60"
              animate={{
                opacity: [0.3, 1, 0.3],
                scale: [0.8, 1, 0.8],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeInOut',
              }}
            />
          ))}
          <span className="text-[10px] text-muted-foreground/50 mr-2">
            {trace.steps.length} خطوات
          </span>
        </div>
      </div>

      {/* Elapsed Time */}
      <div className="text-[11px] font-mono text-muted-foreground/60">
        {elapsedTime}s
      </div>
    </motion.div>
  );
});

export default ReasoningLive;
