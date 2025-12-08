/**
 * 🔍 Tavily Search Service
 * خدمة البحث باستخدام Tavily AI Search API
 */

import type { TavilySearchParams, SearchResult } from '@/types/deepResearch';

const TAVILY_API_KEY = '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';
const TAVILY_API_URL = 'https://api.tavily.com/search';

interface TavilyResponse {
  query: string;
  answer?: string;
  results: {
    title: string;
    url: string;
    content: string;
    raw_content?: string;
    score: number;
    published_date?: string;
  }[];
  response_time: number;
}

/**
 * تنفيذ بحث Tavily
 */
export async function searchTavily(params: TavilySearchParams): Promise<SearchResult[]> {
  try {
    const response = await fetch(TAVILY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query: params.query,
        search_depth: params.searchDepth || 'advanced',
        include_answer: params.includeAnswer ?? true,
        include_raw_content: params.includeRawContent ?? false,
        max_results: params.maxResults || 5,
        include_domains: params.includeDomains || [],
        exclude_domains: params.excludeDomains || [],
      }),
    });

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.status}`);
    }

    const data: TavilyResponse = await response.json();

    return data.results.map((result, index) => ({
      id: `tavily-${Date.now()}-${index}`,
      title: result.title,
      url: result.url,
      snippet: result.content.slice(0, 300),
      content: result.raw_content || result.content,
      source: 'tavily' as const,
      relevanceScore: result.score,
      publishedDate: result.published_date,
      domain: new URL(result.url).hostname,
    }));
  } catch (error) {
    console.error('Tavily search error:', error);
    throw error;
  }
}

/**
 * البحث مع الإجابة المباشرة
 */
export async function searchWithAnswer(query: string): Promise<{
  answer: string | null;
  results: SearchResult[];
}> {
  try {
    const response = await fetch(TAVILY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        search_depth: 'advanced',
        include_answer: true,
        max_results: 5,
      }),
    });

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.status}`);
    }

    const data: TavilyResponse = await response.json();

    return {
      answer: data.answer || null,
      results: data.results.map((result, index) => ({
        id: `tavily-${Date.now()}-${index}`,
        title: result.title,
        url: result.url,
        snippet: result.content.slice(0, 300),
        content: result.content,
        source: 'tavily' as const,
        relevanceScore: result.score,
        domain: new URL(result.url).hostname,
      })),
    };
  } catch (error) {
    console.error('Tavily search with answer error:', error);
    throw error;
  }
}

export default {
  search: searchTavily,
  searchWithAnswer,
};
