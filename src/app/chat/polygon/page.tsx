"use client";

import { useEffect, useMemo, useState, ReactNode } from "react";
import Link from "next/link";
import
{
    Activity,
    ArrowRight,
    BarChart2,
    Coins,
    CreditCard,
    Database,
    FileBarChart,
    Fuel,
    Gamepad2,
    Globe,
    Landmark,
    Layers,
    RefreshCw,
    Scale,
    Shield,
    Sparkles,
    TrendingUp,
    Users,
    Wallet,
    ArrowUpRight,
    ArrowDownRight,
} from "lucide-react";

/* ────────── Types ────────── */
interface DashboardCard
{
    id: string;
    emoji: string;
    title: string;
    description: string;
    color: string;
    colorTo: string;
    borderColor: string;
    links: { label: string; path: string; icon?: ReactNode }[];
}

/* ────────── Card Definitions ────────── */
const CARDS: DashboardCard[] = [
    {
        id: "polygon-pos",
        emoji: "🟣",
        title: "Polygon PoS",
        description: "Network analytics, gas, blocks & validators",
        color: "from-purple-600/20",
        colorTo: "to-purple-900/10",
        borderColor: "border-purple-500/30",
        links: [
            { label: "Network Overview", path: "/chat/polygon/polygon-network", icon: <Globe className="w-3.5 h-3.5" /> },
            { label: "DeFi Ecosystem", path: "/chat/polygon/polygon-defi", icon: <Sparkles className="w-3.5 h-3.5" /> },
            { label: "Data Catalog", path: "/chat/polygon/polygon-data-catalog", icon: <Database className="w-3.5 h-3.5" /> },
        ],
    },
    {
        id: "payments",
        emoji: "💳",
        title: "Polygon Payments",
        description: "PoS payment rails, merchant analytics & FX",
        color: "from-emerald-600/20",
        colorTo: "to-emerald-900/10",
        borderColor: "border-emerald-500/30",
        links: [
            { label: "PoS Payments", path: "/chat/polygon/polygon-pos-payments", icon: <CreditCard className="w-3.5 h-3.5" /> },
            { label: "FX Dashboard", path: "/chat/polygon/fx-dash", icon: <Scale className="w-3.5 h-3.5" /> },
            { label: "Stablecoins", path: "/chat/polygon/polygon-stablecoin", icon: <Coins className="w-3.5 h-3.5" /> },
            { label: "Agora AUSD", path: "/chat/polygon/agora-pos", icon: <Landmark className="w-3.5 h-3.5" /> },
        ],
    },
    {
        id: "pol",
        emoji: "🪙",
        title: "POL Token",
        description: "Price, supply, staking & governance",
        color: "from-violet-600/20",
        colorTo: "to-violet-900/10",
        borderColor: "border-violet-500/30",
        links: [
            { label: "POL Dashboard", path: "/chat/polygon/pol-token", icon: <TrendingUp className="w-3.5 h-3.5" /> },
        ],
    },
    {
        id: "ausd",
        emoji: "💲",
        title: "AUSD",
        description: "Agora AUSD supply, trading & analytics",
        color: "from-amber-600/20",
        colorTo: "to-amber-900/10",
        borderColor: "border-amber-500/30",
        links: [
            { label: "AUSD Analytics", path: "/chat/polygon/agora-pos", icon: <Wallet className="w-3.5 h-3.5" /> },
        ],
    },
    {
        id: "network-comparison",
        emoji: "🛜",
        title: "Network Comparison",
        description: "Cross-chain EVM metrics & usage analytics",
        color: "from-teal-600/20",
        colorTo: "to-teal-900/10",
        borderColor: "border-teal-500/30",
        links: [
            { label: "EVM Comparison", path: "/chat/polygon/evm-comparison", icon: <BarChart2 className="w-3.5 h-3.5" /> },
            { label: "Chain Usage", path: "/chat/polygon/chain-usage-comparison", icon: <Activity className="w-3.5 h-3.5" /> },
        ],
    },
    {
        id: "community",
        emoji: "👥",
        title: "Community Built",
        description: "Polymarket prediction markets & ecosystem",
        color: "from-cyan-600/20",
        colorTo: "to-cyan-900/10",
        borderColor: "border-cyan-500/30",
        links: [
            { label: "Polymarket", path: "/chat/polygon/polymarket-markets", icon: <BarChart2 className="w-3.5 h-3.5" /> },
        ],
    },
    {
        id: "gaming-nft",
        emoji: "🎮",
        title: "Gaming & NFT",
        description: "NFT collections, gaming activity & marketplace",
        color: "from-pink-600/20",
        colorTo: "to-pink-900/10",
        borderColor: "border-pink-500/30",
        links: [
            { label: "NFT Ecosystem", path: "/chat/polygon/polygon-nft", icon: <Gamepad2 className="w-3.5 h-3.5" /> },
        ],
    },
];

