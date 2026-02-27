/**
 * SubIndicatorChartV2 - Sub-charts for oscillator indicators
 * Rebuilt with clean architecture
 */

"use client";

import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsCoreOption as EChartsOption } from 'echarts';
import
{
  calculateRSI,
  calculateMACD,
  calculateStochRSI,
  calculateOBV,
  calculateADX,
  calculateMFI,
  calculateWilliamsR,
  calculateCCI,
  calculateROC,
  calculateUltimateOscillator,
  calculateCMF,
  calculateForceIndex,
  calculateChoppiness,
  calculateTRIX,
  calculateAwesomeOscillator,
  calculateConnorsRSI,
  calculateLaguerreRSI,
  calculateVWAP,
  calculateCVD,
  calculateKlinger,
  calculateFisherTransform
} from '../../indicators/main';
import
{
  calculateSuperSmoother,
  calculateInstantaneousTrendline,
  calculateMAMA,
  calculateFRAMA,
  calculateCyberCycle
} from '../../lib/indicators/ehlers-dsp';
import type { CandleData } from './types';
import { ChartConfig } from '../../lib/ChartConfig';
import { ChartContainer } from './ChartContainer';

const INDICATOR_LABELS: Record<string, string> = {
  volume: 'Volume',
  rsi: 'RSI',
  macd: 'MACD',
  stochRsi: 'Stochastic RSI',
  obv: 'On-Balance Volume (OBV)',
  adx: 'ADX',
  mfi: 'Money Flow Index (MFI)',
  connorsRsi: 'Connors RSI',
  laguerreRsi: 'Laguerre RSI',
  vwap: 'VWAP',
  cvd: 'CVD',
  klinger: 'Klinger Oscillator',
  superSmoother: 'التمليس الفائق (Super Smoother)',
  instantaneousTrendline: 'خط الاتجاه اللحظي (Instantaneous Trend)',
  fisherTransform: 'تحويل فيشر (Fisher Transform)',
  mama: 'MAMA التكيفي',
  frama: 'المتوسط الفركتالي (FRAMA)',
  cyberCycle: 'الدورة السيبرانية (Cyber Cycle)',
  williamsR: 'Williams %R',
  advancedCci: 'CCI',
  momentumRoc: 'ROC',
  ultimateOsc: 'Ultimate Oscillator',
  cmf: 'Chaikin Money Flow (CMF)',
  forceIndex: 'Force Index',
  choppiness: 'Choppiness Index',
  trix: 'TRIX',
  awesomeOsc: 'Awesome Oscillator (AO)'
};

// ============================================
// Types
// ============================================

export interface SubChartProps
{
  data: CandleData[];
  indicator: 'volume' | 'rsi' | 'macd' | 'stochRsi' | 'obv' | 'adx' | 'mfi' | string;
  height?: number;
  onToggle?: ( indicator: string, value: boolean ) => void;
}

// ============================================
// SubIndicatorChartV2 Component
// ============================================

