/**
 * Wedge and Flag Finder (Multi-Zigzag) [Trendoscope®]
 * Based on TradingView indicator by Trendoscope
 * 
 * Features:
 * - Multi-level Zigzag analysis (4 configurable levels)
 * - Wedge pattern detection (5 or 6 pivot points)
 * - Flag pattern detection with pole
 * - Angle difference and range filtering
 * - Pattern overlap suppression
 * 
 * Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License
 */

export interface CandleData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  time?: number | string | any;
}

export interface WedgeFlagConfig {
  // Wedge settings
  wedgeSize: 5 | 6;           // Number of pivots (5 or 6)
  
  // Theme
  theme: 'dark' | 'light';
  
  // Pattern options
  avoidOverlap: boolean;      // Suppress overlapping patterns
  drawZigzag: boolean;        // Draw zigzag lines within pattern
  
  // Zigzag levels
  showZigZag1: boolean;
  zigzag1Length: number;
  showZigZag2: boolean;
  zigzag2Length: number;
  showZigZag3: boolean;
  zigzag3Length: number;
  showZigZag4: boolean;
  zigzag4Length: number;
  
  // Pattern filters
  allowFlag: boolean;
  allowWedge: boolean;
  
  // Angle filters
  applyAngleDiff: boolean;
  minAngleDiff: number;
  maxAngleDiff: number;
  applyAngleLimit: boolean;
  minAngleRange: number;
  maxAngleRange: number;
  
  // Max patterns
  maxPatterns: number;
}

export interface ZigzagPivot {
  price: number;
  index: number;
  direction: number;  // 1 = up from here, -1 = down from here
  ratio: number;      // Price movement ratio
}

export interface WedgePattern {
  type: 'wedge';
  subType: 'type1' | 'type2';  // Type 1 or Type 2 wedge
  pivots: {
    a: { index: number; price: number };  // Point 5
    b: { index: number; price: number };  // Point 4
    c: { index: number; price: number };  // Point 3
    d: { index: number; price: number };  // Point 2
    e: { index: number; price: number };  // Point 1
    f?: { index: number; price: number }; // Point 0 (for 6-point wedge)
  };
  direction: 'bullish' | 'bearish';
  upperLine: { startIndex: number; startPrice: number; endIndex: number; endPrice: number };
  lowerLine: { startIndex: number; startPrice: number; endIndex: number; endPrice: number };
  l1Angle: number;
  l2Angle: number;
  color: string;
  zigzagLevel: number;
}

export interface FlagPattern {
  type: 'flag';
  pole: { startIndex: number; startPrice: number; endIndex: number; endPrice: number };
  flag: {
    a: { index: number; price: number };
    b: { index: number; price: number };
    c: { index: number; price: number };
    d: { index: number; price: number };
    e: { index: number; price: number };
    f?: { index: number; price: number };
  };
  direction: 'bullish' | 'bearish';
  upperLine: { startIndex: number; startPrice: number; endIndex: number; endPrice: number };
  lowerLine: { startIndex: number; startPrice: number; endIndex: number; endPrice: number };
  flagRatio: number;
  color: string;
  zigzagLevel: number;
}

export interface WedgeFlagResult {
  // Zigzag pivots for each level
  pivotsByLevel: {
    level1: ZigzagPivot[];
    level2: ZigzagPivot[];
    level3: ZigzagPivot[];
    level4: ZigzagPivot[];
  };
  
  // Detected patterns
  wedges: WedgePattern[];
  flags: FlagPattern[];
  
  // Summary
  wedgeCount: number;
  flagCount: number;
  bullishCount: number;
  bearishCount: number;
}

