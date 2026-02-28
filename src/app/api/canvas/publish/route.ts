/**
 * ═══════════════════════════════════════════════════════════════
 * Wave 5.4 — Publish Canvas Artifact API
 * ═══════════════════════════════════════════════════════════════
 * POST /api/canvas/publish — creates a public snapshot
 * GET  /api/canvas/publish?id=xxx — retrieves a published artifact
 */

import { NextRequest, NextResponse } from "next/server";

// In-memory store for published artifacts (swap for DB/Firestore in production)
const publishedStore = new Map<string, {
  id: string;
  title: string;
  type: string;
  language: string;
  content: string;
  publishedAt: number;
  authorId?: string;
}>();

function generatePublicId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 12; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, type, language, content, authorId } = body;

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const publicId = generatePublicId();
    publishedStore.set(publicId, {
      id: publicId,
      title: title || "Untitled",
      type: type || "CODE_EDITOR",
      language: language || "typescript",
      content,
      publishedAt: Date.now(),
      authorId,
    });

    const publicUrl = `/artifacts/${publicId}`;

    return NextResponse.json({
      id: publicId,
      url: publicUrl,
      publishedAt: Date.now(),
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const artifact = publishedStore.get(id);
  if (!artifact) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(artifact);
}
