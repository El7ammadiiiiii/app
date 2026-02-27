/**
 * Tracer Types & Constants
 * Matches cways-tracker Tracer architecture 1:1
 * Grid-based layout with rectangular nodes (280×70)
 */

/* ─────────── Layout Constants (from cways-tracker bundle) ─────────── */

export const TRACER_CONSTANTS = {
  /** Grid slice width for flow grouping */
  sliceWidth: 80,
  /** Horizontal stretch factor between columns */
  stretchX: 5,
  /** Vertical stretch factor between rows */
  stretchY: 8,
  /** Initial X shift offset */
  xShift: 200,
  /** Initial Y shift offset */
  yShift: 400,
  /** Horizontal spacing between nodes */
  xSpacing: 20,
  /** Vertical spacing between nodes */
  ySpacing: 20,
  /** Node rectangle width */
  nodeWidth: 260,
  /** Node rectangle height */
  nodeHeight: 80,
  /** Node corner radius */
  cornerRadius: 8,
  /** Auto-populate interval in ms */
  populateInterval: 10_000,
  /** Maximum concurrent fetches */
  fetchMax: 8,
  /** Default zoom scale */
  defaultZoom: 1,
  /** Min zoom */
  minZoom: 0.05,
  /** Max zoom */
  maxZoom: 3,
  /** Edge label font size */
  edgeLabelFontSize: 11,
  /** Node label font size */
  nodeLabelFontSize: 13,
  /** Node sublabel font size */
  nodeSubLabelFontSize: 10,
  /** Entity icon size inside node */
  entityIconSize: 32,
  /** Chain icon size inside node */
  chainIconSize: 16,
  /** Hover button size */
  hoverButtonSize: 30,
  /** Hover button gap */
  hoverButtonGap: 8,
  /** Flow panel width (em) */
  flowPanelWidth: 50,
  /** Flow panel height (em) */
  flowPanelHeight: 50,
} as const;

/* ─────────── Color Palette (cways-tracker dark theme) ─────────── */

export const TRACER_COLORS = {
  // Background
  bgPrimary: '#0b1120',
  bgSecondary: '#111827',
  bgSidebar: '#0f172a',
  bgNode: 'transparent',
  bgNodeHover: 'rgba(51,65,85,0.15)',
  bgNodeSelected: 'transparent',

  // Borders
  borderDefault: '#334155',
  borderHover: '#60a5fa',
  borderSelected: 'rgba(255,255,255,0.7)',

  // Text
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  textLink: '#60a5fa',

  // Entity type colors
  entityExchange: '#3b82f6',
  entityProtocol: '#8b5cf6',
  entityExploiter: '#ef4444',
  entityBridge: '#f97316',
  entityInstitution: '#06b6d4',
  entityLending: '#10b981',
  entityDex: '#22c55e',
  entityToken: '#fbbf24',
  entitySystem: '#6b7280',
  entityWallet: '#64748b',
  entityUnknown: '#475569',

  // Edge / Flow colors
  edgeLine: '#475569',
  edgePositive: '#22c55e',
  edgeNegative: '#ef4444',
  edgeNeutral: '#64748b',

  // Direction colors (cways-tracker style)
  flowIn: '#22c55e',
  flowOut: '#ef4444',
  flowBoth: '#f59e0b',

  // Hover / Interactive
  hoverBg: 'rgba(59, 130, 246, 0.15)',
  selectedBg: 'rgba(59, 130, 246, 0.25)',

  // Watermark
  watermark: 'rgba(100, 116, 139, 0.15)',
} as const;

/* ─────────── Node & Edge Data Types ─────────── */

export interface TraceNode {
  /** Unique node ID (address or entity ID) */
  id: string;
  /** Display label (entity name or shortened address) */
  label: string;
  /** Sub-label (chain name or address) */
  subLabel?: string;
  /** Entity type classification */
  type: EntityType;
  /** Full blockchain address */
  address: string;
  /** Chain UID (e.g. 'ethereum', 'bitcoin') */
  chain: string;
  /** Entity ID if known */
  entityId?: string;
  /** Entity icon URL */
  iconUrl?: string;
  /** Chain icon URL */
  chainIconUrl?: string;
  /** Grid position X (column) */
  gridX: number;
  /** Grid position Y (row) */
  gridY: number;
  /** Computed pixel X */
  x: number;
  /** Computed pixel Y */
  y: number;
  /** Whether this is the root/origin node */
  isRoot: boolean;
  /** Whether node is currently selected */
  isSelected: boolean;
  /** Whether node is expanded */
  isExpanded: boolean;
  /** Whether node is loading data */
  isLoading: boolean;
  /** Balance data */
  balance?: {
    total: number;
    currency: string;
    formatted: string;
  };
  /** Number of flows in */
  flowsIn: number;
  /** Number of flows out */
  flowsOut: number;
}

