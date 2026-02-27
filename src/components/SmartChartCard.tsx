"use client";

import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import
    {
        BarChart2,
        Table as TableIcon,
        BrainCircuit,
    } from 'lucide-react';
import * as echarts from 'echarts';

interface SeriesConfig
{
    key: string;
    label: string;
    type?: 'line' | 'bar' | 'pie' | 'scatter' | 'effectScatter';
    color?: string;
    stack?: string; // For stacked bars
    yAxisIndex?: number;
}

interface SmartChartCardProps
{
    title: string;
    subtitle?: string;
    data: any[];
    xKey?: string; // default 'date' or 'name'
    series: SeriesConfig[] | string[];
    colors?: string[];
    chartType?: 'area' | 'bar' | 'line' | 'mixed' | 'pie' | 'candle';
    height?: string | number;
    className?: string;
}

type ViewMode = 'chart' | 'table' | 'ai';

/* ── Default palette for auto-coloring ── */
const DEFAULT_PALETTE = [
    '#14b8a6', '#a855f7', '#f59e0b', '#ef4444', '#6366f1',
    '#10b981', '#ec4899', '#06b6d4', '#f97316', '#8b5cf6',
    '#22d3ee', '#84cc16', '#e879f9', '#fb923c', '#2dd4bf',
];

/** Normalize series: accept string[] or SeriesConfig[], returns SeriesConfig[] */
function normalizeSeries (
    raw: SeriesConfig[] | string[] | undefined,
    colors?: string[]
): SeriesConfig[]
{
    if ( !raw || raw.length === 0 ) return [];
    return raw.map( ( item, i ) =>
    {
        if ( typeof item === 'string' )
        {
            return {
                key: item,
                label: item,
                color: colors?.[ i ] ?? DEFAULT_PALETTE[ i % DEFAULT_PALETTE.length ],
            };
        }
        // Already SeriesConfig — apply color override if provided
        return {
            ...item,
            color: item.color ?? colors?.[ i ] ?? DEFAULT_PALETTE[ i % DEFAULT_PALETTE.length ],
        };
    } );
}

