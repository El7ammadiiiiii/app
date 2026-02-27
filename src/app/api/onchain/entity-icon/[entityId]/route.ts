/**
 * GET /api/onchain/entity-icon/[entityId]
 * Proxy entity icon images — tries backend first, falls back to static source
 */

import { NextRequest, NextResponse } from 'next/server';

const ONCHAIN_API_BASE = process.env.ONCHAIN_API_URL || 'http://127.0.0.1:8000';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ entityId: string }> },
) {
  const { entityId } = await params;

  if (!entityId) {
    return NextResponse.json({ error: 'Missing entityId' }, { status: 400 });
  }

  try {
    // Try backend first
    const backendUrl = `${ONCHAIN_API_BASE}/onchain/entity-icon/${entityId}`;
    const res = await fetch(backendUrl, { next: { revalidate: 86400 } }); // cache 24h

    if (res.ok) {
      const contentType = res.headers.get('content-type') ?? 'image/png';
      const buffer = await res.arrayBuffer();
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }
  } catch {
    // Backend not available — fall through
  }

  // Return a default placeholder
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <circle cx="64" cy="64" r="64" fill="#2C2F37"/>
    <text x="64" y="72" text-anchor="middle" fill="white" font-family="monospace" font-size="24">
      ${entityId.slice(0, 2).toUpperCase()}
    </text>
  </svg>`;

  return new NextResponse(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
