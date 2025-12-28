/**
 * Accuracy Tracker - نظام تتبع دقة التنبؤات
 * 
 * نظام لتتبع دقة الإشارات والتنبؤات مع:
 * - تسجيل التنبؤات في localStorage
 * - التحقق من النتائج الفعلية
 * - حساب الدقة المتدحرجة (30 يوم)
 * - تعديل الأوزان تلقائياً أسبوعياً
 * 
 * @author Nexus Elite Team
 * @version 1.0.0
 */

// Define types locally until elite-trend-algorithms module is available
export type TrendDirection = 'bullish' | 'bearish' | 'neutral';
export type MarketRegime = 'trending' | 'ranging' | 'volatile';

// ==========================================================
// TYPES & INTERFACES
// ==========================================================

export interface PredictionRecord {
  id: string;
  timestamp: number;
  pair: string;
  timeframe: string;
  
  // Signal Details
  direction: TrendDirection;
  score: number;
  confidence: number;
  regime: MarketRegime;
  
  // Entry Context
  entryPrice: number;
  targetPrice: number;      // Based on signal direction
  stopLossPrice: number;
  
  // Category Scores at time of prediction
  categoryScores: {
    momentum: number;
    trend: number;
    volume: number;
    volatility: number;
  };
  
  // Outcome (filled when validated)
  outcome?: 'hit_target' | 'hit_stop' | 'expired' | 'pending';
  exitPrice?: number;
  exitTimestamp?: number;
  actualMove?: number;       // Percentage move from entry
  
  // Metadata
  expiryTimestamp: number;   // When prediction expires
  validatedAt?: number;
}

export interface AccuracyStats {
  // Overall Stats
  totalPredictions: number;
  validatedPredictions: number;
  pendingPredictions: number;
  
  // Success Metrics
  hitTargetCount: number;
  hitStopCount: number;
  expiredCount: number;
  
  // Accuracy Rates
  overallAccuracy: number;          // hit_target / (hit_target + hit_stop)
  directionAccuracy: number;        // Correct direction regardless of target
  
  // By Direction
  bullishAccuracy: number;
  bearishAccuracy: number;
  
  // By Confidence Level
  highConfidenceAccuracy: number;   // Confidence >= 80
  mediumConfidenceAccuracy: number; // 60 <= Confidence < 80
  lowConfidenceAccuracy: number;    // Confidence < 60
  
  // By Category
  categoryAccuracy: {
    momentum: number;
    trend: number;
    volume: number;
    volatility: number;
  };
  
  // By Regime
  regimeAccuracy: {
    trending: number;
    ranging: number;
    volatile: number;
  };
  
  // Time Range
  periodStart: number;
  periodEnd: number;
}

export interface AdaptiveWeights {
  momentum: number;
  trend: number;
  volume: number;
  volatility: number;
  lastUpdated: number;
  basedOnPredictions: number;
}

// ==========================================================
// CONSTANTS
// ==========================================================

const STORAGE_KEY_PREDICTIONS = 'nexus_predictions';
const STORAGE_KEY_WEIGHTS = 'nexus_adaptive_weights';
const PREDICTION_EXPIRY_HOURS: Record<string, number> = {
  '15m': 4,      // 4 hours
  '1h': 12,      // 12 hours
  '4h': 48,      // 2 days
  '1d': 168,     // 7 days
  '3d': 504      // 21 days
};

const DEFAULT_WEIGHTS: AdaptiveWeights = {
  momentum: 0.25,
  trend: 0.30,
  volume: 0.25,
  volatility: 0.20,
  lastUpdated: Date.now(),
  basedOnPredictions: 0
};

// ==========================================================
// LOCAL STORAGE HELPERS
// ==========================================================

function getPredictions(): PredictionRecord[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PREDICTIONS);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (e) {
    console.error('Error reading predictions from localStorage:', e);
    return [];
  }
}

function savePredictions(predictions: PredictionRecord[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    // Keep only last 500 predictions to avoid storage bloat
    const toSave = predictions.slice(-500);
    localStorage.setItem(STORAGE_KEY_PREDICTIONS, JSON.stringify(toSave));
  } catch (e) {
    console.error('Error saving predictions to localStorage:', e);
  }
}

