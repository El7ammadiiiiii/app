/**
 * 🏆 ULTRA-PRECISION PATTERN DETECTION BRIDGE
 * جسر التكامل بين نظام الأنماط فائق الدقة والنظام الحالي
 * 
 * Purpose: Seamlessly integrate ultra-precision pattern detection into existing TradingChart
 * 
 * Features:
 * - Backward compatible with DetectedPattern interface
 * - Maximum 2 patterns displayed (user preference)
 * - Timeframe isolation
 * - Quality filtering (ELITE+ only in strict mode)
 * 
 * @version 3.0.0 Ultra-Precision Edition
 */

import type { DetectedPattern, PatternType } from './chart-patterns';
import {
  detectUltraPatterns,
  generateUltraPatternLines,
  normalizeTimeframe,
  type UltraPattern,
  type UltraPatternType,
  type TimeframeType,
  ULTRA_PRECISION_CONFIG,
} from './ultra-precision-detection';

import type { OHLCV } from './ultra-precision-math';

/**
 * Convert existing OHLCV format to Ultra OHLCV format
 */
function convertToUltraOHLCV(data: any[]): OHLCV[] {
  return data.map(d => ({
    timestamp: d.timestamp || Date.now(),
    open: d.open,
    high: d.high,
    low: d.low,
    close: d.close,
    volume: d.volume || 0,
  }));
}

/**
 * Convert UltraPattern to DetectedPattern for backward compatibility
 */
function convertUltraToLegacyPattern(ultra: UltraPattern, timeframe: string): DetectedPattern {
  const patternTypeMap: Record<UltraPatternType, PatternType> = {
    'ascending_triangle': 'ascending_triangle',
    'descending_triangle': 'descending_triangle',
    'symmetrical_triangle': 'symmetrical_triangle',
    'rising_wedge': 'rising_wedge',
    'falling_wedge': 'falling_wedge',
    'symmetrical_broadening': 'ascending_broadening_wedge',
    'broadening_bottom': 'ascending_broadening_wedge',
    'broadening_top': 'descending_broadening_wedge',
    'ascending_broadening_right_angled': 'ascending_broadening_wedge',
    'descending_broadening_right_angled': 'descending_broadening_wedge',
  };

  return {
    type: patternTypeMap[ultra.type] || 'ascending_triangle',
    name: ultra.name,
    nameAr: ultra.nameAr,
    startIdx: Math.floor(ultra.startIdx),
    endIdx: Math.ceil(ultra.endIdx),
    upperLine: {
      slope: ultra.upperLine.slope,
      intercept: ultra.upperLine.intercept,
      startIdx: Math.floor(ultra.upperLine.startIndex),
      endIdx: Math.ceil(ultra.upperLine.endIndex),
      startPrice: ultra.upperLine.startPrice,
      endPrice: ultra.upperLine.endPrice,
      r2: ultra.upperLine.r2,
      touchCount: ultra.upperLine.touchCount,
    },
    lowerLine: {
      slope: ultra.lowerLine.slope,
      intercept: ultra.lowerLine.intercept,
      startIdx: Math.floor(ultra.lowerLine.startIndex),
      endIdx: Math.ceil(ultra.lowerLine.endIndex),
      startPrice: ultra.lowerLine.startPrice,
      endPrice: ultra.lowerLine.endPrice,
      r2: ultra.lowerLine.r2,
      touchCount: ultra.lowerLine.touchCount,
    },
    breakoutDirection: ultra.breakoutDirection,
    confidence: ultra.confidence,
    targetPrice: ultra.targetPrice,
    description: `${ultra.qualityAr} - ${ultra.description}`,
    // Extended properties
    detectedTimeframe: timeframe,
    qualityScore: ultra.quality,
  } as DetectedPattern & { detectedTimeframe: string; qualityScore: string };
}

/**
 * Main function: Detect ultra-precision patterns and return them in legacy format
 * This is a drop-in replacement for detectChartPatterns with ultra quality
 */
