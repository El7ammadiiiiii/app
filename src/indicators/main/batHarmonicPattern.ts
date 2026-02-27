/**
 * Bat Harmonic Pattern [TradingFinder]
 * Based on TradingView indicator by TFlab
 * 
 * Features:
 * - Bullish and Bearish Bat pattern detection
 * - Specific Fibonacci ratio validation
 * - Formation confirmation signals
 * - XABCD point labeling
 * - Valid format display option
 * 
 * Bat Pattern Ratios:
 * - XAB: 0.382 - 0.50
 * - ABC: 0.382 - 0.886  
 * - BCD: 1.618 - 2.618
 * - XAD: 0.86 - 0.899 (0.886 ideal)
 * 
 * Mozilla Public License 2.0
 */

export interface CandleData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  time?: number | string | any;
}

export interface BatPatternConfig {
  // Zigzag settings
  zigzagPivotPeriod: number;  // Default: 3
  
  // Display options
  showBullish: boolean;
  showBearish: boolean;
  showValidFormat: boolean;     // Show only valid format patterns
  showFormationConfirm: boolean; // Show formation last pivot confirm
  formationConfirmPeriod: number; // Period for confirmation
  
  // Colors
  bullishColor: string;
  bearishColor: string;
  
  // Line settings
  lineWidth: number;
  
  // Theme
  theme: 'light' | 'dark';
  
  // Bat-specific ratio tolerances
  errorPercent: number;  // Default: 5%
}

export interface BatPoint {
  price: number;
  index: number;
  label: string;
}

export interface BatPattern {
  // Pattern identification
  type: 'bullish' | 'bearish';
  name: string;
  
  // XABCD Points
  x: BatPoint;
  a: BatPoint;
  b: BatPoint;
  c: BatPoint;
  d: BatPoint;
  
  // Ratios
  xabRatio: number;  // AB/XA - should be 0.382-0.50
  abcRatio: number;  // BC/AB - should be 0.382-0.886
  bcdRatio: number;  // CD/BC - should be 1.618-2.618
  xadRatio: number;  // AD/XA - should be 0.86-0.899
  
  // Validation
  isValid: boolean;
  isValidFormat: boolean;
  
  // Confirmation
  hasConfirmation: boolean;
  confirmationIndex?: number;
  confirmationPrice?: number;
  
  // Target and Stop
  potentialTarget?: number;
  stopLoss?: number;
  
  // Color
  color: string;
}

export interface BatPatternResult {
  // Detected patterns
  patterns: BatPattern[];
  
  // Zigzag pivots
  pivots: BatPoint[];
  
  // Confirmation signals
  bullishSignals: { index: number; price: number }[];
  bearishSignals: { index: number; price: number }[];
  
  // Summary
  bullishCount: number;
  bearishCount: number;
}

export const defaultBatPatternConfig: BatPatternConfig = {
  zigzagPivotPeriod: 3,
  showBullish: true,
  showBearish: true,
  showValidFormat: false,
  showFormationConfirm: false,
  formationConfirmPeriod: 2,
  bullishColor: '#0609bb',
  bearishColor: '#0609bb',
  lineWidth: 1,
  theme: 'light',
  errorPercent: 5
};

// Bat pattern ratio definitions
const BAT_RATIOS = {
  xabMin: 0.382,
  xabMax: 0.50,
  abcMin: 0.382,
  abcMax: 0.886,
  bcdMin: 1.618,
  bcdMax: 2.618,
  xadMin: 0.86,
  xadMax: 0.899,
  xadIdeal: 0.886
};

/**
 * Check if a ratio is within tolerance
 */
function isRatioInRange(value: number, min: number, max: number, errorPercent: number): boolean {
  const tolerance = Math.max(Math.abs(max - min) * (errorPercent / 100), 0.01);
  const adjustedMin = min - tolerance;
  const adjustedMax = max + tolerance;
  return value >= adjustedMin && value <= adjustedMax;
}

/**
 * Find zigzag pivots for pattern detection
 */
