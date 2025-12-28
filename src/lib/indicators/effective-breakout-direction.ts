
import type { BreakoutDirection, DirectionDerivationSource, WedgeEvidence } from './chart-patterns.contract';

export interface DirectionResolutionInput {
  originalDirection: BreakoutDirection;
  regimeBias?: BreakoutDirection;
  priorTrend?: BreakoutDirection;
  smcBias?: BreakoutDirection;
  geometryFallback?: BreakoutDirection;
}

export interface DirectionResolutionResult {
  effectiveDirection: BreakoutDirection;
  source: DirectionDerivationSource | 'original';
  isOverridden: boolean;
}

/**
 * Resolves the effective breakout direction based on the priority rules.
 * 
 * Rules:
 * 1. If original is 'up' or 'down', use it.
 * 2. If original is 'neutral', derive from sources in order:
 *    - regimeBias
 *    - priorTrend
 *    - smcBias
 *    - geometryFallback
 */
export function resolveEffectiveBreakoutDirection(
  input: DirectionResolutionInput
): DirectionResolutionResult {
  const { originalDirection, regimeBias, priorTrend, smcBias, geometryFallback } = input;

  // 1. Original direction takes precedence if explicit
  if (originalDirection !== 'neutral') {
    return {
      effectiveDirection: originalDirection,
      source: 'original',
      isOverridden: false
    };
  }

  // 2. Derive from sources (Priority Order)
  
  // A. Regime Bias
  if (regimeBias && regimeBias !== 'neutral') {
    return {
      effectiveDirection: regimeBias,
      source: 'regimeBias',
      isOverridden: true
    };
  }

  // B. Prior Trend
  if (priorTrend && priorTrend !== 'neutral') {
    return {
      effectiveDirection: priorTrend,
      source: 'priorTrend',
      isOverridden: true
    };
  }

  // C. SMC Bias
  if (smcBias && smcBias !== 'neutral') {
    return {
      effectiveDirection: smcBias,
      source: 'smcBias',
      isOverridden: true
    };
  }

  // D. Geometry Fallback
  if (geometryFallback && geometryFallback !== 'neutral') {
    return {
      effectiveDirection: geometryFallback,
      source: 'geometryFallback',
      isOverridden: true
    };
  }

  // Default to neutral if no source provides a direction
  return {
    effectiveDirection: 'neutral',
    source: 'geometryFallback', // Default source when staying neutral
    isOverridden: false
  };
}

/**
 * Helper to extract input from WedgeEvidence if available
 */
export function resolveFromEvidence(evidence: WedgeEvidence): DirectionResolutionResult {
  return {
    effectiveDirection: evidence.effectiveBreakoutDirection,
    source: evidence.directionDerivationSource,
    isOverridden: evidence.originalBreakoutDirection === 'neutral' && evidence.effectiveBreakoutDirection !== 'neutral'
  };
}
