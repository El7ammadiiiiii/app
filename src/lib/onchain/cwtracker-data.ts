/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CWTRACKER Data — CSV parser → graph nodes + edges          ║
 * ║  Parses fund-flow CSV into MSNode[] + MSEdge[] structure     ║
 * ║  CSV columns: Chain, Date, Block, Hash, From, From_label,   ║
 * ║               To, To_label, Token, Token_symbol, Amount      ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import {
  type MSNode,
  type MSEdge,
  type MSEdgeDetail,
  type MSEntityType,
  msGridToPixel,
  normalizeAddressKey,
  msShortenAddress,
  msFormatTokenAmount,
} from "./cwtracker-types";

/* ────────────────────────────── CSV ROW ────────────────────────────── */

interface CSVRow {
  Chain: string;
  Date: string;
  Block: string;
  Hash: string;
  From: string;
  From_label: string;
  To: string;
  To_label: string;
  Token: string;
  Token_symbol: string;
  Amount: string;
}

/* ────────────────────────────── KNOWN LABELS → ENTITY TYPE ────────────────────────────── */

const LABEL_ENTITY_MAP: Record<string, MSEntityType> = {
  // Exchanges
  binance: "exchange",
  coinbase: "exchange",
  kraken: "exchange",
  okx: "exchange",
  bybit: "exchange",
  kucoin: "exchange",
  huobi: "exchange",
  bitfinex: "exchange",
  gemini: "exchange",
  ftx: "exchange",
  gate: "exchange",
  bitget: "exchange",
  mexc: "exchange",

  // DeFi
  uniswap: "defi",
  sushiswap: "defi",
  pancakeswap: "defi",
  curve: "defi",
  aave: "defi",
  compound: "defi",
  maker: "defi",
  lido: "defi",
  kyberswap: "defi",
  "1inch": "defi",
  balancer: "defi",
  dydx: "defi",
  synthetix: "defi",
  yearn: "defi",
  convex: "defi",

  // Bridges
  multichain: "bridge",
  stargate: "bridge",
  wormhole: "bridge",
  layerzero: "bridge",
  hop: "bridge",
  across: "bridge",
  synapse: "bridge",
  celer: "bridge",
  axelar: "bridge",

  // Mixers
  "tornado cash": "mixer",
  tornado: "mixer",
  railgun: "mixer",

  // Sanctioned
  sanctioned: "sanctioned",
  ofac: "sanctioned",

  // MEV
  mev: "mev_bot",
  flashbot: "mev_bot",

  // Others
  nft: "nft",
  opensea: "nft",
  dao: "dao",
  gnosis: "dao",
  treasury: "treasury",
};

function detectEntityType(label: string): MSEntityType {
  if (!label) return "unknown";
  const lower = label.toLowerCase();
  for (const [keyword, type] of Object.entries(LABEL_ENTITY_MAP)) {
    if (lower.includes(keyword)) return type;
  }
  // Contract heuristics
  if (lower.includes("contract") || lower.includes("proxy")) return "contract";
  if (lower.includes("deployer")) return "wallet";
  if (lower.includes("exploiter") || lower.includes("attacker")) return "wallet";
  return "wallet";
}

/** Normalize chain name from CSV */
function normalizeChain(chain: string): string {
  const map: Record<string, string> = {
    ethereum: "ethereum",
    eth: "ethereum",
    bsc: "bsc",
    "binance smart chain": "bsc",
    polygon: "polygon",
    matic: "polygon",
    avalanche: "avalanche",
    avax: "avalanche",
    arbitrum: "arbitrum",
    optimism: "optimism",
    fantom: "fantom",
    ftm: "fantom",
    base: "base",
    linea: "linea",
    zksync: "zksync",
    scroll: "scroll",
    blast: "blast",
    solana: "solana",
    tron: "tron",
    near: "near",
  };
  return map[chain.toLowerCase().trim()] ?? chain.toLowerCase().trim();
}

/* ────────────────────────────── PARSE CSV ────────────────────────────── */

/**
 * Parse CSV text and create node + edge arrays for the graph.
 * Returns root address/chain detected from the most-connected address.
 */
