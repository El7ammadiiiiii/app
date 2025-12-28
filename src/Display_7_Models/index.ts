/**
 * Display 7 Models - AUJ5 Advanced Patterns
 * Ultra-precise pattern detection with fractal analysis and ML validation
 */

import type { AUJ5WedgePattern, AUJ5WedgeType, AUJ5WedgeGeometry } from '../Display_6_Models/auj5_advanced_wedge';

export { detectAUJ5AdvancedWedge } from '../Display_6_Models/auj5_advanced_wedge';
export type { AUJ5WedgePattern, AUJ5WedgeType, AUJ5WedgeGeometry } from '../Display_6_Models/auj5_advanced_wedge';

// Union type for all Display 7 patterns (AUJ5 specialized)
export type Display7Pattern = AUJ5WedgePattern;

// Helper to get pattern display name
export function getDisplay7PatternName(pattern: Display7Pattern): string {
  const names: Record<string, string> = {
    'rising_wedge': 'AUJ5 Rising Wedge',
    'falling_wedge': 'AUJ5 Falling Wedge',
    'ascending_triangle': 'AUJ5 Ascending Triangle',
    'descending_triangle': 'AUJ5 Descending Triangle',
    'symmetrical_triangle': 'AUJ5 Symmetrical Triangle',
    'expanding_wedge': 'AUJ5 Expanding Wedge',
    'contracting_wedge': 'AUJ5 Contracting Wedge'
  };
  return names[pattern.type.type] || 'AUJ5 Pattern';
}

// Helper to get pattern color
export function getDisplay7PatternColor(pattern: Display7Pattern): string {
  if (pattern.type.direction === 'bullish') return '#22c55e'; // green
  if (pattern.type.direction === 'bearish') return '#ef4444'; // red
  return '#3b82f6'; // blue for neutral
}

// Helper to format pattern details for display
export function getDisplay7PatternDetails(pattern: Display7Pattern): {
  name: string;
  direction: string;
  confidence: string;
  strength: string;
  breakoutProb: string;
  riskReward: string;
  target: string;
  stopLoss: string;
  timeToBreakout: string;
  fractalDim: string;
  convergenceAngle: string;
  patternMaturity: string;
} {
  return {
    name: getDisplay7PatternName(pattern),
    direction: pattern.type.direction.toUpperCase(),
    confidence: `${(pattern.confidence * 100).toFixed(1)}%`,
    strength: `${(pattern.strength_score * 100).toFixed(1)}%`,
    breakoutProb: `${(pattern.breakout_probability * 100).toFixed(1)}%`,
    riskReward: `${pattern.risk_reward_ratio.toFixed(2)}`,
    target: `$${pattern.target_price.toFixed(2)}`,
    stopLoss: `$${pattern.stop_loss.toFixed(2)}`,
    timeToBreakout: `${pattern.time_to_breakout} bars`,
    fractalDim: pattern.geometry.fractal_dimension.toFixed(3),
    convergenceAngle: `${pattern.geometry.convergence_angle.toFixed(2)}°`,
    patternMaturity: `${(pattern.geometry.pattern_maturity * 100).toFixed(1)}%`
  };
}
