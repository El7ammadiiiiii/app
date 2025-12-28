/**
 * Risk Reward Calculator - حاسبة المخاطر والأرباح
 * 
 * Professional risk management:
 * - Auto stop loss calculation (ATR, structure, pattern-based)
 * - Multiple take profit levels (Fibonacci, R:R ratios)
 * - Position sizing (fixed risk, Kelly criterion, volatility-based)
 * - Trade journal integration
 * 
 * @author CCCWAYS Elite Trading System
 * @version 2.0.0
 */

import { OHLCV } from './technical';

// ==========================================================
// INTERFACES
// ==========================================================

export type StopLossType = 
  | 'atr_based'
  | 'swing_structure'
  | 'pattern_based'
  | 'percentage'
  | 'volatility_based'
  | 'support_resistance';

export type TakeProfitType =
  | 'risk_reward_ratio'
  | 'fibonacci_extension'
  | 'swing_target'
  | 'pattern_target'
  | 'percentage'
  | 'trailing';

export type PositionSizeMethod =
  | 'fixed_risk'
  | 'fixed_amount'
  | 'kelly_criterion'
  | 'volatility_based'
  | 'martingale'
  | 'anti_martingale';

export interface StopLossLevel {
  price: number;
  type: StopLossType;
  distance: number; // In price units
  distancePercent: number;
  reason: string;
  confidence: number;
}

export interface TakeProfitLevel {
  price: number;
  type: TakeProfitType;
  riskRewardRatio: number;
  probability: number;
  partialExitPercent: number; // e.g., 50% at TP1
  reason: string;
}

export interface PositionSize {
  units: number;
  value: number; // In quote currency
  riskAmount: number;
  riskPercent: number;
  method: PositionSizeMethod;
  leverage?: number;
}

export interface TradeSetup {
  direction: 'long' | 'short';
  entryPrice: number;
  stopLoss: StopLossLevel;
  alternativeStopLosses: StopLossLevel[];
  takeProfits: TakeProfitLevel[];
  positionSize: PositionSize;
  riskRewardRatio: number;
  expectedValue: number; // Based on probability-weighted R:R
  maxDrawdown: number;
  breakEvenPrice: number;
  summary: TradeSummary;
}

export interface TradeSummary {
  riskAmount: number;
  potentialReward: number;
  riskRewardRatio: number;
  winRate: number; // Required for profitable trading
  expectedPnL: number;
  recommendation: 'excellent' | 'good' | 'acceptable' | 'poor' | 'avoid';
  warnings: string[];
}

export interface RiskParameters {
  accountBalance: number;
  riskPerTrade: number; // Percentage, e.g., 1 = 1%
  maxLossPerDay?: number;
  maxOpenPositions?: number;
  currentOpenRisk?: number;
}

// ==========================================================
// HELPER FUNCTIONS
// ==========================================================

function calculateATR(candles: OHLCV[], period: number = 14): number {
  if (candles.length < period + 1) return 0;
  
  let atrSum = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1]?.close || candles[i].open;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    atrSum += tr;
  }
  
  return atrSum / period;
}

function findRecentSwingLow(candles: OHLCV[], lookback: number = 20): number {
  const relevantCandles = candles.slice(-lookback);
  return Math.min(...relevantCandles.map(c => c.low));
}

function findRecentSwingHigh(candles: OHLCV[], lookback: number = 20): number {
  const relevantCandles = candles.slice(-lookback);
  return Math.max(...relevantCandles.map(c => c.high));
}

