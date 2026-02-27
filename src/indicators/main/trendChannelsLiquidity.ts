/**
 * Trend Channels With Liquidity Breaks [ChartPrime]
 * Converted from Pine Script to TypeScript for React/ECharts
 * 
 * Features:
 * - Dynamic trend channels based on pivot highs/lows
 * - Down trend (descending) and Up trend (ascending) channels
 * - Liquidity breaks detection with volume scoring
 * - Zone fills with transparency gradients
 * - Center line for mid-channel reference
 */

// ===================== DATA INTERFACE =====================

type Time = string | number | { year: number; month: number; day: number };

export interface CandleData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// ===================== INTERFACES =====================

export interface TrendChannelsConfig {
  length: number;                 // Pivot detection length
  showLastChannel: boolean;       // Show previous channel when new one forms
  waitForBreak: boolean;          // Wait for break before drawing opposite channel
  extendLines: boolean;           // Extend lines to the right
  enableVolumeBG: boolean;        // Enable volume-based background coloring
  topColor: string;               // Top/Resistance color
  centerColor: string;            // Center line color
  bottomColor: string;            // Bottom/Support color
  lineWidth: number;              // Line width
  zoneOpacity: number;            // Zone fill opacity (0-100)
}

export interface PivotPoint {
  index: number;
  price: number;
  type: 'high' | 'low';
}

export interface ChannelLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  width: number;
  style: 'solid' | 'dashed' | 'dotted';
}

export interface ChannelZone {
  topLine: ChannelLine;
  bottomLine: ChannelLine;
  color: string;
  opacity: number;
}

export interface TrendChannel {
  type: 'up' | 'down';
  topLine: ChannelLine;
  bottomLine: ChannelLine;
  centerLine: ChannelLine;
  topZone: ChannelZone;
  bottomZone: ChannelZone;
  slope: number;
  isActive: boolean;
  startIndex: number;
  endIndex: number;
}

export interface LiquidityBreak {
  index: number;
  price: number;
  type: 'bullish' | 'bearish';
  score: 'LV' | 'MV' | 'HV';  // Low/Medium/High Volume
  channelType: 'up' | 'down';
  breakPrice: number;
}

export interface TrendChannelsResult {
  upChannel: TrendChannel | null;
  downChannel: TrendChannel | null;
  liquidityBreaks: LiquidityBreak[];
  pivotHighs: PivotPoint[];
  pivotLows: PivotPoint[];
  activeChannelCount: number;
  volumeScore: number;
}

// ===================== DEFAULT CONFIG =====================

export const defaultTrendChannelsConfig: TrendChannelsConfig = {
  length: 8,
  showLastChannel: true,
  waitForBreak: true,
  extendLines: false,
  enableVolumeBG: false,
  topColor: '#337c4f',
  centerColor: '#888888',
  bottomColor: '#a52d2d',
  lineWidth: 2,
  zoneOpacity: 20
};

// ===================== HELPER FUNCTIONS =====================

/**
 * Calculate atan2 (angle from two points)
 */
function atan2(y: number, x: number): number {
  if (x > 0) {
    return Math.atan(y / x);
  } else if (x < 0 && y >= 0) {
    return Math.atan(y / x) + Math.PI;
  } else if (x < 0 && y < 0) {
    return Math.atan(y / x) - Math.PI;
  } else if (x === 0 && y > 0) {
    return Math.PI / 2;
  } else if (x === 0 && y < 0) {
    return -Math.PI / 2;
  }
  return 0;
}

/**
 * Calculate ATR (Average True Range)
 */
function calculateATR(data: CandleData[], period: number, endIndex: number): number {
  if (endIndex < period) return 0;
  
  let sum = 0;
  for (let i = endIndex - period + 1; i <= endIndex; i++) {
    const high = data[i].high;
    const low = data[i].low;
    const prevClose = i > 0 ? data[i - 1].close : data[i].open;
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    sum += tr;
  }
  
  return sum / period;
}

/**
 * Normalize volume to 0-100 range
 */