function findZigzagPivots(data: CandleData[], period: number): BatPoint[] {
  const pivots: BatPoint[] = [];
  
  if (data.length < period * 2 + 1) return pivots;
  
  let lastPivotType: 'high' | 'low' | null = null;
  let lastPivotPrice = 0;
  
  for (let i = period; i < data.length - period; i++) {
    // Check for pivot high
    let isPivotHigh = true;
    for (let j = 1; j <= period; j++) {
      if (data[i].high <= data[i - j].high || data[i].high <= data[i + j].high) {
        isPivotHigh = false;
        break;
      }
    }
    
    // Check for pivot low
    let isPivotLow = true;
    for (let j = 1; j <= period; j++) {
      if (data[i].low >= data[i - j].low || data[i].low >= data[i + j].low) {
        isPivotLow = false;
        break;
      }
    }
    
    if (isPivotHigh) {
      if (lastPivotType === 'high') {
        // Replace if higher
        if (pivots.length > 0 && data[i].high > pivots[pivots.length - 1].price) {
          const lastPivot = pivots[pivots.length - 1];
          lastPivot.price = data[i].high;
          lastPivot.index = i;
          lastPivotPrice = data[i].high;
        }
        // Skip if not higher
      } else {
        pivots.push({
          price: data[i].high,
          index: i,
          label: 'H'
        });
        lastPivotType = 'high';
        lastPivotPrice = data[i].high;
      }
    } else if (isPivotLow) {
      if (lastPivotType === 'low') {
        // Replace if lower
        if (pivots.length > 0 && data[i].low < pivots[pivots.length - 1].price) {
          const lastPivot = pivots[pivots.length - 1];
          lastPivot.price = data[i].low;
          lastPivot.index = i;
          lastPivotPrice = data[i].low;
        }
        // Skip if not lower
      } else {
        pivots.push({
          price: data[i].low,
          index: i,
          label: 'L'
        });
        lastPivotType = 'low';
        lastPivotPrice = data[i].low;
      }
    }
  }
  
  return pivots;
}

/**
 * Validate Bat pattern ratios
 */
function validateBatRatios(
  x: number, a: number, b: number, c: number, d: number,
  errorPercent: number
): { 
  isValid: boolean; 
  xabRatio: number; 
  abcRatio: number; 
  bcdRatio: number; 
  xadRatio: number;
  isValidFormat: boolean;
} {
  const xa = Math.abs(a - x);
  const ab = Math.abs(b - a);
  const bc = Math.abs(c - b);
  const cd = Math.abs(d - c);
  const ad = Math.abs(d - a);
  
  const xabRatio = ab / xa;
  const abcRatio = bc / ab;
  const bcdRatio = cd / bc;
  const xadRatio = ad / xa;
  
  // Check all Bat-specific ratios
  const xabValid = isRatioInRange(xabRatio, BAT_RATIOS.xabMin, BAT_RATIOS.xabMax, errorPercent);
  const abcValid = isRatioInRange(abcRatio, BAT_RATIOS.abcMin, BAT_RATIOS.abcMax, errorPercent);
  const bcdValid = isRatioInRange(bcdRatio, BAT_RATIOS.bcdMin, BAT_RATIOS.bcdMax, errorPercent);
  const xadValid = isRatioInRange(xadRatio, BAT_RATIOS.xadMin, BAT_RATIOS.xadMax, errorPercent);
  
  const isValid = xabValid && abcValid && bcdValid && xadValid;
  
  // Valid format: XAD is very close to 0.886
  const isValidFormat = isValid && Math.abs(xadRatio - BAT_RATIOS.xadIdeal) < 0.02;
  
  return { isValid, xabRatio, abcRatio, bcdRatio, xadRatio, isValidFormat };
}

/**
 * Check for Bullish Bat pattern
 * Bullish: X is low, A is high, B retraces down, C retraces up, D is low (reversal zone)
 */
function checkBullishBat(
  pivots: BatPoint[],
  startIdx: number,
  errorPercent: number
): BatPattern | null {
  if (pivots.length < startIdx + 5) return null;
  
  // Get 5 consecutive pivots
  const x = pivots[startIdx];
  const a = pivots[startIdx + 1];
  const b = pivots[startIdx + 2];
  const c = pivots[startIdx + 3];
  const d = pivots[startIdx + 4];
  
  // Bullish Bat structure: X(L) -> A(H) -> B(L) -> C(H) -> D(L)
  // X should be low, A high, B low, C high, D low
  if (x.label !== 'L' || a.label !== 'H' || b.label !== 'L' || c.label !== 'H' || d.label !== 'L') {
    return null;
  }
  
  // Additional structure validation
  // A should be higher than X and B
  if (a.price <= x.price || a.price <= b.price) return null;
  // B should be above X (retracement)
  if (b.price <= x.price) return null;
  // C should be below A but above B
  if (c.price >= a.price || c.price <= b.price) return null;
  // D should be below B and below X (or close to X)
  // For Bat, D typically goes below X slightly
  
  // Validate ratios
  const validation = validateBatRatios(x.price, a.price, b.price, c.price, d.price, errorPercent);
  
  if (!validation.isValid) return null;
  
  // Calculate potential target (typically 0.382 or 0.618 of CD)
  const cd = Math.abs(d.price - c.price);
  const potentialTarget = d.price + cd * 0.618;
  
  // Stop loss below D
  const stopLoss = d.price - (a.price - x.price) * 0.1;
  
  return {
    type: 'bullish',
    name: 'Bullish Bat',
    x: { ...x, label: 'X' },
    a: { ...a, label: 'A' },
    b: { ...b, label: 'B' },
    c: { ...c, label: 'C' },
    d: { ...d, label: 'D' },
    xabRatio: validation.xabRatio,
    abcRatio: validation.abcRatio,
    bcdRatio: validation.bcdRatio,
    xadRatio: validation.xadRatio,
    isValid: validation.isValid,
    isValidFormat: validation.isValidFormat,
    hasConfirmation: false,
    potentialTarget,
    stopLoss,
    color: ''  // Will be set later
  };
}

