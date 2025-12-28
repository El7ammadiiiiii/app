/**
 * 📤 Scanners Module Exports - صادرات وحدة الماسحات
 * 
 * تصدير جميع مكونات ووظائف الماسحات
 * Export all scanner components and utilities
 */

// Advanced Divergence Detector
export {
  AdvancedDivergenceDetector,
  IndicatorCalculator,
  ZigZagPeakDetector,
  DIVERGENCE_TYPE_LABELS,
  DIRECTION_LABELS,
  INDICATOR_LABELS,
  type DivergenceType,
  type DivergenceDirection,
  type IndicatorType,
  type PeakPoint,
  type DivergenceResult,
  type OHLCV,
  type DetectorConfig
} from './advanced-divergence-detector';

// Divergence Scanner Service
export {
  DivergenceScannerService,
  getScannerInstance,
  DEFAULT_EXCHANGES,
  DEFAULT_PAIRS,
  DEFAULT_TIMEFRAMES,
  DEFAULT_INDICATORS,
  DEFAULT_DIVERGENCE_TYPES,
  DEFAULT_DIRECTIONS,
  DEFAULT_SCANNER_CONFIG,
  type ScannerConfig,
  type ScanProgress,
  type ScanResult,
  type FavoriteItem
} from './divergence-scanner';

// Precision Drawing Engine
export {
  CoordinateCalculator,
  PrecisionDrawingEngine,
  SVGGenerator,
  DIVERGENCE_COLORS,
  LINE_STYLES,
  type Point,
  type Line,
  type DrawingConfig,
  type DivergenceDrawing,
  type ChartCoordinates
} from './precision-drawing-engine';
