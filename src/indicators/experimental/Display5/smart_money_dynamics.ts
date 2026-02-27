/**
 * Smart Money Dynamics Blocks - Pearson Matrix V1.0
 * نموذج كتل ديناميكيات الأموال الذكية - مصفوفة بيرسون
 * 
 * Based on the Pine Script indicator by Ata Sabanci
 * Adapted for JavaScript/TypeScript by Dana
 */

export const smartMoneyDynamicsInfo = {
  id: 'smart_money_dynamics_pearson',
  name: 'Smart Money Dynamics Blocks - Pearson Matrix',
  nameAr: 'كتل ديناميكيات الأموال الذكية - مصفوفة بيرسون',
  description: 'Advanced SMC indicator using Pearson correlation matrix with prime number periods',
  descriptionAr: 'مؤشر SMC متقدم يستخدم مصفوفة ارتباط بيرسون مع فترات الأعداد الأولية',
  signalType: 'neutral' as const,
  category: 'indicator' as const,
  confidence: 85,
  timeframes: ['15m', '30m', '1h', '4h', '1d'],
  author: 'Ata Sabanci',
  version: '1.0'
};

interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface VolumeData {
  buy: number;
  sell: number;
  delta: number;
}

interface PearsonSignal {
  type: 'R+' | 'R-' | 'Heavy Buy' | 'Heavy Sell';
  index: number;
  price: number;
  avgR: number;
  confidence: number;
  volume?: number;
}

interface TrendLine {
  startIndex: number;
  endIndex: number;
  startPrice: number;
  endPrice: number;
  slope: number;
  upperBand: number;
  lowerBand: number;
}

// Prime numbers for Pearson correlation periods
const CORR_PERIODS = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];

/**
 * Calculate Volume Buy/Sell using Geometry method
 * حساب حجم الشراء/البيع باستخدام الطريقة الهندسية
 */
function calculateVolume(candle: Candle): VolumeData {
  const range = candle.high - candle.low;
  
  if (range === 0) {
    return {
      buy: candle.volume * 0.5,
      sell: candle.volume * 0.5,
      delta: 0
    };
  }
  
  const buy = candle.volume * ((candle.close - candle.low) / range);
  const sell = candle.volume * ((candle.high - candle.close) / range);
  
  return {
    buy,
    sell,
    delta: buy - sell
  };
}

/**
 * Calculate Pearson Correlation
 * حساب معامل ارتباط بيرسون
 */
