import { NextRequest, NextResponse } from 'next/server';
import { 
  analyzeWithAI, 
  calculateAllIndicatorReadings 
} from '@/lib/ai/expert-analyst-agent';
import type { AIAnalysisRequest } from '@/lib/ai/expert-analyst-agent';
import type { OHLCV } from '@/lib/indicators/technical';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Server-side AI Expert Analysis proxy
 * Keeps the OpenAI API key hidden from the browser
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, timeframe, currentPrice, priceChange24h, candles, eliteResult } = body;

    if (!symbol || !timeframe || !currentPrice || !candles || candles.length < 50) {
      return NextResponse.json(
        { error: 'Missing required fields: symbol, timeframe, currentPrice, candles (min 50)' },
        { status: 400 }
      );
    }

    // Calculate indicators server-side
    const indicators = calculateAllIndicatorReadings(candles as OHLCV[]);

    const analysisRequest: AIAnalysisRequest = {
      symbol,
      timeframe,
      currentPrice,
      priceChange24h,
      indicators,
      eliteResult,
      candles,
    };

    // Use server-side API key — never exposed to browser
    const apiKey = process.env.OPENAI_API_KEY || process.env.AI_OPENAI_KEY || '';

    if (apiKey) {
      const result = await analyzeWithAI(analysisRequest, apiKey);
      return NextResponse.json(result);
    } else {
      // Fallback to rule-based analysis
      const { ExpertAnalystAgent } = await import('@/lib/ai/expert-analyst-agent');
      const result = ExpertAnalystAgent.generateFallbackAnalysis(analysisRequest);
      return NextResponse.json(result);
    }
  } catch (error) {
    console.error('Expert analysis API error:', error);
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 }
    );
  }
}
