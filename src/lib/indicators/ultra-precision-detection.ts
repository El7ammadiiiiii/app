/**
 * 🏆 ULTRA-PRECISION PATTERN DETECTION ENGINE
 * World-Class Chart Pattern Recognition
 * 
 * 10 Patterns with Millimeter Accuracy:
 * ═══════════════════════════════════════
 * TRIANGLES (3):
 *   1. Ascending Triangle    - Flat top, rising bottom
 *   2. Descending Triangle   - Falling top, flat bottom  
 *   3. Symmetrical Triangle  - Converging lines
 * 
 * WEDGES (2):
 *   4. Rising Wedge         - Both lines rising, converging
 *   5. Falling Wedge        - Both lines falling, converging
 * 
 * BROADENING (5):
 *   6. Symmetrical Broadening      - Megaphone pattern
 *   7. Broadening Bottom           - Reversal at bottom
 *   8. Broadening Top              - Reversal at top
 *   9. Ascending Right-Angled      - Flat top, falling bottom
 *   10. Descending Right-Angled    - Rising top, flat bottom
 * 
 * Precision Standards:
 * - R² ≥ 0.95 for ULTRA_ELITE
 * - R² ≥ 0.92 for ELITE  
 * - 4+ confirmed touches per line
 * - 0.15% touch tolerance (vs 0.6% industry standard)
 * - Sub-bar pivot interpolation
 * - Theil-Sen robust regression
 * 
 * @version 3.0.0 Ultra-Precision Edition
 * @author CCWAYS Trading Systems
 */

import {
  type OHLCV,
  type FloatPivot,
  type PrecisionTrendLine,
  type QualityLevel,
  ULTRA_PRECISION_CONFIG,
  theilSenRegression,
  ransacProRegression,
  getCurrentATR,
  calculateATR,
  angleBetweenLines,
  calculateApex,
  areLinesConverging,
  areLinesdiverging,
  calculateConvergenceRate,
  calculateQualityScore,
  getQualityLabelAr,
  getQualityColor,
  mean,
  median,
} from './ultra-precision-math';

import {
  detectUltraPrecisionPivots,
  getRecentPivots,
  getConfirmedPivots,
  type PivotDetectionResult,
} from './ultra-precision-pivots';

// ============================================
// TYPES
// ============================================

export type UltraPatternType = 
  // Triangles
  | 'ascending_triangle'
  | 'descending_triangle'
  | 'symmetrical_triangle'
  // Wedges
  | 'rising_wedge'
  | 'falling_wedge'
  // Broadening
  | 'symmetrical_broadening'
  | 'broadening_bottom'
  | 'broadening_top'
  | 'ascending_broadening_right_angled'
  | 'descending_broadening_right_angled';

export interface UltraPattern {
  type: UltraPatternType;
  name: string;
  nameAr: string;
  
  // Trendlines with full precision
  upperLine: PrecisionTrendLine;
  lowerLine: PrecisionTrendLine;
  
  // Pattern boundaries
  startIdx: number;
  endIdx: number;
  
  // Geometry
  apex?: { x: number; y: number };
  apexBars?: number;  // Bars until apex
  convergenceAngle: number;
  convergenceRate: number;
  
  // Quality metrics
  quality: QualityLevel;
  qualityAr: string;
  score: number;
  confidence: number;
  
  // Volume analysis
  volumeDecline: number;
  volumeConfirmed: boolean;
  
  // Breakout
  breakoutDirection: 'up' | 'down' | 'unknown';
  targetPrice: number | null;
  
  // Description
  description: string;
  
  // Rendering
  color: string;
  timeframe?: string;
}

export interface DetectionOptions {
  enabledPatterns?: UltraPatternType[];
  strictMode?: boolean;  // Only ELITE+ patterns
  maxPatterns?: number;
  minBars?: number;
  maxBars?: number;
}

// ============================================
// PATTERN METADATA
// ============================================