export interface TraceEdge {
  /** Unique edge ID */
  id: string;
  /** Source node ID */
  source: string;
  /** Target node ID */
  target: string;
  /** Chain UID */
  chain: string;
  /** Transfer direction */
  direction: 'in' | 'out';
  /** Is this a curve (multiple edges between same pair) */
  isCurve: boolean;
  /** Curve offset for parallel edges */
  curveOffset: number;
  /** Total value transferred */
  totalValue: number;
  /** Formatted value label */
  valueLabel: string;
  /** Token symbol */
  tokenSymbol?: string;
  /** Token contract address */
  tokenContract?: string;
  /** Number of individual transfers */
  transferCount: number;
  /** Edge color */
  color: string;
  /** Whether edge is highlighted */
  isHighlighted: boolean;
}

export interface TraceFlow {
  /** Flow ID */
  id: string;
  /** Source node */
  source: string;
  /** Target node */
  target: string;
  /** Source label */
  sourceLabel: string;
  /** Target label */
  targetLabel: string;
  /** Flow amount */
  amount: number;
  /** Formatted amount */
  amountFormatted: string;
  /** Token symbol */
  tokenSymbol: string;
  /** Chain */
  chain: string;
  /** Time of flow */
  timestamp: number;
  /** Transaction hash */
  txHash?: string;
}

/* ─────────── Entity Types ─────────── */

export type EntityType =
  | 'exchange'
  | 'protocol'
  | 'exploiter'
  | 'bridge'
  | 'institution'
  | 'lending'
  | 'dex'
  | 'token'
  | 'system'
  | 'wallet'
  | 'unknown';

export const ENTITY_TYPE_COLORS: Record<EntityType, string> = {
  exchange: TRACER_COLORS.entityExchange,
  protocol: TRACER_COLORS.entityProtocol,
  exploiter: TRACER_COLORS.entityExploiter,
  bridge: TRACER_COLORS.entityBridge,
  institution: TRACER_COLORS.entityInstitution,
  lending: TRACER_COLORS.entityLending,
  dex: TRACER_COLORS.entityDex,
  token: TRACER_COLORS.entityToken,
  system: TRACER_COLORS.entitySystem,
  wallet: TRACER_COLORS.entityWallet,
  unknown: TRACER_COLORS.entityUnknown,
};

/* ─────────── Display Options ─────────── */

export interface GraphDisplayOptions {
  /** Show USD values on edges */
  showValues: boolean;
  /** Show token symbols on edges */
  showTokens: boolean;
  /** Show entity labels on nodes */
  showLabels: boolean;
  /** Show chain icons on nodes */
  showChainIcons: boolean;
  /** Show balance labels */
  showBalances: boolean;
  /** Show flow direction arrows */
  showArrows: boolean;
  /** Auto-populate new transfers */
  autoPopulate: boolean;
  /** Edge thickness mode */
  edgeThickness: 'uniform' | 'proportional';
  /** Layout mode */
  layoutMode: 'grid' | 'force';
}

export const DEFAULT_DISPLAY_OPTIONS: GraphDisplayOptions = {
  showValues: true,
  showTokens: true,
  showLabels: true,
  showChainIcons: true,
  showBalances: false,
  showArrows: true,
  autoPopulate: true,
  edgeThickness: 'proportional',
  layoutMode: 'grid',
};

/* ─────────── Global Filter ─────────── */

export interface GlobalFilter {
  /** Filter by chain */
  chains: string[];
  /** Filter by entity type */
  entityTypes: EntityType[];
  /** Filter by direction */
  direction: 'in' | 'out' | 'both';
  /** Minimum value filter */
  minValue?: number;
  /** Maximum value filter */
  maxValue?: number;
  /** Time range start (unix ms) */
  timeFrom?: number;
  /** Time range end (unix ms) */
  timeTo?: number;
  /** Search query */
  searchQuery?: string;
}

