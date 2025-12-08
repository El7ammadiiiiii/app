/**
 * 🔎 Serper Search Service
 * خدمة البحث باستخدام Serper (Google Search API)
 */

import type { SerperSearchParams, SearchResult } from '@/types/deepResearch';

const SERPER_API_KEY = '84623444ccd50b82dd4824f80d679031f391c1c6';
const SERPER_API_URL = 'https://google.serper.dev/search';

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
  knowledgeGraph?: {
    title?: string;
    description?: string;
  };
  searchParameters: {
    q: string;
    gl: string;
    hl: string;
  };
}

/**
 * تنفيذ بحث Serper
 */
export async function searchSerper(params: SerperSearchParams): Promise<SearchResult[]> {
  try {
    const response = await fetch(SERPER_API_URL, {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: params.q,
        gl: params.gl || 'us',
        hl: params.hl || 'ar',
        num: params.num || 10,
      }),
    });

    if (!response.ok) {
      throw new Error(`Serper API error: ${response.status}`);
    }

    const data: SerperResponse = await response.json();

    return data.organic.map((result, index) => ({
      id: `serper-${Date.now()}-${index}`,
      title: result.title,
      url: result.link,
      snippet: result.snippet,
      source: 'serper' as const,
      relevanceScore: 1 - (result.position / 10),
      publishedDate: result.date,
      domain: new URL(result.link).hostname,
    }));
  } catch (error) {
    console.error('Serper search error:', error);
    throw error;
  }
}

/**
 * بحث الأخبار
 */
export async function searchNews(query: string, lang: string = 'ar'): Promise<SearchResult[]> {
  try {
    const response = await fetch('https://google.serper.dev/news', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        hl: lang,
        num: 10,
      }),
    });

    if (!response.ok) {
      throw new Error(`Serper News API error: ${response.status}`);
    }

    const data = await response.json();

    return (data.news || []).map((result: any, index: number) => ({
      id: `serper-news-${Date.now()}-${index}`,
      title: result.title,
      url: result.link,
      snippet: result.snippet || '',
      source: 'serper' as const,
      publishedDate: result.date,
      domain: new URL(result.link).hostname,
    }));
  } catch (error) {
    console.error('Serper news search error:', error);
    throw error;
  }
}

/**
 * الحصول على Answer Box إن وجد
 */
export async function getQuickAnswer(query: string): Promise<string | null> {
  try {
    const response = await fetch(SERPER_API_URL, {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        gl: 'us',
        hl: 'ar',
      }),
    });

    if (!response.ok) return null;

    const data: SerperResponse = await response.json();

    if (data.answerBox?.answer) {
      return data.answerBox.answer;
    }
    if (data.answerBox?.snippet) {
      return data.answerBox.snippet;
    }
    if (data.knowledgeGraph?.description) {
      return data.knowledgeGraph.description;
    }

    return null;
  } catch (error) {
    console.error('Serper quick answer error:', error);
    return null;
  }
}

export default {
  search: searchSerper,
  searchNews,
  getQuickAnswer,
};
