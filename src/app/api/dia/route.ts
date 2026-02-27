import { NextResponse } from 'next/server';

/**
 * DIA API Proxy  —  /api/dia
 *
 * Proxies requests to https://api.diadata.org/v1/assetInfo/{blockchain}/{address}
 * with a 5-minute in-memory cache.
 *
 * Usage:
 *   GET /api/dia?blockchain=Bitcoin&address=0x0000000000000000000000000000000000000000
 */

const DIA_BASE = 'https://api.diadata.org/v1';

/* ── In-memory cache (5 min TTL) ── */
const cache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const blockchain = searchParams.get('blockchain');
  const address = searchParams.get('address');

  if (!blockchain || !address) {
    return NextResponse.json(
      { error: 'Missing required params: blockchain, address' },
      { status: 400 },
    );
  }

  const cacheKey = `${blockchain}/${address}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Cache': 'HIT',
      },
    });
  }

  try {
    const url = `${DIA_BASE}/assetInfo/${encodeURIComponent(blockchain)}/${encodeURIComponent(address)}`;
    const res = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(8000), // 8s timeout
    });

    if (!res.ok) {
      // Don't cache errors
      return NextResponse.json(
        { error: `DIA API error: ${res.status}` },
        { status: res.status },
      );
    }

    const data = await res.json();

    // Cache successful response
    cache.set(cacheKey, { data, ts: Date.now() });

    // Evict stale entries (keep cache bounded)
    if (cache.size > 500) {
      const now = Date.now();
      for (const [k, v] of cache) {
        if (now - v.ts > CACHE_TTL) cache.delete(k);
      }
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Cache': 'MISS',
      },
    });
  } catch (err: any) {
    console.error('[DIA proxy]', err?.message || err);
    return NextResponse.json(
      { error: 'Failed to fetch from DIA API' },
      { status: 502 },
    );
  }
}
