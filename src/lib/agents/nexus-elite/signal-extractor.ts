/**
 * NEXUS Quantum Trend Intelligence Engine v1.0
 * 
 * Layer 3: Signal Extractor - مستخرج الإشارات
 * 
 * Extracts trading signals from computed indicators:
 * - Individual indicator signals
 * - Divergence detection
 * - Momentum shifts
 * - Crossover signals
 * - Extreme readings
 * 
 * @author CCWAYS Elite Trading System
 * @version 1.0.0
 */

import {
  OHLCV,
  Timeframe,
  TrendDirection,
  NexusConfig,
  DEFAULT_NEXUS_CONFIG,
  AllIndicatorsState,
  ExtractedSignal,
  DivergenceSignal,
  MomentumShift,
  IndicatorName,
} from './types';

import { computeAllIndicators } from './indicators-engine';

// ==========================================================
// SIGNAL EXTRACTION - استخراج الإشارات
// ==========================================================

/**
 * Extract signal from Volume Analysis
 * استخراج إشارة من تحليل الحجم
 */
function extractVolumeSignal(
  indicators: AllIndicatorsState,
  timeframe: Timeframe
): ExtractedSignal {
  const vol = indicators.volume;
  
  let signal: TrendDirection = 'neutral';
  let strength = 50;
  let description = '';
  let descriptionAr = '';
  
  if (vol.accumulation && vol.isSpike) {
    signal = 'bullish';
    strength = 80 + vol.spikeIntensity * 0.2;
    description = 'Strong accumulation with volume spike';
    descriptionAr = 'تجميع قوي مع ارتفاع حاد في الحجم';
  } else if (vol.distribution && vol.isSpike) {
    signal = 'bearish';
    strength = 80 + vol.spikeIntensity * 0.2;
    description = 'Strong distribution with volume spike';
    descriptionAr = 'توزيع قوي مع ارتفاع حاد في الحجم';
  } else if (vol.accumulation) {
    signal = 'bullish';
    strength = 60;
    description = 'Accumulation detected';
    descriptionAr = 'تم اكتشاف تجميع';
  } else if (vol.distribution) {
    signal = 'bearish';
    strength = 60;
    description = 'Distribution detected';
    descriptionAr = 'تم اكتشاف توزيع';
  } else if (vol.ratio > 1.5) {
    signal = vol.trend;
    strength = 55;
    description = 'Above average volume';
    descriptionAr = 'حجم أعلى من المتوسط';
  }
  
  return {
    indicator: 'volume',
    timeframe,
    signal,
    strength: Math.min(100, strength),
    confidence: vol.isSpike ? 85 : 65,
    divergence: 'none',
    crossover: 'none',
    momentum: vol.ratio > 1 ? (vol.ratio - 1) * 50 : (vol.ratio - 1) * 50,
    description,
    descriptionAr,
  };
}

/**
 * Extract signal from RSI
 * استخراج إشارة من RSI
 */
function extractRSISignal(
  indicators: AllIndicatorsState,
  timeframe: Timeframe
): ExtractedSignal {
  const rsi = indicators.rsi;
  
  let signal: TrendDirection = rsi.direction;
  let strength = rsi.strength;
  let description = '';
  let descriptionAr = '';
  
  // Extreme levels
  if (rsi.isOversold) {
    signal = 'bullish';
    strength = 70 + (30 - rsi.value) * 2;
    description = 'RSI oversold - potential reversal';
    descriptionAr = 'RSI في منطقة التشبع البيعي - انعكاس محتمل';
  } else if (rsi.isOverbought) {
    signal = 'bearish';
    strength = 70 + (rsi.value - 70) * 2;
    description = 'RSI overbought - potential reversal';
    descriptionAr = 'RSI في منطقة التشبع الشرائي - انعكاس محتمل';
  }
  
  // Failure swings (higher priority)
  if (rsi.failureSwing === 'bullish') {
    signal = 'bullish';
    strength = 85;
    description = 'RSI bullish failure swing';
    descriptionAr = 'تأرجح فاشل صعودي في RSI';
  } else if (rsi.failureSwing === 'bearish') {
    signal = 'bearish';
    strength = 85;
    description = 'RSI bearish failure swing';
    descriptionAr = 'تأرجح فاشل هبوطي في RSI';
  }
  
  // Divergence (highest priority)
  if (rsi.divergenceType === 'bullish') {
    signal = 'bullish';
    strength = 90;
    description = 'RSI bullish divergence detected';
    descriptionAr = 'تباعد صعودي في RSI';
  } else if (rsi.divergenceType === 'bearish') {
    signal = 'bearish';
    strength = 90;
    description = 'RSI bearish divergence detected';
    descriptionAr = 'تباعد هبوطي في RSI';
  }
  
  // Crossovers
  if (rsi.crossover === 'bullish') {
    description = description || 'RSI crossed above 50';
    descriptionAr = descriptionAr || 'RSI عبر فوق 50';
  } else if (rsi.crossover === 'bearish') {
    description = description || 'RSI crossed below 50';
    descriptionAr = descriptionAr || 'RSI عبر تحت 50';
  }
  
  return {
    indicator: 'rsi',
    timeframe,
    signal,
    strength: Math.min(100, strength),
    confidence: rsi.hasDivergence ? 90 : rsi.failureSwing !== 'none' ? 85 : 70,
    divergence: rsi.divergenceType,
    crossover: rsi.crossover,
    momentum: rsi.momentum,
    description: description || `RSI at ${rsi.value.toFixed(1)}`,
    descriptionAr: descriptionAr || `RSI عند ${rsi.value.toFixed(1)}`,
  };
}

