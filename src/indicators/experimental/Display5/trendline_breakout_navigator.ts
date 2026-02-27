/**
 * Trendline Breakout Navigator [LuxAlgo]
 * Converted from Pine Script to TypeScript for Display 5 custom models.
 *
 * The indicator builds dynamic bullish/bearish trendlines across
 * multiple swing lengths and highlights HH/LL sequences plus breakout signals.
 */

export type TrendDirection = 'bullish' | 'bearish';

export interface PivotPoint {
  index: number;
  price: number;
}

export interface TrendlineSegment {
  direction: TrendDirection;
  lengthLabel: 'Long' | 'Medium' | 'Short';
  start: PivotPoint;
  end: PivotPoint;
  slope: number;
  projectEndIndex: number;
  projectEndPrice: number;
  style: 'solid' | 'dashed' | 'dotted';
  width: number;
}

export interface HHLLLabel {
  index: number;
  price: number;
  label: 'HH' | 'LL';
  lengthLabel: 'Long' | 'Medium' | 'Short';
  emphasizePrevious: boolean;
  pivotType: 'high' | 'low';
}

export interface BreakoutSignal {
  index: number;
  price: number;
  direction: 'bullish_break' | 'bearish_break';
  lengthLabel: 'Long' | 'Medium' | 'Short';
}

export interface TrendlineNavigatorConfig {
  swingLengths: Array<{
    label: 'Long' | 'Medium' | 'Short';
    length: number;
    enabled: boolean;
    style: 'solid' | 'dashed' | 'dotted';
    width: number;
  }>;
  hhllMode: 'none' | 'hhll' | 'hhll_prev';
  extendBars: number;
  deviationFilter: number; // pct difference required between pivots (0-1)
}

export interface TrendlineNavigatorResult {
  segments: TrendlineSegment[];
  hhllLabels: HHLLLabel[];
  breakoutSignals: BreakoutSignal[];
}

const DEFAULT_CONFIG: TrendlineNavigatorConfig = {
  swingLengths: [
    { label: 'Long', length: 60, enabled: true, style: 'solid', width: 2 },
    { label: 'Medium', length: 30, enabled: true, style: 'dashed', width: 2 },
    { label: 'Short', length: 10, enabled: true, style: 'dotted', width: 1 }
  ],
  hhllMode: 'hhll',
  extendBars: 50,
  deviationFilter: 0.002
};

function detectPivotHighs(highs: number[], length: number): PivotPoint[] {
  const pivots: PivotPoint[] = [];
  for (let i = length; i < highs.length - length; i++) {
    const current = highs[i];
    let isPivot = true;
    for (let j = 1; j <= length; j++) {
      if (highs[i - j] >= current || highs[i + j] >= current) {
        isPivot = false;
        break;
      }
    }
    if (isPivot) {
      pivots.push({ index: i, price: current });
    }
  }
  return pivots;
}

function detectPivotLows(lows: number[], length: number): PivotPoint[] {
  const pivots: PivotPoint[] = [];
  for (let i = length; i < lows.length - length; i++) {
    const current = lows[i];
    let isPivot = true;
    for (let j = 1; j <= length; j++) {
      if (lows[i - j] <= current || lows[i + j] <= current) {
        isPivot = false;
        break;
      }
    }
    if (isPivot) {
      pivots.push({ index: i, price: current });
    }
  }
  return pivots;
}

function buildLineFromPivots(
  pivots: PivotPoint[],
  direction: TrendDirection,
  dataLength: number,
  extendBars: number,
  deviationFilter: number
): TrendlineSegment | null {
  if (pivots.length < 2) return null;
  const p2 = pivots[pivots.length - 1];
  const p1 = pivots[pivots.length - 2];
  const priceDiff = Math.abs(p2.price - p1.price);
  const priceBase = Math.max(1, Math.abs(p1.price));
  if (priceDiff / priceBase < deviationFilter) {
    return null;
  }
  const slope = (p2.price - p1.price) / (p2.index - p1.index);
  if (direction === 'bullish' && slope <= 0) return null;
  if (direction === 'bearish' && slope >= 0) return null;
  const projectEndIndex = Math.min(dataLength - 1 + extendBars, p2.index + extendBars);
  const projectEndPrice = p2.price + slope * (projectEndIndex - p2.index);
  return {
    direction,
    lengthLabel: 'Short',
    start: p1,
    end: p2,
    slope,
    projectEndIndex,
    projectEndPrice,
    style: 'solid',
    width: 2
  } as TrendlineSegment;
}

