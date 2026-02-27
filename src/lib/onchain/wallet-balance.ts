/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  Wallet Balance — Multi-chain balance via CCWAYS Gateway      ║
 * ║  Supports 93+ chains through unified /api/ccways/balance      ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

/* ────────────────────────────── PUBLIC API ────────────────────────────── */

export interface WalletBalanceResult {
  address: string;
  chain: string;
  balanceUSD: number;
  balanceNative: number;
  nativeSymbol: string;
  priceUSD: number;
  timestamp: number;
}

/**
 * Fetch wallet balance in USD for a given address.
 * Uses the CCWAYS Gateway which aggregates across 93+ chains.
 */
export async function fetchWalletBalance(
  address: string,
  chain: string
): Promise<WalletBalanceResult> {
  try {
    const res = await fetch(`/api/ccways/balance/${address}`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`CCWAYS balance ${res.status}`);
    const data = await res.json();

    if (!data.success) {
      return _emptyResult(address, chain);
    }

    // Try to find the specific chain balance
    const chainBal = data.chainBalances?.[chain.toLowerCase()];
    const chainUSD = chainBal?.usd ?? 0;

    return {
      address,
      chain,
      balanceUSD: chainUSD || data.totalUSD || 0,
      balanceNative: 0,  // CCWAYS returns USD aggregated
      nativeSymbol: "",
      priceUSD: 0,
      timestamp: Date.now(),
    };
  } catch (err) {
    console.warn("[Balance] fetch failed:", err);
    return _emptyResult(address, chain);
  }
}

function _emptyResult(address: string, chain: string): WalletBalanceResult {
  return {
    address,
    chain,
    balanceUSD: 0,
    balanceNative: 0,
    nativeSymbol: "",
    priceUSD: 0,
    timestamp: Date.now(),
  };
}

/**
 * Batch-fetch balances — now a single CCWAYS call per unique address.
 */
export async function fetchBatchBalances(
  addresses: { address: string; chain: string }[]
): Promise<WalletBalanceResult[]> {
  // Deduplicate by address
  const unique = new Map<string, string>();
  for (const { address, chain } of addresses) {
    if (!unique.has(address)) unique.set(address, chain);
  }

  const results: WalletBalanceResult[] = [];
  const entries = Array.from(unique.entries());
  const batchSize = 3;

  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(([address, chain]) => fetchWalletBalance(address, chain))
    );
    for (const r of batchResults) {
      if (r.status === "fulfilled") results.push(r.value);
    }
    if (i + batchSize < entries.length) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  return results;
}

/**
 * Format balance for display with proper units
 */
export function formatBalanceUSD(balanceUSD: number): string {
  if (balanceUSD === 0) return "$0.00";
  if (balanceUSD >= 1e9) return `$${(balanceUSD / 1e9).toFixed(2)}B`;
  if (balanceUSD >= 1e6) return `$${(balanceUSD / 1e6).toFixed(2)}M`;
  if (balanceUSD >= 1e3) return `$${(balanceUSD / 1e3).toFixed(2)}K`;
  if (balanceUSD >= 1) return `$${balanceUSD.toFixed(2)}`;
  return `$${balanceUSD.toFixed(4)}`;
}