function pearsonCorrelation(prices: number[], indices: number[], period: number): number {
  if (prices.length < period) return 0;
  
  const x = indices.slice(-period);
  const y = prices.slice(-period);
  
  const n = period;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Calculate Pearson Matrix Average
 * حساب متوسط مصفوفة بيرسون
 */
export function calculatePearsonMatrix(data: Candle[]): number[] {
  const avgRValues: number[] = [];
  const prices = data.map(c => c.close);
  const indices = data.map((_, i) => i);
  
  for (let i = 100; i < data.length; i++) {
    let rSum = 0;
    
    for (const period of CORR_PERIODS) {
      if (i >= period) {
        const r = pearsonCorrelation(
          prices.slice(0, i + 1),
          indices.slice(0, i + 1),
          period
        );
        rSum += r;
      }
    }
    
    avgRValues.push(rSum / CORR_PERIODS.length);
  }
  
  return avgRValues;
}

/**
 * Detect Heavy Buy/Sell (Volume Anomalies)
 * كشف الشراء/البيع المكثف
 */
function detectVolumeAnomalies(
  data: Candle[],
  lookback: number = 100
): PearsonSignal[] {
  const signals: PearsonSignal[] = [];
  const volumeDeltas: Array<{ delta: number; index: number; candle: Candle }> = [];
  
  // Calculate cumulative delta
  for (let i = data.length - lookback; i < data.length; i++) {
    const vol = calculateVolume(data[i]);
    volumeDeltas.push({ delta: vol.delta, index: i, candle: data[i] });
  }
  
  // Find peaks
  let runningSum = 0;
  let maxSum = -Infinity;
  let minSum = Infinity;
  let maxIndex = -1;
  let minIndex = -1;
  
  for (let i = 0; i < volumeDeltas.length; i++) {
    runningSum += volumeDeltas[i].delta;
    
    if (runningSum > maxSum) {
      maxSum = runningSum;
      maxIndex = i;
    }
    
    if (runningSum < minSum) {
      minSum = runningSum;
      minIndex = i;
    }
  }
  
  // Heavy Buy Signal
  if (maxIndex >= 0 && maxSum > 0) {
    const item = volumeDeltas[maxIndex];
    signals.push({
      type: 'Heavy Buy',
      index: item.index,
      price: item.candle.low,
      avgR: 0,
      confidence: 85,
      volume: maxSum
    });
  }
  
  // Heavy Sell Signal
  if (minIndex >= 0 && minSum < 0) {
    const item = volumeDeltas[minIndex];
    signals.push({
      type: 'Heavy Sell',
      index: item.index,
      price: item.candle.high,
      avgR: 0,
      confidence: 85,
      volume: Math.abs(minSum)
    });
  }
  
  return signals;
}

/**
 * Main Detection Function
 * دالة الكشف الرئيسية
 */
export function detectSmartMoneyDynamics(
  data: Candle[],
  options?: {
    rangeAMin?: number;
    rangeAMax?: number;
    rangeBMin?: number;
    rangeBMax?: number;
    volumeLookback?: number;
  }
): PearsonSignal[] {
  const signals: PearsonSignal[] = [];
  
  const rangeAMin = options?.rangeAMin ?? 0.80;
  const rangeAMax = options?.rangeAMax ?? 1.00;
  const rangeBMin = options?.rangeBMin ?? -1.00;
  const rangeBMax = options?.rangeBMax ?? -0.80;
  const volumeLookback = options?.volumeLookback ?? 100;
  
  if (data.length < 100) {
    return signals;
  }
  
  // Calculate Pearson Matrix
  const avgRValues = calculatePearsonMatrix(data);
  
  // Detect R+ and R- signals
  for (let i = 2; i < avgRValues.length; i++) {
    const avgR = avgRValues[i];
    const prevAvgR = avgRValues[i - 1];
    const prevPrevAvgR = avgRValues[i - 2];
    
    const dataIndex = i + 100; // Offset for initial lookback
    
    // Range A (R+) - Positive correlation
    const isInRangeA = avgR >= rangeAMin && avgR <= rangeAMax;
    const wasNotInRangeA = !(prevAvgR >= rangeAMin && prevAvgR <= rangeAMax);
    const wasNotInRangeA2 = !(prevPrevAvgR >= rangeAMin && prevPrevAvgR <= rangeAMax);
    
    if (isInRangeA && wasNotInRangeA && wasNotInRangeA2) {
      signals.push({
        type: 'R+',
        index: dataIndex,
        price: data[dataIndex].high,
        avgR: avgR,
        confidence: Math.min(95, 70 + Math.abs(avgR) * 25)
      });
    }
    
    // Range B (R-) - Negative correlation
    const isInRangeB = avgR >= rangeBMin && avgR <= rangeBMax;
    const wasNotInRangeB = !(prevAvgR >= rangeBMin && prevAvgR <= rangeBMax);
    const wasNotInRangeB2 = !(prevPrevAvgR >= rangeBMin && prevPrevAvgR <= rangeBMax);
    
    if (isInRangeB && wasNotInRangeB && wasNotInRangeB2) {
      signals.push({
        type: 'R-',
        index: dataIndex,
        price: data[dataIndex].low,
        avgR: avgR,
        confidence: Math.min(95, 70 + Math.abs(avgR) * 25)
      });
    }
  }
  
  // Detect Volume Anomalies
  const volumeSignals = detectVolumeAnomalies(data, volumeLookback);
  signals.push(...volumeSignals);
  
  return signals;
}

/**
 * Calculate Median
 * حساب الوسيط
 */
function calculateMedian(arr: number[]): number {
  if (arr.length === 0) return 0;
  
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  
  return sorted[mid];
}

/**
 * Calculate P25 Trend Line (Pearson-weighted median slope)
 * حساب خط الترند P25 (ميل الوسيط المرجح بمعامل بيرسون)
 */
export function calculateP25TrendLine(
  data: Candle[],
  avgRValues: number[],
  lookback: number = 100
): TrendLine | null {
  if (data.length < lookback + 50) return null;
  
  const hl2 = data.map(c => (c.high + c.low) / 2);
  const slopes: number[] = [];
  
  // Calculate slopes between consecutive Pearson periods
  for (let i = 0; i < CORR_PERIODS.length - 1; i++) {
    const p1 = CORR_PERIODS[i];
    const p2 = CORR_PERIODS[i + 1];
    
    if (data.length > p2) {
      const y1 = hl2[hl2.length - p1 - 1];
      const y2 = hl2[hl2.length - p2 - 1];
      
      if (y1 !== undefined && y2 !== undefined) {
        slopes.push((y1 - y2) / (p2 - p1));
      }
    }
  }
  
  if (slopes.length === 0) return null;
  
  const medianSlope = calculateMedian(slopes);
  const currentAvgR = avgRValues[avgRValues.length - 1] || 0;
  
  // Weight slope by correlation strength
  const finalSlope = Math.abs(medianSlope) * currentAvgR;
  
  // Calculate anchor point (41 bars back)
  const anchorIndex = data.length - 41;
  const anchorPrice = hl2[anchorIndex];
  
  // Project line
  const startIndex = data.length - lookback;
  const endIndex = data.length - 1;
  
  const startPrice = anchorPrice - finalSlope * (anchorIndex - startIndex);
  const endPrice = anchorPrice + finalSlope * (endIndex - anchorIndex);
  
  // Calculate regression bands (2 standard deviations)
  const residuals: number[] = [];
  for (let i = startIndex; i <= endIndex; i++) {
    const expectedPrice = anchorPrice + finalSlope * (i - anchorIndex);
    const actualPrice = hl2[i];
    residuals.push(actualPrice - expectedPrice);
  }
  
  const mean = residuals.reduce((a, b) => a + b, 0) / residuals.length;
  const variance = residuals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / residuals.length;
  const stdDev = Math.sqrt(variance);
  
  return {
    startIndex,
    endIndex,
    startPrice,
    endPrice,
    slope: finalSlope,
    upperBand: stdDev * 2,
    lowerBand: stdDev * 2
  };
}

/**
 * Usage Example:
 * 
 * const signals = detectSmartMoneyDynamics(candleData, {
 *   rangeAMin: 0.80,
 *   rangeAMax: 1.00,
 *   rangeBMin: -1.00,
 *   rangeBMax: -0.80,
 *   volumeLookback: 100
 * });
 * 
 * signals.forEach(signal => {
 *   
 * });
 */
