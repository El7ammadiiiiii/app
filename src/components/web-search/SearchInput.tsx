"use client";

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, X, Sparkles, Newspaper, Zap } from 'lucide-react';

type SearchMode = 'smart' | 'quick' | 'news';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string, mode: SearchMode) => void;
  isSearching: boolean;
  placeholder?: string;
}

export function SearchInput({ 
  value, 
  onChange, 
  onSearch, 
  isSearching,
  placeholder = "ابحث في الويب..."
}: SearchInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [selectedMode, setSelectedMode] = useState<SearchMode>('smart');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.trim() && !isSearching) {
      onSearch(value, selectedMode);
    }
  };

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  const handleSearch = () => {
    if (value.trim() && !isSearching) {
      onSearch(value, selectedMode);
    }
  };

  const searchModes: { mode: SearchMode; icon: React.ReactNode; label: string; description: string }[] = [
    { 
      mode: 'smart', 
      icon: <Sparkles className="w-4 h-4" />, 
      label: 'ذكي',
      description: 'بحث ذكي مع إجابة AI'
    },
    { 
      mode: 'quick', 
      icon: <Zap className="w-4 h-4" />, 
      label: 'سريع',
      description: 'نتائج فورية'
    },
    { 
      mode: 'news', 
      icon: <Newspaper className="w-4 h-4" />, 
      label: 'أخبار',
      description: 'آخر الأخبار'
    }
  ];

  return (
    <div className="space-y-3">
      {/* Search Modes */}
      <div className="flex items-center gap-2">
        {searchModes.map(({ mode, icon, label, description }) => (
          <motion.button
            key={mode}
            onClick={() => setSelectedMode(mode)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
                       transition-all duration-200 ${
              selectedMode === mode
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
            }`}
            title={description}
          >
            {icon}
            <span>{label}</span>
          </motion.button>
        ))}
      </div>

      {/* Search Input */}
      <div 
        className={`relative flex items-center gap-3 rounded-xl border 
                   bg-white/5 transition-all duration-200 ${
          isFocused 
            ? 'border-blue-500/50 bg-white/10 ring-2 ring-blue-500/20' 
            : 'border-white/10 hover:border-white/20'
        }`}
      >
        {/* Search Icon */}
        <div className="pr-4 pl-2">
          <AnimatePresence mode="wait">
            {isSearching ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              </motion.div>
            ) : (
              <motion.div
                key="search"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Search className={`w-5 h-5 transition-colors ${
                  isFocused ? 'text-blue-400' : 'text-gray-500'
                }`} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={isSearching}
          className="flex-1 bg-transparent py-3 text-sm text-white placeholder-gray-500
                     focus:outline-none disabled:opacity-50"
          dir="auto"
        />

        {/* Clear Button */}
        <AnimatePresence>
          {value && !isSearching && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={handleClear}
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Search Button */}
        <motion.button
          onClick={handleSearch}
          disabled={!value.trim() || isSearching}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`ml-2 mr-2 px-4 py-2 rounded-lg text-sm font-medium
                     transition-all duration-200 flex items-center gap-2 ${
            value.trim() && !isSearching
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-white/10 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isSearching ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>جاري البحث...</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span>بحث</span>
            </>
          )}
        </motion.button>
      </div>

      {/* Search Mode Description */}
      <p className="text-xs text-gray-500 text-center">
        {searchModes.find(m => m.mode === selectedMode)?.description}
      </p>
    </div>
  );
}

export default SearchInput;
