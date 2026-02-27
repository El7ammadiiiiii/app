'use client';

/**
 * 🔍 Expanded Levels Modal - شارت موسّع مع مؤشرات قابلة للتفعيل
 * 
 * شارت تفاعلي كبير مع أزرار مؤشرات Core:
 * RSI | MACD | BB | MA | VOL
 * 
 * @author CCWAYS Team
 * @version 4.0.0 - My Card Style
 */

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import
{
  LevelResult,
  LEVEL_COLORS,
  TIMEFRAME_LABELS,
} from '@/lib/scanners/levels-detector';
import { ChartConfig } from '@/lib/ChartConfig';

// ============================================================================
// 📊 TYPES
// ============================================================================

interface ExpandedLevelsModalProps
{
  result: LevelResult | null;
  isOpen: boolean;
  onClose: () => void;
}

type IndicatorType = 'RSI' | 'MACD' | 'BB' | 'MA' | 'VOL';

interface IndicatorState
{
  RSI: boolean;
  MACD: boolean;
  BB: boolean;
  MA: boolean;
  VOL: boolean;
}

// ============================================================================
// 🏷️ CONSTANTS
// ============================================================================

const EXCHANGE_LABELS: Record<string, string> = {
  binance: 'Binance',
  bybit: 'Bybit',
  okx: 'OKX',
  kucoin: 'KuCoin',
  mexc: 'MEXC',
};

const INDICATOR_LABELS: Record<IndicatorType, string> = {
  RSI: 'RSI',
  MACD: 'MACD',
  BB: 'Bollinger',
  MA: 'MA',
  VOL: 'Volume',
};

// ============================================================================
// 📈 INDICATOR CALCULATIONS
// ============================================================================

