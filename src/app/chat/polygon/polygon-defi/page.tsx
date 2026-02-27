'use client';

import React, { useMemo } from 'react';
import SmartChartCard from '@/components/SmartChartCard';
import { Activity, ArrowDownToLine, Coins, DollarSign, Layers, RefreshCw, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

// Chart Helpers
import { generateDateSeries, formatCompact } from '@/lib/chart-utils';
import { usePolygonDefi, useChainData } from '@/hooks/use-crawler-data';

/* ───────────── StatCard ───────────── */
const StatCard = ( { icon, label, value, subtitle }: any ) => (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-6 backdrop-blur-sm hover:bg-white/[0.07] transition-colors">
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">{ label }</h3>
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">{ icon }</div>
        </div>
        <div className="text-2xl font-bold text-white mb-1">{ value }</div>
        <div className="text-xs text-gray-500">{ subtitle }</div>
    </div>
);

// Formatters
const fmt = ( n: number ) => new Intl.NumberFormat( 'en-US', { notation: 'compact', maximumFractionDigits: 1 } ).format( n );
const fmtUSD = ( n: number ) => new Intl.NumberFormat( 'en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 } ).format( n );

/* ───────────── Mock Data Generators ───────────── */
function seededRandom ( seed: number ): () => number
{
    let s = seed;
    return () =>
    {
        s = ( ( s * 9301 + 49297 ) % 233280 );
        return s / 233280;
    };
}

function generateMockTimeSeries ( count: number, baseMs: number, volatility: number, trend: number )
{
    const vals = [];
    let cur = baseMs;
    const rng = seededRandom( 12345 ); // Fixed seed for stability
    for ( let i = 0; i < count; i++ )
    {
        const change = ( rng() - 0.5 ) * volatility;
        cur = cur * ( 1 + change + trend );
        vals.push( cur );
    }
    return vals;
}

export default function PolygonDeFiEcosystemPage ()
{
    const { data: defiData, loading: defiLoading, refresh: refreshDefi } = usePolygonDefi();
    const { data: chainData, loading: chainLoading, refresh: refreshChain } = useChainData('polygon');
    const loading = defiLoading || chainLoading;
    const refresh = async () => { await Promise.all([refreshDefi(), refreshChain()]); };

    // 1. TVL Data
    const tvlData = useMemo( () =>
    {
        if (defiData?.tvl_history?.length) {
            return defiData.tvl_history.map((d: any) => ({ date: d.date, TVL: d.tvl }));
        }
        const dates = generateDateSeries( 30, new Date( Date.now() - 29 * 86400000 ), "1d" );
        const values = generateMockTimeSeries( 30, 1_250_000_000, 0.04, 0.002 );
        return dates.map( ( d, i ) => ( {
            date: d.toISOString().split( 'T' )[ 0 ],
            TVL: values[ i ]
        } ) );
    }, [defiData] );

    // 2. DEX Volume Trend
    const dexVolumeData = useMemo( () =>
    {
        if (defiData?.dex_volume_history?.length) {
            return defiData.dex_volume_history.map((d: any) => ({ date: d.date, Volume: d.volume }));
        }
        const dates = generateDateSeries( 30, new Date( Date.now() - 29 * 86400000 ), "1d" );
        const values = generateMockTimeSeries( 30, 90_000_000, 0.15, 0.005 );
        return dates.map( ( d, i ) => ( {
            date: d.toISOString().split( 'T' )[ 0 ],
            Volume: values[ i ]
        } ) );
    }, [defiData] );

    // 3. DEX Breakdown
    const dexBreakdownData = useMemo( () => {
        if (defiData?.dex_breakdown?.length) {
            return defiData.dex_breakdown.map((d: any) => ({ name: d.name, value: d.volume ?? d.value }));
        }
        return [
            { name: "Uniswap", value: 150_000_000 },
            { name: "QuickSwap", value: 120_000_000 },
            { name: "SushiSwap", value: 80_000_000 },
            { name: "Balancer", value: 60_000_000 },
            { name: "Curve", value: 50_000_000 },
            { name: "Others", value: 40_000_000 },
        ];
    }, [defiData] );

    // Sort for bar chart stability
    const dexBreakdownSorted = [ ...dexBreakdownData ].sort( ( a, b ) => b.value - a.value );

    // Use chain snapshot data if available, otherwise fall back to static values
    const stats0 = useMemo( () => ({
        cexVolume: chainData?.cex_volume ?? defiData?.cex_volume ?? 1126402692101,
        cexDeposits: chainData?.cex_deposits ?? defiData?.cex_deposits ?? 3769450712,
        dexVolume: chainData?.dex_volume ?? defiData?.dex_volume ?? 500000000000,
    }), [chainData, defiData] );

    return (
        <div className="space-y-8 min-h-screen text-slate-100 p-6 lg:px-12 pb-24">
            {/* Header */ }
            <div className="flex flex-col gap-3 sm:gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex flex-col gap-2">
                        <motion.h1
                            initial={ { opacity: 0, x: -20 } }
                            animate={ { opacity: 1, x: 0 } }
                            className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-violet-300"
                        >
                            💎 Polygon DeFi Ecosystem
                        </motion.h1>
                        <p className="text-white/60 text-sm">
                            Polygon PoS Data as told by Defillama
                        </p>
                    </div>
                    <button
                        onClick={ refresh }
                        className="self-start sm:self-auto inline-flex items-center gap-2 text-xs sm:text-sm px-3 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 transition-colors border border-purple-400/30 text-purple-200"
                    >
                        <RefreshCw className={ `w-4 h-4 ${ loading ? "animate-spin" : "" }` } />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Overview Stats */ }
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    icon={ <ArrowDownToLine className="w-6 h-6" /> }
                    label="CEX Deposit Volume"
                    value={ fmtUSD( stats0.cexVolume ) }
                    subtitle="Total Inflow (CEX to Polygon)"
                />
                <StatCard
                    icon={ <Coins className="w-6 h-6" /> }
                    label="CEX Deposits"
                    value={ fmt( stats0.cexDeposits ) }
                    subtitle="Count of Deposit Txs"
                />
                <StatCard
                    icon={ <DollarSign className="w-6 h-6" /> }
                    label="Overall DEX Volume"
                    value={ fmtUSD( stats0.dexVolume ) }
                    subtitle="Cumulative Trading Volume"
                />
            </section>

            {/* TVL Section */ }
            <section className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-purple-400 border-b border-white/10 pb-2">
                    <TrendingUp className="w-5 h-5" />
                    <h2>Value Locked</h2>
                </div>

                <SmartChartCard
                    title="Polygon Overall TVL"
                    subtitle="Total Value Locked Trend"
                    chartType="area"
                    data={ tvlData }
                    series={ [ 'TVL' ] }
                    colors={ [ '#a855f7' ] }
                    height={ 450 }
                />
            </section>

            {/* DEX Details */ }
            <section className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-cyan-400 border-b border-white/10 pb-2">
                    <Layers className="w-5 h-5" />
                    <h2>DEX Activity</h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SmartChartCard
                        title="Volume Breakdown (Pie)"
                        subtitle="Share by Protocol"
                        chartType="pie"
                        data={ dexBreakdownData }
                        height={ 400 }
                    />
                    <SmartChartCard
                        title="Volume Breakdown (Bar)"
                        subtitle="Top Protocols by Volume"
                        chartType="bar"
                        data={ dexBreakdownSorted.map( d => ( { Protocol: d.name, Volume: d.value } ) ) }
                        series={ [ 'Volume' ] }
                        colors={ [ '#3b82f6' ] }
                        height={ 400 }
                    />
                </div>

                <SmartChartCard
                    title="DEX Volume Over Time"
                    subtitle="Daily Trading Volume"
                    chartType="bar"
                    data={ dexVolumeData }
                    series={ [ 'Volume' ] }
                    colors={ [ '#6366f1' ] }
                    height={ 400 }
                />
            </section>

        </div>
    );
}