function normalizeVolume(data: CandleData[], index: number, lookback: number = 100): number {
  if (!data[index].volume) return 50;
  
  const startIdx = Math.max(0, index - lookback);
  let minVol = Infinity;
  let maxVol = -Infinity;
  
  // First calculate WMA of volume
  let wmaSum = 0;
  let weightSum = 0;
  const wmaPeriod = Math.min(21, index + 1);
  
  for (let i = 0; i < wmaPeriod; i++) {
    const idx = index - i;
    if (idx >= 0 && data[idx].volume !== undefined) {
      const weight = wmaPeriod - i;
      wmaSum += (data[idx].volume || 0) * weight;
      weightSum += weight;
    }
  }
  
  const wmaVol = weightSum > 0 ? wmaSum / weightSum : 0;
  
  // Find min/max over lookback period
  for (let i = startIdx; i <= index; i++) {
    const vol = data[i].volume || 0;
    if (vol < minVol) minVol = vol;
    if (vol > maxVol) maxVol = vol;
  }
  
  if (maxVol === minVol) return 50;
  
  const normalized = ((wmaVol - minVol) / (maxVol - minVol)) * 100;
  return Math.max(0, Math.min(100, normalized));
}

/**
 * Calculate simple moving average (cumulative)
 */
function cumulativeSMA(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Determine liquidity score based on volume
 */
function getLiquidityScore(
  volumeNormalized: number,
  avgVolume: number,
  avgRank: number
): 'LV' | 'MV' | 'HV' {
  if (volumeNormalized < avgVolume) {
    return 'LV'; // Low Volume
  } else if (volumeNormalized > avgVolume && volumeNormalized < avgRank) {
    return 'MV'; // Medium Volume
  } else {
    return 'HV'; // High Volume
  }
}

/**
 * Find pivot highs
 */
function findPivotHighs(data: CandleData[], length: number): PivotPoint[] {
  const pivots: PivotPoint[] = [];
  
  for (let i = length; i < data.length - length; i++) {
    const currentHigh = data[i].high;
    let isPivot = true;
    
    // Check left bars
    for (let j = 1; j <= length; j++) {
      if (data[i - j].high >= currentHigh) {
        isPivot = false;
        break;
      }
    }
    
    // Check right bars
    if (isPivot) {
      for (let j = 1; j <= length; j++) {
        if (data[i + j].high >= currentHigh) {
          isPivot = false;
          break;
        }
      }
    }
    
    if (isPivot) {
      pivots.push({
        index: i,
        price: currentHigh,
        type: 'high'
      });
    }
  }
  
  return pivots;
}

/**
 * Find pivot lows
 */
function findPivotLows(data: CandleData[], length: number): PivotPoint[] {
  const pivots: PivotPoint[] = [];
  
  for (let i = length; i < data.length - length; i++) {
    const currentLow = data[i].low;
    let isPivot = true;
    
    // Check left bars
    for (let j = 1; j <= length; j++) {
      if (data[i - j].low <= currentLow) {
        isPivot = false;
        break;
      }
    }
    
    // Check right bars
    if (isPivot) {
      for (let j = 1; j <= length; j++) {
        if (data[i + j].low <= currentLow) {
          isPivot = false;
          break;
        }
      }
    }
    
    if (isPivot) {
      pivots.push({
        index: i,
        price: currentLow,
        type: 'low'
      });
    }
  }
  
  return pivots;
}

/**
 * Get channel line price at specific bar index
 */
function getLinePriceAt(line: ChannelLine, barIndex: number): number {
  if (line.x2 === line.x1) return line.y1;
  const slope = (line.y2 - line.y1) / (line.x2 - line.x1);
  return line.y1 + slope * (barIndex - line.x1);
}

/**
 * Create a channel line
 */
function createChannelLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width: number,
  style: 'solid' | 'dashed' | 'dotted' = 'solid'
): ChannelLine {
  return { x1, y1, x2, y2, color, width, style };
}

// ===================== MAIN CALCULATION =====================

/**
 * Calculate Trend Channels with Liquidity Breaks
 */
