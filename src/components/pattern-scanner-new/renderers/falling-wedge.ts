'use client';

import { DetectedPattern, OHLCV } from '../types';
import { PatternGraphics, buildStraightLineData, getPatternColor, getZigzagColor, regY } from './utils';

export function renderFallingWedge(
  pattern: DetectedPattern,
  _candles: OHLCV[],
  categoryData: string[],
): PatternGraphics {
  const series: any[] = [];
  const graphic: any[] = [];
  if (!pattern.pivots?.length || !pattern.regression) return { series, graphic };

  const total = categoryData.length;
  const { high: highReg, low: lowReg } = pattern.regression;
  const color = getPatternColor(pattern.name || 'Falling Wedge');
  const zigzagColor = getZigzagColor();

  const startIdx = Math.max(0, Math.min(pattern.pivots[pattern.pivots.length - 1].index, total - 1));
  const safeEnd = Math.max(startIdx, Math.min(pattern.breakout?.detected ? pattern.breakout.index : pattern.pivots[0].index, total - 1));
  const extension = Math.max(3, Math.round((safeEnd - startIdx) * 0.2));
  const extendedEnd = Math.min(safeEnd + extension, total - 1);

  const hSY = regY(highReg.slope, highReg.intercept, startIdx);
  const hXY = regY(highReg.slope, highReg.intercept, extendedEnd);
  const lSY = regY(lowReg.slope, lowReg.intercept, startIdx);
  const lXY = regY(lowReg.slope, lowReg.intercept, extendedEnd);

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
      data: [ { value: [ extendedEnd, (hXY + lXY) / 2 ], label: { show: true, formatter: pattern.name || 'Falling Wedge', position: 'right', fontSize: 10, color: '#fff', backgroundColor: color + '99', padding: [ 2, 6 ], borderRadius: 3 }, itemStyle: { color: 'transparent', borderWidth: 0 } } ],
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