/* ────────── Helpers ────────── */
const toNum = ( v: any ): number | null =>
{
    if ( v == null ) return null;
    if ( typeof v === "number" ) return Number.isFinite( v ) ? v : null;
    if ( typeof v === "string" )
    {
        const n = Number( v.replace( /[,$]/g, "" ) );
        return Number.isFinite( n ) ? n : null;
    }
    return null;
};

const fmtC = ( n: any ): string =>
{
    const v = toNum( n );
    if ( v === null ) return "—";
    if ( Math.abs( v ) >= 1e12 ) return `${ ( v / 1e12 ).toFixed( 2 ) }T`;
    if ( Math.abs( v ) >= 1e9 ) return `${ ( v / 1e9 ).toFixed( 2 ) }B`;
    if ( Math.abs( v ) >= 1e6 ) return `${ ( v / 1e6 ).toFixed( 2 ) }M`;
    if ( Math.abs( v ) >= 1e3 ) return `${ ( v / 1e3 ).toFixed( 1 ) }K`;
    return v.toFixed( 2 );
};

const fmtUSD = ( n: any ) => { const v = toNum( n ); return v === null ? "—" : `$${ fmtC( v ) }`; };
const fmtPct = ( n: any ) => { const v = toNum( n ); return v === null ? "—" : `${ v >= 0 ? "+" : "" }${ v.toFixed( 2 ) }%`; };

