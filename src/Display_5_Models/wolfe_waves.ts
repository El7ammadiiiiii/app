/**
 * Wolfe Waves - 5-Point Reversal Pattern Detection
 * Based on Pine Script by BigBeluga
 * 
 * Wolfe Waves are reversal patterns consisting of 5 waves
 * that form a rising or falling wedge pattern with specific rules
 */

export interface WolfePivot {
  value: number;
  index: number;
  isPivotHigh: boolean;
}

export interface WolfeWave {
  pivots: WolfePivot[];
  type: 'bullish' | 'bearish';
  projectionLine: {
    startIndex: number;
    startPrice: number;
    endIndex: number;
    endPrice: number;
  };
  targetLine1: {
    startIndex: number;
    startPrice: number;
    endIndex: number;
    endPrice: number;
  };
  targetLine2: {
    startIndex: number;
    startPrice: number;
    endIndex: number;
    endPrice: number;
  };
  targetPrice: number;
  confidence: number;
  isInvalidated: boolean;
}

export interface WolfeWavesConfig {
  sensitivity: number;     // Pivot detection sensitivity (default 10)
  waveType: 'bullish' | 'bearish' | 'both';
  maxWaves: number;        // Maximum waves to display
}

export interface WolfeWavesResult {
  waves: WolfeWave[];
  allPivots: WolfePivot[];
  currentDirection: boolean | null;  // true = up, false = down
}

/**
 * Find highest value in lookback period
 */
function highest(values: number[], index: number, length: number): number {
  let max = -Infinity;
  const start = Math.max(0, index - length + 1);
  for (let i = start; i <= index; i++) {
    if (values[i] > max) max = values[i];
  }
  return max;
}

/**
 * Find lowest value in lookback period
 */
function lowest(values: number[], index: number, length: number): number {
  let min = Infinity;
  const start = Math.max(0, index - length + 1);
  for (let i = start; i <= index; i++) {
    if (values[i] < min) min = values[i];
  }
  return min;
}

/**
 * Detect pivots using the same logic as Pine Script
 */
function detectPivots(
  highs: number[],
  lows: number[],
  sensitivity: number
): WolfePivot[] {
  const pivots: WolfePivot[] = [];
  const len = highs.length;
  
  let direction: boolean | null = null;
  let prevDirection: boolean | null = null;
  
  let indexLow = 0;
  let lowVal = lows[0];
  let indexHigh = 0;
  let highVal = highs[0];
  
  for (let i = sensitivity; i < len; i++) {
    const highestVal = highest(highs, i, sensitivity);
    const lowestVal = lowest(lows, i, sensitivity);
    
    prevDirection = direction;
    
    // Direction changes
    if (highs[i] === highestVal) {
      direction = true;
    }
    if (lows[i] === lowestVal) {
      direction = false;
    }
    
    // Track low pivots
    if (i > 0 && lows[i - 1] === lowest(lows, i - 1, sensitivity) && lows[i] > lowestVal) {
      indexLow = i - 1;
      lowVal = lows[i - 1];
    }
    
    // Track high pivots
    if (i > 0 && highs[i - 1] === highest(highs, i - 1, sensitivity) && highs[i] < highestVal) {
      indexHigh = i - 1;
      highVal = highs[i - 1];
    }
    
    // Add pivot on direction change
    if (prevDirection !== null && direction !== prevDirection) {
      if (direction === true) {
        // Direction changed to up, add low pivot
        pivots.push({
          value: lowVal,
          index: indexLow,
          isPivotHigh: false
        });
      } else {
        // Direction changed to down, add high pivot
        pivots.push({
          value: highVal,
          index: indexHigh,
          isPivotHigh: true
        });
      }
    }
  }
  
  return pivots;
}

/**
 * Validate bearish Wolfe Wave pattern
 * Rules: piv1 > piv2, piv2 < piv3, piv3 > piv1, piv4 > piv2, piv4 < piv1, piv5 > piv3
 */
function isBearishWolfeWave(pivots: WolfePivot[]): boolean {
  if (pivots.length < 5) return false;
  
  const [piv1, piv2, piv3, piv4, piv5] = pivots;
  
  return (
    piv1.value > piv2.value &&
    piv2.value < piv3.value &&
    piv3.value > piv1.value &&
    piv4.value > piv2.value &&
    piv4.value < piv1.value &&
    piv5.value > piv3.value
  );
}

