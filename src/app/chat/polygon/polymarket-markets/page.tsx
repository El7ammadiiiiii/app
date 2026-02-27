'use client';

import React, { useMemo } from 'react';
import SmartChartCard from '@/components/SmartChartCard';
import { BarChart3, RefreshCw, Zap, TrendingUp, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePolymarket } from '@/hooks/use-crawler-data';

// Helper for deterministic random
function seededRandom( seed: number ) {
    let s = seed;
    return () => {
        s = ( s * 9301 + 49297 ) % 233280;
        return s / 233280;
    };
}

// ----------------------------------------------------------------------
// DATA GENERATORS
// ----------------------------------------------------------------------

function generateMonthlyDates( count: number ): string[] {
    const dates: string[] = [];
    const start = new Date( "2020-09-01" );
    for ( let i = 0; i < count; i++ ) {
        const d = new Date( start );
        d.setMonth( d.getMonth() + i );
        dates.push( d.toLocaleDateString( "en-US", { month: "short", year: "numeric" } ) );
    }
    return dates;
}

function generateDailyDates( count: number ): string[] {
    const dates: string[] = [];
    const start = new Date( "2024-11-03" );
    for ( let i = 0; i < count; i++ ) {
        const d = new Date( start );
        d.setDate( d.getDate() + i );
        dates.push( d.toLocaleDateString( "en-US", { month: "short", day: "numeric" } ) );
    }
    return dates;
}

