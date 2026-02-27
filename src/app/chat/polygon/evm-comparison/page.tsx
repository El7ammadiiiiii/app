'use client';

import React, { useEffect, useMemo, useState } from 'react';
import SmartChartCard from '@/components/SmartChartCard';
import { Activity, Coins, Layers, RefreshCw, Sparkles, Users, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEVMComparison } from '@/hooks/use-crawler-data';

// Chart Helpers
import { generateDateSeries } from '@/lib/chart-utils';

function seededRandom ( seed: number ): number
{
    const x = Math.sin( seed * 9301 + 49297 ) * 49297;
    return x - Math.floor( x );
}

function seededValues ( seed: number, count: number, base: number, spread: number, trend: number = 0 ): number[]
{
    const vals: number[] = [];
    let s = seed;
    for ( let i = 0; i < count; i++ )
    {
        s = ( ( s * 9301 + 49297 ) % 233280 );
        const r = s / 233280;
        vals.push( Math.round( base + r * spread + trend * i ) );
    }
    return vals;
}

/* ───────────── Chain Definitions ───────────── */
const EVM_CHAINS = [
    { name: "sonic", color: "#3b82f6" },
    { name: "sophon", color: "#06b6d4" },
    { name: "story", color: "#f59e0b" },
    { name: "superseed", color: "#eab308" },
    { name: "tao", color: "#84cc16" },
    { name: "unichain", color: "#22c55e" },
    { name: "viction", color: "#10b981" },
    { name: "worldchain", color: "#14b8a6" },
    { name: "zkevm", color: "#6366f1" },
    { name: "zksync", color: "#8b5cf6" },
    { name: "zora", color: "#a855f7" },
    { name: "plasma", color: "#c084fc" },
    { name: "polygon", color: "#d946ef" },
];

const STABLECOIN_CHAINS = [
    { name: "polygon", color: "#d946ef" },
    { name: "gnosis", color: "#3b82f6" },
    { name: "scroll", color: "#06b6d4" },
    { name: "fantom", color: "#8b5cf6" },
    { name: "arbitrum", color: "#6366f1" },
    { name: "ethereum", color: "#a855f7" },
    { name: "avalanche_c", color: "#c084fc" },
    { name: "mantle", color: "#f59e0b" },
    { name: "optimism", color: "#ef4444" },
    { name: "linea", color: "#10b981" },
    { name: "bnb", color: "#eab308" },
    { name: "blast", color: "#14b8a6" },
];

const NFT_CHAINS = [
    { name: "ethereum", color: "#3b82f6" },
    { name: "polygon", color: "#a855f7" },
    { name: "zora", color: "#ef4444" },
    { name: "worldchain", color: "#14b8a6" },
    { name: "zksync", color: "#8b5cf6" },
    { name: "optimism", color: "#f59e0b" },
    { name: "mantle", color: "#06b6d4" },
    { name: "linea", color: "#10b981" },
    { name: "ronin", color: "#eab308" },
    { name: "scroll", color: "#c084fc" },
    { name: "sei", color: "#d946ef" },
    { name: "fantom", color: "#6366f1" },
    { name: "gnosis", color: "#ec4899" },
    { name: "kala", color: "#f472b6" },
];

/* ───────────── Data Builders ───────────── */
const DATES_6 = generateDateSeries( 6, "2025-06-01", "month" ).map( d => d.toISOString().split( 'T' )[ 0 ] );

function buildStackedData ( dates: string[], chains: { name: string; color: string }[], valuesFn: ( chainIdx: number ) => number[] ): any[]
{
    return dates.map( ( date, di ) =>
    {
        const row: any = { date };
        chains.forEach( ( chain, ci ) =>
        {
            row[ chain.name ] = valuesFn( ci )[ di ];
        } );
        return row;
    } );
}

function buildPercentData ( dates: string[], chains: { name: string; color: string }[], valuesFn: ( chainIdx: number ) => number[] ): any[]
{
    const abs = dates.map( ( _, di ) =>
    {
        let total = 0;
        chains.forEach( ( _, ci ) => { total += valuesFn( ci )[ di ]; } );
        return total;
    } );
    return dates.map( ( date, di ) =>
    {
        const row: any = { date };
        chains.forEach( ( chain, ci ) =>
        {
            row[ chain.name ] = abs[ di ] > 0 ? ( valuesFn( ci )[ di ] / abs[ di ] ) * 100 : 0;
        } );
        return row;
    } );
}


