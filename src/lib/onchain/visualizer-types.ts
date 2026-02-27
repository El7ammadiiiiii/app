/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  Visualizer Types, Constants & Graph Algorithms                 ║
 * ║  cways-tracker Visualizer type definitions                       ║
 * ║  Adapted for CCWAYS multi-chain (78 chains, 310+ entities)     ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

/* ═══════════════════════ Canvas Constants ═══════════════════════ */

export const VIZ_CANVAS = {
  /** Off-screen canvas for node image prep */
  size: 1024,
  /** Stroke width for ring & badges */
  lineWidth: 32,
  /** Node draw size on graph (width × height) */
  nodeSize: 10,
  /** Token mode min nodeVal */
  tokenNodeMin: 10,
  /** Token mode max nodeVal delta */
  tokenNodeMax: 290,
  /** Initial camera zoom */
  initialZoom: 4,
  /** D3 simulation cooldown ticks */
  cooldownTicks: 100,
  /** Slow alpha decay for token mode (smoother settling) */
  alphaDecay: 0.01,
  /** IBM Plex Mono fallback text size on canvas */
  fallbackFontSize: 192,
  /** Max characters before truncation */
  maxLabelChars: 8,
} as const;

/* ═══════════════════════ Force Constants ════════════════════════ */

export const VIZ_FORCES = {
  /** X target for base-node center pull */
  baseCenterStrength: 0.5,
  /** Inflow X target (negative = left) */
  inflowX: -500,
  /** Outflow X target (positive = right) */
  outflowX: 500,
  /** Directional strength factor */
  flowStrength: 0.06,
  /** Token mode link strength */
  linkStrength: 0.1,
  /** Token mode center multiplier */
  tokenCenterMultiplier: 5,
  /** Token mode center base strength */
  tokenCenterBase: 0.05,
  /** Token mode charge multiplier */
  tokenChargeMultiplier: 10,
  /** Token mode charge base */
  tokenChargeBase: 4,
} as const;

/* ═══════════════════════ Entity Colors (cways-tracker palette) ═════════ */

export const ENTITY_TYPE_COLORS: Record<string, string | undefined> = {
  cex: '#E90600',
  deposit: '#FFE339',
  individual: '#2D00B4',
  fund: '#2D00B4',
  'fund-decentralized': '#2D00B4',
  dex: '#46FF34',
  'dex-aggregator': '#46FF34',
  options: '#46FF34',
  derivatives: '#46FF34',
  'lending-centralized': '#60FFC9',
  'lending-decentralized': '#60FFC9',
  cdp: '#60FFC9',
  nft: '#FF00E9',
  'nft-marketplace': '#FF00E9',
  misc: '#42444B',
  uncategorized: undefined,
};

/* ═══════════════════════ Legend Categories ══════════════════════ */

export interface LegendCategory {
  name: string;
  types: string[];
}

export const LEGEND_CATEGORIES: LegendCategory[] = [
  { name: 'Centralized Exchanges', types: ['cex'] },
  { name: 'Deposit Addresses', types: ['deposit'] },
  { name: 'Individuals & Funds', types: ['individual', 'fund', 'fund-decentralized'] },
  { name: 'Decentralized Exchanges', types: ['dex', 'dex-aggregator', 'options', 'derivatives'] },
  { name: 'Lending', types: ['lending-centralized', 'lending-decentralized', 'cdp'] },
  { name: 'NFT', types: ['nft', 'nft-marketplace'] },
  { name: 'Misc', types: ['misc'] },
  { name: 'Uncategorized', types: ['uncategorized'] },
  { name: 'All', types: Object.keys(ENTITY_TYPE_COLORS) },
];

/* ═══════════════════════ Control Modes ══════════════════════════ */

export type ControlMode = 'default' | 'expand' | 'add' | 'remove' | 'fix';

export interface ModeConfig {
  icon: string | null;
  unactIcon?: string;
  label: string;
  key: string;
}

export const CONTROL_MODES: ControlMode[] = ['default', 'expand', 'add', 'remove', 'fix'];
export const TOKEN_CONTROL_MODES: ControlMode[] = ['default', 'expand', 'fix'];

export const MODE_CONFIG: Record<ControlMode, ModeConfig> = {
  default: {
    icon: null,
    label: 'Default (Escape)',
    key: 'Escape',
  },
  expand: {
    icon: '/icons/tracer/expandIcon.svg',
    unactIcon: '/icons/tracer/expandIcon.svg',
    label: 'Expand / Collapse (E)',
    key: 'e',
  },
  add: {
    icon: '/icons/tracer/addIcon.svg',
    label: 'Add / Remove filter (A)',
    key: 'a',
  },
  remove: {
    icon: '/icons/tracer/removeIcon.svg',
    label: 'Hide node (R)',
    key: 'r',
  },
  fix: {
    icon: '/icons/tracer/lockIconWhite.svg',
    unactIcon: '/icons/tracer/lockIconWhite.svg',
    label: 'Fix / Unfix node (F)',
    key: 'f',
  },
};

