/**
 * Price Heat Meter [ChartPrime]
 * Converted from Pine Script v6
 * 
 * Visualizes price position within its recent range using a heat gradient.
 * Shows how "hot" or "cold" the price is relative to highs/lows.
 */

import type { CandleData } from "@/components/charts/types";


// ============ TYPES ============

export interface HeatMeterConfig {
  length: number;
  colors: {
    cold: string;
    mid: string;
    hot: string;
  };
  showHeatCandles: boolean;
  showExtremeLevels: boolean;
  showLabels: boolean;
  labelThreshold: number; // Default 40 bars
}

export const defaultHeatMeterConfig: HeatMeterConfig = {
  length: 50,
  colors: {
    cold: '#00ffff',   // aqua
    mid: '#ffff00',    // yellow
    hot: '#ff0000'     // red
  },
  showHeatCandles: true,
  showExtremeLevels: true,
  showLabels: true,
  labelThreshold: 40
};

export interface HeatCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  heatColor: string;
  normPercent: number;
}

export interface ExtremeLevel {
  type: 'upper' | 'lower';
  price: number;
  startBar: number;
  startTime: number;
  endBar: number;
  endTime: number;
  count: number;
  color: string;
  opacity: number;
}

export interface HeatLabel {
  type: 'upper' | 'lower';
  bar: number;
  timestamp: number;
  price: number;
  heatPercent: number;
  color: string;
}

export interface HeatMeterResult {
  candles: HeatCandle[];
  extremeLevels: ExtremeLevel[];
  labels: HeatLabel[];
  currentHeat: number;
  currentHeatColor: string;
  meterData: MeterSegment[];
  meterPosition: number;
}

export interface MeterSegment {
  index: number;
  color: string;
  isActive: boolean;
}

// ============ COLOR UTILITIES ============

/**
 * Parse hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

/**
 * Convert RGB to hex
 */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Create gradient color between two colors
 */
function colorFromGradient(value: number, min: number, max: number, colorStart: string, colorEnd: string): string {
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
  
  const start = hexToRgb(colorStart);
  const end = hexToRgb(colorEnd);
  
  const r = start.r + ratio * (end.r - start.r);
  const g = start.g + ratio * (end.g - start.g);
  const b = start.b + ratio * (end.b - start.b);
  
  return rgbToHex(r, g, b);
}

/**
 * Create gradient with opacity
 */
function colorWithOpacity(hex: string, opacity: number): string {
  const rgb = hexToRgb(hex);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
}

/**
 * Get heat color based on normalized percentage
 */
function getHeatColor(normPercent: number, colors: HeatMeterConfig['colors']): string {
  if (normPercent < 50) {
    return colorFromGradient(normPercent, 0, 50, colors.cold, colors.mid);
  } else {
    return colorFromGradient(normPercent, 50, 100, colors.mid, colors.hot);
  }
}

// ============ CALCULATIONS ============

/**
 * Calculate highest high over period
 */
function highest(data: CandleData[], endIndex: number, length: number): number {
  let max = -Infinity;
  const startIdx = Math.max(0, endIndex - length + 1);
  
  for (let i = startIdx; i <= endIndex; i++) {
    if (data[i].high > max) {
      max = data[i].high;
    }
  }
  
  return max;
}

/**
 * Calculate lowest low over period
 */
function lowest(data: CandleData[], endIndex: number, length: number): number {
  let min = Infinity;
  const startIdx = Math.max(0, endIndex - length + 1);
  
  for (let i = startIdx; i <= endIndex; i++) {
    if (data[i].low < min) {
      min = data[i].low;
    }
  }
  
  return min;
}

// ============ MAIN CALCULATION ============

/**
 * Calculate Price Heat Meter
 */
