/**
 * Pattern Registry - Central export and helper functions
 * Single source of truth for all pattern definitions
 */

import type { PatternDefinition, PatternCategoryId } from './common/types';
import { resolvePythonPattern, resolvePythonCategory } from './common/mapping';

// Import all pattern definitions
import ascendingTriangle from './triangles/ascending-triangle';
import descendingTriangle from './triangles/descending-triangle';
import symmetricalTriangle from './triangles/symmetrical-triangle';
import expandingTriangle from './triangles/expanding-triangle';

import ascendingChannel from './channels/ascending-channel';
import descendingChannel from './channels/descending-channel';
import horizontalChannel from './channels/horizontal-channel';

import bullFlag from './flags/bull-flag';
import bearFlag from './flags/bear-flag';

import bullPennant from './pennants/bull-pennant';
import bearPennant from './pennants/bear-pennant';

import risingWedge from './wedges/rising-wedge';
import fallingWedge from './wedges/falling-wedge';

import continuationRisingWedge from './continuation-wedges/continuation-rising-wedge';
import continuationFallingWedge from './continuation-wedges/continuation-falling-wedge';

import reversalRisingWedge from './reversal-wedges/reversal-rising-wedge';
import reversalFallingWedge from './reversal-wedges/reversal-falling-wedge';

import broadeningPattern from './broadening/broadening-pattern';
import broadeningTop from './broadening/broadening-top';
import broadeningBottom from './broadening/broadening-bottom';
import rightAngledBroadeningAscending from './broadening/right-angled-broadening-ascending';
import rightAngledBroadeningDescending from './broadening/right-angled-broadening-descending';

import doubleTop from './double-patterns/double-top';
import doubleBottom from './double-patterns/double-bottom';

import headAndShoulders from './head-shoulders/head-and-shoulders';
import inverseHeadAndShoulders from './head-shoulders/inverse-head-and-shoulders';

import tradingRange from './ranges/trading-range';

import supportTrendline from './trendlines/support-trendline';
import resistanceTrendline from './trendlines/resistance-trendline';

import supportLevel from './levels/support-level';
import resistanceLevel from './levels/resistance-level';

import bullishBreakout from './breakouts/bullish-breakout';
import bearishBreakout from './breakouts/bearish-breakout';

import liquidityPoolAbove from './liquidity/liquidity-pool-above';
import liquidityPoolBelow from './liquidity/liquidity-pool-below';
import liquiditySweepBullish from './liquidity/liquidity-sweep-bullish';

import bullishMomentum from './scalping/bullish-momentum';
import bearishMomentum from './scalping/bearish-momentum';
import hammer from './scalping/hammer';
import shootingStar from './scalping/shooting-star';

// All patterns array
const ALL_PATTERNS: PatternDefinition[] = [
  // Triangles
  ascendingTriangle,
  descendingTriangle,
  symmetricalTriangle,
  expandingTriangle,

  // Channels
  ascendingChannel,
  descendingChannel,
  horizontalChannel,

  // Flags
  bullFlag,
  bearFlag,

  // Pennants
  bullPennant,
  bearPennant,

  // Wedges
  risingWedge,
  fallingWedge,

  // Continuation Wedges
  continuationRisingWedge,
  continuationFallingWedge,

  // Reversal Wedges
  reversalRisingWedge,
  reversalFallingWedge,

  // Broadening
  broadeningPattern,
  broadeningTop,
  broadeningBottom,
  rightAngledBroadeningAscending,
  rightAngledBroadeningDescending,

  // Double Patterns
  doubleTop,
  doubleBottom,

  // Head & Shoulders
  headAndShoulders,
  inverseHeadAndShoulders,

  // Ranges
  tradingRange,

  // Trendlines
  supportTrendline,
  resistanceTrendline,

  // Levels
  supportLevel,
  resistanceLevel,

  // Breakouts (Pro)
  bullishBreakout,
  bearishBreakout,

  // Liquidity (Pro)
  liquidityPoolAbove,
  liquidityPoolBelow,
  liquiditySweepBullish,

  // Scalping (Pro)
  bullishMomentum,
  bearishMomentum,
  hammer,
  shootingStar,
];

// Category metadata
export interface PatternCategoryMeta {
  id: PatternCategoryId;
  label: string;
  description: string;
  proOnly: boolean;
  icon?: string;
}

