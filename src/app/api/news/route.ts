import { NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';
import { NEWS_SOURCES } from '@/lib/news/sources';
import type { NewsApiResponse, NewsItem, NewsSource } from '@/lib/news/types';
import { buildStableNewsId, buildTitleKey, chooseBetter, normalizeUrl, safeDateMs, toExcerpt } from '@/lib/news/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TTL_MS = 2 * 60 * 60 * 1000; // ساعتين
const DEFAULT_PAGE_SIZE = 20;

type SourceCacheEntry = {
  lastFetchedMs: number;
  items: NewsItem[];
  lastError?: string;
};

const sourceCache = new Map<string, SourceCacheEntry>();

const parser = new XMLParser( {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  // keep namespaces as-is (media:content etc)
  removeNSPrefix: false,
} );

function mergeSourceItems ( existing: NewsItem[], incoming: NewsItem[] ): NewsItem[]
{
  if ( !existing?.length && !incoming?.length ) return [];

  const byUrl = new Map<string, NewsItem>();

  const upsert = ( item: NewsItem ) =>
  {
    const key = normalizeUrl( item.url );
    const prev = byUrl.get( key );
    if ( !prev )
    {
      byUrl.set( key, item );
      return;
    }
    byUrl.set( key, chooseBetter( prev, item ) );
  };

  for ( const it of existing ) upsert( it );
  for ( const it of incoming ) upsert( it );

  const merged = Array.from( byUrl.values() );
  merged.sort( ( a, b ) => b.publishedAtMs - a.publishedAtMs );
  return merged.slice( 0, 200 );
}

function toArray<T> ( v: T | T[] | undefined | null ): T[]
{
  if ( !v ) return [];
  return Array.isArray( v ) ? v : [ v ];
}

function extractFirstText ( v: any ): string
{
  if ( v == null ) return '';
  if ( typeof v === 'string' ) return v;
  if ( typeof v === 'number' ) return String( v );
  if ( typeof v === 'object' )
  {
    // common patterns in XML parsers
    if ( typeof v[ '#text' ] === 'string' ) return v[ '#text' ];
    if ( typeof v[ '@_href' ] === 'string' ) return v[ '@_href' ];
  }
  return '';
}

function extractImageUrl ( item: any ): string | undefined
{
  // RSS enclosure
  const enclosure = item?.enclosure;
  if ( enclosure )
  {
    const url = enclosure[ '@_url' ] || enclosure.url;
    if ( typeof url === 'string' && url.startsWith( 'http' ) ) return url;
  }

  // media namespace
  const mediaContent = item?.[ 'media:content' ];
  for ( const m of toArray<any>( mediaContent ) )
  {
    const url = m?.[ '@_url' ] || m?.url;
    if ( typeof url === 'string' && url.startsWith( 'http' ) ) return url;
  }

  const mediaThumb = item?.[ 'media:thumbnail' ];
  for ( const m of toArray<any>( mediaThumb ) )
  {
    const url = m?.[ '@_url' ] || m?.url;
    if ( typeof url === 'string' && url.startsWith( 'http' ) ) return url;
  }

  // content:encoded contains <img ...>
  const html = extractFirstText( item?.[ 'content:encoded' ] || item?.content || item?.summary || item?.description );
  if ( html )
  {
    const match = html.match( /<img[^>]+src=["']([^"']+)["']/i );
    if ( match?.[ 1 ]?.startsWith( 'http' ) ) return match[ 1 ];
  }

  return undefined;
}

function extractLink ( item: any ): string
{
  // RSS: link is string
  const link1 = extractFirstText( item?.link );
  if ( link1 ) return link1;

  // Atom: link can be array with rel="alternate"
  const atomLinks = toArray<any>( item?.link );
  for ( const l of atomLinks )
  {
    const rel = l?.[ '@_rel' ];
    const href = l?.[ '@_href' ];
    if ( ( rel === 'alternate' || !rel ) && typeof href === 'string' ) return href;
  }

  return '';
}

function parseFeedToItems ( source: NewsSource, xmlText: string ): NewsItem[]
{
  const parsed = parser.parse( xmlText );

  const items: NewsItem[] = [];

  // RSS
  const rssItems = parsed?.rss?.channel?.item;
  for ( const it of toArray<any>( rssItems ) )
  {
    const title = extractFirstText( it?.title );
    const url = extractLink( it );
    const normalized = normalizeUrl( url );

    const publishedMs = safeDateMs( it?.pubDate || it?.published || it?.[ 'dc:date' ] );
    const publishedAtMs = publishedMs || Date.now();
    const publishedAt = new Date( publishedAtMs ).toISOString();

    const excerptSrc = extractFirstText( it?.description || it?.summary || it?.[ 'content:encoded' ] );
    const excerpt = toExcerpt( excerptSrc );
    const imageUrl = extractImageUrl( it );

    if ( !title || !normalized ) continue;

    items.push( {
      id: buildStableNewsId( source, normalized, title, publishedAtMs ),
      title,
      url: normalized,
      source: { id: source.id, name: source.name },
      publishedAt,
      publishedAtMs,
      ...( imageUrl ? { imageUrl } : undefined ),
      ...( excerpt ? { excerpt } : undefined ),
    } );
  }

  // Atom
  const atomEntries = parsed?.feed?.entry;
  for ( const it of toArray<any>( atomEntries ) )
  {
    const title = extractFirstText( it?.title );
    const url = normalizeUrl( extractLink( it ) );

    const publishedMs = safeDateMs( it?.published || it?.updated );
    const publishedAtMs = publishedMs || Date.now();
    const publishedAt = new Date( publishedAtMs ).toISOString();

    const excerptSrc = extractFirstText( it?.summary || it?.content );
    const excerpt = toExcerpt( excerptSrc );
    const imageUrl = extractImageUrl( it );

    if ( !title || !url ) continue;

    items.push( {
      id: buildStableNewsId( source, url, title, publishedAtMs ),
      title,
      url,
      source: { id: source.id, name: source.name },
      publishedAt,
      publishedAtMs,
      ...( imageUrl ? { imageUrl } : undefined ),
      ...( excerpt ? { excerpt } : undefined ),
    } );
  }

  return items;
}

function getFetchUrl ( source: NewsSource ): string
{
  if ( source.kind === 'sitemap' ) return source.sitemapUrl || '';
  return source.feedUrl || '';
}

function extractMetaTag ( html: string, key: string ): string
{
  const patterns = [
    new RegExp( `<meta[^>]+property=["']${ key }["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i' ),
    new RegExp( `<meta[^>]+name=["']${ key }["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i' ),
  ];
  for ( const p of patterns )
  {
    const match = html.match( p );
    if ( match?.[ 1 ] ) return match[ 1 ].trim();
  }
  return '';
}

function extractTitleFromHtml ( html: string ): string
{
  const ogTitle = extractMetaTag( html, 'og:title' );
  if ( ogTitle ) return ogTitle;

  const titleMatch = html.match( /<title[^>]*>([^<]+)<\/title>/i );
  if ( titleMatch?.[ 1 ] ) return titleMatch[ 1 ].trim();

  return '';
}

function extractExcerptFromHtml ( html: string ): string
{
  const ogDesc = extractMetaTag( html, 'og:description' ) || extractMetaTag( html, 'description' );
  if ( ogDesc ) return toExcerpt( ogDesc );

  const firstParagraph = html.match( /<p[^>]*>([\s\S]*?)<\/p>/i );
  if ( firstParagraph?.[ 1 ] ) return toExcerpt( firstParagraph[ 1 ] );

  return '';
}

function extractImageFromHtml ( html: string ): string
{
  const ogImage = extractMetaTag( html, 'og:image' ) || extractMetaTag( html, 'twitter:image' );
  return ogImage;
}

function extractPublishedFromHtml ( html: string ): number
{
  const published =
    extractMetaTag( html, 'article:published_time' ) ||
    extractMetaTag( html, 'article:modified_time' ) ||
    extractMetaTag( html, 'og:updated_time' );
  return safeDateMs( published );
}

async function fetchArticleMeta ( url: string ): Promise<{ title: string; excerpt: string; imageUrl?: string; publishedMs?: number } | null>
{
  try
  {
    const res = await fetch( url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NexusWebApp/1.0',
      },
      cache: 'no-store',
    } );

    if ( !res.ok ) return null;
    const html = await res.text();

    const title = extractTitleFromHtml( html );
    const excerpt = extractExcerptFromHtml( html );
    const imageUrl = extractImageFromHtml( html ) || undefined;
    const publishedMs = extractPublishedFromHtml( html ) || undefined;

    return {
      title,
      excerpt,
      imageUrl,
      publishedMs,
    };
  } catch
  {
    return null;
  }
}

async function fetchSource ( source: NewsSource ): Promise<SourceCacheEntry>
{
  const fetchUrl = getFetchUrl( source );

  if ( !fetchUrl )
  {
    return { lastFetchedMs: Date.now(), items: [], lastError: 'Missing feed/sitemap URL' };
  }

  if ( source.kind === 'sitemap' )
  {
    const res = await fetch( fetchUrl, {
      headers: {
        Accept: 'application/xml, text/xml;q=0.9, */*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NexusWebApp/1.0',
      },
      cache: 'no-store',
    } );

    if ( !res.ok )
    {
      throw new Error( `Sitemap responded with ${ res.status }` );
    }

    const xml = await res.text();
    const parsed = parser.parse( xml );

    const urlEntries = toArray<any>( parsed?.urlset?.url );
    const sitemapEntries = toArray<any>( parsed?.sitemapindex?.sitemap );

    let urls: Array<{ loc: string; lastmod?: string }> = [];

    if ( urlEntries.length > 0 )
    {
      urls = urlEntries
        .map( ( u ) => ( { loc: extractFirstText( u?.loc ), lastmod: extractFirstText( u?.lastmod ) } ) )
        .filter( ( u ) => u.loc );
    } else if ( sitemapEntries.length > 0 )
    {
      const sitemapLocs = sitemapEntries
        .map( ( s ) => extractFirstText( s?.loc ) )
        .filter( Boolean )
        .slice( 0, 3 );

      for ( const loc of sitemapLocs )
      {
        try
        {
          const childRes = await fetch( loc, {
            headers: {
              Accept: 'application/xml, text/xml;q=0.9, */*;q=0.8',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NexusWebApp/1.0',
            },
            cache: 'no-store',
          } );
          if ( !childRes.ok ) continue;
          const childXml = await childRes.text();
          const childParsed = parser.parse( childXml );
          const childUrls = toArray<any>( childParsed?.urlset?.url )
            .map( ( u ) => ( { loc: extractFirstText( u?.loc ), lastmod: extractFirstText( u?.lastmod ) } ) )
            .filter( ( u ) => u.loc );
          urls.push( ...childUrls );
        } catch
        {
          // ignore child sitemap errors
        }
      }
    }

    urls = urls
      .map( ( u ) => ( { ...u, lastmodMs: safeDateMs( u.lastmod ) } ) )
      .sort( ( a, b ) => ( b.lastmodMs || 0 ) - ( a.lastmodMs || 0 ) )
      .slice( 0, 30 );

    const items: NewsItem[] = [];
    const delay = Math.max( 250, source.crawlDelayMs || 250 );

    for ( const u of urls )
    {
      const normalized = normalizeUrl( u.loc );
      if ( !normalized ) continue;

      const meta = await fetchArticleMeta( normalized );
      if ( !meta ) continue;

      const publishedAtMs = meta.publishedMs || u.lastmodMs || Date.now();
      const publishedAt = new Date( publishedAtMs ).toISOString();
      const title = meta.title || normalized;
      const excerpt = meta.excerpt || '';

      items.push( {
        id: buildStableNewsId( source, normalized, title, publishedAtMs ),
        title,
        url: normalized,
        source: { id: source.id, name: source.name },
        publishedAt,
        publishedAtMs,
        ...( meta.imageUrl ? { imageUrl: meta.imageUrl } : undefined ),
        ...( excerpt ? { excerpt } : undefined ),
      } );

      if ( delay ) await new Promise( ( r ) => setTimeout( r, delay ) );
    }

    items.sort( ( a, b ) => b.publishedAtMs - a.publishedAtMs );

    return {
      lastFetchedMs: Date.now(),
      items: items.slice( 0, 80 ),
    };
  }

  const res = await fetch( fetchUrl, {
    headers: {
      Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NexusWebApp/1.0',
    },
    // Next fetch cache is irrelevant here due to dynamic route, but keep explicit.
    cache: 'no-store',
  } );

  if ( !res.ok )
  {
    throw new Error( `Feed responded with ${ res.status }` );
  }

  const xml = await res.text();
  const items = parseFeedToItems( source, xml );

  // keep most recent ~80 per source
  items.sort( ( a, b ) => b.publishedAtMs - a.publishedAtMs );

  return {
    lastFetchedMs: Date.now(),
    items: items.slice( 0, 80 ),
  };
}

async function ensureSourcesUpToDate (): Promise<NewsApiResponse[ 'meta' ][ 'sources' ]>
{
  const now = Date.now();
  const metaSources: NewsApiResponse[ 'meta' ][ 'sources' ] = [];

  for ( const source of NEWS_SOURCES )
  {
    const existing = sourceCache.get( source.id );
    const needsFetch = !existing || now - existing.lastFetchedMs >= TTL_MS;

    if ( !needsFetch )
    {
      metaSources.push( {
        id: source.id,
        name: source.name,
        fetchUrl: getFetchUrl( source ),
        lastFetchedAt: new Date( existing.lastFetchedMs ).toISOString(),
        ok: !existing.lastError,
        ...( existing.lastError ? { error: existing.lastError } : undefined ),
        itemCount: existing.items.length,
      } );
      continue;
    }

    try
    {
      const entry = await fetchSource( source );
      const mergedItems = mergeSourceItems( existing?.items || [], entry.items || [] );
      sourceCache.set( source.id, {
        ...entry,
        items: mergedItems,
        lastError: undefined,
      } );
      metaSources.push( {
        id: source.id,
        name: source.name,
        fetchUrl: getFetchUrl( source ),
        lastFetchedAt: new Date( entry.lastFetchedMs ).toISOString(),
        ok: true,
        itemCount: entry.items.length,
      } );
    } catch ( e: any )
    {
      const errMsg = e?.message ? String( e.message ) : 'Unknown error';

      const fallback: SourceCacheEntry = existing
        ? { ...existing, lastError: errMsg }
        : { lastFetchedMs: now, items: [], lastError: errMsg };

      // Keep whatever we had; but stamp lastFetched so we don't hammer the source.
      sourceCache.set( source.id, fallback );

      metaSources.push( {
        id: source.id,
        name: source.name,
        fetchUrl: getFetchUrl( source ),
        lastFetchedAt: new Date( fallback.lastFetchedMs ).toISOString(),
        ok: false,
        error: errMsg,
        itemCount: fallback.items.length,
      } );
    }

    // polite micro-delay between sources
    await new Promise( ( r ) => setTimeout( r, 250 ) );
  }

  return metaSources;
}

function buildCombinedDedupedItems (): NewsItem[]
{
  const all: NewsItem[] = [];
  for ( const source of NEWS_SOURCES )
  {
    const entry = sourceCache.get( source.id );
    if ( entry?.items?.length ) all.push( ...entry.items );
  }

  // Dedup by normalized URL first
  const byUrl = new Map<string, NewsItem>();
  for ( const it of all )
  {
    const key = normalizeUrl( it.url );
    const existing = byUrl.get( key );
    if ( !existing )
    {
      byUrl.set( key, it );
      continue;
    }
    byUrl.set( key, chooseBetter( existing, it ) );
  }

  const deduped = Array.from( byUrl.values() );
  // Cross-source dedup by title + day bucket
  const byTitle = new Map<string, NewsItem>();
  for ( const it of deduped )
  {
    const key = buildTitleKey( it.title, it.publishedAtMs );
    const existing = byTitle.get( key );
    if ( !existing )
    {
      byTitle.set( key, it );
      continue;
    }
    byTitle.set( key, chooseBetter( existing, it ) );
  }

  const finalItems = Array.from( byTitle.values() );
  finalItems.sort( ( a, b ) => b.publishedAtMs - a.publishedAtMs );
  return finalItems;
}

export async function GET ( request: Request )
{
  const { searchParams } = new URL( request.url );

  const page = Math.max( 1, Number( searchParams.get( 'page' ) || '1' ) || 1 );
  const pageSizeRaw = Number( searchParams.get( 'pageSize' ) || String( DEFAULT_PAGE_SIZE ) ) || DEFAULT_PAGE_SIZE;
  const pageSize = Math.min( 50, Math.max( 5, pageSizeRaw ) );

  // We always enforce TTL per source; calling the API frequently will not refetch each time.
  const sourcesMeta = await ensureSourcesUpToDate();

  const combined = buildCombinedDedupedItems();

  const totalItems = combined.length;
  const totalPages = Math.max( 1, Math.ceil( totalItems / pageSize ) );
  const safePage = Math.min( page, totalPages );

  const start = ( safePage - 1 ) * pageSize;
  const items = combined.slice( start, start + pageSize );

  const payload: NewsApiResponse = {
    items,
    page: safePage,
    pageSize,
    totalItems,
    totalPages,
    fetchedAt: new Date().toISOString(),
    meta: {
      ttlMs: TTL_MS,
      sources: sourcesMeta,
    },
  };

  return NextResponse.json( payload, {
    headers: {
      'Cache-Control': 'no-store, must-revalidate',
    },
  } );
}
