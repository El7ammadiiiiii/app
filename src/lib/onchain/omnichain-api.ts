/**
 * OmniChain API — Real data via CCWAYS Intelligence Gateway.
 *
 * Calls /api/ccways/expand (POST) → returns MSNode[] + MSEdge[].
 * The CCWAYS gateway merges data from multiple intelligence sources
 * and delivers fully sanitized, white-labeled results.
 *
 * This module keeps the same export signature so cwtracker-store.ts
 * (expandNodeDirection) needs zero changes.
 */

import type { MSNode, MSEdge } from "./cwtracker-types";
import { mapCCWaysExpand, type CCWaysExpandResponse } from "./ccways-mapper";

export interface OmniChainFilter {
  directions: { in: boolean; out: boolean };
  dateFrom?: string;
  dateTo?: string;
  tokenFilter?: string;
}

export async function fetchOmniChainData(
  nodeId: string,
  address: string,
  filter?: OmniChainFilter,
): Promise<{ nodes: MSNode[]; edges: MSEdge[] }> {
  // Determine direction
  const dirIn = filter?.directions?.in ?? true;
  const dirOut = filter?.directions?.out ?? true;
  let direction: string;
  if (dirIn && dirOut) direction = "both";
  else if (dirIn) direction = "in";
  else if (dirOut) direction = "out";
  else direction = "both";

  try {
    const res = await fetch("/api/ccways/expand", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address,
        nodeId,
        direction,
        limit: 10,
        ...(filter?.dateFrom ? { dateFrom: filter.dateFrom } : {}),
        ...(filter?.dateTo ? { dateTo: filter.dateTo } : {}),
        ...(filter?.tokenFilter ? { tokenFilter: filter.tokenFilter } : {}),
      }),
    });

    if (!res.ok) {
      console.warn(`[CCWAYS] expand failed: ${res.status}`);
      return { nodes: [], edges: [] };
    }

    const data: CCWaysExpandResponse = await res.json();

    if (!data.success) {
      console.warn("[CCWAYS] expand returned success=false");
      return { nodes: [], edges: [] };
    }

    // Map direction to store convention
    const storeDir: "left" | "right" | "both" =
      direction === "in" ? "left" : direction === "out" ? "right" : "both";

    return mapCCWaysExpand(data, nodeId, storeDir);
  } catch (err) {
    console.error("[CCWAYS] expand error:", err);
    return { nodes: [], edges: [] };
  }
}
