'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ════════════════════════════════════════════════════════════════
// 🔄 Generic Crawler Data Hook
// ════════════════════════════════════════════════════════════════

interface UseCrawlerDataOptions
{
    /** Polling interval in ms (default: 120000 = 2 min) */
    refreshInterval?: number;
    /** Don't fetch on mount */
    lazy?: boolean;
}

interface CrawlerDataState<T>
{
    data: T | null;
    loading: boolean;
    error: string | null;
    lastUpdated: Date | null;
    refresh: () => Promise<void>;
}

/**
 * Generic hook — fetches any crawler API endpoint with auto-polling.
 */
export function useCrawlerData<T = any> (
    url: string,
    options: UseCrawlerDataOptions = {}
): CrawlerDataState<T>
{
    const { refreshInterval = 120_000, lazy = false } = options;
    const [ data, setData ] = useState<T | null>( null );
    const [ loading, setLoading ] = useState( !lazy );
    const [ error, setError ] = useState<string | null>( null );
    const [ lastUpdated, setLastUpdated ] = useState<Date | null>( null );
    const mountedRef = useRef( true );

    const fetchData = useCallback( async () =>
    {
        try
        {
            setLoading( true );
            setError( null );
            const res = await fetch( url, { cache: 'no-store' } );
            if ( !res.ok ) throw new Error( `HTTP ${ res.status }` );
            const json = await res.json();
            if ( !mountedRef.current ) return;

            if ( json.success )
            {
                setData( json.data ?? json );
                setLastUpdated( new Date() );
            } else
            {
                setError( json.error?.message || 'Unknown error' );
            }
        } catch ( err: any )
        {
            if ( mountedRef.current )
            {
                setError( err.message || 'Failed to fetch' );
            }
        } finally
        {
            if ( mountedRef.current )
            {
                setLoading( false );
            }
        }
    }, [ url ] );

    useEffect( () =>
    {
        mountedRef.current = true;
        if ( !lazy ) fetchData();

        const interval = setInterval( fetchData, refreshInterval );
        return () =>
        {
            mountedRef.current = false;
            clearInterval( interval );
        };
    }, [ fetchData, refreshInterval, lazy ] );

    return { data, loading, error, lastUpdated, refresh: fetchData };
}

// ════════════════════════════════════════════════════════════════
// 🌐 Chain Explorer Hooks
// ════════════════════════════════════════════════════════════════

/** All chains summary (for hub page) */
export function useAllChains ( interval?: number )
{
    return useCrawlerData<{ chains: any[]; count: number; }>( '/api/crawler/chain?chain=__all__', {
        refreshInterval: interval || 120_000,
    } );
}

/** Combined chain + DeFiLlama data for a detail page */
export function useChainDetail ( chain: string, interval?: number )
{
    const chainData = useCrawlerData( `/api/crawler/chain?chain=${ chain }`, {
        refreshInterval: interval || 120_000,
    } );
    const llamaData = useCrawlerData( '/api/crawler/defillama', {
        refreshInterval: interval || 300_000,
    } );

    return {
        chain: chainData.data,
        llama: llamaData.data,
        loading: chainData.loading || llamaData.loading,
        error: chainData.error || llamaData.error,
        lastUpdated: chainData.lastUpdated,
        refresh: async () =>
        {
            await Promise.all( [ chainData.refresh(), llamaData.refresh() ] );
        },
    };
}

// ════════════════════════════════════════════════════════════════
// 🟣 Polygon Analytics Hooks
// ════════════════════════════════════════════════════════════════

/** Chain snapshot data (from existing /api/crawler/chain) */
export function useChainData ( chain: string = 'polygon', interval?: number )
{
    return useCrawlerData( `/api/crawler/chain?chain=${ chain }`, {
        refreshInterval: interval || 120_000,
    } );
}

/** Polygon analytics — all sections or specific */
export function usePolygonAnalytics ( section?: string, interval?: number )
{
    const url = section
        ? `/api/crawler/polygon-analytics?section=${ section }`
        : '/api/crawler/polygon-analytics';
    return useCrawlerData( url, { refreshInterval: interval || 120_000 } );
}

