/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  Fund Flow Engine — Detects fund flow paths in the graph     ║
 * ║  BFS/DFS pathfinding, cycle detection, flow aggregation      ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import type { MSNode, MSEdge, MSFlow } from "./cwtracker-types";
import { msFormatValue } from "./cwtracker-types";

/* ────────────────────────────── PATH TYPES ────────────────────────────── */

export interface FlowPath {
  nodeIds: string[];
  edgeIds: string[];
  totalValue: number;
  tokenSymbol: string;
  chain: string;
}

/* ────────────────────────────── BFS FLOW DETECTION ────────────────────────────── */

/**
 * Find all fund flow paths from a source node using BFS.
 * Returns paths up to maxDepth hops.
 */
export function findFlowPaths(
  sourceId: string,
  nodes: MSNode[],
  edges: MSEdge[],
  direction: "out" | "in" | "both" = "out",
  maxDepth = 10
): FlowPath[] {
  const paths: FlowPath[] = [];
  const adj = buildAdjacency(edges, direction);

  // BFS with path tracking
  const queue: { nodeId: string; path: string[]; edgePath: string[]; value: number; token: string; chain: string }[] = [
    { nodeId: sourceId, path: [sourceId], edgePath: [], value: Infinity, token: "", chain: "" },
  ];
  const visited = new Set<string>();
  visited.add(sourceId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.path.length > 1) {
      // Record this as a valid path
      paths.push({
        nodeIds: [...current.path],
        edgeIds: [...current.edgePath],
        totalValue: current.value === Infinity ? 0 : current.value,
        tokenSymbol: current.token,
        chain: current.chain,
      });
    }

    if (current.path.length >= maxDepth) continue;

    const neighbors = adj.get(current.nodeId) ?? [];
    for (const { targetId, edgeId, value, token, chain } of neighbors) {
      if (visited.has(targetId)) continue;
      visited.add(targetId);

      const newValue = Math.min(current.value, value);
      queue.push({
        nodeId: targetId,
        path: [...current.path, targetId],
        edgePath: [...current.edgePath, edgeId],
        value: newValue,
        token: token || current.token,
        chain: chain || current.chain,
      });
    }
  }

  return paths.sort((a, b) => b.totalValue - a.totalValue);
}

/**
 * Detect cycles in the graph (potential wash trading or circular flows)
 */