function cloneSegmentWithMeta(
  segment: TrendlineSegment,
  lengthLabel: 'Long' | 'Medium' | 'Short',
  style: 'solid' | 'dashed' | 'dotted',
  width: number
): TrendlineSegment {
  return {
    ...segment,
    lengthLabel,
    style,
    width
  };
}

function detectHHLL(
  pivots: PivotPoint[],
  lengthLabel: 'Long' | 'Medium' | 'Short',
  mode: 'none' | 'hhll' | 'hhll_prev',
  pivotType: 'high' | 'low'
): HHLLLabel[] {
  if (mode === 'none' || pivots.length < 2) return [];
  const latest = pivots[pivots.length - 1];
  const prev = pivots[pivots.length - 2];
  const isHigherHigh = latest.price > prev.price;
  const isLowerLow = latest.price < prev.price;

  if (pivotType === 'high' && !isHigherHigh) return [];
  if (pivotType === 'low' && !isLowerLow) return [];

  const label: HHLLLabel = {
    index: latest.index,
    price: latest.price,
    label: pivotType === 'high' ? 'HH' : 'LL',
    lengthLabel,
    emphasizePrevious: mode === 'hhll_prev',
    pivotType
  };

  if (mode === 'hhll_prev') {
    return [
      label,
      {
        index: prev.index,
        price: prev.price,
        label: pivotType === 'high' ? 'HH' : 'LL',
        lengthLabel,
        emphasizePrevious: true,
        pivotType
      }
    ];
  }

  return [label];
}

function detectBreakouts(
  segment: TrendlineSegment,
  closes: number[],
  tolerance = 0
): BreakoutSignal | null {
  const startIdx = segment.end.index;
  for (let i = startIdx; i < closes.length; i++) {
    const lineValue = segment.start.price + segment.slope * (i - segment.start.index);
    if (segment.direction === 'bullish' && closes[i] < lineValue - tolerance) {
      return {
        index: i,
        price: closes[i],
        direction: 'bearish_break',
        lengthLabel: segment.lengthLabel
      };
    }
    if (segment.direction === 'bearish' && closes[i] > lineValue + tolerance) {
      return {
        index: i,
        price: closes[i],
        direction: 'bullish_break',
        lengthLabel: segment.lengthLabel
      };
    }
  }
  return null;
}

export function detectTrendlineBreakoutNavigator(
  highs: number[],
  lows: number[],
  closes: number[],
  config?: Partial<TrendlineNavigatorConfig>
): TrendlineNavigatorResult {
  const mergedConfig: TrendlineNavigatorConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    swingLengths: config?.swingLengths ?? DEFAULT_CONFIG.swingLengths
  };

  const result: TrendlineNavigatorResult = {
    segments: [],
    hhllLabels: [],
    breakoutSignals: []
  };

  if (highs.length < 20) return result;

  mergedConfig.swingLengths.forEach((setting) => {
    if (!setting.enabled) return;
    const { label, length, style, width } = setting;
    const pivotHighs = detectPivotHighs(highs, length);
    const pivotLows = detectPivotLows(lows, length);

    const bullSegmentBase = buildLineFromPivots(
      pivotLows,
      'bullish',
      highs.length,
      mergedConfig.extendBars,
      mergedConfig.deviationFilter
    );
    if (bullSegmentBase) {
      const bullSegment = cloneSegmentWithMeta(bullSegmentBase, label, style, width);
      result.segments.push(bullSegment);
      const breakout = detectBreakouts(bullSegment, closes);
      if (breakout) result.breakoutSignals.push(breakout);
    }

    const bearSegmentBase = buildLineFromPivots(
      pivotHighs,
      'bearish',
      highs.length,
      mergedConfig.extendBars,
      mergedConfig.deviationFilter
    );
    if (bearSegmentBase) {
      const bearSegment = cloneSegmentWithMeta(bearSegmentBase, label, style, width);
      result.segments.push(bearSegment);
      const breakout = detectBreakouts(bearSegment, closes);
      if (breakout) result.breakoutSignals.push(breakout);
    }

    if (mergedConfig.hhllMode !== 'none') {
      const hhLabels = detectHHLL(pivotHighs, label, mergedConfig.hhllMode, 'high');
      const llLabels = detectHHLL(pivotLows, label, mergedConfig.hhllMode, 'low');
      result.hhllLabels.push(...hhLabels, ...llLabels);
    }
  });

  return result;
}
