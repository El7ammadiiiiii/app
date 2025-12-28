export type PatternCategoryId =
  | 'triangles'
  | 'channels'
  | 'flags'
  | 'pennants'
  | 'wedges'
  | 'continuation-wedges'
  | 'reversal-wedges'
  | 'broadening'
  | 'double-patterns'
  | 'head-shoulders'
  | 'ranges'
  | 'trendlines'
  | 'levels'
  | 'breakouts'
  | 'liquidity'
  | 'liquidity-pools'
  | 'liquidity-sweeps'
  | 'scalping'
  | 'harmonic';


export interface PatternCategoryMeta {
  id: PatternCategoryId;
  label: string;
  description: string;
}

export type PatternFamily =
  | 'chart'
  | 'level'
  | 'trend'
  | 'liquidity'
  | 'momentum'
  | 'structure'
  | 'harmonic';

export interface PatternDefinition {
  /** Stable id used across the app. Convention: `${category}/${slug}` */
  id: string;
  title: string;
  shortTitle?: string;
  description?: string;
  category: PatternCategoryId;
  family: PatternFamily;
  /**
   * Names that Python detectors currently emit (pattern.name).
   * We keep them here to support mapping + backward compatibility even if the
   * backend wording changes later.
   */
  pythonNames: string[];
  /** Matching backend category ids (usually a single value). */
  pythonCategories: string[];
  /** Whether the pattern should be visible only for Pro users. */
  proOnly: boolean;
  /** Should the pattern be enabled by default in scanners. */
  defaultEnabled: boolean;
  /** Optional tags for future grouping (e.g., breakout, harmonic, swing). */
  tags?: string[];
}

export interface PatternRegistryHelpers {
  getCategories(): PatternCategoryMeta[];
  getPatterns(): PatternDefinition[];
  getPatternById(id: string): PatternDefinition | undefined;
  resolvePatternId(
    pythonCategory: string,
    pythonName: string
  ): string | undefined;
}
