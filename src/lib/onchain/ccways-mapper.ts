/**
 * CCWAYS Mapper — Transform gateway responses to MSNode[] / MSEdge[]
 *
 * This module bridges the CCWAYS backend response format with the
 * CWTracker frontend type system.  No upstream provider names appear
 * in this file — everything uses "ccways" namespace only.
 */

import type { MSNode, MSEdge, MSEdgeDetail, MSEntityType, MSRiskLevel } from "./cwtracker-types";

/* ─── helpers ──────────────────────────────────────────────────────────── */

function shortenAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

const VALID_ENTITY_TYPES: Set<string> = new Set([
  "exchange", "wallet", "contract", "token", "defi", "bridge",
  "mixer", "sanctioned", "nft", "mev_bot", "dao", "treasury", "unknown",
]);

function toEntityType(raw?: string): MSEntityType {
  if (!raw) return "unknown";
  const lower = raw.toLowerCase();
  if (VALID_ENTITY_TYPES.has(lower)) return lower as MSEntityType;
  return "unknown";
}

const VALID_RISK_LEVELS: Set<string> = new Set([
  "unknown", "no_risk", "low", "medium", "high", "critical",
]);

function toRiskLevel(raw?: string | null): MSRiskLevel | undefined {
  if (!raw) return undefined;
  const lower = raw.toLowerCase();
  if (VALID_RISK_LEVELS.has(lower)) return lower as MSRiskLevel;
  return "unknown";
}

/* ─── Node mapper ──────────────────────────────────────────────────────── */

export interface RawCCWaysNode {
  id: string;
  address: string;
  label?: string;
  type?: string;
  chain?: string;
  isContract?: boolean;
  tags?: string[];
  riskLevel?: string | null;
  totalValueUSD?: number;
  balanceUSD?: number;
  balanceRaw?: string;
  balanceToken?: string;
  flowsIn?: number;
  flowsOut?: number;
  txCount?: number;
  firstSeen?: string;
  lastSeen?: string;
  activeChains?: string[];
  chainBalances?: Record<string, { usd?: number; name?: string }>;
  [key: string]: unknown;
}

/**
 * Map a single CCWAYS backend node to a full MSNode.
 *
 * @param raw     — raw node from /api/ccways/expand
 * @param index   — sibling index (for gridY placement)
 * @param parentId — parent node ID
 * @param direction — expansion direction
 */
export function mapCCWaysNodeToMSNode(
  raw: RawCCWaysNode,
  index: number = 0,
  parentId?: string,
  direction?: "left" | "right" | "both",
): MSNode {
  const chain = raw.chain || "ethereum";
  const addr = raw.address || "";
  const label = raw.label || shortenAddress(addr);

  return {
    id: raw.id || `ccways:${chain}:${addr}`,
    label,
    subLabel: addr.length > 12 ? shortenAddress(addr) : undefined,
    type: toEntityType(raw.type),
    address: addr,
    chain,

    // Layout — will be overwritten by dagre/ELK
    gridX: 0,
    gridY: 0,
    x: 0,
    y: 0,

    // State
    isRoot: false,
    isSelected: false,
    isExpanded: false,
    isLoading: false,
    isContract: raw.isContract ?? false,
    isPruned: false,
    isDragging: false,

    // Data
    balanceUSD: raw.balanceUSD ?? raw.totalValueUSD ?? undefined,
    balanceRaw: raw.balanceRaw,
    balanceToken: raw.balanceToken,
    flowsIn: raw.flowsIn ?? 0,
    flowsOut: raw.flowsOut ?? 0,
    txCount: raw.txCount ?? 0,
    firstSeen: raw.firstSeen,
    lastSeen: raw.lastSeen,

    // Visual
    tags: raw.tags,
    riskLevel: toRiskLevel(raw.riskLevel),
    totalValueUSD: raw.totalValueUSD,
    activeChains: raw.activeChains,
    totalKnownTransfers: raw.txCount ?? 0,
  };
}

/* ─── Edge mapper ──────────────────────────────────────────────────────── */

export interface RawCCWaysEdge {
  id: string;
  source: string;
  target: string;
  chain?: string;
  direction?: "in" | "out" | "both";
  tokenSymbol?: string;
  totalValue?: number;
  valueLabel?: string;
  amountLabel?: string;
  transferCount?: number;
  details?: Array<{
    txHash?: string;
    block?: number;
    timestamp?: string;
    value?: number;
    tokenSymbol?: string;
    chain?: string;
  }>;
  isSuspicious?: boolean;
  isCrossChain?: boolean;
  latestTimestamp?: string;
  [key: string]: unknown;
}

/**
 * Map a single CCWAYS backend edge to a full MSEdge.
 */
export function mapCCWaysEdgeToMSEdge(raw: RawCCWaysEdge): MSEdge {
  const details: MSEdgeDetail[] = (raw.details ?? []).map((d) => ({
    txHash: d.txHash || "",
    block: d.block,
    timestamp: d.timestamp,
    value: d.value ?? 0,
    tokenSymbol: d.tokenSymbol || raw.tokenSymbol || "",
    chain: d.chain || raw.chain || "ethereum",
  }));

  return {
    id: raw.id,
    source: raw.source,
    target: raw.target,
    chain: raw.chain || "ethereum",
    direction: raw.direction || "out",
    isCurve: false,
    curveOffset: 0,
    totalValue: raw.totalValue ?? 0,
    valueLabel: raw.valueLabel || "",
    tokenSymbol: raw.tokenSymbol || "",
    transferCount: raw.transferCount ?? (details.length || 1),
    color: "",
    isHighlighted: false,
    isSelected: false,
    details,
    isSuspicious: raw.isSuspicious ?? false,
    isCrossChain: raw.isCrossChain ?? false,
    isCustom: false,
    amountLabel: raw.amountLabel || raw.valueLabel || "",
    latestTimestamp: raw.latestTimestamp,
  };
}

/* ─── Batch mapper ─────────────────────────────────────────────────────── */

export interface CCWaysExpandResponse {
  success: boolean;
  nodes: RawCCWaysNode[];
  edges: RawCCWaysEdge[];
}

/**
 * Map a full CCWAYS expand response to { nodes: MSNode[], edges: MSEdge[] }.
 */
export function mapCCWaysExpand(
  data: CCWaysExpandResponse,
  parentId?: string,
  direction?: "left" | "right" | "both",
): { nodes: MSNode[]; edges: MSEdge[] } {
  const nodes = (data.nodes || []).map((n, i) =>
    mapCCWaysNodeToMSNode(n, i, parentId, direction)
  );
  const edges = (data.edges || []).map((e) => mapCCWaysEdgeToMSEdge(e));
  return { nodes, edges };
}
