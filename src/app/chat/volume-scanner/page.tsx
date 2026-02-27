'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useExchangeStore } from '@/stores/exchangeStore';
import { cexManager, CEXCoin } from '@/lib/services/centralizedExchanges';
import SymbolFilters from '@/components/pattern-scanner-new/SymbolFilters';
import TimeframeFilters from '@/components/pattern-scanner-new/TimeframeFilters';
import { useVolumeScanner } from '@/contexts/VolumeScannerContext';
import { apiService } from '@/lib/services/apiService';
import { exchangeOrchestrator } from '@/lib/services/ExchangeOrchestrator';
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

export default function VolumeScannerPage ()
{
  const { activeExchange } = useExchangeStore();
  const { results: firestoreResults, isLoading: isFirestoreLoading, refresh: refreshFirestore } = useVolumeScanner();

  const [ unifiedResults, setUnifiedResults ] = useState<any[]>( [] );
  const [ isUnifiedLoading, setIsUnifiedLoading ] = useState( false );

  const [ selectedTimeframes, setSelectedTimeframes ] = useState<string[]>( TIMEFRAMES.map( t => t.id ) );
  const [ exchangeSymbolsMap, setExchangeSymbolsMap ] = useState<Record<string, string[]>>( {} );
  const [ topSymbols, setTopSymbols ] = useState<CEXCoin[]>( [] );

  const selectedSymbols = useMemo( () => exchangeSymbolsMap[ activeExchange ] || [ 'all' ], [ exchangeSymbolsMap, activeExchange ] );

  const fetchUnifiedVolume = useCallback( async () =>
  {
    setIsUnifiedLoading( true );
    try
    {
      const data = await apiService.getVolume( {
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
            FirebaseMemoryService.saveScannerData( 'volume-scanner', resolvedExchange, d.symbol, d, {
              sourceExchange: resolvedExchange
            } );
          } );
        } );
      }
    } catch ( err )
    {
      console.error( 'Failed to fetch unified volume:', err );
    } finally
    {
      setIsUnifiedLoading( false );
    }
  }, [ activeExchange, selectedSymbols, selectedTimeframes ] );

  useEffect( () =>
  {
    cexManager.getTopCoinsByVolume( activeExchange as any )
      .then( coins => setTopSymbols( coins.slice( 0, 300 ) ) )
      .catch( () => setTopSymbols( [] ) );

    // 🚀 Smart Refresh Logic
    import( '@/lib/services/firebaseMemoryService' ).then( ( { FirebaseMemoryService } ) =>
    {
      FirebaseMemoryService.needsRefresh( 'volume-scanner', activeExchange ).then( needed =>
      {
        if ( needed )
        {
          console.log( `[Volume] Refreshing memory for ${ activeExchange }...` );
          fetchUnifiedVolume().then( () => refreshFirestore() );
        }
      } );
    } );

    const handleOnline = () =>
    {
      import( '@/lib/services/firebaseMemoryService' ).then( ( { FirebaseMemoryService } ) =>
      {
        FirebaseMemoryService.needsRefresh( 'volume-scanner', activeExchange ).then( needed =>
        {
          if ( needed )
          {
            fetchUnifiedVolume().then( () => refreshFirestore() );
          }
        } );
      } );
    };
    window.addEventListener( 'online', handleOnline );

    return () =>
    {
      window.removeEventListener( 'online', handleOnline );
    };
  }, [ activeExchange, fetchUnifiedVolume, refreshFirestore ] );

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
              <h1 className="text-xl font-bold text-white">Volume</h1>
              <p className="text-sm text-gray-400 mt-1">Abnormal volume detection</p>
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

          <button
            onClick={ () => fetchUnifiedVolume() }
            disabled={ isLoading }
            className="mr-auto px-3 py-2 hover:bg-white/5 rounded-lg transition-all text-xs font-bold text-gray-400 hover:text-white disabled:opacity-50"
          >
            { isLoading ? "جاري..." : "تحديث" }
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center text-gray-500 border-2 border-dashed border-white/5 rounded-2xl">
          <div className="text-center space-y-2">
            <p className="text-lg font-bold">ماسح السيولة والأحجام</p>
            <p className="text-xs opacity-50">اختر العملات والفريمات لبدء التحليل</p>
            { results.length > 0 && (
              <p className="text-cyan-400 text-sm font-bold mt-4">تم العثور على { results.length } نتيجة</p>
            ) }
          </div>
        </div>
      </main>
    </div>
  );
}
