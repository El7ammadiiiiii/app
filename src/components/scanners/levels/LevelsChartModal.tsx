'use client';

/**
 * 🔍 Levels Chart Modal - مودال شارت TradingView Style
 * 
 * شارت تفاعلي متكامل مبني على مواصفات DivergenceTradingChart
 * 100% مطابق للـ Divergence في التفاعلات والمظهر
 * 
 * @author CCWAYS Team
 * @version 3.0.0 - Divergence Spec Based
 */

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { toPng } from 'html-to-image';
import
{
  LevelResult,
  LEVEL_COLORS,
  LEVEL_STATUS_LABELS,
  TIMEFRAME_LABELS,
  OHLCV,
} from '@/lib/scanners/levels-detector';
import { ChartConfig, DragMode } from '@/lib/ChartConfig';

// ============================================================================
// 📊 TYPES
// ============================================================================

interface LevelsChartModalProps
{
  result: LevelResult | null;
  isOpen: boolean;
  onClose: () => void;
}

// ============================================================================
// 🏷️ EXCHANGE LABELS
// ============================================================================

const EXCHANGE_LABELS: Record<string, string> = {
  binance: 'Centralized',
  bybit: 'Bybit',
  okx: 'OKX',
  kucoin: 'KuCoin',
  mexc: 'MEXC',
};

const MODAL_CLASSES = 'pair-template';
const HEADER_CLASSES = 'pair-template-header';
const FOOTER_CLASSES = 'pair-template-footer';
const CHART_BG_CLASS = 'pair-template-chart';

const CURSOR_CLASSES: Record<DragMode, string> = {
  none: 'cursor-crosshair',
  pan: 'cursor-grabbing',
  yScale: 'cursor-ns-resize',
  indicatorYScale: 'cursor-ns-resize',
};

const LEVEL_BADGE_CLASSES: Record<'resistance' | 'support', string> = {
  resistance: 'bg-[#ef4444]/20 text-[#ef4444] border-l-[3px] border-[#ef4444]',
  support: 'bg-[#22c55e]/20 text-[#22c55e] border-l-[3px] border-[#22c55e]',
};

const AVG_STRENGTH_CLASS = ( value: number ) =>
{
  if ( value >= 70 ) return 'text-[#22c55e]';
  if ( value >= 50 ) return 'text-[#f59e0b]';
  return 'text-[#787b86]';
};

const LEVEL_TEXT_CLASS: Record<string, string> = {
  resistance: 'text-[#ef4444]',
  support: 'text-[#22c55e]',
  pivot: 'text-[#f59e0b]',
};

// ============================================================================
// 🎨 MAIN MODAL COMPONENT
// ============================================================================

