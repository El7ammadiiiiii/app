'use client';

import React, { useMemo } from 'react';
import SmartChartCard from '@/components/SmartChartCard';
import { Activity, ArrowLeftRight, BarChart3, Building2, Coins, CreditCard, DollarSign, RefreshCw, Users, Wallet, Layers } from 'lucide-react';
import { motion } from 'framer-motion';

// Chart Helpers
import { generateDateSeries, formatCompact } from '@/lib/chart-utils';
import { usePoSPayments } from '@/hooks/use-crawler-data';

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
            <h3 className="text-sm font-medium text-gray-400 max-w-[70%]">{ label }</h3>
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">{ icon }</div>
        </div>
        <div className="text-2xl font-bold text-white mb-1">{ value }</div>
        <div className="text-xs text-gray-500">{ subtitle }</div>
    </div>
);

// Formatters
const fmt = ( n: number ) => new Intl.NumberFormat( 'en-US', { notation: 'compact', maximumFractionDigits: 1 } ).format( n );
const fmtUSD = ( n: number ) => new Intl.NumberFormat( 'en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 } ).format( n );

/* ───────────── Data Builders ───────────── */
function buildDates ( count: number, startDate = "2020-09-01" ): string[]
{
    return generateDateSeries( count, startDate, "monthly" ).map( d => d.toISOString().split( 'T' )[ 0 ] );
}

function makeStackedData ( dates: string[], keys: string[], seed: number, baseMin: number, baseMax: number ): any[]
{
    const rng = seededRandom( seed );
    return dates.map( ( date ) =>
    {
        const row: any = { date };
        keys.forEach( ( k ) =>
        {
            row[ k ] = Math.round( baseMin + rng() * ( baseMax - baseMin ) );
        } );
        return row;
    } );
}

function makeBarLineData ( dates: string[], seed: number, barMin: number, barMax: number, lineMin: number, lineMax: number ): any[]
{
    const rng = seededRandom( seed );
    return dates.map( ( date ) => ( {
        date,
        'Monthly': Math.round( barMin + rng() * ( barMax - barMin ) ),
        'Cumulative': Math.round( lineMin + rng() * ( lineMax - lineMin ) ),
    } ) );
}

function makeSimpleBarData ( dates: string[], seed: number, min: number, max: number ): any[]
{
    const rng = seededRandom( seed );
    return dates.map( ( date ) => ( {
        date: date,
        value: Math.round( min + rng() * ( max - min ) ),
    } ) );
}

export default function PolygonPoSPaymentsPage ()
{
    const { data: posData, loading, refresh } = usePoSPayments();

    /* ── Shared date arrays ── */
    const dates50 = useMemo( () => buildDates( 50 ), [] );
    const dates40 = useMemo( () => buildDates( 40 ), [] );
    const dates30 = useMemo( () => buildDates( 30 ), [] );
    const dates20 = useMemo( () => buildDates( 20 ), [] );

    /* ── Chart 1: Stablecoins Active Addresses ── */
    const chainKeys = [ "All", "Polygon", "Solana", "Base", "Ethereum", "Arbitrum", "BNB", "WorldChain", "Optimism", "Abstract", "Avalanche", "Linea", "Sonic", "Ronin", "Blast", "Sui" ];
    const chainColors = [ "#6b7280", "#8247e5", "#14f195", "#0052ff", "#627eea", "#f0b90b", "#f3ba2f", "#00ff00", "#ff0420", "#00d4ff", "#e84142", "#61dfff", "#2e3092", "#1273ea", "#fcfc03", "#4da2ff" ];
    const addressesMonthlyData = useMemo( () => posData?.merchant_growth ?? makeStackedData( dates50, chainKeys, 101, 500000, 2500000 ), [ posData, dates50 ] );

    /* ── Chart 2 & 3: USDT / USDC active addresses ── */
    const usdtAddressesData = useMemo( () => makeBarLineData( dates50, 201, 500000, 1500000, 900000, 45000000 ), [ dates50 ] );
    const usdcAddressesData = useMemo( () => makeBarLineData( dates50, 301, 600000, 1800000, 1000000, 61000000 ), [ dates50 ] );

    /* ── Chart 4: P2P transfer volume ── */
    const p2pVolumeData = useMemo( () => posData?.volume_history ?? makeBarLineData( dates50, 401, 500000, 1500000, 900000, 39000000 ).map( d => ( { ...d, 'Monthly Volume': d[ 'Monthly' ] } ) ), [ posData, dates50 ] );

    /* ── Chart 5 & 6: P2P hours activity ── */
    const hours = useMemo( () => Array.from( { length: 24 }, ( _, i ) => `${ i }:00` ), [] );
    const p2pHoursKeys = [ "USDT0", "USDC" ];
    const p2pHoursColors = [ "#10b981", "#3b82f6" ];
    const p2pHoursVolumeData = useMemo( () =>
    {
        const rng = seededRandom( 501 );
        return hours.map( ( h ) => ( {
            date: h,
            USDT0: Math.round( 200000000 + rng() * 800000000 ),
            USDC: Math.round( 100000000 + rng() * 600000000 ),
        } ) );
    }, [ hours ] );

    const p2pHoursTransfersData = useMemo( () =>
    {
        const rng = seededRandom( 502 );
        return hours.map( ( h ) => ( {
            date: h,
            USDT0: Math.round( 50000 + rng() * 200000 ),
            USDC: Math.round( 30000 + rng() * 150000 ),
        } ) );
    }, [ hours ] );

    /* ── Chart 7: P2P amount range ── */
    const amountRanges = [ "$5000-$10000", "$1000-$5000", "$500-$1000", "$200-$500", "$50-$200", "$1-$50" ];
    const amountColors = [ "#d946ef", "#a855f7", "#8b5cf6", "#7c3aed", "#6d28d9", "#5b21b6" ];
    const p2pAmountRangeData = useMemo( () => posData?.category_breakdown ?? makeStackedData( dates50, amountRanges, 601, 500000, 3500000 ), [ posData, dates50 ] );

    /* ── Payment Services ── */
    const serviceKeys = [ "ReddaPay", "Stripe", "Moonpay", "Monorail", "Rain Card", "Coinflow", "BlindPay", "Revolut" ];
    const serviceColors = [ "#ef4444", "#06b6d4", "#f59e0b", "#8b5cf6", "#ec4899", "#10b981", "#6366f1", "#3b82f6" ];
    const paymentServicesData = useMemo( () => posData?.volume_history ?? makeStackedData( dates20, serviceKeys, 701, 10000000, 60000000 ), [ posData, dates20 ] );

    /* ── Payments App ── */
    const appKeys = [ "Fonbnk", "BitPay", "Ramp", "GamePayments", "BasedApp", "DePay", "Transak", "LlamaPay", "Holyheld", "B2BinPay", "Payeer", "Mercuryo", "Cefin", "Wirex", "Pleo", "DEX", "Paydece", "Cryptomus", "Posy" ];
    const appColors = [ "#ef4444", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#fb7185", "#fda4af", "#fbbf24", "#facc15", "#fde047", "#bef264", "#86efac", "#6ee7b7" ];
    const paymentsAppData = useMemo( () => posData?.merchant_growth ?? makeStackedData( dates30, appKeys, 801, 5000000, 25000000 ), [ posData, dates30 ] );

    /* ── On/offramp ── */
    const onofframpTxData = useMemo( () => posData?.settlement_history ?? makeBarLineData( dates30, 901, 2000, 10000, 200, 700 ).map( d => ( { ...d, 'Transactions': d[ 'Monthly' ] } ) ), [ posData, dates30 ] );
    const onofframpVolumeData = useMemo( () => posData?.settlement_history ?? makeStackedData( dates20, serviceKeys, 1001, 10000000, 60000000 ), [ posData, dates20, serviceKeys ] );

    /* ── Circle & Payrolls ── */
    const circleVolumeData = useMemo( () => posData?.settlement_history ?? makeSimpleBarData( dates40, 1101, 500000000, 2000000000 ), [ posData, dates40 ] );

    const payrollKeys = [ "Pay", "Withdraw" ];
    const payrollColors = [ "#f59e0b", "#374151" ];
    const payrollsData = useMemo( () => makeStackedData( dates30, payrollKeys, 1201, 5000, 50000 ), [ dates30 ] );

    const categoryKeys = [ "extra large", "large", "medium", "small", "micro" ];
    const categoryColors = [ "#6b7280", "#9ca3af", "#d1d5db", "#6366f1", "#3b82f6" ];
    const paymentsTransfersCategoryData = useMemo( () => posData?.category_breakdown ?? makeStackedData( dates40, categoryKeys, 1301, 100000, 600000 ), [ posData, dates40 ] );

    const eurVolumeData = useMemo( () => posData?.regional_data ?? makeSimpleBarData( dates30, 1401, 10000000, 45000000 ), [ posData, dates30 ] );
    const eurTxData = useMemo( () => posData?.regional_data ?? makeSimpleBarData( dates30, 1501, 500, 5000 ), [ posData, dates30 ] );

    /* ── CEX ── */
    const cexKeys = [ "Shakepay", "Nominex", "LAToken", "Mercuryo", "Blockchain.com", "Faa.st", "Zipmex", "Bitrex", "Coincheck", "Emirex", "Bitcoin Meester", "Bitrefill", "OPNX", "Tokocrypto", "Bitvavo", "Abra", "Prime Trust" ];
    const cexColors = [ "#ef4444", "#f59e0b", "#fbbf24", "#facc15", "#84cc16", "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e" ];
    const cexInflowData = useMemo( () => posData?.regional_data ?? makeStackedData( dates20, cexKeys, 1601, 200000000, 1200000000 ), [ posData, dates20 ] );

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
                            💳 Polygon PoS Payments
                        </motion.h1>
                        <p className="text-white/60 text-sm">
                            Comprehensive Payments Analytics Dashboard
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

            {/* Stablecoins Section */ }
            <section className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-purple-400 border-b border-white/10 pb-2">
                    <Wallet className="w-5 h-5" />
                    <h2>Stabecoins Analysis</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon={ <Users className="w-5 h-5" /> } label="USDT Active (Total)" value={ fmt( 45053375 ) } subtitle="Cumulative" />
                    <StatCard icon={ <Activity className="w-5 h-5" /> } label="USDT Monthly" value={ fmt( 251785 ) } subtitle="Active Addresses" />
                    <StatCard icon={ <Users className="w-5 h-5" /> } label="USDC Active (Total)" value={ fmt( 61745109 ) } subtitle="Cumulative" />
                    <StatCard icon={ <Activity className="w-5 h-5" /> } label="USDC Monthly" value={ fmt( 664796 ) } subtitle="Active Addresses" />
                </div>

                <SmartChartCard
                    title="Addresses Monthly"
                    subtitle="USDC Addresses native & bridge tokens"
                    chartType="area"
                    data={ addressesMonthlyData }
                    series={ chainKeys }
                    colors={ chainColors }
                    height={ 450 }
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SmartChartCard
                        title="USDT Active Addresses"
                        subtitle="Monthly Active"
                        chartType="bar"
                        data={ usdtAddressesData }
                        series={ [ 'Monthly' ] }
                        colors={ [ '#8247e5' ] }
                        height={ 350 }
                    />
                    <SmartChartCard
                        title="USDC Active Addresses"
                        subtitle="Monthly Active"
                        chartType="bar"
                        data={ usdcAddressesData }
                        series={ [ 'Monthly' ] }
                        colors={ [ '#3b82f6' ] }
                        height={ 350 }
                    />
                </div>
            </section>

            {/* P2P Section */ }
            <section className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-emerald-400 border-b border-white/10 pb-2">
                    <Users className="w-5 h-5" />
                    <h2>P2P Activity</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon={ <DollarSign className="w-5 h-5" /> } label="PoS P2P Volume" value={ fmtUSD( 257594518 ) } subtitle="Monthly" />
                    <StatCard icon={ <ArrowLeftRight className="w-5 h-5" /> } label="Total Transfer Vol" value={ fmtUSD( 39188857999 ) } subtitle="Cumulative" />
                    <StatCard icon={ <Users className="w-5 h-5" /> } label="Unique P2P Addrs" value={ formatCompact( 23080000 ) } subtitle="Lifetime" />
                    <StatCard icon={ <BarChart3 className="w-5 h-5" /> } label="P2P Transactions" value={ formatCompact( 250000000 ) } subtitle="Lifetime" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SmartChartCard
                        title="P2P Transfer Volume"
                        subtitle="Monthly Volume (USDT + USDC)"
                        chartType="bar"
                        data={ p2pVolumeData }
                        series={ [ 'Monthly Volume' ] }
                        colors={ [ '#8247e5' ] }
                        height={ 350 }
                    />
                    <SmartChartCard
                        title="Amount Range Distribution"
                        subtitle="Transactions by Size"
                        chartType="area"
                        data={ p2pAmountRangeData }
                        series={ amountRanges }
                        colors={ amountColors }
                        height={ 350 }
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SmartChartCard
                        title="Active Hours (Volume)"
                        subtitle="UTC Time Activity"
                        chartType="area"
                        data={ p2pHoursVolumeData }
                        series={ p2pHoursKeys }
                        colors={ p2pHoursColors }
                        height={ 350 }
                    />
                    <SmartChartCard
                        title="Active Hours (Transfers)"
                        subtitle="UTC Time Activity"
                        chartType="area"
                        data={ p2pHoursTransfersData }
                        series={ p2pHoursKeys }
                        colors={ p2pHoursColors }
                        height={ 350 }
                    />
                </div>
            </section>

            {/* Payments Infrastructure */ }
            <section className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-cyan-400 border-b border-white/10 pb-2">
                    <CreditCard className="w-5 h-5" />
                    <h2>Infrastructure & Apps</h2>
                </div>

                <SmartChartCard
                    title="Payment Services Volume"
                    subtitle="Big Merchants / Base Companies"
                    chartType="area"
                    data={ paymentServicesData }
                    series={ serviceKeys }
                    colors={ serviceColors }
                    height={ 400 }
                />

                <SmartChartCard
                    title="Payments App Volume"
                    subtitle="App Transfer Volumes"
                    chartType="area"
                    data={ paymentsAppData }
                    series={ appKeys }
                    colors={ appColors }
                    height={ 400 }
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SmartChartCard
                        title="On/Off Ramp Txs"
                        subtitle="Moonpay, Transak, Mercuryo"
                        chartType="bar"
                        data={ onofframpTxData }
                        series={ [ 'Transactions' ] }
                        colors={ [ '#3b82f6' ] }
                        height={ 350 }
                    />
                    <SmartChartCard
                        title="On/Off Ramp Volume"
                        subtitle="Transfer Volume"
                        chartType="area"
                        data={ onofframpVolumeData }
                        series={ serviceKeys }
                        colors={ serviceColors }
                        height={ 350 }
                    />
                </div>
            </section>

            {/* Corporate / Institutional */ }
            <section className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-orange-400 border-b border-white/10 pb-2">
                    <Building2 className="w-5 h-5" />
                    <h2>Corporate & Institutional</h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SmartChartCard
                        title="Circle Transfer Volume"
                        subtitle="USDC Issuer Flow"
                        chartType="bar"
                        data={ circleVolumeData }
                        series={ [ 'value' ] }
                        colors={ [ '#a855f7' ] }
                        height={ 350 }
                    />
                    <SmartChartCard
                        title="Payrolls Volume"
                        subtitle="DispelPay (Native + Bridge)"
                        chartType="area"
                        data={ payrollsData }
                        series={ payrollKeys }
                        colors={ payrollColors }
                        height={ 350 }
                    />
                </div>

                <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 sm:p-6 backdrop-blur-sm hover:bg-white/[0.07] transition-colors">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-semibold text-white">Live Payments</h3>
                            <p className="text-xs text-slate-400">Last 7 days analytics</p>
                        </div>
                        <div className="p-2 bg-emerald-500/10 rounded px-3 text-emerald-400 text-xs font-mono">Live</div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs sm:text-sm text-left">
                            <thead className="bg-white/5 text-white/60">
                                <tr>
                                    <th className="p-3 rounded-l-lg">Time</th>
                                    <th className="p-3">Token</th>
                                    <th className="p-3">Project</th>
                                    <th className="p-3 text-right">Amount</th>
                                    <th className="p-3 rounded-r-lg">Category</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                { [
                                    { time: "2026-02-09 12:59", token: "USDC", project: "Coinbase Commerce", amount: "$8", category: "Pay Infra" },
                                    { time: "2026-02-09 12:59", token: "USDC", project: "Coinbase Commerce", amount: "$2", category: "Pay Infra" },
                                    { time: "2026-02-09 12:59", token: "USDC", project: "Coinflow", amount: "$150", category: "Pay Infra" },
                                    { time: "2026-02-09 12:59", token: "USDC", project: "Coinflow", amount: "$50", category: "Pay Infra" },
                                    { time: "2026-02-09 12:59", token: "USDC", project: "Mercuryo", amount: "$62", category: "Off/On Ramp" },
                                    { time: "2026-02-09 12:59", token: "USDC", project: "NOWPayments", amount: "$5", category: "Pay Infra" },
                                ].map( ( row, i ) => (
                                    <tr key={ i } className="hover:bg-white/5 transition-colors">
                                        <td className="p-3 text-white/50">{ row.time }</td>
                                        <td className="p-3 font-medium text-teal-200">{ row.token }</td>
                                        <td className="p-3">{ row.project }</td>
                                        <td className="p-3 text-right font-mono text-emerald-400">{ row.amount }</td>
                                        <td className="p-3 text-white/50">{ row.category }</td>
                                    </tr>
                                ) ) }
                            </tbody>
                        </table>
                    </div>
                </div>

                <SmartChartCard
                    title="Transfers by Category"
                    subtitle="Payment Size Distribution"
                    chartType="area"
                    data={ paymentsTransfersCategoryData }
                    series={ categoryKeys }
                    colors={ categoryColors }
                    height={ 400 }
                />
            </section>

            {/* European Market */ }
            <section className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-teal-300 border-b border-white/10 pb-2">
                    <Coins className="w-5 h-5" />
                    <h2>European Market (EURe)</h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SmartChartCard
                        title="EURe Volume"
                        subtitle="Monerium Transfer Volume"
                        chartType="bar"
                        data={ eurVolumeData }
                        series={ [ 'value' ] }
                        colors={ [ '#14b8a6' ] }
                        height={ 350 }
                    />
                    <SmartChartCard
                        title="EURe Transactions"
                        subtitle="Monerium Tx Count"
                        chartType="bar"
                        data={ eurTxData }
                        series={ [ 'value' ] }
                        colors={ [ '#14b8a6' ] }
                        height={ 350 }
                    />
                </div>
            </section>

            {/* CEX Inflows */ }
            <section className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-white/80 border-b border-white/10 pb-2">
                    <Building2 className="w-5 h-5" />
                    <h2>CEX Flows</h2>
                </div>
                <SmartChartCard
                    title="CEX Stablecoin Inflows"
                    subtitle="Quarterly Inflow by Exchange"
                    chartType="area"
                    data={ cexInflowData }
                    series={ cexKeys }
                    colors={ cexColors }
                    height={ 450 }
                />
            </section>
        </div>
    );
}