/**
 * Check for Bearish Bat pattern
 * Bearish: X is high, A is low, B retraces up, C retraces down, D is high (reversal zone)
 */
function checkBearishBat(
  pivots: BatPoint[],
  startIdx: number,
  errorPercent: number
): BatPattern | null {
  if (pivots.length < startIdx + 5) return null;
  
  // Get 5 consecutive pivots
  const x = pivots[startIdx];
  const a = pivots[startIdx + 1];
  const b = pivots[startIdx + 2];
  const c = pivots[startIdx + 3];
  const d = pivots[startIdx + 4];
  
  // Bearish Bat structure: X(H) -> A(L) -> B(H) -> C(L) -> D(H)
  if (x.label !== 'H' || a.label !== 'L' || b.label !== 'H' || c.label !== 'L' || d.label !== 'H') {
    return null;
  }
  
  // Additional structure validation
  // A should be lower than X and B
  if (a.price >= x.price || a.price >= b.price) return null;
  // B should be below X (retracement)
  if (b.price >= x.price) return null;
  // C should be above A but below B
  if (c.price <= a.price || c.price >= b.price) return null;
  
  // Validate ratios
  const validation = validateBatRatios(x.price, a.price, b.price, c.price, d.price, errorPercent);
  
  if (!validation.isValid) return null;
  
  // Calculate potential target (typically 0.382 or 0.618 of CD)
  const cd = Math.abs(d.price - c.price);
  const potentialTarget = d.price - cd * 0.618;
  
  // Stop loss above D
  const stopLoss = d.price + (x.price - a.price) * 0.1;
  
  return {
    type: 'bearish',
    name: 'Bearish Bat',
    x: { ...x, label: 'X' },
    a: { ...a, label: 'A' },
    b: { ...b, label: 'B' },
    c: { ...c, label: 'C' },
    d: { ...d, label: 'D' },
    xabRatio: validation.xabRatio,
    abcRatio: validation.abcRatio,
    bcdRatio: validation.bcdRatio,
    xadRatio: validation.xadRatio,
    isValid: validation.isValid,
    isValidFormat: validation.isValidFormat,
    hasConfirmation: false,
    potentialTarget,
    stopLoss,
    color: ''
  };
}

/**
 * Check for candle confirmation after pattern completion
 */
function checkConfirmation(
  data: CandleData[],
  pattern: BatPattern,
  confirmPeriod: number
): { hasConfirmation: boolean; confirmIndex?: number; confirmPrice?: number } {
  const dIndex = pattern.d.index;
  
  if (dIndex + confirmPeriod >= data.length) {
    return { hasConfirmation: false };
  }
  
  if (pattern.type === 'bullish') {
    // Look for bullish confirmation (close above previous high)
    for (let i = 1; i <= confirmPeriod; i++) {
      if (dIndex + i >= data.length) break;
      
      const candle = data[dIndex + i];
      const prevCandle = data[dIndex + i - 1];
      
      // Bullish confirmation: close above open and above previous close
      if (candle.close > candle.open && candle.close > prevCandle.close) {
        return {
          hasConfirmation: true,
          confirmIndex: dIndex + i,
          confirmPrice: candle.close
        };
      }
    }
  } else {
    // Look for bearish confirmation (close below previous low)
    for (let i = 1; i <= confirmPeriod; i++) {
      if (dIndex + i >= data.length) break;
      
      const candle = data[dIndex + i];
      const prevCandle = data[dIndex + i - 1];
      
      // Bearish confirmation: close below open and below previous close
      if (candle.close < candle.open && candle.close < prevCandle.close) {
        return {
          hasConfirmation: true,
          confirmIndex: dIndex + i,
          confirmPrice: candle.close
        };
      }
    }
  }
  
  return { hasConfirmation: false };
}

/**
 * Apply theme color adjustment
 */
function adjustColorForTheme(color: string, theme: 'light' | 'dark'): string {
  // Simple adjustment - in a real implementation this would be more sophisticated
  if (theme === 'dark') {
    // Lighten the color for dark theme
    return color;
  }
  return color;
}

/**
 * Main calculation function
 */