export function SubIndicatorChartV2 ( { data, indicator, height = 150, onToggle }: SubChartProps )
{
  const chartRef = useRef<any>( null );
  const containerRef = useRef<HTMLDivElement>( null );
  const [ xRange, setXRange ] = useState( { start: 0, end: 100 } );
  const [ yRange, setYRange ] = useState<{ min: number | null; max: number | null }>( { min: null, max: null } );
  const [ dragMode, setDragMode ] = useState<'none' | 'pan' | 'yScale' | 'xScale'>( 'none' );
  const panStartX = useRef<number>( 0 );
  const panStartRange = useRef<{ start: number; end: number }>( { start: 0, end: 100 } );
  const dragStartY = useRef<number>( 0 );
  const dragStartYRange = useRef<{ min: number; max: number }>( { min: 0, max: 0 } );

  // Handle Y-axis drag for zoom
  const handleMouseDown = useCallback( ( e: React.MouseEvent ) =>
  {
    const rect = ( e.currentTarget as HTMLElement ).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // Check if click is on Y-axis area (right side)
    if ( x > rect.width - 50 )
    {
      setDragMode( 'yScale' );
      dragStartY.current = e.clientY;
      const chart = chartRef.current?.getEchartsInstance();
      if ( chart )
      {
        const yAxis = chart.getModel().getComponent( 'yAxis', 0 );
        if ( yAxis )
        {
          const axis = yAxis.axis;
          dragStartYRange.current = { min: axis.scale.getExtent()[ 0 ], max: axis.scale.getExtent()[ 1 ] };
        }
      }
    }
    else if ( y > rect.height - 40 )
    {
      setDragMode( 'xScale' );
      panStartX.current = e.clientX;
      panStartRange.current = { ...xRange };
    }
    else
    {
      setDragMode( 'pan' );
      panStartX.current = e.clientX;
      panStartRange.current = { ...xRange };
    }
  }, [ xRange ] );

  const handleMouseMove = useCallback( ( e: React.MouseEvent ) =>
  {
    const rect = ( e.currentTarget as HTMLElement ).getBoundingClientRect();

    if ( dragMode === 'none' ) return;

    const deltaY = e.clientY - dragStartY.current;

    if ( dragMode === 'yScale' )
    {
      const range = dragStartYRange.current.max - dragStartYRange.current.min;
      const scale = 1 + deltaY * 0.005;
      const newRange = range * scale;
      const center = ( dragStartYRange.current.max + dragStartYRange.current.min ) / 2;
      setYRange( {
        min: center - newRange / 2,
        max: center + newRange / 2
      } );
      return;
    }

    if ( dragMode === 'pan' )
    {
      const deltaX = e.clientX - panStartX.current;
      const percentDelta = -( deltaX / rect.width ) * 100;

      let newStart = panStartRange.current.start + percentDelta;
      let newEnd = panStartRange.current.end + percentDelta;

      if ( newStart < 0 )
      {
        newEnd -= newStart;
        newStart = 0;
      }
      if ( newEnd > 100 )
      {
        newStart -= ( newEnd - 100 );
        newEnd = 100;
      }

      setXRange( {
        start: Math.max( 0, newStart ),
        end: Math.min( 100, newEnd )
      } );
      return;
    }

    if ( dragMode === 'xScale' )
    {
      const dx = ( e.clientX - panStartX.current ) / rect.width;
      const currentRange = panStartRange.current.end - panStartRange.current.start;
      const scale = 1 - dx * 2;
      const newRange = Math.min( ChartConfig.INTERACTIONS.zoom.maxSpan, Math.max( ChartConfig.INTERACTIONS.zoom.minSpan, currentRange * scale ) );
      const center = ( panStartRange.current.start + panStartRange.current.end ) / 2;

      let newStart = center - newRange / 2;
      let newEnd = center + newRange / 2;

      if ( newStart < 0 )
      {
        newStart = 0;
        newEnd = newRange;
      }
      if ( newEnd > 100 )
      {
        newEnd = 100;
        newStart = 100 - newRange;
      }

      setXRange( { start: newStart, end: newEnd } );
    }
  }, [ dragMode ] );

  const handleMouseUp = useCallback( () =>
  {
    setDragMode( 'none' );
  }, [] );

  const handleDoubleClick = useCallback( ( e: React.MouseEvent ) =>
  {
    const rect = ( e.currentTarget as HTMLElement ).getBoundingClientRect();
    const x = e.clientX - rect.left;
    // Double click on Y-axis resets zoom
    if ( x > rect.width - 50 )
    {
      setYRange( { min: null, max: null } );
    } else
    {
      setXRange( { start: 0, end: 100 } );
    }
  }, [] );

  const handleWheel = useCallback( ( e: React.WheelEvent ) =>
  {
    e.preventDefault();
    const rect = ( e.currentTarget as HTMLElement ).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const zoomCenter = Math.min( 100, Math.max( 0, ( x / rect.width ) * 100 ) );
    const zoomFactor = e.deltaY > 0 ? ChartConfig.INTERACTIONS.zoom.factor : ( 1 / ChartConfig.INTERACTIONS.zoom.factor );
    const currentSpan = xRange.end - xRange.start;
    const newSpan = Math.min( ChartConfig.INTERACTIONS.zoom.maxSpan, Math.max( ChartConfig.INTERACTIONS.zoom.minSpan, currentSpan * zoomFactor ) );

    const zoomPointInRange = xRange.start + ( zoomCenter / 100 ) * currentSpan;
    const leftRatio = ( zoomPointInRange - xRange.start ) / currentSpan;

    let newStart = zoomPointInRange - leftRatio * newSpan;
    let newEnd = newStart + newSpan;

    if ( newStart < 0 )
    {
      newEnd -= newStart;
      newStart = 0;
    }
    if ( newEnd > 100 )
    {
      newStart -= ( newEnd - 100 );
      newEnd = 100;
    }

    setXRange( {
      start: Math.max( 0, newStart ),
      end: Math.min( 100, newEnd )
    } );
  }, [ xRange ] );

  // Pointer Events (mouse + touch)
  const handlePointerDown = useCallback( ( e: React.PointerEvent<HTMLDivElement> ) =>
  {
    try
    {
      ( e.currentTarget as any ).setPointerCapture?.( e.pointerId );
    } catch { /* ignore */ }
    // Only prevent default if we're not scrolling.
    // We let handleMouseDown decide dragMode.
    handleMouseDown( e as any );
  }, [ handleMouseDown ] );

  const handlePointerMove = useCallback( ( e: React.PointerEvent<HTMLDivElement> ) =>
  {
    if ( e.pointerType === 'touch' && dragMode !== 'none' ) e.preventDefault();
    handleMouseMove( e as any );
  }, [ handleMouseMove, dragMode ] );

  const handlePointerUp = useCallback( ( e: React.PointerEvent<HTMLDivElement> ) =>
  {
    try
    {
      ( e.currentTarget as any ).releasePointerCapture?.( e.pointerId );
    } catch { /* ignore */ }
    handleMouseUp();
  }, [ handleMouseUp ] );

  // Ensure chart resizes correctly when container/height/data changes
  useEffect( () =>
  {
    const chart = chartRef.current?.getEchartsInstance?.();
    if ( !chart || !containerRef.current ) return;

    chart.resize();

    const resizeObserver = new ResizeObserver( () =>
    {
      chart.resize();
    } );

    resizeObserver.observe( containerRef.current );

    return () =>
    {
      resizeObserver.disconnect();
    };
  }, [ height, data.length, indicator ] );

  // Build ECharts option based on indicator type
  const option: EChartsOption = useMemo( () =>
  {
    let series: any[] = [];
    let yAxisConfig: any = { type: 'value', position: 'right' };
    const colors = ChartConfig.COLORS_DARK;

    switch ( indicator )
    {
      case 'rsi': {
        const rsi = calculateRSI( data );
        series = [ {
          name: 'RSI',
          type: 'line',
          data: rsi,
          smooth: true,
          lineStyle: { color: '#9C27B0', width: 2 },
          areaStyle: { color: 'rgba(156, 39, 176, 0.1)' },
          showSymbol: false
        } ];
        yAxisConfig = {
          ...yAxisConfig,
          min: 0,
          max: 100,
          splitLine: { lineStyle: { color: colors.grid, type: 'dashed' } }
        };
        break;
      }

      case 'macd': {
        const { macdLine, signalLine, histogram } = calculateMACD( data );
        series = [
          {
            name: 'MACD',
            type: 'line',
            data: macdLine,
            lineStyle: { color: '#2196F3', width: 2 },
            showSymbol: false
          },
          {
            name: 'Signal',
            type: 'line',
            data: signalLine,
            lineStyle: { color: '#FF9800', width: 2 },
            showSymbol: false
          },
          {
            name: 'Histogram',
            type: 'bar',
            data: histogram,
            itemStyle: {
              color: ( params: any ) => params.value >= 0 ? colors.candleUp : colors.candleDown
            }
          }
        ];
        break;
      }

      case 'stochRsi': {
        const { k, d } = calculateStochRSI( data );
        series = [
          {
            name: '%K',
            type: 'line',
            data: k,
            lineStyle: { color: '#00BCD4', width: 2 },
            showSymbol: false
          },
          {
            name: '%D',
            type: 'line',
            data: d,
            lineStyle: { color: '#FF5722', width: 2 },
            showSymbol: false
          }
        ];
        yAxisConfig = {
          ...yAxisConfig,
          min: 0,
          max: 100
        };
        break;
      }

      case 'obv': {
        const obv = calculateOBV( data );
        series = [ {
          name: 'OBV',
          type: 'line',
          data: obv,
          smooth: true,
          lineStyle: { color: '#4CAF50', width: 2 },
          areaStyle: { color: 'rgba(76, 175, 80, 0.1)' },
          showSymbol: false
        } ];
        break;
      }

      case 'volume': {
        const volumeData = data.map( ( d, i ) =>
        {
          const color = i > 0 && d.close >= data[ i - 1 ].close ? colors.candleUp : colors.candleDown;
          return { value: d.volume, itemStyle: { color } };
        } );
        series = [ {
          name: 'Volume',
          type: 'bar',
          data: volumeData
        } ];
        break;
      }

      case 'adx': {
        const adx = calculateADX( data );
        series = [
          { name: 'ADX', type: 'line', data: adx.adx, lineStyle: { color: '#FF9800', width: 2 }, showSymbol: false },
          { name: '+DI', type: 'line', data: adx.pdi, lineStyle: { color: '#4CAF50', width: 1 }, showSymbol: false },
          { name: '-DI', type: 'line', data: adx.mdi, lineStyle: { color: '#F44336', width: 1 }, showSymbol: false }
        ];
        yAxisConfig = { ...yAxisConfig, min: 0, max: 100 };
        break;
      }

      case 'mfi': {
        const mfi = calculateMFI( data );
        series = [ {
          name: 'MFI', type: 'line', data: mfi, smooth: true,
          lineStyle: { color: '#E91E63', width: 2 },
          areaStyle: { color: 'rgba(233, 30, 99, 0.1)' }, showSymbol: false
        } ];
        yAxisConfig = { ...yAxisConfig, min: 0, max: 100 };
        break;
      }

      case 'williamsR': {
        const wr = calculateWilliamsR( data );
        series = [ {
          name: 'Williams %R', type: 'line', data: wr, smooth: true,
          lineStyle: { color: '#673AB7', width: 2 }, showSymbol: false
        } ];
        yAxisConfig = { ...yAxisConfig, min: -100, max: 0 };
        break;
      }

      case 'advancedCci':
      case 'cci': {
        const cci = calculateCCI( data );
        series = [ {
          name: 'CCI', type: 'line', data: cci, smooth: true,
          lineStyle: { color: '#00BCD4', width: 2 }, showSymbol: false
        } ];
        yAxisConfig = { ...yAxisConfig, min: -200, max: 200 };
        break;
      }

      case 'momentumRoc': {
        const roc = calculateROC( data );
        series = [ {
          name: 'ROC', type: 'line', data: roc, smooth: true,
          lineStyle: { color: '#3F51B5', width: 2 },
          areaStyle: { color: 'rgba(63, 81, 181, 0.1)' }, showSymbol: false
        } ];
        break;
      }

      case 'ultimateOsc': {
        const uo = calculateUltimateOscillator( data );
        series = [ {
          name: 'Ultimate Osc', type: 'line', data: uo, smooth: true,
          lineStyle: { color: '#009688', width: 2 }, showSymbol: false
        } ];
        yAxisConfig = { ...yAxisConfig, min: 0, max: 100 };
        break;
      }

      case 'cmf': {
        const cmf = calculateCMF( data );
        series = [ {
          name: 'CMF', type: 'line', data: cmf, smooth: true,
          lineStyle: { color: '#795548', width: 2 },
          areaStyle: { color: ( params: any ) => params.value >= 0 ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)' },
          showSymbol: false
        } ];
        yAxisConfig = { ...yAxisConfig, min: -1, max: 1 };
        break;
      }

      case 'forceIndex': {
        const fi = calculateForceIndex( data );
        series = [ {
          name: 'Force Index', type: 'line', data: fi, smooth: true,
          lineStyle: { color: '#607D8B', width: 2 }, showSymbol: false
        } ];
        break;
      }

      case 'choppiness': {
        const chop = calculateChoppiness( data );
        series = [ {
          name: 'Choppiness', type: 'line', data: chop, smooth: true,
          lineStyle: { color: '#FF5722', width: 2 }, showSymbol: false
        } ];
        yAxisConfig = { ...yAxisConfig, min: 0, max: 100 };
        break;
      }

      case 'trix': {
        const trix = calculateTRIX( data );
        series = [ {
          name: 'TRIX', type: 'line', data: trix, smooth: true,
          lineStyle: { color: '#8BC34A', width: 2 }, showSymbol: false
        } ];
        break;
      }

      case 'awesomeOsc': {
        const ao = calculateAwesomeOscillator( data );
        series = [ {
          name: 'AO', type: 'bar', data: ao.map( ( v, i ) => ( {
            value: v,
            itemStyle: { color: i > 0 && v > ao[ i - 1 ] ? colors.candleUp : colors.candleDown }
          } ) )
        } ];
        break;
      }

      case 'connorsRsi': {
        const crsi = calculateConnorsRSI( data );
        series = [ {
          name: 'Connors RSI', type: 'line', data: crsi, smooth: true,
          lineStyle: { color: '#9C27B0', width: 2 }, showSymbol: false
        } ];
        yAxisConfig = { ...yAxisConfig, min: 0, max: 100 };
        break;
      }

      case 'laguerreRsi': {
        const lrsi = calculateLaguerreRSI( data );
        series = [ {
          name: 'Laguerre RSI', type: 'line', data: lrsi, smooth: true,
          lineStyle: { color: '#E040FB', width: 2 }, showSymbol: false
        } ];
        yAxisConfig = { ...yAxisConfig, min: 0, max: 1 };
        break;
      }

      case 'vwap': {
        const vwap = calculateVWAP( data );
        series = [ {
          name: 'VWAP', type: 'line', data: vwap, smooth: false,
          lineStyle: { color: '#FFC107', width: 2 }, showSymbol: false
        } ];
        break;
      }

      case 'cvd': {
        const cvd = calculateCVD( data );
        series = [ {
          name: 'CVD', type: 'line', data: cvd, smooth: true,
          lineStyle: { color: '#2196F3', width: 2 },
          areaStyle: { color: 'rgba(33, 150, 243, 0.1)' }, showSymbol: false
        } ];
        break;
      }

      case 'klinger': {
        const klinger = calculateKlinger( data );
        series = [
          { name: 'KVO', type: 'line', data: klinger.kvo, lineStyle: { color: '#4CAF50', width: 2 }, showSymbol: false },
          { name: 'Signal', type: 'line', data: klinger.signal, lineStyle: { color: '#F44336', width: 1 }, showSymbol: false }
        ];
        break;
      }

      case 'fisherTransform': {
        const fisher = calculateFisherTransform( data );
        series = [
          { name: 'Fisher', type: 'line', data: fisher.fisher, lineStyle: { color: '#00BCD4', width: 2 }, showSymbol: false },
          { name: 'Trigger', type: 'line', data: fisher.trigger, lineStyle: { color: '#FF9800', width: 1 }, showSymbol: false }
        ];
        break;
      }

      case 'superSmoother': {
        const closes = data.map( d => d.close );
        const ss = calculateSuperSmoother( closes );
        series = [
          {
            name: 'Super Smoother',
            type: 'line',
            data: ss.values,
            smooth: true,
            lineStyle: { color: '#22d3ee', width: 2 },
            showSymbol: false
          }
        ];
        break;
      }

      case 'instantaneousTrendline': {
        const closes = data.map( d => d.close );
        const it = calculateInstantaneousTrendline( closes );
        series = [
          {
            name: 'Instantaneous Trendline',
            type: 'line',
            data: it.values,
            smooth: true,
            lineStyle: { color: '#38bdf8', width: 2 },
            showSymbol: false
          }
        ];
        break;
      }

      case 'mama': {
        const closes = data.map( d => d.close );
        const mama = calculateMAMA( closes );
        series = [
          { name: 'MAMA', type: 'line', data: mama.mamaArray, lineStyle: { color: '#f43f5e', width: 2 }, showSymbol: false },
          { name: 'FAMA', type: 'line', data: mama.famaArray, lineStyle: { color: '#f97316', width: 1.5 }, showSymbol: false }
        ];
        break;
      }

      case 'frama': {
        const ohlcv = data.map( d => ( {
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
          volume: d.volume || 0,
          timestamp: typeof d.time === 'number' ? d.time * 1000 : 0
        } ) );
        const frama = calculateFRAMA( ohlcv );
        const aligned: number[] = new Array( data.length ).fill( NaN );
        const offset = Math.max( 0, data.length - frama.framaArray.length );
        frama.framaArray.forEach( ( v, i ) =>
        {
          const idx = i + offset;
          if ( idx >= 0 && idx < aligned.length ) aligned[ idx ] = v;
        } );
        series = [
          { name: 'FRAMA', type: 'line', data: aligned, lineStyle: { color: '#6366f1', width: 2 }, showSymbol: false }
        ];
        break;
      }

      case 'cyberCycle': {
        const closes = data.map( d => d.close );
        const cc = calculateCyberCycle( closes );
        series = [
          { name: 'Cycle', type: 'line', data: cc.cycleArray, lineStyle: { color: '#84cc16', width: 2 }, showSymbol: false },
          { name: 'Trigger', type: 'line', data: cc.triggerArray, lineStyle: { color: '#f59e0b', width: 1.5 }, showSymbol: false }
        ];
        break;
      }

      default:
        // Fallback - show message for unimplemented indicators
        series = [];
    }

    return {
      ...ChartConfig.getBaseEChartsOptions(),
      grid: {
        left: ChartConfig.GRID.padding.left,
        right: ChartConfig.GRID.padding.right,
        top: 12,
        bottom: 50,
        containLabel: false
      },
      xAxis: {
        type: 'category',
        position: 'bottom',
        data: data.map( ( d: any ) =>
        {
          const date = new Date( d.timestamp || d.time );
          return `${ date.getDate() }/${ date.getMonth() + 1 } ${ date.getHours() }:${ date.getMinutes().toString().padStart( 2, '0' ) }`;
        } ),
        boundaryGap: indicator === 'volume',
        axisLine: { show: true, onZero: false, lineStyle: { color: 'rgba(255,255,255,0.15)' } },
        axisTick: { show: true, alignWithLabel: true, lineStyle: { color: 'rgba(255,255,255,0.15)' } },
        axisLabel: { show: true, color: '#94a3b8', fontSize: 10, hideOverlap: true, margin: 8, interval: 'auto', showMinLabel: true, showMaxLabel: true },
        splitLine: { show: false }
      },
      yAxis: {
        ...yAxisConfig,
        scale: true,
        min: yRange.min ?? undefined,
        max: yRange.max ?? undefined,
        axisLine: ChartConfig.PRICE_SCALE.axisLine,
        axisTick: ChartConfig.PRICE_SCALE.axisTick,
        axisLabel: {
          color: ChartConfig.PRICE_SCALE.text.color,
          fontSize: ChartConfig.PRICE_SCALE.text.fontSize,
          formatter: ( value: number ) =>
          {
            if ( indicator === 'volume' )
            {
              return value >= 1000000 ? `${ ( value / 1000000 ).toFixed( 1 ) }M` :
                value >= 1000 ? `${ ( value / 1000 ).toFixed( 1 ) }K` :
                  value.toFixed( 0 );
            }
            return value.toFixed( 2 );
          }
        },
        splitLine: {
          lineStyle: {
            color: ChartConfig.GRID.echarts.color,
            type: ChartConfig.GRID.echarts.type,
            opacity: ChartConfig.GRID.echarts.opacity
          }
        }
      },
      dataZoom: ChartConfig.getEChartsDataZoom( [ 0 ], xRange.start, xRange.end ),
      series
    };
  }, [ data, indicator, xRange, yRange ] );

  const cursorClass = dragMode === 'pan'
    ? 'cursor-grabbing'
    : dragMode === 'yScale'
      ? 'cursor-ns-resize'
      : dragMode === 'xScale'
        ? 'cursor-ew-resize'
        : 'cursor-crosshair';

  return (
    <ChartContainer title={ INDICATOR_LABELS[ indicator ] || indicator.toUpperCase() } height={ `${ height }px` } variant="pair-template" useGradient={ false }>
      <div
        ref={ containerRef }
        onPointerDown={ handlePointerDown }
        onPointerMove={ handlePointerMove }
        onPointerUp={ handlePointerUp }
        onPointerCancel={ handleMouseUp }
        onPointerLeave={ handlePointerUp }
        onDoubleClick={ handleDoubleClick }
        onWheel={ handleWheel }
        className={ `relative h-full w-full ${ cursorClass } chart-interaction-surface` }
      >
        {/* Y-axis scale zone */ }
        <div
          className="absolute top-0 right-0 bottom-0 w-[50px] pointer-events-none border-l border-white/10 bg-[linear-gradient(90deg,_transparent_0%,_#1a323266_100%)]"
        />
        <ReactECharts
          ref={ chartRef }
          option={ option }
          className="h-full w-full pointer-events-none"
          style={ { height: '100%', width: '100%' } }
          theme="dark"
          opts={ { renderer: 'canvas' } }
          lazyUpdate={ true }
        />
      </div>
    </ChartContainer>
  );
}

