/**
 * ChronoPulse MS-MACD Resonance Strategy
 * Converted from Pine Script v6
 */

import { CandleData } from "@/components/charts/TradingChart";

export interface ChronoPulseConfig {
  structureLeft: number;
  structureRight: number;
  structureBreakBuff: number;
  macdFast: number;
  macdSlow: number;
  macdSignal: number;
  fusionEnabled: boolean;
  fusionFast: number;
  fusionSlow: number;
  fusionSignal: number;
  biasEmaLen: number;
  trendGuideLen: number;
  enableVolumeGate: boolean;
  volumeLookback: number;
  volumeThreshold: number;
  enableQualityGate: boolean;
  qualityThreshold: number;
  atrLen: number;
  stopAtrMult: number;
  tpAtrMult: number;
  trailTriggerAtr: number;
  trailDistanceAtr: number;
  minAtrFilter: number;
  enableCryptoMode: boolean;
  cryptoFastLen: number;
  cryptoSlowLen: number;
}

export const defaultChronoPulseConfig: ChronoPulseConfig = {
  structureLeft: 3,
  structureRight: 3,
  structureBreakBuff: 0.0015,
  macdFast: 12,
  macdSlow: 26,
  macdSignal: 9,
  fusionEnabled: true,
  fusionFast: 8,
  fusionSlow: 21,
  fusionSignal: 5,
  biasEmaLen: 55,
  trendGuideLen: 34,
  enableVolumeGate: true,
  volumeLookback: 20,
  volumeThreshold: 1.4,
  enableQualityGate: true,
  qualityThreshold: 0.62,
  atrLen: 14,
  stopAtrMult: 1.5,
  tpAtrMult: 3.0,
  trailTriggerAtr: 1.0,
  trailDistanceAtr: 1.5,
  minAtrFilter: 0.0,
  enableCryptoMode: false,
  cryptoFastLen: 34,
  cryptoSlowLen: 144
};

export interface StructureEvent {
  index: number;
  type: 'choch_bull' | 'choch_bear' | 'bos_bull' | 'bos_bear';
  price: number;
}

export interface TradeSignal {
  index: number;
  type: 'long' | 'short';
  price: number;
  stop: number;
  target: number;
  qualityScore: number;
}

export interface ChronoPulseResult {
  directionalEma: (number | null)[];
  trendGuide: (number | null)[];
  structureEvents: StructureEvent[];
  signals: TradeSignal[];
  structureBias: number[];
  qualityScore: (number | null)[];
  atr: (number | null)[];
  volumeIntensity: (number | null)[];
}

function pivotHigh(data: CandleData[], index: number, left: number, right: number): number | null {
  if (index < left || index >= data.length - right) return null;
  const pivot = data[index].high;
  for (let i = 1; i <= left; i++) {
    if (data[index - i].high >= pivot) return null;
  }
  for (let i = 1; i <= right; i++) {
    if (index + i >= data.length) return null;
    if (data[index + i].high >= pivot) return null;
  }
  return pivot;
}

function pivotLow(data: CandleData[], index: number, left: number, right: number): number | null {
  if (index < left || index >= data.length - right) return null;
  const pivot = data[index].low;
  for (let i = 1; i <= left; i++) {
    if (data[index - i].low <= pivot) return null;
  }
  for (let i = 1; i <= right; i++) {
    if (index + i >= data.length) return null;
    if (data[index + i].low <= pivot) return null;
  }
  return pivot;
}

function ema(data: number[], period: number): number[] {
  const result: number[] = [];
  const k = 2 / (period + 1);
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(data[i]);
    } else {
      result.push(data[i] * k + result[i - 1] * (1 - k));
    }
  }
  return result;
}

function macd(data: number[], fast: number, slow: number, signal: number): { line: number[]; sig: number[]; hist: number[] } {
  const fastEma = ema(data, fast);
  const slowEma = ema(data, slow);
  const line = fastEma.map((v, i) => v - slowEma[i]);
  const sig = ema(line, signal);
  const hist = line.map((v, i) => v - sig[i]);
  return { line, sig, hist };
}

function atr(data: CandleData[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(data[i].high - data[i].low);
    } else {
      const tr = Math.max(
        data[i].high - data[i].low,
        Math.abs(data[i].high - data[i - 1].close),
        Math.abs(data[i].low - data[i - 1].close)
      );
      if (i < period) {
        result.push(tr);
      } else {
        result.push((result[i - 1] * (period - 1) + tr) / period);
      }
    }
  }
  return result;
}

