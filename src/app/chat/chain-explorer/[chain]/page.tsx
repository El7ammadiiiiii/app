"use client";

/**
 * 🔗 Chain Explorer — Detail Page
 * ────────────────────────────────
 * Shows comprehensive analytics for a single blockchain:
 * - Hero header with chain info + external explorer link
 * - 8 key stat cards
 * - 7 DeFiLlama time-series charts (TVL, Fees, DEX Vol, Revenue, Stablecoins)
 * - 18 value-only metrics
 * - Specialized visualizations (Gauge, Treemap, Radar, Donut, etc.)
 * - Recent blocks, top tokens, top accounts, DEX trades
 */

import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import
{
    ArrowLeft, ExternalLink, RefreshCw, Loader2,
    Activity, DollarSign, Layers, Fuel, Server,
    Clock, Box, Users, TrendingUp, TrendingDown,
    Zap, Database, Shield, BarChart3, Globe,
    ChevronDown, ChevronUp,
} from "lucide-react";
import { useChainDetail } from "@/hooks/use-crawler-data";
import
{
    fmtCompact, fmtUSD, fmtPct, fmtGwei, fmtSeconds,
    getChainMeta, getExplorerBaseUrl,
    toNumber, safe, safeUSD, qualityColor, qualityBg, qualityLabel,
} from "@/lib/chain-explorer-utils";
import
{
    buildTimeSeriesArea, buildGradientArea, buildGaugeRing,
    buildVisualMapBar, buildHorizontalBar, buildFunnel,
    buildNightingaleRose, buildTreemap, buildRadar,
    buildSunburst, buildDualAxisBarLine, buildDonut,
    buildGroupedBar, usdFmt, compactNum,
} from "@/lib/pro-chart-builders";

const ProChart = dynamic( () => import( "@/components/charts/ProChart" ), { ssr: false } );

/* ═══════════════════════════════════════════════
   Page Component
   ═══════════════════════════════════════════════ */

