'use client';

import React, { useMemo } from 'react';
import SmartChartCard from '@/components/SmartChartCard';
import { Activity, BarChart2, Code, RefreshCw, TrendingUp, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEVMComparison } from '@/hooks/use-crawler-data';

// Helpers
import { generateDateSeries } from '@/lib/chart-utils';

function seededRng( seed: number ) {
    let s = seed;
    return (): number => {
        s = ( s * 16807 + 0 ) % 2147483647;
        return ( s - 1 ) / 2147483646;
    };
}

// Data Builders adapted for SmartChartCard (returning plain objects)
function buildMultiLineData(
    dates: Date[],
    chains: string[],
    seed: number,
    baseMin: number,
    baseMax: number,
    includeAll?: { min: number; max: number },
) {
    const rng = seededRng( seed );
    const keys = includeAll ? [ "All", ...chains ] : chains;
    const chainBase: Record<string, number> = {};

    for ( const k of keys ) {
        const isAll = k === "All" && includeAll;
        const lo = isAll ? includeAll!.min : baseMin;
        const hi = isAll ? includeAll!.max : baseMax;
        chainBase[ k ] = lo + rng() * ( hi - lo );
    }

    // Return data array with date string
    const data = dates.map( ( d ) => {
        const row: any = { date: d.toISOString().split('T')[0] };
        for ( const k of keys ) {
            const drift = 1 + ( rng() - 0.48 ) * 0.12;
            chainBase[ k ] = chainBase[ k ] * drift;
            row[ k ] = Math.round( chainBase[ k ] );
        }
        return row;
    } );

    return { data, series: keys };
}

function buildStackedData(
    dates: Date[],
    chains: string[],
    seed: number,
    baseMin: number,
    baseMax: number,
) {
    const rng = seededRng( seed );
    const chainBase: Record<string, number> = {};
    for ( const c of chains ) chainBase[ c ] = baseMin + rng() * ( baseMax - baseMin );

    const data = dates.map( ( d ) => {
        const row: any = { date: d.toISOString().split('T')[0] };
        for ( const c of chains ) {
            const drift = 1 + ( rng() - 0.48 ) * 0.15;
            chainBase[ c ] = chainBase[ c ] * drift;
            row[ c ] = Math.round( chainBase[ c ] );
        }
        return row;
    } );

    return { data, series: chains };
}