export function LevelsChartModal ( {
  result,
  isOpen,
  onClose
}: LevelsChartModalProps )
{
  const chartRef = useRef<echarts.ECharts | null>( null );
  const containerRef = useRef<HTMLDivElement>( null );
  const modalRef = useRef<HTMLDivElement>( null );

  // === TradingView-Style State (من DivergenceTradingChart) ===
  const [ xRange, setXRange ] = useState( { start: 0, end: 100 } );
  const [ yRange, setYRange ] = useState<{ min: number | null; max: number | null }>( { min: null, max: null } );
  const [ volumeYRange, setVolumeYRange ] = useState<{ min: number | null; max: number | null }>( { min: null, max: null } );
  const [ dragMode, setDragMode ] = useState<DragMode>( 'none' );

  const dragRef = useRef( {
    startX: 0,
    startY: 0,
    startXRange: { start: 0, end: 100 },
    startYRange: { min: 0, max: 0 },
    startVolumeYRange: { min: 0, max: 0 }
  } );

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
      setYRange( { min: null, max: null } );
      setVolumeYRange( { min: null, max: null } );
      setDragMode( 'none' );
    }
  }, [ isOpen ] );

  // Add global mouse up listener
  useEffect( () =>
  {
    const handleGlobalMouseUp = () => setDragMode( 'none' );
    window.addEventListener( 'mouseup', handleGlobalMouseUp );
    return () => window.removeEventListener( 'mouseup', handleGlobalMouseUp );
  }, [] );

  // Extract data safely (handles null result)
  const candles = result?.candles || [];
  const levels = result?.levels || [];
  const currentPrice = result?.currentPrice || 0;
  const symbol = result?.symbol || '';
  const exchange = result?.exchange || '';
  const timeframe = result?.timeframe || '';

  // Format time
  const formatTime = ( timestamp: number ): string => ChartConfig.formatTime( timestamp );

  // Format price
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

    // Include level prices in range
    const strongLevels = levels.filter( l => l.strength >= 50 );
    for ( const level of strongLevels )
    {
      if ( level.price > min * 0.95 && level.price < max * 1.05 )
      {
        if ( level.price < min ) min = level.price;
        if ( level.price > max ) max = level.price;
      }
    }

    const padding = ( max - min ) * 0.05;
    return { min: min - padding, max: max + padding };
  }, [ candles, levels, xRange ] );

  // Calculate visible volume range
  const visibleVolumeRange = useMemo( () =>
  {
    if ( !candles || candles.length === 0 ) return { min: 0, max: 100 };

    const startIdx = Math.floor( candles.length * xRange.start / 100 );
    const endIdx = Math.ceil( candles.length * xRange.end / 100 );
    const visible = candles.slice( Math.max( 0, startIdx ), Math.min( candles.length, endIdx + 1 ) );

    if ( visible.length === 0 ) return { min: 0, max: 100 };

    const volumes = visible.map( c => c.volume );
    const min = 0;
    const max = Math.max( ...volumes ) * 1.1;

    return { min, max };
  }, [ candles, xRange ] );

  // Filter levels: 2 resistance above price + 2 support below price (sorted by strength)
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

  // Build ECharts option
  const option = useMemo( () =>
  {
    // Mark lines for levels - thin solid lines only
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

    // No mark areas - clean lines only
    const levelMarkAreas: any[] = [];

    return {
      backgroundColor: ChartConfig.BACKGROUND.transparent,
      animation: false,

      // Tooltip
      tooltip: {
        show: false
      },

      // Axis Pointer
      axisPointer: {
        link: [ { xAxisIndex: 'all' } ],
        label: {
          show: false,
          backgroundColor: ChartConfig.CROSSHAIR.label.background,
        }
      },

      // Grids
      grid: [
        {
          left: ChartConfig.GRID.padding.left,
          right: ChartConfig.GRID.padding.right,
          top: ChartConfig.GRID.padding.top,
          height: ChartConfig.INDICATOR.layout.mainChartHeight,
          containLabel: false
        },
        {
          left: ChartConfig.GRID.padding.left,
          right: ChartConfig.GRID.padding.right,
          top: ChartConfig.INDICATOR.layout.indicatorTop,
          height: ChartConfig.INDICATOR.layout.indicatorHeight,
          containLabel: false,
          bottom: ChartConfig.GRID.padding.bottom
        }
      ],

      // X Axes
      xAxis: [
        {
          type: 'category',
          data: chartData.categoryData,
          gridIndex: 0,
          scale: true,
          boundaryGap: true,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { show: false },
          splitLine: {
            show: true,
            lineStyle: {
              color: ChartConfig.GRID.echarts.color,
              type: ChartConfig.GRID.echarts.type
            }
          },
          min: 'dataMin',
          max: 'dataMax'
        },
        {
          type: 'category',
          data: chartData.categoryData,
          gridIndex: 1,
          scale: true,
          boundaryGap: true,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            color: ChartConfig.TIME_SCALE.text.color,
            fontSize: ChartConfig.TIME_SCALE.text.fontSize,
            margin: ChartConfig.TIME_SCALE.text.margin
          },
          splitLine: { show: false },
          min: 'dataMin',
          max: 'dataMax'
        }
      ],

      // Y Axes
      yAxis: [
        {
          scale: true,
          gridIndex: 0,
          position: ChartConfig.PRICE_SCALE.position,
          min: yRange.min ?? visiblePriceRange.min,
          max: yRange.max ?? visiblePriceRange.max,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            color: ChartConfig.PRICE_SCALE.text.color,
            fontSize: ChartConfig.PRICE_SCALE.text.fontSize,
            inside: false,
            margin: 4,
            formatter: ( value: number ) => formatPrice( value )
          },
          splitLine: {
            show: true,
            lineStyle: {
              color: ChartConfig.GRID.echarts.color,
              type: ChartConfig.GRID.echarts.type
            }
          }
        },
        {
          scale: true,
          gridIndex: 1,
          position: ChartConfig.PRICE_SCALE.position,
          min: volumeYRange.min ?? visibleVolumeRange.min,
          max: volumeYRange.max ?? visibleVolumeRange.max,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            color: ChartConfig.PRICE_SCALE.text.color,
            fontSize: 9,
            inside: false,
            margin: 4,
            formatter: ( value: number ) =>
            {
              if ( value >= 1e9 ) return ( value / 1e9 ).toFixed( 1 ) + 'B';
              if ( value >= 1e6 ) return ( value / 1e6 ).toFixed( 1 ) + 'M';
              if ( value >= 1e3 ) return ( value / 1e3 ).toFixed( 1 ) + 'K';
              return value.toFixed( 0 );
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
        }
      ],

      // Data Zoom
      dataZoom: ChartConfig.getEChartsDataZoom( [ 0, 1 ], xRange.start, xRange.end ),

      // Series
      series: [
        // Candlestick
        {
          name: symbol,
          type: 'candlestick',
          xAxisIndex: 0,
          yAxisIndex: 0,
          data: chartData.candleData,
          itemStyle: ChartConfig.getEChartsCandlestickStyle(),
          // Level lines
          markLine: {
            symbol: 'none',
            silent: true,
            data: levelMarkLines
          },
          // Level areas
          markArea: {
            silent: true,
            data: levelMarkAreas
          }
        },

        // Current Price Line
        {
          name: 'Current Price',
          type: 'line',
          xAxisIndex: 0,
          yAxisIndex: 0,
          data: [],
          markLine: {
            symbol: 'none',
            silent: true,
            data: [ {
              yAxis: currentPrice,
              lineStyle: {
                color: ChartConfig.PRICE_SCALE.currentPrice.color,
                width: ChartConfig.PRICE_SCALE.currentPrice.width,
                type: 'dashed'
              },
              label: {
                show: true,
                position: 'end',
                formatter: formatPrice( currentPrice ),
                fontSize: 10,
                fontWeight: 'bold',
                color: '#ffffff',
                backgroundColor: ChartConfig.PRICE_SCALE.currentPrice.color,
                padding: [ 4, 6 ],
                borderRadius: 2,
              }
            } ]
          }
        },

        // Volume
        {
          name: 'Volume',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: chartData.volumeData,
          barWidth: '60%',
        }
      ]
    };
  }, [ chartData, strongLevels, symbol, currentPrice, xRange, yRange, volumeYRange, visiblePriceRange, visibleVolumeRange ] );

  // === TradingView-Style Event Handlers (من DivergenceTradingChart) ===

  const onChartReady = useCallback( ( chart: echarts.ECharts ) =>
  {
    chartRef.current = chart;
  }, [] );

  const handleMouseDown = useCallback( ( e: React.MouseEvent ) =>
  {
    if ( !containerRef.current ) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const chartWidth = rect.width - ChartConfig.GRID.padding.right - 10;
    const chartHeight = rect.height;

    const mainChartBottom = chartHeight * 0.60;

    // Check if clicking on Y axis area
    if ( x > chartWidth )
    {
      if ( y < mainChartBottom )
      {
        setDragMode( 'yScale' );
        dragRef.current = {
          startX: e.clientX,
          startY: e.clientY,
          startXRange: { ...xRange },
          startYRange: {
            min: yRange.min ?? visiblePriceRange.min,
            max: yRange.max ?? visiblePriceRange.max
          },
          startVolumeYRange: {
            min: volumeYRange.min ?? 0,
            max: volumeYRange.max ?? 100
          }
        };
      } else
      {
        setDragMode( 'indicatorYScale' );
        dragRef.current = {
          startX: e.clientX,
          startY: e.clientY,
          startXRange: { ...xRange },
          startYRange: {
            min: yRange.min ?? visiblePriceRange.min,
            max: yRange.max ?? visiblePriceRange.max
          },
          startVolumeYRange: {
            min: volumeYRange.min ?? visibleVolumeRange.min,
            max: volumeYRange.max ?? visibleVolumeRange.max
          }
        };
      }
    } else
    {
      setDragMode( 'pan' );
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startXRange: { ...xRange },
        startYRange: {
          min: yRange.min ?? visiblePriceRange.min,
          max: yRange.max ?? visiblePriceRange.max
        },
        startVolumeYRange: {
          min: volumeYRange.min ?? 0,
          max: volumeYRange.max ?? 100
        }
      };
    }
  }, [ xRange, yRange, volumeYRange, visiblePriceRange, visibleVolumeRange ] );

  const handleMouseMove = useCallback( ( e: React.MouseEvent ) =>
  {
    if ( dragMode === 'none' || !containerRef.current ) return;

    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;
    const rect = containerRef.current.getBoundingClientRect();

    if ( dragMode === 'pan' )
    {
      const rangeSpan = dragRef.current.startXRange.end - dragRef.current.startXRange.start;
      const pixelsPerPercent = rect.width / 100;
      const percentDelta = -deltaX / pixelsPerPercent;

      let newStart = dragRef.current.startXRange.start + percentDelta;
      let newEnd = dragRef.current.startXRange.end + percentDelta;

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

      if ( Math.abs( deltaY ) > 10 )
      {
        const priceRange = dragRef.current.startYRange.max - dragRef.current.startYRange.min;
        const priceDelta = ( deltaY / rect.height ) * priceRange * ChartConfig.INTERACTIONS.yScale.sensitivity;
        setYRange( {
          min: dragRef.current.startYRange.min - priceDelta,
          max: dragRef.current.startYRange.max + priceDelta
        } );
      }
    } else if ( dragMode === 'yScale' )
    {
      const priceRange = dragRef.current.startYRange.max - dragRef.current.startYRange.min;
      const scaleFactor = 1 + ( deltaY / rect.height ) * ChartConfig.INTERACTIONS.yScale.sensitivity;
      const midPrice = ( dragRef.current.startYRange.max + dragRef.current.startYRange.min ) / 2;
      const newHalfRange = ( priceRange / 2 ) * scaleFactor;

      setYRange( {
        min: midPrice - newHalfRange,
        max: midPrice + newHalfRange
      } );
    } else if ( dragMode === 'indicatorYScale' )
    {
      const volumeRange = dragRef.current.startVolumeYRange.max - dragRef.current.startVolumeYRange.min;
      const scaleFactor = 1 + ( deltaY / rect.height ) * ChartConfig.INTERACTIONS.yScale.sensitivity;
      const midValue = ( dragRef.current.startVolumeYRange.max + dragRef.current.startVolumeYRange.min ) / 2;
      const newHalfRange = Math.max( 10, ( volumeRange / 2 ) * scaleFactor );

      setVolumeYRange( {
        min: Math.max( 0, midValue - newHalfRange ),
        max: midValue + newHalfRange
      } );
    }
  }, [ dragMode ] );

  const handleMouseUp = useCallback( () =>
  {
    setDragMode( 'none' );
  }, [] );

  const handleDoubleClick = useCallback( () =>
  {
    setXRange( { start: 0, end: 100 } );
    setYRange( { min: null, max: null } );
    setVolumeYRange( { min: null, max: null } );

    if ( chartRef.current )
    {
      chartRef.current.dispatchAction( {
        type: 'dataZoom',
        start: 0,
        end: 100
      } );
    }
  }, [] );

  const handleWheel = useCallback( ( e: React.WheelEvent ) =>
  {
    e.preventDefault();

    if ( !containerRef.current ) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const chartWidth = rect.width - ChartConfig.GRID.padding.right - 10;

    const zoomCenter = Math.min( 100, Math.max( 0, ( x / chartWidth ) * 100 ) );
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

  const onEvents = useMemo( () => ( {
    datazoom: ( params: any ) =>
    {
      if ( params.batch )
      {
        setXRange( {
          start: params.batch[ 0 ].start || 0,
          end: params.batch[ 0 ].end || 100
        } );
      } else if ( params.start !== undefined )
      {
        setXRange( {
          start: params.start,
          end: params.end
        } );
      }
    }
  } ), [] );

  // Save as image
  const handleSaveImage = async () =>
  {
    if ( !modalRef.current ) return;

    try
    {
      const dataUrl = await toPng( modalRef.current, {
        quality: 1.0,
        backgroundColor: ChartConfig.BACKGROUND.gradient.start,
      } );

      const link = document.createElement( 'a' );
      link.download = `levels-${ symbol }-${ timeframe }-${ Date.now() }.png`;
      link.href = dataUrl;
      link.click();
    } catch ( err )
    {
      console.error( 'Failed to save image:', err );
    }
  };

  // Calculate stats
  const stats = useMemo( () =>
  {
    const resistances = levels.filter( l => l.type === 'resistance' );
    const supports = levels.filter( l => l.type === 'support' );
    const avgStrength = levels.length > 0
      ? Math.round( levels.reduce( ( sum, l ) => sum + l.strength, 0 ) / levels.length )
      : 0;

    return { resistances, supports, avgStrength };
  }, [ levels ] );

  // Early return AFTER all hooks
  if ( !isOpen || !result || candles.length === 0 )
  {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={ onClose }
    >
      <div
        ref={ modalRef }
        className={ `relative w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden ${ MODAL_CLASSES }` }
        onClick={ ( e ) => e.stopPropagation() }
      >
        {/* === Header === */ }
        <div
          className={ `px-6 py-4 flex items-center justify-between ${ HEADER_CLASSES }` }
        >
          <div className="flex items-center gap-4">
            {/* Symbol */ }
            <div>
              <h2 className="text-xl font-bold text-white">
                { symbol.replace( 'USDT', '' ) }
                <span className="text-gray-500 text-sm ml-1">/USDT</span>
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-400 capitalize">
                  { EXCHANGE_LABELS[ exchange ] || exchange }
                </span>
                <span className="text-gray-600">•</span>
                <span className="text-xs text-gray-400">
                  { TIMEFRAME_LABELS[ timeframe ]?.en || timeframe }
                </span>
              </div>
            </div>

            {/* Level Count Badges */ }
            <div className="flex gap-2">
              <div
                className={ `px-3 py-1.5 rounded-lg text-sm font-semibold ${ LEVEL_BADGE_CLASSES.resistance }` }
              >
                { stats.resistances.length } مقاومة
              </div>
              <div
                className={ `px-3 py-1.5 rounded-lg text-sm font-semibold ${ LEVEL_BADGE_CLASSES.support }` }
              >
                { stats.supports.length } دعم
              </div>
            </div>
          </div>

          {/* Action Buttons */ }
          <div className="flex items-center gap-2">
            {/* Save Button */ }
            <button
              onClick={ handleSaveImage }
              className="p-2 rounded-lg hover:bg-white/[0.05] text-gray-400 hover:text-white transition-all"
              title="حفظ كصورة"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 2 } d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>

            {/* Reset Button */ }
            <button
              onClick={ handleDoubleClick }
              className="p-2 rounded-lg hover:bg-white/[0.05] text-gray-400 hover:text-white transition-all"
              title="إعادة ضبط (نقر مزدوج)"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 2 } d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

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
        </div>

        {/* === Chart Content === */ }
        <div
          ref={ containerRef }
          className={ `relative select-none h-[500px] ${ CHART_BG_CLASS } ${ CURSOR_CLASSES[ dragMode ] }` }
          onMouseDown={ handleMouseDown }
          onMouseMove={ handleMouseMove }
          onMouseUp={ handleMouseUp }
          onMouseLeave={ handleMouseUp }
          onDoubleClick={ handleDoubleClick }
          onWheel={ handleWheel }
        >
          <ReactECharts
            ref={ ( e ) =>
            {
              if ( e ) onChartReady( e.getEchartsInstance() );
            } }
            option={ option }
            className="h-full w-full pointer-events-none"
            opts={ { renderer: 'canvas' } }
            onEvents={ onEvents }
          />
        </div>

        {/* === Stats Footer === */ }
        <div
          className={ `px-6 py-4 grid grid-cols-4 gap-4 ${ FOOTER_CLASSES }` }
        >
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">السعر الحالي</div>
            <div className="text-lg font-bold text-[#2196f3]">
              { formatPrice( currentPrice ) }
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">عدد المستويات</div>
            <div className="text-lg font-bold text-white">
              { levels.length }
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">متوسط القوة</div>
            <div className={ `text-lg font-bold ${ AVG_STRENGTH_CLASS( stats.avgStrength ) }` }>
              { stats.avgStrength }%
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">أقوى مستوى</div>
            <div className={ `text-lg font-bold ${ LEVEL_TEXT_CLASS[ strongLevels[ 0 ]?.type || 'resistance' ] || 'text-white' }` }>
              { strongLevels[ 0 ] ? `${ formatPrice( strongLevels[ 0 ].price ) }` : '-' }
            </div>
          </div>
        </div>

        {/* === Interaction Guide === */ }
        <div className="absolute bottom-20 left-4 bg-black/50 rounded-lg px-3 py-2 text-xs text-gray-400 opacity-0 hover:opacity-100 transition-opacity">
          <div>🖱️ سحب للتحريك</div>
          <div>🔍 عجلة للتكبير</div>
          <div>📏 سحب المحور Y للتغيير</div>
          <div>🔄 نقر مزدوج للإعادة</div>
        </div>
      </div>
    </div>
  );
}

export default LevelsChartModal;