/* ───────────── StatCard ───────────── */
const StatCard = ( { icon, label, value, subtitle, description }: any ) => (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-6 backdrop-blur-sm hover:bg-white/[0.07] transition-colors">
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">{ label }</h3>
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">{ icon }</div>
        </div>
        <div className="text-2xl font-bold text-white mb-1">{ value }</div>
        <div className="text-xs text-gray-500">{ subtitle }</div>
        { description && <div className="mt-2 text-xs text-white/40 border-t border-white/5 pt-2">{ description }</div> }
    </div>
);

export default function EVMComparisonPage ()
{
    const { data: evmData, loading: evmLoading, refresh: refreshEvm } = useEVMComparison();
    const loading = evmLoading;

    /* ── Derive chain list from API or fallback ── */
    const liveChains = useMemo( () =>
    {
        if ( !evmData?.chains ) return null;
        return evmData.chains.map( ( c: any, i: number ) => ( {
            name: c.name,
            color: EVM_CHAINS[ i % EVM_CHAINS.length ]?.color ?? '#8b5cf6',
        } ) );
    }, [ evmData ] );

    const activeChains = liveChains ?? EVM_CHAINS;

    /* ── Transactions Data ── */
    const txAbsValuesFn = ( ci: number ) => seededValues( ci * 7 + 100, 6, 150_000_000, 400_000_000, 20_000_000 );
    const txAbsDataMock = useMemo( () => buildStackedData( DATES_6, EVM_CHAINS, txAbsValuesFn ), [] );
    const txPctDataMock = useMemo( () => buildPercentData( DATES_6, EVM_CHAINS, txAbsValuesFn ), [] );

    const txAbsData = useMemo( () =>
    {
        if ( !evmData?.tx_history || !liveChains ) return txAbsDataMock;
        return evmData.tx_history.map( ( row: any ) =>
        {
            const mapped: any = { date: row.date };
            liveChains.forEach( ( c: any ) => { mapped[ c.name ] = row[ c.name ] ?? 0; } );
            return mapped;
        } );
    }, [ evmData, liveChains, txAbsDataMock ] );

    const txPctData = useMemo( () =>
    {
        if ( !evmData?.tx_history || !liveChains ) return txPctDataMock;
        return evmData.tx_history.map( ( row: any ) =>
        {
            const mapped: any = { date: row.date };
            let total = 0;
            liveChains.forEach( ( c: any ) => { total += ( row[ c.name ] ?? 0 ); } );
            liveChains.forEach( ( c: any ) =>
            {
                mapped[ c.name ] = total > 0 ? ( ( row[ c.name ] ?? 0 ) / total ) * 100 : 0;
            } );
            return mapped;
        } );
    }, [ evmData, liveChains, txPctDataMock ] );

    /* ── Wallets Data ── */
    const walletValuesFn = ( ci: number ) => seededValues( ci * 11 + 200, 6, 8_000_000, 25_000_000, 1_000_000 );
    const walletAbsDataMock = useMemo( () => buildStackedData( DATES_6, EVM_CHAINS, walletValuesFn ), [] );
    const walletPctDataMock = useMemo( () => buildPercentData( DATES_6, EVM_CHAINS, walletValuesFn ), [] );

    const walletAbsData = useMemo( () =>
    {
        if ( !evmData?.wallet_history || !liveChains ) return walletAbsDataMock;
        return evmData.wallet_history.map( ( row: any ) =>
        {
            const mapped: any = { date: row.date };
            liveChains.forEach( ( c: any ) => { mapped[ c.name ] = row[ c.name ] ?? 0; } );
            return mapped;
        } );
    }, [ evmData, liveChains, walletAbsDataMock ] );

    const walletPctData = useMemo( () =>
    {
        if ( !evmData?.wallet_history || !liveChains ) return walletPctDataMock;
        return evmData.wallet_history.map( ( row: any ) =>
        {
            const mapped: any = { date: row.date };
            let total = 0;
            liveChains.forEach( ( c: any ) => { total += ( row[ c.name ] ?? 0 ); } );
            liveChains.forEach( ( c: any ) =>
            {
                mapped[ c.name ] = total > 0 ? ( ( row[ c.name ] ?? 0 ) / total ) * 100 : 0;
            } );
            return mapped;
        } );
    }, [ evmData, liveChains, walletPctDataMock ] );

    /* ── Stablecoin Data ── */
    const stablecoinValuesFn = ( ci: number ): number[] =>
    {
        const baseValues: number[][] = [
            [ 1.2e9, 1.3e9, 1.4e9, 1.5e9, 1.55e9, 1.6e9 ],
            [ 0.5e9, 0.52e9, 0.55e9, 0.58e9, 0.62e9, 0.7e9 ],
            [ 0.3e9, 0.32e9, 0.35e9, 0.4e9, 0.45e9, 0.5e9 ],
            [ 0.2e9, 0.22e9, 0.25e9, 0.3e9, 0.35e9, 0.4e9 ],
            [ 0.8e9, 0.82e9, 0.85e9, 0.9e9, 0.95e9, 1.0e9 ],
            [ 1.5e9, 1.55e9, 1.6e9, 1.65e9, 1.75e9, 1.9e9 ],
            [ 0.6e9, 0.62e9, 0.65e9, 0.68e9, 0.72e9, 0.8e9 ],
            [ 0.4e9, 0.42e9, 0.45e9, 0.48e9, 0.52e9, 0.6e9 ],
            [ 0.9e9, 0.92e9, 0.95e9, 0.98e9, 1.02e9, 1.1e9 ],
            [ 0.3e9, 0.32e9, 0.35e9, 0.38e9, 0.42e9, 0.5e9 ],
            [ 1.0e9, 1.05e9, 1.1e9, 1.15e9, 1.25e9, 1.4e9 ],
            [ 0.7e9, 0.72e9, 0.75e9, 0.78e9, 0.82e9, 0.9e9 ],
        ];
        return baseValues[ ci ] ?? seededValues( ci * 13 + 300, 6, 0.5e9, 1e9 );
    };
    const stablecoinAbsData = useMemo( () => buildStackedData( DATES_6, STABLECOIN_CHAINS, stablecoinValuesFn ), [] );
    const stablecoinPctData = useMemo( () => buildPercentData( DATES_6, STABLECOIN_CHAINS, stablecoinValuesFn ), [] );

    /* ── NFT Transactions Data ── */
    const nftTxValuesFn = ( ci: number ): number[] =>
    {
        const baseValues: number[][] = [
            [ 8e6, 8.5e6, 9e6, 9.5e6, 10.5e6, 12e6 ],
            [ 15e6, 15.5e6, 16e6, 17e6, 18.5e6, 20e6 ],
            [ 5e6, 5.2e6, 5.5e6, 5.8e6, 6.2e6, 7e6 ],
            [ 3e6, 3.2e6, 3.5e6, 3.8e6, 4.2e6, 5e6 ],
            [ 4e6, 4.2e6, 4.5e6, 4.8e6, 5.2e6, 6e6 ],
            [ 2e6, 2.2e6, 2.5e6, 2.8e6, 3.2e6, 4e6 ],
            [ 1e6, 1.2e6, 1.5e6, 1.8e6, 2.2e6, 3e6 ],
            [ 1.5e6, 1.7e6, 2e6, 2.3e6, 2.7e6, 3.5e6 ],
            [ 0.5e6, 0.6e6, 0.7e6, 0.85e6, 1e6, 1.5e6 ],
            [ 0.8e6, 0.9e6, 1e6, 1.1e6, 1.3e6, 1.6e6 ],
            [ 0.3e6, 0.35e6, 0.4e6, 0.5e6, 0.6e6, 0.7e6 ],
            [ 0.2e6, 0.25e6, 0.3e6, 0.35e6, 0.45e6, 0.6e6 ],
            [ 0.4e6, 0.45e6, 0.5e6, 0.55e6, 0.65e6, 0.8e6 ],
            [ 0.1e6, 0.12e6, 0.15e6, 0.18e6, 0.22e6, 0.3e6 ],
        ];
        return baseValues[ ci ] ?? seededValues( ci * 17 + 400, 6, 1e6, 5e6 );
    };
    const nftTxAbsData = useMemo( () => buildStackedData( DATES_6, NFT_CHAINS, nftTxValuesFn ), [] );
    const nftTxPctData = useMemo( () => buildPercentData( DATES_6, NFT_CHAINS, nftTxValuesFn ), [] );

    /* ── NFT Transfers Data ── */
    const nftTransferValuesFn = ( ci: number ): number[] =>
    {
        const baseValues: number[][] = [
            [ 50e6, 55e6, 60e6, 70e6, 90e6, 120e6 ],
            [ 80e6, 85e6, 90e6, 100e6, 120e6, 150e6 ],
            [ 30e6, 32e6, 35e6, 40e6, 48e6, 60e6 ],
            [ 20e6, 22e6, 25e6, 30e6, 38e6, 50e6 ],
            [ 25e6, 27e6, 30e6, 35e6, 40e6, 45e6 ],
            [ 15e6, 16e6, 18e6, 20e6, 24e6, 30e6 ],
            [ 10e6, 11e6, 13e6, 15e6, 19e6, 25e6 ],
            [ 12e6, 13e6, 15e6, 18e6, 22e6, 28e6 ],
            [ 60e6, 63e6, 67e6, 72e6, 80e6, 90e6 ],
            [ 8e6, 9e6, 10e6, 12e6, 15e6, 18e6 ],
            [ 5e6, 5.5e6, 6.5e6, 8e6, 10e6, 12e6 ],
            [ 3e6, 3.5e6, 4e6, 5e6, 6.5e6, 8e6 ],
            [ 4e6, 4.5e6, 5e6, 6e6, 8e6, 10e6 ],
            [ 2e6, 2.5e6, 3e6, 3.5e6, 4.5e6, 6e6 ],
        ];
        return baseValues[ ci ] ?? seededValues( ci * 19 + 500, 6, 5e6, 50e6 );
    };
    const nftTransferAbsData = useMemo( () => buildStackedData( DATES_6, NFT_CHAINS, nftTransferValuesFn ), [] );
    const nftTransferPctData = useMemo( () => buildPercentData( DATES_6, NFT_CHAINS, nftTransferValuesFn ), [] );

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
                            ⚡ EVM Chains Comparison
                        </motion.h1>
                        <p className="text-white/60 text-sm">
                            Multi-chain analytics comparing transactions, wallets, stablecoins, and NFT activity across EVM networks
                        </p>
                    </div>
                    <button
                        onClick={ refreshEvm }
                        className="self-start sm:self-auto inline-flex items-center gap-2 text-xs sm:text-sm px-3 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 transition-colors border border-purple-400/30 text-purple-200"
                    >
                        <RefreshCw className={ `w-4 h-4 ${ loading ? "animate-spin" : "" }` } />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Transactions Section */ }
            <section className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-purple-400 border-b border-white/10 pb-2">
                    <Activity className="w-5 h-5" />
                    <h2>Transactions</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <StatCard
                        icon={ <TrendingUp className="w-5 h-5" /> }
                        label="EVM Tx Share"
                        value="5%"
                        subtitle="Polygon (Last Month)"
                        description="Counts only successful transactions."
                    />
                    <StatCard
                        icon={ <Activity className="w-5 h-5" /> }
                        label="Total Transactions"
                        value="~3.8B"
                        subtitle="Aggregated EVM Volume"
                        description="Combined monthly volume across all chains."
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SmartChartCard
                        title="Transactions Volume"
                        subtitle="Absolute Number of Transactions"
                        chartType="area"
                        data={ txAbsData }
                        series={ activeChains.map( c => c.name ) }
                        colors={ activeChains.map( c => c.color ) }
                        height={ 350 }
                    />
                    <SmartChartCard
                        title="Transactions Share (%)"
                        subtitle="Market Share by Chain"
                        chartType="area"
                        data={ txPctData }
                        series={ activeChains.map( c => c.name ) }
                        colors={ activeChains.map( c => c.color ) }
                        height={ 350 }
                    />
                </div>
            </section>

            {/* Wallets Section */ }
            <section className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-teal-400 border-b border-white/10 pb-2">
                    <Users className="w-5 h-5" />
                    <h2>Active Wallets</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <StatCard
                        icon={ <Users className="w-5 h-5" /> }
                        label="EVM Wallet Share"
                        value="6%"
                        subtitle="Polygon (Last Month)"
                        description="Wallets initiating successful transactions."
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SmartChartCard
                        title="Active Wallets"
                        subtitle="Monthly Active Users"
                        chartType="area"
                        data={ walletAbsData }
                        series={ activeChains.map( c => c.name ) }
                        colors={ activeChains.map( c => c.color ) }
                        height={ 350 }
                    />
                    <SmartChartCard
                        title="Wallet Share (%)"
                        subtitle="User Distribution"
                        chartType="area"
                        data={ walletPctData }
                        series={ activeChains.map( c => c.name ) }
                        colors={ activeChains.map( c => c.color ) }
                        height={ 350 }
                    />
                </div>
            </section>

            {/* Stablecoins Section */ }
            <section className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-emerald-400 border-b border-white/10 pb-2">
                    <Coins className="w-5 h-5" />
                    <h2>Stablecoin Volumes</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <StatCard
                        icon={ <Coins className="w-5 h-5" /> }
                        label="Stablecoin Share"
                        value="0.8%"
                        subtitle="Polygon Volume Share"
                        description="Excludes mints and self-transfers."
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SmartChartCard
                        title="Stablecoin Volume"
                        subtitle="Transfer Volume ($)"
                        chartType="area"
                        data={ stablecoinAbsData }
                        series={ STABLECOIN_CHAINS.map( c => c.name ) }
                        colors={ STABLECOIN_CHAINS.map( c => c.color ) }
                        height={ 350 }
                    />
                    <SmartChartCard
                        title="Volume Share (%)"
                        subtitle="Stablecoin Dominance"
                        chartType="area"
                        data={ stablecoinPctData }
                        series={ STABLECOIN_CHAINS.map( c => c.name ) }
                        colors={ STABLECOIN_CHAINS.map( c => c.color ) }
                        height={ 350 }
                    />
                </div>
            </section>

            {/* NFT Section */ }
            <section className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-pink-400 border-b border-white/10 pb-2">
                    <Sparkles className="w-5 h-5" />
                    <h2>NFT Activity</h2>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <div className="p-4 bg-pink-500/5 border border-pink-500/20 rounded-lg text-pink-200 text-sm">
                        Transactions counted here involve NFT transfers only (ERC721/ERC1155).
                        Transfers counts the total number of NFTs moved (some txs move multiple NFTs).
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SmartChartCard
                        title="NFT Transactions"
                        subtitle="Distinct Hash Count"
                        chartType="area"
                        data={ nftTxAbsData }
                        series={ NFT_CHAINS.map( c => c.name ) }
                        colors={ NFT_CHAINS.map( c => c.color ) }
                        height={ 350 }
                    />
                    <SmartChartCard
                        title="NFT Tx Share (%)"
                        subtitle="Transaction Dominance"
                        chartType="area"
                        data={ nftTxPctData }
                        series={ NFT_CHAINS.map( c => c.name ) }
                        colors={ NFT_CHAINS.map( c => c.color ) }
                        height={ 350 }
                    />
                    <SmartChartCard
                        title="NFT Transfers"
                        subtitle="Total Items Transferred"
                        chartType="area"
                        data={ nftTransferAbsData }
                        series={ NFT_CHAINS.map( c => c.name ) }
                        colors={ NFT_CHAINS.map( c => c.color ) }
                        height={ 350 }
                    />
                    <SmartChartCard
                        title="Transfer Share (%)"
                        subtitle="Item Volume Dominance"
                        chartType="area"
                        data={ nftTransferPctData }
                        series={ NFT_CHAINS.map( c => c.name ) }
                        colors={ NFT_CHAINS.map( c => c.color ) }
                        height={ 350 }
                    />
                </div>
            </section>

        </div>
    );
}

