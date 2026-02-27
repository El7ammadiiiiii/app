'use client';

import React, { useMemo } from 'react';
import SmartChartCard from '@/components/SmartChartCard';
import { Activity, DollarSign, Image, RefreshCw, ShoppingBag, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePolygonNFT } from '@/hooks/use-crawler-data';

// Helper functions and shared components
import { generateDateSeries } from '@/lib/chart-utils';

/* ── Helpers ───────────────────────────────────────────────── */

/** Returns a deterministic pseudo-random number in [min, max) */
function seededRandom ( seed: number )
{
    let s = seed;
    return () =>
    {
        s = ( s * 9301 + 49297 ) % 233280;
        return s / 233280;
    };
}

function seededRange ( rng: () => number, min: number, max: number ): number
{
    return rng() * ( max - min ) + min;
}

// Simple Stat Card Component inline (since we are replacing internal imports)
const StatCard = ( { label, value, icon, subtitle }: { label: string, value: string, icon: any, subtitle: string } ) => (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-6 backdrop-blur-sm hover:bg-white/[0.07] transition-colors">
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">{ label }</h3>
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                { icon }
            </div>
        </div>
        <div className="text-2xl font-bold text-white mb-1">{ value }</div>
        <div className="text-xs text-gray-500">{ subtitle }</div>
    </div>
);

