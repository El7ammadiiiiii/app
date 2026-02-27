import type { NewsItem, NewsSource } from './types';

const TRACKING_PARAMS = new Set( [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'gclid',
  'fbclid',
  'mc_cid',
  'mc_eid',
  'ref',
  'source',
] );

export function normalizeUrl ( input: string ): string
{
  try
  {
    const u = new URL( input );
    u.hash = '';

    // Remove common tracking params
    for ( const key of Array.from( u.searchParams.keys() ) )
    {
      if ( TRACKING_PARAMS.has( key ) || key.toLowerCase().startsWith( 'utm_' ) )
      {
        u.searchParams.delete( key );
      }
    }

    // Normalize host + pathname
    u.host = u.host.toLowerCase();

    let out = u.toString();

    // Drop trailing slash
    if ( out.endsWith( '/' ) ) out = out.slice( 0, -1 );

    return out;
  } catch
  {
    return input.trim();
  }
}

export function stripHtml ( input: string ): string
{
  const s = ( input || '' ).toString();
  // remove tags
  const noTags = s.replace( /<[^>]*>/g, ' ' );
  // decode a minimal set of entities
  const decoded = noTags
    .replace( /&nbsp;/g, ' ' )
    .replace( /&amp;/g, '&' )
    .replace( /&lt;/g, '<' )
    .replace( /&gt;/g, '>' )
    .replace( /&quot;/g, '"' )
    .replace( /&#39;/g, "'" );

  return decoded.replace( /\s+/g, ' ' ).trim();
}

export function normalizeTitle ( input: string ): string
{
  const base = stripHtml( input )
    .toLowerCase()
    .replace( /['"“”‘’`]/g, '' )
    .replace( /[^a-z0-9\u0600-\u06FF\s]/gi, ' ' )
    .replace( /\s+/g, ' ' )
    .trim();
  return base;
}

export function buildTitleKey ( title: string, publishedAtMs: number ): string
{
  const normalized = normalizeTitle( title );
  const day = publishedAtMs ? new Date( publishedAtMs ).toISOString().slice( 0, 10 ) : 'unknown';
  return `${ normalized }|${ day }`;
}

export function toExcerpt ( text: string, maxLen = 260 ): string
{
  const t = stripHtml( text );
  if ( !t ) return '';
  if ( t.length <= maxLen ) return t;
  return `${ t.slice( 0, maxLen - 1 ).trim() }…`;
}

export function safeDateMs ( input: unknown ): number
{
  if ( !input ) return 0;
  const ms = Date.parse( String( input ) );
  return Number.isFinite( ms ) ? ms : 0;
}

export function buildStableNewsId ( source: NewsSource, url: string, title: string, publishedAtMs: number ): string
{
  const base = normalizeUrl( url ) || `${ source.id }:${ title }`;
  // cheap stable hash
  const raw = `${ base }|${ publishedAtMs }`;
  let h = 2166136261;
  for ( let i = 0; i < raw.length; i++ )
  {
    h ^= raw.charCodeAt( i );
    h = Math.imul( h, 16777619 );
  }
  return `news_${ source.id }_${ ( h >>> 0 ).toString( 16 ) }`;
}

export function chooseBetter ( a: NewsItem, b: NewsItem ): NewsItem
{
  // Prefer item that has an image, then longer excerpt
  const aScore = ( a.imageUrl ? 10 : 0 ) + ( ( a.excerpt?.length || 0 ) / 100 );
  const bScore = ( b.imageUrl ? 10 : 0 ) + ( ( b.excerpt?.length || 0 ) / 100 );
  return bScore > aScore ? b : a;
}
