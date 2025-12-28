/**
 * Wolfe Wave Detector [LuxAlgo Style]
 * Advanced Wolfe Wave detection with multi-zigzag and target zones
 * 
 * Features:
 * - Multi-timeframe zigzag detection
 * - Margin and angle tolerance validation
 * - Wave 5 target zone prediction
 * - Target line calculation with extensions
 * - Pattern invalidation tracking
 */

export interface LuxPivot {
  direction: number;  // 1 = high, -1 = low
  index: number;
  price: number;
}

export interface LuxZigZag {
  pivots: LuxPivot[];
}

export interface Wave5Zone {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface TargetLine {
  startIndex: number;
  startPrice: number;
  endIndex: number;
  endPrice: number;
  style: 'solid' | 'dotted' | 'dashed';
}

export interface LuxWolfeWave {
  // Points A, B, C, D (and E when confirmed)
  points: {
    A: { index: number; price: number };
    B: { index: number; price: number };
    C: { index: number; price: number };
    D: { index: number; price: number };
    E?: { index: number; price: number };
  };
  direction: 'bull' | 'bear';
  slope0: number;  // A-C slope
  slope1: number;  // B-D slope
  wave5Zone: Wave5Zone;
  targetLines: TargetLine[];
  projectionLine: TargetLine;  // A-D extended (dashed target)
  isActive: boolean;
  isConfirmed: boolean;
  targetReached: boolean;
  breakIndex?: number;
  breakPrice?: number;
  confidence: number;
}

export interface LuxWolfeConfig {
  swingMin: number;       // Minimum swing length (default 2)
  swingMax: number;       // Maximum swing length (default 100)
  margin: number;         // Margin tolerance % (default 70)
  angle: number;          // Angle tolerance % (default 70)
  showBullish: boolean;
  showBearish: boolean;
  extendTarget: number;   // Extend target line bars
  showProgression: 'Full' | 'Partial' | 'None';
}

export interface LuxWolfeResult {
  waves: LuxWolfeWave[];
  zigzags: LuxZigZag[];
  stats: {
    bullishCount: number;
    bearishCount: number;
    bullishTargetReached: number;
    bearishTargetReached: number;
  };
}

/**
 * Detect pivot high
 */
function pivotHigh(highs: number[], index: number, left: number, right: number): number | null {
  if (index < left || index >= highs.length - right) return null;
  
  const pivot = highs[index];
  
  // Check left side
  for (let i = 1; i <= left; i++) {
    if (highs[index - i] >= pivot) return null;
  }
  
  // Check right side
  for (let i = 1; i <= right; i++) {
    if (highs[index + i] > pivot) return null;
  }
  
  return pivot;
}

/**
 * Detect pivot low
 */
function pivotLow(lows: number[], index: number, left: number, right: number): number | null {
  if (index < left || index >= lows.length - right) return null;
  
  const pivot = lows[index];
  
  // Check left side
  for (let i = 1; i <= left; i++) {
    if (lows[index - i] <= pivot) return null;
  }
  
  // Check right side
  for (let i = 1; i <= right; i++) {
    if (lows[index + i] < pivot) return null;
  }
  
  return pivot;
}

/**
 * Build zigzag array with specific swing length
 */
function buildZigZag(highs: number[], lows: number[], left: number, right: number): LuxZigZag {
  const pivots: LuxPivot[] = [];
  
  // Initialize with dummy pivots
  for (let i = 0; i < 6; i++) {
    pivots.push({ direction: 0, index: 0, price: highs[0] || 0 });
  }
  
  for (let n = left + right; n < highs.length; n++) {
    const ph = pivotHigh(highs, n - right, left, right);
    const pl = pivotLow(lows, n - right, left, right);
    
    if (ph !== null) {
      const lastPivot = pivots[0];
      const Dx = n - right;
      const Dy = highs[n - right];
      
      if (Dy > lastPivot.price) {
        if (lastPivot.direction < 1) {
          // Add new pivot high
          pivots.unshift({ direction: 1, index: Dx, price: Dy });
          if (pivots.length > 6) pivots.pop();
        } else if (lastPivot.direction === 1 && ph > lastPivot.price) {
          // Update existing pivot high
          lastPivot.index = Dx;
          lastPivot.price = Dy;
        }
      }
    }
    
    if (pl !== null) {
      const lastPivot = pivots[0];
      const Dx = n - right;
      const Dy = lows[n - right];
      
      if (Dy < lastPivot.price) {
        if (lastPivot.direction > -1) {
          // Add new pivot low
          pivots.unshift({ direction: -1, index: Dx, price: Dy });
          if (pivots.length > 6) pivots.pop();
        } else if (lastPivot.direction === -1 && pl < lastPivot.price) {
          // Update existing pivot low
          lastPivot.index = Dx;
          lastPivot.price = Dy;
        }
      }
    }
  }
  
  return { pivots };
}

/**
 * Validate bullish Wolfe Wave pattern
 */
function validateBullishWolfe(
  A: LuxPivot, B: LuxPivot, C: LuxPivot, D: LuxPivot,
  margin: number, angle: number
): { valid: boolean; slope0: number; slope1: number; wave5Zone: Wave5Zone } | null {
  const Ax = A.index, Ay = A.price;
  const Bx = B.index, By = B.price;
  const Cx = C.index, Cy = C.price;
  const Dx = D.index, Dy = D.price;
  
  // Check wave symmetry with margin
  const waveRatio = Math.max(Bx - Ax, Dx - Cx) / Math.min(Bx - Ax, Dx - Cx);
  if (waveRatio - 1 > margin) return null;
  
  // D must be higher than C, C must be lower than A
  if (!(Dy > Cy && Cy < Ay)) return null;
  
  // Calculate slopes
  const slope0 = (Cy - Ay) / (Cx - Ax);
  const slope1 = (Dy - By) / (Dx - Bx);
  
  // Check angle constraint
  const rightAngle = Dy >= By + (slope0 * (1 + angle) * (Dx - Bx)) &&
                     Dy <= By + (slope0 * (1 - angle) * (Dx - Bx));
  
  if (!rightAngle || Cx === Dx) return null;
  
  // Calculate Wave 5 target zone
  const x1 = Math.round(Dx + ((Cx - Bx) * (1 - margin)));
  const x2 = Math.round(Dx + ((Cx - Bx) * (1 + margin)));
  const y1 = (Cy + slope0 * (x1 - Cx)) + ((Dy - Cy) / 4);
  const y2 = (Cy + slope0 * (x2 - Cx)) - ((Dy - Cy) / 4);
  
  return {
    valid: true,
    slope0,
    slope1,
    wave5Zone: { x1, y1, x2, y2 }
  };
}

/**
 * Validate bearish Wolfe Wave pattern
 */
function validateBearishWolfe(
  A: LuxPivot, B: LuxPivot, C: LuxPivot, D: LuxPivot,
  margin: number, angle: number
): { valid: boolean; slope0: number; slope1: number; wave5Zone: Wave5Zone } | null {
  const Ax = A.index, Ay = A.price;
  const Bx = B.index, By = B.price;
  const Cx = C.index, Cy = C.price;
  const Dx = D.index, Dy = D.price;
  
  // Check wave symmetry with margin
  const waveRatio = Math.max(Bx - Ax, Dx - Cx) / Math.min(Math.abs(Ax - Bx), Math.abs(Cx - Dx));
  if (waveRatio - 1 > margin) return null;
  
  // D must be lower than C, C must be higher than A
  if (!(Dy < Cy && Cy > Ay)) return null;
  
  // Calculate slopes
  const slope0 = (Cy - Ay) / (Cx - Ax);
  const slope1 = (Dy - By) / (Dx - Bx);
  
  // Check angle constraint
  const rightAngle = Dy <= By + (slope0 * (1 + angle) * (Dx - Bx)) &&
                     Dy >= By + (slope0 * (1 - angle) * (Dx - Bx));
  
  if (!rightAngle || Cx === Dx) return null;
  
  // Calculate Wave 5 target zone
  const x1 = Math.round(Dx + ((Cx - Bx) * (1 - margin)));
  const x2 = Math.round(Dx + ((Cx - Bx) * (1 + margin)));
  const y1 = (Cy + slope0 * (x1 - Cx)) + ((Cy - Dy) / 4);
  const y2 = (Cy + slope0 * (x2 - Cx)) - ((Cy - Dy) / 4);
  
  return {
    valid: true,
    slope0,
    slope1,
    wave5Zone: { x1, y1, x2, y2 }
  };
}

/**
 * Calculate target lines for confirmed wave
 */
function calculateTargetLines(
  wave: LuxWolfeWave,
  breakIndex: number,
  breakPrice: number,
  margin: number
): TargetLine[] {
  const lines: TargetLine[] = [];
  const { A, D } = wave.points;
  
  // D-E line (Wave 5 completion)
  lines.push({
    startIndex: D.index,
    startPrice: D.price,
    endIndex: breakIndex,
    endPrice: breakPrice,
    style: 'solid'
  });
  
  // Calculate target based on CD movement
  const cdMove = D.price - wave.points.C.price;
  const cdBars = D.index - wave.points.C.index;
  
  // Target line 1 (shorter)
  const t1Bars = Math.round(cdBars * (1 - margin));
  lines.push({
    startIndex: breakIndex,
    startPrice: breakPrice,
    endIndex: breakIndex + t1Bars,
    endPrice: breakPrice + cdMove,
    style: 'dotted'
  });
  
  // Target line 2 (longer)
  const t2Bars = Math.round(cdBars * (1 + margin));
  lines.push({
    startIndex: breakIndex,
    startPrice: breakPrice,
    endIndex: breakIndex + t2Bars,
    endPrice: breakPrice + cdMove,
    style: 'dotted'
  });
  
  return lines;
}

/**
 * Main detection function
 */
export function detectLuxWolfeWaves(
  highs: number[],
  lows: number[],
  closes: number[],
  config: LuxWolfeConfig
): LuxWolfeResult {
  const {
    swingMin = 2,
    swingMax = 100,
    margin = 0.7,
    angle = 0.7,
    showBullish = true,
    showBearish = true,
    extendTarget = 0,
    showProgression = 'Full'
  } = config;
  
  const result: LuxWolfeResult = {
    waves: [],
    zigzags: [],
    stats: {
      bullishCount: 0,
      bearishCount: 0,
      bullishTargetReached: 0,
      bearishTargetReached: 0
    }
  };
  
  if (highs.length < swingMax * 2) {
    return result;
  }
  
  const detectedPatterns = new Set<string>();
  
  // Build multiple zigzags with different swing lengths
  for (let swingLen = swingMin; swingLen <= swingMax; swingLen += Math.max(1, Math.floor((swingMax - swingMin) / 10))) {
    const zz = buildZigZag(highs, lows, swingLen, 1);
    result.zigzags.push(zz);
    
    if (zz.pivots.length < 6) continue;
    
    // Get last 6 pivots (Y, Z, A, B, C, D)
    const [D, C, B, A] = zz.pivots.slice(0, 4);
    
    if (!A || !B || !C || !D) continue;
    if (A.index === 0 || B.index === 0 || C.index === 0 || D.index === 0) continue;
    
    const patternKey = `${A.index}-${B.index}-${C.index}`;
    
    // Check for bullish pattern (D is pivot high)
    if (showBullish && D.direction === 1 && !detectedPatterns.has(patternKey + '-bull')) {
      const validation = validateBullishWolfe(A, B, C, D, margin, angle);
      
      if (validation) {
        detectedPatterns.add(patternKey + '-bull');
        
        const wave: LuxWolfeWave = {
          points: {
            A: { index: A.index, price: A.price },
            B: { index: B.index, price: B.price },
            C: { index: C.index, price: C.price },
            D: { index: D.index, price: D.price }
          },
          direction: 'bull',
          slope0: validation.slope0,
          slope1: validation.slope1,
          wave5Zone: validation.wave5Zone,
          targetLines: [],
          projectionLine: {
            startIndex: A.index,
            startPrice: A.price,
            endIndex: D.index,
            endPrice: D.price,
            style: 'dashed'
          },
          isActive: true,
          isConfirmed: false,
          targetReached: false,
          confidence: 0.75
        };
        
        // Check if pattern is confirmed (price broke below A-C line in wave 5 zone)
        const currentIndex = highs.length - 1;
        if (currentIndex >= validation.wave5Zone.x1) {
          // Look for break price
          for (let i = validation.wave5Zone.x1; i <= Math.min(validation.wave5Zone.x2, currentIndex); i++) {
            const acLinePrice = A.price + validation.slope0 * (i - A.index);
            if (closes[i] < acLinePrice) {
              wave.breakIndex = i;
              wave.breakPrice = lows[i];
              wave.isConfirmed = true;
              wave.targetLines = calculateTargetLines(wave, i, lows[i], margin);
              
              // Extend projection line
              wave.projectionLine.endIndex = i + extendTarget;
              wave.projectionLine.endPrice = A.price + validation.slope0 * (i + extendTarget - A.index);
              
              result.stats.bullishCount++;
              break;
            }
          }
          
          // Check if target reached
          if (wave.isConfirmed && wave.targetLines.length > 0) {
            const targetLine = wave.projectionLine;
            for (let i = wave.breakIndex!; i <= currentIndex; i++) {
              const targetPrice = targetLine.startPrice + 
                (targetLine.endPrice - targetLine.startPrice) / (targetLine.endIndex - targetLine.startIndex) * (i - targetLine.startIndex);
              if (highs[i] > targetPrice) {
                wave.targetReached = true;
                result.stats.bullishTargetReached++;
                break;
              }
            }
          }
        }
        
        // Check for invalidation
        if (wave.isActive && !wave.isConfirmed && currentIndex < validation.wave5Zone.x1) {
          const acLinePrice = A.price + validation.slope0 * (currentIndex - A.index);
          const bdLinePrice = B.price + validation.slope1 * (currentIndex - B.index);
          if (closes[currentIndex] < acLinePrice || closes[currentIndex] > bdLinePrice) {
            wave.isActive = false;
          }
        }
        
        result.waves.push(wave);
      }
    }
    
    // Check for bearish pattern (D is pivot low)
    if (showBearish && D.direction === -1 && !detectedPatterns.has(patternKey + '-bear')) {
      const validation = validateBearishWolfe(A, B, C, D, margin, angle);
      
      if (validation) {
        detectedPatterns.add(patternKey + '-bear');
        
        const wave: LuxWolfeWave = {
          points: {
            A: { index: A.index, price: A.price },
            B: { index: B.index, price: B.price },
            C: { index: C.index, price: C.price },
            D: { index: D.index, price: D.price }
          },
          direction: 'bear',
          slope0: validation.slope0,
          slope1: validation.slope1,
          wave5Zone: validation.wave5Zone,
          targetLines: [],
          projectionLine: {
            startIndex: A.index,
            startPrice: A.price,
            endIndex: D.index,
            endPrice: D.price,
            style: 'dashed'
          },
          isActive: true,
          isConfirmed: false,
          targetReached: false,
          confidence: 0.75
        };
        
        // Check if pattern is confirmed
        const currentIndex = highs.length - 1;
        if (currentIndex >= validation.wave5Zone.x1) {
          for (let i = validation.wave5Zone.x1; i <= Math.min(validation.wave5Zone.x2, currentIndex); i++) {
            const acLinePrice = A.price + validation.slope0 * (i - A.index);
            if (closes[i] > acLinePrice) {
              wave.breakIndex = i;
              wave.breakPrice = highs[i];
              wave.isConfirmed = true;
              wave.targetLines = calculateTargetLines(wave, i, highs[i], margin);
              
              wave.projectionLine.endIndex = i + extendTarget;
              wave.projectionLine.endPrice = A.price + validation.slope0 * (i + extendTarget - A.index);
              
              result.stats.bearishCount++;
              break;
            }
          }
          
          // Check if target reached
          if (wave.isConfirmed && wave.targetLines.length > 0) {
            const targetLine = wave.projectionLine;
            for (let i = wave.breakIndex!; i <= currentIndex; i++) {
              const targetPrice = targetLine.startPrice + 
                (targetLine.endPrice - targetLine.startPrice) / (targetLine.endIndex - targetLine.startIndex) * (i - targetLine.startIndex);
              if (lows[i] < targetPrice) {
                wave.targetReached = true;
                result.stats.bearishTargetReached++;
                break;
              }
            }
          }
        }
        
        // Check for invalidation
        if (wave.isActive && !wave.isConfirmed && currentIndex < validation.wave5Zone.x1) {
          const acLinePrice = A.price + validation.slope0 * (currentIndex - A.index);
          const bdLinePrice = B.price + validation.slope1 * (currentIndex - B.index);
          if (closes[currentIndex] > acLinePrice || closes[currentIndex] < bdLinePrice) {
            wave.isActive = false;
          }
        }
        
        result.waves.push(wave);
      }
    }
  }
  
  // Sort waves by recency and limit
  result.waves.sort((a, b) => b.points.A.index - a.points.A.index);
  result.waves = result.waves.slice(0, 10);
  
  return result;
}

/**
 * Get line data for rendering a wave line
 */
export function getWaveLineData(
  startIndex: number,
  startPrice: number,
  endIndex: number,
  endPrice: number,
  dataLength: number
): (number | null)[] {
  const data = new Array(dataLength).fill(null);
  const slope = (endPrice - startPrice) / (endIndex - startIndex);
  
  for (let i = startIndex; i <= Math.min(endIndex, dataLength - 1); i++) {
    data[i] = startPrice + slope * (i - startIndex);
  }
  
  return data;
}
