'use client';

import { DetectedPattern, OHLCV } from '../types';
import { PatternGraphics, buildStraightLineData, getPatternColor, getZigzagColor, regY } from './utils';

export function renderBearishFlag(
  pattern: DetectedPattern,
  _candles: OHLCV[],
  categoryData: string[],
): PatternGraphics {
  const series: any[] = [];
  const graphic: any[] = [];
  if (!pattern.pivots?.length || !pattern.regression) return { series, graphic };

  const total = categoryData.length;
  const { high: highReg, low: lowReg } = pattern.regression;
  const color = getPatternColor(pattern.name || 'Bearish Flag');
  const zigzagColor = getZigzagColor();

  const pole = (pattern as any).pole as
    | { start: { index: number; price: number }; end: { index: number; price: number } }
    | undefined;

  if (pole) {
    series.push({
      type: 'line',
      data: buildStraightLineData(total, pole.start.index, pole.start.price, pole.end.index, pole.end.price),
      connectNulls: true,
      xAxisIndex: 0,
      yAxisIndex: 0,
      symbol: 'none',
      lineStyle: { color, width: 2, type: 'dashed' as const },
      silent: true,
      z: 8,
      animation: false,
    });
  }

  // Start trendlines from first consolidation pivot AFTER pole end (not pole end itself)
  const sortedByIdx = [...pattern.pivots].sort((a, b) => a.index - b.index);
  const poleEndIdx = pole ? pole.end.index : -1;
  const firstAfterPole = poleEndIdx >= 0 ? sortedByIdx.find(p => p.index > poleEndIdx) : null;
  const startBase = firstAfterPole ? firstAfterPole.index : (pole ? pole.end.index : sortedByIdx[sortedByIdx.length - 1]?.index ?? 0);
  const startIdx = Math.max(0, Math.min(startBase, total - 1));
  const newestPivot = sortedByIdx[sortedByIdx.length - 1];
  const safeEnd = Math.max(startIdx, Math.min(pattern.breakout?.detected ? pattern.breakout.index : (newestPivot?.index ?? startIdx), total - 1));
  const extension = Math.max(3, Math.round((safeEnd - startIdx) * 0.2));
  const extendedEnd = Math.min(safeEnd + extension, total - 1);

  // Parallel lines: average both regression slopes, anchor to consolidation pivot centroids
  const avgSlope = (highReg.slope + lowReg.slope) / 2;
  const consolPivots = sortedByIdx.filter(p => p.index >= poleEndIdx);
  const hPivots = consolPivots.filter(p => (p as any).dir === 1);
  const lPivots = consolPivots.filter(p => (p as any).dir === -1);
  const hCX = hPivots.length ? hPivots.reduce((s, p) => s + p.index, 0) / hPivots.length : startIdx;
  const hCY = hPivots.length ? hPivots.reduce((s, p) => s + p.price, 0) / hPivots.length : regY(highReg.slope, highReg.intercept, startIdx);
  const lCX = lPivots.length ? lPivots.reduce((s, p) => s + p.index, 0) / lPivots.length : startIdx;
  const lCY = lPivots.length ? lPivots.reduce((s, p) => s + p.price, 0) / lPivots.length : regY(lowReg.slope, lowReg.intercept, startIdx);
  const highIntercept = hCY - avgSlope * hCX;
  const lowIntercept = lCY - avgSlope * lCX;

  const hSY = regY(avgSlope, highIntercept, startIdx);
  const hXY = regY(avgSlope, highIntercept, extendedEnd);
  const lSY = regY(avgSlope, lowIntercept, startIdx);
  const lXY = regY(avgSlope, lowIntercept, extendedEnd);

  series.push(
    {
      type: 'line', data: buildStraightLineData(total, startIdx, hSY, extendedEnd, hXY), connectNulls: true,
      xAxisIndex: 0, yAxisIndex: 0, symbol: 'none', lineStyle: { color, width: 2, type: 'solid' as const },
      silent: true, z: 10, animation: false,
    },
    {
      type: 'line', data: buildStraightLineData(total, startIdx, lSY, extendedEnd, lXY), connectNulls: true,
      xAxisIndex: 0, yAxisIndex: 0, symbol: 'none', lineStyle: { color, width: 2, type: 'solid' as const },
      silent: true, z: 10, animation: false,
    }
  );

  const sortedPivots = [ ...pattern.pivots ].sort((a, b) => a.index - b.index);
  const zzData: (number | null)[] = new Array(total).fill(null);
  for (const p of sortedPivots) if (p.index >= 0 && p.index < total) zzData[p.index] = p.price;

  series.push(
    {
      type: 'line', data: zzData, connectNulls: true, xAxisIndex: 0, yAxisIndex: 0, symbol: 'none',
      lineStyle: { color: zigzagColor, width: 1, type: 'solid' as const }, silent: true, z: 9, animation: false,
    },
    {
      type: 'scatter',
      data: pattern.pivots.map((p) => ({ value: [ p.index, p.price ], itemStyle: { color: p.dir === 1 ? '#00E676' : '#FF5252', borderColor: '#fff', borderWidth: 1.5 } })),
      xAxisIndex: 0, yAxisIndex: 0, symbolSize: 8, z: 15, silent: true, animation: false,
    },
    {
      type: 'scatter',
      data: [ { value: [ extendedEnd, (hXY + lXY) / 2 ], label: { show: true, formatter: pattern.name || 'Bearish Flag', position: 'right', fontSize: 10, color: '#fff', backgroundColor: color + '99', padding: [ 2, 6 ], borderRadius: 3 }, itemStyle: { color: 'transparent', borderWidth: 0 } } ],
      xAxisIndex: 0, yAxisIndex: 0, symbolSize: 0, z: 20, silent: true, animation: false,
    }
  );

  if (pattern.breakout?.detected && pattern.breakout.index >= 0) {
    series.push({
      type: 'scatter', data: [ { value: [ pattern.breakout.index, pattern.breakout.price ], itemStyle: { color: 'rgba(66,165,245,0.25)', borderColor: '#42A5F5', borderWidth: 2.5 } } ],
      xAxisIndex: 0, yAxisIndex: 0, symbolSize: 20, symbol: 'circle', z: 20, silent: true, animation: false,
    });
  }

  return { series, graphic };
}