/** DeFi data on Polygon */
export function usePolygonDefi ( interval?: number )
{
    return useCrawlerData( '/api/crawler/polygon-analytics?section=defi', {
        refreshInterval: interval || 120_000,
    } );
}

/** Stablecoins on Polygon */
export function usePolygonStablecoins ( interval?: number )
{
    return useCrawlerData( '/api/crawler/polygon-analytics?section=stablecoins', {
        refreshInterval: interval || 120_000,
    } );
}

/** POL Token data */
export function usePolToken ( interval?: number )
{
    return useCrawlerData( '/api/crawler/polygon-analytics?section=pol_token', {
        refreshInterval: interval || 120_000,
    } );
}

/** Polygon NFT data */
export function usePolygonNFT ( interval?: number )
{
    return useCrawlerData( '/api/crawler/polygon-analytics?section=nft', {
        refreshInterval: interval || 120_000,
    } );
}

/** Polymarket data */
export function usePolymarket ( interval?: number )
{
    return useCrawlerData( '/api/crawler/polygon-analytics?section=polymarket', {
        refreshInterval: interval || 120_000,
    } );
}

/** EVM comparison data */
export function useEVMComparison ( interval?: number )
{
    return useCrawlerData( '/api/crawler/polygon-analytics?section=evm_comparison', {
        refreshInterval: interval || 120_000,
    } );
}

/** Polygon TVL history */
export function usePolygonTVLHistory ( interval?: number )
{
    return useCrawlerData( '/api/crawler/polygon-analytics?section=polygon_tvl_history', {
        refreshInterval: interval || 120_000,
    } );
}

/** PoS payments data */
export function usePoSPayments ( interval?: number )
{
    return useCrawlerData( '/api/crawler/polygon-analytics?section=pos_payments', {
        refreshInterval: interval || 120_000,
    } );
}

/** FX Dashboard data */
export function useFXDashboard ( interval?: number )
{
    return useCrawlerData( '/api/crawler/polygon-analytics?section=fx_dashboard', {
        refreshInterval: interval || 120_000,
    } );
}

/** Data Catalog */
export function useDataCatalog ( interval?: number )
{
    return useCrawlerData( '/api/crawler/polygon-analytics?section=data_catalog', {
        refreshInterval: interval || 300_000, // 5 min
    } );
}

// ════════════════════════════════════════════════════════════════
// ₿ ETF Hooks
// ════════════════════════════════════════════════════════════════

/** Bitcoin ETF data */
export function useBitcoinETF ( interval?: number )
{
    return useCrawlerData( '/api/crawler/etf?asset=bitcoin', {
        refreshInterval: interval || 120_000,
    } );
}

/** Ethereum ETF data */
export function useEthereumETF ( interval?: number )
{
    return useCrawlerData( '/api/crawler/etf?asset=ethereum', {
        refreshInterval: interval || 120_000,
    } );
}

/** All ETF data */
export function useAllETF ( interval?: number )
{
    return useCrawlerData( '/api/crawler/etf', {
        refreshInterval: interval || 120_000,
    } );
}

// ════════════════════════════════════════════════════════════════
// 🦙 DeFiLlama Hooks
// ════════════════════════════════════════════════════════════════

/** DeFiLlama full data */
export function useDefiLlama ( section?: string, interval?: number )
{
    const url = section
        ? `/api/crawler/defillama?section=${ section }`
        : '/api/crawler/defillama';
    return useCrawlerData( url, { refreshInterval: interval || 120_000 } );
}

/** StakingRewards assets table API */
export function useStakingRewards ( query: string = '', interval?: number )
{
    const url = query
        ? `/api/crawler/stakingrewards?${ query }`
        : '/api/crawler/stakingrewards';
    return useCrawlerData( url, { refreshInterval: interval || 60_000 } );
}

// ════════════════════════════════════════════════════════════════
// � CryptoQuant Studio Hooks
// ════════════════════════════════════════════════════════════════

/** All CryptoQuant Studio data (all assets) */
export function useCryptoQuantStudio ( interval?: number )
{
    return useCrawlerData( '/api/crawler/cryptoquant-studio', {
        refreshInterval: interval || 120_000,
    } );
}

