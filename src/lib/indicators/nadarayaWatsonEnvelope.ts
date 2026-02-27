/**
 * Nadaraya-Watson Envelope [LuxAlgo]
 * Converted from Pine Script v5
 * 
 * Kernel Regression based envelope using Gaussian weights
 * Provides smooth adaptive bands with crossover signals
 */

import type { CandleData } from "@/components/charts/types";

export interface NadarayaWatsonConfig {
  bandwidth: number;
  multiplier: number;
  repaint: boolean;
  upColor: string;
  downColor: string;
}

export const defaultNadarayaWatsonConfig: NadarayaWatsonConfig = {
  bandwidth: 8,
  multiplier: 3,
  repaint: true,
  upColor: '#00897B',
  downColor: '#D32F2F'
};

export interface NWEPoint {
  index: number;
  value: number;
  upper: number;
  lower: number;
}

export interface NWESignal {
  index: number;
  type: 'crossover' | 'crossunder';
  price: number;
}

export interface NadarayaWatsonResult {
  points: NWEPoint[];
  signals: NWESignal[];
  currentUpper: number;
  currentLower: number;
  currentEstimate: number;
}

/**
 * Gaussian kernel function
 */
function gaussianKernel(x: number, bandwidth: number): number {
  return Math.exp(-(Math.pow(x, 2) / (bandwidth * bandwidth * 2)));
}

/**
 * Calculate Nadaraya-Watson Envelope
 */
export function calculateNadarayaWatsonEnvelope(
  data: CandleData[],
  config: NadarayaWatsonConfig = defaultNadarayaWatsonConfig
): NadarayaWatsonResult {
  const n = data.length;
  const lookback = Math.min(500, n);
  const points: NWEPoint[] = [];
  const signals: NWESignal[] = [];
  
  if (config.repaint) {
    // Repainting mode - recalculate everything on each bar
    const estimates: number[] = [];
    let sae = 0; // Sum of Absolute Errors
    
    // Calculate weighted mean for each point
    for (let i = 0; i < lookback && i < n; i++) {
      const targetIdx = n - 1 - i;
      let sum = 0;
      let sumWeights = 0;
      
      // Weighted kernel regression
      for (let j = 0; j < lookback && j < n; j++) {
        const sourceIdx = n - 1 - j;
        const weight = gaussianKernel(i - j, config.bandwidth);
        sum += data[sourceIdx].close * weight;
        sumWeights += weight;
      }
      
      const estimate = sum / sumWeights;
      estimates.push(estimate);
      
      // Calculate absolute error
      sae += Math.abs(data[targetIdx].close - estimate);
    }
    
    // Calculate Mean Absolute Error
    const mae = (sae / lookback) * config.multiplier;
    
    // Create points and detect signals
    for (let i = 0; i < estimates.length; i++) {
      const dataIdx = n - 1 - i;
      const estimate = estimates[i];
      const upper = estimate + mae;
      const lower = estimate - mae;
      
      points.push({
        index: dataIdx,
        value: estimate,
        upper,
        lower
      });
      
      // Detect crossovers/crossunders
      if (i < estimates.length - 1) {
        const nextDataIdx = dataIdx + 1;
        if (nextDataIdx < n) {
          const currentPrice = data[dataIdx].close;
          const nextPrice = data[nextDataIdx].close;
          const nextEstimate = estimates[i + 1];
          const nextUpper = nextEstimate + mae;
          const nextLower = nextEstimate - mae;
          
          // Crossunder lower band (bullish)
          if (currentPrice < lower && nextPrice >= nextLower) {
            signals.push({
              index: dataIdx,
              type: 'crossunder',
              price: data[dataIdx].low
            });
          }
          
          // Crossover upper band (bearish)
          if (currentPrice > upper && nextPrice <= nextUpper) {
            signals.push({
              index: dataIdx,
              type: 'crossover',
              price: data[dataIdx].high
            });
          }
        }
      }
    }
    
    const currentEstimate = estimates[0] || data[n - 1].close;
    const currentMAE = (sae / lookback) * config.multiplier;
    
    return {
      points: points.reverse(),
      signals,
      currentEstimate,
      currentUpper: currentEstimate + currentMAE,
      currentLower: currentEstimate - currentMAE
    };
    
  } else {
    // Non-repainting mode - use endpoint method
    const coefs: number[] = [];
    let den = 0;
    
    // Pre-calculate Gaussian weights
    for (let i = 0; i < lookback; i++) {
      const weight = gaussianKernel(i, config.bandwidth);
      coefs.push(weight);
      den += weight;
    }
    
    // Calculate estimates for all bars
    for (let barIdx = 0; barIdx < n; barIdx++) {
      let out = 0;
      
      for (let i = 0; i < lookback && barIdx - i >= 0; i++) {
        out += data[barIdx - i].close * coefs[i];
      }
      
      out /= den;
      
      // Calculate MAE
      let mae = 0;
      let count = 0;
      for (let i = 0; i < lookback && barIdx - i >= 0; i++) {
        mae += Math.abs(data[barIdx - i].close - out);
        count++;
      }
      mae = (mae / count) * config.multiplier;
      
      const upper = out + mae;
      const lower = out - mae;
      
      points.push({
        index: barIdx,
        value: out,
        upper,
        lower
      });
      
      // Detect crossovers/crossunders
      if (barIdx > 0) {
        const prevPoint = points[barIdx - 1];
        const currentPrice = data[barIdx].close;
        const prevPrice = data[barIdx - 1].close;
        
        // Crossunder lower band (bullish)
        if (prevPrice < prevPoint.lower && currentPrice >= lower) {
          signals.push({
            index: barIdx,
            type: 'crossunder',
            price: data[barIdx].low
          });
        }
        
        // Crossover upper band (bearish)
        if (prevPrice > prevPoint.upper && currentPrice <= upper) {
          signals.push({
            index: barIdx,
            type: 'crossover',
            price: data[barIdx].high
          });
        }
      }
    }
    
    const lastPoint = points[points.length - 1];
    
    return {
      points,
      signals,
      currentEstimate: lastPoint.value,
      currentUpper: lastPoint.upper,
      currentLower: lastPoint.lower
    };
  }
}
