/**
 * 🔍 useDeepResearch Hook
 * Hook لإدارة عمليات البحث التفصيلي مع AI Agents
 */

"use client";

import { useState, useCallback, useRef } from 'react';
import type {
  ResearchQuery,
  ResearchStep,
  ResearchResult,
  ResearchStatus,
  UserQuota,
} from '@/types/deepResearch';

import {
  executeResearch,
  getUserQuota,
  canSearch,
  consumeQuota,
  getRemainingSearches,
  getTimeUntilReset,
} from '@/lib/ai/deepResearch';

// =============================================================================
// 🎯 Types
// =============================================================================

interface UseDeepResearchState {
  // Query state
  query: string;
  status: ResearchStatus;
  progress: number;
  progressMessage: string;
  
  // Results
  result: ResearchResult | null;
  steps: ResearchStep[];
  
  // Quota
  quota: UserQuota | null;
  canSearch: boolean;
  remainingSearches: number;
  timeUntilReset: string;
  
  // Error
  error: Error | null;
}

interface UseDeepResearchActions {
  setQuery: (query: string) => void;
  startResearch: () => Promise<void>;
  cancelResearch: () => void;
  resetState: () => void;
  refreshQuota: () => void;
}

export type UseDeepResearchReturn = UseDeepResearchState & UseDeepResearchActions;

// =============================================================================
// 🎣 Hook
// =============================================================================

export function useDeepResearch(userId: string = 'anonymous'): UseDeepResearchReturn {
  // State
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ResearchStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [steps, setSteps] = useState<ResearchStep[]>([]);
  const [quota, setQuota] = useState<UserQuota | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const isSearchingRef = useRef(false);
  
  // ==========================================================================
  // 💰 Quota Management
  // ==========================================================================
  
  const refreshQuota = useCallback(() => {
    const userQuota = getUserQuota(userId);
    setQuota(userQuota);
  }, [userId]);
  
  const checkCanSearch = useCallback((): boolean => {
    return canSearch(userId);
  }, [userId]);
  
  const getRemaining = useCallback((): number => {
    return getRemainingSearches(userId);
  }, [userId]);
  
  const getResetTime = useCallback((): string => {
    return getTimeUntilReset(userId);
  }, [userId]);
  
  // ==========================================================================
  // 🔍 Research Actions
  // ==========================================================================
  
  const startResearch = useCallback(async () => {
    if (!query.trim()) {
      setError(new Error('الرجاء إدخال سؤال للبحث'));
      return;
    }
    
    if (isSearchingRef.current) {
      return;
    }
    
    // التحقق من الحصة
    if (!checkCanSearch()) {
      setError(new Error(`لقد استنفذت حصتك. جرب مجدداً بعد ${getResetTime()}`));
      return;
    }
    
    try {
      isSearchingRef.current = true;
      abortControllerRef.current = new AbortController();
      
      // Reset state
      setError(null);
      setResult(null);
      setSteps([]);
      setProgress(0);
      setStatus('transforming-query');
      
      // استهلاك حصة
      const queryId = `research-${Date.now()}`;
      consumeQuota(userId, queryId, query);
      refreshQuota();
      
      // تنفيذ البحث
      const researchResult = await executeResearch(
        query,
        userId,
        {
          onStepStart: (step) => {
            setSteps(prev => [...prev, step]);
            
            // تحديث الحالة حسب المرحلة
            switch (step.phase) {
              case 'thought':
                setStatus('transforming-query');
                break;
              case 'action':
                setStatus('searching');
                break;
              case 'observation':
                setStatus('crawling');
                break;
              case 'reflection':
                setStatus('synthesizing');
                break;
            }
          },
          onStepComplete: (step) => {
            setSteps(prev => 
              prev.map(s => s.id === step.id ? step : s)
            );
          },
          onProgress: (prog, message) => {
            setProgress(prog);
            setProgressMessage(message);
          },
          onError: (err) => {
            setError(err);
            setStatus('error');
          },
        },
        {
          enableFirecrawl: true,
          language: 'ar',
        }
      );
      
      setResult(researchResult);
      setStatus('completed');
      setProgress(100);
      
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setStatus('cancelled');
      } else {
        setError(err instanceof Error ? err : new Error('حدث خطأ غير متوقع'));
        setStatus('error');
      }
    } finally {
      isSearchingRef.current = false;
      abortControllerRef.current = null;
    }
  }, [query, userId, checkCanSearch, getResetTime, refreshQuota]);
  
  const cancelResearch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    isSearchingRef.current = false;
    setStatus('cancelled');
    setProgress(0);
    setProgressMessage('تم إلغاء البحث');
  }, []);
  
  const resetState = useCallback(() => {
    setQuery('');
    setStatus('idle');
    setProgress(0);
    setProgressMessage('');
    setResult(null);
    setSteps([]);
    setError(null);
    isSearchingRef.current = false;
    abortControllerRef.current = null;
  }, []);
  
  // ==========================================================================
  // 📤 Return
  // ==========================================================================
  
  return {
    // State
    query,
    status,
    progress,
    progressMessage,
    result,
    steps,
    quota,
    canSearch: checkCanSearch(),
    remainingSearches: getRemaining(),
    timeUntilReset: getResetTime(),
    error,
    
    // Actions
    setQuery,
    startResearch,
    cancelResearch,
    resetState,
    refreshQuota,
  };
}

export default useDeepResearch;