// ============================================
// Container for Multiple Sub-Charts
// ============================================

export interface SubChartsContainerProps
{
  data: CandleData[];
  indicators: {
    volume?: boolean;
    rsi?: boolean;
    macd?: boolean;
    stochRsi?: boolean;
    obv?: boolean;
    adx?: boolean;
    mfi?: boolean;
    connorsRsi?: boolean;
    laguerreRsi?: boolean;
    vwap?: boolean;
    cvd?: boolean;
    klinger?: boolean;
    superSmoother?: boolean;
    instantaneousTrendline?: boolean;
    fisherTransform?: boolean;
    mama?: boolean;
    frama?: boolean;
    cyberCycle?: boolean;
    williamsR?: boolean;
    advancedCci?: boolean;
    momentumRoc?: boolean;
    ultimateOsc?: boolean;
    cmf?: boolean;
    forceIndex?: boolean;
    choppiness?: boolean;
    trix?: boolean;
    awesomeOsc?: boolean;
  };
  onToggle?: ( indicator: string, value: boolean ) => void;
}

export function SubChartsContainerV2 ( { data, indicators, onToggle }: SubChartsContainerProps )
{
  const activeIndicators = Object.entries( indicators )
    .filter( ( [ _, enabled ] ) => enabled )
    .map( ( [ name ] ) => name );

  const handleSaveImage = ( indicator: string ) =>
  {
    const chartElement = document.querySelector( `[data-chart-id="${ indicator }"]` );
    if ( !chartElement ) return;

    const canvas = chartElement.querySelector( 'canvas' );
    if ( canvas )
    {
      const url = canvas.toDataURL( 'image/png' );
      const link = document.createElement( 'a' );
      link.download = `${ INDICATOR_LABELS[ indicator ] || indicator }-${ new Date().toISOString().slice( 0, 10 ) }.png`;
      link.href = url;
      link.click();
    }
  };

  if ( activeIndicators.length === 0 ) return null;

  return (
    <div className="flex flex-col gap-3 subcharts-stack custom-scrollbar pb-12 px-2 mt-4">
      { activeIndicators.map( ( indicator ) => (
        <div key={ indicator } className="indicator-chart-container rounded-xl border border-white/10 relative overflow-hidden export-keep-colors">
          <div className="p-4">
            <button
              onClick={ () => handleSaveImage( indicator ) }
              className="absolute top-2 left-2 z-10 p-2 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-colors"
              title="حفظ كصورة"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 2 } d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
            <div data-chart-id={ indicator }>
              <SubIndicatorChartV2
                data={ data }
                indicator={ indicator }
                height={ 152 }
                onToggle={ onToggle }
              />
            </div>
          </div>
        </div>
      ) ) }
    </div>
  );
}
