'use client';

import React, { useMemo } from 'react';
import SmartChartCard from '@/components/SmartChartCard';
import { Globe, BarChart3, Activity, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useFXDashboard } from '@/hooks/use-crawler-data';

// ----------------------------------------------------------------------
// DATA / MOCK
// ----------------------------------------------------------------------

const FX_SYMBOLS = ['EUR', 'JPY', 'KRW', 'BRL', 'ZAR', 'TRY', 'AUD', 'CHF', 'GBP'];
const REGION_NAMES = ['Western Europe', 'Eastern Asia', 'South America', 'Southern Africa', 'Western Asia', 'Oceania', 'Northern America'];
const REGION4_NAMES = ['Western Europe', 'Southeast Asia', 'Northern America', 'Eastern Asia'];

// Helper to generate time-series data
function generateTimeSeries( length: number, keys: string[] ) {
    const data = [];
    const now = new Date();
    for ( let i = 0; i < length; i++ ) {
        const date = new Date( now.getTime() - ( length - 1 - i ) * 24 * 60 * 60 * 1000 );
        const dateStr = date.toISOString().split( 'T' )[ 0 ];
        const row: any = { date: dateStr };
        keys.forEach( ( k ) => {
            // Random value for demo
            row[ k ] = Math.floor( Math.random() * 1000 ) + 100;
        } );
        data.push( row );
    }
    return data;
}

// 1) Overview Table Data
const overviewData = FX_SYMBOLS.map( ( sym ) => ( {
    symbol: sym,
    transfers: Math.floor( Math.random() * 500000 ) + 50000,
    volume: Math.floor( Math.random() * 100000000 ) + 1000000,
    txCount: Math.floor( Math.random() * 20000 ) + 1000,
    dexVol: Math.floor( Math.random() * 50000000 ) + 500000,
    tvlProd: ( Math.random() * 5 ).toFixed( 2 ),
} ) );

// 2) Time Series
const transferVolBySymbol = generateTimeSeries( 15, FX_SYMBOLS );
const cumulativeTransferVol = generateTimeSeries( 15, REGION_NAMES ); // Just reusing region names for "Cumulative" series usually means "Region" stacked? The original code reused 'regionSeries' for this.
const transferVolProportion = generateTimeSeries( 15, FX_SYMBOLS );
const tradeCountBySymbol = generateTimeSeries( 15, FX_SYMBOLS );
const dexVolBySymbol = generateTimeSeries( 15, FX_SYMBOLS );
const tvlProductivity = generateTimeSeries( 15, FX_SYMBOLS );
const tvlByRegion = generateTimeSeries( 15, REGION4_NAMES );
const regionCumulative = generateTimeSeries( 15, REGION_NAMES );

// 3) Donut Data Helpers
function buildDonutData( keys: string[] ) {
    return keys.map( k => ( {
        name: k,
        value: Math.floor( Math.random() * 1000 ) + 100
    } ) );
}

