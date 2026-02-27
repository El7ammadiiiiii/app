/**
 * 📊 Research Results Component
 * عرض نتائج البحث: ملخص + تفاصيل + مصادر
 */

"use client";

import React, { useState } from 'react';
import useTimeout from '@/hooks/useTimeout';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Link2, 
  ChevronDown, 
  ChevronUp,
  ExternalLink,
  Copy,
  Check,
  Clock,
  Search,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ResearchResult, Citation, DetailedSection } from '@/types/deepResearch';

// =============================================================================
// 🎯 Types
// =============================================================================

interface ResearchResultsProps {
  result: ResearchResult;
  onInsertToChat?: (content: string) => void;
  className?: string;
}

// =============================================================================
// 🧩 Sub Components
// =============================================================================

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
  };
  useTimeout(() => setCopied(false), copied ? 2000 : undefined, [copied]);

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-lg hover:bg-muted transition-colors"
      title="نسخ"
    >
      {copied ? (
        <Check className="w-4 h-4 text-green-500" />
      ) : (
        <Copy className="w-4 h-4 text-muted-foreground" />
      )}
    </button>
  );
};

const CitationCard: React.FC<{ citation: Citation }> = ({ citation }) => {
  return (
    <motion.a
      href={citation.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "block p-3 rounded-xl border border-border/50",
        "hover:border-primary/30 hover:bg-muted/30",
        "transition-all duration-200 group"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Citation number */}
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
          {citation.id}
        </span>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {citation.title}
          </h4>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {citation.snippet}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Globe className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {citation.domain}
            </span>
            <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mr-auto" />
          </div>
        </div>
      </div>
    </motion.a>
  );
};

const SectionCard: React.FC<{ 
  section: DetailedSection;
  index: number;
}> = ({ section, index }) => {
  const [isExpanded, setIsExpanded] = useState(index === 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="border border-border/50 rounded-xl overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center justify-between p-3",
          "hover:bg-muted/50 transition-colors"
        )}
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">{section.title}</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-3 pt-0 border-t border-border/50">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div 
                  className="text-sm text-foreground/80 whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: section.content.replace(/\n/g, '<br/>') }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// =============================================================================
// 🎯 Main Component
// =============================================================================

export const ResearchResults: React.FC<ResearchResultsProps> = ({
  result,
  onInsertToChat,
  className,
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'details' | 'sources'>('summary');

  return (
    <div className={cn("space-y-4", className)}>
      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Search className="w-3 h-3" />
          <span>{result.stats.pagesAnalyzed} صفحة</span>
        </div>
        <div className="flex items-center gap-1">
          <Link2 className="w-3 h-3" />
          <span>{result.citations.length} مرجع</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{(result.stats.totalTime / 1000).toFixed(1)}s</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-xl">
        {[
          { id: 'summary', label: 'الملخص', icon: FileText },
          { id: 'details', label: 'التفاصيل', icon: ChevronDown },
          { id: 'sources', label: 'المصادر', icon: Link2 },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === tab.id
                ? "theme-surface text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'summary' && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {/* Executive Summary */}
            <div className="relative p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
              <div className="absolute top-2 left-2 flex gap-1">
                <CopyButton text={result.executiveSummary} />
                {onInsertToChat && (
                  <button
                    onClick={() => onInsertToChat(result.executiveSummary)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                    title="إدراج في المحادثة"
                  >
                    <FileText className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div 
                  className="text-sm text-foreground whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ 
                    __html: result.executiveSummary.replace(/\n/g, '<br/>') 
                  }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'details' && (
          <motion.div
            key="details"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {result.detailedSections.map((section, index) => (
              <SectionCard key={section.id} section={section} index={index} />
            ))}
          </motion.div>
        )}

        {activeTab === 'sources' && (
          <motion.div
            key="sources"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-2"
          >
            {result.citations.map(citation => (
              <CitationCard key={citation.id} citation={citation} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ResearchResults;