/**
 * Validate bullish Wolfe Wave pattern
 * Rules: piv1 < piv2, piv2 > piv4, piv3 < piv1, piv4 > piv1, piv5 < piv3
 */
function isBullishWolfeWave(pivots: WolfePivot[]): boolean {
  if (pivots.length < 5) return false;
  
  const [piv1, piv2, piv3, piv4, piv5] = pivots;
  
  return (
    piv1.value < piv2.value &&
    piv2.value > piv4.value &&
    piv3.value < piv1.value &&
    piv4.value > piv1.value &&
    piv5.value < piv3.value
  );
}

/**
 * Calculate projection and target lines for Wolfe Wave
 */
function calculateWaveProjections(
  pivots: WolfePivot[],
  type: 'bullish' | 'bearish',
  dataLength: number
): {
  projectionLine: WolfeWave['projectionLine'];
  targetLine1: WolfeWave['targetLine1'];
  targetLine2: WolfeWave['targetLine2'];
  targetPrice: number;
} {
  const [piv1, piv2, piv3, piv4, piv5] = pivots;
  
  // Line 1-4 projection (main target line)
  const bars1 = piv4.index - piv1.index;
  const slope1 = (piv1.value - piv4.value) / bars1;
  
  const projectionLine = {
    startIndex: piv1.index,
    startPrice: piv1.value,
    endIndex: piv4.index + bars1,
    endPrice: piv4.value - slope1 * bars1
  };
  
  // Line 1-3 extended to point 5 area
  const bars2 = piv3.index - piv1.index;
  const slope2 = (piv3.value - piv1.value) / bars2;
  const b2 = piv5.index - piv3.index;
  
  const targetLine1 = {
    startIndex: piv1.index,
    startPrice: piv1.value,
    endIndex: piv3.index + b2,
    endPrice: piv3.value + slope2 * b2
  };
  
  // Line 2-4 extended
  const bars3 = piv4.index - piv2.index;
  const slope3 = (piv4.value - piv2.value) / bars3;
  const b3 = piv5.index - piv4.index;
  
  const targetLine2 = {
    startIndex: piv2.index,
    startPrice: piv2.value,
    endIndex: piv4.index + b3,
    endPrice: piv4.value + slope3 * b3
  };
  
  // Target price is where price should go after wave 5
  const targetPrice = projectionLine.endPrice;
  
  return { projectionLine, targetLine1, targetLine2, targetPrice };
}

/**
 * Check if wave has been invalidated
 */
function checkWaveInvalidation(
  wave: WolfeWave,
  highs: number[],
  lows: number[],
  currentIndex: number
): boolean {
  const piv5 = wave.pivots[4];
  const duration = currentIndex - piv5.index;
  
  // Invalidate after 50 bars
  if (duration > 50) return true;
  
  // Early invalidation (within 15 bars)
  if (duration < 15) {
    if (wave.type === 'bullish') {
      // Bullish invalidated if price crosses below point 5
      for (let i = piv5.index + 1; i <= currentIndex; i++) {
        if (lows[i] < piv5.value) return true;
      }
    } else {
      // Bearish invalidated if price crosses above point 5
      for (let i = piv5.index + 1; i <= currentIndex; i++) {
        if (highs[i] > piv5.value) return true;
      }
    }
  }
  
  return false;
}

/**
 * Main function to detect Wolfe Waves
 */
