/**
 * Elite Pattern Detection System
 * نظام اكتشاف الأنماط النخبة
 * 
 * High-quality pattern detection with strict validation
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type TimeframeType = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';

export type PatternQuality = 'ULTRA_ELITE' | 'ELITE' | 'STRONG' | 'VALID';

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TrendLineData {
  slope: number;
  intercept: number;
  startIdx: number;
  endIdx: number;
  startPrice: number;
  endPrice: number;
  r2: number;
  touchCount: number;
}

export interface ElitePattern {
  type: string;
  name: string;
  nameAr: string;
  startIdx: number;
  endIdx: number;
  upperLine: TrendLineData;
  lowerLine: TrendLineData;
  breakoutDirection: 'up' | 'down' | 'neutral';
  confidence: number;
  targetPrice: number | null;
  description: string;
  timeframe: TimeframeType;
  quality: PatternQuality;
  qualityAr: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function normalizeTimeframe(tf: string): TimeframeType {
  const map: Record<string, TimeframeType> = {
    '1m': '1m', '1': '1m',
    '5m': '5m', '5': '5m',
    '15m': '15m', '15': '15m',
    '30m': '30m', '30': '30m',
    '1h': '1h', '60': '1h', '1H': '1h',
    '4h': '4h', '240': '4h', '4H': '4h',
    '1d': '1d', '1D': '1d', 'D': '1d',
    '1w': '1w', '1W': '1w', 'W': '1w',
  };
  return map[tf] || '1h';
}

function calculateR2(data: OHLCV[], indices: number[], slope: number, intercept: number): number {
  if (indices.length === 0) return 0;
  
  const yValues = indices.map(i => (data[i].high + data[i].low) / 2);
  const yMean = yValues.reduce((a, b) => a + b, 0) / yValues.length;
  
  let ssRes = 0;
  let ssTot = 0;
  
  indices.forEach((idx, i) => {
    const predicted = slope * idx + intercept;
    const actual = yValues[i];
    ssRes += Math.pow(actual - predicted, 2);
    ssTot += Math.pow(actual - yMean, 2);
  });
  
  return ssTot === 0 ? 0 : 1 - (ssRes / ssTot);
}

function fitTrendLine(data: OHLCV[], indices: number[]): { slope: number; intercept: number; r2: number } {
  if (indices.length < 2) return { slope: 0, intercept: 0, r2: 0 };
  
  const n = indices.length;
  const xMean = indices.reduce((a, b) => a + b, 0) / n;
  const yValues = indices.map(i => (data[i].high + data[i].low) / 2);
  const yMean = yValues.reduce((a, b) => a + b, 0) / n;
  
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    const xDiff = indices[i] - xMean;
    const yDiff = yValues[i] - yMean;
    numerator += xDiff * yDiff;
    denominator += xDiff * xDiff;
  }
  
  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = yMean - slope * xMean;
  const r2 = calculateR2(data, indices, slope, intercept);
  
  return { slope, intercept, r2 };
}

// ============================================================================
// PATTERN DETECTION
// ============================================================================

export function detectElitePatterns(
  data: OHLCV[],
  timeframe: TimeframeType,
  options: {
    enabledPatterns?: string[];
    strictMode?: boolean;
  } = {}
): ElitePattern[] {
  if (!data || data.length < 50) {
    
    return [];
  }
  
  const patterns: ElitePattern[] = [];
  const minPatternLength = 15; // أقصر حد أدنى
  const maxPatternLength = Math.min(100, data.length);
  
  
  
  // Detect triangles and wedges
  for (let start = Math.max(0, data.length - maxPatternLength); start < data.length - minPatternLength; start += 5) {
    for (let end = start + minPatternLength; end < Math.min(start + maxPatternLength, data.length); end += 3) {
      const segment = data.slice(start, end + 1);
      
      // Find highs and lows
      const highs: number[] = [];
      const lows: number[] = [];
      
      for (let i = 1; i < segment.length - 1; i++) {
        if (segment[i].high >= segment[i - 1].high && segment[i].high >= segment[i + 1].high) {
          highs.push(start + i);
        }
        if (segment[i].low <= segment[i - 1].low && segment[i].low <= segment[i + 1].low) {
          lows.push(start + i);
        }
      }
      
      if (highs.length >= 2 && lows.length >= 2) {
        const upperFit = fitTrendLine(data, highs);
        const lowerFit = fitTrendLine(data, lows);
        
        // تخفيف شرط R² إلى 0.6
        if (upperFit.r2 > 0.6 && lowerFit.r2 > 0.6) {
          const pattern = classifyPattern(data, start, end, highs, lows, upperFit, lowerFit, timeframe);
          if (pattern) {
            // إذا لا توجد قائمة أنماط مفعّلة، أضف الكل
            if (!options.enabledPatterns || options.enabledPatterns.length === 0 || options.enabledPatterns.includes(pattern.type)) {
              patterns.push(pattern);
            }
          }
        }
      }
    }
  }
  
  
  return patterns;
}

function classifyPattern(
  data: OHLCV[],
  startIdx: number,
  endIdx: number,
  highs: number[],
  lows: number[],
  upperFit: { slope: number; intercept: number; r2: number },
  lowerFit: { slope: number; intercept: number; r2: number },
  timeframe: TimeframeType
): ElitePattern | null {
  const upperSlope = upperFit.slope;
  const lowerSlope = lowerFit.slope;
  
  let type = '';
  let name = '';
  let nameAr = '';
  let breakoutDirection: 'up' | 'down' | 'neutral' = 'neutral';
  
  // Ascending Triangle
  if (Math.abs(upperSlope) < 0.0001 && lowerSlope > 0.0001) {
    type = 'ascending_triangle';
    name = 'Ascending Triangle';
    nameAr = 'مثلث صاعد';
    breakoutDirection = 'up';
  }
  // Descending Triangle
  else if (Math.abs(lowerSlope) < 0.0001 && upperSlope < -0.0001) {
    type = 'descending_triangle';
    name = 'Descending Triangle';
    nameAr = 'مثلث هابط';
    breakoutDirection = 'down';
  }
  // Symmetrical Triangle
  else if (upperSlope < -0.0001 && lowerSlope > 0.0001) {
    type = 'symmetrical_triangle';
    name = 'Symmetrical Triangle';
    nameAr = 'مثلث متماثل';
    breakoutDirection = 'neutral';
  }
  // Rising Wedge
  else if (upperSlope > 0 && lowerSlope > 0 && lowerSlope > upperSlope) {
    type = 'rising_wedge';
    name = 'Rising Wedge';
    nameAr = 'إسفين صاعد';
    breakoutDirection = 'down';
  }
  // Falling Wedge
  else if (upperSlope < 0 && lowerSlope < 0 && upperSlope < lowerSlope) {
    type = 'falling_wedge';
    name = 'Falling Wedge';
    nameAr = 'إسفين هابط';
    breakoutDirection = 'up';
  }
  
  if (!type) return null;
  
  const quality = calculateQuality(upperFit.r2, lowerFit.r2, highs.length, lows.length);
  const qualityAr = getQualityArabic(quality);
  
  const upperStartPrice = data[highs[0]].high;
  const upperEndPrice = upperFit.slope * endIdx + upperFit.intercept;
  const lowerStartPrice = data[lows[0]].low;
  const lowerEndPrice = lowerFit.slope * endIdx + lowerFit.intercept;
  
  const currentPrice = data[endIdx].close;
  const patternHeight = Math.abs(upperEndPrice - lowerEndPrice);
  const targetPrice = breakoutDirection === 'up' ? currentPrice + patternHeight : currentPrice - patternHeight;
  
  return {
    type,
    name,
    nameAr,
    startIdx,
    endIdx,
    upperLine: {
      slope: upperFit.slope,
      intercept: upperFit.intercept,
      startIdx: highs[0],
      endIdx: highs[highs.length - 1],
      startPrice: upperStartPrice,
      endPrice: upperEndPrice,
      r2: upperFit.r2,
      touchCount: highs.length,
    },
    lowerLine: {
      slope: lowerFit.slope,
      intercept: lowerFit.intercept,
      startIdx: lows[0],
      endIdx: lows[lows.length - 1],
      startPrice: lowerStartPrice,
      endPrice: lowerEndPrice,
      r2: lowerFit.r2,
      touchCount: lows.length,
    },
    breakoutDirection,
    confidence: (upperFit.r2 + lowerFit.r2) / 2 * 100,
    targetPrice,
    description: `${nameAr} بجودة ${qualityAr}`,
    timeframe,
    quality,
    qualityAr,
  };
}

function calculateQuality(r2Upper: number, r2Lower: number, touchesUpper: number, touchesLower: number): PatternQuality {
  const avgR2 = (r2Upper + r2Lower) / 2;
  const avgTouches = (touchesUpper + touchesLower) / 2;
  
  if (avgR2 > 0.95 && avgTouches >= 5) return 'ULTRA_ELITE';
  if (avgR2 > 0.85 && avgTouches >= 4) return 'ELITE';
  if (avgR2 > 0.75 && avgTouches >= 3) return 'STRONG';
  return 'VALID';
}

function getQualityArabic(quality: PatternQuality): string {
  const map: Record<PatternQuality, string> = {
    'ULTRA_ELITE': 'نخبة فائقة',
    'ELITE': 'نخبة',
    'STRONG': 'قوي',
    'VALID': 'صالح',
  };
  return map[quality];
}

// ============================================================================
// PATTERN RENDERING
// ============================================================================

export function generateElitePatternLines(
  pattern: ElitePattern,
  dataLength: number,
  extendBy: number = 10
): {
  upper: (number | null)[];
  lower: (number | null)[];
} {
  const upper: (number | null)[] = new Array(dataLength).fill(null);
  const lower: (number | null)[] = new Array(dataLength).fill(null);
  
  const { upperLine, lowerLine } = pattern;
  
  // Draw upper line
  for (let i = upperLine.startIdx; i <= Math.min(upperLine.endIdx + extendBy, dataLength - 1); i++) {
    upper[i] = upperLine.slope * i + upperLine.intercept;
  }
  
  // Draw lower line
  for (let i = lowerLine.startIdx; i <= Math.min(lowerLine.endIdx + extendBy, dataLength - 1); i++) {
    lower[i] = lowerLine.slope * i + lowerLine.intercept;
  }
  
  return { upper, lower };
}