export const DEFAULT_GLOBAL_FILTER: GlobalFilter = {
  chains: [],
  entityTypes: [],
  direction: 'both',
};

/* ─────────── Trace Object (persisted) ─────────── */

export interface TraceObject {
  /** Unique trace UUID */
  uuid: string;
  /** Trace title/label */
  title: string;
  /** Root address that started the trace */
  rootAddress: string;
  /** Root chain */
  rootChain: string;
  /** Created at (unix ms) */
  createdAt: number;
  /** Updated at (unix ms) */
  updatedAt: number;
  /** All nodes in the trace */
  nodes: TraceNode[];
  /** All edges in the trace */
  edges: TraceEdge[];
  /** Display options */
  displayOptions: GraphDisplayOptions;
  /** Global filter */
  filter: GlobalFilter;
  /** Whether this trace is shareable */
  isShareable: boolean;
  /** User who created the trace */
  userId?: string;
  /** Undo history */
  undoStack: TraceSnapshot[];
  /** Redo history (after undo) */
  redoStack: TraceSnapshot[];
}

export interface TraceSnapshot {
  nodes: TraceNode[];
  edges: TraceEdge[];
  timestamp: number;
}

/* ─────────── Sidebar Tab Type ─────────── */

export type SidebarTab = 'inputs' | 'analysis' | 'flows' | 'settings';

/* ─────────── Populate API Types (cways-tracker style) ─────────── */

export interface PopulateRequest {
  uuid: string;
  addresses: string[];
  chains: string[];
  direction: 'in' | 'out' | 'both';
  since?: number;
}

export interface PopulateResponse {
  success: boolean;
  data?: {
    uuid: string;
    newNodes: TraceNode[];
    newEdges: TraceEdge[];
    updatedNodes?: TraceNode[];
    stats: {
      fetched: number;
      newTransfers: number;
    };
  };
  error?: { message: string };
}

/* ─────────── Intelligence API Types ─────────── */

export interface AddressIntelligence {
  address: string;
  chain: string;
  entityId?: string;
  entityName?: string;
  entityType?: EntityType;
  entityIconUrl?: string;
  labels: string[];
  tags: string[];
  balance?: {
    totalUsd: number;
    tokens: Array<{
      symbol: string;
      amount: number;
      valueUsd: number;
    }>;
  };
  activity?: {
    firstSeen: number;
    lastSeen: number;
    totalTxCount: number;
  };
}

export interface IntelligenceSearchResult {
  id: string;
  name: string;
  type: EntityType;
  iconUrl?: string;
  addresses: Array<{
    address: string;
    chain: string;
  }>;
}

/* ─────────── Grid Layout Helpers ─────────── */

/**
 * Convert grid position to pixel position (cways-tracker algorithm)
 */
export function gridToPixel(
  gridX: number,
  gridY: number,
): { x: number; y: number } {
  const { stretchX, stretchY, xShift, yShift, xSpacing, ySpacing, nodeWidth, nodeHeight } = TRACER_CONSTANTS;

  const x = xShift + gridX * (nodeWidth + xSpacing) * stretchX;
  const y = yShift + gridY * (nodeHeight + ySpacing) * stretchY;

  return { x, y };
}

/**
 * Assign grid positions to nodes based on flow direction
 * Root node at center, outgoing to right, incoming to left
 */
