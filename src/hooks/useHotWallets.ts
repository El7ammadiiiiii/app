/**
 * useHotWallets — fetch + search known hot wallet addresses
 * Data source: /data/hot-wallets.json (static, built from CSV)
 */

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";

export interface HotWallet {
  name: string;
  slug: string;
  address: string;
  label: string;
  chain: string;
}

let cachedWallets: HotWallet[] | null = null;

export function useHotWallets() {
  const [wallets, setWallets] = useState<HotWallet[]>(cachedWallets || []);
  const [loading, setLoading] = useState(!cachedWallets);

  useEffect(() => {
    if (cachedWallets) return;
    fetch("/data/hot-wallets.json")
      .then((r) => r.json())
      .then((data: HotWallet[]) => {
        cachedWallets = data;
        setWallets(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  /** Search wallets by name or address prefix (case-insensitive) */
  const search = useCallback(
    (query: string, limit = 8): HotWallet[] => {
      if (!query || query.length < 2) return [];
      const q = query.toLowerCase();
      return wallets
        .filter(
          (w) =>
            w.name.toLowerCase().includes(q) ||
            w.address.toLowerCase().startsWith(q) ||
            w.slug.toLowerCase().includes(q)
        )
        .slice(0, limit);
    },
    [wallets]
  );

  return { wallets, loading, search };
}
