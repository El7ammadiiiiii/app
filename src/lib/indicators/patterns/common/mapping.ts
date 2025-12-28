/**
 * Bidirectional mapping between Python detector names and PatternIds
 * Enables reliable resolution of Python API responses to registry patterns
 */

export const pythonNameToId: Record<string, string> = {
  // Triangles
  'Ascending Triangle': 'triangles/ascending-triangle',
  'Descending Triangle': 'triangles/descending-triangle',
  'Symmetrical Triangle': 'triangles/symmetrical-triangle',
  'Expanding Triangle': 'triangles/expanding-triangle',

  // Channels
  'Ascending Channel': 'channels/ascending-channel',
  'Descending Channel': 'channels/descending-channel',
  'Horizontal Channel': 'channels/horizontal-channel',

  // Flags
  'Bull Flag': 'flags/bull-flag',
  'Bear Flag': 'flags/bear-flag',

  // Pennants
  'Bull Pennant': 'pennants/bull-pennant',
  'Bullish Pennant': 'pennants/bull-pennant',
  'Bear Pennant': 'pennants/bear-pennant',
  'Bearish Pennant': 'pennants/bear-pennant',

  // Wedges
  'Rising Wedge': 'wedges/rising-wedge',
  'Falling Wedge': 'wedges/falling-wedge',
  'Continuation Rising Wedge': 'continuation-wedges/continuation-rising-wedge',
  'Rising Wedge (Continuation)': 'continuation-wedges/continuation-rising-wedge',
  'Continuation Falling Wedge': 'continuation-wedges/continuation-falling-wedge',
  'Falling Wedge (Continuation)': 'continuation-wedges/continuation-falling-wedge',
  'Reversal Rising Wedge': 'reversal-wedges/reversal-rising-wedge',
  'Rising Wedge (Reversal)': 'reversal-wedges/reversal-rising-wedge',
  'Reversal Falling Wedge': 'reversal-wedges/reversal-falling-wedge',
  'Falling Wedge (Reversal)': 'reversal-wedges/reversal-falling-wedge',

  // Double Patterns
  'Double Top': 'double-patterns/double-top',
  'Double Bottom': 'double-patterns/double-bottom',

  // Head & Shoulders
  'Head & Shoulders': 'head-shoulders/head-and-shoulders',
  'Inverse Head & Shoulders': 'head-shoulders/inverse-head-and-shoulders',

  // Ranges
  'Trading Range': 'ranges/trading-range',

  // Trendlines
  'Support Trendline': 'trendlines/support-trendline',
  'Resistance Trendline': 'trendlines/resistance-trendline',

  // Levels
  'Support Level': 'levels/support-level',
  'Resistance Level': 'levels/resistance-level',

  // Breakouts (Pro)
  'Bullish Breakout': 'breakouts/bullish-breakout',
  'Bearish Breakout': 'breakouts/bearish-breakout',

  // Liquidity (Pro)
  'Liquidity Pool (Above)': 'liquidity/liquidity-pool-above',
  'Liquidity Pool (Below)': 'liquidity/liquidity-pool-below',
  'Liquidity Sweep (Bullish)': 'liquidity/liquidity-sweep-bullish',

  // Scalping (Pro)
  'Bullish Momentum': 'scalping/bullish-momentum',
  'Bearish Momentum': 'scalping/bearish-momentum',
  'Hammer': 'scalping/hammer',
  'Shooting Star': 'scalping/shooting-star',

  // Broadening
  'Broadening Pattern': 'broadening/broadening-pattern',
  'Megaphone Pattern': 'broadening/broadening-pattern',
  'Broadening Formation': 'broadening/broadening-pattern',
  'Broadening Top': 'broadening/broadening-top',
  'Broadening Top Pattern': 'broadening/broadening-top',
  'Broadening Bottom': 'broadening/broadening-bottom',
  'Broadening Bottom Pattern': 'broadening/broadening-bottom',
  'Right Angled Ascending Broadening': 'broadening/right-angled-broadening-ascending',
  'Ascending Right Angled Broadening': 'broadening/right-angled-broadening-ascending',
  'Right Angled Descending Broadening': 'broadening/right-angled-broadening-descending',
  'Descending Right Angled Broadening': 'broadening/right-angled-broadening-descending',
};

// Reverse mapping for lookups
export const idToPythonName: Record<string, string> = Object.fromEntries(
  Object.entries(pythonNameToId).map(([pythonName, id]) => [id, pythonName])
);

/**
 * Map Python category names to registry category IDs
 * Python uses snake_case, registry uses kebab-case
 */
export const pythonCategoryToId: Record<string, string> = {
  'triangles': 'triangles',
  'channels': 'channels',
  'flags': 'flags',
  'pennants': 'pennants',
  'wedges': 'wedges',
  'continuation_wedges': 'continuation-wedges',
  'reversal_wedges': 'reversal-wedges',
  'broadening': 'broadening',
  'double_patterns': 'double-patterns',
  'head_shoulders': 'head-shoulders',
  'ranges': 'ranges',
  'trendlines': 'trendlines',
  'levels': 'levels',
  'breakouts': 'breakouts',
  'liquidity': 'liquidity',
  'scalping': 'scalping',
};

/**
 * Resolve Python detector output to PatternId
 * @param pythonName - Pattern name from Python API (e.g., "Ascending Triangle")
 * @returns PatternId (e.g., "triangles/ascending-triangle") or null if not found
 */
export function resolvePythonPattern(pythonName: string): string | null {
  return pythonNameToId[pythonName] || null;
}

/**
 * Resolve Python category name to registry category ID
 * @param pythonCategory - Category from Python API (e.g., "double_patterns")
 * @returns CategoryId (e.g., "double-patterns") or null if not found
 */
export function resolvePythonCategory(pythonCategory: string): string | null {
  return pythonCategoryToId[pythonCategory] || null;
}