const SmartChartCard: React.FC<SmartChartCardProps> = ( {
    title,
    subtitle,
    data,
    xKey = 'date',
    series: rawSeries,
    colors,
    chartType = 'line',
    height = 400,
    className = ""
} ) =>
{
    const [ viewMode, setViewMode ] = useState<ViewMode>( 'chart' );

    const series = useMemo( () => normalizeSeries( rawSeries, colors ), [ rawSeries, colors ] );

    // --- Chart Option Logic ---
    const chartOption = useMemo( () =>
    {
        // defaults
        const textColor = '#e5e7eb'; // tailwind gray-200
        const gridColor = 'rgba(255,255,255,0.08)';
        const tooltipBg = 'rgba(0, 20, 20, 0.95)';

        const option: any = {
            backgroundColor: 'transparent',
            textStyle: {
                fontFamily: 'inherit'
            },
            tooltip: {
                trigger: chartType === 'pie' ? 'item' : 'axis',
                backgroundColor: tooltipBg,
                borderColor: gridColor,
                textStyle: {
                    color: '#fff'
                },
                className: 'z-50 backdrop-blur-sm shadow-xl rounded-lg',
                axisPointer: {
                    type: 'cross',
                    label: {
                        backgroundColor: '#6a7985'
                    }
                }
            },
            grid: {
                left: '2%',
                right: '2%',
                bottom: '3%',
                top: '15%',
                containLabel: true,
                borderColor: gridColor
            },
            legend: {
                show: true,
                textStyle: { color: textColor },
                top: 0,
                type: 'scroll'
            }
        };

        // Axis Configuration (not for Pie)
        if ( chartType !== 'pie' )
        {
            option.xAxis = {
                type: 'category',
                data: data.map( d => d[ xKey ] ),
                boundaryGap: chartType === 'bar', // Gap for bars, no gap for lines/areas usually
                axisLine: { lineStyle: { color: gridColor } },
                axisLabel: {
                    color: textColor,
                    interval: 'auto',
                    hideOverlap: true
                },
                splitLine: { show: false } // clean x-axis
            };

            // Check for multiple Y axes
            const hasSecondaryAxis = series.some( s => s.yAxisIndex === 1 );

            if ( hasSecondaryAxis )
            {
                option.yAxis = [
                    {
                        type: 'value',
                        position: 'left',
                        axisLine: { show: false },
                        axisLabel: { color: textColor },
                        splitLine: { lineStyle: { color: gridColor, type: 'dashed', opacity: 0.3 } }
                    },
                    {
                        type: 'value',
                        position: 'right',
                        axisLine: { show: false },
                        axisLabel: { color: textColor },
                        splitLine: { show: false }
                    }
                ];
            } else
            {
                option.yAxis = {
                    type: 'value',
                    axisLine: { show: false },
                    axisLabel: { color: textColor },
                    splitLine: {
                        lineStyle: {
                            color: gridColor,
                            type: 'dashed',
                            opacity: 0.3
                        }
                    }
                };
            }
        }

        // Series Construction
        option.series = series.map( ( s ) =>
        {
            // Determine effective type
            let type = s.type || 'line';
            if ( chartType === 'area' ) type = 'line';
            if ( chartType === 'bar' ) type = 'bar';

            const baseSeries: any = {
                name: s.label,
                type: type,
                data: data.map( d => typeof d[ s.key ] === 'undefined' ? 0 : d[ s.key ] ),
                itemStyle: {
                    color: s.color
                },
                yAxisIndex: s.yAxisIndex || 0
            };

            // Specific Style: Area Gradient
            if ( chartType === 'area' )
            {
                baseSeries.areaStyle = {
                    opacity: 0.3,
                    color: s.color ? new echarts.graphic.LinearGradient( 0, 0, 0, 1, [
                        { offset: 0, color: s.color },
                        { offset: 1, color: 'rgba(0,0,0,0)' } // Fade out
                    ] ) : undefined
                };
                baseSeries.smooth = true;
                baseSeries.showSymbol = false;
                baseSeries.lineStyle = { width: 2 };
            }

            // Specific Style: Pie
            if ( chartType === 'pie' )
            {
                // Pie usually takes one series with data array of {name, value}
                // We assume the first series definition is the "main" one for a pie chart
                return {
                    name: s.label,
                    type: 'pie',
                    radius: [ '40%', '70%' ], // Donut style looks modern
                    avoidLabelOverlap: true,
                    itemStyle: {
                        borderRadius: 5,
                        borderColor: 'rgba(255,255,255,0.08)',
                        borderWidth: 2
                    },
                    label: {
                        show: false,
                        position: 'center'
                    },
                    emphasis: {
                        label: {
                            show: true,
                            fontSize: 16,
                            fontWeight: 'bold',
                            color: '#fff'
                        }
                    },
                    data: data.map( d => ( {
                        name: d[ xKey ],
                        value: d[ s.key ]
                    } ) )
                };
            }

            // Specific Style: Stacked
            if ( s.stack )
            {
                baseSeries.stack = s.stack;
            }

            // Line formatting
            if ( type === 'line' && chartType !== 'area' )
            {
                baseSeries.smooth = true;
                baseSeries.showSymbol = false;
                baseSeries.lineStyle = { width: 2 };
            }

            return baseSeries;
        } );

        return option;
    }, [ data, xKey, series, chartType ] );


    return (
        <div className={ `w-full bg-white/[0.04] border border-white/[0.08] rounded-xl overflow-hidden shadow-sm flex flex-col ${ className }` }>
            {/* Header */ }
            <div className="flex flex-wrap items-center justify-between px-4 sm:px-6 py-4 border-b border-white/[0.08] bg-white/[0.02]">
                <div className="mb-2 sm:mb-0">
                    <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">{ title }</h3>
                    { subtitle && <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 font-medium uppercase tracking-wider">{ subtitle }</p> }
                </div>

                <div className="flex items-center space-x-1 bg-white/[0.06] p-1 rounded-lg border border-white/[0.08]">
                    <button
                        onClick={ () => setViewMode( 'chart' ) }
                        className={ `p-1.5 rounded-md transition-all duration-200 ${ viewMode === 'chart'
                                ? 'bg-teal-600 text-white shadow-lg'
                                : 'text-white/50 hover:text-white hover:bg-white/[0.08]'
                            }` }
                        title="Chart View"
                    >
                        <BarChart2 size={ 16 } />
                    </button>
                    <button
                        onClick={ () => setViewMode( 'table' ) }
                        className={ `p-1.5 rounded-md transition-all duration-200 ${ viewMode === 'table'
                                ? 'bg-teal-600 text-white shadow-lg'
                                : 'text-white/50 hover:text-white hover:bg-white/[0.08]'
                            }` }
                        title="Data Table"
                    >
                        <TableIcon size={ 16 } />
                    </button>
                    <button
                        onClick={ () => setViewMode( 'ai' ) }
                        className={ `p-1.5 rounded-md transition-all duration-200 ${ viewMode === 'ai'
                                ? 'bg-purple-600 text-white shadow-lg'
                                : 'text-purple-400 hover:text-purple-300 hover:bg-purple-900/30'
                            }` }
                        title="AI Analysis"
                    >
                        <BrainCircuit size={ 16 } />
                    </button>
                </div>
            </div>

            {/* Body */ }
            <div className="relative w-full" style={ { minHeight: typeof height === 'number' ? `${ height }px` : height } }>

                {/* CHART VIEW */ }
                { viewMode === 'chart' && (
                    <div className="p-2 w-full h-full">
                        <ReactECharts
                            option={ chartOption }
                            style={ { height: height, width: '100%' } }
                            theme="dark" // Usually helps, but we overrode most colors
                        />
                    </div>
                ) }

                {/* TABLE VIEW */ }
                { viewMode === 'table' && (
                    <div className="w-full h-full overflow-auto p-4 custom-scrollbar" style={ { height } }>
                        <table className="w-full text-sm text-left text-gray-400">
                            <thead className="text-xs text-white/70 uppercase bg-white/[0.06] sticky top-0">
                                <tr>
                                    <th scope="col" className="px-6 py-3 rounded-tl-lg">{ xKey.toUpperCase() }</th>
                                    { series.map( s => (
                                        <th key={ s.key } scope="col" className="px-6 py-3 min-w-[100px]">{ s.label }</th>
                                    ) ) }
                                </tr>
                            </thead>
                            <tbody>
                                { data.map( ( row, idx ) => (
                                    <tr key={ idx } className="bg-transparent border-b border-white/[0.06] hover:bg-white/[0.06] transition-colors">
                                        <td className="px-6 py-4 font-medium text-white whitespace-nowrap">
                                            { row[ xKey ] }
                                        </td>
                                        { series.map( s => (
                                            <td key={ s.key } className="px-6 py-4">
                                                { typeof row[ s.key ] === 'number'
                                                    ? row[ s.key ].toLocaleString( undefined, { maximumFractionDigits: 2 } )
                                                    : row[ s.key ] || '-' }
                                            </td>
                                        ) ) }
                                    </tr>
                                ) ) }
                            </tbody>
                        </table>
                    </div>
                ) }

                {/* AI VIEW */ }
                { viewMode === 'ai' && (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300" style={ { height } }>
                        <div className="w-16 h-16 bg-purple-900/30 rounded-full flex items-center justify-center mb-4 border border-purple-500/30">
                            <BrainCircuit className="text-purple-400 w-8 h-8 animate-pulse" />
                        </div>
                        <h4 className="text-xl font-medium text-white mb-2">AI Data Analyst</h4>
                        <p className="text-gray-400 max-w-sm mb-6">
                            Our intelligent agent is analyzing this dataset to find patterns, anomalies, and forecast trends.
                        </p>
                        <div className="px-4 py-2 bg-white/[0.06] rounded-md border border-white/[0.08] text-sm text-white/60 font-mono">
                            [System] Waiting for LLM connection...
                        </div>
                    </div>
                ) }

            </div>
        </div>
    );
};

export default SmartChartCard;
