'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { collection, query, limit, onSnapshot, orderBy } from 'firebase/firestore';
import { db, ensureAnonymousAuth } from '@/lib/firebase/client';
import { DivergenceResult } from '@/lib/scanners/advanced-divergence-detector';
import { useExchangeStore } from '@/stores/exchangeStore';

interface DivergenceScannerContextType
{
  results: DivergenceResult[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const DivergenceScannerContext = createContext<DivergenceScannerContextType | null>( null );

export function DivergenceScannerProvider ( { children }: { children: React.ReactNode } )
{
  const [ allResults, setAllResults ] = useState<DivergenceResult[]>( [] );
  const [ isLoading, setIsLoading ] = useState( true );
  const [ error, setError ] = useState<string | null>( null );
  const [ isAuthReady, setIsAuthReady ] = useState( false );
  const { activeExchange } = useExchangeStore();
  const unsubRef = useRef<( () => void ) | null>( null );

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
        console.error( "Auth initialization failed:", err );
        setError( "فشل تهيئة الاتصال الآمن" );
      }
    };
    initAuth();
  }, [] );

  const subscribe = useCallback( () =>
  {
    // 🚀 بدء فوري بدون انتظار المصادقة - القواعد تسمح بالقراءة
    if ( typeof window === 'undefined' || !db ) return;

    if ( unsubRef.current )
    {
      try { unsubRef.current(); } catch (_) { /* ignore */ }
      unsubRef.current = null;
    }

    setIsLoading( true );

    try
    {
      // Stable Nested Structure: scanners_results/{pageId}/exchanges/{exchange}/data
      const q = query(
        collection( db, 'scanners_results', 'divergence-scanner', 'exchanges', activeExchange.toLowerCase(), 'data' ),
        limit( 300 )
      );

      const unsub = onSnapshot( q, ( snapshot ) =>
      {
        const data = snapshot.docs.map( doc => ( { id: doc.id, ...doc.data() } ) ) as DivergenceResult[];
        setAllResults( data );
        setIsLoading( false );
        setError( null );
      }, ( err ) =>
      {
        console.error( `Divergence error (${ activeExchange }):`, err );
        setIsLoading( false );
        // إذا كان الخطأ بسبب الصلاحيات، نعرض رسالة واضحة
        if ( err.code === 'permission-denied' )
        {
          setError( "خطأ في الصلاحيات: يرجى التأكد من تحديث قواعد Firestore" );
        } else if ( allResults.length === 0 )
        {
          setError( "فشل جلب بيانات الدايفرجنس" );
        }
      } );

      unsubRef.current = unsub;
    } catch ( err )
    {
      console.error( "Divergence subscribe error:", err );
      setIsLoading( false );
    }
  }, [ activeExchange ] );

  // 🚀 بدء الاشتراك فوراً عند تحميل الموقع
  useEffect( () =>
  {
    subscribe();
    return () =>
    {
      try { if ( unsubRef.current ) unsubRef.current(); } catch (_) { /* ignore Firestore internal state errors */ }
    };
  }, [ subscribe ] );

  const refresh = useCallback( async () =>
  {
    await subscribe();
  }, [ subscribe ] );

  const results = useMemo( () =>
  {
    return [ ...allResults ].sort( ( a, b ) => ( b.timestamp || 0 ) - ( a.timestamp || 0 ) );
  }, [ allResults ] );

  return (
    <DivergenceScannerContext.Provider value={ { results, isLoading, error, refresh } }>
      { children }
    </DivergenceScannerContext.Provider>
  );
}

export function useDivergenceScanner ()
{
  const context = useContext( DivergenceScannerContext );
  if ( !context ) throw new Error( 'useDivergenceScanner must be used within DivergenceScannerProvider' );
  return context;
}