export default function ChainUsageComparisonPage() {
    const { data: compData, loading, refresh } = useEVMComparison();

    const dates = useMemo( () => generateDateSeries( 12, "2024-10-05", "weekly" ), [] );

    /* ---- 1. Active Wallets ---- */
    const activeWallets = useMemo( () => {
        if ( compData?.wallet_history ) {
            const series = Object.keys( compData.wallet_history[0] ?? {} ).filter( k => k !== 'date' );
            return { data: compData.wallet_history, series };
        }
        const chains = [ "Binance", "Polygon", "Ethereum", "Avalanche_c", "Arbitrum", "Base", "Optimism", "Celo", "Fantom", "Gnosis", "Scroll", "Zora" ];
        return buildMultiLineData( dates, chains, 42, 1_000_000, 4_000_000, { min: 8_000_000, max: 13_000_000 } );
    }, [ dates, compData ] );

    /* ---- 2. Transactions ---- */
    const transactions = useMemo( () => {
        if ( compData?.tx_history ) {
            const series = Object.keys( compData.tx_history[0] ?? {} ).filter( k => k !== 'date' );
            return { data: compData.tx_history, series };
        }
        const chains = [ "Binance", "Celo", "Polygon", "Ethereum", "Zora", "Zksync", "Optimism", "opbnb", "sei", "Arbitrum", "Base", "Gnosis", "Scroll", "Avalanche_c", "Fantom" ];
        return buildMultiLineData( dates, chains, 137, 10_000_000, 40_000_000, { min: 80_000_000, max: 130_000_000 } );
    }, [ dates, compData ] );

    /* ---- 3. Contract Deployers ---- */
    const contractDeployers = useMemo( () => {
        if ( compData?.chains ) {
            const deployers = compData.chains.map( ( c: any ) => ( { name: c.name, value: c.contract_deployers ?? 0 } ) );
            return { data: deployers, series: deployers.map( ( d: any ) => d.name ) };
        }
        const chains = [ "Binance", "Gnosis", "Zksync", "Scroll", "Zora", "Optimism", "Fantom", "Ethereum", "Avalanche_c", "Arbitrum", "Polygon", "Celo", "sophon", "Base", "lens", "superseed", "ink" ];
        return buildMultiLineData( dates, chains, 256, 5_000, 30_000 );
    }, [ dates, compData ] );

    /* ---- 4. Contracts Deployed ---- */
    const contractsDeployed = useMemo( () => {
        if ( compData?.chains ) {
            const deployed = compData.chains.map( ( c: any ) => ( { name: c.name, value: c.contracts_deployed ?? 0 } ) );
            return { data: deployed, series: deployed.map( ( d: any ) => d.name ) };
        }
        const chains = [ "Gnosis", "Base", "Avalanche_c", "Scroll", "Fantom", "Celo", "Binance", "Polygon", "Ethereum", "Zora", "Zksync", "Optimism", "sophon", "lens", "superseed", "ink" ];
        return buildStackedData( dates, chains, 999, 20_000, 60_000 );
    }, [ dates, compData ] );

    /* ---- 5. NFT Transactions ---- */
    const nftTransactions = useMemo( () => {
        if ( compData?.gas_comparison ) {
            const series = Object.keys( compData.gas_comparison[0] ?? {} ).filter( k => k !== 'date' );
            return { data: compData.gas_comparison, series };
        }
        const nftDates = generateDateSeries( 3, "2024-10-01", "monthly" );
        const chains = [ "Zora", "Zksync", "Polygon", "Optimism", "Gnosis", "Fantom", "Ethereum", "Celo", "Binance", "Base", "Avalanche_c", "worldchain", "sei", "Scroll", "ronin", "mantle", "linea" ];
        return buildStackedData( nftDates, chains, 777, 1_000_000, 5_000_000 );
    }, [ compData ] );

    /* ---- 6. Cumulative Donut ---- */
    const cumulativeDonut = useMemo( () => {
        if ( compData?.tvl_comparison ) {
            return compData.tvl_comparison;
        }
        return [
            { name: "BNB", value: 23.3 },
            { name: "Base", value: 17.1 },
            { name: "Somnia", value: 11.7 },
            { name: "Polygon", value: 8.7 },
            { name: "opBNB", value: 7.2 },
            { name: "Arbitrum", value: 6.8 },
            { name: "Sei", value: 5.9 },
            { name: "Avalanche C", value: 4.3 },
            { name: "Worldchain", value: 3.7 },
            { name: "Optimism", value: 3.2 },
            { name: "Ethereum", value: 2.8 },
            { name: "Others", value: 5.3 },
        ];
    }, [ compData ] );


    return (
        <div className="space-y-8 min-h-screen text-slate-100 p-6 lg:px-12">
            
            {/* Header */ }
            <div className="flex flex-col gap-3 sm:gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex flex-col gap-2">
                        <motion.h1 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-violet-300"
                        >
                             📊 Chain Usage Comparison
                        </motion.h1>
                        <p className="text-white/60 text-sm">
                             Usage Activity across Chains - EVM chains only
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

            {/* Active Wallets */ }
             <section className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-teal-400 border-b border-white/10 pb-2">
                    <Users className="w-5 h-5" />
                    <h2>Active Wallets</h2>
                </div>
                <SmartChartCard
                    title="Active Wallets"
                    subtitle="Usage Activity across Chains (EVM only)"
                    chartType="line"
                    data={ activeWallets.data }
                    series={ activeWallets.series }
                    height={ 450 }
                />
            </section>

             {/* Transactions */ }
             <section className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-purple-400 border-b border-white/10 pb-2">
                    <Activity className="w-5 h-5" />
                    <h2>Transactions</h2>
                </div>
                <SmartChartCard
                    title="Transactions"
                    subtitle="Transaction Volume across Chains"
                    chartType="line"
                    data={ transactions.data }
                    series={ transactions.series }
                    height={ 450 }
                />
            </section>

            {/* Builders */ }
             <section className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-emerald-400 border-b border-white/10 pb-2">
                    <Code className="w-5 h-5" />
                    <h2>Builders Activity</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                     <SmartChartCard
                        title="Contract Deployers"
                        subtitle="Developers deploying contracts"
                        chartType="line"
                        data={ contractDeployers.data }
                        series={ contractDeployers.series }
                        height={ 400 }
                    />
                     <SmartChartCard
                        title="Contracts Deployed"
                        subtitle="Total Deployed Contracts"
                        chartType="area"
                        data={ contractsDeployed.data }
                        series={ contractsDeployed.series }
                        height={ 400 }
                    />
                </div>
            </section>

             {/* Key Functionalities */ }
             <section className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-pink-400 border-b border-white/10 pb-2">
                    <TrendingUp className="w-5 h-5" />
                    <h2>Key Ecosystems</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                     <SmartChartCard
                        title="NFT Transactions"
                        subtitle="NFT Usage"
                        chartType="area"
                        data={ nftTransactions.data }
                        series={ nftTransactions.series }
                        height={ 400 }
                    />
                     <SmartChartCard
                        title="DeFi Transactions"
                        subtitle="Status"
                        chartType="bar"
                        data={ [] } // Simulating no data
                        height={ 400 }
                    />
                </div>

                 <SmartChartCard
                    title="Cumulative Activity Distribution"
                    subtitle="Transaction share by chain"
                    chartType="pie"
                    data={ cumulativeDonut }
                    height={ 450 }
                />
            </section>

        </div>
    );
}


