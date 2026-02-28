/**
 * 🎯 useScannerData — Unified hook for all scanner pages
 *
 * Replaces individual scanner contexts (PatternScanner, VolumeScanner, etc.)
 * Subscribes to Firestore ONLY for the currently active exchange.
 *
 * Firebase path:
 *   scanners_results/{pageId}/exchanges/{exchange}/timeframes/{tf}/data/*
 *
 * Falls back to legacy path if new path is empty:
 *   scanners_results/{pageId}/exchanges/{exchange}/data/*
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, limit, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db, ensureAnonymousAuth } from '@/lib/firebase/client';
import { useExchangeStore } from '@/stores/exchangeStore';

// ═══════════════════════════════════════════════════════════════════════
// 📋 Types
// ═══════════════════════════════════════════════════════════════════════

export interface ScannerMeta
{
  last_updated: number;
  symbols_count: number;
  status: string;
  exchange: string;
  timeframe: string;
  error?: string;
}

export interface UseScannerDataOptions
{
  /** Scanner page ID: pattern, fibonacci, divergence, levels, trend, volume, rsi-heatmap, macd-heatmap, favorites */
  pageId: string;
  /** Timeframe filter (default: '1h') */
  timeframe?: string;
  /** Override exchange (default: from exchangeStore) */
  exchange?: string;
  /** Max documents to load (default: 300) */
  maxResults?: number;
  /** Enable/disable subscription (default: true) */
  enabled?: boolean;
}

export interface UseScannerDataReturn<T = any>
{
  /** Scanner results from Firestore */
  results: T[];
  /** Loading state */
  isLoading: boolean;
  /** Error message (Arabic) */
  error: string | null;
  /** Metadata about last update */
  meta: ScannerMeta | null;
  /** Current active exchange */
  activeExchange: string;
  /** Current timeframe */
  activeTimeframe: string;
  /** Force refresh (triggers unsubscribe + resubscribe) */
  refresh: () => void;
}

// ═══════════════════════════════════════════════════════════════════════
// 🎣 Hook
// ═══════════════════════════════════════════════════════════════════════

export function useScannerData<T = any> (
  options: UseScannerDataOptions
): UseScannerDataReturn<T>
{
  const {
    pageId,
    timeframe = '1h',
    exchange: exchangeOverride,
    maxResults = 300,
    enabled = true,
  } = options;

  const { activeExchange: storeExchange } = useExchangeStore();
  const exchange = exchangeOverride || storeExchange;

  const [ results, setResults ] = useState<T[]>( [] );
  const [ isLoading, setIsLoading ] = useState( true );
  const [ error, setError ] = useState<string | null>( null );
  const [ meta, setMeta ] = useState<ScannerMeta | null>( null );
  const [ isAuthReady, setIsAuthReady ] = useState( false );
  const [ refreshCounter, setRefreshCounter ] = useState( 0 );

  const unsubRef = useRef<( () => void ) | null>( null );

  // ─── Auth ───
  useEffect( () =>
  {
    if ( typeof window === 'undefined' || !enabled ) return;
    let cancelled = false;
    ensureAnonymousAuth()
      .then( () => { if ( !cancelled ) setIsAuthReady( true ); } )
      .catch( ( err ) =>
      {
        console.error( `[useScannerData:${ pageId }] Auth failed:`, err );
        if ( !cancelled ) setError( 'فشل تهيئة الاتصال الآمن' );
      } );
    return () => { cancelled = true; };
  }, [ enabled, pageId ] );

  // ─── Subscribe to Firestore ───
  useEffect( () =>
  {
    if ( typeof window === 'undefined' || !db || !isAuthReady || !enabled ) return;

    // Cleanup previous subscription
    if ( unsubRef.current )
    {
      try { unsubRef.current(); } catch ( _ ) { /* ignore */ }
      unsubRef.current = null;
    }

    setIsLoading( true );
    setError( null );

    const exchangeLower = exchange.toLowerCase();

    // Try new path first: scanners_results/{pageId}/exchanges/{exchange}/timeframes/{tf}/data
    const newPathCollection = collection(
      db,
      'scanners_results', pageId,
      'exchanges', exchangeLower,
      'timeframes', timeframe,
      'data'
    );

    // Legacy path: scanners_results/{pageId}/exchanges/{exchange}/data
    const legacyPathCollection = collection(
      db,
      'scanners_results', pageId,
      'exchanges', exchangeLower,
      'data'
    );

    let triedLegacy = false;

    const subscribeToPath = ( col: ReturnType<typeof collection>, isLegacy = false ) =>
    {
      const q = query( col, limit( maxResults ) );

      const unsub = onSnapshot( q, ( snapshot ) =>
      {
        const data = snapshot.docs.map( doc_ => ( {
          id: doc_.id,
          ...doc_.data()
        } ) ) as T[];

        // If new path returns empty and we haven't tried legacy yet
        if ( data.length === 0 && !isLegacy && !triedLegacy )
        {
          triedLegacy = true;
          unsub(); // Unsubscribe from empty new path
          subscribeToPath( legacyPathCollection, true );
          return;
        }

        setResults( data );
        setIsLoading( false );
        setError( null );
      }, ( err ) =>
      {
        console.error( `[useScannerData:${ pageId }] Firestore error:`, err );
        setIsLoading( false );

        if ( err.code === 'permission-denied' )
        {
          setError( 'خطأ في الصلاحيات: يرجى التأكد من تحديث قواعد Firestore' );
        } else if ( !isLegacy && !triedLegacy )
        {
          // Try legacy path on error
          triedLegacy = true;
          subscribeToPath( legacyPathCollection, true );
        } else
        {
          setError( 'فشل جلب بيانات الماسح' );
        }
      } );

      unsubRef.current = unsub;
    };

    subscribeToPath( newPathCollection );

    // Also fetch meta document
    const metaDocRef = doc(
      db,
      'scanners_results', pageId,
      'exchanges', exchangeLower,
      'timeframes', timeframe
    );
    getDoc( metaDocRef )
      .then( ( snap ) =>
      {
        if ( snap.exists() )
        {
          setMeta( snap.data() as ScannerMeta );
        }
      } )
      .catch( () => { /* meta is optional */ } );

    return () =>
    {
      if ( unsubRef.current )
      {
        try { unsubRef.current(); } catch ( _ ) { /* ignore */ }
        unsubRef.current = null;
      }
    };
  }, [ pageId, exchange, timeframe, maxResults, isAuthReady, enabled, refreshCounter ] );

  const refresh = useCallback( () =>
  {
    setRefreshCounter( c => c + 1 );
  }, [] );

  return {
    results,
    isLoading,
    error,
    meta,
    activeExchange: exchange,
    activeTimeframe: timeframe,
    refresh,
  };
}
