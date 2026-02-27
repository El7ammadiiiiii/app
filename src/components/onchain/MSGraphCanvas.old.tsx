/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  MSGraphCanvas — CWTracker SVG graph canvas (100% parity)   ║
 * ║  foreignObject for crisp zoom, iconfont icons, draw-edge     ║
 * ║  mode, inline edit label, annotation rendering.              ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

"use client";

import React, { useRef, useState, useCallback, useMemo } from "react";
import { useCWTrackerStore } from "@/lib/onchain/cwtracker-store";
import {
  MS_NODE,
  MS_COLORS,
  getMSTokenColor,
  getMSChainIconUrl,
  getMSEntityIconClass,
  getMSRiskColor,
  getMSRiskLabel,
  getMSChainBgColor,
  getBlockExplorerUrl,
  msShortenAddress,
  msFormatTokenAmount,
  msFormatValue,
  type MSNode,
  type MSEdge,
  type MSAnnotation,
  type MSEntityType,
} from "@/lib/onchain/cwtracker-types";

/* ════════════════════════════════════════════════════════════════
   CONSTANTS
   ════════════════════════════════════════════════════════════════ */

const NODE_W = MS_NODE.width;        // 280
const NODE_H = MS_NODE.height;       // 72
const NODE_R = MS_NODE.cornerRadius; // 6
const ICON_SIZE = MS_NODE.iconSize;  // 24
const ARROW_SIZE = 12;
const EDGE_WIDTH = 3;
const EXPANDED_NODE_EXTRA_H = 43;
const MIN_ZOOM = 0.05;
const MAX_ZOOM = 3;

/* ════════════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════════════ */

/** Rounded rect path */
function roundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
  return `M${x + r},${y} h${w - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${h - 2 * r} a${r},${r} 0 0 1 -${r},${r} h-${w - 2 * r} a${r},${r} 0 0 1 -${r},-${r} v-${h - 2 * r} a${r},${r} 0 0 1 ${r},-${r} z`;
}

/** Sharp-cornered rect path */
function sharpRectPath(x: number, y: number, w: number, h: number): string {
  return `M${x},${y} h${w} v${h} h-${w} z`;
}

/** Ellipse path */
function ellipsePath(x: number, y: number, w: number, h: number): string {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rx = w / 2;
  const ry = h / 2;
  return `M${cx - rx},${cy} a${rx},${ry} 0 1 0 ${w},0 a${rx},${ry} 0 1 0 -${w},0 z`;
}

/** Diamond path */
function diamondPath(x: number, y: number, w: number, h: number): string {
  const cx = x + w / 2;
  const top = y;
  const bot = y + h;
  return `M${cx},${top} L${x + w},${y + h / 2} L${cx},${bot} L${x},${y + h / 2} z`;
}

/** Pentagon path */
function pentagonPath(x: number, y: number, w: number, h: number): string {
  const cx = x + w / 2;
  return `M${cx},${y} L${x + w},${y + h * 0.38} L${x + w * 0.82},${y + h} L${x + w * 0.18},${y + h} L${x},${y + h * 0.38} z`;
}

/** House (arrow-down) path */
function housePath(x: number, y: number, w: number, h: number): string {
  const cx = x + w / 2;
  const roofY = y + h * 0.4;
  return `M${cx},${y} L${x + w},${roofY} L${x + w},${y + h} L${x},${y + h} L${x},${roofY} z`;
}

/** 3D Box path — front face + top bevel */
function box3dPath(x: number, y: number, w: number, h: number): string {
  const d = 10; // depth offset
  // front face
  const front = `M${x},${y + d} L${x + w - d},${y + d} L${x + w - d},${y + h} L${x},${y + h} z`;
  // top face
  const top = `M${x},${y + d} L${x + d},${y} L${x + w},${y} L${x + w - d},${y + d} z`;
  // right face
  const right = `M${x + w - d},${y + d} L${x + w},${y} L${x + w},${y + h - d} L${x + w - d},${y + h} z`;
  return `${front} ${top} ${right}`;
}

/** Double octagon path */
function doubleOctagonPath(x: number, y: number, w: number, h: number): string {
  const c = Math.min(w, h) * 0.22; // corner cut
  const outer = `M${x + c},${y} L${x + w - c},${y} L${x + w},${y + c} L${x + w},${y + h - c} L${x + w - c},${y + h} L${x + c},${y + h} L${x},${y + h - c} L${x},${y + c} z`;
  const g = 6; // inner gap
  const ix = x + g;
  const iy = y + g;
  const iw = w - 2 * g;
  const ih = h - 2 * g;
  const ic = Math.min(iw, ih) * 0.22;
  const inner = `M${ix + ic},${iy} L${ix + iw - ic},${iy} L${ix + iw},${iy + ic} L${ix + iw},${iy + ih - ic} L${ix + iw - ic},${iy + ih} L${ix + ic},${iy + ih} L${ix},${iy + ih - ic} L${ix},${iy + ic} z`;
  return `${outer} ${inner}`;
}

