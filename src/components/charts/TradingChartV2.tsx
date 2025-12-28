/**
 * TradingChartV2 - Rebuilt from scratch using DivergenceTradingChart pattern
 * Clean, efficient implementation with proper interactions
 */

"use client";

import React, { useRef, useState, useMemo, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { 
  generateSMASeries, 
  generateEMASeries,
  generateBollingerBandsSeries,
  generateKeltnerSeries,
  generateDonchianSeries,
  generateATRBandsSeries
} from './indicators';
import type { CandleData } from './types';

// ============================================
// Types
// ============================================

export type { CandleData } from './types';

export interface TradingChartProps {
  data: CandleData[];
  height?: number;
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
    liquiditySweeps?: boolean;
    
    // Ehlers DSP
    superSmoother?: boolean;
    instantaneousTrendline?: boolean;
    fisherTransform?: boolean;
    mama?: boolean;
    frama?: boolean;
    cyberCycle?: boolean;
    
    // Pattern Detection
    headAndShoulders?: boolean;
    inverseHeadAndShoulders?: boolean;
    doubleTop?: boolean;
    doubleBottom?: boolean;
    tripleTop?: boolean;
    tripleBottom?: boolean;
    cupAndHandle?: boolean;
    invertedCupAndHandle?: boolean;
    rectangle?: boolean;
    
    // Geometric Patterns
    ascendingChannel?: boolean;
    descendingChannel?: boolean;
    ascendingTriangle?: boolean;
    descendingTriangle?: boolean;
    symmetricalTriangle?: boolean;
    bullFlag?: boolean;
    bearFlag?: boolean;
    bullPennant?: boolean;
    bearPennant?: boolean;
    continuationFallingWedge?: boolean;
    reversalFallingWedge?: boolean;
    continuationRisingWedge?: boolean;
    reversalRisingWedge?: boolean;
    ascendingBroadeningWedge?: boolean;
    descendingBroadeningWedge?: boolean;
    
    // Ultra Precision Patterns
    ultraAscendingTriangle?: boolean;
    ultraDescendingTriangle?: boolean;
    ultraSymmetricalTriangle?: boolean;
    ultraRisingWedge?: boolean;
    ultraFallingWedge?: boolean;
    ultraSymmetricalBroadening?: boolean;
    ultraBroadeningBottom?: boolean;
    ultraBroadeningTop?: boolean;
    ultraAscendingBroadeningRA?: boolean;
    ultraDescendingBroadeningRA?: boolean;
    ultraAscendingChannel?: boolean;
    ultraDescendingChannel?: boolean;
    ultraBullFlag?: boolean;
    ultraBearFlag?: boolean;
    wolfeWavePattern?: boolean;
    
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
  };
}

// ============================================
// Theme Constants
// ============================================

const THEME = {
  background: 'transparent',
  textColor: '#ffffff',
  gridColor: '#2a2e39',
  upColor: '#26a69a',
  downColor: '#ef5350',
  borderColor: '#363a45',
};

// ============================================
// TradingChartV2 Component
// ============================================

