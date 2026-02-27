"use client";

/**
 * 🌐 Chain Explorer — Hub Page
 * ─────────────────────────────
 * Card-grid overview of 75+ blockchains with search, family filter,
 * quality filter, and hero aggregate stats. Each card links to the
 * detail page at /chat/chain-explorer/[chain].
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import
{
    Loader2, Search, Globe, Activity, DollarSign, Layers,
    TrendingUp, TrendingDown, Database, Filter, ArrowUpDown,
    Sparkles, RefreshCw, ChevronDown,
} from "lucide-react";
import { useAllChains } from "@/hooks/use-crawler-data";
import
{
    fmtCompact, fmtUSD, getChainMeta, qualityColor, qualityBg,
    qualityLabel, toNumber,
} from "@/lib/chain-explorer-utils";

/* ═══════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════ */

interface ChainSummary
{
    key: string;
    chain_name: string;
    chain_symbol: string;
    native_price_usd: number | null;
    native_market_cap: number | null;
    total_transactions: number | null;
    tps: number | null;
    total_nodes: number | null;
    total_addresses: number | null;
    tvl: number | null;
    quality_score: number;
    data_quality: string;
    timestamp: string | null;
}

/* ═══════════════════════════════════════════════
   Families for filter
   ═══════════════════════════════════════════════ */

const FAMILY_LABELS: Record<string, string> = {
    all: "All Chains",
    etherscan: "Etherscan",
    blockscout: "Blockscout",
    level2: "Level2 & Others",
    independent: "Independent",
    cosmos: "Cosmos",
    subscan: "Subscan",
};

type SortKey = "name" | "quality" | "marketCap" | "tps" | "txCount";

/* ═══════════════════════════════════════════════
   Page Component
   ═══════════════════════════════════════════════ */

