/**
 * 🌐 Web Search Service
 * خدمة البحث السريع في الويب
 */

import type { 
  WebSearchResult, 
  WebSearchResponse, 
  WebSearchOptions 
} from '@/types/webSearch';

// =============================================================================
// 🔑 API Keys
// =============================================================================

const SERPER_API_KEY = process.env.SERPER_API_KEY || '';
const TAVILY_API_KEY = process.env.TAVILY_API_KEY || '';

// =============================================================================
// 🔧 Helper Functions
// =============================================================================

function generateId(): string {
  return `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function getFavicon(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

// =============================================================================
// 🔍 Quick Search (Serper)
// =============================================================================

interface SerperResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
  date?: string;
}

interface SerperResponse {
  organic: SerperResult[];
  answerBox?: {
    title?: string;
    answer?: string;
    snippet?: string;
  };
  relatedSearches?: { query: string }[];
  searchParameters: {
    q: string;
  };
}

/**
 * بحث سريع عبر Serper (Google)
 */
export async function quickSearch(
  query: string,
  options: WebSearchOptions = {}
): Promise<WebSearchResponse> {
  const startTime = Date.now();
  
  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        gl: options.country || 'us',
        hl: options.language || 'ar',
        num: options.maxResults || 8,
      }),
    });

    if (!response.ok) {
      throw new Error(`Serper API error: ${response.status}`);
    }

    const data: SerperResponse = await response.json();
    const searchTime = Date.now() - startTime;

    // تحويل النتائج
    const results: WebSearchResult[] = data.organic.map((item, index) => {
      const domain = extractDomain(item.link);
      return {
        id: generateId(),
        title: item.title,
        url: item.link,
        snippet: item.snippet,
        domain,
        favicon: getFavicon(domain),
        publishedDate: item.date,
        relevanceScore: 1 - (index / data.organic.length),
        source: 'serper' as const,
      };
    });

    // استخراج الإجابة المباشرة إن وجدت
    const answer = data.answerBox?.answer || data.answerBox?.snippet || null;

    // الأسئلة ذات الصلة
    const relatedQuestions = data.relatedSearches?.map(s => s.query) || [];

    return {
      id: generateId(),
      query,
      originalQuery: query,
      answer: answer || undefined,
      results,
      relatedQuestions,
      timestamp: new Date(),
      searchTime,
      totalResults: results.length,
    };
  } catch (error) {
    console.error('Quick search error:', error);
    throw error;
  }
}

// =============================================================================
// 🧠 Search with AI Answer (Tavily)
// =============================================================================

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
}

interface TavilyResponse {
  query: string;
  answer?: string;
  results: TavilyResult[];
  response_time: number;
}

/**
 * بحث مع إجابة ذكية عبر Tavily
 */
export async function searchWithAnswer(
  query: string,
  options: WebSearchOptions = {}
): Promise<WebSearchResponse> {
  const startTime = Date.now();
  
  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        search_depth: 'basic',
        include_answer: true,
        max_results: options.maxResults || 6,
      }),
    });

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.status}`);
    }

    const data: TavilyResponse = await response.json();
    const searchTime = Date.now() - startTime;

    // تحويل النتائج
    const results: WebSearchResult[] = data.results.map((item) => {
      const domain = extractDomain(item.url);
      return {
        id: generateId(),
        title: item.title,
        url: item.url,
        snippet: item.content.slice(0, 200),
        domain,
        favicon: getFavicon(domain),
        publishedDate: item.published_date,
        relevanceScore: item.score,
        source: 'tavily' as const,
      };
    });

    return {
      id: generateId(),
      query,
      originalQuery: query,
      answer: data.answer,
      results,
      timestamp: new Date(),
      searchTime,
      totalResults: results.length,
    };
  } catch (error) {
    console.error('Search with answer error:', error);
    throw error;
  }
}

// =============================================================================
// 📰 News Search
// =============================================================================

/**
 * بحث في الأخبار
 */
export async function searchNews(
  query: string,
  options: WebSearchOptions = {}
): Promise<WebSearchResponse> {
  const startTime = Date.now();
  
  try {
    const response = await fetch('https://google.serper.dev/news', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        gl: options.country || 'us',
        hl: options.language || 'ar',
        num: options.maxResults || 8,
      }),
    });

    if (!response.ok) {
      throw new Error(`Serper News API error: ${response.status}`);
    }

    const data = await response.json();
    const searchTime = Date.now() - startTime;

    const results: WebSearchResult[] = (data.news || []).map((item: any) => {
      const domain = extractDomain(item.link);
      return {
        id: generateId(),
        title: item.title,
        url: item.link,
        snippet: item.snippet || '',
        domain,
        favicon: getFavicon(domain),
        publishedDate: item.date,
        source: 'serper' as const,
      };
    });

    return {
      id: generateId(),
      query,
      originalQuery: query,
      results,
      timestamp: new Date(),
      searchTime,
      totalResults: results.length,
    };
  } catch (error) {
    console.error('News search error:', error);
    throw error;
  }
}

// =============================================================================
// 🔄 Combined Smart Search
// =============================================================================

/**
 * بحث ذكي مدمج - يختار أفضل مصدر تلقائياً
 */
export async function smartSearch(
  query: string,
  options: WebSearchOptions = {}
): Promise<WebSearchResponse> {
  // إذا كان السؤال يحتاج إجابة مباشرة، استخدم Tavily
  const needsAnswer = 
    query.includes('؟') || 
    query.includes('?') ||
    query.toLowerCase().startsWith('ما ') ||
    query.toLowerCase().startsWith('من ') ||
    query.toLowerCase().startsWith('كيف ') ||
    query.toLowerCase().startsWith('لماذا ') ||
    query.toLowerCase().startsWith('what ') ||
    query.toLowerCase().startsWith('how ') ||
    query.toLowerCase().startsWith('why ');

  if (needsAnswer || options.includeAnswer) {
    try {
      return await searchWithAnswer(query, options);
    } catch {
      // Fallback to Serper
      return await quickSearch(query, options);
    }
  }

  return await quickSearch(query, options);
}

// =============================================================================
// 📤 Export
// =============================================================================

export default {
  quick: quickSearch,
  withAnswer: searchWithAnswer,
  news: searchNews,
  smart: smartSearch,
};
