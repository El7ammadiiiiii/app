/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SOURCE CARD
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * كارت مصدر واحد بتصميم Glassmorphism
 * 
 * @version 1.0.0
 */

'use client';

import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { PerplexitySource, SOURCE_TYPE_ICONS } from '@/types/perplexity';
import { cn } from '@/lib/utils';

interface SourceCardProps {
  source: PerplexitySource;
  onClick?: () => void;
  onHover?: (source: PerplexitySource | null) => void;
  className?: string;
  staggerIndex?: number;
}

const SourceCard = memo(function SourceCard({
  source,
  onClick,
  onHover,
  className,
  staggerIndex = 0,
}: SourceCardProps) {
  const [imgError, setImgError] = useState(false);
  
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      window.open(source.url, '_blank', 'noopener,noreferrer');
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.3, 
        delay: staggerIndex * 0.05,
        ease: [0.4, 0, 0.2, 1]
      }}
      className={cn(
        'perplexity-glass-card perplexity-source-card',
        className
      )}
      onClick={handleClick}
      onMouseEnter={() => onHover?.(source)}
      onMouseLeave={() => onHover?.(null)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Glow Effect */}
      <div className="source-glow" />
      
      {/* Index Badge */}
      <div className="perplexity-source-index">
        {source.index}
      </div>
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center gap-2">
        {/* Favicon or Type Icon */}
        {!imgError ? (
          <img
            src={source.favicon}
            alt=""
            className="perplexity-source-favicon"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-xl">
            {SOURCE_TYPE_ICONS[source.type]}
          </span>
        )}
        
        {/* Domain */}
        <span className="text-xs text-white/70 font-medium truncate w-full">
          {source.domain}
        </span>
        
        {/* Title Preview */}
        <span className="text-[10px] text-white/50 line-clamp-2 leading-tight">
          {source.title}
        </span>
      </div>
      
      {/* External Link Icon on Hover */}
      <motion.div
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        className="absolute bottom-2 right-2 text-white/30"
      >
        <ExternalLink className="w-3 h-3" />
      </motion.div>
    </motion.div>
  );
});

export default SourceCard;