export function calculateBatPattern(
  data: CandleData[],
  config: Partial<BatPatternConfig> = {}
): BatPatternResult {
  const cfg = { ...defaultBatPatternConfig, ...config };
  
  const result: BatPatternResult = {
    patterns: [],
    pivots: [],
    bullishSignals: [],
    bearishSignals: [],
    bullishCount: 0,
    bearishCount: 0
  };
  
  if (data.length < 20) return result;
  
  // Find zigzag pivots
  result.pivots = findZigzagPivots(data, cfg.zigzagPivotPeriod);
  
  if (result.pivots.length < 5) return result;
  
  // Adjust colors for theme
  const bullishColor = adjustColorForTheme(cfg.bullishColor, cfg.theme);
  const bearishColor = adjustColorForTheme(cfg.bearishColor, cfg.theme);
  
  // Scan for patterns
  for (let i = 0; i < result.pivots.length - 4; i++) {
    // Check for Bullish Bat
    if (cfg.showBullish) {
      const bullishPattern = checkBullishBat(result.pivots, i, cfg.errorPercent);
      
      if (bullishPattern) {
        // Check if we should only show valid format
        if (cfg.showValidFormat && !bullishPattern.isValidFormat) {
          continue;
        }
        
        bullishPattern.color = bullishColor;
        
        // Check for confirmation
        if (cfg.showFormationConfirm) {
          const confirm = checkConfirmation(data, bullishPattern, cfg.formationConfirmPeriod);
          bullishPattern.hasConfirmation = confirm.hasConfirmation;
          bullishPattern.confirmationIndex = confirm.confirmIndex;
          bullishPattern.confirmationPrice = confirm.confirmPrice;
          
          if (confirm.hasConfirmation && confirm.confirmIndex !== undefined) {
            result.bullishSignals.push({
              index: confirm.confirmIndex,
              price: data[confirm.confirmIndex].low
            });
          }
        }
        
        // Check for duplicate patterns
        const isDuplicate = result.patterns.some(p => 
          p.type === 'bullish' &&
          p.x.index === bullishPattern.x.index &&
          p.d.index === bullishPattern.d.index
        );
        
        if (!isDuplicate) {
          result.patterns.push(bullishPattern);
          result.bullishCount++;
        }
      }
    }
    
    // Check for Bearish Bat
    if (cfg.showBearish) {
      const bearishPattern = checkBearishBat(result.pivots, i, cfg.errorPercent);
      
      if (bearishPattern) {
        // Check if we should only show valid format
        if (cfg.showValidFormat && !bearishPattern.isValidFormat) {
          continue;
        }
        
        bearishPattern.color = bearishColor;
        
        // Check for confirmation
        if (cfg.showFormationConfirm) {
          const confirm = checkConfirmation(data, bearishPattern, cfg.formationConfirmPeriod);
          bearishPattern.hasConfirmation = confirm.hasConfirmation;
          bearishPattern.confirmationIndex = confirm.confirmIndex;
          bearishPattern.confirmationPrice = confirm.confirmPrice;
          
          if (confirm.hasConfirmation && confirm.confirmIndex !== undefined) {
            result.bearishSignals.push({
              index: confirm.confirmIndex,
              price: data[confirm.confirmIndex].high
            });
          }
        }
        
        // Check for duplicate patterns
        const isDuplicate = result.patterns.some(p => 
          p.type === 'bearish' &&
          p.x.index === bearishPattern.x.index &&
          p.d.index === bearishPattern.d.index
        );
        
        if (!isDuplicate) {
          result.patterns.push(bearishPattern);
          result.bearishCount++;
        }
      }
    }
  }
  
  return result;
}

/**
 * Get pattern ratio display text
 */
export function getBatRatioText(pattern: BatPattern): string {
  return [
    `XAB: ${pattern.xabRatio.toFixed(3)} (0.382-0.50)`,
    `ABC: ${pattern.abcRatio.toFixed(3)} (0.382-0.886)`,
    `BCD: ${pattern.bcdRatio.toFixed(3)} (1.618-2.618)`,
    `XAD: ${pattern.xadRatio.toFixed(3)} (0.86-0.899)`
  ].join('\n');
}

/**
 * Get PRZ (Potential Reversal Zone) for the pattern
 */
export function getBatPRZ(pattern: BatPattern): { min: number; max: number } {
  const xa = Math.abs(pattern.a.price - pattern.x.price);
  const dir = pattern.type === 'bullish' ? -1 : 1;
  
  const przMin = pattern.a.price + dir * xa * BAT_RATIOS.xadMin;
  const przMax = pattern.a.price + dir * xa * BAT_RATIOS.xadMax;
  
  return {
    min: Math.min(przMin, przMax),
    max: Math.max(przMin, przMax)
  };
}

export default calculateBatPattern;