export default function PolymarketMarketsDataPage() {
    const { data: pmData, loading, refresh } = usePolymarket();

    // ─────────────────────────────────────────────────────────────
    // Chart 1: Volume USD per month (Events)
    const monthlyDates = useMemo( () => generateMonthlyDates( 52 ), [] );
    const volumeMonthlyEventsData = useMemo( () => {
        if ( pmData?.volume_history?.length ) {
            return pmData.volume_history.map( ( v: any ) => ( { date: v.date ?? v.month, Volume: v.volume ?? v.value } ) );
        }
        const rng = seededRandom( 1001 );
        return monthlyDates.filter( ( _, i ) => i % 3 === 0 ).map( ( label, i ) => {
            const base = rng() * 2000000 + 500000;
            const spike = i > 13 && i < 18 ? base * 3 : base;
            return { date: label, Volume: Math.round( spike ) };
        } );
    }, [ monthlyDates, pmData ] );

    // Chart 2: Volume USD per day (3m)
    const dailyDates = useMemo( () => generateDailyDates( 90 ), [] );
    const volumeDailyEventsData = useMemo( () => {
        if ( pmData?.volume_history?.length ) {
            return pmData.volume_history.slice( -90 ).map( ( v: any ) => ( { date: v.date, Volume: v.volume ?? v.value } ) );
        }
        const rng = seededRandom( 2002 );
        return dailyDates.filter( ( _, i ) => i % 2 === 0 ).map( ( label ) => ( {
            date: label,
            Volume: Math.round( rng() * 200000 + 100000 )
        } ) );
    }, [ dailyDates, pmData ] );

    // Data 3: Top Events Table (Converted for Chart/Table usage)
    const topEventsData = useMemo( () => {
        if ( pmData?.markets?.length ) {
            return pmData.markets.slice( 0, 10 ).map( ( m: any ) => ( { title: m.title ?? m.question ?? m.name, volume: m.volume ?? m.totalVolume ?? 0 } ) );
        }
        return [
            { title: "Bitcoin Up/Down - Feb 1", volume: 470265 },
            { title: "Ethereum Up/Down - Feb 1", volume: 36821 },
            { title: "Open Sud: Bertrand vs Droguet", volume: 14230 },
            { title: "Solana Up/Down - Feb 1", volume: 12543 },
            { title: "Open Sud: Blancaneaux vs Grenier", volume: 8765 },
            { title: "Open Sud: Carballes vs Vavassori", volume: 7432 },
        ];
    }, [ pmData ] );

    // Chart 4: Top 10 Daily Users (Stacked Area)
    const usersEventsSeries = [ "User1", "User2", "User3", "User4", "User5", "User6", "User7", "User8" ];
    const usersEventsData = useMemo( () => {
        if ( pmData?.resolution_history?.length ) {
            return pmData.resolution_history.map( ( r: any ) => ( { date: r.date, ...r } ) );
        }
        const rng = seededRandom( 3003 );
        const dates = [ "Feb 1st", "Feb 2nd", "Feb 3rd", "Feb 4th", "Feb 5th" ];
        return dates.map( ( d ) => {
            const row: any = { date: d };
            usersEventsSeries.forEach( ( s ) => {
                row[ s ] = Math.round( rng() * 400 + 200 );
            } );
            return row;
        } );
    }, [ pmData ] );

    // Chart 5: Volume USD per month - Markets (Stacked Area)
    const marketsMonthSeries = [ "Bitcoin", "Ethereum", "Solana", "XRP", "Sports", "Politics", "Other" ];
    const volumeMonthlyMarketsData = useMemo( () => {
        if ( pmData?.categories?.length ) {
            return pmData.categories.map( ( c: any ) => ( { date: c.date ?? c.category, ...c } ) );
        }
        const rng = seededRandom( 4004 );
        return monthlyDates.filter( ( _, i ) => i % 3 === 0 ).map( ( date, j ) => {
            const row: any = { date };
            marketsMonthSeries.forEach( ( s ) => {
                const base = rng() * 300000 + 100000;
                row[ s ] = Math.round( j > 13 && j < 18 ? base * 2 : base );
            } );
            return row;
        } );
    }, [ monthlyDates, pmData ] );

    // Chart 6: Volume USD per day - Markets
    const volumeDailyMarketsData = useMemo( () => {
        if ( pmData?.liquidity_history?.length ) {
            return pmData.liquidity_history.map( ( l: any ) => ( { date: l.date, Volume: l.liquidity ?? l.volume ?? l.value } ) );
        }
        const rng = seededRandom( 5005 );
        return dailyDates.filter( ( _, i ) => i % 2 === 0 ).map( ( label ) => ( {
            date: label,
            Volume: Math.round( rng() * 250000 + 150000 )
        } ) );
    }, [ dailyDates, pmData ] );

    // Data 7: Markets Leaderboard
    const marketsLeaderboardData = useMemo( () => {
        if ( pmData?.markets?.length ) {
            return pmData.markets.slice( 0, 10 ).map( ( m: any ) => ( { market: m.title ?? m.question ?? m.name, volume: m.volume ?? m.totalVolume ?? 0 } ) );
        }
        return [
            { market: "BTC Up/Down - Feb 1", volume: 172345 },
            { market: "BTC Up/Down - Feb 2", volume: 83621 },
            { market: "ETH Up/Down - Feb 1", volume: 36127 },
            { market: "ETH Up/Down - Feb 2", volume: 23894 },
            { market: "SOL Up/Down - Feb 1", volume: 14782 },
            { market: "XRP Up/Down - Feb 1", volume: 9453 },
            { market: "SOL Up/Down - Feb 2", volume: 7891 },
        ];
    }, [ pmData ] );

    // Chart 8: Top 10 Daily Users - Markets
    const usersMarketsSeries = [ "Bitcoin", "Ethereum", "Solana", "XRP", "Sports", "Politics", "Other" ];
    const usersMarketsData = useMemo( () => {
        if ( pmData?.categories?.length ) {
            return pmData.categories.map( ( c: any ) => ( { date: c.date ?? c.category, ...c } ) );
        }
        const rng = seededRandom( 6006 );
        const dates = [ "Feb 1st", "Feb 2nd", "Feb 3rd", "Feb 4th" ];
        return dates.map( ( d ) => {
            const row: any = { date: d };
            usersMarketsSeries.forEach( ( s ) => {
                row[ s ] = Math.round( rng() * 400 + 100 );
            } );
            return row;
        } );
    }, [ pmData ] );

    // Data 9: Markets Users Leaderboard
    const marketUsersLeaderboard = useMemo( () => {
        if ( pmData?.markets?.length ) {
            return pmData.markets.slice( 0, 10 ).map( ( m: any ) => ( { market: m.title ?? m.question ?? m.name, users: m.users ?? m.uniqueTraders ?? 0 } ) );
        }
        return [
            { market: "BTC Up/Down (Bear)", users: 1307 },
            { market: "BTC Up/Down (Bull)", users: 1284 },
            { market: "ETH Up/Down (Bull)", users: 544 },
            { market: "ETH Up/Down (Bear)", users: 538 },
            { market: "SOL Up/Down (Bear)", users: 301 },
            { market: "SOL Up/Down (Bull)", users: 300 },
        ];
    }, [ pmData ] );


    return (
        <div className="space-y-8 min-h-screen text-slate-100 p-6 lg:px-12">
            
            {/* Header */ }
            <div className="flex flex-col gap-3 sm:gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex flex-col gap-2">
                        <motion.h1 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-cyan-400"
                        >
                            📊 Polymarket Markets Data
                        </motion.h1>
                        <p className="text-white/60 text-sm">
                            Prediction Markets Analytics - Events, Volume, Users &amp; Markets Insights
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

            {/* ── Events Section ─────────────────────────── */ }
            <section className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-purple-400 border-b border-white/10 pb-2">
                    <Zap className="w-5 h-5" />
                    <h2>Events Analytics</h2>
                </div>

                {/* Top Statistics / Trend */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SmartChartCard
                        title="Volume (Monthly Trend)"
                        subtitle="USD Volume per month"
                        chartType="bar"
                        data={ volumeMonthlyEventsData }
                        series={ ['Volume'] }
                        height={ 400 }
                    />
                    <SmartChartCard
                        title="Top Events by Volume"
                        subtitle="Leaderboard"
                        chartType="bar"
                        data={ topEventsData } // Auto-detects keys: title, volume
                        series={ ['volume'] }
                        height={ 400 }
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SmartChartCard
                        title="Volume (Daily Trend - 3m)"
                        subtitle="USD Volume per day"
                        chartType="area" // Area for variety
                        data={ volumeDailyEventsData }
                        series={ ['Volume'] }
                        height={ 400 }
                    />
                     <SmartChartCard
                        title="User Activity Breakdown"
                        subtitle="Top Users contribution"
                        chartType="area" // Stacked
                        data={ usersEventsData }
                        series={ usersEventsSeries }
                        height={ 400 }
                    />
                </div>
            </section>

            {/* ── Markets Section ────────────────────────── */ }
            <section className="space-y-6">
                 <div className="flex items-center gap-2 text-xl font-semibold text-teal-400 border-b border-white/10 pb-2">
                    <BarChart3 className="w-5 h-5" />
                    <h2>Markets & Answers</h2>
                </div>

                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SmartChartCard
                        title="Market Volume (Monthly)"
                        subtitle="Distribution by category"
                        chartType="area" // Stacked
                        data={ volumeMonthlyMarketsData }
                        series={ marketsMonthSeries }
                        height={ 400 }
                    />
                    <SmartChartCard
                        title="Top Markets (Volume)"
                        subtitle="Highest volume markets"
                        chartType="bar" // Horizontal implicitly handled if category axis swapped? SmartChartCard vertical default, but works.
                        data={ marketsLeaderboardData }
                        series={ ['volume'] } // key is lowercase 'volume'
                        height={ 400 }
                    />
                </div>

                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SmartChartCard
                        title="Market Volume (Daily)"
                        subtitle="Aggregate daily volume"
                        chartType="bar"
                        data={ volumeDailyMarketsData }
                        series={ ['Volume'] }
                        height={ 400 }
                    />
                    <SmartChartCard
                        title="Top Markets (Users)"
                        subtitle="Most active markets"
                        chartType="bar"
                        data={ marketUsersLeaderboard }
                        series={ ['users'] }
                        height={ 400 }
                    />
                </div>

                <div className="grid grid-cols-1 gap-6">
                    <SmartChartCard
                        title="User Distribution by Category"
                        subtitle="Daily active users segmented by market type"
                        chartType="area" // Stacked
                        data={ usersMarketsData }
                        series={ usersMarketsSeries }
                        height={ 400 }
                    />
                </div>

            </section>
        </div>
    );
}


