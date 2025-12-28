/**
 * Auto Channel [SciQua] - Automatic Parallel Channel Detection
 * Based on Pine Script by SciQua (Joshua Danford)
 * 
 * Features:
 * - ZigZag pivot detection for channel construction
 * - Automatic parallel channel fitting
 * - Channel scoring based on pivot containment
 * - Breakout detection with markers
 */

export interface ChannelPivot {
  index: number;
  price: number;
  isHigh: boolean;
}

export interface ChannelLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  slope: number;
}

export interface AutoChannel {
  upperLine: ChannelLine;
  lowerLine: ChannelLine;
  width: number;
  inRatio: number;        // Ratio of pivots inside channel
  violationSum: number;   // Total breach magnitude
  confidence: number;
}

export interface BreakoutSignal {
  index: number;
  price: number;
  direction: 'up' | 'down';
}

export interface AutoChannelConfig {
  priceDeviation: number;    // ZigZag price deviation % (default 0.2)
  pivotLegs: number;         // ZigZag pivot legs (default 2)
  lookback: number;          // Number of recent pivots to consider (default 12)
  slopeTolerance: number;    // Max slope difference for parallel (default 0.0005)
  priceTolerance: number;    // Max price tolerance outside channel (default 0)
  minInRatio: number;        // Min inside/outside ratio (default 1.0)
}

export interface AutoChannelResult {
  channel: AutoChannel | null;
  pivots: ChannelPivot[];
  highPivots: ChannelPivot[];
  lowPivots: ChannelPivot[];
  currentUpperPrice: number | null;
  currentLowerPrice: number | null;
  breakouts: BreakoutSignal[];
}

/**
 * Detect ZigZag pivots
 */
function detectZigZagPivots(
  highs: number[],
  lows: number[],
  deviation: number,
  legs: number
): ChannelPivot[] {
  const pivots: ChannelPivot[] = [];
  const len = highs.length;
  
  if (len < legs * 2 + 1) return pivots;
  
  let lastPivotHigh = true;
  let lastPivotPrice = highs[0];
  let lastPivotIndex = 0;
  
  const devThreshold = deviation / 100;
  
  for (let i = legs; i < len - legs; i++) {
    // Check for pivot high
    let isPivotHigh = true;
    for (let j = 1; j <= legs; j++) {
      if (highs[i] <= highs[i - j] || highs[i] <= highs[i + j]) {
        isPivotHigh = false;
        break;
      }
    }
    
    // Check for pivot low
    let isPivotLow = true;
    for (let j = 1; j <= legs; j++) {
      if (lows[i] >= lows[i - j] || lows[i] >= lows[i + j]) {
        isPivotLow = false;
        break;
      }
    }
    
    // Add pivot if deviation threshold met
    if (isPivotHigh) {
      const priceChange = Math.abs(highs[i] - lastPivotPrice) / lastPivotPrice;
      if (priceChange >= devThreshold || !lastPivotHigh) {
        pivots.push({ index: i, price: highs[i], isHigh: true });
        lastPivotHigh = true;
        lastPivotPrice = highs[i];
        lastPivotIndex = i;
      } else if (lastPivotHigh && highs[i] > lastPivotPrice) {
        // Update existing pivot high
        const lastPivot = pivots[pivots.length - 1];
        if (lastPivot && lastPivot.isHigh) {
          lastPivot.index = i;
          lastPivot.price = highs[i];
        }
        lastPivotPrice = highs[i];
        lastPivotIndex = i;
      }
    }
    
    if (isPivotLow) {
      const priceChange = Math.abs(lows[i] - lastPivotPrice) / lastPivotPrice;
      if (priceChange >= devThreshold || lastPivotHigh) {
        pivots.push({ index: i, price: lows[i], isHigh: false });
        lastPivotHigh = false;
        lastPivotPrice = lows[i];
        lastPivotIndex = i;
      } else if (!lastPivotHigh && lows[i] < lastPivotPrice) {
        // Update existing pivot low
        const lastPivot = pivots[pivots.length - 1];
        if (lastPivot && !lastPivot.isHigh) {
          lastPivot.index = i;
          lastPivot.price = lows[i];
        }
        lastPivotPrice = lows[i];
        lastPivotIndex = i;
      }
    }
  }
  
  return pivots;
}

/**
 * Calculate line value at given index
 */