const PATTERN_INFO: Record<UltraPatternType, { name: string; nameAr: string; direction: 'up' | 'down' | 'unknown' }> = {
  // Triangles
  ascending_triangle: { name: 'Ascending Triangle', nameAr: 'مثلث صاعد', direction: 'up' },
  descending_triangle: { name: 'Descending Triangle', nameAr: 'مثلث هابط', direction: 'down' },
  symmetrical_triangle: { name: 'Symmetrical Triangle', nameAr: 'مثلث متماثل', direction: 'unknown' },
  
  // Wedges
  rising_wedge: { name: 'Rising Wedge', nameAr: 'وتد صاعد', direction: 'down' },
  falling_wedge: { name: 'Falling Wedge', nameAr: 'وتد هابط', direction: 'up' },
  
  // Broadening
  symmetrical_broadening: { name: 'Symmetrical Broadening', nameAr: 'توسع متماثل', direction: 'unknown' },
  broadening_bottom: { name: 'Broadening Bottom', nameAr: 'قاع متوسع', direction: 'up' },
  broadening_top: { name: 'Broadening Top', nameAr: 'قمة متوسعة', direction: 'down' },
  ascending_broadening_right_angled: { name: 'Ascending Broadening', nameAr: 'توسع صاعد قائم الزاوية', direction: 'up' },
  descending_broadening_right_angled: { name: 'Descending Broadening', nameAr: 'توسع هابط قائم الزاوية', direction: 'down' },
};

// ============================================
// TRENDLINE FITTING
// ============================================

/**
 * Fit ultra-precision trendline to pivot points
 * Uses Theil-Sen for robustness, with RANSAC fallback
 */
function fitPrecisionTrendline(
  pivots: FloatPivot[],
  data: OHLCV[],
  atr: number,
  type: 'resistance' | 'support'
): PrecisionTrendLine | null {
  if (pivots.length < 2) return null;
  
  // Prepare points (use float indices for precision)
  const points = pivots.map(p => ({
    x: p.index,
    y: p.price,
    weight: p.confidence / 100,
  }));
  
  // Try Theil-Sen first (most robust)
  let result = theilSenRegression(points.map(p => ({ x: p.x, y: p.y })));
  let method: 'THEIL_SEN' | 'RANSAC_PRO' = 'THEIL_SEN';
  
  // If R² is too low, try RANSAC
  if (result.r2 < ULTRA_PRECISION_CONFIG.R2_MIN) {
    const ransacResult = ransacProRegression(
      points.map(p => ({ x: p.x, y: p.y })),
      atr
    );
    if (ransacResult && ransacResult.r2 > result.r2) {
      result = ransacResult;
      method = 'RANSAC_PRO';
    }
  }
  
  // Still too low? Return null
  if (result.r2 < ULTRA_PRECISION_CONFIG.R2_MIN) {
    return null;
  }
  
  // Calculate touch count with ultra-tight tolerance
  const tolerance = atr * ULTRA_PRECISION_CONFIG.TOUCH_TOLERANCE_PERCENT * 100;
  const touches: FloatPivot[] = [];
  
  for (const pivot of pivots) {
    const linePrice = result.slope * pivot.index + result.intercept;
    const distance = Math.abs(pivot.price - linePrice);
    
    if (distance <= tolerance) {
      touches.push(pivot);
    }
  }
  
  // Also count intermediate touches from raw data
  const startIdx = Math.floor(pivots[0].index);
  const endIdx = Math.ceil(pivots[pivots.length - 1].index);
  
  for (let i = startIdx; i <= endIdx && i < data.length; i++) {
    const linePrice = result.slope * i + result.intercept;
    const testPrice = type === 'resistance' ? data[i].high : data[i].low;
    const distance = Math.abs(testPrice - linePrice);
    
    if (distance <= tolerance) {
      // Check if not already counted as pivot touch
      const alreadyCounted = touches.some(t => Math.abs(t.exactIndex - i) < 1);
      if (!alreadyCounted) {
        // Add as non-pivot touch (lower confidence)
        touches.push({
          index: i,
          exactIndex: i,
          subBarOffset: 0,
          price: testPrice,
          type: type === 'resistance' ? 'high' : 'low',
          prominence: 0,
          confidence: 50,
          confirmed: false,
        });
      }
    }
  }
  
  // Calculate t-statistic for slope significance
  const n = points.length;
  const slopeStdError = result.standardError / Math.sqrt(
    points.reduce((sum, p) => sum + Math.pow(p.x - result.meanX, 2), 0) || 1
  );
  const tStatistic = slopeStdError > 0 ? result.slope / slopeStdError : 0;
  const pValue = tStatistic > 2 ? 0.01 : tStatistic > 1.5 ? 0.05 : 0.1;
  
  return {
    slope: result.slope,
    intercept: result.intercept,
    r2: result.r2,
    standardError: result.standardError,
    tStatistic,
    pValue,
    touchCount: touches.length,
    touches,
    startIndex: pivots[0].index,
    endIndex: pivots[pivots.length - 1].index,
    startPrice: result.slope * pivots[0].index + result.intercept,
    endPrice: result.slope * pivots[pivots.length - 1].index + result.intercept,
    isSignificant: pValue < 0.05,
    method,
  };
}

