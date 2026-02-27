/**
 * 📊 ProChart Builder Library
 * ────────────────────────────
 * 16 builder functions that return raw EChartsOption.
 * Each creates a different, professional chart type.
 * Designed for dark-theme / nexus glassmorphism.
 */

import type { EChartsOption } from 'echarts';
import { NEXUS_COLORS } from './echarts-theme';

/* ══════════════════════════════════════════════
   Shared Helpers
   ══════════════════════════════════════════════ */

/** Compact number formatter for axis / tooltip */
export function compactNum ( v: number, decimals = 1 ): string
{
    const abs = Math.abs( v );
    const sign = v < 0 ? '-' : '';
    if ( abs >= 1e12 ) return `${ sign }${ ( abs / 1e12 ).toFixed( decimals ) }T`;
    if ( abs >= 1e9 ) return `${ sign }${ ( abs / 1e9 ).toFixed( decimals ) }B`;
    if ( abs >= 1e6 ) return `${ sign }${ ( abs / 1e6 ).toFixed( decimals ) }M`;
    if ( abs >= 1e3 ) return `${ sign }${ ( abs / 1e3 ).toFixed( decimals ) }K`;
    return `${ sign }${ abs.toFixed( decimals ) }`;
}

export function usdFmt ( v: number ): string
{
    return `$${ compactNum( v ) }`;
}

const white = ( a: number ) => `rgba(255,255,255,${ a })`;

/* ══════════════════════════════════════════════
   1. Gradient Area Chart
   ══════════════════════════════════════════════ */

interface GradientAreaItem { name: string; value: number; }

export function buildGradientArea (
    data: GradientAreaItem[],
    opts?: {
        color?: string;
        areaColor?: [ string, string ];
        yFormatter?: ( v: number ) => string;
        smooth?: boolean;
    },
): EChartsOption
{
    const c = opts?.color || NEXUS_COLORS[ 0 ];
    return {
        tooltip: {
            trigger: 'axis',
            valueFormatter: ( v: any ) => ( opts?.yFormatter || compactNum )( Number( v ) ),
        },
        xAxis: {
            type: 'category',
            data: data.map( d => d.name ),
            boundaryGap: false,
            axisLabel: { rotate: data.length > 12 ? 35 : 0 },
        },
        yAxis: {
            type: 'value',
            axisLabel: { formatter: ( v: number ) => ( opts?.yFormatter || compactNum )( v ) },
        },
        series: [ {
            type: 'line',
            data: data.map( d => d.value ),
            smooth: opts?.smooth ?? true,
            symbol: 'none',
            lineStyle: { color: c, width: 2.5 },
            areaStyle: {
                color: {
                    type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                    colorStops: [
                        { offset: 0, color: opts?.areaColor?.[ 0 ] || `${ c }55` },
                        { offset: 1, color: opts?.areaColor?.[ 1 ] || `${ c }05` },
                    ],
                } as any,
            },
        } ],
    };
}


/* ══════════════════════════════════════════════
   1c. Sparkline (minimal inline chart, no axes)
   ══════════════════════════════════════════════ */

/**
 * Tiny line/area sparkline for embedding inside stat cards.
 * Input: [timestamp_ms, value][] — last 7 days typically.
 */
export function buildSparkline (
    data: [ number, number ][],
    opts?: { color?: string; type?: 'line' | 'bar'; },
): EChartsOption
{
    const c = opts?.color || '#38bdf8';
    const isBar = opts?.type === 'bar';

    return {
        grid: { top: 4, right: 4, bottom: 4, left: 4 },
        xAxis: { type: 'time', show: false },
        yAxis: { type: 'value', show: false, min: 'dataMin' },
        tooltip: { show: false },
        series: [ {
            type: isBar ? 'bar' : 'line',
            data: data,
            smooth: !isBar,
            symbol: 'none',
            barWidth: '60%',
            lineStyle: isBar ? undefined : { color: c, width: 1.5 },
            itemStyle: isBar ? { color: c, borderRadius: [ 2, 2, 0, 0 ] } : undefined,
            areaStyle: isBar ? undefined : {
                color: {
                    type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                    colorStops: [
                        { offset: 0, color: `${ c }30` },
                        { offset: 1, color: `${ c }05` },
                    ],
                } as any,
            },
        } ],
    };
}


