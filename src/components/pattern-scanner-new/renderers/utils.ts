'use client';

/**
 * 📐 Shared Renderer Utilities — Trendoscope® Style
 *
 * Lightweight primitives for independent renderers.
 *
 * @version 4.0.0
 */

export interface PatternGraphics {
  series: any[];
  graphic: any[];
}

// ─── Color Palette (Trendoscope® inspired) ──────────────────────────────────

export const PATTERN_COLORS: Record<string, string> = {
  'ascending channel':                '#FBF46D',   // Yellow
  'descending channel':               '#8DBA51',   // Green
  'ranging channel':                  '#4A9FF5',   // Blue
  'rising wedge (expanding)':         '#FF998C',   // Light red
  'rising wedge (contracting)':       '#77D970',   // Lime
  'falling wedge (expanding)':        '#FF9500',   // Orange
  'falling wedge (contracting)':      '#5F81E4',   // Blue-purple
  'ascending triangle (expanding)':   '#A799B7',   // Lavender
  'ascending triangle (contracting)': '#C89595',   // Dusty rose
  'descending triangle (expanding)':  '#FFD271',   // Gold
  'descending triangle (contracting)':'#C68B59',   // Brown
  'symmetrical triangle (contracting)':'#EB92BE',  // Pink
  'symmetrical triangle (expanding)': '#00EAD3',   // Cyan
  'bullish flag':                     '#77D970',   // Lime
  'bearish flag':                     '#FF998C',   // Light red
  'bullish pennant':                  '#00EAD3',   // Cyan
  'bearish pennant':                  '#EB92BE',   // Pink
};

const ZIGZAG_COLOR = '#42A5F5';
const DEFAULT_COLOR = '#B0BEC5';

export function getPatternColor(name: string): string {
  return PATTERN_COLORS[(name || "").toLowerCase()] || DEFAULT_COLOR;
}

export function getZigzagColor(): string {
  return ZIGZAG_COLOR;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function regY(slope: number, intercept: number, x: number): number {
  return slope * x + intercept;
}

export function buildStraightLineData(
  total: number,
  startIdx: number,
  startY: number,
  endIdx: number,
  endY: number,
): (number | null)[] {
  const data: (number | null)[] = new Array(total).fill(null);
  const s = Math.max(0, Math.min(startIdx, total - 1));
  const e = Math.max(0, Math.min(endIdx, total - 1));
  data[s] = startY;
  data[e] = endY;
  return data;
}