export function parseCSVToGraph(csvText: string): {
  nodes: MSNode[];
  edges: MSEdge[];
  rootAddress: string;
  rootChain: string;
} {
  const rows = parseCSVRows(csvText);
  if (rows.length === 0) {
    return { nodes: [], edges: [], rootAddress: "", rootChain: "" };
  }

  /* ── 1. Collect unique addresses ── */
  const addressMap = new Map<
    string,
    {
      address: string;
      chain: string;
      label: string;
      type: MSEntityType;
      flowsIn: number;
      flowsOut: number;
      txCount: number;
      firstSeen: string;
      lastSeen: string;
      tokens: Set<string>;
    }
  >();

  function getOrCreateAddress(addr: string, chain: string, label: string) {
    const key = normalizeAddressKey(addr, chain);
    if (!addressMap.has(key)) {
      addressMap.set(key, {
        address: addr,
        chain: normalizeChain(chain),
        label: label || msShortenAddress(addr),
        type: detectEntityType(label),
        flowsIn: 0,
        flowsOut: 0,
        txCount: 0,
        firstSeen: "",
        lastSeen: "",
        tokens: new Set(),
      });
    }
    const entry = addressMap.get(key)!;
    // Update label if a better one is available
    if (label && (!entry.label || entry.label.startsWith("0x"))) {
      entry.label = label;
      entry.type = detectEntityType(label);
    }
    return entry;
  }

  /* ── 2. Collect unique edges ── */
  const edgeMap = new Map<
    string,
    {
      source: string;
      target: string;
      chain: string;
      totalValue: number;
      transferCount: number;
      tokenSymbol: string;
      details: MSEdgeDetail[];
    }
  >();

  for (const row of rows) {
    const chain = normalizeChain(row.Chain);
    const amount = parseFloat(row.Amount) || 0;

    // Create/get addresses
    const from = getOrCreateAddress(row.From, chain, row.From_label);
    const to = getOrCreateAddress(row.To, chain, row.To_label);
    
    // Update flow stats
    from.flowsOut += amount;
    from.txCount += 1;
    to.flowsIn += amount;
    to.txCount += 1;

    // Update timestamps
    if (row.Date) {
      if (!from.firstSeen || row.Date < from.firstSeen) from.firstSeen = row.Date;
      if (!from.lastSeen || row.Date > from.lastSeen) from.lastSeen = row.Date;
      if (!to.firstSeen || row.Date < to.firstSeen) to.firstSeen = row.Date;
      if (!to.lastSeen || row.Date > to.lastSeen) to.lastSeen = row.Date;
    }

    // Tokens
    if (row.Token_symbol) {
      from.tokens.add(row.Token_symbol);
      to.tokens.add(row.Token_symbol);
    }

    // Edge key: from+to+chain+token (aggregate same-pair same-token)
    const edgeKey = `${normalizeAddressKey(row.From, chain)}→${normalizeAddressKey(row.To, chain)}:${row.Token_symbol || "ETH"}`;
    if (!edgeMap.has(edgeKey)) {
      edgeMap.set(edgeKey, {
        source: normalizeAddressKey(row.From, chain),
        target: normalizeAddressKey(row.To, chain),
        chain,
        totalValue: 0,
        transferCount: 0,
        tokenSymbol: row.Token_symbol || "ETH",
        details: [],
      });
    }
    const edge = edgeMap.get(edgeKey)!;
    edge.totalValue += amount;
    edge.transferCount += 1;
    edge.details.push({
      txHash: row.Hash,
      block: parseInt(row.Block) || undefined,
      timestamp: row.Date,
      value: amount,
      tokenSymbol: row.Token_symbol || "ETH",
      chain,
    });
  }

  /* ── 3. Detect root (most active address) ── */
  let rootKey = "";
  let rootScore = -1;
  for (const [key, info] of addressMap) {
    const score = info.txCount + (info.flowsOut > 0 ? 100 : 0);
    if (score > rootScore) {
      rootScore = score;
      rootKey = key;
    }
  }

  /* ── 4. Create MSNode[] ── */
  const keyToNodeId = new Map<string, string>();
  const nodes: MSNode[] = [];
  let idx = 0;

  for (const [key, info] of addressMap) {
    const nodeId = key === rootKey ? "node_root" : `node_${idx++}`;
    keyToNodeId.set(key, nodeId);

    nodes.push({
      id: nodeId,
      label: info.label,
      subLabel: msShortenAddress(info.address),
      type: info.type,
      address: info.address,
      chain: info.chain,
      gridX: 0,
      gridY: 0,
      x: 0,
      y: 0,
      isRoot: key === rootKey,
      isSelected: false,
      isExpanded: false,
      isLoading: false,
      isContract: info.type === "contract",
      isPruned: false,
      isDragging: false,
      flowsIn: info.flowsIn,
      flowsOut: info.flowsOut,
      txCount: info.txCount,
      firstSeen: info.firstSeen || undefined,
      lastSeen: info.lastSeen || undefined,
      tags: Array.from(info.tokens),
    });
  }

  /* ── 5. Create MSEdge[] ── */
  const edges: MSEdge[] = [];

  let edgeIdx = 0;
  for (const [, info] of edgeMap) {
    const sourceId = keyToNodeId.get(info.source);
    const targetId = keyToNodeId.get(info.target);
    if (!sourceId || !targetId) continue;

    // Compute latestTimestamp from details
    let latestTs: string | undefined;
    for (const d of info.details) {
      if (d.timestamp && (!latestTs || d.timestamp > latestTs)) {
        latestTs = d.timestamp;
      }
    }

    edges.push({
      id: `edge_${edgeIdx++}`,
      source: sourceId,
      target: targetId,
      chain: info.chain,
      direction: "out",
      isCurve: false,
      curveOffset: 0,
      totalValue: info.totalValue,
      valueLabel: msFormatTokenAmount(info.totalValue, info.tokenSymbol),
      tokenSymbol: info.tokenSymbol,
      transferCount: info.transferCount,
      color: "",
      isHighlighted: false,
      isSelected: false,
      details: info.details,
      isSuspicious: false,
      isCrossChain: false,
      isCustom: false,
      latestTimestamp: latestTs,
    });
  }

  // Mark cross-chain edges
  for (const e of edges) {
    const srcNode = nodes.find((n) => n.id === e.source);
    const tgtNode = nodes.find((n) => n.id === e.target);
    if (srcNode && tgtNode && srcNode.chain !== tgtNode.chain) {
      e.isCrossChain = true;
    }
  }

  const rootInfo = addressMap.get(rootKey);
  return {
    nodes,
    edges,
    rootAddress: rootInfo?.address ?? "",
    rootChain: rootInfo?.chain ?? "ethereum",
  };
}