export function calculateTrendChannels(
  data: CandleData[],
  config: Partial<TrendChannelsConfig> = {}
): TrendChannelsResult {
  const cfg = { ...defaultTrendChannelsConfig, ...config };
  
  const result: TrendChannelsResult = {
    upChannel: null,
    downChannel: null,
    liquidityBreaks: [],
    pivotHighs: [],
    pivotLows: [],
    activeChannelCount: 0,
    volumeScore: 0
  };
  
  if (data.length < cfg.length * 3) {
    return result;
  }
  
  // Find all pivots
  const pivotHighs = findPivotHighs(data, cfg.length);
  const pivotLows = findPivotLows(data, cfg.length);
  
  result.pivotHighs = pivotHighs;
  result.pivotLows = pivotLows;
  
  // Track pivot history for channel creation
  let prevPivotHigh: PivotPoint | null = null;
  let lastPivotHigh: PivotPoint | null = null;
  let prevPivotLow: PivotPoint | null = null;
  let lastPivotLow: PivotPoint | null = null;
  
  // Channel state
  let downChannel: TrendChannel | null = null;
  let upChannel: TrendChannel | null = null;
  let downCount = 0;
  let upCount = 0;
  
  // Volume tracking for liquidity score
  const volumeScores: number[] = [];
  
  // Process each bar
  for (let i = cfg.length * 2; i < data.length; i++) {
    // Check for new pivot highs
    const newPivotHigh = pivotHighs.find(p => p.index === i - cfg.length);
    if (newPivotHigh) {
      prevPivotHigh = lastPivotHigh;
      lastPivotHigh = newPivotHigh;
    }
    
    // Check for new pivot lows
    const newPivotLow = pivotLows.find(p => p.index === i - cfg.length);
    if (newPivotLow) {
      prevPivotLow = lastPivotLow;
      lastPivotLow = newPivotLow;
    }
    
    // Calculate ATR for channel width
    const atr10 = calculateATR(data, 10, i) * 6;
    const atr20 = calculateATR(data, 20, i) / 1.5;
    
    // Volume score
    const volScore = normalizeVolume(data, i);
    volumeScores.push(volScore);
    const avgVolume = cumulativeSMA(volumeScores);
    
    // Calculate percentile rank for volume
    const sortedScores = [...volumeScores].sort((a, b) => a - b);
    const rankIdx = Math.floor(sortedScores.length * 0.75);
    const avgRank = cumulativeSMA(sortedScores.slice(rankIdx));
    
    // ========== DOWN TREND CHANNEL (from pivot highs) ==========
    if (prevPivotHigh && lastPivotHigh && 
        prevPivotHigh !== lastPivotHigh &&
        downCount === 0) {
      
      const angle = atan2(
        lastPivotHigh.price - prevPivotHigh.price,
        lastPivotHigh.index - prevPivotHigh.index
      );
      
      // Only create descending channel (angle <= 0)
      const shouldCreate = angle <= 0 && (cfg.waitForBreak ? upCount !== 1 : true);
      
      if (shouldCreate) {
        downCount = 1;
        const offset = atr10;
        const slope = (lastPivotHigh.price - prevPivotHigh.price) / 
                     (lastPivotHigh.index - prevPivotHigh.index);
        
        const x1 = prevPivotHigh.index - cfg.length;
        const x2 = lastPivotHigh.index - cfg.length;
        
        // Top line (at pivot highs + small offset)
        const topLine = createChannelLine(
          x1, prevPivotHigh.price + offset / 7,
          x2, lastPivotHigh.price + offset / 7,
          cfg.topColor, cfg.lineWidth
        );
        
        // Bottom line (below by ATR offset)
        const bottomLine = createChannelLine(
          x1, prevPivotHigh.price - offset - offset / 7,
          x2, lastPivotHigh.price - offset - offset / 7,
          cfg.bottomColor, cfg.lineWidth
        );
        
        // Center line
        const centerLine = createChannelLine(
          x1, (prevPivotHigh.price + prevPivotHigh.price - offset) / 2,
          x2, (lastPivotHigh.price + lastPivotHigh.price - offset) / 2,
          cfg.centerColor, cfg.lineWidth, 'dashed'
        );
        
        // Zone lines for fills
        const topZoneMid = createChannelLine(
          x1, prevPivotHigh.price,
          x2, lastPivotHigh.price,
          'transparent', 1
        );
        const topZoneOuter = createChannelLine(
          x1, prevPivotHigh.price - offset / 7,
          x2, lastPivotHigh.price - offset / 7,
          'transparent', 1
        );
        const bottomZoneMid = createChannelLine(
          x1, prevPivotHigh.price - offset,
          x2, lastPivotHigh.price - offset,
          'transparent', 1
        );
        const bottomZoneOuter = createChannelLine(
          x1, prevPivotHigh.price - offset + offset / 7,
          x2, lastPivotHigh.price - offset + offset / 7,
          'transparent', 1
        );
        
        downChannel = {
          type: 'down',
          topLine,
          bottomLine,
          centerLine,
          topZone: {
            topLine,
            bottomLine: topZoneMid,
            color: cfg.topColor,
            opacity: cfg.zoneOpacity
          },
          bottomZone: {
            topLine: bottomZoneMid,
            bottomLine,
            color: cfg.bottomColor,
            opacity: cfg.zoneOpacity
          },
          slope,
          isActive: true,
          startIndex: x1,
          endIndex: x2
        };
        
        // Hide previous up channel if not showing last
        if (!cfg.showLastChannel && upChannel) {
          upChannel.isActive = false;
        }
      }
    }
    
    // ========== UP TREND CHANNEL (from pivot lows) ==========
    if (prevPivotLow && lastPivotLow && 
        prevPivotLow !== lastPivotLow &&
        upCount === 0) {
      
      const angle = atan2(
        lastPivotLow.price - prevPivotLow.price,
        lastPivotLow.index - prevPivotLow.index
      );
      
      // Only create ascending channel (angle >= 0)
      const shouldCreate = angle >= 0 && (cfg.waitForBreak ? downCount !== 1 : true);
      
      if (shouldCreate) {
        upCount = 1;
        const offset = atr10;
        const slope = (lastPivotLow.price - prevPivotLow.price) / 
                     (lastPivotLow.index - prevPivotLow.index);
        
        const x1 = prevPivotLow.index - cfg.length;
        const x2 = lastPivotLow.index - cfg.length;
        
        // Top line (above by ATR offset)
        const topLine = createChannelLine(
          x1, prevPivotLow.price + offset + offset / 7,
          x2, lastPivotLow.price + offset + offset / 7,
          cfg.topColor, cfg.lineWidth
        );
        
        // Bottom line (at pivot lows - small offset)
        const bottomLine = createChannelLine(
          x1, prevPivotLow.price - offset / 7,
          x2, lastPivotLow.price - offset / 7,
          cfg.bottomColor, cfg.lineWidth
        );
        
        // Center line
        const centerLine = createChannelLine(
          x1, (prevPivotLow.price + prevPivotLow.price + offset) / 2,
          x2, (lastPivotLow.price + lastPivotLow.price + offset) / 2,
          cfg.centerColor, cfg.lineWidth, 'dashed'
        );
        
        // Zone lines
        const topZoneMid = createChannelLine(
          x1, prevPivotLow.price + offset,
          x2, lastPivotLow.price + offset,
          'transparent', 1
        );
        const bottomZoneMid = createChannelLine(
          x1, prevPivotLow.price,
          x2, lastPivotLow.price,
          'transparent', 1
        );
        
        upChannel = {
          type: 'up',
          topLine,
          bottomLine,
          centerLine,
          topZone: {
            topLine,
            bottomLine: topZoneMid,
            color: cfg.topColor,
            opacity: cfg.zoneOpacity
          },
          bottomZone: {
            topLine: bottomZoneMid,
            bottomLine,
            color: cfg.bottomColor,
            opacity: cfg.zoneOpacity
          },
          slope,
          isActive: true,
          startIndex: x1,
          endIndex: x2
        };
        
        // Hide previous down channel if not showing last
        if (!cfg.showLastChannel && downChannel) {
          downChannel.isActive = false;
        }
      }
    }
    
    // ========== EXTEND CHANNELS & CHECK FOR BREAKS ==========
    
    // Extend down channel
    if (downCount === 1 && downChannel && !cfg.extendLines) {
      // Extend lines to current bar
      const slope = downChannel.slope;
      downChannel.topLine.x2 = i;
      downChannel.topLine.y2 = downChannel.topLine.y2 + slope;
      downChannel.bottomLine.x2 = i;
      downChannel.bottomLine.y2 = downChannel.bottomLine.y2 + slope;
      downChannel.centerLine.x2 = i;
      downChannel.centerLine.y2 = downChannel.centerLine.y2 + slope;
      downChannel.endIndex = i;
      
      // Check for break above top
      const topPrice = getLinePriceAt(downChannel.topLine, i);
      if (data[i].low > topPrice) {
        downCount = 0;
        const liquidityScore = getLiquidityScore(volScore, avgVolume, avgRank);
        result.liquidityBreaks.push({
          index: i,
          price: topPrice - atr20,
          type: 'bullish',
          score: liquidityScore,
          channelType: 'down',
          breakPrice: topPrice
        });
      }
      
      // Check for break below bottom
      const bottomPrice = getLinePriceAt(downChannel.bottomLine, i);
      if (data[i].high < bottomPrice) {
        downCount = 0;
        const liquidityScore = getLiquidityScore(volScore, avgVolume, avgRank);
        result.liquidityBreaks.push({
          index: i,
          price: bottomPrice + atr20,
          type: 'bearish',
          score: liquidityScore,
          channelType: 'down',
          breakPrice: bottomPrice
        });
      }
    }
    
    // Extend up channel
    if (upCount === 1 && upChannel && !cfg.extendLines) {
      // Extend lines to current bar
      const slope = upChannel.slope;
      upChannel.topLine.x2 = i;
      upChannel.topLine.y2 = upChannel.topLine.y2 + slope;
      upChannel.bottomLine.x2 = i;
      upChannel.bottomLine.y2 = upChannel.bottomLine.y2 + slope;
      upChannel.centerLine.x2 = i;
      upChannel.centerLine.y2 = upChannel.centerLine.y2 + slope;
      upChannel.endIndex = i;
      
      // Check for break above top
      const topPrice = getLinePriceAt(upChannel.topLine, i);
      if (data[i].low > topPrice) {
        upCount = 0;
        const liquidityScore = getLiquidityScore(volScore, avgVolume, avgRank);
        result.liquidityBreaks.push({
          index: i,
          price: topPrice - atr20,
          type: 'bullish',
          score: liquidityScore,
          channelType: 'up',
          breakPrice: topPrice
        });
      }
      
      // Check for break below bottom
      const bottomPrice = getLinePriceAt(upChannel.bottomLine, i);
      if (data[i].high < bottomPrice) {
        upCount = 0;
        const liquidityScore = getLiquidityScore(volScore, avgVolume, avgRank);
        result.liquidityBreaks.push({
          index: i,
          price: bottomPrice + atr20,
          type: 'bearish',
          score: liquidityScore,
          channelType: 'up',
          breakPrice: bottomPrice
        });
      }
    }
  }
  
  // Set final results
  result.downChannel = downChannel;
  result.upChannel = upChannel;
  result.activeChannelCount = (downChannel?.isActive ? 1 : 0) + (upChannel?.isActive ? 1 : 0);
  result.volumeScore = volumeScores.length > 0 ? volumeScores[volumeScores.length - 1] : 0;
  
  return result;
}

