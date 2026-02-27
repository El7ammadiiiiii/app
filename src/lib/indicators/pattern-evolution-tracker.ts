/**
 * Pattern Evolution Tracker - متتبع تطور الأنماط
 * 
 * Real-time pattern lifecycle management:
 * - Pattern completion percentage tracking
 * - Health score monitoring
 * - Failure detection and early warning
 * - Pattern maturity assessment
 * - Breakout timing prediction
 * 
 * @author CCWAYS Elite Trading System
 * @version 2.0.0
 */

import { OHLCV } from './technical';

// ==========================================================
// INTERFACES
// ==========================================================

export type PatternStage = 
  | 'forming'     // Pattern is still forming
  | 'maturing'    // Pattern is nearly complete
  | 'ready'       // Ready for breakout
  | 'breaking'    // Currently breaking out
  | 'confirmed'   // Breakout confirmed
  | 'failed'      // Pattern failed
  | 'invalidated' // Pattern structure broken
  | 'completed';  // Target reached

export type PatternHealth = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

export interface PatternEvolution {
  patternId: string;
  patternType: string;
  stage: PatternStage;
  completionPercent: number; // 0-100
  healthScore: number; // 0-100
  health: PatternHealth;
  maturityScore: number; // 0-100
  timeInPattern: number; // Bars since pattern start
  estimatedBreakoutBars: number;
  priceProgress: number; // Current position in pattern (0=start, 1=end)
  volumeTrend: 'increasing' | 'decreasing' | 'stable';
  momentumAlignment: 'aligned' | 'diverging' | 'neutral';
  structureIntegrity: number; // 0-100
  failureRisk: number; // 0-100
  signals: EvolutionSignal[];
  milestones: PatternMilestone[];
  prediction: PatternPrediction;
}

export interface EvolutionSignal {
  type: 'warning' | 'info' | 'success' | 'danger';
  message: string;
  timestamp: number;
  importance: 'low' | 'medium' | 'high' | 'critical';
}

export interface PatternMilestone {
  name: string;
  reached: boolean;
  reachedAt?: number;
  expectedAt?: number;
  description: string;
}

export interface PatternPrediction {
  breakoutDirection: 'up' | 'down' | 'uncertain';
  breakoutProbability: number; // 0-100
  estimatedBreakoutPrice: number;
  targetPrice: number;
  stopLoss: number;
  expectedTimeToBreakout: number; // Bars
  confidence: number;
}

export interface PatternTracker {
  patterns: Map<string, PatternEvolution>;
  activePatterns: string[];
  completedPatterns: string[];
  failedPatterns: string[];
  statistics: TrackerStatistics;
}

export interface TrackerStatistics {
  totalPatterns: number;
  successRate: number;
  avgCompletionTime: number;
  avgHealthAtBreakout: number;
  mostReliablePattern: string;
  leastReliablePattern: string;
}

// ==========================================================
// HELPER FUNCTIONS
// ==========================================================