/**
 * Extract signal from Stochastic RSI
 * استخراج إشارة من Stochastic RSI
 */
function extractStochRSISignal(
  indicators: AllIndicatorsState,
  timeframe: Timeframe
): ExtractedSignal {
  const stoch = indicators.stochRsi;
  
  let signal: TrendDirection = stoch.direction;
  let strength = stoch.strength;
  let description = '';
  let descriptionAr = '';
  
  if (stoch.isOversold && stoch.crossoverType === 'bullish') {
    signal = 'bullish';
    strength = 90;
    description = 'StochRSI bullish crossover in oversold zone';
    descriptionAr = 'تقاطع صعودي في منطقة التشبع البيعي';
  } else if (stoch.isOverbought && stoch.crossoverType === 'bearish') {
    signal = 'bearish';
    strength = 90;
    description = 'StochRSI bearish crossover in overbought zone';
    descriptionAr = 'تقاطع هبوطي في منطقة التشبع الشرائي';
  } else if (stoch.crossoverType === 'bullish') {
    signal = 'bullish';
    strength = 70;
    description = 'StochRSI bullish crossover';
    descriptionAr = 'تقاطع صعودي في StochRSI';
  } else if (stoch.crossoverType === 'bearish') {
    signal = 'bearish';
    strength = 70;
    description = 'StochRSI bearish crossover';
    descriptionAr = 'تقاطع هبوطي في StochRSI';
  } else if (stoch.isOversold) {
    signal = 'bullish';
    strength = 65;
    description = 'StochRSI in oversold zone';
    descriptionAr = 'StochRSI في منطقة التشبع البيعي';
  } else if (stoch.isOverbought) {
    signal = 'bearish';
    strength = 65;
    description = 'StochRSI in overbought zone';
    descriptionAr = 'StochRSI في منطقة التشبع الشرائي';
  }
  
  return {
    indicator: 'stochRsi',
    timeframe,
    signal,
    strength: Math.min(100, strength),
    confidence: stoch.inExtremeZone ? 80 : 65,
    divergence: 'none',
    crossover: stoch.crossoverType,
    momentum: stoch.momentum,
    description: description || `StochRSI K:${stoch.k.toFixed(1)} D:${stoch.d.toFixed(1)}`,
    descriptionAr: descriptionAr || `StochRSI K:${stoch.k.toFixed(1)} D:${stoch.d.toFixed(1)}`,
  };
}

/**
 * Extract signal from MACD
 * استخراج إشارة من MACD
 */