/* ══════════════════════════════════════════════
   1b. Time-Series Area Chart (for DeFiLlama data)
   ══════════════════════════════════════════════ */

/**
 * Input: array of [timestamp_ms, value] pairs.
 * Uses xAxis type: 'time' so ECharts handles date formatting automatically.
 */
export function buildTimeSeriesArea (
    data: [ number, number ][],
    opts?: {
        color?: string;
        areaColor?: [ string, string ];
        yFormatter?: ( v: number ) => string;
        title?: string;
    },
): EChartsOption
{
    const c = opts?.color || NEXUS_COLORS[ 0 ];
    const fmt = opts?.yFormatter || usdFmt;
    return {
        tooltip: {
            trigger: 'axis',
            valueFormatter: ( v: any ) => fmt( Number( v ) ),
            backgroundColor: 'rgba(15,23,42,0.95)',
            borderColor: 'rgba(255,255,255,0.1)',
            textStyle: { color: '#e2e8f0', fontSize: 11 },
        },
        grid: { top: 20, right: 16, bottom: 30, left: 60 },
        xAxis: {
            type: 'time',
            axisLabel: {
                formatter: ( val: number ) =>
                {
                    const d = new Date( val );
                    const span = data.length > 0 ? ( data[ data.length - 1 ][ 0 ] - data[ 0 ][ 0 ] ) / 86_400_000 : 0;
                    if ( span < 60 ) return d.toLocaleDateString( 'en-US', { month: 'short', day: 'numeric' } );
                    if ( span < 400 ) return d.toLocaleDateString( 'en-US', { month: 'short', year: '2-digit' } );
                    return d.getFullYear().toString();
                },
                hideOverlap: true,
                color: white( 0.5 ),
                fontSize: 10,
            },
            axisLine: { lineStyle: { color: white( 0.1 ) } },
            splitLine: { show: false },
        },
        yAxis: {
            type: 'value',
            axisLabel: { formatter: ( v: number ) => fmt( v ), color: white( 0.5 ), fontSize: 10 },
            splitLine: { lineStyle: { color: white( 0.06 ) } },
        },
        dataZoom: [ { type: 'inside', start: 0, end: 100 } ],
        series: [ {
            type: 'line',
            data: data,
            smooth: true,
            symbol: 'none',
            lineStyle: { color: c, width: 1.5 },
            areaStyle: {
                color: {
                    type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                    colorStops: [
                        { offset: 0, color: opts?.areaColor?.[ 0 ] || `${ c }44` },
                        { offset: 1, color: opts?.areaColor?.[ 1 ] || `${ c }05` },
                    ],
                } as any,
            },
        } ],
    };
}


/* ══════════════════════════════════════════════
   2. Visual-Map Heatmap Bar
   ══════════════════════════════════════════════ */

interface VisualMapBarItem { name: string; value: number; }

export function buildVisualMapBar (
    data: VisualMapBarItem[],
    opts?: {
        inRange?: string[];
        yFormatter?: ( v: number ) => string;
    },
): EChartsOption
{
    const sorted = [ ...data ].sort( ( a, b ) => b.value - a.value );
    const values = sorted.map( d => d.value );
    return {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            valueFormatter: ( v: any ) => ( opts?.yFormatter || compactNum )( Number( v ) ),
        },
        xAxis: {
            type: 'category',
            data: sorted.map( d => d.name ),
            axisLabel: { rotate: sorted.length > 8 ? 40 : 0 },
        },
        yAxis: {
            type: 'value',
            axisLabel: { formatter: ( v: number ) => ( opts?.yFormatter || compactNum )( v ) },
        },
        visualMap: {
            show: false,
            min: Math.min( ...values ),
            max: Math.max( ...values ),
            inRange: {
                color: opts?.inRange || [ '#134e4a', '#0d9488', '#2dd4bf', '#5eead4' ],
            },
        },
        series: [ {
            type: 'bar',
            data: values,
            barMaxWidth: 36,
            itemStyle: { borderRadius: [ 4, 4, 0, 0 ] },
        } ],
    };
}