export function detectWolfeWaves(
  highs: number[],
  lows: number[],
  closes: number[],
  config: WolfeWavesConfig
): WolfeWavesResult {
  const {
    sensitivity = 10,
    waveType = 'both',
    maxWaves = 5
  } = config;
  
  const result: WolfeWavesResult = {
    waves: [],
    allPivots: [],
    currentDirection: null
  };
  
  if (highs.length < sensitivity * 5) {
    return result;
  }
  
  // Detect all pivots
  const allPivots = detectPivots(highs, lows, sensitivity);
  result.allPivots = allPivots;
  
  if (allPivots.length < 5) {
    return result;
  }
  
  // Track detected wave starting indices to avoid duplicates
  const detectedIndices = new Set<number>();
  
  // Scan through pivots looking for valid 5-point patterns
  for (let i = 0; i <= allPivots.length - 5; i++) {
    const windowPivots = allPivots.slice(i, i + 5);
    
    // Check if we've already detected a wave starting at this pivot
    if (detectedIndices.has(windowPivots[0].index)) {
      continue;
    }
    
    let isValid = false;
    let type: 'bullish' | 'bearish' = 'bearish';
    
    // Check for bearish wave
    if ((waveType === 'bearish' || waveType === 'both') && isBearishWolfeWave(windowPivots)) {
      isValid = true;
      type = 'bearish';
    }
    
    // Check for bullish wave
    if ((waveType === 'bullish' || waveType === 'both') && isBullishWolfeWave(windowPivots)) {
      isValid = true;
      type = 'bullish';
    }
    
    if (isValid) {
      const projections = calculateWaveProjections(windowPivots, type, highs.length);
      
      const wave: WolfeWave = {
        pivots: windowPivots,
        type,
        ...projections,
        confidence: calculateWaveConfidence(windowPivots, type),
        isInvalidated: checkWaveInvalidation(
          {
            pivots: windowPivots,
            type,
            ...projections,
            confidence: 0,
            isInvalidated: false
          },
          highs,
          lows,
          highs.length - 1
        )
      };
      
      result.waves.push(wave);
      detectedIndices.add(windowPivots[0].index);
      
      // Limit number of waves
      if (result.waves.length >= maxWaves) {
        break;
      }
    }
  }
  
  // Sort by most recent first
  result.waves.sort((a, b) => b.pivots[0].index - a.pivots[0].index);
  
  return result;
}

/**
 * Calculate confidence score for wave pattern
 */
function calculateWaveConfidence(pivots: WolfePivot[], type: 'bullish' | 'bearish'): number {
  let confidence = 0.7; // Base confidence
  
  const [piv1, piv2, piv3, piv4, piv5] = pivots;
  
  // Check symmetry of the pattern
  const wave1Height = Math.abs(piv2.value - piv1.value);
  const wave3Height = Math.abs(piv4.value - piv3.value);
  const heightRatio = Math.min(wave1Height, wave3Height) / Math.max(wave1Height, wave3Height);
  
  if (heightRatio > 0.8) confidence += 0.1;
  if (heightRatio > 0.9) confidence += 0.05;
  
  // Check time symmetry
  const time1 = piv2.index - piv1.index;
  const time3 = piv4.index - piv3.index;
  const timeRatio = Math.min(time1, time3) / Math.max(time1, time3);
  
  if (timeRatio > 0.7) confidence += 0.1;
  
  return Math.min(0.95, confidence);
}

/**
 * Get line data for rendering
 */
export function getWaveLineData(
  wave: WolfeWave,
  dataLength: number
): {
  waveLines: { start: [number, number]; end: [number, number]; color: string }[];
  projectionLines: { start: [number, number]; end: [number, number]; style: 'dashed' | 'dotted' }[];
} {
  const color = wave.type === 'bullish' ? '#22c55e' : '#f97316';
  const invalidColor = '#ef4444';
  const lineColor = wave.isInvalidated ? invalidColor : color;
  
  const waveLines: { start: [number, number]; end: [number, number]; color: string }[] = [];
  const projectionLines: { start: [number, number]; end: [number, number]; style: 'dashed' | 'dotted' }[] = [];
  
  // Main wave lines (1-2, 2-3, 3-4, 4-5)
  for (let i = 0; i < 4; i++) {
    waveLines.push({
      start: [wave.pivots[i].index, wave.pivots[i].value],
      end: [wave.pivots[i + 1].index, wave.pivots[i + 1].value],
      color: lineColor
    });
  }
  
  // Projection line (1-4 extended) - dashed
  projectionLines.push({
    start: [wave.projectionLine.startIndex, wave.projectionLine.startPrice],
    end: [wave.projectionLine.endIndex, wave.projectionLine.endPrice],
    style: 'dashed'
  });
  
  // Target lines - dotted
  projectionLines.push({
    start: [wave.targetLine1.startIndex, wave.targetLine1.startPrice],
    end: [wave.targetLine1.endIndex, wave.targetLine1.endPrice],
    style: 'dotted'
  });
  
  projectionLines.push({
    start: [wave.targetLine2.startIndex, wave.targetLine2.startPrice],
    end: [wave.targetLine2.endIndex, wave.targetLine2.endPrice],
    style: 'dotted'
  });
  
  return { waveLines, projectionLines };
}