export default function ChainExplorerHub ()
{
    const { data, loading, error, refresh } = useAllChains();
    const [ search, setSearch ] = useState( "" );
    const [ familyFilter, setFamilyFilter ] = useState( "all" );
    const [ qualityFilter, setQualityFilter ] = useState<string>( "all" );
    const [ sortBy, setSortBy ] = useState<SortKey>( "quality" );
    const [ showFamilyMenu, setShowFamilyMenu ] = useState( false );
    const [ showQualityMenu, setShowQualityMenu ] = useState( false );
    const [ showSortMenu, setShowSortMenu ] = useState( false );

    const familyMenuRef = useRef<HTMLDivElement>( null );
    const qualityMenuRef = useRef<HTMLDivElement>( null );
    const sortMenuRef = useRef<HTMLDivElement>( null );

    useEffect( () =>
    {
        const handlePointerDown = ( event: PointerEvent ) =>
        {
            if ( !showFamilyMenu && !showQualityMenu && !showSortMenu ) return;

            const target = event.target as Node | null;
            if ( !target ) return;

            const insideFamily = familyMenuRef.current?.contains( target );
            const insideQuality = qualityMenuRef.current?.contains( target );
            const insideSort = sortMenuRef.current?.contains( target );

            if ( insideFamily || insideQuality || insideSort ) return;

            setShowFamilyMenu( false );
            setShowQualityMenu( false );
            setShowSortMenu( false );
        };

        document.addEventListener( "pointerdown", handlePointerDown );
        return () => document.removeEventListener( "pointerdown", handlePointerDown );
    }, [ showFamilyMenu, showQualityMenu, showSortMenu ] );

    const QUALITY_LABELS: Record<string, string> = useMemo( () => ( {
        all: "All Quality",
        good: "Good",
        partial: "Partial",
        empty: "Empty",
    } ), [] );

    const SORT_LABELS: Record<SortKey, string> = useMemo( () => ( {
        quality: "Sort: Quality",
        marketCap: "Sort: Market Cap",
        tps: "Sort: TPS",
        txCount: "Sort: Tx Count",
        name: "Sort: Name",
    } ), [] );

    const chains: ChainSummary[] = useMemo( () =>
    {
        if ( !data?.chains ) return [];
        return data.chains as ChainSummary[];
    }, [ data ] );

    /* ── Filtered & sorted ── */
    const filtered = useMemo( () =>
    {
        let list = [ ...chains ];

        // Search
        if ( search.trim() )
        {
            const q = search.toLowerCase();
            list = list.filter( c =>
                c.chain_name.toLowerCase().includes( q ) ||
                c.chain_symbol.toLowerCase().includes( q ) ||
                c.key.toLowerCase().includes( q )
            );
        }

        // Family
        if ( familyFilter !== "all" )
        {
            list = list.filter( c =>
            {
                const meta = getChainMeta( c.key );
                return meta.family === familyFilter;
            } );
        }

        // Quality
        if ( qualityFilter !== "all" )
        {
            list = list.filter( c => c.data_quality === qualityFilter );
        }

        // Sort
        list.sort( ( a, b ) =>
        {
            switch ( sortBy )
            {
                case "name":
                    return a.chain_name.localeCompare( b.chain_name );
                case "quality":
                    return ( b.quality_score ?? 0 ) - ( a.quality_score ?? 0 );
                case "marketCap":
                    return ( toNumber( b.native_market_cap ) ?? 0 ) - ( toNumber( a.native_market_cap ) ?? 0 );
                case "tps":
                    return ( toNumber( b.tps ) ?? 0 ) - ( toNumber( a.tps ) ?? 0 );
                case "txCount":
                    return ( toNumber( b.total_transactions ) ?? 0 ) - ( toNumber( a.total_transactions ) ?? 0 );
                default:
                    return 0;
            }
        } );

        return list;
    }, [ chains, search, familyFilter, qualityFilter, sortBy ] );

    /* ── Aggregate hero stats ── */
    const heroStats = useMemo( () =>
    {
        let totalMcap = 0, totalTx = 0, totalAddr = 0, count = 0;
        for ( const c of chains )
        {
            totalMcap += toNumber( c.native_market_cap ) ?? 0;
            totalTx += toNumber( c.total_transactions ) ?? 0;
            totalAddr += toNumber( c.total_addresses ) ?? 0;
            count++;
        }
        return { totalMcap, totalTx, totalAddr, count };
    }, [ chains ] );

    /* ── Family counts ── */
    const familyCounts = useMemo( () =>
    {
        const counts: Record<string, number> = {};
        for ( const c of chains )
        {
            const meta = getChainMeta( c.key );
            counts[ meta.family ] = ( counts[ meta.family ] || 0 ) + 1;
        }
        return counts;
    }, [ chains ] );

    /* ═══════ Render ═══════ */
    return (
        <div className="space-y-5 p-2 sm:p-4 max-w-7xl mx-auto">

            {/* ── Header ── */ }
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                        <Globe className="w-6 h-6 text-teal-400" />
                        Chain Explorer
                    </h1>
                    <p className="text-white/40 text-xs sm:text-sm mt-1">
                        { heroStats.count } blockchains tracked · Real-time crawler data
                    </p>
                </div>
                <button
                    onClick={ () => refresh() }
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 transition-colors"
                >
                    <RefreshCw className="w-3 h-3" /> Refresh
                </button>
            </div>

            {/* ── Hero Stats ── */ }
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <HeroStat
                    icon={ <Database className="w-4 h-4 text-teal-400" /> }
                    label="Chains Tracked"
                    value={ String( heroStats.count ) }
                />
                <HeroStat
                    icon={ <DollarSign className="w-4 h-4 text-green-400" /> }
                    label="Total Market Cap"
                    value={ fmtUSD( heroStats.totalMcap ) }
                />
                <HeroStat
                    icon={ <Activity className="w-4 h-4 text-blue-400" /> }
                    label="Total Transactions"
                    value={ fmtCompact( heroStats.totalTx ) }
                />
                <HeroStat
                    icon={ <Layers className="w-4 h-4 text-purple-400" /> }
                    label="Total Addresses"
                    value={ fmtCompact( heroStats.totalAddr ) }
                />
            </div>

            {/* ── Search & Filters ── */ }
            <div className="flex flex-col sm:flex-row gap-2">
                {/* Search */ }
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                        type="text"
                        placeholder="Search chains..."
                        value={ search }
                        onChange={ e => setSearch( e.target.value ) }
                        className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:border-teal-500/50"
                    />
                </div>

                {/* Family filter */ }
                <div className="relative" ref={ familyMenuRef }>
                    <button
                        onClick={ () =>
                        {
                            setShowFamilyMenu( prev =>
                            {
                                const next = !prev;
                                if ( next )
                                {
                                    setShowQualityMenu( false );
                                    setShowSortMenu( false );
                                }
                                return next;
                            } );
                        } }
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-white/70 text-sm hover:bg-white/10 transition-colors min-w-[130px]"
                    >
                        <Filter className="w-3.5 h-3.5" />
                        { FAMILY_LABELS[ familyFilter ] || familyFilter }
                        <ChevronDown className="w-3 h-3 ml-auto" />
                    </button>
                    { showFamilyMenu && (
                        <div className="absolute z-50 right-0 top-full mt-1 dropdown-surface backdrop-blur-lg border border-white/10 rounded-lg shadow-xl py-1 min-w-[160px]">
                            { Object.entries( FAMILY_LABELS ).map( ( [ key, label ] ) => (
                                <button
                                    key={ key }
                                    onClick={ () => { setFamilyFilter( key ); setShowFamilyMenu( false ); } }
                                    className={ `w-full text-left px-3 py-1.5 text-xs dropdown-item-hover transition-colors ${ familyFilter === key ? "text-teal-200" : "text-white/80" }` }
                                >
                                    { label } { key !== "all" && familyCounts[ key ] ? `(${ familyCounts[ key ] })` : key === "all" ? `(${ heroStats.count })` : "" }
                                </button>
                            ) ) }
                        </div>
                    ) }
                </div>

                {/* Quality filter (custom menu to avoid white native dropdown) */ }
                <div className="relative" ref={ qualityMenuRef }>
                    <button
                        onClick={ () =>
                        {
                            setShowQualityMenu( prev =>
                            {
                                const next = !prev;
                                if ( next )
                                {
                                    setShowFamilyMenu( false );
                                    setShowSortMenu( false );
                                }
                                return next;
                            } );
                        } }
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-white/70 text-sm hover:bg-white/10 transition-colors min-w-[130px]"
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        { QUALITY_LABELS[ qualityFilter ] || "All Quality" }
                        <ChevronDown className="w-3 h-3 ml-auto" />
                    </button>
                    { showQualityMenu && (
                        <div className="absolute z-50 right-0 top-full mt-1 dropdown-surface backdrop-blur-lg border border-white/10 rounded-lg shadow-xl py-1 min-w-[160px]">
                            { Object.entries( QUALITY_LABELS ).map( ( [ key, label ] ) => (
                                <button
                                    key={ key }
                                    onClick={ () => { setQualityFilter( key ); setShowQualityMenu( false ); } }
                                    className={ `w-full text-left px-3 py-1.5 text-xs dropdown-item-hover transition-colors ${ qualityFilter === key ? "text-teal-200" : "text-white/80" }` }
                                >
                                    { label }
                                </button>
                            ) ) }
                        </div>
                    ) }
                </div>

                {/* Sort (custom menu) */ }
                <div className="relative" ref={ sortMenuRef }>
                    <button
                        onClick={ () =>
                        {
                            setShowSortMenu( prev =>
                            {
                                const next = !prev;
                                if ( next )
                                {
                                    setShowFamilyMenu( false );
                                    setShowQualityMenu( false );
                                }
                                return next;
                            } );
                        } }
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-white/70 text-sm hover:bg-white/10 transition-colors min-w-[140px]"
                    >
                        <ArrowUpDown className="w-3.5 h-3.5" />
                        { SORT_LABELS[ sortBy ] || "Sort" }
                        <ChevronDown className="w-3 h-3 ml-auto" />
                    </button>
                    { showSortMenu && (
                        <div className="absolute z-50 right-0 top-full mt-1 dropdown-surface backdrop-blur-lg border border-white/10 rounded-lg shadow-xl py-1 min-w-[170px]">
                            { ( Object.keys( SORT_LABELS ) as SortKey[] ).map( ( key ) => (
                                <button
                                    key={ key }
                                    onClick={ () => { setSortBy( key ); setShowSortMenu( false ); } }
                                    className={ `w-full text-left px-3 py-1.5 text-xs dropdown-item-hover transition-colors ${ sortBy === key ? "text-teal-200" : "text-white/80" }` }
                                >
                                    { SORT_LABELS[ key ] }
                                </button>
                            ) ) }
                        </div>
                    ) }
                </div>
            </div>

            {/* ── Loading / Error ── */ }
            { loading && chains.length === 0 && (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
                </div>
            ) }
            { error && (
                <div className="text-center py-10 text-red-400 text-sm">{ error }</div>
            ) }

            {/* ── Chain Cards Grid ── */ }
            { filtered.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    { filtered.map( chain => (
                        <ChainCard key={ chain.key } chain={ chain } />
                    ) ) }
                </div>
            ) }

            { !loading && filtered.length === 0 && chains.length > 0 && (
                <div className="text-center py-16 text-white/30 text-sm">
                    No chains match your filters
                </div>
            ) }
        </div>
    );
}