export const defaultWedgeFlagConfig: WedgeFlagConfig = {
  wedgeSize: 5,
  theme: 'dark',
  avoidOverlap: true,
  drawZigzag: true,
  showZigZag1: true,
  zigzag1Length: 5,
  showZigZag2: true,
  zigzag2Length: 8,
  showZigZag3: true,
  zigzag3Length: 13,
  showZigZag4: true,
  zigzag4Length: 21,
  allowFlag: true,
  allowWedge: true,
  applyAngleDiff: false,
  minAngleDiff: 5,
  maxAngleDiff: 20,
  applyAngleLimit: false,
  minAngleRange: 10,
  maxAngleRange: 60,
  maxPatterns: 10
};

// Theme colors
const DARK_THEME_COLORS = [
  '#fbf46d', '#8dba51', '#4a9ff5', '#ff998c', '#ff9500',
  '#00ead3', '#a799b7', '#ffd271', '#77d970', '#5f81e4',
  '#eb92be', '#c68b59', '#c89595', '#c4b6b6', '#ffbe0f',
  '#c0e218', '#998ceb', '#ce1f6b', '#fb3640', '#c2ffd9',
  '#ffdbc5', '#79b4b7'
];

const LIGHT_THEME_COLORS = [
  '#3d56b2', '#39a388', '#fa1e0e', '#a9333a', '#e1578a',
  '#3e7c17', '#f4a442', '#864879', '#719fb0', '#aa2ee6',
  '#a12568', '#bd2000', '#105652', '#c85c5c', '#3f3351',
  '#726a95', '#ab6d23', '#f78812', '#334756', '#0c7b93',
  '#c32bad'
];

/**
 * Calculate angle in degrees
 */
function calculateAngle(startPrice: number, endPrice: number, bars: number, avgTR: number): number {
  const rad2degree = 180 / Math.PI;
  const normalizedMove = (startPrice - endPrice) / (2 * avgTR);
  return rad2degree * Math.atan(normalizedMove / bars);
}

/**
 * Calculate Average True Range
 */
function calculateATR(data: CandleData[], period: number, endIndex: number): number {
  let sum = 0;
  let count = 0;
  
  for (let i = Math.max(0, endIndex - period); i <= endIndex; i++) {
    const high = data[i].high;
    const low = data[i].low;
    const prevClose = i > 0 ? data[i - 1].close : data[i].open;
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    sum += tr;
    count++;
  }
  
  return count > 0 ? sum / count : 0;
}

/**
 * Find zigzag pivots with given length
 */
function findZigzagPivots(data: CandleData[], length: number): ZigzagPivot[] {
  const pivots: ZigzagPivot[] = [];
  
  if (data.length < length * 2 + 1) return pivots;
  
  let lastPivotType: 'high' | 'low' | null = null;
  let lastPivotPrice = 0;
  let lastPivotIndex = -1;
  
  for (let i = length; i < data.length - length; i++) {
    // Check for pivot high
    let isPivotHigh = true;
    for (let j = 1; j <= length; j++) {
      if (data[i].high <= data[i - j].high || data[i].high <= data[i + j].high) {
        isPivotHigh = false;
        break;
      }
    }
    
    // Check for pivot low
    let isPivotLow = true;
    for (let j = 1; j <= length; j++) {
      if (data[i].low >= data[i - j].low || data[i].low >= data[i + j].low) {
        isPivotLow = false;
        break;
      }
    }
    
    // Add pivot with alternation logic
    if (isPivotHigh) {
      if (lastPivotType === 'high') {
        // Replace if higher
        if (data[i].high > lastPivotPrice && pivots.length > 0) {
          const lastPivot = pivots[pivots.length - 1];
          lastPivot.price = data[i].high;
          lastPivot.index = i;
          lastPivotPrice = data[i].high;
          lastPivotIndex = i;
        }
      } else {
        // Calculate ratio
        const ratio = lastPivotPrice > 0 ? Math.abs(data[i].high - lastPivotPrice) / Math.abs(lastPivotPrice) : 0;
        
        pivots.push({
          price: data[i].high,
          index: i,
          direction: -1,  // After high, expect down
          ratio
        });
        lastPivotType = 'high';
        lastPivotPrice = data[i].high;
        lastPivotIndex = i;
      }
    } else if (isPivotLow) {
      if (lastPivotType === 'low') {
        // Replace if lower
        if (data[i].low < lastPivotPrice && pivots.length > 0) {
          const lastPivot = pivots[pivots.length - 1];
          lastPivot.price = data[i].low;
          lastPivot.index = i;
          lastPivotPrice = data[i].low;
          lastPivotIndex = i;
        }
      } else {
        // Calculate ratio
        const ratio = lastPivotPrice > 0 ? Math.abs(data[i].low - lastPivotPrice) / Math.abs(lastPivotPrice) : 0;
        
        pivots.push({
          price: data[i].low,
          index: i,
          direction: 1,  // After low, expect up
          ratio
        });
        lastPivotType = 'low';
        lastPivotPrice = data[i].low;
        lastPivotIndex = i;
      }
    }
  }
  
  return pivots;
}

