/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CWTrackerGraph — SVG graph canvas with D3 zoom/pan         ║
 * ║  CWTracker-parity: 285×75 NodeCard, iconfont icons,        ║
 * ║  token-colored edges, action bar, INCOMING/OUTGOING arrows  ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

"use client";

import React, {
  useRef,
  useEffect,
  useCallback,
  useState,
  useMemo,
} from "react";
import * as d3 from "d3";
import { useCWTrackerStore } from "@/lib/onchain/cwtracker-store";
import {
  MS_NODE,
  MS_COLORS,
  getMSEntityColor,
  getMSEntityIconClass,
  getMSChainIconUrl,
  msShortenAddress,
  msFormatValue,
  getMSTokenColor,
  getMSRiskColor,
  type MSNode,
  type MSEdge,
  type MSDisplayOptions,
} from "@/lib/onchain/cwtracker-types";

/* ────────────────────────────── PROPS ────────────────────────────── */

interface CWTrackerGraphProps {
  onNodeClick?: (nodeId: string) => void;
  onEdgeClick?: (edgeId: string) => void;
  onNodeExpand?: (nodeId: string) => void;
  onNodeRemove?: (nodeId: string) => void;
}

/* ────────────────────────────── COMPONENT ────────────────────────────── */

export function CWTrackerGraph({
  onNodeClick,
  onEdgeClick,
  onNodeExpand,
  onNodeRemove,
}: CWTrackerGraphProps) {
  /* ── Refs ── */
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; nodeId: string } | null>(null);

  /* ── Store ── */
  const rawNodes = useCWTrackerStore((s) => s.nodes);
  const rawEdges = useCWTrackerStore((s) => s.edges);
  const filter = useCWTrackerStore((s) => s.filter);
  const displayOptions = useCWTrackerStore((s) => s.displayOptions);
  const controlMode = useCWTrackerStore((s) => s.controlMode);
  const zoom = useCWTrackerStore((s) => s.zoom);
  const panX = useCWTrackerStore((s) => s.panX);
  const panY = useCWTrackerStore((s) => s.panY);
  const setZoom = useCWTrackerStore((s) => s.setZoom);
  const setPan = useCWTrackerStore((s) => s.setPan);
  const selectedNodeId = useCWTrackerStore((s) => s.selectedNodeId);
  const hoveredNodeId = useCWTrackerStore((s) => s.hoveredNodeId);
  const hoveredEdgeId = useCWTrackerStore((s) => s.hoveredEdgeId);
  const hoverNode = useCWTrackerStore((s) => s.hoverNode);
  const hoverEdge = useCWTrackerStore((s) => s.hoverEdge);
  const updateNode = useCWTrackerStore((s) => s.updateNode);
  const openEdgeList = useCWTrackerStore((s) => s.openEdgeList);
  const openEdgeStylePicker = useCWTrackerStore((s) => s.openEdgeStylePicker);
  const openNodeDetail = useCWTrackerStore((s) => s.openNodeDetail);
  const openFindRelationship = useCWTrackerStore((s) => s.openFindRelationship);
  const expandNodeDirection = useCWTrackerStore((s) => s.expandNodeDirection);

  /* ── Derived filtered data (memoised to avoid infinite loops) ── */
  const nodes = useMemo(() => {
    return rawNodes.filter((n) => {
      if (n.isPruned) return false;
      if (filter.chains.length > 0 && !filter.chains.includes(n.chain)) return false;
      if (filter.entityTypes.length > 0 && !filter.entityTypes.includes(n.type)) return false;
      if (filter.searchText) {
        const q = filter.searchText.toLowerCase();
        const match =
          (n.label || "").toLowerCase().includes(q) ||
          (n.address || "").toLowerCase().includes(q) ||
          (n.subLabel?.toLowerCase().includes(q) ?? false);
        if (!match) return false;
      }
      return true;
    });
  }, [rawNodes, filter]);

  const edges = useMemo(() => {
    const filteredNodeIds = new Set(nodes.map((n) => n.id));
    return rawEdges.filter((e) => {
      if (!filteredNodeIds.has(e.source) || !filteredNodeIds.has(e.target)) return false;
      if (filter.chains.length > 0 && !filter.chains.includes(e.chain)) return false;
      if (filter.tokens.length > 0 && !filter.tokens.includes(e.tokenSymbol)) return false;
      if (e.totalValue < filter.minValue) return false;
      if (filter.maxValue < Infinity && e.totalValue > filter.maxValue) return false;
      if (filter.suspiciousOnly && !e.isSuspicious) return false;
      if (filter.crossChainOnly && !e.isCrossChain) return false;
      return true;
    });
  }, [rawEdges, nodes, filter]);

  /* ── Local hover state with timer ── */
  const [localHoveredId, setLocalHoveredId] = useState<string | null>(null);
  const [localHoveredEdgeId, setLocalHoveredEdgeId] = useState<string | null>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const edgeHoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  /* ── Highlighted path (from root to hovered) ── */
  const highlightedIds = useMemo(() => {
    if (!displayOptions.highlightPath || !hoveredNodeId) return new Set<string>();
    // Simple: highlight all edges connected to hovered node
    const ids = new Set<string>();
    ids.add(hoveredNodeId);
    for (const e of edges) {
      if (e.source === hoveredNodeId || e.target === hoveredNodeId) {
        ids.add(e.id);
        ids.add(e.source);
        ids.add(e.target);
      }
    }
    return ids;
  }, [hoveredNodeId, edges, displayOptions.highlightPath]);

  const edgeEndpointIds = useMemo(() => {
    if (!localHoveredEdgeId) return new Set<string>();
    const e = edges.find((x) => x.id === localHoveredEdgeId);
    if (!e) return new Set<string>();
    return new Set<string>([e.source, e.target]);
  }, [localHoveredEdgeId, edges]);

  /* ── D3 Zoom Setup ── */
  useEffect(() => {
    const svg = svgRef.current;
    const g = gRef.current;
    if (!svg || !g) return;

    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.05, 3])
      .on("zoom", (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        const { x, y, k } = event.transform;
        d3.select(g).attr("transform", `translate(${x},${y}) scale(${k})`);
        setZoom(k);
        setPan(x, y);
      });

    zoomRef.current = zoomBehavior;
    d3.select(svg).call(zoomBehavior);

    // Initial transform
    d3.select(svg).call(
      zoomBehavior.transform,
      d3.zoomIdentity.translate(panX || 400, panY || 300).scale(zoom || 0.7)
    );

    return () => {
      d3.select(svg).on(".zoom", null);
    };
  }, []); // eslint-disable-line

  /* ── Fit to view when data first loads ── */
  useEffect(() => {
    if (nodes.length > 0 && svgRef.current && zoomRef.current) {
      const svg = svgRef.current;
      const svgW = svg.clientWidth || 1200;
      const svgH = svg.clientHeight || 800;

      // For large graphs (many nodes), center on root node at readable zoom
      // rather than shrinking everything to fit
      const rootAddr = useCWTrackerStore.getState().rootAddress;
      const rootNode = rootAddr
        ? nodes.find((n) => n.address?.toLowerCase() === rootAddr.toLowerCase())
        : null;

      if (nodes.length > 30 && rootNode) {
        // Center on root node at a comfortable zoom level
        const scale = 0.55;
        const tx = svgW / 2 - (rootNode.x + MS_NODE.width / 2) * scale;
        const ty = svgH / 2 - (rootNode.y + MS_NODE.height / 2) * scale;

        d3.select(svg)
          .transition()
          .duration(600)
          .call(
            zoomRef.current.transform,
            d3.zoomIdentity.translate(tx, ty).scale(scale)
          );
      } else {
        // Small graphs: fit everything to view
        const xs = nodes.map((n) => n.x);
        const ys = nodes.map((n) => n.y);
        const minX = Math.min(...xs) - 100;
        const maxX = Math.max(...xs) + MS_NODE.width + 100;
        const minY = Math.min(...ys) - 80;
        const maxY = Math.max(...ys) + MS_NODE.height + 80;
        const gWidth = maxX - minX || 1;
        const gHeight = maxY - minY || 1;

        const scale = Math.min(svgW / gWidth, svgH / gHeight, 1) * 0.85;
        const tx = svgW / 2 - (minX + gWidth / 2) * scale;
        const ty = svgH / 2 - (minY + gHeight / 2) * scale;

        d3.select(svg)
          .transition()
          .duration(600)
          .call(
            zoomRef.current.transform,
            d3.zoomIdentity.translate(tx, ty).scale(scale)
          );
      }
    }
  }, [nodes.length]); // eslint-disable-line

  /* ── Hover handlers ── */
  const handleNodeMouseEnter = useCallback(
    (nodeId: string) => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
      setLocalHoveredId(nodeId);
      hoverNode(nodeId);
    },
    [hoverNode]
  );

  const handleNodeMouseLeave = useCallback(() => {
    hoverTimerRef.current = setTimeout(() => {
      setLocalHoveredId(null);
      hoverNode(null);
      hoverTimerRef.current = null;
    }, 2000);
  }, [hoverNode]);

  const handleButtonsMouseEnter = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  const handleButtonsMouseLeave = useCallback(() => {
    hoverTimerRef.current = setTimeout(() => {
      setLocalHoveredId(null);
      hoverNode(null);
      hoverTimerRef.current = null;
    }, 2000);
  }, [hoverNode]);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  /* ── Node drag ── */
  const handleNodeDragStart = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      if (controlMode !== "drag") return;
      e.stopPropagation();
      dragStartRef.current = { x: e.clientX, y: e.clientY, nodeId };
      updateNode(nodeId, { isDragging: true });
    },
    [controlMode, updateNode]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      const { nodeId } = dragStartRef.current;
      const node = useCWTrackerStore.getState().nodes.find((n) => n.id === nodeId);
      if (!node) return;

      // Get current transform
      const g = gRef.current;
      if (!g) return;
      const transform = d3.zoomTransform(svgRef.current!);
      const dx = (e.movementX) / transform.k;
      const dy = (e.movementY) / transform.k;

      updateNode(nodeId, { x: node.x + dx, y: node.y + dy });
    };

    const handleMouseUp = () => {
      if (dragStartRef.current) {
        updateNode(dragStartRef.current.nodeId, { isDragging: false });
        dragStartRef.current = null;
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [updateNode]);

  /* ── Edge path generator ── */
  const getEdgePath = useCallback(
    (edge: MSEdge): string => {
      const src = nodes.find((n) => n.id === edge.source);
      const tgt = nodes.find((n) => n.id === edge.target);
      if (!src || !tgt) return "";

      const x1 = src.x + MS_NODE.width / 2;
      const y1 = src.y + MS_NODE.height / 2;
      const x2 = tgt.x + MS_NODE.width / 2;
      const y2 = tgt.y + MS_NODE.height / 2;

      // Determine exit/entry points
      const dx = x2 - x1;
      const dy = y2 - y1;

      let sx: number, sy: number, ex: number, ey: number;

      if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal flow
        if (dx > 0) {
          sx = src.x + MS_NODE.width;
          sy = src.y + MS_NODE.height / 2;
          ex = tgt.x;
          ey = tgt.y + MS_NODE.height / 2;
        } else {
          sx = src.x;
          sy = src.y + MS_NODE.height / 2;
          ex = tgt.x + MS_NODE.width;
          ey = tgt.y + MS_NODE.height / 2;
        }
      } else {
        // Vertical flow
        if (dy > 0) {
          sx = src.x + MS_NODE.width / 2;
          sy = src.y + MS_NODE.height;
          ex = tgt.x + MS_NODE.width / 2;
          ey = tgt.y;
        } else {
          sx = src.x + MS_NODE.width / 2;
          sy = src.y;
          ex = tgt.x + MS_NODE.width / 2;
          ey = tgt.y - 0;
        }
      }

      if (edge.isCurve) {
        const midX = (sx + ex) / 2;
        const midY = (sy + ey) / 2;
        const offset = edge.curveOffset || 30;
        const perpX = -(ey - sy);
        const perpY = ex - sx;
        const len = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
        const cx = midX + (perpX / len) * offset;
        const cy = midY + (perpY / len) * offset;
        return `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`;
      }

      // Bezier with horizontal control points
      const ctrlOffset = Math.min(Math.abs(ex - sx) * 0.4, 120);
      const c1x = sx + (dx > 0 ? ctrlOffset : -ctrlOffset);
      const c1y = sy;
      const c2x = ex + (dx > 0 ? -ctrlOffset : ctrlOffset);
      const c2y = ey;
      return `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${ex} ${ey}`;
    },
    [nodes]
  );

  /* ── Edge thickness ── */
  const maxEdgeValue = useMemo(() => {
    if (edges.length === 0) return 1;
    return Math.max(...edges.map((e) => e.totalValue), 1);
  }, [edges]);

  const getEdgeWidth = useCallback(
    (edge: MSEdge): number => {
      if (displayOptions.edgeThickness === "uniform") return 2;
      const ratio = edge.totalValue / maxEdgeValue;
      return Math.max(1.5, Math.min(8, ratio * 8));
    },
    [displayOptions.edgeThickness, maxEdgeValue]
  );

  /* ── Render ── */
  return (
    <svg
      ref={svgRef}
      id="ms-graph-svg"
      className="w-full h-full"
      style={{ cursor: controlMode === "pan" ? "grab" : "default" }}
    >
      {/* ── Definitions ── */}
      <defs>
        {/* Arrow markers */}
        <marker
          id="ms-arrow"
          viewBox="0 0 10 8"
          refX="10"
          refY="4"
          markerWidth="8"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 4 L 0 8 Z" fill={MS_COLORS.edgeDefault} />
        </marker>
        <marker
          id="ms-arrow-highlight"
          viewBox="0 0 10 8"
          refX="10"
          refY="4"
          markerWidth="8"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 4 L 0 8 Z" fill={MS_COLORS.edgeHighlight} />
        </marker>
        <marker
          id="ms-arrow-suspicious"
          viewBox="0 0 10 8"
          refX="10"
          refY="4"
          markerWidth="8"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 4 L 0 8 Z" fill={MS_COLORS.edgeSuspicious} />
        </marker>
        <marker
          id="ms-arrow-cross"
          viewBox="0 0 10 8"
          refX="10"
          refY="4"
          markerWidth="8"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 4 L 0 8 Z" fill={MS_COLORS.edgeCrossChain} />
        </marker>

        {/* Node shadow filter */}
        <filter id="ms-node-shadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="rgba(0,0,0,0.4)" />
        </filter>
        <filter id="ms-node-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#bd7c40" floodOpacity="0.65" />
        </filter>

        {/* Grid pattern */}
        <pattern id="ms-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke={MS_COLORS.canvasGrid} strokeWidth="0.5" />
        </pattern>
        <pattern id="ms-grid-accent" width="200" height="200" patternUnits="userSpaceOnUse">
          <path d="M 200 0 L 0 0 0 200" fill="none" stroke={MS_COLORS.canvasGridAccent} strokeWidth="0.5" />
        </pattern>
      </defs>

      {/* ── Main group (zoom/pan target) ── */}
      <g ref={gRef}>
        {/* Grid background */}
        {displayOptions.showGrid && (
          <>
            <rect x="-10000" y="-10000" width="20000" height="20000" fill="url(#ms-grid)" />
            <rect x="-10000" y="-10000" width="20000" height="20000" fill="url(#ms-grid-accent)" />
          </>
        )}

        {/* ── Edges ── */}
        <g className="ms-edges">
          {edges.map((edge) => {
            const path = getEdgePath(edge);
            if (!path) return null;

            const isHl =
              highlightedIds.has(edge.id) || edge.isHighlighted || edge.isSelected;
            const isEdgeHovered = localHoveredEdgeId === edge.id;
            // Token-colored edges (CWTracker parity)
            const tokenColor = edge.customColor || getMSTokenColor(edge.tokenSymbol);
            const color = edge.isSuspicious
              ? MS_COLORS.edgeSuspicious
              : edge.isCrossChain
              ? MS_COLORS.edgeCrossChain
              : isHl
              ? tokenColor
              : tokenColor;
            const baseWidth = edge.customWidth ?? getEdgeWidth(edge);
            const width = isEdgeHovered ? baseWidth + 5 : baseWidth;
            const dashArray = edge.customDash === "dashed"
              ? "8 4"
              : edge.customDash === "dotted"
              ? "2 3"
              : undefined;

            // Midpoint for hover bar
            const pathParts = path.split(/[MCLQSZ ,]+/).filter(Boolean).map(Number);
            const mx = pathParts.length >= 4
              ? (pathParts[0] + pathParts[pathParts.length - 2]) / 2
              : 0;
            const my = pathParts.length >= 4
              ? (pathParts[1] + pathParts[pathParts.length - 1]) / 2
              : 0;

            return (
              <g key={edge.id} className="ms-edge-group">
                {/* Invisible hit area (wider for easy hover) */}
                <path
                  d={path}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={Math.max(width + 14, 20)}
                  className="cursor-pointer"
                  onClick={() => onEdgeClick?.(edge.id)}
                  onMouseEnter={() => {
                    if (edgeHoverTimerRef.current) {
                      clearTimeout(edgeHoverTimerRef.current);
                      edgeHoverTimerRef.current = null;
                    }
                    setLocalHoveredEdgeId(edge.id);
                    hoverEdge(edge.id);
                  }}
                  onMouseLeave={() => {
                    edgeHoverTimerRef.current = setTimeout(() => {
                      setLocalHoveredEdgeId(null);
                      hoverEdge(null);
                    }, 1200);
                  }}
                />
                {/* Visible edge — 3px default, token-colored */}
                <path
                  d={path}
                  fill="none"
                  stroke={color}
                  strokeWidth={width}
                  strokeOpacity={isHl || isEdgeHovered ? 0.9 : 0.55}
                  strokeDasharray={dashArray}
                  markerEnd={displayOptions.showArrows ? `url(#ms-arrow)` : undefined}
                  className="transition-all duration-200 pointer-events-none"
                />

                {/* Edge label — CWTracker format: [count] [time] amount TOKEN */}
                {(displayOptions.showValues || displayOptions.showTokens) && (
                  <EdgeLabel edge={edge} path={path} displayOptions={displayOptions} />
                )}

                {/* ── Edge hover action bar (200×55 foreignObject) ── */}
                {isEdgeHovered && (
                  <foreignObject
                    x={mx - 100}
                    y={my - 32}
                    width={200}
                    height={55}
                    onMouseEnter={() => {
                      if (edgeHoverTimerRef.current) {
                        clearTimeout(edgeHoverTimerRef.current);
                        edgeHoverTimerRef.current = null;
                      }
                    }}
                    onMouseLeave={() => {
                      edgeHoverTimerRef.current = setTimeout(() => {
                        setLocalHoveredEdgeId(null);
                        hoverEdge(null);
                      }, 1200);
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        justifyContent: "center",
                        alignItems: "center",
                        background: "rgba(32,35,38,0.96)",
                        borderRadius: 8,
                        padding: "6px 12px",
                        border: "1px solid rgba(255,255,255,0.08)",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
                      }}
                    >
                      {/* Edge List button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdgeList(edge.id); }}
                        style={{
                          background: "#bd7c40",
                          border: "1px solid #d39a62",
                          borderRadius: 6,
                          padding: "4px 12px",
                          color: "#fff",
                          fontSize: 11,
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        <i className="iconfont icon-a-EdgeList" style={{ marginRight: 4, fontSize: 12 }} />
                        Edge List
                      </button>
                      {/* Style picker button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdgeStylePicker(edge.id); }}
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.14)",
                          borderRadius: 6,
                          width: 28,
                          height: 28,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                      >
                        <i className="iconfont icon-color" style={{ color: "#bd7c40", fontSize: 14 }} />
                      </button>
                      {/* Delete edge button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          useCWTrackerStore.getState().removeEdge(edge.id);
                        }}
                        style={{
                          background: "rgba(239,68,68,0.12)",
                          border: "1px solid rgba(239,68,68,0.25)",
                          borderRadius: 6,
                          width: 28,
                          height: 28,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                      >
                        <i className="iconfont icon-delete" style={{ color: "#ef4444", fontSize: 14 }} />
                      </button>
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          })}
        </g>

        {/* ── Nodes ── */}
        <g className="ms-nodes">
          {nodes.map((node) => (
            <NodeCard
              key={node.id}
              node={node}
              isHovered={localHoveredId === node.id}
              isHighlighted={highlightedIds.has(node.id)}
              isEdgeEndpointHighlighted={edgeEndpointIds.has(node.id)}
              displayOptions={displayOptions}
              onMouseEnter={() => handleNodeMouseEnter(node.id)}
              onMouseLeave={handleNodeMouseLeave}
              onClick={() => onNodeClick?.(node.id)}
              onDragStart={(e) => handleNodeDragStart(e, node.id)}
              onButtonsMouseEnter={handleButtonsMouseEnter}
              onButtonsMouseLeave={handleButtonsMouseLeave}
              onExpand={() => onNodeExpand?.(node.id)}
              onRemove={() => onNodeRemove?.(node.id)}
              onAnalyze={() => openFindRelationship(node.id)}
              onExpandLeft={() => expandNodeDirection(node.id, "left")}
              onExpandRight={() => expandNodeDirection(node.id, "right")}
              onOpenDetail={() => openNodeDetail(node.id)}
            />
          ))}
        </g>
      </g>
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */
/*  NodeCard — CWTracker-parity 285×75 card with iconfont icons        */
/* ══════════════════════════════════════════════════════════════════════ */

interface NodeCardProps {
  node: MSNode;
  isHovered: boolean;
  isHighlighted: boolean;
  isEdgeEndpointHighlighted: boolean;
  displayOptions: MSDisplayOptions;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
  onDragStart: (e: React.MouseEvent) => void;
  onButtonsMouseEnter: () => void;
  onButtonsMouseLeave: () => void;
  onExpand: () => void;
  onRemove: () => void;
  onAnalyze: () => void;
  onExpandLeft: () => void;
  onExpandRight: () => void;
  onOpenDetail: () => void;
}

const NodeCard = React.memo(function NodeCard({
  node,
  isHovered,
  isHighlighted,
  isEdgeEndpointHighlighted,
  displayOptions,
  onMouseEnter,
  onMouseLeave,
  onClick,
  onDragStart,
  onButtonsMouseEnter,
  onButtonsMouseLeave,
  onExpand,
  onRemove,
  onAnalyze,
  onExpandLeft,
  onExpandRight,
  onOpenDetail,
}: NodeCardProps) {
  const W = MS_NODE.width;   // 285
  const H = MS_NODE.height;  // 75
  const R = MS_NODE.cornerRadius; // 10
  const entityColor = getMSEntityColor(node.type);
  const riskColor = node.riskLevel ? getMSRiskColor(node.riskLevel) : undefined;
  const isActive = node.isSelected || isHovered || isHighlighted;

  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      className="ms-node cursor-pointer"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      onMouseDown={onDragStart}
      filter={isActive ? "url(#ms-node-glow)" : "url(#ms-node-shadow)"}
    >
      {/* ── INCOMING arrow (left side, 15×15) ── */}
      <g
        transform={`translate(${-32}, ${(H - MS_NODE.expandIconSize) / 2})`}
        className="cursor-pointer"
        onClick={(e) => { e.stopPropagation(); onExpandLeft(); }}
        opacity={isHovered ? 1 : 0.3}
        style={{ transition: "opacity 0.2s" }}
      >
        <rect
          width={MS_NODE.expandIconSize}
          height={MS_NODE.expandIconSize}
          rx={4}
          fill="rgba(20,184,166,0.2)"
          stroke="rgba(20,184,166,0.4)"
          strokeWidth={0.5}
        />
        {/* Left-pointing arrow (INCOMING) */}
        <path
          d={`M ${MS_NODE.expandIconSize - 4} 3 L 4 ${MS_NODE.expandIconSize / 2} L ${MS_NODE.expandIconSize - 4} ${MS_NODE.expandIconSize - 3}`}
          fill="none"
          stroke="#14b8a6"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* ── OUTGOING arrow (right side, 15×15) ── */}
      <g
        transform={`translate(${W + 9}, ${(H - MS_NODE.expandIconSize) / 2})`}
        className="cursor-pointer"
        onClick={(e) => { e.stopPropagation(); onExpandRight(); }}
        opacity={isHovered ? 1 : 0.3}
        style={{ transition: "opacity 0.2s" }}
      >
        <rect
          width={MS_NODE.expandIconSize}
          height={MS_NODE.expandIconSize}
          rx={4}
          fill="rgba(20,184,166,0.2)"
          stroke="rgba(20,184,166,0.4)"
          strokeWidth={0.5}
        />
        {/* Right-pointing arrow (OUTGOING) */}
        <path
          d={`M 4 3 L ${MS_NODE.expandIconSize - 4} ${MS_NODE.expandIconSize / 2} L 4 ${MS_NODE.expandIconSize - 3}`}
          fill="none"
          stroke="#14b8a6"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* ── Card background (285×75, rounded 10) ── */}
      <rect
        x={0}
        y={0}
        width={W}
        height={H}
        rx={R}
        ry={R}
        fill="rgba(31,33,36,0.95)"
        stroke={
          node.isSelected
            ? MS_COLORS.selectedBorder
            : isActive
            ? "rgba(189,124,64,0.72)"
            : "rgba(255,255,255,0.08)"
        }
        strokeWidth={node.isSelected ? 2 : 1}
        style={{ backdropFilter: "blur(12px)" }}
      />

      {/* ── Left color strip (4px, entity type) ── */}
      <rect
        x={0}
        y={0}
        width={4}
        height={H}
        rx={2}
        fill={node.bookColor || entityColor}
        opacity={0.8}
      />
      <rect x={4} y={0} width={3} height={H} fill="rgba(31,33,36,0.95)" />

      {isEdgeEndpointHighlighted && (
        <rect
          x={8}
          y={H - 4}
          width={W - 16}
          height={3}
          rx={2}
          fill="rgba(189,124,64,0.98)"
          opacity={0.95}
        />
      )}

      {/* ── Entity icon (iconfont via foreignObject 32×32) ── */}
      <foreignObject x={10} y={8} width={32} height={32}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: `${entityColor}22`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <i
            className={`iconfont ${getMSEntityIconClass(node.type)}`}
            style={{ fontSize: 18, color: entityColor }}
          />
        </div>
      </foreignObject>

      {/* ── Risk badge (if risk level known) ── */}
      {riskColor && node.riskLevel && node.riskLevel !== "unknown" && (
        <circle cx={36} cy={8} r={4} fill={riskColor} />
      )}

      {/* ── Chain badge (right side, 20×20) ── */}
      {displayOptions.showChainIcons && (
        <image
          href={getMSChainIconUrl(node.chain)}
          x={W - 28}
          y={8}
          width={20}
          height={20}
          clipPath="circle(10px at 10px 10px)"
        />
      )}

      {/* ── Labels ── */}
      {displayOptions.showLabels && (
        <>
          {/* Line 1: Entity label */}
          <text
            x={48}
            y={22}
            fill={MS_COLORS.textPrimary}
            fontSize={12}
            fontWeight={600}
            fontFamily="Inter, system-ui, sans-serif"
          >
            {node.label.length > 20
              ? node.label.slice(0, 20) + "…"
              : node.label}
          </text>

          {/* Line 2: Address (monospace) */}
          <text
            x={48}
            y={38}
            fill={MS_COLORS.textMuted}
            fontSize={10}
            fontFamily="'Menlo', 'Consolas', monospace"
          >
            {node.subLabel || msShortenAddress(node.address, 8)}
          </text>
        </>
      )}

      {/* ── Bottom row: flow stats ── */}
      <g transform={`translate(48, ${H - 18})`}>
        <text fill={MS_COLORS.success} fontSize={9} fontFamily="Inter, sans-serif">
          ▼ {msFormatValue(node.flowsIn)}
        </text>
        <text x={90} fill={MS_COLORS.error} fontSize={9} fontFamily="Inter, sans-serif">
          ▲ {msFormatValue(node.flowsOut)}
        </text>
        {displayOptions.showTxCount && (
          <text x={180} fill={MS_COLORS.textMuted} fontSize={8} fontFamily="Inter, sans-serif">
            {node.txCount} tx
          </text>
        )}
      </g>

      {/* ── Root indicator ── */}
      {node.isRoot && (
        <g>
          <rect
            x={W - 28}
            y={H - 20}
            width={20}
            height={14}
            rx={4}
            fill="rgba(20,184,166,0.2)"
            stroke="rgba(20,184,166,0.4)"
            strokeWidth={0.5}
          />
          <text
            x={W - 18}
            y={H - 13}
            fill={MS_COLORS.primaryLight}
            fontSize={8}
            fontWeight={700}
            textAnchor="middle"
            dominantBaseline="central"
          >
            ROOT
          </text>
        </g>
      )}

      {/* ── Contract badge ── */}
      {node.isContract && (
        <>
          <rect
            x={W - 52}
            y={H - 20}
            width={22}
            height={14}
            rx={3}
            fill="rgba(245,158,11,0.15)"
            stroke="rgba(245,158,11,0.3)"
            strokeWidth={0.5}
          />
          <text
            x={W - 41}
            y={H - 13}
            fill={MS_COLORS.warning}
            fontSize={7}
            textAnchor="middle"
            dominantBaseline="central"
          >
            SC
          </text>
        </>
      )}

      {/* ── Hover: action bar (229px wide, below node) ── */}
      {isHovered && (
        <foreignObject
          x={(W - MS_NODE.actionBarWidth) / 2}
          y={H + 6}
          width={MS_NODE.actionBarWidth}
          height={MS_NODE.actionBtnSize + 8}
          onMouseEnter={onButtonsMouseEnter}
          onMouseLeave={onButtonsMouseLeave}
        >
          <div
            style={{
              display: "flex",
              gap: 4,
              alignItems: "center",
              background: "rgba(26, 27, 31, 0.98)",
              borderRadius: 8,
              padding: "4px 8px",
              border: "1px solid rgba(189,124,64,0.25)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
              height: MS_NODE.actionBtnSize,
            }}
          >
            {/* Analyze button (main, wider) */}
            <button
              onClick={(e) => { e.stopPropagation(); onAnalyze(); }}
              style={{
                flex: 1,
                background: "#bd7c40",
                border: "1px solid #d39a62",
                borderRadius: 6,
                color: "#fff",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
              }}
            >
              <i className="iconfont icon-Analyze" style={{ fontSize: 13 }} />
              Analyze
            </button>
            {/* Edit button */}
            <button
              onClick={(e) => { e.stopPropagation(); onOpenDetail(); }}
              style={{
                width: MS_NODE.actionBtnSize,
                height: MS_NODE.actionBtnSize,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <i className="iconfont icon-edit" style={{ color: "#bd7c40", fontSize: 13 }} />
            </button>
            {/* Delete button */}
            {!node.isRoot && (
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                style={{
                  width: MS_NODE.actionBtnSize,
                  height: MS_NODE.actionBtnSize,
                  background: "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <i className="iconfont icon-delete" style={{ color: "#ef4444", fontSize: 13 }} />
              </button>
            )}
          </div>
        </foreignObject>
      )}

      {/* ── Loading spinner ── */}
      {node.isLoading && (
        <g transform={`translate(${W / 2}, ${H / 2})`}>
          <circle r={16} fill="rgba(0,0,0,0.5)" />
          <circle
            r={10}
            fill="none"
            stroke={MS_COLORS.primaryLight}
            strokeWidth={2}
            strokeDasharray="20 12"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0"
              to="360"
              dur="1s"
              repeatCount="indefinite"
            />
          </circle>
        </g>
      )}

      {/* ── Memo indicator ── */}
      {node.memo && (
        <g transform={`translate(${W - 14}, 2)`}>
          <circle r={4} fill={MS_COLORS.warning} opacity={0.8} />
          <text x={0} y={0} fill="white" fontSize={5} textAnchor="middle" dominantBaseline="central">
            M
          </text>
        </g>
      )}
    </g>
  );
});

/* ══════════════════════════════════════════════════════════════════════ */
/*  EdgeLabel — Token-colored label with [count] [time] amount TOKEN    */
/* ══════════════════════════════════════════════════════════════════════ */

function EdgeLabel({
  edge,
  path,
  displayOptions,
}: {
  edge: MSEdge;
  path: string;
  displayOptions: MSDisplayOptions;
}) {
  // Parse midpoint from path
  const parts = path.split(/[MCLQSZ ,]+/).filter(Boolean).map(Number);
  if (parts.length < 4) return null;

  const x1 = parts[0];
  const y1 = parts[1];
  const xN = parts[parts.length - 2];
  const yN = parts[parts.length - 1];
  const mx = (x1 + xN) / 2 + (edge.curveOffset ? edge.curveOffset * 0.3 : 0);
  const my = (y1 + yN) / 2 + (edge.curveOffset ? edge.curveOffset * 0.3 : 0);

  // Build CWTracker-style label: [count] [time] amount TOKEN
  const tokenColor = getMSTokenColor(edge.tokenSymbol);
  const pieces: string[] = [];
  if (edge.transferCount > 1) pieces.push(`[${edge.transferCount}]`);
  if (edge.latestTimestamp) {
    // Show short relative time
    const diff = Date.now() - new Date(edge.latestTimestamp).getTime();
    if (diff < 3600000) pieces.push(`${Math.round(diff / 60000)}m`);
    else if (diff < 86400000) pieces.push(`${Math.round(diff / 3600000)}h`);
    else pieces.push(`${Math.round(diff / 86400000)}d`);
  }
  if (edge.amountLabel) {
    pieces.push(edge.amountLabel);
  } else if (displayOptions.showValues && edge.valueLabel) {
    pieces.push(edge.valueLabel);
  }
  if (displayOptions.showTokens && edge.tokenSymbol) {
    pieces.push(edge.tokenSymbol);
  }
  const text = pieces.join(" ");
  if (!text) return null;

  const textW = text.length * 5.5 + 16;

  return (
    <g transform={`translate(${mx}, ${my})`} className="pointer-events-none">
      <rect
        x={-textW / 2}
        y={-9}
        width={textW}
        height={18}
        rx={5}
        fill="rgba(20,43,40,0.92)"
        stroke={`${tokenColor}44`}
        strokeWidth={0.5}
      />
      <text
        x={0}
        y={0}
        fill={tokenColor}
        fontSize={9}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="'Menlo', 'Consolas', monospace"
        fontWeight={500}
      >
        {text}
      </text>
    </g>
  );
}
