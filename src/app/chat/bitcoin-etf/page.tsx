"use client";

import { useEffect, useMemo, useState, ReactNode } from "react";
import
{
    Activity,
    BarChart3,
    DollarSign,
    TrendingDown,
    TrendingUp,
    Layers,
    PieChart as PieChartIcon,
    RefreshCw,
    Zap,
} from "lucide-react";

import
{
    StackedAreaChart,
    BarChart,
    DonutChart,
    DualAxisChart,
    BarLineComboChart,
} from "@/components/charts/d3";
import { GLASSNODE_COLORS, generateDateSeries } from "@/lib/chart-utils";
import { BackButton, Section, StatCard, ChartCard, Grid2, Grid3, toNumber, fmt, fmtCompact, fmtUSD, seededRandom } from "@/components/polygon/shared";

/* ───────────── constants ───────────── */
const ETF_ISSUERS = [
    "WisdomTree", "Invesco", "Valkyrie", "Franklin Templeton", "VanEck",
    "Grayscale Mini", "Bitwise", "21Shares", "Fidelity", "BlackRock", "Grayscale",
];

const ETF_COLORS: Record<string, string> = {
    WisdomTree: "#f59e0b",
    Invesco: "#3b82f6",
    Valkyrie: "#a855f7",
    "Franklin Templeton": "#ef4444",
    VanEck: "#06b6d4",
    "Grayscale Mini": "#8b5cf6",
    Bitwise: "#84cc16",
    "21Shares": "#f97316",
    Fidelity: "#10b981",
    BlackRock: "#1f2937",
    Grayscale: "#6b7280",
};