/** Get SVG path for a given node shape */
function getNodeShapePath(shape: string | undefined, x: number, y: number, w: number, h: number, r: number): string {
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

/** Default edge color by target-node entity type.
 *  White = wallet / unknown,  Blue = exchange,  Yellow = bridge. */
function getEdgeEntityColor(type: MSEntityType | undefined): string {
  switch (type) {
    case "exchange": return "#3b82f6";   // blue
    case "bridge":   return "#f59e0b";   // yellow
    default:         return "#ffffff";   // white
  }
}

/** Label-node dimensions (must match dagre layout in cwtracker-types) */
const LABEL_W = 280;
const LABEL_H = 28;

/** Approximate USD prices for common tokens (fallback estimation) */
const APPROX_TOKEN_USD: Record<string, number> = {
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
const SVG_ICON = {
  // Copy — two overlapping rounded squares
  copy: "M5.75 1.5h6.5A1.75 1.75 0 0114 3.25v6.5A1.75 1.75 0 0112.25 11.5H5.75A1.75 1.75 0 014 9.75v-6.5A1.75 1.75 0 015.75 1.5zM2.5 5v7.25A1.75 1.75 0 004.25 14H11.5",
  // External link — arrow out of box
  explorer: "M9 2h5v5M14 2L7.5 8.5M6 3H3.5A1.5 1.5 0 002 4.5v8A1.5 1.5 0 003.5 14h8a1.5 1.5 0 001.5-1.5V10",
  // Horizontal sliders (settings)
  sliders: "M2 4h4m4 0h4M2 8h8m4 0h0M2 12h2m4 0h6M6 2.5v3M10 6.5v3M4 10.5v3",
  // Pencil (edit)
  pencil: "M11.5 1.5a1.41 1.41 0 012 2L5 12l-3 1 1-3 8.5-8.5z",
  // Trash can (delete)
  trash: "M3 4h10M5.5 4V2.5h5V4M4 4v9a1 1 0 001 1h6a1 1 0 001-1V4M6.5 7v4M9.5 7v4",
} as const;

/**
 * Convert dagre routing points to SVG path using cubic B-spline interpolation.
 * Matches d3.curveBasis algorithm used by dagre-d3 / MetaSleuth.
 * Produces smooth multi-segment Bezier curves through routing waypoints.
 */
function basisSplinePath(pts: { x: number; y: number }[]): string {
  const n = pts.length;
  if (n === 0) return "";
  if (n === 1) return `M${pts[0].x},${pts[0].y}`;
  if (n === 2) return `M${pts[0].x},${pts[0].y}L${pts[1].x},${pts[1].y}`;

  // d3.curveBasis: clamped uniform cubic B-spline
  let d = `M${pts[0].x},${pts[0].y}`;
  d += `L${(5 * pts[0].x + pts[1].x) / 6},${(5 * pts[0].y + pts[1].y) / 6}`;

  let x0 = pts[0].x, y0 = pts[0].y;
  let x1 = pts[1].x, y1 = pts[1].y;

  for (let i = 2; i < n; i++) {
    const x = pts[i].x, y = pts[i].y;
    d += `C${(2 * x0 + x1) / 3},${(2 * y0 + y1) / 3} ${(x0 + 2 * x1) / 3},${(y0 + 2 * y1) / 3} ${(x0 + 4 * x1 + x) / 6},${(y0 + 4 * y1 + y) / 6}`;
    x0 = x1; y0 = y1;
    x1 = x; y1 = y;
  }

  // Final clamped segment
  d += `C${(2 * x0 + x1) / 3},${(2 * y0 + y1) / 3} ${(x0 + 2 * x1) / 3},${(y0 + 2 * y1) / 3} ${(x0 + 5 * x1) / 6},${(y0 + 5 * y1) / 6}`;
  d += `L${pts[n - 1].x},${pts[n - 1].y}`;

  return d;
}

/** MetaSleuth-identical 4-segment cubic B-spline.
 *  X advances uniformly in 12 steps. Y follows a sigmoid:
 *  flat 25% → steep transition 50% → flat 25%.
 *  Verified against actual MetaSleuth SVG paths in examples.json. */
function computeSegmentPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (Math.abs(dx) < 2) return `M${x1},${y1}L${x2},${y2}`;

  const s = dx / 12;          // uniform x-step
  const hs = s / 2;           // half-step for start/end caps

  // Y-fractions: MetaSleuth sigmoid  [flat, flat, flat, 1/12, 2/12, 4/12, 6/12, 8/12, 10/12, 11/12, flat, flat, flat]
  const f = [0, 0, 0, 1/12, 2/12, 4/12, 6/12, 8/12, 10/12, 11/12, 1, 1, 1];
  const y = (i: number) => y1 + f[i] * dy;

  return `M${x1},${y1}`
    + `L${x1 + hs},${y(0)}`
    + `C${x1 + s},${y(1)} ${x1 + 2*s},${y(2)} ${x1 + 3*s},${y(3)}`
    + `C${x1 + 4*s},${y(4)} ${x1 + 5*s},${y(5)} ${x1 + 6*s},${y(6)}`
    + `C${x1 + 7*s},${y(7)} ${x1 + 8*s},${y(8)} ${x1 + 9*s},${y(9)}`
    + `C${x1 + 10*s},${y(10)} ${x1 + 11*s},${y(11)} ${x2 - hs},${y(12)}`
    + `L${x2},${y2}`;
}

/**
 * Compute arrowhead triangle polygon at the endpoint of a path.
 * Returns SVG polygon `points` attribute string.
 */
function computeArrowPoints(
  pts: { x: number; y: number }[],
  arrowLen: number,
  arrowHalf: number
): string {
  if (pts.length < 2) return "";
  const tip = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  const dx = tip.x - prev.x, dy = tip.y - prev.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.1) return "";
  const ux = dx / len, uy = dy / len;
  const px = -uy, py = ux;
  const bx = tip.x - ux * arrowLen, by = tip.y - uy * arrowLen;
  return `${bx + px * arrowHalf},${by + py * arrowHalf} ${tip.x},${tip.y} ${bx - px * arrowHalf},${by - py * arrowHalf} ${bx + px * arrowHalf},${by + py * arrowHalf}`;
}

/* ════════════════════════════════════════════════════════════════
   PROPS
   ════════════════════════════════════════════════════════════════ */

interface MSGraphCanvasProps {
  onNodeClick?: (nodeId: string) => void;
  onEdgeClick?: (edgeId: string) => void;
  onNodeExpand?: (nodeId: string) => void;
  onNodeRemove?: (nodeId: string) => void;
}

/* ════════════════════════════════════════════════════════════════
   COMPONENT
   ════════════════════════════════════════════════════════════════ */

