/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SEARCHING ANIMATION
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * مؤشر البحث المتحرك بتصميم Glassmorphism
 * يعرض: InfinityLogo + نص المرحلة + شريط التقدم
 * 
 * @version 2.0.0
 */

'use client';

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchPhase } from '@/types/perplexity';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import InfinityLogo from '@/components/ui/InfinityLogo';

interface SearchingAnimationProps {
  phase: SearchPhase;
  progress: number;
  sourcesCount?: number;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const SearchingAnimation = memo(function SearchingAnimation({
  phase,
  progress,
  sourcesCount = 0,
  className,
}: SearchingAnimationProps) {
  const { t, formatT, isRTL } = useLocale();
  
  // Get phase text
  const getPhaseText = () => {
    switch (phase) {
      case SearchPhase.SEARCHING:
        return t.searching;
      case SearchPhase.READING:
        return formatT(t.readingSources, { count: sourcesCount });
      case SearchPhase.ANALYZING:
        return t.analyzing;
      case SearchPhase.GENERATING:
        return t.generating;
      default:
        return t.searching;
    }
  };
  
  // Don't show if complete or error
  if (phase === SearchPhase.COMPLETE || phase === SearchPhase.ERROR || phase === SearchPhase.IDLE) {
    return null;
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'perplexity-glass perplexity-searching p-4',
        className
      )}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="flex items-center gap-3 mb-3">
        {/* Infinity Logo */}
        <div className="perplexity-infinity-logo">
          <InfinityLogo size={32} />
        </div>
        
        {/* Phase Text */}
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ opacity: 0, x: isRTL ? 10 : -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isRTL ? -10 : 10 }}
            transition={{ duration: 0.2 }}
            className="flex-1"
          >
            <p className="text-sm text-white/80 font-medium">
              {getPhaseText()}
            </p>
          </motion.div>
        </AnimatePresence>
        
        {/* Progress Percentage */}
        <span className="text-xs text-white/50 font-mono">
          {progress}%
        </span>
      </div>
      
      {/* Progress Bar */}
      <div className="perplexity-progress-bar">
        <motion.div
          className="perplexity-progress-fill"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </motion.div>
  );
});

export default SearchingAnimation;