function getStoredWeights(): AdaptiveWeights {
  if (typeof window === 'undefined') return DEFAULT_WEIGHTS;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY_WEIGHTS);
    if (!stored) return DEFAULT_WEIGHTS;
    return JSON.parse(stored);
  } catch (e) {
    return DEFAULT_WEIGHTS;
  }
}

function saveWeights(weights: AdaptiveWeights): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY_WEIGHTS, JSON.stringify(weights));
  } catch (e) {
    console.error('Error saving weights to localStorage:', e);
  }
}

// ==========================================================
// PREDICTION RECORDING
// ==========================================================

/**
 * Record a new prediction
 */
export function recordPrediction(
  pair: string,
  timeframe: string,
  direction: TrendDirection,
  score: number,
  confidence: number,
  regime: MarketRegime,
  entryPrice: number,
  categoryScores: { momentum: number; trend: number; volume: number; volatility: number }
): PredictionRecord {
  const now = Date.now();
  const expiryHours = PREDICTION_EXPIRY_HOURS[timeframe] || 48;
  
  // Calculate target and stop based on direction and volatility
  // Default: 2% target, 1% stop (2:1 R:R)
  const targetPercent = 0.02;
  const stopPercent = 0.01;
  
  let targetPrice: number;
  let stopLossPrice: number;
  
  if (direction === 'bullish') {
    targetPrice = entryPrice * (1 + targetPercent);
    stopLossPrice = entryPrice * (1 - stopPercent);
  } else if (direction === 'bearish') {
    targetPrice = entryPrice * (1 - targetPercent);
    stopLossPrice = entryPrice * (1 + stopPercent);
  } else {
    // Neutral - no clear target
    targetPrice = entryPrice;
    stopLossPrice = entryPrice;
  }
  
  const prediction: PredictionRecord = {
    id: `${pair}_${timeframe}_${now}`,
    timestamp: now,
    pair,
    timeframe,
    direction,
    score,
    confidence,
    regime,
    entryPrice,
    targetPrice,
    stopLossPrice,
    categoryScores,
    outcome: 'pending',
    expiryTimestamp: now + (expiryHours * 60 * 60 * 1000)
  };
  
  const predictions = getPredictions();
  predictions.push(prediction);
  savePredictions(predictions);
  
  return prediction;
}

/**
 * Validate a prediction outcome
 */
export function validatePrediction(
  predictionId: string,
  currentPrice: number
): PredictionRecord | null {
  const predictions = getPredictions();
  const index = predictions.findIndex(p => p.id === predictionId);
  
  if (index === -1) return null;
  
  const prediction = predictions[index];
  const now = Date.now();
  
  // Already validated
  if (prediction.outcome !== 'pending') {
    return prediction;
  }
  
  // Calculate actual move
  const actualMove = ((currentPrice - prediction.entryPrice) / prediction.entryPrice) * 100;
  prediction.actualMove = actualMove;
  prediction.exitPrice = currentPrice;
  prediction.exitTimestamp = now;
  prediction.validatedAt = now;
  
  // Determine outcome
  if (prediction.direction === 'bullish') {
    if (currentPrice >= prediction.targetPrice) {
      prediction.outcome = 'hit_target';
    } else if (currentPrice <= prediction.stopLossPrice) {
      prediction.outcome = 'hit_stop';
    } else if (now >= prediction.expiryTimestamp) {
      prediction.outcome = 'expired';
    }
  } else if (prediction.direction === 'bearish') {
    if (currentPrice <= prediction.targetPrice) {
      prediction.outcome = 'hit_target';
    } else if (currentPrice >= prediction.stopLossPrice) {
      prediction.outcome = 'hit_stop';
    } else if (now >= prediction.expiryTimestamp) {
      prediction.outcome = 'expired';
    }
  } else {
    // Neutral - check if price stayed within range
    if (now >= prediction.expiryTimestamp) {
      prediction.outcome = Math.abs(actualMove) < 1 ? 'hit_target' : 'expired';
    }
  }
  
  predictions[index] = prediction;
  savePredictions(predictions);
  
  return prediction;
}

/**
 * Auto-validate all pending predictions
 */