function calculateRSI ( candles: { close: number }[], period = 14 ): number[]
{
  const rsi: number[] = [];
  if ( candles.length < period + 1 ) return new Array( candles.length ).fill( 50 );

  let gains = 0;
  let losses = 0;

  // Initial average
  for ( let i = 1; i <= period; i++ )
  {
    const change = candles[ i ].close - candles[ i - 1 ].close;
    if ( change >= 0 ) gains += change;
    else losses += Math.abs( change );
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Fill initial values
  for ( let i = 0; i < period; i++ )
  {
    rsi.push( 50 );
  }

  // Calculate RSI
  for ( let i = period; i < candles.length; i++ )
  {
    const change = candles[ i ].close - candles[ i - 1 ].close;
    const currentGain = change >= 0 ? change : 0;
    const currentLoss = change < 0 ? Math.abs( change ) : 0;

    avgGain = ( avgGain * ( period - 1 ) + currentGain ) / period;
    avgLoss = ( avgLoss * ( period - 1 ) + currentLoss ) / period;

    if ( avgLoss === 0 ) rsi.push( 100 );
    else
    {
      const rs = avgGain / avgLoss;
      rsi.push( 100 - ( 100 / ( 1 + rs ) ) );
    }
  }

  return rsi;
}

function calculateMACD ( candles: { close: number }[] ): { macd: number[]; signal: number[]; histogram: number[] }
{
  const closes = candles.map( c => c.close );
  const ema12 = calculateEMA( closes, 12 );
  const ema26 = calculateEMA( closes, 26 );

  const macd = closes.map( ( _, i ) => ema12[ i ] - ema26[ i ] );
  const signal = calculateEMA( macd, 9 );
  const histogram = macd.map( ( m, i ) => m - signal[ i ] );

  return { macd, signal, histogram };
}

function calculateEMA ( data: number[], period: number ): number[]
{
  const ema: number[] = [];
  const multiplier = 2 / ( period + 1 );

  let sum = 0;
  for ( let i = 0; i < Math.min( period, data.length ); i++ )
  {
    sum += data[ i ];
    ema.push( sum / ( i + 1 ) );
  }

  for ( let i = period; i < data.length; i++ )
  {
    const val = ( data[ i ] - ema[ i - 1 ] ) * multiplier + ema[ i - 1 ];
    ema.push( val );
  }

  return ema;
}

function calculateSMA ( data: number[], period: number ): number[]
{
  const sma: number[] = [];
  for ( let i = 0; i < data.length; i++ )
  {
    if ( i < period - 1 )
    {
      sma.push( NaN );
    } else
    {
      const slice = data.slice( i - period + 1, i + 1 );
      sma.push( slice.reduce( ( a, b ) => a + b, 0 ) / period );
    }
  }
  return sma;
}

function calculateBollingerBands ( candles: { close: number }[], period = 20, stdDev = 2 ): { upper: number[]; middle: number[]; lower: number[] }
{
  const closes = candles.map( c => c.close );
  const middle = calculateSMA( closes, period );

  const upper: number[] = [];
  const lower: number[] = [];

  for ( let i = 0; i < closes.length; i++ )
  {
    if ( i < period - 1 )
    {
      upper.push( NaN );
      lower.push( NaN );
    } else
    {
      const slice = closes.slice( i - period + 1, i + 1 );
      const mean = middle[ i ];
      const variance = slice.reduce( ( sum, val ) => sum + Math.pow( val - mean, 2 ), 0 ) / period;
      const std = Math.sqrt( variance );
      upper.push( mean + stdDev * std );
      lower.push( mean - stdDev * std );
    }
  }

  return { upper, middle, lower };
}

// ============================================================================
// 🎨 MAIN MODAL COMPONENT
// ============================================================================

export function ExpandedLevelsModal ( {
  result,
  isOpen,
  onClose
}: ExpandedLevelsModalProps )
{
  const chartRef = useRef<echarts.ECharts | null>( null );
  const containerRef = useRef<HTMLDivElement>( null );

  // Indicator toggles
  const [ indicators, setIndicators ] = useState<IndicatorState>( {
    RSI: false,
    MACD: false,
    BB: false,
    MA: false,
    VOL: true, // Volume on by default
  } );

  // Chart zoom state
  const [ xRange, setXRange ] = useState( { start: 0, end: 100 } );

  // Toggle indicator
  const toggleIndicator = useCallback( ( indicator: IndicatorType ) =>
  {
    setIndicators( prev => ( { ...prev, [ indicator ]: !prev[ indicator ] } ) );
  }, [] );

  // Close on ESC key
  useEffect( () =>
  {
    const handleEsc = ( e: KeyboardEvent ) =>
    {
      if ( e.key === 'Escape' ) onClose();
    };

    if ( isOpen )
    {
      window.addEventListener( 'keydown', handleEsc );
      document.body.style.overflow = 'hidden';
    }

    return () =>
    {
      window.removeEventListener( 'keydown', handleEsc );
      document.body.style.overflow = 'unset';
    };
  }, [ isOpen, onClose ] );

  // Reset state when modal opens
  useEffect( () =>
  {
    if ( isOpen )
    {
      setXRange( { start: 0, end: 100 } );
    }
  }, [ isOpen ] );

  // Extract data safely
  const candles = result?.candles || [];
  const levels = result?.levels || [];
  const currentPrice = result?.currentPrice || 0;
  const symbol = result?.symbol || '';
  const exchange = result?.exchange || '';
  const timeframe = result?.timeframe || '';

  // Format functions
  const formatTime = ( timestamp: number ): string => ChartConfig.formatTime( timestamp );
  const formatPrice = ( price: number ): string => ChartConfig.formatPrice( price );

  // Prepare chart data
  const chartData = useMemo( () =>
  {
    if ( candles.length === 0 ) return { candleData: [], categoryData: [], volumeData: [] };

    const candleData = candles.map( c => [ c.open, c.close, c.low, c.high ] );
    const categoryData = candles.map( c => formatTime( c.timestamp ) );
    const volumeData = candles.map( c => ( {
      value: c.volume,
      itemStyle: {
        color: c.close >= c.open
          ? 'rgba(8, 153, 129, 0.4)'
          : 'rgba(242, 54, 69, 0.4)'
      }
    } ) );

    return { candleData, categoryData, volumeData };
  }, [ candles ] );

  // Calculate indicators
  const indicatorData = useMemo( () =>
  {
    if ( candles.length === 0 ) return null;

    const rsi = calculateRSI( candles );
    const macd = calculateMACD( candles );
    const bb = calculateBollingerBands( candles );
    const closes = candles.map( c => c.close );
    const sma20 = calculateSMA( closes, 20 );
    const ema50 = calculateEMA( closes, 50 );

    return { rsi, macd, bb, sma20, ema50 };
  }, [ candles ] );

  // Filter levels: 2 resistance + 2 support
  const strongLevels = useMemo( () =>
  {
    const resistanceLevels = levels
      .filter( l => l.price > currentPrice )
      .sort( ( a, b ) => b.strength - a.strength )
      .slice( 0, 2 )
      .map( l => ( { ...l, type: 'resistance' as const } ) );

    const supportLevels = levels
      .filter( l => l.price < currentPrice )
      .sort( ( a, b ) => b.strength - a.strength )
      .slice( 0, 2 )
      .map( l => ( { ...l, type: 'support' as const } ) );

    return [ ...resistanceLevels, ...supportLevels ];
  }, [ levels, currentPrice ] );

  // Calculate visible price range
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

    // Include Bollinger Bands if active
    if ( indicators.BB && indicatorData )
    {
      for ( let i = startIdx; i <= endIdx && i < indicatorData.bb.upper.length; i++ )
      {
        if ( !isNaN( indicatorData.bb.upper[ i ] ) )
        {
          if ( indicatorData.bb.upper[ i ] > max ) max = indicatorData.bb.upper[ i ];
          if ( indicatorData.bb.lower[ i ] < min ) min = indicatorData.bb.lower[ i ];
        }
      }
    }

    const padding = ( max - min ) * 0.05;
    return { min: min - padding, max: max + padding };
  }, [ candles, xRange, indicators.BB, indicatorData ] );

  // Count active panels (for dynamic height calculation)
  const activePanels = useMemo( () =>
  {
    let count = 0;
    if ( indicators.RSI ) count++;
    if ( indicators.MACD ) count++;
    if ( indicators.VOL ) count++;
    return count;
  }, [ indicators ] );

  // Build ECharts option
  const option = useMemo( () =>
  {
    if ( !chartData.candleData.length ) return {};

    // Dynamic grid heights - percentage based like DivergenceTradingChart
    // Main chart: 58% when no panels, shrinks when panels active
    // Each indicator panel: ~15% height
    const mainChartHeight = activePanels === 0 ? '85%' : activePanels === 1 ? '58%' : activePanels === 2 ? '45%' : '35%';
    const indicatorHeight = activePanels === 1 ? '30%' : activePanels === 2 ? '20%' : '15%';

    // Calculate indicator panel positions
    const getIndicatorTop = ( index: number ) =>
    {
      if ( activePanels === 1 ) return '66%';
      if ( activePanels === 2 ) return index === 0 ? '50%' : '73%';
      // 3 panels
      return index === 0 ? '40%' : index === 1 ? '58%' : '76%';
    };

    // Level mark lines
    const levelMarkLines = strongLevels.map( level => ( {
      yAxis: level.price,
      lineStyle: {
        color: LEVEL_COLORS[ level.type ],
        width: 1,
        type: 'solid' as const,
        opacity: 0.8,
      },
      label: {
        show: true,
        position: 'end' as const,
        formatter: `${ formatPrice( level.price ) }`,
        fontSize: 9,
        color: LEVEL_COLORS[ level.type ],
        backgroundColor: `${ LEVEL_COLORS[ level.type ] }15`,
        padding: [ 2, 4 ],
        borderRadius: 2,
      }
    } ) );

    // Build grids array - percentage based like DivergenceTradingChart
    const grids: any[] = [
      { left: 5, right: 45, top: 5, height: mainChartHeight, containLabel: false }
    ];

    // Add indicator panel grids
    let panelIndex = 0;
    if ( indicators.MACD )
    {
      grids.push( { left: 5, right: 45, top: getIndicatorTop( panelIndex++ ), height: indicatorHeight, containLabel: false, bottom: panelIndex === activePanels ? 10 : undefined } );
    }
    if ( indicators.RSI )
    {
      grids.push( { left: 5, right: 45, top: getIndicatorTop( panelIndex++ ), height: indicatorHeight, containLabel: false, bottom: panelIndex === activePanels ? 10 : undefined } );
    }
    if ( indicators.VOL )
    {
      grids.push( { left: 5, right: 45, top: getIndicatorTop( panelIndex++ ), height: indicatorHeight, containLabel: false, bottom: 10 } );
    }

    // Build xAxis array
    const xAxes: any[] = [ {
      type: 'category',
      data: chartData.categoryData,
      gridIndex: 0,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
      splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.05)' } },
    } ];

    let gridIdx = 1;
    if ( indicators.MACD )
    {
      xAxes.push( { type: 'category', data: chartData.categoryData, gridIndex: gridIdx++, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#787b86', fontSize: 10 }, splitLine: { show: false } } );
    }
    if ( indicators.RSI )
    {
      xAxes.push( { type: 'category', data: chartData.categoryData, gridIndex: gridIdx++, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { show: false }, splitLine: { show: false } } );
    }
    if ( indicators.VOL )
    {
      xAxes.push( { type: 'category', data: chartData.categoryData, gridIndex: gridIdx++, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { show: false }, splitLine: { show: false } } );
    }

    // Build yAxis array
    const yAxes: any[] = [ {
      scale: true,
      gridIndex: 0,
      position: 'right',
      min: visiblePriceRange.min,
      max: visiblePriceRange.max,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#787b86', fontSize: 10, formatter: ( v: number ) => formatPrice( v ) },
      splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.05)' } },
    } ];

    gridIdx = 1;
    if ( indicators.MACD )
    {
      yAxes.push( { scale: true, gridIndex: gridIdx++, position: 'right', axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#787b86', fontSize: 9 }, splitLine: { show: false } } );
    }
    if ( indicators.RSI )
    {
      yAxes.push( { scale: true, gridIndex: gridIdx++, position: 'right', min: 0, max: 100, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#787b86', fontSize: 9 }, splitLine: { show: false } } );
    }
    if ( indicators.VOL )
    {
      yAxes.push( { scale: true, gridIndex: gridIdx++, position: 'right', axisLine: { show: false }, axisTick: { show: false }, axisLabel: { show: false }, splitLine: { show: false } } );
    }

    // Build series array
    const series: any[] = [
      {
        name: 'Candlestick',
        type: 'candlestick',
        data: chartData.candleData,
        xAxisIndex: 0,
        yAxisIndex: 0,
        itemStyle: {
          color: ChartConfig.CANDLE.colors.up,
          color0: ChartConfig.CANDLE.colors.down,
          borderColor: ChartConfig.CANDLE.colors.up,
          borderColor0: ChartConfig.CANDLE.colors.down,
        },
        markLine: {
          symbol: 'none',
          data: levelMarkLines,
          silent: true,
        }
      }
    ];

    // Add BB bands as overlay
    if ( indicators.BB && indicatorData )
    {
      series.push( {
        name: 'BB Upper',
        type: 'line',
        data: indicatorData.bb.upper,
        xAxisIndex: 0,
        yAxisIndex: 0,
        symbol: 'none',
        lineStyle: { color: '#2196F3', width: 1, opacity: 0.6 },
      } );
      series.push( {
        name: 'BB Middle',
        type: 'line',
        data: indicatorData.bb.middle,
        xAxisIndex: 0,
        yAxisIndex: 0,
        symbol: 'none',
        lineStyle: { color: '#2196F3', width: 1, type: 'dashed', opacity: 0.4 },
      } );
      series.push( {
        name: 'BB Lower',
        type: 'line',
        data: indicatorData.bb.lower,
        xAxisIndex: 0,
        yAxisIndex: 0,
        symbol: 'none',
        lineStyle: { color: '#2196F3', width: 1, opacity: 0.6 },
      } );
    }

    // Add MA as overlay
    if ( indicators.MA && indicatorData )
    {
      series.push( {
        name: 'SMA 20',
        type: 'line',
        data: indicatorData.sma20,
        xAxisIndex: 0,
        yAxisIndex: 0,
        symbol: 'none',
        lineStyle: { color: '#FF9800', width: 1.5 },
      } );
      series.push( {
        name: 'EMA 50',
        type: 'line',
        data: indicatorData.ema50,
        xAxisIndex: 0,
        yAxisIndex: 0,
        symbol: 'none',
        lineStyle: { color: '#9C27B0', width: 1.5 },
      } );
    }

    // Add indicator panels in order: MACD, RSI, VOL (matching grid order)
    let seriesIdx = 1;

    // Add MACD panel
    if ( indicators.MACD && indicatorData )
    {
      series.push( {
        name: 'MACD',
        type: 'line',
        data: indicatorData.macd.macd,
        xAxisIndex: seriesIdx,
        yAxisIndex: seriesIdx,
        symbol: 'none',
        lineStyle: { color: '#2196F3', width: 1.5 },
      } );
      series.push( {
        name: 'Signal',
        type: 'line',
        data: indicatorData.macd.signal,
        xAxisIndex: seriesIdx,
        yAxisIndex: seriesIdx,
        symbol: 'none',
        lineStyle: { color: '#FF9800', width: 1.5 },
      } );
      series.push( {
        name: 'Histogram',
        type: 'bar',
        data: indicatorData.macd.histogram.map( v => ( {
          value: v,
          itemStyle: { color: v >= 0 ? 'rgba(8, 153, 129, 0.6)' : 'rgba(242, 54, 69, 0.6)' }
        } ) ),
        xAxisIndex: seriesIdx,
        yAxisIndex: seriesIdx,
        barWidth: '60%',
      } );
      seriesIdx++;
    }

    // Add RSI panel
    if ( indicators.RSI && indicatorData )
    {
      series.push( {
        name: 'RSI',
        type: 'line',
        data: indicatorData.rsi,
        xAxisIndex: seriesIdx,
        yAxisIndex: seriesIdx,
        symbol: 'none',
        lineStyle: { color: '#E040FB', width: 1.5 },
        areaStyle: { color: 'rgba(224, 64, 251, 0.1)' },
        markLine: {
          silent: true,
          symbol: 'none',
          data: [
            { yAxis: 70, lineStyle: { color: '#ef4444', type: 'dashed', width: 1 } },
            { yAxis: 30, lineStyle: { color: '#22c55e', type: 'dashed', width: 1 } },
          ]
        }
      } );
      seriesIdx++;
    }

    // Add Volume panel
    if ( indicators.VOL )
    {
      series.push( {
        name: 'Volume',
        type: 'bar',
        data: chartData.volumeData,
        xAxisIndex: seriesIdx,
        yAxisIndex: seriesIdx,
        barWidth: '60%',
      } );
      seriesIdx++;
    }

    return {
      backgroundColor: 'transparent',
      animation: false,
      tooltip: { show: false },
      axisPointer: { link: [ { xAxisIndex: 'all' } ] },
      dataZoom: [
        { type: 'inside', xAxisIndex: xAxes.map( ( _, i ) => i ), start: xRange.start, end: xRange.end },
      ],
      grid: grids,
      xAxis: xAxes,
      yAxis: yAxes,
      series,
    };
  }, [ chartData, strongLevels, indicators, indicatorData, visiblePriceRange, xRange, activePanels ] );

  // Handle chart instance
  const onChartReady = useCallback( ( chart: echarts.ECharts ) =>
  {
    chartRef.current = chart;

    chart.on( 'datazoom', ( params: any ) =>
    {
      if ( params.batch )
      {
        setXRange( { start: params.batch[ 0 ].start, end: params.batch[ 0 ].end } );
      }
    } );
  }, [] );

  if ( !isOpen || !result ) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={ onClose }
    >
      {/* Modal Content - pair-template style like Divergence */ }
      <div
        ref={ containerRef }
        className="relative w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden pair-template"
        onClick={ ( e ) => e.stopPropagation() }
      >
        {/* ═══════════════════════════════════════════════════════════════════
            HEADER - pair-template-header
        ═══════════════════════════════════════════════════════════════════ */ }
        <div className="px-6 py-4 flex items-center justify-between pair-template-header">
          <div className="flex items-center gap-4">
            {/* Symbol */ }
            <div>
              <h2 className="text-xl font-bold text-white">
                { symbol.replace( 'USDT', '' ) }
                <span className="text-gray-500 text-sm ml-1">/USDT</span>
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-400 capitalize">{ EXCHANGE_LABELS[ exchange ] || exchange }</span>
                <span className="text-gray-600">•</span>
                <span className="text-xs text-gray-400">{ TIMEFRAME_LABELS[ timeframe ]?.en || timeframe }</span>
              </div>
            </div>
          </div>

          {/* Close Button */ }
          <button
            onClick={ onClose }
            className="p-2 rounded-lg hover:bg-white/[0.05] text-gray-400 hover:text-white transition-all"
            title="إغلاق (ESC)"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 2 } d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            CHART AREA - pair-template-chart, fills modal
        ═══════════════════════════════════════════════════════════════════ */ }
        <div className="pair-template-chart">
          { chartData.candleData.length > 0 ? (
            <ReactECharts
              option={ option }
              style={ { width: '100%', height: activePanels === 0 ? 500 : 500 + ( activePanels * 100 ) } }
              onChartReady={ onChartReady }
              notMerge={ true }
              lazyUpdate={ true }
            />
          ) : (
            <div className="flex items-center justify-center h-[500px] text-gray-500">
              No data available
            </div>
          ) }
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            INDICATOR CHIPS - pair-template-footer
        ═══════════════════════════════════════════════════════════════════ */ }
        <div className="px-6 py-4 pair-template-footer">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 mr-2">Indicators:</span>

            { ( Object.keys( indicators ) as IndicatorType[] ).map( ( ind ) => (
              <button
                key={ ind }
                onClick={ () => toggleIndicator( ind ) }
                className={ `px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${ indicators[ ind ]
                    ? 'border border-cyan-400 bg-cyan-400/20 text-cyan-400'
                    : 'border border-white/20 text-white/60 hover:border-white/40 hover:text-white/80'
                  }` }
              >
                { INDICATOR_LABELS[ ind ] }
              </button>
            ) ) }
          </div>

          {/* Legend for active overlays */ }
          { ( indicators.BB || indicators.MA ) && (
            <div className="flex items-center gap-4 mt-2 text-[10px]">
              { indicators.BB && (
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-[#2196F3]"></span>
                  <span className="text-gray-400">Bollinger (20, 2)</span>
                </span>
              ) }
              { indicators.MA && (
                <>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-0.5 bg-[#FF9800]"></span>
                    <span className="text-gray-400">SMA 20</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-0.5 bg-[#9C27B0]"></span>
                    <span className="text-gray-400">EMA 50</span>
                  </span>
                </>
              ) }
            </div>
          ) }
        </div>
      </div>
    </div>
  );
}

export default ExpandedLevelsModal;