/* ═══════════════════════════════════════════════
   Sub-Components
   ═══════════════════════════════════════════════ */

function HeroStat ( { icon, label, value }: { icon: React.ReactNode; label: string; value: string; } )
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

function ChainCard ( { chain }: { chain: ChainSummary } )
{
    const meta = getChainMeta( chain.key );
    const price = toNumber( chain.native_price_usd );
    const mcap = toNumber( chain.native_market_cap );
    const tvl = toNumber( chain.tvl );
    const tps = toNumber( chain.tps );
    const txs = toNumber( chain.total_transactions );

    return (
        <Link href={ `/chat/chain-explorer/${ chain.key }` }>
            <div className="group rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/[0.14] transition-all duration-200 p-4 cursor-pointer h-full">
                {/* Header */ }
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                        <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                            style={ { backgroundColor: meta.color + "33", borderColor: meta.color + "55", borderWidth: 1 } }
                        >
                            { meta.symbol.slice( 0, 3 ) }
                        </div>
                        <div>
                            <div className="text-white font-semibold text-sm group-hover:text-teal-300 transition-colors">
                                { meta.name }
                            </div>
                            <div className="text-white/40 text-[10px]">{ meta.symbol }</div>
                        </div>
                    </div>
                    <div className={ `text-[10px] px-2 py-0.5 rounded-full ${ qualityBg( chain.quality_score ) } ${ qualityColor( chain.quality_score ) }` }>
                        { qualityLabel( chain.data_quality ) }
                    </div>
                </div>

                {/* Stats grid */ }
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    <MiniStat label="Market Cap" value={ mcap ? fmtUSD( mcap ) : "—" } />
                    <MiniStat label="Price" value={ price ? `$${ price < 1 ? price.toFixed( 4 ) : fmtCompact( price ) }` : "—" } />
                    <MiniStat label="Total Txs" value={ txs ? fmtCompact( txs ) : "—" } />
                    <MiniStat label="TPS" value={ tps ? tps.toFixed( 1 ) : "—" } />
                    { tvl ? <MiniStat label="TVL" value={ fmtUSD( tvl ) } /> : null }
                </div>

                {/* Footer */ }
                <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center justify-between">
                    <span className="text-white/30 text-[10px]">
                        { meta.family }
                    </span>
                    <span className="text-teal-400/60 text-[10px] group-hover:text-teal-400 transition-colors">
                        View Details →
                    </span>
                </div>
            </div>
        </Link>
    );
}

function MiniStat ( { label, value }: { label: string; value: string; } )
{
    return (
        <div>
            <div className="text-white/40 text-[10px]">{ label }</div>
            <div className="text-white/80 font-medium truncate">{ value }</div>
        </div>
    );
}

