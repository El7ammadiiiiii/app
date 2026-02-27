"use client";

import { useMemo } from "react";
import { usePolygonStablecoins, useChainData } from '@/hooks/use-crawler-data';
import
{
    Coins,
    DollarSign,
    Fuel,
    PieChart,
    RefreshCw,
    TrendingUp,
    Users,
    Wallet,
    Zap,
    BarChart3,
    Activity,
    LineChart as LineChartIcon,
} from "lucide-react";
import
{
    generateDateSeries,
} from "@/lib/chart-utils";
import { BackButton, Section, StatCard, Grid2, Grid3, toNumber, fmt, fmtCompact, seededRandom } from "@/components/polygon/shared";
import SmartChartCard from "@/components/SmartChartCard";

/* ── deterministic pseudo-random ─────────────────────────────── */
function seeded ( seed: number ): number
{
    const x = Math.sin( seed * 9301 + 49297 ) * 233280;
    return x - Math.floor( x );
}

/* ── Data generators (deterministic) ─────────────────────────── */
const MONTHS = generateDateSeries( 12, "2025-01-01", "monthly" );
const MONTHS_6 = MONTHS.slice( -6 );

function buildStackedData (
    dates: Date[],
    keys: string[],
    baseSeed: number,
    baseValue: number,
    range: number,
)
{
    return dates.map( ( date, i ) =>
    {
        const point: Record<string, any> = { date };
        keys.forEach( ( key, k ) =>
        {
            point[ key ] = baseValue + seeded( baseSeed + i * 31 + k * 97 ) * range;
        } );
        return point;
    } );
}

function buildSeries ( keys: string[], colors: string[], labels?: string[] )
{
    return keys.map( ( key, i ) => ( {
        key,
        color: colors[ i ],
        label: labels ? labels[ i ] : key,
    } ) );
}

