/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CWTRACKER Types — CWTracker-style fund-flow graph         ║
 * ║  visualization. 100% layout/dimension parity with MS.       ║
 * ╚══════════════════════════════════════════════════════════════╝
 */
import dagre from "dagre";

/* ────────────────────────────── CONSTANTS ────────────────────────────── */

/** Node visual dimensions — matches CWTracker DOM exactly (compact 280×72) */
export const MS_NODE = {
  width: 280,
  height: 72,
  cornerRadius: 6,
  iconSize: 24,
  padding: 11,
  /** Font size for label */
  fontSize: 12,
  /** Character width for address measurement */
  charWidth: 7.14,
  /** Address truncation split position */
  addressSplit: 32,
  /** Action bar width below node (hover) */
  actionBarWidth: 260,
  /** Action button size */
  actionBtnSize: 24,
  /** Expand arrow icon size */
  expandIconSize: 14,
  /** Spacing between nodes in grid (fallback) */
  gridSpacingX: 420,
  gridSpacingY: 120,
  /** Default node spacing for slider */
  defaultSpacing: 420,
  minSpacing: 300,
  maxSpacing: 700,
} as const;

/** 
 * CWTracker exact colors — dark theme from CSS variables
 * --default-color: #bd7c40, --secondary-background: #303135
 */
export const MS_COLORS = {
  /* ── canvas ── */
  canvasBg: "transparent",
  canvasGrid: "rgba(255,255,255,0.03)",
  canvasGridAccent: "rgba(255,255,255,0.06)",

  /* ── panels (glass) ── */
  panelBg: "rgba(48,49,53,0.55)",
  panelBgHover: "rgba(58,58,63,0.6)",
  panelBorder: "rgba(255,255,255,0.1)",
  panelBorderAccent: "rgba(189,124,64,0.3)",
  panelShadow: "0 8px 32px rgba(0,0,0,0.35)",
  panelBlur: "blur(20px)",
  toolbarBg: "rgba(0,0,0,0.25)",
  toolbarBlur: "blur(12px)",

  /* ── text ── */
  textPrimary: "#ffffff",
  textSecondary: "#cbcbcb",
  textMuted: "#5f5f61",
  textAccent: "#bd7c40",

  /* ── brand (CWTracker orange) ── */
  primary: "#bd7c40",
  primaryLight: "#b78c5d",
  primaryDark: "#a46c39",

  /* ── status ── */
  success: "#24c197",
  error: "#ef4444",
  warning: "#f59e0b",
  info: "#3b82f6",

  /* ── node type colors ── */
  nodeExchange: "#3b82f6",
  nodeWallet: "#8b5cf6",
  nodeContract: "#f59e0b",
  nodeToken: "#22c55e",
  nodeDeFi: "#06b6d4",
  nodeBridge: "#a855f7",
  nodeMixer: "#ef4444",
  nodeSanctioned: "#dc2626",
  nodeNFT: "#ec4899",
  nodeMEVBot: "#f97316",
  nodeUnknown: "#64748b",
  nodeRoot: "#463522",

  /* ── edge colors ── */
  edgeDefault: "#b5b4b2",
  edgeHighlight: "#bd7c40",
  edgeSuspicious: "#ef4444",
  edgeCrossChain: "#a855f7",
  edgeSelected: "#bd7c40",

  /* ── CWTracker-parity: node fills & borders (solid like competitor) ── */
  nodeFill: "#212121",
  nodeRootFill: "#463522",
  nodeStroke: "#212121",
  selectedBorder: "#bd7c40",
  /** Node glow on hover (drop-shadow) — uses CSS var */
  nodeGlow: "drop-shadow(2px 2px 21px var(--default-color))",

  /* ── backgrounds (glass) ── */
  primaryBackground: "rgba(31,33,36,0.65)",
  secondaryBackground: "rgba(48,49,53,0.55)",
  otherBackground: "rgba(19,19,19,0.45)",
  actionBarBg: "rgba(48,49,53,0.55)",
  graphActionBg: "rgba(48,49,53,0.55)",
} as const;

/* ── Token Colors (CWTracker-extracted) ── */
export const MS_TOKEN_COLORS: Record<string, string> = {
  ETH: "#5873e0",
  WETH: "#5873e0",
  USDT: "#009393",
  USDC: "#2875CA",
  DAI: "#F4BC41",
  BNB: "#F3BA30",
  WBNB: "#F3BA30",
  WBTC: "#F0964A",
  BTC: "#F0964A",
  UNI: "#DE3A8B",
  LINK: "#335CD2",
  SHIB: "#E42F17",
  stETH: "#0AA5FE",
  MATIC: "#7B3FE4",
  AVAX: "#E84142",
  SOL: "#9945FF",
  ARB: "#28A0F0",
  OP: "#FF0420",
  FTM: "#1969FF",
  CRO: "#002D74",
  AAVE: "#B6509E",
  MKR: "#1AAB9B",
  COMP: "#00D395",
  SNX: "#170659",
  SUSHI: "#FA52A0",
  CRV: "#FF2D55",
  DOGE: "#C3A634",
  LDO: "#F69988",
  APE: "#0054F7",
  GRT: "#6747ED",
  PEPE: "#509544",
  FLOKI: "#F6921E",
};

