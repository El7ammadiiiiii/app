'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useScannerData } from '@/hooks/useScannerData';
import { useExchangeStore } from '@/stores/exchangeStore';
import { cexManager, CEXCoin } from '@/lib/services/centralizedExchanges';
import { apiService } from '@/lib/services/apiService';
import { EXCHANGE_PRIORITY } from '@/lib/services/exchangeRegistry';
import { ExchangeSelector } from '@/components/layout/ExchangeSelector';
import
{
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import PatternFilters from './PatternFilters';
import TimeframeFilters from './TimeframeFilters';
import SymbolFilters from './SymbolFilters';
import PatternCard from './PatternCard';
import PatternModal from './PatternModal';
import { DetectedPattern, OHLCV } from './types';
import Scanner from './scanner';

// Fetch real OHLCV data from exchange API
async function fetchRealOHLCV (
  symbol: string,
  exchange: string,
  timeframe: string,
  limit: number = 200
): Promise<OHLCV[]>
{
  try
  {
    // Normalize symbol format for the API (remove /)
    const normalizedSymbol = symbol.replace( '/', '' );
    const params = new URLSearchParams( {
      exchange,
      symbol: normalizedSymbol,
      interval: timeframe,
      limit: String( limit ),
    } );

    const res = await fetch( `/api/ohlcv?${ params.toString() }` );
    if ( !res.ok ) return [];

    const json = await res.json();
    const data = Array.isArray( json?.data ) ? json.data : Array.isArray( json ) ? json : [];

    return data.map( ( c: any ) => ( {
      timestamp: c.timestamp || c.time || 0,
      open: parseFloat( c.open ) || 0,
      high: parseFloat( c.high ) || 0,
      low: parseFloat( c.low ) || 0,
      close: parseFloat( c.close ) || 0,
      volume: parseFloat( c.volume ) || 0,
    } ) );
  } catch ( err )
  {
    console.error( `[Pattern] Failed to fetch OHLCV for ${ symbol }:`, err );
    return [];
  }
}

const TIMEFRAMES = [
  { id: '15m', label: '15 دقيقة' },
  { id: '1h', label: '1 ساعة' },
  { id: '4h', label: '4 ساعات' },
  { id: '1d', label: '1 يوم' },
  { id: '1w', label: '1W' },
];

export default function PatternScannerNewContent ()
{
  const { activeExchange } = useExchangeStore();

  const [ selectedTimeframes, setSelectedTimeframes ] = useState<string[]>( TIMEFRAMES.map( t => t.id ) );

  // Context for real Firestore data
  const {
    results: firestorePatterns,
    isLoading: isPatternLoading,
    refresh: refreshFirestore
  } = useScannerData<DetectedPattern>( {
    pageId: 'pattern',
    timeframe: selectedTimeframes[ 0 ] || '1h',
  } );

  const [ unifiedPatterns, setUnifiedPatterns ] = useState<DetectedPattern[]>( [] );
  const [ isUnifiedLoading, setIsUnifiedLoading ] = useState( false );

  const [ selectedPatterns, setSelectedPatterns ] = useState<string[]>( [
    'ascending_channel', 'descending_channel', 'ranging_channel',
    'ascending_triangle_contracting', 'ascending_triangle_expanding',
    'descending_triangle_contracting', 'descending_triangle_expanding',
    'symmetrical_triangle_contracting', 'symmetrical_triangle_expanding',
    'falling_wedge_contracting', 'falling_wedge_expanding',
    'rising_wedge_contracting', 'rising_wedge_expanding',
    'flag_bull', 'flag_bear', 'pennant_bull', 'pennant_bear'
  ] );

  // Map to store selected symbols per exchange
  const [ exchangeSymbolsMap, setExchangeSymbolsMap ] = useState<Record<string, string[]>>( () =>
    EXCHANGE_PRIORITY.reduce( ( acc, id ) =>
    {
      acc[ id ] = [ 'all' ];
      return acc;
    }, {} as Record<string, string[]> )
  );

  const [ topSymbols, setTopSymbols ] = useState<CEXCoin[]>( [] );
  const [ viewMode, setViewMode ] = useState<'grid' | 'list'>( 'grid' );
  const [ isScanning, setIsScanning ] = useState( false );
  const [ selectedPattern, setSelectedPattern ] = useState<DetectedPattern | null>( null );

  // Get current selected symbols for active exchange
  const selectedSymbols = useMemo( () =>
    exchangeSymbolsMap[ activeExchange ] || [ 'all' ],
    [ exchangeSymbolsMap, activeExchange ] );

  // Fetch top coins for the current exchange
  useEffect( () =>
  {
    const fetchExchangeTopSymbols = async () =>
    {
      try
      {
        const coins = await cexManager.getTopCoinsByVolume( activeExchange as any );
        setTopSymbols( coins.slice( 0, 300 ) );
      } catch ( err )
      {
        console.error( 'Failed to fetch exchange top symbols:', err );
        setTopSymbols( [] );
      }
    };
    fetchExchangeTopSymbols();
  }, [ activeExchange ] );

  // Scanner config for pattern detection
  const SCANNER_CONFIG = { numberOfPivots: 5, errorRatio: 20.0, avoidOverlap: true };

  const handleScan = useCallback( async () =>
  {
    setIsScanning( true );
    setIsUnifiedLoading( true );

    try
    {
      // Determine which symbols to scan
      const symbolsToScan: string[] = [];
      if ( selectedSymbols.includes( 'all' ) )
      {
        // Use top symbols from exchange
        symbolsToScan.push( ...topSymbols.slice( 0, 20 ).map( s => s.symbol ) );
      } else
      {
        symbolsToScan.push( ...selectedSymbols );
      }

      // Fallback if no symbols loaded yet
      if ( symbolsToScan.length === 0 )
      {
        symbolsToScan.push( 'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'DOGE/USDT', 'ADA/USDT', 'AVAX/USDT', 'LINK/USDT', 'DOT/USDT', 'MATIC/USDT' );
      }

      const allDetectedPatterns: DetectedPattern[] = [];
      const timeframesToScan = selectedTimeframes.length > 0 ? selectedTimeframes : ['1h'];

      // Scan each timeframe × symbol combination (parallel per timeframe)
      await Promise.all(timeframesToScan.map(async (timeframe) => {
        for ( const sym of symbolsToScan )
        {
          try
          {
            const ohlcv = await fetchRealOHLCV( sym, activeExchange, timeframe, 300 );
            if ( !ohlcv || ohlcv.length < 30 ) continue;

            // Reset scanner state before each symbol to prevent cross-symbol data pollution
            const localScanner = new Scanner(SCANNER_CONFIG);

            const scannerData = {
              open: ohlcv.map( c => c.open ),
              high: ohlcv.map( c => c.high ),
              low: ohlcv.map( c => c.low ),
              close: ohlcv.map( c => c.close ),
            };

            const scanResults = localScanner.scan( scannerData );
            const combined = [ ...( scanResults.patterns || [] ), ...( scanResults.flags || [] ), ...( scanResults.pennants || [] ) ];

            combined.forEach( ( p: DetectedPattern ) =>
            {
              allDetectedPatterns.push( {
                ...p,
                symbol: sym.replace( '/', '' ),
                exchange: activeExchange,
                timeframe,
                candles: ohlcv,
                timestamp: Date.now(),
              } );
            } );
          } catch ( symErr )
          {
            console.warn( `[Pattern] Scan failed for ${ sym }@${ timeframe }:`, symErr );
          }
        }
      }));

      setUnifiedPatterns( allDetectedPatterns );

      // Also try the API for pre-computed patterns — for EACH timeframe
      for (const timeframe of timeframesToScan) {
        try
        {
          const data = await apiService.getPatterns( {
            exchange: activeExchange,
            symbol: selectedSymbols.includes( 'all' ) ? undefined : selectedSymbols[ 0 ],
            timeframe,
            limit: 50
          } );

          if ( data && data.length > 0 )
          {
            const mapped: DetectedPattern[] = await Promise.all( data.map( async ( p: any ) =>
            {
              let pCandles = p.candles || [];
              if ( pCandles.length === 0 && p.symbol )
              {
                pCandles = await fetchRealOHLCV( p.symbol, activeExchange, p.timeframe || timeframe, 200 );
              }
              return {
                valid: true,
                name: p.pattern_name || p.name,
                direction: p.direction || 'neutral',
                pivots: p.pivots || [],
                confidence: ( p.confidence || 0.8 ) * 100,
                level: 1,
                timestamp: new Date( p.processed_at || p.timestamp ).getTime(),
                type: p.pattern_type || p.type,
                symbol: p.symbol,
                exchange: p.exchange,
                timeframe: p.timeframe || timeframe,
                candles: pCandles,
              };
            } ) );
            setUnifiedPatterns( prev => [ ...prev, ...mapped ] );
          }
        } catch ( apiErr )
        {
          console.warn( `[Pattern] API patterns fetch failed for ${timeframe}:`, apiErr );
        }
      }

      // Patterns saved to Firebase by Python backend
    } catch ( err )
    {
      console.error( 'Failed to scan patterns:', err );
    } finally
    {
      setIsScanning( false );
      setIsUnifiedLoading( false );
    }
  }, [ activeExchange, selectedSymbols, selectedTimeframes, topSymbols ] );

  // Auto-scan on first load and exchange change
  useEffect( () =>
  {
    if ( topSymbols.length > 0 )
    {
      handleScan();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ activeExchange, topSymbols.length > 0 ] );

  // Combine all pattern sources
  const allDetected = useMemo( () =>
  {
    // Map Firestore patterns to DetectedPattern format
    const firestoreMapped: DetectedPattern[] = firestorePatterns.map( p => ( {
      valid: true,
      name: p.patternType,
      direction: p.direction as any,
      pivots: p.pivots || [],
      confidence: p.confidence * 100,
      level: 1,
      timestamp: p.detectedAt?.toMillis() || Date.now(),
      type: p.patternType,
      symbol: p.symbol,
      exchange: p.exchange,
      timeframe: p.timeframe,
      candles: p.candles?.map( c => ( {
        timestamp: 0,
        open: c.o,
        high: c.h,
        low: c.l,
        close: c.c,
        volume: 0
      } ) )
    } ) );

    const combined = [ ...firestoreMapped, ...unifiedPatterns ];

    return combined.filter( p =>
    {
      // Pattern type filter
      const name = (p.name || "").toLowerCase();
      const id = name.replace( / /g, '_' ).replace( /[()]/g, '' );
      const mappedId = id.includes( 'flag' ) ? ( id.includes( 'bullish' ) ? 'flag_bull' : 'flag_bear' ) :
        id.includes( 'pennant' ) ? ( id.includes( 'bullish' ) ? 'pennant_bull' : 'pennant_bear' ) : id;
      if ( !selectedPatterns.includes( mappedId ) ) return false;

      // Timeframe filter
      if ( !selectedTimeframes.includes( p.timeframe ) ) return false;

      // Symbol filter
      if ( !selectedSymbols.includes( 'all' ) )
      {
        const normalizedSymbol = p.symbol.replace( '/', '' ).toUpperCase();
        const hasMatch = selectedSymbols.some( s => s.replace( '/', '' ).toUpperCase() === normalizedSymbol );
        if ( !hasMatch ) return false;
      }

      return true;
    } ).sort( ( a, b ) => b.timestamp - a.timestamp );
  }, [ selectedPatterns, firestorePatterns, selectedTimeframes, selectedSymbols, activeExchange, unifiedPatterns ] );

  const togglePattern = ( id: string ) =>
  {
    if ( id === 'all_reset' )
    {
      setSelectedPatterns( [
        'ascending_channel', 'descending_channel', 'ranging_channel',
        'ascending_triangle_contracting', 'ascending_triangle_expanding',
        'descending_triangle_contracting', 'descending_triangle_expanding',
        'symmetrical_triangle_contracting', 'symmetrical_triangle_expanding',
        'falling_wedge_contracting', 'falling_wedge_expanding',
        'rising_wedge_contracting', 'rising_wedge_expanding',
        'flag_bull', 'flag_bear', 'pennant_bull', 'pennant_bear'
      ] );
      setSelectedTimeframes( TIMEFRAMES.map( t => t.id ) );
      setExchangeSymbolsMap( prev => ( {
        ...prev,
        [ activeExchange ]: [ 'all' ]
      } ) );
      return;
    }
    setSelectedPatterns( prev =>
      prev.includes( id ) ? prev.filter( p => p !== id ) : [ ...prev, id ]
    );
  };

  const toggleTimeframe = ( id: string ) =>
  {
    if ( id === 'all' )
    {
      setSelectedTimeframes( TIMEFRAMES.map( t => t.id ) );
      return;
    }
    if ( id === 'reset' )
    {
      setSelectedTimeframes( [] );
      return;
    }
    setSelectedTimeframes( prev =>
      prev.includes( id ) ? prev.filter( t => t !== id ) : [ ...prev, id ]
    );
  };

  const toggleSymbol = ( id: string ) =>
  {
    setExchangeSymbolsMap( prev =>
    {
      const currentSelected = prev[ activeExchange ] || [ 'all' ];

      if ( id === 'all' )
      {
        return { ...prev, [ activeExchange ]: [ 'all' ] };
      }
      if ( id === 'reset' )
      {
        return { ...prev, [ activeExchange ]: [] };
      }

      const withoutAll = currentSelected.filter( s => s !== 'all' );
      let next: string[];
      if ( withoutAll.includes( id ) )
      {
        next = withoutAll.filter( s => s !== id );
        if ( next.length === 0 ) next = [ 'all' ];
      } else
      {
        next = [ ...withoutAll, id ];
      }

      return { ...prev, [ activeExchange ]: next };
    } );
  };

  return (
    <div className="flex flex-col min-h-screen bg-transparent text-slate-200">
      {/* Header */ }
      <header className="sticky top-0 z-50 backdrop-blur-sm border-b border-white/[0.08] theme-header">
        <div className="max-w-[1800px] mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4 text-right">
            <div>
              <h1 className="text-lg md:text-xl font-bold text-white">
                ماسح الأنماط
              </h1>
              <p className="hidden sm:block text-[10px] text-gray-400 mt-0.5 font-mono">Trendoscope Engine v2.0</p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={ handleScan }
              disabled={ isScanning }
              title="تحديث البيانات"
              aria-label="تحديث البيانات"
              className="flex items-center gap-2 px-3 md:px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg transition-all text-xs md:text-sm font-medium shadow-lg shadow-cyan-900/20"
            >
              <span>{ isScanning ? "جاري..." : "تحديث" }</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto w-full flex flex-1 p-3 md:p-6 gap-4 md:gap-6 text-right glass-panel mt-2 md:mt-3 !overflow-visible">
        <div className="flex flex-col flex-1 gap-4 md:gap-6 !overflow-visible">
          <div className="flex flex-1 gap-6 !overflow-visible">
            {/* Main Content Area */ }
            <div className="flex-1 flex flex-col min-w-0 gap-3 md:gap-6 !overflow-visible">
              {/* Toolbar */ }
              <div className="flex flex-wrap items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md relative z-20">
                {/* Pattern Filter Button (Unified Popup) */ }
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      title="الأنماط"
                      aria-label="الأنماط"
                      className="px-4 py-2 rounded-lg text-xs font-bold flex items-center bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all"
                    >
                      الأنماط
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="p-0 overlay-dropdown w-[calc(var(--radix-dropdown-menu-trigger-width)*1.43)] overflow-hidden"
                  >
                    <PatternFilters
                      selectedPatterns={ selectedPatterns }
                      onPatternToggle={ togglePattern }
                    />
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Symbol Filter */ }
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      title="العملات"
                      aria-label="العملات"
                      className="px-4 py-2 rounded-lg text-xs font-bold flex items-center bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                    >
                      العملات
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="p-0 overlay-dropdown w-[calc(var(--radix-dropdown-menu-trigger-width)*1.43)] overflow-hidden"
                  >
                    <SymbolFilters
                      selectedSymbols={ selectedSymbols }
                      onSymbolToggle={ toggleSymbol }
                      symbols={ topSymbols }
                    />
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Timeframe Filter */ }
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      title="الفريم"
                      aria-label="الفريم"
                      className="px-4 py-2 rounded-lg text-xs font-bold flex items-center bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                    >
                      الفريم
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="p-0 overlay-dropdown w-[calc(var(--radix-dropdown-menu-trigger-width)*1.43)] overflow-hidden"
                  >
                    <TimeframeFilters
                      selectedTimeframes={ selectedTimeframes }
                      onTimeframeToggle={ toggleTimeframe }
                      timeframes={ TIMEFRAMES }
                    />
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Exchange Selector */ }
                <div className="flex items-center">
                  <ExchangeSelector />
                </div>

                <div className="hidden sm:block h-6 w-px bg-white/10 mx-1" />

                {/* View Mode Toggle */ }
                <div className="flex bg-white/5 p-1 rounded-lg border border-white/10 ml-auto">
                  <button
                    onClick={ () => setViewMode( 'grid' ) }
                    className={ `px-2 py-1 rounded-md transition-all text-[10px] font-bold ${ viewMode === 'grid' ? 'bg-white/10 text-cyan-400 shadow-sm' : 'text-slate-500 hover:text-slate-300' }` }
                    aria-label="عرض الشبكة"
                  >
                    شبكة
                  </button>
                  <button
                    onClick={ () => setViewMode( 'list' ) }
                    className={ `px-2 py-1 rounded-md transition-all text-[10px] font-bold ${ viewMode === 'list' ? 'bg-white/10 text-cyan-400 shadow-sm' : 'text-slate-500 hover:text-slate-300' }` }
                    aria-label="عرض القائمة"
                  >
                    قائمة
                  </button>
                </div>
              </div>

              {/* Results Grid */ }
              <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar relative z-0">
                { allDetected.length > 0 ? (
                  <div className={ viewMode === 'grid'
                    ? "grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-4"
                    : "flex flex-col gap-3"
                  }>
                    { allDetected.map( ( pattern, idx ) => (
                      <PatternCard
                        key={ `${ pattern.name }-${ idx }` }
                        pattern={ pattern }
                        onClick={ setSelectedPattern }
                      />
                    ) ) }
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4 py-12 bg-white/5 rounded-2xl border border-white/5">
                    <p>لا توجد نتائج تطابق الفلاتر المختارة</p>
                  </div>
                ) }
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Detail Modal */ }
      <PatternModal
        pattern={ selectedPattern }
        candles={ selectedPattern?.candles || [] }
        onClose={ () => setSelectedPattern( null ) }
      />
    </div>
  );
}
