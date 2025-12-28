/**
 * NEXUS Quantum Trend Intelligence Engine v1.0
 * أعظم خوارزمية تحليل اتجاهات في التاريخ
 * 
 * Types & Interfaces - التعريفات والواجهات
 * 
 * @author CCCWAYS Elite Trading System
 * @version 1.0.0
 */

// ==========================================================
// CORE DATA TYPES - أنواع البيانات الأساسية
// ==========================================================

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Timeframe = '15m' | '1h' | '4h' | '1d' | '3d' | '1w';

export type TrendDirection = 'bullish' | 'bearish' | 'neutral';

export type SignalStrength = 'ultra_strong' | 'strong' | 'moderate' | 'weak' | 'neutral';

export type MarketRegime = 'trending' | 'ranging' | 'volatile' | 'quiet';

// ==========================================================
// INDICATOR TYPES - أنواع المؤشرات
// ==========================================================

export interface IndicatorState {
  value: number;
  previousValue: number;
  direction: TrendDirection;
  momentum: number; // -100 to +100
  isOverbought: boolean;
  isOversold: boolean;
  hasDivergence: boolean;
  divergenceType: 'bullish' | 'bearish' | 'none';
  crossover: 'bullish' | 'bearish' | 'none';
  strength: number; // 0-100
}

export interface VolumeAnalysis {
  current: number;
  average: number;
  ratio: number; // current/average
  trend: TrendDirection;
  isSpike: boolean;
  spikeIntensity: number; // 0-100
  accumulation: boolean;
  distribution: boolean;
}

export interface RSIState extends IndicatorState {
  zone: 'overbought' | 'neutral' | 'oversold';
  failureSwing: 'bullish' | 'bearish' | 'none';
}

export interface StochRSIState extends IndicatorState {
  k: number;
  d: number;
  kDirection: TrendDirection;
  dDirection: TrendDirection;
  crossoverType: 'bullish' | 'bearish' | 'none';
  inExtremeZone: boolean;
}

export interface MACDState extends IndicatorState {
  macdLine: number;
  signalLine: number;
  histogram: number;
  histogramTrend: TrendDirection;
  histogramMomentum: number;
  zeroCross: 'bullish' | 'bearish' | 'none';
  signalCross: 'bullish' | 'bearish' | 'none';
}

export interface OBVState extends IndicatorState {
  obv: number;
  obvSma: number;
  trend: TrendDirection;
  divergenceWithPrice: 'bullish' | 'bearish' | 'none';
  breakout: boolean;
}

export interface ADXState extends IndicatorState {
  adx: number;
  plusDI: number;
  minusDI: number;
  trendStrength: 'strong' | 'moderate' | 'weak' | 'no_trend';
  diCrossover: 'bullish' | 'bearish' | 'none';
  adxRising: boolean;
}

export interface ConnorsRSIState extends IndicatorState {
  composite: number;
  rsiComponent: number;
  streakComponent: number;
  percentRankComponent: number;
  extremeReading: boolean;
}

export interface LaguerreRSIState extends IndicatorState {
  lrsi: number;
  gamma: number;
  turningPoint: boolean;
  turningDirection: TrendDirection;
}

export interface FisherTransformState extends IndicatorState {
  fisher: number;
  signal: number;
  crossover: 'bullish' | 'bearish' | 'none';
  extremeLevel: boolean;
  reversalSignal: boolean;
}

export interface CyberCycleState extends IndicatorState {
  cycle: number;
  trigger: number;
  phase: 'up' | 'down' | 'turning';
  cycleStrength: number;
  leadingSignal: boolean;
}

export interface CVDState extends IndicatorState {
  delta: number;
  cumulativeDelta: number;
  deltaMA: number;
  trend: TrendDirection;
  divergenceWithPrice: 'bullish' | 'bearish' | 'none';
  absorptionDetected: boolean;
}

export interface KlingerState extends IndicatorState {
  oscillator: number;
  signal: number;
  volumeForce: number;
  trend: TrendDirection;
  crossover: 'bullish' | 'bearish' | 'none';
  accumulationPhase: boolean;
}

export interface MFIState extends IndicatorState {
  mfi: number;
  zone: 'overbought' | 'neutral' | 'oversold';
  moneyFlowRatio: number;
  divergenceWithPrice: 'bullish' | 'bearish' | 'none';
  extremeReading: boolean;
}

// ==========================================================
// AGGREGATED INDICATOR DATA - بيانات المؤشرات المجمعة
// ==========================================================

