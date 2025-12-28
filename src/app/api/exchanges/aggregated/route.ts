/**
 * 🔗 Aggregated Order Book API Route
 * GET /api/exchanges/aggregated?exchanges=binance,bybit,okx&symbol=BTC/USDT&limit=100
 */

import { NextRequest, NextResponse } from 'next/server';
import { aggregator, type ExchangeId } from '@/lib/exchanges';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const exchangesParam = searchParams.get('exchanges');
    const symbol = searchParams.get('symbol');
    const limitParam = searchParams.get('limit');

    // Validation
    if (!exchangesParam) {
      return NextResponse.json(
        { error: 'Missing required parameter: exchanges (comma-separated list)' },
        { status: 400 }
      );
    }

    if (!symbol) {
      return NextResponse.json(
        { error: 'Missing required parameter: symbol' },
        { status: 400 }
      );
    }

    // Parse parameters
    const exchanges = exchangesParam.split(',') as ExchangeId[];
    const limit = limitParam ? parseInt(limitParam) : 100;

    // Validate exchanges
    if (exchanges.length === 0) {
      return NextResponse.json(
        { error: 'At least one exchange must be specified' },
        { status: 400 }
      );
    }

    // Get aggregated order book
    const result = await aggregator.getAggregatedOrderBook(exchanges, symbol, limit);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Aggregated Order Book API Error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