/** Fallback edge color when token not in map */
export const MS_TOKEN_COLOR_FALLBACK = "#94a3b8";

/** Get color for a token symbol */
export function getMSTokenColor(symbol: string): string {
  if (!symbol) return MS_TOKEN_COLOR_FALLBACK;
  return MS_TOKEN_COLORS[symbol.toUpperCase()] ?? MS_TOKEN_COLOR_FALLBACK;
}

/* ── Risk Levels (CWTracker-parity) ── */
export type MSRiskLevel = "unknown" | "no_risk" | "low" | "medium" | "high" | "critical";

export const MS_RISK_COLORS: Record<MSRiskLevel, string> = {
  unknown: "#939393",
  no_risk: "#18CBAA",
  low: "#18CBAA",
  medium: "#FFE780",
  high: "#FF0000",
  critical: "#D60473",
};

export const MS_RISK_LABELS: Record<MSRiskLevel, string> = {
  unknown: "Unknown",
  no_risk: "No Risk",
  low: "Low Risk",
  medium: "Medium Risk",
  high: "High Risk",
  critical: "Critical",
};

export const MS_RISK_ICON_CLASSES: Record<MSRiskLevel, string> = {
  unknown: "icon-unknown",
  no_risk: "icon-a-NoRisk",
  low: "icon-a-LowRisk",
  medium: "icon-a-MediumRisk",
  high: "icon-a-HighRisk",
  critical: "icon-a-CriticalRisk",
};

export function getMSRiskColor(level: MSRiskLevel): string {
  return MS_RISK_COLORS[level] ?? MS_RISK_COLORS.unknown;
}

export function getMSRiskLabel(level: MSRiskLevel): string {
  return MS_RISK_LABELS[level] ?? MS_RISK_LABELS.unknown;
}

/* ────────────────────────────── ENTITY TYPES ────────────────────────────── */

export type MSEntityType =
  | "exchange"
  | "wallet"
  | "contract"
  | "token"
  | "defi"
  | "bridge"
  | "mixer"
  | "sanctioned"
  | "nft"
  | "mev_bot"
  | "dao"
  | "treasury"
  | "unknown";

export const MS_ENTITY_TYPE_LABELS: Record<MSEntityType, string> = {
  exchange: "Exchange",
  wallet: "Wallet",
  contract: "Contract",
  token: "Token",
  defi: "DeFi",
  bridge: "Bridge",
  mixer: "Mixer",
  sanctioned: "Sanctioned",
  nft: "NFT",
  mev_bot: "MEV Bot",
  dao: "DAO",
  treasury: "Treasury",
  unknown: "Unknown",
};

export function getMSEntityColor(type: MSEntityType): string {
  const map: Record<MSEntityType, string> = {
    exchange: MS_COLORS.nodeExchange,
    wallet: MS_COLORS.nodeWallet,
    contract: MS_COLORS.nodeContract,
    token: MS_COLORS.nodeToken,
    defi: MS_COLORS.nodeDeFi,
    bridge: MS_COLORS.nodeBridge,
    mixer: MS_COLORS.nodeMixer,
    sanctioned: MS_COLORS.nodeSanctioned,
    nft: MS_COLORS.nodeNFT,
    mev_bot: MS_COLORS.nodeMEVBot,
    dao: MS_COLORS.primary,
    treasury: MS_COLORS.primaryLight,
    unknown: MS_COLORS.nodeUnknown,
  };
  return map[type] ?? MS_COLORS.nodeUnknown;
}

/* ────────────────────────────── NODE ────────────────────────────── */

export interface MSNode {
  id: string;
  /** Display label (entity name or shortened address) */
  label: string;
  /** Sub-label (full or shortened address) */
  subLabel?: string;
  /** Entity type for icon/color */
  type: MSEntityType;
  /** Full blockchain address */
  address: string;
  /** Chain identifier (e.g., "ethereum", "bsc", "polygon") */
  chain: string;
  /** Chain UID from OmniChain (e.g., "eip155:1") */
  chainUid?: string;

  /* ── Layout ── */
  /** Grid column (BFS-assigned) */
  gridX: number;
  /** Grid row (BFS-assigned) */
  gridY: number;
  /** Pixel X (computed from gridX) */
  x: number;
  /** Pixel Y (computed from gridY) */
  y: number;

