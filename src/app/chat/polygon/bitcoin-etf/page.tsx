'use client';

import React, { useEffect, useMemo, useState } from 'react';
import SmartChartCard from '@/components/SmartChartCard';
import { Activity, BarChart3, TrendingDown, TrendingUp, Layers, PieChart as PieChartIcon, RefreshCw, Zap, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';

// Chart Helpers
import { generateDateSeries } from '@/lib/chart-utils';

function seededRandom ( seed: number ): number
{
    const x = Math.sin( seed + 1 ) * 10000;
    return x - Math.floor( x );
}

/* ───────────── StatCard ───────────── */
const StatCard = ( { icon, label, value, subtitle }: any ) => (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-6 backdrop-blur-sm hover:bg-white/[0.07] transition-colors">
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">{ label }</h3>
            <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400">{ icon }</div>
        </div>
        <div className="text-2xl font-bold text-white mb-1">{ value }</div>
        <div className="text-xs text-gray-500">{ subtitle }</div>
    </div>
);

const ETF_ISSUERS = [
    "WisdomTree", "Invesco", "Valkyrie", "Franklin Templeton", "VanEck",
    "Grayscale Mini", "Bitwise", "21Shares", "Fidelity", "BlackRock", "Grayscale",
];

export default function BitcoinETFPage ()
{
    const [ loading, setLoading ] = useState( false );
    const [ lastRefresh, setLastRefresh ] = useState<Date | null>( null );

    const loadData = useMemo( () => async () =>
    {
        setLoading( true );
        await new Promise( r => setTimeout( r, 800 ) );
        setLastRefresh( new Date() );
        setLoading( false );
    }, [] );

    useEffect( () => { loadData(); }, [ loadData ] );

    // Data Helpers
    const dailyDates = useMemo( () => generateDateSeries( 80, "2024-01-01", "daily" ).map( d => d.toISOString().split( 'T' )[ 0 ] ), [] );
    const monthlyDates = useMemo( () => generateDateSeries( 25, "2024-01-01", "monthly" ).map( d => d.toISOString().split( 'T' )[ 0 ] ), [] );

    // 1. Flows USD
    const flowsUSDData = useMemo( () =>
    {
        return dailyDates.map( ( d, i ) =>
        {
            const row: any = { date: d };
            ETF_ISSUERS.forEach( ( issuer, j ) =>
            {
                row[ issuer ] = seededRandom( i * 11 + j * 7 + 100 ) * 200_000_000 - 100_000_000;
            } );
            return row;
        } );
    }, [ dailyDates ] );

    // 2. Net Flows
    const netFlowsData = useMemo( () =>
    {
        return dailyDates.map( ( d, i ) =>
        {
            const val = seededRandom( i * 13 + 42 ) * 300_000_000 - 100_000_000;
            return {
                date: d,
                'Net Flow': Math.round( val )
            };
        } );
    }, [ dailyDates ] );

    // 3. Onchain Holdings
    const onchainHoldingsData = useMemo( () =>
    {
        return monthlyDates.map( ( d, i ) =>
        {
            const row: any = { date: d };
            ETF_ISSUERS.forEach( ( issuer, j ) =>
            {
                row[ issuer ] = seededRandom( i * 17 + j * 3 + 200 ) * 100_000 + 50_000 + i * 10_000;
            } );
            return row;
        } );
    }, [ monthlyDates ] );

    // 4. AUM Marketshare (Area)
    const aumShareData = useMemo( () =>
    {
        return monthlyDates.map( ( d, i ) =>
        {
            const row: any = { date: d };
            ETF_ISSUERS.forEach( ( issuer, j ) =>
            {
                row[ issuer ] = seededRandom( i * 19 + j * 5 + 300 ) * 10 + 5;
            } );
            return row;
        } );
    }, [ monthlyDates ] );

    // 5. AUM Pie
    const aumPieData = useMemo( () =>
    {
        return ETF_ISSUERS.map( ( issuer, i ) => ( {
            name: issuer,
            value: seededRandom( i * 23 + 400 ) * 15 + 5,
        } ) );
    }, [] );

    // 6. BTC Supply Backing (Dual)
    // Splitting into two charts or datasets for single axis compatibility if needed
    // But let's try to show them separately or just "Supply" which is the main metric.
    const supplyData = useMemo( () =>
    {
        const dates = generateDateSeries( 14, "2024-01-01", "monthly" ).map( d => d.toISOString().split( 'T' )[ 0 ] );
        return dates.map( ( d, i ) => ( {
            date: d,
            'Net Flow (BTC)': i * 50_000 + seededRandom( i * 29 + 500 ) * 100_000,
            'Supply %': 2 + i * 0.15 + seededRandom( i * 31 + 510 ) * 0.2,
        } ) );
    }, [] );

    // 7. Weekly Flows
    const weeklyFlowsData = useMemo( () =>
    {
        const dates = generateDateSeries( 40, "2024-01-01", "weekly" ).map( d => d.toISOString().split( 'T' )[ 0 ] );
        return dates.map( ( d, i ) =>
        {
            const row: any = { date: d };
            ETF_ISSUERS.forEach( ( issuer, j ) =>
            {
                row[ issuer ] = seededRandom( i * 37 + j * 11 + 600 ) * 50_000_000 - 25_000_000;
            } );
            return row;
        } );
    }, [] );

    // 8. Overview Table (Processed for Chart)
    const etfsOverviewRaw = [
        { issuer: "21Shares", ticker: "ARKB", holdings: 73611, usdValue: 7.5, marketshare: 1.7 },
        { issuer: "Grayscale Mini", ticker: "BTC", holdings: 49812, usdValue: 5.6, marketshare: 1.1 },
        { issuer: "VanEck", ticker: "HODL", holdings: 19852, usdValue: 2.2, marketshare: 0.4 },
        { issuer: "Franklin Templeton", ticker: "EZBC", holdings: 10308, usdValue: 1.2, marketshare: 0.2 },
    ];
    // Adding duplicates from original snippet removed for brevity/uniqueness in charts? 
    // The original snippet had repeated rows? I'll stick to unique for a clean chart.
    const etfsOverviewData = etfsOverviewRaw.map( r => ( {
        ...r,
        // formatted strings for table view if I used original object, but SmartChartCard takes raw.
        // We can render raw numbers and let user format? Or formatted strings?
        // SmartChartCard table renders values as is.
        'Holdings (BTC)': r.holdings,
        'USD Value (B)': r.usdValue,
        'Marketshare (%)': r.marketshare
    } ) );

    // 9. Recent Flows Table
    const recentFlowsRaw = [
        { time: "2026-02-06", issuer: "Grayscale", ticker: "GBTC", amount: -1186, usdValue: -50 },
        { time: "2026-02-06", issuer: "Grayscale Mini", ticker: "BTC", amount: -155, usdValue: -10 },
        { time: "2026-02-06", issuer: "BlackRock", ticker: "IBIT", amount: -300, usdValue: -20 },
        { time: "2026-02-06", issuer: "21Shares", ticker: "ARKB", amount: -312, usdValue: -21 },
    ];
    const recentFlowsData = recentFlowsRaw.map( r => ( {
        date: r.time,
        ...r
    } ) );

    return (
        <div className="space-y-8 min-h-screen text-slate-100 p-6 lg:px-12">
            {/* Header */ }
            <div className="flex flex-col gap-3 sm:gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex flex-col gap-2">
                        <motion.h1
                            initial={ { opacity: 0, x: -20 } }
                            animate={ { opacity: 1, x: 0 } }
                            className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-yellow-400"
                        >
                            ₿ Bitcoin ETFs
                        </motion.h1>
                        <p className="text-white/60 text-sm">
                            Onchain Deposits &amp; Withdrawals of Bitcoin ETF Custodians
                        </p>
                    </div>
                    <button
                        onClick={ loadData }
                        className="self-start sm:self-auto inline-flex items-center gap-2 text-xs sm:text-sm px-3 py-2 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 transition-colors border border-orange-400/30 text-orange-200"
                    >
                        <RefreshCw className={ `w-4 h-4 ${ loading ? "animate-spin" : "" }` } />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Overview Stats */ }
            <section className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-orange-400 border-b border-white/10 pb-2">
                    <Activity className="w-5 h-5" />
                    <h2>Bitcoin KPIs</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <StatCard icon={ <TrendingUp className="w-5 h-5" /> } label="Net Flow" value="₿853.2k" subtitle="Since Launch" />
                    <StatCard icon={ <Layers className="w-5 h-5" /> } label="Onchain Holdings" value="₿1,473k" subtitle="Total Held" />
                    <StatCard icon={ <PieChartIcon className="w-5 h-5" /> } label="BTC Supply %" value="7.37%" subtitle="ETF Ownership" />
                </div>
            </section>

            {/* Flows Section */ }
            <section className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-blue-400 border-b border-white/10 pb-2">
                    <BarChart3 className="w-5 h-5" />
                    <h2>ETF Flows</h2>
                </div>

                <SmartChartCard
                    title="USD Flows by Issuer"
                    subtitle="Daily Inflow/Outflow Breakdown"
                    chartType="area" // Stacked Area
                    data={ flowsUSDData }
                    series={ ETF_ISSUERS }
                    height={ 450 }
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SmartChartCard
                        title="Net Daily Flows"
                        subtitle="Aggregated Net Flow ($)"
                        chartType="bar"
                        data={ netFlowsData }
                        series={ [ 'Net Flow' ] }
                        height={ 400 }
                    />
                    <SmartChartCard
                        title="Total Onchain Holdings"
                        subtitle="Holdings by Issuer (BTC)"
                        chartType="area"
                        data={ onchainHoldingsData }
                        series={ ETF_ISSUERS }
                        height={ 400 }
                    />
                </div>
            </section>

            {/* Details & Marketshare */ }
            <section className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-yellow-400 border-b border-white/10 pb-2">
                    <PieChartIcon className="w-5 h-5" />
                    <h2>Market Structure</h2>
                </div>

                <SmartChartCard
                    title="ETF Leaders (Overview)"
                    subtitle="Holdings & Market Share"
                    chartType="bar" // Chart view of table
                    data={ etfsOverviewData }
                    series={ [ 'Holdings (BTC)', 'USD Value (B)', 'Marketshare (%)' ] }
                    height={ 400 }
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SmartChartCard
                        title="AUM Marketshare (Trend)"
                        subtitle="Share evolution over time"
                        chartType="area" // Stacked 100% implicitly if raw data sums to 100? No, native area.
                        data={ aumShareData }
                        series={ ETF_ISSUERS }
                        height={ 400 }
                    />
                    <SmartChartCard
                        title="Current Market Distribution"
                        subtitle="AUM Percentage"
                        chartType="pie"
                        data={ aumPieData }
                        height={ 400 }
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SmartChartCard
                        title="BTC Supply Absorbed"
                        subtitle="Net Flow (BTC)"
                        chartType="line"
                        data={ supplyData }
                        series={ [ 'Net Flow (BTC)' ] } // Split dual axis
                        height={ 400 }
                    />
                    <SmartChartCard
                        title="Supply %"
                        subtitle="Percentage of Total Supply"
                        chartType="area"
                        data={ supplyData }
                        series={ [ 'Supply %' ] }
                        height={ 400 }
                    />
                </div>
            </section>

            {/* Recent Activity */ }
            <section className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-red-400 border-b border-white/10 pb-2">
                    <TrendingDown className="w-5 h-5" />
                    <h2>Recent Activity</h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SmartChartCard
                        title="Recent Flows Log"
                        subtitle="Latest Onchain Movements"
                        chartType="bar"
                        data={ recentFlowsData }
                        series={ [ 'usdValue' ] } // Chart view shows value of transaction
                        height={ 400 }
                    />
                    <SmartChartCard
                        title="Weekly Flows"
                        subtitle="Aggregated Weekly Activity"
                        chartType="area"
                        data={ weeklyFlowsData }
                        series={ ETF_ISSUERS }
                        height={ 400 }
                    />
                </div>
            </section>

        </div>
    );
}


