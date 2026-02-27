"use client";

/**
 * 📊 ProChart — Professional ECharts Wrapper
 * ───────────────────────────────────────────
 * Thin wrapper around echarts-for-react that:
 *  - Registers the "ccways" theme on first render
 *  - Wraps the chart in a glassmorphism card
 *  - Shows a "No data" state when data is empty
 *  - Applies containLabel + anti-overlap defaults
 *  - Supports title/subtitle in DOM (not in ECharts for crisp text)
 */

import React, { useEffect, useMemo, useRef } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { registerNexusTheme } from "@/lib/echarts-theme";

/* ── Props ── */
export interface ProChartProps
{
    /** Raw ECharts option object (from a builder) */
    option: EChartsOption;
    /** DOM title above the chart */
    title?: string;
    /** DOM subtitle */
    subtitle?: string;
    /** Chart height (CSS value or number in px) */
    height?: number | string;
    /** Additional wrapper classes */
    className?: string;
    /** Show loading spinner */
    loading?: boolean;
    /** Override notMerge behavior (default true) */
    notMerge?: boolean;
    /** Enable dataZoom slider (adds bottom padding) */
    showDataZoom?: boolean;
    /** If true, renders pure chart without card wrapper */
    bare?: boolean;
    /** Optional external link for the title */
    href?: string;
}

/* ── Helpers ── */
function hasData ( option: EChartsOption ): boolean
{
    if ( !option ) return false;
    const series = ( option as any ).series;
    if ( !series ) return false;
    const arr = Array.isArray( series ) ? series : [ series ];
    return arr.some( ( s: any ) =>
    {
        if ( !s ) return false;
        if ( Array.isArray( s.data ) && s.data.length > 0 ) return true;
        // For dataset-driven charts
        if ( ( option as any ).dataset ) return true;
        return false;
    } );
}

/* ── Component ── */
const ProChart: React.FC<ProChartProps> = ( {
    option,
    title,
    subtitle,
    height = 360,
    className = "",
    loading = false,
    notMerge = true,
    showDataZoom = false,
    bare = false,
    href,
} ) =>
{
    const chartRef = useRef<ReactECharts | null>( null );

    // Register theme once
    useEffect( () => { registerNexusTheme(); }, [] );

    // Merge anti-overlap defaults
    const mergedOption = useMemo( () =>
    {
        const base: EChartsOption = {
            grid: {
                left: 12,
                right: 16,
                top: 16,
                bottom: showDataZoom ? 56 : 12,
                containLabel: true,
            },
            animation: true,
            animationDuration: 600,
            animationEasing: 'cubicInOut',
        };

        // Deep-ish merge: user option wins
        const merged = { ...base, ...option };

        // Ensure grid containLabel is always true
        if ( merged.grid && typeof merged.grid === "object" && !Array.isArray( merged.grid ) )
        {
            ( merged.grid as any ).containLabel = true;
        }

        // Axis label anti-overlap
        const applyAxisDefaults = ( axis: any ) =>
        {
            if ( !axis ) return axis;
            const axes = Array.isArray( axis ) ? axis : [ axis ];
            return axes.map( ( a: any ) => ( {
                ...a,
                axisLabel: {
                    hideOverlap: true,
                    ...( a.axisLabel || {} ),
                },
            } ) );
        };
        if ( merged.xAxis ) merged.xAxis = applyAxisDefaults( merged.xAxis );
        if ( merged.yAxis ) merged.yAxis = applyAxisDefaults( merged.yAxis );

        return merged;
    }, [ option, showDataZoom ] );

    // Height string
    const hStr = typeof height === "number" ? `${ height }px` : height;

    // No-data state
    const empty = !loading && !hasData( mergedOption );

    /* ── Chart element ── */
    const chartEl = (
        <>
            { empty ? (
                <div
                    className="flex items-center justify-center text-white/30 text-sm"
                    style={ { height: hStr } }
                >
                    No data available
                </div>
            ) : (
                <ReactECharts
                    ref={ chartRef }
                    option={ mergedOption }
                    theme="ccways"
                    notMerge={ notMerge }
                    lazyUpdate
                    showLoading={ loading }
                    loadingOption={ {
                        text: "",
                        color: "#2dd4bf",
                        maskColor: "rgba(0,0,0,0.25)",
                    } }
                    style={ { height: hStr, width: "100%" } }
                    opts={ { renderer: "canvas" } }
                />
            ) }
        </>
    );

    if ( bare ) return chartEl;

    /* ── Card wrapper ── */
    return (
        <div
            className={ `
                rounded-xl border border-white/[0.08]
                bg-white/[0.04] hover:bg-white/[0.06]
                transition-all duration-200
                p-4
                ${ className }
            ` }
        >
            { ( title || subtitle ) && (
                <div className="mb-2">
                    { title && (
                        <h3 className="text-white font-semibold text-sm leading-tight">
                            { href ? (
                                <a
                                    href={ href }
                                    target="_blank"
                                    rel="noreferrer"
                                    className="hover:underline text-white"
                                >
                                    { title }
                                </a>
                            ) : (
                                title
                            ) }
                        </h3>
                    ) }
                    { subtitle && (
                        <p className="text-white/40 text-xs mt-0.5">{ subtitle }</p>
                    ) }
                </div>
            ) }
            { chartEl }
        </div>
    );
};

export default ProChart;