function extractMACDSignal(
  indicators: AllIndicatorsState,
  timeframe: Timeframe
): ExtractedSignal {
  const macd = indicators.macd;
  
  let signal: TrendDirection = macd.direction;
  let strength = macd.strength;
  let description = '';
  let descriptionAr = '';
  
  // Signal line crossover
  if (macd.signalCross === 'bullish') {
    signal = 'bullish';
    strength = 80;
    description = 'MACD bullish signal crossover';
    descriptionAr = 'تقاطع صعودي في MACD';
    
    // Extra strength if below zero (more room to run)
    if (macd.macdLine < 0) {
      strength = 85;
      description = 'MACD bullish crossover below zero line';
      descriptionAr = 'تقاطع صعودي تحت خط الصفر';
    }
  } else if (macd.signalCross === 'bearish') {
    signal = 'bearish';
    strength = 80;
    description = 'MACD bearish signal crossover';
    descriptionAr = 'تقاطع هبوطي في MACD';
    
    if (macd.macdLine > 0) {
      strength = 85;
      description = 'MACD bearish crossover above zero line';
      descriptionAr = 'تقاطع هبوطي فوق خط الصفر';
    }
  }
  
  // Zero line crossover
  if (macd.zeroCross === 'bullish') {
    signal = 'bullish';
    strength = 85;
    description = 'MACD crossed above zero';
    descriptionAr = 'MACD عبر فوق خط الصفر';
  } else if (macd.zeroCross === 'bearish') {
    signal = 'bearish';
    strength = 85;
    description = 'MACD crossed below zero';
    descriptionAr = 'MACD عبر تحت خط الصفر';
  }
  
  // Divergence (highest priority)
  if (macd.divergenceType === 'bullish') {
    signal = 'bullish';
    strength = 92;
    description = 'MACD bullish divergence';
    descriptionAr = 'تباعد صعودي في MACD';
  } else if (macd.divergenceType === 'bearish') {
    signal = 'bearish';
    strength = 92;
    description = 'MACD bearish divergence';
    descriptionAr = 'تباعد هبوطي في MACD';
  }
  
  // Histogram momentum
  if (!description && macd.histogramTrend === 'bullish' && macd.histogramMomentum > 20) {
    signal = 'bullish';
    strength = 65;
    description = 'MACD histogram expanding bullish';
    descriptionAr = 'توسع صعودي في histogram';
  } else if (!description && macd.histogramTrend === 'bearish' && macd.histogramMomentum < -20) {
    signal = 'bearish';
    strength = 65;
    description = 'MACD histogram expanding bearish';
    descriptionAr = 'توسع هبوطي في histogram';
  }
  
  return {
    indicator: 'macd',
    timeframe,
    signal,
    strength: Math.min(100, strength),
    confidence: macd.hasDivergence ? 90 : macd.signalCross !== 'none' ? 80 : 70,
    divergence: macd.divergenceType,
    crossover: macd.signalCross,
    momentum: macd.histogramMomentum,
    description: description || 'MACD neutral',
    descriptionAr: descriptionAr || 'MACD محايد',
  };
}

/**
 * Extract signal from OBV
 * استخراج إشارة من OBV
 */
function extractOBVSignal(
  indicators: AllIndicatorsState,
  timeframe: Timeframe
): ExtractedSignal {
  const obv = indicators.obv;
  
  let signal: TrendDirection = obv.trend;
  let strength = obv.strength;
  let description = '';
  let descriptionAr = '';
  
  if (obv.divergenceWithPrice === 'bullish') {
    signal = 'bullish';
    strength = 88;
    description = 'OBV bullish divergence with price';
    descriptionAr = 'تباعد صعودي في OBV مع السعر';
  } else if (obv.divergenceWithPrice === 'bearish') {
    signal = 'bearish';
    strength = 88;
    description = 'OBV bearish divergence with price';
    descriptionAr = 'تباعد هبوطي في OBV مع السعر';
  } else if (obv.breakout) {
    signal = obv.obv > obv.obvSma ? 'bullish' : 'bearish';
    strength = 75;
    description = signal === 'bullish' ? 'OBV breakout above SMA' : 'OBV breakdown below SMA';
    descriptionAr = signal === 'bullish' ? 'اختراق OBV فوق المتوسط' : 'كسر OBV تحت المتوسط';
  } else if (obv.crossover !== 'none') {
    signal = obv.crossover === 'bullish' ? 'bullish' : 'bearish';
    strength = 65;
    description = `OBV ${obv.crossover} crossover`;
    descriptionAr = `تقاطع ${obv.crossover === 'bullish' ? 'صعودي' : 'هبوطي'} في OBV`;
  }
  
  return {
    indicator: 'obv',
    timeframe,
    signal,
    strength: Math.min(100, strength),
    confidence: obv.hasDivergence ? 85 : 65,
    divergence: obv.divergenceWithPrice,
    crossover: obv.crossover,
    momentum: obv.momentum,
    description: description || 'OBV trending',
    descriptionAr: descriptionAr || 'OBV في اتجاه',
  };
}