export function autoValidatePredictions(
  currentPrices: Record<string, number>
): PredictionRecord[] {
  const predictions = getPredictions();
  const validated: PredictionRecord[] = [];
  const now = Date.now();
  
  predictions.forEach((prediction, index) => {
    if (prediction.outcome !== 'pending') return;
    
    const currentPrice = currentPrices[prediction.pair];
    if (!currentPrice) return;
    
    // Force validation if expired
    if (now >= prediction.expiryTimestamp) {
      prediction.exitPrice = currentPrice;
      prediction.exitTimestamp = now;
      prediction.validatedAt = now;
      prediction.actualMove = ((currentPrice - prediction.entryPrice) / prediction.entryPrice) * 100;
      
      // Check direction accuracy even if expired
      const correctDirection = 
        (prediction.direction === 'bullish' && currentPrice > prediction.entryPrice) ||
        (prediction.direction === 'bearish' && currentPrice < prediction.entryPrice) ||
        (prediction.direction === 'neutral' && Math.abs(prediction.actualMove) < 1);
      
      prediction.outcome = correctDirection ? 'hit_target' : 'expired';
      validated.push(prediction);
    } else {
      // Check if target or stop hit
      const result = validatePrediction(prediction.id, currentPrice);
      if (result && result.outcome !== 'pending') {
        validated.push(result);
      }
    }
  });
  
  if (validated.length > 0) {
    savePredictions(predictions);
  }
  
  return validated;
}

// ==========================================================
// ACCURACY STATISTICS
// ==========================================================

/**
 * Get accuracy statistics for a time period
 */
