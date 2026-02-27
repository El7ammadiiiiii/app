/**
 * Psychological Support/Resistance [HunterAlgos]
 * Converted from Pine Script
 * 
 * Detects psychological support and resistance zones based on
 * sequential candle patterns and volume.
 */

import type { CandleData } from "@/components/charts/types";

export interface PsychologicalZone {
  startTime: number;
  endTime: number;
  top: number;
  bottom: number;
  level: number; // The key price level
  type: 'support' | 'resistance';
  volume: string;
  active: boolean;
}

export interface PsychologicalSRConfig {
  numberOfZones: number;
  sequentialCandles: number;
  source: 'avg' | 'open' | 'close';
  hideVolume: boolean;
  colors: {
    support: string;
    resistance: string;
    text: string;
  };
}

export const defaultPsychologicalSRConfig: PsychologicalSRConfig = {
  numberOfZones: 3,
  sequentialCandles: 2,
  source: 'avg',
  hideVolume: false,
  colors: {
    support: '#00ffff',    // aqua
    resistance: '#ff0000', // red
    text: '#ffffff'
  }
};

interface PivotData {
  bullishLows: number[];
  bullishOpenings: number[];
  bullishTimes: number[];
  bullishVolumes: string[];
  
  bearishHighs: number[];
  bearishOpenings: number[];
  bearishTimes: number[];
  bearishVolumes: string[];
}

/**
 * Check if we have sequential candles of the same type
 */
function checkSequential(data: CandleData[], startIdx: number, length: number, isBullish: boolean): boolean {
  let count = 0;
  
  for (let i = 0; i < length; i++) {
    const idx = startIdx - i;
    if (idx < 0 || idx >= data.length) return false;
    
    const candle = data[idx];
    const isBullCandle = candle.close > candle.open;
    const isBearCandle = candle.close < candle.open;
    
    if (isBullish && isBullCandle) count++;
    else if (!isBullish && isBearCandle) count++;
  }
  
  return count === length;
}

/**
 * Calculate total volume for sequential candles
 */
function calculateVolume(data: CandleData[], startIdx: number, length: number): string {
  let totalVolume = 0;
  
  for (let i = 0; i < length; i++) {
    const idx = startIdx - i;
    const candle = data[idx];
    if (idx >= 0 && idx < data.length && candle && candle.volume !== undefined) {
      totalVolume += candle.volume;
    }
  }
  
  return Math.abs(totalVolume).toFixed(0);
}

/**
 * Get source price based on config
 */
function getSourcePrice(candle: CandleData, source: 'avg' | 'open' | 'close'): number {
  switch (source) {
    case 'avg':
      return (candle.high + candle.low) / 2;
    case 'close':
      return candle.close;
    case 'open':
      return candle.open;
  }
}

/**
 * Detect psychological support and resistance zones
 */
