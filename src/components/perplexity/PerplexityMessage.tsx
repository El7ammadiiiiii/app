/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PERPLEXITY MESSAGE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * المكون الرئيسي الذي يجمع كل عناصر عرض Perplexity
 * يُستخدم لعرض نتائج البحث للـ Agent/Research/Search
 * 
 * @version 1.0.0
 */

'use client';

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Share2, RotateCcw } from 'lucide-react';
import { SearchPhase, PerplexitySearchState, AgentType, ToolType } from '@/types/perplexity';
import { useSearchByMessageId } from '@/store/perplexityStore';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import SearchingAnimation from './SearchingAnimation';
import SourcesStrip from './SourcesStrip';
import { ContentWithCitations } from './CitationLink';
import RelatedQuestions from './RelatedQuestions';
import './perplexity.css';

interface PerplexityMessageProps {
  messageId: string;
  onAskRelated?: (question: string) => void;
  onRetry?: () => void;
  className?: string;
}

const PerplexityMessage = memo(function PerplexityMessage({
  messageId,
  onAskRelated,
  onRetry,
  className,
}: PerplexityMessageProps) {
  const searchState = useSearchByMessageId(messageId);
  const { t, isRTL } = useLocale();
  
  // If no search state, don't render
  if (!searchState) return null;
  
  const {
    phase,
    progress,
    sources,
    content,
    relatedQuestions,
    error,
  } = searchState;
  
  const isSearching = phase !== SearchPhase.COMPLETE && phase !== SearchPhase.ERROR && phase !== SearchPhase.IDLE;
  const isComplete = phase === SearchPhase.COMPLETE;
  const isError = phase === SearchPhase.ERROR;
  
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
  };
  
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Search Result',
        text: content,
      });
    }
  };
  
  return (
    <div 
      className={cn('w-full', className)}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <AnimatePresence mode="wait">
        {/* Searching Animation */}
        {isSearching && (
          <SearchingAnimation
            key="searching"
            phase={phase}
            progress={progress}
            sourcesCount={sources.length}
            className="mb-4"
          />
        )}
      </AnimatePresence>
      
      {/* Results */}
      {(isComplete || (sources.length > 0 && content)) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="perplexity-glass p-5"
        >
          {/* Sources Strip */}
          {sources.length > 0 && (
            <SourcesStrip
              sources={sources}
              maxVisible={6}
              className="mb-5"
            />
          )}
          
          {/* Content with Citations */}
          {content && (
            <ContentWithCitations
              content={content}
              sources={sources}
              className="mb-4"
            />
          )}
          
          {/* Actions Bar */}
          {isComplete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-2 pt-4 border-t border-white/10"
            >
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/5 transition-all"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{t.copyAnswer}</span>
              </button>
              
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/5 transition-all"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{t.shareAnswer}</span>
              </button>
              
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/5 transition-all ms-auto"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t.retry}</span>
                </button>
              )}
            </motion.div>
          )}
          
          {/* Related Questions */}
          {isComplete && relatedQuestions.length > 0 && (
            <RelatedQuestions
              questions={relatedQuestions}
              onQuestionClick={onAskRelated}
            />
          )}
        </motion.div>
      )}
      
      {/* Error State */}
      {isError && error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="perplexity-glass p-5 border-red-500/20"
        >
          <div className="flex items-center gap-3 text-red-400">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-medium">{t.error}</p>
              <p className="text-sm text-red-400/70 mt-1">{error.message}</p>
            </div>
          </div>
          
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{t.retry}</span>
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
});

export default PerplexityMessage;
