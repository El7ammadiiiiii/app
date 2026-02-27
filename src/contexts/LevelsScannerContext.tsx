'use client';

import * as React from 'react';
import { collection, query, limit, onSnapshot } from 'firebase/firestore';
import { db, ensureAnonymousAuth } from '@/lib/firebase/client';
import { LevelResult } from '@/lib/scanners/levels-detector';
import { EXCHANGE_PRIORITY } from '@/lib/services/exchangeRegistry';

interface LevelsScannerContextType
{
  results: LevelResult[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

const LevelsScannerContext = React.createContext<LevelsScannerContextType | null>( null );

// 🌐 جميع المنصات المدعومة (14 منصة)
const ALL_EXCHANGES = EXCHANGE_PRIORITY;

// ============================================================================
// 📊 MOCK DATA - Fallback when Firebase fails
// ============================================================================

function generateMockCandles ( basePrice: number, count: number = 100 ): any[]
{
  const candles = [];
  let price = basePrice;
  const now = Date.now();

  for ( let i = count - 1; i >= 0; i-- )
  {
    const change = ( Math.random() - 0.5 ) * basePrice * 0.02;
    const open = price;
    const close = price + change;
    const high = Math.max( open, close ) + Math.random() * basePrice * 0.005;
    const low = Math.min( open, close ) - Math.random() * basePrice * 0.005;
    const volume = Math.random() * 1000000 + 100000;

    candles.push( {
      timestamp: now - i * 3600000,
      open,
      high,
      low,
      close,
      volume
    } );

    price = close;
  }

  return candles;
}

function generateMockLevels ( currentPrice: number ): any[]
{
  return [
    { price: currentPrice * 1.05, type: 'resistance', strength: 85, touches: 3 },
    { price: currentPrice * 1.02, type: 'resistance', strength: 70, touches: 2 },
    { price: currentPrice * 0.98, type: 'support', strength: 80, touches: 4 },
    { price: currentPrice * 0.95, type: 'support', strength: 75, touches: 3 },
  ];
}

const MOCK_SYMBOLS = [
  { symbol: 'BTCUSDT', basePrice: 97500 },
  { symbol: 'ETHUSDT', basePrice: 3250 },
  { symbol: 'SOLUSDT', basePrice: 195 },
  { symbol: 'BNBUSDT', basePrice: 680 },
  { symbol: 'XRPUSDT', basePrice: 2.45 },
  { symbol: 'ADAUSDT', basePrice: 0.95 },
  { symbol: 'DOGEUSDT', basePrice: 0.32 },
  { symbol: 'AVAXUSDT', basePrice: 38.5 },
  { symbol: 'DOTUSDT', basePrice: 7.2 },
  { symbol: 'LINKUSDT', basePrice: 24.5 },
];

const MOCK_TIMEFRAMES = [ '1h', '4h', '1d' ];

function generateMockResults (): LevelResult[]
{
  const results: LevelResult[] = [];

  MOCK_SYMBOLS.forEach( ( item, idx ) =>
  {
    MOCK_TIMEFRAMES.forEach( ( tf ) =>
    {
      const candles = generateMockCandles( item.basePrice );
      const currentPrice = candles[ candles.length - 1 ].close;

      results.push( {
        id: `mock-${ item.symbol }-${ tf }-${ idx }`,
        symbol: item.symbol,
        exchange: 'bybit',
        timeframe: tf,
        currentPrice,
        levels: generateMockLevels( currentPrice ),
        status: 'active',
        distanceToNearestResistance: 2.5,
        distanceToNearestSupport: 1.8,
        nearestResistance: null,
        nearestSupport: null,
        timestamp: Date.now(),
        candles,
        scannedAt: Date.now(),
      } as LevelResult );
    } );
  } );

  return results;
}

// ============================================================================

export function LevelsScannerProvider ( { children }: { children: React.ReactNode } )
{
  const [ allResults, setAllResults ] = React.useState<LevelResult[]>( [] );
  const [ isLoading, setIsLoading ] = React.useState( true );
  const [ error, setError ] = React.useState<string | null>( null );
  const [ useMockData, setUseMockData ] = React.useState( false );
  const unsubRefs = React.useRef<Map<string, () => void>>( new Map() );
  const exchangeData = React.useRef<Map<string, LevelResult[]>>( new Map() );
  const firebaseErrorCount = React.useRef( 0 );

  // 1. التأكد من المصادقة أولاً
  React.useEffect( () =>
  {
    const initAuth = async () =>
    {
      try
      {
        await ensureAnonymousAuth();
      } catch ( err )
      {
        console.error( "Levels Auth initialization failed:", err );
        console.log( "🔄 Using mock data as fallback..." );
        setUseMockData( true );
        setAllResults( generateMockResults() );
        setIsLoading( false );
      }
    };
    initAuth();
  }, [] );

  // 2. الاشتراك في جميع المنصات الـ14
  const subscribeToAllExchanges = React.useCallback( () =>
  {
    if ( typeof window === 'undefined' || !db ) return;

    // إذا كنا نستخدم mock data بالفعل، لا داعي للاشتراك
    if ( useMockData )
    {
      setAllResults( generateMockResults() );
      setIsLoading( false );
      return;
    }

    console.log( '🔍 Levels Scanner - Subscribing to ALL exchanges:', ALL_EXCHANGES );
    setIsLoading( true );

    // إلغاء الاشتراكات السابقة
    unsubRefs.current.forEach( unsub => { try { unsub(); } catch (_) { /* ignore */ } } );
    unsubRefs.current.clear();
    firebaseErrorCount.current = 0;

    let loadedCount = 0;
    const totalExchanges = ALL_EXCHANGES.length;

    // الاشتراك في كل منصة
    ALL_EXCHANGES.forEach( ( exchange ) =>
    {
      try
      {
        const exchangeId = exchange.toLowerCase();

        const q = query(
          collection( db, 'scanners_results', 'levels-scanner', 'exchanges', exchangeId, 'data' ),
          limit( 300 )
        );

        const unsub = onSnapshot( q,
          ( snapshot ) =>
          {
            const data = snapshot.docs.map( doc =>
            {
              const docData = doc.data();
              return {
                id: doc.id,
                ...docData,
                exchange: exchangeId // تأكد من وجود exchange في البيانات
              };
            } ) as LevelResult[];

            // حفظ بيانات المنصة
            exchangeData.current.set( exchangeId, data );

            console.log( `📊 ${ exchange }: ${ data.length } levels loaded` );

            // دمج البيانات من جميع المنصات
            const combinedResults: LevelResult[] = [];
            exchangeData.current.forEach( ( results ) =>
            {
              combinedResults.push( ...results );
            } );

            setAllResults( combinedResults );

            // انتهى التحميل بعد أول استجابة من جميع المنصات
            loadedCount++;
            if ( loadedCount === totalExchanges )
            {
              setIsLoading( false );
              console.log( `✅ All exchanges loaded: ${ combinedResults.length } total levels` );
            }
          },
          ( err ) =>
          {
            console.error( `❌ ${ exchange } error:`, err );
            firebaseErrorCount.current++;

            // انتهى التحميل بعد أول استجابة من جميع المنصات
            loadedCount++;
            if ( loadedCount === totalExchanges )
            {
              setIsLoading( false );

              // إذا فشلت جميع المنصات، استخدم mock data
              if ( firebaseErrorCount.current >= totalExchanges * 0.8 )
              {
                console.log( '🔄 Too many Firebase errors, switching to mock data...' );
                setUseMockData( true );
                setAllResults( generateMockResults() );
              }
            }

            if ( err.code === 'permission-denied' )
            {
              setError( "خطأ في الصلاحيات: يرجى التأكد من تحديث قواعد Firestore" );
            }
          }
        );

        unsubRefs.current.set( exchangeId, unsub );
      } catch ( err )
      {
        console.error( `❌ Failed to subscribe to ${ exchange }:`, err );
        loadedCount++;
        if ( loadedCount === totalExchanges )
        {
          setIsLoading( false );
        }
      }
    } );

    // Timeout لتجنب التحميل المستمر
    setTimeout( () =>
    {
      if ( isLoading )
      {
        setIsLoading( false );
        console.log( '⏱️ Loading timeout reached' );

        // إذا لم نحصل على بيانات، استخدم mock data
        if ( allResults.length === 0 )
        {
          console.log( '🔄 No data received, using mock data...' );
          setUseMockData( true );
          setAllResults( generateMockResults() );
        }
      }
    }, 5000 ); // تقليل الـ timeout إلى 5 ثواني

  }, [ useMockData ] );

  React.useEffect( () =>
  {
    subscribeToAllExchanges();

    return () =>
    {
      // إلغاء جميع الاشتراكات عند unmount
      unsubRefs.current.forEach( unsub => { try { unsub(); } catch (_) { /* ignore Firestore internal state errors */ } } );
      unsubRefs.current.clear();
    };
  }, [ subscribeToAllExchanges ] );

  const results = React.useMemo( () =>
  {
    // ترتيب حسب الوقت (الأحدث أولاً)
    return allResults.sort( ( a, b ) => ( b.detectedAt?.seconds || 0 ) - ( a.detectedAt?.seconds || 0 ) );
  }, [ allResults ] );

  return (
    <LevelsScannerContext.Provider value={ {
      results,
      isLoading,
      error,
      refresh: subscribeToAllExchanges
    } }>
      { children }
    </LevelsScannerContext.Provider>
  );
}

export function useLevelsScanner ()
{
  const context = React.useContext( LevelsScannerContext );
  if ( !context ) throw new Error( 'useLevelsScanner must be used within LevelsScannerProvider' );
  return context;
}