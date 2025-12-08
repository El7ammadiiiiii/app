/**
 * 🌐 Web Search Types
 * أنواع نظام البحث في الويب
 */

// =============================================================================
// 🔍 Search Status
// =============================================================================

/** حالة البحث */
export type WebSearchStatus = 
  | 'idle' 
  | 'analyzing' 
  | 'searching' 
  | 'filtering' 
  | 'generating'
  | 'completed' 
  | 'error';

// =============================================================================
// 📊 Search Result
// =============================================================================

/** نتيجة بحث واحدة */
export interface WebSearchResult {
  id: string;
  title: string;
  url: string;
  snippet: string;
  domain: string;
  favicon?: string;
  publishedDate?: string;
  relevanceScore?: number;
  source?: 'serper' | 'tavily';
}

// =============================================================================
// 📦 Search Response
// =============================================================================

/** رد البحث الكامل */
export interface WebSearchResponse {
  id: string;
  query: string;
  originalQuery: string;
  answer?: string;
  results: WebSearchResult[];
  relatedQuestions?: string[];
  timestamp: Date;
  searchTime: number;
  totalResults?: number;
}

// =============================================================================
// ⚙️ Search Options
// =============================================================================

/** إعدادات البحث */
export interface WebSearchOptions {
  maxResults?: number;
  language?: string;
  country?: string;
  includeAnswer?: boolean;
  searchType?: 'general' | 'news' | 'images';
  safeSearch?: boolean;
}

// =============================================================================
// 🔄 Search State (for Hook)
// =============================================================================

/** حالة البحث الكاملة */
export interface WebSearchState {
  query: string;
  status: WebSearchStatus;
  results: WebSearchResult[];
  answer: string | null;
  relatedQuestions: string[];
  error: Error | null;
  searchTime: number;
  isSearching: boolean;
}
