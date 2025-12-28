/**
 * Fibonacci Projection with Volume & Delta Profile
 * Based on TradingView indicator by Zeiierman
 * 
 * Features:
 * - Swing High/Low Detection
 * - Fibonacci Retracement Levels (0.236, 0.382, 0.5, 0.618, 0.786)
 * - Fibonacci Projection Lines
 * - Volume Profile between swings
 * - Volume Delta Profile by Fib bands
 * 
 * Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 */

export interface CandleData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  time?: number | string | any;
}

export interface FibProjectionConfig {
  // Swing detection
  period: number;                    // Period for swing detection (default: 100)
  projectionLevel: 0.236 | 0.382 | 0.5 | 0.618 | 0.786;  // Fib ratio for projection
  
  // Fib levels colors
  colors: {
    fib236: string;
    fib382: string;
    fib500: string;
    fib618: string;
    fib786: string;
    swingHigh: string;
    swingLow: string;
    projectionBull: string;
    projectionBear: string;
    volumeBull: string;
    volumeBear: string;
    deltaBull: string;
    deltaBear: string;
    boxBackground: string;
    boxBorder: string;
  };
  
  // Line widths
  fibLineWidth: number;
  swingLineWidth: number;
  projectionLineWidth: number;
  
  // Display options
  showFibLabels: boolean;
  showFibProfile: boolean;
  showFibDelta: boolean;
  flipBullBear: boolean;
  
  // Volume profile
  volumeRows: number;
  deltaMaxWidth: number;
  
  // Box style
  showBoxBackground: boolean;
  showBoxBorder: boolean;
}

export interface SwingPoint {
  index: number;
  price: number;
  type: 'high' | 'low';
  barsSince: number;
}

export interface FibLevel {
  level: number;
  price: number;
  color: string;
  label: string;
}

export interface ProjectionSegment {
  startIndex: number;
  endIndex: number;
  startPrice: number;
  endPrice: number;
  isBullish: boolean;
  percentChange: number;
  levelLabel: string;
}

export interface VolumeProfileRow {
  top: number;
  bottom: number;
  bullVolume: number;
  bearVolume: number;
  normalizedBullWidth: number;
  normalizedBearWidth: number;
}

export interface VolumeDeltaBand {
  top: number;
  bottom: number;
  bullVolume: number;
  bearVolume: number;
  delta: number;
  normalizedWidth: number;
  isBullish: boolean;
}

export interface FibProjectionResult {
  // Swing points
  swingHigh: SwingPoint | null;
  swingLow: SwingPoint | null;
  
  // Fibonacci levels
  fibLevels: FibLevel[];
  
  // Projection segments
  projectionSegments: ProjectionSegment[];
  
  // Projection target prices
  projectionTargets: {
    fib: number;
    fib2: number;
    trendFib: number;
  };
  
  // Volume profile
  volumeProfile: VolumeProfileRow[];
  
  // Volume delta by fib bands
  volumeDelta: VolumeDeltaBand[];
  
  // Current state
  trend: 'bullish' | 'bearish' | 'neutral';
  priceRelativeToFibs: {
    above236: boolean;
    above382: boolean;
    above500: boolean;
    above618: boolean;
    above786: boolean;
  };
}

export const defaultFibProjectionConfig: FibProjectionConfig = {
  period: 100,
  projectionLevel: 0.618,
  colors: {
    fib236: '#f23645',
    fib382: '#81c784',
    fib500: '#4caf50',
    fib618: '#089981',
    fib786: '#64b5f6',
    swingHigh: '#ff0000',
    swingLow: '#00ff00',
    projectionBull: '#00ff00',
    projectionBear: '#ff0000',
    volumeBull: 'rgba(0, 128, 128, 0.7)',
    volumeBear: 'rgba(255, 165, 0, 0.7)',
    deltaBull: 'rgba(0, 255, 0, 0.2)',
    deltaBear: 'rgba(255, 0, 0, 0.2)',
    boxBackground: 'rgba(0, 0, 255, 0.2)',
    boxBorder: '#ffffff'
  },
  fibLineWidth: 2,
  swingLineWidth: 2,
  projectionLineWidth: 2,
  showFibLabels: true,
  showFibProfile: true,
  showFibDelta: false,
  flipBullBear: false,
  volumeRows: 10,
  deltaMaxWidth: 30,
  showBoxBackground: true,
  showBoxBorder: true
};

