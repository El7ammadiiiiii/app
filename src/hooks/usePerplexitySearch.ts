/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * USE PERPLEXITY SEARCH HOOK
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Hook لإدارة عمليات البحث بنمط Perplexity
 * يتعامل مع SSE streaming من API
 * 
 * @version 1.0.0
 */

import { useCallback, useRef } from 'react';
import { 
  usePerplexityStore, 
  useSearchByMessageId,
  useIsSearching,
} from '@/store/perplexityStore';
import {
  SearchPhase,
  PerplexitySource,
  RelatedQuestion,
  AgentType,
  ToolType,
  PerplexitySSEEvent,
} from '@/types/perplexity';
import { useLocale } from '@/lib/i18n';

interface UsePerplexitySearchOptions {
  onComplete?: (messageId: string) => void;
  onError?: (error: Error) => void;
}

export function usePerplexitySearch(options: UsePerplexitySearchOptions = {}) {
  const { locale } = useLocale();
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const {
    startSearch: storeStartSearch,
    setPhase,
    addSources,
    appendContent,
    setRelatedQuestions,
    completeSearch,
    setError,
    cancelSearch,
    getCached,
  } = usePerplexityStore();
  
  const isSearching = useIsSearching();
  
  /**
   * بدء عملية بحث جديدة
   */
  const startSearch = useCallback(async (
    messageId: string,
    query: string,
    agentType?: AgentType,
    toolType?: ToolType,
  ): Promise<string> => {
    // Check cache first
    const cached = getCached(query);
    if (cached) {
      // Return cached result (update with new messageId)
      const searchId = storeStartSearch(messageId, query, agentType, toolType);
      addSources(searchId, cached.sources);
      appendContent(searchId, cached.content);
      setRelatedQuestions(searchId, cached.relatedQuestions);
      completeSearch(searchId);
      options.onComplete?.(messageId);
      return searchId;
    }
    
    // Create new search
    const searchId = storeStartSearch(messageId, query, agentType, toolType);
    
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    try {
      const response = await fetch('/api/agent/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          agentType,
          toolType,
          locale,
          maxSources: 10,
        }),
        signal: abortControllerRef.current.signal,
      });
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }
      
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete SSE events
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';
        
        for (const eventBlock of lines) {
          if (!eventBlock.trim()) continue;
          
          const eventLines = eventBlock.split('\n');
          let eventType = '';
          let eventData = '';
          
          for (const line of eventLines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7);
            } else if (line.startsWith('data: ')) {
              eventData = line.slice(6);
            }
          }
          
          if (eventType && eventData) {
            try {
              const data = JSON.parse(eventData);
              handleSSEEvent(searchId, eventType, data);
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
      
      return searchId;
      
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        cancelSearch(searchId);
        return searchId;
      }
      
      console.error('Search error:', error);
      setError(searchId, 'SEARCH_ERROR', (error as Error).message);
      options.onError?.(error as Error);
      return searchId;
    }
  }, [locale, getCached, storeStartSearch, addSources, appendContent, setRelatedQuestions, completeSearch, setError, cancelSearch, options]);
  
  /**
   * معالجة أحداث SSE
   */
  const handleSSEEvent = useCallback((searchId: string, eventType: string, data: unknown) => {
    switch (eventType) {
      case 'phase': {
        const { phase, progress } = data as { phase: SearchPhase; progress: number };
        setPhase(searchId, phase, progress);
        break;
      }
      
      case 'sources': {
        const { sources } = data as { sources: PerplexitySource[] };
        addSources(searchId, sources);
        break;
      }
      
      case 'content': {
        const { chunk } = data as { chunk: string };
        appendContent(searchId, chunk);
        break;
      }
      
      case 'related': {
        const { questions } = data as { questions: RelatedQuestion[] };
        setRelatedQuestions(searchId, questions);
        break;
      }
      
      case 'complete': {
        completeSearch(searchId);
        const search = usePerplexityStore.getState().getSearch(searchId);
        if (search) {
          options.onComplete?.(search.messageId);
        }
        break;
      }
      
      case 'error': {
        const { error } = data as { error: { code: string; message: string } };
        setError(searchId, error.code, error.message);
        options.onError?.(new Error(error.message));
        break;
      }
    }
  }, [setPhase, addSources, appendContent, setRelatedQuestions, completeSearch, setError, options]);
  
  /**
   * إلغاء البحث الحالي
   */
  const stopSearch = useCallback((searchId: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    cancelSearch(searchId);
  }, [cancelSearch]);
  
  return {
    startSearch,
    stopSearch,
    isSearching,
  };
}

/**
 * Hook مبسط للحصول على حالة بحث معينة
 */
export function useMessageSearch(messageId: string) {
  return useSearchByMessageId(messageId);
}

export default usePerplexitySearch;
