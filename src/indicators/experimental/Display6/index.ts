/**
 * Display 6 Models Index
 * All chart patterns from ajaygm18/chart repository + AUJ5 Advanced Wedge
 */

import type { HeadAndShouldersPattern } from './head_and_shoulders';
import type { InverseHeadAndShouldersPattern } from './inverse_head_and_shoulders';
import type { DoubleTopPattern } from './double_top';
import type { DoubleBottomPattern } from './double_bottom';
import type { TripleTopPattern } from './triple_top';
import type { TripleBottomPattern } from './triple_bottom';
import type { AscendingTrianglePattern } from './ascending_triangle';
import type { DescendingTrianglePattern } from './descending_triangle';
import type { SymmetricalTrianglePattern } from './symmetrical_triangle';
import type { RisingWedgePattern } from './rising_wedge';
import type { FallingWedgePattern } from './falling_wedge';
import type { BullFlagPattern } from './bull_flag';
import type { BearFlagPattern } from './bear_flag';
import type { BullPennantPattern } from './bull_pennant';
import type { BearPennantPattern } from './bear_pennant';
import type { RoundingBottomPattern } from './rounding_bottom';
import type { CupAndHandlePattern } from './cup_and_handle';
import type { RectanglePattern } from './rectangle';
import type { ChannelUpPattern } from './channel_up';
import type { ChannelDownPattern } from './channel_down';

export { detectHeadAndShoulders } from './head_and_shoulders';
export { detectInverseHeadAndShoulders } from './inverse_head_and_shoulders';
export { detectDoubleTop } from './double_top';
export { detectDoubleBottom } from './double_bottom';
export { detectTripleTop } from './triple_top';
export { detectTripleBottom } from './triple_bottom';
export { detectAscendingTriangle } from './ascending_triangle';
export { detectDescendingTriangle } from './descending_triangle';
export { detectSymmetricalTriangle } from './symmetrical_triangle';
export { detectRisingWedge } from './rising_wedge';
export { detectFallingWedge } from './falling_wedge';
export { detectBullFlag } from './bull_flag';
export { detectBearFlag } from './bear_flag';
export { detectBullPennant } from './bull_pennant';
export { detectBearPennant } from './bear_pennant';
export { detectRoundingBottom } from './rounding_bottom';
export { detectCupAndHandle } from './cup_and_handle';
export { detectRectangle } from './rectangle';
export { detectChannelUp } from './channel_up';
export { detectChannelDown } from './channel_down';

// Union type for all Display 6 patterns
export type Display6Pattern =
  | HeadAndShouldersPattern
  | InverseHeadAndShouldersPattern
  | DoubleTopPattern
  | DoubleBottomPattern
  | TripleTopPattern
  | TripleBottomPattern
  | AscendingTrianglePattern
  | DescendingTrianglePattern
  | SymmetricalTrianglePattern
  | RisingWedgePattern
  | FallingWedgePattern
  | BullFlagPattern
  | BearFlagPattern
  | BullPennantPattern
  | BearPennantPattern
  | RoundingBottomPattern
  | CupAndHandlePattern
  | RectanglePattern
  | ChannelUpPattern
  | ChannelDownPattern;

// Helper to get pattern display name
export function getDisplay6PatternName(pattern: Display6Pattern): string {
  const names: Record<Display6Pattern['type'], string> = {
    head_and_shoulders: 'Head and Shoulders',
    inverse_head_and_shoulders: 'Inverse Head and Shoulders',
    double_top: 'Double Top',
    double_bottom: 'Double Bottom',
    triple_top: 'Triple Top',
    triple_bottom: 'Triple Bottom',
    ascending_triangle: 'Ascending Triangle',
    descending_triangle: 'Descending Triangle',
    symmetrical_triangle: 'Symmetrical Triangle',
    rising_wedge: 'Rising Wedge',
    falling_wedge: 'Falling Wedge',
    bull_flag: 'Bull Flag',
    bear_flag: 'Bear Flag',
    bull_pennant: 'Bull Pennant',
    bear_pennant: 'Bear Pennant',
    rounding_bottom: 'Rounding Bottom',
    cup_and_handle: 'Cup and Handle',
    rectangle: 'Rectangle',
    channel_up: 'Channel Up',
    channel_down: 'Channel Down',
  };
  return names[pattern.type];
}

// Helper to get pattern color
export function getDisplay6PatternColor(pattern: Display6Pattern): string {
  if (pattern.direction === 'bullish') return '#22c55e'; // green
  if (pattern.direction === 'bearish') return '#ef4444'; // red
  return '#3b82f6'; // blue for neutral
}
