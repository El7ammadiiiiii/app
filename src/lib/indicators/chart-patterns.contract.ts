
/**
 * Chart Patterns Contract
 * 
 * Defines the shared types and contracts for chart pattern detection,
 * evidence, and strict parsing.
 * 
 * This file serves as the single source of truth for:
 * - Time units (TimeSec)
 * - Evidence schemas (WedgeEvidence)
 * - Derivation sources (DirectionDerivationSource)
 * - Parser errors
 */

// ==========================================================
// PRIMITIVES & ENUMS
// ==========================================================

/**
 * Epoch seconds (UTC).
 * MUST NOT be milliseconds.
 * MUST NOT be a raw Date object.
 */
export type TimeSec = number;

/**
 * Schema Version in SemVer format (e.g., "1.0.0").
 */
export type SchemaVersion = string;

/**
 * Source of the breakout direction derivation.
 * Used to explain why a specific direction was chosen, especially when neutral.
 */
export type DirectionDerivationSource = 
  | 'regimeBias'       // Derived from market regime (e.g., quiet -> continuation)
  | 'priorTrend'       // Derived from the trend preceding the pattern
  | 'smcBias'          // Derived from Smart Money Concepts bias
  | 'geometryFallback'; // Fallback based on pattern geometry (e.g., slope)

/**
 * Direction of the pattern breakout.
 */
export type BreakoutDirection = 'up' | 'down' | 'neutral';

// ==========================================================
// WEDGE EVIDENCE SCHEMA
// ==========================================================

/**
 * Evidence supporting the detection of a wedge pattern.
 * Designed to be transparent, verifiable, and independent of OHLCV structure.
 */
export interface WedgeEvidence {
  // Identity & Versioning
  schemaVersion: SchemaVersion;
  evidenceType: 'wedgeEvidence';
  evidenceId: string; // UUID
  runId?: string | null;
  producer?: { name: string; version?: string };

  // Context
  symbol: string;
  timeframeSec: number;
  
  // Time Bounds (TimeSec ONLY)
  detectedAtSec: TimeSec;
  windowStartSec: TimeSec;
  windowEndSec: TimeSec;
  
  // Indices (Primary reference within the analysis window)
  startIndex: number;
  endIndex: number;

  // Pattern Description
  wedgeKind: 'rising' | 'falling' | 'ascending_broadening' | 'descending_broadening' | 'broadening';
  direction: BreakoutDirection;
  
  // Direction Derivation
  originalBreakoutDirection: BreakoutDirection;
  effectiveBreakoutDirection: BreakoutDirection;
  directionDerivationSource: DirectionDerivationSource;
  directionNotes?: string | null;

  // Geometry Evidence
  geometry: {
    upperLine: {
      slope: number;
      intercept: number;
      r2?: number;
      touchCount?: number;
      anchorPivotIndices?: number[];
    };
    lowerLine: {
      slope: number;
      intercept: number;
      r2?: number;
      touchCount?: number;
      anchorPivotIndices?: number[];
    };
    apex?: {
      timeSec: TimeSec;
      price: number;
    };
    contractionRatio?: number | null;
  };

  // Pivots & Touches (Unified TimeSec + Index)
  pivotIndex: number[];
  pivotTimeSec: TimeSec[];
  upperTouchIndex: number[];
  lowerTouchIndex: number[];
  upperTouchTimeSec: TimeSec[];
  lowerTouchTimeSec: TimeSec[];

  // Sigma / Volatility
  sigma: {
    value: number;
    residualType: 'vertical';
    from: 'pivots';
    pivotCount: number;
  };

  // Regime / Context
  quietFlag: boolean;
  
  // Alternation
  alternation: {
    score: number;
    boostPoints: number;
    isCapped: boolean;
  };

  // Quality & Scoring
  quality: {
    score: number;
    confidence: number | null;
    flags: string[];
  };
}

// ==========================================================
// PARSER TYPES
// ==========================================================

export interface ParserError {
  message: string;
  path: string; // JSON Pointer-like path (e.g., "/wedgeEvidence/geometry/upperLine")
  code: 
    | 'invalid_type'
    | 'missing_required'
    | 'invalid_enum'
    | 'unsupported_schema_version'
    | 'unknown_key'
    | 'out_of_range'
    | 'custom';
  schemaVersion?: string;
}

export type ParseResult<T> = 
  | { ok: true; value: T }
  | { ok: false; errors: ParserError[] };
