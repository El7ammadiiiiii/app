/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * REASONING SOURCES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * عرض قائمة المصادر المستخدمة في التفكير
 * 
 * @version 1.0.0
 */

'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { FileText, Globe, Database, MessageSquare, Cpu } from 'lucide-react';
import { ReasoningSource, SourceType } from '@/types/reasoning';
import { cn } from '@/lib/utils';

interface ReasoningSourcesProps {
  sources: ReasoningSource[];
  className?: string;
}

const SOURCE_ICONS: Record<SourceType, React.ReactNode> = {
  [SourceType.FILE]: <FileText className="w-3.5 h-3.5" />,
  [SourceType.WEB]: <Globe className="w-3.5 h-3.5" />,
  [SourceType.KNOWLEDGE]: <Database className="w-3.5 h-3.5" />,
  [SourceType.CONTEXT]: <MessageSquare className="w-3.5 h-3.5" />,
  [SourceType.API]: <Cpu className="w-3.5 h-3.5" />,
};

const SOURCE_COLORS: Record<SourceType, string> = {
  [SourceType.FILE]: 'text-blue-400',
  [SourceType.WEB]: 'text-green-400',
  [SourceType.KNOWLEDGE]: 'text-purple-400',
  [SourceType.CONTEXT]: 'text-yellow-400',
  [SourceType.API]: 'text-orange-400',
};

const ReasoningSources = memo(function ReasoningSources({
  sources,
  className,
}: ReasoningSourcesProps) {
  if (!sources || sources.length === 0) {
    return (
      <div className={cn('py-3', className)}>
        <h3 className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2 px-1">
          المصادر
        </h3>
        <p className="text-xs text-muted-foreground/50 text-center py-2">
          لا توجد مصادر
        </p>
      </div>
    );
  }

  return (
    <div className={cn('', className)}>
      <h3 className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mb-3 px-1">
        المصادر ({sources.length})
      </h3>

      <div className="space-y-1.5">
        {sources.map((source, index) => (
          <motion.div
            key={source.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded-lg',
              'hover:bg-white/[0.03] transition-colors',
              'group cursor-default'
            )}
          >
            {/* Icon */}
            <div className={cn('shrink-0', SOURCE_COLORS[source.type])}>
              {SOURCE_ICONS[source.type]}
            </div>

            {/* Name & Path */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground/80 truncate">
                {source.name}
              </p>
              {source.path && (
                <p className="text-[10px] text-muted-foreground/50 truncate">
                  {source.path}
                </p>
              )}
              {source.url && (
                <p className="text-[10px] text-muted-foreground/50 truncate">
                  {source.url}
                </p>
              )}
            </div>

            {/* Relevance Badge */}
            <div 
              className={cn(
                'shrink-0 px-1.5 py-0.5 rounded text-[9px] font-mono',
                source.relevance >= 90 ? 'bg-emerald-500/20 text-emerald-400' :
                source.relevance >= 70 ? 'bg-blue-500/20 text-blue-400' :
                'bg-gray-500/20 text-gray-400'
              )}
            >
              {source.relevance}%
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
});

export default ReasoningSources;