/* ═══════════════════════ Flow Direction ═════════════════════════ */

export type FlowDirection = 'all' | 'in' | 'out' | 'self';

/* ═══════════════════════ Address Object ═════════════════════════ */

export interface AddressObj {
  address: string;
  chain?: string;
  isUserAddress?: boolean;
  isShielded?: boolean;
  contract?: boolean;
  knownEntity?: EntityObj;
  knownLabel?: { name: string; address: string; chainType?: string };
  userEntity?: EntityObj;
  predictedEntity?: EntityObj;
  depositServiceID?: string;
}

export interface EntityObj {
  id: string;
  name: string;
  type?: string;
  note?: string;
  service?: string;
  website?: string;
  twitter?: string;
  addresses?: Array<{ address: string; chain: string }>;
}

/* ═══════════════════════ Transfer Types ═════════════════════════ */

export interface EVMTransfer {
  id: string;
  transactionHash: string;
  fromAddress: AddressObj;
  toAddress: AddressObj;
  tokenAddress?: string;
  tokenName?: string;
  tokenSymbol?: string;
  tokenDecimals?: number;
  unitValue?: number;
  tokenId?: string;
  historicalUSD: number;
  chain: string;
  blockTimestamp: string;
  blockNumber?: number;
  blockHash?: string;
  type?: string;
  fromIsContract?: boolean;
  toIsContract?: boolean;
}

export interface TokenHolder {
  address: AddressObj;
  balance: number;
  usd: number;
}

export type Transfer = EVMTransfer;

/* ═══════════════════════ Graph Node & Link ══════════════════════ */

export interface VizNode {
  id: string;
  isBase: boolean;
  x?: number;
  y?: number;
  fx?: number | undefined;
  fy?: number | undefined;
  /** Runtime cache field for force-graph */
  vx?: number;
  vy?: number;
}

export interface VizLink {
  source: string | VizNode;
  target: string | VizNode;
  tx: Transfer;
  curvature: number;
  usd: number;
}

export interface GraphData {
  nodes: VizNode[];
  links: VizLink[];
}

/* ═══════════════════════ Entity Filter State ════════════════════ */

export interface TransferFilter {
  flow?: FlowDirection;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  usdGte?: number;
  usdLte?: number;
  timeGte?: number;
  timeLte?: number;
  timeLast?: string;
  chains?: string[];
  tokens?: string[];
  from?: string[];
  to?: string[];
  base?: string[];
}

export interface EntityVisualizerState {
  filter: TransferFilter;
  base: string[];
  manuallyFixed: Record<string, { fx: number; fy: number }>;
}

export interface TokenVisualizerState {
  filter: TransferFilter;
  holders: TokenHolder[];
  manuallyFixed: Record<string, { fx: number; fy: number }>;
}

/* ═══════════════════════ Hidden Entity Types ════════════════════ */

export type HiddenTypes = Record<string, boolean>;

/* ═══════════════════════ Info Panel Object ══════════════════════ */

export type InfoObject = Transfer | HolderInfo | null;

export interface HolderInfo {
  holder: TokenHolder & { entity?: EntityObj };
  addresses: string[];
}

/* ═══════════════════════ Helper: Get Entity Type ════════════════ */

export function getEntityType(
  id: string,
  addresses: Map<string, AddressObj>,
  entities: Map<string, EntityObj>,
): string {
  const addr = addresses.get(id);
  const entity = entities.get(id);
  const resolved = addr?.knownEntity ?? entity;
  if (resolved) {
    const type = resolved.type ?? 'uncategorized';
    return type in ENTITY_TYPE_COLORS ? type : 'misc';
  }
  return 'uncategorized';
}

/* ═══════════════════════ Helper: Resolve Node ID ════════════════ */

export function resolveNodeId(
  addr: AddressObj,
  expandedEntities: Record<string, boolean>,
  hasUser: boolean,
): string {
  if (hasUser && addr.isUserAddress) return 'user';
  const entityId = addr.userEntity?.id || addr.knownEntity?.id;
  if (entityId && expandedEntities[entityId]) return addr.address;
  if (!addr.address || addr.isShielded) return 'shielded';
  return entityId ?? addr.address;
}

/* ═══════════════════════ Helper: Is base? ══════════════════════ */

