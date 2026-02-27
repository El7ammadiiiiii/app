/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SOURCES STRIP
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * شريط المصادر الأفقي مع scroll
 * يعرض 6 مصادر + زر "+N more"
 * 
 * @version 1.0.0
 */

'use client';

import { memo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PerplexitySource } from '@/types/perplexity';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import SourceCard from './SourceCard';
import SourcePreview from './SourcePreview';

interface SourcesStripProps {
  sources: PerplexitySource[];
  maxVisible?: number;
  className?: string;
  onSourceClick?: (source: PerplexitySource) => void;
}

const SourcesStrip = memo(function SourcesStrip({
  sources,
  maxVisible = 6,
  className,
  onSourceClick,
}: SourcesStripProps) {
  const { t, isRTL } = useLocale();
  const [showAll, setShowAll] = useState(false);
  const [hoveredSource, setHoveredSource] = useState<PerplexitySource | null>(null);
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });
  const stripRef = useRef<HTMLDivElement>(null);
  
  if (!sources.length) return null;
  
  const visibleSources = showAll ? sources : sources.slice(0, maxVisible);
  const hiddenCount = sources.length - maxVisible;
  
  const handleScroll = (direction: 'left' | 'right') => {
    if (!stripRef.current) return;
    const scrollAmount = 260; // ~2 cards width
    const newScrollLeft = stripRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
    stripRef.current.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
  };
  
  const handleSourceHover = (source: PerplexitySource | null, event?: React.MouseEvent) => {
    setHoveredSource(source);
    if (source && event) {
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      setPreviewPosition({
        x: rect.left + rect.width / 2 - 160, // Center the preview
        y: rect.bottom + 10,
      });
    }
  };
  
  return (
    <div className={cn('relative', className)} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Section Header */}
      <div className="perplexity-section-header">
        <span className="perplexity-section-title">{t.sources}</span>
        <span className="text-xs text-white/40">
          {sources.length} {sources.length === 1 ? t.source : t.sources.toLowerCase()}
        </span>
      </div>
      
      {/* Sources Container */}
      <div className="relative group">
        {/* Scroll Left Button */}
        <motion.button
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          className={cn(
            'absolute top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full',
            'glass-lite glass-lite--interactive',
            'flex items-center justify-center text-foreground/70 hover:text-foreground',
            'transition-all opacity-0 group-hover:opacity-100',
            isRTL ? '-right-3' : '-left-3'
          )}
          onClick={() => handleScroll(isRTL ? 'right' : 'left')}
        >
          {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </motion.button>
        
        {/* Sources Strip */}
        <div 
          ref={stripRef}
          className="perplexity-sources-strip"
        >
          <AnimatePresence>
            {visibleSources.map((source, index) => (
              <SourceCard
                key={source.id}
                source={source}
                staggerIndex={index}
                onClick={() => onSourceClick?.(source)}
                onHover={(s) => handleSourceHover(s)}
              />
            ))}
          </AnimatePresence>
          
          {/* More Sources Button */}
          {!showAll && hiddenCount > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: maxVisible * 0.05 }}
              className="perplexity-glass-card perplexity-more-sources"
              onClick={() => setShowAll(true)}
            >
              +{hiddenCount}
            </motion.button>
          )}
        </div>
        
        {/* Scroll Right Button */}
        <motion.button
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          className={cn(
            'absolute top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full',
            'glass-lite glass-lite--interactive',
            'flex items-center justify-center text-foreground/70 hover:text-foreground',
            'transition-all opacity-0 group-hover:opacity-100',
            isRTL ? '-left-3' : '-right-3'
          )}
          onClick={() => handleScroll(isRTL ? 'left' : 'right')}
        >
          {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </motion.button>
      </div>
      
      {/* Source Preview Tooltip */}
      {hoveredSource && (
        <div className="fixed z-50" style={{ left: previewPosition.x, top: previewPosition.y }}>
          <SourcePreview source={hoveredSource} />
        </div>
      )}
    </div>
  );
});

export default SourcesStrip;