/* ────────────────────────────── CSV PARSER ────────────────────────────── */

function parseCSVRows(text: string): CSVRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = parseCSVLine(lines[0]);
  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < header.length) continue;

    const row: Record<string, string> = {};
    for (let j = 0; j < header.length; j++) {
      row[header[j].trim()] = (values[j] ?? "").trim();
    }
    rows.push(row as unknown as CSVRow);
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

/* ────────────────────────────── GRAPH STATS ────────────────────────────── */

export interface GraphStats {
  totalNodes: number;
  totalEdges: number;
  totalVolume: number;
  uniqueChains: string[];
  uniqueTokens: string[];
  timeRange: { from: string; to: string } | null;
  topSenders: { address: string; label: string; volume: number }[];
  topReceivers: { address: string; label: string; volume: number }[];
}

export function computeGraphStats(nodes: MSNode[], edges: MSEdge[]): GraphStats {
  const chains = new Set<string>();
  const tokens = new Set<string>();
  let totalVolume = 0;
  let minDate = "",
    maxDate = "";

  for (const n of nodes) {
    chains.add(n.chain);
  }

  for (const e of edges) {
    tokens.add(e.tokenSymbol);
    totalVolume += e.totalValue;
    for (const d of e.details) {
      if (d.timestamp) {
        if (!minDate || d.timestamp < minDate) minDate = d.timestamp;
        if (!maxDate || d.timestamp > maxDate) maxDate = d.timestamp;
      }
    }
  }

  const senders = [...nodes]
    .sort((a, b) => b.flowsOut - a.flowsOut)
    .slice(0, 5)
    .map((n) => ({ address: n.address, label: n.label, volume: n.flowsOut }));

  const receivers = [...nodes]
    .sort((a, b) => b.flowsIn - a.flowsIn)
    .slice(0, 5)
    .map((n) => ({ address: n.address, label: n.label, volume: n.flowsIn }));

  return {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    totalVolume,
    uniqueChains: Array.from(chains).sort(),
    uniqueTokens: Array.from(tokens).sort(),
    timeRange: minDate ? { from: minDate, to: maxDate } : null,
    topSenders: senders,
    topReceivers: receivers,
  };
}