export function getAccuracyStats(
  days: number = 30,
  pair?: string,
  timeframe?: string
): AccuracyStats {
  const predictions = getPredictions();
  const now = Date.now();
  const periodStart = now - (days * 24 * 60 * 60 * 1000);
  
  // Filter predictions
  let filtered = predictions.filter(p => p.timestamp >= periodStart);
  if (pair) filtered = filtered.filter(p => p.pair === pair);
  if (timeframe) filtered = filtered.filter(p => p.timeframe === timeframe);
  
  // Separate by outcome
  const validated = filtered.filter(p => p.outcome !== 'pending');
  const pending = filtered.filter(p => p.outcome === 'pending');
  
  const hitTarget = validated.filter(p => p.outcome === 'hit_target');
  const hitStop = validated.filter(p => p.outcome === 'hit_stop');
  const expired = validated.filter(p => p.outcome === 'expired');
  
  // Calculate overall accuracy
  const decisivePredictions = hitTarget.length + hitStop.length;
  const overallAccuracy = decisivePredictions > 0 
    ? (hitTarget.length / decisivePredictions) * 100 
    : 0;
  
  // Direction accuracy (correct direction regardless of target)
  const correctDirection = validated.filter(p => {
    if (!p.actualMove) return false;
    if (p.direction === 'bullish') return p.actualMove > 0;
    if (p.direction === 'bearish') return p.actualMove < 0;
    return Math.abs(p.actualMove) < 1;
  });
  const directionAccuracy = validated.length > 0
    ? (correctDirection.length / validated.length) * 100
    : 0;
  
  // By Direction
  const bullishPreds = validated.filter(p => p.direction === 'bullish');
  const bearishPreds = validated.filter(p => p.direction === 'bearish');
  
  const bullishHits = bullishPreds.filter(p => p.outcome === 'hit_target').length;
  const bearishHits = bearishPreds.filter(p => p.outcome === 'hit_target').length;
  
  const bullishAccuracy = bullishPreds.length > 0 
    ? (bullishHits / bullishPreds.length) * 100 
    : 0;
  const bearishAccuracy = bearishPreds.length > 0 
    ? (bearishHits / bearishPreds.length) * 100 
    : 0;
  
  // By Confidence Level
  const highConf = validated.filter(p => p.confidence >= 80);
  const medConf = validated.filter(p => p.confidence >= 60 && p.confidence < 80);
  const lowConf = validated.filter(p => p.confidence < 60);
  
  const highConfHits = highConf.filter(p => p.outcome === 'hit_target').length;
  const medConfHits = medConf.filter(p => p.outcome === 'hit_target').length;
  const lowConfHits = lowConf.filter(p => p.outcome === 'hit_target').length;
  
  const highConfidenceAccuracy = highConf.length > 0 
    ? (highConfHits / highConf.length) * 100 
    : 0;
  const mediumConfidenceAccuracy = medConf.length > 0 
    ? (medConfHits / medConf.length) * 100 
    : 0;
  const lowConfidenceAccuracy = lowConf.length > 0 
    ? (lowConfHits / lowConf.length) * 100 
    : 0;
  
  // By Category - calculate accuracy when category was strong
  const calculateCategoryAccuracy = (category: keyof PredictionRecord['categoryScores']) => {
    const strongCategory = validated.filter(p => 
      Math.abs(p.categoryScores[category]) >= 40
    );
    const hits = strongCategory.filter(p => p.outcome === 'hit_target').length;
    return strongCategory.length > 0 ? (hits / strongCategory.length) * 100 : 0;
  };
  
  const categoryAccuracy = {
    momentum: calculateCategoryAccuracy('momentum'),
    trend: calculateCategoryAccuracy('trend'),
    volume: calculateCategoryAccuracy('volume'),
    volatility: calculateCategoryAccuracy('volatility')
  };
  
  // By Regime
  const calculateRegimeAccuracy = (regime: MarketRegime) => {
    const regimePreds = validated.filter(p => p.regime === regime);
    const hits = regimePreds.filter(p => p.outcome === 'hit_target').length;
    return regimePreds.length > 0 ? (hits / regimePreds.length) * 100 : 0;
  };
  
  const regimeAccuracy = {
    trending: calculateRegimeAccuracy('trending'),
    ranging: calculateRegimeAccuracy('ranging'),
    volatile: calculateRegimeAccuracy('volatile')
  };
  
  return {
    totalPredictions: filtered.length,
    validatedPredictions: validated.length,
    pendingPredictions: pending.length,
    hitTargetCount: hitTarget.length,
    hitStopCount: hitStop.length,
    expiredCount: expired.length,
    overallAccuracy: Math.round(overallAccuracy * 10) / 10,
    directionAccuracy: Math.round(directionAccuracy * 10) / 10,
    bullishAccuracy: Math.round(bullishAccuracy * 10) / 10,
    bearishAccuracy: Math.round(bearishAccuracy * 10) / 10,
    highConfidenceAccuracy: Math.round(highConfidenceAccuracy * 10) / 10,
    mediumConfidenceAccuracy: Math.round(mediumConfidenceAccuracy * 10) / 10,
    lowConfidenceAccuracy: Math.round(lowConfidenceAccuracy * 10) / 10,
    categoryAccuracy: {
      momentum: Math.round(categoryAccuracy.momentum * 10) / 10,
      trend: Math.round(categoryAccuracy.trend * 10) / 10,
      volume: Math.round(categoryAccuracy.volume * 10) / 10,
      volatility: Math.round(categoryAccuracy.volatility * 10) / 10
    },
    regimeAccuracy: {
      trending: Math.round(regimeAccuracy.trending * 10) / 10,
      ranging: Math.round(regimeAccuracy.ranging * 10) / 10,
      volatile: Math.round(regimeAccuracy.volatile * 10) / 10
    },
    periodStart,
    periodEnd: now
  };
}

// ==========================================================
// ADAPTIVE WEIGHTS
// ==========================================================

/**
 * Get adaptive weights based on recent accuracy
 * Weights are recalculated weekly
 */
