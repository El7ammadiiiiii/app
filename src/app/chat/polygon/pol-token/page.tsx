"use client";

import { useEffect, useMemo, useState } from "react";
import
{
    Activity,
    BarChart3,
    Coins,
    DollarSign,
    LineChart as LineChartIcon,
    Lock,
    RefreshCw,
    TrendingDown,
    TrendingUp,
    Wallet,
    Zap,
    PieChart
} from "lucide-react";

import {
    generateDateSeries,
    formatCompact,
    formatUSD,
} from "@/lib/chart-utils";
import { BackButton, Section, StatCard, Grid2, Grid3, toNumber, fmt, fmtCompact, fmtUSD, fmtPct, seededRandom } from "@/components/polygon/shared";
import SmartChartCard from "@/components/SmartChartCard";
import { usePolToken, useChainData } from '@/hooks/use-crawler-data';

/* ─── data generators (deterministic) ─── */

function buildDailyDates ( count: number, start = "2025-10-01" ): Date[]
{
    return generateDateSeries( count, start, "daily" );
}

function buildMonthlyDates ( count: number, start = "2024-05-01" ): Date[]
{
    return generateDateSeries( count, start, "monthly" );
}

function buildYearlyMonthlyDates ( startYear: number, endYear: number ): Date[]
{
    const dates: Date[] = [];
    const current = new Date( `${ startYear }-01-01` );
    const end = new Date( `${ endYear }-12-31` );
    while ( current <= end )
    {
        dates.push( new Date( current ) );
        current.setMonth( current.getMonth() + 1 );
    }
    return dates;
}

/* ─── main page ─── */