/* ══════════════════════════════════════════════
   3. Stacked Area
   ══════════════════════════════════════════════ */

interface StackedAreaData
{
    categories: string[];
    series: { name: string; data: number[]; color?: string; }[];
}

export function buildStackedArea (
    data: StackedAreaData,
    opts?: { yFormatter?: ( v: number ) => string; },
): EChartsOption
{
    return {
        tooltip: {
            trigger: 'axis',
            valueFormatter: ( v: any ) => ( opts?.yFormatter || compactNum )( Number( v ) ),
        },
        legend: {
            bottom: 0,
            type: 'scroll',
        },
        xAxis: {
            type: 'category',
            data: data.categories,
            boundaryGap: false,
            axisLabel: { rotate: data.categories.length > 12 ? 35 : 0 },
        },
        yAxis: {
            type: 'value',
            axisLabel: { formatter: ( v: number ) => ( opts?.yFormatter || compactNum )( v ) },
        },
        series: data.series.map( ( s, i ) => ( {
            name: s.name,
            type: 'line' as const,
            stack: 'total',
            smooth: true,
            symbol: 'none',
            lineStyle: { width: 1.5, color: s.color || NEXUS_COLORS[ i % NEXUS_COLORS.length ] },
            areaStyle: {
                color: {
                    type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                    colorStops: [
                        { offset: 0, color: `${ s.color || NEXUS_COLORS[ i % NEXUS_COLORS.length ] }44` },
                        { offset: 1, color: `${ s.color || NEXUS_COLORS[ i % NEXUS_COLORS.length ] }08` },
                    ],
                } as any,
            },
            data: s.data,
        } ) ),
    };
}


/* ══════════════════════════════════════════════
   4. Gauge Ring
   ══════════════════════════════════════════════ */

export function buildGaugeRing (
    value: number,
    opts?: {
        max?: number;
        label?: string;
        color?: string;
        suffix?: string;
    },
): EChartsOption
{
    const max = opts?.max || 100;
    const c = opts?.color || NEXUS_COLORS[ 0 ];
    return {
        series: [ {
            type: 'gauge',
            startAngle: 220,
            endAngle: -40,
            min: 0,
            max,
            radius: '90%',
            progress: {
                show: true,
                width: 14,
                roundCap: true,
                itemStyle: { color: c },
            },
            pointer: { show: false },
            axisLine: {
                lineStyle: { width: 14, color: [ [ 1, white( 0.06 ) ] ] },
                roundCap: true,
            },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { show: false },
            title: {
                show: !!opts?.label,
                offsetCenter: [ 0, '70%' ],
                fontSize: 12,
                color: white( 0.6 ),
            },
            detail: {
                offsetCenter: [ 0, '10%' ],
                fontSize: 28,
                fontWeight: 700,
                color: '#f8fafc',
                formatter: ( v: number ) => `${ v.toFixed( 1 ) }${ opts?.suffix || '' }`,
            },
            data: [ { value, name: opts?.label || '' } ],
        } ],
    };
}


/* ══════════════════════════════════════════════
   5. Treemap
   ══════════════════════════════════════════════ */

interface TreemapItem
{
    name: string;
    value: number;
    children?: TreemapItem[];
}

