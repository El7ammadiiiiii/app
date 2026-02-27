"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRightIcon } from "lucide-react";
import { useRouter } from "next/navigation";

/* ─── Helpers ─── */

export const toNumber = ( v: any ): number | null =>
{
    if ( v === null || v === undefined ) return null;
    if ( typeof v === "number" ) return Number.isFinite( v ) ? v : null;
    if ( typeof v === "string" )
    {
        const s = v.replace( /[,$]/g, "" ).trim();
        const m = s.match( /-?\d+(?:\.\d+)?/ );
        if ( !m ) return null;
        const n = Number( m[ 0 ] );
        return Number.isFinite( n ) ? n : null;
    }
    return null;
};

export const fmt = ( n: number, decimals = 0 ): string =>
    n.toLocaleString( "en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals } );

export const fmtCompact = ( n: number ): string =>
{
    const abs = Math.abs( n );
    const sign = n < 0 ? "-" : "";
    if ( abs >= 1e9 ) return `${ sign }${ ( abs / 1e9 ).toFixed( 2 ) }B`;
    if ( abs >= 1e6 ) return `${ sign }${ ( abs / 1e6 ).toFixed( 2 ) }M`;
    if ( abs >= 1e3 ) return `${ sign }${ ( abs / 1e3 ).toFixed( 1 ) }K`;
    return `${ sign }${ abs.toFixed( 1 ) }`;
};

export const fmtUSD = ( n: number ): string => `$${ fmtCompact( n ) }`;

export const fmtPct = ( n: number, decimals = 2 ): string =>
    `${ n >= 0 ? "+" : "" }${ n.toFixed( decimals ) }%`;

export const fmtDate = ( d: Date | string ): string =>
{
    const date = typeof d === "string" ? new Date( d ) : d;
    return date.toLocaleDateString( "en-US", { month: "short", day: "numeric", year: "numeric" } );
};

/** Deterministic seeded PRNG (mulberry32) */
export function seededRandom ( seed: number )
{
    return (): number =>
    {
        seed |= 0; seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul( seed ^ ( seed >>> 15 ), 1 | seed );
        t = t + Math.imul( t ^ ( t >>> 7 ), 61 | t ) ^ t;
        return ( ( t ^ ( t >>> 14 ) ) >>> 0 ) / 4294967296;
    };
}

/* ─── Grid helpers ─── */

export function Grid2 ( { children }: { children: ReactNode } )
{
    return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">{ children }</div>;
}

export function Grid3 ( { children }: { children: ReactNode } )
{
    return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">{ children }</div>;
}

export function Grid4 ( { children }: { children: ReactNode } )
{
    return <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">{ children }</div>;
}

/* ─── Section ─── */

interface SectionProps
{
    id: string;
    icon: ReactNode;
    title: string;
    children: ReactNode;
    defaultOpen?: boolean;
    /** Storage key prefix, defaults to "section" */
    storagePrefix?: string;
    /** Tailwind text-color class for chevron/accent, defaults to "text-orange-400" */
    accentClass?: string;
}

export function Section ( {
    id, icon, title, children, defaultOpen = true,
    storagePrefix = "section",
    accentClass = "text-orange-400",
}: SectionProps )
{
    const storageKey = `${ storagePrefix }-${ id }`;
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

    const Chevron = open ? ChevronDown : ChevronRightIcon;

    return (
        <div className="space-y-4">
            <button onClick={ toggle } className="flex items-center gap-2 w-full text-left group mt-4 sm:mt-6">
                { mounted
                    ? <Chevron className={ `w-4 h-4 shrink-0 ${ accentClass }` } />
                    : <ChevronDown className={ `w-4 h-4 shrink-0 ${ accentClass }` } />
                }
                <span className="flex items-center gap-2 text-base sm:text-lg font-bold text-white/90">
                    { icon } { title }
                </span>
                <span className="ml-auto text-[10px] text-white/30 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                    { open ? "Hide" : "Show" }
                </span>
            </button>
            { open && <div className="space-y-3 sm:space-y-4">{ children }</div> }
        </div>
    );
}

/* ─── StatCard ─── */

interface StatCardProps
{
    icon: ReactNode;
    label: string;
    value: string;
    subtitle?: string;
    /** Tailwind bg class for icon container */
    iconBg?: string;
    /** Tailwind text class for icon container */
    iconColor?: string;
}

export function StatCard ( {
    icon, label, value, subtitle,
    iconBg = "bg-orange-500/20",
    iconColor = "text-orange-300",
}: StatCardProps )
{
    return (
        <div className="rounded-lg sm:rounded-xl border border-white/[0.08] bg-white/[0.04] p-2.5 sm:p-4 hover:bg-white/[0.07] transition-all duration-200">
            <div className="flex items-start gap-3">
                <div className={ `p-1.5 sm:p-2 rounded-lg ${ iconBg } ${ iconColor } shrink-0` }>
                    { icon }
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-white/50 text-[10px] sm:text-xs mb-0.5">{ label }</div>
                    <div className="text-white font-bold text-base sm:text-lg truncate">{ value }</div>
                    { subtitle && <div className="text-white/40 text-[9px] sm:text-xs mt-0.5">{ subtitle }</div> }
                </div>
            </div>
        </div>
    );
}

/* ─── ChartCard ─── */

interface ChartCardProps
{
    title: string;
    subtitle?: string;
    children: ReactNode;
    className?: string;
    height?: number | string;
    contentClassName?: string;
}

export function ChartCard ( { title, subtitle, children, className = "", height, contentClassName = "" }: ChartCardProps )
{
    const heightStyle = useMemo( () =>
    {
        if ( height === undefined || height === null ) return undefined;
        const max = typeof height === "number" ? `${ height }px` : height;
        return { height: `clamp(180px, 40vw, ${ max })` } as const;
    }, [ height ] );

    return (
        <div className={ `rounded-lg sm:rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 sm:p-4 hover:bg-white/[0.07] transition-all duration-200 ${ className }` }>
            <div className="mb-3">
                <h3 className="text-white font-semibold text-sm">{ title }</h3>
                { subtitle && <p className="text-white/40 text-xs mt-0.5">{ subtitle }</p> }
            </div>
            <div
                className={ `w-full overflow-hidden h-[180px] sm:h-[240px] md:h-[280px] lg:h-[320px] xl:h-[360px] ${ contentClassName }` }
                style={ heightStyle }
            >
                { children }
            </div>
        </div>
    );
}

/* ─── Back Button ─── */

export function BackButton ( {
    label = "رجوع",
    fallback = "/chat/polygon",
    className = "",
}: {
    label?: string;
    fallback?: string;
    className?: string;
} )
{
    const router = useRouter();

    const onBack = () =>
    {
        if ( typeof window !== "undefined" && window.history.length > 1 )
        {
            router.back();
        } else
        {
            router.push( fallback );
        }
    };

    return (
        <button
            type="button"
            onClick={ onBack }
            className={ `inline-flex items-center gap-2 text-xs sm:text-sm px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10 ${ className }` }
        >
            <span className="text-white/70">←</span>
            <span className="text-white/80 font-medium">{ label }</span>
        </button>
    );
}