function getLineValueAt(line: ChannelLine, index: number): number {
  return line.y1 + line.slope * (index - line.x1);
}

/**
 * Evaluate channel fitness
 */
function evaluateChannel(
  upperLine: ChannelLine,
  lowerLine: ChannelLine,
  pivots: ChannelPivot[],
  earliestAnchor: number,
  tolerance: number
): { inCount: number; checkedCount: number; violationSum: number } {
  let inCount = 0;
  let checkedCount = 0;
  let violationSum = 0;
  
  for (const pivot of pivots) {
    if (pivot.index < earliestAnchor) continue;
    
    checkedCount++;
    
    const upperY = getLineValueAt(upperLine, pivot.index);
    const lowerY = getLineValueAt(lowerLine, pivot.index);
    
    let isInside = true;
    
    if (pivot.isHigh && pivot.price > upperY + tolerance) {
      isInside = false;
      violationSum += pivot.price - (upperY + tolerance);
    }
    
    if (!pivot.isHigh && pivot.price < lowerY - tolerance) {
      isInside = false;
      violationSum += (lowerY - tolerance) - pivot.price;
    }
    
    if (isInside) {
      inCount++;
    }
  }
  
  return { inCount, checkedCount, violationSum };
}

/**
 * Main detection function
 */
export function detectAutoChannel(
  highs: number[],
  lows: number[],
  closes: number[],
  config: AutoChannelConfig
): AutoChannelResult {
  const {
    priceDeviation = 0.2,
    pivotLegs = 2,
    lookback = 12,
    slopeTolerance = 0.0005,
    priceTolerance = 0,
    minInRatio = 1.0
  } = config;
  
  const result: AutoChannelResult = {
    channel: null,
    pivots: [],
    highPivots: [],
    lowPivots: [],
    currentUpperPrice: null,
    currentLowerPrice: null,
    breakouts: []
  };
  
  if (highs.length < pivotLegs * 4) {
    return result;
  }
  
  // Detect ZigZag pivots
  const allPivots = detectZigZagPivots(highs, lows, priceDeviation, pivotLegs);
  result.pivots = allPivots;
  
  if (allPivots.length < 4) {
    return result;
  }
  
  // Get recent pivots
  const startIdx = Math.max(0, allPivots.length - lookback);
  const recentPivots = allPivots.slice(startIdx);
  
  // Separate high and low pivots
  const highPivots = recentPivots.filter(p => p.isHigh);
  const lowPivots = recentPivots.filter(p => !p.isHigh);
  
  result.highPivots = highPivots;
  result.lowPivots = lowPivots;
  
  if (highPivots.length < 2 || lowPivots.length < 2) {
    return result;
  }
  
  // Find best channel
  let bestChannel: AutoChannel | null = null;
  let bestInRatio = -1;
  let bestWidth = -1;
  let bestViolation = Infinity;
  
  // Try all combinations of 2 highs x 2 lows
  for (let hi1 = 0; hi1 < highPivots.length - 1; hi1++) {
    const H1 = highPivots[hi1];
    
    for (let hi2 = hi1 + 1; hi2 < highPivots.length; hi2++) {
      const H2 = highPivots[hi2];
      
      const dxH = H2.index - H1.index;
      if (dxH === 0) continue;
      
      const slopeHigh = (H2.price - H1.price) / dxH;
      
      for (let lo1 = 0; lo1 < lowPivots.length - 1; lo1++) {
        const L1 = lowPivots[lo1];
        
        for (let lo2 = lo1 + 1; lo2 < lowPivots.length; lo2++) {
          const L2 = lowPivots[lo2];
          
          const dxL = L2.index - L1.index;
          if (dxL === 0) continue;
          
          const slopeLow = (L2.price - L1.price) / dxL;
          
          // Check if slopes are nearly parallel
          if (Math.abs(slopeHigh - slopeLow) > slopeTolerance) continue;
          
          // Create channel lines
          const upperLine: ChannelLine = {
            x1: H1.index,
            y1: H1.price,
            x2: H2.index,
            y2: H2.price,
            slope: slopeHigh
          };
          
          const lowerLine: ChannelLine = {
            x1: L1.index,
            y1: L1.price,
            x2: L2.index,
            y2: L2.price,
            slope: slopeLow
          };
          
          // Find earliest anchor
          const earliestAnchor = Math.min(H1.index, H2.index, L1.index, L2.index);
          
          // Evaluate channel fitness
          const { inCount, checkedCount, violationSum } = evaluateChannel(
            upperLine,
            lowerLine,
            recentPivots,
            earliestAnchor,
            priceTolerance
          );
          
          if (checkedCount < 2) continue;
          
          const inRatio = inCount / checkedCount;
          
          if (inRatio < minInRatio) continue;
          
          // Calculate channel width at current bar
          const currentBar = highs.length - 1;
          const topY = getLineValueAt(upperLine, currentBar);
          const botY = getLineValueAt(lowerLine, currentBar);
          const width = topY - botY;
          
          // Selection: maximize inRatio, then width, then minimize violation
          let isBetter = false;
          
          if (bestChannel === null) {
            isBetter = true;
          } else if (inRatio > bestInRatio) {
            isBetter = true;
          } else if (inRatio === bestInRatio) {
            if (width > bestWidth) {
              isBetter = true;
            } else if (width === bestWidth && violationSum < bestViolation) {
              isBetter = true;
            }
          }
          
          if (isBetter) {
            bestInRatio = inRatio;
            bestWidth = width;
            bestViolation = violationSum;
            
            bestChannel = {
              upperLine,
              lowerLine,
              width,
              inRatio,
              violationSum,
              confidence: inRatio * 0.7 + (1 - violationSum / (width || 1)) * 0.3
            };
          }
        }
      }
    }
  }
  
  result.channel = bestChannel;
  
  // Calculate current projected channel boundaries
  if (bestChannel) {
    const currentBar = highs.length - 1;
    result.currentUpperPrice = getLineValueAt(bestChannel.upperLine, currentBar);
    result.currentLowerPrice = getLineValueAt(bestChannel.lowerLine, currentBar);
    
    // Detect breakouts
    for (let i = Math.max(0, currentBar - 20); i <= currentBar; i++) {
      const upperAtI = getLineValueAt(bestChannel.upperLine, i);
      const lowerAtI = getLineValueAt(bestChannel.lowerLine, i);
      
      if (closes[i] > upperAtI + priceTolerance) {
        // Check if it's a new breakout (previous bar was inside)
        if (i > 0) {
          const prevUpper = getLineValueAt(bestChannel.upperLine, i - 1);
          if (closes[i - 1] <= prevUpper + priceTolerance) {
            result.breakouts.push({
              index: i,
              price: closes[i],
              direction: 'up'
            });
          }
        }
      }
      
      if (closes[i] < lowerAtI - priceTolerance) {
        // Check if it's a new breakout
        if (i > 0) {
          const prevLower = getLineValueAt(bestChannel.lowerLine, i - 1);
          if (closes[i - 1] >= prevLower - priceTolerance) {
            result.breakouts.push({
              index: i,
              price: closes[i],
              direction: 'down'
            });
          }
        }
      }
    }
  }
  
  return result;
}