// ===================== UTILITY EXPORTS =====================

/**
 * Get liquidity score color
 */
export function getLiquidityColor(score: 'LV' | 'MV' | 'HV'): string {
  switch (score) {
    case 'LV': return '#888888';  // Gray for low volume
    case 'MV': return '#f59e0b';  // Orange for medium volume
    case 'HV': return '#22c55e';  // Green for high volume
    default: return '#888888';
  }
}

/**
 * Get channel description
 */
export function getChannelDescription(channel: TrendChannel): string {
  const direction = channel.type === 'up' ? 'Ascending' : 'Descending';
  const status = channel.isActive ? 'Active' : 'Broken';
  return `${direction} Channel (${status})`;
}

/**
 * Get break description
 */
export function getBreakDescription(breakInfo: LiquidityBreak): string {
  const direction = breakInfo.type === 'bullish' ? '⬆️ Bullish' : '⬇️ Bearish';
  return `${direction} Break [${breakInfo.score}]`;
}

/**
 * Calculate channel width at specific index
 */
export function getChannelWidth(channel: TrendChannel, index: number): number {
  const topPrice = getLinePriceAt(channel.topLine, index);
  const bottomPrice = getLinePriceAt(channel.bottomLine, index);
  return Math.abs(topPrice - bottomPrice);
}

/**
 * Check if price is inside channel
 */
export function isPriceInChannel(channel: TrendChannel, index: number, price: number): boolean {
  const topPrice = getLinePriceAt(channel.topLine, index);
  const bottomPrice = getLinePriceAt(channel.bottomLine, index);
  return price <= topPrice && price >= bottomPrice;
}

/**
 * Get channel zone (top, center, bottom)
 */
export function getChannelZone(
  channel: TrendChannel, 
  index: number, 
  price: number
): 'above' | 'top' | 'center' | 'bottom' | 'below' {
  const topPrice = getLinePriceAt(channel.topLine, index);
  const bottomPrice = getLinePriceAt(channel.bottomLine, index);
  const centerPrice = getLinePriceAt(channel.centerLine, index);
  
  if (price > topPrice) return 'above';
  if (price < bottomPrice) return 'below';
  if (price > centerPrice) return 'top';
  if (price < centerPrice) return 'bottom';
  return 'center';
}