export function calculateChronoPulse(
  data: CandleData[],
  config: ChronoPulseConfig = defaultChronoPulseConfig
): ChronoPulseResult {
  const closes = data.map(d => d.close);
  const volumes = data.map(d => d.volume ?? 0);
  
  const directionalEmaValues = ema(closes, config.biasEmaLen);
  const trendGuideValues = ema(closes, config.trendGuideLen);
  const atrValues = atr(data, config.atrLen);
  
  const macdCore = macd(closes, config.macdFast, config.macdSlow, config.macdSignal);
  const macdFusion = config.fusionEnabled ? macd(closes, config.fusionFast, config.fusionSlow, config.fusionSignal) : macdCore;
  
  let lastSwingHigh: number | null = null;
  let lastSwingLow: number | null = null;
  let structureBias = 0;
  const structureBiasArray: number[] = [];
  const structureEvents: StructureEvent[] = [];
  const signals: TradeSignal[] = [];
  const qualityScores: (number | null)[] = [];
  const volumeIntensityArray: (number | null)[] = [];
  
  for (let i = 0; i < data.length; i++) {
    const pivH = pivotHigh(data, i, config.structureLeft, config.structureRight);
    const pivL = pivotLow(data, i, config.structureLeft, config.structureRight);
    
    if (pivH !== null) lastSwingHigh = pivH;
    if (pivL !== null) lastSwingLow = pivL;
    
    const bullThreshold = lastSwingHigh !== null ? lastSwingHigh * (1 + config.structureBreakBuff) : null;
    const bearThreshold = lastSwingLow !== null ? lastSwingLow * (1 - config.structureBreakBuff) : null;
    
    const prevBias = structureBias;
    
    if (bullThreshold !== null && data[i].high > bullThreshold) {
      if (prevBias <= 0) {
        structureEvents.push({ index: i, type: 'choch_bull', price: data[i].low });
      } else if (prevBias === 1) {
        structureEvents.push({ index: i, type: 'bos_bull', price: data[i].low });
      }
      structureBias = 1;
    }
    
    if (bearThreshold !== null && data[i].low < bearThreshold) {
      if (prevBias >= 0) {
        structureEvents.push({ index: i, type: 'choch_bear', price: data[i].high });
      } else if (prevBias === -1) {
        structureEvents.push({ index: i, type: 'bos_bear', price: data[i].high });
      }
      structureBias = -1;
    }
    
    structureBiasArray.push(structureBias);
    
    const volSma = i >= config.volumeLookback ? volumes.slice(i - config.volumeLookback, i + 1).reduce((a, b) => a + b, 0) / config.volumeLookback : 0;
    const volumeIntensity = volSma > 0 ? volumes[i] / volSma : 1;
    volumeIntensityArray.push(volumeIntensity);
    
    const macdBull = config.fusionEnabled 
      ? (macdCore.line[i] > macdCore.sig[i] && macdCore.line[i] > 0 && macdFusion.line[i] > macdFusion.sig[i] && macdFusion.line[i] > 0)
      : (macdCore.line[i] > macdCore.sig[i] && macdCore.line[i] > 0);
    
    const macdBear = config.fusionEnabled
      ? (macdCore.line[i] < macdCore.sig[i] && macdCore.line[i] < 0 && macdFusion.line[i] < macdFusion.sig[i] && macdFusion.line[i] < 0)
      : (macdCore.line[i] < macdCore.sig[i] && macdCore.line[i] < 0);
    
    const trendBull = closes[i] > directionalEmaValues[i];
    const trendBear = closes[i] < directionalEmaValues[i];
    const trendGuideBull = closes[i] > trendGuideValues[i];
    const trendGuideBear = closes[i] < trendGuideValues[i];
    
    const volumeReady = !config.enableVolumeGate || (volumes[i] > volSma * config.volumeThreshold);
    const atrReady = atrValues[i] >= config.minAtrFilter || config.minAtrFilter === 0;
    
    let cryptoImpulse = 0;
    if (config.enableCryptoMode) {
      const impulseFast = ema(closes.slice(0, i + 1), config.cryptoFastLen);
      const impulseSlow = ema(closes.slice(0, i + 1), config.cryptoSlowLen);
      cryptoImpulse = impulseFast[impulseFast.length - 1] - impulseSlow[impulseSlow.length - 1];
    }
    
    const atrBaseline = i >= 14 ? atrValues.slice(Math.max(0, i - 13), i + 1).reduce((a, b) => a + b, 0) / Math.min(14, i + 1) : atrValues[i];
    const volScore = atrBaseline > 0 ? Math.min(Math.max(atrValues[i] / atrBaseline, 0), 1.5) / 1.5 : 1;
    const volumeScore = config.enableVolumeGate ? Math.min(Math.max(volumeIntensity / config.volumeThreshold, 0), 1.5) / 1.5 : 1;
    const structureScore = structureBias === 1 ? 1 : structureBias === -1 ? 0 : 0.5;
    const momentumScore = macdBull ? 1 : macdBear ? 0 : 0.5;
    const trendScore = trendGuideBull ? 1 : trendGuideBear ? 0 : 0.5;
    const qualityScore = (structureScore + momentumScore + trendScore + volScore + volumeScore) / 5;
    qualityScores.push(qualityScore);
    
    const qualityPass = !config.enableQualityGate || qualityScore >= config.qualityThreshold;
    
    const longCondition = atrReady && structureBias === 1 && macdBull && trendBull && trendGuideBull && volumeReady && qualityPass && (!config.enableCryptoMode || cryptoImpulse > 0);
    const shortCondition = atrReady && structureBias === -1 && macdBear && trendBear && trendGuideBear && volumeReady && qualityPass && (!config.enableCryptoMode || cryptoImpulse < 0);
    
    if (longCondition && i > 0) {
      signals.push({
        index: i,
        type: 'long',
        price: closes[i],
        stop: closes[i] - atrValues[i] * config.stopAtrMult,
        target: closes[i] + atrValues[i] * config.tpAtrMult,
        qualityScore
      });
    }
    
    if (shortCondition && i > 0) {
      signals.push({
        index: i,
        type: 'short',
        price: closes[i],
        stop: closes[i] + atrValues[i] * config.stopAtrMult,
        target: closes[i] - atrValues[i] * config.tpAtrMult,
        qualityScore
      });
    }
  }
  
  return {
    directionalEma: directionalEmaValues,
    trendGuide: trendGuideValues,
    structureEvents,
    signals,
    structureBias: structureBiasArray,
    qualityScore: qualityScores,
    atr: atrValues,
    volumeIntensity: volumeIntensityArray
  };
}