/**
 * Get extended line data for rendering
 */
export function getChannelLineData(
  line: ChannelLine,
  dataLength: number,
  extendLeft: number = 20,
  extendRight: number = 20
): (number | null)[] {
  const data = new Array(dataLength).fill(null);
  
  const startIdx = Math.max(0, line.x1 - extendLeft);
  const endIdx = Math.min(dataLength - 1, line.x2 + extendRight);
  
  for (let i = startIdx; i <= endIdx; i++) {
    data[i] = getLineValueAt(line, i);
  }
  
  return data;
}

/**
 * Get channel fill area data
 */
export function getChannelFillData(
  upperLine: ChannelLine,
  lowerLine: ChannelLine,
  dataLength: number
): { upper: (number | null)[]; lower: (number | null)[] } {
  const startIdx = Math.max(0, Math.min(upperLine.x1, lowerLine.x1) - 10);
  const endIdx = Math.min(dataLength - 1, Math.max(upperLine.x2, lowerLine.x2) + 30);
  
  const upper = new Array(dataLength).fill(null);
  const lower = new Array(dataLength).fill(null);
  
  for (let i = startIdx; i <= endIdx; i++) {
    upper[i] = getLineValueAt(upperLine, i);
    lower[i] = getLineValueAt(lowerLine, i);
  }
  
  return { upper, lower };
}
