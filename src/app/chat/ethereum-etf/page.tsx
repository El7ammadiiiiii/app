"use client";

import { useEffect, useMemo, useState } from "react";
import
{
    Activity,
    BarChart3,
    DollarSign,
    TrendingDown,
    TrendingUp,
    Layers,
    PieChart,
    RefreshCw,
    Zap,
} from "lucide-react";
import
{
    StackedAreaChart,
    BarLineComboChart,
    DonutChart,
} from "@/components/charts/d3";
import
{
    GLASSNODE_COLORS,
    generateDateSeries,
    formatCompact,
    formatUSD,
} from "@/lib/chart-utils";
import { BackButton, Section, StatCard, ChartCard, Grid2, Grid3, toNumber, fmt, fmtCompact, fmtUSD, seededRandom } from "@/components/polygon/shared";

/* ── ETF metadata ── */
const etfIssuers = [
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

const etfColors = [
    "#f97316",
    "#3b82f6",
    "#ef4444",
    "#06b6d4",
    "#a855f7",
    "#84cc16",
    "#10b981",
    "#1f2937",
    "#6b7280",
];

/* ── page component ── */
export default function EthereumETFPage ()
{
    const [ snapshot, setSnapshot ] = useState<any>( null );
    const [ loading, setLoading ] = useState( true );
    const [ lastRefresh, setLastRefresh ] = useState<Date | null>( null );

    const loadData = useMemo(
        () => async () =>
        {
            setLoading( true );
            try
            {
                const res = await fetch( "/api/crawler/chain?chain=ethereum", {
                    cache: "no-store",
                } );
                if ( res.ok )
                {
                    const payload = await res.json();
                    if ( payload?.success !== false )
                    {
                        setSnapshot( payload?.data ?? null );
                    }
                }
                setLastRefresh( new Date() );
            } catch ( e )
            {
                // ignore
            } finally
            {
                setLoading( false );
            }
        },
        []
    );

    useEffect( () =>
    {
        loadData();
        const t = setInterval( loadData, 120000 );
        return () => clearInterval( t );
    }, [ loadData ] );

    /* ── date generators ── */
    const dailyDates = useMemo( () => generateDateSeries( 48, "2024-07-01", "weekly" ), [] );
    const monthlyDates = useMemo( () => generateDateSeries( 16, "2024-10-01", "monthly" ), [] );
    const weeklyDates = useMemo( () => generateDateSeries( 26, "2024-08-01", "weekly" ), [] );

    /* ── series config for all stacked / multi-series charts ── */
    const etfSeries = useMemo(
        () =>
            etfIssuers.map( ( issuer, i ) => ( {
                key: issuer,
                color: etfColors[ i ],
                label: issuer,
            } ) ),
        []
    );

    /* ── CHART 1: Flows USD (Stacked Area – replaces stacked bar) ── */
    const flowsUSDData = useMemo( () =>
    {
        return dailyDates.map( ( date, di ) =>
        {
            const point: Record<string, any> = { date };
            etfIssuers.forEach( ( issuer, si ) =>
            {
                const seed = di * 100 + si * 7 + 42;
                point[ issuer ] = seededRandom( seed ) * 50_000_000 - 25_000_000;
            } );
            return point;
        } );
    }, [ dailyDates ] );

    /* ── CHART 2: Net Flows (BarLineCombo – bar only) ── */
    const netFlowsData = useMemo( () =>
    {
        return dailyDates.map( ( date, di ) =>
        {
            const seed = di * 31 + 17;
            return {
                date,
                bar: seededRandom( seed ) * 100_000_000 - 50_000_000,
                line: 0,
            };
        } );
    }, [ dailyDates ] );

    /* ── CHART 3: Onchain Holdings (Stacked Area) ── */
    const onchainHoldingsData = useMemo( () =>
    {
        return monthlyDates.map( ( date, di ) =>
        {
            const point: Record<string, any> = { date };
            etfIssuers.forEach( ( issuer, si ) =>
            {
                const seed = di * 50 + si * 13 + 99;
                point[ issuer ] = seededRandom( seed ) * 500_000 + 100_000 + di * 50_000;
            } );
            return point;
        } );
    }, [ monthlyDates ] );

    /* ── CHART 4: AUM Marketshare (Stacked Area, 0–100%) ── */
    const aumMarketshareData = useMemo( () =>
    {
        return monthlyDates.map( ( date, di ) =>
        {
            const point: Record<string, any> = { date };
            etfIssuers.forEach( ( issuer, si ) =>
            {
                const seed = di * 23 + si * 11 + 7;
                point[ issuer ] = seededRandom( seed ) * 15 + 5;
            } );
            return point;
        } );
    }, [ monthlyDates ] );

    /* ── CHART 5: AUM Pie (Donut) ── */
    const aumPieData = useMemo( () =>
    {
        return etfIssuers.map( ( issuer, i ) =>
        {
            const seed = i * 19 + 37;
            return {
                label: issuer,
                value: seededRandom( seed ) * 20 + 5,
                color: etfColors[ i ],
            };
        } );
    }, [] );

    /* ── CHART 6 (was 7): Weekly Flows (Stacked Area) ── */
    const weeklyFlowsData = useMemo( () =>
    {
        return weeklyDates.map( ( date, di ) =>
        {
            const point: Record<string, any> = { date };
            etfIssuers.forEach( ( issuer, si ) =>
            {
                const seed = di * 67 + si * 3 + 111;
                point[ issuer ] = seededRandom( seed ) * 20_000_000 - 10_000_000;
            } );
            return point;
        } );
    }, [ weeklyDates ] );

    /* ── static table data ── */
    const etfsOverviewData = [
        { issuer: "BlackRock", ticker: "ETHA", holdings: "3,762,407", usdValue: "$15.71b", marketshare: "59.9%", fee: "0.25%" },
        { issuer: "BlackRock", ticker: "ETHA", holdings: "3,762,407", usdValue: "$7.87b", marketshare: "59.9%", fee: "0.25%" },
        { issuer: "Grayscale", ticker: "ETHE", holdings: "963,641", usdValue: "$4.02b", marketshare: "15.3%", fee: "2.50%" },
        { issuer: "Grayscale", ticker: "ETHE", holdings: "963,641", usdValue: "$2.02b", marketshare: "15.3%", fee: "2.50%" },
        { issuer: "Fidelity", ticker: "FETH", holdings: "711,077", usdValue: "$2.97b", marketshare: "11.3%", fee: "0.25%" },
        { issuer: "Fidelity", ticker: "FETH", holdings: "711,077", usdValue: "$1.40b", marketshare: "11.3%", fee: "0.25%" },
        { issuer: "Grayscale Mini", ticker: "ETH", holdings: "634,250", usdValue: "$2.65b", marketshare: "10.1%", fee: "0.25%" },
        { issuer: "Grayscale Mini", ticker: "ETH", holdings: "634,250", usdValue: "$1.33b", marketshare: "10.1%", fee: "0.25%" },
        { issuer: "Bitwise", ticker: "ETHW", holdings: "113,605", usdValue: "$474.58m", marketshare: "1.8%", fee: "0.20%" },
        { issuer: "Bitwise", ticker: "ETHW", holdings: "113,605", usdValue: "$237.05m", marketshare: "1.8%", fee: "0.20%" },
    ];

    const recentFlowsData = [
        { time: "2026-02-08 18:18", issuer: "BlackRock", ticker: "ETHA", amount: 35, flowType: "Deposit", txs: 1 },
        { time: "2026-02-08 18:14", issuer: "BlackRock", ticker: "ETHA", amount: 15, flowType: "Deposit", txs: 1 },
        { time: "2026-02-08 18:13", issuer: "BlackRock", ticker: "ETHA", amount: 18, flowType: "Deposit", txs: 1 },
        { time: "2026-02-08 18:00", issuer: "BlackRock", ticker: "ETHA", amount: 7, flowType: "Deposit", txs: 1 },
        { time: "2026-02-08 18:00", issuer: "BlackRock", ticker: "ETHA", amount: 1, flowType: "Deposit", txs: 1 },
        { time: "2026-02-08 18:00", issuer: "BlackRock", ticker: "ETHA", amount: 4, flowType: "Deposit", txs: 1 },
        { time: "2026-02-08 18:00", issuer: "BlackRock", ticker: "ETHA", amount: 1, flowType: "Deposit", txs: 1 },
        { time: "2026-02-08 18:00", issuer: "BlackRock", ticker: "ETHA", amount: 2, flowType: "Deposit", txs: 1 },
        { time: "2026-02-08 18:00", issuer: "BlackRock", ticker: "ETHA", amount: 3, flowType: "Deposit", txs: 1 },
    ];

    /* ── render ── */
    return (
        <div className="px-3 py-4 sm:p-6 lg:px-8 xl:px-12 space-y-6 sm:space-y-8 mx-auto text-white w-full max-w-[1920px] min-h-screen pb-20">
            <BackButton className="mb-1" />
            <header className="flex flex-col gap-3 sm:gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">
                            📈 Ethereum ETFs
                        </h1>
                        <p className="text-white/60 text-xs sm:text-sm mt-1">
                            Onchain Deposits &amp; Withdrawals of Ethereum ETF Custodians
                        </p>
                    </div>
                    <button
                        onClick={ loadData }
                        className="self-start sm:self-auto inline-flex items-center gap-2 text-xs sm:text-sm px-3 py-2 rounded-lg bg-blue-500/30 hover:bg-blue-500/40 transition-colors border border-blue-400/30"
                    >
                        <RefreshCw
                            className={ `w-4 h-4 ${ loading ? "animate-spin" : "" }` }
                        />
                        Refresh
                    </button>
                </div>
                { lastRefresh && (
                    <div className="text-[10px] sm:text-xs text-white/40">
                        Last update: { lastRefresh.toLocaleTimeString() }
                    </div>
                ) }
            </header>

            {/* ── Ethereum ETFs Overview ── */ }
            <Section
                id="overview"
                storagePrefix="ethereum-etf-section"
                icon={ <Activity className="w-5 h-5 text-blue-400" /> }
                title="Ethereum ETFs Overview"
            >
                <Grid3>
                    <StatCard
                        icon={ <TrendingUp className="w-5 h-5" /> }
                        label="Net Flow Since Launch"
                        value="≅3,320.1k"
                        subtitle="Ethereum ETFs"
                    />
                    <StatCard
                        icon={ <Layers className="w-5 h-5" /> }
                        label="Total Onchain Holdings"
                        value="≅6.28M"
                        subtitle="Ethereum ETFs"
                    />
                    <StatCard
                        icon={ <PieChart className="w-5 h-5" /> }
                        label="Current ETH Supply"
                        value="5.05%"
                        subtitle="of Current ETH Supply"
                    />
                </Grid3>

                <Grid3>
                    <StatCard
                        icon={ <Zap className="w-5 h-5" /> }
                        label="Past Week Flows"
                        value="No data"
                        subtitle="Ethereum ETFs"
                    />
                    <StatCard
                        icon={ <DollarSign className="w-5 h-5" /> }
                        label="Total Onchain Holdings"
                        value="$13.37B"
                        subtitle="Ethereum ETFs"
                    />
                    <StatCard
                        icon={ <TrendingUp className="w-5 h-5" /> }
                        label="Past Month ETH Supply Absorption"
                        value="0.4%"
                        subtitle="Ethereum ETFs - Annualized"
                    />
                </Grid3>

                {/* Chart 1: Flows USD – StackedAreaChart */ }
                <ChartCard title="Flows" subtitle="Ethereum ETFs, in $" height="450px">
                    <StackedAreaChart
                        data={ flowsUSDData }
                        series={ etfSeries }
                        height={ 430 }
                        showLegend
                    />
                </ChartCard>

                <Grid2>
                    {/* Chart 2: Net Flows – BarLineComboChart (bar only) */ }
                    <ChartCard
                        title="Flows"
                        subtitle="Ethereum ETFs - Net Flows, in $"
                        height="400px"
                    >
                        <BarLineComboChart
                            data={ netFlowsData }
                            height={ 380 }
                            barColor="#10b981"
                            lineColor="transparent"
                            barLabel="Net Flows"
                            lineLabel=""
                        />
                    </ChartCard>

                    {/* Chart 3: Onchain Holdings – StackedAreaChart */ }
                    <ChartCard
                        title="Onchain Holdings"
                        subtitle="Ethereum ETFs"
                        height="400px"
                    >
                        <StackedAreaChart
                            data={ onchainHoldingsData }
                            series={ etfSeries }
                            height={ 380 }
                            showLegend
                            yAxisLabel="Ξ amount"
                        />
                    </ChartCard>
                </Grid2>
            </Section>

            {/* ── ETFs Details ── */ }
            <Section
                id="details"
                storagePrefix="ethereum-etf-section"
                icon={ <BarChart3 className="w-5 h-5 text-cyan-400" /> }
                title="ETFs Overview & Marketshare"
            >
                <ChartCard
                    title="ETFs Overview"
                    subtitle="Ethereum ETFs"
                    height="400px"
                >
                    <div className="overflow-y-auto max-h-[360px] custom-scrollbar">
                        <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-white/10 backdrop-blur-sm">
                                <tr className="border-b border-white/20">
                                    <th className="text-left p-2 text-white/70 font-medium">
                                        Issuer
                                    </th>
                                    <th className="text-left p-2 text-white/70 font-medium">
                                        Ticker
                                    </th>
                                    <th className="text-right p-2 text-white/70 font-medium">
                                        Holdings
                                    </th>
                                    <th className="text-right p-2 text-white/70 font-medium">
                                        USD Value
                                    </th>
                                    <th className="text-right p-2 text-white/70 font-medium">
                                        Marketshare
                                    </th>
                                    <th className="text-right p-2 text-white/70 font-medium">
                                        Fee
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                { etfsOverviewData.map( ( row, i ) => (
                                    <tr
                                        key={ i }
                                        className="border-b border-white/10 hover:bg-white/5 transition-colors"
                                    >
                                        <td className="p-2 text-white/90">
                                            { row.issuer }
                                        </td>
                                        <td className="p-2 text-cyan-400 font-semibold">
                                            { row.ticker }
                                        </td>
                                        <td className="p-2 text-right text-white/80">
                                            { row.holdings }
                                        </td>
                                        <td className="p-2 text-right text-emerald-400 font-semibold">
                                            { row.usdValue }
                                        </td>
                                        <td className="p-2 text-right text-white/80">
                                            { row.marketshare }
                                        </td>
                                        <td className="p-2 text-right text-white/70">
                                            { row.fee }
                                        </td>
                                    </tr>
                                ) ) }
                            </tbody>
                        </table>
                    </div>
                </ChartCard>

                <Grid2>
                    {/* Chart 4: AUM Marketshare – StackedAreaChart */ }
                    <ChartCard
                        title="AUM Marketshare"
                        subtitle="Ethereum ETFs"
                        height="400px"
                    >
                        <StackedAreaChart
                            data={ aumMarketshareData }
                            series={ etfSeries }
                            height={ 380 }
                            showLegend
                        />
                    </ChartCard>

                    {/* Chart 5: AUM Marketshare Donut */ }
                    <ChartCard
                        title="AUM Marketshare"
                        subtitle="Ethereum ETFs"
                        height="400px"
                    >
                        <DonutChart
                            data={ aumPieData }
                            height={ 380 }
                            showLegend
                            centerLabel="ETF"
                            centerValue="AUM"
                        />
                    </ChartCard>
                </Grid2>
            </Section>

            {/* ── Recent Flows ── */ }
            <Section
                id="flows"
                storagePrefix="ethereum-etf-section"
                icon={ <TrendingUp className="w-5 h-5 text-green-400" /> }
                title="Recent Flows & Activity"
            >
                <ChartCard
                    title="Recent Flows"
                    subtitle="Ethereum ETFs"
                    height="400px"
                >
                    <div className="overflow-y-auto max-h-[360px] custom-scrollbar">
                        <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-white/10 backdrop-blur-sm">
                                <tr className="border-b border-white/20">
                                    <th className="text-left p-2 text-white/70 font-medium">
                                        Transfer Time (EST)
                                    </th>
                                    <th className="text-left p-2 text-white/70 font-medium">
                                        Issuer
                                    </th>
                                    <th className="text-left p-2 text-white/70 font-medium">
                                        ETF Ticker
                                    </th>
                                    <th className="text-right p-2 text-white/70 font-medium">
                                        Amount
                                    </th>
                                    <th className="text-left p-2 text-white/70 font-medium">
                                        Flow Type
                                    </th>
                                    <th className="text-right p-2 text-white/70 font-medium">
                                        Txs
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                { recentFlowsData.map( ( row, i ) => (
                                    <tr
                                        key={ i }
                                        className="border-b border-white/10 hover:bg-white/5 transition-colors"
                                    >
                                        <td className="p-2 text-white/70 font-mono text-[10px]">
                                            { row.time }
                                        </td>
                                        <td className="p-2 text-white/90">
                                            { row.issuer }
                                        </td>
                                        <td className="p-2 text-cyan-400 font-semibold">
                                            { row.ticker }
                                        </td>
                                        <td className="p-2 text-right text-emerald-400 font-semibold">
                                            { row.amount }
                                        </td>
                                        <td className="p-2">
                                            <span
                                                className={ `text-xs px-2 py-1 rounded ${ row.flowType === "Deposit"
                                                    ? "bg-green-500/20 text-green-300 border border-green-400/30"
                                                    : "bg-red-500/20 text-red-300 border border-red-400/30"
                                                    }` }
                                            >
                                                { row.flowType }
                                            </span>
                                        </td>
                                        <td className="p-2 text-right text-white/70">
                                            { row.txs }
                                        </td>
                                    </tr>
                                ) ) }
                            </tbody>
                        </table>
                    </div>
                </ChartCard>

                {/* Chart 6: Weekly Flows – StackedAreaChart */ }
                <ChartCard
                    title="Weekly Flows"
                    subtitle="Ethereum ETFs, in $"
                    height="450px"
                >
                    <StackedAreaChart
                        data={ weeklyFlowsData }
                        series={ etfSeries }
                        height={ 430 }
                        showLegend
                    />
                </ChartCard>
            </Section>

        </div>
    );
}
