'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, WifiOff } from 'lucide-react';
import type { NewsApiResponse, NewsItem } from '@/lib/news/types';
import { NewsDetailOverlay } from './NewsDetailOverlay';

const PAGE_SIZE = 20;
const CLIENT_REFRESH_MS = 2 * 60 * 60 * 1000; // ساعتين

function formatEnglishDateTime ( iso: string ): string
{
  const dt = new Date( iso );
  try
  {
    return new Intl.DateTimeFormat( 'en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    } ).format( dt );
  } catch
  {
    return dt.toUTCString();
  }
}

export function NewsPageContent ()
{
  const [ page, setPage ] = useState( 1 );
  const [ data, setData ] = useState<NewsApiResponse | null>( null );
  const [ loading, setLoading ] = useState( false );
  const [ error, setError ] = useState<string | null>( null );
  const [ selected, setSelected ] = useState<NewsItem | null>( null );
  const [ isOnline, setIsOnline ] = useState<boolean | null>( null );
  const [ sourcesOpen, setSourcesOpen ] = useState( true );

  const intervalRef = useRef<number | null>( null );

  const totalPages = data?.totalPages || 1;
  const items = data?.items || [];

  const load = async ( { targetPage, reason }: { targetPage: number; reason: 'initial' | 'online' | 'timer' | 'page' } ) =>
  {
    setLoading( true );
    setError( null );

    try
    {
      // Always request; server enforces TTL per-source (2h). This makes it safe to call frequently.
      const url = `/api/news?page=${ targetPage }&pageSize=${ PAGE_SIZE }`;
      const res = await fetch( url, { cache: 'no-store' } );
      if ( !res.ok ) throw new Error( `API responded with ${ res.status }` );
      const json = ( await res.json() ) as NewsApiResponse;
      setData( json );

      // If the server clamped page (e.g., totalPages reduced), sync.
      if ( json.page !== targetPage ) setPage( json.page );

      // Keep a small breadcrumb in console for debugging.
      // eslint-disable-next-line no-console
      console.debug( `[news] loaded (${ reason })`, { page: json.page, total: json.totalItems } );
    } catch ( e: any )
    {
      setError( e?.message ? String( e.message ) : 'Failed to load news' );
    } finally
    {
      setLoading( false );
    }
  };

  // Initial load
  useEffect( () =>
  {
    load( { targetPage: 1, reason: 'initial' } );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [] );

  // Online/offline handling + auto refresh every 2 hours
  useEffect( () =>
  {
    setIsOnline( navigator.onLine );
    const handleOnline = () =>
    {
      setIsOnline( true );
      // عند اتصال الانترنت: قم بتحديث فوري (مع احترام TTL في السيرفر)
      load( { targetPage: 1, reason: 'online' } );
    };

    const handleOffline = () =>
    {
      setIsOnline( false );
    };

    window.addEventListener( 'online', handleOnline );
    window.addEventListener( 'offline', handleOffline );

    // refresh timer (only meaningful when tab is open)
    intervalRef.current = window.setInterval( () =>
    {
      if ( !navigator.onLine ) return;
      load( { targetPage: 1, reason: 'timer' } );
    }, CLIENT_REFRESH_MS );

    return () =>
    {
      window.removeEventListener( 'online', handleOnline );
      window.removeEventListener( 'offline', handleOffline );
      if ( intervalRef.current ) window.clearInterval( intervalRef.current );
      intervalRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [] );

  const sourcesStatus = useMemo( () => data?.meta?.sources || [], [ data ] );

  const goToPage = ( p: number ) =>
  {
    const clamped = Math.max( 1, Math.min( p, totalPages ) );
    setPage( clamped );
    load( { targetPage: clamped, reason: 'page' } );
  };

  return (
    <div className="min-h-screen text-white">
      <header className="sticky top-0 z-50 backdrop-blur-sm border-b border-white/[0.08] theme-header">
        <div className="max-w-[1800px] mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-white">news</h1>
              <p className="text-xs text-white/60">
                Auto-update: every 2 hours per site • { isOnline === null ? 'Checking' : ( isOnline ? 'Online' : 'Offline' ) }
              </p>
            </div>

            <div className="flex items-center gap-3">
              { loading ? (
                <div className="inline-flex items-center gap-2 text-xs text-white/70">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading
                </div>
              ) : null }

              { isOnline === false ? (
                <div className="inline-flex items-center gap-2 text-xs text-amber-200/90 border border-amber-300/20 bg-amber-400/10 px-3 py-1 rounded-full">
                  <WifiOff className="h-4 w-4" />
                  Offline
                </div>
              ) : null }
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-4 py-6">
        { error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200 mb-4">{ error }</div>
        ) : null }

        {/* Source health */ }
        <div className="glass-panel p-4 sm:p-5 mb-5">
          <button
            type="button"
            onClick={ () => setSourcesOpen( ( prev ) => !prev ) }
            className="w-full flex items-center justify-between text-sm font-bold text-white"
            aria-expanded={ sourcesOpen }
            aria-controls="news-sources-panel"
          >
            <span>Sources</span>
            <span className="text-xs text-white/60">{ sourcesOpen ? 'Hide' : 'Show' }</span>
          </button>

          { sourcesOpen ? (
            <div id="news-sources-panel" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-3">
              { sourcesStatus.map( ( s ) => (
                <div
                  key={ s.id }
                  className={
                    'rounded-lg border px-3 py-2 text-xs ' +
                    ( s.ok
                      ? 'border-white/10 bg-white/[0.04] text-white/80'
                      : 'border-amber-300/20 bg-amber-400/10 text-amber-100' )
                  }
                  title={ s.error || '' }
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-extrabold text-white/90">{ s.name }</div>
                    <div className="opacity-70">{ s.itemCount ?? 0 } items</div>
                  </div>
                  <div className="mt-1 opacity-70">Last fetch: { s.lastFetchedAt ? formatEnglishDateTime( s.lastFetchedAt ) : '—' }</div>
                  { !s.ok && s.error ? <div className="mt-1 opacity-90">{ s.error }</div> : null }
                </div>
              ) ) }
            </div>
          ) : null }
        </div>

        {/* News list */ }
        <div className="glass-panel p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-white/70">
              Showing <span className="text-white font-bold">{ items.length }</span> items • Page{ ' ' }
              <span className="text-white font-bold">{ data?.page ?? page }</span> / { totalPages }
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            { items.map( ( it ) => (
              <div
                key={ it.id }
                className="rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.06] transition-colors p-3"
              >
                <div className="flex gap-3">
                  <div className="w-[120px] h-[72px] rounded-lg overflow-hidden border border-white/10 bg-white/[0.03] flex-shrink-0">
                    { it.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ it.imageUrl } alt={ it.title } className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full" />
                    ) }
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs text-white/60">
                      <span className="font-bold text-cyan-200/90">{ it.source.name }</span>
                      <span>•</span>
                      <span>{ formatEnglishDateTime( it.publishedAt ) }</span>
                    </div>

                    <button
                      type="button"
                      onClick={ () => setSelected( it ) }
                      className="mt-1 text-left w-full"
                      title={ it.title }
                    >
                      <div className="text-sm font-extrabold text-white line-clamp-2 hover:underline">{ it.title }</div>
                    </button>

                    { it.excerpt ? (
                      <div className="mt-1 text-xs text-white/70 line-clamp-2">{ it.excerpt }</div>
                    ) : null }
                  </div>
                </div>
              </div>
            ) ) }

            { !loading && items.length === 0 ? (
              <div className="text-center py-16 text-white/60">No news items yet.</div>
            ) : null }
          </div>

          {/* Pagination */ }
          { totalPages > 1 ? (
            <div className="flex items-center justify-center gap-2 py-6">
              <button
                type="button"
                onClick={ () => goToPage( 1 ) }
                disabled={ ( data?.page ?? page ) === 1 || loading }
                className="p-2 rounded-lg bg-white/[0.05] text-gray-300 hover:text-white disabled:opacity-50"
              >
                «
              </button>
              <button
                type="button"
                onClick={ () => goToPage( ( data?.page ?? page ) - 1 ) }
                disabled={ ( data?.page ?? page ) === 1 || loading }
                className="p-2 rounded-lg bg-white/[0.05] text-gray-300 hover:text-white disabled:opacity-50"
              >
                ‹
              </button>

              <div className="text-xs text-white/70 px-3">Page { ( data?.page ?? page ) } of { totalPages }</div>

              <button
                type="button"
                onClick={ () => goToPage( ( data?.page ?? page ) + 1 ) }
                disabled={ ( data?.page ?? page ) === totalPages || loading }
                className="p-2 rounded-lg bg-white/[0.05] text-gray-300 hover:text-white disabled:opacity-50"
              >
                ›
              </button>
              <button
                type="button"
                onClick={ () => goToPage( totalPages ) }
                disabled={ ( data?.page ?? page ) === totalPages || loading }
                className="p-2 rounded-lg bg-white/[0.05] text-gray-300 hover:text-white disabled:opacity-50"
              >
                »
              </button>
            </div>
          ) : null }
        </div>
      </main>

      <NewsDetailOverlay item={ selected } isOpen={ !!selected } onClose={ () => setSelected( null ) } />
    </div>
  );
}
