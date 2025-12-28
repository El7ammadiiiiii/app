
import { z } from 'zod';
import type { DetectedPattern } from './chart-patterns';
import type { ParseResult, ParserError, WedgeEvidence } from './chart-patterns.contract';

// ==========================================================
// ZOD SCHEMAS
// ==========================================================

const TimeSecSchema = z.number().int().min(0).describe("Epoch seconds");

const DirectionDerivationSourceSchema = z.enum([
  'regimeBias',
  'priorTrend',
  'smcBias',
  'geometryFallback'
]);

const BreakoutDirectionSchema = z.enum(['up', 'down', 'neutral']);

const WedgeEvidenceSchema = z.object({
  schemaVersion: z.string().regex(/^\d+\.\d+\.\d+$/, "Must be SemVer (e.g. 1.0.0)"),
  evidenceType: z.literal('wedgeEvidence'),
  evidenceId: z.string(),
  runId: z.string().nullable().optional(),
  producer: z.object({
    name: z.string(),
    version: z.string().optional()
  }).optional(),

  symbol: z.string(),
  timeframeSec: z.number(),

  detectedAtSec: TimeSecSchema,
  windowStartSec: TimeSecSchema,
  windowEndSec: TimeSecSchema,

  startIndex: z.number(),
  endIndex: z.number(),

  wedgeKind: z.enum(['rising', 'falling', 'ascending_broadening', 'descending_broadening', 'broadening']),
  direction: BreakoutDirectionSchema,

  originalBreakoutDirection: BreakoutDirectionSchema,
  effectiveBreakoutDirection: BreakoutDirectionSchema,
  directionDerivationSource: DirectionDerivationSourceSchema,
  directionNotes: z.string().nullable().optional(),

  geometry: z.object({
    upperLine: z.object({
      slope: z.number(),
      intercept: z.number(),
      r2: z.number().optional(),
      touchCount: z.number().optional(),
      anchorPivotIndices: z.array(z.number()).optional(),
    }),
    lowerLine: z.object({
      slope: z.number(),
      intercept: z.number(),
      r2: z.number().optional(),
      touchCount: z.number().optional(),
      anchorPivotIndices: z.array(z.number()).optional(),
    }),
    apex: z.object({
      timeSec: TimeSecSchema,
      price: z.number(),
    }).optional(),
    contractionRatio: z.number().nullable().optional(),
  }),

  pivotIndex: z.array(z.number()),
  pivotTimeSec: z.array(TimeSecSchema),
  upperTouchIndex: z.array(z.number()),
  lowerTouchIndex: z.array(z.number()),
  upperTouchTimeSec: z.array(TimeSecSchema),
  lowerTouchTimeSec: z.array(TimeSecSchema),

  sigma: z.object({
    value: z.number(),
    residualType: z.literal('vertical'),
    from: z.literal('pivots'),
    pivotCount: z.number(),
  }),

  quietFlag: z.boolean(),

  alternation: z.object({
    score: z.number(),
    boostPoints: z.number(),
    isCapped: z.boolean(),
  }),

  quality: z.object({
    score: z.number(),
    confidence: z.number().nullable(),
    flags: z.array(z.string()),
  }),
}).strict(); // Reject unknown keys

// ==========================================================
// PARSER IMPLEMENTATION
// ==========================================================

/**
 * Parses and validates a detected pattern object strictly.
 * Enforces TimeSec-only rules and SemVer compatibility.
 */
export function parseDetectedPatternStrict(input: unknown): ParseResult<DetectedPattern> {
  // 1. Basic object check
  if (typeof input !== 'object' || input === null) {
    return {
      ok: false,
      errors: [{
        message: "Input must be an object",
        path: "",
        code: "invalid_type"
      }]
    };
  }

  const pattern = input as any;
  const errors: ParserError[] = [];

  // 2. Validate WedgeEvidence if present
  if (pattern.wedgeEvidence) {
    // Check for forbidden keys (raw time) manually before Zod strict check
    // to give better error messages
    const forbiddenKeys = ['time', 'timestamp', 'timeMs', 'timestampMs', 'ms'];
    const evidenceKeys = Object.keys(pattern.wedgeEvidence);
    
    for (const key of evidenceKeys) {
      if (forbiddenKeys.includes(key) || key.endsWith('Ms') || (key.includes('time') && !key.endsWith('TimeSec') && key !== 'timeframeSec')) {
         // Allow 'timeframeSec' and keys ending in 'TimeSec'. 
         // Reject 'time', 'timestamp', etc.
         if (key === 'timeframeSec') continue;
         
         errors.push({
           message: `Forbidden time key detected: ${key}. Use *TimeSec only.`,
           path: `/wedgeEvidence/${key}`,
           code: "unknown_key"
         });
      }
    }

    const result = WedgeEvidenceSchema.safeParse(pattern.wedgeEvidence);
    
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push({
          message: issue.message,
          path: `/wedgeEvidence/${issue.path.join('/')}`,
          code: (issue.code as string) === 'invalid_enum_value' ? 'invalid_enum' : 
                (issue.code as string) === 'unrecognized_keys' ? 'unknown_key' : 'invalid_type',
          schemaVersion: pattern.wedgeEvidence.schemaVersion
        });
      }
    } else {
      // SemVer Check
      const version = result.data.schemaVersion;
      const [major] = version.split('.').map(Number);
      if (major !== 1) {
        errors.push({
          message: `Unsupported schema major version: ${major}. Only v1.x.x is supported.`,
          path: "/wedgeEvidence/schemaVersion",
          code: "unsupported_schema_version",
          schemaVersion: version
        });
      }
    }
  }

  // 3. Validate effectiveBreakoutDirection consistency
  if (pattern.breakoutDirection === 'neutral' && !pattern.effectiveBreakoutDirection && pattern.wedgeEvidence) {
    // If we have evidence, we expect effective direction for neutral patterns
    // This is a soft check or warning, but for strict parser we might want to enforce it
    // For now, let's just ensure if it exists, it's valid
  }

  if (pattern.effectiveBreakoutDirection) {
    const dirResult = BreakoutDirectionSchema.safeParse(pattern.effectiveBreakoutDirection);
    if (!dirResult.success) {
       errors.push({
         message: "Invalid effectiveBreakoutDirection",
         path: "/effectiveBreakoutDirection",
         code: "invalid_enum"
       });
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value: pattern as DetectedPattern };
}