export function buildTreemap (
    data: TreemapItem[],
    opts?: {
        valueFormatter?: ( v: number ) => string;
    },
): EChartsOption
{
    return {
        tooltip: {
            formatter: ( p: any ) =>
            {
                const val = ( opts?.valueFormatter || compactNum )( p.value );
                return `<b>${ p.name }</b><br/>Value: ${ val }`;
            },
        },
        series: [ {
            type: 'treemap',
            data,
            roam: false,
            width: '100%',
            height: '100%',
            nodeClick: false,
            breadcrumb: { show: false },
            label: {
                show: true,
                color: '#f8fafc',
                fontSize: 11,
                formatter: '{b}',
            },
            upperLabel: { show: false },
            itemStyle: {
                borderColor: 'rgba(0,0,0,0.3)',
                borderWidth: 2,
                gapWidth: 2,
            },
            levels: [
                {
                    itemStyle: { borderWidth: 0, gapWidth: 3 },
                    upperLabel: { show: false },
                },
                {
                    colorSaturation: [ 0.35, 0.6 ],
                    itemStyle: { borderColorSaturation: 0.55, gapWidth: 1, borderWidth: 1 },
                },
            ],
        } ],
    };
}


/* ══════════════════════════════════════════════
   6. Radar
   ══════════════════════════════════════════════ */

interface RadarDim { name: string; max: number; }
interface RadarSeries { name: string; values: number[]; color?: string; }

export function buildRadar (
    indicators: RadarDim[],
    series: RadarSeries[],
): EChartsOption
{
    return {
        legend: { bottom: 0, type: 'scroll' },
        radar: {
            indicator: indicators,
            shape: 'polygon',
            radius: '68%',
            axisName: { color: '#cbd5e1', fontSize: 11 },
            splitLine: { lineStyle: { color: white( 0.08 ) } },
            splitArea: { areaStyle: { color: [ white( 0.02 ), white( 0.04 ) ] } },
            axisLine: { lineStyle: { color: white( 0.1 ) } },
        },
        series: [ {
            type: 'radar',
            data: series.map( ( s, i ) => ( {
                name: s.name,
                value: s.values,
                symbol: 'circle',
                symbolSize: 5,
                lineStyle: { color: s.color || NEXUS_COLORS[ i ], width: 2 },
                areaStyle: { color: `${ s.color || NEXUS_COLORS[ i ] }22` },
                itemStyle: { color: s.color || NEXUS_COLORS[ i ] },
            } ) ),
        } ],
    };
}


/* ══════════════════════════════════════════════
   7. Scatter / Bubble
   ══════════════════════════════════════════════ */

interface BubbleItem
{
    name: string;
    x: number;
    y: number;
    size: number;
    color?: string;
}

export function buildScatterBubble (
    data: BubbleItem[],
    opts?: {
        xName?: string;
        yName?: string;
        sizeRange?: [ number, number ];
        xFormatter?: ( v: number ) => string;
        yFormatter?: ( v: number ) => string;
    },
): EChartsOption
{
    const sizes = data.map( d => d.size );
    const minSize = Math.min( ...sizes );
    const maxSize = Math.max( ...sizes );
    const [ sMin, sMax ] = opts?.sizeRange || [ 8, 52 ];

    const normalize = ( v: number ) =>
        maxSize === minSize ? ( sMin + sMax ) / 2 : sMin + ( ( v - minSize ) / ( maxSize - minSize ) ) * ( sMax - sMin );

    return {
        tooltip: {
            formatter: ( p: any ) =>
            {
                const d = p.data;
                return `<b>${ d[ 3 ] }</b><br/>
                    ${ opts?.xName || 'X' }: ${ ( opts?.xFormatter || compactNum )( d[ 0 ] ) }<br/>
                    ${ opts?.yName || 'Y' }: ${ ( opts?.yFormatter || compactNum )( d[ 1 ] ) }`;
            },
        },
        xAxis: {
            type: 'value',
            name: opts?.xName,
            nameTextStyle: { color: white( 0.5 ), fontSize: 11 },
            axisLabel: { formatter: ( v: number ) => ( opts?.xFormatter || compactNum )( v ) },
        },
        yAxis: {
            type: 'value',
            name: opts?.yName,
            nameTextStyle: { color: white( 0.5 ), fontSize: 11 },
            axisLabel: { formatter: ( v: number ) => ( opts?.yFormatter || compactNum )( v ) },
        },
        series: [ {
            type: 'scatter',
            data: data.map( ( d, i ) => [ d.x, d.y, normalize( d.size ), d.name, i ] ),
            symbolSize: ( val: number[] ) => val[ 2 ],
            itemStyle: {
                color: ( p: any ) =>
                {
                    const idx = p.data[ 4 ] as number;
                    return data[ idx ]?.color || NEXUS_COLORS[ idx % NEXUS_COLORS.length ];
                },
                shadowBlur: 6,
                shadowColor: 'rgba(0,0,0,0.3)',
            },
            label: {
                show: data.length <= 15,
                position: 'top',
                formatter: ( p: any ) => p.data[ 3 ],
                color: white( 0.7 ),
                fontSize: 10,
            },
        } ],
    };
}


