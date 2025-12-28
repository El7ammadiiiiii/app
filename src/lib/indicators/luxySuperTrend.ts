/**
 * Luxy Super-Duper SuperTrend Predictor Engine
 * Converted from Pine Script v6
 */

import { CandleData } from "@/components/charts/TradingChart";

export interface LuxySuperTrendConfig {
  stLength: number;
  stMult: number;
  stUseAdaptive: boolean;
  stSmoothFactor: number;
  stNeutralBars: number;
  volLength: number;
  volHighThreshold: number;
  volSpikeThreshold: number;
  volLowThreshold: number;
  volMomFast: number;
  volMomSlow: number;
  useVolumeMomentum: boolean;
  minQualityScore: number;
  requireVolumeConfirm: boolean;
  enablePrediction: boolean;
  predictionSamples: number;
  useEwa: boolean;
  ewaDecay: number;
}

export const defaultLuxySuperTrendConfig: LuxySuperTrendConfig = {
  stLength: 10,
  stMult: 3.0,
  stUseAdaptive: true,
  stSmoothFactor: 0.15,
  stNeutralBars: 0,
  volLength: 20,
  volHighThreshold: 1.5,
  volSpikeThreshold: 2.5,
  volLowThreshold: 0.5,
  volMomFast: 5,
  volMomSlow: 20,
  useVolumeMomentum: true,
  minQualityScore: 30,
  requireVolumeConfirm: true,
  enablePrediction: true,
  predictionSamples: 50,
  useEwa: true,
  ewaDecay: 0.9
};

export interface SuperTrendSignal {
  index: number;
  type: 'long' | 'short';
  price: number;
  qualityScore: number;
  volumeRatio: number;
  volatilityRatio: number;
}

export interface TrendPrediction {
  startIndex: number;
  predictedEnd: number;
  confidence: number;
  milestones: { bar: number; probability: number }[];
}

export interface LuxySuperTrendResult {
  supertrend: (number | null)[];
  direction: number[];
  signals: SuperTrendSignal[];
  qualityScore: (number | null)[];
  volumeRatio: (number | null)[];
  atrRatio: (number | null)[];
  predictions: TrendPrediction[];
  ribbonLayers: Array<(number | null)[]>;
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

function sma(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(data.slice(0, i + 1).reduce((a, b) => a + b, 0) / (i + 1));
    } else {
      result.push(data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period);
    }
  }
  return result;
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

function correlation(data1: number[], data2: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data1.length; i++) {
    if (i < period - 1) {
      result.push(0);
      continue;
    }
    const slice1 = data1.slice(i - period + 1, i + 1);
    const slice2 = data2.slice(i - period + 1, i + 1);
    const mean1 = slice1.reduce((a, b) => a + b, 0) / period;
    const mean2 = slice2.reduce((a, b) => a + b, 0) / period;
    let num = 0;
    let den1 = 0;
    let den2 = 0;
    for (let j = 0; j < period; j++) {
      const diff1 = slice1[j] - mean1;
      const diff2 = slice2[j] - mean2;
      num += diff1 * diff2;
      den1 += diff1 * diff1;
      den2 += diff2 * diff2;
    }
    result.push(den1 === 0 || den2 === 0 ? 0 : num / Math.sqrt(den1 * den2));
  }
  return result;
}

function ewaAvg(arr: number[], decay: number): number {
  if (arr.length === 0) return 0;
  let sumWeighted = 0;
  let sumWeights = 0;
  const n = arr.length;
  for (let i = 0; i < n; i++) {
    const weight = Math.pow(decay, n - 1 - i);
    sumWeighted += arr[i] * weight;
    sumWeights += weight;
  }
  return sumWeighted / sumWeights;
}