/**
 * Get line price at given index
 */
function getLinePrice(x1: number, y1: number, x2: number, y2: number, targetX: number): number {
  if (x2 === x1) return y1;
  const slope = (y2 - y1) / (x2 - x1);
  return y1 + slope * (targetX - x1);
}

/**
 * Check if pattern overlaps with existing patterns
 */
function patternOverlaps(
  existingPatterns: (WedgePattern | FlagPattern)[],
  aBar: number, bBar: number, cBar: number, dBar: number, eBar: number, fBar: number,
  avoidOverlap: boolean
): boolean {
  for (const pattern of existingPatterns) {
    const pivots = pattern.type === 'flag' ? pattern.flag : pattern.pivots;
    
    let commonPivots = 0;
    if (pivots.a.index === aBar) commonPivots++;
    if (pivots.b.index === bBar) commonPivots++;
    if (pivots.c.index === cBar) commonPivots++;
    if (pivots.d.index === dBar) commonPivots++;
    if (pivots.e.index === eBar) commonPivots++;
    if (pivots.f && pivots.f.index === fBar) commonPivots++;
    
    if (commonPivots >= 2) return true;
    
    if (avoidOverlap) {
      const patternStart = pivots.f ? pivots.f.index : pivots.e.index;
      const patternEnd = pivots.a.index;
      const lastBar = fBar > 0 ? fBar : eBar;
      
      if (lastBar < patternEnd && lastBar > patternStart) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Find trend series (for flag pole detection)
 */
function getTrendSeries(pivots: ZigzagPivot[], startIndex: number): number[] {
  const result: number[] = [];
  
  if (startIndex >= pivots.length) return result;
  
  const startDir = pivots[startIndex].direction;
  
  for (let i = startIndex + 1; i < pivots.length; i++) {
    // Check if pivot continues the trend
    const pivot = pivots[i];
    const prevPivot = pivots[i - 1];
    
    if (startDir > 0) {
      // Looking for higher lows and higher highs (uptrend)
      if (pivot.price > prevPivot.price) {
        result.push(i);
      } else {
        break;
      }
    } else {
      // Looking for lower highs and lower lows (downtrend)
      if (pivot.price < prevPivot.price) {
        result.push(i);
      } else {
        break;
      }
    }
  }
  
  return result;
}

/**
 * Find wedge/flag pattern from pivots
 */
function findWedgeOrFlag(
  data: CandleData[],
  pivots: ZigzagPivot[],
  startIndex: number,
  existingPatterns: (WedgePattern | FlagPattern)[],
  colorIndex: number,
  level: number,
  config: WedgeFlagConfig
): { wedge: WedgePattern | null; flag: FlagPattern | null } {
  const result: { wedge: WedgePattern | null; flag: FlagPattern | null } = { wedge: null, flag: null };
  
  const neededPivots = config.wedgeSize === 6 ? 6 : 5;
  if (pivots.length < startIndex + neededPivots) return result;
  
  // Get pivots (from newest to oldest: a, b, c, d, e, f)
  const a = pivots[pivots.length - 1 - startIndex];
  const b = pivots[pivots.length - 2 - startIndex];
  const c = pivots[pivots.length - 3 - startIndex];
  const d = pivots[pivots.length - 4 - startIndex];
  const e = pivots[pivots.length - 5 - startIndex];
  const f = config.wedgeSize === 6 ? pivots[pivots.length - 6 - startIndex] : e;
  
  if (!a || !b || !c || !d || !e) return result;
  if (config.wedgeSize === 6 && !f) return result;
  
  const aBar = a.index;
  const bBar = b.index;
  const cBar = c.index;
  const dBar = d.index;
  const eBar = e.index;
  const fBar = config.wedgeSize === 6 ? f.index : eBar;
  
  // Check for overlapping patterns
  if (patternOverlaps(existingPatterns, aBar, bBar, cBar, dBar, eBar, fBar, config.avoidOverlap)) {
    return result;
  }
  
  // Calculate ratios
  const aRatio = Math.abs(a.price - b.price) / Math.abs(b.price - c.price);
  const bRatio = Math.abs(b.price - c.price) / Math.abs(c.price - d.price);
  const cRatio = Math.abs(c.price - d.price) / Math.abs(d.price - e.price);
  const dRatio = config.wedgeSize === 6 ? Math.abs(d.price - e.price) / Math.abs(e.price - f.price) : 0;
  
  // Calculate wedge lines
  const l1StartX = eBar;
  const l1StartY = e.price;
  const l1EndX = aBar;
  const l1EndY = a.price;
  
  const l2StartX = config.wedgeSize === 6 ? fBar : dBar;
  const l2StartY = config.wedgeSize === 6 ? f.price : d.price;
  const l2EndX = bBar;
  const l2EndY = b.price;
  
  // Calculate extended line values
  const startBar = Math.min(l2StartX, l1StartX);
  const endBar = l1EndX;
  
  const l1Start = getLinePrice(l1StartX, l1StartY, l1EndX, l1EndY, startBar);
  const l1End = getLinePrice(l1StartX, l1StartY, l1EndX, l1EndY, endBar);
  const l2Start = getLinePrice(l2StartX, l2StartY, l2EndX, l2EndY, startBar);
  const l2End = getLinePrice(l2StartX, l2StartY, l2EndX, l2EndY, endBar);
  
  // Calculate angles
  const avgTR = calculateATR(data, endBar - startBar + 1, endBar);
  const l1Angle = calculateAngle(l1End, l1Start, endBar - startBar, avgTR);
  const l2Angle = calculateAngle(l2End, l2Start, endBar - startBar, avgTR);
  
  const l1Diff = Math.abs(l1Start - l1End);
  const l2Diff = Math.abs(l2Start - l2End);
  
  // Check wedge type conditions
  const isType1Wedge = aRatio >= 1 && bRatio < 1 && cRatio >= 1 && 
    (dRatio < 1 || config.wedgeSize === 5) && l1Diff < l2Diff;
  const isType2Wedge = aRatio < 1 && bRatio >= 1 && cRatio < 1 && 
    (dRatio >= 1 || config.wedgeSize === 5) && l1Diff > l2Diff;
  
  // Apply angle filters
  const angleDiff = Math.abs(l1Angle - l2Angle);
  const angleDiffInRange = !config.applyAngleDiff || 
    (angleDiff >= config.minAngleDiff && angleDiff <= config.maxAngleDiff);
  const angleInRange = !config.applyAngleLimit ||
    (Math.max(Math.abs(l1Angle), Math.abs(l2Angle)) >= config.minAngleRange &&
     Math.min(Math.abs(l1Angle), Math.abs(l2Angle)) <= config.maxAngleRange);
  
  let isWedge = (isType1Wedge || isType2Wedge) && angleDiffInRange && angleInRange;
  
  // Validate that price stays within wedge
  if (isWedge) {
    const lastPivotBar = config.wedgeSize === 6 ? fBar : eBar;
    
    for (let i = aBar; i >= lastPivotBar; i--) {
      if (i >= data.length) continue;
      
      const candle = data[i];
      const l1Price = getLinePrice(l1StartX, l1StartY, l1EndX, l1EndY, i);
      const l2Price = getLinePrice(l2StartX, l2StartY, l2EndX, l2EndY, i);
      
      const minLine = Math.min(l1Price, l2Price);
      const maxLine = Math.max(l1Price, l2Price);
      
      if (candle.high < minLine || candle.low > maxLine) {
        isWedge = false;
        break;
      }
      
      // Check point C is on line 1
      if (i === cBar && (l1Price > candle.high || l1Price < candle.low)) {
        isWedge = false;
        break;
      }
      
      // Check point D is on line 2
      if (i === dBar && (l2Price > candle.high || l2Price < candle.low)) {
        isWedge = false;
        break;
      }
    }
  }
  
  if (!isWedge) return result;
  
  // Get color
  const colors = config.theme === 'dark' ? DARK_THEME_COLORS : LIGHT_THEME_COLORS;
  const color = colors[colorIndex % colors.length];
  
  // Determine direction
  const lastPivot = config.wedgeSize === 6 ? f : e;
  const lastPivotBar = config.wedgeSize === 6 ? fBar : eBar;
  const llastPivot = config.wedgeSize === 6 ? e : d;
  const direction: 'bullish' | 'bearish' = lastPivot.price > llastPivot.price ? 'bearish' : 'bullish';
  
  // Check for flag pattern
  const trendIndexes = getTrendSeries(pivots, pivots.length - 1 - startIndex - (config.wedgeSize - 1));
  let isFlag = false;
  let flagPole: { startIndex: number; startPrice: number; endIndex: number; endPrice: number } | null = null;
  
  for (let i = trendIndexes.length - 1; i >= 0; i--) {
    const xIndex = trendIndexes[i];
    if (xIndex >= pivots.length) continue;
    
    const xPivot = pivots[xIndex];
    const targetLine = config.wedgeSize === 6 ? 
      getLinePrice(l1StartX, l1StartY, l1EndX, l1EndY, lastPivotBar) :
      getLinePrice(l2StartX, l2StartY, l2EndX, l2EndY, lastPivotBar);
    
    const flagRatio = Math.abs(lastPivot.price - targetLine) / Math.abs(xPivot.price - lastPivot.price);
    
    // Flag condition: small retracement (< 61.8%) and same trend direction
    const sameDirection = Math.sign(lastPivot.price - xPivot.price) === 
      Math.sign(lastPivot.price - (config.wedgeSize === 6 ? b.price : a.price));
    
    if (flagRatio < 0.618 && sameDirection) {
      isFlag = true;
      flagPole = {
        startIndex: xPivot.index,
        startPrice: xPivot.price,
        endIndex: lastPivotBar,
        endPrice: lastPivot.price
      };
      break;
    }
  }
  
  // Create pattern result
  const pivotPoints = {
    a: { index: aBar, price: a.price },
    b: { index: bBar, price: b.price },
    c: { index: cBar, price: c.price },
    d: { index: dBar, price: d.price },
    e: { index: eBar, price: e.price },
    ...(config.wedgeSize === 6 ? { f: { index: fBar, price: f.price } } : {})
  };
  
  const upperLine = {
    startIndex: startBar,
    startPrice: l1Start,
    endIndex: endBar,
    endPrice: l1End
  };
  
  const lowerLine = {
    startIndex: startBar,
    startPrice: l2Start,
    endIndex: endBar,
    endPrice: l2End
  };
  
  if (isFlag && config.allowFlag && flagPole) {
    const flagDirection: 'bullish' | 'bearish' = flagPole.startPrice < flagPole.endPrice ? 'bullish' : 'bearish';
    result.flag = {
      type: 'flag',
      pole: flagPole,
      flag: pivotPoints,
      direction: flagDirection,
      upperLine,
      lowerLine,
      flagRatio: 0,
      color,
      zigzagLevel: level
    };
  } else if (!isFlag && config.allowWedge) {
    result.wedge = {
      type: 'wedge',
      subType: isType1Wedge ? 'type1' : 'type2',
      pivots: pivotPoints,
      direction,
      upperLine,
      lowerLine,
      l1Angle,
      l2Angle,
      color,
      zigzagLevel: level
    };
  }
  
  return result;
}

/**
 * Main calculation function
 */
export function calculateWedgeFlagMultiZigzag(
  data: CandleData[],
  config: Partial<WedgeFlagConfig> = {}
): WedgeFlagResult {
  const cfg = { ...defaultWedgeFlagConfig, ...config };
  
  const result: WedgeFlagResult = {
    pivotsByLevel: {
      level1: [],
      level2: [],
      level3: [],
      level4: []
    },
    wedges: [],
    flags: [],
    wedgeCount: 0,
    flagCount: 0,
    bullishCount: 0,
    bearishCount: 0
  };
  
  if (data.length < 50) return result;
  
  const allPatterns: (WedgePattern | FlagPattern)[] = [];
  let colorIndex = 0;
  
  // Process each zigzag level
  const zigzagConfigs = [
    { show: cfg.showZigZag1, length: cfg.zigzag1Length, level: 1 },
    { show: cfg.showZigZag2, length: cfg.zigzag2Length, level: 2 },
    { show: cfg.showZigZag3, length: cfg.zigzag3Length, level: 3 },
    { show: cfg.showZigZag4, length: cfg.zigzag4Length, level: 4 }
  ];
  
  for (const zzConfig of zigzagConfigs) {
    if (!zzConfig.show) continue;
    
    const pivots = findZigzagPivots(data, zzConfig.length);
    
    // Store pivots
    switch (zzConfig.level) {
      case 1: result.pivotsByLevel.level1 = pivots; break;
      case 2: result.pivotsByLevel.level2 = pivots; break;
      case 3: result.pivotsByLevel.level3 = pivots; break;
      case 4: result.pivotsByLevel.level4 = pivots; break;
    }
    
    // Scan for patterns at different start indices
    for (let startIndex = 0; startIndex <= 1; startIndex++) {
      const { wedge, flag } = findWedgeOrFlag(
        data, pivots, startIndex, allPatterns, colorIndex, zzConfig.level, cfg
      );
      
      if (wedge) {
        result.wedges.push(wedge);
        allPatterns.push(wedge);
        colorIndex++;
        result.wedgeCount++;
        
        if (wedge.direction === 'bullish') {
          result.bullishCount++;
        } else {
          result.bearishCount++;
        }
      }
      
      if (flag) {
        result.flags.push(flag);
        allPatterns.push(flag);
        colorIndex++;
        result.flagCount++;
        
        if (flag.direction === 'bullish') {
          result.bullishCount++;
        } else {
          result.bearishCount++;
        }
      }
    }
  }
  
  // Limit patterns
  if (result.wedges.length > cfg.maxPatterns) {
    result.wedges = result.wedges.slice(-cfg.maxPatterns);
  }
  if (result.flags.length > cfg.maxPatterns) {
    result.flags = result.flags.slice(-cfg.maxPatterns);
  }
  
  return result;
}

/**
 * Get pattern label text
 */
export function getPatternLabel(pattern: WedgePattern | FlagPattern): string {
  if (pattern.type === 'flag') {
    return `Flag (${pattern.direction === 'bullish' ? '↑' : '↓'})`;
  } else {
    return `Wedge ${pattern.subType === 'type1' ? 'T1' : 'T2'} (${pattern.direction === 'bullish' ? '↑' : '↓'})`;
  }
}

export default calculateWedgeFlagMultiZigzag;