export function assignGridPositions(
  nodes: TraceNode[],
  edges: TraceEdge[],
  rootId: string,
): TraceNode[] {
  const rootNode = nodes.find(n => n.id === rootId);
  if (!rootNode) return nodes;

  // Build adjacency
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();

  for (const edge of edges) {
    if (!outgoing.has(edge.source)) outgoing.set(edge.source, []);
    outgoing.get(edge.source)!.push(edge.target);
    if (!incoming.has(edge.target)) incoming.set(edge.target, []);
    incoming.get(edge.target)!.push(edge.source);
  }

  // BFS from root, assign columns
  const visited = new Set<string>();
  const queue: Array<{ id: string; col: number }> = [{ id: rootId, col: 0 }];
  const positions = new Map<string, { gridX: number; gridY: number }>();
  const columnCounts = new Map<number, number>();

  visited.add(rootId);

  while (queue.length > 0) {
    const { id, col } = queue.shift()!;
    const row = columnCounts.get(col) ?? 0;
    columnCounts.set(col, row + 1);
    positions.set(id, { gridX: col, gridY: row });

    // Outgoing → right columns
    for (const target of outgoing.get(id) ?? []) {
      if (!visited.has(target)) {
        visited.add(target);
        queue.push({ id: target, col: col + 1 });
      }
    }

    // Incoming → left columns
    for (const source of incoming.get(id) ?? []) {
      if (!visited.has(source)) {
        visited.add(source);
        queue.push({ id: source, col: col - 1 });
      }
    }
  }

  // Apply positions
  return nodes.map(node => {
    const pos = positions.get(node.id);
    if (pos) {
      const pixel = gridToPixel(pos.gridX, pos.gridY);
      return { ...node, gridX: pos.gridX, gridY: pos.gridY, x: pixel.x, y: pixel.y };
    }
    return node;
  });
}

/**
 * Shorten an address for display
 */
export function shortenAddress(addr: string, chars = 6): string {
  if (!addr || addr.length < chars * 2 + 2) return addr;
  return `${addr.slice(0, chars)}...${addr.slice(-4)}`;
}

/**
 * Format a value for display (e.g. 1234567 → "1.23M")
 */
export function formatValue(value: number, currency = 'USD'): string {
  if (value === 0) return '$0';

  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(2)}K`;
  if (abs >= 1) return `${sign}$${abs.toFixed(2)}`;
  return `${sign}$${abs.toFixed(4)}`;
}

/**
 * Get entity color by type
 */
export function getEntityColor(type: EntityType): string {
  return ENTITY_TYPE_COLORS[type] ?? TRACER_COLORS.entityUnknown;
}

/** Map chainUid (e.g. 'eip155:100') to the icon filename we ship */
const CHAIN_ICON_MAP: Record<string, string> = {
  'ethereum': 'ethereum',
  'eip155:1': 'ethereum',
  'bitcoin': 'bitcoin',
  'bip122:000000000019d6689c085ae165831e93': 'bitcoin',
  'solana': 'solana',
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': 'solana',
  'tron': 'tron',
  'bsc': 'bsc',
  'eip155:56': 'bsc',
  'polygon': 'polygon',
  'eip155:137': 'polygon',
  'arbitrum': 'arbitrum_one',
  'eip155:42161': 'arbitrum_one',
  'optimism': 'optimism',
  'eip155:10': 'optimism',
  'avalanche': 'avalanche',
  'eip155:43114': 'avalanche',
  'base': 'base',
  'eip155:8453': 'base',
  'ton': 'ton',
  'dogecoin': 'dogecoin',
  'zcash': 'zcash',
  // non-evm prefixed chains
  'non-evm:tron': 'tron',
  'non-evm:bitcoin': 'bitcoin',
  'non-evm:solana': 'solana',
  'non-evm:ton': 'ton',
  'non-evm:dogecoin': 'dogecoin',
  'non-evm:zcash': 'zcash',
  'flare': 'flare',
  'eip155:14': 'flare',
  'mantle': 'mantle',
  'eip155:5000': 'mantle',
  'sonic': 'sonic',
  'eip155:100': 'ethereum',  // Gnosis — fallback to ethereum icon
};

/**
 * Get chain icon URL
 */
export function getChainIconUrl(chainUid: string): string {
  const mapped = CHAIN_ICON_MAP[chainUid];
  if (mapped) return `/icons/chains/${mapped}.png`;
  // Fallback: strip known prefixes, then clean
  let simple = chainUid
    .replace(/^non-evm:/i, '')   // strip non-evm: prefix
    .replace(/^eip155:\d+$/i, '') // strip full eip155:N match
    .replace(/^eip155:/i, '')     // strip eip155: prefix
    .replace(/[^a-zA-Z0-9_-]/g, '');
  return simple ? `/icons/chains/${simple}.png` : `/icons/chains/ethereum.png`;
}

/**
 * Get entity icon URL
 */
export function getEntityIconUrl(entityId: string): string {
  return `/icons/entities/${entityId}.png`;
}