const CATEGORY_META: PatternCategoryMeta[] = [
  {
    id: 'triangles',
    label: 'Triangles',
    description: 'Triangle chart patterns (ascending, descending, symmetrical)',
    proOnly: false,
  },
  {
    id: 'channels',
    label: 'Channels',
    description: 'Price channels and parallel trendlines',
    proOnly: false,
  },
  {
    id: 'flags',
    label: 'Flags',
    description: 'Flag continuation patterns',
    proOnly: false,
  },
  {
    id: 'pennants',
    label: 'Pennants',
    description: 'Pennant continuation patterns (bull/bear pennants)',
    proOnly: false,
  },
  {
    id: 'wedges',
    label: 'Wedges',
    description: 'Rising and falling wedge patterns',
    proOnly: false,
  },
  {
    id: 'continuation-wedges',
    label: 'Continuation Wedges',
    description: 'Continuation wedge variants (continuation rising/falling wedge)',
    proOnly: false,
  },
  {
    id: 'reversal-wedges',
    label: 'Reversal Wedges',
    description: 'Reversal wedge variants (reversal rising/falling wedge)',
    proOnly: false,
  },
  {
    id: 'broadening',
    label: 'Broadening',
    description: 'Broadening formations and broadening wedges',
    proOnly: false,
  },
  {
    id: 'double-patterns',
    label: 'Double Patterns',
    description: 'Double tops and double bottoms',
    proOnly: false,
  },
  {
    id: 'head-shoulders',
    label: 'Head & Shoulders',
    description: 'Head and shoulders reversal patterns',
    proOnly: false,
  },
  {
    id: 'ranges',
    label: 'Ranges',
    description: 'Consolidation and trading ranges',
    proOnly: false,
  },
  {
    id: 'trendlines',
    label: 'Trendlines',
    description: 'Support and resistance trendlines',
    proOnly: false,
  },
  {
    id: 'levels',
    label: 'Levels',
    description: 'Key support and resistance levels',
    proOnly: false,
  },
  {
    id: 'breakouts',
    label: 'Breakouts',
    description: 'Structure breakout detection (Pro)',
    proOnly: true,
  },
  {
    id: 'liquidity',
    label: 'Liquidity',
    description: 'Liquidity pools and sweeps (Pro)',
    proOnly: true,
  },
  {
    id: 'liquidity-pools',
    label: 'Liquidity Pools',
    description: 'Liquidity pool levels (Pro)',
    proOnly: true,
  },
  {
    id: 'liquidity-sweeps',
    label: 'Liquidity Sweeps',
    description: 'Liquidity sweep events (Pro)',
    proOnly: true,
  },
  {
    id: 'scalping',
    label: 'Scalping',
    description: 'Fast momentum and candle patterns (Pro)',
    proOnly: true,
  },
];

// Pattern lookup index
const PATTERN_INDEX = new Map<string, PatternDefinition>(
  ALL_PATTERNS.map((p) => [p.id, p])
);

// Category pattern groups
const PATTERNS_BY_CATEGORY = new Map<PatternCategoryId, PatternDefinition[]>();
for (const pattern of ALL_PATTERNS) {
  const existing = PATTERNS_BY_CATEGORY.get(pattern.category) || [];
  existing.push(pattern);
  PATTERNS_BY_CATEGORY.set(pattern.category, existing);
}

/**
 * Get all pattern definitions
 */
export function getPatterns(): PatternDefinition[] {
  return ALL_PATTERNS;
}

/**
 * Get category metadata
 */
export function getCategories(): PatternCategoryMeta[] {
  return CATEGORY_META;
}

/**
 * Get pattern by ID
 * @param id - PatternId (e.g., "triangles/ascending-triangle")
 */
export function getPatternById(id: string): PatternDefinition | undefined {
  return PATTERN_INDEX.get(id);
}

/**
 * Get all patterns in a category
 * @param categoryId - Category identifier
 */
export function getPatternsByCategory(
  categoryId: PatternCategoryId
): PatternDefinition[] {
  return PATTERNS_BY_CATEGORY.get(categoryId) || [];
}

/**
 * Resolve Python API response to PatternDefinition
 * @param pythonName - Pattern name from Python detector (e.g., "Ascending Triangle")
 * @returns PatternDefinition or undefined
 */
export function resolvePatternFromPython(
  pythonName: string
): PatternDefinition | undefined {
  const patternId = resolvePythonPattern(pythonName);
  return patternId ? getPatternById(patternId) : undefined;
}

/**
 * Get all patterns with Pro gating status
 */
export function getFreePatterns(): PatternDefinition[] {
  return ALL_PATTERNS.filter((p) => !p.proOnly);
}

export function getProPatterns(): PatternDefinition[] {
  return ALL_PATTERNS.filter((p) => p.proOnly);
}

/**
 * Check if a category is Pro-only
 */
export function isCategoryPro(categoryId: PatternCategoryId): boolean {
  const meta = CATEGORY_META.find((c) => c.id === categoryId);
  return meta?.proOnly || false;
}

// Re-export types and utilities
export { resolvePythonPattern, resolvePythonCategory };
export type { PatternDefinition, PatternCategoryId };