export function detectCycles(nodes: MSNode[], edges: MSEdge[]): string[][] {
  const cycles: string[][] = [];
  const adj = buildAdjacency(edges, "out");
  const nodeIds = nodes.map((n) => n.id);

  for (const startId of nodeIds) {
    const visited = new Set<string>();
    const stack: { nodeId: string; path: string[] }[] = [
      { nodeId: startId, path: [startId] },
    ];

    while (stack.length > 0) {
      const { nodeId, path } = stack.pop()!;
      if (visited.has(nodeId)) {
        // Found a cycle if it returns to start
        if (nodeId === startId && path.length > 2) {
          cycles.push([...path]);
        }
        continue;
      }
      visited.add(nodeId);

      const neighbors = adj.get(nodeId) ?? [];
      for (const { targetId } of neighbors) {
        if (targetId === startId && path.length > 1) {
          cycles.push([...path, targetId]);
        } else if (!visited.has(targetId) && path.length < 8) {
          stack.push({ nodeId: targetId, path: [...path, targetId] });
        }
      }
    }
  }

  // Deduplicate cycles
  const uniqueKey = (cycle: string[]) => {
    const sorted = [...cycle].sort();
    return sorted.join(",");
  };
  const seen = new Set<string>();
  return cycles.filter((c) => {
    const k = uniqueKey(c);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Compute value aggregation per address (total in, total out, net)
 */
export function computeValueAggregation(
  nodes: MSNode[],
  edges: MSEdge[]
): Map<string, { totalIn: number; totalOut: number; net: number }> {
  const agg = new Map<string, { totalIn: number; totalOut: number; net: number }>();

  for (const n of nodes) {
    agg.set(n.id, { totalIn: 0, totalOut: 0, net: 0 });
  }

  for (const e of edges) {
    const src = agg.get(e.source);
    const tgt = agg.get(e.target);
    if (src) {
      src.totalOut += e.totalValue;
      src.net = src.totalIn - src.totalOut;
    }
    if (tgt) {
      tgt.totalIn += e.totalValue;
      tgt.net = tgt.totalIn - tgt.totalOut;
    }
  }

  return agg;
}

/**
 * Convert detected paths to MSFlow objects for the store
 */
export function pathsToFlows(
  paths: FlowPath[],
  prefix = "flow"
): MSFlow[] {
  return paths.slice(0, 20).map((p, i) => ({
    id: `${prefix}_${i}`,
    label: `Flow #${i + 1} (${msFormatValue(p.totalValue)})`,
    chain: p.chain,
    nodeIds: p.nodeIds,
    edgeIds: p.edgeIds,
    totalValue: p.totalValue,
    tokenSymbol: p.tokenSymbol,
    direction: "out" as const,
  }));
}

/* ────────────────────────────── CROSS-CHAIN ────────────────────────────── */

/**
 * Detect cross-chain fund flows (edges between nodes on different chains)
 */
export function detectCrossChainFlows(
  nodes: MSNode[],
  edges: MSEdge[]
): MSEdge[] {
  const nodeChains = new Map(nodes.map((n) => [n.id, n.chain]));
  return edges.filter((e) => {
    const srcChain = nodeChains.get(e.source);
    const tgtChain = nodeChains.get(e.target);
    return srcChain && tgtChain && srcChain !== tgtChain;
  });
}

/**
 * Resolve OmniChain chain UID from chain name
 */
export async function resolveChainUid(
  chainName: string
): Promise<string | null> {
  try {
    const res = await fetch("/data/omnichain-registry.json");
    if (!res.ok) return null;
    const data = await res.json();
    const registry = Array.isArray(data) ? data : data.chains || [];

    const normalized = chainName.toLowerCase().replace(/[\s-_]/g, "");
    for (const chain of registry) {
      const name = (chain.name || "").toLowerCase().replace(/[\s-_]/g, "");
      if (name === normalized || chain.chainUid === normalized) {
        return chain.chainUid;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Compute cross-chain summary
 */
export function crossChainSummary(
  nodes: MSNode[],
  edges: MSEdge[]
): {
  totalCrossChain: number;
  bridgeVolume: number;
  chainPairs: { from: string; to: string; volume: number }[];
} {
  const crossEdges = detectCrossChainFlows(nodes, edges);
  const nodeChains = new Map(nodes.map((n) => [n.id, n.chain]));
  const pairMap = new Map<string, number>();

  let total = 0;
  for (const e of crossEdges) {
    total += e.totalValue;
    const srcChain = nodeChains.get(e.source) || "unknown";
    const tgtChain = nodeChains.get(e.target) || "unknown";
    const key = `${srcChain}→${tgtChain}`;
    pairMap.set(key, (pairMap.get(key) || 0) + e.totalValue);
  }

  const pairs = Array.from(pairMap.entries())
    .map(([key, volume]) => {
      const [from, to] = key.split("→");
      return { from, to, volume };
    })
    .sort((a, b) => b.volume - a.volume);

  return {
    totalCrossChain: crossEdges.length,
    bridgeVolume: total,
    chainPairs: pairs,
  };
}

/* ────────────────────────────── ADJACENCY HELPER ────────────────────────────── */

interface AdjEntry {
  targetId: string;
  edgeId: string;
  value: number;
  token: string;
  chain: string;
}

function buildAdjacency(
  edges: MSEdge[],
  direction: "out" | "in" | "both"
): Map<string, AdjEntry[]> {
  const adj = new Map<string, AdjEntry[]>();

  for (const e of edges) {
    const entry: AdjEntry = {
      targetId: "",
      edgeId: e.id,
      value: e.totalValue,
      token: e.tokenSymbol,
      chain: e.chain,
    };

    if (direction === "out" || direction === "both") {
      if (!adj.has(e.source)) adj.set(e.source, []);
      adj.get(e.source)!.push({ ...entry, targetId: e.target });
    }
    if (direction === "in" || direction === "both") {
      if (!adj.has(e.target)) adj.set(e.target, []);
      adj.get(e.target)!.push({ ...entry, targetId: e.source });
    }
  }

  return adj;
}