export function detectElitePatternsCompatible(
  data: any[],
  currentTimeframe: string,
  options: {
    enabledPatterns?: string[];
    strictMode?: boolean;
  } = {}
): DetectedPattern[] {
  if (!data || data.length < 50) {
    
    return [];
  }

  try {
    // Convert timeframe
    const tf = normalizeTimeframe(currentTimeframe);
    
    
    // Convert data format
    const ultraData = convertToUltraOHLCV(data);
    
    // Map enabled patterns to ultra pattern types
    const ultraPatternTypes = options.enabledPatterns?.map(p => {
      const map: Record<string, UltraPatternType> = {
        'ascending_triangle': 'ascending_triangle',
        'descending_triangle': 'descending_triangle',
        'symmetrical_triangle': 'symmetrical_triangle',
        'rising_wedge': 'rising_wedge',
        'falling_wedge': 'falling_wedge',
        'ascending_broadening_wedge': 'symmetrical_broadening',
        'descending_broadening_wedge': 'broadening_top',
        'broadening_bottom': 'broadening_bottom',
        'broadening_top': 'broadening_top',
        'symmetrical_broadening': 'symmetrical_broadening',
        'ascending_broadening_right_angled': 'ascending_broadening_right_angled',
        'descending_broadening_right_angled': 'descending_broadening_right_angled',
      };
      return map[p] as UltraPatternType;
    }).filter(Boolean) as UltraPatternType[];
    
    
    
    // Detect ultra-precision patterns
    // Pass the enabledPatterns list directly - empty list means no patterns should be detected
    const ultraPatterns = detectUltraPatterns(ultraData, {
      enabledPatterns: ultraPatternTypes,
      strictMode: options.strictMode,
      maxPatterns: ULTRA_PRECISION_CONFIG.MAX_PATTERNS_DISPLAY,
    });
    
    // Convert to legacy format
    const legacyPatterns = ultraPatterns.map(p => convertUltraToLegacyPattern(p, tf));
    
    return legacyPatterns;
    
  } catch (error) {
    
    return [];
  }
}

/**
 * Generate pattern lines for drawing (compatible with existing rendering)
 */
export function generateElitePatternLinesCompatible(
  pattern: DetectedPattern | UltraPattern,
  dataLength: number,
  extendBy: number = 15
): {
  upper: (number | null)[];
  lower: (number | null)[];
} {
  // If it's an UltraPattern, use native function
  if ('quality' in pattern && 'qualityAr' in pattern && 'upperLine' in pattern) {
    const ultraPattern = pattern as UltraPattern;
    const lines = generateUltraPatternLines(ultraPattern, dataLength, extendBy);
    
    // Merge main lines with extended lines
    const upper = lines.upper.map((v, i) => v ?? lines.upperExtended[i]);
    const lower = lines.lower.map((v, i) => v ?? lines.lowerExtended[i]);
    
    return { upper, lower };
  }
  
  // Otherwise, render legacy pattern
  const upper: (number | null)[] = new Array(dataLength).fill(null);
  const lower: (number | null)[] = new Array(dataLength).fill(null);
  
  const legacyPattern = pattern as DetectedPattern;
  const { upperLine, lowerLine } = legacyPattern;
  
  // Draw upper line
  if (upperLine) {
    for (let i = upperLine.startIdx; i <= Math.min(upperLine.endIdx + extendBy, dataLength - 1); i++) {
      upper[i] = upperLine.slope * i + upperLine.intercept;
    }
  }
  
  // Draw lower line
  if (lowerLine) {
    for (let i = lowerLine.startIdx; i <= Math.min(lowerLine.endIdx + extendBy, dataLength - 1); i++) {
      lower[i] = lowerLine.slope * i + lowerLine.intercept;
    }
  }
  
  return { upper, lower };
}

/**
 * Check if a pattern is high quality (Elite or Ultra-Elite)
 */
export function isEliteQualityPattern(pattern: DetectedPattern): boolean {
  const qualityScore = (pattern as any).qualityScore as string | undefined;
  return qualityScore === 'ELITE' || qualityScore === 'ULTRA_ELITE';
}

/**
 * Get pattern quality badge text
 */
export function getPatternQualityBadge(pattern: DetectedPattern): string {
  const qualityScore = (pattern as any).qualityScore as string | undefined;
  const qualityMap: Record<string, string> = {
    'ULTRA_ELITE': '🏆 نخبة فائقة - دقة ملي',
    'ELITE': '💎 نخبة',
    'STRONG': '💪 قوي',
    'VALID': '✅ صالح',
  };
  return qualityMap[qualityScore || ''] || '';
}

/**
 * Get pattern quality color
 */
export function getPatternQualityColor(pattern: DetectedPattern): string {
  const qualityScore = (pattern as any).qualityScore as string | undefined;
  const colorMap: Record<string, string> = {
    'ULTRA_ELITE': '#FFD700',  // Gold
    'ELITE': '#00FF88',        // Bright green
    'STRONG': '#00BFFF',       // Deep sky blue
    'VALID': '#FFA500',        // Orange
    'WEAK': '#FF6B6B',         // Light red
  };
  return colorMap[qualityScore || ''] || '#888888';
}

// Re-export types and config
export { ULTRA_PRECISION_CONFIG } from './ultra-precision-detection';
export type { UltraPattern, UltraPatternType, TimeframeType } from './ultra-precision-detection';
