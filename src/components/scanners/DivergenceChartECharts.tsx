'use client';

/**
 * 📊 Professional Divergence Chart Component (ECharts Version)
 * مكون شارت احترافي لعرض الدايفرجنس باستخدام Apache ECharts
 * 
 * Features:
 * - Candlestick chart with custom colors (#008040 / #800000)
 * - Separate indicator panel below
 * - Divergence lines drawn on both panels
 * - Smooth animations
 * - Professional dark theme (#131722)
 * 
 * @author CCWAYS Team
 * @version 2.0.0
 */

import React, { useMemo } from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import { DivergenceResult, OHLCV } from '@/lib/scanners/advanced-divergence-detector';
import { GraphicComponent, GridComponent, TooltipComponent, DataZoomComponent, MarkLineComponent } from 'echarts/components';
import { CandlestickChart, LineChart } from 'echarts/charts';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';

// Register ECharts components
echarts.use( [
  GraphicComponent,
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  MarkLineComponent,
  CandlestickChart,
  LineChart,
  CanvasRenderer
] );

interface DivergenceChartProps
{
  candles: OHLCV[];
  divergence: DivergenceResult;
  indicatorValues: number[];
  width?: number | string;
  height?: number | string;
  className?: string;
}

export function DivergenceChartECharts ( {
  candles,
  divergence,
  indicatorValues,
  width = '100%',
  height = 400,
  className = ''
}: DivergenceChartProps )
{

  const sizeClass = `divergence-echarts-size-${ String( width ).replace( /[^a-z0-9]/gi, '' ) }-${ String( height ).replace( /[^a-z0-9]/gi, '' ) }`;

  const option = useMemo( () =>
  {
    // Format data for ECharts
    // ECharts Candlestick data: [open, close, low, high]
    const data0 = candles.map( item => [ item.open, item.close, item.low, item.high ] );
    const categoryData = candles.map( item =>
    {
      const date = new Date( item.timestamp );
      return `${ date.getHours() }:${ date.getMinutes().toString().padStart( 2, '0' ) }`;
    } );

    // Colors
    const upColor = '#008040';
    const downColor = '#800000';
    const bgColor = '#040506';
    const gridColor = '#0f3133';
    const textColor = '#e2e8f0';

    // Divergence Line Color
    const divergenceColor = divergence.direction === 'bullish' ? '#22c55e' : '#ef4444';

    // Calculate Divergence Lines
    // Price Chart Line
    const priceStartValue = divergence.startPoint.isHigh ? candles[ divergence.startPoint.index ].high : candles[ divergence.startPoint.index ].low;
    const priceEndValue = divergence.endPoint.isHigh ? candles[ divergence.endPoint.index ].high : candles[ divergence.endPoint.index ].low;

    const priceMarkLine = {
      symbol: [ 'none', 'arrow' ],
      symbolSize: 10,
      label: { show: false },
      lineStyle: {
        color: divergenceColor,
        width: 2,
        type: divergence.type === 'weak' || divergence.type === 'hidden' ? 'dashed' : 'solid'
      },
      data: [
        [
          { coord: [ divergence.startPoint.index, priceStartValue ] },
          { coord: [ divergence.endPoint.index, priceEndValue ] }
        ]
      ]
    };

    // Indicator Chart Line
    // Use indicatorPeakIndex for accurate placement on the indicator line
    const indicatorMarkLine = {
      symbol: [ 'none', 'arrow' ],
      symbolSize: 10,
      label: { show: false },
      lineStyle: {
        color: divergenceColor,
        width: 2,
        type: divergence.type === 'weak' || divergence.type === 'hidden' ? 'dashed' : 'solid'
      },
      data: [
        [
          { coord: [ divergence.startPoint.indicatorPeakIndex, divergence.startPoint.indicatorValue ] },
          { coord: [ divergence.endPoint.indicatorPeakIndex, divergence.endPoint.indicatorValue ] }
        ]
      ]
    };

    return {
      backgroundColor: bgColor,
      animation: true,
      animationDuration: 1000,
      animationEasing: 'cubicOut',
      tooltip: {
        show: false
      },
      axisPointer: {
        link: { xAxisIndex: 'all' },
        label: {
          backgroundColor: '#777'
        }
      },
      grid: [
        {
          left: '5%',
          right: '5%',
          top: '5%',
          height: '60%'
        },
        {
          left: '5%',
          right: '5%',
          top: '70%',
          height: '25%'
        }
      ],
      xAxis: [
        {
          type: 'category',
          data: categoryData,
          scale: true,
          boundaryGap: true, // Candlestick needs boundaryGap
          axisLine: { onZero: false, lineStyle: { color: gridColor } },
          splitLine: { show: true, lineStyle: { color: gridColor } },
          axisLabel: { show: false }, // Hide labels on top chart
          axisTick: { show: false },
          min: 'dataMin',
          max: 'dataMax'
        },
        {
          type: 'category',
          gridIndex: 1,
          data: categoryData,
          scale: true,
          boundaryGap: true,
          axisLine: { onZero: false, lineStyle: { color: gridColor } },
          axisTick: { show: false },
          splitLine: { show: true, lineStyle: { color: gridColor } },
          axisLabel: { color: textColor },
          min: 'dataMin',
          max: 'dataMax'
        }
      ],
      yAxis: [
        {
          scale: true,
          splitArea: {
            show: false
          },
          splitLine: {
            show: true,
            lineStyle: {
              color: gridColor
            }
          },
          axisLabel: {
            color: textColor
          }
        },
        {
          scale: true,
          gridIndex: 1,
          splitNumber: 2,
          axisLabel: { show: false },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false }
        }
      ],
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: [ 0, 1 ],
          start: 0,
          end: 100
        },
        {
          show: false, // Hide slider
          xAxisIndex: [ 0, 1 ],
          type: 'slider',
          top: '95%',
          start: 0,
          end: 100
        }
      ],
      series: [
        {
          name: divergence.symbol,
          type: 'candlestick',
          data: data0,
          itemStyle: {
            color: upColor,
            color0: downColor,
            borderColor: upColor,
            borderColor0: downColor
          },
          markLine: priceMarkLine
        },
        {
          name: divergence.indicator,
          type: 'line',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: indicatorValues,
          smooth: true,
          showSymbol: false,
          lineStyle: {
            width: 1,
            color: '#2196f3' // Default indicator color
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient( 0, 0, 0, 1, [
              { offset: 0, color: 'rgba(33, 150, 243, 0.5)' },
              { offset: 1, color: 'rgba(33, 150, 243, 0.0)' }
            ] )
          },
          markLine: indicatorMarkLine
        }
      ]
    };
  }, [ candles, divergence, indicatorValues ] );

  return (
    <div className={ `flex flex-col gap-1 ${ className }` }>
      <div className="relative rounded-lg overflow-hidden border border-[#1a4a4d]">
        <style>{ `.${ sizeClass }{width:${ typeof width === 'number' ? `${ width }px` : width };height:${ typeof height === 'number' ? `${ height }px` : height };}` }</style>
        <ReactEChartsCore
          echarts={ echarts }
          option={ option }
          className={ sizeClass }
          theme="dark"
        />

        {/* Chart Label */ }
        <div className="absolute top-2 left-2 px-2 py-1 rounded text-xs text-white/80 backdrop-blur-sm pointer-events-none theme-surface">
          { divergence.symbol } • { divergence.timeframe }
        </div>

        {/* Indicator Label */ }
        <div className="absolute top-[70%] left-2 px-2 py-1 rounded text-xs text-white/80 backdrop-blur-sm pointer-events-none theme-surface">
          { divergence.indicator }
        </div>
      </div>

      {/* Chart Info Footer */ }
      <div className="flex items-center justify-between text-xs px-2 py-1.5 border border-[#1a4a4d] rounded-lg mt-1 theme-surface">
        <span className="text-gray-500">
          Type: <span className={ `font-semibold ${ divergence.direction === 'bullish' ? 'text-green-400' : 'text-red-400' }` }>
            { divergence.type.toUpperCase() }
          </span>
        </span>
        <span className="text-gray-500">
          Score: <span className="font-semibold text-cyan-400">{ divergence.score.toFixed( 0 ) }</span>
        </span>
        <span className="text-gray-500">
          Confidence: <span className="font-semibold text-amber-400">{ divergence.confidence.toFixed( 0 ) }%</span>
        </span>
      </div>
    </div>
  );
}

export default DivergenceChartECharts;
