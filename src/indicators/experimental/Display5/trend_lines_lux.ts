/**
 * Trend Lines [LuxAlgo]
 * Converted from Pine Script (LuxAlgo) to TypeScript utility for Display 5 custom models.
 *
 * The indicator builds a single active bearish trendline (lower highs) and
 * a single active bullish trendline (higher lows) based on a pivot length,
 * validates the line according to angle limits and optional break checks,
 * and emits breakout events when price decisively crosses the trendline.
 */

export type LuxTrendDirection = "bullish" | "bearish";

export interface PivotPoint {
  index: number;
  price: number;
}

export interface LuxTrendLine {
  id: string;
  direction: LuxTrendDirection;
  start: PivotPoint;
  end: PivotPoint;
  slope: number;
  angle: number;
  projectEndIndex: number;
  projectEndPrice: number;
}

export interface LuxAngleLabel {
  lineId: string;
  index: number;
  price: number;
  angle: number;
  direction: LuxTrendDirection;
}

export interface LuxBreakSignal {
  lineId: string;
  index: number;
  price: number;
  direction: "bullish_break" | "bearish_break";
  sourceLine: LuxTrendDirection;
}

export interface LuxTrendLinesConfig {
  length: number;
  ratio: number;
  minAngle: number;
  maxAngle: number;
  toggleMode: "AB" | "AC" | "NN";
  sourceMode: "close" | "hl";
  minBarsBeforeBreak: number;
  extendBars: number;
  showAngles: boolean;
  maxLinesPerDirection: number;
}

export interface LuxTrendLinesResult {
  lines: LuxTrendLine[];
  angleLabels: LuxAngleLabel[];
  breakSignals: LuxBreakSignal[];
  settings: LuxTrendLinesConfig;
}

const DEFAULT_CONFIG: LuxTrendLinesConfig = {
  length: 50,
  ratio: 3,
  minAngle: 0.1,
  maxAngle: 90,
  toggleMode: "AB",
  sourceMode: "close",
  minBarsBeforeBreak: 3,
  extendBars: 40,
  showAngles: true,
  maxLinesPerDirection: 4,
};

const EPSILON = 1e-6;

function detectPivotPoints(values: number[], length: number, type: "high" | "low"): PivotPoint[] {
  const pivots: PivotPoint[] = [];
  for (let i = length; i < values.length - length; i++) {
    const current = values[i];
    let isPivot = true;
    for (let j = 1; j <= length; j++) {
      if (type === "high") {
        if (values[i - j] >= current || values[i + j] >= current) {
          isPivot = false;
          break;
        }
      } else {
        if (values[i - j] <= current || values[i + j] <= current) {
          isPivot = false;
          break;
        }
      }
    }
    if (isPivot) {
      pivots.push({ index: i, price: current });
    }
  }
  return pivots;
}

function calculateAngle(
  start: PivotPoint,
  end: PivotPoint,
  normalizationFactor: number
): number {
  const diffX = end.index - start.index;
  if (diffX === 0) return 0;
  const diffY = end.price - start.price;
  const slope = diffY / diffX;
  const normalizedSlope = slope * normalizationFactor;
  const angleRad = Math.atan(normalizedSlope);
  return Number(((angleRad * 180) / Math.PI).toFixed(2));
}

function lineValue(line: { start: PivotPoint; slope: number }, index: number): number {
  return line.start.price + line.slope * (index - line.start.index);
}

function validateLine(
  direction: LuxTrendDirection,
  baseLine: { start: PivotPoint; slope: number },
  sourceSeries: number[],
  toggleMode: LuxTrendLinesConfig["toggleMode"],
  endIndex: number,
  dataLength: number
): boolean {
  if (toggleMode === "NN") return true;
  const startIdx = Math.max(0, baseLine.start.index);
  const limit = toggleMode === "AB" ? endIndex : dataLength - 1;
  for (let i = startIdx; i <= limit; i++) {
    const val = sourceSeries[i];
    if (val === undefined) continue;
    const lv = lineValue(baseLine, i);
    if (direction === "bearish" && val > lv + EPSILON) {
      return false;
    }
    if (direction === "bullish" && val < lv - EPSILON) {
      return false;
    }
  }
  return true;
}

function detectBreakForLine(
  line: LuxTrendLine,
  direction: LuxTrendDirection,
  sourceSeries: number[],
  minBars: number
): LuxBreakSignal | null {
  const start = Math.max(line.end.index + 1, 1);
  for (let i = start; i < sourceSeries.length; i++) {
    if (i - line.end.index < minBars) continue;
    const current = sourceSeries[i];
    const prev = sourceSeries[i - 1];
    const lv = lineValue(line, i);
    const prevLv = lineValue(line, i - 1);

    if (direction === "bearish") {
      if (current > lv + EPSILON && prev <= prevLv + EPSILON) {
        return {
          lineId: line.id,
          index: i,
          price: current,
          direction: "bullish_break",
          sourceLine: direction,
        };
      }
    } else {
      if (current < lv - EPSILON && prev >= prevLv - EPSILON) {
        return {
          lineId: line.id,
          index: i,
          price: current,
          direction: "bearish_break",
          sourceLine: direction,
        };
      }
    }
  }
  return null;
}

