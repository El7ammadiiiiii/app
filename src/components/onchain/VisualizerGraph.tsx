/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  VisualizerGraph — ForceGraph2D Canvas Renderer                 ║
 * ║  Entity Mode: directional forces (inflow left / outflow right)  ║
 * ║  Token Mode: balance-weighted forces + variable node size       ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { forceX, forceY, forceManyBody, forceLink } from 'd3-force';
import { useVisualizerStore } from '@/lib/onchain/visualizer-store';
import {
  VIZ_CANVAS,
  VIZ_FORCES,
  ENTITY_TYPE_COLORS,
  buildNodes,
  buildLinks,
  calcLinkWidth,
  countFlows,
  getLinkColor,
  formatLinkLabel,
  formatNodeLabel,
  extractAddressesAndEntities,
  computeVisibility,
  tokenNodeVal,
  getEntityType,
  type VizNode,
  type VizLink,
  type GraphData,
  type Transfer,
  type TokenHolder,
  type ControlMode,
  type AddressObj,
  type EntityObj,
} from '@/lib/onchain/visualizer-types';

/* ─── Dynamic import: ForceGraph2D only works in browser ─── */
const ForceGraph2D = dynamic(() => import('react-force-graph-2d').then((m) => m.default), {
  ssr: false,
});

/* ═══════════════════════ Canvas Node Image Cache ═══════════════ */

const imageCache = new Map<string, Promise<HTMLCanvasElement>>();

/** Load entity image into circular canvas */
async function loadEntityImage(entityId: string): Promise<HTMLCanvasElement> {
  if (entityId === '') throw new Error('No entity ID');

  const canvas = document.createElement('canvas');
  canvas.width = VIZ_CANVAS.size;
  canvas.height = VIZ_CANVAS.size;
  const ctx = canvas.getContext('2d')!;
  ctx.lineWidth = VIZ_CANVAS.lineWidth;

  // Dark circle background
  ctx.fillStyle = '#2C2F37';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2, 0, 2 * Math.PI, true);
  ctx.fill();

  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    img.src = `/api/onchain/entity-icon/${entityId}`;
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      // Clip to circle
      ctx.fillStyle = '#fff';
      ctx.globalCompositeOperation = 'destination-in';
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2, 0, 2 * Math.PI, true);
      ctx.fill();
      ctx.closePath();
      resolve(canvas);
    };
    img.onerror = () => reject(new Error('Image not found'));
  });
}

