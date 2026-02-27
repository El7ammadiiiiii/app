/**
 * Pattern Registry - Central pattern categorization
 * Provides pattern categories and metadata
 */

export interface PatternCategory {
  id: string;
  name: string;
  patterns: string[];
  description?: string;
}

/**
 * Get all pattern categories
 */
export function getCategories(): PatternCategory[] {
  return [
    {
      id: 'reversal',
      name: 'Reversal Patterns',
      patterns: [
        'head_and_shoulders',
        'inverse_head_and_shoulders',
        'double_top',
        'double_bottom',
        'triple_top',
        'triple_bottom',
        'reversal_falling_wedge',
        'reversal_rising_wedge',
      ],
      description: 'Patterns that signal potential trend reversals'
    },
    {
      id: 'continuation',
      name: 'Continuation Patterns',
      patterns: [
        'bull_flag',
        'bear_flag',
        'bull_pennant',
        'bear_pennant',
        'continuation_falling_wedge',
        'continuation_rising_wedge',
        'ascending_triangle',
        'descending_triangle',
        'symmetrical_triangle',
      ],
      description: 'Patterns that signal trend continuation'
    },
    {
      id: 'bilateral',
      name: 'Bilateral Patterns',
      patterns: [
        'symmetrical_triangle',
        'rectangle',
        'horizontal_channel',
      ],
      description: 'Patterns that can break in either direction'
    },
    {
      id: 'channels',
      name: 'Channel Patterns',
      patterns: [
        'ascending_channel',
        'descending_channel',
        'horizontal_channel',
      ],
      description: 'Parallel trendline patterns'
    }
  ];
}

/**
 * Get category for a specific pattern
 */
export function getPatternCategory(patternType: string): string | null {
  const categories = getCategories();
  
  for (const category of categories) {
    if (category.patterns.includes(patternType)) {
      return category.id;
    }
  }
  
  return null;
}

/**
 * Get all pattern types
 */
export function getAllPatternTypes(): string[] {
  const categories = getCategories();
  const allPatterns = new Set<string>();
  
  categories.forEach(cat => {
    cat.patterns.forEach(p => allPatterns.add(p));
  });
  
  return Array.from(allPatterns);
}