export default function FxDashPage() {

    const { data: fxData, loading, refresh } = useFXDashboard();

    // Helper for table number formatting
    const formatDollar = ( val: number ) => '$' + val.toLocaleString( undefined, { maximumFractionDigits: 0 } );
    const formatNum = ( val: number ) => val.toLocaleString();

    // --- Derive chart data: prefer real crawler data, fall back to mock ---

    const pairsData = useMemo( () => {
        if ( fxData?.pairs?.length ) return fxData.pairs;
        return FX_SYMBOLS;
    }, [fxData] );

    const rateHistory = useMemo( () => {
        if ( fxData?.rate_history?.length ) return fxData.rate_history;
        return transferVolBySymbol;
    }, [fxData] );

    const volumeHistory = useMemo( () => {
        if ( fxData?.volume_history?.length ) return fxData.volume_history;
        return dexVolBySymbol;
    }, [fxData] );

    const spreadHistory = useMemo( () => {
        if ( fxData?.spread_history?.length ) return fxData.spread_history;
        return transferVolProportion;
    }, [fxData] );

    const correlationData = useMemo( () => {
        if ( fxData?.correlation_matrix?.length ) return fxData.correlation_matrix;
        return cumulativeTransferVol;
    }, [fxData] );

    // Derive series keys from real data when available
    const pairKeys = useMemo( () => {
        if ( Array.isArray( pairsData ) && pairsData.length && typeof pairsData[0] === 'string' ) {
            return pairsData as string[];
        }
        return FX_SYMBOLS;
    }, [pairsData] );

    // Transform overviewData for SmartChartCard table view (formatting)
    const formattedOverviewData = useMemo( () => {
        if ( fxData?.pairs?.length ) {
            return fxData.pairs.map( ( p: any ) => ( {
                symbol: p.symbol ?? p.name ?? p,
                transfers: p.transfers ?? 0,
                volume: p.volume ?? 0,
                txCount: p.txCount ?? 0,
                dexVol: p.dexVol ?? 0,
                tvlProd: p.tvlProd ?? 0,
                Symbol: p.symbol ?? p.name ?? p,
                ...( typeof p === 'object' ? p : {} ),
            } ) );
        }
        return overviewData.map( item => ( {
            Symbol: item.symbol,
            ...item
        } ) );
    }, [fxData] );

    return (
        <div className="space-y-8 min-h-screen text-slate-100 p-6">

            {/* HEADER */ }
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <motion.h1 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-cyan-400"
                    >
                        FX Dashboard
                    </motion.h1>
                    <button
                        onClick={ refresh }
                        disabled={ loading }
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-sm transition"
                    >
                        <RefreshCw className={ `w-4 h-4 ${ loading ? 'animate-spin' : '' }` } />
                        { loading ? 'Refreshing…' : 'Refresh' }
                    </button>
                </div>
                <div className="h-1 w-20 bg-teal-500 rounded-full" />
                <p className="text-slate-400 max-w-2xl">
                    Comprehensive analytics for foreign exchange tokens on Polygon PoS.
                    Track volume, transfers, and regional adoption.
                    { loading && <span className="ml-2 text-teal-400 text-xs">(loading…)</span> }
                </p>
            </div>

            {/* ═══════════ Overview Section ═══════════ */ }
            <section className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-teal-400 border-b border-white/10 pb-2">
                    <Activity className="w-5 h-5" />
                    <h2>Market Overview</h2>
                </div>
                
                <div className="grid grid-cols-1">
                    <SmartChartCard
                        title="FX Token Performance"
                        subtitle="Key metrics by symbol"
                        chartType="bar"
                        data={ formattedOverviewData }
                        series={ ['transfers', 'volume', 'dexVol'] }
                        height={ 400 }
                    />
                </div>
            </section>

            {/* ═══════════ Transfer Analytics ═══════════ */ }
            <section className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-pink-400 border-b border-white/10 pb-2">
                    <Activity className="w-5 h-5" />
                    <h2>Transfer Analytics</h2>
                </div>

                {/* Row 1: Transfer Volume */ }
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <SmartChartCard
                        title="Transfer Volume Per Period"
                        subtitle="Breakdown by currency"
                        chartType="area"
                        data={ rateHistory }
                        series={ pairKeys }
                        height={ 350 }
                    />
                    <SmartChartCard
                        title="Cumulative Transfer Vol"
                        subtitle="Aggregated over time"
                        chartType="area"
                        data={ correlationData }
                        series={ REGION_NAMES }
                        height={ 350 }
                    />
                    <SmartChartCard
                        title="Transfer Volume Proportion"
                        subtitle="Relative share by currency"
                        chartType="line"
                        data={ spreadHistory }
                        series={ pairKeys }
                        height={ 350 }
                    />
                </div>

                {/* Row 2: Transfer Count */ }
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <SmartChartCard
                        title="Transfer Count Per Period"
                        subtitle="Activity count by currency"
                        chartType="bar"
                        data={ volumeHistory }
                        series={ pairKeys }
                        height={ 350 }
                    />
                    <SmartChartCard
                        title="Cumulative Transfer Count"
                        subtitle="Total activity over time"
                        chartType="area"
                        data={ correlationData }
                        series={ REGION_NAMES }
                        height={ 350 }
                    />
                    <SmartChartCard
                        title="Transfer Count Proportion"
                        subtitle="Share of activity"
                        chartType="bar"
                        data={ spreadHistory }
                        series={ pairKeys }
                        height={ 350 }
                    />
                </div>
            </section>

            {/* ═══════════ Trade Counts and DEX Volume ═══════════ */ }
            <section className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-emerald-400 border-b border-white/10 pb-2">
                    <BarChart3 className="w-5 h-5" />
                    <h2>Trade Counts & DEX Volume</h2>
                </div>

                {/* Row 1: Trade Count */ }
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <SmartChartCard
                        title="Trade Count per Period"
                        subtitle="DEX trades by currency"
                        chartType="line"
                        data={ volumeHistory }
                        series={ pairKeys }
                        height={ 350 }
                    />
                    <SmartChartCard
                        title="Cumulative Trade Count"
                        subtitle="Total DEX trades"
                        chartType="area"
                        data={ correlationData }
                        series={ REGION_NAMES }
                        height={ 350 }
                    />
                    <SmartChartCard
                        title="Trade Count Proportion"
                        subtitle="DEX trade share"
                        chartType="bar"
                        data={ spreadHistory }
                        series={ pairKeys }
                        height={ 350 }
                    />
                </div>

                {/* Row 2: DEX Volume */ }
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <SmartChartCard
                        title="DEX Vol by Period"
                        subtitle="Volume trading on DEXs"
                        chartType="area"
                        data={ volumeHistory }
                        series={ pairKeys }
                        height={ 350 }
                    />
                    <SmartChartCard
                        title="Cumulative DEX Volume"
                        subtitle="Total DEX volume"
                        chartType="area"
                        data={ correlationData }
                        series={ REGION_NAMES }
                        height={ 350 }
                    />
                    <SmartChartCard
                        title="DEX Volume Proportion"
                        subtitle="Volume share breakdown"
                        chartType="line"
                        data={ spreadHistory }
                        series={ pairKeys }
                        height={ 350 }
                    />
                </div>

                {/* Row 3: TVL */ }
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <SmartChartCard
                        title="TVL Productivity"
                        subtitle="Capital efficiency"
                        chartType="line"
                        data={ rateHistory }
                        series={ pairKeys }
                        height={ 350 }
                    />
                    <SmartChartCard
                        title="TVL (Total Value Locked)"
                        subtitle="Liquidity by currency"
                        chartType="bar"
                        data={ volumeHistory }
                        series={ pairKeys }
                        height={ 350 }
                    />
                    <SmartChartCard
                        title="TVL Proportion"
                        subtitle="Liquidity share"
                        chartType="area"
                        data={ spreadHistory }
                        series={ pairKeys }
                        height={ 350 }
                    />
                </div>
            </section>

            {/* ═══════════ Region Analytics ═══════════ */ }
            <section className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-orange-400 border-b border-white/10 pb-2">
                    <Globe className="w-5 h-5" />
                    <h2>Region Analytics</h2>
                </div>

                {/* Row 1 */ }
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <SmartChartCard
                        title="TVL by Region"
                        subtitle="Regional liquidity"
                        chartType="area"
                        data={ tvlByRegion }
                        series={ REGION4_NAMES }
                        height={ 350 }
                    />
                    <SmartChartCard
                        title="TVL Share (Region)"
                        subtitle="Current distribution"
                        chartType="pie"
                        data={ buildDonutData( REGION4_NAMES ) }
                        height={ 350 }
                    />
                    <SmartChartCard
                        title="DEX Volume by Region"
                        subtitle="Trading volume"
                        chartType="bar"
                        data={ tvlByRegion }
                        series={ REGION4_NAMES }
                        height={ 350 }
                    />
                </div>

                {/* Row 2 */ }
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <SmartChartCard
                        title="Cumulative DEX Vol (Region)"
                        subtitle="Total volume"
                        chartType="area"
                        data={ regionCumulative }
                        series={ REGION_NAMES }
                        height={ 350 }
                    />
                    <SmartChartCard
                        title="DEX Vol Share (Region)"
                        subtitle="Volume distribution"
                        chartType="pie"
                        data={ buildDonutData( REGION_NAMES ) }
                        height={ 350 }
                    />
                    <SmartChartCard
                        title="Transfer Volume by Region"
                        subtitle="Cross-border flow"
                        chartType="line"
                        data={ tvlByRegion }
                        series={ REGION4_NAMES }
                        height={ 350 }
                    />
                </div>

                {/* Row 3 */ }
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <SmartChartCard
                        title="Cumulative Transfer Vol"
                        subtitle="Region aggregated"
                        chartType="area"
                        data={ regionCumulative }
                        series={ REGION_NAMES }
                        height={ 350 }
                    />
                    <SmartChartCard
                        title="Transfer Vol Share"
                        subtitle="Flow distribution"
                        chartType="pie"
                        data={ buildDonutData( REGION_NAMES ) }
                        height={ 350 }
                    />
                    <SmartChartCard
                        title="Transfer Count by Region"
                        subtitle="Activity level"
                        chartType="bar"
                        data={ tvlByRegion }
                        series={ REGION4_NAMES }
                        height={ 350 }
                    />
                </div>

                 {/* Row 4 */ }
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <SmartChartCard
                        title="Transfer Count Share"
                        subtitle="Activity distribution"
                        chartType="pie"
                        data={ buildDonutData( REGION4_NAMES ) }
                        height={ 350 }
                    />
                    <SmartChartCard
                        title="Cumulative Transfer Count"
                        subtitle="Total transfers"
                        chartType="area"
                        data={ regionCumulative }
                        series={ REGION_NAMES }
                        height={ 350 }
                    />
                    <SmartChartCard
                        title="Trade Count by Region"
                        subtitle="DEX activity"
                        chartType="line"
                        data={ tvlByRegion }
                        series={ REGION4_NAMES }
                        height={ 350 }
                    />
                </div>

                 {/* Row 5 */ }
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SmartChartCard
                        title="Trade Count Share"
                        subtitle="DEX activity distribution"
                        chartType="pie"
                        data={ buildDonutData( REGION4_NAMES ) }
                        height={ 350 }
                    />
                    <SmartChartCard
                        title="Cumulative Trade Count"
                        subtitle="Region aggregated"
                        chartType="area"
                        data={ regionCumulative }
                        series={ REGION_NAMES }
                        height={ 350 }
                    />
                </div>

            </section>
        </div>
    );
}