// ============================================
// VOLUME ANALYSIS
// ============================================

/**
 * Analyze volume pattern during pattern formation
 */
function analyzeVolume(
  data: OHLCV[],
  startIdx: number,
  endIdx: number
): { decline: number; confirmed: boolean; spike: boolean } {
  if (startIdx >= endIdx || endIdx >= data.length) {
    return { decline: 0, confirmed: false, spike: false };
  }
  
  // Pre-pattern volume (20 bars before)
  const preStart = Math.max(0, startIdx - 20);
  const preVolumes = data.slice(preStart, startIdx).map(d => d.volume);
  const avgPre = mean(preVolumes);
  
  // Pattern volume
  const patternVolumes = data.slice(startIdx, endIdx + 1).map(d => d.volume);
  const avgPattern = mean(patternVolumes);
  
  // Calculate decline
  const decline = avgPre > 0 ? (avgPre - avgPattern) / avgPre : 0;
  
  // Check for spike at end
  const lastBars = patternVolumes.slice(-3);
  const avgLast = mean(lastBars);
  const spike = avgLast > avgPre * ULTRA_PRECISION_CONFIG.VOLUME_SPIKE_RATIO;
  
  const confirmed = decline >= ULTRA_PRECISION_CONFIG.VOLUME_DECLINE_MIN;
  
  return { decline, confirmed, spike };
}

// ============================================
// PATTERN VALIDATORS
// ============================================

/**
 * Validate Triangle Pattern
 */
function validateTriangle(
  upperLine: PrecisionTrendLine,
  lowerLine: PrecisionTrendLine,
  atr: number
): { type: 'ascending' | 'descending' | 'symmetrical' | null; score: number } {
  const flatnessThreshold = atr * 0.0001;  // Ultra-tight flatness check
  
  const upperFlat = Math.abs(upperLine.slope) < flatnessThreshold;
  const lowerFlat = Math.abs(lowerLine.slope) < flatnessThreshold;
  
  // Must be converging
  if (!areLinesConverging(upperLine.slope, lowerLine.slope)) {
    return { type: null, score: 0 };
  }
  
  // Check convergence angle
  const angle = angleBetweenLines(upperLine.slope, lowerLine.slope);
  if (angle < ULTRA_PRECISION_CONFIG.TRIANGLE_CONVERGENCE_MIN ||
      angle > ULTRA_PRECISION_CONFIG.TRIANGLE_CONVERGENCE_MAX) {
    return { type: null, score: 0 };
  }
  
  // Calculate score based on R² and touches
  const avgR2 = (upperLine.r2 + lowerLine.r2) / 2;
  const totalTouches = upperLine.touchCount + lowerLine.touchCount;
  const score = avgR2 * 50 + Math.min(totalTouches / 8, 1) * 50;
  
  // Determine type
  if (upperFlat && lowerLine.slope > 0) {
    return { type: 'ascending', score };
  } else if (lowerFlat && upperLine.slope < 0) {
    return { type: 'descending', score };
  } else if (upperLine.slope < 0 && lowerLine.slope > 0) {
    return { type: 'symmetrical', score };
  }
  
  return { type: null, score: 0 };
}

