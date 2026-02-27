"use client";

import { useEffect, useMemo, useState, ReactNode } from "react";
import dynamic from "next/dynamic";
import { Loader2, Layers, Table as TableIcon, BarChart2, ChevronDown, ChevronRight } from "lucide-react";

const ReactECharts = dynamic( () => import( "echarts-for-react" ), {
    ssr: false,
    loading: () => <div className="h-[300px] sm:h-[340px] lg:h-[380px] w-full bg-white/[0.15] animate-pulse rounded-xl" />,
} );

// ─── Collapsible Section ─────────────────────────────────────────
function Section ( { id, icon, title, children, defaultOpen = true }: {
    id: string; icon: ReactNode; title: string; children: ReactNode; defaultOpen?: boolean;
} )
{
    const storageKey = `stablecoins-section-${ id }`;
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
export default function StablecoinsPage ()
{
    const [ ethTotals, setEthTotals ] = useState( { total: 0, change30d: 0 } );
    const [ arbitrumTotals, setArbitrumTotals ] = useState( { total: 0, change30d: 0 } );
    const [ polygonTotals, setPolygonTotals ] = useState( { total: 0, change30d: 0 } );
    const [ bscTotals, setBscTotals ] = useState( { total: 0, change30d: 0 } );
    const [ avalancheTotals, setAvalancheTotals ] = useState( { total: 0, change30d: 0 } );
    const [ baseTotals, setBaseTotals ] = useState( { total: 0, change30d: 0 } );
    const [ optimismTotals, setOptimismTotals ] = useState( { total: 0, change30d: 0 } );
    const [ tronTotals, setTronTotals ] = useState( { total: 0, change30d: 0 } );
    const [ solanaTotals, setSolanaTotals ] = useState( { total: 0, change30d: 0 } );
    const [ globalTotal, setGlobalTotal ] = useState( 0 );

    useEffect( () =>
    {
        ( async () =>
        {
            try
            {
                const res = await fetch( "/api/dune/3556363" );
                if ( !res.ok ) throw new Error( "Failed" );
                const json = await res.json();
                const rows = json.result?.rows || [];
                if ( rows.length === 0 ) return;

                const keys = Object.keys( rows[ 0 ] );
                const dateKey = keys.find( k => k.toLowerCase().includes( "dt" ) || k.toLowerCase().includes( "date" ) || k.toLowerCase().includes( "time" ) );
                const totalKey = keys.find( k => k.toLowerCase().includes( "balance_total" ) ) || "balance_total";

                if ( !dateKey || !( totalKey in rows[ 0 ] ) ) return;

                const totalsByDate = new Map<string, number>();
                rows.forEach( ( r: any ) =>
                {
                    const d = String( r[ dateKey ] ).substring( 0, 10 );
                    if ( !totalsByDate.has( d ) )
                    {
                        totalsByDate.set( d, Number( r[ totalKey ] ) || 0 );
                    }
                } );

                const dates = Array.from( totalsByDate.keys() ).sort();
                if ( dates.length === 0 ) return;

                const lastDate = dates[ dates.length - 1 ];
                const latest = totalsByDate.get( lastDate ) || 0;

                const target = new Date( lastDate );
                target.setDate( target.getDate() - 30 );
                const targetMs = target.getTime();

                let closestDate = dates[ 0 ];
                let closestDiff = Math.abs( new Date( closestDate ).getTime() - targetMs );
                for ( const d of dates )
                {
                    const diff = Math.abs( new Date( d ).getTime() - targetMs );
                    if ( diff < closestDiff )
                    {
                        closestDiff = diff;
                        closestDate = d;
                    }
                }

                const prev = totalsByDate.get( closestDate ) || 0;
                const change30d = prev ? ( ( latest - prev ) / prev ) * 100 : 0;

                setEthTotals( { total: latest, change30d } );
            } catch
            {
                // ignore
            }
        } )();
    }, [] );

    useEffect( () =>
    {
        ( async () =>
        {
            try
            {
                const res = await fetch( "/api/dune/3578388" );
                if ( !res.ok ) throw new Error( "Failed" );
                const json = await res.json();
                const rows = json.result?.rows || [];
                if ( rows.length === 0 ) return;

                const keys = Object.keys( rows[ 0 ] );
                const dateKey = keys.find( k => k.toLowerCase().includes( "dt" ) || k.toLowerCase().includes( "date" ) || k.toLowerCase().includes( "time" ) );
                const totalKey = keys.find( k => k.toLowerCase().includes( "balance_total" ) ) || "balance_total";

                if ( !dateKey || !( totalKey in rows[ 0 ] ) ) return;

                const totalsByDate = new Map<string, number>();
                rows.forEach( ( r: any ) =>
                {
                    const d = String( r[ dateKey ] ).substring( 0, 10 );
                    if ( !totalsByDate.has( d ) )
                    {
                        totalsByDate.set( d, Number( r[ totalKey ] ) || 0 );
                    }
                } );

                const dates = Array.from( totalsByDate.keys() ).sort();
                if ( dates.length === 0 ) return;

                const lastDate = dates[ dates.length - 1 ];
                const latest = totalsByDate.get( lastDate ) || 0;

                const target = new Date( lastDate );
                target.setDate( target.getDate() - 30 );
                const targetMs = target.getTime();

                let closestDate = dates[ 0 ];
                let closestDiff = Math.abs( new Date( closestDate ).getTime() - targetMs );
                for ( const d of dates )
                {
                    const diff = Math.abs( new Date( d ).getTime() - targetMs );
                    if ( diff < closestDiff )
                    {
                        closestDiff = diff;
                        closestDate = d;
                    }
                }

                const prev = totalsByDate.get( closestDate ) || 0;
                const change30d = prev ? ( ( latest - prev ) / prev ) * 100 : 0;

                setArbitrumTotals( { total: latest, change30d } );
            } catch
            {
                // ignore
            }
        } )();
    }, [] );

    useEffect( () =>
    {
        ( async () =>
        {
            try
            {
                const res = await fetch( "/api/dune/3576048" );
                if ( !res.ok ) throw new Error( "Failed" );
                const json = await res.json();
                const rows = json.result?.rows || [];
                if ( rows.length === 0 ) return;

                const keys = Object.keys( rows[ 0 ] );
                const dateKey = keys.find( k => k.toLowerCase().includes( "dt" ) || k.toLowerCase().includes( "date" ) || k.toLowerCase().includes( "time" ) );
                const totalKey = keys.find( k => k.toLowerCase().includes( "balance_total" ) ) || "balance_total";

                if ( !dateKey || !( totalKey in rows[ 0 ] ) ) return;

                const totalsByDate = new Map<string, number>();
                rows.forEach( ( r: any ) =>
                {
                    const d = String( r[ dateKey ] ).substring( 0, 10 );
                    if ( !totalsByDate.has( d ) )
                    {
                        totalsByDate.set( d, Number( r[ totalKey ] ) || 0 );
                    }
                } );

                const dates = Array.from( totalsByDate.keys() ).sort();
                if ( dates.length === 0 ) return;

                const lastDate = dates[ dates.length - 1 ];
                const latest = totalsByDate.get( lastDate ) || 0;

                const target = new Date( lastDate );
                target.setDate( target.getDate() - 30 );
                const targetMs = target.getTime();

                let closestDate = dates[ 0 ];
                let closestDiff = Math.abs( new Date( closestDate ).getTime() - targetMs );
                for ( const d of dates )
                {
                    const diff = Math.abs( new Date( d ).getTime() - targetMs );
                    if ( diff < closestDiff )
                    {
                        closestDiff = diff;
                        closestDate = d;
                    }
                }

                const prev = totalsByDate.get( closestDate ) || 0;
                const change30d = prev ? ( ( latest - prev ) / prev ) * 100 : 0;

                setPolygonTotals( { total: latest, change30d } );
            } catch
            {
                // ignore
            }
        } )();
    }, [] );

    useEffect( () =>
    {
        ( async () =>
        {
            try
            {
                const res = await fetch( "/api/dune/3578471" );
                if ( !res.ok ) throw new Error( "Failed" );
                const json = await res.json();
                const rows = json.result?.rows || [];
                if ( rows.length === 0 ) return;

                const keys = Object.keys( rows[ 0 ] );
                const dateKey = keys.find( k => k.toLowerCase().includes( "dt" ) || k.toLowerCase().includes( "date" ) || k.toLowerCase().includes( "time" ) );
                const totalKey = keys.find( k => k.toLowerCase().includes( "balance_total" ) ) || "balance_total";

                if ( !dateKey || !( totalKey in rows[ 0 ] ) ) return;

                const totalsByDate = new Map<string, number>();
                rows.forEach( ( r: any ) =>
                {
                    const d = String( r[ dateKey ] ).substring( 0, 10 );
                    if ( !totalsByDate.has( d ) )
                    {
                        totalsByDate.set( d, Number( r[ totalKey ] ) || 0 );
                    }
                } );

                const dates = Array.from( totalsByDate.keys() ).sort();
                if ( dates.length === 0 ) return;

                const lastDate = dates[ dates.length - 1 ];
                const latest = totalsByDate.get( lastDate ) || 0;

                const target = new Date( lastDate );
                target.setDate( target.getDate() - 30 );
                const targetMs = target.getTime();

                let closestDate = dates[ 0 ];
                let closestDiff = Math.abs( new Date( closestDate ).getTime() - targetMs );
                for ( const d of dates )
                {
                    const diff = Math.abs( new Date( d ).getTime() - targetMs );
                    if ( diff < closestDiff )
                    {
                        closestDiff = diff;
                        closestDate = d;
                    }
                }

                const prev = totalsByDate.get( closestDate ) || 0;
                const change30d = prev ? ( ( latest - prev ) / prev ) * 100 : 0;

                setBscTotals( { total: latest, change30d } );
            } catch
            {
                // ignore
            }
        } )();
    }, [] );

    useEffect( () =>
    {
        ( async () =>
        {
            try
            {
                const res = await fetch( "/api/dune/3578528" );
                if ( !res.ok ) throw new Error( "Failed" );
                const json = await res.json();
                const rows = json.result?.rows || [];
                if ( rows.length === 0 ) return;

                const keys = Object.keys( rows[ 0 ] );
                const dateKey = keys.find( k => k.toLowerCase().includes( "dt" ) || k.toLowerCase().includes( "date" ) || k.toLowerCase().includes( "time" ) );
                const totalKey = keys.find( k => k.toLowerCase().includes( "balance_total" ) ) || "balance_total";

                if ( !dateKey || !( totalKey in rows[ 0 ] ) ) return;

                const totalsByDate = new Map<string, number>();
                rows.forEach( ( r: any ) =>
                {
                    const d = String( r[ dateKey ] ).substring( 0, 10 );
                    if ( !totalsByDate.has( d ) )
                    {
                        totalsByDate.set( d, Number( r[ totalKey ] ) || 0 );
                    }
                } );

                const dates = Array.from( totalsByDate.keys() ).sort();
                if ( dates.length === 0 ) return;

                const lastDate = dates[ dates.length - 1 ];
                const latest = totalsByDate.get( lastDate ) || 0;

                const target = new Date( lastDate );
                target.setDate( target.getDate() - 30 );
                const targetMs = target.getTime();

                let closestDate = dates[ 0 ];
                let closestDiff = Math.abs( new Date( closestDate ).getTime() - targetMs );
                for ( const d of dates )
                {
                    const diff = Math.abs( new Date( d ).getTime() - targetMs );
                    if ( diff < closestDiff )
                    {
                        closestDiff = diff;
                        closestDate = d;
                    }
                }

                const prev = totalsByDate.get( closestDate ) || 0;
                const change30d = prev ? ( ( latest - prev ) / prev ) * 100 : 0;

                setAvalancheTotals( { total: latest, change30d } );
            } catch
            {
                // ignore
            }
        } )();
    }, [] );

    useEffect( () =>
    {
        ( async () =>
        {
            try
            {
                const res = await fetch( "/api/dune/3694984" );
                if ( !res.ok ) throw new Error( "Failed" );
                const json = await res.json();
                const rows = json.result?.rows || [];
                if ( rows.length === 0 ) return;

                const keys = Object.keys( rows[ 0 ] );
                const dateKey = keys.find( k => k.toLowerCase().includes( "dt" ) || k.toLowerCase().includes( "date" ) || k.toLowerCase().includes( "time" ) );
                const totalKey = keys.find( k => k.toLowerCase().includes( "balance_total" ) ) || "balance_total";

                if ( !dateKey || !( totalKey in rows[ 0 ] ) ) return;

                const totalsByDate = new Map<string, number>();
                rows.forEach( ( r: any ) =>
                {
                    const d = String( r[ dateKey ] ).substring( 0, 10 );
                    if ( !totalsByDate.has( d ) )
                    {
                        totalsByDate.set( d, Number( r[ totalKey ] ) || 0 );
                    }
                } );

                const dates = Array.from( totalsByDate.keys() ).sort();
                if ( dates.length === 0 ) return;

                const lastDate = dates[ dates.length - 1 ];
                const latest = totalsByDate.get( lastDate ) || 0;

                const target = new Date( lastDate );
                target.setDate( target.getDate() - 30 );
                const targetMs = target.getTime();

                let closestDate = dates[ 0 ];
                let closestDiff = Math.abs( new Date( closestDate ).getTime() - targetMs );
                for ( const d of dates )
                {
                    const diff = Math.abs( new Date( d ).getTime() - targetMs );
                    if ( diff < closestDiff )
                    {
                        closestDiff = diff;
                        closestDate = d;
                    }
                }

                const prev = totalsByDate.get( closestDate ) || 0;
                const change30d = prev ? ( ( latest - prev ) / prev ) * 100 : 0;

                setBaseTotals( { total: latest, change30d } );
            } catch
            {
                // ignore
            }
        } )();
    }, [] );

    useEffect( () =>
    {
        ( async () =>
        {
            try
            {
                const res = await fetch( "/api/dune/3606698" );
                if ( !res.ok ) throw new Error( "Failed" );
                const json = await res.json();
                const rows = json.result?.rows || [];
                if ( rows.length === 0 ) return;

                const keys = Object.keys( rows[ 0 ] );
                const dateKey = keys.find( k => k.toLowerCase().includes( "dt" ) || k.toLowerCase().includes( "date" ) || k.toLowerCase().includes( "time" ) );
                const totalKey = keys.find( k => k.toLowerCase().includes( "balance_total" ) ) || "balance_total";

                if ( !dateKey || !( totalKey in rows[ 0 ] ) ) return;

                const totalsByDate = new Map<string, number>();
                rows.forEach( ( r: any ) =>
                {
                    const d = String( r[ dateKey ] ).substring( 0, 10 );
                    if ( !totalsByDate.has( d ) )
                    {
                        totalsByDate.set( d, Number( r[ totalKey ] ) || 0 );
                    }
                } );

                const dates = Array.from( totalsByDate.keys() ).sort();
                if ( dates.length === 0 ) return;

                const lastDate = dates[ dates.length - 1 ];
                const latest = totalsByDate.get( lastDate ) || 0;

                const target = new Date( lastDate );
                target.setDate( target.getDate() - 30 );
                const targetMs = target.getTime();

                let closestDate = dates[ 0 ];
                let closestDiff = Math.abs( new Date( closestDate ).getTime() - targetMs );
                for ( const d of dates )
                {
                    const diff = Math.abs( new Date( d ).getTime() - targetMs );
                    if ( diff < closestDiff )
                    {
                        closestDiff = diff;
                        closestDate = d;
                    }
                }

                const prev = totalsByDate.get( closestDate ) || 0;
                const change30d = prev ? ( ( latest - prev ) / prev ) * 100 : 0;

                setOptimismTotals( { total: latest, change30d } );
            } catch
            {
                // ignore
            }
        } )();
    }, [] );

    useEffect( () =>
    {
        ( async () =>
        {
            try
            {
                const res = await fetch( "/api/dune/3622952" );
                if ( !res.ok ) throw new Error( "Failed" );
                const json = await res.json();
                const rows = json.result?.rows || [];
                if ( rows.length === 0 ) return;

                const keys = Object.keys( rows[ 0 ] );
                const dateKey = keys.find( k => k.toLowerCase().includes( "dt" ) || k.toLowerCase().includes( "date" ) || k.toLowerCase().includes( "time" ) );
                const totalKey = keys.find( k => k.toLowerCase().includes( "balance_total" ) ) || "balance_total";

                if ( !dateKey || !( totalKey in rows[ 0 ] ) ) return;

                const totalsByDate = new Map<string, number>();
                rows.forEach( ( r: any ) =>
                {
                    const d = String( r[ dateKey ] ).substring( 0, 10 );
                    if ( !totalsByDate.has( d ) )
                    {
                        totalsByDate.set( d, Number( r[ totalKey ] ) || 0 );
                    }
                } );

                const dates = Array.from( totalsByDate.keys() ).sort();
                if ( dates.length === 0 ) return;

                const lastDate = dates[ dates.length - 1 ];
                const latest = totalsByDate.get( lastDate ) || 0;

                const target = new Date( lastDate );
                target.setDate( target.getDate() - 30 );
                const targetMs = target.getTime();

                let closestDate = dates[ 0 ];
                let closestDiff = Math.abs( new Date( closestDate ).getTime() - targetMs );
                for ( const d of dates )
                {
                    const diff = Math.abs( new Date( d ).getTime() - targetMs );
                    if ( diff < closestDiff )
                    {
                        closestDiff = diff;
                        closestDate = d;
                    }
                }

                const prev = totalsByDate.get( closestDate ) || 0;
                const change30d = prev ? ( ( latest - prev ) / prev ) * 100 : 0;

                setTronTotals( { total: latest, change30d } );
            } catch
            {
                // ignore
            }
        } )();
    }, [] );

    useEffect( () =>
    {
        ( async () =>
        {
            try
            {
                const res = await fetch( "/api/dune/3978784" );
                if ( !res.ok ) throw new Error( "Failed" );
                const json = await res.json();
                const rows = json.result?.rows || [];
                if ( rows.length === 0 ) return;

                const keys = Object.keys( rows[ 0 ] );
                const dateKey = keys.find( k => k.toLowerCase().includes( "dt" ) || k.toLowerCase().includes( "date" ) || k.toLowerCase().includes( "time" ) );
                const totalKey = keys.find( k => k.toLowerCase().includes( "balance_total" ) ) || "balance_total";

                if ( !dateKey || !( totalKey in rows[ 0 ] ) ) return;

                const totalsByDate = new Map<string, number>();
                rows.forEach( ( r: any ) =>
                {
                    const d = String( r[ dateKey ] ).substring( 0, 10 );
                    if ( !totalsByDate.has( d ) )
                    {
                        totalsByDate.set( d, Number( r[ totalKey ] ) || 0 );
                    }
                } );

                const dates = Array.from( totalsByDate.keys() ).sort();
                if ( dates.length === 0 ) return;

                const lastDate = dates[ dates.length - 1 ];
                const latest = totalsByDate.get( lastDate ) || 0;

                const target = new Date( lastDate );
                target.setDate( target.getDate() - 30 );
                const targetMs = target.getTime();

                let closestDate = dates[ 0 ];
                let closestDiff = Math.abs( new Date( closestDate ).getTime() - targetMs );
                for ( const d of dates )
                {
                    const diff = Math.abs( new Date( d ).getTime() - targetMs );
                    if ( diff < closestDiff )
                    {
                        closestDiff = diff;
                        closestDate = d;
                    }
                }

                const prev = totalsByDate.get( closestDate ) || 0;
                const change30d = prev ? ( ( latest - prev ) / prev ) * 100 : 0;

                setSolanaTotals( { total: latest, change30d } );
            } catch
            {
                // ignore
            }
        } )();
    }, [] );

    useEffect( () =>
    {
        ( async () =>
        {
            try
            {
                const res = await fetch( "/api/dune/3695803" );
                if ( !res.ok ) throw new Error( "Failed" );
                const json = await res.json();
                const rows = json.result?.rows || [];
                if ( rows.length === 0 ) return;

                const row = rows[ 0 ];
                const key = Object.keys( row ).find( k => k.toLowerCase() === "total" ) || "Total";
                if ( key in row ) setGlobalTotal( Number( row[ key ] ) || 0 );
            } catch
            {
                // ignore
            }
        } )();
    }, [] );

    const fmtUSD = ( n: number ) => new Intl.NumberFormat( "en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 2 } ).format( n );
    const fmtPct = ( n: number ) => `${ n.toFixed( 2 ) }%`;

    const Grid2 = ( { children }: { children: ReactNode } ) => (
        <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:gap-6">{ children }</div>
    );

    return (
        <div className="px-3 py-4 sm:p-6 lg:px-8 xl:px-12 space-y-6 sm:space-y-8 mx-auto text-white w-full max-w-[1920px] min-h-screen pb-20">
            {/* Header */ }
            <header>
                <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
                    Stablecoins
                </h1>
                <p className="text-white/60 text-xs sm:text-sm mt-1">Composition, Marketshare & Activity</p>
            </header>

            {/* Ethereum Counters */ }
            <Section id="eth-counters" icon={ <Layers className="w-5 h-5 text-cyan-400" /> } title="Ethereum Overview">
                <Grid2>
                    <MetricCard title="Ethereum Stablecoins TVL" value={ fmtUSD( ethTotals.total ) } />
                    <MetricCard title="TVL Change (30D)" value={ fmtPct( ethTotals.change30d ) } accent={ ethTotals.change30d >= 0 ? "text-emerald-400" : "text-rose-400" } />
                </Grid2>
            </Section>

            {/* Stablecoins Composition - Ethereum */ }
            <Section id="eth-composition" icon={ <BarChart2 className="w-5 h-5 text-cyan-400" /> } title="Stablecoins Composition - Ethereum">
                <Grid2>
                    <StableChartCard title="TVL by Asset" queryId="3556363" type="area" valueKey="balance" categoryKey="asset" />
                    <StableChartCard title="Dominance" queryId="3556363" type="area-percent" valueKey="balance" categoryKey="asset" />
                    <StableChartCard title="Lineage" queryId="3556363" type="line" valueKey="balance_total" />
                    <StableChartCard title="Volume" queryId="3556363" type="bar" valueKey="volume" categoryKey="asset" />
                    <StableChartCard title="Transactions" queryId="3556363" type="bar" valueKey="txn_count" categoryKey="asset" />
                </Grid2>
            </Section>

            {/* Stablecoins Composition - Arbitrum */ }
            <Section id="arb-overview" icon={ <Layers className="w-5 h-5 text-cyan-400" /> } title="Stablecoins Composition - Arbitrum">
                <Grid2>
                    <MetricCard title="Arbitrum Stablecoins TVL" value={ fmtUSD( arbitrumTotals.total ) } />
                    <MetricCard title="TVL Change (30D)" value={ fmtPct( arbitrumTotals.change30d ) } accent={ arbitrumTotals.change30d >= 0 ? "text-emerald-400" : "text-rose-400" } />
                </Grid2>
                <Grid2>
                    <StableChartCard title="TVL by Asset" queryId="3578388" type="area" valueKey="balance" categoryKey="asset" />
                    <StableChartCard title="Dominance" queryId="3578388" type="area-percent" valueKey="balance" categoryKey="asset" />
                    <StableChartCard title="Volume" queryId="3578388" type="bar" valueKey="volume" categoryKey="asset" />
                    <StableChartCard title="Lineage" queryId="3578388" type="line" valueKey="balance_total" />
                </Grid2>
            </Section>

            {/* Arbitrum Views (Tables) */ }
            <Section id="arb-views" icon={ <TableIcon className="w-5 h-5 text-cyan-400" /> } title="Arbitrum Views (Tables)">
                <Grid2>
                    <StableTable queryId="3679025" title="Table" />
                    <StableTable queryId="3679025" title="Overview" />
                    <MetricCard title="Counter" value={ fmtUSD( arbitrumTotals.total ) } />
                    <MetricCard title="Counter (30D)" value={ fmtPct( arbitrumTotals.change30d ) } accent={ arbitrumTotals.change30d >= 0 ? "text-emerald-400" : "text-rose-400" } />
                </Grid2>
            </Section>

            {/* Ethereum Views (Tables) */ }
            <Section id="eth-views" icon={ <TableIcon className="w-5 h-5 text-cyan-400" /> } title="Ethereum Views (Tables)">
                <Grid2>
                    <StableTable queryId="3581067" title="Table" />
                    <StableTable queryId="3581067" title="Overview" />
                    <StableTable queryId="3581067" title="TVL" />
                    <StableTable queryId="3581067" title="Volume" />
                    <MetricCard title="Counter" value={ fmtUSD( ethTotals.total ) } />
                    <MetricCard title="Counter (30D)" value={ fmtPct( ethTotals.change30d ) } accent={ ethTotals.change30d >= 0 ? "text-emerald-400" : "text-rose-400" } />
                </Grid2>
            </Section>

            {/* Stablecoins Composition - Polygon */ }
            <Section id="polygon-overview" icon={ <Layers className="w-5 h-5 text-cyan-400" /> } title="Stablecoins Composition - Polygon">
                <Grid2>
                    <MetricCard title="Polygon Stablecoins TVL" value={ fmtUSD( polygonTotals.total ) } />
                    <MetricCard title="TVL Change (30D)" value={ fmtPct( polygonTotals.change30d ) } accent={ polygonTotals.change30d >= 0 ? "text-emerald-400" : "text-rose-400" } />
                </Grid2>
                <Grid2>
                    <StableChartCard title="TVL by Asset" queryId="3576048" type="area" valueKey="balance" categoryKey="asset" />
                    <StableChartCard title="Dominance" queryId="3576048" type="area-percent" valueKey="balance" categoryKey="asset" />
                    <StableChartCard title="Table" queryId="3576048" type="bar" valueKey="txn_count" categoryKey="asset" />
                    <StableChartCard title="Lineage" queryId="3576048" type="line" valueKey="balance_total" />
                </Grid2>
            </Section>

            {/* Stablecoins Composition - BSC */ }
            <Section id="bsc-overview" icon={ <Layers className="w-5 h-5 text-cyan-400" /> } title="Stablecoins Composition - BSC">
                <Grid2>
                    <MetricCard title="BSC Stablecoins TVL" value={ fmtUSD( bscTotals.total ) } />
                    <MetricCard title="TVL Change (30D)" value={ fmtPct( bscTotals.change30d ) } accent={ bscTotals.change30d >= 0 ? "text-emerald-400" : "text-rose-400" } />
                </Grid2>
                <Grid2>
                    <StableChartCard title="TVL by Asset" queryId="3578471" type="area" valueKey="balance" categoryKey="asset" />
                    <StableChartCard title="Dominance" queryId="3578471" type="area-percent" valueKey="balance" categoryKey="asset" />
                    <StableChartCard title="Volume" queryId="3578471" type="bar" valueKey="volume" categoryKey="asset" />
                    <StableChartCard title="Transactions" queryId="3578471" type="bar" valueKey="txn_count" categoryKey="asset" />
                    <StableChartCard title="Lineage" queryId="3578471" type="line" valueKey="balance_total" />
                </Grid2>
            </Section>

            {/* BSC Views (Tables) */ }
            <Section id="bsc-views" icon={ <TableIcon className="w-5 h-5 text-cyan-400" /> } title="BSC Views (Tables)">
                <Grid2>
                    <StableTable queryId="3678970" title="Table" />
                    <StableTable queryId="3678970" title="Overview" />
                    <StableTable queryId="3678970" title="TVL" />
                    <StableTable queryId="3678970" title="Volume" />
                    <MetricCard title="Counter" value={ fmtUSD( bscTotals.total ) } />
                    <MetricCard title="Counter (30D)" value={ fmtPct( bscTotals.change30d ) } accent={ bscTotals.change30d >= 0 ? "text-emerald-400" : "text-rose-400" } />
                </Grid2>
            </Section>

            {/* Stablecoins Composition - Avalanche */ }
            <Section id="avalanche-overview" icon={ <Layers className="w-5 h-5 text-cyan-400" /> } title="Stablecoins Composition - Avalanche">
                <Grid2>
                    <MetricCard title="Avalanche Stablecoins TVL" value={ fmtUSD( avalancheTotals.total ) } />
                    <MetricCard title="TVL Change (30D)" value={ fmtPct( avalancheTotals.change30d ) } accent={ avalancheTotals.change30d >= 0 ? "text-emerald-400" : "text-rose-400" } />
                </Grid2>
                <Grid2>
                    <StableChartCard title="TVL by Asset" queryId="3578528" type="area" valueKey="balance" categoryKey="asset" />
                    <StableChartCard title="Dominance" queryId="3578528" type="area-percent" valueKey="balance" categoryKey="asset" />
                    <StableChartCard title="Volume" queryId="3578528" type="bar" valueKey="volume" categoryKey="asset" />
                    <StableChartCard title="Transactions" queryId="3578528" type="bar" valueKey="txn_count" categoryKey="asset" />
                    <StableChartCard title="Lineage" queryId="3578528" type="line" valueKey="balance_total" />
                </Grid2>
            </Section>

            {/* Avalanche Views (Tables) */ }
            <Section id="avalanche-views" icon={ <TableIcon className="w-5 h-5 text-cyan-400" /> } title="Avalanche Views (Tables)">
                <Grid2>
                    <StableTable queryId="3679084" title="Table" />
                    <StableTable queryId="3679084" title="Overview" />
                    <StableTable queryId="3679084" title="TVL" />
                    <StableTable queryId="3679084" title="Volume" />
                    <MetricCard title="Counter" value={ fmtUSD( avalancheTotals.total ) } />
                    <MetricCard title="Counter (30D)" value={ fmtPct( avalancheTotals.change30d ) } accent={ avalancheTotals.change30d >= 0 ? "text-emerald-400" : "text-rose-400" } />
                </Grid2>
            </Section>

            {/* Stablecoins Composition - Base */ }
            <Section id="base-overview" icon={ <Layers className="w-5 h-5 text-cyan-400" /> } title="Stablecoins Composition - Base">
                <Grid2>
                    <MetricCard title="Base Stablecoins TVL" value={ fmtUSD( baseTotals.total ) } />
                    <MetricCard title="TVL Change (30D)" value={ fmtPct( baseTotals.change30d ) } accent={ baseTotals.change30d >= 0 ? "text-emerald-400" : "text-rose-400" } />
                </Grid2>
                <Grid2>
                    <StableChartCard title="TVL by Asset" queryId="3694984" type="area" valueKey="balance" categoryKey="asset" />
                    <StableChartCard title="Dominance" queryId="3694984" type="area-percent" valueKey="balance" categoryKey="asset" />
                    <StableChartCard title="Volume" queryId="3694984" type="bar" valueKey="volume" categoryKey="asset" />
                    <StableChartCard title="Transactions" queryId="3694984" type="bar" valueKey="txn_count" categoryKey="asset" />
                    <StableChartCard title="Lineage" queryId="3694984" type="line" valueKey="balance_total" />
                </Grid2>
            </Section>

            {/* Base Views (Tables) */ }
            <Section id="base-views" icon={ <TableIcon className="w-5 h-5 text-cyan-400" /> } title="Base Views (Tables)">
                <Grid2>
                    <StableTable queryId="3695025" title="Table" />
                    <StableTable queryId="3695025" title="Overview" />
                    <StableTable queryId="3695025" title="TVL" />
                    <StableTable queryId="3695025" title="Volume" />
                    <MetricCard title="Counter" value={ fmtUSD( baseTotals.total ) } />
                    <MetricCard title="Counter (30D)" value={ fmtPct( baseTotals.change30d ) } accent={ baseTotals.change30d >= 0 ? "text-emerald-400" : "text-rose-400" } />
                </Grid2>
            </Section>

            {/* Stablecoins Composition - Optimism */ }
            <Section id="optimism-overview" icon={ <Layers className="w-5 h-5 text-cyan-400" /> } title="Stablecoins Composition - Optimism">
                <Grid2>
                    <MetricCard title="Optimism Stablecoins TVL" value={ fmtUSD( optimismTotals.total ) } />
                    <MetricCard title="TVL Change (30D)" value={ fmtPct( optimismTotals.change30d ) } accent={ optimismTotals.change30d >= 0 ? "text-emerald-400" : "text-rose-400" } />
                </Grid2>
                <Grid2>
                    <StableChartCard title="TVL by Asset" queryId="3606698" type="area" valueKey="balance" categoryKey="asset" />
                    <StableChartCard title="Dominance" queryId="3606698" type="area-percent" valueKey="balance" categoryKey="asset" />
                    <StableChartCard title="Volume" queryId="3606698" type="bar" valueKey="volume" categoryKey="asset" />
                    <StableChartCard title="Transactions" queryId="3606698" type="bar" valueKey="txn_count" categoryKey="asset" />
                    <StableChartCard title="Lineage" queryId="3606698" type="line" valueKey="balance_total" />
                </Grid2>
            </Section>

            {/* Optimism Views (Tables) */ }
            <Section id="optimism-views" icon={ <TableIcon className="w-5 h-5 text-cyan-400" /> } title="Optimism Views (Tables)">
                <Grid2>
                    <StableTable queryId="3679134" title="Table" />
                    <StableTable queryId="3679134" title="Overview" />
                    <StableTable queryId="3679134" title="TVL" />
                    <StableTable queryId="3679134" title="Volume" />
                    <MetricCard title="Counter" value={ fmtUSD( optimismTotals.total ) } />
                    <MetricCard title="Counter (30D)" value={ fmtPct( optimismTotals.change30d ) } accent={ optimismTotals.change30d >= 0 ? "text-emerald-400" : "text-rose-400" } />
                </Grid2>
            </Section>

            {/* Stablecoins Composition - Tron */ }
            <Section id="tron-overview" icon={ <Layers className="w-5 h-5 text-cyan-400" /> } title="Stablecoins Composition - Tron">
                <Grid2>
                    <MetricCard title="Tron Stablecoins TVL" value={ fmtUSD( tronTotals.total ) } />
                    <MetricCard title="TVL Change (30D)" value={ fmtPct( tronTotals.change30d ) } accent={ tronTotals.change30d >= 0 ? "text-emerald-400" : "text-rose-400" } />
                </Grid2>
                <Grid2>
                    <StableChartCard title="TVL by Asset" queryId="3622952" type="area" valueKey="balance" categoryKey="asset" />
                    <StableChartCard title="Dominance" queryId="3622952" type="area-percent" valueKey="balance" categoryKey="asset" />
                    <StableChartCard title="Volume" queryId="3622952" type="bar" valueKey="volume" categoryKey="asset" />
                    <StableChartCard title="Transactions" queryId="3622952" type="bar" valueKey="txn_count" categoryKey="asset" />
                    <StableChartCard title="Lineage" queryId="3622952" type="line" valueKey="balance_total" />
                </Grid2>
            </Section>

            {/* Tron Views (Tables) */ }
            <Section id="tron-views" icon={ <TableIcon className="w-5 h-5 text-cyan-400" /> } title="Tron Views (Tables)">
                <Grid2>
                    <StableTable queryId="3679167" title="Table" />
                    <StableTable queryId="3679167" title="Overview" />
                    <StableTable queryId="3679167" title="TVL" />
                    <StableTable queryId="3679167" title="Volume" />
                    <MetricCard title="Counter" value={ fmtUSD( tronTotals.total ) } />
                    <MetricCard title="Counter (30D)" value={ fmtPct( tronTotals.change30d ) } accent={ tronTotals.change30d >= 0 ? "text-emerald-400" : "text-rose-400" } />
                </Grid2>
            </Section>

            {/* Stablecoins Composition - Solana */ }
            <Section id="solana-overview" icon={ <Layers className="w-5 h-5 text-cyan-400" /> } title="Stablecoins Composition - Solana">
                <Grid2>
                    <MetricCard title="Solana Stablecoins TVL" value={ fmtUSD( solanaTotals.total ) } />
                    <MetricCard title="TVL Change (30D)" value={ fmtPct( solanaTotals.change30d ) } accent={ solanaTotals.change30d >= 0 ? "text-emerald-400" : "text-rose-400" } />
                </Grid2>
                <Grid2>
                    <StableChartCard title="TVL by Asset" queryId="3978784" type="area" valueKey="balance" categoryKey="asset" />
                    <StableChartCard title="Dominance" queryId="3978784" type="area-percent" valueKey="balance" categoryKey="asset" />
                    <StableChartCard title="Volume" queryId="3978784" type="bar" valueKey="volume" categoryKey="asset" />
                    <StableChartCard title="Transactions" queryId="3978784" type="bar" valueKey="txn_count" categoryKey="asset" />
                    <StableChartCard title="Lineage" queryId="3978784" type="line" valueKey="balance_total" />
                </Grid2>
            </Section>

            {/* Solana Views (Tables) */ }
            <Section id="solana-views" icon={ <TableIcon className="w-5 h-5 text-cyan-400" /> } title="Solana Views (Tables)">
                <Grid2>
                    <StableTable queryId="3979072" title="Table" />
                    <StableTable queryId="3979072" title="Overview" />
                    <StableTable queryId="3979072" title="TVL" />
                    <StableTable queryId="3979072" title="Volume" />
                    <MetricCard title="Counter" value={ fmtUSD( solanaTotals.total ) } />
                    <MetricCard title="Counter (30D)" value={ fmtPct( solanaTotals.change30d ) } accent={ solanaTotals.change30d >= 0 ? "text-emerald-400" : "text-rose-400" } />
                </Grid2>
            </Section>

            {/* Polygon Views (Tables) */ }
            <Section id="polygon-views" icon={ <TableIcon className="w-5 h-5 text-cyan-400" /> } title="Polygon Views (Tables)">
                <Grid2>
                    <StableTable queryId="3679021" title="Overview" />
                    <StableTable queryId="3679021" title="Volume" />
                    <MetricCard title="Counter" value={ fmtUSD( polygonTotals.total ) } />
                    <MetricCard title="Counter (30D)" value={ fmtPct( polygonTotals.change30d ) } accent={ polygonTotals.change30d >= 0 ? "text-emerald-400" : "text-rose-400" } />
                    <StableTable queryId="3679021" title="TVL" />
                    <StableTable queryId="3679021" title="Table" />
                    <StableTable queryId="3679021" title="Counter" />
                </Grid2>
            </Section>

            {/* Global Overview */ }
            <Section id="global-overview" icon={ <Layers className="w-5 h-5 text-cyan-400" /> } title="Stablecoins Composition - Global">
                <Grid2>
                    <MetricCard title="Global Market Cap" value={ `${ globalTotal.toFixed( 2 ) }B` } />
                    <StableTable queryId="3695803" title="Global Overview Table" />
                </Grid2>
                <Grid2>
                    <StableChartCard title="Chains" queryId="3695803" type="pie" valueKey="market_cap" aggregateBy="chain" />
                    <StableChartCard title="Category" queryId="3695803" type="pie" valueKey="market_cap" aggregateBy="category" />
                    <StableChartCard title="Assets" queryId="3695803" type="pie" valueKey="market_cap" aggregateBy="asset" />
                </Grid2>
            </Section>
        </div>
    );
}

// ─── Metric Card ────────────────────────────────────────────────
function MetricCard ( { title, value, accent }: { title: string; value: string; accent?: string } )
{
    return (
        <div className="rounded-lg sm:rounded-xl border border-white/20 bg-white/[0.18] p-3 sm:p-4 backdrop-blur-xl shadow-lg shadow-black/5 h-[180px] sm:h-[220px] lg:h-[240px] flex flex-col justify-center">
            <div className="text-[10px] sm:text-[12px] text-white/60 uppercase tracking-wider mb-2">{ title }</div>
            <div className={ `text-2xl sm:text-4xl font-bold text-white text-center ${ accent || "" }` }>{ value }</div>
        </div>
    );
}

// ─── Chart Card ────────────────────────────────────────────────
function StableChartCard ( { title, queryId, type, valueKey, categoryKey, aggregateBy }: {
    title: string;
    queryId: string;
    type: string;
    valueKey?: string;
    categoryKey?: string;
    aggregateBy?: string;
} )
{
    const [ data, setData ] = useState<any[]>( [] );
    const [ loading, setLoading ] = useState( true );
    const [ error, setError ] = useState( false );

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
            k.toLowerCase().includes( "date" ) || k.toLowerCase() === "day" || k.toLowerCase().includes( "time" ) || k.toLowerCase().includes( "dt" )
        );
        const isPie = type.includes( "pie" );
        const isArea = type.includes( "area" );
        const isPercent = type.includes( "percent" );
        const colors = [ "#2dd4bf", "#3b82f6", "#8b5cf6", "#f43f5e", "#f59e0b", "#10b981", "#6366f1", "#ec4899", "#06b6d4", "#a78bfa" ];

        if ( isPie )
        {
            const nameKey = aggregateBy || categoryKey || cleanKeys.find( k => k !== dateKey && typeof data[ 0 ][ k ] === "string" ) || cleanKeys[ 0 ];
            const valK = valueKey || cleanKeys.find( k => typeof data[ 0 ][ k ] === "number" ) || cleanKeys[ 1 ];

            const grouped = new Map<string, number>();
            data.forEach( ( row ) =>
            {
                const name = String( row[ nameKey ] );
                const val = Number( row[ valK ] ) || 0;
                grouped.set( name, ( grouped.get( name ) || 0 ) + val );
            } );

            const cd = Array.from( grouped.entries() )
                .map( ( [ name, value ] ) => ( { name, value } ) )
                .sort( ( a, b ) => b.value - a.value );

            return {
                backgroundColor: "transparent",
                tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)", backgroundColor: "rgba(20,20,20,.9)", textStyle: { color: "#fff", fontSize: 12 } },
                legend: { type: "scroll", orient: "vertical", right: 0, top: "center", textStyle: { color: "#fff", fontSize: 12 } },
                series: [ { name: title, type: "pie", radius: [ "42%", "68%" ], center: [ "38%", "50%" ], itemStyle: { borderRadius: 4, borderColor: "rgba(255,255,255,0.15)", borderWidth: 2 }, label: { show: false }, data: cd } ],
            };
        }

        if ( !dateKey )
        {
            const catKey = categoryKey || cleanKeys.find( k => typeof data[ 0 ][ k ] === "string" ) || cleanKeys[ 0 ];
            const valK = valueKey || cleanKeys.find( k => typeof data[ 0 ][ k ] === "number" ) || cleanKeys[ 1 ];
            const sorted = [ ...data ].sort( ( a, b ) => Number( b[ valK ] ) - Number( a[ valK ] ) ).slice( 0, 20 );
            const labels = sorted.map( d => String( d[ catKey ] ) );
            return {
                backgroundColor: "transparent",
                tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, backgroundColor: "rgba(20,20,20,.9)", textStyle: { color: "#fff", fontSize: 12 } },
                grid: { left: "3%", right: "4%", bottom: "8%", top: "8%", containLabel: true },
                xAxis: { type: "category", data: labels, axisLabel: { color: "#fff", fontSize: 11, rotate: 30 }, axisLine: { lineStyle: { color: "rgba(255,255,255,0.25)" } } },
                yAxis: { type: "value", axisLabel: { color: "#fff", fontSize: 12 }, splitLine: { lineStyle: { color: "rgba(255,255,255,0.12)" } }, axisLine: { lineStyle: { color: "rgba(255,255,255,0.25)" } } },
                series: [ { name: valK.replace( /_/g, " " ), type: "bar", data: sorted.map( d => d[ valK ] ), itemStyle: { color: colors[ 0 ], borderRadius: [ 4, 4, 0, 0 ] }, barMaxWidth: 40 } ],
            };
        }

        const sorted = [ ...data ].sort( ( a, b ) => new Date( a[ dateKey ] ).getTime() - new Date( b[ dateKey ] ).getTime() );
        const xData = sorted.map( d => d[ dateKey ] );
        const isLong = cleanKeys.some( k =>
            k.toLowerCase().includes( "chain" ) || k.toLowerCase().includes( "segment" ) || k.toLowerCase().includes( "source" ) || k.toLowerCase().includes( "range" ) ||
            k.toLowerCase().includes( "category" ) || k.toLowerCase().includes( "type" ) || k.toLowerCase().includes( "asset" ) || k.toLowerCase().includes( "entity" )
        );

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
            const catKey = categoryKey || cleanKeys.find( k => k !== dateKey && typeof data[ 0 ][ k ] === "string" );
            const valK = valueKey || cleanKeys.find( k => k !== dateKey && typeof data[ 0 ][ k ] === "number" );
            if ( catKey && valK )
            {
                const uDates = Array.from( new Set( data.map( d => d[ dateKey ] ) ) ).sort();
                const uCats = Array.from( new Set( data.map( d => d[ catKey ] ) ) );
                const pivot: Record<string, Record<string, number>> = {};
                data.forEach( d => { const t = d[ dateKey ]; if ( !pivot[ t ] ) pivot[ t ] = {}; pivot[ t ][ d[ catKey ] ] = d[ valK ]; } );
                const is100 = isPercent;
                const totalsByDate = isPercent
                    ? uDates.map( t => uCats.reduce( ( sum, cat ) => sum + ( pivot[ t ]?.[ cat as string ] || 0 ), 0 ) )
                    : null;
                series = uCats.map( ( cat, i ) => ( {
                    name: cat, type: isArea ? "line" : "bar",
                    stack: "total", areaStyle: isArea ? { opacity: is100 ? 1 : 0.8 } : undefined,
                    barMaxWidth: 30, showSymbol: false,
                    data: uDates.map( ( t, idx ) =>
                    {
                        const raw = pivot[ t ]?.[ cat as string ] || 0;
                        if ( !isPercent ) return raw;
                        const total = totalsByDate?.[ idx ] || 0;
                        return total === 0 ? 0 : ( raw / total ) * 100;
                    } ),
                    itemStyle: { color: colors[ i % colors.length ] }, emphasis: { focus: "series" },
                    lineStyle: isArea ? { width: 0 } : undefined,
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
    }, [ data, title, type, valueKey, categoryKey, aggregateBy ] );

    return (
        <div className="rounded-lg sm:rounded-xl border border-white/20 bg-white/[0.18] p-2 sm:p-4 backdrop-blur-xl shadow-lg shadow-black/5 h-[280px] sm:h-[320px] lg:h-[360px] flex flex-col hover:bg-white/[0.24] transition-all duration-300">
            <div className="flex items-center justify-between gap-1 sm:gap-2 mb-2 border-b border-white/[0.12] pb-1.5 sm:pb-2">
                <h3 className="text-white font-semibold text-[10px] sm:text-[12px] uppercase tracking-wider truncate" title={ title }>
                    { title }
                </h3>
            </div>
            <div className="flex-1 w-full overflow-hidden">
                { loading ? (
                    <div className="flex w-full h-full items-center justify-center"><Loader2 className="w-5 h-5 text-white/20 animate-spin" /></div>
                ) : error ? (
                    <div className="flex w-full h-full items-center justify-center text-red-400/50 text-xs flex-col gap-2">
                        <BarChart2 className="w-5 h-5 opacity-50" /><span>Unable to load</span>
                    </div>
                ) : (
                    <ReactECharts option={ option } style={ { height: "100%", width: "100%" } } theme="dark" opts={ { renderer: "canvas" } } />
                ) }
            </div>
        </div>
    );
}

// ─── Table Card ─────────────────────────────────────────────────
function StableTable ( { queryId, title }: { queryId: string; title: string } )
{
    const [ rows, setRows ] = useState<any[]>( [] );
    const [ loading, setLoading ] = useState( true );
    const [ error, setError ] = useState( false );

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

    const fmtNum = ( v: number ) => new Intl.NumberFormat( "en-US", { notation: v > 9999 ? "compact" : "standard", maximumFractionDigits: 2 } ).format( v );
    const fmtCell = ( v: any, k: string ) =>
    {
        if ( k.includes( "date" ) || k.includes( "time" ) || k.includes( "week" ) || k.includes( "month" ) || k.includes( "dt" ) )
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
            <div className="p-2 sm:p-3 border-b border-white/[0.12] bg-white/[0.08] shrink-0">
                <h3 className="font-semibold text-white/90 text-[10px] sm:text-[12px] uppercase tracking-wide">{ title }</h3>
            </div>
            <div className="overflow-auto flex-1 overscroll-x-contain" style={ { WebkitOverflowScrolling: "touch" } }>
                <table className="w-full text-[10px] sm:text-[11px] text-left relative min-w-[420px]">
                    <thead className="text-[9px] sm:text-[10px] text-white/70 uppercase border-b border-white/[0.15] bg-white/[0.12] sticky top-0 z-10 backdrop-blur-xl">
                        <tr>
                            { headers.map( k => (
                                <th key={ k } className="px-2 sm:px-3 py-1.5 sm:py-2 font-semibold whitespace-nowrap">{ k.replace( /_/g, " " ).slice( 0, 16 ) }</th>
                            ) ) }
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        { rows.slice( 0, 200 ).map( ( row, idx ) => (
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
