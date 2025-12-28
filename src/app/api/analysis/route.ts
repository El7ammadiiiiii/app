import { NextRequest, NextResponse } from 'next/server';

/**
 * Internal Analysis API - DO NOT EXPOSE INTERNALS
 * Returns trend analysis for multi-timeframe data
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Internal engine import
import { 
  analyzeTimeframe, 
  analyzeMultiTimeframe,
  type OHLCVData,
  type TimeframeData 
} from '@/lib/analysis/engine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, timeframes } = body;

    if (!symbol || !timeframes || !Array.isArray(timeframes)) {
      return NextResponse.json(
        { error: 'Invalid request. Required: symbol, timeframes[]' },
        { status: 400 }
      );
    }

    // Transform API data to engine format
    const timeframeData: TimeframeData[] = timeframes.map((tf: {
      timeframe: string;
      data: { open: number; high: number; low: number; close: number; volume: number; timestamp: number }[] | number[][];
    }) => {
      const data = tf.data;
      
      const ohlcv: OHLCVData = {
        open: data.map((d: { open?: number } | number[]) => 
          Array.isArray(d) ? d[1] : (d.open ?? 0)
        ),
        high: data.map((d: { high?: number } | number[]) => 
          Array.isArray(d) ? d[2] : (d.high ?? 0)
        ),
        low: data.map((d: { low?: number } | number[]) => 
          Array.isArray(d) ? d[3] : (d.low ?? 0)
        ),
        close: data.map((d: { close?: number } | number[]) => 
          Array.isArray(d) ? d[4] : (d.close ?? 0)
        ),
        volume: data.map((d: { volume?: number } | number[]) => 
          Array.isArray(d) ? d[5] : (d.volume ?? 0)
        ),
        timestamp: data.map((d: { timestamp?: number } | number[]) => 
          Array.isArray(d) ? d[0] : (d.timestamp ?? 0)
        ),
      };

      return {
        timeframe: tf.timeframe,
        data: ohlcv
      };
    });

    // Run multi-timeframe analysis
    const result = analyzeMultiTimeframe(timeframeData, symbol);

    return NextResponse.json({
      success: true,
      symbol,
      timestamp: Date.now(),
      analysis: result
    });

  } catch (error) {
    console.error('Analysis API error:', error);
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const timeframe = searchParams.get('timeframe') || '1d';

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol is required' },
      { status: 400 }
    );
  }

  try {
    // Fetch OHLCV data from Binance
    const response = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${timeframe}&limit=200`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch market data');
    }

    const klines = await response.json();

    const ohlcv: OHLCVData = {
      timestamp: klines.map((k: number[]) => k[0]),
      open: klines.map((k: number[]) => parseFloat(String(k[1]))),
      high: klines.map((k: number[]) => parseFloat(String(k[2]))),
      low: klines.map((k: number[]) => parseFloat(String(k[3]))),
      close: klines.map((k: number[]) => parseFloat(String(k[4]))),
      volume: klines.map((k: number[]) => parseFloat(String(k[5]))),
    };

    const analysis = analyzeTimeframe(ohlcv, symbol, timeframe);

    return NextResponse.json({
      success: true,
      symbol,
      timeframe,
      timestamp: Date.now(),
      analysis
    });

  } catch (error) {
    console.error('Analysis API error:', error);
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 }
    );
  }
}