/**
 * Validate Wedge Pattern
 */
function validateWedge(
  upperLine: PrecisionTrendLine,
  lowerLine: PrecisionTrendLine,
  pivots: FloatPivot[]
): { type: 'rising' | 'falling' | null; score: number; alternation: number } {
  // Must be converging
  if (!areLinesConverging(upperLine.slope, lowerLine.slope)) {
    return { type: null, score: 0, alternation: 0 };
  }
  
  // Both lines must slope in same direction
  const bothRising = upperLine.slope > 0 && lowerLine.slope > 0;
  const bothFalling = upperLine.slope < 0 && lowerLine.slope < 0;
  
  if (!bothRising && !bothFalling) {
    return { type: null, score: 0, alternation: 0 };
  }
  
  // Check alternation (H-L-H-L pattern)
  let alternationViolations = 0;
  for (let i = 1; i < pivots.length; i++) {
    if (pivots[i].type === pivots[i - 1].type) {
      alternationViolations++;
    }
  }
  const alternation = pivots.length > 1 
    ? 1 - (alternationViolations / (pivots.length - 1))
    : 0;
  
  if (alternation < ULTRA_PRECISION_CONFIG.WEDGE_ALTERNATION_MIN) {
    return { type: null, score: 0, alternation };
  }
  
  // Calculate contraction
  const startIdx = Math.min(upperLine.startIndex, lowerLine.startIndex);
  const endIdx = Math.max(upperLine.endIndex, lowerLine.endIndex);
  const convergence = calculateConvergenceRate(
    upperLine.slope, lowerLine.slope,
    upperLine.intercept, lowerLine.intercept,
    startIdx, endIdx
  );
  
  if (convergence < ULTRA_PRECISION_CONFIG.WEDGE_CONTRACTION_MIN) {
    return { type: null, score: 0, alternation };
  }
  
  // Score
  const avgR2 = (upperLine.r2 + lowerLine.r2) / 2;
  const score = avgR2 * 40 + alternation * 30 + convergence * 30;
  
  return {
    type: bothRising ? 'rising' : 'falling',
    score,
    alternation,
  };
}

/**
 * Validate Broadening Pattern
 */