function generatePatternId(): string {
  return `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

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

function calculateRSI(candles: OHLCV[], period: number = 14): number {
  if (candles.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = candles.length - period; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function analyzeVolumeTrend(candles: OHLCV[], lookback: number = 10): 'increasing' | 'decreasing' | 'stable' {
  if (candles.length < lookback) return 'stable';
  
  const recentVolumes = candles.slice(-lookback).map(c => c.volume);
  const firstHalf = recentVolumes.slice(0, Math.floor(lookback / 2));
  const secondHalf = recentVolumes.slice(Math.floor(lookback / 2));
  
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  
  const changeRatio = secondAvg / firstAvg;
  
  if (changeRatio > 1.2) return 'increasing';
  if (changeRatio < 0.8) return 'decreasing';
  return 'stable';
}

// ==========================================================
// PATTERN EVOLUTION TRACKING
// ==========================================================

export class PatternEvolutionTracker {
  private patterns: Map<string, PatternEvolution> = new Map();
  private history: PatternEvolution[] = [];
  
  constructor() {}
  
  // Register a new pattern
  registerPattern(
    patternType: string,
    startIndex: number,
    endIndex: number,
    breakoutDirection: 'up' | 'down',
    targetPrice: number,
    stopLoss: number
  ): string {
    const patternId = generatePatternId();
    
    const evolution: PatternEvolution = {
      patternId,
      patternType,
      stage: 'forming',
      completionPercent: 0,
      healthScore: 100,
      health: 'excellent',
      maturityScore: 0,
      timeInPattern: 0,
      estimatedBreakoutBars: endIndex - startIndex,
      priceProgress: 0,
      volumeTrend: 'stable',
      momentumAlignment: 'neutral',
      structureIntegrity: 100,
      failureRisk: 0,
      signals: [],
      milestones: this.createMilestones(patternType),
      prediction: {
        breakoutDirection,
        breakoutProbability: 50,
        estimatedBreakoutPrice: 0,
        targetPrice,
        stopLoss,
        expectedTimeToBreakout: endIndex - startIndex,
        confidence: 50,
      },
    };
    
    this.patterns.set(patternId, evolution);
    return patternId;
  }
  
  // Create pattern-specific milestones
  private createMilestones(patternType: string): PatternMilestone[] {
    const baseMilestones: PatternMilestone[] = [
      { name: 'Pattern Identified', reached: true, description: 'Initial pattern structure detected' },
      { name: '25% Formation', reached: false, description: 'Quarter of pattern formed' },
      { name: '50% Formation', reached: false, description: 'Half of pattern formed' },
      { name: '75% Formation', reached: false, description: 'Three-quarters of pattern formed' },
      { name: 'Breakout Zone', reached: false, description: 'Entered potential breakout zone' },
      { name: 'Breakout Triggered', reached: false, description: 'Price breaking pattern boundary' },
      { name: 'Breakout Confirmed', reached: false, description: 'Breakout confirmed with volume' },
      { name: 'Target 1 Reached', reached: false, description: 'First target level reached' },
    ];
    
    // Add pattern-specific milestones
    switch (patternType) {
      case 'head_and_shoulders':
      case 'inverse_head_and_shoulders':
        baseMilestones.splice(1, 0, 
          { name: 'Left Shoulder Complete', reached: false, description: 'Left shoulder formed' },
          { name: 'Head Complete', reached: false, description: 'Head formed' },
          { name: 'Right Shoulder Forming', reached: false, description: 'Right shoulder in progress' }
        );
        break;
        
      case 'double_top':
      case 'double_bottom':
        baseMilestones.splice(1, 0,
          { name: 'First Peak/Trough', reached: false, description: 'First extreme formed' },
          { name: 'Retracement', reached: false, description: 'Price retraced to neckline' },
          { name: 'Second Peak/Trough', reached: false, description: 'Second extreme forming' }
        );
        break;
        
      case 'cup_and_handle':
        baseMilestones.splice(1, 0,
          { name: 'Cup Left Rim', reached: false, description: 'Left side of cup formed' },
          { name: 'Cup Bottom', reached: false, description: 'Cup bottom reached' },
          { name: 'Cup Right Rim', reached: false, description: 'Right side of cup forming' },
          { name: 'Handle Forming', reached: false, description: 'Handle pullback in progress' }
        );
        break;
    }
    
    return baseMilestones;
  }
  
  // Update pattern evolution
  updatePattern(
    patternId: string,
    candles: OHLCV[],
    currentIndex: number,
    patternBounds: {
      startIndex: number;
      endIndex: number;
      upperBoundary: number;
      lowerBoundary: number;
    }
  ): PatternEvolution | null {
    const evolution = this.patterns.get(patternId);
    if (!evolution) return null;
    
    const currentCandle = candles[currentIndex];
    if (!currentCandle) return evolution;
    
    const currentPrice = currentCandle.close;
    const { startIndex, endIndex, upperBoundary, lowerBoundary } = patternBounds;
    
    // Update time in pattern
    evolution.timeInPattern = currentIndex - startIndex;
    
    // Calculate completion percentage
    const expectedDuration = endIndex - startIndex;
    evolution.completionPercent = Math.min(100, (evolution.timeInPattern / expectedDuration) * 100);
    
    // Calculate price progress
    const priceRange = upperBoundary - lowerBoundary;
    evolution.priceProgress = priceRange > 0 
      ? (currentPrice - lowerBoundary) / priceRange 
      : 0.5;
    
    // Analyze volume trend
    evolution.volumeTrend = analyzeVolumeTrend(candles.slice(0, currentIndex + 1));
    
    // Check momentum alignment
    const rsi = calculateRSI(candles.slice(0, currentIndex + 1));
    const direction = evolution.prediction.breakoutDirection;
    
    if (direction === 'up') {
      evolution.momentumAlignment = rsi > 50 ? 'aligned' : rsi < 40 ? 'diverging' : 'neutral';
    } else {
      evolution.momentumAlignment = rsi < 50 ? 'aligned' : rsi > 60 ? 'diverging' : 'neutral';
    }
    
    // Calculate structure integrity
    evolution.structureIntegrity = this.calculateStructureIntegrity(
      candles,
      currentIndex,
      patternBounds
    );
    
    // Update health score
    evolution.healthScore = this.calculateHealthScore(evolution);
    evolution.health = this.getHealthLevel(evolution.healthScore);
    
    // Calculate failure risk
    evolution.failureRisk = this.calculateFailureRisk(evolution);
    
    // Update stage
    evolution.stage = this.determineStage(evolution, candles, currentIndex, patternBounds);
    
    // Update milestones
    this.updateMilestones(evolution, candles, currentIndex, patternBounds);
    
    // Generate signals
    this.generateSignals(evolution);
    
    // Update prediction
    this.updatePrediction(evolution, candles, currentIndex, patternBounds);
    
    // Update maturity score
    evolution.maturityScore = this.calculateMaturityScore(evolution);
    
    return evolution;
  }
  
  // Calculate structure integrity
  private calculateStructureIntegrity(
    candles: OHLCV[],
    currentIndex: number,
    bounds: { startIndex: number; endIndex: number; upperBoundary: number; lowerBoundary: number }
  ): number {
    let integrity = 100;
    const atr = calculateATR(candles.slice(0, currentIndex + 1));
    
    // Check if price has broken boundaries
    const recentCandles = candles.slice(bounds.startIndex, currentIndex + 1);
    
    for (const candle of recentCandles) {
      // Check for false breakouts
      if (candle.high > bounds.upperBoundary + atr * 0.5) {
        integrity -= 5;
      }
      if (candle.low < bounds.lowerBoundary - atr * 0.5) {
        integrity -= 5;
      }
    }
    
    return Math.max(0, integrity);
  }
  
  // Calculate health score
  private calculateHealthScore(evolution: PatternEvolution): number {
    let score = 100;
    
    // Structure integrity impact
    score -= (100 - evolution.structureIntegrity) * 0.3;
    
    // Momentum alignment impact
    if (evolution.momentumAlignment === 'diverging') score -= 15;
    else if (evolution.momentumAlignment === 'aligned') score += 5;
    
    // Volume trend impact
    if (evolution.volumeTrend === 'decreasing' && evolution.completionPercent > 70) {
      score -= 10;
    }
    if (evolution.volumeTrend === 'increasing' && evolution.completionPercent > 50) {
      score += 10;
    }
    
    // Time factor (patterns that take too long deteriorate)
    if (evolution.timeInPattern > evolution.estimatedBreakoutBars * 1.5) {
      score -= 20;
    }
    
    return Math.max(0, Math.min(100, score));
  }
  
  // Get health level from score
  private getHealthLevel(score: number): PatternHealth {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    if (score >= 20) return 'poor';
    return 'critical';
  }
  
  // Calculate failure risk
  private calculateFailureRisk(evolution: PatternEvolution): number {
    let risk = 0;
    
    // Low health increases risk
    risk += (100 - evolution.healthScore) * 0.5;
    
    // Low structure integrity is a major risk
    risk += (100 - evolution.structureIntegrity) * 0.3;
    
    // Diverging momentum is risky
    if (evolution.momentumAlignment === 'diverging') risk += 20;
    
    // Decreasing volume near completion is risky
    if (evolution.volumeTrend === 'decreasing' && evolution.completionPercent > 70) {
      risk += 15;
    }
    
    // Overtime patterns have higher failure risk
    if (evolution.timeInPattern > evolution.estimatedBreakoutBars * 1.5) {
      risk += 25;
    }
    
    return Math.min(100, Math.max(0, risk));
  }
  
  // Determine pattern stage
  private determineStage(
    evolution: PatternEvolution,
    candles: OHLCV[],
    currentIndex: number,
    bounds: { startIndex: number; endIndex: number; upperBoundary: number; lowerBoundary: number }
  ): PatternStage {
    const currentPrice = candles[currentIndex].close;
    const direction = evolution.prediction.breakoutDirection;
    
    // Check for failure/invalidation
    if (evolution.structureIntegrity < 30 || evolution.healthScore < 20) {
      return 'invalidated';
    }
    
    // Check for breakout
    const isBreakingUp = currentPrice > bounds.upperBoundary;
    const isBreakingDown = currentPrice < bounds.lowerBoundary;
    
    if ((direction === 'up' && isBreakingUp) || (direction === 'down' && isBreakingDown)) {
      // Check if confirmed
      const recentCandles = candles.slice(-3);
      const confirmedBars = recentCandles.filter(c => 
        direction === 'up' ? c.close > bounds.upperBoundary : c.close < bounds.lowerBoundary
      ).length;
      
      if (confirmedBars >= 2) return 'confirmed';
      return 'breaking';
    }
    
    // Wrong direction breakout = failed
    if ((direction === 'up' && isBreakingDown) || (direction === 'down' && isBreakingUp)) {
      return 'failed';
    }
    
    // Check completion stages
    if (evolution.completionPercent >= 90) return 'ready';
    if (evolution.completionPercent >= 70) return 'maturing';
    return 'forming';
  }
  
  // Update milestones
  private updateMilestones(
    evolution: PatternEvolution,
    candles: OHLCV[],
    currentIndex: number,
    bounds: { startIndex: number; endIndex: number; upperBoundary: number; lowerBoundary: number }
  ): void {
    const completion = evolution.completionPercent;
    const currentPrice = candles[currentIndex].close;
    const direction = evolution.prediction.breakoutDirection;
    
    for (const milestone of evolution.milestones) {
      if (milestone.reached) continue;
      
      switch (milestone.name) {
        case '25% Formation':
          if (completion >= 25) {
            milestone.reached = true;
            milestone.reachedAt = currentIndex;
          }
          break;
        case '50% Formation':
          if (completion >= 50) {
            milestone.reached = true;
            milestone.reachedAt = currentIndex;
          }
          break;
        case '75% Formation':
          if (completion >= 75) {
            milestone.reached = true;
            milestone.reachedAt = currentIndex;
          }
          break;
        case 'Breakout Zone':
          if (completion >= 90) {
            milestone.reached = true;
            milestone.reachedAt = currentIndex;
          }
          break;
        case 'Breakout Triggered':
          if (evolution.stage === 'breaking' || evolution.stage === 'confirmed') {
            milestone.reached = true;
            milestone.reachedAt = currentIndex;
          }
          break;
        case 'Breakout Confirmed':
          if (evolution.stage === 'confirmed') {
            milestone.reached = true;
            milestone.reachedAt = currentIndex;
          }
          break;
        case 'Target 1 Reached':
          const targetReached = direction === 'up'
            ? currentPrice >= evolution.prediction.targetPrice
            : currentPrice <= evolution.prediction.targetPrice;
          if (targetReached) {
            milestone.reached = true;
            milestone.reachedAt = currentIndex;
          }
          break;
      }
    }
  }
  
  // Generate evolution signals
  private generateSignals(evolution: PatternEvolution): void {
    const signals: EvolutionSignal[] = [];
    const now = Date.now();
    
    // Health warnings
    if (evolution.healthScore < 40 && evolution.health !== 'critical') {
      signals.push({
        type: 'warning',
        message: `Pattern health declining (${evolution.healthScore.toFixed(0)}%)`,
        timestamp: now,
        importance: 'high',
      });
    }
    
    // Structure integrity warnings
    if (evolution.structureIntegrity < 70) {
      signals.push({
        type: 'danger',
        message: `Pattern structure weakening (${evolution.structureIntegrity.toFixed(0)}%)`,
        timestamp: now,
        importance: 'critical',
      });
    }
    
    // Momentum divergence
    if (evolution.momentumAlignment === 'diverging') {
      signals.push({
        type: 'warning',
        message: 'Momentum diverging from pattern direction',
        timestamp: now,
        importance: 'medium',
      });
    }
    
    // Volume alerts
    if (evolution.volumeTrend === 'increasing' && evolution.completionPercent > 80) {
      signals.push({
        type: 'success',
        message: 'Volume increasing near completion - bullish sign',
        timestamp: now,
        importance: 'high',
      });
    }
    
    // Breakout imminent
    if (evolution.completionPercent >= 90 && evolution.stage === 'ready') {
      signals.push({
        type: 'info',
        message: 'Pattern ready for breakout',
        timestamp: now,
        importance: 'high',
      });
    }
    
    // Failure risk alert
    if (evolution.failureRisk > 60) {
      signals.push({
        type: 'danger',
        message: `High failure risk (${evolution.failureRisk.toFixed(0)}%)`,
        timestamp: now,
        importance: 'critical',
      });
    }
    
    evolution.signals = signals;
  }
  
  // Update prediction
  private updatePrediction(
    evolution: PatternEvolution,
    candles: OHLCV[],
    currentIndex: number,
    bounds: { startIndex: number; endIndex: number; upperBoundary: number; lowerBoundary: number }
  ): void {
    const currentPrice = candles[currentIndex].close;
    const direction = evolution.prediction.breakoutDirection;
    
    // Update breakout probability based on health and completion
    let probability = 50;
    probability += (evolution.healthScore - 50) * 0.5;
    probability += (evolution.completionPercent - 50) * 0.3;
    probability -= evolution.failureRisk * 0.3;
    
    if (evolution.momentumAlignment === 'aligned') probability += 10;
    if (evolution.volumeTrend === 'increasing') probability += 10;
    
    evolution.prediction.breakoutProbability = Math.max(5, Math.min(95, probability));
    
    // Update estimated breakout price
    evolution.prediction.estimatedBreakoutPrice = direction === 'up'
      ? bounds.upperBoundary
      : bounds.lowerBoundary;
    
    // Update time to breakout
    const remainingCompletion = 100 - evolution.completionPercent;
    const avgBarsPerPercent = evolution.timeInPattern / Math.max(1, evolution.completionPercent);
    evolution.prediction.expectedTimeToBreakout = Math.ceil(remainingCompletion * avgBarsPerPercent);
    
    // Update confidence
    evolution.prediction.confidence = Math.min(95, 
      evolution.healthScore * 0.4 + 
      evolution.structureIntegrity * 0.3 + 
      (100 - evolution.failureRisk) * 0.3
    );
  }
  
  // Calculate maturity score
  private calculateMaturityScore(evolution: PatternEvolution): number {
    let maturity = evolution.completionPercent * 0.5;
    
    // Add points for reached milestones
    const reachedMilestones = evolution.milestones.filter(m => m.reached).length;
    const totalMilestones = evolution.milestones.length;
    maturity += (reachedMilestones / totalMilestones) * 30;
    
    // Add points for good health
    maturity += (evolution.healthScore / 100) * 20;
    
    return Math.min(100, maturity);
  }
  
  // Get pattern by ID
  getPattern(patternId: string): PatternEvolution | undefined {
    return this.patterns.get(patternId);
  }
  
  // Get all active patterns
  getActivePatterns(): PatternEvolution[] {
    return Array.from(this.patterns.values()).filter(p => 
      !['completed', 'failed', 'invalidated'].includes(p.stage)
    );
  }
  
  // Mark pattern as completed
  completePattern(patternId: string, success: boolean): void {
    const evolution = this.patterns.get(patternId);
    if (evolution) {
      evolution.stage = success ? 'completed' : 'failed';
      this.history.push({ ...evolution });
      this.patterns.delete(patternId);
    }
  }
  
  // Get tracker statistics
  getStatistics(): TrackerStatistics {
    const completed = this.history.filter(p => p.stage === 'completed');
    const failed = this.history.filter(p => p.stage === 'failed' || p.stage === 'invalidated');
    
    const successRate = this.history.length > 0
      ? completed.length / this.history.length * 100
      : 0;
    
    const avgCompletionTime = completed.length > 0
      ? completed.reduce((sum, p) => sum + p.timeInPattern, 0) / completed.length
      : 0;
    
    const avgHealthAtBreakout = completed.length > 0
      ? completed.reduce((sum, p) => sum + p.healthScore, 0) / completed.length
      : 0;
    
    // Find most/least reliable patterns
    const patternStats = new Map<string, { success: number; total: number }>();
    for (const p of this.history) {
      const stats = patternStats.get(p.patternType) || { success: 0, total: 0 };
      stats.total++;
      if (p.stage === 'completed') stats.success++;
      patternStats.set(p.patternType, stats);
    }
    
    let mostReliable = '';
    let leastReliable = '';
    let highestRate = 0;
    let lowestRate = 100;
    
    for (const [type, stats] of patternStats) {
      const rate = stats.success / stats.total;
      if (rate > highestRate) {
        highestRate = rate;
        mostReliable = type;
      }
      if (rate < lowestRate) {
        lowestRate = rate;
        leastReliable = type;
      }
    }
    
    return {
      totalPatterns: this.history.length,
      successRate,
      avgCompletionTime,
      avgHealthAtBreakout,
      mostReliablePattern: mostReliable || 'N/A',
      leastReliablePattern: leastReliable || 'N/A',
    };
  }
}

// ==========================================================
// SINGLETON EXPORT
// ==========================================================

export const patternTracker = new PatternEvolutionTracker();

export default {
  PatternEvolutionTracker,
  patternTracker,
};