/**
 * Extract signal from ADX
 * استخراج إشارة من ADX
 */
function extractADXSignal(
  indicators: AllIndicatorsState,
  timeframe: Timeframe
): ExtractedSignal {
  const adx = indicators.adx;
  
  let signal: TrendDirection = adx.direction;
  let strength = adx.adx;
  let description = '';
  let descriptionAr = '';
  
  // DI crossover with trend strength
  if (adx.diCrossover === 'bullish' && adx.trendStrength !== 'no_trend') {
    signal = 'bullish';
    strength = adx.trendStrength === 'strong' ? 90 : adx.trendStrength === 'moderate' ? 75 : 60;
    description = `Bullish DI crossover with ${adx.trendStrength} trend`;
    descriptionAr = `تقاطع DI صعودي مع اتجاه ${adx.trendStrength === 'strong' ? 'قوي' : adx.trendStrength === 'moderate' ? 'متوسط' : 'ضعيف'}`;
  } else if (adx.diCrossover === 'bearish' && adx.trendStrength !== 'no_trend') {
    signal = 'bearish';
    strength = adx.trendStrength === 'strong' ? 90 : adx.trendStrength === 'moderate' ? 75 : 60;
    description = `Bearish DI crossover with ${adx.trendStrength} trend`;
    descriptionAr = `تقاطع DI هبوطي مع اتجاه ${adx.trendStrength === 'strong' ? 'قوي' : adx.trendStrength === 'moderate' ? 'متوسط' : 'ضعيف'}`;
  } else if (adx.adxRising && adx.trendStrength === 'strong') {
    // Strong trending market
    strength = 85;
    description = `Strong ${adx.direction} trend with ADX ${adx.adx.toFixed(1)}`;
    descriptionAr = `اتجاه ${adx.direction === 'bullish' ? 'صعودي' : 'هبوطي'} قوي - ADX ${adx.adx.toFixed(1)}`;
  } else if (adx.trendStrength === 'no_trend') {
    signal = 'neutral';
    strength = 30;
    description = 'No clear trend (ADX < 15)';
    descriptionAr = 'لا يوجد اتجاه واضح (ADX < 15)';
  }
  
  return {
    indicator: 'adx',
    timeframe,
    signal,
    strength: Math.min(100, strength),
    confidence: adx.trendStrength === 'strong' ? 85 : adx.trendStrength === 'moderate' ? 70 : 50,
    divergence: 'none',
    crossover: adx.diCrossover,
    momentum: adx.momentum,
    description: description || `ADX: ${adx.adx.toFixed(1)} +DI: ${adx.plusDI.toFixed(1)} -DI: ${adx.minusDI.toFixed(1)}`,
    descriptionAr: descriptionAr || `ADX: ${adx.adx.toFixed(1)} +DI: ${adx.plusDI.toFixed(1)} -DI: ${adx.minusDI.toFixed(1)}`,
  };
}

/**
 * Extract signal from Connors RSI
 * استخراج إشارة من Connors RSI
 */
function extractConnorsRSISignal(
  indicators: AllIndicatorsState,
  timeframe: Timeframe
): ExtractedSignal {
  const crsi = indicators.connorsRsi;
  
  let signal: TrendDirection = crsi.direction;
  let strength = crsi.strength;
  let description = '';
  let descriptionAr = '';
  
  if (crsi.extremeReading) {
    if (crsi.composite < 10) {
      signal = 'bullish';
      strength = 90;
      description = 'Connors RSI extreme oversold';
      descriptionAr = 'Connors RSI في تشبع بيعي شديد';
    } else if (crsi.composite > 90) {
      signal = 'bearish';
      strength = 90;
      description = 'Connors RSI extreme overbought';
      descriptionAr = 'Connors RSI في تشبع شرائي شديد';
    }
  } else if (crsi.isOversold) {
    signal = 'bullish';
    strength = 70;
    description = 'Connors RSI oversold';
    descriptionAr = 'Connors RSI في منطقة التشبع البيعي';
  } else if (crsi.isOverbought) {
    signal = 'bearish';
    strength = 70;
    description = 'Connors RSI overbought';
    descriptionAr = 'Connors RSI في منطقة التشبع الشرائي';
  }
  
  if (crsi.crossover !== 'none') {
    if (!crsi.extremeReading) {
      signal = crsi.crossover === 'bullish' ? 'bullish' : 'bearish';
      strength = 65;
      description = `Connors RSI ${crsi.crossover} crossover`;
      descriptionAr = `تقاطع ${crsi.crossover === 'bullish' ? 'صعودي' : 'هبوطي'} في Connors RSI`;
    }
  }
  
  return {
    indicator: 'connorsRsi',
    timeframe,
    signal,
    strength: Math.min(100, strength),
    confidence: crsi.extremeReading ? 85 : 70,
    divergence: 'none',
    crossover: crsi.crossover,
    momentum: crsi.momentum,
    description: description || `Connors RSI: ${crsi.composite.toFixed(1)}`,
    descriptionAr: descriptionAr || `Connors RSI: ${crsi.composite.toFixed(1)}`,
  };
}