export interface AllIndicatorsState {
  volume: VolumeAnalysis;
  rsi: RSIState;
  stochRsi: StochRSIState;
  macd: MACDState;
  obv: OBVState;
  adx: ADXState;
  connorsRsi: ConnorsRSIState;
  laguerreRsi: LaguerreRSIState;
  fisher: FisherTransformState;
  cyberCycle: CyberCycleState;
  cvd: CVDState;
  klinger: KlingerState;
  mfi: MFIState;
}

export interface TimeframeIndicators {
  timeframe: Timeframe;
  timestamp: number;
  price: {
    open: number;
    high: number;
    low: number;
    close: number;
    change: number;
    changePercent: number;
  };
  indicators: AllIndicatorsState;
}

// ==========================================================
// SIGNAL TYPES - أنواع الإشارات
// ==========================================================

export interface ExtractedSignal {
  indicator: string;
  timeframe: Timeframe;
  signal: TrendDirection;
  strength: number; // 0-100
  confidence: number; // 0-100
  divergence: 'bullish' | 'bearish' | 'none';
  crossover: 'bullish' | 'bearish' | 'none';
  momentum: number; // -100 to +100
  description: string;
  descriptionAr: string;
}

export interface DivergenceSignal {
  type: 'regular' | 'hidden';
  direction: 'bullish' | 'bearish';
  indicator: string;
  timeframe: Timeframe;
  strength: number;
  pricePoints: { index: number; price: number }[];
  indicatorPoints: { index: number; value: number }[];
  confidence: number;
}

export interface MomentumShift {
  timeframe: Timeframe;
  previousMomentum: number;
  currentMomentum: number;
  shiftMagnitude: number;
  direction: TrendDirection;
  indicators: string[];
  confidence: number;
}

// ==========================================================
// FUSION MATRIX TYPES - أنواع مصفوفة الدمج
// ==========================================================

export interface IndicatorConfluence {
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  totalIndicators: number;
  confluenceScore: number; // 0-100 (100 = all agree)
  dominantDirection: TrendDirection;
  agreementRatio: number; // 0-1
}

export interface TimeframeConfluence {
  bullishTimeframes: Timeframe[];
  bearishTimeframes: Timeframe[];
  neutralTimeframes: Timeframe[];
  alignment: 'aligned' | 'mixed' | 'conflicting';
  alignmentScore: number; // 0-100
  dominantTrend: TrendDirection;
}

