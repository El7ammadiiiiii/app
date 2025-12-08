"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Globe, Clock, Sparkles } from 'lucide-react';
import { WebSearchResult } from '@/types/webSearch';

interface SearchResultCardProps {
  result: WebSearchResult;
  index: number;
  onInsertToChat?: (text: string) => void;
}

export function SearchResultCard({ result, index, onInsertToChat }: SearchResultCardProps) {
  const handleClick = () => {
    window.open(result.url, '_blank', 'noopener,noreferrer');
  };

  const handleInsert = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onInsertToChat) {
      const text = `**[${result.title}](${result.url})**\n${result.snippet}`;
      onInsertToChat(text);
    }
  };

  // استخراج اسم الموقع من URL
  const getDomain = (url: string): string => {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      return domain;
    } catch {
      return url;
    }
  };

  // تنسيق التاريخ
  const formatDate = (dateString?: string): string | null => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={handleClick}
      className="group cursor-pointer rounded-xl border border-white/10 bg-white/5 p-4 
                 hover:border-blue-500/30 hover:bg-white/10 transition-all duration-200"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Favicon */}
          {result.favicon ? (
            <img 
              src={result.favicon} 
              alt="" 
              className="w-4 h-4 rounded-sm flex-shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
          )}
          
          {/* Domain */}
          <span className="text-xs text-gray-400 truncate">
            {getDomain(result.url)}
          </span>
          
          {/* Published Date */}
          {result.publishedDate && (
            <>
              <span className="text-gray-600">•</span>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                <span>{formatDate(result.publishedDate)}</span>
              </div>
            </>
          )}
        </div>

        {/* External Link */}
        <ExternalLink className="w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100 
                                 transition-opacity flex-shrink-0" />
      </div>

      {/* Title */}
      <h3 className="text-sm font-medium text-white mb-2 line-clamp-2 
                     group-hover:text-blue-400 transition-colors">
        {result.title}
      </h3>

      {/* Snippet */}
      <p className="text-xs text-gray-400 line-clamp-3 leading-relaxed">
        {result.snippet}
      </p>

      {/* Insert Button */}
      {onInsertToChat && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={handleInsert}
          className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                     bg-blue-500/10 text-blue-400 text-xs font-medium
                     hover:bg-blue-500/20 transition-colors opacity-0 group-hover:opacity-100"
        >
          <Sparkles className="w-3 h-3" />
          إضافة للمحادثة
        </motion.button>
      )}
    </motion.div>
  );
}

export default SearchResultCard;
