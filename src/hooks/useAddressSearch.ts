/**
 * useAddressSearch — Client-side fuzzy search over pre-built address index
 * Lazy-loads /data/address-index.json on first keystroke (module-level cache)
 * Returns grouped sections matching cways-tracker's dropdown pattern
 */

import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════ Types ═══════════════════ */

export interface AddressEntry {
  n: string;  // entity name
  s: string;  // entity slug
  a: string;  // full address
  l: string;  // label
  c: string;  // category (DeFi, CeFi, etc.)
  t: string;  // tag / source
  i: number;  // has icon (1/0)
}

export interface AddressSuggestion {
  name: string;
  slug: string;
  address: string;
  label: string;
  category: string;
  tag: string;
  hasIcon: boolean;
  /** Display text: "Name (trunc)" */
  display: string;
  /** Which field matched: name, address, or label */
  matchField: "name" | "address" | "label";
}

export interface SuggestionSection {
  section: string;
  items: AddressSuggestion[];
}

/* ═══════════════════ Module-level cache ═══════════════════ */

let _cachedIndex: AddressEntry[] | null = null;
let _loadPromise: Promise<AddressEntry[]> | null = null;

async function loadIndex(): Promise<AddressEntry[]> {
  if (_cachedIndex) return _cachedIndex;
  if (_loadPromise) return _loadPromise;

  _loadPromise = fetch("/data/address-index.json")
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to load address index: ${res.status}`);
      return res.json();
    })
    .then((data: AddressEntry[]) => {
      _cachedIndex = data;
      return data;
    })
    .catch((err) => {
      console.error("[useAddressSearch] Failed to load index:", err);
      _loadPromise = null;
      return [] as AddressEntry[];
    });

  return _loadPromise;
}

/* ═══════════════════ Category config ═══════════════════ */

/** Section ordering priority (most commonly searched first) */
const SECTION_ORDER: Record<string, number> = {
  CeFi: 1,
  DeFi: 2,
  Trading: 3,
  Staking: 4,
  Custody: 5,
  "Blockchain Ops": 6,
  Illicit: 7,
  Government: 8,
  NFT: 9,
  Social: 10,
  Governance: 11,
  "Smart Contracts": 12,
  Airdrop: 13,
  Miner_Validator: 14,
  Other: 15,
};

/** Category badge colors */
export const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  CeFi: { bg: "rgba(59,130,246,0.15)", text: "#60a5fa" },
  DeFi: { bg: "rgba(20,184,166,0.15)", text: "#5eead4" },
  Trading: { bg: "rgba(16,185,129,0.15)", text: "#6ee7b7" },
  Staking: { bg: "rgba(34,211,238,0.15)", text: "#67e8f9" },
  Custody: { bg: "rgba(139,92,246,0.15)", text: "#a78bfa" },
  "Blockchain Ops": { bg: "rgba(168,85,247,0.15)", text: "#c084fc" },
  Illicit: { bg: "rgba(239,68,68,0.15)", text: "#f87171" },
  Government: { bg: "rgba(251,146,60,0.15)", text: "#fb923c" },
  NFT: { bg: "rgba(236,72,153,0.15)", text: "#f472b6" },
  Social: { bg: "rgba(167,139,250,0.15)", text: "#a78bfa" },
  Governance: { bg: "rgba(245,158,11,0.15)", text: "#fbbf24" },
  "Smart Contracts": { bg: "rgba(14,165,233,0.15)", text: "#38bdf8" },
  Airdrop: { bg: "rgba(132,204,22,0.15)", text: "#a3e635" },
  Miner_Validator: { bg: "rgba(100,116,139,0.15)", text: "#94a3b8" },
  Other: { bg: "rgba(100,116,139,0.15)", text: "#94a3b8" },
};

/* ═══════════════════ Truncate helper ═══════════════════ */

function truncAddr(addr: string): string {
  if (!addr) return "";
  // EVM
  if (addr.startsWith("0x") || addr.startsWith("0X")) {
    return addr.slice(0, 5);
  }
  // Bitcoin bech32
  if (addr.startsWith("bc1")) {
    return addr.slice(0, 5);
  }
  // Tron
  if (addr.startsWith("T") && addr.length >= 34) {
    return addr.slice(0, 5);
  }
  // Solana / other
  return addr.slice(0, 5);
}

/* ═══════════════════ Search logic ═══════════════════ */

const MAX_PER_SECTION = 5;

function searchIndex(
  index: AddressEntry[],
  query: string
): SuggestionSection[] {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return [];

  // Collect matches grouped by category
  const grouped = new Map<string, AddressSuggestion[]>();

  for (const entry of index) {
    const nameLower = entry.n.toLowerCase();
    const addrLower = entry.a.toLowerCase();
    const labelLower = entry.l.toLowerCase();

    let matchField: "name" | "address" | "label" | null = null;
    let priority = 0; // 0 = prefix, 1 = substring

    // Check name match
    if (nameLower.startsWith(q)) {
      matchField = "name";
      priority = 0;
    } else if (nameLower.includes(q)) {
      matchField = "name";
      priority = 1;
    }
    // Check address match
    else if (addrLower.startsWith(q) || addrLower.startsWith("0x" + q)) {
      matchField = "address";
      priority = 0;
    } else if (addrLower.includes(q)) {
      matchField = "address";
      priority = 1;
    }
    // Check label match
    else if (labelLower.includes(q)) {
      matchField = "label";
      priority = 1;
    }

    if (!matchField) continue;

    const cat = entry.c || "Other";
    if (!grouped.has(cat)) grouped.set(cat, []);
    const arr = grouped.get(cat)!;

    // Only keep top items per category for performance
    if (arr.length >= MAX_PER_SECTION * 3) continue;

    const trunc = truncAddr(entry.a);
    const display = entry.n
      ? `${entry.n}${trunc ? ` (${trunc})` : ""}`
      : entry.l || trunc;

    arr.push({
      name: entry.n,
      slug: entry.s,
      address: entry.a,
      label: entry.l,
      category: cat,
      tag: entry.t,
      hasIcon: entry.i === 1,
      display,
      matchField,
      _priority: priority,
    } as AddressSuggestion & { _priority: number });
  }

  // Sort each group: prefix matches first, then by icon presence, then alphabetic
  const sections: SuggestionSection[] = [];
  for (const [cat, items] of grouped) {
    items.sort((a: any, b: any) => {
      if (a._priority !== b._priority) return a._priority - b._priority;
      if (a.hasIcon !== b.hasIcon) return a.hasIcon ? -1 : 1;
      return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
    });
    sections.push({
      section: cat,
      items: items.slice(0, MAX_PER_SECTION),
    });
  }

  // Sort sections by priority order
  sections.sort(
    (a, b) =>
      (SECTION_ORDER[a.section] ?? 99) - (SECTION_ORDER[b.section] ?? 99)
  );

  return sections;
}

/* ═══════════════════ Hook ═══════════════════ */

export function useAddressSearch(query: string) {
  const [sections, setSections] = useState<SuggestionSection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const queryRef = useRef(query);

  queryRef.current = query;

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSections([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const index = await loadIndex();

    // Check if query is still current (debounce guard)
    if (queryRef.current.trim() !== q.trim()) {
      setIsLoading(false);
      return;
    }

    const results = searchIndex(index, q);
    setSections(results);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setSections([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      doSearch(query);
    }, 200);

    return () => clearTimeout(debounceRef.current);
  }, [query, doSearch]);

  const totalResults = sections.reduce((s, sec) => s + sec.items.length, 0);

  return { sections, isLoading, totalResults };
}