export interface CrossTimeframeAnalysis {
  higherTimeframeBias: TrendDirection;
  lowerTimeframeTrigger: TrendDirection;
  alignment: boolean;
  strengthMultiplier: number; // 0.5-2.0
  entryQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface FusionMatrix {
  indicatorConfluence: IndicatorConfluence;
  timeframeConfluence: TimeframeConfluence;
  crossAnalysis: CrossTimeframeAnalysis;
  overallConfluence: number; // 0-100
  signalQuality: SignalStrength;
}

// ==========================================================
// QUANTUM SCORING TYPES - أنواع التسجيل الكمي
// ==========================================================

export interface AdaptiveWeight {
  indicator: string;
  baseWeight: number;
  regimeMultiplier: number;
  performanceMultiplier: number;
  finalWeight: number;
}

export interface TimeframeWeight {
  timeframe: Timeframe;
  weight: number;
  importance: 'primary' | 'secondary' | 'confirmation';
}

export interface RegimeDetection {
  currentRegime: MarketRegime;
  regimeStrength: number; // 0-100
  regimeAge: number; // bars since regime started
  transitionProbability: number; // 0-1
  volatility: number;
  trendStrength: number;
}

export interface QuantumScore {
  rawScore: number; // 0-100
  adjustedScore: number; // 0-100 after regime adjustment
  confidenceInterval: { low: number; high: number };
  direction: TrendDirection;
  reliability: number; // 0-100
  components: {
    indicatorScore: number;
    confluenceScore: number;
    momentumScore: number;
    volumeScore: number;
    regimeScore: number;
  };
}

// ==========================================================
// HARMONIC PATTERN TYPES - أنواع أنماط هارمونيك
// ==========================================================

export type HarmonicPatternType = 
  | 'gartley'
  | 'butterfly'
  | 'bat'
  | 'crab'
  | 'shark'
  | 'cypher'
  | 'abcd'
  | 'three_drives';

export interface HarmonicPattern {
  type: HarmonicPatternType;
  direction: 'bullish' | 'bearish';
  points: {
    X: { index: number; price: number };
    A: { index: number; price: number };
    B: { index: number; price: number };
    C: { index: number; price: number };
    D: { index: number; price: number };
  };
  ratios: {
    XAB: number;
    ABC: number;
    BCD: number;
    XAD: number;
  };
  accuracy: number; // 0-100 how close to ideal ratios
  completion: number; // 0-100 pattern completion
  prz: { // Potential Reversal Zone
    high: number;
    low: number;
    mid: number;
  };
  targets: {
    tp1: number;
    tp2: number;
    tp3: number;
  };
  stopLoss: number;
  confidence: number;
}

// ==========================================================
// DECISION ENGINE TYPES - أنواع محرك القرار
// ==========================================================

export interface TrendStrengthResult {
  timeframe: Timeframe;
  bullishPercent: number; // 0-100
  bearishPercent: number; // 0-100
  direction: TrendDirection;
  strength: SignalStrength;
  color: string; // hex color for UI
  indicators: {
    name: string;
    signal: TrendDirection;
    weight: number;
  }[];
}

export interface SignalDecision {
  action: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  direction: TrendDirection;
  confidence: number; // 0-100
  strength: SignalStrength;
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  riskRewardRatio: number;
  positionSizePercent: number; // recommended position size
  reasoning: string[];
  reasoningAr: string[];
  warnings: string[];
  warningsAr: string[];
  timestamp: number;
}

export interface TrendMatrix {
  symbol: string;
  lastUpdate: number;
  price: {
    current: number;
    change24h: number;
    changePercent24h: number;
  };
  timeframes: TrendStrengthResult[];
  overallTrend: TrendDirection;
  overallStrength: number; // 0-100
  overallConfidence: number; // 0-100
  signal: SignalDecision;
  harmonicPatterns: HarmonicPattern[];
  marketRegime: RegimeDetection;
}

// ==========================================================
// ALERT SYSTEM TYPES - أنواع نظام التنبيهات
// ==========================================================

export type AlertPriority = 'critical' | 'high' | 'medium' | 'low';

export type AlertType = 
  | 'signal_generated'
  | 'pattern_detected'
  | 'divergence_found'
  | 'regime_change'
  | 'target_hit'
  | 'stop_loss_hit'
  | 'confluence_alert';

export interface Alert {
  id: string;
  type: AlertType;
  priority: AlertPriority;
  symbol: string;
  timeframe: Timeframe;
  title: string;
  titleAr: string;
  message: string;
  messageAr: string;
  data: Record<string, unknown>;
  timestamp: number;
  read: boolean;
  soundEnabled: boolean;
}

export interface AlertConfig {
  enabled: boolean;
  soundEnabled: boolean;
  pushEnabled: boolean;
  minPriority: AlertPriority;
  minConfidence: number;
  enabledTypes: AlertType[];
  symbols: string[] | 'all';
  timeframes: Timeframe[] | 'all';
}

// ==========================================================
// HISTORY & LEARNING TYPES - أنواع التاريخ والتعلم
// ==========================================================

export interface SignalOutcome {
  signalId: string;
  signal: SignalDecision;
  timestamp: number;
  symbol: string;
  entryPrice: number;
  exitPrice: number | null;
  exitTimestamp: number | null;
  outcome: 'win' | 'loss' | 'breakeven' | 'pending';
  profitPercent: number | null;
  hitTarget: 1 | 2 | 3 | null;
  hitStopLoss: boolean;
  holdingPeriod: number | null; // in minutes
  notes: string;
}

export interface IndicatorPerformance {
  indicator: string;
  timeframe: Timeframe;
  totalSignals: number;
  wins: number;
  losses: number;
  winRate: number;
  avgProfit: number;
  avgLoss: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  bestConditions: MarketRegime[];
  worstConditions: MarketRegime[];
}

export interface LearningState {
  lastUpdate: number;
  totalSignals: number;
  indicatorPerformance: Map<string, IndicatorPerformance>;
  patternPerformance: Map<HarmonicPatternType, IndicatorPerformance>;
  timeframePerformance: Map<Timeframe, IndicatorPerformance>;
  regimePerformance: Map<MarketRegime, IndicatorPerformance>;
  adaptedWeights: Map<string, number>;
  adaptedThresholds: Map<string, number>;
  version: number;
}

// ==========================================================
// ENGINE CONFIGURATION - إعدادات المحرك
// ==========================================================

export interface NexusConfig {
  // Timeframes to analyze
  timeframes: Timeframe[];
  