  /* ── State flags ── */
  isRoot: boolean;
  isSelected: boolean;
  isExpanded: boolean;
  isLoading: boolean;
  isContract: boolean;
  isPruned: boolean;
  isDragging: boolean;

  /* ── Data ── */
  /** Wallet balance in USD (replaces Analyze button) */
  balanceUSD?: number;
  /** Raw token balance */
  balanceRaw?: string;
  /** Balance token symbol */
  balanceToken?: string;
  /** Total value flowing IN (USD) */
  flowsIn: number;
  /** Total value flowing OUT (USD) */
  flowsOut: number;
  /** Number of transactions */
  txCount: number;
  /** First seen timestamp */
  firstSeen?: string;
  /** Last seen timestamp */
  lastSeen?: string;

  /* ── Visual ── */
  /** Custom color for node bookmark */
  bookColor?: string;
  /** User memo/annotation */
  memo?: string;
  /** Cross-chain info */
  crossChainInfo?: {
    sourceChain: string;
    targetChain: string;
    bridgeProtocol?: string;
  };
  /** Custom tags */
  tags?: string[];
  /** Risk level (CWTracker-style) */
  riskLevel?: MSRiskLevel;
  /** Direction this node was expanded from (for INCOMING/OUTGOING arrows) */
  expandDirection?: "left" | "right" | "both";
  /** Custom edge style override */
  customColor?: string;
  /** Custom text color (from style picker) */
  customTextColor?: string;
  /** Custom node shape */
  customShape?: "rect" | "rect_no_r" | "ellipse" | "diamond" | "pentagon" | "house" | "box3d" | "doubleoctagon";
  /** Total portfolio value in USD */
  totalValueUSD?: number;
  /** Active chains for this address */
  activeChains?: string[];
  /** Per-chain token balances for dropdown display */
  chainBalances?: Record<string, { token: string; amount: number; usdValue: number }[]>;
  /** Whether this node is visible on canvas (toggled by eye icon) */
  isVisibleOnCanvas?: boolean;
  /** Total known transfers from API/blockchain (may be more than loaded) */
  totalKnownTransfers?: number;
  /** Per-chain first-seen dates */
  chainFirstSeen?: Record<string, string>;
  /** Entity/Exchange name (e.g., "Binance", "Uniswap") */
  entityName?: string;
  /** Entity slug for icon lookup (e.g., "binance", "uniswap") */
  entitySlug?: string;
  /** Direct URL to entity icon/logo */
  entityIconUrl?: string;
}

/* ────────────────────────────── EDGE ────────────────────────────── */

export interface MSEdgeDetail {
  txHash: string;
  block?: number;
  timestamp?: string;
  value: number;
  tokenSymbol: string;
  chain: string;
}

export interface MSEdge {
  id: string;
  /** Source node ID */
  source: string;
  /** Target node ID */
  target: string;
  /** Chain for this edge */
  chain: string;
  /** Flow direction */
  direction: "in" | "out" | "both";
  /** Is this a curved edge (when parallel edges exist) */
  isCurve: boolean;
  /** Curve offset for parallel edges */
  curveOffset: number;
  /** Total value in USD */
  totalValue: number;
  /** Display label for value */
  valueLabel: string;
  /** Token symbol */
  tokenSymbol: string;
  /** Number of transfers */
  transferCount: number;
  /** Edge color */
  color: string;
  /** Is highlighted */
  isHighlighted: boolean;
  /** Is selected */
  isSelected: boolean;
  /** Transaction details */
  details: MSEdgeDetail[];
  /** Is this a suspicious/fake token transfer */
  isSuspicious: boolean;
  /** Is this a cross-chain edge */
  isCrossChain: boolean;
  /** User-drawn custom edge */
  isCustom: boolean;
  /** User memo */
  memo?: string;
  /** Custom edge color (from EdgeStylePicker) */
  customColor?: string;
  /** Custom edge width (from EdgeStylePicker) */
  customWidth?: number;
  /** Custom dash pattern: "solid" | "dashed" | "dotted" */
  customDash?: "solid" | "dashed" | "dotted";
  /** Timestamp of latest transfer */
  latestTimestamp?: string;
  /** Formatted amount label "1.5 ETH" */
  amountLabel?: string;
  /** Whether this edge is visible on canvas (toggled by eye icon) */
  isVisible?: boolean;
  /** Dagre-computed label node center X (set by msDagreLayout) */
  labelX?: number;
  /** Dagre-computed label node center Y (set by msDagreLayout) */
  labelY?: number;
  /** Dagre routing points for source→label path segment */
  path1Points?: { x: number; y: number }[];
  /** Dagre routing points for label→target path segment */
  path2Points?: { x: number; y: number }[];
  /** ELK-computed full route points (start + bendPoints + end) */
  routePoints?: { x: number; y: number }[];
  /** Edge display type for React Flow */
  edgeType?: "default" | "animated" | "smooth" | "straight" | "animatedSvg";
  /** Custom arrowhead / marker size (default 12, range 6-24) */
  customArrowSize?: number;
}

