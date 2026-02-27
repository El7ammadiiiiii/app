/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PERPLEXITY STORE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Zustand store لإدارة حالة البحث بنمط Perplexity
 * 
 * @version 1.0.0
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  SearchPhase,
  PerplexitySource,
  Citation,
  RelatedQuestion,
  PerplexitySearchState,
  AgentType,
  ToolType,
  generateId,
} from '@/types/perplexity';

// ═══════════════════════════════════════════════════════════════════════════════
// STORE INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

interface PerplexityStore {
  // State
  searches: Map<string, PerplexitySearchState>;
  activeSearchId: string | null;
  
  // Cache (لتسريع الردود المتكررة)
  cache: Map<string, { response: PerplexitySearchState; timestamp: number }>;
  cacheMaxAge: number;  // بالمللي ثانية
  
  // Actions - Search Lifecycle
  startSearch: (messageId: string, query: string, agentType?: AgentType, toolType?: ToolType) => string;
  setPhase: (searchId: string, phase: SearchPhase, progress?: number) => void;
  addSources: (searchId: string, sources: PerplexitySource[]) => void;
  appendContent: (searchId: string, chunk: string) => void;
  setContent: (searchId: string, content: string, citations?: Citation[]) => void;
  setRelatedQuestions: (searchId: string, questions: RelatedQuestion[]) => void;
  completeSearch: (searchId: string) => void;
  setError: (searchId: string, code: string, message: string) => void;
  cancelSearch: (searchId: string) => void;
  
  // Actions - Getters
  getSearch: (searchId: string) => PerplexitySearchState | undefined;
  getSearchByMessageId: (messageId: string) => PerplexitySearchState | undefined;
  
  // Actions - Cache
  getCached: (query: string) => PerplexitySearchState | null;
  setCached: (query: string, state: PerplexitySearchState) => void;
  clearCache: () => void;
  
