/**
 * Display 6 Plotly Chart Component
 * Visualizes chart patterns from ajaygm18/chart using Plotly
 */

"use client";

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { PlotParams } from 'react-plotly.js';
import type { Time } from 'lightweight-charts';

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export interface CandleData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface Display6ChartProps {
  data: CandleData[];
  pattern?: any; // Pattern detection result
  width?: number | string;
  height?: number | string;
}

export function Display6PlotlyChart({ data, pattern, width = '100%', height = 600 }: Display6ChartProps) {
  const plotData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const traces: any[] = [];

    // Candlestick trace
    traces.push({
      type: 'candlestick',
      x: data.map(d => d.time),
      open: data.map(d => d.open),
      high: data.map(d => d.high),
      low: data.map(d => d.low),
      close: data.map(d => d.close),
      name: 'Price',
      increasing: { line: { color: '#22c55e' } },
      decreasing: { line: { color: '#ef4444' } },
    });

    // Add pattern overlays if pattern detected
    if (pattern && pattern.length > 0) {
      pattern.forEach((p: any, idx: number) => {
        // Add pattern lines/shapes based on pattern type
        if (p.type === 'head_and_shoulders' || p.type === 'inverse_head_and_shoulders') {
          // Add shoulder and head markers
          traces.push({
            type: 'scatter',
            mode: 'markers+lines',
            x: [
              data[p.leftShoulder.index]?.time,
              data[p.head.index]?.time,
              data[p.rightShoulder.index]?.time,
            ],
            y: [p.leftShoulder.price, p.head.price, p.rightShoulder.price],
            name: `${p.type} Pattern`,
            marker: { size: 10, color: p.direction === 'bullish' ? '#22c55e' : '#ef4444' },
            line: { color: p.direction === 'bullish' ? '#22c55e' : '#ef4444', dash: 'dot' },
          });

          // Add neckline
          traces.push({
            type: 'scatter',
            mode: 'lines',
            x: [data[p.neckline.start]?.time, data[p.neckline.end]?.time],
            y: [p.neckline.price, p.neckline.price],
            name: 'Neckline',
            line: { color: '#fbbf24', dash: 'dash', width: 2 },
          });
        } else if (p.type === 'double_top' || p.type === 'double_bottom') {
          // Add peaks/bottoms
          traces.push({
            type: 'scatter',
            mode: 'markers+lines',
            x: [data[p.firstPeak?.index || p.firstBottom?.index]?.time, data[p.secondPeak?.index || p.secondBottom?.index]?.time],
            y: [p.firstPeak?.price || p.firstBottom?.price, p.secondPeak?.price || p.secondBottom?.price],
            name: `${p.type} Pattern`,
            marker: { size: 10, color: p.direction === 'bullish' ? '#22c55e' : '#ef4444' },
            line: { color: p.direction === 'bullish' ? '#22c55e' : '#ef4444', dash: 'dot' },
          });
        } else if (p.type === 'ascending_triangle' || p.type === 'descending_triangle' || p.type === 'symmetrical_triangle') {
          // Add triangle lines
          if (p.resistanceLine || p.upperLine) {
            const line = p.resistanceLine || p.upperLine;
            traces.push({
              type: 'scatter',
              mode: 'lines',
              x: [data[line.start.index]?.time, data[line.end.index]?.time],
              y: [line.start.price, line.end.price],
              name: 'Resistance',
              line: { color: '#ef4444', width: 2 },
            });
          }
          if (p.supportLine || p.lowerLine) {
            const line = p.supportLine || p.lowerLine;
            traces.push({
              type: 'scatter',
              mode: 'lines',
              x: [data[line.start.index]?.time, data[line.end.index]?.time],
              y: [line.start.price, line.end.price],
              name: 'Support',
              line: { color: '#22c55e', width: 2 },
            });
          }
        } else if (p.type === 'bull_flag' || p.type === 'bear_flag') {
          // Add pole
          traces.push({
            type: 'scatter',
            mode: 'lines',
            x: [data[p.pole.start.index]?.time, data[p.pole.end.index]?.time],
            y: [p.pole.start.price, p.pole.end.price],
            name: 'Pole',
            line: { color: p.direction === 'bullish' ? '#22c55e' : '#ef4444', width: 3 },
          });

          // Add flag boundaries
          traces.push({
            type: 'scatter',
            mode: 'lines',
            x: [data[p.flag.upperLine.start.index]?.time, data[p.flag.upperLine.end.index]?.time],
            y: [p.flag.upperLine.start.price, p.flag.upperLine.end.price],
            name: 'Flag Upper',
            line: { color: '#fbbf24', dash: 'dash', width: 2 },
          });
          traces.push({
            type: 'scatter',
            mode: 'lines',
            x: [data[p.flag.lowerLine.start.index]?.time, data[p.flag.lowerLine.end.index]?.time],
            y: [p.flag.lowerLine.start.price, p.flag.lowerLine.end.price],
            name: 'Flag Lower',
            line: { color: '#fbbf24', dash: 'dash', width: 2 },
          });
        }
      });
    }

    return traces;
  }, [data, pattern]);

  const layout: Partial<PlotParams['layout']> = {
    autosize: true,
    height: typeof height === 'number' ? height : undefined,
    margin: { l: 50, r: 50, t: 30, b: 50 },
    paper_bgcolor: '#040506',
    plot_bgcolor: '#0f3133',
    xaxis: {
      type: 'category',
      rangeslider: { visible: false },
      gridcolor: '#374151',
      color: '#9ca3af',
    },
    yaxis: {
      gridcolor: '#374151',
      color: '#9ca3af',
    },
    legend: {
      orientation: 'h',
      yanchor: 'bottom',
      y: 1.02,
      xanchor: 'right',
      x: 1,
      font: { color: '#9ca3af' },
    },
    hovermode: 'x unified',
    showlegend: true,
  };

  const config: Partial<PlotParams['config']> = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
  };

  return (
    <div className="w-full" style={{ height: typeof height === 'number' ? `${height}px` : height }}>
      <Plot
        data={plotData}
        layout={layout}
        config={config}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler={true}
      />
    </div>
  );
}