// Fib level definitions
const FIB_LEVELS = [0.236, 0.382, 0.5, 0.618, 0.786] as const;

/**
 * Calculate Fibonacci level price
 */
function calcFibLevel(level: number, isHighFirst: boolean, high: number, low: number): number {
  return isHighFirst 
    ? high - (high - low) * level 
    : low + (high - low) * level;
}

/**
 * Find highest value in array over period
 */
function highest(data: number[], period: number, endIndex: number): number {
  const start = Math.max(0, endIndex - period + 1);
  let max = -Infinity;
  for (let i = start; i <= endIndex; i++) {
    if (data[i] > max) max = data[i];
  }
  return max;
}

/**
 * Find lowest value in array over period
 */
function lowest(data: number[], period: number, endIndex: number): number {
  const start = Math.max(0, endIndex - period + 1);
  let min = Infinity;
  for (let i = start; i <= endIndex; i++) {
    if (data[i] < min) min = data[i];
  }
  return min;
}

/**
 * Find bars since condition was true
 */
function barsSince(condition: boolean[], currentIndex: number): number {
  for (let i = currentIndex; i >= 0; i--) {
    if (condition[i]) return currentIndex - i;
  }
  return currentIndex;
}

/**
 * Get value when condition was true
 */
function valueWhen<T>(condition: boolean[], values: T[], currentIndex: number, occurrence: number = 0): T | null {
  let count = 0;
  for (let i = currentIndex; i >= 0; i--) {
    if (condition[i]) {
      if (count === occurrence) return values[i];
      count++;
    }
  }
  return null;
}

/**
 * Main calculation function
 */
