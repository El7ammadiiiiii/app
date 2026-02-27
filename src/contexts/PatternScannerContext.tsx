'use client';

import * as React from 'react';
import { collection, query, limit, onSnapshot, orderBy, where } from 'firebase/firestore';
import { db, ensureAnonymousAuth } from '@/lib/firebase/client';
import { exchangeOrchestrator } from '@/lib/services/ExchangeOrchestrator';

export interface FirestorePattern
{
  id: string;
  exchange: string;
  symbol: string;
  timeframe: string;
  patternType: string;
  direction: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  detectedAt: any;
  candles?: any[];
  pivots?: any[];
}

interface PatternScannerContextType
{
  patterns: FirestorePattern[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

const PatternScannerContext = React.createContext<PatternScannerContextType | null>( null );

export function PatternScannerProvider ( { children }: { children: React.ReactNode } )
{
  const [ allPatterns, setAllPatterns ] = React.useState<FirestorePattern[]>( [] );
  const [ isLoading, setIsLoading ] = React.useState( true );
  const [ error, setError ] = React.useState<string | null>( null );
  const [ isAuthReady, setIsAuthReady ] = React.useState( false );
  const [ activeExchange, setActiveExchange ] = React.useState( exchangeOrchestrator.getActiveExchange() );
  const unsubRef = React.useRef<( () => void ) | null>( null );

  // مراقبة تغيير المنصة النشطة من المحرك المركزي
  React.useEffect(() => {
    const interval = setInterval(() => {
      const current = exchangeOrchestrator.getActiveExchange();
      if (current !== activeExchange) {
        setActiveExchange(current);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [activeExchange]);

  // 1. التأكد من المصادقة أولاً
  React.useEffect( () =>
  {
    const initAuth = async () =>
    {
      try
      {
        await ensureAnonymousAuth();
        setIsAuthReady( true );
      } catch ( err )
      {
        console.error( "Pattern Auth initialization failed:", err );
        setError( "فشل تهيئة الاتصال الآمن" );
      }
    };
    initAuth();
  }, [] );

  const subscribe = React.useCallback( () =>
  {
    if ( typeof window === 'undefined' || !db || !isAuthReady ) return;

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
        collection( db, 'scanners_results', 'pattern-scanner-new', 'exchanges', activeExchange.toLowerCase(), 'data' ),
        limit( 300 )
      );

      const unsub = onSnapshot( q, ( snapshot ) =>
      {
        const data = snapshot.docs.map( doc => ( { id: doc.id, ...doc.data() } ) ) as FirestorePattern[];
        setAllPatterns( data );
        setIsLoading( false );
        setError( null );
      }, ( err ) =>
      {
        console.error( `Firestore patterns error (${ activeExchange }):`, err );
        setIsLoading( false );
        if ( err.code === 'permission-denied' )
        {
          setError( "خطأ في الصلاحيات: يرجى التأكد من تحديث قواعد Firestore" );
        } else if ( allPatterns.length === 0 )
        {
          setError( "فشل جلب البيانات" );
        }
      } );

      unsubRef.current = unsub;
    } catch ( err )
    {
      console.error( "Pattern subscribe error:", err );
      setIsLoading( false );
    }
  }, [ activeExchange, isAuthReady ] );

  React.useEffect( () =>
  {
    if ( isAuthReady )
    {
      subscribe();
    }
    return () =>
    {
      try { if ( unsubRef.current ) unsubRef.current(); } catch (_) { /* ignore Firestore internal state errors */ }
    };
  }, [ subscribe, isAuthReady ] );

  // 🕒 البيانات جاهزة ومرتبة من Firestore
  const patterns = React.useMemo( () =>
  {
    return allPatterns.sort( ( a, b ) =>
    {
      const timeA = a.detectedAt?.seconds || a.detectedAt?.toMillis?.() / 1000 || 0;
      const timeB = b.detectedAt?.seconds || b.detectedAt?.toMillis?.() / 1000 || 0;
      return timeB - timeA;
    } );
  }, [ allPatterns ] );

  return (
    <PatternScannerContext.Provider value={ { patterns, isLoading, error, refresh: () => subscribe() } }>
      { children }
    </PatternScannerContext.Provider>
  );
}

export const usePatternScanner = () =>
{
  const context = React.useContext( PatternScannerContext );
  if ( !context ) throw new Error( 'usePatternScanner must be used within PatternScannerProvider' );
  return context;
};