/* ══════════════════════════════════════════════
   8. Horizontal Bar
   ══════════════════════════════════════════════ */

interface HBarItem { name: string; value: number; color?: string; }

export function buildHorizontalBar (
    data: HBarItem[],
    opts?: {
        valueFormatter?: ( v: number ) => string;
        showLabel?: boolean;
        maxBars?: number;
    },
): EChartsOption
{
    const sorted = [ ...data ].sort( ( a, b ) => a.value - b.value ).slice( -( opts?.maxBars || 15 ) );
    return {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            valueFormatter: ( v: any ) => ( opts?.valueFormatter || compactNum )( Number( v ) ),
        },
        grid: { left: 12, right: 40, top: 8, bottom: 8, containLabel: true },
        xAxis: {
            type: 'value',
            axisLabel: { formatter: ( v: number ) => ( opts?.valueFormatter || compactNum )( v ) },
        },
        yAxis: {
            type: 'category',
            data: sorted.map( d => d.name ),
            axisLabel: {
                width: 90,
                overflow: 'truncate',
                fontSize: 11,
            },
        },
        series: [ {
            type: 'bar',
            data: sorted.map( ( d, i ) => ( {
                value: d.value,
                itemStyle: { color: d.color || NEXUS_COLORS[ i % NEXUS_COLORS.length ] },
            } ) ),
            barMaxWidth: 20,
            itemStyle: { borderRadius: [ 0, 4, 4, 0 ] },
            label: opts?.showLabel !== false ? {
                show: true,
                position: 'right',
                color: white( 0.6 ),
                fontSize: 10,
                formatter: ( p: any ) => ( opts?.valueFormatter || compactNum )( p.value ),
            } : undefined,
        } ],
    };
}


/* ══════════════════════════════════════════════
   9. Sunburst
   ══════════════════════════════════════════════ */

interface SunburstItem
{
    name: string;
    value?: number;
    children?: SunburstItem[];
    itemStyle?: { color?: string; };
}

export function buildSunburst (
    data: SunburstItem[],
    opts?: { valueFormatter?: ( v: number ) => string },
): EChartsOption
{
    return {
        tooltip: {
            formatter: ( p: any ) =>
            {
                const val = ( opts?.valueFormatter || compactNum )( p.value );
                return `<b>${ p.name }</b><br/>Value: ${ val }`;
            },
        },
        series: [ {
            type: 'sunburst',
            data,
            radius: [ '12%', '90%' ],
            sort: undefined,
            emphasis: { focus: 'ancestor' },
            label: {
                rotate: 'radial',
                color: '#f8fafc',
                fontSize: 10,
            },
            itemStyle: {
                borderColor: 'rgba(0,0,0,0.25)',
                borderWidth: 1.5,
            },
            levels: [
                {},
                {
                    r0: '12%', r: '40%',
                    label: { fontSize: 12, fontWeight: 600 },
                    itemStyle: { borderWidth: 2 },
                },
                {
                    r0: '40%', r: '68%',
                    label: { fontSize: 10 },
                },
                {
                    r0: '68%', r: '90%',
                    label: { fontSize: 9, position: 'outside', padding: 3 },
                    itemStyle: { borderWidth: 1 },
                },
            ],
        } ],
    };
}


