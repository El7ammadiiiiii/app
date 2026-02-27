"use client";

import { useEffect, useState, useMemo, ReactNode } from "react";
import dynamic from "next/dynamic";
import { Loader2, Users, Activity, DollarSign, Layers, Table as TableIcon, BarChart2, ChevronDown, ChevronRight, ChevronLeft } from "lucide-react";

const ReactECharts = dynamic( () => import( "echarts-for-react" ), {
    ssr: false,
    loading: () => <div className="h-[300px] sm:h-[340px] lg:h-[380px] w-full bg-white/[0.15] animate-pulse rounded-xl" />,
} );

// ─── Collapsible Section ─────────────────────────────────────────
function Section ( { id, icon, title, children, defaultOpen = true }: {
    id: string; icon: ReactNode; title: string; children: ReactNode; defaultOpen?: boolean;
} )
{
    const storageKey = `eth-section-${ id }`;
    const [ open, setOpen ] = useState( defaultOpen );
    const [ mounted, setMounted ] = useState( false );

    useEffect( () =>
    {
        const saved = localStorage.getItem( storageKey );
        if ( saved !== null ) setOpen( saved === "1" );
        setMounted( true );
    }, [ storageKey ] );

    const toggle = () =>
    {
        const next = !open;
        setOpen( next );
        localStorage.setItem( storageKey, next ? "1" : "0" );
    };

    const chevronIcon = open
        ? <ChevronDown className="w-4 h-4 text-cyan-400 shrink-0" />
        : <ChevronRight className="w-4 h-4 text-cyan-400 shrink-0" />;

    return (
        <div className="space-y-4">
            <button
                onClick={ toggle }
                className="flex items-center gap-2 w-full text-left group mt-6"
            >
                { mounted ? chevronIcon : <ChevronDown className="w-4 h-4 text-cyan-400 shrink-0" /> }
                <span className="flex items-center gap-2 text-lg sm:text-xl font-bold text-white/90">
                    { icon }
                    { title }
                </span>
                <span className="ml-auto text-[10px] text-white/30 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                    { open ? "Hide" : "Show" }
                </span>
            </button>
            { open && <div className="space-y-4 sm:space-y-6">{ children }</div> }
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────
export default function EtherumSummaryPage ()
{
    const [ loading, setLoading ] = useState( true );
    const [ error, setError ] = useState<string | null>( null );
    const [ summary, setSummary ] = useState( {
        totalStaked: 0,
        validators: 0,
        netFlowSinceShanghai: 0,
        stakedShare: 0,
        lidoShare: 0,
        netFlowExRewards: 0,
    } );

    useEffect( () =>
    {
        ( async () =>
        {
            try
            {
                const fetchQuery = async ( queryId: string ) =>
                {
                    const res = await fetch( `/api/dune/${ queryId }` );
                    if ( !res.ok ) throw new Error( "Failed" );
                    const json = await res.json();
                    return json.result?.rows || [];
                };

                const [ totalRows, validatorRows, flowRows, shareRows, lidoRows, flowExRows ] = await Promise.all( [
                    fetchQuery( "1933035" ),
                    fetchQuery( "1933036" ),
                    fetchQuery( "2368976" ),
                    fetchQuery( "1933048" ),
                    fetchQuery( "1933075" ),
                    fetchQuery( "2394493" ),
                ] );

                const pickNumber = ( row: any, keys: string[] ) =>
                {
                    if ( !row ) return 0;
                    for ( const k of keys )
                    {
                        if ( typeof row[ k ] === "number" ) return row[ k ];
                        const m = Object.keys( row ).find( x => x.toLowerCase() === k.toLowerCase() );
                        if ( m && typeof row[ m ] === "number" ) return row[ m ];
                    }
                    return 0;
                };

                const totalRow = totalRows[ 0 ];
                const validatorRow = validatorRows[ 0 ];
                const flowRow = flowRows[ 0 ];
                const shareRow = shareRows[ 0 ];
                const lidoRow = lidoRows[ 0 ];
                const flowExRow = flowExRows[ 0 ];

                setSummary( {
                    totalStaked: pickNumber( totalRow, [ "total_eth_deposited", "total_deposited", "total_staked" ] ),
                    validators: pickNumber( validatorRow, [ "validators" ] ),
                    netFlowSinceShanghai: pickNumber( flowRow, [ "flow", "stake_change" ] ),
                    stakedShare: pickNumber( shareRow, [ "total_validators", "staked_share", "percentage" ] ),
                    lidoShare: pickNumber( lidoRow, [ "lido_percentage" ] ),
                    netFlowExRewards: pickNumber( flowExRow, [ "flow", "stake_change" ] ),
                } );
            } catch
            {
                setError( "Failed to load data" );
            } finally
            {
                setLoading( false );
            }
        } )();
    }, [] );

    const fmt = ( n: any ) => typeof n === "number" ? new Intl.NumberFormat( "en-US", { maximumFractionDigits: 0 } ).format( n ) : n;
    const fmtCompact = ( n: any ) => typeof n === "number" ? new Intl.NumberFormat( "en-US", { notation: "compact", maximumFractionDigits: 2 } ).format( n ) : n;
    const fmtPct = ( n: any ) => typeof n === "number" ? `${ n.toFixed( 2 ) }%` : n;

    // ── Grid helper ────────────────────────────────────────────────
    const Grid2 = ( { children }: { children: ReactNode } ) => (
        <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:gap-6">{ children }</div>
    );

    return (
        <div className="px-3 py-4 sm:p-6 lg:px-8 xl:px-12 space-y-6 sm:space-y-8 mx-auto text-white w-full max-w-[1920px] min-h-screen pb-20">
            {/* Header */ }
            <header>
                <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
                    Ethereum Staking
                </h1>
                <p className="text-white/60 text-xs sm:text-sm mt-1">Staking Summary & Onchain Metrics</p>
            </header>

            {/* Stats Cards */ }
            { loading ? (
                <div className="flex items-center justify-center p-12">
                    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                </div>
            ) : error ? (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-200 text-sm">{ error }</div>
            ) : (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                        <StatCard icon={ <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" /> } label="ETH Staked" value={ fmtCompact( summary.totalStaked ) } />
                        <StatCard icon={ <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" /> } label="Validators" value={ fmt( summary.validators ) } />
                        <StatCard icon={ <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" /> } label="Net Flow Since Shanghai" value={ `${ fmtCompact( summary.netFlowSinceShanghai ) } ETH` } small />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-3">
                        <MiniStatCard label="Staked Share of ETH" value={ fmtPct( summary.stakedShare ) } />
                        <MiniStatCard label="Lido Marketshare" value={ fmtPct( summary.lidoShare ) } />
                        <MiniStatCard label="Net Flow (Excl Rewards)" value={ `${ fmtCompact( summary.netFlowExRewards ) } ETH` } />
                    </div>
                </>
            ) }

            {/* ETH Stakers Overview */ }
            <Section id="stakers-overview" icon={ <Layers className="w-5 h-5 text-cyan-400" /> } title="ETH Stakers Overview">
                <Grid2>
                    <DuneChartCard title="ETH Stakers" queryId="3383110" type="pie" valueKey="marketshare" />
                    <DuneTable queryId="3383110" title="ETH Stakers" />
                </Grid2>
            </Section>

            {/* Staking Flows */ }
            <Section id="staking-flows" icon={ <Activity className="w-5 h-5 text-cyan-400" /> } title="Ethereum Staking Flows">
                <Grid2>
                    <DuneChartCard title="Ethereum Staking Flows" queryId="2371805" type="stacked-bar" valueKey="amount" />
                    <DuneChartCard title="ETH Stakers - 1 Month Change" queryId="2394351" type="bar" valueKey="amount" />
                </Grid2>
            </Section>

            {/* Recent ETH Staked / Unstaked */ }
            <Section id="recent-staked" icon={ <Activity className="w-5 h-5 text-cyan-400" /> } title="Recent ETH Staked / Unstaked">
                <Grid2>
                    <DuneTable queryId="1945604" title="Stakers Δ - Past Week" />
                    <DuneTable queryId="1945549" title="Stakers Δ - Past Month" />
                    <DuneTable queryId="1945623" title="Stakers Δ - Past 6 Months" />
                </Grid2>
            </Section>

            {/* Participants Breakdown */ }
            <Section id="participants" icon={ <Layers className="w-5 h-5 text-cyan-400" /> } title="Participants Breakdown">
                <Grid2>
                    <DuneTable queryId="1941374" title="Liquid Staking Participants" />
                    <DuneTable queryId="1941390" title="CEXs Staking Participants" />
                    <DuneTable queryId="3548849" title="Liquid Restaking Participants" />
                    <DuneTable queryId="1941392" title="Staking Pools Participants" />
                </Grid2>
            </Section>

            {/* Entity Breakdown Charts */ }
            <Section id="entity-breakdown" icon={ <BarChart2 className="w-5 h-5 text-cyan-400" /> } title="Entity Breakdown">
                <Grid2>
                    <DuneChartCard title="ETH Deposited (Monthly)" queryId="1946487" type="stacked-bar" valueKey="deposited_eth" />
                    <DuneChartCard title="ETH Full Withdrawals (Monthly)" queryId="2394053" type="stacked-bar" valueKey="deposited_eth" />
                    <DuneChartCard title="ETH Staked by Entity" queryId="1937676" type="area" valueKey="cum_deposited_eth" />
                </Grid2>
            </Section>

            {/* Staking Deposits Marketshare */ }
            <Section id="staking-marketshare" icon={ <BarChart2 className="w-5 h-5 text-cyan-400" /> } title="Staking Deposits Marketshare">
                <Grid2>
                    <DuneChartCard title="ETH Staked (Marketshare)" queryId="1937676" type="area-percent" valueKey="cum_deposited_eth" />
                    <DuneChartCard title="ETH Staked by Category (Marketshare)" queryId="1941407" type="area-percent" valueKey="cum_deposited_eth" />
                </Grid2>
            </Section>

            {/* Breakdown by Category */ }
            <Section id="category-breakdown" icon={ <Layers className="w-5 h-5 text-cyan-400" /> } title="Breakdown by Category">
                <Grid2>
                    <DuneChartCard title="ETH Staked Breakdown" queryId="1941408" type="pie" valueKey="staked" />
                    <DuneTable queryId="1941408" title="ETH Staked Breakdown" />
                </Grid2>
                <Grid2>
                    <DuneChartCard title="ETH Staked by Category" queryId="1941407" type="area" valueKey="cum_deposited_eth" />
                    <DuneChartCard title="ETH Unstaked (Weekly)" queryId="2393992" type="stacked-bar" valueKey="deposited_eth" />
                </Grid2>
                <Grid2>
                    <DuneChartCard title="ETH Unstaked Share (Weekly)" queryId="2393992" type="area-percent" valueKey="deposited_eth" />
                </Grid2>
            </Section>

            {/* ETH Staked & Validators */ }
            <Section id="eth-staked-validators" icon={ <BarChart2 className="w-5 h-5 text-cyan-400" /> } title="ETH Staked & Validators">
                <Grid2>
                    <DuneChartCard title="ETH Staked" queryId="1933076" type="area" valueKey="cum_deposited_eth" />
                    <DuneChartCard title="Validators" queryId="1933076" type="line" valueKey="cum_validators" />
                </Grid2>
            </Section>

            {/* Economic Security */ }
            <Section id="economic-security" icon={ <DollarSign className="w-5 h-5 text-cyan-400" /> } title="Ethereum Economic Security">
                <Grid2>
                    <DuneChartCard title="Ethereum Economic Security" queryId="1933076" type="area" valueKey="economic_security" />
                    <DuneChartCard title="Staked Validators" queryId="1933076" type="line" valueKey="staked_validators" />
                </Grid2>
            </Section>

            {/* Last Deposits */ }
            <Section id="last-deposits" icon={ <TableIcon className="w-5 h-5 text-cyan-400" /> } title="Last Deposits">
                <DuneTable queryId="2394100" title="Last Deposits" />
            </Section>
        </div>
    );
}

// ─── Stat Card ───────────────────────────────────────────────────
function StatCard ( { icon, label, value, small }: { icon: ReactNode; label: string; value: any; small?: boolean } )
{
    return (
        <div className="rounded-lg sm:rounded-xl border border-white/20 bg-white/[0.18] p-2 sm:p-4 backdrop-blur-xl shadow-lg shadow-black/5">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2 text-white/70">
                { icon }
                <span className="text-[9px] sm:text-xs font-medium truncate">{ label }</span>
            </div>
            <div className={ `font-bold text-white ${ small ? "text-sm sm:text-xl md:text-2xl truncate" : "text-base sm:text-2xl md:text-3xl" }` }>
                { value }
            </div>
        </div>
    );
}

// ─── Mini Stat Card ──────────────────────────────────────────────
function MiniStatCard ( { label, value }: { label: string; value: any } )
{
    return (
        <div className="rounded-md sm:rounded-lg border border-white/20 bg-white/[0.18] p-1.5 sm:p-3 backdrop-blur-xl shadow-md shadow-black/5">
            <div className="text-[8px] sm:text-[10px] text-white/60 font-medium mb-0.5 uppercase tracking-wider truncate">{ label }</div>
            <div className="text-sm sm:text-lg font-bold text-white">{ value }</div>
        </div>
    );
}

// ─── View Mode Toggle Button ─────────────────────────────────────
function ViewToggle ( { mode, onChange }: { mode: "chart" | "table"; onChange: ( m: "chart" | "table" ) => void } )
{
    return (
        <div className="flex gap-1 bg-white/10 rounded-lg p-0.5">
            <button
                onClick={ () => onChange( "chart" ) }
                className={ `flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all ${ mode === "chart" ? "bg-cyan-500/80 text-white shadow" : "text-white/60 hover:text-white/90" }` }
            >
                <BarChart2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Chart</span>
            </button>
            <button
                onClick={ () => onChange( "table" ) }
                className={ `flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all ${ mode === "table" ? "bg-cyan-500/80 text-white shadow" : "text-white/60 hover:text-white/90" }` }
            >
                <TableIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Table</span>
            </button>
        </div>
    );
}

// ─── Inline Table View with Pagination ───────────────────────────
function InlineTable ( { data, title, rowsPerPage = 8 }: { data: any[]; title: string; rowsPerPage?: number } )
{
    const [ page, setPage ] = useState( 0 );
    if ( !data || data.length === 0 ) return null;

    const headers = Object.keys( data[ 0 ] ).filter( k =>
    {
        const sample = data[ 0 ][ k ];
        return !( typeof sample === "string" && sample.includes( "<a " ) );
    } );

    const totalPages = Math.ceil( data.length / rowsPerPage );
    const startIdx = page * rowsPerPage;
    const pageData = data.slice( startIdx, startIdx + rowsPerPage );

    const fmtNum = ( v: number ) => new Intl.NumberFormat( "en-US", { notation: v > 9999 ? "compact" : "standard", maximumFractionDigits: 2 } ).format( v );

    const fmtCell = ( v: any, k: string ) =>
    {
        if ( k.includes( "date" ) || k.includes( "time" ) || k.includes( "week" ) || k.includes( "month" ) )
            return String( v ).substring( 0, 10 );
        if ( typeof v === "string" && v.includes( "<a " ) )
        {
            const href = v.match( /href=["']?([^\s"'>]+)/ );
            if ( href ) return <a href={ href[ 1 ] } target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline">Link</a>;
            return "Link";
        }
        if ( typeof v === "string" && /^0x[a-fA-F0-9]{30,}$/.test( v ) )
            return <span title={ v }>{ v.slice( 0, 6 ) }..{ v.slice( -4 ) }</span>;
        if ( typeof v === "number" )
        {
            if ( k.includes( "percent" ) || k.includes( "change" ) || k.includes( "share" ) ) return `${ v.toFixed( 1 ) }%`;
            return fmtNum( v );
        }
        return v;
    };

    return (
        <div className="flex flex-col h-full">
            <div className="overflow-auto flex-1 overscroll-x-contain rounded-lg" style={ { WebkitOverflowScrolling: "touch" } }>
                <table className="w-full text-[10px] sm:text-[11px] text-left min-w-[300px]">
                    <thead className="text-[9px] sm:text-[10px] text-white/70 uppercase border-b border-white/[0.15] bg-white/[0.08] sticky top-0 z-10 backdrop-blur-xl">
                        <tr>
                            { headers.map( k => (
                                <th key={ k } className="px-1.5 sm:px-2 py-1.5 font-semibold whitespace-nowrap">{ k.replace( /_/g, " " ).slice( 0, 12 ) }</th>
                            ) ) }
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        { pageData.map( ( row, idx ) => (
                            <tr key={ idx } className="hover:bg-white/[0.05] transition-colors">
                                { headers.map( k => (
                                    <td key={ k } className={ `px-1.5 sm:px-2 py-1 whitespace-nowrap text-white/85 ${ typeof row[ k ] === "number" ? "font-mono font-medium" : "" }` }>
                                        { fmtCell( row[ k ], k ) }
                                    </td>
                                ) ) }
                            </tr>
                        ) ) }
                    </tbody>
                </table>
            </div>
            { totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 border-t border-white/10 mt-auto">
                    <span className="text-[9px] sm:text-[10px] text-white/50">{ startIdx + 1 }-{ Math.min( startIdx + rowsPerPage, data.length ) } / { data.length }</span>
                    <div className="flex gap-1">
                        <button
                            onClick={ () => setPage( p => Math.max( 0, p - 1 ) ) }
                            disabled={ page === 0 }
                            className="p-1 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                        <button
                            onClick={ () => setPage( p => Math.min( totalPages - 1, p + 1 ) ) }
                            disabled={ page >= totalPages - 1 }
                            className="p-1 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                    </div>
                </div>
            ) }
        </div>
    );
}

// ─── Unified Chart Card ──────────────────────────────────────────
function DuneChartCard ( { title, queryId, type, valueKey }: {
    title: string; queryId: string; type: string; valueKey?: string;
} )
{
    const [ data, setData ] = useState<any[]>( [] );
    const [ loading, setLoading ] = useState( true );
    const [ error, setError ] = useState( false );
    const [ viewMode, setViewMode ] = useState<"chart" | "table">( "chart" );

    useEffect( () =>
    {
        ( async () =>
        {
            setData( [] ); setLoading( true ); setError( false );
            try
            {
                const res = await fetch( `/api/dune/${ queryId }` );
                if ( !res.ok ) throw new Error( "Failed" );
                const json = await res.json();
                setData( json.result?.rows || [] );
            } catch { setError( true ); }
            finally { setLoading( false ); }
        } )();
    }, [ queryId ] );

    const option = useMemo( () =>
    {
        if ( !data || data.length === 0 ) return {};
        const keys = Object.keys( data[ 0 ] );
        const cleanKeys = keys.filter( k =>
        {
            const sample = data[ 0 ][ k ];
            return !( typeof sample === "string" && sample.includes( "<a " ) );
        } );
        const dateKey = cleanKeys.find( k =>
            k.toLowerCase().includes( "week" ) || k.toLowerCase().includes( "month" ) ||
            k.toLowerCase().includes( "date" ) || k.toLowerCase() === "day" || k.toLowerCase().includes( "time" )
        );
        const isPie = type.includes( "pie" );
        const isArea = type.includes( "area" );
        const isPercent = type.includes( "percent" );
        const colors = [ "#2dd4bf", "#3b82f6", "#8b5cf6", "#f43f5e", "#f59e0b", "#10b981", "#6366f1", "#ec4899", "#06b6d4", "#a78bfa" ];

        if ( isPie )
        {
            const nameKey = cleanKeys.find( k => k !== dateKey && typeof data[ 0 ][ k ] === "string" )
                || cleanKeys.find( k => k.toLowerCase().includes( "score" ) || k.toLowerCase().includes( "rank" ) || k.toLowerCase().includes( "segment" ) )
                || cleanKeys[ 0 ];
            const valK = valueKey || cleanKeys.find( k => typeof data[ 0 ][ k ] === "number" ) || cleanKeys[ 1 ];
            const cd = data.map( i => ( { name: String( i[ nameKey ] ), value: Number( i[ valK ] ) } ) ).sort( ( a, b ) => b.value - a.value );
            return {
                backgroundColor: "transparent",
                tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)", backgroundColor: "rgba(20,20,20,.9)", textStyle: { color: "#fff", fontSize: 12 } },
                legend: { type: "scroll", orient: "vertical", right: 0, top: "center", textStyle: { color: "#fff", fontSize: 12 } },
                series: [ { name: title, type: "pie", radius: [ "42%", "68%" ], center: [ "38%", "50%" ], itemStyle: { borderRadius: 4, borderColor: "rgba(255,255,255,0.15)", borderWidth: 2 }, label: { show: false }, data: cd } ],
            };
        }

        if ( !dateKey )
        {
            const scoreKey = cleanKeys.find( k => k.toLowerCase().includes( "rank" ) || k.toLowerCase().includes( "score" ) );
            if ( scoreKey && typeof data[ 0 ][ scoreKey ] === "number" )
            {
                const sorted = [ ...data ].sort( ( a, b ) => Number( b[ scoreKey ] ) - Number( a[ scoreKey ] ) );
                const labels = sorted.map( d => String( d[ scoreKey ] ) );
                const numKeys = cleanKeys.filter( k => k !== scoreKey && typeof data[ 0 ][ k ] === "number" );
                const barKey = numKeys.find( k => k.includes( "user" ) ) || numKeys[ 0 ];
                const lineKeys = numKeys.filter( k => k !== barKey );
                const mySeries: any[] = [
                    { name: barKey.replace( /_/g, " " ), type: "bar", data: sorted.map( d => d[ barKey ] ), itemStyle: { color: "#6366f1", borderRadius: [ 3, 3, 0, 0 ] }, barMaxWidth: 24, yAxisIndex: 0 },
                    ...lineKeys.map( ( k, i ) => ( {
                        name: k.replace( /_/g, " " ), type: "line", smooth: true, showSymbol: false,
                        data: sorted.map( d => d[ k ] ), itemStyle: { color: colors[ ( i + 1 ) % colors.length ] },
                        yAxisIndex: 1,
                    } ) ),
                ];
                return {
                    backgroundColor: "transparent",
                    tooltip: { trigger: "axis", axisPointer: { type: "cross" }, backgroundColor: "rgba(20,20,20,.9)", textStyle: { color: "#fff", fontSize: 12 } },
                    legend: { type: "scroll", top: 0, textStyle: { color: "#fff", fontSize: 12 } },
                    grid: { left: "3%", right: "8%", bottom: "8%", top: "15%", containLabel: true },
                    xAxis: { type: "category", data: labels, axisLabel: { color: "#fff", fontSize: 12 }, axisLine: { lineStyle: { color: "rgba(255,255,255,0.25)" } } },
                    yAxis: [
                        { type: "value", name: barKey.replace( /_/g, " " ), nameTextStyle: { color: "#fff", fontSize: 11 }, axisLabel: { color: "#fff", fontSize: 12 }, splitLine: { lineStyle: { color: "rgba(255,255,255,0.12)" } }, axisLine: { lineStyle: { color: "rgba(255,255,255,0.25)" } } },
                        { type: "value", name: "amount", nameTextStyle: { color: "#fff", fontSize: 11 }, axisLabel: { color: "#fff", fontSize: 12 }, splitLine: { show: false }, axisLine: { lineStyle: { color: "rgba(255,255,255,0.25)" } } },
                    ],
                    series: mySeries,
                };
            }

            const catKey = cleanKeys.find( k => typeof data[ 0 ][ k ] === "string" ) || cleanKeys[ 0 ];
            const valK = valueKey || cleanKeys.find( k => typeof data[ 0 ][ k ] === "number" ) || cleanKeys[ 1 ];
            const sorted = [ ...data ].sort( ( a, b ) => Number( b[ valK ] ) - Number( a[ valK ] ) ).slice( 0, 20 );
            const labels = sorted.map( d =>
            {
                const v = String( d[ catKey ] );
                return v.length > 16 ? v.slice( 0, 6 ) + "..." + v.slice( -6 ) : v;
            } );
            return {
                backgroundColor: "transparent",
                tooltip: {
                    trigger: "axis", axisPointer: { type: "shadow" }, backgroundColor: "rgba(20,20,20,.9)", textStyle: { color: "#fff", fontSize: 12 },
                    formatter: ( p: any ) => { const d = sorted[ p[ 0 ]?.dataIndex ]; return d ? `${ d[ catKey ] }<br/>${ valK.replace( /_/g, " " ) }: ${ Number( d[ valK ] ).toLocaleString() }` : ""; }
                },
                grid: { left: "3%", right: "4%", bottom: "8%", top: "8%", containLabel: true },
                xAxis: { type: "category", data: labels, axisLabel: { color: "#fff", fontSize: 11, rotate: 30 }, axisLine: { lineStyle: { color: "rgba(255,255,255,0.25)" } } },
                yAxis: { type: "value", axisLabel: { color: "#fff", fontSize: 12 }, splitLine: { lineStyle: { color: "rgba(255,255,255,0.12)" } }, axisLine: { lineStyle: { color: "rgba(255,255,255,0.25)" } } },
                series: [ { name: valK.replace( /_/g, " " ), type: "bar", data: sorted.map( d => d[ valK ] ), itemStyle: { color: colors[ 0 ], borderRadius: [ 4, 4, 0, 0 ] }, barMaxWidth: 40 } ],
            };
        }

        const sorted = [ ...data ].sort( ( a, b ) => new Date( a[ dateKey ] ).getTime() - new Date( b[ dateKey ] ).getTime() );
        const xData = sorted.map( d => d[ dateKey ] );
        const isLong = cleanKeys.some( k => k.toLowerCase().includes( "chain" ) || k.toLowerCase().includes( "segment" ) || k.toLowerCase().includes( "source" ) || k.toLowerCase().includes( "range" ) || k.toLowerCase().includes( "category" ) || k.toLowerCase().includes( "type" ) );

        let series: any[] = [];

        if ( !isLong || type === "line" || type === "area" )
        {
            const nk = valueKey ? [ valueKey ] : cleanKeys.filter( k => k !== dateKey && typeof data[ 0 ][ k ] === "number" );
            series = nk.map( ( k, i ) => ( {
                name: k.replace( /_/g, " " ), type: isArea ? "line" : ( type === "bar" ? "bar" : "line" ),
                areaStyle: isArea ? { opacity: 0.2 } : undefined, smooth: true, showSymbol: false,
                data: sorted.map( d => d[ k ] ), itemStyle: { color: colors[ i % colors.length ] },
            } ) );
        } else
        {
            const catKey = cleanKeys.find( k => k !== dateKey && typeof data[ 0 ][ k ] === "string" );
            const valK = valueKey || cleanKeys.find( k => k !== dateKey && typeof data[ 0 ][ k ] === "number" );
            if ( catKey && valK )
            {
                const uDates = Array.from( new Set( data.map( d => d[ dateKey ] ) ) ).sort();
                const uCats = Array.from( new Set( data.map( d => d[ catKey ] ) ) );
                const pivot: Record<string, Record<string, number>> = {};
                data.forEach( d => { const t = d[ dateKey ]; if ( !pivot[ t ] ) pivot[ t ] = {}; pivot[ t ][ d[ catKey ] ] = d[ valK ]; } );
                const is100 = type.includes( "100" ) || isPercent;
                const totalsByDate = isPercent
                    ? uDates.map( t => uCats.reduce( ( sum, cat ) => sum + ( pivot[ t ]?.[ cat as string ] || 0 ), 0 ) )
                    : null;
                series = uCats.map( ( cat, i ) => ( {
                    name: cat, type: isArea || type.includes( "area" ) ? "line" : "bar",
                    stack: "total", areaStyle: ( isArea || type.includes( "area" ) ) ? { opacity: is100 ? 1 : 0.8 } : undefined,
                    barMaxWidth: 30, showSymbol: false,
                    data: uDates.map( ( t, idx ) =>
                    {
                        const raw = pivot[ t ]?.[ cat as string ] || 0;
                        if ( !isPercent ) return raw;
                        const total = totalsByDate?.[ idx ] || 0;
                        return total === 0 ? 0 : ( raw / total ) * 100;
                    } ),
                    itemStyle: { color: colors[ i % colors.length ] }, emphasis: { focus: "series" },
                    lineStyle: type.includes( "area" ) ? { width: 0 } : undefined,
                } ) );
                return {
                    backgroundColor: "transparent",
                    tooltip: { trigger: "axis", axisPointer: { type: "cross" }, backgroundColor: "rgba(20,20,20,.9)", textStyle: { color: "#fff", fontSize: 12 } },
                    legend: { type: "scroll", top: 0, textStyle: { color: "#fff", fontSize: 12 } },
                    grid: { left: "3%", right: "4%", bottom: "8%", top: "15%", containLabel: true },
                    xAxis: { type: "category", boundaryGap: !isArea, data: uDates.map( ( d: any ) => String( d ).substring( 0, 10 ) ), axisLabel: { color: "#fff", fontSize: 12 }, axisLine: { lineStyle: { color: "rgba(255,255,255,0.25)" } } },
                    yAxis: { type: "value", axisLabel: { color: "#fff", fontSize: 12 }, splitLine: { lineStyle: { color: "rgba(255,255,255,0.12)" } }, axisLine: { lineStyle: { color: "rgba(255,255,255,0.25)" } }, max: is100 ? 100 : undefined },
                    series,
                };
            }
        }

        return {
            backgroundColor: "transparent",
            tooltip: { trigger: "axis", axisPointer: { type: "cross" }, backgroundColor: "rgba(20,20,20,.9)", textStyle: { color: "#fff", fontSize: 12 } },
            legend: { show: series.length > 1, top: 0, textStyle: { color: "#fff", fontSize: 12 } },
            grid: { left: "3%", right: "4%", bottom: "8%", top: "15%", containLabel: true },
            xAxis: { type: "category", data: xData.map( ( d: any ) => String( d ).substring( 0, 10 ) ), axisLabel: { color: "#fff", fontSize: 12 }, axisLine: { lineStyle: { color: "rgba(255,255,255,0.25)" } } },
            yAxis: { type: "value", axisLabel: { color: "#fff", fontSize: 12 }, splitLine: { lineStyle: { color: "rgba(255,255,255,0.12)" } }, axisLine: { lineStyle: { color: "rgba(255,255,255,0.25)" } } },
            series,
        };
    }, [ data, title, type, valueKey ] );

    return (
        <div className="rounded-lg sm:rounded-xl border border-white/20 bg-white/[0.18] p-2 sm:p-4 backdrop-blur-xl shadow-lg shadow-black/5 h-[280px] sm:h-[320px] lg:h-[360px] flex flex-col hover:bg-white/[0.24] transition-all duration-300">
            <div className="flex items-center justify-between gap-1 sm:gap-2 mb-2 border-b border-white/[0.12] pb-1.5 sm:pb-2">
                <h3 className="text-white font-semibold text-[10px] sm:text-[12px] uppercase tracking-wider truncate" title={ title }>
                    { title }
                </h3>
                <ViewToggle mode={ viewMode } onChange={ setViewMode } />
            </div>
            <div className="flex-1 w-full overflow-hidden">
                { loading ? (
                    <div className="flex w-full h-full items-center justify-center"><Loader2 className="w-5 h-5 text-white/20 animate-spin" /></div>
                ) : error ? (
                    <div className="flex w-full h-full items-center justify-center text-red-400/50 text-xs flex-col gap-2">
                        <Activity className="w-5 h-5 opacity-50" /><span>Unable to load</span>
                    </div>
                ) : viewMode === "table" ? (
                    <InlineTable data={ data } title={ title } />
                ) : (
                    <ReactECharts option={ option } style={ { height: "100%", width: "100%" } } theme="dark" opts={ { renderer: "canvas" } } />
                ) }
            </div>
        </div>
    );
}

// ─── Table Component ─────────────────────────────────────────────
function DuneTable ( { queryId, title }: { queryId: string; title: string } )
{
    const [ rows, setRows ] = useState<any[]>( [] );
    const [ loading, setLoading ] = useState( true );
    const [ error, setError ] = useState( false );
    const [ page, setPage ] = useState( 0 );
    const rowsPerPage = 15;

    useEffect( () =>
    {
        ( async () =>
        {
            try
            {
                const res = await fetch( `/api/dune/${ queryId }` );
                if ( !res.ok ) throw new Error( "Failed" );
                const json = await res.json();
                setRows( json.result?.rows || [] );
            } catch { setError( true ); }
            finally { setLoading( false ); }
        } )();
    }, [ queryId ] );

    if ( loading ) return <div className="h-36 sm:h-48 w-full bg-white/[0.02] animate-pulse rounded-xl" />;
    if ( error || rows.length === 0 ) return null;

    const headers = Object.keys( rows[ 0 ] );
    const totalPages = Math.ceil( rows.length / rowsPerPage );
    const startIdx = page * rowsPerPage;
    const pageData = rows.slice( startIdx, startIdx + rowsPerPage );

    const fmtNum = ( v: number ) => new Intl.NumberFormat( "en-US", { notation: v > 9999 ? "compact" : "standard", maximumFractionDigits: 2 } ).format( v );
    const fmtCell = ( v: any, k: string ) =>
    {
        if ( k.includes( "date" ) || k.includes( "time" ) || k.includes( "week" ) || k.includes( "month" ) )
            return String( v ).substring( 0, 10 );
        if ( typeof v === "string" && v.includes( "<a " ) )
        {
            const href = v.match( /href=["']?([^\s"'>]+)/ );
            if ( href ) return <a href={ href[ 1 ] } target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline">Link</a>;
            return "Link";
        }
        if ( typeof v === "string" && /^0x[a-fA-F0-9]{30,}$/.test( v ) )
            return <span title={ v }>{ v.slice( 0, 6 ) }..{ v.slice( -4 ) }</span>;
        if ( typeof v === "number" )
        {
            if ( k.includes( "percent" ) || k.includes( "change" ) || k.includes( "share" ) ) return `${ v.toFixed( 1 ) }%`;
            return fmtNum( v );
        }
        return v;
    };

    return (
        <div className="rounded-lg sm:rounded-xl border border-white/20 bg-white/[0.18] backdrop-blur-xl shadow-lg shadow-black/5 overflow-hidden h-[300px] sm:h-[380px] lg:h-[420px] flex flex-col">
            <div className="p-2 sm:p-3 border-b border-white/[0.12] bg-white/[0.08] shrink-0 flex items-center justify-between">
                <h3 className="font-semibold text-white/90 text-[10px] sm:text-[12px] uppercase tracking-wide">{ title }</h3>
                { totalPages > 1 && (
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] sm:text-[10px] text-white/50">{ startIdx + 1 }-{ Math.min( startIdx + rowsPerPage, rows.length ) } / { rows.length }</span>
                        <div className="flex gap-1">
                            <button onClick={ () => setPage( p => Math.max( 0, p - 1 ) ) } disabled={ page === 0 }
                                className="p-0.5 sm:p-1 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                            <button onClick={ () => setPage( p => Math.min( totalPages - 1, p + 1 ) ) } disabled={ page >= totalPages - 1 }
                                className="p-0.5 sm:p-1 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                        </div>
                    </div>
                ) }
            </div>
            <div className="overflow-auto flex-1 overscroll-x-contain" style={ { WebkitOverflowScrolling: "touch" } }>
                <table className="w-full text-[10px] sm:text-[11px] text-left relative min-w-[400px]">
                    <thead className="text-[9px] sm:text-[10px] text-white/70 uppercase border-b border-white/[0.15] bg-white/[0.12] sticky top-0 z-10 backdrop-blur-xl">
                        <tr>
                            { headers.map( k => (
                                <th key={ k } className="px-2 sm:px-3 py-1.5 sm:py-2 font-semibold whitespace-nowrap">{ k.replace( /_/g, " " ).slice( 0, 14 ) }</th>
                            ) ) }
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        { pageData.map( ( row, idx ) => (
                            <tr key={ idx } className="hover:bg-white/[0.05] transition-colors">
                                { headers.map( k => (
                                    <td key={ k } className={ `px-2 sm:px-3 py-1 sm:py-1.5 whitespace-nowrap text-white/85 ${ typeof row[ k ] === "number" ? "font-mono font-medium" : "" }` }>
                                        { fmtCell( row[ k ], k ) }
                                    </td>
                                ) ) }
                            </tr>
                        ) ) }
                    </tbody>
                </table>
            </div>
        </div>
    );
}
