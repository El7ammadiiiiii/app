'use client';

/**
 * 📊 PatternTradingChart - شارت الأنماط الفنية
 * 
 * يستخدم ChartConfig لضمان توحيد الخلفية والألوان مع باقي الشارتات
 * 
 * @version 3.0.0
 */

import React, { useMemo, useRef, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import { ChartConfig } from '@/lib/ChartConfig';
import { DetectedPattern, OHLCV } from './types';
import { renderFallingWedge } from './renderers/falling-wedge';
import { renderRisingWedge } from './renderers/rising-wedge';
import { renderDescendingChannel } from './renderers/descending-channel';
import { renderAscendingChannel } from './renderers/ascending-channel';
import { renderRectangle } from './renderers/rectangle';
import { renderAscendingTriangle } from './renderers/ascending-triangle';
import { renderSymmetricalTriangle } from './renderers/symmetrical-triangle';
import { renderDescendingTriangle } from './renderers/descending-triangle';
import { renderBearishFlag } from './renderers/bearish-flag';
import { renderBullishFlag } from './renderers/bullish-flag';
import { renderBullishPennant } from './renderers/bullish-pennant';
import { renderBearishPennant } from './renderers/bearish-pennant';

/** Set to true only for local development debugging */
const DEBUG_PATTERN_CHART = false;

interface PatternTradingChartProps
{
  candles: OHLCV[];
  patterns: DetectedPattern[];
  width?: number | string;
  height?: number;
  className?: string;
  showVolume?: boolean;
  showRSI?: boolean;
  showMACD?: boolean;
  showTimeline?: boolean;
}

// === RSI حساب ===
function calcRSI ( closes: number[], period = 14 ): ( number | null )[]
{
  const rsi: ( number | null )[] = [];
  if ( closes.length < period + 1 ) return closes.map( () => null );

  let avgGain = 0, avgLoss = 0;
  for ( let i = 1; i <= period; i++ )
  {
    const diff = closes[ i ] - closes[ i - 1 ];
    if ( diff > 0 ) avgGain += diff; else avgLoss += Math.abs( diff );
  }
  avgGain /= period;
  avgLoss /= period;

  for ( let i = 0; i < period; i++ ) rsi.push( null );
  rsi.push( avgLoss === 0 ? 100 : 100 - 100 / ( 1 + avgGain / avgLoss ) );

  for ( let i = period + 1; i < closes.length; i++ )
  {
    const diff = closes[ i ] - closes[ i - 1 ];
    avgGain = ( avgGain * ( period - 1 ) + Math.max( diff, 0 ) ) / period;
    avgLoss = ( avgLoss * ( period - 1 ) + Math.max( -diff, 0 ) ) / period;
    rsi.push( avgLoss === 0 ? 100 : 100 - 100 / ( 1 + avgGain / avgLoss ) );
  }
  return rsi;
}

// === EMA حساب ===
function ema ( data: number[], period: number ): number[]
{
  const k = 2 / ( period + 1 );
  const result: number[] = [ data[ 0 ] ];
  for ( let i = 1; i < data.length; i++ )
    result.push( data[ i ] * k + result[ i - 1 ] * ( 1 - k ) );
  return result;
}

// === MACD حساب ===
function calcMACD ( closes: number[] ): { macd: number[]; signal: number[]; histogram: number[] }
{
  const ema12 = ema( closes, 12 );
  const ema26 = ema( closes, 26 );
  const macdLine = ema12.map( ( v, i ) => v - ema26[ i ] );
  const signalLine = ema( macdLine, 9 );
  const hist = macdLine.map( ( v, i ) => v - signalLine[ i ] );
  return { macd: macdLine, signal: signalLine, histogram: hist };
}

export function PatternTradingChart ( {
  candles = [],
  patterns = [],
  width = '100%',
  height = 450,
  className = '',
  showVolume = false,
  showRSI = false,
  showMACD = false,
  showTimeline = false,
}: PatternTradingChartProps )
{
  const instanceIdRef = useRef( `pattern-trading-chart-${ Math.random().toString( 36 ).slice( 2, 8 ) }` );
  const chartRef = useRef<ReactECharts | null>( null );
  const widthValue = typeof width === 'number' ? `${ width }px` : width;
  const heightValue = height ? `${ height }px` : '100%';
  const sizeClass = `${ instanceIdRef.current }-size`;

  // Whether this chart is used in modal (full interactive mode)
  const isFullMode = showTimeline;

  const chartData = useMemo( () =>
  {
    if ( !candles?.length ) return { candleData: [], categoryData: [], volumes: [], closes: [] };
    return {
      candleData: candles.map( c => [ c.open, c.close, c.low, c.high ] ),
      categoryData: candles.map( c =>
      {
        const d = new Date( c.timestamp );
        return showTimeline
          ? `${ d.getMonth() + 1 }/${ d.getDate() } ${ d.getHours() }:${ d.getMinutes().toString().padStart( 2, '0' ) }`
          : `${ d.getHours() }:${ d.getMinutes().toString().padStart( 2, '0' ) }`;
      } ),
      volumes: candles.map( c => c.volume || 0 ),
      closes: candles.map( c => c.close ),
    };
  }, [ candles, showTimeline ] );

  const hasSubIndicator = showVolume || showRSI || showMACD;

  const option = useMemo( () =>
  {
    const grids: any[] = [
      {
        left: 10, right: 75, top: 10,
        bottom: hasSubIndicator ? '35%' : 50,
        backgroundColor: 'transparent',
      }
    ];
    const xAxes: any[] = [
      {
        type: 'category',
        data: chartData.categoryData,
        gridIndex: 0,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: !hasSubIndicator, color: '#64748b', fontSize: 9 },
        splitLine: { show: true, lineStyle: { color: ChartConfig.GRID.horizontal.color } },
      }
    ];
    const yAxes: any[] = [
      {
        scale: true,
        position: 'right',
        gridIndex: 0,
        axisLine: { show: false },
        splitLine: { show: true, lineStyle: { color: ChartConfig.GRID.horizontal.color } },
        axisLabel: { color: '#94a3b8', fontSize: 10 },
      }
    ];
    // === Pattern rendering — per-pattern renderer routing ===
    const patternExtraSeries: any[] = [];
    const patternGraphicElements: any[] = [];

    const rendererMap: Array<{
      match: string;
      render: (pattern: DetectedPattern, candles: OHLCV[], categoryData: string[]) => { series: any[]; graphic: any[] };
    }> = [
      { match: 'falling wedge', render: renderFallingWedge },
      { match: 'rising wedge', render: renderRisingWedge },
      { match: 'descending channel', render: renderDescendingChannel },
      { match: 'ascending channel', render: renderAscendingChannel },
      { match: 'ranging channel', render: renderRectangle },
      { match: 'ascending triangle', render: renderAscendingTriangle },
      { match: 'symmetrical triangle', render: renderSymmetricalTriangle },
      { match: 'descending triangle', render: renderDescendingTriangle },
      { match: 'bearish flag', render: renderBearishFlag },
      { match: 'bullish flag', render: renderBullishFlag },
      { match: 'bullish pennant', render: renderBullishPennant },
      { match: 'bearish pennant', render: renderBearishPennant },
    ];

    if ( patterns.length > 0 && candles?.length > 0 )
    {
      for ( const pattern of patterns )
      {
        if ( !pattern.pivots?.length ) continue;

        // ── DEBUG: Log pattern data to diagnose rendering issues ──
        if ( DEBUG_PATTERN_CHART && typeof window !== 'undefined' )
        {
          const samplePivot = pattern.pivots[ 0 ];
          const candleAtPivot = candles[ samplePivot?.index ];
          console.log( `[PatternChart] ${ pattern.name } | pivots=${ pattern.pivots.length } range=[${ samplePivot?.index }]`, {
            candleH: candleAtPivot?.high, pivotPrice: samplePivot?.price,
            breakout: pattern.breakout?.detected ? pattern.breakout.direction : 'none',
          } );
        }

        const patternKey = ( pattern.name || '' ).toLowerCase();
        const renderer = rendererMap.find( ( r ) => patternKey.includes( r.match ) );
        if ( !renderer ) continue;

        const gfx = renderer.render( pattern, candles, chartData.categoryData );
        patternExtraSeries.push( ...gfx.series );
        patternGraphicElements.push( ...gfx.graphic );
      }
    }

    const series: any[] = [
      {
        type: 'candlestick',
        data: chartData.candleData,
        xAxisIndex: 0,
        yAxisIndex: 0,
        itemStyle: {
          color: ChartConfig.CANDLE.colors.up,
          color0: ChartConfig.CANDLE.colors.down,
          borderColor: ChartConfig.CANDLE.colors.upBorder,
          borderColor0: ChartConfig.CANDLE.colors.downBorder,
        },
      },
      // Append all per-pattern renderer series — enhanced for ECharts 6 compatibility
      ...patternExtraSeries.map( ( s: any ) =>
      {
        if ( s.type === 'scatter' )
        {
          return { ...s, encode: { x: 0, y: 1 } };
        }
        return s;
      } ),
    ];

    // === Sub-indicator grid ===
    if ( hasSubIndicator )
    {
      grids.push( { left: 10, right: 75, top: '72%', bottom: 35 } );
      xAxes.push( {
        type: 'category', data: chartData.categoryData, gridIndex: 1,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: '#64748b', fontSize: 9 },
        splitLine: { show: false },
      } );
      yAxes.push( {
        scale: true, position: 'right', gridIndex: 1,
        axisLine: { show: false },
        splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.03)' } },
        axisLabel: { color: '#64748b', fontSize: 9 },
      } );

      if ( showVolume )
      {
        series.push( {
          type: 'bar', data: chartData.volumes, xAxisIndex: 1, yAxisIndex: 1,
          itemStyle: {
            color: ( p: any ) =>
            {
              const idx = p.dataIndex;
              const cd = chartData.candleData[ idx ];
              return cd && cd[ 1 ] >= cd[ 0 ] ? 'rgba(8,153,129,0.5)' : 'rgba(242,54,69,0.5)';
            }
          },
          barMaxWidth: 6,
        } );
      }

      if ( showRSI )
      {
        const rsiData = calcRSI( chartData.closes );
        series.push( {
          type: 'line', data: rsiData, xAxisIndex: 1, yAxisIndex: 1,
          smooth: true, symbol: 'none', lineStyle: { color: '#a855f7', width: 1.5 },
        } );
        // RSI reference lines
        yAxes[ 1 ].min = 0;
        yAxes[ 1 ].max = 100;
        series.push(
          { type: 'line', data: rsiData.map( () => 70 ), xAxisIndex: 1, yAxisIndex: 1, symbol: 'none', lineStyle: { color: 'rgba(239,68,68,0.3)', type: 'dashed', width: 1 }, silent: true },
          { type: 'line', data: rsiData.map( () => 30 ), xAxisIndex: 1, yAxisIndex: 1, symbol: 'none', lineStyle: { color: 'rgba(34,197,94,0.3)', type: 'dashed', width: 1 }, silent: true },
        );
      }

      if ( showMACD )
      {
        const { macd, signal, histogram } = calcMACD( chartData.closes );
        series.push(
          { type: 'bar', data: histogram, xAxisIndex: 1, yAxisIndex: 1, barMaxWidth: 4, itemStyle: { color: ( p: any ) => p.value >= 0 ? 'rgba(8,153,129,0.6)' : 'rgba(242,54,69,0.6)' } },
          { type: 'line', data: macd, xAxisIndex: 1, yAxisIndex: 1, smooth: true, symbol: 'none', lineStyle: { color: '#06b6d4', width: 1.5 } },
          { type: 'line', data: signal, xAxisIndex: 1, yAxisIndex: 1, smooth: true, symbol: 'none', lineStyle: { color: '#f59e0b', width: 1.5 } },
        );
      }
    }

    return {
      backgroundColor: 'transparent',
      animation: false,
      grid: grids,
      xAxis: xAxes,
      yAxis: yAxes,
      series,
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          lineStyle: { color: 'rgba(255,255,255,0.25)', width: 1 },
          label: {
            show: true,
            backgroundColor: 'rgba(15,23,42,0.95)',
            color: '#e2e8f0',
            fontSize: 10,
            padding: [ 4, 8 ],
            borderRadius: 4,
          },
          snap: true,
        },
        backgroundColor: 'rgba(15,23,42,0.95)',
        borderColor: 'rgba(255,255,255,0.12)',
        textStyle: { color: '#e2e8f0', fontSize: 11 },
        formatter: isFullMode ? ( params: any ) =>
        {
          if ( !Array.isArray( params ) || params.length === 0 ) return '';
          const candle = params.find( ( p: any ) => p.seriesType === 'candlestick' );
          if ( !candle ) return '';
          const [ open, close, low, high ] = candle.data;
          const time = candle.axisValue || '';
          const vol = chartData.volumes[ candle.dataIndex ] || 0;
          const isUp = close >= open;
          const arrow = isUp ? '▲' : '▼';
          const clr = isUp ? '#089981' : '#f23645';
          return `<div style="font-size:11px;line-height:1.6">
            <div style="color:#94a3b8;margin-bottom:2px">${ time }</div>
            <div>O: <b style="color:${ clr }">${ open }</b></div>
            <div>H: <b style="color:#e2e8f0">${ high }</b></div>
            <div>L: <b style="color:#e2e8f0">${ low }</b></div>
            <div>C: <b style="color:${ clr }">${ close } ${ arrow }</b></div>
            <div style="color:#64748b">Vol: ${ vol.toLocaleString() }</div>
          </div>`;
        } : undefined,
      },
      // === dataZoom — TradingView-like interactions ===
      dataZoom: [
        // 1. X-axis inside: scroll-wheel to zoom, click-drag to pan
        {
          type: 'inside',
          xAxisIndex: hasSubIndicator ? [ 0, 1 ] : [ 0 ],
          start: 0,
          end: 100,
          minSpan: 5,
          maxSpan: 100,
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          moveOnMouseWheel: false,
          preventDefaultMouseMove: false,
        },
        // 2. Y-axis inside: click-drag also pans price axis vertically
        {
          type: 'inside',
          yAxisIndex: hasSubIndicator ? [ 0, 1 ] : [ 0 ],
          start: 0,
          end: 100,
          zoomOnMouseWheel: false,
          moveOnMouseMove: true,
          moveOnMouseWheel: false,
          preventDefaultMouseMove: false,
          filterMode: 'none',
        },
        // 3. X-axis bottom slider — always visible
        {
          type: 'slider',
          xAxisIndex: hasSubIndicator ? [ 0, 1 ] : [ 0 ],
          start: 0,
          end: 100,
          height: 18,
          bottom: hasSubIndicator ? 8 : 5,
          borderColor: 'rgba(255,255,255,0.08)',
          backgroundColor: 'rgba(255,255,255,0.03)',
          fillerColor: 'rgba(6,182,212,0.15)',
          handleStyle: { color: '#06b6d4', borderColor: '#06b6d4' },
          textStyle: { color: '#64748b', fontSize: 9 },
          dataBackground: {
            lineStyle: { color: 'rgba(255,255,255,0.1)' },
            areaStyle: { color: 'rgba(255,255,255,0.05)' },
          },
        },
        // 4. Y-axis right slider (main price axis) — always visible
        {
          type: 'slider',
          yAxisIndex: [ 0 ],
          right: 0,
          width: 18,
          start: 0,
          end: 100,
          borderColor: 'rgba(255,255,255,0.06)',
          backgroundColor: 'rgba(255,255,255,0.02)',
          fillerColor: 'rgba(6,182,212,0.12)',
          handleStyle: { color: '#06b6d4', borderColor: '#06b6d4' },
          textStyle: { show: false },
          showDetail: false,
          filterMode: 'none',
        },
        // 5. Y-axis right slider for sub-indicator panel
        ...( hasSubIndicator ? [ {
          type: 'slider',
          yAxisIndex: [ 1 ],
          right: 0,
          width: 18,
          start: 0,
          end: 100,
          borderColor: 'rgba(255,255,255,0.06)',
          backgroundColor: 'rgba(255,255,255,0.02)',
          fillerColor: 'rgba(6,182,212,0.12)',
          handleStyle: { color: '#06b6d4', borderColor: '#06b6d4' },
          textStyle: { show: false },
          showDetail: false,
          filterMode: 'none',
        } ] : [] ),
      ],
      // === Toolbox (modal only — cards stay clean) ===
      ...( isFullMode ? {
        toolbox: {
          show: true,
          right: 16,
          top: 8,
          feature: {
            dataZoom: {
              yAxisIndex: 'none',
              title: { zoom: 'تكبير', back: 'رجوع' },
              iconStyle: { borderColor: '#64748b' },
              emphasis: { iconStyle: { borderColor: '#06b6d4' } },
            },
            restore: {
              title: 'استعادة',
              iconStyle: { borderColor: '#64748b' },
              emphasis: { iconStyle: { borderColor: '#06b6d4' } },
            },
            saveAsImage: {
              title: 'حفظ',
              iconStyle: { borderColor: '#64748b' },
              emphasis: { iconStyle: { borderColor: '#06b6d4' } },
            },
          },
          iconStyle: { borderColor: '#475569' },
        },
      } : {} ),
      ...( patternGraphicElements.length > 0 ? { graphic: patternGraphicElements } : {} ),
    };
  }, [ chartData, patterns, candles, hasSubIndicator, showVolume, showRSI, showMACD, isFullMode ] );

  // Get chart ref callback for proper cleanup
  const onChartReady = useCallback( ( instance: any ) =>
  {
    if ( chartRef.current )
    {
      try
      {
        const prevInstance = ( chartRef.current as any )?.getEchartsInstance?.();
        if ( prevInstance && prevInstance !== instance )
        {
          prevInstance.dispose();
        }
      } catch { /* ignore cleanup errors */ }
    }
  }, [] );

  return (
    <div className={ `relative overflow-hidden ${ sizeClass } ${ className }` }>
      <style>{ `.${ sizeClass }{width:${ widthValue };height:${ heightValue };background:${ ChartConfig.BACKGROUND.surface };border-radius:12px;}` }</style>
      <ReactECharts
        ref={ chartRef }
        option={ option }
        notMerge={ true }
        lazyUpdate={ true }
        className="h-full w-full"
        opts={ { renderer: 'canvas' } }
        style={ { height: '100%', width: '100%' } }
        onChartReady={ onChartReady }
      />
      <div className="absolute bottom-2 left-3 opacity-[0.06] pointer-events-none select-none text-white font-bold text-[10px]">
        CCWAYS
      </div>
    </div>
  );
}

export default PatternTradingChart;