export default function ChainDetailPage ()
{
    const params = useParams();
    const router = useRouter();
    const chainKey = ( params?.chain as string ) || "";
    const { chain, llama, loading, error, refresh } = useChainDetail( chainKey );
    const meta = getChainMeta( chainKey );
    const explorerUrl = getExplorerBaseUrl( chainKey );

    const [ showAllBlocks, setShowAllBlocks ] = useState( false );
    const [ showAllTokens, setShowAllTokens ] = useState( false );
    const [ showAllAccounts, setShowAllAccounts ] = useState( false );

    /* ── Extract nested data ── */
    const net = chain?.network || chain?.net || {};
    const txs = chain?.transactions || chain?.txs || {};
    const tokens = chain?.tokens || {};
    const wallets = chain?.wallets || {};
    const contracts = chain?.contracts || {};
    const health = chain?.health || {};
    const recentBlocks = chain?.recent_blocks || [];
    const dexTrades = chain?.recent_dex_trades || [];
    const gasEstimates = chain?.gas_estimates || [];
    const defillama = chain?.defillama_series || {};

    /* ── Computed values ── */
    const nativePrice = toNumber( tokens.native_price_usd );
    const nativeMcap = toNumber( tokens.native_market_cap );
    const totalTx = toNumber( net.total_transactions );
    const tps = toNumber( net.tps );
    const totalAddresses = toNumber( net.total_addresses );
    const totalNodes = toNumber( health.total_nodes );
    const tvl = toNumber( chain?.tvl );
    const avgBlockTime = toNumber( net.avg_block_time_seconds );
    const gasAvg = toNumber( txs.gas_price_avg );
    const pendingTxs = toNumber( txs.pending_txs );
    const utilization = toNumber( txs.network_utilization_pct );
    const activeDaily = toNumber( net.active_addresses_daily );
    const newDaily = toNumber( net.new_addresses_daily );

    /* ── DeFiLlama series ── */
    const llamaSeries = useMemo( () =>
    {
        const result: Record<string, [ number, number ][]> = {};
        const src = defillama || llama || {};
        for ( const [ key, series ] of Object.entries( src ) )
        {
            const s = series as any;
            if ( s?.data && Array.isArray( s.data ) )
            {
                result[ key ] = s.data
                    .map( ( d: any ) => [ ( d.timestamp || d.date ) * ( d.timestamp > 1e12 ? 1 : 1000 ), d.value ] as [ number, number ] )
                    .filter( ( d: [ number, number ] ) => d[ 1 ] > 0 );
            }
        }
        return result;
    }, [ defillama, llama ] );

    /* ── Specialized chart data ── */
    const topTokens = useMemo( () =>
    {
        const list = tokens.top_tokens || [];
        return list.slice( 0, 10 ).map( ( t: any ) => ( {
            name: t.name || t.symbol || "?",
            value: toNumber( t.market_cap ) || toNumber( t.price_usd ) || 0,
        } ) );
    }, [ tokens ] );

    const topAccounts = useMemo( () =>
    {
        const list = wallets.top_accounts || [];
        return list.slice( 0, 10 ).map( ( a: any ) => ( {
            name: ( a.label || a.address || "?" ).slice( 0, 20 ),
            value: toNumber( a.balance_usd ) || toNumber( a.balance ) || 0,
        } ) );
    }, [ wallets ] );

    const gasLevels = useMemo( () =>
    {
        const low = toNumber( txs.gas_price_low );
        const avg = toNumber( txs.gas_price_avg );
        const high = toNumber( txs.gas_price_high );
        if ( !low && !avg && !high ) return [];
        return [
            { name: "Low", value: low || 0 },
            { name: "Average", value: avg || 0 },
            { name: "High", value: high || 0 },
        ];
    }, [ txs ] );

    const healthRadar = useMemo( () =>
    {
        if ( !tps && !totalNodes && !utilization ) return null;
        return {
            indicator: [
                { name: "TPS", max: 1000 },
                { name: "Nodes", max: 10000 },
                { name: "Utilization", max: 100 },
                { name: "Uptime", max: 100 },
                { name: "Block Time", max: 30 },
            ],
            data: [ {
                value: [
                    tps || 0,
                    totalNodes || 0,
                    utilization || 0,
                    95, // estimated uptime
                    avgBlockTime ? Math.min( 30, avgBlockTime ) : 0,
                ],
                name: meta.name,
            } ],
        };
    }, [ tps, totalNodes, utilization, avgBlockTime, meta.name ] );

    const nodeDistribution = useMemo( () =>
    {
        const countries = health.top_countries || [];
        const clients = health.top_clients || [];
        if ( !countries.length && !clients.length ) return null;
        return {
            name: "Nodes",
            children: countries.slice( 0, 8 ).map( ( c: any ) => ( {
                name: c.country || c.name || "?",
                value: toNumber( c.count ) || toNumber( c.nodes ) || 1,
            } ) ),
        };
    }, [ health ] );

    const blockGasData = useMemo( () =>
    {
        return recentBlocks.slice( 0, 15 ).map( ( b: any ) => ( {
            name: String( b.number || b.block_number || "" ).slice( -6 ),
            bar: toNumber( b.gas_used ) || 0,
            line: toNumber( b.txn_count ) || 0,
        } ) );
    }, [ recentBlocks ] );

    const txsPerBlock = useMemo( () =>
    {
        return recentBlocks.slice( 0, 15 ).map( ( b: any ) => ( {
            name: String( b.number || b.block_number || "" ).slice( -6 ),
            value: toNumber( b.txn_count ) || 0,
        } ) );
    }, [ recentBlocks ] );

    const dexVolume = useMemo( () =>
    {
        const map: Record<string, number> = {};
        for ( const t of dexTrades )
        {
            const dex = t.dex || "Unknown";
            map[ dex ] = ( map[ dex ] || 0 ) + ( toNumber( t.value_usd ) || 0 );
        }
        return Object.entries( map )
            .map( ( [ name, value ] ) => ( { name, value } ) )
            .sort( ( a, b ) => b.value - a.value )
            .slice( 0, 8 );
    }, [ dexTrades ] );

    const gasFunnel = useMemo( () =>
    {
        return gasEstimates.slice( 0, 6 ).map( ( g: any ) => ( {
            name: g.action || "?",
            value: toNumber( g.cost_usd ) || 0,
        } ) );
    }, [ gasEstimates ] );

    /* ═══════ Loading / Error ═══════ */
    if ( loading && !chain )
    {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-10 h-10 text-teal-400 animate-spin" />
            </div>
        );
    }

    if ( error && !chain )
    {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <p className="text-red-400 text-sm">{ error }</p>
                <button onClick={ () => router.push( "/chat/chain-explorer" ) }
                    className="text-teal-400 text-sm hover:underline">
                    ← Back to Chain Explorer
                </button>
            </div>
        );
    }

    /* ═══════ Render ═══════ */
    return (
        <div className="space-y-6 p-2 sm:p-4 max-w-7xl mx-auto pb-20">

            {/* ════ Back + Header ════ */ }
            <div className="flex flex-col gap-4">
                <Link href="/chat/chain-explorer"
                    className="inline-flex items-center gap-1.5 text-white/50 hover:text-white/80 text-sm transition-colors w-fit">
                    <ArrowLeft className="w-4 h-4" /> Chain Explorer
                </Link>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold text-white"
                            style={ { backgroundColor: meta.color + "33", borderColor: meta.color + "55", borderWidth: 1 } }>
                            { meta.symbol.slice( 0, 4 ) }
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                                { chain?.chain_name || meta.name }
                                <span className="text-white/40 text-base font-normal">{ meta.symbol }</span>
                            </h1>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-white/40 text-xs px-2 py-0.5 rounded bg-white/5">
                                    { meta.family }
                                </span>
                                { chain?.quality_score !== undefined && (
                                    <span className={ `text-[10px] px-2 py-0.5 rounded-full ${ qualityBg( chain.quality_score ) } ${ qualityColor( chain.quality_score ) }` }>
                                        { qualityLabel( chain.data_quality || "partial" ) } · { chain.quality_score }%
                                    </span>
                                ) }
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        { explorerUrl && (
                            <a href={ explorerUrl } target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-teal-400 transition-colors">
                                <ExternalLink className="w-3 h-3" /> View on Explorer
                            </a>
                        ) }
                        <button onClick={ () => refresh() }
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 transition-colors">
                            <RefreshCw className={ `w-3 h-3 ${ loading ? "animate-spin" : "" }` } /> Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* ════ Key Stat Cards ════ */ }
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard icon={ <DollarSign className="w-4 h-4 text-green-400" /> }
                    label="Native Price" value={ nativePrice ? `$${ nativePrice < 1 ? nativePrice.toFixed( 6 ) : fmtCompact( nativePrice ) }` : "—" } />
                <StatCard icon={ <Layers className="w-4 h-4 text-blue-400" /> }
                    label="Market Cap" value={ nativeMcap ? fmtUSD( nativeMcap ) : "—" } />
                <StatCard icon={ <Activity className="w-4 h-4 text-purple-400" /> }
                    label="Total Transactions" value={ totalTx ? fmtCompact( totalTx ) : "—" } />
                <StatCard icon={ <Zap className="w-4 h-4 text-yellow-400" /> }
                    label="TPS" value={ tps ? tps.toFixed( 1 ) : "—" } />
                <StatCard icon={ <Users className="w-4 h-4 text-teal-400" /> }
                    label="Total Addresses" value={ totalAddresses ? fmtCompact( totalAddresses ) : "—" } />
                <StatCard icon={ <Server className="w-4 h-4 text-indigo-400" /> }
                    label="Total Nodes" value={ totalNodes ? fmtCompact( totalNodes ) : "—" } />
                <StatCard icon={ <Database className="w-4 h-4 text-cyan-400" /> }
                    label="TVL" value={ tvl ? fmtUSD( tvl ) : "—" } />
                <StatCard icon={ <Fuel className="w-4 h-4 text-orange-400" /> }
                    label="Gas Price" value={ gasAvg ? fmtGwei( gasAvg ) : "—" } />
            </div>

            {/* ════ DeFiLlama Time-Series Charts ════ */ }
            { Object.keys( llamaSeries ).length > 0 && (
                <Section title="📈 On-Chain Metrics (Historical)">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        { llamaSeries.tvl?.length > 0 && (
                            <ChartCard title="Total Value Locked (TVL)" explorerUrl={ explorerUrl } explorerPath="/chart/tvl">
                                <ProChart option={ buildTimeSeriesArea( llamaSeries.tvl, { color: "#6366f1", yFormatter: usdFmt } ) } height={ 280 } bare />
                            </ChartCard>
                        ) }
                        { llamaSeries.fees?.length > 0 && (
                            <ChartCard title="Network Transaction Fees" explorerUrl={ explorerUrl } explorerPath="/chart/transactionfee">
                                <ProChart option={ buildTimeSeriesArea( llamaSeries.fees, { color: "#f97316", yFormatter: usdFmt } ) } height={ 280 } bare />
                            </ChartCard>
                        ) }
                        { llamaSeries.volume?.length > 0 && (
                            <ChartCard title="DEX Trading Volume" explorerUrl={ explorerUrl } explorerPath="/dex">
                                <ProChart option={ buildTimeSeriesArea( llamaSeries.volume, { color: "#8b5cf6", yFormatter: usdFmt } ) } height={ 280 } bare />
                            </ChartCard>
                        ) }
                        { llamaSeries.revenue?.length > 0 && (
                            <ChartCard title="Daily Revenue" explorerUrl={ explorerUrl } explorerPath="/chart/revenue">
                                <ProChart option={ buildTimeSeriesArea( llamaSeries.revenue, { color: "#ec4899", yFormatter: usdFmt } ) } height={ 280 } bare />
                            </ChartCard>
                        ) }
                        { llamaSeries.stablecoins?.length > 0 && (
                            <ChartCard title="Stablecoin Market Cap" explorerUrl={ explorerUrl }>
                                <ProChart option={ buildTimeSeriesArea( llamaSeries.stablecoins, { color: "#10b981", yFormatter: usdFmt } ) } height={ 280 } bare />
                            </ChartCard>
                        ) }
                    </div>
                </Section>
            ) }

            {/* ════ Network Metrics (Value-Only Cards) ════ */ }
            <Section title="🔒 Network Stats">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    <MetricCard label="Avg Block Time" value={ avgBlockTime ? fmtSeconds( avgBlockTime ) : "—" } icon={ <Clock className="w-3.5 h-3.5 text-sky-400" /> } />
                    <MetricCard label="Active Addresses (24h)" value={ activeDaily ? fmtCompact( activeDaily ) : "—" } icon={ <Users className="w-3.5 h-3.5 text-emerald-400" /> } />
                    <MetricCard label="New Addresses (24h)" value={ newDaily ? fmtCompact( newDaily ) : "—" } icon={ <TrendingUp className="w-3.5 h-3.5 text-green-400" /> } />
                    <MetricCard label="Pending Txs" value={ pendingTxs ? fmtCompact( pendingTxs ) : "—" } icon={ <Activity className="w-3.5 h-3.5 text-orange-400" /> } />
                    <MetricCard label="Network Utilization" value={ utilization ? `${ utilization.toFixed( 1 ) }%` : "—" } icon={ <BarChart3 className="w-3.5 h-3.5 text-purple-400" /> } />
                    <MetricCard label="Total Blocks" value={ net.total_blocks ? fmtCompact( toNumber( net.total_blocks )! ) : "—" } icon={ <Box className="w-3.5 h-3.5 text-blue-400" /> } />
                    <MetricCard label="Total Supply" value={ wallets.total_supply ? fmtCompact( toNumber( wallets.total_supply )! ) : "—" } icon={ <Database className="w-3.5 h-3.5 text-yellow-400" /> } />
                    <MetricCard label="Daily Txs" value={ net.txs_per_day ? fmtCompact( toNumber( net.txs_per_day )! ) : "—" } icon={ <Zap className="w-3.5 h-3.5 text-pink-400" /> } />
                    <MetricCard label="Avg Block Size" value={ net.avg_block_size_bytes ? `${ ( toNumber( net.avg_block_size_bytes )! / 1024 ).toFixed( 1 ) } KB` : "—" } icon={ <Box className="w-3.5 h-3.5 text-indigo-400" /> } />
                    <MetricCard label="Confirmation Time" value={ health.confirmation_time_seconds ? fmtSeconds( toNumber( health.confirmation_time_seconds )! ) : "—" } icon={ <Shield className="w-3.5 h-3.5 text-cyan-400" /> } />
                </div>
            </Section>

            {/* ════ Specialized Visualizations ════ */ }
            <Section title="📊 Advanced Analytics">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                    {/* Network Utilization Gauge */ }
                    { utilization != null && utilization > 0 && (
                        <ChartCard title="Network Utilization" explorerUrl={ explorerUrl } explorerPath="/chart/networkutilization">
                            <ProChart option={ buildGaugeRing( utilization, { max: 100, color: "#6366f1", unit: "%" } ) } height={ 260 } bare />
                        </ChartCard>
                    ) }

                    {/* Gas Price Levels */ }
                    { gasLevels.length > 0 && (
                        <ChartCard title="Gas Price Levels" explorerUrl={ explorerUrl } explorerPath="/gastracker">
                            <ProChart option={ buildVisualMapBar( gasLevels, { yFormatter: ( v ) => fmtGwei( v ) } ) } height={ 260 } bare />
                        </ChartCard>
                    ) }

                    {/* Txs per Block */ }
                    { txsPerBlock.length > 0 && (
                        <ChartCard title="Transactions Per Block" explorerUrl={ explorerUrl } explorerPath="/chart/tx">
                            <ProChart option={ buildGradientArea( txsPerBlock, { color: "#38bdf8", yFormatter: compactNum } ) } height={ 260 } bare />
                        </ChartCard>
                    ) }

                    {/* Gas vs Tx Count (Dual Axis) */ }
                    { blockGasData.length > 0 && (
                        <ChartCard title="Gas Used vs Tx Count" explorerUrl={ explorerUrl } explorerPath="/chart/gasused">
                            <ProChart option={ buildDualAxisBarLine( blockGasData, { barLabel: "Gas Used", lineLabel: "Txs", barColor: "#f97316", lineColor: "#6366f1" } ) } height={ 260 } bare />
                        </ChartCard>
                    ) }

                    {/* Tx Cost Estimates (Funnel) */ }
                    { gasFunnel.length > 0 && (
                        <ChartCard title="Transaction Cost Estimates" explorerUrl={ explorerUrl } explorerPath="/gastracker">
                            <ProChart option={ buildFunnel( gasFunnel, { yFormatter: ( v ) => `$${ v.toFixed( 4 ) }` } ) } height={ 260 } bare />
                        </ChartCard>
                    ) }

                    {/* Token Market Caps (Nightingale Rose) */ }
                    { topTokens.length > 0 && (
                        <ChartCard title="Top Token Market Caps" explorerUrl={ explorerUrl } explorerPath="/tokens">
                            <ProChart option={ buildNightingaleRose( topTokens, { yFormatter: usdFmt } ) } height={ 280 } bare />
                        </ChartCard>
                    ) }

                    {/* Top Holders Treemap */ }
                    { topAccounts.length > 0 && (
                        <ChartCard title="Top Account Balances" explorerUrl={ explorerUrl } explorerPath="/accounts">
                            <ProChart option={ buildTreemap( topAccounts, { yFormatter: usdFmt } ) } height={ 280 } bare />
                        </ChartCard>
                    ) }

                    {/* DEX Volume by Platform */ }
                    { dexVolume.length > 0 && (
                        <ChartCard title="DEX Volume by Platform" explorerUrl={ explorerUrl } explorerPath="/dex">
                            <ProChart option={ buildHorizontalBar( dexVolume, { yFormatter: usdFmt } ) } height={ 260 } bare />
                        </ChartCard>
                    ) }

                    {/* Health Radar */ }
                    { healthRadar && (
                        <ChartCard title="Network Health">
                            <ProChart option={ buildRadar( healthRadar ) } height={ 280 } bare />
                        </ChartCard>
                    ) }

                    {/* Node Distribution (Sunburst) */ }
                    { nodeDistribution && (
                        <ChartCard title="Node Distribution by Country" explorerUrl={ explorerUrl } explorerPath="/nodetracker">
                            <ProChart option={ buildSunburst( nodeDistribution ) } height={ 280 } bare />
                        </ChartCard>
                    ) }
                </div>
            </Section>

            {/* ════ Recent Blocks Table ════ */ }
            { recentBlocks.length > 0 && (
                <Section title="🧱 Recent Blocks">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="text-white/40 border-b border-white/[0.06]">
                                    <th className="text-left py-2 px-3 font-medium">Block</th>
                                    <th className="text-right py-2 px-3 font-medium">Txns</th>
                                    <th className="text-right py-2 px-3 font-medium">Gas Used</th>
                                    <th className="text-right py-2 px-3 font-medium">Gas %</th>
                                    <th className="text-right py-2 px-3 font-medium">Reward</th>
                                    <th className="text-right py-2 px-3 font-medium">Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                { ( showAllBlocks ? recentBlocks : recentBlocks.slice( 0, 10 ) ).map( ( b: any, i: number ) => (
                                    <tr key={ i } className="border-b border-white/[0.04] hover:bg-white/[0.03]">
                                        <td className="py-2 px-3">
                                            { explorerUrl ? (
                                                <a href={ `${ explorerUrl }/block/${ b.number || b.block_number }` } target="_blank" rel="noopener noreferrer"
                                                    className="text-teal-400 hover:underline">
                                                    #{ b.number || b.block_number }
                                                </a>
                                            ) : (
                                                <span className="text-white/80">#{ b.number || b.block_number }</span>
                                            ) }
                                        </td>
                                        <td className="text-right py-2 px-3 text-white/70">{ safe( b.txn_count ) }</td>
                                        <td className="text-right py-2 px-3 text-white/70">{ b.gas_used ? fmtCompact( toNumber( b.gas_used )! ) : "—" }</td>
                                        <td className="text-right py-2 px-3 text-white/70">{ b.gas_used_pct ? `${ toNumber( b.gas_used_pct )?.toFixed( 1 ) }%` : "—" }</td>
                                        <td className="text-right py-2 px-3 text-white/70">{ safe( b.reward ) }</td>
                                        <td className="text-right py-2 px-3 text-white/50">{ b.block_time || b.timestamp || "—" }</td>
                                    </tr>
                                ) ) }
                            </tbody>
                        </table>
                        { recentBlocks.length > 10 && (
                            <ShowMore expanded={ showAllBlocks } toggle={ () => setShowAllBlocks( !showAllBlocks ) }
                                total={ recentBlocks.length } />
                        ) }
                    </div>
                </Section>
            ) }

            {/* ════ Top Tokens Table ════ */ }
            { tokens.top_tokens?.length > 0 && (
                <Section title="🪙 Top Tokens">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="text-white/40 border-b border-white/[0.06]">
                                    <th className="text-left py-2 px-3 font-medium">#</th>
                                    <th className="text-left py-2 px-3 font-medium">Token</th>
                                    <th className="text-right py-2 px-3 font-medium">Price</th>
                                    <th className="text-right py-2 px-3 font-medium">Market Cap</th>
                                    <th className="text-right py-2 px-3 font-medium">Holders</th>
                                </tr>
                            </thead>
                            <tbody>
                                { ( showAllTokens ? tokens.top_tokens : tokens.top_tokens.slice( 0, 10 ) ).map( ( t: any, i: number ) => (
                                    <tr key={ i } className="border-b border-white/[0.04] hover:bg-white/[0.03]">
                                        <td className="py-2 px-3 text-white/40">{ i + 1 }</td>
                                        <td className="py-2 px-3">
                                            { explorerUrl && t.address ? (
                                                <a href={ `${ explorerUrl }/token/${ t.address }` } target="_blank" rel="noopener noreferrer"
                                                    className="text-teal-400 hover:underline">
                                                    { t.name || t.symbol || "?" }
                                                </a>
                                            ) : (
                                                <span className="text-white/80">{ t.name || t.symbol || "?" }</span>
                                            ) }
                                            { t.symbol && <span className="text-white/40 ml-1">({ t.symbol })</span> }
                                        </td>
                                        <td className="text-right py-2 px-3 text-white/70">{ t.price_usd ? `$${ toNumber( t.price_usd )?.toFixed( 4 ) }` : "—" }</td>
                                        <td className="text-right py-2 px-3 text-white/70">{ t.market_cap ? fmtUSD( toNumber( t.market_cap )! ) : "—" }</td>
                                        <td className="text-right py-2 px-3 text-white/70">{ safe( t.holders ) }</td>
                                    </tr>
                                ) ) }
                            </tbody>
                        </table>
                        { tokens.top_tokens.length > 10 && (
                            <ShowMore expanded={ showAllTokens } toggle={ () => setShowAllTokens( !showAllTokens ) }
                                total={ tokens.top_tokens.length } />
                        ) }
                    </div>
                </Section>
            ) }

            {/* ════ Top Accounts Table ════ */ }
            { wallets.top_accounts?.length > 0 && (
                <Section title="👛 Top Accounts">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="text-white/40 border-b border-white/[0.06]">
                                    <th className="text-left py-2 px-3 font-medium">#</th>
                                    <th className="text-left py-2 px-3 font-medium">Address</th>
                                    <th className="text-left py-2 px-3 font-medium">Label</th>
                                    <th className="text-right py-2 px-3 font-medium">Balance</th>
                                    <th className="text-right py-2 px-3 font-medium">Balance USD</th>
                                </tr>
                            </thead>
                            <tbody>
                                { ( showAllAccounts ? wallets.top_accounts : wallets.top_accounts.slice( 0, 10 ) ).map( ( a: any, i: number ) => (
                                    <tr key={ i } className="border-b border-white/[0.04] hover:bg-white/[0.03]">
                                        <td className="py-2 px-3 text-white/40">{ i + 1 }</td>
                                        <td className="py-2 px-3 font-mono text-[10px]">
                                            { explorerUrl && a.address ? (
                                                <a href={ `${ explorerUrl }/address/${ a.address }` } target="_blank" rel="noopener noreferrer"
                                                    className="text-teal-400 hover:underline">
                                                    { a.address.slice( 0, 8 ) }...{ a.address.slice( -6 ) }
                                                </a>
                                            ) : (
                                                <span className="text-white/70">{ ( a.address || "?" ).slice( 0, 16 ) }...</span>
                                            ) }
                                        </td>
                                        <td className="py-2 px-3 text-white/60">{ a.label || "—" }</td>
                                        <td className="text-right py-2 px-3 text-white/70">{ a.balance ? fmtCompact( toNumber( a.balance )! ) : "—" } { meta.symbol }</td>
                                        <td className="text-right py-2 px-3 text-white/70">{ a.balance_usd ? fmtUSD( toNumber( a.balance_usd )! ) : "—" }</td>
                                    </tr>
                                ) ) }
                            </tbody>
                        </table>
                        { wallets.top_accounts.length > 10 && (
                            <ShowMore expanded={ showAllAccounts } toggle={ () => setShowAllAccounts( !showAllAccounts ) }
                                total={ wallets.top_accounts.length } />
                        ) }
                    </div>
                </Section>
            ) }

            {/* ════ Recent DEX Trades ════ */ }
            { dexTrades.length > 0 && (
                <Section title="💱 Recent DEX Trades">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="text-white/40 border-b border-white/[0.06]">
                                    <th className="text-left py-2 px-3 font-medium">DEX</th>
                                    <th className="text-left py-2 px-3 font-medium">Action</th>
                                    <th className="text-left py-2 px-3 font-medium">Token In</th>
                                    <th className="text-left py-2 px-3 font-medium">Token Out</th>
                                    <th className="text-right py-2 px-3 font-medium">Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                { dexTrades.slice( 0, 15 ).map( ( t: any, i: number ) => (
                                    <tr key={ i } className="border-b border-white/[0.04] hover:bg-white/[0.03]">
                                        <td className="py-2 px-3 text-white/80">{ t.dex || "—" }</td>
                                        <td className="py-2 px-3">
                                            <span className={ t.action === "Buy" ? "text-green-400" : "text-red-400" }>
                                                { t.action || "Swap" }
                                            </span>
                                        </td>
                                        <td className="py-2 px-3 text-white/70">{ t.token_in || "—" }</td>
                                        <td className="py-2 px-3 text-white/70">{ t.token_out || "—" }</td>
                                        <td className="text-right py-2 px-3 text-white/70">{ t.value_usd ? `$${ toNumber( t.value_usd )?.toFixed( 2 ) }` : "—" }</td>
                                    </tr>
                                ) ) }
                            </tbody>
                        </table>
                    </div>
                </Section>
            ) }

            {/* ════ Gas Estimates ════ */ }
            { gasEstimates.length > 0 && (
                <Section title="⛽ Gas Cost Estimates">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        { gasEstimates.map( ( g: any, i: number ) => (
                            <div key={ i } className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
                                <div className="text-white/50 text-[10px] mb-1">{ g.action }</div>
                                <div className="text-white font-semibold text-sm">
                                    { g.cost_usd ? `$${ toNumber( g.cost_usd )?.toFixed( 4 ) }` : "—" }
                                </div>
                            </div>
                        ) ) }
                    </div>
                </Section>
            ) }

            {/* ════ Timestamp footer ════ */ }
            { chain?.timestamp && (
                <div className="text-center text-white/20 text-[10px] pt-4">
                    Last updated: { new Date( chain.timestamp ).toLocaleString() }
                </div>
            ) }
        </div>
    );
}


