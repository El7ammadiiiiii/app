/**
 * SubIndicatorChartV2 - Sub-charts for oscillator indicators
 * Rebuilt with clean architecture
 */

"use client";

import React, { useRef, useState, useMemo, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { calculateRSI, calculateMACD, calculateStochRSI, calculateOBV } from './indicators';
import type { CandleData } from './types';

// ============================================
// Types
// ============================================

export interface SubChartProps {
  data: CandleData[];
  indicator: 'volume' | 'rsi' | 'macd' | 'stochRsi' | 'obv' | 'adx' | 'mfi' | string;
  height?: number;
  onToggle?: (indicator: string, value: boolean) => void;
}

// ============================================
// SubIndicatorChartV2 Component
// ============================================

export function SubIndicatorChartV2({ data, indicator, height = 120, onToggle }: SubChartProps) {
  const chartRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [xRange, setXRange] = useState({ start: 0, end: 100 });
  const [yRange, setYRange] = useState({ start: 0, end: 100 });
  const [crosshair, setCrosshair] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });
  const [hoveredPoint, setHoveredPoint] = useState<{ index: number; value: number } | null>(null);
  
  // Handle mouse move for crosshair
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (x > 5 && x < rect.width - 50 && y > 10 && y < rect.height - 20) {
      setCrosshair({ x, y, visible: true });
      
      // Calculate hovered point
      const chartWidth = rect.width - 55;
      const pointWidth = chartWidth / data.length;
      const hoveredIdx = Math.floor((x - 5) / pointWidth);
      
      if (hoveredIdx >= 0 && hoveredIdx < data.length) {
        setHoveredPoint({ index: hoveredIdx, value: data[hoveredIdx].close });
      }
    } else {
      setCrosshair({ x, y, visible: false });
      setHoveredPoint(null);
    }
  }, [data]);
  
  const handleMouseLeave = useCallback(() => {
    setCrosshair({ x: 0, y: 0, visible: false });
    setHoveredPoint(null);
  }, []);
  
  // Build ECharts option based on indicator type
  const option: EChartsOption = useMemo(() => {
    let series: any[] = [];
    let yAxisConfig: any = { type: 'value', position: 'right' };
    
    switch (indicator) {
      case 'rsi': {
        const rsi = calculateRSI(data);
        series = [{
          name: 'RSI',
          type: 'line',
          data: rsi,
          smooth: true,
          lineStyle: { color: '#9C27B0', width: 2 },
          areaStyle: { color: 'rgba(156, 39, 176, 0.1)' },
          showSymbol: false
        }];
        yAxisConfig = {
          ...yAxisConfig,
          min: 0,
          max: 100,
          splitLine: { lineStyle: { color: '#2a2e39', type: 'dashed' } }
        };
        break;
      }
      
      case 'macd': {
        const { macdLine, signalLine, histogram } = calculateMACD(data);
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
              color: (params: any) => params.value >= 0 ? '#26a69a' : '#ef5350'
            }
          }
        ];
        break;
      }
      
      case 'stochRsi': {
        const { k, d } = calculateStochRSI(data);
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
        const obv = calculateOBV(data);
        series = [{
          name: 'OBV',
          type: 'line',
          data: obv,
          smooth: true,
          lineStyle: { color: '#4CAF50', width: 2 },
          areaStyle: { color: 'rgba(76, 175, 80, 0.1)' },
          showSymbol: false
        }];
        break;
      }
      
      case 'volume': {
        const volumeData = data.map((d, i) => {
          const color = i > 0 && d.close >= data[i - 1].close ? '#26a69a' : '#ef5350';
          return { value: d.volume, itemStyle: { color } };
        });
        series = [{
          name: 'Volume',
          type: 'bar',
          data: volumeData
        }];
        break;
      }
      
      default:
        // Placeholder for other indicators
        series = [];
    }
    
    return {
      backgroundColor: 'transparent',
      animation: false,
      tooltip: { show: false },
      grid: {
        left: 5,
        right: 50,
        top: 10,
        bottom: 20,
        containLabel: false
      },
      xAxis: {
        type: 'category',
        boundaryGap: indicator === 'volume',
        axisLine: { lineStyle: { color: '#363a45' } },
        axisLabel: { show: false },
        splitLine: { show: false }
      },
      yAxis: {
        ...yAxisConfig,
        axisLine: { show: false },
        axisLabel: { 
          color: '#ffffff', 
          fontSize: 10,
          formatter: (value: number) => {
            if (indicator === 'volume') {
              return value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : 
                     value >= 1000 ? `${(value / 1000).toFixed(1)}K` : 
                     value.toFixed(0);
            }
            return value.toFixed(2);
          }
        },
        splitLine: { lineStyle: { color: '#2a2e39', type: 'dashed' } }
      },
      dataZoom: [{
        type: 'inside',
        xAxisIndex: 0,
        start: xRange.start,
        end: xRange.end,
        zoomOnMouseWheel: true,
        moveOnMouseMove: false
      }],
      series
    };
  }, [data, indicator, xRange]);
  
  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ 
        height, 
        width: '100%',
        background: 'linear-gradient(90deg, #030508, #0d3b3b)',
        borderTop: '1px solid #363a45'
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Crosshair */}
      {crosshair.visible && (
        <>
          <div
            className="absolute top-0 bottom-0 w-px bg-white/20 pointer-events-none"
            style={{ left: crosshair.x, zIndex: 50 }}
          />
          <div
            className="absolute left-0 right-0 h-px bg-white/20 pointer-events-none"
            style={{ top: crosshair.y, zIndex: 50 }}
          />
        </>
      )}
      
      {/* Indicator label */}
      <div className="absolute top-2 left-2 text-xs font-semibold text-cyan-400 uppercase z-10 pointer-events-none">
        {indicator}
      </div>
      
      <ReactECharts
        ref={chartRef}
        option={option}
        style={{ height: '100%', width: '100%', pointerEvents: 'none' }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
}

// ============================================
// Container for Multiple Sub-Charts
// ============================================

export interface SubChartsContainerProps {
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
  onToggle?: (indicator: string, value: boolean) => void;
}

export function SubChartsContainerV2({ data, indicators, onToggle }: SubChartsContainerProps) {
  const activeIndicators = Object.entries(indicators)
    .filter(([_, enabled]) => enabled)
    .map(([name]) => name);
  
  if (activeIndicators.length === 0) return null;
  
  return (
    <div className="space-y-0">
      {activeIndicators.map((indicator) => (
        <SubIndicatorChartV2
          key={indicator}
          data={data}
          indicator={indicator}
          height={120}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}
