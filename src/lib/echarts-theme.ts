/**
 * 🎨 Nexus ECharts Theme
 * ─────────────────────────────────
 * Dark glassmorphism theme matching the CCWAYS design system.
 * Register once at app root; every <ProChart /> uses `theme="ccways"`.
 */

import * as echarts from 'echarts';

/* ── Palette ── */
const NEXUS_COLORS = [
    '#2dd4bf', // teal-400  (primary)
    '#a78bfa', // violet-400
    '#38bdf8', // sky-400
    '#fb923c', // orange-400
    '#f472b6', // pink-400
    '#4ade80', // green-400
    '#facc15', // yellow-400
    '#818cf8', // indigo-400
    '#22d3ee', // cyan-400
    '#e879f9', // fuchsia-400
    '#34d399', // emerald-400
    '#f87171', // red-400
];

/* ── Axis Style ── */
const AXIS_LABEL = {
    color: '#e2e8f0',      // slate-200
    fontSize: 11,
    fontFamily: 'Inter, system-ui, sans-serif',
};

const AXIS_LINE = {
    lineStyle: { color: 'rgba(255,255,255,0.08)' },
};

const SPLIT_LINE = {
    lineStyle: { color: 'rgba(255,255,255,0.06)', type: 'dashed' as const },
};

const AXIS_TICK = {
    lineStyle: { color: 'rgba(255,255,255,0.1)' },
};

/* ── Theme Definition ── */
const nexusTheme: Record<string, any> = {
    color: NEXUS_COLORS,

    backgroundColor: 'transparent',

    textStyle: {
        color: '#e2e8f0',
        fontFamily: 'Inter, system-ui, sans-serif',
    },

    title: {
        textStyle: {
            color: '#f8fafc',
            fontSize: 14,
            fontWeight: 600,
        },
        subtextStyle: {
            color: '#94a3b8',
            fontSize: 12,
        },
    },

    legend: {
        textStyle: { color: '#cbd5e1', fontSize: 11 },
        pageTextStyle: { color: '#cbd5e1' },
        pageIconColor: '#94a3b8',
        pageIconInactiveColor: '#334155',
    },

    tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        textStyle: {
            color: '#f1f5f9',
            fontSize: 12,
        },
        extraCssText: 'backdrop-filter:blur(12px);border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,0.4);',
    },

    /* ── Axes ── */
    categoryAxis: {
        axisLabel: AXIS_LABEL,
        axisLine: AXIS_LINE,
        axisTick: AXIS_TICK,
        splitLine: { show: false },
    },
    valueAxis: {
        axisLabel: AXIS_LABEL,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: SPLIT_LINE,
    },
    timeAxis: {
        axisLabel: AXIS_LABEL,
        axisLine: AXIS_LINE,
        axisTick: AXIS_TICK,
        splitLine: { show: false },
    },
    logAxis: {
        axisLabel: AXIS_LABEL,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: SPLIT_LINE,
    },

    /* ── DataZoom ── */
    dataZoom: [
        {
            type: 'inside',
        },
        {
            type: 'slider',
            backgroundColor: 'rgba(255,255,255,0.03)',
            borderColor: 'rgba(255,255,255,0.06)',
            fillerColor: 'rgba(45,212,191,0.15)',
            handleStyle: {
                color: '#2dd4bf',
                borderColor: '#2dd4bf',
            },
            textStyle: { color: '#94a3b8', fontSize: 10 },
            dataBackground: {
                lineStyle: { color: 'rgba(45,212,191,0.3)' },
                areaStyle: { color: 'rgba(45,212,191,0.08)' },
            },
        },
    ],

    /* ── Visual Map ── */
    visualMap: {
        textStyle: { color: '#cbd5e1' },
        inRange: {
            color: ['#134e4a', '#14b8a6', '#2dd4bf', '#5eead4'],
        },
    },

    /* ── Series Defaults ── */
    line: {
        smooth: true,
        symbolSize: 4,
        lineStyle: { width: 2 },
    },
    bar: {
        barMaxWidth: 32,
        itemStyle: { borderRadius: [3, 3, 0, 0] },
    },
    pie: {
        itemStyle: {
            borderColor: 'rgba(0,0,0,0.3)',
            borderWidth: 2,
        },
    },
    radar: {
        axisName: { color: '#cbd5e1', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
        splitArea: { areaStyle: { color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.04)'] } },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
    },
    gauge: {
        axisLine: {
            lineStyle: { color: [[0.3, '#ef4444'], [0.7, '#eab308'], [1, '#22c55e']] },
        },
        title: { color: '#e2e8f0' },
        detail: { color: '#f8fafc' },
    },

    /* ── Toolbox ── */
    toolbox: {
        iconStyle: {
            borderColor: '#94a3b8',
        },
        emphasis: {
            iconStyle: { borderColor: '#2dd4bf' },
        },
    },

    /* ── Grid ── */
    grid: {
        containLabel: true,
    },
};

/* ── Register ── */
let registered = false;

export function registerNexusTheme (): void
{
    if ( registered ) return;
    echarts.registerTheme( 'ccways', nexusTheme );
    registered = true;
}

export { NEXUS_COLORS, nexusTheme };