export function MSGraphCanvas({
  onNodeClick,
  onEdgeClick,
  onNodeExpand,
  onNodeRemove,
}: MSGraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  /* ── Store selectors (primitive-stable) ── */
  const storeNodes = useCWTrackerStore((s) => s.nodes);
  const storeEdges = useCWTrackerStore((s) => s.edges);
  const storeAnnotations = useCWTrackerStore((s) => s.annotations);
  const storeActivatedNodeIds = useCWTrackerStore((s) => s.activatedNodeIds);
  const filterChains = useCWTrackerStore((s) => s.filter.chains);
  const filterTokens = useCWTrackerStore((s) => s.filter.tokens);
  const filterSearchText = useCWTrackerStore((s) => s.filter.searchText);
  const getFilteredNodes = useCWTrackerStore((s) => s.getFilteredNodes);
  const getFilteredEdges = useCWTrackerStore((s) => s.getFilteredEdges);
  const nodes = useMemo(() => getFilteredNodes(), [storeNodes, filterChains, filterTokens, filterSearchText]); // eslint-disable-line react-hooks/exhaustive-deps
  const edges = useMemo(() => getFilteredEdges(), [storeEdges, storeNodes, storeActivatedNodeIds, filterChains, filterTokens, filterSearchText]); // eslint-disable-line react-hooks/exhaustive-deps
  const zoom = useCWTrackerStore((s) => s.zoom);
  const panX = useCWTrackerStore((s) => s.panX);
  const panY = useCWTrackerStore((s) => s.panY);
  const setZoom = useCWTrackerStore((s) => s.setZoom);
  const setPan = useCWTrackerStore((s) => s.setPan);
  const selectedNodeId = useCWTrackerStore((s) => s.selectedNodeId);
  const selectedEdgeId = useCWTrackerStore((s) => s.selectedEdgeId);
  const hoveredNodeId = useCWTrackerStore((s) => s.hoveredNodeId);
  const hoveredEdgeId = useCWTrackerStore((s) => s.hoveredEdgeId);
  const hoverNode = useCWTrackerStore((s) => s.hoverNode);
  const hoverEdge = useCWTrackerStore((s) => s.hoverEdge);
  const selectNode = useCWTrackerStore((s) => s.selectNode);
  const selectEdge = useCWTrackerStore((s) => s.selectEdge);
  const controlMode = useCWTrackerStore((s) => s.controlMode);
  const removeNode = useCWTrackerStore((s) => s.removeNode);
  const expandNodeDirection = useCWTrackerStore((s) => s.expandNodeDirection);
  const openNodeDetail = useCWTrackerStore((s) => s.openNodeDetail);
  const openAdvancedAnalyze = useCWTrackerStore((s) => s.openAdvancedAnalyze);
  const openEdgeStylePicker = useCWTrackerStore((s) => s.openEdgeStylePicker);
  const openEdgeList = useCWTrackerStore((s) => s.openEdgeList);
  const updateNode = useCWTrackerStore((s) => s.updateNode);
  const addEdges = useCWTrackerStore((s) => s.addEdges);
  const addAnnotation = useCWTrackerStore((s) => s.addAnnotation);
  const updateAnnotation = useCWTrackerStore((s) => s.updateAnnotation);
  const removeAnnotation = useCWTrackerStore((s) => s.removeAnnotation);
  const setControlMode = useCWTrackerStore((s) => s.setControlMode);
  const activateNode = useCWTrackerStore((s) => s.activateNode);
  const isNodeActivated = useCWTrackerStore((s) => s.isNodeActivated);

  /* ── Local state ── */
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  // Edit label
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editLabelValue, setEditLabelValue] = useState("");
  // Draw edge
  const [drawEdgeSourceId, setDrawEdgeSourceId] = useState<string | null>(null);
  const [drawEdgeMouse, setDrawEdgeMouse] = useState<{ x: number; y: number } | null>(null);
  const [pinnedExpandedNodeIds, setPinnedExpandedNodeIds] = useState<Set<string>>(new Set());

  /* ── Node map for fast lookup ── */
  const nodeMap = useMemo(() => {
    const m = new Map<string, MSNode>();
    for (const n of nodes) m.set(n.id, n);
    return m;
  }, [nodes]);

  /** Per-node estimated USD total from connected edges */
  const nodeFlowUSD = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of edges) {
      const price = APPROX_TOKEN_USD[e.tokenSymbol?.toUpperCase()] ?? 0;
      const usd = (e.totalValue || 0) * price;
      if (usd > 0) {
        map.set(e.source, (map.get(e.source) || 0) + usd);
        map.set(e.target, (map.get(e.target) || 0) + usd);
      }
    }
    return map;
  }, [edges]);

  const nodeGroupMap = useMemo(() => {
    const map = new Map<string, string>();
    if (nodes.length === 0) return map;

    const adjacency = new Map<string, string[]>();
    for (const n of nodes) adjacency.set(n.id, []);
    for (const e of edges) {
      adjacency.get(e.source)?.push(e.target);
      adjacency.get(e.target)?.push(e.source);
    }

    const roots = nodes.filter((n) => n.isRoot);
    const visited = new Set<string>();

    for (const root of roots) {
      const groupId = `target-${root.id}`;
      const q: string[] = [root.id];
      visited.add(root.id);
      map.set(root.id, groupId);

      while (q.length > 0) {
        const cur = q.shift()!;
        for (const nei of adjacency.get(cur) ?? []) {
          if (visited.has(nei)) continue;
          visited.add(nei);
          map.set(nei, groupId);
          q.push(nei);
        }
      }
    }

    let floatingIdx = 1;
    for (const n of nodes) {
      if (map.has(n.id)) continue;
      map.set(n.id, `target-floating-${floatingIdx}`);
      floatingIdx += 1;
    }
    return map;
  }, [nodes, edges]);

  /* ════════════════════ PAN / ZOOM ════════════════════ */

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + delta));
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        const scale = newZoom / zoom;
        setPan(cx - (cx - panX) * scale, cy - (cy - panY) * scale);
      }
      setZoom(newZoom);
    },
    [zoom, panX, panY, setZoom, setPan]
  );

  /** Convert screen coords to canvas coords */
  const screenToCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (clientX - rect.left - panX) / zoom,
        y: (clientY - rect.top - panY) / zoom,
      };
    },
    [panX, panY, zoom]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      const tag = (e.target as SVGElement).tagName;
      const isBg = tag === "svg" || (e.target as SVGElement).classList.contains("canvas-bg");
      if (isBg) {
        // Annotation mode: click canvas to create annotation
        if (controlMode === "annotate") {
          const pos = screenToCanvas(e.clientX, e.clientY);
          addAnnotation({
            id: `anno_${Date.now()}`,
            targetId: "",
            targetType: "node",
            text: "Memo",
            color: "#bd7c40",
            createdAt: new Date().toISOString(),
            x: pos.x,
            y: pos.y,
          });
          return;
        }
        // Draw edge mode: click canvas to cancel
        if (controlMode === "draw_edge" && drawEdgeSourceId) {
          setDrawEdgeSourceId(null);
          setDrawEdgeMouse(null);
          return;
        }
        setIsPanning(true);
        setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
        selectNode(null);
        selectEdge(null);
      }
    },
    [panX, panY, selectNode, selectEdge, controlMode, screenToCanvas, addAnnotation, drawEdgeSourceId]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setPan(e.clientX - panStart.x, e.clientY - panStart.y);
      }
      if (dragNodeId) {
        const dx = (e.clientX - dragStart.x) / zoom;
        const dy = (e.clientY - dragStart.y) / zoom;
        const node = nodeMap.get(dragNodeId);
        if (node) {
          updateNode(dragNodeId, { x: node.x + dx, y: node.y + dy });
          setDragStart({ x: e.clientX, y: e.clientY });
        }
      }
      // Draw edge: track mouse
      if (controlMode === "draw_edge" && drawEdgeSourceId) {
        const pos = screenToCanvas(e.clientX, e.clientY);
        setDrawEdgeMouse(pos);
      }
    },
    [isPanning, panStart, dragNodeId, dragStart, zoom, nodeMap, setPan, updateNode, controlMode, drawEdgeSourceId, screenToCanvas]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setDragNodeId(null);
  }, []);

  /* ════════════════════ NODE EVENTS ════════════════════ */

  const handleNodeMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      if (controlMode === "drag") {
        setDragNodeId(nodeId);
        setDragStart({ x: e.clientX, y: e.clientY });
      }
    },
    [controlMode]
  );

  const handleNodeClick2 = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      // Draw edge mode: pick source or target
      if (controlMode === "draw_edge") {
        if (!drawEdgeSourceId) {
          setDrawEdgeSourceId(nodeId);
          return;
        }
        if (drawEdgeSourceId !== nodeId) {
          addEdges([{
            id: `custom_${Date.now()}`,
            source: drawEdgeSourceId,
            target: nodeId,
            chain: "custom",
            direction: "out",
            isCurve: false,
            curveOffset: 0,
            totalValue: 0,
            valueLabel: "",
            tokenSymbol: "",
            transferCount: 0,
            color: MS_COLORS.edgeDefault,
            isHighlighted: false,
            isSelected: false,
            details: [],
            isSuspicious: false,
            isCrossChain: false,
            isCustom: true,
            amountLabel: "Custom Edge",
          }]);
        }
        setDrawEdgeSourceId(null);
        setDrawEdgeMouse(null);
        setControlMode("select");
        return;
      }
      selectNode(nodeId);
      setPinnedExpandedNodeIds((prev) => {
        const next = new Set(prev);
        if (next.has(nodeId)) next.delete(nodeId);
        else next.add(nodeId);
        return next;
      });
      onNodeClick?.(nodeId);
    },
    [selectNode, onNodeClick, controlMode, drawEdgeSourceId, addEdges, setControlMode]
  );

  /* ════════════════════ EDIT LABEL ════════════════════ */

  const startEditLabel = useCallback((nodeId: string) => {
    const node = nodeMap.get(nodeId);
    if (node) {
      setEditingNodeId(nodeId);
      setEditLabelValue(node.label);
    }
  }, [nodeMap]);

  const commitEditLabel = useCallback(() => {
    if (editingNodeId && editLabelValue.trim()) {
      updateNode(editingNodeId, { label: editLabelValue.trim() });
    }
    setEditingNodeId(null);
  }, [editingNodeId, editLabelValue, updateNode]);

  /* ════════════════════ RENDER EDGES ════════════════════ */

  const renderEdge = useCallback(
    (edge: MSEdge, edgeIndex: number) => {
      const src = nodeMap.get(edge.source);
      const tgt = nodeMap.get(edge.target);
      if (!src || !tgt) return null;
      // Skip if dagre hasn't assigned label positions yet
      if (edge.labelX == null || edge.labelY == null) return null;

      const isHovered = hoveredEdgeId === edge.id;
      const isSelected = selectedEdgeId === edge.id;
      const color = edge.customColor || getEdgeEntityColor(tgt.type);
      const baseWidth = edge.customWidth ?? EDGE_WIDTH;
      const strokeWidth = isHovered || isSelected ? baseWidth + 1.5 : baseWidth;
      const amountStr = edge.amountLabel || edge.valueLabel || msFormatTokenAmount(edge.totalValue, edge.tokenSymbol);
      const ordinalStr = `[${edgeIndex + 1}]`;

      // Format timestamp if available (YYYY-MM-DD HH:mm:ss)
      let dateStr = "";
      const ts = edge.latestTimestamp || (edge.details?.[0]?.timestamp);
      if (ts) {
        try {
          const tNum = typeof ts === "string" ? (Number(ts) > 0 && !isNaN(Number(ts)) ? (Number(ts) > 1e12 ? Number(ts) : Number(ts) * 1000) : new Date(ts).getTime()) : ts;
          const d = new Date(tNum);
          if (!isNaN(d.getTime()) && d.getTime() > 0) {
            const pad = (n: number) => String(n).padStart(2, "0");
            dateStr = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
          }
        } catch { /* ignore */ }
      }

      /* Cross-chain dashed edge */
      const dashArray = edge.customDash === "dashed" ? "8,4"
        : edge.customDash === "dotted" ? "2,4"
        : edge.isCrossChain ? "5,2"
        : undefined;

      // Determine relative positions for bidirectional routing
      const srcCenterX = src.x + NODE_W / 2;
      const tgtCenterX = tgt.x + NODE_W / 2;
      const srcIsLeft = srcCenterX < tgtCenterX;

      // Source departs from the side FACING the target
      const sx = srcIsLeft ? (src.x + NODE_W) : src.x;
      const sy = src.y + NODE_H / 2;
      const lL = edge.labelX;              // label left
      const lY = edge.labelY;              // label center Y
      const lR = edge.labelX + LABEL_W;    // label right
      // Target entered from the side FACING the source
      const tx = srcIsLeft ? tgt.x : (tgt.x + NODE_W);
      const ty = tgt.y + NODE_H / 2;

      // Dagre B-spline routing with clamped endpoints:
      // - path1[0] → (sx,sy) + 30px horizontal GATHER for bundling
      // - path2[last] → (tx,ty) for correct entry side
      const GATHER = 30;
      const gDir = srcIsLeft ? GATHER : -GATHER;
      const p1Raw = edge.path1Points;
      const p1Pts = p1Raw && p1Raw.length >= 2
        ? [{ x: sx, y: sy }, { x: sx + gDir, y: sy }, ...p1Raw.slice(1)]
        : undefined;
      const p2Raw = edge.path2Points;
      const p2Pts = p2Raw && p2Raw.length >= 2
        ? [...p2Raw.slice(0, -1), { x: tx, y: ty }]
        : undefined;

      const path1 = p1Pts && p1Pts.length >= 3
        ? basisSplinePath(p1Pts)
        : computeSegmentPath(sx, sy, lL, lY);
      const path2 = p2Pts && p2Pts.length >= 3
        ? basisSplinePath(p2Pts)
        : computeSegmentPath(lR, lY, tx, ty);
      // Horizontal label line
      const labelLine = `M${lL},${lY}L${lR},${lY}`;

      const activeColor = isSelected ? MS_COLORS.selectedBorder : color;

      // Arrowhead: fixed 10×6 triangle at path2 endpoint (matching MetaSleuth)
      const arrowPts = computeArrowPoints(
        p2Pts || [{ x: lR, y: lY }, { x: tx, y: ty }],
        10, 3
      );

      // Label text: [N] in edge color + [date] amount token in white (single line)
      const ordinalWidth = ordinalStr.length * 7.5 + 3;
      const labelText = dateStr ? `[${dateStr}] ${amountStr}` : amountStr;

      return (
        <g key={edge.id} className={`edge i-${edgeIndex + 1}-i w-${Math.round(strokeWidth)}-w k-${edge.source}->${edge.target}-k edge-bound`}>

          {/* Segment 1: source → label */}
          <path d={path1} fill="none" stroke="transparent" strokeWidth={Math.max(16, strokeWidth + 10)}
            onMouseEnter={() => hoverEdge(edge.id)} onMouseLeave={() => hoverEdge(null)}
            onClick={(e) => { e.stopPropagation(); selectEdge(edge.id); onEdgeClick?.(edge.id); }}
            style={{ cursor: "pointer" }} />
          <path d={path1} fill="none" stroke={activeColor} strokeWidth={strokeWidth}
            strokeDasharray={dashArray} className="pointer-events-none" />

          {/* Label horizontal line */}
          <path d={labelLine} fill="none" stroke={activeColor} strokeWidth={strokeWidth}
            className="pointer-events-none" />

          {/* Segment 2: label → target */}
          <path d={path2} fill="none" stroke="transparent" strokeWidth={Math.max(16, strokeWidth + 10)}
            onMouseEnter={() => hoverEdge(edge.id)} onMouseLeave={() => hoverEdge(null)}
            onClick={(e) => { e.stopPropagation(); selectEdge(edge.id); onEdgeClick?.(edge.id); }}
            style={{ cursor: "pointer" }} />
          <path d={path2} fill="none" stroke={activeColor} strokeWidth={strokeWidth}
            strokeDasharray={dashArray} className="pointer-events-none" />

          {/* Arrowhead: direct polygon triangle at path2 endpoint */}
          {arrowPts && (
            <polygon fill={activeColor} stroke={activeColor} strokeWidth={baseWidth} points={arrowPts} />
          )}

          {/* Label hit area — extended upward to cover floating action buttons */}
          <rect x={lL} y={lY - LABEL_H / 2 - 34} width={LABEL_W} height={LABEL_H + 34}
            fill="transparent" stroke="transparent"
            onMouseEnter={() => hoverEdge(edge.id)} onMouseLeave={() => hoverEdge(null)}
            onClick={(e) => { e.stopPropagation(); selectEdge(edge.id); onEdgeClick?.(edge.id); }}
            style={{ cursor: "pointer" }} />

          {/* Edge label: [N] in edge color + [date] amount token in white — centered via textAnchor */}
          <text textAnchor="middle" x={lL + LABEL_W / 2} y={lY - 7}
            fontFamily="Inter, sans-serif" fontSize={12}
            className="pointer-events-none" style={{ userSelect: "none" }}>
            <tspan fill={color}>{ordinalStr} </tspan>
            <tspan fill="#fff">{labelText}</tspan>
          </text>

          {/* Edge hover overlay — style/delete (with extended hit zone so buttons stay accessible) */}
          {(isHovered || isSelected) && (
            <g onMouseEnter={() => hoverEdge(edge.id)} onMouseLeave={() => hoverEdge(null)}>
              {/* Transparent bridge from label to buttons */}
              <rect x={lL + LABEL_W / 2 - 50} y={lY - LABEL_H / 2 - 34} width={100} height={38} fill="transparent" />
              <foreignObject x={lL + LABEL_W / 2 - 50} y={lY - LABEL_H / 2 - 32} width={100} height={28}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, background: "#2a2a2a", border: "1px solid #444", borderRadius: 6, padding: "2px 6px", height: 26 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdgeStylePicker(edge.id); }}
                    style={{ width: 22, height: 22, border: "none", borderRadius: 4, background: "transparent", color: "#999", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}
                    onMouseOver={(e) => (e.currentTarget.style.color = "#fff")}
                    onMouseOut={(e) => (e.currentTarget.style.color = "#999")}
                  >
                    ◐
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdgeList(edge.id); }}
                    style={{ width: 22, height: 22, border: "none", borderRadius: 4, background: "transparent", color: "#999", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}
                    onMouseOver={(e) => (e.currentTarget.style.color = "#fff")}
                    onMouseOut={(e) => (e.currentTarget.style.color = "#999")}
                  >
                    ☰
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); useCWTrackerStore.getState().removeEdge(edge.id); }}
                    style={{ width: 22, height: 22, border: "none", borderRadius: 4, background: "transparent", color: "#999", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}
                    onMouseOver={(e) => (e.currentTarget.style.color = "#ff4d4f")}
                    onMouseOut={(e) => (e.currentTarget.style.color = "#999")}
                  >
                    ✕
                  </button>
                </div>
              </foreignObject>
            </g>
          )}
        </g>
      );
    },
    [nodeMap, hoveredEdgeId, selectedEdgeId, hoverEdge, selectEdge, onEdgeClick, openEdgeStylePicker, openEdgeList]
  );

  /* ════════════════════ RENDER NODE HOVER EXPAND BUTTONS ════════════════════ */

  const renderNodeActions = useCallback(
    (node: MSNode, show: boolean, visualHeight: number) => {
      if (!show) return null;
      const oX = node.x + 11;
      const oY = node.y + 24;
      return (
        <g className="NODE_CONTROL">
          {/* Invisible hit-zone rects — exact competitor dimensions */}
          <rect x={oX - 32} y={oY - 45} width={30} height={visualHeight + 52} fill="transparent" className="pointer-events-auto" />
          <rect x={oX + 262} y={oY - 45} width={30} height={visualHeight + 52} fill="transparent" className="pointer-events-auto" />

          {/* Left expand (Incoming) — orange "+" */}
          <g onClick={(e) => { e.stopPropagation(); expandNodeDirection(node.id, "left"); }} style={{ cursor: "pointer" }}>
            <title>Expand Incoming</title>
            <rect x={oX - 32} y={oY + 27} width={15} height={15} rx={4} fill={MS_COLORS.primary} />
            <text x={oX - 24.5} y={oY + 38} textAnchor="middle" fontSize={11} fontWeight={700} fill="#fff">+</text>
          </g>

          {/* Right expand (Outgoing) — orange "+" */}
          <g onClick={(e) => { e.stopPropagation(); expandNodeDirection(node.id, "right"); }} style={{ cursor: "pointer" }}>
            <title>Expand Outgoing</title>
            <rect x={oX + 277} y={oY + 27} width={15} height={15} rx={4} fill={MS_COLORS.primary} />
            <text x={oX + 284.5} y={oY + 38} textAnchor="middle" fontSize={11} fontWeight={700} fill="#fff">+</text>
          </g>
        </g>
      );
    },
    [expandNodeDirection]
  );

  /* ════════════════════ RENDER NODE ════════════════════ */

  const renderNode = useCallback(
    (node: MSNode) => {
      const isHovered = hoveredNodeId === node.id;
      const isSelected = selectedNodeId === node.id;
      const isEdgeConnected = hoveredEdgeId
        ? edges.some((e) => e.id === hoveredEdgeId && (e.source === node.id || e.target === node.id))
        : false;
      const showGlow = isHovered || isSelected || isEdgeConnected;
      const isPinnedExpanded = pinnedExpandedNodeIds.has(node.id);
      const showExpanded = isHovered || isSelected || isPinnedExpanded;
      const visualHeight = showExpanded ? NODE_H + EXPANDED_NODE_EXTRA_H : NODE_H;
      const fill = node.customColor || (node.isRoot ? MS_COLORS.nodeRootFill : MS_COLORS.nodeFill);
      const strokeColor = node.isRoot
        ? MS_COLORS.selectedBorder
        : isSelected
        ? MS_COLORS.selectedBorder
        : isEdgeConnected
        ? MS_COLORS.edgeHighlight
        : MS_COLORS.nodeStroke;
      const strokeW = node.isRoot || isSelected || isEdgeConnected ? 3 : 1;
      const textColor = node.customTextColor || MS_COLORS.textPrimary;

      const isBridge = node.customShape === "doubleoctagon" || !!node.crossChainInfo;
      const isDanger = node.riskLevel === "high" || node.riskLevel === "critical";

      return (
        <g
          key={node.id}
          className={`node addressNode s-${node.customShape || "rect"}-s k-${node.id}-k cursor-pointer${showGlow ? " graph-node-shadow" : ""}${isBridge ? " isCrossChain" : ""}`}
          onMouseEnter={() => hoverNode(node.id)}
          onMouseLeave={() => hoverNode(null)}
          onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
          onClick={(e) => handleNodeClick2(e, node.id)}
        >
          {/* Node background — simple rect */}
          <rect
            x={node.x}
            y={node.y}
            width={NODE_W}
            height={visualHeight}
            rx={NODE_R}
            fill={fill}
            stroke={isBridge ? "#bd7c4060" : strokeColor}
            strokeWidth={isBridge ? 2 : strokeW}
            filter={showGlow ? "url(#node-glow)" : undefined}
          />

          {/* Risk badge — colored circle with icon at top-right */}
          {isDanger && (
            <g className="pointer-events-none">
              <circle cx={node.x + NODE_W - 10} cy={node.y - 4} r={10} fill={node.riskLevel === "critical" ? "#D60473" : "#FF3B30"} />
              <text x={node.x + NODE_W - 10} y={node.y} textAnchor="middle" fontSize={11} fontWeight={700} fill="#fff">!</text>
            </g>
          )}

          {/* ── Node content via foreignObject (guarantees overflow:hidden) ── */}
          <foreignObject x={node.x} y={node.y} width={NODE_W} height={NODE_H}>
            <div
              style={{
                width: NODE_W, height: NODE_H, overflow: "hidden",
                display: "flex", alignItems: "flex-start", gap: 10,
                padding: "12px 10px 8px 12px", boxSizing: "border-box",
                fontFamily: "Inter, sans-serif", pointerEvents: "none",
              }}
            >
              {/* Chain icon with coloured circle */}
              <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: "50%", background: getMSChainBgColor(node.chain) + "2E", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img src={getMSChainIconUrl(node.chain)} width={22} height={22} alt="" style={{ borderRadius: "50%" }} />
              </div>

              {/* Text column */}
              <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                {/* Row 1: label */}
                {editingNodeId === node.id ? (
                  <input
                    autoFocus
                    value={editLabelValue}
                    onChange={(ev) => setEditLabelValue(ev.target.value)}
                    onKeyDown={(ev) => { if (ev.key === "Enter") commitEditLabel(); if (ev.key === "Escape") setEditingNodeId(null); }}
                    onBlur={commitEditLabel}
                    onClick={(ev) => ev.stopPropagation()}
                    onMouseDown={(ev) => ev.stopPropagation()}
                    style={{ width: "100%", fontSize: 13, fontWeight: 600, color: textColor, background: "rgba(255,255,255,0.1)", border: `1px solid ${MS_COLORS.primary}`, borderRadius: 3, padding: "1px 4px", outline: "none", fontFamily: "Inter, sans-serif", pointerEvents: "auto" }}
                  />
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, lineHeight: "18px" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: textColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: isBridge ? 120 : 170 }}>
                      {node.label}
                    </span>
                    {node.isRoot && <span style={{ fontSize: 9, fontWeight: 700, color: MS_COLORS.primary, flexShrink: 0 }}>ROOT</span>}
                    {isBridge && <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.44)", background: "rgba(255,255,255,0.063)", borderRadius: 3, padding: "1px 6px", flexShrink: 0 }}>Bridge</span>}
                    {node.riskLevel && node.riskLevel !== "unknown" && !isDanger && (
                      <span style={{ fontSize: 9, color: getMSRiskColor(node.riskLevel), marginLeft: "auto", flexShrink: 0 }}>{getMSRiskLabel(node.riskLevel)}</span>
                    )}
                  </div>
                )}
                {/* Row 2: address */}
                <div style={{ marginTop: 1, lineHeight: "14px" }}>
                  <span style={{ fontFamily: "Menlo, Monaco, monospace", fontSize: 10, color: "rgba(255,255,255,0.55)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>
                    {node.address || ""}
                  </span>
                </div>
                {/* Row 3: USD balance (green) */}
                {(() => {
                  const usd = node.balanceUSD ?? node.totalValueUSD ?? nodeFlowUSD.get(node.id);
                  return usd && usd > 0 ? (
                    <div style={{ marginTop: 1, fontSize: 11, fontWeight: 700, color: "#24c197", lineHeight: "14px" }}>
                      ≈ {msFormatValue(usd)}
                    </div>
                  ) : null;
                })()}
              </div>

              {/* Icon column — Copy & Explorer */}
              <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: 4, marginTop: 2, pointerEvents: "auto", opacity: isHovered ? 1 : 0.5 }}>
                <svg width={14} height={14} viewBox="0 0 16 16" style={{ cursor: "pointer" }}
                  onClick={(ev) => { ev.stopPropagation(); navigator.clipboard.writeText(node.address); }}>
                  <title>Copy address</title>
                  <path d={SVG_ICON.copy} fill="none" stroke="#999" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <svg width={14} height={14} viewBox="0 0 16 16" style={{ cursor: "pointer" }}
                  onClick={(ev) => { ev.stopPropagation(); window.open(getBlockExplorerUrl(node.chain, node.address), "_blank"); }}>
                  <title>View on explorer</title>
                  <path d={SVG_ICON.explorer} fill="none" stroke="#999" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </foreignObject>

          {/* ── Expanded state: Action bar ── */}
          {showExpanded && (
            <>
              {/* Analyze button — orange, rounded-left */}
              <g onClick={(e) => { e.stopPropagation(); openAdvancedAnalyze(node.id); }} style={{ cursor: "pointer" }}>
                <rect x={node.x + 6} y={node.y + NODE_H + 4} width={170} height={28} rx={6} fill={MS_COLORS.primary} />
                <rect x={node.x + 170} y={node.y + NODE_H + 4} width={6} height={28} fill={MS_COLORS.primary} />
                <text x={node.x + 91} y={node.y + NODE_H + 22} fill="#fff" fontSize={13} fontWeight={500} textAnchor="middle" fontFamily="Inter" className="pointer-events-none">Analyze</text>
              </g>

              {/* Settings button — orange, rounded-right */}
              <g onClick={(e) => { e.stopPropagation(); openAdvancedAnalyze(node.id); }} style={{ cursor: "pointer" }}>
                <title>Advanced settings</title>
                <rect x={node.x + 177} y={node.y + NODE_H + 4} width={30} height={28} rx={0} fill={MS_COLORS.primary} />
                <rect x={node.x + 201} y={node.y + NODE_H + 4} width={6} height={28} rx={6} fill={MS_COLORS.primary} />
                <svg x={node.x + 184} y={node.y + NODE_H + 10} width={16} height={16} viewBox="0 0 16 16">
                  <path d={SVG_ICON.sliders} fill="none" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" />
                </svg>
              </g>

              {/* Edit button — dark bg */}
              <g onClick={(e) => { e.stopPropagation(); startEditLabel(node.id); }} style={{ cursor: "pointer" }}>
                <title>Edit name tag</title>
                <rect x={node.x + 214} y={node.y + NODE_H + 4} width={28} height={28} rx={6} fill="#30313580" />
                <svg x={node.x + 220} y={node.y + NODE_H + 10} width={16} height={16} viewBox="0 0 16 16">
                  <path d={SVG_ICON.pencil} fill="none" stroke="#cfcfcf" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </g>

              {/* Delete button — dark bg, red icon */}
              <g onClick={(e) => { e.stopPropagation(); removeNode(node.id); onNodeRemove?.(node.id); }} style={{ cursor: "pointer" }}>
                <title>Remove this node</title>
                <rect x={node.x + 246} y={node.y + NODE_H + 4} width={28} height={28} rx={6} fill="#30313580" />
                <svg x={node.x + 252} y={node.y + NODE_H + 10} width={16} height={16} viewBox="0 0 16 16">
                  <path d={SVG_ICON.trash} fill="none" stroke="#ff4d4f" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </g>
            </>
          )}

          {/* Loading spinner */}
          {node.isLoading && (
            <foreignObject x={node.x + NODE_W / 2 - 12} y={node.y + visualHeight + 4} width={24} height={24}>
              <div className="w-5 h-5 border-2 border-[var(--default-color)] border-t-transparent rounded-full animate-spin" />
            </foreignObject>
          )}

          {renderNodeActions(node, showExpanded, visualHeight)}
        </g>
      );
    },
    [
      hoveredNodeId, selectedNodeId, hoveredEdgeId, edges,
      hoverNode, handleNodeMouseDown, handleNodeClick2,
      renderNodeActions, editingNodeId, editLabelValue, commitEditLabel,
      pinnedExpandedNodeIds, openAdvancedAnalyze, startEditLabel,
      removeNode, onNodeRemove, nodeFlowUSD,
    ]
  );

  /* ════════════════════ RENDER ANNOTATIONS ════════════════════ */

  const renderAnnotation = useCallback(
    (anno: MSAnnotation) => {
      if (anno.x == null || anno.y == null) return null;
      return (
        <foreignObject key={anno.id} x={anno.x} y={anno.y} width={200} height={80} className="overflow-visible">
          <div
            style={{
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(8px)",
              border: `1px solid ${anno.color || "#bd7c40"}`,
              borderRadius: 8,
              padding: "6px 10px",
              minHeight: 32,
              minWidth: 80,
              maxWidth: 200,
            }}
          >
            <div
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => {
                const txt = (e.target as HTMLDivElement).textContent?.trim() || "";
                if (txt) updateAnnotation(anno.id, { text: txt });
                else removeAnnotation(anno.id);
              }}
              style={{
                color: "#fff",
                fontSize: 12,
                fontFamily: "Inter, sans-serif",
                outline: "none",
                minHeight: 18,
                wordBreak: "break-word",
              }}
            >
              {anno.text}
            </div>
            <button
              onClick={() => removeAnnotation(anno.id)}
              style={{
                position: "absolute",
                top: -6,
                right: -6,
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: "#333",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff",
                fontSize: 10,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        </foreignObject>
      );
    },
    [updateAnnotation, removeAnnotation]
  );

  /* ════════════════════ CURSOR ════════════════════ */

  const cursor = isPanning
    ? "grabbing"
    : controlMode === "drag"
    ? "grab"
    : controlMode === "draw_edge"
    ? "crosshair"
    : controlMode === "annotate"
    ? "text"
    : "default";

  /* ════════════════════ RENDER SVG ════════════════════ */

  return (
    <svg
      ref={svgRef}
      className="w-full h-full canvas-bg"
      style={{ background: MS_COLORS.canvasBg, cursor }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <defs>
        {/* Node glow filter */}
        <filter id="node-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feFlood floodColor="#bd7c40" floodOpacity="0.5" result="color" />
          <feComposite in2="blur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Edge glow filter */}
        <filter id="edge-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feFlood floodColor="#bd7c40" floodOpacity="0.6" result="color" />
          <feComposite in2="blur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Transform group for pan/zoom */}
      <g id="graph0" transform={`translate(${panX},${panY}) scale(${zoom})`}>
        {/* Grid pattern (subtle dots) */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="20" r="0.8" fill={MS_COLORS.canvasGrid} />
          </pattern>
        </defs>
        <rect x={-10000} y={-10000} width={20000} height={20000} fill="url(#grid)" className="pointer-events-none" />

        {Array.from(new Set(nodes.map((n) => nodeGroupMap.get(n.id) ?? "target-floating"))).map((groupId) => {
          const groupNodes = nodes.filter((n) => (nodeGroupMap.get(n.id) ?? "target-floating") === groupId);
          const groupNodeIds = new Set(groupNodes.map((n) => n.id));
          const groupEdges = edges
            .filter((e) => groupNodeIds.has(e.source) && groupNodeIds.has(e.target))
            .sort((a, b) => {
              // Chronological ordering by latestTimestamp
              const tA = a.latestTimestamp || a.details?.[0]?.timestamp || "";
              const tB = b.latestTimestamp || b.details?.[0]?.timestamp || "";
              return tA < tB ? -1 : tA > tB ? 1 : 0;
            });

          const gx = Math.min(...groupNodes.map((n) => n.x)) - 28;
          const gy = Math.min(...groupNodes.map((n) => n.y)) - 22;
          const gw = Math.max(...groupNodes.map((n) => n.x + NODE_W)) - gx + 28;
          const gh = Math.max(...groupNodes.map((n) => n.y + NODE_H + EXPANDED_NODE_EXTRA_H)) - gy + 22;

          return (
            <g key={groupId} className={`target-zone ${groupId}`}>
              <rect x={gx} y={gy} width={gw} height={gh} rx={10} fill="transparent" stroke="rgba(189,124,64,0.12)" strokeDasharray="4,6" className="pointer-events-none" />
              {groupEdges.map((edge, idx) => renderEdge(edge, idx))}
              {groupNodes.map(renderNode)}
            </g>
          );
        })}

        {/* Draw edge temp line */}
        {drawEdgeSourceId && drawEdgeMouse && (() => {
          const srcNode = nodeMap.get(drawEdgeSourceId);
          if (!srcNode) return null;
          return (
            <line
              x1={srcNode.x + NODE_W}
              y1={srcNode.y + NODE_H / 2}
              x2={drawEdgeMouse.x}
              y2={drawEdgeMouse.y}
              stroke={MS_COLORS.primary}
              strokeWidth={2}
              strokeDasharray="8,4"
              className="pointer-events-none"
            />
          );
        })()}

        {/* Annotations */}
        {storeAnnotations.map(renderAnnotation)}
      </g>
    </svg>
  );
}