export function calculateLuxySuperTrend(
  data: CandleData[],
  config: LuxySuperTrendConfig = defaultLuxySuperTrendConfig
): LuxySuperTrendResult {
  const closes = data.map(d => d.close);
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  const volumes = data.map(d => d.volume ?? 0);
  const hl2 = data.map(d => (d.high + d.low) / 2);
  
  const atrValues = atr(data, config.stLength);
  const volumeSma = sma(volumes, config.volLength);
  const volumeRatios = volumes.map((v, i) => volumeSma[i] > 0 ? v / volumeSma[i] : 1);
  
  const atrSma = sma(atrValues, 20);
  const atrRatios = atrValues.map((a, i) => atrSma[i] > 0 ? a / atrSma[i] : 1);
  
  const barIndices = data.map((_, i) => i);
  const trendStrengths = correlation(closes, barIndices, config.stLength);
  
  const upLine: number[] = [];
  const dnLine: number[] = [];
  const stDir: number[] = [];
  const supertrend: (number | null)[] = [];
  const qualityScores: (number | null)[] = [];
  const signals: SuperTrendSignal[] = [];
  
  let barsSinceFlip = 999;
  const trendDurations: number[] = [];
  const trendTypes: boolean[] = [];
  let currentTrendBars = 0;
  
  for (let i = 0; i < data.length; i++) {
    const volWeight = volumeSma[i] > 0 ? volumes[i] / volumeSma[i] : 1;
    const trendStrength = Math.abs(trendStrengths[i]);
    const adaptiveMult = config.stUseAdaptive 
      ? config.stMult * (0.8 + trendStrength * 0.4) * Math.sqrt(Math.max(0.1, volWeight))
      : config.stMult;
    
    const upRaw = hl2[i] - atrValues[i] * adaptiveMult;
    const dnRaw = hl2[i] + atrValues[i] * adaptiveMult;
    
    if (i === 0) {
      upLine.push(upRaw);
      dnLine.push(dnRaw);
      stDir.push(closes[i] >= hl2[i] ? 1 : -1);
    } else {
      const prevUp = upLine[i - 1];
      const prevDn = dnLine[i - 1];
      const prevDir = stDir[i - 1];
      
      const newUp = closes[i] > prevUp ? prevUp * (1 - config.stSmoothFactor) + upRaw * config.stSmoothFactor : upRaw;
      const newDn = closes[i] < prevDn ? prevDn * (1 - config.stSmoothFactor) + dnRaw * config.stSmoothFactor : dnRaw;
      
      upLine.push(newUp);
      dnLine.push(newDn);
      
      let newDir = prevDir;
      if (prevDir === -1 && closes[i] > prevDn) newDir = 1;
      if (prevDir === 1 && closes[i] < prevUp) newDir = -1;
      stDir.push(newDir);
      
      if (newDir !== prevDir) {
        if (currentTrendBars > 0) {
          trendDurations.push(currentTrendBars);
          trendTypes.push(prevDir === 1);
        }
        currentTrendBars = 1;
        barsSinceFlip = 0;
      } else {
        currentTrendBars++;
        if (barsSinceFlip < 999) barsSinceFlip++;
      }
    }
    
    const neutral = config.stNeutralBars > 0 && barsSinceFlip < config.stNeutralBars;
    const st = neutral ? null : (stDir[i] === 1 ? upLine[i] : dnLine[i]);
    supertrend.push(st);
    
    const volMaFast = i >= config.volMomFast ? volumes.slice(i - config.volMomFast + 1, i + 1).reduce((a, b) => a + b, 0) / config.volMomFast : volumes[i];
    const volMaSlow = i >= config.volMomSlow ? volumes.slice(i - config.volMomSlow + 1, i + 1).reduce((a, b) => a + b, 0) / config.volMomSlow : volumes[i];
    const volMomRatio = volMaSlow > 0 ? volMaFast / volMaSlow : 1;
    const volMomRising = volMomRatio > 1.0;
    
    const volIsSpike = volumeRatios[i] >= config.volSpikeThreshold;
    const volIsHigh = volumeRatios[i] >= config.volHighThreshold;
    const basicVolConfirm = volumeRatios[i] >= 1.0;
    
    const volExpanding = atrRatios[i] >= 1.3;
    const volRising = atrRatios[i] >= 1.0 && atrRatios[i] < 1.3;
    
    const volPoints = volIsSpike ? 30 : volIsHigh ? 20 : basicVolConfirm ? 10 : 0;
    const volExpPoints = volExpanding ? 30 : volRising ? 15 : 0;
    const volMomPoints = config.useVolumeMomentum && volMomRising ? 10 : 0;
    const qualityScore = volPoints + volExpPoints + volMomPoints;
    qualityScores.push(qualityScore);
    
    if (i > 0) {
      const prevDir = stDir[i - 1];
      const currDir = stDir[i];
      const flip = currDir !== prevDir;
      
      if (flip) {
        const signalOk = qualityScore >= config.minQualityScore;
        const volumeOk = !config.requireVolumeConfirm || basicVolConfirm;
        const volMomOk = !config.useVolumeMomentum || volMomRising;
        
        if (signalOk && volumeOk && volMomOk) {
          signals.push({
            index: i,
            type: currDir === 1 ? 'long' : 'short',
            price: closes[i],
            qualityScore,
            volumeRatio: volumeRatios[i],
            volatilityRatio: atrRatios[i]
          });
        }
      }
    }
  }
  
  const predictions: TrendPrediction[] = [];
  if (config.enablePrediction && trendDurations.length >= 1) {
    const lastFlipIndex = signals.length > 0 ? signals[signals.length - 1].index : -1;
    if (lastFlipIndex > 0) {
      const isBullish = stDir[stDir.length - 1] === 1;
      const sameTrends = trendDurations.filter((_, idx) => trendTypes[idx] === isBullish);
      
      if (sameTrends.length >= 1) {
        const predictedEnd = config.useEwa 
          ? ewaAvg(sameTrends, config.ewaDecay) * 2.5
          : (sameTrends.reduce((a, b) => a + b, 0) / sameTrends.length) * 2.5;
        
        const confidence = Math.min(100, (sameTrends.length / config.predictionSamples) * 100);
        
        const milestones = [0.25, 0.50, 0.75, 0.90, 1.00].map(ratio => ({
          bar: lastFlipIndex + Math.floor(predictedEnd * ratio),
          probability: Math.round(100 - (ratio * 70))
        }));
        
        predictions.push({
          startIndex: lastFlipIndex,
          predictedEnd,
          confidence,
          milestones
        });
      }
    }
  }
  
  const ribbonLayers: Array<(number | null)[]> = [];
  for (let layer = 0; layer < 15; layer++) {
    const layerData: (number | null)[] = [];
    for (let i = 0; i < data.length; i++) {
      if (supertrend[i] === null) {
        layerData.push(null);
      } else {
        const start = closes[i];
        const end = supertrend[i]!;
        const ratio = layer / 15;
        layerData.push(start * (1 - ratio) + end * ratio);
      }
    }
    ribbonLayers.push(layerData);
  }
  
  return {
    supertrend,
    direction: stDir,
    signals,
    qualityScore: qualityScores,
    volumeRatio: volumeRatios,
    atrRatio: atrRatios,
    predictions,
    ribbonLayers
  };
}
