/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  Node Shape SVG Paths — reusable shape path generators       ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import type { MSEntityType } from "@/lib/onchain/cwtracker-types";

/** Rounded rect path */
export function roundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
  return `M${x + r},${y} h${w - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${h - 2 * r} a${r},${r} 0 0 1 -${r},${r} h-${w - 2 * r} a${r},${r} 0 0 1 -${r},-${r} v-${h - 2 * r} a${r},${r} 0 0 1 ${r},-${r} z`;
}

/** Sharp-cornered rect path */
export function sharpRectPath(x: number, y: number, w: number, h: number): string {
  return `M${x},${y} h${w} v${h} h-${w} z`;
}

/** Ellipse path */
export function ellipsePath(x: number, y: number, w: number, h: number): string {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rx = w / 2;
  const ry = h / 2;
  return `M${cx - rx},${cy} a${rx},${ry} 0 1 0 ${w},0 a${rx},${ry} 0 1 0 -${w},0 z`;
}

/** Diamond path */
export function diamondPath(x: number, y: number, w: number, h: number): string {
  const cx = x + w / 2;
  const top = y;
  const bot = y + h;
  return `M${cx},${top} L${x + w},${y + h / 2} L${cx},${bot} L${x},${y + h / 2} z`;
}

/** Pentagon path */
export function pentagonPath(x: number, y: number, w: number, h: number): string {
  const cx = x + w / 2;
  return `M${cx},${y} L${x + w},${y + h * 0.38} L${x + w * 0.82},${y + h} L${x + w * 0.18},${y + h} L${x},${y + h * 0.38} z`;
}

/** House (arrow-down) path */
export function housePath(x: number, y: number, w: number, h: number): string {
  const cx = x + w / 2;
  const roofY = y + h * 0.4;
  return `M${cx},${y} L${x + w},${roofY} L${x + w},${y + h} L${x},${y + h} L${x},${roofY} z`;
}

/** 3D Box path — front face + top bevel */
export function box3dPath(x: number, y: number, w: number, h: number): string {
  const d = 10;
  const front = `M${x},${y + d} L${x + w - d},${y + d} L${x + w - d},${y + h} L${x},${y + h} z`;
  const top = `M${x},${y + d} L${x + d},${y} L${x + w},${y} L${x + w - d},${y + d} z`;
  const right = `M${x + w - d},${y + d} L${x + w},${y} L${x + w},${y + h - d} L${x + w - d},${y + h} z`;
  return `${front} ${top} ${right}`;
}

/** Double octagon path */
export function doubleOctagonPath(x: number, y: number, w: number, h: number): string {
  const c = Math.min(w, h) * 0.22;
  const outer = `M${x + c},${y} L${x + w - c},${y} L${x + w},${y + c} L${x + w},${y + h - c} L${x + w - c},${y + h} L${x + c},${y + h} L${x},${y + h - c} L${x},${y + c} z`;
  const g = 6;
  const ix = x + g;
  const iy = y + g;
  const iw = w - 2 * g;
  const ih = h - 2 * g;
  const ic = Math.min(iw, ih) * 0.22;
  const inner = `M${ix + ic},${iy} L${ix + iw - ic},${iy} L${ix + iw},${iy + ic} L${ix + iw},${iy + ih - ic} L${ix + iw - ic},${iy + ih} L${ix + ic},${iy + ih} L${ix},${iy + ih - ic} L${ix},${iy + ic} z`;
  return `${outer} ${inner}`;
}

/** Get SVG path for a given node shape */
export function getNodeShapePath(
  shape: string | undefined,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): string {
  switch (shape) {
    case "rect_no_r":      return sharpRectPath(x, y, w, h);
    case "ellipse":        return ellipsePath(x, y, w, h);
    case "diamond":        return diamondPath(x, y, w, h);
    case "pentagon":       return pentagonPath(x, y, w, h);
    case "house":          return housePath(x, y, w, h);
    case "box3d":          return box3dPath(x, y, w, h);
    case "doubleoctagon":  return doubleOctagonPath(x, y, w, h);
    case "rect":
    default:               return roundedRectPath(x, y, w, h, r);
  }
}

/** Default edge color by target-node entity type */
export function getEdgeEntityColor(type: MSEntityType | undefined): string {
  switch (type) {
    case "exchange": return "#3b82f6";
    case "bridge":   return "#f59e0b";
    default:         return "#ffffff";
  }
}
