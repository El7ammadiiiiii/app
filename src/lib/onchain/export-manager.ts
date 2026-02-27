/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  Export Manager — Export graph data in multiple formats       ║
 * ║  SVG, PNG, JSON, CSV export capabilities                     ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import type { MSNode, MSEdge, MSSnapshot } from "./cwtracker-types";

/* ────────────────────────────── SVG EXPORT ────────────────────────────── */

/**
 * Export the graph SVG element as an SVG file
 */
export function exportSVG(svgSelector = "#ms-graph-svg", filename = "cwtracker-graph"): void {
  const svgEl = document.querySelector<SVGSVGElement>(svgSelector);
  if (!svgEl) {
    console.warn("[Export] SVG element not found");
    return;
  }

  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(svgEl);
  const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
  downloadBlob(blob, `${filename}.svg`);
}

/* ────────────────────────────── PNG EXPORT ────────────────────────────── */

/**
 * Export the graph SVG as a PNG image
 */
export async function exportPNG(
  svgSelector = "#ms-graph-svg",
  filename = "cwtracker-graph",
  scale = 2
): Promise<void> {
  const svgEl = document.querySelector<SVGSVGElement>(svgSelector);
  if (!svgEl) {
    console.warn("[Export] SVG element not found");
    return;
  }

  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(svgEl);
  const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = (svgEl.clientWidth || 1200) * scale;
      canvas.height = (svgEl.clientHeight || 800) * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      canvas.toBlob((blob) => {
        if (blob) downloadBlob(blob, `${filename}.png`);
        resolve();
      }, "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    img.src = url;
  });
}

/* ────────────────────────────── JSON EXPORT ────────────────────────────── */

/**
 * Export graph state as JSON snapshot
 */
export function exportJSON(snapshot: MSSnapshot, filename = "cwtracker-data"): void {
  const jsonStr = JSON.stringify(snapshot, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
  downloadBlob(blob, `${filename}.json`);
}

/**
 * Import graph state from JSON
 */
export function importJSON(jsonText: string): MSSnapshot | null {
  try {
    const parsed = JSON.parse(jsonText);
    // Basic validation
    if (!parsed.nodes || !parsed.edges || !parsed.uuid) {
      console.warn("[Import] Invalid snapshot format");
      return null;
    }
    return parsed as MSSnapshot;
  } catch (err) {
    console.warn("[Import] JSON parse error:", err);
    return null;
  }
}

/* ────────────────────────────── CSV EXPORT ────────────────────────────── */

/**
 * Export nodes as CSV
 */
export function exportNodesCSV(nodes: MSNode[], filename = "cwtracker-nodes"): void {
  const headers = [
    "ID",
    "Label",
    "Address",
    "Chain",
    "Type",
    "BalanceUSD",
    "FlowsIn",
    "FlowsOut",
    "TxCount",
    "IsRoot",
    "IsContract",
    "FirstSeen",
    "LastSeen",
    "Tags",
  ];

  const rows = nodes.map((n) => [
    n.id,
    escapeCsv(n.label),
    n.address,
    n.chain,
    n.type,
    n.balanceUSD?.toFixed(2) ?? "",
    n.flowsIn.toFixed(4),
    n.flowsOut.toFixed(4),
    n.txCount.toString(),
    n.isRoot ? "true" : "false",
    n.isContract ? "true" : "false",
    n.firstSeen ?? "",
    n.lastSeen ?? "",
    (n.tags ?? []).join(";"),
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, `${filename}.csv`);
}

/**
 * Export edges as CSV
 */
export function exportEdgesCSV(
  edges: MSEdge[],
  nodes: MSNode[],
  filename = "cwtracker-edges"
): void {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const headers = [
    "Source",
    "SourceAddr",
    "Target",
    "TargetAddr",
    "Chain",
    "TotalValue",
    "TokenSymbol",
    "TransferCount",
    "IsCrossChain",
    "IsSuspicious",
  ];

  const rows = edges.map((e) => [
    nodeMap.get(e.source)?.label ?? e.source,
    nodeMap.get(e.source)?.address ?? "",
    nodeMap.get(e.target)?.label ?? e.target,
    nodeMap.get(e.target)?.address ?? "",
    e.chain,
    e.totalValue.toFixed(4),
    e.tokenSymbol,
    e.transferCount.toString(),
    e.isCrossChain ? "true" : "false",
    e.isSuspicious ? "true" : "false",
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, `${filename}.csv`);
}

/* ────────────────────────────── HELPERS ────────────────────────────── */

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeCsv(str: string): string {
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