export function calculateFibonacciProjection(
  data: CandleData[],
  config: Partial<FibProjectionConfig> = {}
): FibProjectionResult {
  const cfg = { ...defaultFibProjectionConfig, ...config };
  const { period, projectionLevel, volumeRows, deltaMaxWidth } = cfg;
  
  // Initialize result
  const result: FibProjectionResult = {
    swingHigh: null,
    swingLow: null,
    fibLevels: [],
    projectionSegments: [],
    projectionTargets: { fib: NaN, fib2: NaN, trendFib: NaN },
    volumeProfile: [],
    volumeDelta: [],
    trend: 'neutral',
    priceRelativeToFibs: {
      above236: false,
      above382: false,
      above500: false,
      above618: false,
      above786: false
    }
  };
  
  if (data.length < period) return result;
  
  // Extract price arrays
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  const closes = data.map(d => d.close);
  const volumes = data.map(d => d.volume || 0);
  const opens = data.map(d => d.open);
  
  const currentIndex = data.length - 1;
  
  // Find highest high and lowest low over period
  const hi = highest(highs, period, currentIndex);
  const lo = lowest(lows, period, currentIndex);
  
  // Check if current bar is swing high/low
  const isHi: boolean[] = highs.map((h, i) => h === highest(highs, period, i));
  const isLo: boolean[] = lows.map((l, i) => l === lowest(lows, period, i));
  
  // Bars since last swing high/low
  const HB = barsSince(isHi, currentIndex);
  const LB = barsSince(isLo, currentIndex);
  
  // Price and index of last swing high/low
  const hiPrice = valueWhen(isHi, highs, currentIndex) ?? hi;
  const loPrice = valueWhen(isLo, lows, currentIndex) ?? lo;
  
  // Find actual bar indices
  let hiBar = currentIndex;
  let loBar = currentIndex;
  
  for (let i = currentIndex; i >= 0; i--) {
    if (isHi[i] && highs[i] === hiPrice) {
      hiBar = i;
      break;
    }
  }
  
  for (let i = currentIndex; i >= 0; i--) {
    if (isLo[i] && lows[i] === loPrice) {
      loBar = i;
      break;
    }
  }
  
  // Set swing points
  result.swingHigh = {
    index: hiBar,
    price: hiPrice,
    type: 'high',
    barsSince: HB
  };
  
  result.swingLow = {
    index: loBar,
    price: loPrice,
    type: 'low',
    barsSince: LB
  };
  
  // Determine trend direction
  const isHighFirst = HB < LB;  // High came more recently than Low
  result.trend = isHighFirst ? 'bearish' : 'bullish';
  
  // Calculate Fibonacci levels
  const fibColors = [
    cfg.colors.fib236,
    cfg.colors.fib382,
    cfg.colors.fib500,
    cfg.colors.fib618,
    cfg.colors.fib786
  ];
  
  const baseOffset = HB > LB ? LB : HB;
  const xFibStart = currentIndex - baseOffset;
  
  FIB_LEVELS.forEach((level, i) => {
    const price = calcFibLevel(level, isHighFirst, hiPrice, loPrice);
    result.fibLevels.push({
      level,
      price,
      color: fibColors[i],
      label: `${(level * 100).toFixed(1)}%`
    });
  });
  
  // Calculate projection targets
  const fib = calcFibLevel(projectionLevel, LB > HB, hiPrice, loPrice);
  const fib2 = LB < HB
    ? calcFibLevel(projectionLevel, true, fib, loPrice)
    : calcFibLevel(projectionLevel, false, hiPrice, fib);
  const trendFib = LB > HB
    ? calcFibLevel(1.272, true, hiPrice, loPrice)
    : calcFibLevel(1.272, false, hiPrice, loPrice);
  
  result.projectionTargets = { fib, fib2, trendFib };
  
  // Create projection segments
  const bars = Math.abs(HB - LB);
  const segment = Math.min(bars, Math.floor(500 / 4));
  const forecast = [isHighFirst ? hiPrice : loPrice, fib, fib2, trendFib];
  
  let futureIndex = currentIndex;
  
  for (let i = 0; i < forecast.length - 1; i++) {
    const x1 = Math.min(futureIndex, currentIndex + 500);
    const x2 = Math.min(futureIndex + segment, currentIndex + 500);
    const y1 = forecast[i];
    const y2 = forecast[i + 1];
    
    const percentChange = (y2 - y1) / y1;
    const isBullish = y2 > y1;
    
    let levelLabel: string;
    if (i === forecast.length - 2) {
      levelLabel = '127.2%';
    } else {
      levelLabel = `${(projectionLevel * 100).toFixed(1)}%`;
    }
    
    result.projectionSegments.push({
      startIndex: x1,
      endIndex: x2,
      startPrice: y1,
      endPrice: y2,
      isBullish,
      percentChange,
      levelLabel
    });
    
    futureIndex += segment;
  }
  
  // Calculate Volume Profile
  if (cfg.showFibProfile && hiBar !== loBar) {
    const top = Math.max(hiPrice, loPrice);
    const bottom = Math.min(hiPrice, loPrice);
    
    if (top !== bottom) {
      const step = (top - bottom) / volumeRows;
      
      // Create level boundaries
      const levels: number[] = [];
      for (let i = 0; i <= volumeRows; i++) {
        levels.push(bottom + step * i);
      }
      
      // Initialize volume arrays
      const volUp: number[] = new Array(volumeRows).fill(0);
      const volDn: number[] = new Array(volumeRows).fill(0);
      
      const startBar = Math.min(hiBar, loBar);
      const endBar = Math.max(hiBar, loBar);
      
      // Accumulate volume per row
      for (let bi = startBar; bi <= endBar; bi++) {
        const price = (data[bi].high + data[bi].low + data[bi].close) / 3;  // hlc3
        const vol = volumes[bi];
        const isBull = closes[bi] > opens[bi];
        
        for (let r = 0; r < volumeRows; r++) {
          const dn = levels[r];
          const up = levels[r + 1];
          if (price >= dn && price < up) {
            if (isBull) {
              volUp[r] += vol;
            } else {
              volDn[r] += vol;
            }
            break;
          }
        }
      }
      
      // Find max total volume
      let maxTot = 0;
      for (let r = 0; r < volumeRows; r++) {
        const tot = volUp[r] + volDn[r];
        if (tot > maxTot) maxTot = tot;
      }
      
      const span = endBar - startBar + 1;
      
      // Create volume profile rows
      if (maxTot > 0) {
        for (let r = 0; r < volumeRows; r++) {
          const normUp = volUp[r] === 0 ? 0 : Math.floor((volUp[r] / maxTot) * span);
          const normDn = volDn[r] === 0 ? 0 : Math.floor((volDn[r] / maxTot) * span);
          
          result.volumeProfile.push({
            top: levels[r + 1],
            bottom: levels[r],
            bullVolume: volUp[r],
            bearVolume: volDn[r],
            normalizedBullWidth: normUp,
            normalizedBearWidth: normDn
          });
        }
      }
    }
  }
  
  // Calculate Volume Delta Profile
  if (cfg.showFibDelta && hiBar !== loBar) {
    // Build fib prices array
    const fibPrices: number[] = [hiPrice];
    FIB_LEVELS.forEach(level => {
      const lvlPrice = calcFibLevel(level, isHighFirst, hiPrice, loPrice);
      fibPrices.push(lvlPrice);
    });
    fibPrices.push(loPrice);
    
    // Sort prices low to high
    const fibSorted = [...fibPrices].sort((a, b) => a - b);
    
    const bandsCount = fibSorted.length - 1;
    if (bandsCount > 0) {
      const bandBull: number[] = new Array(bandsCount).fill(0);
      const bandBear: number[] = new Array(bandsCount).fill(0);
      
      const startBar = Math.min(hiBar, loBar);
      const endBar = Math.max(hiBar, loBar);
      
      // Accumulate bull/bear volume per band
      for (let bi = startBar; bi <= endBar; bi++) {
        const price = (data[bi].high + data[bi].low + data[bi].close) / 3;
        const vol = volumes[bi];
        const isBull = closes[bi] > opens[bi];
        
        for (let b = 0; b < bandsCount; b++) {
          const bandLow = fibSorted[b];
          const bandHigh = fibSorted[b + 1];
          if (price >= bandLow && price < bandHigh) {
            if (isBull) {
              bandBull[b] += vol;
            } else {
              bandBear[b] += vol;
            }
            break;
          }
        }
      }
      
      // Compute delta and max
      let maxAbsDelta = 0;
      for (let b = 0; b < bandsCount; b++) {
        const delta = bandBull[b] - bandBear[b];
        if (Math.abs(delta) > maxAbsDelta) maxAbsDelta = Math.abs(delta);
      }
      
      if (maxAbsDelta > 0) {
        for (let b = 0; b < bandsCount; b++) {
          const delta = bandBull[b] - bandBear[b];
          if (delta === 0) continue;
          
          const absDelta = Math.abs(delta);
          const widthBars = Math.max(1, Math.floor((absDelta / maxAbsDelta) * deltaMaxWidth));
          
          result.volumeDelta.push({
            top: fibSorted[b + 1],
            bottom: fibSorted[b],
            bullVolume: bandBull[b],
            bearVolume: bandBear[b],
            delta,
            normalizedWidth: widthBars,
            isBullish: delta >= 0
          });
        }
      }
    }
  }
  
  // Determine price position relative to fib levels
  const currentPrice = closes[currentIndex];
  result.fibLevels.forEach(fib => {
    switch (fib.level) {
      case 0.236:
        result.priceRelativeToFibs.above236 = currentPrice > fib.price;
        break;
      case 0.382:
        result.priceRelativeToFibs.above382 = currentPrice > fib.price;
        break;
      case 0.5:
        result.priceRelativeToFibs.above500 = currentPrice > fib.price;
        break;
      case 0.618:
        result.priceRelativeToFibs.above618 = currentPrice > fib.price;
        break;
      case 0.786:
        result.priceRelativeToFibs.above786 = currentPrice > fib.price;
        break;
    }
  });
  
  return result;
}