  // Actions - Cleanup
  clearSearch: (searchId: string) => void;
  clearAllSearches: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STORE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

export const usePerplexityStore = create<PerplexityStore>()(
  persist(
    (set, get) => ({
      // Initial State
      searches: new Map(),
      activeSearchId: null,
      cache: new Map(),
      cacheMaxAge: 30 * 60 * 1000, // 30 دقيقة
      
      // ─────────────────────────────────────────────────────────────────────────
      // Search Lifecycle
      // ─────────────────────────────────────────────────────────────────────────
      
      startSearch: (messageId, query, agentType, toolType) => {
        const searchId = generateId();
        
        const newSearch: PerplexitySearchState = {
          id: searchId,
          messageId,
          query,
          phase: SearchPhase.SEARCHING,
          progress: 0,
          sources: [],
          content: '',
          citations: [],
          relatedQuestions: [],
          agentType,
          toolType,
          startTime: Date.now(),
        };
        
        set((state) => {
          const newSearches = new Map(state.searches);
          newSearches.set(searchId, newSearch);
          return { searches: newSearches, activeSearchId: searchId };
        });
        
        return searchId;
      },
      
      setPhase: (searchId, phase, progress) => {
        set((state) => {
          const search = state.searches.get(searchId);
          if (!search) return state;
          
          const newSearches = new Map(state.searches);
          newSearches.set(searchId, {
            ...search,
            phase,
            progress: progress ?? search.progress,
          });
          return { searches: newSearches };
        });
      },
      
      addSources: (searchId, sources) => {
        set((state) => {
          const search = state.searches.get(searchId);
          if (!search) return state;
          
          const newSearches = new Map(state.searches);
          newSearches.set(searchId, {
            ...search,
            sources: [...search.sources, ...sources],
          });
          return { searches: newSearches };
        });
      },
      
      appendContent: (searchId, chunk) => {
        set((state) => {
          const search = state.searches.get(searchId);
          if (!search) return state;
          
          const newSearches = new Map(state.searches);
          newSearches.set(searchId, {
            ...search,
            content: search.content + chunk,
          });
          return { searches: newSearches };
        });
      },
      
      setContent: (searchId, content, citations) => {
        set((state) => {
          const search = state.searches.get(searchId);
          if (!search) return state;
          
          const newSearches = new Map(state.searches);
          newSearches.set(searchId, {
            ...search,
            content,
            citations: citations ?? search.citations,
          });
          return { searches: newSearches };
        });
      },
      
      setRelatedQuestions: (searchId, questions) => {
        set((state) => {
          const search = state.searches.get(searchId);
          if (!search) return state;
          
          const newSearches = new Map(state.searches);
          newSearches.set(searchId, {
            ...search,
            relatedQuestions: questions,
          });
          return { searches: newSearches };
        });
      },
      
      completeSearch: (searchId) => {
        set((state) => {
          const search = state.searches.get(searchId);
          if (!search) return state;
          
          const completedSearch = {
            ...search,
            phase: SearchPhase.COMPLETE,
            progress: 100,
            endTime: Date.now(),
          };
          
          const newSearches = new Map(state.searches);
          newSearches.set(searchId, completedSearch);
          
          // Add to cache
          const newCache = new Map(state.cache);
          newCache.set(search.query.toLowerCase().trim(), {
            response: completedSearch,
            timestamp: Date.now(),
          });
          
          return { 
            searches: newSearches, 
            cache: newCache,
            activeSearchId: null 
          };
        });
      },
      
      setError: (searchId, code, message) => {
        set((state) => {
          const search = state.searches.get(searchId);
          if (!search) return state;
          
          const newSearches = new Map(state.searches);
          newSearches.set(searchId, {
            ...search,
            phase: SearchPhase.ERROR,
            error: { code, message },
            endTime: Date.now(),
          });
          return { searches: newSearches, activeSearchId: null };
        });
      },
      
      cancelSearch: (searchId) => {
        set((state) => {
          const search = state.searches.get(searchId);
          if (!search) return state;
          
          const newSearches = new Map(state.searches);
          newSearches.set(searchId, {
            ...search,
            phase: SearchPhase.IDLE,
            endTime: Date.now(),
          });
          return { searches: newSearches, activeSearchId: null };
        });
      },
      
      // ─────────────────────────────────────────────────────────────────────────
      // Getters
      // ─────────────────────────────────────────────────────────────────────────
      
      getSearch: (searchId) => {
        return get().searches.get(searchId);
      },
      
      getSearchByMessageId: (messageId) => {
        const searches = get().searches;
        for (const [, search] of searches) {
          if (search.messageId === messageId) {
            return search;
          }
        }
        return undefined;
      },
      
      // ─────────────────────────────────────────────────────────────────────────
      // Cache
      // ─────────────────────────────────────────────────────────────────────────
      
      getCached: (query) => {
        const { cache, cacheMaxAge } = get();
        const key = query.toLowerCase().trim();
        const cached = cache.get(key);
        
        if (!cached) return null;
        
        // Check if cache is still valid
        if (Date.now() - cached.timestamp > cacheMaxAge) {
          // Cache expired, remove it
          set((state) => {
            const newCache = new Map(state.cache);
            newCache.delete(key);
            return { cache: newCache };
          });
          return null;
        }
        
        return cached.response;
      },
      
      setCached: (query, state) => {
        set((prevState) => {
          const newCache = new Map(prevState.cache);
          newCache.set(query.toLowerCase().trim(), {
            response: state,
            timestamp: Date.now(),
          });
          return { cache: newCache };
        });
      },
      
      clearCache: () => {
        set({ cache: new Map() });
      },
      
      // ─────────────────────────────────────────────────────────────────────────
      // Cleanup
      // ─────────────────────────────────────────────────────────────────────────
      
      clearSearch: (searchId) => {
        set((state) => {
          const newSearches = new Map(state.searches);
          newSearches.delete(searchId);
          return { 
            searches: newSearches,
            activeSearchId: state.activeSearchId === searchId ? null : state.activeSearchId,
          };
        });
      },
      
      clearAllSearches: () => {
        set({ searches: new Map(), activeSearchId: null });
      },
    }),
    {
      name: 'perplexity-store',
      // Custom serialization for Map
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const data = JSON.parse(str);
          return {
            ...data,
            state: {
              ...data.state,
              searches: new Map(data.state.searches || []),
              cache: new Map(data.state.cache || []),
            },
          };
        },
        setItem: (name, value) => {
          const data = {
            ...value,
            state: {
              ...value.state,
              searches: Array.from(value.state.searches.entries()),
              cache: Array.from(value.state.cache.entries()),
            },
          };
          localStorage.setItem(name, JSON.stringify(data));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
      partialize: (state) => ({
        cache: state.cache,
        // لا نحفظ الـ searches النشطة - نرجع الـ state الكاملة للتوافق مع النوع
      } as unknown as PerplexityStore),
    }
  )
);

// ═══════════════════════════════════════════════════════════════════════════════
// SELECTOR HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

export const useSearch = (searchId: string) => {
  return usePerplexityStore((state) => state.searches.get(searchId));
};

export const useSearchByMessageId = (messageId: string) => {
  return usePerplexityStore((state) => {
    for (const [, search] of state.searches) {
      if (search.messageId === messageId) {
        return search;
      }
    }
    return undefined;
  });
};

export const useActiveSearch = () => {
  return usePerplexityStore((state) => {
    if (!state.activeSearchId) return null;
    return state.searches.get(state.activeSearchId) ?? null;
  });
};

export const useIsSearching = () => {
  return usePerplexityStore((state) => state.activeSearchId !== null);
};

export default usePerplexityStore;