/* ────────────────────────────── FLOW ────────────────────────────── */

export interface MSFlow {
  id: string;
  label: string;
  chain: string;
  nodeIds: string[];
  edgeIds: string[];
  totalValue: number;
  tokenSymbol: string;
  direction: "in" | "out" | "both";
}

/* ────────────────────────────── ANNOTATION ────────────────────────────── */

export interface MSAnnotation {
  id: string;
  /** Target node or edge ID */
  targetId: string;
  targetType: "node" | "edge";
  text: string;
  color?: string;
  createdAt: string;
  /** Canvas X coordinate (for free-positioned annotations) */
  x?: number;
  /** Canvas Y coordinate (for free-positioned annotations) */
  y?: number;
}

/* ────────────────────────────── DISPLAY OPTIONS ────────────────────────────── */

export interface MSDisplayOptions {
  showValues: boolean;
  showTokens: boolean;
  showLabels: boolean;
  showChainIcons: boolean;
  showBalances: boolean;
  showArrows: boolean;
  showGrid: boolean;
  showMinimap: boolean;
  /** Edge thickness mode */
  edgeThickness: "uniform" | "proportional";
  /** Auto-expand nodes on click */
  autoExpand: boolean;
  /** Highlight path on hover */
  highlightPath: boolean;
  /** Show tx count on edges */
  showTxCount: boolean;
}

export const DEFAULT_MS_DISPLAY: MSDisplayOptions = {
  showValues: true,
  showTokens: true,
  showLabels: true,
  showChainIcons: true,
  showBalances: true,
  showArrows: true,
  showGrid: true,
  showMinimap: false,
  edgeThickness: "proportional",
  autoExpand: false,
  highlightPath: true,
  showTxCount: true,
};

/* ────────────────────────────── FILTER ────────────────────────────── */

export interface MSFilter {
  /** Filter by chain(s) */
  chains: string[];
  /** Filter by entity type(s) */
  entityTypes: MSEntityType[];
  /** Filter by token symbol(s) */
  tokens: string[];
  /** Minimum value threshold (USD) */
  minValue: number;
  /** Maximum value threshold (USD) */
  maxValue: number;
  /** Date range start */
  dateFrom?: string;
  /** Date range end */
  dateTo?: string;
  /** Search text */
  searchText: string;
  /** Show only suspicious edges */
  suspiciousOnly: boolean;
  /** Show only cross-chain */
  crossChainOnly: boolean;
}

export const DEFAULT_MS_FILTER: MSFilter = {
  chains: [],
  entityTypes: [],
  tokens: [],
  minValue: 0,
  maxValue: Infinity,
  searchText: "",
  suspiciousOnly: false,
  crossChainOnly: false,
};

/* ────────────────────────────── CONTROL MODE ────────────────────────────── */

export type MSControlMode = "select" | "drag" | "draw_edge" | "annotate" | "pan";

/* ────────────────────────────── SIDEBAR TAB ────────────────────────────── */

export type MSSidebarTab = "overview" | "flows" | "details" | "settings";

/** Address Detail sidebar sub-tab (CWTracker: "1" = Related Address, "2" = Transfer) */
export type MSSidebarSubTab = "1" | "2";

/** Node hover action bar button types (CWTracker JS enum) */
export enum MSNodeHoverAction {
  ANALYZE = 1,
  ADVANCED_ANALYZE = 2,
  EDIT_LABEL = 3,
  MONITOR = 4,
  DELETE = 5,
  CROSS_CHAIN = 6,
  SHOW_ALL_CROSS_EDGES = 7,
}

/** Direction for address detail table */
export type MSAddressDirection = "IN" | "OUT" | "IN/OUT";

/* ────────────────────────────── PERSISTENCE ────────────────────────────── */

export interface MSSnapshot {
  uuid: string;
  title: string;
  rootAddress: string;
  rootChain: string;
  nodes: MSNode[];
  edges: MSEdge[];
  flows: MSFlow[];
  annotations: MSAnnotation[];
  displayOptions: MSDisplayOptions;
  filter: MSFilter;
  zoom: number;
  panX: number;
  panY: number;
  savedAt: string;
}

/* ────────────────────────────── HELPERS ────────────────────────────── */

