/**
 * 🔍 Deep Research Panel
 * اللوحة الرئيسية للبحث التفصيلي
 */

"use client";

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Search, 
  Sparkles,
  Loader2,
  AlertCircle,
  ArrowRight,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDeepResearch } from '@/hooks/useDeepResearch';
import { ThinkingSteps } from './ThinkingSteps';
import { ResearchResults } from './ResearchResults';
import { QuotaIndicator } from './QuotaIndicator';

// =============================================================================
// 🎯 Types
// =============================================================================

interface DeepResearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertToChat?: (content: string, researchData?: any) => void;
  userId?: string;
  className?: string;
}

// =============================================================================
// 🎨 Status Messages
// =============================================================================

const STATUS_MESSAGES: Record<string, { label: string; icon: React.ReactNode }> = {
  'idle': { label: 'جاهز للبحث', icon: <Search className="w-4 h-4" /> },
  'transforming-query': { label: 'تحليل السؤال...', icon: <Loader2 className="w-4 h-4 animate-spin" /> },
  'searching': { label: 'جاري البحث...', icon: <Loader2 className="w-4 h-4 animate-spin" /> },
  'crawling': { label: 'قراءة المحتوى...', icon: <Loader2 className="w-4 h-4 animate-spin" /> },
  'synthesizing': { label: 'تجميع النتائج...', icon: <Loader2 className="w-4 h-4 animate-spin" /> },
  'completed': { label: 'اكتمل البحث!', icon: <Sparkles className="w-4 h-4 text-green-500" /> },
  'error': { label: 'حدث خطأ', icon: <AlertCircle className="w-4 h-4 text-red-500" /> },
  'cancelled': { label: 'تم الإلغاء', icon: <X className="w-4 h-4" /> },
};

// =============================================================================
// 🎯 Main Component
// =============================================================================

export const DeepResearchPanel: React.FC<DeepResearchPanelProps> = ({
  isOpen,
  onClose,
  onInsertToChat,
  userId = 'anonymous',
  className,
}) => {
  const {
    query,
    setQuery,
    status,
    progress,
    progressMessage,
    result,
    steps,
    quota,
    canSearch: canDoSearch,
    remainingSearches,
    timeUntilReset,
    error,
    startResearch,
    cancelResearch,
    resetState,
    refreshQuota,
  } = useDeepResearch(userId);

  // Refresh quota on open
  useEffect(() => {
    if (isOpen) {
      refreshQuota();
    }
  }, [isOpen, refreshQuota]);

  // Handle search
  const handleSearch = async () => {
    if (!query.trim() || !canDoSearch) return;
    await startResearch();
  };

  // Handle keyboard
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // Handle insert to chat
  const handleInsert = (content: string) => {
    if (onInsertToChat && result) {
      onInsertToChat(content, {
        researchId: result.id,
        query: result.query.originalQuery,
        executiveSummary: result.executiveSummary,
        sectionsCount: result.detailedSections.length,
        citationsCount: result.citations.length,
        result,
      });
      onClose();
    }
  };

  // Determine current thinking phase
  const currentPhase = steps.length > 0 ? steps[steps.length - 1].phase : undefined;
  const isSearching = ['transforming-query', 'searching', 'crawling', 'synthesizing'].includes(status);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "fixed inset-x-4 bottom-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2",
              "md:w-[600px] md:max-w-[90vw]",
              "max-h-[85vh] overflow-hidden",
              "bg-card border border-border rounded-2xl shadow-2xl",
              "z-50 flex flex-col",
              className
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">البحث التفصيلي</h2>
                  <p className="text-xs text-muted-foreground">
                    بحث عميق باستخدام AI Agents
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <QuotaIndicator
                  quota={quota}
                  remainingSearches={remainingSearches}
                  timeUntilReset={timeUntilReset}
                  compact
                />
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Search Input */}
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="اكتب سؤالك للبحث التفصيلي..."
                  disabled={isSearching}
                  className={cn(
                    "w-full px-4 py-3 pr-12",
                    "bg-muted/50 border border-border rounded-xl",
                    "text-foreground placeholder:text-muted-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "transition-all"
                  )}
                />
                <button
                  onClick={isSearching ? cancelResearch : handleSearch}
                  disabled={!query.trim() || (!canDoSearch && !isSearching)}
                  className={cn(
                    "absolute left-2 top-1/2 -translate-y-1/2",
                    "p-2 rounded-lg transition-all",
                    isSearching
                      ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                      : "bg-primary/10 text-primary hover:bg-primary/20",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {isSearching ? (
                    <X className="w-5 h-5" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Progress Bar */}
              {isSearching && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      {STATUS_MESSAGES[status]?.icon}
                      <span>{STATUS_MESSAGES[status]?.label}</span>
                    </div>
                    <span className="text-muted-foreground">{progress}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                      className="h-full bg-primary rounded-full"
                    />
                  </div>
                  {progressMessage && (
                    <p className="text-xs text-muted-foreground">{progressMessage}</p>
                  )}
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-500">خطأ في البحث</p>
                    <p className="text-xs text-red-500/70 mt-1">{error.message}</p>
                  </div>
                </div>
              )}

              {/* Thinking Steps */}
              {steps.length > 0 && (
                <ThinkingSteps
                  steps={steps}
                  currentPhase={isSearching ? currentPhase : undefined}
                />
              )}

              {/* Results */}
              {result && status === 'completed' && (
                <ResearchResults
                  result={result}
                  onInsertToChat={handleInsert}
                />
              )}

              {/* Empty State */}
              {status === 'idle' && !error && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Search className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">
                    ابدأ بحثك التفصيلي
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    اكتب سؤالك وسيقوم الـ Agent بتحليله، البحث في مصادر متعددة، واستخراج أهم المعلومات مع المراجع
                  </p>
                  
                  {/* Example queries */}
                  <div className="mt-6 space-y-2">
                    <p className="text-xs text-muted-foreground mb-2">أمثلة:</p>
                    {[
                      'ما هي أحدث تطورات الذكاء الاصطناعي في 2024؟',
                      'تحليل سوق العملات الرقمية',
                      'أفضل استراتيجيات التداول',
                    ].map((example) => (
                      <button
                        key={example}
                        onClick={() => setQuery(example)}
                        className={cn(
                          "block w-full text-right px-4 py-2 rounded-lg",
                          "bg-muted/50 hover:bg-muted text-sm text-muted-foreground",
                          "hover:text-foreground transition-colors"
                        )}
                      >
                        <ArrowRight className="inline w-3 h-3 ml-2" />
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer - Insert to Chat */}
            {result && status === 'completed' && onInsertToChat && (
              <div className="p-4 border-t border-border">
                <button
                  onClick={() => handleInsert(result.executiveSummary)}
                  className={cn(
                    "w-full py-3 px-4 rounded-xl",
                    "bg-primary text-primary-foreground",
                    "font-medium text-sm",
                    "hover:opacity-90 transition-opacity",
                    "flex items-center justify-center gap-2"
                  )}
                >
                  <Send className="w-4 h-4" />
                  إدراج في المحادثة
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default DeepResearchPanel;