/* ── Page ─────────────────────────────────────────────────────── */
export default function PolygonStablecoinPage ()
{
    const { data: stableData, loading: stableLoading, lastUpdated: lastRefresh, refresh: refreshStable } = usePolygonStablecoins();
    const { data: chainData, loading: chainLoading, refresh: refreshChain } = useChainData( 'polygon' );
    const loading = stableLoading || chainLoading;
    const refresh = async () => { await Promise.all( [ refreshStable(), refreshChain() ] ); };

    /* ── Chart data ──────────────────────────────────────────── */

    // 1 ─ Volumes by Category (stacked area)
    const volumeCategories = [
        "Ponzi/Scam", "Bot", "NFT", "DEX", "Bridge", "P2P",
        "Gaming", "Fiat Ramp", "Market Maker", "Lending",
        "Stablecoin Protocol", "CEX", "Prediction", "Protocol_Unknown",
    ];
    const volumeCategoryColors = [
        "#ef4444", "#f59e0b", "#a855f7", "#06b6d4", "#10b981", "#d946ef",
        "#8b5cf6", "#ec4899", "#fbbf24", "#84cc16", "#3b82f6", "#6366f1",
        "#f43f5e", "#6b7280",
    ];
    const volumesByCategoryData = useMemo(
        () =>
        {
            if ( stableData?.market_share )
            {
                // Try to build from real market_share data keyed by category
                const entries = Array.isArray( stableData.market_share ) ? stableData.market_share : Object.entries( stableData.market_share ).map( ( [ k, v ] ) => ( { category: k, ...( typeof v === 'object' ? v as any : { value: v } ) } ) );
                if ( entries.length > 0 ) return entries;
            }
            return buildStackedData( MONTHS, volumeCategories, 100, 10_000_000, 30_000_000 );
        },
        [ stableData ],
    );
    const volumesByCategorySeries = buildSeries( volumeCategories, volumeCategoryColors );

    // 2 ─ USDT Supply (area)
    const usdtSupplyData = useMemo(
        () =>
        {
            if ( stableData?.supply_history )
            {
                const history = Array.isArray( stableData.supply_history ) ? stableData.supply_history : [];
                const usdt = history.filter( ( d: any ) => d.token === 'USDT' || d.symbol === 'USDT' );
                if ( usdt.length > 0 ) return usdt.map( ( d: any ) => ( { date: new Date( d.date || d.timestamp ), value: d.value ?? d.supply ?? d.totalSupply } ) );
                // If supply_history is not per-token, try to extract USDT portion
                if ( history.length > 0 && history[ 0 ].USDT !== undefined ) return history.map( ( d: any ) => ( { date: new Date( d.date || d.timestamp ), value: d.USDT } ) );
            }
            return MONTHS.map( ( date, i ) => ( {
                date,
                value: 500_000_000 + seeded( 200 + i * 17 ) * 500_000_000,
            } ) );
        },
        [ stableData ],
    );

    // 3 ─ USDC Supply (area)
    const usdcSupplyData = useMemo(
        () =>
        {
            if ( stableData?.supply_history )
            {
                const history = Array.isArray( stableData.supply_history ) ? stableData.supply_history : [];
                const usdc = history.filter( ( d: any ) => d.token === 'USDC' || d.symbol === 'USDC' );
                if ( usdc.length > 0 ) return usdc.map( ( d: any ) => ( { date: new Date( d.date || d.timestamp ), value: d.value ?? d.supply ?? d.totalSupply } ) );
                if ( history.length > 0 && history[ 0 ].USDC !== undefined ) return history.map( ( d: any ) => ( { date: new Date( d.date || d.timestamp ), value: d.USDC } ) );
            }
            return MONTHS.map( ( date, i ) => ( {
                date,
                value: 700_000_000 + seeded( 300 + i * 23 ) * 800_000_000,
            } ) );
        },
        [ stableData ],
    );

    // 4 ─ Transactions stacked (USDC, USDT0, DAI)
    const txTokens = [ "USDC", "USDT0", "DAI" ];
    const txTokenColors = [ "#3b82f6", "#10b981", "#f59e0b" ];
    const transactionsData = useMemo(
        () =>
        {
            if ( stableData?.transfers_history )
            {
                const history = Array.isArray( stableData.transfers_history ) ? stableData.transfers_history : [];
                if ( history.length > 0 )
                {
                    return history.map( ( d: any ) => ( {
                        date: new Date( d.date || d.timestamp ),
                        USDC: d.USDC ?? d.usdc ?? 0,
                        USDT0: d.USDT0 ?? d.USDT ?? d.usdt ?? 0,
                        DAI: d.DAI ?? d.dai ?? 0,
                    } ) );
                }
            }
            return buildStackedData( MONTHS, txTokens, 400, 10_000_000, 30_000_000 );
        },
        [ stableData ],
    );
    const transactionsSeries = buildSeries( txTokens, txTokenColors );

    // 5 ─ Transfers multi-line (All, USDC, USDT0, DAI)
    const transferTokens = [ "All", "USDC", "USDT0", "DAI" ];
    const transferColors = [ "#6b7280", "#3b82f6", "#10b981", "#f59e0b" ];
    const transfersData = useMemo(
        () =>
        {
            if ( stableData?.transfers_history )
            {
                const history = Array.isArray( stableData.transfers_history ) ? stableData.transfers_history : [];
                if ( history.length > 0 )
                {
                    return history.map( ( d: any ) => ( {
                        date: new Date( d.date || d.timestamp ),
                        All: ( d.USDC ?? d.usdc ?? 0 ) + ( d.USDT ?? d.USDT0 ?? d.usdt ?? 0 ) + ( d.DAI ?? d.dai ?? 0 ),
                        USDC: d.USDC ?? d.usdc ?? 0,
                        USDT0: d.USDT0 ?? d.USDT ?? d.usdt ?? 0,
                        DAI: d.DAI ?? d.dai ?? 0,
                    } ) );
                }
            }
            return buildStackedData( MONTHS, transferTokens, 500, 50_000_000, 100_000_000 );
        },
        [ stableData ],
    );
    const transfersSeries = buildSeries( transferTokens, transferColors );

    // 6 ─ P2P Volume (stacked area – chains)
    const p2pChains = [
        "polygon", "avalanche_c", "arbitrum", "ethereum",
        "optimism", "base", "gnosis", "solana", "celo",
    ];
    const p2pColors = [
        "#8247e5", "#e84142", "#28a0f0", "#627eea",
        "#ff0420", "#0052ff", "#04795b", "#14f195", "#fbcc5c",
    ];
    const p2pVolumeData = useMemo(
        () => buildStackedData( MONTHS, p2pChains, 600, 20_000_000, 100_000_000 ),
        [],
    );
    const p2pVolumeSeries = buildSeries( p2pChains, p2pColors );

    // 7 ─ P2P Proportion (stacked area – %)
    const p2pProportionData = useMemo(
        () => buildStackedData( MONTHS, p2pChains, 700, 5, 15 ),
        [],
    );

    // 8 ─ Active Wallets (bar)
    const activeWalletsData = useMemo(
        () =>
        {
            if ( stableData?.active_wallets && Array.isArray( stableData.active_wallets ) && stableData.active_wallets.length > 0 )
            {
                return stableData.active_wallets.map( ( d: any ) => ( {
                    label: new Date( d.date || d.timestamp ).toLocaleDateString( "en-US", { month: "short", year: "numeric" } ),
                    value: d.value ?? d.count ?? d.wallets ?? 0,
                } ) );
            }
            return MONTHS.map( ( d, i ) => ( {
                label: d.toLocaleDateString( "en-US", { month: "short", year: "numeric" } ),
                value: Math.round( 500_000 + seeded( 800 + i * 13 ) * 1_500_000 ),
            } ) );
        },
        [ stableData ],
    );

    // 9 ─ Stripe Cumulative (stacked area)
    const stripeChains = [ "ethereum", "base", "polygon" ];
    const stripeColors = [ "#627eea", "#0052ff", "#8247e5" ];
    const stripeCumulativeData = useMemo(
        () => MONTHS.map( ( date, j ) =>
        {
            const point: Record<string, any> = { date };
            stripeChains.forEach( ( chain, i ) =>
            {
                point[ chain ] = ( j + 1 ) * ( seeded( 900 + j * 19 + i * 53 ) * 30_000_000 ) + i * 20_000_000;
            } );
            return point;
        } ),
        [],
    );
    const stripeSeries = buildSeries( stripeChains, stripeColors );

    // 10 ─ Gas Fee (multi-line)
    const gasChains = [ "base", "arbitrum", "bnb", "avalanche_c", "zksync", "optimism", "polygon" ];
    const gasColors = [ "#0052ff", "#28a0f0", "#f0b90b", "#e84142", "#8c8dfc", "#ff0420", "#8247e5" ];
    const gasFeeData = useMemo(
        () => buildStackedData( MONTHS, gasChains, 1000, 0.05, 0.5 ),
        [],
    );
    const gasFeeSeries = buildSeries( gasChains, gasColors );

    // 11 ─ CEX Inflows (stacked area)
    const exchanges = [
        "Cefiu", "IndoDEX LTD", "FTX", "Phemex", "Deepcoin",
        "AlphaPO", "Coinsquare", "SimpleSwap", "Gamdom",
        "Hotbit", "Azbit", "Uphold", "Netcoins",
    ];
    const exchangeColors = [
        "#ef4444", "#f59e0b", "#fbbf24", "#facc15", "#84cc16",
        "#22c55e", "#10b981", "#14b8a6", "#06b6d4",
        "#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6",
    ];
    const cexInflowsData = useMemo(
        () => buildStackedData( MONTHS, exchanges, 1100, 100_000_000, 500_000_000 ),
        [],
    );
    const cexInflowsSeries = buildSeries( exchanges, exchangeColors );

    // 12 ─ USDC Velocity (area)
    const usdcVelocityData = useMemo(
        () =>
        {
            if ( stableData?.velocity && Array.isArray( stableData.velocity ) && stableData.velocity.length > 0 )
            {
                return stableData.velocity.map( ( d: any ) => ( {
                    date: new Date( d.date || d.timestamp ),
                    value: d.value ?? d.volume ?? 0,
                } ) );
            }
            return MONTHS.map( ( date, i ) => ( {
                date,
                value: 10_000_000 + seeded( 1200 + i * 29 ) * 30_000_000,
            } ) );
        },
        [ stableData ],
    );

    // 13 ─ P2P Transfer Volumes (stacked area)
    const p2pTransferChains = [
        "ethereum", "arbitrum", "polygon", "gnosis",
        "avalanche_c", "optimism", "base",
    ];
    const p2pTransferColors = [
        "#627eea", "#28a0f0", "#8247e5", "#04795b",
        "#e84142", "#ff0420", "#0052ff",
    ];
    const p2pTransferData = useMemo(
        () => buildStackedData( MONTHS, p2pTransferChains, 1300, 500_000_000, 1_000_000_000 ),
        [],
    );
    const p2pTransferSeries = buildSeries( p2pTransferChains, p2pTransferColors );

    // 14 ─ Supply Growth (multi-line, %)
    const growthChains = [
        "zksync", "polygon", "optimism", "gnosis",
        "ethereum", "base", "arbitrum",
    ];
    const growthColors = [
        "#8c8dfc", "#8247e5", "#ff0420", "#04795b",
        "#627eea", "#0052ff", "#28a0f0",
    ];
    const supplyGrowthData = useMemo(
        () =>
        {
            if ( stableData?.supply_growth && Array.isArray( stableData.supply_growth ) && stableData.supply_growth.length > 0 )
            {
                return stableData.supply_growth.map( ( d: any ) => ( {
                    date: new Date( d.date || d.timestamp ),
                    ...growthChains.reduce( ( acc, chain ) => ( { ...acc, [ chain ]: d[ chain ] ?? 0 } ), {} ),
                } ) );
            }
            return buildStackedData( MONTHS, growthChains, 1400, -10, 40 );
        },
        [ stableData ],
    );
    const supplyGrowthSeries = buildSeries( growthChains, growthColors );

    // 15 ─ Account Abstraction (stacked area, last 6 months)
    const aaChains = [ "avalanche_c", "bnb", "gnosis", "base", "polygon" ];
    const aaColors = [ "#e84142", "#f0b90b", "#04795b", "#0052ff", "#8247e5" ];
    const accountAbstractionData = useMemo(
        () => buildStackedData( MONTHS_6, aaChains, 1500, 100_000, 500_000 ),
        [],
    );
    const accountAbstractionSeries = buildSeries( aaChains, aaColors );

    /* ── Render ────────────────────────────────────────────── */
    return (
        <div className="px-3 py-4 sm:p-6 lg:px-8 xl:px-12 space-y-6 sm:space-y-8 mx-auto text-white w-full max-w-[1920px] min-h-screen pb-20">
            <BackButton className="mb-1" />
            <header className="flex flex-col gap-3 sm:gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-violet-300">
                            💎 Polygon Stablecoin
                        </h1>
                        <p className="text-white/60 text-xs sm:text-sm mt-1">
                            Comprehensive Stablecoin Analytics Dashboard
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

            {/* Stablecoin Volumes by Category */ }
            <Section id="volumes" icon={ <PieChart className="w-5 h-5 text-purple-400" /> } title="Polygon Stablecoin Volumes" storagePrefix="polygon-stablecoin-section" accentClass="text-purple-400">
                <SmartChartCard 
                    title="Polygon Stablecoin Volumes by Category" 
                    height={500}
                    data={volumesByCategoryData}
                    series={volumesByCategorySeries.map(s => ({ ...s, stack: 'total' }))}
                    chartType="area"
                />

                <Grid2>
                    <SmartChartCard 
                        title="USDT Supply on Polygon (YTD)" 
                        height={400}
                        data={usdtSupplyData}
                        series={[{ key: 'value', label: 'USDT Supply', color: '#10b981' }]}
                        chartType="area"
                    />
                    <SmartChartCard 
                        title="USDC Supply on Polygon (YTD)" 
                        height={400}
                        data={usdcSupplyData}
                        series={[{ key: 'value', label: 'USDC Supply', color: '#3b82f6' }]}
                        chartType="area"
                    />
                </Grid2>

                <Grid2>
                    <SmartChartCard 
                        title="Polygon Stablecoin Transactions" 
                        height={400}
                        data={transactionsData}
                        series={transactionsSeries.map(s => ({ ...s, stack: 'total' }))}
                        chartType="area"
                    />
                    <SmartChartCard 
                        title="Polygon Stablecoin Transfers" 
                        height={400}
                        data={transfersData}
                        series={transfersSeries}
                        chartType="line"
                    />
                </Grid2>
            </Section>

            {/* Micro Payments */ }
            <Section id="micro" icon={ <Coins className="w-5 h-5 text-cyan-400" /> } title="Micro Payments" defaultOpen={ false } storagePrefix="polygon-stablecoin-section" accentClass="text-purple-400">
                <div className="text-xs text-white/60 mb-4">Trade Sizes less than $100</div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                    <SmartChartCard 
                        title="Micropayments P2P Volumes (Amount)" 
                        height={400}
                        data={p2pVolumeData}
                        series={p2pVolumeSeries.map(s => ({ ...s, stack: 'total' }))}
                        chartType="area"
                    />
                    <SmartChartCard 
                        title="Micropayments P2P Volumes (%)" 
                        height={400}
                        data={p2pProportionData}
                        series={p2pVolumeSeries.map(s => ({ ...s, stack: 'total' }))}
                        chartType="area"
                    />
                    <SmartChartCard 
                        title="Micropayments P2P Transfers (Count)" 
                        height={400}
                        data={p2pVolumeData}
                        series={p2pVolumeSeries.map(s => ({ ...s, stack: 'total' }))}
                        chartType="area"
                    />
                    <SmartChartCard 
                        title="Micropayments P2P Transfers (%)" 
                        height={400}
                        data={p2pProportionData}
                        series={p2pVolumeSeries.map(s => ({ ...s, stack: 'total' }))}
                        chartType="area"
                    />
                </div>
            </Section>

            {/* Small Payments */ }
            <Section id="small" icon={ <DollarSign className="w-5 h-5 text-emerald-400" /> } title="Small Payments" defaultOpen={ false } storagePrefix="polygon-stablecoin-section" accentClass="text-purple-400">
                <div className="text-xs text-white/60 mb-4">Trade Sizes between $100 and $1000</div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                     <SmartChartCard 
                        title="Small Payments P2P Volumes (Amount)" 
                        height={400}
                        data={p2pVolumeData}
                        series={p2pVolumeSeries.map(s => ({ ...s, stack: 'total' }))}
                        chartType="area"
                    />
                    <SmartChartCard 
                        title="Small Payments P2P Volumes (%)" 
                        height={400}
                        data={p2pProportionData}
                        series={p2pVolumeSeries.map(s => ({ ...s, stack: 'total' }))}
                        chartType="area"
                    />
                    <SmartChartCard 
                        title="Small Payments P2P Transfers (Count)" 
                        height={400}
                        data={p2pVolumeData}
                        series={p2pVolumeSeries.map(s => ({ ...s, stack: 'total' }))}
                        chartType="area"
                    />
                    <SmartChartCard 
                        title="Small Payments P2P Transfers (%)" 
                        height={400}
                        data={p2pProportionData}
                        series={p2pVolumeSeries.map(s => ({ ...s, stack: 'total' }))}
                        chartType="area"
                    />
                </div>
            </Section>

            {/* Medium Payments */ }
            <Section id="medium" icon={ <BarChart3 className="w-5 h-5 text-teal-400" /> } title="Medium Payments" defaultOpen={ false } storagePrefix="polygon-stablecoin-section" accentClass="text-purple-400">
                <div className="text-xs text-white/60 mb-4">Trade Sizes between $1000 and $10,000</div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                     <SmartChartCard 
                        title="Medium Payments P2P Volumes (Amount)" 
                        height={400}
                        data={p2pVolumeData}
                        series={p2pVolumeSeries.map(s => ({ ...s, stack: 'total' }))}
                        chartType="area"
                    />
                    <SmartChartCard 
                        title="Medium Payments P2P Volumes (%)" 
                        height={400}
                        data={p2pProportionData}
                        series={p2pVolumeSeries.map(s => ({ ...s, stack: 'total' }))}
                        chartType="area"
                    />
                    <SmartChartCard 
                        title="Medium Payments P2P Transfers (Count)" 
                        height={400}
                        data={p2pVolumeData}
                        series={p2pVolumeSeries.map(s => ({ ...s, stack: 'total' }))}
                        chartType="area"
                    />
                    <SmartChartCard 
                        title="Medium Payments P2P Transfers (%)" 
                        height={400}
                        data={p2pProportionData}
                        series={p2pVolumeSeries.map(s => ({ ...s, stack: 'total' }))}
                        chartType="area"
                    />
                </div>
            </Section>

            {/* Large Payments */ }
            <Section id="large" icon={ <TrendingUp className="w-5 h-5 text-orange-400" /> } title="Large Payments" defaultOpen={ false } storagePrefix="polygon-stablecoin-section" accentClass="text-purple-400">
                <div className="text-xs text-white/60 mb-4">Trade Sizes more than $10,000</div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                     <SmartChartCard 
                        title="Large Payments P2P Volumes (Amount)" 
                        height={400}
                        data={p2pVolumeData}
                        series={p2pVolumeSeries.map(s => ({ ...s, stack: 'total' }))}
                        chartType="area"
                    />
                    <SmartChartCard 
                        title="Large Payments P2P Volumes (%)" 
                        height={400}
                        data={p2pProportionData}
                        series={p2pVolumeSeries.map(s => ({ ...s, stack: 'total' }))}
                        chartType="area"
                    />
                    <SmartChartCard 
                        title="Large Payments P2P Transfers (Count)" 
                        height={400}
                        data={p2pVolumeData}
                        series={p2pVolumeSeries.map(s => ({ ...s, stack: 'total' }))}
                        chartType="area"
                    />
                    <SmartChartCard 
                        title="Large Payments P2P Transfers (%)" 
                        height={400}
                        data={p2pProportionData}
                        series={p2pVolumeSeries.map(s => ({ ...s, stack: 'total' }))}
                        chartType="area"
                    />
                </div>

                <SmartChartCard 
                    title="Polygon P2P Stablecoin Active Wallets" 
                    subtitle="Tracks USDC, USDT and DAI" 
                    height={450}
                    data={activeWalletsData}
                    xKey="label"
                    series={[{ key: 'value', label: 'Wallets', color: '#a855f7' }]}
                    chartType="bar"
                />
            </Section>

            {/* Stripe */ }
            <Section id="stripe" icon={ <Zap className="w-5 h-5 text-yellow-400" /> } title="Stripe" storagePrefix="polygon-stablecoin-section" accentClass="text-purple-400">
                 <SmartChartCard 
                    title="Cumulative Volumes (Stripe/Paxos)" 
                    subtitle="Volume over blockchains" 
                    height={450}
                    data={stripeCumulativeData}
                    series={stripeSeries.map(s => ({ ...s, stack: 'total' }))}
                    chartType="area"
                />
            </Section>

            {/* Gas Fee Analysis */ }
            <Section id="gas" icon={ <Fuel className="w-5 h-5 text-red-400" /> } title="Gas Fee Analysis" storagePrefix="polygon-stablecoin-section" accentClass="text-purple-400">
                <SmartChartCard 
                    title="USDC Gas Fee Analysis" 
                    subtitle="Cost to send USDC" 
                    height={450}
                    data={gasFeeData}
                    series={gasFeeSeries}
                    chartType="line"
                />
            </Section>

            {/* CEX inflows */ }
            <Section id="cex" icon={ <LineChartIcon className="w-5 h-5 text-pink-400" /> } title="CEX inflows to Polygon PoS" storagePrefix="polygon-stablecoin-section" accentClass="text-purple-400">
                <Grid2>
                    <SmartChartCard 
                        title="Transfers (CEX Flows)" 
                        height={400}
                        data={cexInflowsData}
                        series={cexInflowsSeries.map(s => ({ ...s, stack: 'total' }))}
                        chartType="area"
                    />
                    <SmartChartCard 
                        title="Recipients (CEX Flows)" 
                        height={400}
                        data={cexInflowsData}
                        series={cexInflowsSeries.map(s => ({ ...s, stack: 'total' }))}
                        chartType="area"
                    />
                </Grid2>

                <SmartChartCard 
                    title="Volume (CEX Flows)" 
                    subtitle="USDC, USDT, DAI, XSGD, BRZ" 
                    height={500}
                    data={cexInflowsData}
                    series={cexInflowsSeries.map(s => ({ ...s, stack: 'total' }))}
                    chartType="area"
                />
            </Section>

            {/* USDC Velocity & P2P Transfers */ }
            <Section id="velocity" icon={ <Activity className="w-5 h-5 text-indigo-400" /> } title="USDC Velocity & P2P Transfers" storagePrefix="polygon-stablecoin-section" accentClass="text-purple-400">
                <SmartChartCard 
                    title="30D Average USDC Transfer Volume" 
                    subtitle="Polygon PoS USDC Velocity" 
                    height={450}
                    data={usdcVelocityData}
                    series={[{ key: 'value', label: 'Volume', color: '#a855f7' }]}
                    chartType="area"
                />

                <SmartChartCard 
                    title="P2P Transfer Volumes" 
                    subtitle="EOA transfers (USDC + USDT), excluding CEXes and DEXes" 
                    height={450}
                    data={p2pTransferData}
                    series={p2pTransferSeries.map(s => ({ ...s, stack: 'total' }))}
                    chartType="area"
                />
            </Section>

            {/* Supply Growth & Account Abstraction */ }
            <Section id="growth" icon={ <Wallet className="w-5 h-5 text-green-400" /> } title="Supply Growth & Account Abstraction" storagePrefix="polygon-stablecoin-section" accentClass="text-purple-400">
                <SmartChartCard 
                    title="USDC Supply Growth" 
                    subtitle="90-Day Supply Change (%)" 
                    height={450}
                    data={supplyGrowthData}
                    series={supplyGrowthSeries}
                    chartType="line"
                />

                <SmartChartCard 
                    title="Account Abstraction Stablecoin DEX Volumes" 
                    subtitle="By Chain (BRZ)" 
                    height={450}
                    data={accountAbstractionData}
                    series={accountAbstractionSeries.map(s => ({ ...s, stack: 'total' }))}
                    chartType="area"
                />
            </Section>

        </div>
    );
}