function computeNormalizationFactor(highs: number[], lows: number[], ratio: number): number {
  const barsWindow = Math.min(500, highs.length);
  const start = Math.max(0, highs.length - barsWindow);
  let highest = -Infinity;
  let lowest = Infinity;
  for (let i = start; i < highs.length; i++) {
    highest = Math.max(highest, highs[i]);
    lowest = Math.min(lowest, lows[i]);
  }
  const yRange = Math.max(EPSILON, highest - lowest);
  const height = 500 / Math.max(ratio, EPSILON);
  return height / yRange;
}

function pruneByDirection(
  lines: LuxTrendLine[],
  angleLabels: LuxAngleLabel[],
  breakSignals: LuxBreakSignal[],
  maxPerDirection: number
) {
  const keepIds = new Set<string>();
  ["bullish", "bearish"].forEach((dir) => {
    const dirLines = lines
      .filter((line) => line.direction === dir)
      .sort((a, b) => b.end.index - a.end.index);
    dirLines.slice(0, maxPerDirection).forEach((line) => keepIds.add(line.id));
  });

  return {
    lines: lines.filter((line) => keepIds.has(line.id)),
    angleLabels: angleLabels.filter((label) => keepIds.has(label.lineId)),
    breakSignals: breakSignals.filter((signal) => keepIds.has(signal.lineId)),
  };
}

export function detectLuxTrendLines(
  highs: number[],
  lows: number[],
  closes: number[],
  config?: Partial<LuxTrendLinesConfig>
): LuxTrendLinesResult {
  const merged: LuxTrendLinesConfig = { ...DEFAULT_CONFIG, ...config };
  const dataLength = Math.min(highs.length, lows.length, closes.length);

  if (dataLength < merged.length * 2 + 5) {
    return { lines: [], angleLabels: [], breakSignals: [], settings: merged };
  }

  const normalizationFactor = computeNormalizationFactor(highs.slice(0, dataLength), lows.slice(0, dataLength), merged.ratio);
  const pivotHighs = detectPivotPoints(highs, merged.length, "high");
  const pivotLows = detectPivotPoints(lows, merged.length, "low");

  const lines: LuxTrendLine[] = [];
  const angleLabels: LuxAngleLabel[] = [];
  const breakSignals: LuxBreakSignal[] = [];

  const processSeries = (
    pivots: PivotPoint[],
    direction: LuxTrendDirection,
    sourceSeries: number[]
  ) => {
    if (pivots.length < 2) return;
    let prev: PivotPoint | null = null;
    pivots.forEach((pivot) => {
      if (!prev) {
        prev = pivot;
        return;
      }
      const isDirectional = direction === "bearish" ? pivot.price < prev.price : pivot.price > prev.price;
      if (!isDirectional) {
        prev = pivot;
        return;
      }
      const diffX = pivot.index - prev.index;
      if (diffX === 0) {
        prev = pivot;
        return;
      }
      const slope = (pivot.price - prev.price) / diffX;
      if ((direction === "bullish" && slope <= 0) || (direction === "bearish" && slope >= 0)) {
        prev = pivot;
        return;
      }

      const angle = Math.abs(calculateAngle(prev, pivot, normalizationFactor));
      if (angle < merged.minAngle || angle > merged.maxAngle) {
        prev = pivot;
        return;
      }

      const baseLine = { start: prev, slope };
      const isValid = validateLine(direction, baseLine, sourceSeries, merged.toggleMode, pivot.index, dataLength);
      if (!isValid) {
        prev = pivot;
        return;
      }

      const projectEndIndex = Math.min(dataLength - 1, pivot.index + merged.extendBars);
      const projectEndPrice = lineValue({ start: prev, slope }, projectEndIndex);
      const id = `${direction}-${prev.index}-${pivot.index}`;
      const line: LuxTrendLine = {
        id,
        direction,
        start: prev,
        end: pivot,
        slope,
        angle,
        projectEndIndex,
        projectEndPrice,
      };

      lines.push(line);

      if (merged.showAngles) {
        angleLabels.push({
          lineId: id,
          index: prev.index,
          price: prev.price,
          angle,
          direction,
        });
      }

      const breakSignal = detectBreakForLine(line, direction, sourceSeries, merged.minBarsBeforeBreak);
      if (breakSignal) {
        breakSignals.push(breakSignal);
      }

      prev = pivot;
    });
  };

  const bearishSource = merged.sourceMode === "close" ? closes : highs;
  const bullishSource = merged.sourceMode === "close" ? closes : lows;

  processSeries(pivotHighs, "bearish", bearishSource);
  processSeries(pivotLows, "bullish", bullishSource);

  const pruned = pruneByDirection(lines, angleLabels, breakSignals, merged.maxLinesPerDirection);

  return {
    lines: pruned.lines,
    angleLabels: pruned.angleLabels,
    breakSignals: pruned.breakSignals,
    settings: merged,
  };
}