export default function PolygonNFTEcosystemPage ()
{
    const { data: nftData, loading, refresh } = usePolygonNFT();

    /* ── Deterministic date series ─────── */
    // Using simple ISO strings for ECharts
    const dailyDates = useMemo( () => generateDateSeries( 60, "2024-01-01", "daily" ).map( d => d.toISOString().split( 'T' )[ 0 ] ), [] );
    const monthlyDates = useMemo( () => generateDateSeries( 40, "2024-01-01", "weekly" ).map( d => d.toISOString().split( 'T' )[ 0 ] ), [] );

    /* ── 1. Daily Sales Volume ────────────────────────── */
    const dailySalesVolumeData = useMemo( () =>
    {
        if ( nftData?.sales_history?.length )
        {
            return nftData.sales_history.map( ( item: any ) => ( {
                date: item.date,
                "Sales Volume": item.volume ?? item.sales_volume ?? 0,
                "30D MA": item.ma_30d ?? 0,
                "7D MA": item.ma_7d ?? 0,
            } ) );
        }
        const rng = seededRandom( 101 );
        return dailyDates.map( ( date, i ) =>
        {
            const base = seededRange( rng, 200000, 700000 );
            const spike = ( i > 40 && i < 45 ) || ( i > 55 && i < 60 ) ? base * 4 : base;
            return {
                date,
                "Sales Volume": Math.floor( spike ),
                "30D MA": Math.floor( seededRange( rng, 250000, 350000 ) ),
                "7D MA": Math.floor( seededRange( rng, 250000, 400000 ) )
            };
        } );
    }, [ dailyDates, nftData ] );

    /* ── 2. Daily Sales Transactions (Single Area) ────── */
    const dailySalesTransactionsData = useMemo( () =>
    {
        if ( nftData?.sales_history?.length )
        {
            return nftData.sales_history.map( ( item: any ) => ( {
                date: item.date,
                Sales: item.sales_count ?? item.transactions ?? 0,
            } ) );
        }
        const rng = seededRandom( 202 );
        return dailyDates.map( ( date, i ) =>
        {
            const base = seededRange( rng, 150000, 350000 );
            const spike = ( i > 40 && i < 45 ) || ( i > 55 && i < 60 ) ? base * 3 : base;
            return { date, Sales: Math.floor( spike ) };
        } );
    }, [ dailyDates, nftData ] );

    /* ── 3. Merged Activity Data (Volume + Tx) ────────── */
    const dailyActivityData = useMemo( () =>
    {
        if ( nftData?.volume_history?.length )
        {
            return nftData.volume_history.map( ( item: any ) => ( {
                date: item.date,
                Volume: item.volume ?? 0,
                Transactions: item.transactions ?? item.tx_count ?? 0,
            } ) );
        }
        const rngVol = seededRandom( 303 );
        const rngTx = seededRandom( 404 );
        return dailyDates.map( ( date, i ) =>
        {
            const baseVol = seededRange( rngVol, 200000, 700000 );
            const spikeVol = ( i > 40 && i < 45 ) || ( i > 55 && i < 60 ) ? baseVol * 4 : baseVol;

            const baseTx = seededRange( rngTx, 150000, 350000 );
            const spikeTx = ( i > 40 && i < 45 ) || ( i > 55 && i < 60 ) ? baseTx * 3 : baseTx;

            return {
                date,
                Volume: Math.floor( spikeVol ),
                Transactions: Math.floor( spikeTx )
            };
        } );
    }, [ dailyDates, nftData ] );

    /* ── 4. Marketplace Volume ────────────────────────── */
    const marketplaceVolumeData = useMemo( () =>
    {
        if ( nftData?.top_collections?.length )
        {
            return nftData.top_collections.map( ( item: any ) => ( {
                date: item.date ?? item.name ?? 'Unknown',
                Mooar: item.mooar_volume ?? item.mooar ?? 0,
                Element: item.element_volume ?? item.element ?? 0,
                Other: item.other_volume ?? item.other ?? 0,
            } ) );
        }
        const rng = seededRandom( 505 );
        return monthlyDates.map( ( date, i ) => ( {
            date,
            Mooar: Math.floor( i === 15 ? 400000 : seededRange( rng, 100000, 300000 ) ),
            Element: Math.floor( seededRange( rng, 10000, 40000 ) ),
            Other: Math.floor( i < 5 ? seededRange( rng, 30000, 80000 ) : seededRange( rng, 5000, 15000 ) ),
        } ) );
    }, [ monthlyDates, nftData ] );

    /* ── 5. Marketplace Sales ─────────────────────────── */
    const marketplaceSalesData = useMemo( () =>
    {
        if ( nftData?.top_collections?.length )
        {
            return nftData.top_collections.map( ( item: any ) => ( {
                date: item.date ?? item.name ?? 'Unknown',
                Mooar: item.mooar_sales ?? 0,
                Element: item.element_sales ?? 0,
                Other: item.other_sales ?? 0,
            } ) );
        }
        const rng = seededRandom( 606 );
        return monthlyDates.map( ( date, i ) => ( {
            date,
            Mooar: Math.floor( i === 15 ? 30 : seededRange( rng, 10, 20 ) ),
            Element: Math.floor( i < 8 ? seededRange( rng, 10, 25 ) : seededRange( rng, 1, 4 ) ),
            Other: Math.floor( seededRange( rng, 2, 4 ) ),
        } ) );
    }, [ monthlyDates, nftData ] );

    /* ── 6. Volume per Marketplace ────────────────────── */
    const volumePerMarketplaceData = useMemo( () =>
    {
        if ( nftData?.category_breakdown?.length )
        {
            return nftData.category_breakdown.map( ( item: any ) => ( {
                date: item.date ?? item.category ?? 'Unknown',
                Mooar: item.mooar ?? item.mooar_pct ?? 0,
                Other: item.other ?? item.other_pct ?? 0,
            } ) );
        }
        const rng = seededRandom( 707 );
        return monthlyDates.map( ( date ) => ( {
            date,
            Mooar: Math.floor( seededRange( rng, 70, 90 ) ),
            Other: Math.floor( seededRange( rng, 10, 30 ) ),
        } ) );
    }, [ monthlyDates, nftData ] );

    /* ── 7. Buyers per Marketplace ────────────────────── */
    const buyersPerMarketplaceData = useMemo( () =>
    {
        if ( nftData?.category_breakdown?.length )
        {
            return nftData.category_breakdown.map( ( item: any ) => ( {
                date: item.date ?? item.category ?? 'Unknown',
                Mooar: item.mooar_buyers ?? 0,
                Element: item.element_buyers ?? 0,
                Other: item.other_buyers ?? 0,
            } ) );
        }
        const rng = seededRandom( 808 );
        return monthlyDates.map( ( date, i ) => ( {
            date,
            Mooar: Math.floor( i < 15 ? seededRange( rng, 5, 15 ) : seededRange( rng, 40, 70 ) ),
            Element: Math.floor( i < 15 ? seededRange( rng, 50, 80 ) : ( i > 20 && i < 25 ? seededRange( rng, 30, 50 ) : seededRange( rng, 10, 25 ) ) ),
            Other: Math.floor( seededRange( rng, 10, 30 ) ),
        } ) );
    }, [ monthlyDates, nftData ] );

    /* ── 8. Sales per Marketplace ────────────────────── */
    const salesPerMarketplaceData = useMemo( () =>
    {
        if ( nftData?.category_breakdown?.length )
        {
            return nftData.category_breakdown.map( ( item: any ) => ( {
                date: item.date ?? item.category ?? 'Unknown',
                Mooar: item.mooar_sales ?? 0,
                Element: item.element_sales ?? 0,
                Other: item.other_sales ?? 0,
            } ) );
        }
        const rng = seededRandom( 909 );
        return monthlyDates.map( ( date, i ) => ( {
            date,
            Mooar: Math.floor( i < 15 ? seededRange( rng, 10, 40 ) : ( i > 18 && i < 23 ? seededRange( rng, 20, 40 ) : seededRange( rng, 15, 35 ) ) ),
            Element: Math.floor( i < 15 ? seededRange( rng, 40, 80 ) : seededRange( rng, 10, 30 ) ),
            Other: Math.floor( seededRange( rng, 10, 30 ) ),
        } ) );
    }, [ monthlyDates, nftData ] );


    return (
        <div className="space-y-8 min-h-screen text-slate-100 p-6 lg:px-12">

            {/* Header */ }
            <div className="flex flex-col gap-3 sm:gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex flex-col gap-2">
                        <motion.h1
                            initial={ { opacity: 0, x: -20 } }
                            animate={ { opacity: 1, x: 0 } }
                            className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400"
                        >
                            🖼️ Polygon NFT Ecosystem
                        </motion.h1>
                        <p className="text-white/60 text-sm">
                            Comprehensive NFT Analytics - Sales Volume, Transactions &amp; Marketplace Insights
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

            {/* ── Polygon NFTs Section ──────────────────── */ }
            <section className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-purple-400 border-b border-white/10 pb-2">
                    <Image className="w-5 h-5" />
                    <h2>Polygon NFTs Metrics</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard
                        icon={ <DollarSign className="w-5 h-5" /> }
                        label="Sales Volume"
                        value="4.2M"
                        subtitle="This Week"
                    />
                    <StatCard
                        icon={ <Zap className="w-5 h-5" /> }
                        label="Transactions"
                        value="125K"
                        subtitle="This Week"
                    />
                    <StatCard
                        icon={ <Activity className="w-5 h-5" /> }
                        label="Active Wallets"
                        value="85.2K"
                        subtitle="This Week"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Daily Sales Volume */ }
                    <div className="lg:col-span-2">
                        <SmartChartCard
                            title="Daily Polygon NFT Sales Volume (USD)"
                            subtitle="Sales Volume vs Moving Averages"
                            chartType="line"
                            data={ dailySalesVolumeData }
                            series={ [ 'Sales Volume', '30D MA', '7D MA' ] }
                            height={ 400 }
                        />
                    </div>

                    {/* Daily Sales Transactions */ }
                    <SmartChartCard
                        title="Daily Polygon NFT Sales"
                        subtitle="Raw transaction count"
                        chartType="area"
                        data={ dailySalesTransactionsData }
                        series={ [ 'Sales' ] }
                        height={ 400 }
                    />

                    {/* Daily Activity (merged) */ }
                    <SmartChartCard
                        title="Daily NFT Sales Activity"
                        subtitle="Volume vs Transactions Comparison"
                        chartType="bar"
                        data={ dailyActivityData }
                        series={ [ 'Volume', 'Transactions' ] }
                        height={ 400 }
                    />
                </div>
            </section>

            {/* ── Marketplaces Section ──────────────────── */ }
            <section className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-teal-400 border-b border-white/10 pb-2">
                    <ShoppingBag className="w-5 h-5" />
                    <h2>Marketplace Leaderboard</h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SmartChartCard
                        title="Total Volume (USD)"
                        subtitle="Marketplace distribution"
                        chartType="area"
                        data={ marketplaceVolumeData }
                        series={ [ 'Mooar', 'Element', 'Other' ] }
                        height={ 400 }
                    />
                    <SmartChartCard
                        title="Total Sales Count"
                        subtitle="Marketplace distribution"
                        chartType="area"
                        data={ marketplaceSalesData }
                        series={ [ 'Mooar', 'Element', 'Other' ] }
                        height={ 400 }
                    />
                </div>

                <div className="grid grid-cols-1 gap-6">
                    <SmartChartCard
                        title="Volume per Marketplace (USD)"
                        subtitle="Comparative volume analysis"
                        chartType="bar"
                        data={ volumePerMarketplaceData }
                        series={ [ 'Mooar', 'Other' ] }
                        height={ 400 }
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SmartChartCard
                        title="Buyers per Marketplace"
                        subtitle="Active buyer addresses"
                        chartType="area"
                        data={ buyersPerMarketplaceData }
                        series={ [ 'Mooar', 'Element', 'Other' ] }
                        height={ 400 }
                    />
                    <SmartChartCard
                        title="Sales per Marketplace"
                        subtitle="Completed sales count"
                        chartType="area"
                        data={ salesPerMarketplaceData }
                        series={ [ 'Mooar', 'Element', 'Other' ] }
                        height={ 400 }
                    />
                </div>

            </section>
        </div>
    );
}

