/**
 * TracerGraph — SVG-based graph canvas matching cways-tracker Tracer rendering
 *
 * Grid-based layout with:
 * - Rectangular nodes (280×70) with entity icons, labels, chain badges
 * - Straight lines + bezier curves for edges
 * - Hover buttons (expand, remove, add, visualize)
 * - Balance labels
 * - D3 zoom/pan with touch support
 *
 * Replaces D3GraphCanvas.tsx (force-directed circles)
 */

"use client";

import React, { useEffect, useRef, useCallback, useState } from "react";
import * as d3 from "d3";
import { useTracerStore } from "@/lib/onchain/tracer-store";
import {
  TRACER_CONSTANTS as C,
  TRACER_COLORS,
  ENTITY_TYPE_COLORS,
  shortenAddress,
  getEntityColor,
  type TraceNode,
  type TraceEdge,
} from "@/lib/onchain/tracer-types";

interface TracerGraphProps {
  onNodeClick?: (nodeId: string) => void;
  onEdgeClick?: (edgeId: string) => void;
  onNodeExpand?: (nodeId: string, direction: "in" | "out" | "both") => void;
  onNodeRemove?: (nodeId: string) => void;
  onNodeAdd?: (nodeId: string) => void;
  onNodeFixToggle?: (nodeId: string) => void;
  className?: string;
}

