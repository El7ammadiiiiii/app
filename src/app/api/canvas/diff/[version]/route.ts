/**
 * ═══════════════════════════════════════════════════════════════
 * Wave 5.3 — Canvas Diff API
 * ═══════════════════════════════════════════════════════════════
 * GET /api/canvas/diff/[version]?artifactId=xxx&compareWith=yyy
 * Returns a line-level diff between two versions of a canvas artifact.
 */

import { NextRequest, NextResponse } from "next/server";

interface DiffLine {
  type: "add" | "remove" | "same";
  content: string;
  lineNumber: number;
}

function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const result: DiffLine[] = [];

  // Simple LCS-based diff
  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to produce diff
  let i = m, j = n;
  const ops: Array<{ type: "add" | "remove" | "same"; line: string }> = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      ops.unshift({ type: "same", line: oldLines[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.unshift({ type: "add", line: newLines[j - 1] });
      j--;
    } else {
      ops.unshift({ type: "remove", line: oldLines[i - 1] });
      i--;
    }
  }

  let lineNum = 0;
  for (const op of ops) {
    if (op.type !== "remove") lineNum++;
    result.push({ type: op.type, content: op.line, lineNumber: lineNum });
  }

  return result;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ version: string }> }
) {
  const { version } = await params;
  const url = new URL(req.url);
  const oldContent = url.searchParams.get("old") || "";
  const newContent = url.searchParams.get("new") || "";

  if (!oldContent && !newContent) {
    return NextResponse.json(
      { error: "Provide 'old' and 'new' query params with version content" },
      { status: 400 }
    );
  }

  const diff = computeDiff(
    decodeURIComponent(oldContent),
    decodeURIComponent(newContent)
  );

  return NextResponse.json({
    version,
    totalChanges: diff.filter((d) => d.type !== "same").length,
    additions: diff.filter((d) => d.type === "add").length,
    removals: diff.filter((d) => d.type === "remove").length,
    lines: diff,
  });
}

/**
 * POST /api/canvas/diff/[version]
 * Accepts old/new content in body (for large payloads)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ version: string }> }
) {
  const { version } = await params;
  const body = await req.json();
  const { oldContent = "", newContent = "" } = body;

  const diff = computeDiff(oldContent, newContent);

  return NextResponse.json({
    version,
    totalChanges: diff.filter((d) => d.type !== "same").length,
    additions: diff.filter((d) => d.type === "add").length,
    removals: diff.filter((d) => d.type === "remove").length,
    lines: diff,
  });
}