/** Convert grid position to pixel coordinates */
export function msGridToPixel(gridX: number, gridY: number): { x: number; y: number } {
  return {
    x: gridX * MS_NODE.gridSpacingX,
    y: gridY * MS_NODE.gridSpacingY,
  };
}

/** Shorten address for display */
export function msShortenAddress(addr: string, chars = 6): string {
  if (!addr || addr.length < 10) return addr || "";
  return `${addr.slice(0, chars + 2)}...${addr.slice(-chars)}`;
}

/** Format value with appropriate units */
export function msFormatValue(value: number): string {
  if (value === 0) return "0";
  if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  if (Math.abs(value) >= 1) return `$${value.toFixed(2)}`;
  if (Math.abs(value) >= 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toExponential(2)}`;
}

/** Format raw token amount */
export function msFormatTokenAmount(amount: number, symbol?: string): string {
  const formatted =
    Math.abs(amount) >= 1e6
      ? `${(amount / 1e6).toFixed(2)}M`
      : Math.abs(amount) >= 1e3
      ? `${(amount / 1e3).toFixed(2)}K`
      : amount.toFixed(4);
  return symbol ? `${formatted} ${symbol}` : formatted;
}

/** Assign grid positions using BFS from root (legacy fallback) */
export function msAssignGridPositions(
  nodes: MSNode[],
  edges: MSEdge[],
  rootId: string
): MSNode[] {
  // Delegate to dagre layout
  return msDagreLayout(nodes, edges, rootId);
}

/**
 * Dagre-based left-to-right layout — CWTracker label-node architecture.
 * Every transfer becomes a label node (280×28) between source and target.
 * Dagre spaces them vertically via nodesep — zero manual offset needed.
 */
export function msDagreLayout(
  nodes: MSNode[],
  edges: MSEdge[],
  rootId: string,
  visibleEdgeIds?: Set<string>,
  spacing?: number
): MSNode[] {
  if (nodes.length === 0) return nodes;

  const LABEL_W = 280;
  const LABEL_H = 28;

  // Use spacing param for ranksep (horizontal distance between ranks in LR).
  // Default 420 maps to ranksep=200. Scale proportionally: ranksep = spacing * 200/420
  const effectiveRanksep = spacing
    ? Math.round((spacing / MS_NODE.defaultSpacing) * 200)
    : 200;
  const effectiveNodesep = spacing
    ? Math.round((spacing / MS_NODE.defaultSpacing) * 70)
    : 70;

  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: "LR",
    nodesep: effectiveNodesep,
    ranksep: effectiveRanksep,
    edgesep: 35,
    marginx: 60,
    marginy: 60,
    acyclicer: "greedy",
    ranker: "network-simplex",
  });
  g.setDefaultEdgeLabel(() => ({}));

  // Determine which nodes are connected by visible edges
  const connectedNodeIds = new Set<string>();
  connectedNodeIds.add(rootId);
  for (const e of edges) {
    if (!visibleEdgeIds || visibleEdgeIds.has(e.id)) {
      connectedNodeIds.add(e.source);
      connectedNodeIds.add(e.target);
    }
  }

  // Add only connected address nodes to dagre
  for (const n of nodes) {
    if (connectedNodeIds.has(n.id)) {
      g.setNode(n.id, { width: MS_NODE.width, height: MS_NODE.height });
    }
  }

  // Add a label-node per visible edge + two half-edges (source→label, label→target)
  for (const e of edges) {
    // Skip edges not in visible set
    if (visibleEdgeIds && !visibleEdgeIds.has(e.id)) continue;

    const hasSource = nodes.some((n) => n.id === e.source);
    const hasTarget = nodes.some((n) => n.id === e.target);
    if (!hasSource || !hasTarget) continue;

    const labelNodeId = `label_${e.id}`;
    // height=2 so dagre's intersectRect always hits left/right sides
    // (not top/bottom). Visual label uses LABEL_H=28 in MSGraphCanvas.
    g.setNode(labelNodeId, { width: LABEL_W, height: 2 });
    g.setEdge(e.source, labelNodeId, { weight: 2, minlen: 1 });
    g.setEdge(labelNodeId, e.target, { weight: 2, minlen: 1 });
  }

  // Run dagre layout
  dagre.layout(g);

  // Map positions back to address nodes (all nodes, even unplaced ones get default)
  const result = nodes.map((n) => {
    const nodeInfo = g.node(n.id);
    if (!nodeInfo) return { ...n, x: -9999, y: -9999 }; // hide unconnected nodes off-screen
    const x = nodeInfo.x - MS_NODE.width / 2;
    const y = nodeInfo.y - MS_NODE.height / 2;
    const gridX = Math.round(x / MS_NODE.gridSpacingX);
    const gridY = Math.round(y / MS_NODE.gridSpacingY);
    return { ...n, x, y, gridX, gridY };
  });

  // Map label-node positions and edge routing points back to edges
  for (const e of edges) {
    const labelNodeId = `label_${e.id}`;
    const labelInfo = g.node(labelNodeId);
    if (labelInfo) {
      e.labelX = labelInfo.x - LABEL_W / 2;
      e.labelY = labelInfo.y;
      // Extract dagre edge routing points for smooth B-spline rendering
      const ei1: any = g.edge(e.source, labelNodeId);
      const ei2: any = g.edge(labelNodeId, e.target);
      e.path1Points = ei1?.points?.map((p: { x: number; y: number }) => ({ x: p.x, y: p.y }));
      e.path2Points = ei2?.points?.map((p: { x: number; y: number }) => ({ x: p.x, y: p.y }));
    } else {
      e.labelX = undefined;
      e.labelY = undefined;
      e.path1Points = undefined;
      e.path2Points = undefined;
    }
  }

  return result;
}

/* ────────────────────────────── CHAIN ICONS ────────────────────────────── */

export const MS_CHAIN_ICON_MAP: Record<string, string> = {
  ethereum: "/chain-icons/ethereum.png",
  eth: "/chain-icons/ethereum.png",
  bsc: "/chain-icons/bsc.png",
  binance: "/chain-icons/bsc.png",
  polygon: "/chain-icons/polygon.png",
  avalanche: "/chain-icons/avalanche.png",
  avax: "/chain-icons/avalanche.png",
  arbitrum: "/chain-icons/arbitrum.png",
  optimism: "/chain-icons/optimism.png",
  fantom: "/chain-icons/fantom.png",
  cronos: "/chain-icons/cronos.png",
  solana: "/chain-icons/solana.png",
  base: "/chain-icons/base.png",
  linea: "/chain-icons/linea.png",
  zksync: "/chain-icons/zksync.png",
  scroll: "/chain-icons/scroll.png",
  blast: "/chain-icons/blast.png",
  manta: "/chain-icons/manta.png",
  mantle: "/chain-icons/mantle.png",
  celo: "/chain-icons/celo.png",
  gnosis: "/chain-icons/gnosis.png",
  moonbeam: "/chain-icons/moonbeam.png",
  aurora: "/chain-icons/aurora.png",
  harmony: "/chain-icons/harmony.png",
  tron: "/chain-icons/tron.png",
  near: "/chain-icons/near.png",
  cosmos: "/chain-icons/cosmos.png",
  polkadot: "/chain-icons/polkadot.png",
  sui: "/chain-icons/sui.png",
  aptos: "/chain-icons/aptos.png",
  sei: "/chain-icons/sei.png",
  starknet: "/chain-icons/ethereum.png",
};

export function getMSChainIconUrl(chain: string | undefined | null): string {
  if (!chain) return MS_CHAIN_ICON_MAP.ethereum;
  const key = chain.toLowerCase().replace(/[\s-_]/g, "");
  return MS_CHAIN_ICON_MAP[key] ?? MS_CHAIN_ICON_MAP.ethereum;
}

/** Token icon URL — served from /token-icons/ (local TrustWallet logos) */
export function getMSTokenIconUrl(symbol: string): string | null {
  const key = symbol.toLowerCase().replace(/[\s-_]/g, "");
  // Known tokens with local icons
  const known = new Set([
    "eth","bnb","matic","avax","ftm","cro","sol","atom","dot","trx",
    "near","algo","ada","xrp","btc","usdt","usdc","dai","link","uni",
    "aave","mkr","comp","sushi","crv","snx","wbtc","shib","doge","ltc",
    "xlm","eos","xtz","fil","grt","bat","mana","sand","lrc","enj",
    "chz","1inch","cake",
  ]);
  if (known.has(key)) return `/token-icons/${key}.png`;
  // Fallback: map common aliases
  const aliases: Record<string, string> = {
    ether: "eth", weth: "eth", ethereum: "eth",
    bitcoin: "btc", tether: "usdt", "usd coin": "usdc",
    binancecoin: "bnb", dogecoin: "doge", litecoin: "ltc",
    chainlink: "link", uniswap: "uni", polygon: "matic",
    fantom: "ftm", avalanche: "avax", solana: "sol",
    cosmos: "atom", polkadot: "dot", tron: "trx",
    cardano: "ada", ripple: "xrp", stellar: "xlm",
    filecoin: "fil", aave: "aave",
  };
  const mapped = aliases[key];
  if (mapped) return `/token-icons/${mapped}.png`;
  return null;
}

/** Exchange/Protocol icon URL from multiple CDN sources */
export function getMSExchangeIconUrl(entitySlug: string | undefined | null): string | null {
  if (!entitySlug) return null;
  const slug = entitySlug.toLowerCase().replace(/[\s_]/g, "-");
  // Known CEX/DEX icons map to specific URLs
  const knownIcons: Record<string, string> = {
    binance: "https://icons.llamao.fi/icons/protocols/binance-cex?w=48&h=48",
    coinbase: "https://icons.llamao.fi/icons/protocols/coinbase?w=48&h=48",
    kraken: "https://icons.llamao.fi/icons/protocols/kraken?w=48&h=48",
    okx: "https://icons.llamao.fi/icons/protocols/okx?w=48&h=48",
    bybit: "https://icons.llamao.fi/icons/protocols/bybit?w=48&h=48",
    kucoin: "https://icons.llamao.fi/icons/protocols/kucoin?w=48&h=48",
    huobi: "https://icons.llamao.fi/icons/protocols/huobi?w=48&h=48",
    htx: "https://icons.llamao.fi/icons/protocols/huobi?w=48&h=48",
    gateio: "https://icons.llamao.fi/icons/protocols/gate.io?w=48&h=48",
    "gate-io": "https://icons.llamao.fi/icons/protocols/gate.io?w=48&h=48",
    bitfinex: "https://icons.llamao.fi/icons/protocols/bitfinex?w=48&h=48",
    gemini: "https://icons.llamao.fi/icons/protocols/gemini?w=48&h=48",
    bitstamp: "https://icons.llamao.fi/icons/protocols/bitstamp?w=48&h=48",
    uniswap: "https://icons.llamao.fi/icons/protocols/uniswap?w=48&h=48",
    "uniswap-v2": "https://icons.llamao.fi/icons/protocols/uniswap-v2?w=48&h=48",
    "uniswap-v3": "https://icons.llamao.fi/icons/protocols/uniswap-v3?w=48&h=48",
    sushiswap: "https://icons.llamao.fi/icons/protocols/sushi?w=48&h=48",
    pancakeswap: "https://icons.llamao.fi/icons/protocols/pancakeswap?w=48&h=48",
    curve: "https://icons.llamao.fi/icons/protocols/curve?w=48&h=48",
    aave: "https://icons.llamao.fi/icons/protocols/aave?w=48&h=48",
    compound: "https://icons.llamao.fi/icons/protocols/compound?w=48&h=48",
    maker: "https://icons.llamao.fi/icons/protocols/makerdao?w=48&h=48",
    makerdao: "https://icons.llamao.fi/icons/protocols/makerdao?w=48&h=48",
    lido: "https://icons.llamao.fi/icons/protocols/lido?w=48&h=48",
    opensea: "https://icons.llamao.fi/icons/protocols/opensea?w=48&h=48",
    blur: "https://icons.llamao.fi/icons/protocols/blur?w=48&h=48",
    "1inch": "https://icons.llamao.fi/icons/protocols/1inch-network?w=48&h=48",
    balancer: "https://icons.llamao.fi/icons/protocols/balancer?w=48&h=48",
    dydx: "https://icons.llamao.fi/icons/protocols/dydx?w=48&h=48",
    gmx: "https://icons.llamao.fi/icons/protocols/gmx?w=48&h=48",
    "tornado-cash": "https://icons.llamao.fi/icons/protocols/tornado-cash?w=48&h=48",
    tornadocash: "https://icons.llamao.fi/icons/protocols/tornado-cash?w=48&h=48",
  };
  if (knownIcons[slug]) return knownIcons[slug];
  // Fallback: try DefiLlama icons CDN
  return `https://icons.llamao.fi/icons/protocols/${slug}?w=48&h=48`;
}

