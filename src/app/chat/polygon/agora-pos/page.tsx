'use client';

import React, { useMemo } from 'react';
import SmartChartCard from '@/components/SmartChartCard';
import { Activity, BarChart3, Coins, DollarSign, PieChart, RefreshCw, Users, Wallet, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePolygonAnalytics } from '@/hooks/use-crawler-data';

// Helpers
import { generateDateSeries } from '@/lib/chart-utils';

function seededRandom ( seed: number )
{
    let s = seed;
    return () =>
    {
        s = ( s * 9301 + 49297 ) % 233280;
        return s / 233280;
    };
}

// Stat Card (Inline for now)
const StatCard = ( { label, value, icon, subtitle }: any ) => (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-6 backdrop-blur-sm hover:bg-white/[0.07] transition-colors">
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">{ label }</h3>
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">{ icon }</div>
        </div>
        <div className="text-2xl font-bold text-white mb-1">{ value }</div>
        <div className="text-xs text-gray-500">{ subtitle }</div>
    </div>
);

export default function AgoraPOSPage ()
{
    const { data: agoraData, loading, refresh } = usePolygonAnalytics( 'pos_payments' );

    /* ---------- Data Generators ---------- */
    const dailyDates = useMemo(
        () => generateDateSeries( 48, "2025-01-19", "daily" ).filter( ( _, i ) => i % 1 === 0 ).map( d => d.toISOString().split( 'T' )[ 0 ] ),
        [],
    );

    const monthlyDates = useMemo(
        () => generateDateSeries( 9, "2025-05-01", "monthly" ).map( d => d.toISOString().split( 'T' )[ 0 ] ),
        [],
    );

    /* ---------- Chart 1 & 2 Data ---------- */
    const tradingVolumeData = useMemo( () =>
    {
        if ( agoraData?.tradingVolume ) return agoraData.tradingVolume;
        const rng = seededRandom( 101 );
        return dailyDates.map( ( date, i ) =>
        {
            const basePolygon = 2_500_000 + 500_000 * Math.sin( i * 0.25 );
            const spike = i > 20 && i < 30 ? 3 : 1;
            return {
                date,
                polygon: Math.round( ( basePolygon + rng() * 1_000_000 ) * spike ),
                katana: Math.round( 1_000_000 + rng() * 800_000 + 200_000 * Math.cos( i * 0.3 ) ),
            };
        } );
    }, [ dailyDates, agoraData ] );

    const tradeCountData = useMemo( () =>
    {
        if ( agoraData?.tradeCount ) return agoraData.tradeCount;
        const rng = seededRandom( 202 );
        return dailyDates.map( ( date, i ) =>
        {
            const basePolygon = 7_500 + 2_000 * Math.sin( i * 0.2 );
            const spike = i > 20 && i < 30 ? 2 : 1;
            return {
                date,
                polygon: Math.round( ( basePolygon + rng() * 3_000 ) * spike ),
                katana: Math.round( 3_500 + rng() * 2_000 + 500 * Math.cos( i * 0.35 ) ),
            };
        } );
    }, [ dailyDates, agoraData ] );

    /* ---------- Chart 3 Data ---------- */
    const ausdHolderData = useMemo( () =>
    {
        if ( agoraData?.holders ) return agoraData.holders;
        const rng = seededRandom( 303 );
        return monthlyDates.map( ( date, i ) =>
        {
            const existing = 17_000 + i * 2_000 + rng() * 3_000;
            const newH = 7_000 + i * 1_000 + rng() * 2_000;
            const total = 27_000 + i * 3_000 + rng() * 2_500;
            return {
                date,
                existing: Math.round( existing ),
                'New Holders': Math.round( newH ),
                total: Math.round( total ),
            };
        } );
    }, [ monthlyDates, agoraData ] );

    /* ---------- Chart 4 Data ---------- */
    const ausdHoldersByChainData = useMemo( () =>
    {
        if ( agoraData?.holdersByChain ) return agoraData.holdersByChain;
        const rng = seededRandom( 404 );
        return monthlyDates.map( ( date, i ) => ( {
            date,
            polygon: Math.round( 12_000 + i * 2_000 + rng() * 5_000 ),
            katana: Math.round( 4_000 + i * 500 + rng() * 1_500 ),
        } ) );
    }, [ monthlyDates, agoraData ] );

    /* ---------- Chart 5 Data ---------- */
    const ausdSupplyData = useMemo( () =>
    {
        if ( agoraData?.supply ) return agoraData.supply;
        const rng = seededRandom( 505 );
        return monthlyDates.map( ( date, i ) => ( {
            date,
            polygon: Math.round( 16_000_000 + rng() * 4_000_000 + i * 500_000 ),
            katana: Math.round( 18_000_000 + rng() * 6_000_000 + i * 800_000 ),
        } ) );
    }, [ monthlyDates, agoraData ] );

    /* ---------- Protocol TVL Data (Processed) ---------- */
    // Parsing string currency to numbers for chart
    const protocolTVLRaw = [
        { blockchain: "katana", contract: "0x381e...98dc", dapp: "sushiswap", ausdHeld: "$13.73", txCount: 12 },
        { blockchain: "polygon", contract: "0xbd6c...9a9b", dapp: "lifi", ausdHeld: "$12.70", txCount: 1814 },
        { blockchain: "katana", contract: "0x9a9b...f851", dapp: "sushiswap", ausdHeld: "$7.94", txCount: 0 },
        { blockchain: "polygon", contract: "0x0016...1bb", dapp: "curvefi", ausdHeld: "$2.99", txCount: 1 },
        { blockchain: "katana", contract: "0x1d5e...312e", dapp: "sushiswap", ausdHeld: "$1.40", txCount: 0 },
        { blockchain: "polygon", contract: "0x0670...2cc9", dapp: "paraswap_v6", ausdHeld: "$0.83", txCount: 8 },
        { blockchain: "katana", contract: "0x9b35...fe57", dapp: "sushiswap", ausdHeld: "$0.54", txCount: 0 },
        { blockchain: "polygon", contract: "0x4e32...f38", dapp: "odos_v2", ausdHeld: "$0.48", txCount: 895285 },
        { blockchain: "katana", contract: "0xaf0b...5213", dapp: "sushiswap", ausdHeld: "$0.46", txCount: 0 },
        { blockchain: "polygon", contract: "0xdef1...ee57", dapp: "paraswap_v5", ausdHeld: "$0.36", txCount: 3 },
    ];

    const protocolTVLData = protocolTVLRaw.map( r => ( {
        ...r,
        // Create a unique label for chart axis
        label: `${ r.dapp } (${ r.blockchain })`,
        // Parse value
        Value: parseFloat( r.ausdHeld.replace( '$', '' ) ),
        TxCount: r.txCount
    } ) );

    // Common series keys
    const chainSeries = [ 'polygon', 'katana' ];

    return (
        <div className="space-y-8 min-h-screen text-slate-100 p-6 lg:px-12">
            {/* Header */ }
            <div className="flex flex-col gap-3 sm:gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex flex-col gap-2">
                        <motion.h1
                            initial={ { opacity: 0, x: -20 } }
                            animate={ { opacity: 1, x: 0 } }
                            className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400"
                        >
                            💳 Agora POS
                        </motion.h1>
                        <p className="text-white/60 text-sm">
                            AUSD Supply, Trading Volume, Holders &amp; Protocol Analytics
                        </p>
                    </div>
                    <button
                        onClick={ refresh }
                        className="self-start sm:self-auto inline-flex items-center gap-2 text-xs sm:text-sm px-3 py-2 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 transition-colors border border-pink-400/30 text-pink-200"
                    >
                        <RefreshCw className={ `w-4 h-4 ${ loading ? "animate-spin" : "" }` } />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Overview Stats */ }
            <section className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-purple-400 border-b border-white/10 pb-2">
                    <Activity className="w-5 h-5" />
                    <h2>AUSD Overview</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon={ <Coins className="w-5 h-5" /> } label="Current Supply" value="$42.15M" subtitle="AUSD Supply" />
                    <StatCard icon={ <DollarSign className="w-5 h-5" /> } label="TVL in Protocols" value="$12.05M" subtitle="Combined Chains" />
                    <StatCard icon={ <BarChart3 className="w-5 h-5" /> } label="Trading Volume" value="$381.10M" subtitle="Total Volume" />
                    <StatCard icon={ <Zap className="w-5 h-5" /> } label="Trade Count" value="1.03M" subtitle="Total Trades" />
                </div>
            </section>

            {/* Trading Volume & Trade Count */ }
            <section className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-teal-400 border-b border-white/10 pb-2">
                    <BarChart3 className="w-5 h-5" />
                    <h2>Trading Activity</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SmartChartCard
                        title="Trading Volume by Chain"
                        subtitle="AUSD Trading Volume"
                        chartType="area"
                        data={ tradingVolumeData }
                        series={ chainSeries }
                        height={ 400 }
                    />
                    <SmartChartCard
                        title="Trade Count by Chain"
                        subtitle="AUSD Trading Volume"
                        chartType="bar" // Using bar for variety
                        data={ tradeCountData }
                        series={ chainSeries }
                        height={ 400 }
                    />
                </div>
            </section>

            {/* AUSD Holders */ }
            <section className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-emerald-400 border-b border-white/10 pb-2">
                    <Users className="w-5 h-5" />
                    <h2>AUSD Holders</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SmartChartCard
                        title="AUSD Holder Trends"
                        subtitle="New vs Existing"
                        chartType="line"
                        data={ ausdHolderData }
                        series={ [ 'existing', 'New Holders', 'total' ] }
                        height={ 400 }
                    />
                    <SmartChartCard
                        title="AUSD Holders by Chain"
                        subtitle="Chain Distribution"
                        chartType="area"
                        data={ ausdHoldersByChainData }
                        series={ chainSeries }
                        height={ 400 }
                    />
                </div>
            </section>

            {/* AUSD Supply & Protocol */ }
            <section className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-cyan-400 border-b border-white/10 pb-2">
                    <Wallet className="w-5 h-5" />
                    <h2>Supply & Protocols</h2>
                </div>

                {/* Supply Chart (Full Width) */ }
                <SmartChartCard
                    title="AUSD Supply by Chain"
                    subtitle="Total Circulating Supply"
                    chartType="area"
                    data={ ausdSupplyData }
                    series={ chainSeries }
                    height={ 400 }
                />

                {/* Protocol Table/Chart */ }
                <SmartChartCard
                    title="Protocol TVL Distribution"
                    subtitle="Top Protocols by AUSD Held"
                    chartType="bar" // Default to chart
                    // For bar chart, x-axis will be 'label' (unique), Value is 'Value'
                    // For table view, standard table.
                    data={ protocolTVLData }
                    series={ [ 'Value' ] }
                    height={ 500 } // Taller for x-axis labels
                />
            </section>

        </div>
    );
}