/**
 * Extract signal from Laguerre RSI
 * استخراج إشارة من Laguerre RSI
 */
function extractLaguerreRSISignal(
  indicators: AllIndicatorsState,
  timeframe: Timeframe
): ExtractedSignal {
  const lrsi = indicators.laguerreRsi;
  
  let signal: TrendDirection = lrsi.direction;
  let strength = lrsi.strength;
  let description = '';
  let descriptionAr = '';
  
  // Turning points are the strongest signals
  if (lrsi.turningPoint) {
    signal = lrsi.turningDirection;
    strength = 88;
    description = `Laguerre RSI turning ${lrsi.turningDirection}`;
    descriptionAr = `انعطاف ${lrsi.turningDirection === 'bullish' ? 'صعودي' : 'هبوطي'} في Laguerre RSI`;
  } else if (lrsi.isOversold && lrsi.direction === 'bullish') {
    signal = 'bullish';
    strength = 82;
    description = 'Laguerre RSI rising from oversold';
    descriptionAr = 'صعود من التشبع البيعي في Laguerre RSI';
  } else if (lrsi.isOverbought && lrsi.direction === 'bearish') {
    signal = 'bearish';
    strength = 82;
    description = 'Laguerre RSI falling from overbought';
    descriptionAr = 'هبوط من التشبع الشرائي في Laguerre RSI';
  } else if (lrsi.crossover !== 'none') {
    signal = lrsi.crossover === 'bullish' ? 'bullish' : 'bearish';
    strength = 70;
    description = `Laguerre RSI ${lrsi.crossover} crossover`;
    descriptionAr = `تقاطع ${lrsi.crossover === 'bullish' ? 'صعودي' : 'هبوطي'} في Laguerre RSI`;
  }
  
  return {
    indicator: 'laguerreRsi',
    timeframe,
    signal,
    strength: Math.min(100, strength),
    confidence: lrsi.turningPoint ? 85 : 70,
    divergence: 'none',
    crossover: lrsi.crossover,
    momentum: lrsi.momentum,
    description: description || `Laguerre RSI: ${(lrsi.lrsi * 100).toFixed(1)}`,
    descriptionAr: descriptionAr || `Laguerre RSI: ${(lrsi.lrsi * 100).toFixed(1)}`,
  };
}

/**
 * Extract signal from Fisher Transform
 * استخراج إشارة من Fisher Transform
 */
function extractFisherSignal(
  indicators: AllIndicatorsState,
  timeframe: Timeframe
): ExtractedSignal {
  const fisher = indicators.fisher;
  
  let signal: TrendDirection = fisher.direction;
  let strength = fisher.strength;
  let description = '';
  let descriptionAr = '';
  
  if (fisher.reversalSignal) {
    signal = fisher.fisher > 0 ? 'bearish' : 'bullish';
    strength = 90;
    description = `Fisher reversal signal ${signal}`;
    descriptionAr = `إشارة انعكاس ${signal === 'bullish' ? 'صعودية' : 'هبوطية'} في Fisher`;
  } else if (fisher.crossover !== 'none') {
    signal = fisher.crossover === 'bullish' ? 'bullish' : 'bearish';
    strength = fisher.extremeLevel ? 85 : 75;
    description = `Fisher ${fisher.crossover} crossover`;
    descriptionAr = `تقاطع ${fisher.crossover === 'bullish' ? 'صعودي' : 'هبوطي'} في Fisher`;
    
    if (fisher.extremeLevel) {
      description += ' at extreme level';
      descriptionAr += ' في مستوى متطرف';
    }
  } else if (fisher.extremeLevel) {
    signal = fisher.fisher > 1.5 ? 'bearish' : 'bullish';
    strength = 70;
    description = `Fisher at extreme ${fisher.fisher > 0 ? 'high' : 'low'}`;
    descriptionAr = `Fisher في مستوى متطرف ${fisher.fisher > 0 ? 'مرتفع' : 'منخفض'}`;
  }
  
  return {
    indicator: 'fisher',
    timeframe,
    signal,
    strength: Math.min(100, strength),
    confidence: fisher.reversalSignal ? 88 : fisher.crossover !== 'none' ? 78 : 65,
    divergence: 'none',
    crossover: fisher.crossover,
    momentum: fisher.momentum,
    description: description || `Fisher: ${fisher.fisher.toFixed(2)}`,
    descriptionAr: descriptionAr || `Fisher: ${fisher.fisher.toFixed(2)}`,
  };
}

