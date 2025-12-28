/**
 * RSI Cyclic Smoothed (cRSI) [whentotrade]
 * Converted from Pine Script v4
 * 
 * Source: "Decoding The Hidden Market Rhythm - Part 1: Dynamic Cycles" (2017)
 * Chapter 4: Fine-tuning technical indicators
 * 
 * License: Creative Commons Attribution 4.0 International (CC BY 4.0)
 * © whentotrade / Lars von Thienen
 */

import { CandleData } from "@/components/charts/TradingChart";

export interface CyclicRSIConfig {
  dominantCycle: number;      // Length of dominant cycle
  vibration: number;          // Vibration factor for smoothing
  leveling: number;           // Percentage for band calculation (0-100)
}

export const defaultCyclicRSIConfig: CyclicRSIConfig = {
  dominantCycle: 20,
  vibration: 10,
  leveling: 10
};

export interface CyclicRSIResult {
  crsi: (number | null)[];
  upperBand: (number | null)[];
  lowerBand: (number | null)[];
  rsi: (number | null)[];
}

/**
 * Calculate RMA (Running Moving Average / Wilder's smoothing)
 */
function rma(values: number[], period: number): number[] {
  const result: number[] = [];
  let sum = 0;
  
  for (let i = 0; i < values.length; i++) {
    if (i < period) {
      sum += values[i];
      if (i === period - 1) {
        result.push(sum / period);
      } else {
        result.push(0);
      }
    } else {
      const prev = result[result.length - 1];
      const alpha = 1 / period;
      result.push(alpha * values[i] + (1 - alpha) * prev);
    }
  }
  
  return result;
}

/**
 * Calculate Cyclic RSI
 */
export function calculateCyclicRSI(
  data: CandleData[],
  config: CyclicRSIConfig = defaultCyclicRSIConfig
): CyclicRSIResult {
  const n = data.length;
  const cyclelen = Math.floor(config.dominantCycle / 2);
  const cyclicMemory = config.dominantCycle * 2;
  
  // Calculate price changes
  const changes: number[] = [];
  for (let i = 0; i < n; i++) {
    if (i === 0) {
      changes.push(0);
    } else {
      changes.push(data[i].close - data[i - 1].close);
    }
  }
  
  // Separate gains and losses
  const gains = changes.map(c => Math.max(c, 0));
  const losses = changes.map(c => Math.max(-c, 0));
  
  // Calculate RMA of gains and losses
  const upRMA = rma(gains, cyclelen);
  const downRMA = rma(losses, cyclelen);
  
  // Calculate standard RSI
  const rsi: number[] = [];
  for (let i = 0; i < n; i++) {
    if (i < cyclelen) {
      rsi.push(50); // Default value
    } else {
      const up = upRMA[i];
      const down = downRMA[i];
      
      if (down === 0) {
        rsi.push(100);
      } else if (up === 0) {
        rsi.push(0);
      } else {
        rsi.push(100 - 100 / (1 + up / down));
      }
    }
  }
  
  // Apply cyclic smoothing
  const torque = 2.0 / (config.vibration + 1);
  const phasingLag = Math.floor((config.vibration - 1) / 2);
  
  const crsi: number[] = [];
  for (let i = 0; i < n; i++) {
    if (i < phasingLag) {
      crsi.push(rsi[i]);
    } else {
      const current = rsi[i];
      const lagged = rsi[i - phasingLag];
      const prev = i > 0 ? crsi[i - 1] : current;
      
      const smoothed = torque * (2 * current - lagged) + (1 - torque) * prev;
      crsi.push(smoothed);
    }
  }
  
  // Calculate dynamic bands
  const upperBand: number[] = [];
  const lowerBand: number[] = [];
  
  const aperc = config.leveling / 100;
  
  for (let i = 0; i < n; i++) {
    if (i < cyclicMemory) {
      upperBand.push(70);
      lowerBand.push(30);
      continue;
    }
    
    // Find max and min in cyclic memory window
    let lmax = -999999;
    let lmin = 999999;
    
    for (let j = 0; j < cyclicMemory; j++) {
      const idx = i - j;
      if (idx >= 0 && crsi[idx] !== null && crsi[idx] !== undefined) {
        if (crsi[idx] > lmax) lmax = crsi[idx];
        if (crsi[idx] < lmin) lmin = crsi[idx];
      }
    }
    
    const mstep = (lmax - lmin) / 100;
    
    // Calculate lower band
    let db = lmin;
    for (let steps = 0; steps <= 100; steps++) {
      const testvalue = lmin + mstep * steps;
      let below = 0;
      
      for (let m = 0; m < cyclicMemory; m++) {
        const idx = i - m;
        if (idx >= 0 && crsi[idx] < testvalue) {
          below++;
        }
      }
      
      const ratio = below / cyclicMemory;
      if (ratio >= aperc) {
        db = testvalue;
        break;
      }
    }
    
    // Calculate upper band
    let ub = lmax;
    for (let steps = 0; steps <= 100; steps++) {
      const testvalue = lmax - mstep * steps;
      let above = 0;
      
      for (let m = 0; m < cyclicMemory; m++) {
        const idx = i - m;
        if (idx >= 0 && crsi[idx] >= testvalue) {
          above++;
        }
      }
      
      const ratio = above / cyclicMemory;
      if (ratio >= aperc) {
        ub = testvalue;
        break;
      }
    }
    
    upperBand.push(ub);
    lowerBand.push(db);
  }
  
  // Convert to nullable arrays for consistency
  return {
    crsi: crsi.map(v => v),
    upperBand: upperBand.map(v => v),
    lowerBand: lowerBand.map(v => v),
    rsi: rsi.map(v => v)
  };
}

/**
 * Detect crossover signals
 */
export function detectCyclicRSISignals(result: CyclicRSIResult): Array<{
  index: number;
  type: 'crossover_upper' | 'crossunder_lower';
  value: number;
}> {
  const signals: Array<{
    index: number;
    type: 'crossover_upper' | 'crossunder_lower';
    value: number;
  }> = [];
  
  for (let i = 1; i < result.crsi.length; i++) {
    const current = result.crsi[i];
    const prev = result.crsi[i - 1];
    const upper = result.upperBand[i];
    const lower = result.lowerBand[i];
    
    if (current === null || prev === null || upper === null || lower === null) continue;
    
    // Crossover upper band (bearish)
    if (prev < upper && current >= upper) {
      signals.push({
        index: i,
        type: 'crossover_upper',
        value: current
      });
    }
    
    // Crossunder lower band (bullish)
    if (prev > lower && current <= lower) {
      signals.push({
        index: i,
        type: 'crossunder_lower',
        value: current
      });
    }
  }
  
  return signals;
}