/** Native chain symbol to chain-icon mapping for SVG node rendering */
export function getMSNativeTokenChainIcon(symbol: string): string | null {
  const map: Record<string, string> = {
    eth: "/chain-icons/ethereum.png",
    ether: "/chain-icons/ethereum.png",
    bnb: "/chain-icons/bsc.png",
    matic: "/chain-icons/polygon.png",
    avax: "/chain-icons/avalanche.png",
    ftm: "/chain-icons/fantom.png",
    cro: "/chain-icons/cronos.png",
    sol: "/chain-icons/solana.png",
    trx: "/chain-icons/tron.png",
    one: "/chain-icons/harmony.png",
    atom: "/chain-icons/cosmos.png",
    dot: "/chain-icons/polkadot.png",
    near: "/chain-icons/near.png",
    sui: "/chain-icons/sui.png",
    apt: "/chain-icons/aptos.png",
    sei: "/chain-icons/sei.png",
  };
  return map[symbol.toLowerCase()] ?? null;
}

/* ────────────────────────────── CHAIN CIRCLE BACKGROUND COLORS ────────────────────────────── */

/** Circular background color behind the chain icon inside nodes (CWTracker parity) */
export const MS_CHAIN_BG_COLOR: Record<string, string> = {
  ethereum: "#627EEA",
  eth: "#627EEA",
  bsc: "#F3BA30",
  binance: "#F3BA30",
  polygon: "#8247E5",
  avalanche: "#E84142",
  avax: "#E84142",
  arbitrum: "#28A0F0",
  optimism: "#FF0420",
  fantom: "#1969FF",
  cronos: "#002D74",
  solana: "#9945FF",
  base: "#0052FF",
  linea: "#61DFFF",
  zksync: "#4E529A",
  scroll: "#FFEEDA",
  blast: "#FCFC03",
  manta: "#000000",
  mantle: "#000000",
  celo: "#FCFF52",
  gnosis: "#04795B",
  moonbeam: "#53CBC8",
  aurora: "#78D64B",
  harmony: "#00ADE8",
  tron: "#FF0013",
  near: "#000000",
  cosmos: "#2E3148",
  polkadot: "#E6007A",
  sui: "#6FBCF0",
  aptos: "#000000",
  sei: "#9B1C2E",
  starknet: "#627EEA",
};