/**
 * Extract signal from Cyber Cycle
 * استخراج إشارة من Cyber Cycle
 */
function extractCyberCycleSignal(
  indicators: AllIndicatorsState,
  timeframe: Timeframe
): ExtractedSignal {
  const cc = indicators.cyberCycle;
  
  let signal: TrendDirection = cc.direction;
  let strength = cc.strength;
  let description = '';
  let descriptionAr = '';
  
  if (cc.leadingSignal && cc.phase === 'up') {
    signal = 'bullish';
    strength = 80;
    description = 'Cyber Cycle leading bullish signal';
    descriptionAr = 'إشارة صعودية استباقية من Cyber Cycle';
  } else if (cc.leadingSignal && cc.phase === 'down') {
    signal = 'bearish';
    strength = 80;
    description = 'Cyber Cycle leading bearish signal';
    descriptionAr = 'إشارة هبوطية استباقية من Cyber Cycle';
  } else if (cc.crossover !== 'none') {
    signal = cc.crossover === 'bullish' ? 'bullish' : 'bearish';
    strength = 72;
    description = `Cyber Cycle ${cc.crossover} crossover`;
    descriptionAr = `تقاطع ${cc.crossover === 'bullish' ? 'صعودي' : 'هبوطي'} في Cyber Cycle`;
  } else if (cc.phase === 'turning') {
    signal = 'neutral';
    strength = 50;
    description = 'Cyber Cycle at turning point';
    descriptionAr = 'Cyber Cycle عند نقطة انعطاف';
  }
  
  return {
    indicator: 'cyberCycle',
    timeframe,
    signal,
    strength: Math.min(100, strength),
    confidence: cc.leadingSignal ? 82 : 68,
    divergence: 'none',
    crossover: cc.crossover,
    momentum: cc.momentum,
    description: description || `Cyber Cycle phase: ${cc.phase}`,
    descriptionAr: descriptionAr || `مرحلة Cyber Cycle: ${cc.phase}`,
  };
}

/**
 * Extract signal from CVD
 * استخراج إشارة من CVD
 */
function extractCVDSignal(
  indicators: AllIndicatorsState,
  timeframe: Timeframe
): ExtractedSignal {
  const cvd = indicators.cvd;
  
  let signal: TrendDirection = cvd.trend;
  let strength = cvd.strength;
  let description = '';
  let descriptionAr = '';
  
  if (cvd.absorptionDetected) {
    // Absorption often precedes reversal
    signal = cvd.delta > 0 ? 'bearish' : 'bullish';
    strength = 85;
    description = `Volume absorption detected - potential ${signal} reversal`;
    descriptionAr = `تم اكتشاف امتصاص الحجم - انعكاس ${signal === 'bullish' ? 'صعودي' : 'هبوطي'} محتمل`;
  } else if (cvd.divergenceWithPrice !== 'none') {
    signal = cvd.divergenceWithPrice === 'bullish' ? 'bullish' : 'bearish';
    strength = 88;
    description = `CVD ${cvd.divergenceWithPrice} divergence with price`;
    descriptionAr = `تباعد ${cvd.divergenceWithPrice === 'bullish' ? 'صعودي' : 'هبوطي'} في CVD`;
  } else {
    strength = 55 + Math.abs(cvd.momentum) * 0.3;
    description = `CVD trending ${cvd.trend}`;
    descriptionAr = `CVD في اتجاه ${cvd.trend === 'bullish' ? 'صعودي' : cvd.trend === 'bearish' ? 'هبوطي' : 'محايد'}`;
  }
  
  return {
    indicator: 'cvd',
    timeframe,
    signal,
    strength: Math.min(100, strength),
    confidence: cvd.absorptionDetected ? 82 : cvd.hasDivergence ? 85 : 65,
    divergence: cvd.divergenceWithPrice,
    crossover: 'none',
    momentum: cvd.momentum,
    description,
    descriptionAr,
  };
}

