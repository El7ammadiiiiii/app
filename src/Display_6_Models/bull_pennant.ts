/**
 * Bull Pennant Pattern Detection
 * From ajaygm18/chart repository
 * A continuation pattern with strong upward movement followed by converging consolidation
 */

export interface BullPennantPattern {
  type: 'bull_pennant';
  direction: 'bullish';
  pole: { start: { index: number; price: number }; end: { index: number; price: number }; height: number };
  pennant: { 
    upperLine: { start: { index: number; price: number }; end: { index: number; price: number }; slope: number };
    lowerLine: { start: { index: number; price: number }; end: { index: number; price: number }; slope: number };
    apex: { index: number; price: number };
  };
  target: number;
  confidence: number;
}

export interface BullPennantConfig {
  minPoleRise: number;
  maxPennantDuration: number;
}

const DEFAULT_CONFIG: BullPennantConfig = {
  minPoleRise: 0.04,
  maxPennantDuration: 20,
};

export function detectBullPennant(
  highs: number[],
  lows: number[],
  closes: number[],
  config: Partial<BullPennantConfig> = {}
): BullPennantPattern[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const patterns: BullPennantPattern[] = [];

  for (let i = 10; i < closes.length - 10; i++) {
    // Look for sharp rise (pole)
    const poleStart = i - 10;
    const poleEnd = i;
    const poleRise = (closes[poleEnd] - closes[poleStart]) / closes[poleStart];

    if (poleRise < cfg.minPoleRise) continue;

    // Look for converging consolidation (pennant)
    const pennantStart = poleEnd;
    const pennantEnd = Math.min(pennantStart + cfg.maxPennantDuration, closes.length - 1);

    const pennantHighs = findPivotHighs(highs.slice(pennantStart, pennantEnd + 1), 1)
      .map(p => ({ index: p.index + pennantStart, price: p.price }));
    const pennantLows = findPivotLows(lows.slice(pennantStart, pennantEnd + 1), 1)
      .map(p => ({ index: p.index + pennantStart, price: p.price }));

    if (pennantHighs.length < 2 || pennantLows.length < 2) continue;

    // Calculate trendlines
    const upperLine = calculateTrendline(pennantHighs);
    const lowerLine = calculateTrendline(pennantLows);

    // Lines should be converging
    if (upperLine.slope >= 0 || lowerLine.slope <= 0) continue;
    if (Math.abs(upperLine.slope) <= Math.abs(lowerLine.slope)) continue;

    // Calculate apex
    const apexIndex = Math.round((lowerLine.intercept - upperLine.intercept) / (upperLine.slope - lowerLine.slope));
    const apexPrice = upperLine.slope * apexIndex + upperLine.intercept;

    // Calculate target
    const poleHeight = closes[poleEnd] - closes[poleStart];
    const target = closes[pennantEnd] + poleHeight;

    const confidence = 0.75;

    patterns.push({
      type: 'bull_pennant',
      direction: 'bullish',
      pole: { 
        start: { index: poleStart, price: closes[poleStart] },
        end: { index: poleEnd, price: closes[poleEnd] },
        height: poleHeight
      },
      pennant: {
        upperLine: { 
          start: pennantHighs[0], 
          end: pennantHighs[pennantHighs.length - 1],
          slope: upperLine.slope
        },
        lowerLine: { 
          start: pennantLows[0], 
          end: pennantLows[pennantLows.length - 1],
          slope: lowerLine.slope
        },
        apex: { index: apexIndex, price: apexPrice }
      },
      target,
      confidence,
    });
  }

  return patterns;
}

function findPivotHighs(highs: number[], window: number): Array<{ index: number; price: number }> {
  const pivots: Array<{ index: number; price: number }> = [];
  for (let i = window; i < highs.length - window; i++) {
    let isPivot = true;
    for (let j = 1; j <= window; j++) {
      if (highs[i - j] >= highs[i] || highs[i + j] >= highs[i]) {
        isPivot = false;
        break;
      }
    }
    if (isPivot) pivots.push({ index: i, price: highs[i] });
  }
  return pivots;
}

function findPivotLows(lows: number[], window: number): Array<{ index: number; price: number }> {
  const pivots: Array<{ index: number; price: number }> = [];
  for (let i = window; i < lows.length - window; i++) {
    let isPivot = true;
    for (let j = 1; j <= window; j++) {
      if (lows[i - j] <= lows[i] || lows[i + j] <= lows[i]) {
        isPivot = false;
        break;
      }
    }
    if (isPivot) pivots.push({ index: i, price: lows[i] });
  }
  return pivots;
}

function calculateTrendline(points: Array<{ index: number; price: number }>): { slope: number; intercept: number } {
  const n = points.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (const p of points) {
    sumX += p.index;
    sumY += p.price;
    sumXY += p.index * p.price;
    sumX2 += p.index * p.index;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}