export function TradingChartV2({
  data,
  height = 500,
  theme = 'dark',
  showVolume = false,
  indicators = {}
}: TradingChartProps) {
  const chartRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // ============================================
  // State Management
  // ============================================
  
  const [xRange, setXRange] = useState({ start: 0, end: 100 }); // Show all data by default
  const [yRange, setYRange] = useState<{ min: number | null; max: number | null }>({ min: null, max: null });
  const [dragMode, setDragMode] = useState<'none' | 'pan' | 'yScale'>('none');
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, xRange: { start: 0, end: 100 }, yRange: { min: 0, max: 0 } });
  
  // TradingView-style crosshair
  const [crosshair, setCrosshair] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });
  const [hoveredCandle, setHoveredCandle] = useState<{ index: number; data: CandleData } | null>(null);
  
  // ============================================
  // Data Preparation
  // ============================================
  
  const chartData = useMemo(() => {
    return data.map(d => [d.open, d.close, d.low, d.high]);
  }, [data]);
  
  const categories = useMemo(() => {
    return data.map(d => {
      const date = new Date(d.time * 1000);
      return date.toLocaleString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    });
  }, [data]);
  
  // Calculate visible data range
  const visibleData = useMemo(() => {
    const startIdx = Math.floor((xRange.start / 100) * data.length);
    const endIdx = Math.ceil((xRange.end / 100) * data.length);
    return data.slice(startIdx, endIdx);
  }, [data, xRange]);
  
  // Calculate Y-axis range
  const { yMin, yMax } = useMemo(() => {
    if (yRange.min !== null && yRange.max !== null) {
      return { yMin: yRange.min, yMax: yRange.max };
    }
    
    if (visibleData.length === 0) {
      return { yMin: 0, yMax: 100 };
    }
    
    let min = Infinity;
    let max = -Infinity;
    
    visibleData.forEach(d => {
      min = Math.min(min, d.low);
      max = Math.max(max, d.high);
    });
    
    const padding = (max - min) * 0.1;
    return { yMin: min - padding, yMax: max + padding };
  }, [visibleData, yRange]);
  
  // ============================================
  // Interaction Handlers
  // ============================================
  
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const delta = e.deltaY > 0 ? 0.05 : -0.05;
    const range = xRange.end - xRange.start;
    const newRange = Math.max(5, Math.min(100, range + delta * 100));
    const center = (xRange.start + xRange.end) / 2;
    
    setXRange({
      start: Math.max(0, center - newRange / 2),
      end: Math.min(100, center + newRange / 2)
    });
  }, [xRange]);
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Y-axis scaling zone (right 50px)
    if (x > rect.width - 50) {
      setDragMode('yScale');
      setDragStart({ x, y, xRange, yRange: { min: yMin, max: yMax } });
    } else {
      // Pan mode
      setDragMode('pan');
      setDragStart({ x, y, xRange, yRange: { min: yMin, max: yMax } });
    }
  }, [xRange, yMin, yMax]);
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Update crosshair position
    if (x > 5 && x < rect.width - 50 && y > 5 && y < rect.height - 30) {
      setCrosshair({ x, y, visible: true });
      
      // Calculate hovered candle
      const chartWidth = rect.width - 55; // excluding margins
      const visibleRange = xRange.end - xRange.start;
      const visibleDataCount = Math.ceil((visibleRange / 100) * data.length);
      const startIdx = Math.floor((xRange.start / 100) * data.length);
      
      const candleWidth = chartWidth / visibleDataCount;
      const hoveredIdx = startIdx + Math.floor((x - 5) / candleWidth);
      
      if (hoveredIdx >= 0 && hoveredIdx < data.length) {
        setHoveredCandle({ index: hoveredIdx, data: data[hoveredIdx] });
      }
    } else {
      setCrosshair({ x, y, visible: false });
      setHoveredCandle(null);
    }
    
    if (dragMode === 'none') return;
    
    if (dragMode === 'pan') {
      const dx = ((dragStart.x - x) / rect.width) * 100;
      const newStart = dragStart.xRange.start + dx;
      const newEnd = dragStart.xRange.end + dx;
      const range = newEnd - newStart;
      
      if (newStart < 0) {
        setXRange({ start: 0, end: range });
      } else if (newEnd > 100) {
        setXRange({ start: 100 - range, end: 100 });
      } else {
        setXRange({ start: newStart, end: newEnd });
      }
    } else if (dragMode === 'yScale') {
      const dy = (y - dragStart.y) / rect.height;
      const yRangeSpan = dragStart.yRange.max - dragStart.yRange.min;
      const newYMin = dragStart.yRange.min - dy * yRangeSpan;
      const newYMax = dragStart.yRange.max + dy * yRangeSpan;
      
      setYRange({ min: newYMin, max: newYMax });
    }
  }, [dragMode, dragStart, xRange, data]);
  
  const handleMouseUp = useCallback(() => {
    setDragMode('none');
  }, []);
  
  const handleMouseLeave = useCallback(() => {
    setDragMode('none');
    setCrosshair({ x: 0, y: 0, visible: false });
    setHoveredCandle(null);
  }, []);
  
  const handleDoubleClick = useCallback(() => {
    setXRange({ start: 0, end: 100 });
    setYRange({ min: null, max: null });
  }, []);
  
  // ============================================
  // ECharts Option Builder
  // ============================================
  
  const option: EChartsOption = useMemo(() => {
    const series: any[] = [];
    
    // Candlestick series
    series.push({
      name: 'K',
      type: 'candlestick',
      data: chartData,
      itemStyle: {
        color: THEME.upColor,
        color0: THEME.downColor,
        borderColor: THEME.upColor,
        borderColor0: THEME.downColor,
      },
      z: 10
    });
    
    // Add Moving Averages
    if (indicators.sma10 || indicators.sma25 || indicators.sma50 || indicators.sma100 || indicators.sma200) {
      const smaSeries = generateSMASeries(data, {
        sma10: indicators.sma10,
        sma25: indicators.sma25,
        sma50: indicators.sma50,
        sma100: indicators.sma100,
        sma200: indicators.sma200,
      });
      series.push(...smaSeries);
    }
    
    if (indicators.ema10 || indicators.ema25 || indicators.ema50 || indicators.ema100 || indicators.ema200) {
      const emaSeries = generateEMASeries(data, {
        ema10: indicators.ema10,
        ema25: indicators.ema25,
        ema50: indicators.ema50,
        ema100: indicators.ema100,
        ema200: indicators.ema200,
      });
      series.push(...emaSeries);
    }
    
    // Add Bands
    if (indicators.bollingerBands) {
      series.push(...generateBollingerBandsSeries(data));
    }
    
    if (indicators.keltner) {
      series.push(...generateKeltnerSeries(data));
    }
    
    if (indicators.donchian) {
      series.push(...generateDonchianSeries(data));
    }
    
    if (indicators.atrBands) {
      series.push(...generateATRBandsSeries(data));
    }
    
    // TODO: Add remaining indicators from old TradingChart
    // SMC, Ehlers DSP, Patterns, etc.
    
    return {
      backgroundColor: THEME.background,
      animation: false, // CRITICAL: No animation for smooth interactions
      tooltip: { show: false }, // Disable ECharts tooltip
      axisPointer: {
        link: [{ xAxisIndex: 'all' }],
        label: { show: false }
      },
      grid: {
        left: 5,
        right: 50,
        top: 5,
        bottom: 30,
        containLabel: false
      },
      xAxis: {
        type: 'category',
        data: categories,
        boundaryGap: true,
        axisLine: { lineStyle: { color: THEME.borderColor } },
        axisLabel: { 
          color: THEME.textColor, 
          fontSize: 11,
          rotate: 0
        },
        splitLine: { show: false },
        min: 'dataMin',
        max: 'dataMax'
      },
      yAxis: {
        type: 'value',
        position: 'right',
        scale: true,
        min: yMin,
        max: yMax,
        axisLine: { show: false },
        axisLabel: { 
          color: THEME.textColor, 
          fontSize: 11,
          formatter: (value: number) => value.toFixed(2)
        },
        splitLine: { 
          lineStyle: { 
            color: THEME.gridColor, 
            type: 'dashed' 
          } 
        }
      },
      dataZoom: [{
        type: 'inside',
        xAxisIndex: 0,
        start: xRange.start,
        end: xRange.end,
        zoomOnMouseWheel: true, // CRITICAL: Enable wheel zoom
        moveOnMouseMove: false,
        moveOnMouseWheel: false,
        preventDefaultMouseMove: false
      }],
      series
    };
  }, [data, chartData, categories, xRange, yMin, yMax, indicators]);
  
  // ============================================
  // Cursor Style
  // ============================================
  
  const cursor = dragMode === 'pan' ? 'grabbing' : dragMode === 'yScale' ? 'ns-resize' : 'crosshair';
  
  // ============================================
  // Render
  // ============================================
  
  return (
    <div
      ref={containerRef}
      className="relative select-none overflow-hidden"
      style={{ 
        height, 
        width: '100%', 
        background: 'linear-gradient(90deg, #030508, #0d3b3b)',
        cursor
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onDoubleClick={handleDoubleClick}
      onWheel={handleWheel}
    >
      {/* TradingView-style Crosshair */}
      {crosshair.visible && (
        <>
          {/* Vertical line */}
          <div
            className="absolute top-0 bottom-0 w-px bg-white/20 pointer-events-none"
            style={{ left: crosshair.x, zIndex: 50 }}
          />
          {/* Horizontal line */}
          <div
            className="absolute left-0 right-0 h-px bg-white/20 pointer-events-none"
            style={{ top: crosshair.y, zIndex: 50 }}
          />
          
          {/* Price label on Y-axis */}
          <div
            className="absolute right-0 px-2 py-1 text-xs font-mono bg-gray-800 text-white border border-white/20 rounded pointer-events-none"
            style={{ 
              top: crosshair.y - 12, 
              zIndex: 51,
              transform: 'translateX(2px)'
            }}
          >
            {hoveredCandle ? hoveredCandle.data.close.toFixed(2) : ''}
          </div>
          
          {/* Time label on X-axis */}
          {hoveredCandle && (
            <div
              className="absolute bottom-0 px-2 py-1 text-xs font-mono bg-gray-800 text-white border border-white/20 rounded pointer-events-none"
              style={{ 
                left: crosshair.x - 40, 
                zIndex: 51,
                transform: 'translateY(2px)'
              }}
            >
              {new Date(hoveredCandle.data.time * 1000).toLocaleString('ar-EG', { 
                month: 'short', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
          )}
        </>
      )}
      
      {/* Custom Tooltip - TradingView style */}
      {hoveredCandle && crosshair.visible && (
        <div
          className="absolute top-2 left-2 p-3 bg-gray-900/95 border border-white/10 rounded-lg shadow-xl pointer-events-none"
          style={{ zIndex: 100 }}
        >
          <div className="space-y-1 text-xs font-mono">
            <div className="flex items-center gap-2 text-gray-400 pb-1 border-b border-white/10">
              <span>{new Date(hoveredCandle.data.time * 1000).toLocaleString('ar-EG', { 
                year: 'numeric',
                month: 'short', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
              })}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">O:</span>
                <span className="text-white font-semibold">{hoveredCandle.data.open.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">H:</span>
                <span className="text-emerald-400 font-semibold">{hoveredCandle.data.high.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">L:</span>
                <span className="text-red-400 font-semibold">{hoveredCandle.data.low.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">C:</span>
                <span className={`font-semibold ${
                  hoveredCandle.data.close >= hoveredCandle.data.open ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {hoveredCandle.data.close.toFixed(2)}
                </span>
              </div>
            </div>
            
            <div className="flex justify-between gap-2 pt-1 border-t border-white/10">
              <span className="text-gray-400">Vol:</span>
              <span className="text-cyan-400 font-semibold">
                {hoveredCandle.data.volume >= 1000000 
                  ? `${(hoveredCandle.data.volume / 1000000).toFixed(2)}M`
                  : hoveredCandle.data.volume >= 1000
                    ? `${(hoveredCandle.data.volume / 1000).toFixed(2)}K`
                    : hoveredCandle.data.volume.toFixed(0)
                }
              </span>
            </div>
            
            {hoveredCandle.index > 0 && (
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Change:</span>
                <span className={`font-semibold ${
                  hoveredCandle.data.close >= data[hoveredCandle.index - 1].close ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {hoveredCandle.data.close >= data[hoveredCandle.index - 1].close ? '+' : ''}
                  {(((hoveredCandle.data.close - data[hoveredCandle.index - 1].close) / data[hoveredCandle.index - 1].close) * 100).toFixed(2)}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Y-Axis Scale Zone Indicator */}
      <div 
        className="absolute top-0 right-0 bottom-0 w-[50px] pointer-events-none border-l border-white/10"
        style={{ zIndex: 100 }}
      />
      
      {/* ECharts Component - NO pointer events */}
      <ReactECharts
        ref={chartRef}
        option={option}
        style={{ height: '100%', width: '100%', pointerEvents: 'none' }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
}
