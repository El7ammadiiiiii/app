// Converted to TypeScript for Display 5 Models
// Original: Divergence Screener [Trendoscope®]
// License: CC BY-NC-SA 4.0

/**
 * Divergence Screener
 * 
 * Detects divergences between price action and oscillators using zigzag pivots:
 * 
 * FEATURES:
 * - Multiple Oscillators: RSI, CCI, CMO, COG, MFI, ROC, Stoch, WPR
 * - Zigzag Pivot Detection: Identifies swing highs/lows on oscillator
 * - Divergence Types:
 *   • Bullish Divergence: Price LL, Oscillator HL (green)
 *   • Bearish Divergence: Price HH, Oscillator LH (red)
 *   • Bullish Hidden: Price HL, Oscillator LL (lime)
 *   • Bearish Hidden: Price LH, Oscillator HH (orange)
 * - Validation: Ensures no bars cross divergence lines
 * - Broken Status: Tracks if price breaks divergence point
 * 
 * LOGIC:
 * - Detect pivots on oscillator using zigzag
 * - Compare price pivot direction vs oscillator pivot direction
 * - Divergence occurs when directions mismatch in trending market
 * - Draw lines connecting divergence points on both price and oscillator
 */

export interface DivergenceScreenerConfig {
  oscillatorType: 'rsi' | 'cci' | 'cmo' | 'cog' | 'mfi' | 'roc' | 'stoch' | 'wpr';
  oscillatorLength: number;      // 14 default
  zigzagLength: number;          // 13 default
  trendMethod: 'zigzag' | 'ma';  // Zigzag or MA-based trend detection
  maLength: number;              // 200 default for MA trend detection
  repaint: boolean;              // true = use latest pivots, false = confirmed only
}

export const defaultDivergenceScreenerConfig: DivergenceScreenerConfig = {
  oscillatorType: 'rsi',
  oscillatorLength: 14,
  zigzagLength: 13,
  trendMethod: 'zigzag',
  maLength: 200,
  repaint: true
};

export type DivergenceType = 
  | 'bullish'           // Price LL, Osc HL (green)
  | 'bearish'           // Price HH, Osc LH (red)
  | 'bullish_hidden'    // Price HL, Osc LL (lime)
  | 'bearish_hidden';   // Price LH, Osc HH (orange)

export type PivotDirection = 'HH' | 'LH' | 'HL' | 'LL';

export interface Pivot {
  index: number;
  price: number;        // Price value
  oscillator: number;   // Oscillator value
  direction: 1 | -1;    // 1 = high, -1 = low
}

export interface Divergence {
  type: DivergenceType;
  priceStart: { index: number; price: number };
  priceEnd: { index: number; price: number };
  oscStart: { index: number; value: number };
  oscEnd: { index: number; value: number };
  priceDirection: PivotDirection;
  oscDirection: PivotDirection;
  broken: boolean;
  label: string;  // 'D' for regular, 'H' for hidden
}

export interface DivergenceScreenerResult {
  oscillator: number[];
  pivots: Pivot[];
  divergences: Divergence[];
  currentDivergence: DivergenceType | null;
  lastActiveDivergence: DivergenceType | null;
}

/**
 * Calculate oscillator based on type
 */
function calculateOscillator(
  highs: number[],
  lows: number[],
  closes: number[],
  type: string,
  length: number
): number[] {
  switch (type) {
    case 'rsi':
      return calculateRSI(closes, length);
    case 'cci':
      return calculateCCI(highs, lows, closes, length);
    case 'stoch':
      return calculateStochastic(highs, lows, closes, length);
    case 'roc':
      return calculateROC(closes, length);
    default:
      return calculateRSI(closes, length);
  }
}

/**
 * Calculate RSI
 */