export default function POLTokenDashboardPage ()
{
    const { data: polData, loading: polLoading, refresh: refreshPol } = usePolToken();
    const { data: chainData, loading: chainLoading, refresh: refreshChain } = useChainData('polygon');
    const loading = polLoading || chainLoading;
    const refresh = async () => { await Promise.all([refreshPol(), refreshChain()]); };

    const [ lastRefresh, setLastRefresh ] = useState<Date | null>( null );

    // Keep lastRefresh timestamp in sync
    useEffect( () => {
        if ( !loading ) setLastRefresh( new Date() );
    }, [ loading ] );

    /* ─── date arrays ─── */
    const dailyDates = useMemo( () => buildDailyDates( 120 ), [] );
    const monthlyDates = useMemo( () => buildMonthlyDates( 20 ), [] );
    const lstDates = useMemo( () => buildYearlyMonthlyDates( 2022, 2026 ), [] );

    /* ─── 1. POL Price (Area) ─── */
    const priceData = useMemo( () =>
    {
        if ( polData?.price_history?.length )
        {
            return polData.price_history.map( ( p: any ) => ( {
                date: new Date( p.date ?? p.timestamp ).toLocaleDateString(),
                value: p.price ?? p.value,
            } ) );
        }
        // fallback mock
        const rand = seededRandom( 42 );
        return dailyDates.map( ( d ) => ( {
            date: d.toLocaleDateString(),
            value: rand() * 0.4 + 0.8,
        } ) );
    }, [ dailyDates, polData ] );

    /* ─── 2. Monthly Balance – StackedAreaChart ─── */
    const monthlyBalanceCategories = [
        "MATIC", "OldMATIC", "Multisigs", "Staking", "DEXs",
        "Wallets", "SCsNoname", "SCs", "CEXs", "Deposits", "Emissions",
    ];
    const monthlyBalanceColors = [
        "#8b5cf6", "#a855f7", "#c026d3", "#d946ef", "#e879f9",
        "#f0abfc", "#fae8ff", "#f3e8ff", "#ddd6fe", "#c4b5fd", "#a78bfa",
    ];
    const monthlyBalanceData = useMemo( () =>
    {
        const rand = seededRandom( 100 );
        return monthlyDates.map( ( d ) =>
        {
            const row: Record<string, any> = { date: d.toLocaleDateString() };
            monthlyBalanceCategories.forEach( ( cat ) =>
            {
                row[ cat ] = rand() * 2e9 + 5e8;
            } );
            return row;
        } );
    }, [ monthlyDates ] );
    const monthlyBalanceSeries = monthlyBalanceCategories.map( ( key, i ) => ( {
        key,
        color: monthlyBalanceColors[ i ],
        label: key === "OldMATIC" ? "Old MATIC" : key === "SCsNoname" ? "SCs: Noname" : key,
    } ) );

    /* ─── 3. Holdings Pie ─── */
    const holdingsDonutData = [
        { label: "Staking", value: 34.66 },
        { label: "Deposits", value: 26.26 },
        { label: "Wallets >1M", value: 16.78 },
        { label: "CEXs", value: 12.75 },
        { label: "Migration", value: 3.93 },
        { label: "SCs: Noname", value: 2.66 },
        { label: "SCs", value: 1.89 },
    ];

    /* ─── 4. Staking APR vs APY (MultiLine) ─── */
    const aprApyDates = useMemo( () => lstDates.filter( ( _, i ) => i % 2 === 0 ), [ lstDates ] );
    const aprApyData = useMemo( () =>
    {
        if ( polData?.staking_history?.length )
        {
            return polData.staking_history.map( ( s: any ) => ( {
                date: new Date( s.date ?? s.timestamp ).toLocaleDateString(),
                apy: s.apy ?? 0,
                apr: s.apr ?? 0,
            } ) );
        }
        // fallback mock
        const rand = seededRandom( 200 );
        return aprApyDates.map( ( d ) => ( {
            date: d.toLocaleDateString(),
            apy: rand() * 2 + 2,
            apr: rand() * 2 + 2,
        } ) );
    }, [ aprApyDates, polData ] );
    const aprApySeries = [
        { key: "apy", color: "#ef4444", label: "APY" },
        { key: "apr", color: "#3b82f6", label: "APR" },
    ];

    /* ─── 5. LST vs Native Staking (StackedArea as bars – use StackedAreaChart) ─── */
    const lstNativeDates = useMemo( () => dailyDates.filter( ( _, i ) => i % 5 === 0 ), [ dailyDates ] );
    const lstNativeData = useMemo( () =>
    {
        const rand = seededRandom( 300 );
        return lstNativeDates.map( ( d ) => ( {
            date: d.toLocaleDateString(),
            Native: rand() * 20e6 + 30e6,
            LST: rand() * 3e6 + 2e6,
        } ) );
    }, [ lstNativeDates ] );
    const lstNativeSeries = [
        { key: "Native", color: "#ef4444", label: "Native" },
        { key: "LST", color: "#3b82f6", label: "LST" },
    ];

    /* ─── 6. LST TVL (StackedArea) ─── */
    const lstTokens = [ "tMATIC", "stMATIC", "rMATIC", "csMATIC", "ankrMATIC", "TruPOL", "wstPOL", "stPOL", "TruMATIC", "MaticX" ];
    const lstColors = [ "#06b6d4", "#3b82f6", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#f59e0b", "#84cc16", "#10b981" ];
    const lstTVLDates = useMemo( () => lstDates.filter( ( _, i ) => i % 3 === 0 ), [ lstDates ] );
    const lstTVLData = useMemo( () =>
    {
        const rand = seededRandom( 400 );
        return lstTVLDates.map( ( d, j ) =>
        {
            const row: Record<string, any> = { date: d.toLocaleDateString() };
            lstTokens.forEach( ( token ) =>
            {
                const base = rand() * 30e6 + 10e6;
                row[ token ] = j > 5 && j < 9 ? base * 3 : base;
            } );
            return row;
        } );
    }, [ lstTVLDates ] );
    const lstTVLSeries = lstTokens.map( ( key, i ) => ( { key, color: lstColors[ i ], label: key } ) );

    /* ─── 7. LST Unit Supply (StackedArea) ─── */
    const lstSupplyData = useMemo( () =>
    {
        const rand = seededRandom( 500 );
        return lstTVLDates.map( ( d, j ) =>
        {
            const row: Record<string, any> = { date: d.toLocaleDateString() };
            lstTokens.forEach( ( token ) =>
            {
                const base = rand() * 20e6 + 5e6;
                row[ token ] = j > 5 && j < 9 ? base * 2.5 : base;
            } );
            return row;
        } );
    }, [ lstTVLDates ] );

    /* ─── 8. LST vs Native Rewards (StackedArea) ─── */
    const rewardsDates = useMemo( () => dailyDates.filter( ( _, i ) => i % 3 === 0 ), [ dailyDates ] );
    const rewardsData = useMemo( () =>
    {
        const rand = seededRandom( 600 );
        return rewardsDates.map( ( d ) => ( {
            date: d.toLocaleDateString(),
            Native: rand() * 100 + 350,
            LST: rand() * 30 + 20,
        } ) );
    }, [ rewardsDates ] );

    /* ─── 9. POL-ETH Correlation (DualAxis) ─── */
    const polEthDates = [ new Date( "2024-11-01" ), new Date( "2024-12-01" ), new Date( "2025-01-01" ) ];
    const polEthData = [
        { date: polEthDates[ 0 ].toLocaleDateString(), value: 0.9, value2: 3000 },
        { date: polEthDates[ 1 ].toLocaleDateString(), value: 0.7, value2: 2800 },
        { date: polEthDates[ 2 ].toLocaleDateString(), value: 0.5, value2: 2200 },
    ];

    /* ─── 10. Rolling 30-day Correlation (Line) ─── */
    const rollingCorrData = [
        { date: "11/1/2024", value: 0.9 },
        { date: "12/1/2024", value: -0.3 },
        { date: "1/1/2025", value: 0.5 },
    ];

    /* ─── 11. POL on DEX (BarLineCombo) ─── */
    const dexDates = useMemo( () => lstDates.filter( ( _, i ) => i >= 24 ), [ lstDates ] );
    const dexData = useMemo( () =>
    {
        const rand = seededRandom( 700 );
        return dexDates.map( ( d ) => ( {
            date: d.toLocaleDateString(),
            bar: rand() * 30e6 - 15e6,
            line: rand() * 0.3 + 0.3,
        } ) );
    }, [ dexDates ] );

    /* ─── Holdings Table ─── */
    const holdingsTableData = [
        { affiliation: "Staking", totalBalance: 3667002913, percent: "34.66%", addresses: 1 },
        { affiliation: "Deposits", totalBalance: 2778121113, percent: "26.26%", addresses: 1 },
        { affiliation: "Wallets >1M", totalBalance: 1776154753, percent: "16.78%", addresses: 187 },
        { affiliation: "CEXs", totalBalance: 1348978137, percent: "12.75%", addresses: 239 },
        { affiliation: "Migration", totalBalance: 415903502, percent: "3.93%", addresses: 1 },
        { affiliation: "SCs: Noname", totalBalance: 271069773, percent: "2.56%", addresses: 3094 },
        { affiliation: "SCs", totalBalance: 135421988, percent: "1.09%", addresses: 1024 },
    ];

    return (
        <div className="px-3 py-4 sm:p-6 lg:px-8 xl:px-12 space-y-6 sm:space-y-8 mx-auto text-white w-full max-w-[1920px] min-h-screen pb-20">
            <BackButton className="mb-1" />
            <header className="flex flex-col gap-3 sm:gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                            🪙 POL Token Dashboard
                        </h1>
                        <p className="text-white/60 text-xs sm:text-sm mt-1">
                            Comprehensive POL Token Analytics - Staking, LST, APY &amp; DEX Activity
                        </p>
                    </div>
                    <button
                        onClick={ refresh }
                        className="self-start sm:self-auto inline-flex items-center gap-2 text-xs sm:text-sm px-3 py-2 rounded-lg bg-purple-500/30 hover:bg-purple-500/40 transition-colors border border-purple-400/30"
                    >
                        <RefreshCw className={ `w-4 h-4 ${ loading ? "animate-spin" : "" }` } />
                        Refresh
                    </button>
                </div>
                { lastRefresh && (
                    <div className="text-[10px] sm:text-xs text-white/40">
                        Last update: { lastRefresh.toLocaleTimeString() }
                    </div>
                ) }
            </header>

            {/* POL Token Overview */ }
            <Section id="overview" icon={ <Coins className="w-5 h-5 text-purple-400" /> } title="POL Token - Overview" storagePrefix="pol-token-section" accentClass="text-purple-400">
                <Grid3>
                    <StatCard
                        icon={ <DollarSign className="w-5 h-5" /> }
                        label="Market Cap ($)"
                        value={ polData?.market_cap ? fmtCompact( polData.market_cap ) : "1,126,229,616" }
                        subtitle="POL Market Cap"
                        trend={ { value: "+10d", isPositive: true } }
                    />
                    <StatCard
                        icon={ <Activity className="w-5 h-5" /> }
                        label="Current POL Price"
                        value={ polData?.price ? fmtUSD( polData.price ) : "$0.11" }
                        subtitle="POL Price"
                        trend={ { value: "+10d", isPositive: true } }
                    />
                    <StatCard
                        icon={ <Wallet className="w-5 h-5" /> }
                        label="POL Supply"
                        value={ fmt( 9971951015, 0 ) }
                        subtitle="Total POL Supply"
                    />
                </Grid3>

                <Grid2>
                    <SmartChartCard 
                        title="POL Weekly Price Chart" 
                        height={350}
                        data={priceData}
                        series={[{ key: 'value', label: 'Price', color: '#8b5cf6' }]}
                        chartType="area"
                    />
                    <SmartChartCard 
                        title="Monthly Balance (POL)" 
                        subtitle="Monthly balance of POL" 
                        height={350}
                        data={monthlyBalanceData}
                        series={monthlyBalanceSeries.map(s => ({ ...s, stack: 'total' }))}
                        chartType="area"
                    />
                </Grid2>

                <Grid2>
                    <SmartChartCard 
                        title="POL Holdings (Detailed)" 
                        subtitle="Distribution by category" 
                        height={400}
                        data={holdingsDonutData}
                        xKey="label"
                        series={[{ key: 'value', label: 'Holdings', type: 'pie' }]}
                        chartType="pie"
                    />
                    
                    <SmartChartCard 
                        title="POL Holdings (Table)" 
                        subtitle="Detailed breakdown by affiliation" 
                        height={400}
                        data={holdingsTableData}
                        xKey="affiliation"
                        series={[
                            { key: 'totalBalance', label: 'Total Balance', type: 'bar', color: '#10b981' },
                            { key: 'percent', label: '% of Total', type: 'bar' }, // won't chart well likely
                            { key: 'addresses', label: 'Addresses', type: 'bar' }
                        ]}
                        chartType="bar"
                    />
                </Grid2>
            </Section>

            {/* POL Staking */ }
            <Section id="staking" icon={ <Lock className="w-5 h-5 text-teal-400" /> } title="POL Staking" storagePrefix="pol-token-section" accentClass="text-purple-400">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <StatCard icon={ <Coins className="w-4 h-4" /> } label="POL Supply" value={ fmtCompact( 9971951015 ) } />
                    <StatCard icon={ <Lock className="w-4 h-4" /> } label="Total Native Staking" value={ fmtCompact( polData?.total_staked ?? 3667455721 ) } />
                    <StatCard icon={ <Wallet className="w-4 h-4" /> } label="Total POL Staked" value={ fmtCompact( polData?.total_staked ?? 3901735974 ) } />
                    <StatCard icon={ <Activity className="w-4 h-4" /> } label="Percent Staked" value={ polData?.staking_ratio ? fmtPct( polData.staking_ratio ) : "39.13%" } />
                    <StatCard icon={ <DollarSign className="w-4 h-4" /> } label="Total Staked (USD)" value={ polData?.total_staked && polData?.price ? fmtUSD( polData.total_staked * polData.price ) : "$433.2M" } />
                    <StatCard icon={ <TrendingUp className="w-4 h-4" /> } label="% Change Native" value="-1.70%" trend={ { value: "365 Days", isPositive: false } } />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <StatCard icon={ <BarChart3 className="w-4 h-4" /> } label="Native % Staked" value="94.00%" />
                    <StatCard icon={ <LineChartIcon className="w-4 h-4" /> } label="LST % Staked" value="6.00%" />
                    <StatCard icon={ <Zap className="w-4 h-4" /> } label="Native Staking Days" value="2,044" />
                    <StatCard icon={ <Activity className="w-4 h-4" /> } label="Native Staking Years" value="5.60" />
                    <StatCard icon={ <Coins className="w-4 h-4" /> } label="LST Staking Days" value="1,614" />
                    <StatCard icon={ <TrendingUp className="w-4 h-4" /> } label="LST Staking Years" value="4.42" />
                </div>

                <Grid2>
                    <SmartChartCard 
                        title="LST vs Native Staking" 
                        subtitle="Last 365 Days" 
                        height={400}
                        data={lstNativeData}
                        series={lstNativeSeries.map(s => ({ ...s, stack: 'total' }))}
                        chartType="area"
                    />
                    <SmartChartCard 
                        title="LST vs Native Staking %" 
                        subtitle="Pol Staking - Last 365 Days" 
                        height={400}
                        data={lstNativeData}
                        series={lstNativeSeries}
                        chartType="line"
                    />
                </Grid2>

                <SmartChartCard 
                    title="Total Staked POL(UNIT) vs TOTAL STAKED POL(USD)" 
                    subtitle="POL Staking stats - Last 365 Days" 
                    height={450}
                    data={lstNativeData}
                    series={lstNativeSeries.map(s => ({ ...s, stack: 'total' }))}
                    chartType="area"
                />
            </Section>

            {/* APY & APR */ }
            <Section id="apy" icon={ <TrendingUp className="w-5 h-5 text-green-400" /> } title="APY & APR" storagePrefix="pol-token-section" accentClass="text-purple-400">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <StatCard icon={ <Activity className="w-4 h-4" /> } label="APY" value="2.94%" subtitle="POL APY & APR calc - 30D" />
                    <StatCard icon={ <TrendingDown className="w-4 h-4" /> } label="APY Change" value="-4.26%" subtitle="30D" trend={ { value: "-4.26%", isPositive: false } } />
                    <StatCard icon={ <BarChart3 className="w-4 h-4" /> } label="APR" value="2.90%" subtitle="Annualized staking reward rate" />
                    <StatCard icon={ <TrendingDown className="w-4 h-4" /> } label="APR Change" value="-4.20%" subtitle="30D" trend={ { value: "-4.20%", isPositive: false } } />
                    <StatCard icon={ <DollarSign className="w-4 h-4" /> } label="Price Change (30D)" value="8.62%" subtitle="POL numbers" trend={ { value: "+8.62%", isPositive: true } } />
                </div>

                <SmartChartCard 
                    title="POL Staking APR(%) VS APY(%)" 
                    subtitle="POL Staking stats - Last 365 Days" 
                    height={450}
                    data={aprApyData}
                    series={aprApySeries}
                    chartType="line"
                />
            </Section>

            {/* LST */ }
            <Section id="lst" icon={ <Zap className="w-5 h-5 text-cyan-400" /> } title="LST" storagePrefix="pol-token-section" accentClass="text-purple-400">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <StatCard icon={ <DollarSign className="w-4 h-4" /> } label="Total LST TVL" value="$127.96M" />
                    <StatCard icon={ <Coins className="w-4 h-4" /> } label="Total LST Supply" value={ fmtCompact( 284823653 ) } />
                    <StatCard icon={ <TrendingDown className="w-4 h-4" /> } label="Yearly LST TVL Change" value="-8.95%" />
                    <StatCard icon={ <TrendingDown className="w-4 h-4" /> } label="Yearly LST Supply Change" value="-5.24%" />
                    <StatCard icon={ <Activity className="w-4 h-4" /> } label="Daily LST TVL Change" value="-0.73%" />
                    <StatCard icon={ <BarChart3 className="w-4 h-4" /> } label="Daily LST Supply Change" value="-0.00%" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <StatCard icon={ <TrendingUp className="w-4 h-4" /> } label="Weekly LST TVL Change" value="243.64%" />
                    <StatCard icon={ <LineChartIcon className="w-4 h-4" /> } label="Weekly LST Supply Change" value="-0.00%" />
                    <StatCard icon={ <Activity className="w-4 h-4" /> } label="Monthly LST TVL Change" value="341.74%" />
                    <StatCard icon={ <BarChart3 className="w-4 h-4" /> } label="Monthly LST Supply Change" value="0.30%" />
                </div>

                <Grid2>
                    <SmartChartCard 
                        title="LST TVL(USD)" 
                        subtitle="LST TVL" 
                        height={400}
                        data={lstTVLData}
                        series={lstTVLSeries.map(s => ({ ...s, stack: 'total' }))}
                        chartType="area"
                    />
                    <SmartChartCard 
                        title="LST Unit Supply" 
                        subtitle="LST TVL" 
                        height={400}
                        data={lstSupplyData}
                        series={lstTVLSeries.map(s => ({ ...s, stack: 'total' }))}
                        chartType="area"
                    />
                </Grid2>

                <Grid2>
                    <SmartChartCard 
                        title="LST vs Native Rewards" 
                        subtitle="POL Reward Rates - Last 365 Days" 
                        height={400}
                        data={rewardsData}
                        series={lstNativeSeries.map(s => ({ ...s, stack: 'total' }))}
                        chartType="area"
                    />
                    <SmartChartCard 
                        title="LST vs Native APY" 
                        subtitle="POL Reward Rates - Last 365 Days" 
                        height={400}
                        data={aprApyData}
                        series={aprApySeries}
                        chartType="line"
                    />
                </Grid2>

                <SmartChartCard 
                    title="LST vs Native APR" 
                    subtitle="POL Reward Rates - Last 365 Days" 
                    height={450}
                    data={aprApyData}
                    series={aprApySeries}
                    chartType="line"
                />
            </Section>

            {/* POL-ETH Performance */ }
            <Section id="pol-eth" icon={ <Activity className="w-5 h-5 text-orange-400" /> } title="POL - ETH Performance" storagePrefix="pol-token-section" accentClass="text-purple-400">
                <Grid2>
                    <SmartChartCard 
                        title="POL - ETH price chart" 
                        subtitle="Correlation Coefficient" 
                        height={400}
                        data={polEthData}
                        series={[
                            { key: 'value', label: 'POL', color: '#8b5cf6', yAxisIndex: 0 },
                            { key: 'value2', label: 'ETH', color: '#627eea', yAxisIndex: 1 }
                        ]}
                        chartType="line"
                    />
                    <SmartChartCard 
                        title="Rolling 30 day correlation - POL-ETH" 
                        subtitle="Correlation Coefficient" 
                        height={400}
                        data={rollingCorrData}
                        series={[{ key: 'value', label: 'Correlation', color: '#6366f1' }]}
                        chartType="line"
                    />
                </Grid2>
            </Section>

            {/* POL on DEX */ }
            <Section id="dex" icon={ <BarChart3 className="w-5 h-5 text-pink-400" /> } title="POL on DEX" storagePrefix="pol-token-section" accentClass="text-purple-400">
                <SmartChartCard 
                    title="Net tokens on Dex vs POL price" 
                    subtitle="DEX Volume (POL)" 
                    height={450}
                    data={dexData}
                    series={[
                        { key: 'bar', label: 'Net POL', type: 'bar', color: '#10b981' },
                        { key: 'line', label: 'Price USD', type: 'line', color: '#8b5cf6', yAxisIndex: 1 }
                    ]}
                    chartType="mixed"
                />
            </Section>

        </div>
    );
}