/* ───────────── page ───────────── */
export default function BitcoinETFPage ()
{
    const [ snapshot, setSnapshot ] = useState<any>( null );
    const [ loading, setLoading ] = useState( true );
    const [ lastRefresh, setLastRefresh ] = useState<Date | null>( null );

    const loadData = useMemo( () => async () =>
    {
        setLoading( true );
        try
        {
            const res = await fetch( "/api/crawler/chain?chain=bitcoin", { cache: "no-store" } );
            if ( res.ok )
            {
                const payload = await res.json();
                if ( payload?.success !== false )
                {
                    setSnapshot( payload?.data ?? null );
                }
            }
            setLastRefresh( new Date() );
        } catch
        {
            // ignore
        } finally
        {
            setLoading( false );
        }
    }, [] );

    useEffect( () =>
    {
        loadData();
        const t = setInterval( loadData, 120000 );
        return () => clearInterval( t );
    }, [ loadData ] );

    /* ─── date helpers ─── */
    const dailyDates = useMemo( () => generateDateSeries( 80, "2024-01-01", "daily" ), [] );
    const monthlyDates = useMemo( () => generateDateSeries( 25, "2024-01-01", "monthly" ), [] );

    /* ═══════════════════════════════════════════════
       1. Flows USD — StackedAreaChart
       ═══════════════════════════════════════════════ */
    const flowsUSDData = useMemo( () =>
    {
        return dailyDates.map( ( d, i ) =>
        {
            const row: Record<string, any> = { date: d };
            ETF_ISSUERS.forEach( ( issuer, j ) =>
            {
                row[ issuer ] = seededRandom( i * 11 + j * 7 + 100 ) * 200_000_000 - 100_000_000;
            } );
            return row;
        } );
    }, [ dailyDates ] );

    const flowsUSDSeries = useMemo(
        () => ETF_ISSUERS.map( k => ( { key: k, color: ETF_COLORS[ k ], label: k } ) ),
        [],
    );

    /* ═══════════════════════════════════════════════
       2. Net Flows — BarChart (positive/negative)
       ═══════════════════════════════════════════════ */
    const netFlowsData = useMemo( () =>
    {
        return dailyDates.map( ( d, i ) =>
        {
            const val = seededRandom( i * 13 + 42 ) * 300_000_000 - 100_000_000;
            return {
                label: d.toLocaleDateString( "en-US", { month: "short", day: "numeric" } ),
                value: val,
            };
        } );
    }, [ dailyDates ] );

    /* ═══════════════════════════════════════════════
       3. Onchain Holdings — StackedAreaChart
       ═══════════════════════════════════════════════ */
    const onchainHoldingsData = useMemo( () =>
    {
        return monthlyDates.map( ( d, i ) =>
        {
            const row: Record<string, any> = { date: d };
            ETF_ISSUERS.forEach( ( issuer, j ) =>
            {
                row[ issuer ] = seededRandom( i * 17 + j * 3 + 200 ) * 100_000 + 50_000 + i * 10_000;
            } );
            return row;
        } );
    }, [ monthlyDates ] );

    const onchainSeries = useMemo(
        () => ETF_ISSUERS.map( k => ( { key: k, color: ETF_COLORS[ k ], label: k } ) ),
        [],
    );

    /* ═══════════════════════════════════════════════
       4. AUM Marketshare — StackedAreaChart (%)
       ═══════════════════════════════════════════════ */
    const aumShareData = useMemo( () =>
    {
        return monthlyDates.map( ( d, i ) =>
        {
            const row: Record<string, any> = { date: d };
            ETF_ISSUERS.forEach( ( issuer, j ) =>
            {
                row[ issuer ] = seededRandom( i * 19 + j * 5 + 300 ) * 10 + 5;
            } );
            return row;
        } );
    }, [ monthlyDates ] );

    const aumSeries = useMemo(
        () => ETF_ISSUERS.map( k => ( { key: k, color: ETF_COLORS[ k ], label: k } ) ),
        [],
    );

    /* ═══════════════════════════════════════════════
       5. AUM Pie — DonutChart
       ═══════════════════════════════════════════════ */
    const aumPieData = useMemo( () =>
    {
        return ETF_ISSUERS.map( ( issuer, i ) => ( {
            label: issuer,
            value: seededRandom( i * 23 + 400 ) * 15 + 5,
            color: ETF_COLORS[ issuer ],
        } ) );
    }, [] );

    /* ═══════════════════════════════════════════════
       6. Bitcoin Supply Backing — DualAxisChart
       ═══════════════════════════════════════════════ */
    const supplyBackingData = useMemo( () =>
    {
        const dates = generateDateSeries( 14, "2024-01-01", "monthly" );
        return dates.map( ( d, i ) => ( {
            date: d,
            value: i * 50_000 + seededRandom( i * 29 + 500 ) * 100_000,   // Net Flow (BTC)
            value2: 2 + i * 0.15 + seededRandom( i * 31 + 510 ) * 0.2,    // Supply %
        } ) );
    }, [] );

    /* ═══════════════════════════════════════════════
       7. Weekly Flows — StackedAreaChart
       ═══════════════════════════════════════════════ */
    const weeklyFlowsData = useMemo( () =>
    {
        const dates = generateDateSeries( 40, "2024-01-01", "weekly" );
        return dates.map( ( d, i ) =>
        {
            const row: Record<string, any> = { date: d };
            ETF_ISSUERS.forEach( ( issuer, j ) =>
            {
                row[ issuer ] = seededRandom( i * 37 + j * 11 + 600 ) * 50_000_000 - 25_000_000;
            } );
            return row;
        } );
    }, [] );

    const weeklySeries = useMemo(
        () => ETF_ISSUERS.map( k => ( { key: k, color: ETF_COLORS[ k ], label: k } ) ),
        [],
    );

    /* ─── static table data ─── */
    const etfsOverviewData = [
        { issuer: "21Shares", ticker: "ARKB", holdings: "73,611", usdValue: "$7.5b", marketshare: "1.7%", fee: "0.21%" },
        { issuer: "21Shares", ticker: "ARKB", holdings: "73,611", usdValue: "$6.1b", marketshare: "1.7%", fee: "0.21%" },
        { issuer: "Grayscale Mini", ticker: "BTC", holdings: "49,812", usdValue: "$5.6b", marketshare: "1.1%", fee: "0.15%" },
        { issuer: "Grayscale Mini", ticker: "BTC", holdings: "49,812", usdValue: "$5.1b", marketshare: "1.1%", fee: "0.15%" },
        { issuer: "Grayscale Mini", ticker: "BTC", holdings: "49,812", usdValue: "$3.5b", marketshare: "1.1%", fee: "0.15%" },
        { issuer: "VanEck", ticker: "HODL", holdings: "19,852", usdValue: "$2.2b", marketshare: "0.4%", fee: "0.25%" },
        { issuer: "VanEck", ticker: "HODL", holdings: "19,852", usdValue: "$2.0b", marketshare: "0.4%", fee: "0.25%" },
        { issuer: "VanEck", ticker: "HODL", holdings: "19,852", usdValue: "$1.4b", marketshare: "0.4%", fee: "0.25%" },
        { issuer: "Franklin Templeton", ticker: "EZBC", holdings: "10,308", usdValue: "$1.2b", marketshare: "0.2%", fee: "0.19%" },
        { issuer: "Franklin Templeton", ticker: "EZBC", holdings: "10,308", usdValue: "$1.0b", marketshare: "0.2%", fee: "0.19%" },
    ];

    const recentFlowsData = [
        { time: "2026-02-06 09:15", issuer: "Grayscale", ticker: "GBTC", amount: -1186, usdValue: "-$50m", flowType: "Withdr", txs: 1 },
        { time: "2026-02-06 09:15", issuer: "Grayscale Mini", ticker: "BTC", amount: -155, usdValue: "-$10m", flowType: "Withdr", txs: 1 },
        { time: "2026-02-06 05:56", issuer: "BlackRock", ticker: "IBIT", amount: -300, usdValue: "-$20m", flowType: "Withdr", txs: 1 },
        { time: "2026-02-06 05:46", issuer: "BlackRock", ticker: "IBIT", amount: -1248, usdValue: "-$83m", flowType: "Withdr", txs: 1 },
        { time: "2026-02-06 05:44", issuer: "BlackRock", ticker: "IBIT", amount: -2400, usdValue: "-$159m", flowType: "Withdr", txs: 1 },
        { time: "2026-02-05 12:43", issuer: "21Shares", ticker: "ARKB", amount: -312, usdValue: "-$21m", flowType: "Withdr", txs: 1 },
        { time: "2026-02-05 12:24", issuer: "21Shares", ticker: "ARKB", amount: -120, usdValue: "-$8m", flowType: "Withdr", txs: 1 },
        { time: "2026-02-05 10:55", issuer: "Franklin Templeton", ticker: "EZBC", amount: -87, usdValue: "-$6m", flowType: "Withdr", txs: 1 },
    ];

    /* ═══════════════════════════════════════════════
       RENDER
       ═══════════════════════════════════════════════ */
    return (
        <div className="px-3 py-4 sm:p-6 lg:px-8 xl:px-12 space-y-6 sm:space-y-8 mx-auto text-white w-full max-w-[1920px] min-h-screen pb-20">
            <BackButton className="mb-1" />
            <header className="flex flex-col gap-3 sm:gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-yellow-400">
                            ₿ Bitcoin ETFs
                        </h1>
                        <p className="text-white/60 text-xs sm:text-sm mt-1">
                            Onchain Deposits &amp; Withdrawals of Bitcoin ETF Custodians
                        </p>
                    </div>
                    <button
                        onClick={ loadData }
                        className="self-start sm:self-auto inline-flex items-center gap-2 text-xs sm:text-sm px-3 py-2 rounded-lg bg-orange-500/30 hover:bg-orange-500/40 transition-colors border border-orange-400/30"
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

            {/* ── Bitcoin ETFs Overview ── */ }
            <Section id="overview" icon={ <Activity className="w-5 h-5 text-orange-400" /> } title="Bitcoin ETFs Overview" storagePrefix="bitcoin-etf-section">
                <Grid3>
                    <StatCard icon={ <TrendingUp className="w-5 h-5" /> } label="Net Flow Since Launch" value="₿853.2k" subtitle="Bitcoin ETFs" />
                    <StatCard icon={ <Layers className="w-5 h-5" /> } label="Total Onchain Holdings" value="₿1,473k" subtitle="Bitcoin ETFs" />
                    <StatCard icon={ <PieChartIcon className="w-5 h-5" /> } label="Current BTC Supply" value="7.37%" subtitle="of Current BTC Supply" />
                </Grid3>

                <Grid3>
                    <StatCard icon={ <Zap className="w-5 h-5" /> } label="Past Week Flows" value="₿22.03k" subtitle="Bitcoin ETFs" />
                    <StatCard icon={ <DollarSign className="w-5 h-5" /> } label="Total Onchain Holdings" value="$166.5B" subtitle="Bitcoin ETFs" />
                    <StatCard icon={ <TrendingUp className="w-5 h-5" /> } label="Past Month BTC Supply Absorption" value="4.60%" subtitle="Bitcoin ETFs - Annualized" />
                </Grid3>

                <ChartCard title="Flows" subtitle="Bitcoin ETFs, in $" height="450px">
                    <StackedAreaChart
                        data={ flowsUSDData }
                        series={ flowsUSDSeries }
                        height={ 430 }
                        showLegend
                    />
                </ChartCard>

                <Grid2>
                    <ChartCard title="Net Flows" subtitle="Bitcoin ETF Net Flows, in $" height="400px">
                        <BarChart
                            data={ netFlowsData }
                            height={ 380 }
                            color="#10b981"
                        />
                    </ChartCard>
                    <ChartCard title="Onchain Holdings" subtitle="Bitcoin ETFs, in ₿" height="400px">
                        <StackedAreaChart
                            data={ onchainHoldingsData }
                            series={ onchainSeries }
                            height={ 380 }
                            showLegend
                        />
                    </ChartCard>
                </Grid2>
            </Section>

            {/* ── ETFs Details ── */ }
            <Section id="details" icon={ <BarChart3 className="w-5 h-5 text-yellow-400" /> } title="ETFs Overview & Marketshare" storagePrefix="bitcoin-etf-section">
                <ChartCard title="ETFs Overview" subtitle="Bitcoin ETFs" height="400px">
                    <div className="overflow-y-auto max-h-[360px] custom-scrollbar">
                        <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-white/10 backdrop-blur-sm">
                                <tr className="border-b border-white/20">
                                    <th className="text-left p-2 text-white/70 font-medium">Issuer</th>
                                    <th className="text-left p-2 text-white/70 font-medium">Ticker</th>
                                    <th className="text-right p-2 text-white/70 font-medium">Holdings</th>
                                    <th className="text-right p-2 text-white/70 font-medium">USD Value</th>
                                    <th className="text-right p-2 text-white/70 font-medium">Marketshare</th>
                                    <th className="text-right p-2 text-white/70 font-medium">Fee</th>
                                </tr>
                            </thead>
                            <tbody>
                                { etfsOverviewData.map( ( row, i ) => (
                                    <tr key={ i } className="border-b border-white/10 hover:bg-white/5 transition-colors">
                                        <td className="p-2 text-white/90">{ row.issuer }</td>
                                        <td className="p-2 text-orange-400 font-semibold">{ row.ticker }</td>
                                        <td className="p-2 text-right text-white/80">{ row.holdings }</td>
                                        <td className="p-2 text-right text-emerald-400 font-semibold">{ row.usdValue }</td>
                                        <td className="p-2 text-right text-white/80">{ row.marketshare }</td>
                                        <td className="p-2 text-right text-white/70">{ row.fee }</td>
                                    </tr>
                                ) ) }
                            </tbody>
                        </table>
                    </div>
                </ChartCard>

                <Grid2>
                    <ChartCard title="AUM Marketshare" subtitle="Bitcoin ETFs" height="400px">
                        <StackedAreaChart
                            data={ aumShareData }
                            series={ aumSeries }
                            height={ 380 }
                            showLegend
                        />
                    </ChartCard>
                    <ChartCard title="AUM Marketshare" subtitle="Bitcoin ETFs" height="400px">
                        <DonutChart
                            data={ aumPieData }
                            height={ 380 }
                            showLegend
                            centerLabel="Total"
                            centerValue="100%"
                        />
                    </ChartCard>
                </Grid2>

                <ChartCard title="Bitcoin Supply Backing ETFs" subtitle="Change Since Jan 10th 2024 Launch" height="450px">
                    <DualAxisChart
                        data={ supplyBackingData }
                        height={ 430 }
                        leftLabel="Net Flow (BTC)"
                        rightLabel="Supply %"
                        leftColor="#6b7280"
                        rightColor="#1f2937"
                        leftType="line"
                        rightType="area"
                    />
                </ChartCard>
            </Section>

            {/* ── Recent Flows ── */ }
            <Section id="flows" icon={ <TrendingDown className="w-5 h-5 text-red-400" /> } title="Recent Flows & Activity" storagePrefix="bitcoin-etf-section">
                <ChartCard title="Recent Flows" subtitle="Bitcoin ETFs, Ignore Negligible = True" height="400px">
                    <div className="overflow-y-auto max-h-[360px] custom-scrollbar">
                        <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-white/10 backdrop-blur-sm">
                                <tr className="border-b border-white/20">
                                    <th className="text-left p-2 text-white/70 font-medium">Transfer Time (EST)</th>
                                    <th className="text-left p-2 text-white/70 font-medium">Issuer</th>
                                    <th className="text-left p-2 text-white/70 font-medium">ETF Ticker</th>
                                    <th className="text-right p-2 text-white/70 font-medium">Amount</th>
                                    <th className="text-right p-2 text-white/70 font-medium">USD Value</th>
                                    <th className="text-left p-2 text-white/70 font-medium">Flow</th>
                                    <th className="text-right p-2 text-white/70 font-medium">Txs</th>
                                </tr>
                            </thead>
                            <tbody>
                                { recentFlowsData.map( ( row, i ) => (
                                    <tr key={ i } className="border-b border-white/10 hover:bg-white/5 transition-colors">
                                        <td className="p-2 text-white/70 font-mono text-[10px]">{ row.time }</td>
                                        <td className="p-2 text-white/90">{ row.issuer }</td>
                                        <td className="p-2 text-orange-400 font-semibold">{ row.ticker }</td>
                                        <td className="p-2 text-right text-red-400 font-semibold">{ row.amount }</td>
                                        <td className="p-2 text-right text-red-400">{ row.usdValue }</td>
                                        <td className="p-2">
                                            <span className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-300 border border-red-400/30">
                                                { row.flowType }
                                            </span>
                                        </td>
                                        <td className="p-2 text-right text-white/70">{ row.txs }</td>
                                    </tr>
                                ) ) }
                            </tbody>
                        </table>
                    </div>
                </ChartCard>

                <ChartCard title="Weekly Flows" subtitle="Bitcoin ETFs, in $" height="450px">
                    <StackedAreaChart
                        data={ weeklyFlowsData }
                        series={ weeklySeries }
                        height={ 430 }
                        showLegend
                    />
                </ChartCard>
            </Section>

        </div>
    );
}
