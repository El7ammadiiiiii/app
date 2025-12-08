"use client";

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe, 
  X, 
  Loader2, 
  Search,
  Sparkles,
  ChevronDown,
  ChevronUp,
  MessageSquarePlus,
  AlertCircle,
  RefreshCw,
  HelpCircle
} from 'lucide-react';
import { useWebSearch } from '@/hooks/useWebSearch';
import { SearchInput } from './SearchInput';
import { SearchResultCard } from './SearchResultCard';
import { WebSearchResult, WebSearchStatus } from '@/types/webSearch';

interface WebSearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertToChat?: (text: string) => void;
}

type SearchMode = 'smart' | 'quick' | 'news';

export function WebSearchPanel({ isOpen, onClose, onInsertToChat }: WebSearchPanelProps) {
  const {
    query,
    status,
    results,
    answer,
    relatedQuestions,
    error,
    search,
    searchQuick,
    searchForNews,
    clearResults,
    setQuery
  } = useWebSearch();

  const [showAnswer, setShowAnswer] = useState(true);
  const [showRelated, setShowRelated] = useState(false);

  // معالجة البحث
  const handleSearch = useCallback((searchQuery: string, mode: SearchMode) => {
    switch (mode) {
      case 'quick':
        searchQuick(searchQuery);
        break;
      case 'news':
        searchForNews(searchQuery);
        break;
      case 'smart':
      default:
        search(searchQuery);
        break;
    }
  }, [search, searchQuick, searchForNews]);

  // البحث بسؤال ذي صلة
  const handleRelatedQuestion = (question: string) => {
    setQuery(question);
    search(question);
  };

  // إدراج الإجابة في المحادثة
  const handleInsertAnswer = () => {
    if (answer && onInsertToChat) {
      onInsertToChat(`**نتيجة البحث عن "${query}":**\n\n${answer}`);
    }
  };

  // تحديد ما إذا كان البحث جارياً
  const isSearching = status === 'searching' || status === 'analyzing';

  // رسالة الحالة
  const getStatusMessage = (): string => {
    switch (status) {
      case 'analyzing':
        return 'جاري تحليل الاستعلام...';
      case 'searching':
        return 'جاري البحث في الويب...';
      case 'filtering':
        return 'جاري تصفية النتائج...';
      case 'generating':
        return 'جاري إنشاء الإجابة...';
      default:
        return '';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 300 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed inset-y-0 right-0 w-full sm:w-[450px] md:w-[500px] z-50
                   bg-gray-900/95 backdrop-blur-xl border-l border-white/10
                   flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Globe className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">البحث في الويب</h2>
              <p className="text-xs text-gray-400">بحث ذكي بالذكاء الاصطناعي</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-white/10">
          <SearchInput
            value={query}
            onChange={setQuery}
            onSearch={handleSearch}
            isSearching={isSearching}
            placeholder="اكتب سؤالك أو موضوع البحث..."
          />
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Loading State */}
          {isSearching && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 space-y-4"
            >
              <div className="relative">
                <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
                <Sparkles className="w-4 h-4 text-yellow-400 absolute -top-1 -right-1 animate-pulse" />
              </div>
              <p className="text-gray-400 text-sm">{getStatusMessage()}</p>
            </motion.div>
          )}

          {/* Error State */}
          {status === 'error' && error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-red-500/30 bg-red-500/10 p-4"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-red-300 font-medium mb-1">حدث خطأ</p>
                  <p className="text-red-300/70 text-sm">{error}</p>
                </div>
                <button
                  onClick={() => handleSearch(query, 'smart')}
                  className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                  title="إعادة المحاولة"
                >
                  <RefreshCw className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </motion.div>
          )}

          {/* AI Answer */}
          {answer && status === 'completed' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-blue-500/30 bg-blue-500/10 overflow-hidden"
            >
              <button
                onClick={() => setShowAnswer(!showAnswer)}
                className="w-full flex items-center justify-between p-4 hover:bg-blue-500/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                  <span className="font-medium text-blue-300">إجابة الذكاء الاصطناعي</span>
                </div>
                {showAnswer ? (
                  <ChevronUp className="w-5 h-5 text-blue-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-blue-400" />
                )}
              </button>
              
              <AnimatePresence>
                {showAnswer && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-4 pb-4"
                  >
                    <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                      {answer}
                    </p>
                    
                    {onInsertToChat && (
                      <button
                        onClick={handleInsertAnswer}
                        className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg
                                   bg-blue-500/20 hover:bg-blue-500/30 text-blue-300
                                   text-sm transition-colors"
                      >
                        <MessageSquarePlus className="w-4 h-4" />
                        <span>إدراج في المحادثة</span>
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Search Results */}
          {results.length > 0 && status === 'completed' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-300">
                  نتائج البحث ({results.length})
                </h3>
                <button
                  onClick={clearResults}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  مسح
                </button>
              </div>
              
              <div className="space-y-2">
                {results.map((result: WebSearchResult, index: number) => (
                  <SearchResultCard
                    key={result.id || index}
                    result={result}
                    index={index}
                    onInsertToChat={onInsertToChat}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Related Questions */}
          {relatedQuestions.length > 0 && status === 'completed' && (
            <div className="space-y-3">
              <button
                onClick={() => setShowRelated(!showRelated)}
                className="w-full flex items-center justify-between p-3 rounded-xl
                           border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-gray-300">
                    أسئلة ذات صلة ({relatedQuestions.length})
                  </span>
                </div>
                {showRelated ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              
              <AnimatePresence>
                {showRelated && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    {relatedQuestions.map((question: string, index: number) => (
                      <motion.button
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleRelatedQuestion(question)}
                        className="w-full text-right p-3 rounded-lg border border-white/10 
                                   bg-white/5 hover:bg-white/10 text-sm text-gray-300
                                   transition-colors flex items-center gap-2"
                      >
                        <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <span>{question}</span>
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Empty State */}
          {status === 'idle' && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 rounded-full bg-blue-500/10 mb-4">
                <Search className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-300 mb-2">
                ابحث في الويب
              </h3>
              <p className="text-sm text-gray-500 max-w-xs">
                اكتب سؤالك أو موضوع البحث وسيقوم الذكاء الاصطناعي بالبحث وتلخيص النتائج لك
              </p>
              
              {/* Quick Suggestions */}
              <div className="mt-6 space-y-2 w-full max-w-xs">
                <p className="text-xs text-gray-600 mb-2">اقتراحات:</p>
                {[
                  'ما هي آخر أخبار العملات الرقمية؟',
                  'شرح تقنية البلوكتشين',
                  'أفضل استراتيجيات التداول'
                ].map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setQuery(suggestion);
                      search(suggestion);
                    }}
                    className="w-full text-right p-3 rounded-lg border border-white/10
                               bg-white/5 hover:bg-white/10 text-sm text-gray-400
                               transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default WebSearchPanel;
