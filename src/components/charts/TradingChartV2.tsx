/**
 * TradingChartV2 - Rebuilt from scratch using DivergenceTradingChart pattern
 * Clean, efficient implementation with proper interactions
 */

"use client";

import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsCoreOption as EChartsOption } from 'echarts';
import
{
  generateSMASeries,
  generateEMASeries,
  generateBollingerBandsSeries,
  generateKeltnerSeries,
  generateDonchianSeries,
  generateATRBandsSeries
} from '../../indicators/main';
import { generateSMCOverlays } from '../../indicators/main/SMCIndicators';
import type { CandleData } from './types';
import { ChartConfig } from '../../lib/ChartConfig';
import { ChartContainer } from './ChartContainer';

// ============================================
// Types
// ============================================

export type { CandleData } from './types';

export interface TradingChartProps
{
  data: CandleData[];
  height?: number | string;
  theme?: 'light' | 'dark';
  showVolume?: boolean;
  indicators?: {
    // Moving Averages
    sma10?: boolean;
    sma25?: boolean;
    sma50?: boolean;
    sma100?: boolean;
    sma200?: boolean;
    ema10?: boolean;
    ema25?: boolean;
    ema50?: boolean;
    ema100?: boolean;
    ema200?: boolean;

    // Bands
    bollingerBands?: boolean;
    keltner?: boolean;
    donchian?: boolean;
    atrBands?: boolean;

    // Overlay Indicators
    ichimoku?: boolean;
    parabolicSar?: boolean;
    pivots?: boolean;
    supertrend?: boolean;

    // SMC Indicators
    orderBlocks?: boolean;
    fairValueGaps?: boolean;
    marketStructure?: boolean;
    liquidityZones?: boolean;
    wyckoffEvents?: boolean;
    breakerBlocks?: boolean;

    // Ehlers DSP
    superSmoother?: boolean;
    instantaneousTrendline?: boolean;
    fisherTransform?: boolean;
    mama?: boolean;
    frama?: boolean;
    cyberCycle?: boolean;

    // Support & Resistance
    trendlines?: boolean;
    horizontalLevels?: boolean;
    fibonacciRetracements?: boolean;
    verticalResistance?: boolean;
    verticalSupport?: boolean;

    // Confluence & Risk
    confluenceZones?: boolean;
    fibonacciConfluence?: boolean;
    pivotPointConfluence?: boolean;
    riskRewardZones?: boolean;
    patternQualityScore?: boolean;

    // Breakout Detection
    breakoutDetection?: boolean;
    rangeBreakout?: boolean;
    volumeSurgeBreakout?: boolean;

    // AI Agents
    agent1UltraPrecision?: boolean;
    agent2ClassicPatterns?: boolean;
    agent3GeometricPatterns?: boolean;
    agent4ContinuationPatterns?: boolean;

    // ME - Custom Patterns (Wolfe Waves)
    me_wolfe_waves?: boolean;
    me_wolfe_bullish?: boolean;
    me_wolfe_bearish?: boolean;

    // ME - Linear Regression Channels
    me_linear_channel?: boolean;
    me_regression_trend?: boolean;
    me_regression_breakout?: boolean;
    me_lr_channel_tf?: boolean;
    me_ml_regression_trend?: boolean;

    // ME - Bitcoin Price Models
    me_btc_power_law?: boolean;

    // ME - Trend Lines
    me_trend_lines_v2?: boolean;
    me_trend_lines_lux?: boolean;
    me_trend_breaks?: boolean;
    me_dynamic_touch?: boolean;
    me_trend_line_methods?: boolean;
    me_trapper_trendlines?: boolean;
    me_pivot_span?: boolean;
    me_five_point_channel?: boolean;
    me_trend_support?: boolean;
    me_trend_resistance?: boolean;

    // ME - Auto Wedge Detection
    me_auto_wedge?: boolean;
    me_wedge_flag_finder?: boolean;
    me_wedge_rising?: boolean;
    me_wedge_falling?: boolean;

    // ME - Flag & Target Patterns
    me_flag_target?: boolean;
    me_flag_ultimate?: boolean;
    me_flag_pure?: boolean;
    me_flag_bull?: boolean;
    me_flag_bear?: boolean;

    // ME - Double Top/Bottom
    me_double_top?: boolean;
    me_double_bottom?: boolean;
    me_triple_top?: boolean;
    me_triple_bottom?: boolean;

    // ME - Support & Resistance
    me_dimensional_sr?: boolean;
    me_supply_demand_fvg?: boolean;
    me_volumetric_sr?: boolean;
    me_smart_range_breakout?: boolean;
    me_sr_logistic?: boolean;
    me_sr_dynamic?: boolean;
    me_sr_fibonacci?: boolean;
    me_sr_pivot_points?: boolean;
    me_sr_camarilla?: boolean;
    me_sr_woodie?: boolean;
    me_sr_demark?: boolean;
    me_sr_zones?: boolean;

    // ME - Harmonic Patterns
    me_nen_star?: boolean;
    me_abcd_pattern?: boolean;
    me_gartley?: boolean;
    me_butterfly?: boolean;
  };

