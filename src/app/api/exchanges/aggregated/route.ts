import { NextRequest, NextResponse } from 'next/server';

/**
 * 📊 Aggregated Data API Route - Updated to work without CCXT
 * GET /api/exchanges/aggregated?symbol=BTCUSDT
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'BTCUSDT';

    // Fetch data from multiple sources or just return a unified format
    // For now, we'll fetch from our unified OHLCV API as a base
    const baseUrl = request.nextUrl.origin;
    const response = await fetch(`${baseUrl}/api/ohlcv?symbol=${symbol}&exchange=bybit&interval=1h&limit=1`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch base data for aggregation');
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      symbol,
      aggregatedData: {
        price: data.data?.[0]?.close || 0,
        timestamp: Date.now(),
        sources: ['centralized_api']
      }
    });
  } catch (error) {
    console.error('Aggregated API Error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