export function isBaseAddress(addr: AddressObj, base: string[]): boolean {
  return (
    (!!addr.userEntity?.id && base.includes(addr.userEntity.id)) ||
    (!!addr.knownEntity?.id && base.includes(addr.knownEntity.id)) ||
    base.includes(addr.address) ||
    (base.includes('user') && addr.isUserAddress === true)
  );
}

/* ═══════════════════════ Build Nodes from Transfers ═════════════ */

export function buildNodes(
  transfers: Transfer[] | undefined,
  holders: TokenHolder[],
  expanded: Record<string, boolean>,
  fixed: Record<string, { fx: number; fy: number }>,
  base: string[],
): VizNode[] {
  const hasUser = base.includes('user');
  const nodeMap: Record<string, { id: string; isBase: boolean }> = {};

  transfers?.forEach((tx) => {
    const fromId = resolveNodeId(tx.fromAddress, expanded, hasUser);
    const toId = resolveNodeId(tx.toAddress, expanded, hasUser);

    // From
    if (nodeMap[fromId]) {
      nodeMap[fromId].isBase = nodeMap[fromId].isBase || isBaseAddress(tx.fromAddress, base);
    } else {
      nodeMap[fromId] = { id: fromId, isBase: isBaseAddress(tx.fromAddress, base) };
    }

    // To
    if (nodeMap[toId]) {
      nodeMap[toId].isBase = nodeMap[toId].isBase || isBaseAddress(tx.toAddress, base);
    } else {
      nodeMap[toId] = { id: toId, isBase: isBaseAddress(tx.toAddress, base) };
    }
  });

  // Add holders that might not appear in transfers
  holders.forEach((h) => {
    const id = resolveNodeId(h.address, expanded, hasUser);
    if (!nodeMap[id]) {
      nodeMap[id] = { id, isBase: isBaseAddress(h.address, base) };
    }
  });

  return Object.values(nodeMap).map((n) => {
    const saved = fixed[n.id];
    const restore = saved ? { x: saved.fx, y: saved.fy, fx: saved.fx, fy: saved.fy } : {};
    return { id: n.id, isBase: n.isBase, ...restore };
  });
}

/* ═══════════════════════ Build Links from Transfers ═════════════ */

export function buildLinks(
  transfers: Transfer[] | undefined,
  base: string[],
  expanded: Record<string, boolean>,
  addresses: Map<string, AddressObj>,
): VizLink[] {
  const hasUser = base.includes('user');
  const links: VizLink[] = [];

  transfers?.forEach((tx) => {
    const fromId = resolveNodeId(tx.fromAddress, expanded, hasUser);
    const toId = resolveNodeId(tx.toAddress, expanded, hasUser);
    links.push({
      source: fromId,
      target: toId,
      tx,
      curvature: 0,
      usd: tx.historicalUSD ?? 0,
    });
  });

  // Calculate curvature for parallel edges
  return links.map((link) => {
    const parallel = links.filter(
      (l) =>
        (linkId(l.source) === linkId(link.source) && linkId(l.target) === linkId(link.target)) ||
        (linkId(l.source) === linkId(link.target) && linkId(l.target) === linkId(link.source)),
    );
    const idx = parallel.length === 1 ? 0.5 : parallel.indexOf(link) / (parallel.length - 1);
    return {
      ...link,
      curvature: linkId(link.source) === linkId(link.target) ? 0 : (idx - 0.5) / 3.5,
    };
  });
}

function linkId(nodeOrId: string | VizNode): string {
  return typeof nodeOrId === 'string' ? nodeOrId : nodeOrId.id;
}

/* ═══════════════════════ Link Width (logarithmic USD) ═══════════ */

export function calcLinkWidth(link: VizLink): number {
  const usd = link.tx?.historicalUSD ?? 0;
  return (Math.log(1 + Math.min(usd, 1e8) / 1e4) / Math.log(10001)) * 1.75 + 0.25;
}

/* ═══════════════════════ Inflow / Outflow Counter ══════════════ */

export function countFlows(
  node: VizNode,
  links: VizLink[],
): { inflow: number; outflow: number } {
  const inflow = links.filter((l) => linkId(l.target) === node.id).length;
  const outflow = links.filter((l) => linkId(l.source) === node.id).length;
  return { inflow, outflow };
}

/* ═══════════════════════ Link Color ═════════════════════════════ */

export function getLinkColor(link: VizLink): string {
  const targetIsBase =
    typeof link.target === 'object' && 'isBase' in link.target && link.target.isBase;
  const sourceIsBase =
    typeof link.source === 'object' && 'isBase' in link.source && link.source.isBase;

  if ((targetIsBase && sourceIsBase) || (!targetIsBase && !sourceIsBase)) {
    return 'rgba(148, 163, 184, 0.4)'; // gray
  }
  return targetIsBase ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.5)'; // green/red
}