  // Custom Overlays (for Pattern Cards)
  customMarkLines?: any[];
  customMarkPoints?: any[];
  customMarkAreas?: any[];
}

// ============================================
// Theme Constants
// ============================================

// THEME constant removed in favor of ChartConfig

// ============================================
// TradingChartV2 Component
// ============================================

export function TradingChartV2 ( {
  data,
  height = 500,
  theme = 'dark',
  showVolume = false,
  indicators = {},
  customMarkLines = [],
  customMarkPoints = [],
  customMarkAreas = []
}: TradingChartProps )
{
  const chartRef = useRef<any>( null );
  const containerRef = useRef<HTMLDivElement>( null );

  const chartTheme = ChartConfig.getTheme( theme || 'dark' );

  // ============================================
  // State Management
  // ============================================

  const [ xRange, setXRange ] = useState( { start: 0, end: 100 } ); // Show all data by default
  const [ yRange, setYRange ] = useState<{ min: number | null; max: number | null }>( { min: null, max: null } );
  const [ dragMode, setDragMode ] = useState<'none' | 'pan' | 'yScale' | 'xScale'>( 'none' );
  const [ dragStart, setDragStart ] = useState( { x: 0, y: 0, xRange: { start: 0, end: 100 }, yRange: { min: 0, max: 0 } } );

  // TradingView-style crosshair
  const [ crosshair, setCrosshair ] = useState<{ x: number; y: number; visible: boolean }>( { x: 0, y: 0, visible: false } );
  const [ hoveredCandle, setHoveredCandle ] = useState<{ index: number; data: CandleData } | null>( null );

  // ============================================
  // Data Preparation
  // ============================================

  const chartData = useMemo( () =>
  {
    return data.map( d => [ d.open, d.close, d.low, d.high ] );
  }, [ data ] );

  const rightGapCandles = useMemo( () =>
  {
    return Math.max( 4, Math.round( data.length * 0.015 ) );
  }, [ data.length ] );

  const categories = useMemo( () =>
  {
    return data.map( d =>
    {
      const date = new Date( d.time * 1000 );
      return date.toLocaleString( 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' } );
    } );
  }, [ data ] );

  // Infer timeframe from candle spacing for log-scale eligibility
  const inferredTimeframe = useMemo( () =>
  {
    if ( data.length < 2 ) return 'other';

    const t0 = data[ 0 ]?.time;
    const t1 = data[ 1 ]?.time;
    if ( typeof t0 !== 'number' || typeof t1 !== 'number' ) return 'other';

    let dt = Math.abs( t1 - t0 );
    if ( dt > 10000000000 ) dt = Math.floor( dt / 1000 );

    const is1d = Math.abs( dt - 86400 ) <= 3600;
    const is1w = Math.abs( dt - 604800 ) <= 6 * 3600;

    if ( is1d ) return '1d';
    if ( is1w ) return '1w';
    return 'other';
  }, [ data ] );

  const useLogScale = false;


  // Calculate visible data range
  const visibleData = useMemo( () =>
  {
    const startIdx = Math.floor( ( xRange.start / 100 ) * data.length );
    const endIdx = Math.ceil( ( xRange.end / 100 ) * data.length );
    return data.slice( startIdx, endIdx );
  }, [ data, xRange ] );

  const { visibleHigh, visibleLow } = useMemo( () =>
  {
    if ( visibleData.length === 0 ) return { visibleHigh: null, visibleLow: null };
    let high = -Infinity;
    let low = Infinity;
    visibleData.forEach( d =>
    {
      high = Math.max( high, d.high );
      low = Math.min( low, d.low );
    } );
    return { visibleHigh: high, visibleLow: low };
  }, [ visibleData ] );

  // Calculate Y-axis range
  const { yMin, yMax } = useMemo( () =>
  {
    const EPS = 1e-12;

    if ( yRange.min !== null && yRange.max !== null )
    {
      let min = yRange.min;
      let max = yRange.max;

      if ( useLogScale )
      {
        min = Math.max( EPS, min );
        max = Math.max( min * 1.0001, max );
      }

      return { yMin: min, yMax: max };
    }

    if ( visibleData.length === 0 )
    {
      return { yMin: 0, yMax: 100 };
    }

    let min = Infinity;
    let max = -Infinity;

    visibleData.forEach( d =>
    {
      min = Math.min( min, d.low );
      max = Math.max( max, d.high );
    } );

    if ( useLogScale )
    {
      min = Math.max( EPS, min );
      max = Math.max( min * 1.0001, max );
      const padFactor = 1.05;
      return { yMin: min / padFactor, yMax: max * padFactor };
    }

    const padding = ( max - min ) * 0.02;
    return { yMin: min - padding, yMax: max + padding };
  }, [ visibleData, yRange, useLogScale ] );

  useEffect( () =>
  {
    setYRange( { min: null, max: null } );
    setDragMode( 'none' );
  }, [ useLogScale ] );

  // ============================================
  // Interaction Handlers
  // ============================================

  const handleWheel = useCallback( ( e: React.WheelEvent ) =>
  {
    e.preventDefault();
    e.stopPropagation();

    const delta = e.deltaY > 0 ? 0.05 : -0.05;
    const range = xRange.end - xRange.start;
    const newRange = Math.max( 5, Math.min( 100, range + delta * 100 ) );
    const center = ( xRange.start + xRange.end ) / 2;

    setXRange( {
      start: Math.max( 0, center - newRange / 2 ),
      end: Math.min( 100, center + newRange / 2 )
    } );
  }, [ xRange ] );

  const handleMouseDown = useCallback( ( e: React.MouseEvent ) =>
  {
    if ( !containerRef.current ) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const isXScaleGesture = e.shiftKey;
    const isYScaleGesture = e.altKey || e.ctrlKey;

    if ( isYScaleGesture )
    {
      setDragMode( 'yScale' );
      setDragStart( { x, y, xRange, yRange: { min: yMin, max: yMax } } );
    }
    else if ( isXScaleGesture )
    {
      setDragMode( 'xScale' );
      setDragStart( { x, y, xRange, yRange: { min: yMin, max: yMax } } );
    }
    // Y-axis scaling zone (right 95px)
    else if ( x > rect.width - 95 )
    {
      setDragMode( 'yScale' );
      setDragStart( { x, y, xRange, yRange: { min: yMin, max: yMax } } );
    }
    // X-axis scaling zone (bottom 30px)
    else if ( y > rect.height - 30 )
    {
      setDragMode( 'xScale' );
      setDragStart( { x, y, xRange, yRange: { min: yMin, max: yMax } } );
    }
    else
    {
      // Pan mode
      setDragMode( 'pan' );
      setDragStart( { x, y, xRange, yRange: { min: yMin, max: yMax } } );
    }
  }, [ xRange, yMin, yMax ] );

  const handleMouseMove = useCallback( ( e: React.MouseEvent ) =>
  {
    if ( !containerRef.current ) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Update crosshair position
    if ( x > 5 && x < rect.width - 95 && y > 5 && y < rect.height - 30 )
    {
      setCrosshair( { x, y, visible: true } );

      // Calculate hovered candle
      const chartWidth = rect.width - 100; // excluding margins
      const visibleRange = xRange.end - xRange.start;
      const visibleDataCount = Math.ceil( ( visibleRange / 100 ) * data.length );
      const effectiveCount = visibleDataCount + rightGapCandles;
      const startIdx = Math.floor( ( xRange.start / 100 ) * data.length );

      const candleWidth = chartWidth / Math.max( 1, effectiveCount );
      const hoveredIdx = startIdx + Math.floor( ( x - 5 ) / candleWidth );

      if ( hoveredIdx >= 0 && hoveredIdx < data.length )
      {
        setHoveredCandle( { index: hoveredIdx, data: data[ hoveredIdx ] } );
      }
    } else
    {
      setCrosshair( { x, y, visible: false } );
      setHoveredCandle( null );
    }

    if ( dragMode === 'none' ) return;

    if ( dragMode === 'pan' )
    {
      const dx = ( ( dragStart.x - x ) / rect.width ) * 100;
      const newStart = dragStart.xRange.start + dx;
      const newEnd = dragStart.xRange.end + dx;
      const range = newEnd - newStart;

      if ( newStart < 0 )
      {
        setXRange( { start: 0, end: range } );
      } else if ( newEnd > 100 )
      {
        setXRange( { start: 100 - range, end: 100 } );
      } else
      {
        setXRange( { start: newStart, end: newEnd } );
      }

      const dy = ( y - dragStart.y ) / rect.height;
      if ( useLogScale )
      {
        const EPS = 1e-12;
        const startMin = Math.max( EPS, dragStart.yRange.min );
        const startMax = Math.max( startMin * 1.0001, dragStart.yRange.max );
        const logMin = Math.log10( startMin );
        const logMax = Math.log10( startMax );
        const span = logMax - logMin;
        const shift = dy * span;
        setYRange( { min: Math.pow( 10, logMin + shift ), max: Math.pow( 10, logMax + shift ) } );
      } else
      {
        const yRangeSpan = dragStart.yRange.max - dragStart.yRange.min;
        const shift = dy * yRangeSpan;
        setYRange( { min: dragStart.yRange.min + shift, max: dragStart.yRange.max + shift } );
      }
    } else if ( dragMode === 'yScale' )
    {
      const dy = ( y - dragStart.y ) / rect.height;
      const minSpan = Math.max( 1e-9, Math.abs( dragStart.yRange.max - dragStart.yRange.min ) * 0.02 );

      if ( useLogScale )
      {
        const EPS = 1e-12;
        const startMin = Math.max( EPS, dragStart.yRange.min );
        const startMax = Math.max( startMin * 1.0001, dragStart.yRange.max );
        const logMin = Math.log10( startMin );
        const logMax = Math.log10( startMax );
        const span = logMax - logMin;
        const newLogMin = logMin - dy * span;
        const newLogMax = logMax + dy * span;
        const nextMin = Math.pow( 10, newLogMin );
        const nextMax = Math.pow( 10, newLogMax );

        if ( nextMax - nextMin >= minSpan )
        {
          setYRange( { min: nextMin, max: nextMax } );
        }
      } else
      {
        const yRangeSpan = dragStart.yRange.max - dragStart.yRange.min;
        let newYMin = dragStart.yRange.min - dy * yRangeSpan;
        let newYMax = dragStart.yRange.max + dy * yRangeSpan;

        if ( newYMax - newYMin < minSpan )
        {
          const mid = ( newYMax + newYMin ) / 2;
          newYMin = mid - minSpan / 2;
          newYMax = mid + minSpan / 2;
        }

        setYRange( { min: newYMin, max: newYMax } );
      }
    } else if ( dragMode === 'xScale' )
    {
      // X-axis zoom by horizontal drag
      const dx = ( x - dragStart.x ) / rect.width;
      const currentRange = dragStart.xRange.end - dragStart.xRange.start;
      const scale = 1 - dx * 2; // Drag right = zoom in, drag left = zoom out
      const newRange = Math.max( 5, Math.min( 100, currentRange * scale ) );
      const center = ( dragStart.xRange.start + dragStart.xRange.end ) / 2;

      let newStart = center - newRange / 2;
      let newEnd = center + newRange / 2;

      // Clamp to bounds
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
  }, [ dragMode, dragStart, xRange, data, useLogScale ] );

  const handleMouseUp = useCallback( () =>
  {
    setDragMode( 'none' );
  }, [] );

  const handleMouseLeave = useCallback( () =>
  {
    setDragMode( 'none' );
    setCrosshair( { x: 0, y: 0, visible: false } );
    setHoveredCandle( null );
  }, [] );

  const handleDoubleClick = useCallback( () =>
  {
    setXRange( { start: 0, end: 100 } );
    setYRange( { min: null, max: null } );
  }, [] );

  // Pointer Events (mouse + touch) to match “modal-only” mobile UX
  const handlePointerDown = useCallback( ( e: React.PointerEvent<HTMLDivElement> ) =>
  {
    try
    {
      ( e.currentTarget as any ).setPointerCapture?.( e.pointerId );
    } catch { /* ignore */ }

    // For touch: stop browser panning/scrolling while interacting with chart
    if ( e.pointerType === 'touch' )
    {
      e.preventDefault();
    }

    handleMouseDown( e as any );
  }, [ handleMouseDown ] );

  const handlePointerMove = useCallback( ( e: React.PointerEvent<HTMLDivElement> ) =>
  {
    if ( e.pointerType === 'touch' )
    {
      e.preventDefault();
    }
    handleMouseMove( e as any );
  }, [ handleMouseMove ] );

  const handlePointerUp = useCallback( ( e: React.PointerEvent<HTMLDivElement> ) =>
  {
    try
    {
      ( e.currentTarget as any ).releasePointerCapture?.( e.pointerId );
    } catch { /* ignore */ }
    handleMouseUp();
  }, [ handleMouseUp ] );

  const handlePointerCancel = useCallback( () =>
  {
    handleMouseUp();
  }, [ handleMouseUp ] );

  // Ensure chart resizes correctly when container/height/data changes
  useEffect( () =>
  {
    const chart = chartRef.current?.getEchartsInstance?.();
    if ( !chart || !containerRef.current ) return;

    // Initial resize
    chart.resize();

    // Use ResizeObserver for container resizing
    const resizeObserver = new ResizeObserver( () =>
    {
      chart.resize();
    } );

    resizeObserver.observe( containerRef.current );

    return () =>
    {
      resizeObserver.disconnect();
    };
  }, [ height, data.length ] );

  // ============================================
  // ECharts Option Builder
  // ============================================

  const option: EChartsOption = useMemo( () =>
  {
    const series: any[] = [];

    // Candlestick series
    series.push( {
      name: 'K',
      type: 'candlestick',
      data: chartData,
      itemStyle: ChartConfig.getEChartsCandlestickStyle(),
      z: 10
    } );

    // Add Moving Averages
    if ( indicators.sma10 || indicators.sma25 || indicators.sma50 || indicators.sma100 || indicators.sma200 )
    {
      const smaSeries = generateSMASeries( data, {
        sma10: indicators.sma10,
        sma25: indicators.sma25,
        sma50: indicators.sma50,
        sma100: indicators.sma100,
        sma200: indicators.sma200,
      } );
      series.push( ...smaSeries );
    }

    if ( indicators.ema10 || indicators.ema25 || indicators.ema50 || indicators.ema100 || indicators.ema200 )
    {
      const emaSeries = generateEMASeries( data, {
        ema10: indicators.ema10,
        ema25: indicators.ema25,
        ema50: indicators.ema50,
        ema100: indicators.ema100,
        ema200: indicators.ema200,
      } );
      series.push( ...emaSeries );
    }

    // Add Bands
    if ( indicators.bollingerBands )
    {
      series.push( ...generateBollingerBandsSeries( data ) );
    }

    if ( indicators.keltner )
    {
      series.push( ...generateKeltnerSeries( data ) );
    }

    if ( indicators.donchian )
    {
      series.push( ...generateDonchianSeries( data ) );
    }

    if ( indicators.atrBands )
    {
      series.push( ...generateATRBandsSeries( data ) );
    }

    // ============================================
    // Pattern Overlays (SMC + Custom Only)
    // ============================================
    const allMarkPointData: any[] = [];
    const allMarkLineData: any[] = [];
    const allMarkAreaData: any[] = [];

    // Add Custom Overlays (from Pattern Cards)
    if ( customMarkLines && customMarkLines.length > 0 ) allMarkLineData.push( ...customMarkLines );
    if ( customMarkPoints && customMarkPoints.length > 0 ) allMarkPointData.push( ...customMarkPoints );
    if ( customMarkAreas && customMarkAreas.length > 0 ) allMarkAreaData.push( ...customMarkAreas );

    // Display 2: SMC Indicators
    if ( indicators.orderBlocks || indicators.fairValueGaps || indicators.marketStructure || indicators.liquidityZones )
    {
      const smcResult = generateSMCOverlays( data, indicators );
      if ( smcResult.markPoint?.data ) allMarkPointData.push( ...smcResult.markPoint.data );
      if ( smcResult.markLine?.data ) allMarkLineData.push( ...smcResult.markLine.data );
      if ( smcResult.markArea?.data ) allMarkAreaData.push( ...smcResult.markArea.data );
    }


    // High/Low of visible timeframe
    if ( visibleHigh !== null && visibleLow !== null )
    {
      allMarkLineData.push(
        {
          name: 'visible-high',
          yAxis: visibleHigh,
          lineStyle: { color: 'rgba(255,255,255,0.35)', type: 'dashed', width: 1 },
          label: {
            show: true,
            position: 'end',
            formatter: () => `أعلى سعر ${ ChartConfig.formatPrice( visibleHigh ) }`,
            backgroundColor: '#1b2f2d',
            borderRadius: 4,
            padding: [ 2, 6 ],
            color: '#e6f2ef',
            fontSize: 10
          }
        },
        {
          name: 'visible-low',
          yAxis: visibleLow,
          lineStyle: { color: 'rgba(255,255,255,0.35)', type: 'dashed', width: 1 },
          label: {
            show: true,
            position: 'end',
            formatter: () => `أقل سعر ${ ChartConfig.formatPrice( visibleLow ) }`,
            backgroundColor: '#1b2f2d',
            borderRadius: 4,
            padding: [ 2, 6 ],
            color: '#e6f2ef',
            fontSize: 10
          }
        }
      );
    }

    // Apply marks to candlestick
    if ( allMarkPointData.length > 0 )
    {
      series[ 0 ].markPoint = {
        symbol: 'pin',
        symbolSize: 30,
        label: { show: true, fontSize: 10, color: '#fff' },
        data: allMarkPointData
      };
    }

    if ( allMarkLineData.length > 0 )
    {
      series[ 0 ].markLine = {
        silent: true,
        symbol: [ 'none', 'none' ],
        animation: false,
        data: allMarkLineData
      };
    }

    if ( allMarkAreaData.length > 0 )
    {
      series[ 0 ].markArea = {
        silent: true,
        data: allMarkAreaData
      };
    }

    return {
      ...ChartConfig.getBaseEChartsOptions(),
      grid: ChartConfig.getEChartsGridConfig( false )[ 0 ],
      xAxis: {
        type: 'category',
        data: categories,
        boundaryGap: true,
        axisLine: ChartConfig.TIME_SCALE.axisLine,
        axisTick: ChartConfig.TIME_SCALE.axisTick,
        axisLabel: {
          color: ChartConfig.TIME_SCALE.text.color,
          fontSize: ChartConfig.TIME_SCALE.text.fontSize,
          margin: ChartConfig.TIME_SCALE.text.margin
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: ChartConfig.GRID.echarts.color,
            type: ChartConfig.GRID.echarts.type,
            opacity: ChartConfig.GRID.echarts.opacity
          }
        },
        min: 'dataMin',
        max: Math.max( 0, data.length - 1 + rightGapCandles )
      },
      yAxis: {
        type: useLogScale ? 'log' : 'value',
        logBase: 10,
        position: ChartConfig.PRICE_SCALE.position,
        scale: true,
        min: yMin,
        max: yMax,
        splitNumber: 8,
        axisLine: ChartConfig.PRICE_SCALE.axisLine,
        axisTick: ChartConfig.PRICE_SCALE.axisTick,
        axisLabel: {
          color: ChartConfig.PRICE_SCALE.text.color,
          fontSize: ChartConfig.PRICE_SCALE.text.fontSize,
          margin: 10,
          backgroundColor: '#1b2f2d',
          padding: [ 2, 6 ],
          borderRadius: 4,
          formatter: ( value: number ) => ChartConfig.formatPrice( value )
        },
        axisPointer: {
          label: {
            show: true,
            backgroundColor: '#1b2f2d',
            padding: [ 2, 6 ],
            borderRadius: 4,
            color: '#e6f2ef'
          }
        },
        splitLine: {
          show: true,
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
  }, [ data, chartData, categories, xRange, yMin, yMax, indicators, chartTheme, useLogScale, rightGapCandles, visibleHigh, visibleLow ] );

  // ============================================
  // Cursor Style
  // ============================================

  const cursorClass = dragMode === 'pan'
    ? 'cursor-grabbing'
    : dragMode === 'yScale'
      ? 'cursor-ns-resize'
      : 'cursor-crosshair';
  const textClass = theme === 'dark' ? 'text-[#d1d4dc]' : 'text-[#131722]';
  const textSecondaryClass = 'text-[#787b86]';
  const borderClass = theme === 'dark' ? 'border-white/[0.08]' : 'border-[#e0e3eb]';

  // Force resize when container size changes
  useEffect( () =>
  {
    if ( !containerRef.current || !chartRef.current ) return;
    const resizeObserver = new ResizeObserver( () =>
    {
      typeof height === 'number' ? `${ height }px` : height
      chartRef.current?.getEchartsInstance().resize();
    } );
    resizeObserver.observe( containerRef.current );
    return () => resizeObserver.disconnect();
  }, [] );

  return (
    <ChartContainer height={ `${ height }px` } mode={ theme || 'dark' } variant="pair-template" useGradient={ false }>
      <div
        ref={ containerRef }
        className={ `relative select-none overflow-hidden w-full h-full bg-transparent ${ cursorClass } chart-interaction-surface` }
        onPointerDown={ handlePointerDown }
        onPointerMove={ handlePointerMove }
        onPointerUp={ handlePointerUp }
        onPointerCancel={ handlePointerCancel }
        onPointerLeave={ handleMouseLeave }
        onDoubleClick={ handleDoubleClick }
        onWheel={ handleWheel }
      >
        {/* ME Indicators Display */ }
        { ( () =>
        {
          const meIndicators = Object.keys( indicators ).filter( key => key.startsWith( 'me_' ) && indicators[ key as keyof typeof indicators ] );
          if ( meIndicators.length === 0 ) return null;

          const meLabels: Record<string, string> = {
            me_wolfe_waves: '🌊 Wolfe Waves',
            me_wolfe_bullish: '🟢 Bullish Wolfe Wave',
            me_wolfe_bearish: '🔴 Bearish Wolfe Wave',
            me_linear_channel: '📐 Linear Regression Channel',
            me_regression_trend: '📈 Regression Trend',
            me_regression_breakout: '⚡ Regression Breakout',
            me_lr_channel_tf: '📊 LR Channel [TradingFinder]',
            me_ml_regression_trend: '🤖 ML Regression [LuxAlgo]',
            me_btc_power_law: '⚡ Bitcoin Power Law',
            me_trend_lines_v2: '📈 Trend Lines v2',
            me_trend_lines_lux: '📐 Trend Lines [LuxAlgo]',
            me_trend_breaks: '⚡ Trend Breaks',
            me_dynamic_touch: '🎯 Dynamic Touch Trendlines',
            me_trend_line_methods: '📐 Trend Line Methods',
            me_trapper_trendlines: '🪤 Trapper Trendlines',
            me_pivot_span: '🔶 Pivot Span',
            me_five_point_channel: '📊 5-Point Channel',
            me_trend_support: '🟢 Support Trend',
            me_trend_resistance: '🔴 Resistance Trend',
            me_auto_wedge: '🔺 Auto Wedge',
            me_wedge_flag_finder: '🔍 Wedge & Flag Finder',
            me_wedge_rising: '🔻 Rising Wedge',
            me_wedge_falling: '🔼 Falling Wedge',
            me_flag_target: '🚩 Flag Target',
            me_flag_ultimate: '🎯 Ultimate Flag',
            me_flag_pure: '✨ Pure Flag',
            me_flag_bull: '🟢 Bull Flag',
            me_flag_bear: '🔴 Bear Flag',
            me_double_top: '🔻 Double Top',
            me_double_bottom: '🔼 Double Bottom',
            me_triple_top: '🔻 Triple Top',
            me_triple_bottom: '🔼 Triple Bottom',
            me_dimensional_sr: '🛡️ Dimensional S&R',
            me_supply_demand_fvg: '📊 Supply/Demand + FVG',
            me_volumetric_sr: '📈 Volumetric S&R',
            me_smart_range_breakout: '⚡ Smart Range Breakout',
            me_sr_logistic: '🔢 S&R Logistic Regression',
            me_sr_dynamic: '🎯 Dynamic S&R',
            me_nen_star: '⭐ Nen Star Harmonic',
            me_abcd_pattern: '📐 ABCD Pattern',
            me_gartley: '🦋 Gartley',
            me_butterfly: '🦋 Butterfly',
          };

          return (
            <div
              className="absolute top-2 right-14 px-3 py-2 rounded-lg pointer-events-none z-50 bg-black/80 border border-purple-500/50 shadow-[0_0_20px_rgba(139,92,246,0.3)]"
            >
              <div className="text-xs font-bold text-purple-400 mb-1">🎯 ME Active:</div>
              { meIndicators.map( ( key: string ) => (
                <div key={ key } className="text-xs text-white font-medium">
                  { meLabels[ key ] || key }
                </div>
              ) ) }
            </div>
          );
        } )() }

        {/* TradingView-style Crosshair */ }
        { crosshair.visible && (
          <>
            {/* Vertical line */ }
            <div
              className={ `absolute top-0 bottom-0 w-px pointer-events-none crosshair-v-${ Math.round( crosshair.x ) }` }
            />
            {/* Horizontal line */ }
            <div
              className={ `absolute left-0 right-0 h-px pointer-events-none crosshair-h-${ Math.round( crosshair.y ) }` }
            />
            <style>{ `.crosshair-v-${ Math.round( crosshair.x ) }{left:${ crosshair.x }px;z-index:50;background-color:${ chartTheme.crosshair || 'rgba(255, 255, 255, 0.2)' };} .crosshair-h-${ Math.round( crosshair.y ) }{top:${ crosshair.y }px;z-index:50;background-color:${ chartTheme.crosshair || 'rgba(255, 255, 255, 0.2)' };}` }</style>

            {/* Price label on Y-axis */ }
            <div
              className={ `absolute right-0 px-2 py-1 text-xs font-mono rounded pointer-events-none translate-x-[2px] bg-[#1a3232] border ${ borderClass } ${ textClass } price-label-${ Math.round( crosshair.y ) }` }
            >
              { hoveredCandle ? hoveredCandle.data.close.toFixed( 2 ) : '' }
            </div>

            {/* Time label on X-axis */ }
            { hoveredCandle && (
              <div
                className={ `absolute bottom-0 px-2 py-1 text-xs font-mono rounded pointer-events-none translate-y-[2px] bg-[#1a3232] border ${ borderClass } ${ textClass } time-label-${ Math.round( crosshair.x ) }` }
              >
                { new Date( hoveredCandle.data.time * 1000 ).toLocaleString( 'en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                } ) }
              </div>
            ) }
            <style>{ `.price-label-${ Math.round( crosshair.y ) }{top:${ crosshair.y - 12 }px;z-index:51;} .time-label-${ Math.round( crosshair.x ) }{left:${ crosshair.x - 40 }px;z-index:51;}` }</style>
          </>
        ) }

        {/* Custom Tooltip - Compact H/L only */ }
        { hoveredCandle && crosshair.visible && (
          <div
            className={ `absolute top-2 left-2 p-2 rounded-md shadow-lg pointer-events-none z-[100] bg-[linear-gradient(135deg,_rgba(255,255,255,0.9)_0%,_rgba(255,255,255,0.75)_50%,_rgba(255,255,255,0.85)_100%)] border ${ borderClass } shadow-[0_4px_20px_rgba(0,0,0,0.25)] ${ textClass }` }
          >
            <div className="flex gap-3 text-[10px] font-mono">
              <div className="flex items-center gap-1">
                <span className={ textSecondaryClass }>H:</span>
                <span className="font-semibold text-[#089981]">{ hoveredCandle.data.high.toFixed( 2 ) }</span>
              </div>
              <div className="flex items-center gap-1">
                <span className={ textSecondaryClass }>L:</span>
                <span className="font-semibold text-[#f23645]">{ hoveredCandle.data.low.toFixed( 2 ) }</span>
              </div>
            </div>
          </div>
        ) }

        {/* Y-Axis Scale Zone Indicator */ }
        <div
          className={ `absolute top-0 right-0 bottom-0 w-[95px] pointer-events-none z-[100] border-l ${ borderClass } bg-[linear-gradient(90deg,_transparent_0%,_rgba(27,47,45,0.9)_70%)]` }
        />

        {/* ECharts Component - NO pointer events */ }
        <ReactECharts
          ref={ chartRef }
          option={ option }
          className="h-full w-full pointer-events-none"
          style={ { height: '100%', width: '100%', background: 'transparent' } }
          opts={ { renderer: 'canvas' } }
          lazyUpdate={ true }
        />
      </div>
    </ChartContainer>
  );
}
