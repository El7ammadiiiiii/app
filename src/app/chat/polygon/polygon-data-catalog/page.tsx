'use client';

import React, { useMemo } from 'react';
import SmartChartCard from '@/components/SmartChartCard';
import { Activity, AlertTriangle, BarChart3, Coins, CreditCard, DollarSign, PieChart, RefreshCw, TrendingUp, Zap, Layers } from 'lucide-react';
import { useDataCatalog } from '@/hooks/use-crawler-data';
import { motion } from 'framer-motion';

// Chart Helpers
import { generateDateSeries, formatCompact } from '@/lib/chart-utils';

function seededRandom ( seed: number ): () => number
{
    let s = seed;
    return () =>
    {
        s = ( ( s * 9301 + 49297 ) % 233280 );
        return s / 233280;
    };
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

/* ───────────── Data Generators ───────────── */
function buildStackedData ( dates: string[], keys: string[], seed: number, baseValue: number, amplitude: number ): any[]
{
    const rng = seededRandom( seed );
    return dates.map( ( date, i ) =>
    {
        const point: any = { date };
        keys.forEach( ( key, j ) =>
        {
            const phase = ( j * 2.3 + i * 0.15 ) % ( Math.PI * 2 );
            point[ key ] = baseValue + amplitude * Math.abs( Math.sin( phase ) ) + rng() * amplitude * 0.3;
        } );
        return point;
    } );
}

function buildProportionData ( dates: string[], keys: string[], seed: number ): any[]
{
    const rng = seededRandom( seed );
    return dates.map( ( date, i ) =>
    {
        const raw: number[] = keys.map( ( _, j ) =>
        {
            const phase = ( j * 1.7 + i * 0.12 ) % ( Math.PI * 2 );
            return 5 + 10 * Math.abs( Math.sin( phase ) ) + rng() * 3;
        } );
        const total = raw.reduce( ( a, b ) => a + b, 0 );
        const point: any = { date };
        keys.forEach( ( key, j ) =>
        {
            point[ key ] = ( raw[ j ] / total ) * 100;
        } );
        return point;
    } );
}


export default function PolygonDataCatalogPage ()
{
    const { data: catalogData, loading, refresh } = useDataCatalog();

    /* ── Dates ── */
    const monthlyDates = useMemo( () => generateDateSeries( 12, "2025-01-01", "monthly" ).map( d => d.toISOString().split( 'T' )[ 0 ] ), [] );
    const weeklyDates = useMemo( () => generateDateSeries( 60, "2024-12-01", "weekly" ).map( d => d.toISOString().split( 'T' )[ 0 ] ), [] );
    const usdcActivityDates = useMemo( () => generateDateSeries( 30, "2018-01-01", "monthly" ).map( d => d.toISOString().split( 'T' )[ 0 ] ), [] );

    /* ── 1. Stablecoin Volumes by Category ── */
    const volCategories = [ "Ponzi/Scam", "Bot", "NFT", "DEX", "Bridge", "P2P", "Gaming", "Fiat Ramp", "Market Maker", "Lending", "Stablecoin Protocol", "CEX", "Prediction", "Protocol_Unknown" ];
    const volColors = [ "#ef4444", "#f59e0b", "#a855f7", "#06b6d4", "#10b981", "#d946ef", "#8b5cf6", "#ec4899", "#fbbf24", "#84cc16", "#3b82f6", "#6366f1", "#f43f5e", "#6b7280" ];
    const volData = useMemo( () => catalogData?.datasets ?? buildStackedData( monthlyDates, volCategories, 42, 10_000_000, 30_000_000 ), [ monthlyDates, catalogData ] );

    /* ── 2. Payment Provider Rankings ── */
    const providers = [ "Uphold", "Coinflow", "Coinbase", "Paxos", "Bitso", "Cryptopay", "Cobo", "Lemon", "Robinhood", "Merxs", "Ripio", "Blindpay", "Revolut", "Zero Hash", "Anubi" ];
    const provColors = [ "#3b82f6", "#06b6d4", "#0ea5e9", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e" ];
    const provData = useMemo( () => catalogData?.usage_history ?? buildStackedData( weeklyDates, providers, 101, 10_000_000, 50_000_000 ), [ weeklyDates, catalogData ] );

    /* ── 3. Payments App Transfer Volume ── */
    const apps = [ "Fonbnk", "BitPay", "Ramp", "GamePayments", "BasedApp", "DePay", "Transak", "LlamaPay", "Holyheld", "B2BinPay", "Payeer", "Mercuryo", "Cefiu", "Wirex", "Ripio", "IDRX", "Paydece", "CryptoPay", "4pay", "Volt" ];
    const appColors = [ "#3b82f6", "#06b6d4", "#0ea5e9", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#0284c7", "#0369a1" ];
    const appData = useMemo( () => catalogData?.categories ?? buildStackedData( monthlyDates.slice( 3 ), apps, 202, 10_000_000, 50_000_000 ), [ monthlyDates, catalogData ] );

    /* ── 4. P2P Chain Data ── */
    const chains = [ "polygon", "avalanche_c", "arbitrum", "ethereum", "optimism", "base", "gnosis", "solana", "celo" ];
    const chainColors = [ "#8247e5", "#e84142", "#28a0f0", "#627eea", "#ff0420", "#0052ff", "#04795b", "#14f195", "#fbcc5c" ];

    // Micro
    const p2pMicroVolData = useMemo( () => buildStackedData( monthlyDates, chains, 301, 20_000_000, 80_000_000 ), [ monthlyDates ] );
    const p2pMicroVolPctData = useMemo( () => buildProportionData( monthlyDates, chains, 302 ), [ monthlyDates ] );
    const p2pMicroTxData = useMemo( () => buildStackedData( monthlyDates, chains, 303, 20_000_000, 80_000_000 ), [ monthlyDates ] );
    const p2pMicroTxPctData = useMemo( () => buildProportionData( monthlyDates, chains, 304 ), [ monthlyDates ] );

    // Small
    const p2pSmallVolData = useMemo( () => buildStackedData( monthlyDates, chains, 401, 20_000_000, 80_000_000 ), [ monthlyDates ] );
    const p2pSmallVolPctData = useMemo( () => buildProportionData( monthlyDates, chains, 402 ), [ monthlyDates ] );
    const p2pSmallTxData = useMemo( () => buildStackedData( monthlyDates, chains, 403, 20_000_000, 80_000_000 ), [ monthlyDates ] );
    const p2pSmallTxPctData = useMemo( () => buildProportionData( monthlyDates, chains, 404 ), [ monthlyDates ] );

    // Med
    const p2pMedVolData = useMemo( () => buildStackedData( monthlyDates, chains, 501, 20_000_000, 80_000_000 ), [ monthlyDates ] );
    const p2pMedVolPctData = useMemo( () => buildProportionData( monthlyDates, chains, 502 ), [ monthlyDates ] );
    const p2pMedTxData = useMemo( () => buildStackedData( monthlyDates, chains, 503, 20_000_000, 80_000_000 ), [ monthlyDates ] );
    const p2pMedTxPctData = useMemo( () => buildProportionData( monthlyDates, chains, 504 ), [ monthlyDates ] );

    // Large
    const p2pLargeTxData = useMemo( () => buildStackedData( monthlyDates, chains, 601, 20_000_000, 80_000_000 ), [ monthlyDates ] );
    const p2pLargeTxPctData = useMemo( () => buildProportionData( monthlyDates, chains, 602 ), [ monthlyDates ] );

    /* ── 5. USDC Activity ── */
    const usdcChains = [ "Polygon", "Solana", "Base", "Ethereum", "Arbitrum", "BNB", "WorldChain", "Optimism", "Abstract", "Avalanche", "Linea", "Sonic", "Ronin", "Blast", "Sui", "Berachain", "Unichain", "Plume", "Ethos" ];
    const usdcColors = [ "#8247e5", "#14f195", "#0052ff", "#627eea", "#28a0f0", "#f0b90b", "#1c1c1c", "#ff0420", "#7c3aed", "#e84142", "#61dfff", "#4169e1", "#124bdc", "#fcfc03", "#6fbcf0", "#f76b1c", "#ff007a", "#9333ea", "#00d4aa" ];

    const usdcData = useMemo( () =>
    {
        if ( catalogData?.quality_metrics ) return catalogData.quality_metrics;
        const rng = seededRandom( 700 );
        return usdcActivityDates.map( ( date, i ) =>
        {
            const point: any = { date };
            usdcChains.forEach( ( chain, j ) =>
            {
                const baseValue = 100_000 + rng() * 500_000;
                const growthFactor = 1 + i * 0.03;
                point[ chain ] = baseValue * growthFactor;
            } );
            return point;
        } );
    }, [ usdcActivityDates, catalogData ] );

    /* ── Payment Alerts ── */
    const alerts = [
        { provider: "Lemon", thisWeek: "$8.82m", medianWeekly: "$2.93m", aboveMedian: "200.69%", level: "NEW PERIOD RECORD", flag: "milestone", count: 14002, dateRange: "Jan 19 - Jan 25" },
        { provider: "Coinbase Commerce", thisWeek: "$54.60m", medianWeekly: "$1.00m", aboveMedian: "4921.79%", level: "MILESTONE ALERT", flag: "milestone", count: 7364, dateRange: "Jan 19 - Jan 25" },
        { provider: "Coinflow", thisWeek: "$11.12m", medianWeekly: "$2.54m", aboveMedian: "338.18%", level: "MILESTONE ALERT", flag: "milestone", count: 151126, dateRange: "Jan 19 - Jan 25" },
        { provider: "Avarai Pay", thisWeek: "$54.72m", medianWeekly: "$11.72m", aboveMedian: "367.27%", level: "TRENDING HOT", flag: "hot", count: 775, dateRange: "Jan 19 - Jan 25" },
        { provider: "Mercuryo", thisWeek: "$361.01m", medianWeekly: "$130.00m", aboveMedian: "131.77%", level: "NOTABLE GROWTH", flag: "growth", count: 419, dateRange: "Jan 19 - Jan 25" },
    ];

    return (
        <div className="space-y-8 min-h-screen text-slate-100 p-6 lg:px-12 pb-24">
            {/* Header */ }
            <div className="flex flex-col gap-3 sm:gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex flex-col gap-2">
                        <motion.h1
                            initial={ { opacity: 0, x: -20 } }
                            animate={ { opacity: 1, x: 0 } }
                            className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-cyan-300"
                        >
                            📊 Polygon Data Catalog
                        </motion.h1>
                        <p className="text-white/60 text-sm">
                            Comprehensive Polygon Data Analytics &amp; Payment Ecosystem
                        </p>
                    </div>
                    <button
                        onClick={ refresh }
                        className="self-start sm:self-auto inline-flex items-center gap-2 text-xs sm:text-sm px-3 py-2 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 transition-colors border border-teal-400/30 text-teal-200"
                    >
                        <RefreshCw className={ `w-4 h-4 ${ loading ? "animate-spin" : "" }` } />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Stablecoin Volumes */ }
            <section className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-teal-400 border-b border-white/10 pb-2">
                    <PieChart className="w-5 h-5" />
                    <h2>Stablecoin Volumes by Category</h2>
                </div>
                <SmartChartCard
                    title="Volumes by Category"
                    subtitle="Monthly Inflow"
                    chartType="area"
                    data={ volData }
                    series={ volCategories }
                    colors={ volColors }
                    height={ 450 }
                />
            </section>

            {/* Providers */ }
            <section className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-cyan-400 border-b border-white/10 pb-2">
                    <CreditCard className="w-5 h-5" />
                    <h2>Payment Providers</h2>
                </div>

                <SmartChartCard
                    title="Provider Volume Rankings"
                    subtitle="Weekly Inflow Leaders"
                    chartType="area"
                    data={ provData }
                    series={ providers }
                    colors={ provColors }
                    height={ 450 }
                />

                <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 sm:p-6 backdrop-blur-sm hover:bg-white/[0.07] transition-colors">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle className="w-5 h-5 text-yellow-400" />
                        <h3 className="font-semibold text-white">Volume Alerts</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="text-white/60 bg-white/5">
                                <tr>
                                    <th className="p-3 text-left">Provider</th>
                                    <th className="p-3 text-right">This Week</th>
                                    <th className="p-3 text-right">Growth</th>
                                    <th className="p-3">Level</th>
                                    <th className="p-3 text-right">Tx Count</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                { alerts.map( ( row, i ) => (
                                    <tr key={ i } className="hover:bg-white/5">
                                        <td className="p-3 text-white font-medium">{ row.provider }</td>
                                        <td className="p-3 text-right text-emerald-300 font-mono">{ row.thisWeek }</td>
                                        <td className="p-3 text-right text-orange-300">{ row.aboveMedian }</td>
                                        <td className="p-3">
                                            <span className="bg-white/10 px-2 py-1 rounded text-[10px] text-white/70 border border-white/10">
                                                { row.level }
                                            </span>
                                        </td>
                                        <td className="p-3 text-right text-white/50">{ row.count }</td>
                                    </tr>
                                ) ) }
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* Apps */ }
            <section className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-yellow-400 border-b border-white/10 pb-2">
                    <Zap className="w-5 h-5" />
                    <h2>App Transfer Volumes</h2>
                </div>
                <SmartChartCard
                    title="Apps Volume"
                    subtitle="Transfer Rankings"
                    chartType="area"
                    data={ appData }
                    series={ apps }
                    colors={ appColors }
                    height={ 450 }
                />
            </section>

            {/* P2P Micropayments */ }
            <section className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-pink-400 border-b border-white/10 pb-2">
                    <Coins className="w-5 h-5" />
                    <h2>Micropayments ( &lt; $100 )</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SmartChartCard title="Micro Vol" subtitle="Volume (Abs)" chartType="area" data={ p2pMicroVolData } series={ chains } colors={ chainColors } height={ 350 } />
                    <SmartChartCard title="Micro Vol %" subtitle="Volume (Share)" chartType="area" data={ p2pMicroVolPctData } series={ chains } colors={ chainColors } height={ 350 } />
                    <SmartChartCard title="Micro Tx" subtitle="Transactions (Abs)" chartType="area" data={ p2pMicroTxData } series={ chains } colors={ chainColors } height={ 350 } />
                    <SmartChartCard title="Micro Tx %" subtitle="Transactions (Share)" chartType="area" data={ p2pMicroTxPctData } series={ chains } colors={ chainColors } height={ 350 } />
                </div>
            </section>

            {/* P2P Small */ }
            <section className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-emerald-400 border-b border-white/10 pb-2">
                    <DollarSign className="w-5 h-5" />
                    <h2>Small Payments ( $100 - $1k )</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SmartChartCard title="Small Vol" subtitle="Volume (Abs)" chartType="area" data={ p2pSmallVolData } series={ chains } colors={ chainColors } height={ 350 } />
                    <SmartChartCard title="Small Vol %" subtitle="Volume (Share)" chartType="area" data={ p2pSmallVolPctData } series={ chains } colors={ chainColors } height={ 350 } />
                    <SmartChartCard title="Small Tx" subtitle="Transactions (Abs)" chartType="area" data={ p2pSmallTxData } series={ chains } colors={ chainColors } height={ 350 } />
                    <SmartChartCard title="Small Tx %" subtitle="Transactions (Share)" chartType="area" data={ p2pSmallTxPctData } series={ chains } colors={ chainColors } height={ 350 } />
                </div>
            </section>

            {/* P2P Medium */ }
            <section className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-teal-400 border-b border-white/10 pb-2">
                    <BarChart3 className="w-5 h-5" />
                    <h2>Medium Payments ( $1k - $10k )</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SmartChartCard title="Medium Vol" subtitle="Volume (Abs)" chartType="area" data={ p2pMedVolData } series={ chains } colors={ chainColors } height={ 350 } />
                    <SmartChartCard title="Medium Vol %" subtitle="Volume (Share)" chartType="area" data={ p2pMedVolPctData } series={ chains } colors={ chainColors } height={ 350 } />
                    <SmartChartCard title="Medium Tx" subtitle="Transactions (Abs)" chartType="area" data={ p2pMedTxData } series={ chains } colors={ chainColors } height={ 350 } />
                    <SmartChartCard title="Medium Tx %" subtitle="Transactions (Share)" chartType="area" data={ p2pMedTxPctData } series={ chains } colors={ chainColors } height={ 350 } />
                </div>
            </section>

            {/* P2P Large */ }
            <section className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-orange-400 border-b border-white/10 pb-2">
                    <TrendingUp className="w-5 h-5" />
                    <h2>Large Payments ( &gt; $10k )</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SmartChartCard title="Large Tx" subtitle="Transactions (Abs)" chartType="area" data={ p2pLargeTxData } series={ chains } colors={ chainColors } height={ 350 } />
                    <SmartChartCard title="Large Tx %" subtitle="Transactions (Share)" chartType="area" data={ p2pLargeTxPctData } series={ chains } colors={ chainColors } height={ 350 } />
                </div>
            </section>

            {/* USDC Activity */ }
            <section className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-indigo-400 border-b border-white/10 pb-2">
                    <Activity className="w-5 h-5" />
                    <h2>USDC Activity</h2>
                </div>
                <SmartChartCard
                    title="USDC Addresses"
                    subtitle="Active Addresses (Monthly)"
                    chartType="area"
                    data={ usdcData }
                    series={ usdcChains }
                    colors={ usdcColors }
                    height={ 450 }
                />
            </section>
        </div>
    );
}