/* ══════════════════════════════════════════════
   10. Funnel
   ══════════════════════════════════════════════ */

interface FunnelItem { name: string; value: number; }

export function buildFunnel (
    data: FunnelItem[],
    opts?: { valueFormatter?: ( v: number ) => string; },
): EChartsOption
{
    const sorted = [ ...data ].sort( ( a, b ) => b.value - a.value );
    return {
        tooltip: {
            trigger: 'item',
            formatter: ( p: any ) =>
            {
                const val = ( opts?.valueFormatter || compactNum )( p.value );
                return `<b>${ p.name }</b><br/>Value: ${ val }`;
            },
        },
        legend: { bottom: 0, type: 'scroll' },
        series: [ {
            type: 'funnel',
            left: '10%',
            top: 12,
            bottom: 32,
            width: '80%',
            sort: 'descending',
            gap: 3,
            label: {
                show: true,
                position: 'inside',
                color: '#f8fafc',
                fontSize: 11,
            },
            itemStyle: {
                borderColor: 'rgba(0,0,0,0.3)',
                borderWidth: 1,
            },
            data: sorted.map( ( d, i ) => ( {
                name: d.name,
                value: d.value,
                itemStyle: { color: NEXUS_COLORS[ i % NEXUS_COLORS.length ] },
            } ) ),
        } ],
    };
}


/* ══════════════════════════════════════════════
   11. Nightingale Rose
   ══════════════════════════════════════════════ */

interface RoseItem { name: string; value: number; }

export function buildNightingaleRose (
    data: RoseItem[],
    opts?: { valueFormatter?: ( v: number ) => string; },
): EChartsOption
{
    return {
        tooltip: {
            trigger: 'item',
            formatter: ( p: any ) =>
            {
                const val = ( opts?.valueFormatter || compactNum )( p.value );
                return `<b>${ p.name }</b><br/>${ val } (${ p.percent?.toFixed( 1 ) }%)`;
            },
        },
        legend: { bottom: 0, type: 'scroll' },
        series: [ {
            type: 'pie',
            radius: [ '20%', '85%' ],
            center: [ '50%', '46%' ],
            roseType: 'area',
            itemStyle: {
                borderRadius: 6,
                borderColor: 'rgba(0,0,0,0.3)',
                borderWidth: 2,
            },
            label: {
                show: true,
                color: white( 0.75 ),
                fontSize: 10,
            },
            data: data.map( ( d, i ) => ( {
                name: d.name,
                value: d.value,
                itemStyle: { color: NEXUS_COLORS[ i % NEXUS_COLORS.length ] },
            } ) ),
        } ],
    };
}


/* ══════════════════════════════════════════════
   12. Dual-Axis Bar + Line
   ══════════════════════════════════════════════ */

interface DualAxisData
{
    categories: string[];
    barData: number[];
    lineData: number[];
    barName?: string;
    lineName?: string;
    barColor?: string;
    lineColor?: string;
    barFormatter?: ( v: number ) => string;
    lineFormatter?: ( v: number ) => string;
}

export function buildDualAxisBarLine ( d: DualAxisData ): EChartsOption
{
    return {
        tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
        legend: { bottom: 0 },
        xAxis: {
            type: 'category',
            data: d.categories,
            axisLabel: { rotate: d.categories.length > 10 ? 35 : 0 },
        },
        yAxis: [
            {
                type: 'value',
                name: d.barName || 'Bar',
                nameTextStyle: { color: white( 0.5 ), fontSize: 10 },
                axisLabel: { formatter: ( v: number ) => ( d.barFormatter || compactNum )( v ) },
            },
            {
                type: 'value',
                name: d.lineName || 'Line',
                nameTextStyle: { color: white( 0.5 ), fontSize: 10 },
                axisLabel: { formatter: ( v: number ) => ( d.lineFormatter || compactNum )( v ) },
                splitLine: { show: false },
            },
        ],
        series: [
            {
                name: d.barName || 'Bar',
                type: 'bar',
                data: d.barData,
                barMaxWidth: 28,
                itemStyle: {
                    color: d.barColor || NEXUS_COLORS[ 0 ],
                    borderRadius: [ 3, 3, 0, 0 ],
                },
            },
            {
                name: d.lineName || 'Line',
                type: 'line',
                yAxisIndex: 1,
                data: d.lineData,
                smooth: true,
                symbol: 'circle',
                symbolSize: 5,
                lineStyle: { color: d.lineColor || NEXUS_COLORS[ 1 ], width: 2 },
                itemStyle: { color: d.lineColor || NEXUS_COLORS[ 1 ] },
            },
        ],
    };
}


