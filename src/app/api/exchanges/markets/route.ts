import { NextRequest, NextResponse } from 'next/server';
import { cexManager, type ExchangeId } from '@/lib/services/centralizedExchanges';

/**
 * 📋 Markets API Route - Updated to use CEXManager
 * GET /api/exchanges/markets?exchange=bybit
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const exchange = searchParams.get('exchange') as ExchangeId;

    if (!exchange) {
      return NextResponse.json(
        { error: 'Missing required parameter: exchange' },
        { status: 400 }
      );
    }

    // Fetch top coins by volume as a proxy for markets
    const coins = await cexManager.getTopCoinsByVolume(exchange);

    return NextResponse.json({
      success: true,
      data: coins,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Markets API Error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
