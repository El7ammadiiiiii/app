import { NextRequest, NextResponse } from 'next/server';

/**
 * 🤝 Trades API Route - Updated to use direct fetch
 * GET /api/exchanges/trades?exchange=bybit&symbol=BTCUSDT&limit=50
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const exchange = searchParams.get('exchange');
    const symbol = searchParams.get('symbol');
    const limit = searchParams.get('limit') || '50';

    if (!exchange || !symbol) {
      return NextResponse.json(
        { error: 'Missing required parameters: exchange and symbol' },
        { status: 400 }
      );
    }

    let url = '';
    if (exchange === 'bybit') {
      url = `https://api.bybit.com/v5/market/recent-trade?category=spot&symbol=${symbol.replace('/', '')}&limit=${limit}`;
    } else {
      url = `https://api.bybit.com/v5/market/recent-trade?category=spot&symbol=${symbol.replace('/', '')}&limit=${limit}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Exchange API responded with ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      data,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Trades API Error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
