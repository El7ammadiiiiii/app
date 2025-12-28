/**
 * Elite Trading Indicators - Unified Exports
 * ============================================
 * 
 * Professional-grade technical analysis toolkit featuring:
 * - Ehlers Digital Signal Processing (DSP) algorithms
 * - Smart Money Concepts (ICT/SMC methodology)
 * - Advanced Volume Analysis
 * - Machine Learning Feature Engineering
 * 
 * @module indicators
 * @version 2.0.0
 * @author CCCWAYS NEXUS Elite Trading System
 */

// ============================================================================
// EHLERS DSP ALGORITHMS
// ============================================================================
export {
  // Core DSP Functions
  calculateSuperSmoother,
  calculateInstantaneousTrendline,
  calculateFisherTransform,
  calculateMAMA,
  calculateFRAMA,
  calculateCyberCycle,
  
  // Advanced RSI Variants
  calculateConnorsRSI,
  calculateLaguerreRSI,
  
  // Validation
  validateDataForDSP,
  validateOHLCV,
  
  // Aggregate
  EhlersIndicators,
  
  // Types
  type SuperSmootherResult,
  type InstantaneousTrendlineResult,
  type FisherTransformResult,
  type MAMAResult,
  type FRAMAResult,
  type CyberCycleResult,
  type ConnorsRSIResult,
  type LaguerreRSIResult,
} from './ehlers-dsp';

// ============================================================================
// SMART MONEY CONCEPTS (ICT/SMC)
// ============================================================================
export {
  // Core SMC Detection
  findSwingPoints,
  detectOrderBlocks,
  detectFairValueGaps,
  analyzeMarketStructure,
  
  // Wyckoff Analysis
  detectWyckoffEvents,
  
  // Liquidity & Breakers
  detectLiquidityPools,
  detectLiquiditySweeps,
  detectBreakerBlocks,
  
  // VSA & Full Analysis
  analyzeVSA,
  analyzeSMC,
  
  // Aggregate
  SmartMoneyConcepts,
  
  // Types
  type OrderBlock,
  type FairValueGap,
  type StructurePoint,
  type StructureBreak,
  type LiquidityPool,
  type LiquiditySweep,
  type BreakerBlock,
  type WyckoffEvent,
  type VSAResult,
  type SMCAnalysis,
} from './smart-money';

// ============================================================================
// ADVANCED VOLUME ANALYSIS
// ============================================================================
export {
  // Core Volume Indicators
  calculateVWAP,
  calculateVolumeProfile,
  calculateCVD,
  calculateKlinger,
  calculateMFI,
  calculateAnchoredVWAP,
  
  // Composite Analysis
  analyzeSmartMoneyVolume,
  
  // Aggregate
  AdvancedVolume,
  
  // Types
  type VWAPResult,
  type VolumeProfileLevel,
  type VolumeProfileResult,
  type CVDResult,
  type KlingerResult,
  type MFIResult,
  type SmartMoneyVolumeResult,
} from './advanced-volume';

// ============================================================================
// ML FEATURE ENGINEERING
// ============================================================================
export {
  // Core Feature Generation
  generateEliteFeatures,
  
  // Normalization
  normalizeMinMax,
  normalizeZScore,
  
  // Market Regime
  detectMarketRegime,
  
  // Feature Analysis
  getFeatureImportance,
  generateFeatureMatrix,
  
  // Aggregate
  MLFeatures,
  
  // Types
  type FeatureSet,
  type NormalizedFeatureSet,
  type RegimeResult,
  type FeatureImportance,
} from './ml-features';

// ============================================================================
// RE-EXPORT TECHNICAL ANALYSIS (if exists)
// ============================================================================
export * from './technical';

// ============================================================================
// ADVANCED PATTERN DETECTION - NEW
// ============================================================================
export {
  // Classic Pattern Detection
  detectHeadAndShoulders,
  detectDoubleTopBottom,
  detectTripleTopBottom,
  detectCupAndHandle,
  detectRectangle,
  detectAllMissingPatterns,
  type HeadAndShouldersPattern,
  type DoublePattern,
  type TriplePattern,
  type CupAndHandlePattern,
  type RectanglePattern,
  type AllMissingPatterns,
} from './missing-patterns';