export function getMSChainBgColor(chain: string | undefined | null): string {
  if (!chain) return "#627EEA";
  const key = chain.toLowerCase().replace(/[\s-_]/g, "");
  return MS_CHAIN_BG_COLOR[key] ?? "#627EEA";
}

/* ────────────────────────────── BLOCK EXPLORER URLs ────────────────────────────── */

const BLOCK_EXPLORER_MAP: Record<string, string> = {
  ethereum: "https://etherscan.io/address/",
  bsc: "https://bscscan.com/address/",
  polygon: "https://polygonscan.com/address/",
  avalanche: "https://snowtrace.io/address/",
  arbitrum: "https://arbiscan.io/address/",
  optimism: "https://optimistic.etherscan.io/address/",
  fantom: "https://ftmscan.com/address/",
  cronos: "https://cronoscan.com/address/",
  base: "https://basescan.org/address/",
  linea: "https://lineascan.build/address/",
  zksync: "https://explorer.zksync.io/address/",
  scroll: "https://scrollscan.com/address/",
  blast: "https://blastscan.io/address/",
  gnosis: "https://gnosisscan.io/address/",
  moonbeam: "https://moonscan.io/address/",
  celo: "https://celoscan.io/address/",
  solana: "https://solscan.io/account/",
  tron: "https://tronscan.org/#/address/",
  near: "https://nearblocks.io/address/",
};