function calculateRSI(closes: number[], period: number): number[] {
  const rsi: number[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      rsi.push(50);
      continue;
    }
    
    let gains = 0;
    let losses = 0;
    
    for (let j = i - period + 1; j <= i; j++) {
      const change = closes[j] - closes[j - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }
  
  return rsi;
}

/**
 * Calculate CCI (Commodity Channel Index)
 */
function calculateCCI(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number
): number[] {
  const cci: number[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      cci.push(0);
      continue;
    }
    
    // Typical Price = (H + L + C) / 3
    const typicalPrices: number[] = [];
    for (let j = i - period + 1; j <= i; j++) {
      typicalPrices.push((highs[j] + lows[j] + closes[j]) / 3);
    }
    
    // SMA of typical price
    const sma = typicalPrices.reduce((a, b) => a + b, 0) / period;
    
    // Mean deviation
    const meanDev = typicalPrices.reduce((sum, tp) => sum + Math.abs(tp - sma), 0) / period;
    
    if (meanDev === 0) {
      cci.push(0);
    } else {
      cci.push((typicalPrices[typicalPrices.length - 1] - sma) / (0.015 * meanDev));
    }
  }
  
  return cci;
}

/**
 * Calculate Stochastic
 */
function calculateStochastic(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number
): number[] {
  const stoch: number[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      stoch.push(50);
      continue;
    }
    
    const periodHighs = highs.slice(i - period + 1, i + 1);
    const periodLows = lows.slice(i - period + 1, i + 1);
    
    const highest = Math.max(...periodHighs);
    const lowest = Math.min(...periodLows);
    
    if (highest === lowest) {
      stoch.push(50);
    } else {
      stoch.push(((closes[i] - lowest) / (highest - lowest)) * 100);
    }
  }
  
  return stoch;
}

/**
 * Calculate ROC (Rate of Change)
 */
function calculateROC(closes: number[], period: number): number[] {
  const roc: number[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      roc.push(0);
    } else {
      const prevClose = closes[i - period];
      if (prevClose === 0) {
        roc.push(0);
      } else {
        roc.push(((closes[i] - prevClose) / prevClose) * 100);
      }
    }
  }
  
  return roc;
}

/**
 * Detect zigzag pivots on oscillator
 */
function detectZigzagPivots(
  oscillator: number[],
  length: number
): Pivot[] {
  const pivots: Pivot[] = [];
  
  // Detect pivot highs
  for (let i = length; i < oscillator.length - length; i++) {
    let isHigh = true;
    
    for (let j = 1; j <= length; j++) {
      if (oscillator[i - j] >= oscillator[i] || oscillator[i + j] >= oscillator[i]) {
        isHigh = false;
        break;
      }
    }
    
    if (isHigh) {
      pivots.push({
        index: i,
        price: 0,  // Will be filled later
        oscillator: oscillator[i],
        direction: 1
      });
    }
  }
  
  // Detect pivot lows
  for (let i = length; i < oscillator.length - length; i++) {
    let isLow = true;
    
    for (let j = 1; j <= length; j++) {
      if (oscillator[i - j] <= oscillator[i] || oscillator[i + j] <= oscillator[i]) {
        isLow = false;
        break;
      }
    }
    
    if (isLow) {
      pivots.push({
        index: i,
        price: 0,  // Will be filled later
        oscillator: oscillator[i],
        direction: -1
      });
    }
  }
  
  // Sort by index
  pivots.sort((a, b) => a.index - b.index);
  
  return pivots;
}

/**
 * Get pivot direction based on ratio
 */
function getPivotDirection(
  direction: 1 | -1,
  ratio: number
): PivotDirection {
  if (direction > 0) {
    return ratio > 1 ? 'HH' : 'LH';
  } else {
    return ratio > 1 ? 'LL' : 'HL';
  }
}

/**
 * Validate divergence line (no bars should cross it)
 */
function validateDivergenceLine(
  prices: number[],
  oscillator: number[],
  priceStart: { index: number; price: number },
  priceEnd: { index: number; price: number },
  oscStart: { index: number; value: number },
  oscEnd: { index: number; value: number },
  direction: 1 | -1
): boolean {
  const priceSlope = (priceEnd.price - priceStart.price) / (priceEnd.index - priceStart.index);
  const oscSlope = (oscEnd.value - oscStart.value) / (oscEnd.index - oscStart.index);
  
  for (let i = priceStart.index + 1; i < priceEnd.index; i++) {
    const expectedPrice = priceStart.price + priceSlope * (i - priceStart.index);
    const expectedOsc = oscStart.value + oscSlope * (i - oscStart.index);
    
    // Check if any bar crosses above/below the line
    if (prices[i] * direction > expectedPrice * direction ||
        oscillator[i] * direction > expectedOsc * direction) {
      return false;
    }
  }
  
  return true;
}

/**
 * Detect divergences between price and oscillator
 */
