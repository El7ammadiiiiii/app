/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  Flow Constants — shared constants for React Flow canvas     ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { MS_NODE, MS_COLORS } from "@/lib/onchain/cwtracker-types";

/* ── Node dimensions ── */
export const NODE_W = MS_NODE.width;        // 280
export const NODE_H = 52;                   // Compact: icon + address only
export const NODE_R = MS_NODE.cornerRadius; // 6
export const ICON_SIZE = MS_NODE.iconSize;  // 24
export const EXPANDED_NODE_EXTRA_H = 0;     // No internal expansion; buttons float outside

/* ── Edge dimensions ── */
export const ARROW_SIZE = 12;
export const EDGE_WIDTH = 3;
export const LABEL_W = 280;
export const LABEL_H = 28;

/** Animated dot color (vibrant pink) — used across all edge types */
export const ANIMATED_DOT_COLOR = "#ff0073";

/* ── Zoom ── */
export const MIN_ZOOM = 0.05;
export const MAX_ZOOM = 3;

/* ── Snap-to-grid ── */
export const SNAP_GRID: [number, number] = [15, 15];

/* ── Colors ── */
export { MS_COLORS };

/** Extended color palette for edge/node customization */
export const COLOR_PALETTE = [
  "#ffffff", "#ff4d4f", "#ff7a45", "#ffa940", "#ffc53d",
  "#73d13d", "#36cfc9", "#40a9ff", "#597ef7", "#9254de",
  "#f759ab", "#d9d9d9", "#bd7c40", "#52c41a", "#13c2c2",
  "#1890ff", "#2f54eb", "#722ed1", "#eb2f96", "#8c8c8c",
] as const;

/** Node shape options */
export const NODE_SHAPES = [
  { value: "rect", label: "Rounded Rect" },
  { value: "rect_no_r", label: "Sharp Rect" },
  { value: "ellipse", label: "Ellipse" },
  { value: "diamond", label: "Diamond" },
  { value: "pentagon", label: "Pentagon" },
  { value: "house", label: "House" },
  { value: "box3d", label: "3D Box" },
  { value: "doubleoctagon", label: "Double Octagon" },
] as const;

/** Edge routing modes */
export type EdgeRoutingMode = "orthogonal" | "smoothstep" | "bezier" | "straight" | "animatedSvg";

/** Edge display type */
export type EdgeDisplayType = "default" | "animated" | "dashed" | "dotted";

/** Approximate USD prices for common tokens (fallback estimation) */
export const APPROX_TOKEN_USD: Record<string, number> = {
  ETH: 3500, WETH: 3500, stETH: 3500,
  BTC: 95000, WBTC: 95000,
  BNB: 600, WBNB: 600,
  USDT: 1, USDC: 1, DAI: 1, BUSD: 1, TUSD: 1, USDP: 1, FRAX: 1, LUSD: 1, GUSD: 1, PYUSD: 1,
  MATIC: 0.4, POL: 0.4,
  AVAX: 35,
  SOL: 180,
  FTM: 0.5,
  CRO: 0.09,
  ARB: 0.8,
  OP: 1.5,
  LINK: 18, UNI: 8, AAVE: 250, MKR: 1200, COMP: 55, SNX: 2, CRV: 0.6,
  SHIB: 0.00001,
  DOGE: 0.15,
  LDO: 2, RPL: 25,
};

/* ── SVG icon paths (16×16 viewBox) ── */
export const SVG_ICON = {
  copy: "M5.75 1.5h6.5A1.75 1.75 0 0114 3.25v6.5A1.75 1.75 0 0112.25 11.5H5.75A1.75 1.75 0 014 9.75v-6.5A1.75 1.75 0 015.75 1.5zM2.5 5v7.25A1.75 1.75 0 004.25 14H11.5",
  explorer: "M9 2h5v5M14 2L7.5 8.5M6 3H3.5A1.5 1.5 0 002 4.5v8A1.5 1.5 0 003.5 14h8a1.5 1.5 0 001.5-1.5V10",
  sliders: "M2 4h4m4 0h4M2 8h8m4 0h0M2 12h2m4 0h6M6 2.5v3M10 6.5v3M4 10.5v3",
  pencil: "M11.5 1.5a1.41 1.41 0 012 2L5 12l-3 1 1-3 8.5-8.5z",
  trash: "M3 4h10M5.5 4V2.5h5V4M4 4v9a1 1 0 001 1h6a1 1 0 001-1V4M6.5 7v4M9.5 7v4",
  bell: "M8 1.5a4 4 0 00-4 4v2.5L2.5 10v1h11v-1L12 8V5.5a4 4 0 00-4-4zM6.5 12a1.5 1.5 0 003 0",
  addressId: "M2 4h12v8H2zM5 7h1M5 9h6",
} as const;
