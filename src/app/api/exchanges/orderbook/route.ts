/**
 * 📖 Order Book API Route
 * GET /api/exchanges/orderbook?exchange=binance&symbol=BTC/USDT&limit=100
 */

import { NextRequest, NextResponse } from 'next/server';
import { ccxtManager, type ExchangeId, Priority } from '@/lib/exchanges';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const exchange = searchParams.get('exchange') as ExchangeId;
    const symbol = searchParams.get('symbol');
    const limitParam = searchParams.get('limit');
    const priorityParam = searchParams.get('priority');

    // Validation
    if (!exchange) {
      return NextResponse.json(
        { error: 'Missing required parameter: exchange' },
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
    const limit = limitParam ? parseInt(limitParam) : 100;
    let priority: Priority = Priority.NORMAL;
    if (priorityParam === 'high') priority = Priority.HIGH;
    if (priorityParam === 'low') priority = Priority.LOW;

    // Fetch order book
    const result = await ccxtManager.fetchOrderBook(exchange, symbol, limit, priority);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Order Book API Error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