  // Indicator settings
  indicators: {
    rsiPeriod: number;
    stochRsiPeriod: number;
    macdFast: number;
    macdSlow: number;
    macdSignal: number;
    adxPeriod: number;
    obvSmaPeriod: number;
    mfiPeriod: number;
    connorsRsiPeriods: [number, number, number];
    laguerreGamma: number;
    fisherPeriod: number;
    cyberCycleAlpha: number;
    cvdPeriod: number;
    klingerFast: number;
    klingerSlow: number;
    klingerSignal: number;
  };
  
  // Scoring weights
  weights: {
    volume: number;
    rsi: number;
    stochRsi: number;
    macd: number;
    obv: number;
    adx: number;
    connorsRsi: number;
    laguerreRsi: number;
    fisher: number;
    cyberCycle: number;
    cvd: number;
    klinger: number;
    mfi: number;
  };
  
  // Timeframe weights
  timeframeWeights: Record<Timeframe, number>;
  
  // Signal thresholds
  thresholds: {
    strongBuyMin: number;
    buyMin: number;
    sellMax: number;
    strongSellMax: number;
    minConfidence: number;
    minConfluence: number;
  };
  
  // Risk management
  risk: {
    maxPositionSize: number;
    defaultStopLossPercent: number;
    riskPerTrade: number;
    minRiskReward: number;
  };
  
  // Alert settings
  alerts: AlertConfig;
  
  // Learning settings
  learning: {
    enabled: boolean;
    minSamplesForAdaptation: number;
    adaptationRate: number;
    maxWeightChange: number;
  };
}

// ==========================================================
// DEFAULT CONFIGURATION - الإعدادات الافتراضية
// ==========================================================

export const DEFAULT_NEXUS_CONFIG: NexusConfig = {
  timeframes: ['15m', '1h', '4h', '1d', '3d'],
  
  indicators: {
    rsiPeriod: 14,
    stochRsiPeriod: 14,
    macdFast: 12,
    macdSlow: 26,
    macdSignal: 9,
    adxPeriod: 14,
    obvSmaPeriod: 20,
    mfiPeriod: 14,
    connorsRsiPeriods: [3, 2, 100],
    laguerreGamma: 0.8,
    fisherPeriod: 10,
    cyberCycleAlpha: 0.07,
    cvdPeriod: 14,
    klingerFast: 34,
    klingerSlow: 55,
    klingerSignal: 13,
  },
  
  weights: {
    volume: 0.08,
    rsi: 0.09,
    stochRsi: 0.08,
    macd: 0.10,
    obv: 0.07,
    adx: 0.09,
    connorsRsi: 0.07,
    laguerreRsi: 0.07,
    fisher: 0.08,
    cyberCycle: 0.07,
    cvd: 0.08,
    klinger: 0.06,
    mfi: 0.06,
  },
  
  timeframeWeights: {
    '15m': 0.10,
    '1h': 0.15,
    '4h': 0.20,
    '1d': 0.25,
    '3d': 0.20,
    '1w': 0.10,
  },
  
  thresholds: {
    strongBuyMin: 80,
    buyMin: 60,
    sellMax: 40,
    strongSellMax: 20,
    minConfidence: 65,
    minConfluence: 55,
  },
  
  risk: {
    maxPositionSize: 0.10, // 10% max
    defaultStopLossPercent: 0.02, // 2%
    riskPerTrade: 0.01, // 1%
    minRiskReward: 2.0,
  },
  
  alerts: {
    enabled: true,
    soundEnabled: true,
    pushEnabled: false,
    minPriority: 'medium',
    minConfidence: 70,
    enabledTypes: ['signal_generated', 'pattern_detected', 'divergence_found'],
    symbols: 'all',
    timeframes: 'all',
  },
  
  learning: {
    enabled: true,
    minSamplesForAdaptation: 30,
    adaptationRate: 0.1,
    maxWeightChange: 0.3,
  },
};

// ==========================================================
// UTILITY TYPES - أنواع مساعدة
// ==========================================================

export type IndicatorName = keyof NexusConfig['weights'];

export interface MultiSymbolResult {
  results: Map<string, TrendMatrix>;
  lastUpdate: number;
  processingTime: number;
}

export interface EngineStatus {
  isRunning: boolean;
  lastUpdate: number;
  symbolsMonitored: number;
  alertsGenerated: number;
  signalsGenerated: number;
  errors: string[];
  performance: {
    avgProcessingTime: number;
    memoryUsage: number;
  };
}