function validateBroadening(
  upperLine: PrecisionTrendLine,
  lowerLine: PrecisionTrendLine,
  atr: number
): { 
  type: 'symmetrical' | 'bottom' | 'top' | 'ascending_ra' | 'descending_ra' | null; 
  score: number;
  divergence: number;
} {
  // Must be diverging
  if (!areLinesdiverging(upperLine.slope, lowerLine.slope)) {
    return { type: null, score: 0, divergence: 0 };
  }
  
  const flatnessThreshold = atr * 0.00015;
  const upperFlat = Math.abs(upperLine.slope) < flatnessThreshold;
  const lowerFlat = Math.abs(lowerLine.slope) < flatnessThreshold;
  
  // Calculate divergence rate
  const startIdx = Math.min(upperLine.startIndex, lowerLine.startIndex);
  const endIdx = Math.max(upperLine.endIndex, lowerLine.endIndex);
  const divergence = -calculateConvergenceRate(
    upperLine.slope, lowerLine.slope,
    upperLine.intercept, lowerLine.intercept,
    startIdx, endIdx
  );
  
  if (divergence < ULTRA_PRECISION_CONFIG.BROADENING_DIVERGENCE_MIN) {
    return { type: null, score: 0, divergence };
  }
  
  // Score
  const avgR2 = (upperLine.r2 + lowerLine.r2) / 2;
  const totalTouches = upperLine.touchCount + lowerLine.touchCount;
  const score = avgR2 * 45 + Math.min(totalTouches / 8, 1) * 35 + divergence * 20;
  
  // Determine type
  if (upperFlat && lowerLine.slope < 0) {
    // Flat top, falling bottom = Ascending Right-Angled Broadening
    return { type: 'ascending_ra', score, divergence };
  } else if (lowerFlat && upperLine.slope > 0) {
    // Rising top, flat bottom = Descending Right-Angled Broadening
    return { type: 'descending_ra', score, divergence };
  } else if (upperLine.slope > 0 && lowerLine.slope < 0) {
    // Both expanding outward = Symmetrical
    // Check trend context for bottom/top
    const upperExpansion = Math.abs(upperLine.slope);
    const lowerExpansion = Math.abs(lowerLine.slope);
    
    if (upperExpansion > lowerExpansion * 1.3) {
      return { type: 'top', score, divergence };
    } else if (lowerExpansion > upperExpansion * 1.3) {
      return { type: 'bottom', score, divergence };
    }
    return { type: 'symmetrical', score, divergence };
  }
  
  return { type: null, score: 0, divergence };
}

// ============================================
// MAIN DETECTION ENGINE
// ============================================

/**
 * Detect all ultra-precision patterns in data
 */
