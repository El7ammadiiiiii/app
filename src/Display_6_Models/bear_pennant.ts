/**
 * Bear Pennant Pattern Detection
 * From ajaygm18/chart repository
 * A continuation pattern with strong downward movement followed by converging consolidation
 */

export interface BearPennantPattern {
  type: 'bear_pennant';
  direction: 'bearish';
  pole: { start: { index: number; price: number }; end: { index: number; price: number }; height: number };
  pennant: { 
    upperLine: { start: { index: number; price: number }; end: { index: number; price: number }; slope: number };
    lowerLine: { start: { index: number; price: number }; end: { index: number; price: number }; slope: number };
    apex: { index: number; price: number };
  };
  target: number;
  confidence: number;
}

export interface BearPennantConfig {
  minPoleDrop: number;
  maxPennantDuration: number;
}

const DEFAULT_CONFIG: BearPennantConfig = {
  minPoleDrop: 0.04,
  maxPennantDuration: 20,
};

export function detectBearPennant(
  highs: number[],
  lows: number[],
  closes: number[],
  config: Partial<BearPennantConfig> = {}
): BearPennantPattern[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const patterns: BearPennantPattern[] = [];

  for (let i = 10; i < closes.length - 10; i++) {
    // Look for sharp drop (pole)
    const poleStart = i - 10;
    const poleEnd = i;
    const poleDrop = (closes[poleStart] - closes[poleEnd]) / closes[poleStart];

    if (poleDrop < cfg.minPoleDrop) continue;

    // Look for converging consolidation
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
    if (Math.abs(lowerLine.slope) <= Math.abs(upperLine.slope)) continue;

    // Calculate apex
    const apexIndex = Math.round((lowerLine.intercept - upperLine.intercept) / (upperLine.slope - lowerLine.slope));
    const apexPrice = upperLine.slope * apexIndex + upperLine.intercept;

    // Calculate target
    const poleHeight = closes[poleStart] - closes[poleEnd];
    const target = closes[pennantEnd] - poleHeight;

    const confidence = 0.75;

    patterns.push({
      type: 'bear_pennant',
      direction: 'bearish',
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