/* ═══════════════════════════════════════════════
   Sub-Components
   ═══════════════════════════════════════════════ */

function StatCard ( { icon, label, value }: { icon: React.ReactNode; label: string; value: string; } )
{
    return (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1">
                { icon }
                <span className="text-white/50 text-[10px] sm:text-xs">{ label }</span>
            </div>
            <div className="text-white font-bold text-lg sm:text-xl">{ value }</div>
        </div>
    );
}

function MetricCard ( { icon, label, value }: { icon: React.ReactNode; label: string; value: string; } )
{
    return (
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
            <div className="flex items-center gap-1.5 mb-1">
                { icon }
                <span className="text-white/40 text-[10px]">{ label }</span>
            </div>
            <div className="text-white font-semibold text-sm">{ value }</div>
        </div>
    );
}

function Section ( { title, children }: { title: string; children: React.ReactNode; } )
{
    return (
        <div className="space-y-3">
            <h2 className="text-white/90 font-semibold text-base sm:text-lg">{ title }</h2>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 sm:p-4">
                { children }
            </div>
        </div>
    );
}

function ChartCard ( { title, children, explorerUrl, explorerPath }: {
    title: string;
    children: React.ReactNode;
    explorerUrl?: string | null;
    explorerPath?: string;
} )
{
    return (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-white/80 text-sm font-medium">{ title }</h3>
                { explorerUrl && explorerPath && (
                    <a href={ `${ explorerUrl }${ explorerPath }` } target="_blank" rel="noopener noreferrer"
                        className="text-teal-400/50 hover:text-teal-400 text-[10px] flex items-center gap-1 transition-colors">
                        View on Explorer <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                ) }
            </div>
            { children }
        </div>
    );
}

function ShowMore ( { expanded, toggle, total }: { expanded: boolean; toggle: () => void; total: number; } )
{
    return (
        <button onClick={ toggle }
            className="w-full flex items-center justify-center gap-1 py-2 text-teal-400/70 hover:text-teal-400 text-xs transition-colors mt-1">
            { expanded ? ( <>Show Less <ChevronUp className="w-3 h-3" /></> ) : ( <>Show all { total } <ChevronDown className="w-3 h-3" /></> ) }
        </button>
    );
}