export function detectUltraPatterns(
  data: OHLCV[],
  options: DetectionOptions = {}
): UltraPattern[] {
  const {
    enabledPatterns,
    strictMode = false,
    maxPatterns = ULTRA_PRECISION_CONFIG.MAX_PATTERNS_DISPLAY,
    minBars = 15,
    maxBars = 150,
  } = options;
  
  if (data.length < minBars + 20) {
    return [];
  }
  
  const atr = getCurrentATR(data);
  const patterns: UltraPattern[] = [];
  
  // Detect pivots with ultra-precision
  const pivotResult = detectUltraPrecisionPivots(data);
  
  // Get confirmed pivots for high-quality patterns
  const { highs, lows } = strictMode 
    ? getConfirmedPivots(pivotResult)
    : getRecentPivots(pivotResult, 15);
  
  if (highs.length < 2 || lows.length < 2) {
    return [];
  }
  
  // Try different window sizes for pattern detection
  const windowSizes = [30, 50, 75, 100, 125];
  
  for (const windowSize of windowSizes) {
    if (windowSize > data.length - 20) continue;
    
    const startIdx = data.length - windowSize;
    const endIdx = data.length - 1;
    
    // Get pivots in this window
    const windowHighs = highs.filter(p => p.exactIndex >= startIdx && p.exactIndex <= endIdx);
    const windowLows = lows.filter(p => p.exactIndex >= startIdx && p.exactIndex <= endIdx);
    
    if (windowHighs.length < 2 || windowLows.length < 2) continue;
    
    // Fit trendlines
    const upperLine = fitPrecisionTrendline(windowHighs, data, atr, 'resistance');
    const lowerLine = fitPrecisionTrendline(windowLows, data, atr, 'support');
    
    if (!upperLine || !lowerLine) continue;
    
    // Skip if R² too low
    if (upperLine.r2 < ULTRA_PRECISION_CONFIG.R2_MIN || 
        lowerLine.r2 < ULTRA_PRECISION_CONFIG.R2_MIN) {
      continue;
    }
    
    // Try to identify pattern type
    let patternType: UltraPatternType | null = null;
    let extraScore = 0;
    let alternationScore = 1;
    
    // Check triangles
    const triangleResult = validateTriangle(upperLine, lowerLine, atr);
    if (triangleResult.type) {
      patternType = `${triangleResult.type}_triangle` as UltraPatternType;
      extraScore = triangleResult.score;
    }
    
    // Check wedges
    if (!patternType) {
      const allPivots = [...windowHighs, ...windowLows].sort((a, b) => a.index - b.index);
      const wedgeResult = validateWedge(upperLine, lowerLine, allPivots);
      if (wedgeResult.type) {
        patternType = `${wedgeResult.type}_wedge` as UltraPatternType;
        extraScore = wedgeResult.score;
        alternationScore = wedgeResult.alternation;
      }
    }
    
    // Check broadening patterns
    if (!patternType) {
      const broadeningResult = validateBroadening(upperLine, lowerLine, atr);
      if (broadeningResult.type) {
        const typeMap: Record<string, UltraPatternType> = {
          'symmetrical': 'symmetrical_broadening',
          'bottom': 'broadening_bottom',
          'top': 'broadening_top',
          'ascending_ra': 'ascending_broadening_right_angled',
          'descending_ra': 'descending_broadening_right_angled',
        };
        patternType = typeMap[broadeningResult.type];
        extraScore = broadeningResult.score;
      }
    }
    
    if (!patternType) continue;
    
    // Check if this pattern type is enabled
    // Only filter if enabledPatterns has items - empty array means detect nothing
    if (enabledPatterns) {
      if (enabledPatterns.length === 0) {
        // Empty list = no patterns enabled, skip all
        continue;
      }
      if (!enabledPatterns.includes(patternType)) {
        // Pattern not in enabled list, skip
        continue;
      }
    }
    
    // Analyze volume
    const volumeAnalysis = analyzeVolume(data, startIdx, endIdx);
    
    // Calculate quality
    const qualityResult = calculateQualityScore(
      upperLine.r2,
      lowerLine.r2,
      upperLine.touchCount,
      lowerLine.touchCount,
      volumeAnalysis.confirmed ? 80 : volumeAnalysis.decline * 100,
      true,
      alternationScore
    );
    
    // Skip weak patterns in strict mode
    if (strictMode && (qualityResult.level === 'WEAK' || qualityResult.level === 'VALID')) {
      continue;
    }
    
    // Calculate apex
    const apex = calculateApex(
      upperLine.slope, upperLine.intercept,
      lowerLine.slope, lowerLine.intercept
    );
    
    const apexBars = apex ? apex.x - endIdx : undefined;
    
    // Calculate convergence
    const convergenceAngle = angleBetweenLines(upperLine.slope, lowerLine.slope);
    const convergenceRate = calculateConvergenceRate(
      upperLine.slope, lowerLine.slope,
      upperLine.intercept, lowerLine.intercept,
      startIdx, endIdx
    );
    
    // Calculate target price
    const patternHeight = Math.abs(
      (upperLine.slope * startIdx + upperLine.intercept) -
      (lowerLine.slope * startIdx + lowerLine.intercept)
    );
    const currentPrice = data[endIdx].close;
    const info = PATTERN_INFO[patternType];
    const targetPrice = info.direction === 'up' 
      ? currentPrice + patternHeight
      : info.direction === 'down'
        ? currentPrice - patternHeight
        : null;
    
    // Create pattern object
    const pattern: UltraPattern = {
      type: patternType,
      name: info.name,
      nameAr: info.nameAr,
      upperLine,
      lowerLine,
      startIdx,
      endIdx,
      apex: apex || undefined,
      apexBars: apexBars && apexBars > 0 ? apexBars : undefined,
      convergenceAngle,
      convergenceRate,
      quality: qualityResult.level,
      qualityAr: getQualityLabelAr(qualityResult.level),
      score: qualityResult.score,
      confidence: qualityResult.confidence,
      volumeDecline: volumeAnalysis.decline,
      volumeConfirmed: volumeAnalysis.confirmed,
      breakoutDirection: info.direction,
      targetPrice,
      description: generateDescription(patternType, qualityResult.level, upperLine, lowerLine),
      color: getQualityColor(qualityResult.level),
    };
    
    // Check for duplicates (similar patterns)
    const isDuplicate = patterns.some(p => 
      p.type === pattern.type &&
      Math.abs(p.startIdx - pattern.startIdx) < 10 &&
      Math.abs(p.endIdx - pattern.endIdx) < 10
    );
    
    if (!isDuplicate) {
      patterns.push(pattern);
    }
  }
  
  // Sort by quality score (descending)
  patterns.sort((a, b) => b.score - a.score);
  
  // Return top patterns
  return patterns.slice(0, maxPatterns);
}

