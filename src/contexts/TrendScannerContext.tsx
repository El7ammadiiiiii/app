'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { db, ensureAnonymousAuth } from '@/lib/firebase/client';
import { exchangeOrchestrator } from '@/lib/services/ExchangeOrchestrator';

export interface TrendAnalysis
{
  id: string;
  symbol: string;
  exchange: string;
  overallTrend: 'bullish' | 'bearish' | 'neutral';
  bullishScore: number;
  bearishScore: number;
  price: number;
  change24h: number;
  detectedAt: Timestamp;
  timeframes: Record<string, {
    bullishScore: number;
    bearishScore: number;
    trend: string;
  }>;
}

interface TrendScannerContextType
{
  results: TrendAnalysis[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

const TrendScannerContext = createContext<TrendScannerContextType | null>( null );

export function TrendScannerProvider ( { children }: { children: React.ReactNode } )
{
  const [ resultsCache, setResultsCache ] = useState<Record<string, TrendAnalysis[]>>( {} );
  const [ isLoading, setIsLoading ] = useState( true );
  const [ error, setError ] = useState<string | null>( null );
  const [ isAuthReady, setIsAuthReady ] = useState( false );
  const [ lastUpdated, setLastUpdated ] = useState<Date | null>( null );
  const [ activeExchange, setActiveExchange ] = useState( exchangeOrchestrator.getActiveExchange() );
  const unsubscribersRef = useRef<Record<string, ( () => void )>>( {} );

  // مراقبة تغيير المنصة النشطة من المحرك المركزي
  useEffect(() => {
    const interval = setInterval(() => {
      const current = exchangeOrchestrator.getActiveExchange();
      if (current !== activeExchange) {
        setActiveExchange(current);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [activeExchange]);

  // 1. التأكد من المصادقة أولاً
  useEffect( () =>
  {
    const initAuth = async () =>
    {
      try
      {
        await ensureAnonymousAuth();
        setIsAuthReady( true );
      } catch ( err )
      {
        console.error( "Trend Auth initialization failed:", err );
        setError( "فشل تهيئة الاتصال الآمن" );
      }
    };
    initAuth();
  }, [] );

  const subscribe = useCallback( () =>
  {
    if ( !db || !isAuthReady ) return;
    const exchange = activeExchange.toLowerCase();

    // Cleanup previous subscription for this exchange if exists
    if ( unsubscribersRef.current[ exchange ] )
    {
      try { unsubscribersRef.current[ exchange ](); } catch (_) { /* ignore */ }
      delete unsubscribersRef.current[ exchange ];
    }

    setIsLoading( true );
    try
    {
      // Stable Nested Structure: scanners_results/{pageId}/exchanges/{exchange}/data
      const q = query(
        collection( db, 'scanners_results', 'trend-scanner', 'exchanges', exchange, 'data' ),
        limit( 300 )
      );

      const unsub = onSnapshot( q, ( snapshot ) =>
      {
        const data = snapshot.docs.map( doc => ( { id: doc.id, ...doc.data() } ) ) as TrendAnalysis[];
        setResultsCache( prev => ( { ...prev, [ exchange ]: data } ) );
        setIsLoading( false );
        setError( null );
        setLastUpdated( new Date() );
      }, ( err ) =>
      {
        console.error( `Firestore trend error (${ exchange }):`, err );
        if ( err.code === 'permission-denied' )
        {
          setError( "خطأ في الصلاحيات: يرجى التأكد من تحديث قواعد Firestore" );
        } else
        {
          setError( err.message );
        }
        setIsLoading( false );
      } );

      unsubscribersRef.current[ exchange ] = unsub;
    } catch ( err )
    {
      console.error( 'Trend subscribe error:', err );
      setIsLoading( false );
    }
  }, [ activeExchange, isAuthReady ] );

  useEffect( () =>
  {
    if ( isAuthReady )
    {
      subscribe();
    }
    return () =>
    {
      Object.values( unsubscribersRef.current ).forEach( unsub => { try { unsub(); } catch (_) { /* ignore Firestore internal state errors */ } } );
      unsubscribersRef.current = {};
    };
  }, [ subscribe, isAuthReady ] );

  const results = useMemo( () => resultsCache[ activeExchange.toLowerCase() ] || [], [ resultsCache, activeExchange ] );

  return (
    <TrendScannerContext.Provider value={ { results, isLoading, error, lastUpdated, refresh: subscribe } }>
      { children }
    </TrendScannerContext.Provider>
  );
}

export function useTrendScanner ()
{
  const context = useContext( TrendScannerContext );
  if ( !context ) throw new Error( 'useTrendScanner must be used within TrendScannerProvider' );
  return context;
}