/* ────────── StatMini ────────── */
function StatMini ( { label, value, change, icon }: {
    label: string; value: string; change?: number; icon: ReactNode;
} )
{
    return (
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 sm:p-4 flex flex-col gap-1.5 hover:bg-white/[0.07] transition-all duration-200">
            <div className="flex items-center gap-2 text-white/50">
                { icon }
                <span className="text-[9px] sm:text-[10px] font-medium uppercase tracking-wider truncate">{ label }</span>
            </div>
            <div className="text-base sm:text-lg lg:text-xl font-bold text-white truncate">{ value }</div>
            { change !== undefined && (
                <div className={ `flex items-center gap-1 text-[10px] sm:text-xs font-semibold ${ change >= 0 ? "text-emerald-400" : "text-red-400" }` }>
                    { change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" /> }
                    { fmtPct( change ) }
                    <span className="text-white/25 ml-1 font-normal">30d</span>
                </div>
            ) }
        </div>
    );
}

/* ────────── CategoryCard ────────── */
function CategoryCard ( { card }: { card: DashboardCard } )
{
    return (
        <div className={ `group relative overflow-hidden rounded-2xl border ${ card.borderColor } bg-gradient-to-br ${ card.color } ${ card.colorTo } backdrop-blur-xl transition-all duration-300 hover:scale-[1.015] active:scale-[0.99] hover:shadow-lg hover:shadow-purple-500/5` }>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-white/[0.04] to-transparent pointer-events-none" />

            <div className="relative p-4 sm:p-5">
                {/* Header */ }
                <div className="flex items-start gap-3 mb-3">
                    <span className="text-xl sm:text-2xl flex-shrink-0 mt-0.5">{ card.emoji }</span>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-sm sm:text-base font-bold text-white truncate">{ card.title }</h3>
                        <p className="text-[10px] sm:text-[11px] text-white/35 mt-0.5 line-clamp-2 leading-relaxed">{ card.description }</p>
                    </div>
                </div>

                {/* Sub-links */ }
                <div className="space-y-0.5">
                    { card.links.map( ( link ) => (
                        <Link
                            key={ link.path }
                            href={ link.path }
                            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/[0.08] active:bg-white/[0.12] transition-all text-white/60 hover:text-white group/link"
                        >
                            <span className="text-white/25 group-hover/link:text-purple-400 transition-colors flex-shrink-0">
                                { link.icon }
                            </span>
                            <span className="text-[11px] sm:text-xs font-medium truncate flex-1">{ link.label }</span>
                            <ArrowRight className="w-3 h-3 text-white/15 group-hover/link:text-white/40 group-hover/link:translate-x-0.5 transition-all flex-shrink-0" />
                        </Link>
                    ) ) }
                </div>
            </div>
        </div>
    );
}

/* ────────── Main Page ────────── */
export default function PolygonPage ()
{
    const [ snapshot, setSnapshot ] = useState<any>( null );
    const [ loading, setLoading ] = useState( true );
    const [ lastRefresh, setLastRefresh ] = useState<Date | null>( null );

    const loadData = useMemo( () => async () =>
    {
        setLoading( true );
        try
        {
            const res = await fetch( "/api/crawler/chain?chain=polygon", { cache: "no-store" } );
            if ( res.ok )
            {
                const payload = await res.json();
                if ( payload?.success !== false ) setSnapshot( payload?.data ?? null );
            }
            setLastRefresh( new Date() );
        } catch { }
        finally { setLoading( false ); }
    }, [] );

    useEffect( () =>
    {
        loadData();
        const t = setInterval( loadData, 120_000 );
        return () => clearInterval( t );
    }, [ loadData ] );

    const net = snapshot?.network;
    const health = snapshot?.health;

    return (
        <div className="px-3 py-4 sm:px-6 sm:py-6 lg:px-8 xl:px-12 mx-auto max-w-[1600px] min-h-screen pb-24 w-full">

            {/* ── Header ── */ }
            <header className="mb-6 sm:mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/20 flex-shrink-0">
                            <Layers className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-violet-300 to-purple-400">
                                Polygon Analytics
                            </h1>
                            <p className="text-[10px] sm:text-xs text-white/35 mt-0.5">
                                Comprehensive on-chain intelligence for the Polygon ecosystem
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                        { lastRefresh && (
                            <span className="text-[9px] sm:text-[10px] text-white/25 tabular-nums">
                                { lastRefresh.toLocaleTimeString() }
                            </span>
                        ) }
                        <button
                            onClick={ loadData }
                            disabled={ loading }
                            className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 transition-all border border-purple-400/15 text-purple-300 disabled:opacity-40"
                        >
                            <RefreshCw className={ `w-3 h-3 ${ loading ? "animate-spin" : "" }` } />
                            <span className="hidden sm:inline">Refresh</span>
                        </button>
                    </div>
                </div>

                {/* ── Hero Stats ── */ }
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
                    <StatMini label="Transactions" value={ net?.total_transactions ? fmtC( net.total_transactions ) : "6.4B" } change={ net?.txn_growth_30d ?? -1.55 } icon={ <Layers className="w-3.5 h-3.5" /> } />
                    <StatMini label="Wallets" value={ net?.total_wallets ? fmtC( net.total_wallets ) : "159M" } change={ net?.wallet_growth_30d ?? -66.36 } icon={ <Users className="w-3.5 h-3.5" /> } />
                    <StatMini label="TVL" value={ fmtUSD( snapshot?.tokens?.tvl ?? 1151638449 ) } change={ snapshot?.tokens?.tvl_change_30d ?? 7 } icon={ <Coins className="w-3.5 h-3.5" /> } />
                    <StatMini label="Stablecoin Supply" value={ fmtUSD( 3414709708 ) } change={ 12.24 } icon={ <Wallet className="w-3.5 h-3.5" /> } />
                    <StatMini label="Gas Price" value={ health?.gas_price ? `${ health.gas_price } Gwei` : "30 Gwei" } icon={ <Fuel className="w-3.5 h-3.5" /> } />
                </div>
            </header>

            {/* ── Dashboards Grid ── */ }
            <section>
                <div className="flex items-center gap-2 mb-4 sm:mb-5">
                    <div className="w-1 h-5 rounded-full bg-gradient-to-b from-purple-400 to-violet-500" />
                    <h2 className="text-xs sm:text-sm font-bold text-white/70 uppercase tracking-wider">Dashboards</h2>
                    <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                    { CARDS.map( ( card ) => (
                        <CategoryCard key={ card.id } card={ card } />
                    ) ) }
                </div>
            </section>

            {/* ── Network Status ── */ }
            <section className="mt-8 sm:mt-10">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-5 rounded-full bg-gradient-to-b from-emerald-400 to-green-500" />
                    <h2 className="text-xs sm:text-sm font-bold text-white/70 uppercase tracking-wider">Network Status</h2>
                    <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
                    { ( [
                        { l: "Block Height", v: health?.block_height ? fmtC( health.block_height ) : "—", i: <Shield className="w-3 h-3" /> },
                        { l: "TPS", v: health?.tps ?? "—", i: <Activity className="w-3 h-3" /> },
                        { l: "Validators", v: health?.validators ?? "100+", i: <Users className="w-3 h-3" /> },
                        { l: "DEX Vol 30d", v: fmtUSD( 4914901678 ), i: <BarChart2 className="w-3 h-3" /> },
                        { l: "Transfer Vol", v: fmtUSD( 54129592598 ), i: <TrendingUp className="w-3 h-3" /> },
                        { l: "Contracts", v: net?.total_contracts ? fmtC( net.total_contracts ) : "—", i: <FileBarChart className="w-3 h-3" /> },
                    ] as { l: string; v: any; i: ReactNode }[] ).map( ( item ) => (
                        <div key={ item.l } className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-2.5 sm:p-3">
                            <div className="flex items-center gap-1.5 text-white/35 mb-1">
                                { item.i }
                                <span className="text-[8px] sm:text-[9px] font-medium uppercase tracking-wider truncate">{ item.l }</span>
                            </div>
                            <div className="text-xs sm:text-sm font-bold text-white truncate">{ String( item.v ) }</div>
                        </div>
                    ) ) }
                </div>
            </section>

        </div>
    );
}