export function getAdaptiveWeights(): AdaptiveWeights {
  const stored = getStoredWeights();
  const now = Date.now();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  
  // Check if weights need updating (weekly)
  if (now - stored.lastUpdated < oneWeek) {
    return stored;
  }
  
  // Get recent accuracy stats
  const stats = getAccuracyStats(30);
  
  // Need minimum predictions to adjust
  if (stats.validatedPredictions < 20) {
    return stored;
  }
  
  // Calculate new weights based on category accuracy
  const catAccuracy = stats.categoryAccuracy;
  const totalAccuracy = catAccuracy.momentum + catAccuracy.trend + 
                        catAccuracy.volume + catAccuracy.volatility;
  
  if (totalAccuracy === 0) {
    return stored;
  }
  
  // Normalize weights
  let newWeights: AdaptiveWeights = {
    momentum: catAccuracy.momentum / totalAccuracy,
    trend: catAccuracy.trend / totalAccuracy,
    volume: catAccuracy.volume / totalAccuracy,
    volatility: catAccuracy.volatility / totalAccuracy,
    lastUpdated: now,
    basedOnPredictions: stats.validatedPredictions
  };
  
  // Apply smoothing (don't change weights too drastically)
  // Blend 70% new, 30% old
  newWeights.momentum = newWeights.momentum * 0.7 + stored.momentum * 0.3;
  newWeights.trend = newWeights.trend * 0.7 + stored.trend * 0.3;
  newWeights.volume = newWeights.volume * 0.7 + stored.volume * 0.3;
  newWeights.volatility = newWeights.volatility * 0.7 + stored.volatility * 0.3;
  
  // Ensure minimum weight (0.10) for each category
  const minWeight = 0.10;
  const categories: (keyof Omit<AdaptiveWeights, 'lastUpdated' | 'basedOnPredictions'>)[] = 
    ['momentum', 'trend', 'volume', 'volatility'];
  
  categories.forEach(cat => {
    if (newWeights[cat] < minWeight) {
      newWeights[cat] = minWeight;
    }
  });
  
  // Re-normalize after applying minimum
  const total = newWeights.momentum + newWeights.trend + 
                newWeights.volume + newWeights.volatility;
  newWeights.momentum /= total;
  newWeights.trend /= total;
  newWeights.volume /= total;
  newWeights.volatility /= total;
  
  // Round to 2 decimal places
  newWeights.momentum = Math.round(newWeights.momentum * 100) / 100;
  newWeights.trend = Math.round(newWeights.trend * 100) / 100;
  newWeights.volume = Math.round(newWeights.volume * 100) / 100;
  newWeights.volatility = Math.round(newWeights.volatility * 100) / 100;
  
  saveWeights(newWeights);
  
  return newWeights;
}

/**
 * Reset weights to default
 */
export function resetAdaptiveWeights(): AdaptiveWeights {
  const defaultWeights = { ...DEFAULT_WEIGHTS, lastUpdated: Date.now() };
  saveWeights(defaultWeights);
  return defaultWeights;
}

// ==========================================================
// DISPLAY HELPERS
// ==========================================================

/**
 * Get accuracy display info
 */
export function getAccuracyDisplayInfo(accuracy: number): {
  label: string;
  labelAr: string;
  color: string;
  emoji: string;
} {
  if (accuracy >= 75) {
    return {
      label: 'Excellent',
      labelAr: 'ممتازة',
      color: '#10B981',
      emoji: '🏆'
    };
  } else if (accuracy >= 60) {
    return {
      label: 'Good',
      labelAr: 'جيدة',
      color: '#34D399',
      emoji: '✓'
    };
  } else if (accuracy >= 50) {
    return {
      label: 'Average',
      labelAr: 'متوسطة',
      color: '#FBBF24',
      emoji: '○'
    };
  } else {
    return {
      label: 'Needs Improvement',
      labelAr: 'تحتاج تحسين',
      color: '#F87171',
      emoji: '⚠'
    };
  }
}

/**
 * Get recent predictions for display
 */
export function getRecentPredictions(
  limit: number = 10,
  pair?: string
): PredictionRecord[] {
  let predictions = getPredictions();
  
  if (pair) {
    predictions = predictions.filter(p => p.pair === pair);
  }
  
  return predictions
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

/**
 * Clear old predictions (older than 90 days)
 */
export function cleanupOldPredictions(): number {
  const predictions = getPredictions();
  const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
  
  const filtered = predictions.filter(p => p.timestamp >= ninetyDaysAgo);
  const removed = predictions.length - filtered.length;
  
  if (removed > 0) {
    savePredictions(filtered);
  }
  
  return removed;
}

/**
 * Export predictions for analysis
 */
export function exportPredictions(): string {
  const predictions = getPredictions();
  return JSON.stringify(predictions, null, 2);
}

/**
 * Import predictions (for migration)
 */
export function importPredictions(jsonString: string): boolean {
  try {
    const imported = JSON.parse(jsonString) as PredictionRecord[];
    const existing = getPredictions();
    
    // Merge, avoiding duplicates
    const existingIds = new Set(existing.map(p => p.id));
    const newPredictions = imported.filter(p => !existingIds.has(p.id));
    
    savePredictions([...existing, ...newPredictions]);
    return true;
  } catch (e) {
    console.error('Error importing predictions:', e);
    return false;
  }
}