/** CryptoQuant Studio data for a specific asset */
export function useCryptoQuantStudioAsset ( asset: string, interval?: number )
{
    return useCrawlerData( `/api/crawler/cryptoquant-studio?asset=${ asset }`, {
        refreshInterval: interval || 120_000,
    } );
}

/** CryptoQuant Studio data for a specific asset + category */
export function useCryptoQuantStudioCategory ( asset: string, category: string, interval?: number )
{
    return useCrawlerData(
        `/api/crawler/cryptoquant-studio?asset=${ asset }&category=${ category }`,
        { refreshInterval: interval || 120_000 }
    );
}

// ════════════════════════════════════════════════════════════════
// �📜 History Hook
// ════════════════════════════════════════════════════════════════

/** Historical time series from accumulated crawler snapshots */
export function useCrawlerHistory (
    chain: string = 'polygon',
    days: number = 30,
    metric?: string,
    interval?: number
)
{
    let url = `/api/crawler/history?chain=${ chain }&days=${ days }`;
    if ( metric ) url += `&metric=${ metric }`;
    return useCrawlerData( url, { refreshInterval: interval || 300_000 } );
}

// ════════════════════════════════════════════════════════════════
// 🔧 Data Transformation Utilities
// ════════════════════════════════════════════════════════════════

/**
 * تحويل Unix timestamp (ثواني) إلى Date object.
 * مفيد لبيانات CoinGecko و DeFiLlama.
 */
export function unixToDate ( timestamp: number ): Date
{
    return new Date( timestamp * 1000 );
}

/**
 * تحويل بيانات السعر التاريخي إلى تنسيق D3 charts.
 * Input: [{date: unixTimestamp, price: number, volume: number}]
 * Output: [{date: Date, price: number, volume: number}]
 */
export function toPriceChartData ( priceHistory: any[] ): Array<{ date: Date; price: number; volume?: number; market_cap?: number }>
{
    if ( !priceHistory || !Array.isArray( priceHistory ) ) return [];
    return priceHistory.map( p => ( {
        date: new Date( typeof p.date === 'number' && p.date < 1e12 ? p.date * 1000 : p.date ),
        price: p.price ?? 0,
        volume: p.volume,
        market_cap: p.market_cap,
    } ) );
}

/**
 * تحويل بيانات TVL التاريخية إلى تنسيق D3.
 * Input: [{date: unixTimestamp, tvl: number}]
 */
export function toTVLChartData ( tvlHistory: any[] ): Array<{ date: Date; tvl: number }>
{
    if ( !tvlHistory || !Array.isArray( tvlHistory ) ) return [];
    return tvlHistory.map( p => ( {
        date: new Date( typeof p.date === 'number' && p.date < 1e12 ? p.date * 1000 : p.date ),
        tvl: p.tvl ?? 0,
    } ) );
}

/**
 * تحويل بيانات العملات المستقرة التاريخية إلى تنسيق D3.
 */
export function toStablecoinChartData ( history: any[] ): Array<{ date: Date; totalCirculating: number }>
{
    if ( !history || !Array.isArray( history ) ) return [];
    return history.map( p => ( {
        date: new Date( typeof p.date === 'number' && p.date < 1e12 ? p.date * 1000 : p.date ),
        totalCirculating: p.totalCirculating ?? 0,
    } ) );
}

/**
 * تحويل بيانات ETF flows إلى تنسيق D3.
 */
export function toETFFlowsChartData ( flows: any[], issuers: string[] ): Array<Record<string, any>>
{
    if ( !flows || !Array.isArray( flows ) ) return [];
    return flows.map( f =>
    {
        const point: Record<string, any> = { date: new Date( f.date ) };
        for ( const issuer of issuers )
        {
            point[ issuer ] = f[ issuer ] ?? 0;
        }
        return point;
    } );
}

/**
 * تحويل بيانات المقارنة إلى تنسيق D3 bar chart.
 */
export function toComparisonBarData ( chains: any[], metric: string ): Array<{ label: string; value: number }>
{
    if ( !chains || !Array.isArray( chains ) ) return [];
    return chains
        .filter( c => c[ metric ] != null && c[ metric ] > 0 )
        .map( c => ( {
            label: c.name,
            value: c[ metric ],
        } ) )
        .sort( ( a, b ) => b.value - a.value );
}