export function detectPsychologicalSR(
  data: CandleData[],
  config: PsychologicalSRConfig = defaultPsychologicalSRConfig
): PsychologicalZone[] {
  const zones: PsychologicalZone[] = [];
  const thresh = config.sequentialCandles;
  
  const pivotData: PivotData = {
    bullishLows: [],
    bullishOpenings: [],
    bullishTimes: [],
    bullishVolumes: [],
    bearishHighs: [],
    bearishOpenings: [],
    bearishTimes: [],
    bearishVolumes: []
  };
  
  // Scan through data to detect patterns
  for (let i = thresh; i < data.length; i++) {
    const currentCandle = data[i];
    const isBullCandle = currentCandle.close > currentCandle.open;
    const isBearCandle = currentCandle.close < currentCandle.open;
    
    // Check for bullish pattern: sequential bull candles followed by bear candle
    if (checkSequential(data, i - 1, thresh, true) && isBearCandle) {
      const pivotCandle = data[i - thresh];
      const sourcePrice = getSourcePrice(pivotCandle, config.source);
      const volume = calculateVolume(data, i - 1, thresh);
      
      pivotData.bullishLows.unshift(pivotCandle.low);
      pivotData.bullishOpenings.unshift(sourcePrice);
      pivotData.bullishTimes.unshift(i - thresh);
      pivotData.bullishVolumes.unshift(volume);
    }
    
    // Check for bearish pattern: sequential bear candles followed by bull candle
    if (checkSequential(data, i - 1, thresh, false) && isBullCandle) {
      const pivotCandle = data[i - thresh];
      const sourcePrice = getSourcePrice(pivotCandle, config.source);
      const volume = calculateVolume(data, i - 1, thresh);
      
      pivotData.bearishHighs.unshift(pivotCandle.high);
      pivotData.bearishOpenings.unshift(sourcePrice);
      pivotData.bearishTimes.unshift(i - thresh);
      pivotData.bearishVolumes.unshift(volume);
    }
  }
  
  // Remove invalidated zones
  const currentPrice = data[data.length - 1].close;
  
  // Filter support zones (remove if price breaks below)
  const validBullishIndices: number[] = [];
  for (let i = 0; i < pivotData.bullishLows.length; i++) {
    if (currentPrice >= pivotData.bullishLows[i]) {
      validBullishIndices.push(i);
    }
  }
  
  // Filter resistance zones (remove if price breaks above)
  const validBearishIndices: number[] = [];
  for (let i = 0; i < pivotData.bearishHighs.length; i++) {
    if (currentPrice <= pivotData.bearishHighs[i]) {
      validBearishIndices.push(i);
    }
  }
  
  // Create support zones
  const maxSupportZones = Math.min(config.numberOfZones, validBullishIndices.length);
  for (let i = 0; i < maxSupportZones; i++) {
    const idx = validBullishIndices[i];
    const startTime = pivotData.bullishTimes[idx];
    
    zones.push({
      startTime: startTime,
      endTime: data.length - 1,
      top: pivotData.bullishOpenings[idx],
      bottom: pivotData.bullishLows[idx],
      level: pivotData.bullishLows[idx],
      type: 'support',
      volume: pivotData.bullishVolumes[idx],
      active: true
    });
  }
  
  // Create resistance zones
  const maxResistanceZones = Math.min(config.numberOfZones, validBearishIndices.length);
  for (let i = 0; i < maxResistanceZones; i++) {
    const idx = validBearishIndices[i];
    const startTime = pivotData.bearishTimes[idx];
    
    zones.push({
      startTime: startTime,
      endTime: data.length - 1,
      top: pivotData.bearishHighs[idx],
      bottom: pivotData.bearishOpenings[idx],
      level: pivotData.bearishHighs[idx],
      type: 'resistance',
      volume: pivotData.bearishVolumes[idx],
      active: true
    });
  }
  
  // Check for price interaction with zones (mark as inactive if price is inside)
  zones.forEach(zone => {
    const currentOpen = data[data.length - 1].open;
    const currentLow = data[data.length - 1].low;
    
    if (zone.type === 'support') {
      // Deactivate if current candle opens or trades within the zone
      if ((currentOpen > zone.bottom && currentOpen < zone.top) ||
          (currentLow > zone.bottom && currentLow < zone.top)) {
        zone.active = false;
      }
    } else {
      // Deactivate if previous candle opened within the zone
      if (data.length > 1) {
        const prevOpen = data[data.length - 2].open;
        if (prevOpen < zone.bottom && prevOpen > zone.top) {
          zone.active = false;
        }
      }
    }
  });
  
  // Return only active zones
  return zones.filter(z => z.active);
}

/**
 * Get the most recent zones
 */
export function getRecentPsychologicalZones(
  data: CandleData[],
  config: PsychologicalSRConfig = defaultPsychologicalSRConfig
): PsychologicalZone[] {
  return detectPsychologicalSR(data, config);
}
