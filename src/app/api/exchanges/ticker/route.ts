/**
 * 📊 Ticker API Route
 * GET /api/exchanges/ticker?exchange=binance&symbol=BTC/USDT
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

    // Parse priority
    let priority: Priority = Priority.NORMAL;
    if (priorityParam === 'high') priority = Priority.HIGH;
    if (priorityParam === 'low') priority = Priority.LOW;

    // Fetch ticker
    const result = await ccxtManager.fetchTicker(exchange, symbol, priority);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Ticker API Error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
