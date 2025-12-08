/**
 * 🕷️ FireCrawl Service
 * خدمة استخراج المحتوى من صفحات الويب
 */

import type { FirecrawlParams, FirecrawlResult, SearchResult } from '@/types/deepResearch';

const FIRECRAWL_API_KEY = 'fc-b5a9698cbfb84aedbe53d9617a30cab8';
const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v1';

/**
 * استخراج محتوى صفحة ويب
 */
export async function scrapeUrl(params: FirecrawlParams): Promise<FirecrawlResult> {
  try {
    const response = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: params.url,
        formats: params.formats || ['markdown'],
        onlyMainContent: params.onlyMainContent ?? true,
        waitFor: params.waitFor || 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`FireCrawl API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return {
      success: true,
      data: {
        markdown: data.data?.markdown,
        html: data.data?.html,
        metadata: data.data?.metadata,
      },
    };
  } catch (error) {
    console.error('FireCrawl scrape error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * استخراج محتوى عدة صفحات بالتوازي
 */
export async function scrapeMultipleUrls(
  urls: string[],
  options?: Partial<FirecrawlParams>
): Promise<Map<string, FirecrawlResult>> {
  const results = new Map<string, FirecrawlResult>();
  
  const promises = urls.map(async (url) => {
    const result = await scrapeUrl({
      url,
      ...options,
    });
    results.set(url, result);
  });

  await Promise.allSettled(promises);
  return results;
}

/**
 * تحويل نتائج البحث إلى محتوى كامل
 */
export async function enrichSearchResults(
  searchResults: SearchResult[]
): Promise<SearchResult[]> {
  const enrichedResults: SearchResult[] = [];

  // نأخذ أفضل 3 نتائج فقط لتجنب Rate Limiting
  const topResults = searchResults.slice(0, 3);

  for (const result of topResults) {
    try {
      const scraped = await scrapeUrl({
        url: result.url,
        formats: ['markdown'],
        onlyMainContent: true,
      });

      if (scraped.success && scraped.data?.markdown) {
        enrichedResults.push({
          ...result,
          content: scraped.data.markdown,
        });
      } else {
        enrichedResults.push(result);
      }
    } catch {
      enrichedResults.push(result);
    }
  }

  // أضف بقية النتائج بدون enrichment
  enrichedResults.push(...searchResults.slice(3));

  return enrichedResults;
}

/**
 * استخراج النص الرئيسي فقط (بدون HTML/التنسيق)
 */
export async function extractMainText(url: string): Promise<string | null> {
  try {
    const result = await scrapeUrl({
      url,
      formats: ['markdown'],
      onlyMainContent: true,
    });

    if (result.success && result.data?.markdown) {
      // تنظيف Markdown من الروابط والصور
      return result.data.markdown
        .replace(/!\[.*?\]\(.*?\)/g, '') // إزالة الصور
        .replace(/\[([^\]]+)\]\(.*?\)/g, '$1') // تحويل الروابط لنص
        .replace(/#{1,6}\s/g, '') // إزالة عناوين Markdown
        .replace(/\*\*|__/g, '') // إزالة Bold
        .replace(/\*|_/g, '') // إزالة Italic
        .trim();
    }

    return null;
  } catch (error) {
    console.error('Extract main text error:', error);
    return null;
  }
}

export default {
  scrape: scrapeUrl,
  scrapeMultiple: scrapeMultipleUrls,
  enrichResults: enrichSearchResults,
  extractText: extractMainText,
};
