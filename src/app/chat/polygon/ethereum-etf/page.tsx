'use client';

import React, { useEffect, useMemo, useState } from 'react';
import SmartChartCard from '@/components/SmartChartCard';
import { Activity, BarChart3, TrendingDown, TrendingUp, Layers, PieChart as PieChartIcon, RefreshCw, Zap, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';

// Chart Helpers
import { generateDateSeries } from '@/lib/chart-utils';

function seededRandom ( seed: number ): number
{
    const x = Math.sin( seed * 9301 + 49297 ) * 49297;
    return x - Math.floor( x );
}

/* ───────────── StatCard ───────────── */
const StatCard = ( { icon, label, value, subtitle }: any ) => (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-6 backdrop-blur-sm hover:bg-white/[0.07] transition-colors">
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">{ label }</h3>
            <div className="p-2 bg-teal-500/10 rounded-lg text-teal-300">{ icon }</div>
        </div>
        <div className="text-2xl font-bold text-white mb-1">{ value }</div>
        <div className="text-xs text-gray-500">{ subtitle }</div>
    </div>
);

const ETF_ISSUERS = [
    "21Shares",
    "Invesco",
    "Franklin Templeton",
    "VanEck",
    "Grayscale Mini",
    "Bitwise",
    "Fidelity",
    "BlackRock",
    "Grayscale",
];

export default function EthereumETFPage ()
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
    const dailyDates = useMemo( () => generateDateSeries( 48, "2024-07-01", "weekly" ).map( d => d.toISOString().split( 'T' )[ 0 ] ), [] );
    const monthlyDates = useMemo( () => generateDateSeries( 16, "2024-10-01", "monthly" ).map( d => d.toISOString().split( 'T' )[ 0 ] ), [] );
    const weeklyDates = useMemo( () => generateDateSeries( 26, "2024-08-01", "weekly" ).map( d => d.toISOString().split( 'T' )[ 0 ] ), [] );

    // 1. Flows USD
    const flowsUSDData = useMemo( () =>
    {
        return dailyDates.map( ( d, di ) =>
        {
            const row: any = { date: d };
            ETF_ISSUERS.forEach( ( issuer, si ) =>
            {
                const seed = di * 100 + si * 7 + 42;
                row[ issuer ] = seededRandom( seed ) * 50_000_000 - 25_000_000;
            } );
            return row;
        } );
    }, [ dailyDates ] );

    // 2. Net Flows
    const netFlowsData = useMemo( () =>
    {
        return dailyDates.map( ( d, di ) =>
        {
            const seed = di * 31 + 17;
            return {
                date: d,
                'Net Flow': Math.round( seededRandom( seed ) * 100_000_000 - 50_000_000 ),
            };
        } );
    }, [ dailyDates ] );

    // 3. Onchain Holdings
    const onchainHoldingsData = useMemo( () =>
    {
        return monthlyDates.map( ( d, di ) =>
        {
            const row: any = { date: d };
            ETF_ISSUERS.forEach( ( issuer, si ) =>
            {
                const seed = di * 50 + si * 13 + 99;
                row[ issuer ] = seededRandom( seed ) * 500_000 + 100_000 + di * 50_000;
            } );
            return row;
        } );
    }, [ monthlyDates ] );

    // 4. AUM Marketshare (Area)
    const aumMarketshareData = useMemo( () =>
    {
        return monthlyDates.map( ( d, di ) =>
        {
            const row: any = { date: d };
            ETF_ISSUERS.forEach( ( issuer, si ) =>
            {
                const seed = di * 23 + si * 11 + 7;
                row[ issuer ] = seededRandom( seed ) * 15 + 5;
            } );
            return row;
        } );
    }, [ monthlyDates ] );

    // 5. AUM Pie
    const aumPieData = useMemo( () =>
    {
        return ETF_ISSUERS.map( ( issuer, i ) =>
        {
            const seed = i * 19 + 37;
            return {
                name: issuer,
                value: seededRandom( seed ) * 20 + 5,
            };
        } );
    }, [] );

    // 6. Weekly Flows
    const weeklyFlowsData = useMemo( () =>
    {
        return weeklyDates.map( ( d, di ) =>
        {
            const row: any = { date: d };
            ETF_ISSUERS.forEach( ( issuer, si ) =>
            {
                const seed = di * 67 + si * 3 + 111;
                row[ issuer ] = seededRandom( seed ) * 20_000_000 - 10_000_000;
            } );
            return row;
        } );
    }, [ weeklyDates ] );

    // Overview Table Data
    const etfsOverviewRaw = [
        { issuer: "BlackRock", ticker: "ETHA", holdings: 3762407, usdValue: 15.71, marketshare: 59.9 },
        { issuer: "Grayscale", ticker: "ETHE", holdings: 963641, usdValue: 4.02, marketshare: 15.3 },
        { issuer: "Fidelity", ticker: "FETH", holdings: 711077, usdValue: 2.97, marketshare: 11.3 },
        { issuer: "Grayscale Mini", ticker: "ETH", holdings: 634250, usdValue: 2.65, marketshare: 10.1 },
        { issuer: "Bitwise", ticker: "ETHW", holdings: 113605, usdValue: 0.47, marketshare: 1.8 },
    ];
    const etfsOverviewData = etfsOverviewRaw.map( r => ( {
        ...r,
        'Holdings (ETH)': r.holdings,
        'USD Value (B)': r.usdValue,
        'Marketshare (%)': r.marketshare
    } ) );

    // Recent Flows Table
    const recentFlowsRaw = [
        { time: "2026-02-08", issuer: "BlackRock", ticker: "ETHA", amount: 35, flowType: "Deposit", txs: 1 },
        { time: "2026-02-08", issuer: "BlackRock", ticker: "ETHA", amount: 15, flowType: "Deposit", txs: 1 },
        { time: "2026-02-08", issuer: "BlackRock", ticker: "ETHA", amount: 18, flowType: "Deposit", txs: 1 },
        { time: "2026-02-08", issuer: "BlackRock", ticker: "ETHA", amount: 7, flowType: "Deposit", txs: 1 },
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
                            className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400"
                        >
                            📈 Ethereum ETFs
                        </motion.h1>
                        <p className="text-white/60 text-sm">
                            Onchain Deposits &amp; Withdrawals of Ethereum ETF Custodians
                        </p>
                    </div>
                    <button
                        onClick={ loadData }
                        className="self-start sm:self-auto inline-flex items-center gap-2 text-xs sm:text-sm px-3 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 transition-colors border border-blue-400/30 text-blue-200"
                    >
                        <RefreshCw className={ `w-4 h-4 ${ loading ? "animate-spin" : "" }` } />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Overview Stats */ }
            <section className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-blue-400 border-b border-white/10 pb-2">
                    <Activity className="w-5 h-5" />
                    <h2>Ethereum KPIs</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <StatCard icon={ <TrendingUp className="w-5 h-5" /> } label="Net Flow" value="≅3,320.1k" subtitle="Since Launch" />
                    <StatCard icon={ <Layers className="w-5 h-5" /> } label="Onchain Holdings" value="≅6.28M" subtitle="Total Held" />
                    <StatCard icon={ <PieChartIcon className="w-5 h-5" /> } label="ETH Supply %" value="5.05%" subtitle="ETF Ownership" />
                </div>
            </section>

            {/* Flows Section */ }
            <section className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-cyan-400 border-b border-white/10 pb-2">
                    <BarChart3 className="w-5 h-5" />
                    <h2>ETF Flows</h2>
                </div>

                <SmartChartCard
                    title="USD Flows by Issuer"
                    subtitle="Daily Inflow/Outflow Breakdown"
                    chartType="area" // Stacked Scaled
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
                        subtitle="Holdings by Issuer (ETH)"
                        chartType="area"
                        data={ onchainHoldingsData }
                        series={ ETF_ISSUERS }
                        height={ 400 }
                    />
                </div>
            </section>

            {/* Details & Marketshare */ }
            <section className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-purple-400 border-b border-white/10 pb-2">
                    <PieChartIcon className="w-5 h-5" />
                    <h2>Market Structure</h2>
                </div>

                <SmartChartCard
                    title="ETF Leaders (Overview)"
                    subtitle="Holdings & Market Share"
                    chartType="bar"
                    data={ etfsOverviewData }
                    series={ [ 'Holdings (ETH)', 'USD Value (B)', 'Marketshare (%)' ] }
                    height={ 400 }
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SmartChartCard
                        title="AUM Marketshare (Trend)"
                        subtitle="Share evolution over time"
                        chartType="area"
                        data={ aumMarketshareData }
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
                        series={ [ 'amount' ] }
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