/* ══════════════════════════════════════════════
   13. Horizontal Stacked Bar
   ══════════════════════════════════════════════ */

interface HStackedBarData
{
    categories: string[];
    series: { name: string; data: number[]; color?: string; }[];
}

export function buildHorizontalStackedBar (
    d: HStackedBarData,
    opts?: { valueFormatter?: ( v: number ) => string; },
): EChartsOption
{
    return {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            valueFormatter: ( v: any ) => ( opts?.valueFormatter || compactNum )( Number( v ) ),
        },
        legend: { bottom: 0, type: 'scroll' },
        grid: { left: 12, right: 16, top: 8, bottom: 36, containLabel: true },
        xAxis: {
            type: 'value',
            axisLabel: { formatter: ( v: number ) => ( opts?.valueFormatter || compactNum )( v ) },
        },
        yAxis: {
            type: 'category',
            data: d.categories,
            axisLabel: { width: 80, overflow: 'truncate', fontSize: 11 },
        },
        series: d.series.map( ( s, i ) => ( {
            name: s.name,
            type: 'bar' as const,
            stack: 'total',
            data: s.data,
            itemStyle: {
                color: s.color || NEXUS_COLORS[ i % NEXUS_COLORS.length ],
            },
            barMaxWidth: 20,
        } ) ),
    };
}


/* ══════════════════════════════════════════════
   14. Candlestick-Like Range Chart
   ══════════════════════════════════════════════ */

interface CandlestickItem
{
    name: string;
    low: number;
    open: number;
    close: number;
    high: number;
}

export function buildCandlestickLike (
    data: CandlestickItem[],
    opts?: { yFormatter?: ( v: number ) => string },
): EChartsOption
{
    return {
        tooltip: {
            trigger: 'axis',
            formatter: ( params: any ) =>
            {
                const p = Array.isArray( params ) ? params[ 0 ] : params;
                const [ open, close, low, high ] = p.data;
                const f = opts?.yFormatter || compactNum;
                return `<b>${ p.name }</b><br/>
                    High: ${ f( high ) }<br/>Close: ${ f( close ) }<br/>
                    Open: ${ f( open ) }<br/>Low: ${ f( low ) }`;
            },
        },
        xAxis: {
            type: 'category',
            data: data.map( d => d.name ),
            axisLabel: { rotate: data.length > 10 ? 35 : 0 },
        },
        yAxis: {
            type: 'value',
            scale: true,
            axisLabel: { formatter: ( v: number ) => ( opts?.yFormatter || compactNum )( v ) },
        },
        series: [ {
            type: 'candlestick',
            data: data.map( d => [ d.open, d.close, d.low, d.high ] ),
            itemStyle: {
                color: '#22c55e',
                color0: '#ef4444',
                borderColor: '#22c55e',
                borderColor0: '#ef4444',
            },
        } ],
    };
}


/* ══════════════════════════════════════════════
   15. Grouped Bar
   ══════════════════════════════════════════════ */

interface GroupedBarData
{
    categories: string[];
    series: { name: string; data: number[]; color?: string; }[];
}