export function getBlockExplorerUrl(chain: string | undefined | null, address: string): string {
  const key = (chain || "ethereum").toLowerCase().replace(/[\s-_]/g, "");
  const base = BLOCK_EXPLORER_MAP[key] ?? BLOCK_EXPLORER_MAP.ethereum;
  return `${base}${address}`;
}

/** Get entity type icon emoji (legacy — prefer getMSEntityIconClass) */
export function getMSEntityIcon(type: MSEntityType): string {
  const map: Record<MSEntityType, string> = {
    exchange: "🏦",
    wallet: "👛",
    contract: "📄",
    token: "🪙",
    defi: "🔄",
    bridge: "🌉",
    mixer: "🌀",
    sanctioned: "⚠️",
    nft: "🎨",
    mev_bot: "🤖",
    dao: "🏛️",
    treasury: "💎",
    unknown: "❓",
  };
  return map[type] ?? "❓";
}

/**
 * CWTracker iconfont class for entity type.
 * Use inside <i className={`iconfont ${getMSEntityIconClass(type)}`} />
 */
/** Human-readable label for entity type (CWTracker-parity) */
export function getMSEntityTypeLabel(type: MSEntityType): string {
  return MS_ENTITY_TYPE_LABELS[type] ?? "Unknown";
}

export function getMSEntityIconClass(type: MSEntityType): string {
  const map: Record<MSEntityType, string> = {
    exchange: "icon-a-Exchange",
    wallet: "icon-a-Wallet1",
    contract: "icon-a-Contract",
    token: "icon-a-tokendefault",
    defi: "icon-swap",
    bridge: "icon-a-Bridge",
    mixer: "icon-a-Mixer",
    sanctioned: "icon-a-HighRisk",
    nft: "icon-a-NFTTrader",
    mev_bot: "icon-a-MEVBot",
    dao: "icon-a-DAO",
    treasury: "icon-a-Treasury",
    unknown: "icon-unknown",
  };
  return map[type] ?? "icon-unknown";
}

/** Normalize address key for deduplication */
export function normalizeAddressKey(address: string, chain: string): string {
  return `${chain.toLowerCase()}:${address.toLowerCase()}`;
}
