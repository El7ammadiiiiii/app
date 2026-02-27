/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SOURCE PREVIEW
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * بطاقة معاينة المصدر عند الـ hover
 * 
 * @version 1.0.0
 */

'use client';

import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Calendar, Globe } from 'lucide-react';
import { PerplexitySource, SOURCE_TYPE_ICONS, SOURCE_TYPE_COLORS } from '@/types/perplexity';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface SourcePreviewProps {
  source: PerplexitySource | null;
  position?: { x: number; y: number };
  className?: string;
}

const SourcePreview = memo(function SourcePreview({
  source,
  position,
  className,
}: SourcePreviewProps) {
  const { t, isRTL } = useLocale();
  const [imgError, setImgError] = useState(false);
  
  if (!source) return null;
  
  const colors = SOURCE_TYPE_COLORS[source.type];
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'perplexity-source-preview',
          className
        )}
        style={position ? {
          left: position.x,
          top: position.y,
        } : undefined}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          {/* Favicon */}
          {!imgError ? (
            <img
              src={source.favicon}
              alt=""
              className="w-8 h-8 rounded-lg bg-white/10"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center text-lg',
              colors.bg
            )}>
              {SOURCE_TYPE_ICONS[source.type]}
            </div>
          )}
          
          {/* Title & Domain */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-white line-clamp-2 mb-1">
              {source.title}
            </h4>
            <div className="flex items-center gap-2 text-xs text-white/50">
              <Globe className="w-3 h-3" />
              <span className="truncate">{source.domain}</span>
            </div>
          </div>
          
          {/* Index Badge */}
          <div className={cn(
            'px-2 py-1 rounded text-xs font-bold',
            colors.bg,
            colors.text
          )}>
            [{source.index}]
          </div>
        </div>
        
        {/* Snippet */}
        {source.snippet && (
          <p className="text-xs text-white/70 leading-relaxed mb-3 line-clamp-3">
            {source.snippet}
          </p>
        )}
        
        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          {/* Published Date */}
          {source.publishedDate && (
            <div className="flex items-center gap-1 text-xs text-white/40">
              <Calendar className="w-3 h-3" />
              <span>{source.publishedDate}</span>
            </div>
          )}
          
          {/* Relevance */}
          <div className="flex items-center gap-2">
            <div className="h-1 w-16 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                style={{ width: `${source.relevance}%` }}
              />
            </div>
            <span className="text-xs text-white/40">{source.relevance}%</span>
          </div>
          
          {/* View Link */}
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            <span>{t.viewSource}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

export default SourcePreview;