export function buildGroupedBar (
    d: GroupedBarData,
    opts?: { yFormatter?: ( v: number ) => string; },
): EChartsOption
{
    return {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            valueFormatter: ( v: any ) => ( opts?.yFormatter || compactNum )( Number( v ) ),
        },
        legend: { bottom: 0, type: 'scroll' },
        xAxis: {
            type: 'category',
            data: d.categories,
            axisLabel: { rotate: d.categories.length > 8 ? 30 : 0 },
        },
        yAxis: {
            type: 'value',
            axisLabel: { formatter: ( v: number ) => ( opts?.yFormatter || compactNum )( v ) },
        },
        series: d.series.map( ( s, i ) => ( {
            name: s.name,
            type: 'bar' as const,
            data: s.data,
            barMaxWidth: 24,
            itemStyle: {
                color: s.color || NEXUS_COLORS[ i % NEXUS_COLORS.length ],
                borderRadius: [ 3, 3, 0, 0 ],
            },
        } ) ),
    };
}


/* ══════════════════════════════════════════════
   16. Comparison Multi-Line
   ══════════════════════════════════════════════ */

interface ComparisonLineData
{
    categories: string[];
    series: { name: string; data: number[]; color?: string; }[];
}

export function buildComparisonLine (
    d: ComparisonLineData,
    opts?: { yFormatter?: ( v: number ) => string; smooth?: boolean; },
): EChartsOption
{
    return {
        tooltip: {
            trigger: 'axis',
            valueFormatter: ( v: any ) => ( opts?.yFormatter || compactNum )( Number( v ) ),
        },
        legend: { bottom: 0, type: 'scroll' },
        xAxis: {
            type: 'category',
            data: d.categories,
            boundaryGap: false,
            axisLabel: { rotate: d.categories.length > 12 ? 35 : 0 },
        },
        yAxis: {
            type: 'value',
            axisLabel: { formatter: ( v: number ) => ( opts?.yFormatter || compactNum )( v ) },
        },
        series: d.series.map( ( s, i ) => ( {
            name: s.name,
            type: 'line' as const,
            data: s.data,
            smooth: opts?.smooth ?? true,
            symbol: 'circle',
            symbolSize: 4,
            lineStyle: {
                color: s.color || NEXUS_COLORS[ i % NEXUS_COLORS.length ],
                width: 2,
            },
            itemStyle: { color: s.color || NEXUS_COLORS[ i % NEXUS_COLORS.length ] },
        } ) ),
    };
}


/* ══════════════════════════════════════════════
   BONUS: Simple Donut (Pie)
   ══════════════════════════════════════════════ */

interface DonutItem { name: string; value: number; }

export function buildDonut (
    data: DonutItem[],
    opts?: {
        innerRadius?: string;
        outerRadius?: string;
        valueFormatter?: ( v: number ) => string;
        centerLabel?: string;
    },
): EChartsOption
{
    return {
        tooltip: {
            trigger: 'item',
            formatter: ( p: any ) =>
            {
                const val = ( opts?.valueFormatter || compactNum )( p.value );
                return `<b>${ p.name }</b><br/>${ val } (${ p.percent?.toFixed( 1 ) }%)`;
            },
        },
        legend: { bottom: 0, type: 'scroll' },
        graphic: opts?.centerLabel ? [ {
            type: 'text',
            left: 'center',
            top: '42%',
            style: {
                text: opts.centerLabel,
                fill: 'rgba(255,255,255,0.5)',
                fontSize: 12,
                textAlign: 'center',
            },
        } ] : undefined,
        series: [ {
            type: 'pie',
            radius: [ opts?.innerRadius || '42%', opts?.outerRadius || '78%' ],
            center: [ '50%', '46%' ],
            avoidLabelOverlap: true,
            itemStyle: {
                borderRadius: 5,
                borderColor: 'rgba(0,0,0,0.3)',
                borderWidth: 2,
            },
            label: {
                show: true,
                color: white( 0.7 ),
                fontSize: 10,
                formatter: '{b}: {d}%',
            },
            data: data.map( ( d, i ) => ( {
                name: d.name,
                value: d.value,
                itemStyle: { color: NEXUS_COLORS[ i % NEXUS_COLORS.length ] },
            } ) ),
        } ],
    };
}