export function calculatePriceHeatMeter(
  data: CandleData[],
  config: HeatMeterConfig = defaultHeatMeterConfig
): HeatMeterResult {
  const candles: HeatCandle[] = [];
  const extremeLevels: ExtremeLevel[] = [];
  const labels: HeatLabel[] = [];
  
  if (data.length < config.length) {
    return {
      candles,
      extremeLevels,
      labels,
      currentHeat: 50,
      currentHeatColor: config.colors.mid,
      meterData: [],
      meterPosition: 25
    };
  }
  
  // State variables
  let countUp = 0;
  let upper = 0;
  let countDn = 0;
  let lower = 0;
  let upperIndx = 0;
  let upperHeat = 0;
  let lowerIndx = 0;
  let lowerHeat = 0;
  
  let prevUpper = 0;
  let prevLower = 0;
  let prevH = 0;
  let prevL = 0;
  
  // Current active extreme levels
  let activeUpperLevel: ExtremeLevel | null = null;
  let activeLowerLevel: ExtremeLevel | null = null;
  
  for (let i = config.length - 1; i < data.length; i++) {
    const candle = data[i];
    
    // Calculate highest and lowest
    const h = highest(data, i, config.length);
    const l = lowest(data, i, config.length);
    
    // Update upper extreme
    if (h === candle.high) {
      upper = h;
    }
    
    if (upper !== prevUpper) {
      countUp = 0;
      
      // Close previous upper level if exists
      if (activeUpperLevel && i > 0) {
        activeUpperLevel.endBar = i - 1;
        activeUpperLevel.endTime = Number(data[i - 1].time);
        extremeLevels.push(activeUpperLevel);
      }
      
      // Start new upper level
      activeUpperLevel = {
        type: 'upper',
        price: upper,
        startBar: i,
        startTime: Number(candle.time),
        endBar: i,
        endTime: Number(candle.time),
        count: 0,
        color: config.colors.hot,
        opacity: 1
      };
    } else {
      countUp += 1;
      if (activeUpperLevel) {
        activeUpperLevel.count = countUp;
        activeUpperLevel.endBar = i;
        activeUpperLevel.endTime = candle.time;
        // Fade opacity as count increases
        activeUpperLevel.opacity = Math.max(0, 1 - countUp / 100);
      }
    }
    
    // Update lower extreme
    if (l === candle.low) {
      lower = l;
    }
    
    if (lower !== prevLower) {
      countDn = 0;
      
      // Close previous lower level if exists
      if (activeLowerLevel && i > 0) {
        activeLowerLevel.endBar = i - 1;
        activeLowerLevel.endTime = Number(data[i - 1].time);
        extremeLevels.push(activeLowerLevel);
      }
      
      // Start new lower level
      activeLowerLevel = {
        type: 'lower',
        price: lower,
        startBar: i,
        startTime: Number(candle.time),
        endBar: i,
        endTime: Number(candle.time),
        count: 0,
        color: config.colors.cold,
        opacity: 1
      };
    } else {
      countDn += 1;
      if (activeLowerLevel) {
        activeLowerLevel.count = countDn;
        activeLowerLevel.endBar = i;
        activeLowerLevel.endTime = candle.time;
        // Fade opacity as count increases
        activeLowerLevel.opacity = Math.max(0, 1 - countDn / 100);
      }
    }
    
    // Calculate normalized position (0-100)
    const range = h - l;
    const norm = range > 0 ? (candle.close - l) / range : 0.5;
    const normPercent = norm * 100;
    
    // Get heat color
    const heatColor = getHeatColor(normPercent, config.colors);
    
    // Add heat candle
    candles.push({
      timestamp: Number(candle.time),
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      heatColor,
      normPercent
    });
    
    // Check for upper label
    if (i > 0 && prevH === data[i - 1].high && candle.high < h) {
      upperIndx = i - 1;
      upperHeat = normPercent;
    }
    if (countUp === config.labelThreshold && config.showLabels) {
      labels.push({
        type: 'upper',
        bar: upperIndx,
        timestamp: Number(data[upperIndx]?.time ?? candle.time),
        price: upper,
        heatPercent: upperHeat,
        color: config.colors.hot
      });
    }
    
    // Check for lower label
    if (i > 0 && prevL === data[i - 1].low && candle.low > l) {
      lowerIndx = i - 1;
      lowerHeat = normPercent;
    }
    if (countDn === config.labelThreshold && config.showLabels) {
      labels.push({
        type: 'lower',
        bar: lowerIndx,
        timestamp: Number(data[lowerIndx]?.time ?? candle.time),
        price: lower,
        heatPercent: lowerHeat,
        color: config.colors.cold
      });
    }
    
    // Store previous values
    prevUpper = upper;
    prevLower = lower;
    prevH = h;
    prevL = l;
  }
  
  // Add final active levels
  if (activeUpperLevel) {
    extremeLevels.push(activeUpperLevel);
  }
  if (activeLowerLevel) {
    extremeLevels.push(activeLowerLevel);
  }
  
  // Current heat values
  const lastCandle = candles[candles.length - 1];
  const currentHeat = lastCandle?.normPercent || 50;
  const currentHeatColor = lastCandle?.heatColor || config.colors.mid;
  
  // Generate meter segments (0-50)
  const meterData: MeterSegment[] = [];
  const meterPosition = Math.round(currentHeat / 2); // Scale to 0-50
  
  for (let i = 0; i <= 50; i++) {
    const segmentColor = i < 25 
      ? colorFromGradient(i, 0, 25, config.colors.cold, config.colors.mid)
      : colorFromGradient(i, 25, 50, config.colors.mid, config.colors.hot);
    
    meterData.push({
      index: i,
      color: segmentColor,
      isActive: i === meterPosition
    });
  }
  
  return {
    candles,
    extremeLevels,
    labels,
    currentHeat,
    currentHeatColor,
    meterData,
    meterPosition
  };
}

/**
 * Get heat description
 */
export function getHeatDescription(normPercent: number): string {
  if (normPercent >= 90) return 'Extremely Hot 🔥🔥';
  if (normPercent >= 75) return 'Very Hot 🔥';
  if (normPercent >= 60) return 'Warm 🌡️';
  if (normPercent >= 40) return 'Neutral ⚖️';
  if (normPercent >= 25) return 'Cool 💨';
  if (normPercent >= 10) return 'Cold ❄️';
  return 'Extremely Cold ❄️❄️';
}

/**
 * Get trading signal based on heat
 */
export function getHeatSignal(normPercent: number): {
  signal: 'overbought' | 'neutral' | 'oversold';
  strength: number;
  description: string;
} {
  if (normPercent >= 80) {
    return {
      signal: 'overbought',
      strength: (normPercent - 80) / 20,
      description: 'Price near range high - potential resistance'
    };
  } else if (normPercent <= 20) {
    return {
      signal: 'oversold',
      strength: (20 - normPercent) / 20,
      description: 'Price near range low - potential support'
    };
  }
  return {
    signal: 'neutral',
    strength: 0,
    description: 'Price in middle of range'
  };
}