function calculateVolatility(candles: OHLCV[], period: number = 20): number {
  if (candles.length < period) return 0;
  
  const returns: number[] = [];
  for (let i = candles.length - period; i < candles.length; i++) {
    if (candles[i - 1]) {
      returns.push((candles[i].close - candles[i - 1].close) / candles[i - 1].close);
    }
  }
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const squaredDiffs = returns.map(r => Math.pow(r - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / returns.length;
  
  return Math.sqrt(variance);
}

// ==========================================================
// STOP LOSS CALCULATIONS
// ==========================================================

export function calculateStopLoss(
  candles: OHLCV[],
  direction: 'long' | 'short',
  entryPrice: number,
  options: {
    atrMultiplier?: number;
    swingLookback?: number;
    minDistance?: number;
    maxDistance?: number;
  } = {}
): { primary: StopLossLevel; alternatives: StopLossLevel[] } {
  const {
    atrMultiplier = 2,
    swingLookback = 20,
    minDistance = 0.001, // 0.1%
    maxDistance = 0.05, // 5%
  } = options;
  
  const atr = calculateATR(candles);
  const stopLevels: StopLossLevel[] = [];
  
  if (direction === 'long') {
    // ATR-based stop
    const atrStop = entryPrice - atr * atrMultiplier;
    stopLevels.push({
      price: atrStop,
      type: 'atr_based',
      distance: entryPrice - atrStop,
      distancePercent: (entryPrice - atrStop) / entryPrice * 100,
      reason: `${atrMultiplier}x ATR below entry`,
      confidence: 75,
    });
    
    // Swing structure stop
    const swingLow = findRecentSwingLow(candles, swingLookback);
    const structureStop = swingLow - atr * 0.2; // Buffer below swing
    stopLevels.push({
      price: structureStop,
      type: 'swing_structure',
      distance: entryPrice - structureStop,
      distancePercent: (entryPrice - structureStop) / entryPrice * 100,
      reason: 'Below recent swing low',
      confidence: 85,
    });
    
    // Volatility-based stop
    const volatility = calculateVolatility(candles);
    const volStop = entryPrice * (1 - volatility * 2);
    stopLevels.push({
      price: volStop,
      type: 'volatility_based',
      distance: entryPrice - volStop,
      distancePercent: (entryPrice - volStop) / entryPrice * 100,
      reason: '2x daily volatility',
      confidence: 70,
    });
    
    // Percentage-based stop
    const percStop = entryPrice * 0.98; // 2% stop
    stopLevels.push({
      price: percStop,
      type: 'percentage',
      distance: entryPrice - percStop,
      distancePercent: 2,
      reason: 'Fixed 2% stop loss',
      confidence: 60,
    });
    
  } else {
    // Short position stops (above entry)
    const atrStop = entryPrice + atr * atrMultiplier;
    stopLevels.push({
      price: atrStop,
      type: 'atr_based',
      distance: atrStop - entryPrice,
      distancePercent: (atrStop - entryPrice) / entryPrice * 100,
      reason: `${atrMultiplier}x ATR above entry`,
      confidence: 75,
    });
    
    const swingHigh = findRecentSwingHigh(candles, swingLookback);
    const structureStop = swingHigh + atr * 0.2;
    stopLevels.push({
      price: structureStop,
      type: 'swing_structure',
      distance: structureStop - entryPrice,
      distancePercent: (structureStop - entryPrice) / entryPrice * 100,
      reason: 'Above recent swing high',
      confidence: 85,
    });
    
    const volatility = calculateVolatility(candles);
    const volStop = entryPrice * (1 + volatility * 2);
    stopLevels.push({
      price: volStop,
      type: 'volatility_based',
      distance: volStop - entryPrice,
      distancePercent: (volStop - entryPrice) / entryPrice * 100,
      reason: '2x daily volatility',
      confidence: 70,
    });
    
    const percStop = entryPrice * 1.02;
    stopLevels.push({
      price: percStop,
      type: 'percentage',
      distance: percStop - entryPrice,
      distancePercent: 2,
      reason: 'Fixed 2% stop loss',
      confidence: 60,
    });
  }
  
  // Filter by min/max distance
  const filtered = stopLevels.filter(s => 
    s.distancePercent >= minDistance * 100 && s.distancePercent <= maxDistance * 100
  );
  
  // Sort by confidence
  filtered.sort((a, b) => b.confidence - a.confidence);
  
  const primary = filtered[0] || stopLevels[0];
  const alternatives = filtered.slice(1);
  
  return { primary, alternatives };
}

// ==========================================================
// TAKE PROFIT CALCULATIONS
// ==========================================================

export function calculateTakeProfits(
  candles: OHLCV[],
  direction: 'long' | 'short',
  entryPrice: number,
  stopLossPrice: number,
  options: {
    ratios?: number[];
    fibExtensions?: number[];
    partialExits?: number[];
  } = {}
): TakeProfitLevel[] {
  const {
    ratios = [1.5, 2, 3, 5],
    fibExtensions = [1.272, 1.618, 2.0, 2.618],
    partialExits = [30, 30, 25, 15],
  } = options;
  
  const stopDistance = Math.abs(entryPrice - stopLossPrice);
  const takeProfits: TakeProfitLevel[] = [];
  
  // Risk:Reward based targets
  for (let i = 0; i < ratios.length; i++) {
    const ratio = ratios[i];
    const price = direction === 'long'
      ? entryPrice + stopDistance * ratio
      : entryPrice - stopDistance * ratio;
    
    // Probability decreases with distance
    const probability = Math.max(20, 80 - ratio * 15);
    
    takeProfits.push({
      price,
      type: 'risk_reward_ratio',
      riskRewardRatio: ratio,
      probability,
      partialExitPercent: partialExits[i] || 25,
      reason: `${ratio}:1 Risk/Reward`,
    });
  }
  
  // Fibonacci extension targets
  const swingHigh = findRecentSwingHigh(candles, 50);
  const swingLow = findRecentSwingLow(candles, 50);
  const range = swingHigh - swingLow;
  
  for (const fib of fibExtensions) {
    const price = direction === 'long'
      ? swingLow + range * fib
      : swingHigh - range * fib;
    
    // Skip if too close to an existing TP
    if (takeProfits.some(tp => Math.abs(tp.price - price) / price < 0.01)) continue;
    
    const rr = Math.abs(price - entryPrice) / stopDistance;
    
    takeProfits.push({
      price,
      type: 'fibonacci_extension',
      riskRewardRatio: rr,
      probability: Math.max(15, 70 - fib * 20),
      partialExitPercent: 20,
      reason: `Fibonacci ${(fib * 100).toFixed(1)}% extension`,
    });
  }
  
  // Sort by price (ascending for long, descending for short)
  takeProfits.sort((a, b) => 
    direction === 'long' ? a.price - b.price : b.price - a.price
  );
  
  return takeProfits;
}

// ==========================================================
// POSITION SIZING
// ==========================================================

export function calculatePositionSize(
  entryPrice: number,
  stopLossPrice: number,
  riskParams: RiskParameters,
  options: {
    method?: PositionSizeMethod;
    leverage?: number;
    winRate?: number; // For Kelly criterion
    avgWin?: number;
    avgLoss?: number;
  } = {}
): PositionSize {
  const {
    method = 'fixed_risk',
    leverage = 1,
    winRate = 0.5,
    avgWin = 1,
    avgLoss = 1,
  } = options;
  
  const stopDistance = Math.abs(entryPrice - stopLossPrice);
  const stopPercent = stopDistance / entryPrice;
  
  let riskAmount = riskParams.accountBalance * (riskParams.riskPerTrade / 100);
  
  // Check if we're within daily loss limit
  if (riskParams.maxLossPerDay && riskParams.currentOpenRisk) {
    const remainingRisk = riskParams.maxLossPerDay - riskParams.currentOpenRisk;
    riskAmount = Math.min(riskAmount, remainingRisk);
  }
  
  let positionValue: number;
  
  switch (method) {
    case 'fixed_risk':
      positionValue = riskAmount / stopPercent;
      break;
      
    case 'fixed_amount':
      positionValue = riskParams.accountBalance * (riskParams.riskPerTrade / 100);
      break;
      
    case 'kelly_criterion':
      // Kelly = W - (1-W)/R where W = win rate, R = avg win / avg loss
      const kellyRatio = winRate - (1 - winRate) / (avgWin / avgLoss);
      const adjustedKelly = Math.max(0, Math.min(0.25, kellyRatio)); // Cap at 25%
      positionValue = riskParams.accountBalance * adjustedKelly / stopPercent;
      break;
      
    case 'volatility_based':
      // Adjust position size based on volatility
      const normalizedVol = stopPercent / 0.02; // Assume 2% is normal
      positionValue = riskAmount / stopPercent / normalizedVol;
      break;
      
    default:
      positionValue = riskAmount / stopPercent;
  }
  
  // Apply leverage
  const leveragedValue = positionValue * leverage;
  const units = leveragedValue / entryPrice;
  
  return {
    units,
    value: leveragedValue,
    riskAmount,
    riskPercent: riskParams.riskPerTrade,
    method,
    leverage,
  };
}

// ==========================================================
// COMPLETE TRADE SETUP
// ==========================================================

export function calculateTradeSetup(
  candles: OHLCV[],
  direction: 'long' | 'short',
  entryPrice: number,
  riskParams: RiskParameters,
  options: {
    patternTarget?: number;
    patternStopLoss?: number;
    winRate?: number;
  } = {}
): TradeSetup {
  const {
    patternTarget,
    patternStopLoss,
    winRate = 0.55, // Assume 55% win rate
  } = options;
  
  // Calculate stop loss
  const stopLossResult = calculateStopLoss(candles, direction, entryPrice);
  
  // Use pattern stop loss if provided
  const stopLoss = patternStopLoss
    ? {
        price: patternStopLoss,
        type: 'pattern_based' as StopLossType,
        distance: Math.abs(entryPrice - patternStopLoss),
        distancePercent: Math.abs(entryPrice - patternStopLoss) / entryPrice * 100,
        reason: 'Pattern-based stop loss',
        confidence: 90,
      }
    : stopLossResult.primary;
  
  // Calculate take profits
  let takeProfits = calculateTakeProfits(candles, direction, entryPrice, stopLoss.price);
  
  // Add pattern target if provided
  if (patternTarget) {
    const stopDistance = Math.abs(entryPrice - stopLoss.price);
    const targetRR = Math.abs(patternTarget - entryPrice) / stopDistance;
    
    takeProfits.push({
      price: patternTarget,
      type: 'pattern_target',
      riskRewardRatio: targetRR,
      probability: 65,
      partialExitPercent: 50,
      reason: 'Pattern-based target',
    });
    
    takeProfits.sort((a, b) => 
      direction === 'long' ? a.price - b.price : b.price - a.price
    );
  }
  
  // Calculate position size
  const positionSize = calculatePositionSize(entryPrice, stopLoss.price, riskParams);
  
  // Calculate metrics
  const primaryTP = takeProfits[0];
  const riskRewardRatio = primaryTP ? primaryTP.riskRewardRatio : 0;
  
  // Expected value calculation
  const potentialLoss = positionSize.riskAmount;
  const potentialWin = potentialLoss * riskRewardRatio;
  const expectedValue = (winRate * potentialWin) - ((1 - winRate) * potentialLoss);
  
  // Max drawdown (assuming stop is hit)
  const maxDrawdown = positionSize.riskAmount / riskParams.accountBalance * 100;
  
  // Break-even calculation
  const breakEvenPrice = direction === 'long'
    ? entryPrice * 1.001 // Account for fees
    : entryPrice * 0.999;
  
  // Generate summary
  const summary = generateTradeSummary(
    positionSize.riskAmount,
    potentialWin,
    riskRewardRatio,
    winRate
  );
  
  return {
    direction,
    entryPrice,
    stopLoss,
    alternativeStopLosses: stopLossResult.alternatives,
    takeProfits,
    positionSize,
    riskRewardRatio,
    expectedValue,
    maxDrawdown,
    breakEvenPrice,
    summary,
  };
}

// ==========================================================
// TRADE SUMMARY
// ==========================================================

function generateTradeSummary(
  riskAmount: number,
  potentialReward: number,
  riskRewardRatio: number,
  winRate: number
): TradeSummary {
  const warnings: string[] = [];
  
  // Calculate required win rate for profitability
  const requiredWinRate = 1 / (1 + riskRewardRatio);
  
  // Expected PnL
  const expectedPnL = (winRate * potentialReward) - ((1 - winRate) * riskAmount);
  
  // Determine recommendation
  let recommendation: TradeSummary['recommendation'];
  
  if (riskRewardRatio >= 3 && winRate > requiredWinRate + 0.1) {
    recommendation = 'excellent';
  } else if (riskRewardRatio >= 2 && winRate > requiredWinRate + 0.05) {
    recommendation = 'good';
  } else if (riskRewardRatio >= 1.5 && winRate > requiredWinRate) {
    recommendation = 'acceptable';
  } else if (expectedPnL > 0) {
    recommendation = 'poor';
    warnings.push('Risk/reward below optimal levels');
  } else {
    recommendation = 'avoid';
    warnings.push('Negative expected value');
  }
  
  // Additional warnings
  if (riskRewardRatio < 1) {
    warnings.push('Risk greater than potential reward');
  }
  if (winRate < 0.5) {
    warnings.push('Win rate below 50%');
  }
  if (riskRewardRatio < 1.5) {
    warnings.push('Consider waiting for better entry');
  }
  
  return {
    riskAmount,
    potentialReward,
    riskRewardRatio,
    winRate: requiredWinRate,
    expectedPnL,
    recommendation,
    warnings,
  };
}

// ==========================================================
// TRAILING STOP CALCULATOR
// ==========================================================

export interface TrailingStopResult {
  newStopPrice: number;
  shouldUpdate: boolean;
  lockedProfit: number;
  lockedProfitPercent: number;
}

export function calculateTrailingStop(
  candles: OHLCV[],
  direction: 'long' | 'short',
  entryPrice: number,
  currentStop: number,
  options: {
    trailType?: 'atr' | 'percentage' | 'swing';
    atrMultiplier?: number;
    trailPercent?: number;
  } = {}
): TrailingStopResult {
  const {
    trailType = 'atr',
    atrMultiplier = 2,
    trailPercent = 0.02,
  } = options;
  
  const currentPrice = candles[candles.length - 1].close;
  let newStopPrice = currentStop;
  
  switch (trailType) {
    case 'atr':
      const atr = calculateATR(candles);
      newStopPrice = direction === 'long'
        ? currentPrice - atr * atrMultiplier
        : currentPrice + atr * atrMultiplier;
      break;
      
    case 'percentage':
      newStopPrice = direction === 'long'
        ? currentPrice * (1 - trailPercent)
        : currentPrice * (1 + trailPercent);
      break;
      
    case 'swing':
      newStopPrice = direction === 'long'
        ? findRecentSwingLow(candles, 10)
        : findRecentSwingHigh(candles, 10);
      break;
  }
  
  // Only trail in direction of profit
  const shouldUpdate = direction === 'long'
    ? newStopPrice > currentStop
    : newStopPrice < currentStop;
  
  const lockedProfit = direction === 'long'
    ? Math.max(0, newStopPrice - entryPrice)
    : Math.max(0, entryPrice - newStopPrice);
  
  const lockedProfitPercent = lockedProfit / entryPrice * 100;
  
  return {
    newStopPrice: shouldUpdate ? newStopPrice : currentStop,
    shouldUpdate,
    lockedProfit,
    lockedProfitPercent,
  };
}

// ==========================================================
// RISK METRICS
// ==========================================================

export interface RiskMetrics {
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  calmarRatio: number;
  winRate: number;
  profitFactor: number;
  avgWinLossRatio: number;
}

export function calculateRiskMetrics(trades: {
  pnl: number;
  pnlPercent: number;
}[]): RiskMetrics {
  if (trades.length === 0) {
    return {
      sharpeRatio: 0,
      sortinoRatio: 0,
      maxDrawdown: 0,
      calmarRatio: 0,
      winRate: 0,
      profitFactor: 0,
      avgWinLossRatio: 0,
    };
  }
  
  const returns = trades.map(t => t.pnlPercent);
  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl < 0);
  
  // Win rate
  const winRate = wins.length / trades.length;
  
  // Average win/loss
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 1;
  const avgWinLossRatio = avgLoss > 0 ? avgWin / avgLoss : 0;
  
  // Profit factor
  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
  
  // Sharpe ratio (annualized, assuming daily returns)
  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdDev = Math.sqrt(
    returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length
  );
  const sharpeRatio = stdDev > 0 ? (meanReturn / stdDev) * Math.sqrt(252) : 0;
  
  // Sortino ratio (downside deviation only)
  const downsideReturns = returns.filter(r => r < 0);
  const downsideDev = downsideReturns.length > 0
    ? Math.sqrt(downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downsideReturns.length)
    : 0;
  const sortinoRatio = downsideDev > 0 ? (meanReturn / downsideDev) * Math.sqrt(252) : 0;
  
  // Max drawdown
  let peak = 0;
  let maxDD = 0;
  let cumulative = 0;
  for (const ret of returns) {
    cumulative += ret;
    peak = Math.max(peak, cumulative);
    const drawdown = peak - cumulative;
    maxDD = Math.max(maxDD, drawdown);
  }
  
  // Calmar ratio
  const annualizedReturn = meanReturn * 252;
  const calmarRatio = maxDD > 0 ? annualizedReturn / maxDD : 0;
  
  return {
    sharpeRatio,
    sortinoRatio,
    maxDrawdown: maxDD,
    calmarRatio,
    winRate,
    profitFactor,
    avgWinLossRatio,
  };
}

export default {
  calculateStopLoss,
  calculateTakeProfits,
  calculatePositionSize,
  calculateTradeSetup,
  calculateTrailingStop,
  calculateRiskMetrics,
};
