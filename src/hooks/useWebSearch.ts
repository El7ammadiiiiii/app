"use client";

import { useState, useCallback } from 'react';
import { 
  WebSearchStatus, 
  WebSearchResult, 
  WebSearchResponse,
  WebSearchOptions 
} from '@/types/webSearch';
import { smartSearch, quickSearch, searchNews } from '@/lib/ai/webSearch';

interface UseWebSearchReturn {
  // State
  query: string;
  status: WebSearchStatus;
  results: WebSearchResult[];
  answer: string | null;
  relatedQuestions: string[];
  error: string | null;
  
  // Actions
  search: (searchQuery: string, options?: WebSearchOptions) => Promise<void>;
  searchQuick: (searchQuery: string) => Promise<void>;
  searchForNews: (searchQuery: string) => Promise<void>;
  clearResults: () => void;
  setQuery: (query: string) => void;
}

export function useWebSearch(): UseWebSearchReturn {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<WebSearchStatus>('idle');
  const [results, setResults] = useState<WebSearchResult[]>([]);
  const [answer, setAnswer] = useState<string | null>(null);
  const [relatedQuestions, setRelatedQuestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // البحث الذكي - يختار أفضل طريقة تلقائياً
  const search = useCallback(async (searchQuery: string, options?: WebSearchOptions) => {
    if (!searchQuery.trim()) {
      setError('يرجى إدخال استعلام البحث');
      return;
    }

    setQuery(searchQuery);
    setStatus('searching');
    setError(null);
    setResults([]);
    setAnswer(null);
    setRelatedQuestions([]);

    try {
      setStatus('analyzing');
      const response: WebSearchResponse = await smartSearch(searchQuery, options);
      
      setResults(response.results);
      setAnswer(response.answer || null);
      setRelatedQuestions(response.relatedQuestions || []);
      setStatus('completed');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ أثناء البحث';
      setError(errorMessage);
      setStatus('error');
    }
  }, []);

  // البحث السريع - نتائج فورية بدون تحليل
  const searchQuick = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setError('يرجى إدخال استعلام البحث');
      return;
    }

    setQuery(searchQuery);
    setStatus('searching');
    setError(null);
    setResults([]);
    setAnswer(null);

    try {
      const response: WebSearchResponse = await quickSearch(searchQuery);
      
      setResults(response.results);
      setRelatedQuestions(response.relatedQuestions || []);
      setStatus('completed');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ أثناء البحث';
      setError(errorMessage);
      setStatus('error');
    }
  }, []);

  // البحث في الأخبار
  const searchForNews = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setError('يرجى إدخال استعلام البحث');
      return;
    }

    setQuery(searchQuery);
    setStatus('searching');
    setError(null);
    setResults([]);
    setAnswer(null);

    try {
      const response: WebSearchResponse = await searchNews(searchQuery);
      
      setResults(response.results);
      setRelatedQuestions(response.relatedQuestions || []);
      setStatus('completed');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ أثناء البحث';
      setError(errorMessage);
      setStatus('error');
    }
  }, []);

  // مسح النتائج
  const clearResults = useCallback(() => {
    setQuery('');
    setStatus('idle');
    setResults([]);
    setAnswer(null);
    setRelatedQuestions([]);
    setError(null);
  }, []);

  return {
    // State
    query,
    status,
    results,
    answer,
    relatedQuestions,
    error,
    
    // Actions
    search,
    searchQuick,
    searchForNews,
    clearResults,
    setQuery
  };
}

export default useWebSearch;
