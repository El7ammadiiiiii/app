'use client';

import * as React from 'react';
import { collection, query, limit, onSnapshot, where, orderBy } from 'firebase/firestore';
import { db, ensureAnonymousAuth } from '@/lib/firebase/client';
import { VolumeResult } from '@/lib/scanners/volume-scanner';
import { exchangeOrchestrator } from '@/lib/services/ExchangeOrchestrator';

interface VolumeScannerContextType
{
  results: VolumeResult[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

const VolumeScannerContext = React.createContext<VolumeScannerContextType | null>( null );

export function VolumeScannerProvider ( { children }: { children: React.ReactNode } )
{
  const [ allResults, setAllResults ] = React.useState<VolumeResult[]>( [] );
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
        console.error( "Volume Auth initialization failed:", err );
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
        collection( db, 'scanners_results', 'volume-scanner', 'exchanges', activeExchange.toLowerCase(), 'data' ),
        limit( 300 )
      );

      const unsub = onSnapshot( q, ( snapshot ) =>
      {
        const data = snapshot.docs.map( doc => ( { id: doc.id, ...doc.data() } ) ) as VolumeResult[];
        setAllResults( data );
        setIsLoading( false );
        setError( null );
      }, ( err ) =>
      {
        console.error( "Volume error:", err );
        setIsLoading( false );
        if ( err.code === 'permission-denied' )
        {
          setError( "خطأ في الصلاحيات: يرجى التأكد من تحديث قواعد Firestore" );
        } else if ( allResults.length === 0 )
        {
          setError( "فشل جلب بيانات السيولة" );
        }
      } );

      unsubRef.current = unsub;
    } catch ( err )
    {
      console.error( "Volume subscribe error:", err );
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

  return (
    <VolumeScannerContext.Provider value={ { results: allResults, isLoading, error, refresh: () => subscribe() } }>
      { children }
    </VolumeScannerContext.Provider>
  );
}

export function useVolumeScanner ()
{
  const context = React.useContext( VolumeScannerContext );
  if ( !context ) throw new Error( 'useVolumeScanner must be used within VolumeScannerProvider' );
  return context;
}