/** Render full node canvas (image or text fallback, badges, selection ring) */
async function renderNodeCanvas(
  nodeId: string,
  isBase: boolean,
  isFixed: boolean,
  addresses: Map<string, AddressObj>,
  entities: Map<string, EntityObj>,
): Promise<HTMLCanvasElement> {
  const cacheKey = `${nodeId}-${isBase}-${isFixed}`;
  if (imageCache.has(cacheKey)) return imageCache.get(cacheKey)!;

  const promise = (async () => {
    const canvas = document.createElement('canvas');
    canvas.width = VIZ_CANVAS.size;
    canvas.height = VIZ_CANVAS.size;
    const ctx = canvas.getContext('2d')!;
    ctx.lineWidth = VIZ_CANVAS.lineWidth;

    const addr = addresses.get(nodeId);
    const entity = entities.get(nodeId);

    // Try to load entity image
    try {
      const eid = entity?.id ?? addr?.knownEntity?.id ?? addr?.userEntity?.id;
      if (!eid) throw new Error('No entity');
      const imgCanvas = await loadEntityImage(eid);
      ctx.drawImage(
        imgCanvas,
        ctx.lineWidth,
        ctx.lineWidth,
        canvas.width - 2 * ctx.lineWidth,
        canvas.height - 2 * ctx.lineWidth,
      );
    } catch {
      // Text fallback
      let label = nodeId;
      if (addr) {
        const ent = addr.knownEntity ?? addr.userEntity;
        label = ent?.name ?? nodeId;
      } else if (entity) {
        label = entity.name;
      }

      ctx.fillStyle = '#2C2F37';
      ctx.arc(
        canvas.width / 2,
        canvas.height / 2,
        canvas.width / 2 - ctx.lineWidth,
        0,
        2 * Math.PI,
        true,
      );
      ctx.fill();

      ctx.fillStyle = 'white';
      ctx.font = `${VIZ_CANVAS.fallbackFontSize}px "IBM Plex Mono", monospace`;
      ctx.textAlign = 'center';
      const displayText =
        label.length > VIZ_CANVAS.maxLabelChars
          ? `${label.slice(0, VIZ_CANVAS.maxLabelChars - 1)}…`
          : label;
      ctx.fillText(
        displayText,
        canvas.width / 2,
        canvas.height / 2 + VIZ_CANVAS.fallbackFontSize / 4,
      );
    }

    // Selection ring for base nodes
    if (isBase) {
      ctx.strokeStyle = '#14b8a6'; // teal accent
      ctx.beginPath();
      ctx.fillStyle = 'transparent';
      ctx.arc(
        canvas.width / 2,
        canvas.height / 2,
        canvas.width / 2 - ctx.lineWidth / 2,
        0,
        2 * Math.PI,
      );
      ctx.stroke();
      ctx.closePath();
    }

    // Entity type badge (PI/4 position)
    const entityType = getEntityType(nodeId, addresses, entities);
    const color = ENTITY_TYPE_COLORS[entityType];
    if (color) {
      const badgeRadius = (canvas.width / 2) * 0.25;
      const angle = Math.PI / 4;
      const cx = canvas.width / 2 + (canvas.width / 2) * Math.cos(angle);
      const cy = canvas.height / 2 + (canvas.height / 2) * Math.sin(angle);

      ctx.beginPath();
      ctx.strokeStyle = 'black';
      ctx.fillStyle = color;
      ctx.arc(cx, cy, badgeRadius, 0, 2 * Math.PI, true);
      ctx.fill();
      ctx.stroke();
      ctx.closePath();
    }

    // Lock icon for fixed nodes (5π/4 position)
    if (isFixed) {
      const badgeRadius = (canvas.width / 2) * 0.25;
      const angle = (5 / 4) * Math.PI;
      const lockX = canvas.width / 2 + (canvas.width / 2) * Math.cos(angle) - badgeRadius;
      const lockY = canvas.height / 2 + (canvas.height / 2) * Math.sin(angle) - badgeRadius;

      // Draw a simple lock indicator
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.beginPath();
      ctx.arc(
        lockX + badgeRadius,
        lockY + badgeRadius,
        badgeRadius,
        0,
        2 * Math.PI,
      );
      ctx.fill();
      ctx.stroke();
      ctx.closePath();

      // Lock symbol
      ctx.fillStyle = '#000';
      ctx.font = `${badgeRadius * 1.4}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('🔒', lockX + badgeRadius, lockY + badgeRadius + badgeRadius * 0.4);
    }

    return canvas;
  })();

  imageCache.set(cacheKey, promise);
  return promise;
}

/* ═══════════════════════ Props ══════════════════════════════════ */

/** Stable empty array to prevent re-render loops when holders prop is omitted */
const EMPTY_HOLDERS: TokenHolder[] = [];

interface VisualizerGraphProps {
  /** 'entity' or 'token' */
  graphMode: 'entity' | 'token';
  /** Raw transfers from API */
  transfers: Transfer[];
  /** Token holders (token mode only) */
  holders?: TokenHolder[];
  /** Container width */
  width: number;
  /** Container height */
  height: number;
}

/* ═══════════════════════ Component ══════════════════════════════ */

export default function VisualizerGraph({
  graphMode,
  transfers,
  holders = EMPTY_HOLDERS,
  width,
  height,
}: VisualizerGraphProps) {
  const graphRef = useRef<any>(null);

  const {
    controlMode,
    entityState,
    setEntityState,
    tokenState,
    setTokenState,
    hiddenTypes,
    expanded,
    toggleExpanded,
    fixNode,
    unfixNode,
    freezeAll,
    unfreezeAll,
    setInfoObject,
    graphData,
    setGraphData,
  } = useVisualizerStore();

  const base = graphMode === 'entity' ? entityState.base : (tokenState.filter.base ?? []);
  const manuallyFixed =
    graphMode === 'entity' ? entityState.manuallyFixed : tokenState.manuallyFixed;

  /* ── Extract addresses & entities ── */
  const { addresses, entities } = useMemo(
    () => extractAddressesAndEntities(transfers, holders),
    [transfers, holders],
  );

  /* ── Build graph data (single effect, merges fixed positions when available) ── */
  const prevGraphRef = useRef<GraphData>({ nodes: [], links: [] });

  useEffect(() => {
    if (!transfers || transfers.length === 0) {
      setGraphData({ nodes: [], links: [] });
      prevGraphRef.current = { nodes: [], links: [] };
      return;
    }

    // Preserve fixed positions from previous graph
    const fixedPositions: Record<string, { fx: number; fy: number }> = { ...manuallyFixed };
    prevGraphRef.current.nodes.forEach((n) => {
      if (n.id && n.fx != null && n.fy != null && !fixedPositions[n.id]) {
        fixedPositions[n.id] = { fx: n.fx, fy: n.fy };
      }
    });

    const nodes = buildNodes(transfers, holders, expanded, fixedPositions, base);
    const links = buildLinks(transfers, base, expanded, addresses);
    const data = { nodes, links };
    prevGraphRef.current = data;
    setGraphData(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transfers, base, holders, expanded]);

  /* ── Initial zoom ── */
  useEffect(() => {
    graphRef.current?.zoom(VIZ_CANVAS.initialZoom);
  }, [!!graphRef.current]);

  /* ── Entity mode forces ── */
  useEffect(() => {
    if (graphMode !== 'entity' || !graphRef.current) return;
    const fg = graphRef.current;

    fg.d3Force('center', null);
    fg.d3Force(
      'centerX',
      forceX<VizNode>(0).strength((n) => (n.id && n.isBase ? VIZ_FORCES.baseCenterStrength : 0)),
    );
    fg.d3Force(
      'centerY',
      forceY<VizNode>(0).strength((n) => (n.id && n.isBase ? VIZ_FORCES.baseCenterStrength : 0)),
    );
    fg.d3Force(
      'inflowLeft',
      forceX<VizNode>(VIZ_FORCES.inflowX).strength((n) => {
        if (!n.id || n.isBase) return 0;
        const { inflow, outflow } = countFlows(n, graphData.links);
        if (inflow === 0 && outflow === 0) return 0;
        return inflow > outflow
          ? 0
          : VIZ_FORCES.flowStrength * (outflow / (inflow + outflow));
      }),
    );
    fg.d3Force(
      'outflowRight',
      forceX<VizNode>(VIZ_FORCES.outflowX).strength((n) => {
        if (!n.id || n.isBase) return 0;
        const { inflow, outflow } = countFlows(n, graphData.links);
        return outflow > inflow
          ? 0
          : VIZ_FORCES.flowStrength * (inflow / (inflow + outflow));
      }),
    );
  }, [graphRef.current, graphData.nodes, width, height]);

  /* ── Token mode forces ── */
  const holdersMap = useMemo(() => {
    if (graphMode !== 'token') return {};
    const map: Record<string, { balance: number; usd: number }> = {};
    holders.forEach((h) => {
      const entity = h.address.userEntity ?? h.address.knownEntity;
      if (entity) {
        const id = entity.id;
        if (map[id]) {
          map[id] = { balance: map[id].balance + h.balance, usd: map[id].usd + h.usd };
        } else {
          map[id] = { balance: h.balance, usd: h.usd };
        }
      }
      const addr = h.address.address;
      if (map[addr]) {
        map[addr] = { balance: map[addr].balance + h.balance, usd: map[addr].usd + h.usd };
      } else {
        map[addr] = h;
      }
    });
    return map;
  }, [holders, graphData.nodes]);

  const totalBalance = useMemo(
    () => holders.reduce((sum, h) => sum + h.balance, 0),
    [holders],
  );

  useEffect(() => {
    if (graphMode !== 'token' || !graphRef.current) return;
    const fg = graphRef.current;

    fg.d3Force('center', null);
    fg.d3Force(
      'centerX',
      forceX<VizNode>(0).strength((n) => {
        const bal = holdersMap[n.id]?.balance ?? 0;
        return (VIZ_FORCES.tokenCenterMultiplier * (bal / (totalBalance || 1)) + 1) * VIZ_FORCES.tokenCenterBase;
      }),
    );
    fg.d3Force(
      'centerY',
      forceY<VizNode>(0).strength((n) => {
        const bal = holdersMap[n.id]?.balance ?? 0;
        return (VIZ_FORCES.tokenCenterMultiplier * (bal / (totalBalance || 1)) + 1) * VIZ_FORCES.tokenCenterBase;
      }),
    );
    fg.d3Force(
      'charge',
      forceManyBody<VizNode>().strength((n) => {
        const bal = holdersMap[n.id]?.balance ?? 0;
        return -((VIZ_FORCES.tokenChargeMultiplier * (bal / (totalBalance || 1)) + 1) * VIZ_FORCES.tokenChargeBase);
      }),
    );
    fg.d3Force('link', forceLink().strength(VIZ_FORCES.linkStrength));
  }, [graphData.nodes, holdersMap, totalBalance]);

  /* ── Node visibility ── */
  const visibility = useMemo(
    () => computeVisibility(graphData.nodes, hiddenTypes, addresses, entities),
    [graphData.nodes, hiddenTypes, addresses, entities],
  );

  /* ── Node click handler ── */
  const handleNodeClick = useCallback(
    (node: VizNode) => {
      if (!node.id) return;
      const isBase = node.isBase;

      if (graphMode === 'entity') {
        switch (controlMode) {
          case 'expand':
            freezeAll(graphData.nodes);
            toggleExpanded(node.id);
            break;
          case 'add':
            freezeAll(graphData.nodes);
            if (isBase) {
              setEntityState({
                ...entityState,
                base: entityState.base.filter((b) => b !== node.id),
              });
            } else {
              setEntityState({
                ...entityState,
                base: [...entityState.base, node.id],
              });
            }
            break;
          case 'remove':
            setEntityState({
              ...entityState,
              base: [...entityState.base, `!${node.id}`],
            });
            break;
          case 'fix':
            if (manuallyFixed[node.id]) {
              unfixNode(node);
            } else {
              fixNode(node);
            }
            break;
          default:
            if (isBase) {
              // Navigate to entity/address explorer
            } else {
              setEntityState({
                ...entityState,
                base: [node.id],
                manuallyFixed: {},
              });
            }
        }
      } else {
        // Token mode
        switch (controlMode) {
          case 'expand':
            toggleExpanded(node.id);
            break;
          case 'fix':
            if (manuallyFixed[node.id]) {
              unfixNode(node);
            } else {
              fixNode(node);
            }
            break;
          default: {
            // Show holder info
            const addrObj = addresses.get(node.id);
            const entityObj = entities.get(node.id);
            const holder = holdersMap[node.id];
            if (holder) {
              setInfoObject({
                holder: { address: addrObj ?? { address: node.id }, ...holder },
                addresses: addrObj ? [addrObj.address] : [],
              });
            } else if (addrObj) {
              setInfoObject({
                holder: { address: addrObj, balance: 0, usd: 0 },
                addresses: [addrObj.address],
              });
            }
          }
        }
      }
    },
    [controlMode, graphMode, entityState, manuallyFixed, graphData.nodes],
  );

  /* ── Render ── */
  if (typeof window === 'undefined') return null;

  return (
    <div className="absolute inset-0 w-full h-full">
      {/* Loading overlay */}
      {graphData.nodes.length === 0 && transfers.length > 0 && (
        <div className="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-teal-400/40 border-t-teal-400 rounded-full animate-spin" />
            <span className="text-sm text-white/60 font-mono">Building graph…</span>
          </div>
        </div>
      )}

      <ForceGraph2D
        ref={graphRef}
        width={width}
        height={height}
        backgroundColor="transparent"
        graphData={graphData}
        /* ── Node rendering ── */
        nodeCanvasObject={async (node: any, ctx: CanvasRenderingContext2D) => {
          if (
            !node ||
            typeof node.id !== 'string' ||
            typeof node.x !== 'number' ||
            typeof node.y !== 'number'
          )
            return;

          const isFixed = !!manuallyFixed[node.id];
          try {
            const canvas = await renderNodeCanvas(
              node.id,
              node.isBase ?? false,
              isFixed,
              addresses,
              entities,
            );

            if (graphMode === 'token') {
              const val = tokenNodeVal(node, holdersMap, totalBalance);
              const size = 2 * Math.sqrt(val);
              ctx.drawImage(canvas, node.x - size / 2, node.y - size / 2, size, size);
            } else {
              ctx.drawImage(
                canvas,
                node.x - VIZ_CANVAS.nodeSize / 2,
                node.y - VIZ_CANVAS.nodeSize / 2,
                VIZ_CANVAS.nodeSize,
                VIZ_CANVAS.nodeSize,
              );
            }
          } catch {
            // Fallback: simple circle
            ctx.fillStyle = '#2C2F37';
            ctx.beginPath();
            ctx.arc(node.x, node.y, VIZ_CANVAS.nodeSize / 2, 0, 2 * Math.PI);
            ctx.fill();
          }
        }}
        nodeLabel={(node: any) => formatNodeLabel(node.id, addresses, entities)}
        nodeVisibility={(node: any) => visibility[node.id] !== false}
        /* ── Token mode sizing ── */
        {...(graphMode === 'token'
          ? {
              nodeRelSize: 1,
              nodeVal: (node: any) => tokenNodeVal(node, holdersMap, totalBalance),
              d3AlphaDecay: VIZ_CANVAS.alphaDecay,
            }
          : {})}
        /* ── Links ── */
        linkCurvature="curvature"
        linkColor={(link: any) => getLinkColor(link)}
        linkWidth={(link: any) => calcLinkWidth(link)}
        linkLabel={(link: any) => formatLinkLabel(link)}
        linkVisibility={(link: any) => {
          const srcId = typeof link.source === 'object' ? link.source.id : link.source;
          const tgtId = typeof link.target === 'object' ? link.target.id : link.target;
          return visibility[srcId] !== false && visibility[tgtId] !== false;
        }}
        /* ── Interactions ── */
        cooldownTicks={VIZ_CANVAS.cooldownTicks}
        onNodeClick={(node: any) => handleNodeClick(node as VizNode)}
        onNodeDragEnd={(node: any) => fixNode(node as VizNode)}
        onEngineStop={() => freezeAll(graphData.nodes)}
        onLinkClick={(link: any) => setInfoObject(link.tx)}
      />
    </div>
  );
}