/**
 * Extract signal from Klinger
 * استخراج إشارة من Klinger
 */
function extractKlingerSignal(
  indicators: AllIndicatorsState,
  timeframe: Timeframe
): ExtractedSignal {
  const klinger = indicators.klinger;
  
  let signal: TrendDirection = klinger.trend;
  let strength = klinger.strength;
  let description = '';
  let descriptionAr = '';
  
  if (klinger.crossover !== 'none') {
    signal = klinger.crossover === 'bullish' ? 'bullish' : 'bearish';
    strength = 78;
    description = `Klinger ${klinger.crossover} crossover`;
    descriptionAr = `تقاطع ${klinger.crossover === 'bullish' ? 'صعودي' : 'هبوطي'} في Klinger`;
  }
  
  if (klinger.accumulationPhase) {
    signal = 'bullish';
    strength = Math.max(strength, 72);
    description = 'Klinger indicates accumulation phase';
    descriptionAr = 'Klinger يشير إلى مرحلة تجميع';
  } else if (klinger.oscillator < 0 && klinger.oscillator < klinger.signal) {
    signal = 'bearish';
    strength = Math.max(strength, 72);
    description = 'Klinger indicates distribution phase';
    descriptionAr = 'Klinger يشير إلى مرحلة توزيع';
  }
  
  return {
    indicator: 'klinger',
    timeframe,
    signal,
    strength: Math.min(100, strength),
    confidence: klinger.crossover !== 'none' ? 75 : 62,
    divergence: 'none',
    crossover: klinger.crossover,
    momentum: klinger.momentum,
    description: description || `Klinger: ${klinger.oscillator.toFixed(0)}`,
    descriptionAr: descriptionAr || `Klinger: ${klinger.oscillator.toFixed(0)}`,
  };
}

/**
 * Extract signal from MFI
 * استخراج إشارة من MFI
 */
function extractMFISignal(
  indicators: AllIndicatorsState,
  timeframe: Timeframe
): ExtractedSignal {
  const mfi = indicators.mfi;
  
  let signal: TrendDirection = mfi.direction;
  let strength = mfi.strength;
  let description = '';
  let descriptionAr = '';
  
  if (mfi.divergenceWithPrice !== 'none') {
    signal = mfi.divergenceWithPrice === 'bullish' ? 'bullish' : 'bearish';
    strength = 88;
    description = `MFI ${mfi.divergenceWithPrice} divergence`;
    descriptionAr = `تباعد ${mfi.divergenceWithPrice === 'bullish' ? 'صعودي' : 'هبوطي'} في MFI`;
  } else if (mfi.extremeReading) {
    if (mfi.zone === 'oversold') {
      signal = 'bullish';
      strength = 80;
      description = 'MFI extreme oversold';
      descriptionAr = 'MFI في تشبع بيعي شديد';
    } else if (mfi.zone === 'overbought') {
      signal = 'bearish';
      strength = 80;
      description = 'MFI extreme overbought';
      descriptionAr = 'MFI في تشبع شرائي شديد';
    }
  } else if (mfi.crossover !== 'none') {
    signal = mfi.crossover === 'bullish' ? 'bullish' : 'bearish';
    strength = 65;
    description = `MFI ${mfi.crossover} crossover`;
    descriptionAr = `تقاطع ${mfi.crossover === 'bullish' ? 'صعودي' : 'هبوطي'} في MFI`;
  }
  
  return {
    indicator: 'mfi',
    timeframe,
    signal,
    strength: Math.min(100, strength),
    confidence: mfi.hasDivergence ? 85 : mfi.extremeReading ? 78 : 65,
    divergence: mfi.divergenceWithPrice,
    crossover: mfi.crossover,
    momentum: mfi.momentum,
    description: description || `MFI: ${mfi.mfi.toFixed(1)}`,
    descriptionAr: descriptionAr || `MFI: ${mfi.mfi.toFixed(1)}`,
  };
}

// ==========================================================
// MAIN EXTRACTION FUNCTION - دالة الاستخراج الرئيسية
// ==========================================================

/**
 * Extract all signals from indicators
 * استخراج جميع الإشارات من المؤشرات
 */
