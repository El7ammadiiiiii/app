/**
 * 📋 Markets API Route
 * GET /api/exchanges/markets?exchange=binance
 */

import { NextRequest, NextResponse } from 'next/server';
import { ccxtManager, getAllExchanges, type ExchangeId } from '@/lib/exchanges';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const exchange = searchParams.get('exchange') as ExchangeId;

    // If no exchange specified, return all exchanges
    if (!exchange) {
      const exchanges = getAllExchanges();
      return NextResponse.json({
        success: true,
        data: exchanges,
        timestamp: Date.now(),
      });
    }

    // Fetch markets for specific exchange
    const result = await ccxtManager.fetchMarkets(exchange);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Markets API Error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
