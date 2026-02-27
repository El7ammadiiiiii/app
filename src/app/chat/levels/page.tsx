'use client';

import React, { useState, useEffect, useMemo } from 'react';
import LevelsGrid from '@/components/scanners/levels/LevelsGrid';
import { LevelsChartModal } from '@/components/scanners/levels/LevelsChartModal';
import { useLevelsScanner } from '@/contexts/LevelsScannerContext';
import { useExchangeStore } from '@/stores/exchangeStore';
import { cexManager, CEXCoin } from '@/lib/services/centralizedExchanges';
import { apiService } from '@/lib/services/apiService';
import { exchangeOrchestrator } from '@/lib/services/ExchangeOrchestrator';
import SymbolFilters from '@/components/pattern-scanner-new/SymbolFilters';
import TimeframeFilters from '@/components/pattern-scanner-new/TimeframeFilters';
import { ExchangeSelector } from '@/components/layout/ExchangeSelector';
import
{
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const TIMEFRAMES = [
  { id: '15m', label: '15 دقيقة' },
  { id: '1h', label: '1 ساعة' },
  { id: '4h', label: '4 ساعات' },
  { id: '1d', label: '1 يوم' },
  { id: '1w', label: '1W' },
];

export default function LevelsScannerPage ()
{
  const { activeExchange } = useExchangeStore();
  const { results: firestoreResults, isLoading: isFirestoreLoading } = useLevelsScanner();

  const [ unifiedResults, setUnifiedResults ] = useState<any[]>( [] );
  const [ isUnifiedLoading, setIsUnifiedLoading ] = useState( false );

  const [ selectedTimeframes, setSelectedTimeframes ] = useState<string[]>( [ '1h', '4h' ] );
  const [ exchangeSymbolsMap, setExchangeSymbolsMap ] = useState<Record<string, string[]>>( {} );
  const [ topSymbols, setTopSymbols ] = useState<CEXCoin[]>( [] );
  const [ selectedResult, setSelectedResult ] = useState<any>( null );
  const [ isModalOpen, setIsModalOpen ] = useState( false );

  const selectedSymbols = useMemo( () => exchangeSymbolsMap[ activeExchange ] || [ 'all' ], [ exchangeSymbolsMap, activeExchange ] );

  const fetchUnifiedLevels = async () =>
  {
    setIsUnifiedLoading( true );
    try
    {
      const data = await apiService.getLevels( {
        exchange: activeExchange,
        symbol: selectedSymbols.includes( 'all' ) ? undefined : selectedSymbols[ 0 ],
        timeframe: selectedTimeframes[ 0 ]
      } );
      if ( data && data.length > 0 )
      {
        setUnifiedResults( data );
        // 💾 Save to Firebase Memory
        import( '@/lib/services/firebaseMemoryService' ).then( ( { FirebaseMemoryService } ) =>
        {
          const resolvedExchange = exchangeOrchestrator.getActiveExchange();
          data.forEach( ( d: any ) =>
          {
            FirebaseMemoryService.saveScannerData( 'levels-scanner', resolvedExchange, d.symbol, d, {
              sourceExchange: resolvedExchange
            } );
          } );
        } );
      }
    } catch ( err )
    {
      console.error( 'Failed to fetch unified levels:', err );
    } finally
    {
      setIsUnifiedLoading( false );
    }
  };

  useEffect( () =>
  {
    cexManager.getTopCoinsByVolume( activeExchange as any )
      .then( coins => setTopSymbols( coins.slice( 0, 300 ) ) )
      .catch( () => setTopSymbols( [] ) );
  }, [ activeExchange ] );

  useEffect( () =>
  {
    let interval: number | undefined;

    import( '@/lib/services/firebaseMemoryService' ).then( ( { FirebaseMemoryService } ) =>
    {
      FirebaseMemoryService.needsRefresh( 'levels-scanner', activeExchange ).then( needed =>
      {
        if ( needed )
        {
          fetchUnifiedLevels();
        }
      } );
    } );

    interval = window.setInterval( () =>
    {
      import( '@/lib/services/firebaseMemoryService' ).then( ( { FirebaseMemoryService } ) =>
      {
        FirebaseMemoryService.needsRefresh( 'levels-scanner', activeExchange ).then( needed =>
        {
          if ( needed )
          {
            fetchUnifiedLevels();
          }
        } );
      } );
    }, 15 * 60 * 1000 );

    const handleOnline = () =>
    {
      import( '@/lib/services/firebaseMemoryService' ).then( ( { FirebaseMemoryService } ) =>
      {
        FirebaseMemoryService.needsRefresh( 'levels-scanner', activeExchange ).then( needed =>
        {
          if ( needed ) fetchUnifiedLevels();
        } );
      } );
    };
    window.addEventListener( 'online', handleOnline );

    return () =>
    {
      if ( interval ) window.clearInterval( interval );
      window.removeEventListener( 'online', handleOnline );
    };
  }, [ activeExchange, selectedSymbols, selectedTimeframes ] );

  const results = useMemo( () =>
  {
    const combined = [ ...firestoreResults, ...unifiedResults ];
    return combined.filter( r =>
    {
      if ( selectedTimeframes.length > 0 && !selectedTimeframes.includes( r.timeframe ) ) return false;
      if ( !selectedSymbols.includes( 'all' ) )
      {
        const normalized = r.symbol.replace( '/', '' ).toUpperCase();
        if ( !selectedSymbols.some( s => s.replace( '/', '' ).toUpperCase() === normalized ) ) return false;
      }
      return true;
    } );
  }, [ firestoreResults, unifiedResults, selectedTimeframes, selectedSymbols ] );

  const isLoading = isFirestoreLoading || isUnifiedLoading;

  return (
    <div className="min-h-screen text-white">
      {/* Header */ }
      <header className="sticky top-0 z-50 backdrop-blur-sm border-b border-white/[0.08] theme-header">
        <div className="max-w-[1800px] mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">Levels</h1>
              <p className="text-sm text-gray-400 mt-1">Support & Resistance detection</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-4 py-6">
        <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="px-4 py-2 rounded-lg text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 transition-all">
                العملات
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="p-0 overlay-dropdown w-[200px] overflow-hidden">
              <SymbolFilters selectedSymbols={ selectedSymbols } onSymbolToggle={ ( id ) =>
              {
                setExchangeSymbolsMap( prev =>
                {
                  const current = prev[ activeExchange ] || [ 'all' ];
                  if ( id === 'all' ) return { ...prev, [ activeExchange ]: [ 'all' ] };
                  const next = current.includes( id ) ? current.filter( s => s !== id ) : [ ...current.filter( s => s !== 'all' ), id ];
                  return { ...prev, [ activeExchange ]: next.length === 0 ? [ 'all' ] : next };
                } );
              } } symbols={ topSymbols } />
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="px-4 py-2 rounded-lg text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 transition-all">
                الفريم
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="p-0 overlay-dropdown w-[200px] overflow-hidden">
              <TimeframeFilters selectedTimeframes={ selectedTimeframes } onTimeframeToggle={ ( id ) =>
              {
                setSelectedTimeframes( prev => prev.includes( id ) ? prev.filter( t => t !== id ) : [ ...prev, id ] );
              } } timeframes={ TIMEFRAMES } />
            </DropdownMenuContent>
          </DropdownMenu>

          <ExchangeSelector />

          <button className="mr-auto px-3 py-2 hover:bg-white/5 rounded-lg transition-all text-xs font-bold text-gray-400 hover:text-white">
            تحديث
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          { results.length === 0 && !isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 py-12 bg-white/5 rounded-2xl border border-white/5">
              <p>لا توجد نتائج حالياً</p>
            </div>
          ) : (
            <LevelsGrid results={ results } favorites={ new Set() } onToggleFavorite={ () => { } } onExpand={ ( r ) => { setSelectedResult( r ); setIsModalOpen( true ); } } isScanning={ isLoading } />
          ) }
        </div>

        <LevelsChartModal result={ selectedResult } isOpen={ isModalOpen } onClose={ () => setIsModalOpen( false ) } />
      </main>
    </div>
  );
}