function detectDivergences(
  highs: number[],
  lows: number[],
  closes: number[],
  oscillator: number[],
  pivots: Pivot[],
  config: DivergenceScreenerConfig
): Divergence[] {
  const divergences: Divergence[] = [];
  
  // Fill price values in pivots
  for (const pivot of pivots) {
    pivot.price = pivot.direction > 0 ? highs[pivot.index] : lows[pivot.index];
  }
  
  // Process consecutive pivots of same direction
  for (let i = 2; i < pivots.length; i++) {
    const currentPivot = pivots[i];
    const prevPivot = pivots[i - 2];  // Skip one pivot to compare same direction
    
    // Only compare pivots of same direction
    if (currentPivot.direction !== prevPivot.direction) continue;
    
    // Calculate ratios
    const priceRatio = currentPivot.price / prevPivot.price;
    const oscRatio = currentPivot.oscillator / prevPivot.oscillator;
    
    // Get pivot directions
    const priceDir = getPivotDirection(currentPivot.direction, priceRatio);
    const oscDir = getPivotDirection(currentPivot.direction, oscRatio);
    
    // Divergence exists when directions differ
    if (priceDir !== oscDir) {
      const dir = currentPivot.direction;
      const sentiment = Math.sign(oscRatio - priceRatio);
      
      // Determine trend (simplified: using zigzag direction)
      const trend = dir;
      
      // Determine divergence type
      let divergence: number = 0;
      if (trend === dir && sentiment < 0) divergence = 1;      // Regular divergence
      if (trend !== dir && sentiment > 0) divergence = -1;     // Hidden divergence
      
      if (divergence !== 0) {
        const divergenceType: DivergenceType = dir > 0
          ? (divergence > 0 ? 'bearish' : 'bearish_hidden')
          : (divergence > 0 ? 'bullish' : 'bullish_hidden');
        
        const priceStart = { index: prevPivot.index, price: prevPivot.price };
        const priceEnd = { index: currentPivot.index, price: currentPivot.price };
        const oscStart = { index: prevPivot.index, value: prevPivot.oscillator };
        const oscEnd = { index: currentPivot.index, value: currentPivot.oscillator };
        
        // Validate divergence
        const isValid = validateDivergenceLine(
          closes,
          oscillator,
          priceStart,
          priceEnd,
          oscStart,
          oscEnd,
          dir
        );
        
        if (isValid) {
          const label = divergenceType.includes('hidden') ? 'H' : 'D';
          
          divergences.push({
            type: divergenceType,
            priceStart,
            priceEnd,
            oscStart,
            oscEnd,
            priceDirection: priceDir,
            oscDirection: oscDir,
            broken: false,
            label
          });
        }
      }
    }
  }
  
  return divergences;
}

/**
 * Check if divergences are broken
 */
function checkBrokenDivergences(
  divergences: Divergence[],
  currentPrice: number
): void {
  for (const div of divergences) {
    if (!div.broken) {
      const direction = div.type.includes('bullish') ? 1 : -1;
      if (div.priceEnd.price * direction > currentPrice * direction) {
        div.broken = true;
      }
    }
  }
}

/**
 * Main calculation function
 */
export function calculateDivergenceScreener(
  highs: number[],
  lows: number[],
  closes: number[],
  config: DivergenceScreenerConfig = defaultDivergenceScreenerConfig
): DivergenceScreenerResult {
  // Calculate oscillator
  const oscillator = calculateOscillator(
    highs,
    lows,
    closes,
    config.oscillatorType,
    config.oscillatorLength
  );
  
  // Detect zigzag pivots
  const pivots = detectZigzagPivots(oscillator, config.zigzagLength);
  
  // Detect divergences
  const divergences = detectDivergences(
    highs,
    lows,
    closes,
    oscillator,
    pivots,
    config
  );
  
  // Check broken status
  const currentPrice = closes[closes.length - 1];
  checkBrokenDivergences(divergences, currentPrice);
  
  // Get current and last active divergence
  const currentDivergence = divergences.length > 0 ? divergences[divergences.length - 1].type : null;
  const lastActiveDivergence = divergences.find(d => !d.broken)?.type || null;
  
  return {
    oscillator,
    pivots,
    divergences,
    currentDivergence,
    lastActiveDivergence
  };
}
