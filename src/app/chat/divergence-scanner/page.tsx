'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { DivergenceFilters, FilterState, DEFAULT_FILTER_STATE } from '@/components/scanners/DivergenceFilters';
import { DivergenceGrid, SortField, SortOrder, ViewMode } from '@/components/scanners/DivergenceGrid';
import { DivergenceChartModal } from '@/components/scanners/DivergenceChartModal';
import { DivergenceResult } from '@/lib/scanners/advanced-divergence-detector';
import { useDivergenceScanner } from '@/contexts/DivergenceScannerContext';
import { apiService } from '@/lib/services/apiService';
import { exchangeOrchestrator } from '@/lib/services/ExchangeOrchestrator';
import { getScannerInstance, type ScanProgress, DEFAULT_PAIRS, DEFAULT_TIMEFRAMES } from '@/lib/scanners/divergence-scanner';
import { ExchangeSelector } from '@/components/layout/ExchangeSelector';
import { useExchangeStore } from '@/stores/exchangeStore';
import { RefreshCw, Filter, LayoutGrid, List, ArrowUpDown, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DivergenceScannerPage ()
{
  const { activeExchange } = useExchangeStore();
  const { results: firestoreResults, isLoading: isFirestoreLoading, error: firestoreError, refresh } = useDivergenceScanner();

  const [ unifiedResults, setUnifiedResults ] = useState<DivergenceResult[]>( [] );
  const [ isUnifiedLoading, setIsUnifiedLoading ] = useState( false );
  const [ hasAutoFetched, setHasAutoFetched ] = useState( false );
  const [ localResults, setLocalResults ] = useState<DivergenceResult[]>( [] );
  const [ stableLocalResults, setStableLocalResults ] = useState<DivergenceResult[]>( [] );
  const [ localProgress, setLocalProgress ] = useState<ScanProgress | undefined>( undefined );
  const [ isLocalScanning, setIsLocalScanning ] = useState( false );
  const localScanStartedRef = useRef( false );
  const localScanTimeoutRef = useRef<number | null>( null );

  const [ filters, setFilters ] = useState<FilterState>( DEFAULT_FILTER_STATE );
  const [ favorites, setFavorites ] = useState<Set<string>>( new Set() );
  const [ selectedDivergence, setSelectedDivergence ] = useState<DivergenceResult | null>( null );
  const [ isModalOpen, setIsModalOpen ] = useState( false );
  const [ tick, setTick ] = useState( 0 );

  // Grid Controls State
  const [ viewMode, setViewMode ] = useState<ViewMode>( 'grid' );
  const [ sortField, setSortField ] = useState<SortField>( 'timestamp' );
  const [ sortOrder, setSortOrder ] = useState<SortOrder>( 'desc' );
  const [ currentPage, setCurrentPage ] = useState( 1 );
  const [ itemsPerPage, setItemsPerPage ] = useState( 12 );

  useEffect( () =>
  {
    const saved = localStorage.getItem( 'divergence_favorites_v2' );
    if ( saved )
    {
      try
      {
        setFavorites( new Set( JSON.parse( saved ) ) );
      } catch ( e )
      {
        console.error( 'Failed to load favorites', e );
      }
    }
  }, [] );

  // 🚀 Consume prefetched divergence data from layout.tsx (instant load)
  useEffect( () =>
  {
    const prefetch = ( window as any ).__DIVERGENCE_PREFETCH;
    if ( prefetch )
    {
      prefetch.then( ( data: DivergenceResult[] | null ) =>
      {
        if ( data && Array.isArray( data ) && data.length > 0 )
        {
          console.log( '[Prefetch] Loaded', data.length, 'divergences instantly' );
          setUnifiedResults( data );
        }
      } ).catch( () => { } );
      // Clear prefetch after consuming
      delete ( window as any ).__DIVERGENCE_PREFETCH;
    }
  }, [] );

  useEffect( () =>
  {
    localStorage.setItem( 'divergence_favorites_v2', JSON.stringify( [ ...favorites ] ) );
  }, [ favorites ] );

  const fetchUnifiedDivergences = useCallback( async () =>
  {
    setIsUnifiedLoading( true );
    try
    {
      const data = await apiService.getDivergences( {
        exchange: activeExchange,
        timeframe: filters.timeframes[ 0 ]
      } );
      if ( data && data.length > 0 )
      {
        setUnifiedResults( data );
        // 💾 Save to Firebase Memory for other users
        import( '@/lib/services/firebaseMemoryService' ).then( ( { FirebaseMemoryService } ) =>
        {
          const resolvedExchange = exchangeOrchestrator.getActiveExchange();
          data.forEach( ( d: any ) =>
          {
            FirebaseMemoryService.saveScannerData( 'divergence-scanner', resolvedExchange, d.symbol, d, {
              sourceExchange: resolvedExchange
            } );
          } );
        } );
      }
    } catch ( err )
    {
      console.error( 'Failed to fetch unified divergences:', err );
    } finally
    {
      setIsUnifiedLoading( false );
    }
  }, [ activeExchange, filters.timeframes ] );

  useEffect( () =>
  {
    setHasAutoFetched( false );
  }, [ activeExchange, filters.timeframes ] );

  useEffect( () =>
  {
    localScanStartedRef.current = false;
    setLocalProgress( undefined );
    setStableLocalResults( [] );
  }, [ activeExchange, filters.timeframes ] );

  useEffect( () =>
  {
    if ( localResults.length > 0 )
    {
      setStableLocalResults( localResults );
    }
  }, [ localResults ] );

  useEffect( () =>
  {
    if ( hasAutoFetched ) return;
    setHasAutoFetched( true );
    fetchUnifiedDivergences().then( () => refresh() );
  }, [ hasAutoFetched, fetchUnifiedDivergences, refresh ] );

  const startLocalScan = useCallback( () =>
  {
    if ( localScanStartedRef.current ) return;
    if ( firestoreResults.length > 0 || unifiedResults.length > 0 ) return;

    localScanStartedRef.current = true;
    setIsLocalScanning( true );
    setLocalProgress( {
      total: 1,
      completed: 0,
      current: 'Scanning...',
      percentage: 0,
      startTime: Date.now(),
      estimatedTimeRemaining: 0
    } );

    const scanner = getScannerInstance();
    if ( scanner.isScanning() )
    {
      return;
    }
    const safePairs = ( filters.pairs?.length ? filters.pairs : DEFAULT_PAIRS ).slice( 0, 8 );
    const safeTimeframes = ( filters.timeframes?.length ? filters.timeframes : DEFAULT_TIMEFRAMES ).slice( 0, 1 );

    const config = {
      exchanges: [ activeExchange ],
      pairs: safePairs,
      timeframes: safeTimeframes,
      indicators: filters.indicators,
      divergenceTypes: filters.types,
      directions: filters.directions,
      minScore: filters.minScore,
      strictMode: false,
    };

    scanner.scan( config,
      ( progress ) => setLocalProgress( progress ),
      ( result ) =>
      {
        setLocalResults( prev =>
        {
          if ( prev.some( r => r.id === result.id ) ) return prev;
          return [ result, ...prev ];
        } );
      }
    ).then( res =>
    {
      if ( res?.results?.length )
      {
        setLocalResults( res.results );
      }
    } ).catch( err =>
    {
      if ( String( err ).includes( 'Scanner is already running' ) )
      {
        setIsLocalScanning( true );
        return;
      }
      console.error( 'Local divergence scan failed:', err );
    } ).finally( () =>
    {
      setIsLocalScanning( false );
    } );

    return () =>
    {
      scanner.stop();
    };
  }, [ activeExchange, filters, firestoreResults.length, unifiedResults.length ] );

  useEffect( () =>
  {
    if ( localScanStartedRef.current ) return;
    if ( isFirestoreLoading || isUnifiedLoading ) return;
    if ( firestoreResults.length > 0 || unifiedResults.length > 0 ) return;

    startLocalScan();
  }, [ startLocalScan, firestoreResults.length, unifiedResults.length, isFirestoreLoading, isUnifiedLoading ] );

  useEffect( () =>
  {
    if ( localScanTimeoutRef.current ) window.clearTimeout( localScanTimeoutRef.current );

    localScanTimeoutRef.current = window.setTimeout( () =>
    {
      if ( firestoreResults.length === 0 && unifiedResults.length === 0 )
      {
        startLocalScan();
      }
    }, 3000 );

    return () =>
    {
      if ( localScanTimeoutRef.current ) window.clearTimeout( localScanTimeoutRef.current );
    };
  }, [ startLocalScan, firestoreResults.length, unifiedResults.length ] );

  useEffect( () =>
  {
    const interval = setInterval( () =>
    {
      setTick( t => t + 1 );
    }, 30 * 1000 );

    // 🚀 Smart Refresh Logic: Only scan if Firebase data is old
    import( '@/lib/services/firebaseMemoryService' ).then( ( { FirebaseMemoryService } ) =>
    {
      FirebaseMemoryService.needsRefresh( 'divergence-scanner', activeExchange ).then( needed =>
      {
        if ( needed )
        {
          console.log( `[Divergence] Refreshing memory for ${ activeExchange }...` );
          fetchUnifiedDivergences().then( () => refresh() );
        }
      } );
    } );

    const handleOnline = () =>
    {
      import( '@/lib/services/firebaseMemoryService' ).then( ( { FirebaseMemoryService } ) =>
      {
        FirebaseMemoryService.needsRefresh( 'divergence-scanner', activeExchange ).then( needed =>
        {
          if ( needed ) fetchUnifiedDivergences().then( () => refresh() );
        } );
      } );
    };
    window.addEventListener( 'online', handleOnline );

    return () =>
    {
      clearInterval( interval );
      window.removeEventListener( 'online', handleOnline );
    };
  }, [ activeExchange, refresh, fetchUnifiedDivergences ] );

  const handleToggleFavorite = useCallback( ( id: string ) =>
  {
    setFavorites( prev =>
    {
      const next = new Set( prev );
      if ( next.has( id ) )
      {
        next.delete( id );
      } else
      {
        next.add( id );
      }
      return next;
    } );
  }, [] );

  const handleDownload = useCallback( async ( divergence: DivergenceResult ) =>
  {
    const text = `
Divergence Detection Report
============================
Symbol: ${ divergence.symbol }
Exchange: ${ divergence.exchange }
Timeframe: ${ divergence.timeframe }
Type: ${ divergence.type.toUpperCase() } ${ divergence.direction.toUpperCase() }
Indicator: ${ divergence.indicator }
Score: ${ divergence.score }%
Detected At: ${ divergence.timestamp ? new Date( divergence.timestamp ).toLocaleString() : 'N/A' }
============================
    `.trim();

    const blob = new Blob( [ text ], { type: 'text/plain' } );
    const url = URL.createObjectURL( blob );
    const a = document.createElement( 'a' );
    a.href = url;
    a.download = `divergence_${ divergence.symbol }_${ divergence.timeframe }_${ Date.now() }.txt`;
    document.body.appendChild( a );
    a.click();
    document.body.removeChild( a );
    URL.revokeObjectURL( url );
  }, [] );

  const filteredResults = useMemo( () =>
  {
    const fallbackLocal = localResults.length > 0 ? localResults : stableLocalResults;
    let filtered = [ ...firestoreResults, ...unifiedResults, ...fallbackLocal ];

    filtered = filtered.filter( r =>
    {
      // Filter by current exchange only to prevent overlap
      if ( r.exchange?.toLowerCase() !== activeExchange.toLowerCase() ) return false;

      if ( filters.timeframes.length > 0 && !filters.timeframes.includes( r.timeframe ) ) return false;
      if ( filters.indicators.length > 0 && !filters.indicators.includes( r.indicator ) ) return false;
      if ( filters.types.length > 0 && !filters.types.includes( r.type ) ) return false;
      if ( filters.directions.length > 0 && !filters.directions.includes( r.direction ) ) return false;
      if ( r.score < filters.minScore ) return false;
      if ( filters.showFavoritesOnly && !favorites.has( r.id ) ) return false;
      return true;
    } );

    const seen = new Set<string>();
    filtered = filtered.filter( r =>
    {
      if ( seen.has( r.id ) ) return false;
      seen.add( r.id );
      return true;
    } );

    return [ ...filtered ];
  }, [ firestoreResults, unifiedResults, filters, favorites, tick, activeExchange ] );

  const isLoading = isFirestoreLoading || isUnifiedLoading || isLocalScanning;
  const displayError = undefined;

  return (
    <div className="min-h-screen text-white">
      <header className="sticky top-0 z-50 backdrop-blur-sm border-b border-white/[0.08] theme-header">
        <div className="max-w-[1800px] mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">
                Divergence Scanner
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                34 divergence types - 10 indicators - auto refresh
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-4 py-6 glass-panel mt-6 !overflow-visible">
        {/* Top Controls Row - Optimized for Mobile & Fixed Toolbar */ }
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 h-11">
              <button
                onClick={ () => fetchUnifiedDivergences() }
                disabled={ isLoading }
                type="button"
                className="h-full px-3 rounded-xl theme-surface/5 text-gray-300 hover:text-cyan-400 border border-white/[0.08] transition-all flex items-center justify-center bg-white/5 backdrop-blur-md"
                title="تحديث يدوي"
              >
                <RefreshCw className={ cn( "w-4 h-4", isLoading && "animate-spin" ) } />
              </button>

              <div className="lg:hidden h-full">
                <MobileFiltersDrawer
                  filters={ filters }
                  onFiltersChange={ setFilters }
                  isScanning={ isLoading }
                  resultsCount={ filteredResults.length }
                  favoritesCount={ favorites.size }
                />
              </div>
            </div>

            {/* Desktop/Tablet Toolbar - Integrated between Filter and Exchange */ }
            <div className="hidden sm:flex items-center h-11 gap-3 px-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md shadow-lg">
              <div className="flex items-center h-full gap-2 border-l border-white/10 pl-3">
                <CustomSelect
                  value={ sortField }
                  onChange={ setSortField }
                  options={ [
                    { value: 'score', label: 'النقاط' },
                    { value: 'confidence', label: 'الثقة' },
                    { value: 'timestamp', label: 'الوقت' },
                    { value: 'symbol', label: 'الزوج' },
                  ] }
                  variant="cyan"
                />
                <button
                  type="button"
                  onClick={ () => setSortOrder( prev => prev === 'desc' ? 'asc' : 'desc' ) }
                  className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-colors"
                  aria-label="تبديل ترتيب الفرز"
                  title="تبديل ترتيب الفرز"
                >
                  <ArrowUpDown className={ cn( "w-3 h-3", sortOrder === 'asc' && "rotate-180" ) } />
                </button>
              </div>

              <div className="flex items-center h-full gap-3 border-l border-white/10 pl-3">
                <CustomSelect
                  value={ itemsPerPage }
                  onChange={ ( val ) =>
                  {
                    setItemsPerPage( val );
                    setCurrentPage( 1 );
                  } }
                  options={ [
                    { value: 12, label: '12' },
                    { value: 24, label: '24' },
                    { value: 48, label: '48' },
                  ] }
                />
              </div>

              <div className="flex items-center h-full gap-2">
                <button
                  type="button"
                  onClick={ () => setViewMode( 'grid' ) }
                  className={ cn( "h-8 w-8 flex items-center justify-center rounded-lg transition-all", viewMode === 'grid' ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-white/5 border border-white/10 text-gray-500 hover:text-gray-300" ) }
                  title="عرض شبكي"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={ () => setViewMode( 'list' ) }
                  className={ cn( "h-8 w-8 flex items-center justify-center rounded-lg transition-all", viewMode === 'list' ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-white/5 border border-white/10 text-gray-500 hover:text-gray-300" ) }
                  title="عرض قائمة"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex-shrink-0 scale-90 sm:scale-100">
              <ExchangeSelector />
            </div>
          </div>

          {/* Mobile Only Toolbar - Compact Row */ }
          <div className="sm:hidden flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md mb-2">
            <div className="flex items-center gap-2">
              <CustomSelect
                value={ sortField }
                onChange={ setSortField }
                options={ [
                  { value: 'score', label: 'النقاط' },
                  { value: 'timestamp', label: 'الوقت' },
                ] }
                variant="cyan"
                size="sm"
              />

              <div className="w-px h-3 bg-white/10 mx-1" />

              <CustomSelect
                value={ itemsPerPage }
                onChange={ ( val ) =>
                {
                  setItemsPerPage( val );
                  setCurrentPage( 1 );
                } }
                options={ [
                  { value: 12, label: '12' },
                  { value: 24, label: '24' },
                ] }
                size="sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={ () => setViewMode( viewMode === 'grid' ? 'list' : 'grid' ) }
                className="text-cyan-400 p-1"
                aria-label={ viewMode === 'grid' ? 'التبديل إلى عرض القائمة' : 'التبديل إلى العرض الشبكي' }
                title={ viewMode === 'grid' ? 'عرض قائمة' : 'عرض شبكي' }
              >
                { viewMode === 'grid' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" /> }
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          <aside className="w-72 flex-shrink-0 hidden lg:block">
            <div className="sticky top-24">
              <DivergenceFilters
                filters={ filters }
                onFiltersChange={ setFilters }
                isScanning={ isLoading }
                onStartScan={ () => { } }
                onStopScan={ () => { } }
                resultsCount={ filteredResults.length }
                favoritesCount={ favorites.size }
              />
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            <DivergenceGrid
              results={ filteredResults }
              favorites={ favorites }
              onToggleFavorite={ handleToggleFavorite }
              onDownload={ handleDownload }
              onExpand={ ( divergence ) =>
              {
                setSelectedDivergence( divergence );
                setIsModalOpen( true );
              } }
              isScanning={ isLoading }
              progress={ localProgress }
              error={ displayError }
              viewMode={ viewMode }
              sortField={ sortField }
              sortOrder={ sortOrder }
              itemsPerPage={ itemsPerPage }
              currentPage={ currentPage }
              onPageChange={ setCurrentPage }
            />
          </div>
        </div>
      </main>

      <DivergenceChartModal
        divergence={ selectedDivergence }
        isOpen={ isModalOpen }
        onClose={ () =>
        {
          setIsModalOpen( false );
          setSelectedDivergence( null );
        } }
      />
    </div>
  );
}

interface MobileFiltersDrawerProps
{
  filters: FilterState;
  onFiltersChange: ( filters: FilterState ) => void;
  isScanning: boolean;
  resultsCount: number;
  favoritesCount: number;
}

function MobileFiltersDrawer ( props: MobileFiltersDrawerProps )
{
  const [ isOpen, setIsOpen ] = useState( false );

  return (
    <div className="relative h-full">
      <button
        onClick={ () => setIsOpen( !isOpen ) }
        className="h-full flex items-center justify-center gap-2 px-4 rounded-xl bg-white/5 backdrop-blur-md text-gray-300 text-sm font-medium hover:theme-surface/8 transition-all border border-white/[0.08]"
      >
        <Filter className="w-4 h-4" />
        <span>الفلاتر</span>
      </button>

      { isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={ () => setIsOpen( false ) }
          />

          <div className="absolute top-full right-0 mt-2 w-64 max-w-[80vw] z-50 rounded-xl overlay-dropdown overflow-hidden shadow-2xl border border-white/10">
            <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between bg-white/5">
              <h3 className="text-[10px] font-bold text-white uppercase tracking-wider">الفلاتر</h3>
              <button
                onClick={ () => setIsOpen( false ) }
                className="text-[10px] px-2 py-1 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors border border-red-500/20"
              >
                إغلاق
              </button>
            </div>

            <div className="max-h-[50vh] overflow-y-auto p-1 custom-scrollbar bg-black/20">
              <DivergenceFilters
                { ...props }
                onStartScan={ () => { } }
                onStopScan={ () => { } }
              />
            </div>
          </div>
        </>
      ) }
    </div>
  );
}

interface CustomSelectProps
{
  value: any;
  onChange: ( val: any ) => void;
  options: { value: any; label: string }[];
  variant?: 'default' | 'cyan';
  size?: 'sm' | 'md';
}

function CustomSelect ( { value, onChange, options, variant = 'default', size = 'md' }: CustomSelectProps )
{
  const [ isOpen, setIsOpen ] = useState( false );
  const selectedOption = options.find( opt => opt.value === value );

  return (
    <div className="relative">
      <button
        onClick={ () => setIsOpen( !isOpen ) }
        className={ cn(
          "flex items-center justify-between gap-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors px-2",
          size === 'sm' ? "h-7 text-[10px]" : "h-8 text-xs",
          variant === 'cyan' ? "text-cyan-400" : "text-white/80"
        ) }
      >
        <span className="font-bold">{ selectedOption?.label }</span>
        <ChevronDown className={ cn( "w-3 h-3 transition-transform", isOpen && "rotate-180" ) } />
      </button>

      { isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={ () => setIsOpen( false ) } />
          <div className="absolute top-full left-0 mt-1.5 z-50 min-w-[100px] rounded-xl overlay-dropdown overflow-hidden shadow-xl py-1">
            { options.map( ( opt ) => (
              <button
                key={ opt.value }
                onClick={ () =>
                {
                  onChange( opt.value );
                  setIsOpen( false );
                } }
                className={ cn(
                  "w-full text-right px-3 py-2 text-xs transition-colors hover:bg-white/10",
                  value === opt.value ? "text-cyan-400 bg-white/5" : "text-white/70"
                ) }
              >
                { opt.label }
              </button>
            ) ) }
          </div>
        </>
      ) }
    </div>
  );
}