export function extractAllSignals(
  indicators: AllIndicatorsState,
  timeframe: Timeframe
): ExtractedSignal[] {
  return [
    extractVolumeSignal(indicators, timeframe),
    extractRSISignal(indicators, timeframe),
    extractStochRSISignal(indicators, timeframe),
    extractMACDSignal(indicators, timeframe),
    extractOBVSignal(indicators, timeframe),
    extractADXSignal(indicators, timeframe),
    extractConnorsRSISignal(indicators, timeframe),
    extractLaguerreRSISignal(indicators, timeframe),
    extractFisherSignal(indicators, timeframe),
    extractCyberCycleSignal(indicators, timeframe),
    extractCVDSignal(indicators, timeframe),
    extractKlingerSignal(indicators, timeframe),
    extractMFISignal(indicators, timeframe),
  ];
}

/**
 * Extract divergence signals
 * استخراج إشارات التباعد
 */
export function extractDivergences(
  signals: ExtractedSignal[]
): DivergenceSignal[] {
  const divergences: DivergenceSignal[] = [];
  
  for (const signal of signals) {
    if (signal.divergence !== 'none') {
      divergences.push({
        type: 'regular',
        direction: signal.divergence,
        indicator: signal.indicator,
        timeframe: signal.timeframe,
        strength: signal.strength,
        pricePoints: [], // Would need price data to fill
        indicatorPoints: [], // Would need indicator data to fill
        confidence: signal.confidence,
      });
    }
  }
  
  return divergences;
}

/**
 * Detect momentum shifts across indicators
 * كشف تحولات الزخم عبر المؤشرات
 */
export function detectMomentumShifts(
  signals: ExtractedSignal[],
  timeframe: Timeframe,
  threshold: number = 30
): MomentumShift | null {
  const bullishMomentum: string[] = [];
  const bearishMomentum: string[] = [];
  let totalMomentum = 0;
  
  for (const signal of signals) {
    if (signal.momentum > threshold) {
      bullishMomentum.push(signal.indicator);
    } else if (signal.momentum < -threshold) {
      bearishMomentum.push(signal.indicator);
    }
    totalMomentum += signal.momentum;
  }
  
  const avgMomentum = totalMomentum / signals.length;
  
  // Significant shift if majority of indicators show strong momentum
  if (bullishMomentum.length >= 6 || bearishMomentum.length >= 6) {
    const direction: TrendDirection = bullishMomentum.length > bearishMomentum.length ? 'bullish' : 'bearish';
    const indicators = direction === 'bullish' ? bullishMomentum : bearishMomentum;
    
    return {
      timeframe,
      previousMomentum: 0,
      currentMomentum: avgMomentum,
      shiftMagnitude: Math.abs(avgMomentum),
      direction,
      indicators,
      confidence: Math.min(95, 60 + indicators.length * 5),
    };
  }
  
  return null;
}

/**
 * Get signal summary statistics
 * الحصول على إحصائيات ملخص الإشارات
 */
export function getSignalSummary(signals: ExtractedSignal[]): {
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  avgStrength: number;
  avgConfidence: number;
  dominantSignal: TrendDirection;
  signalRatio: number;
} {
  let bullishCount = 0;
  let bearishCount = 0;
  let neutralCount = 0;
  let totalStrength = 0;
  let totalConfidence = 0;
  
  for (const signal of signals) {
    if (signal.signal === 'bullish') bullishCount++;
    else if (signal.signal === 'bearish') bearishCount++;
    else neutralCount++;
    
    totalStrength += signal.strength;
    totalConfidence += signal.confidence;
  }
  
  const total = signals.length;
  const avgStrength = total > 0 ? totalStrength / total : 0;
  const avgConfidence = total > 0 ? totalConfidence / total : 0;
  
  let dominantSignal: TrendDirection = 'neutral';
  if (bullishCount > bearishCount && bullishCount > neutralCount) {
    dominantSignal = 'bullish';
  } else if (bearishCount > bullishCount && bearishCount > neutralCount) {
    dominantSignal = 'bearish';
  }
  
  const signalRatio = total > 0 ? 
    (dominantSignal === 'bullish' ? bullishCount : bearishCount) / total * 100 : 0;
  
  return {
    bullishCount,
    bearishCount,
    neutralCount,
    avgStrength,
    avgConfidence,
    dominantSignal,
    signalRatio,
  };
}
