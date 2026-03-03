import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.FASTAPI_URL || process.env.ONCHAIN_API_URL || 'http://127.0.0.1:8000';

/**
 * Server-side proxy to FastAPI backend.
 * Hides the backend URL from browser DevTools.
 * 
 * Browser calls:  /api/backend/api/rest/ohlcv?exchange=bybit&...
 * Proxy forwards:  http://127.0.0.1:8000/api/rest/ohlcv?exchange=bybit&...
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const target = `${BACKEND_URL}/${path.join('/')}${request.nextUrl.search}`;

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 120_000);

    const res = await fetch(target, {
      signal: ctrl.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timer);

    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('Backend proxy error:', target, err);
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const target = `${BACKEND_URL}/${path.join('/')}${request.nextUrl.search}`;

  try {
    const body = await request.text();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 120_000);

    const res = await fetch(target, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': request.headers.get('Content-Type') || 'application/json',
        'Accept': 'application/json',
      },
      body,
    });
    clearTimeout(timer);

    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('Backend proxy POST error:', target, err);
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
  }
}
