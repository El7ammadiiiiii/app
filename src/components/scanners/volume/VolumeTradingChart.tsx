'use client';

/**
 * 📊 Volume Trading Chart Component
 * نسخة مطورة تدعم التفاعل الكامل ورسم الخطوط (مثل الدايفرجنس والنماذج)
 */

import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { OHLCV } from '@/lib/scanners/volume-scanner';
import { ChartConfig } from '@/lib/ChartConfig';

interface ChartLine
{
  points: { time: number; value: number }[];
  color?: string;
  style?: 'solid' | 'dashed';
}

interface VolumeTradingChartProps
{
  candles: OHLCV[];
  symbol: string;
  height?: number;
  className?: string;
  lines?: ChartLine[];
}

const CHART_COLORS = ChartConfig.COLORS_DARK;

const THEME = {
  background: 'transparent',
  candleUp: CHART_COLORS.candleUp,
  candleDown: CHART_COLORS.candleDown,
  grid: CHART_COLORS.grid,
  text: CHART_COLORS.textSecondary,
  crosshair: CHART_COLORS.crosshair,
};

export function VolumeTradingChart ( {
  candles,
  symbol,
  height = 200,
  className = '',
  lines = []
}: VolumeTradingChartProps )
{
  const chartRef = useRef<echarts.ECharts | null>( null );
  const containerRef = useRef<HTMLDivElement>( null );

  const [ xRange, setXRange ] = useState( { start: 0, end: 100 } );
  const [ yRange, setYRange ] = useState<{ min: number | null; max: number | null }>( { min: null, max: null } );
  const [ dragMode, setDragMode ] = useState<'none' | 'pan' | 'yScale'>( 'none' );

  const heightClass = useMemo( () => `volume-trading-chart-${ Math.round( height ) }`, [ height ] );
  const heightStyle = useMemo( () => `.${ heightClass }{height:${ height }px;}`, [ heightClass, height ] );
  const cursorClass = dragMode === 'pan'
    ? 'cursor-grabbing'
    : dragMode === 'yScale'
      ? 'cursor-ns-resize'
      : 'cursor-crosshair';

  const dragRef = useRef( {
    startX: 0,
    startY: 0,
    startXRange: { start: 0, end: 100 },
    startYRange: { min: 0, max: 0 }
  } );

  const chartData = useMemo( () =>
  {
    const candleData = candles.map( c => [ c.open, c.close, c.low, c.high ] );
    const volumeData = candles.map( ( c, i ) => [ i, c.volume, c.open > c.close ? -1 : 1 ] );
    const categoryData = candles.map( c => new Date( c.timestamp ).toLocaleTimeString() );
    return { candleData, volumeData, categoryData };
  }, [ candles ] );

  const visiblePriceRange = useMemo( () =>
  {
    if ( !candles || candles.length === 0 ) return { min: 0, max: 100 };
    const startIdx = Math.floor( candles.length * xRange.start / 100 );
    const endIdx = Math.ceil( candles.length * xRange.end / 100 );
    const visible = candles.slice( Math.max( 0, startIdx ), Math.min( candles.length, endIdx + 1 ) );
    if ( visible.length === 0 ) return { min: 0, max: 100 };
    let min = Infinity, max = -Infinity;
    for ( const c of visible )
    {
      if ( c.low < min ) min = c.low;
      if ( c.high > max ) max = c.high;
    }
    const padding = ( max - min ) * 0.1;
    return { min: min - padding, max: max + padding };
  }, [ candles, xRange ] );

  const markLines = useMemo( () =>
  {
    return lines.map( line => ( {
      symbol: [ 'none', 'none' ],
      label: { show: false },
      lineStyle: {
        color: line.color || '#3b82f6',
        type: line.style || 'solid',
        width: 2
      },
      data: [
        [
          { coord: [ line.points[ 0 ].time, line.points[ 0 ].value ] },
          { coord: [ line.points[ 1 ].time, line.points[ 1 ].value ] }
        ]
      ]
    } ) );
  }, [ lines ] );

  const option = useMemo( () => ( {
    backgroundColor: THEME.background,
    animation: false,
    tooltip: { show: false },
    axisPointer: { link: [ { xAxisIndex: 'all' } ] },
    grid: [
      { left: 5, right: 45, top: 5, height: '60%' },
      { left: 5, right: 45, top: '70%', height: '25%' }
    ],
    xAxis: [
      {
        type: 'category',
        data: chartData.categoryData,
        gridIndex: 0,
        axisLine: { show: false },
        axisLabel: { show: false },
        splitLine: { show: true, lineStyle: { color: THEME.grid, type: 'dashed' } }
      },
      {
        type: 'category',
        data: chartData.categoryData,
        gridIndex: 1,
        axisLine: { show: false },
        axisLabel: { color: THEME.text, fontSize: 9 },
        splitLine: { show: false }
      }
    ],
    yAxis: [
      {
        scale: true,
        gridIndex: 0,
        position: 'right',
        min: yRange.min ?? visiblePriceRange.min,
        max: yRange.max ?? visiblePriceRange.max,
        axisLabel: { color: THEME.text, fontSize: 10 },
        splitLine: { show: true, lineStyle: { color: THEME.grid, type: 'dashed' } }
      },
      {
        scale: true,
        gridIndex: 1,
        position: 'right',
        axisLabel: { show: false },
        splitLine: { show: false }
      }
    ],
    dataZoom: [ { type: 'inside', xAxisIndex: [ 0, 1 ], start: xRange.start, end: xRange.end } ],
    series: [
      {
        type: 'candlestick',
        data: chartData.candleData,
        itemStyle: {
          color: THEME.candleUp,
          color0: THEME.candleDown,
          borderColor: THEME.candleUp,
          borderColor0: THEME.candleDown
        },
        markLine: markLines.length > 0 ? { data: markLines.flatMap( m => m.data ) } : undefined
      },
      {
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: chartData.volumeData.map( v => ( {
          value: v[ 1 ],
          itemStyle: { color: v[ 2 ] === 1 ? THEME.candleUp : THEME.candleDown, opacity: 0.5 }
        } ) )
      }
    ]
  } ), [ chartData, xRange, yRange, visiblePriceRange, markLines ] );

  const handleMouseDown = useCallback( ( e: React.MouseEvent ) =>
  {
    if ( !containerRef.current ) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if ( x > rect.width - 55 )
    {
      setDragMode( 'yScale' );
    } else
    {
      setDragMode( 'pan' );
    }
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startXRange: { ...xRange },
      startYRange: { min: yRange.min ?? visiblePriceRange.min, max: yRange.max ?? visiblePriceRange.max }
    };
  }, [ xRange, yRange, visiblePriceRange ] );

  const handleMouseMove = useCallback( ( e: React.MouseEvent ) =>
  {
    if ( dragMode === 'none' ) return;
    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;
    const rect = containerRef.current!.getBoundingClientRect();

    if ( dragMode === 'pan' )
    {
      const pixelsPerPercent = rect.width / 100;
      const percentDelta = -deltaX / pixelsPerPercent;
      setXRange( {
        start: Math.max( 0, Math.min( 100 - 5, dragRef.current.startXRange.start + percentDelta ) ),
        end: Math.max( 5, Math.min( 100, dragRef.current.startXRange.end + percentDelta ) )
      } );
    } else if ( dragMode === 'yScale' )
    {
      const priceRange = dragRef.current.startYRange.max - dragRef.current.startYRange.min;
      const scaleFactor = 1 + ( deltaY / rect.height ) * 2;
      const midPrice = ( dragRef.current.startYRange.max + dragRef.current.startYRange.min ) / 2;
      setYRange( {
        min: midPrice - ( priceRange / 2 ) * scaleFactor,
        max: midPrice + ( priceRange / 2 ) * scaleFactor
      } );
    }
  }, [ dragMode ] );

  // Handle wheel - Zoom
  const handleWheel = useCallback( ( e: React.WheelEvent ) =>
  {
    e.preventDefault();
    if ( !containerRef.current ) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const chartWidth = rect.width - 55;

    const zoomCenter = Math.min( 100, Math.max( 0, ( x / chartWidth ) * 100 ) );
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;

    const currentSpan = xRange.end - xRange.start;
    const newSpan = Math.min( 100, Math.max( 5, currentSpan * zoomFactor ) );

    const zoomPointInRange = xRange.start + ( zoomCenter / 100 ) * currentSpan;
    const leftRatio = ( zoomPointInRange - xRange.start ) / currentSpan;

    let newStart = zoomPointInRange - leftRatio * newSpan;
    let newEnd = newStart + newSpan;

    if ( newStart < 0 ) { newEnd -= newStart; newStart = 0; }
    if ( newEnd > 100 ) { newStart -= ( newEnd - 100 ); newEnd = 100; }

    setXRange( { start: Math.max( 0, newStart ), end: Math.min( 100, newEnd ) } );
  }, [ xRange ] );

  return (
    <div
      ref={ containerRef }
      className={ `relative select-none ${ heightClass } ${ cursorClass } ${ className }` }
      onMouseDown={ handleMouseDown }
      onMouseMove={ handleMouseMove }
      onMouseUp={ () => setDragMode( 'none' ) }
      onMouseLeave={ () => setDragMode( 'none' ) }
      onDoubleClick={ () => { setXRange( { start: 0, end: 100 } ); setYRange( { min: null, max: null } ); } }
      onWheel={ handleWheel }
    >
      <style>{ heightStyle }</style>
      <ReactECharts
        ref={ ( e ) => { if ( e ) chartRef.current = e.getEchartsInstance(); } }
        option={ option }
        className="h-full w-full pointer-events-none"
        opts={ { renderer: 'canvas' } }
      />
    </div>
  );
}
