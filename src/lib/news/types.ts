export type NewsSourceId =
  | 'coindesk'
  | 'cointelegraph'
  | 'newsbtc'
  | 'cryptoninjas'
  | 'cryptodaily'
  | 'theblock'
  | 'bankless'
  | 'decrypt'
  | 'bitcoinmagazine'
  | 'cryptopotato'
  | 'coingape'
  | 'beincrypto'
  ;

export interface NewsSource
{
  id: NewsSourceId;
  name: string;
  homepageUrl: string;
  kind: 'rss' | 'sitemap';
  feedUrl?: string;
  sitemapUrl?: string;
  crawlDelayMs?: number;
}

export interface NewsItem
{
  /** Stable ID computed by the server for dedup + React keys */
  id: string;
  title: string;
  url: string;
  source: {
    id: NewsSourceId;
    name: string;
  };
  /** ISO string */
  publishedAt: string;
  /** Epoch ms (for sorting on client if needed) */
  publishedAtMs: number;
  imageUrl?: string;
  excerpt?: string;
}

export interface NewsApiResponse
{
  items: NewsItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  fetchedAt: string;
  meta: {
    ttlMs: number;
    sources: Array<{
      id: NewsSourceId;
      name: string;
      fetchUrl: string;
      lastFetchedAt?: string;
      ok: boolean;
      error?: string;
      itemCount?: number;
    }>;
  };
}