/* ═══════════════════════ Link Label (compact USD) ═══════════════ */

export function formatLinkLabel(link: VizLink): string {
  const usd = link.usd ?? 0;
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: usd > 0.005 ? 2 : undefined,
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
  }).format(usd);
}

/* ═══════════════════════ Token nodeVal ══════════════════════════ */

export function tokenNodeVal(
  node: VizNode,
  holdersMap: Record<string, { balance: number; usd: number }>,
  totalBalance: number,
): number {
  const balance = holdersMap[node.id]?.balance ?? 0;
  if (balance === 0) return VIZ_CANVAS.tokenNodeMin;
  return VIZ_CANVAS.tokenNodeMin + (balance / totalBalance) * VIZ_CANVAS.tokenNodeMax;
}

/* ═══════════════════════ Extract Addresses & Entities ═══════════ */

export function extractAddressesAndEntities(
  transfers: Transfer[] | undefined,
  holders: TokenHolder[],
): { addresses: Map<string, AddressObj>; entities: Map<string, EntityObj> } {
  const addresses = new Map<string, AddressObj>();
  const entities = new Map<string, EntityObj>();

  transfers?.forEach((tx) => {
    addresses.set(tx.fromAddress.address, tx.fromAddress);
    addresses.set(tx.toAddress.address, tx.toAddress);
    if (tx.fromAddress.userEntity) entities.set(tx.fromAddress.userEntity.id, tx.fromAddress.userEntity);
    if (tx.toAddress.userEntity) entities.set(tx.toAddress.userEntity.id, tx.toAddress.userEntity);
    if (tx.fromAddress.knownEntity) entities.set(tx.fromAddress.knownEntity.id, tx.fromAddress.knownEntity);
    if (tx.toAddress.knownEntity) entities.set(tx.toAddress.knownEntity.id, tx.toAddress.knownEntity);
  });

  holders.forEach((h) => {
    addresses.set(h.address.address, h.address);
    if (h.address.userEntity) entities.set(h.address.userEntity.id, h.address.userEntity);
    if (h.address.knownEntity) entities.set(h.address.knownEntity.id, h.address.knownEntity);
  });

  return { addresses, entities };
}

/* ═══════════════════════ Extract Fixed Positions ════════════════ */

export function extractFixed(nodes: VizNode[]): Record<string, { fx: number; fy: number }> {
  return nodes.reduce(
    (acc, n) => {
      if (n.id && n.fx != null && n.fy != null) {
        acc[n.id] = { fx: n.fx, fy: n.fy };
      }
      return acc;
    },
    {} as Record<string, { fx: number; fy: number }>,
  );
}

/* ═══════════════════════ Visibility Filter ══════════════════════ */

export function computeVisibility(
  nodes: VizNode[],
  hidden: HiddenTypes,
  addresses: Map<string, AddressObj>,
  entities: Map<string, EntityObj>,
): Record<string, boolean> {
  return Object.fromEntries(
    nodes.map((n) => {
      const type = getEntityType(n.id, addresses, entities);
      return [n.id, !hidden[type] || n.isBase];
    }),
  );
}

/* ═══════════════════════ URL State Serializer ═══════════════════ */

export function serializeStateToUrl(obj: Record<string, unknown>): string {
  return Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(String(obj[k]))}`)
    .sort((a, b) => a.localeCompare(b))
    .join('&');
}

/* ═══════════════════════ Shorten Address ════════════════════════ */

export function shortenAddress(addr: string, chars = 4): string {
  if (addr.length <= chars * 2 + 2) return addr;
  return `${addr.slice(0, chars + 2)}…${addr.slice(-chars)}`;
}

/* ═══════════════════════ Format Address Label ══════════════════ */

export function formatNodeLabel(
  id: string,
  addresses: Map<string, AddressObj>,
  entities: Map<string, EntityObj>,
): string {
  if (id === 'user') return 'You';
  const addr = addresses.get(id);
  if (addr) {
    const entity = addr.knownEntity ?? addr.userEntity;
    if (entity) return entity.name;
    return shortenAddress(addr.address);
  }
  const entity = entities.get(id);
  if (entity) return entity.name;
  return shortenAddress(id);
}

/* ═══════════════════════ Default Filter ═════════════════════════ */

export const DEFAULT_ENTITY_FILTER: TransferFilter = {
  usdGte: 0.1,
  sortKey: 'time',
  sortDir: 'desc',
  limit: 1000,
  offset: 0,
  flow: 'all',
};

export const DEFAULT_TOKEN_FILTER: TransferFilter = {
  flow: 'all',
  sortKey: 'time',
  sortDir: 'desc',
  limit: 200,
  offset: 0,
};