export {
  // Breakout Detection
  detectBreakouts,
  detectRangeBreakout,
  detectSupportResistanceLevels,
  detectVolumeSurge,
  detectFakeout,
  analyzeBreakouts,
  type BreakoutSignal,
  type BreakoutAnalysis,
  type SupportResistanceLevel,
  type BreakoutType,
  type BreakoutStrength,
  type BreakoutStatus,
} from './breakout-detector';

export {
  // Confluence Analysis
  analyzePatternConfluence,
  calculateFibonacciLevels,
  detectFibonacciConfluence,
  detectMAConfluence,
  detectPsychologicalLevels,
  detectPreviousHighLows,
  calculatePivotPoints,
  type ConfluenceZone,
  type ConfluenceSource,
  type FibonacciLevel,
  type PatternConfluenceResult,
  type MultiTimeframeConfluence,
  FIBONACCI_RATIOS,
} from './pattern-confluence';

export {
  // Risk Management
  calculateStopLoss,
  calculateTakeProfits,
  calculatePositionSize,
  calculateTradeSetup,
  calculateTrailingStop,
  calculateRiskMetrics,
  type StopLossLevel,
  type TakeProfitLevel,
  type PositionSize,
  type TradeSetup,
  type TradeSummary,
  type RiskParameters,
  type TrailingStopResult,
  type RiskMetrics,
} from './risk-reward-calculator';

export {
  // Pattern Evolution Tracking
  PatternEvolutionTracker,
  patternTracker,
  type PatternEvolution,
  type PatternStage,
  type PatternHealth,
  type PatternTracker,
  type EvolutionSignal,
  type PatternMilestone,
  type PatternPrediction,
  type TrackerStatistics,
} from './pattern-evolution-tracker';

// ============================================================================
// PATTERN LIFECYCLE (B+C Confirmation + Expiry)
// ============================================================================
export {
  evaluatePatternLifecycle,
  filterPatternsByLifecycle,
  type PatternLifecycleStage,
  type PatternLifecycleEvaluation,
  type PatternLifecycleOptions,
  type ClassicPattern,
} from './pattern-lifecycle';

export {
  // Pattern Quality Scoring
  calculatePatternQualityScore,
  scoreMultiplePatterns,
  filterPatternsByGrade,
  DEFAULT_SCORING_CONFIG,
  type PatternQualityScore,
  type PatternScoreDetails,
  type PatternInfo,
  type ScoringConfig,
} from './advanced-pattern-scoring';

// ============================================================================
// VERSION INFO
// ============================================================================

/**
 * Version information
 */
export const VERSION = {
  major: 2,
  minor: 1,
  patch: 0,
  codename: 'Elite Trading Suite - Advanced Patterns',
  releaseDate: '2025-01-01',
  features: [
    'Ehlers Digital Signal Processing',
    'Connors RSI & Laguerre RSI',
    'MAMA & FRAMA Adaptive Moving Averages',
    'Smart Money Concepts (ICT)',
    'Wyckoff Analysis',
    'Advanced Volume Profile',
    'Klinger Volume Oscillator',
    'ML Feature Engineering (50+ features)',
    'Market Regime Detection',
    // NEW in v2.1
    'Head & Shoulders Detection',
    'Double/Triple Top/Bottom Patterns',
    'Cup & Handle Pattern Recognition',
    'Rectangle/Range Pattern Detection',
    'Smart Breakout Detection',
    'Multi-Layer Confluence Zones',
    'Risk/Reward Zone Calculator',
    'Pattern Quality Scoring (15+ criteria)',
    'Pattern Evolution Tracker',
  ],
};

/**
 * Print system capabilities
 */
export function printCapabilities(): void {
  console.log('System Capabilities Loaded');
}