/**
 * Generate pattern description
 */
function generateDescription(
  type: UltraPatternType,
  quality: QualityLevel,
  upperLine: PrecisionTrendLine,
  lowerLine: PrecisionTrendLine
): string {
  const avgR2 = ((upperLine.r2 + lowerLine.r2) / 2 * 100).toFixed(1);
  const totalTouches = upperLine.touchCount + lowerLine.touchCount;
  
  const info = PATTERN_INFO[type];
  const direction = info.direction === 'up' ? 'صعودي' : info.direction === 'down' ? 'هبوطي' : 'محايد';
  
  return `${info.nameAr} (${quality}) - R²: ${avgR2}% - لمسات: ${totalTouches} - اتجاه: ${direction}`;
}

// ============================================
// PATTERN LINE GENERATION
// ============================================

/**
 * Generate pattern lines for rendering
 */
export function generateUltraPatternLines(
  pattern: UltraPattern,
  dataLength: number,
  extendBy: number = 15
): {
  upper: (number | null)[];
  lower: (number | null)[];
  upperExtended: (number | null)[];
  lowerExtended: (number | null)[];
} {
  const upper: (number | null)[] = new Array(dataLength).fill(null);
  const lower: (number | null)[] = new Array(dataLength).fill(null);
  const upperExtended: (number | null)[] = new Array(dataLength).fill(null);
  const lowerExtended: (number | null)[] = new Array(dataLength).fill(null);
  
  const { upperLine, lowerLine } = pattern;
  
  // Main pattern lines
  const startIdx = Math.floor(Math.max(0, pattern.startIdx));
  const endIdx = Math.ceil(Math.min(dataLength - 1, pattern.endIdx));
  
  for (let i = startIdx; i <= endIdx; i++) {
    upper[i] = upperLine.slope * i + upperLine.intercept;
    lower[i] = lowerLine.slope * i + lowerLine.intercept;
  }
  
  // Extended lines (projection)
  const extendEnd = Math.min(dataLength - 1, endIdx + extendBy);
  for (let i = endIdx + 1; i <= extendEnd; i++) {
    upperExtended[i] = upperLine.slope * i + upperLine.intercept;
    lowerExtended[i] = lowerLine.slope * i + lowerLine.intercept;
  }
  
  return { upper, lower, upperExtended, lowerExtended };
}

// ============================================
// TIMEFRAME NORMALIZATION
// ============================================

export type TimeframeType = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';

export function normalizeTimeframe(tf: string): TimeframeType {
  const lower = tf.toLowerCase();
  
  if (lower.includes('1m') || lower === '1') return '1m';
  if (lower.includes('5m') || lower === '5') return '5m';
  if (lower.includes('15m') || lower === '15') return '15m';
  if (lower.includes('30m') || lower === '30') return '30m';
  if (lower.includes('1h') || lower === '60') return '1h';
  if (lower.includes('4h') || lower === '240') return '4h';
  if (lower.includes('1d') || lower === 'd' || lower === 'day') return '1d';
  if (lower.includes('1w') || lower === 'w' || lower === 'week') return '1w';
  
  return '1h'; // Default
}

// ============================================
// EXPORT HELPERS
// ============================================

export { ULTRA_PRECISION_CONFIG } from './ultra-precision-math';
export type { FloatPivot, PrecisionTrendLine, QualityLevel } from './ultra-precision-math';