export function TracerGraph({
  onNodeClick,
  onEdgeClick,
  onNodeExpand,
  onNodeRemove,
  onNodeAdd,
  onNodeFixToggle,
  className,
}: TracerGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown>>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = React.useState({ width: 800, height: 600 });

  // Cache-safe selectors — avoid getSnapshot infinite loop
  const allNodes = useTracerStore((s) => s.nodes);
  const allEdges = useTracerStore((s) => s.edges);
  const filter = useTracerStore((s) => s.filter);
  const displayOptions = useTracerStore((s) => s.displayOptions);
  const selectedNodeId = useTracerStore((s) => s.selectedNodeId);
  const selectNode = useTracerStore((s) => s.selectNode);
  const hoverNode = useTracerStore((s) => s.hoverNode);
  const controlMode = useTracerStore((s) => s.controlMode);
  const fixedNodeIds = useTracerStore((s) => s.fixedNodeIds);

  // Local hover state with 2-second delay for buttons persistence
  const [localHoveredId, setLocalHoveredId] = useState<string | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleNodeHoverEnter = useCallback((nodeId: string) => {
    if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
    setLocalHoveredId(nodeId);
    hoverNode(nodeId);
  }, [hoverNode]);

  const handleNodeHoverLeave = useCallback(() => {
    // Delay hiding by 2 seconds so user can reach the buttons
    hoverTimerRef.current = setTimeout(() => {
      setLocalHoveredId(null);
      hoverNode(null);
      hoverTimerRef.current = null;
    }, 2000);
  }, [hoverNode]);

  const handleButtonsMouseEnter = useCallback(() => {
    // Cancel hide timer when mouse enters buttons
    if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
  }, []);

  const handleButtonsMouseLeave = useCallback(() => {
    // Start hide timer when mouse leaves buttons
    hoverTimerRef.current = setTimeout(() => {
      setLocalHoveredId(null);
      hoverNode(null);
      hoverTimerRef.current = null;
    }, 2000);
  }, [hoverNode]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => { if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current); };
  }, []);
  const setZoom = useTracerStore((s) => s.setZoom);
  const setPan = useTracerStore((s) => s.setPan);

  // Derive filtered nodes/edges with useMemo (stable references)
  const nodes = React.useMemo(() => {
    return allNodes.filter(node => {
      if (filter.chains.length > 0 && !filter.chains.includes(node.chain)) return false;
      if (filter.entityTypes.length > 0 && !filter.entityTypes.includes(node.type)) return false;
      if (filter.searchQuery) {
        const q = filter.searchQuery.toLowerCase();
        if (!node.label.toLowerCase().includes(q) &&
            !node.address.toLowerCase().includes(q) &&
            !(node.subLabel?.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [allNodes, filter]);

  const edges = React.useMemo(() => {
    const visibleIds = new Set(nodes.map(n => n.id));
    return allEdges.filter(edge => {
      if (!visibleIds.has(edge.source) || !visibleIds.has(edge.target)) return false;
      if (filter.chains.length > 0 && !filter.chains.includes(edge.chain)) return false;
      if (filter.direction !== 'both' && edge.direction !== filter.direction) return false;
      if (filter.minValue !== undefined && edge.totalValue < filter.minValue) return false;
      if (filter.maxValue !== undefined && edge.totalValue > filter.maxValue) return false;
      return true;
    });
  }, [allEdges, nodes, filter]);

  // Track root node id stably
  const rootNodeId = React.useMemo(() => nodes.find(n => n.isRoot)?.id ?? null, [nodes]);

  // Measure container size to give SVG explicit dimensions (fixes SVGLength error)
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      for (const e of entries) {
        setDims({ width: e.contentRect.width || 800, height: e.contentRect.height || 600 });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  /* ─── Initialize D3 zoom ─── */
  useEffect(() => {
    const svg = svgRef.current;
    const g = gRef.current;
    if (!svg || !g) return;

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([C.minZoom, C.maxZoom])
      .on("zoom", (event) => {
        d3.select(g).attr("transform", event.transform.toString());
        setZoom(event.transform.k);
        setPan(event.transform.x, event.transform.y);
      });

    d3.select(svg)
      .call(zoom)
      .call(zoom.transform, d3.zoomIdentity); // start at identity to avoid stale extent

    zoomRef.current = zoom;

    return () => {
      d3.select(svg).on(".zoom", null);
    };
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Center on root node when it first appears or changes ─── */
  useEffect(() => {
    if (!rootNodeId) return;
    const svg = svgRef.current;
    const zoom = zoomRef.current;
    if (!svg || !zoom) return;

    const rootNode = nodes.find((n) => n.id === rootNodeId);
    if (!rootNode) return;

    // Use dims from ResizeObserver for stable sizing
    const w = dims.width;
    const h = dims.height;
    if (w === 0 || h === 0) return;

    const transform = d3.zoomIdentity
      .translate(w / 2 - rootNode.x, h / 2 - rootNode.y)
      .scale(0.8);

    d3.select(svg)
      .transition()
      .duration(500)
      .call(zoom.transform, transform);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootNodeId, dims.width, dims.height]);

  /* ─── Handle node click ─── */
  const handleNodeClick = useCallback(
    (nodeId: string) => {
      if (controlMode === 'expand') {
        onNodeExpand?.(nodeId, 'both');
        return;
      }
      if (controlMode === 'add') {
        selectNode(nodeId);
        onNodeAdd?.(nodeId);
        return;
      }
      if (controlMode === 'remove') {
        onNodeRemove?.(nodeId);
        return;
      }
      if (controlMode === 'fix') {
        onNodeFixToggle?.(nodeId);
        return;
      }

      selectNode(nodeId);
      onNodeClick?.(nodeId);
    },
    [controlMode, selectNode, onNodeClick, onNodeExpand, onNodeAdd, onNodeRemove, onNodeFixToggle]
  );

  /* ─── Handle edge click ─── */
  const handleEdgeClick = useCallback(
    (edgeId: string) => {
      onEdgeClick?.(edgeId);
    },
    [onEdgeClick]
  );

  /* ─── Compute edge paths ─── */
  const edgePaths = computeEdgePaths(edges, nodes);

  return (
    <div ref={containerRef} className={`w-full h-full ${className || ""}`}>
    <svg
      ref={svgRef}
      id="tracer-graph-svg"
      width={dims.width}
      height={dims.height}
      viewBox={`0 0 ${dims.width} ${dims.height}`}
      style={{ background: "transparent", touchAction: "none", display: "block" }}
    >
      {/* Defs: arrow markers, filters */}
      <defs>
        <marker
          id="arrow-default"
          viewBox="0 0 10 10"
          refX="10"
          refY="5"
          markerWidth="8"
          markerHeight="8"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={TRACER_COLORS.edgeLine} />
        </marker>
        <marker
          id="arrow-positive"
          viewBox="0 0 10 10"
          refX="10"
          refY="5"
          markerWidth="8"
          markerHeight="8"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={TRACER_COLORS.edgePositive} />
        </marker>
        <marker
          id="arrow-negative"
          viewBox="0 0 10 10"
          refX="10"
          refY="5"
          markerWidth="8"
          markerHeight="8"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={TRACER_COLORS.edgeNegative} />
        </marker>

        {/* White glow filter for selected nodes */}
        <filter id="glow-selected" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feFlood floodColor="rgba(255,255,255,0.3)" result="whiteGlow" />
          <feComposite in="whiteGlow" in2="coloredBlur" operator="in" result="softGlow" />
          <feMerge>
            <feMergeNode in="softGlow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Shadow for nodes */}
        <filter id="node-shadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
        </filter>
      </defs>

      <g ref={gRef}>
        {/* ═════ Layer 1: Edges ═════ */}
        <g className="edges-layer">
          {edgePaths.map((ep) => (
            <g key={ep.edge.id} className="edge-group">
              {/* Edge path */}
              <path
                d={ep.path}
                fill="none"
                stroke={ep.edge.color || TRACER_COLORS.edgeLine}
                strokeWidth={
                  displayOptions.edgeThickness === "proportional"
                    ? Math.max(1, Math.min(6, Math.log10(ep.edge.totalValue + 1)))
                    : 1.5
                }
                strokeOpacity={ep.edge.isHighlighted ? 1 : 0.6}
                markerEnd={
                  displayOptions.showArrows
                    ? ep.edge.direction === "in"
                      ? "url(#arrow-positive)"
                      : "url(#arrow-negative)"
                    : undefined
                }
                className="cursor-pointer hover:stroke-opacity-100 transition-all"
                onClick={() => handleEdgeClick(ep.edge.id)}
              />

              {/* Edge value label — format: $value (count) */}
              {displayOptions.showValues && ep.edge.valueLabel && (
                <text
                  x={ep.midX}
                  y={ep.midY - 8}
                  textAnchor="middle"
                  fill={TRACER_COLORS.textSecondary}
                  fontSize={C.edgeLabelFontSize}
                  fontFamily="'IBM Plex Mono', monospace"
                  className="pointer-events-none select-none"
                >
                  {ep.edge.valueLabel}{ep.edge.transferCount > 1 ? ` (${ep.edge.transferCount})` : ''}
                </text>
              )}

              {/* Token label */}
              {displayOptions.showTokens && ep.edge.tokenSymbol && (
                <text
                  x={ep.midX}
                  y={ep.midY + 10}
                  textAnchor="middle"
                  fill={TRACER_COLORS.textMuted}
                  fontSize={C.edgeLabelFontSize - 2}
                  fontFamily="'IBM Plex Mono', monospace"
                  className="pointer-events-none select-none"
                >
                  {ep.edge.tokenSymbol}
                </text>
              )}
            </g>
          ))}
        </g>

        {/* ═════ Layer 2: Nodes ═════ */}
        <g className="nodes-layer">
          {nodes.map((node) => (
            <NodeRect
              key={node.id}
              node={node}
              isSelected={selectedNodeId === node.id}
              isHovered={localHoveredId === node.id}
              isFixed={fixedNodeIds.includes(node.id)}
              displayOptions={displayOptions}
              cursor={controlMode === 'expand'
                ? (node.isExpanded ? 'zoom-out' : 'zoom-in')
                : controlMode === 'remove'
                ? 'not-allowed'
                : controlMode === 'fix'
                ? (fixedNodeIds.includes(node.id) ? 'alias' : 'cell')
                : controlMode === 'add'
                ? 'copy'
                : 'pointer'}
              onClick={() => handleNodeClick(node.id)}
              onMouseEnter={() => handleNodeHoverEnter(node.id)}
              onMouseLeave={handleNodeHoverLeave}
            />
          ))}
        </g>

        {/* ═════ Layer 3: Hover Buttons ═════ */}
        {localHoveredId && nodes.find((n) => n.id === localHoveredId) && (
          <HoverButtons
            node={nodes.find((n) => n.id === localHoveredId)!}
            onExpand={(dir) => onNodeExpand?.(localHoveredId, dir)}
            onRemove={() => onNodeRemove?.(localHoveredId)}
            onMouseEnter={handleButtonsMouseEnter}
            onMouseLeave={handleButtonsMouseLeave}
          />
        )}

        {/* ═════ Layer 4: Balance labels now rendered inside NodeRect ═════ */}
      </g>
    </svg>
    </div>
  );
}

/* ═══════════════════ NodeRect Component (CW-Style Design) ═══════════════════ */
/*
 * Layout: [Entity Icon (48px circle)] [Name / Address / $Balance] [Chain Icon]
 * Icon on LEFT, text in middle, chain badge top-right
 * Fallback: colored circle with first letter when no icon
 */

function NodeRect({
  node,
  isSelected,
  isHovered,
  isFixed,
  displayOptions,
  cursor,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: {
  node: TraceNode;
  isSelected: boolean;
  isHovered: boolean;
  isFixed: boolean;
  displayOptions: { showLabels: boolean; showChainIcons: boolean };
  cursor: string;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const [iconFailed, setIconFailed] = React.useState(false);
  const entityColor = getEntityColor(node.type);
  const borderColor = isSelected
    ? TRACER_COLORS.borderSelected
    : isHovered
    ? 'rgba(148,163,184,0.35)'
    : 'rgba(148,163,184,0.18)';
  const bgColor = isSelected
    ? TRACER_COLORS.bgNodeSelected
    : isHovered
    ? TRACER_COLORS.bgNodeHover
    : TRACER_COLORS.bgNode;

  // Entity icon — LEFT side, vertically centered, 48×48 circular
  const iconSize = 48;
  const iconPad = 14;
  const iconX = node.x + iconPad;
  const iconCenterY = node.y + C.nodeHeight / 2;
  const iconY = iconCenterY - iconSize / 2;
  const hasIcon = node.iconUrl && !iconFailed;

  // Text starts after the icon
  const textPadX = node.x + iconPad + iconSize + 12;
  const maxTextWidth = C.nodeWidth - iconPad - iconSize - 12 - (C.chainIconSize + 10) - 4;

  const safeId = node.id.replace(/[^a-zA-Z0-9]/g, '_');
  const textClipId = `clip-text-${safeId}`;
  const iconClipId = `clip-eicon-${safeId}`;

  // Display name: entity name if known, otherwise "Unknown"
  const isAddressLabel = node.label === shortenAddress(node.address) || node.label === shortenAddress(node.address, 6);
  const displayName = isAddressLabel ? 'Unknown' : node.label;
  const fallbackLetter = (displayName.charAt(0) || '?').toUpperCase();

  return (
    <g
      className="node-group"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ cursor }}
      filter={isSelected ? "url(#glow-selected)" : undefined}
    >
      {/* Clip paths */}
      <defs>
        <clipPath id={textClipId}>
          <rect x={textPadX} y={node.y} width={maxTextWidth} height={C.nodeHeight} />
        </clipPath>
        <clipPath id={iconClipId}>
          <circle cx={iconX + iconSize / 2} cy={iconCenterY} r={iconSize / 2} />
        </clipPath>
      </defs>

      {/* Dark glass background rectangle */}
      <rect
        x={node.x}
        y={node.y}
        width={C.nodeWidth}
        height={C.nodeHeight}
        rx={C.cornerRadius}
        ry={C.cornerRadius}
        fill={bgColor}
        stroke={borderColor}
        strokeWidth={isSelected ? 2 : 1}
        className="transition-all duration-150"
      />
      {/* Selected glow overlay */}
      {isSelected && (
        <rect
          x={node.x + 1}
          y={node.y + 1}
          width={C.nodeWidth - 2}
          height={C.nodeHeight - 2}
          rx={C.cornerRadius - 1}
          ry={C.cornerRadius - 1}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={1}
          className="pointer-events-none"
        />
      )}

      {/* ── Entity Icon (LEFT, circular) ── */}
      {/* Ring border around icon */}
      <circle
        cx={iconX + iconSize / 2}
        cy={iconCenterY}
        r={iconSize / 2 + 2}
        fill="none"
        stroke={entityColor}
        strokeWidth={2}
        strokeOpacity={0.6}
        className="pointer-events-none"
      />

      {hasIcon ? (
        /* Real entity icon image */
        <image
          href={node.iconUrl!}
          x={iconX}
          y={iconY}
          width={iconSize}
          height={iconSize}
          clipPath={`url(#${iconClipId})`}
          className="pointer-events-none"
          preserveAspectRatio="xMidYMid slice"
          onError={() => setIconFailed(true)}
        />
      ) : (
        /* Fallback: colored circle with first letter */
        <>
          <circle
            cx={iconX + iconSize / 2}
            cy={iconCenterY}
            r={iconSize / 2}
            fill={entityColor}
            fillOpacity={0.2}
            className="pointer-events-none"
          />
          <text
            x={iconX + iconSize / 2}
            y={iconCenterY + 1}
            textAnchor="middle"
            dominantBaseline="central"
            fill={entityColor}
            fontSize={20}
            fontFamily="'IBM Plex Mono', monospace"
            fontWeight="700"
            className="pointer-events-none select-none"
          >
            {fallbackLetter}
          </text>
        </>
      )}

      {/* ── Text content (name, address, balance) ── */}
      {displayOptions.showLabels && (
        <g clipPath={`url(#${textClipId})`}>
          {/* Entity Name / "Unknown" */}
          <text
            x={textPadX}
            y={node.y + 26}
            fill={TRACER_COLORS.textPrimary}
            fontSize={C.nodeLabelFontSize}
            fontFamily="'IBM Plex Mono', monospace"
            fontWeight="600"
            className="pointer-events-none select-none"
          >
            {truncateText(displayName, 20)}
          </text>

          {/* Shortened Address */}
          <text
            x={textPadX}
            y={node.y + 44}
            fill={TRACER_COLORS.textMuted}
            fontSize={C.nodeSubLabelFontSize}
            fontFamily="'IBM Plex Mono', monospace"
            className="pointer-events-none select-none"
            dir="ltr"
          >
            {shortenAddress(node.address, 6)}
          </text>

          {/* Balance in USD */}
          {node.balance && (
            <text
              x={textPadX}
              y={node.y + 62}
              fill="#22c55e"
              fontSize={C.nodeSubLabelFontSize + 1}
              fontFamily="'IBM Plex Mono', monospace"
              fontWeight="600"
              className="pointer-events-none select-none"
            >
              {node.balance.formatted}
            </text>
          )}
        </g>
      )}

      {/* Chain icon (top-right corner) */}
      {displayOptions.showChainIcons && node.chainIconUrl && (
        <image
          href={node.chainIconUrl}
          x={node.x + C.nodeWidth - C.chainIconSize - 6}
          y={node.y + 6}
          width={C.chainIconSize}
          height={C.chainIconSize}
          className="pointer-events-none"
          preserveAspectRatio="xMidYMid slice"
        />
      )}

      {/* Loading spinner */}
      {node.isLoading && (
        <circle
          cx={node.x + C.nodeWidth - 14}
          cy={node.y + C.nodeHeight - 14}
          r={6}
          fill="none"
          stroke={TRACER_COLORS.textLink}
          strokeWidth={2}
          strokeDasharray="12 6"
          className="animate-spin"
          style={{ transformOrigin: `${node.x + C.nodeWidth - 14}px ${node.y + C.nodeHeight - 14}px` }}
        />
      )}

      {/* Root indicator dot */}
      {node.isRoot && (
        <circle
          cx={node.x + C.nodeWidth - 8}
          cy={node.y + C.nodeHeight - 8}
          r={4}
          fill={TRACER_COLORS.borderSelected}
        />
      )}

      {/* Fixed indicator */}
      {isFixed && (
        <image
          href="/icons/tracer/lockIconWhite.svg"
          x={node.x + 6}
          y={node.y + C.nodeHeight - 18}
          width={12}
          height={12}
          className="pointer-events-none"
          preserveAspectRatio="xMidYMid meet"
        />
      )}
    </g>
  );
}

/* ═══════════════════ Hover Buttons (Below Node) ═══════════════════ */

function HoverButtons({
  node,
  onExpand,
  onRemove,
  onMouseEnter,
  onMouseLeave,
}: {
  node: TraceNode;
  onExpand: (dir: "in" | "out" | "both") => void;
  onRemove: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  if (!node) return null;

  const btnSize = C.hoverButtonSize;
  const gap = C.hoverButtonGap;

  const buttons = [
    {
      icon: "/icons/tracer/expandIcon.svg",
      label: "Expand Both",
      onClick: () => onExpand("both"),
    },
    {
      icon: "/icons/tracer/addIcon.svg",
      label: "Expand In",
      onClick: () => onExpand("in"),
    },
    {
      icon: "/icons/tracer/visualizeIcon.svg",
      label: "Expand Out",
      onClick: () => onExpand("out"),
    },
    {
      icon: "/icons/tracer/removeIcon.svg",
      label: "Remove",
      onClick: onRemove,
    },
  ];

  const totalWidth = buttons.length * btnSize + (buttons.length - 1) * gap;
  const startX = node.x + (C.nodeWidth - totalWidth) / 2;
  const startY = node.y + C.nodeHeight + 6;

  return (
    <g className="hover-buttons" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {/* Invisible bridge rect from node bottom to buttons — prevents gap mouseout */}
      <rect
        x={node.x}
        y={node.y + C.nodeHeight}
        width={C.nodeWidth}
        height={6 + btnSize}
        fill="transparent"
        className="pointer-events-auto"
      />
      {buttons.map((btn, i) => {
        const x = startX + i * (btnSize + gap);
        return (
          <g
            key={btn.label}
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              btn.onClick();
            }}
          >
            <rect
              x={x}
              y={startY}
              width={btnSize}
              height={btnSize}
              rx={8}
              fill="rgba(30,41,59,0.85)"
              stroke="rgba(148,163,184,0.25)"
              strokeWidth={1}
              className="hover:fill-slate-600 transition-colors"
            />
            <image
              href={btn.icon}
              x={x + 5}
              y={startY + 5}
              width={btnSize - 10}
              height={btnSize - 10}
              className="pointer-events-none"
              preserveAspectRatio="xMidYMid meet"
            />
            <title>{btn.label}</title>
          </g>
        );
      })}
    </g>
  );
}

/* ═══════════════════ Edge Path Computation ═══════════════════ */

interface EdgePath {
  edge: TraceEdge;
  path: string;
  midX: number;
  midY: number;
}

function computeEdgePaths(edges: TraceEdge[], nodes: TraceNode[]): EdgePath[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return edges.map((edge) => {
    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);

    if (!source || !target) {
      return { edge, path: "", midX: 0, midY: 0 };
    }

    // Source attachment: right center of source node
    const sx = source.x + C.nodeWidth;
    const sy = source.y + C.nodeHeight / 2;

    // Target attachment: left center of target node
    const tx = target.x;
    const ty = target.y + C.nodeHeight / 2;

    let path: string;
    let midX: number;
    let midY: number;

    if (edge.isCurve) {
      // Bezier curve for parallel edges
      const offset = edge.curveOffset * 40;
      const cpx1 = sx + (tx - sx) * 0.3;
      const cpy1 = sy + offset;
      const cpx2 = sx + (tx - sx) * 0.7;
      const cpy2 = ty + offset;

      path = `M ${sx} ${sy} C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${tx} ${ty}`;
      midX = (sx + tx) / 2;
      midY = (sy + ty) / 2 + offset * 0.5;
    } else {
      // Straight line (or slight curve to avoid overlap)
      if (Math.abs(sy - ty) < 5) {
        // Horizontal — straight line
        path = `M ${sx} ${sy} L ${tx} ${ty}`;
      } else {
        // Slight S-curve
        const cpx1 = sx + (tx - sx) * 0.4;
        const cpx2 = sx + (tx - sx) * 0.6;
        path = `M ${sx} ${sy} C ${cpx1} ${sy}, ${cpx2} ${ty}, ${tx} ${ty}`;
      }
      midX = (sx + tx) / 2;
      midY = (sy + ty) / 2;
    }

    return { edge, path, midX, midY };
  });
}

/* ═══════════════════ Helpers ═══════════════════ */

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + "…";
}

export default TracerGraph;