/**
 * Get fib level color by level value
 */
export function getFibLevelColor(level: number, config: Partial<FibProjectionConfig> = {}): string {
  const cfg = { ...defaultFibProjectionConfig, ...config };
  switch (level) {
    case 0.236: return cfg.colors.fib236;
    case 0.382: return cfg.colors.fib382;
    case 0.5: return cfg.colors.fib500;
    case 0.618: return cfg.colors.fib618;
    case 0.786: return cfg.colors.fib786;
    default: return '#ffffff';
  }
}

/**
 * Format volume for display
 */
export function formatVolume(vol: number): string {
  if (vol >= 1e9) return (vol / 1e9).toFixed(2) + 'B';
  if (vol >= 1e6) return (vol / 1e6).toFixed(2) + 'M';
  if (vol >= 1e3) return (vol / 1e3).toFixed(2) + 'K';
  return vol.toFixed(0);
}

/**
 * Get gradient color for volume profile row
 */
export function getVolumeRowColor(
  rowIndex: number, 
  totalRows: number, 
  baseColor: string, 
  isBull: boolean
): string {
  // Gradient from 80% transparent to 10% transparent
  const opacity = 0.1 + (0.7 * rowIndex / (totalRows - 1));
  
  // Parse hex color and apply opacity
  const hex = baseColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export default calculateFibonacciProjection;
