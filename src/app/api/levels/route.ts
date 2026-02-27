import { NextRequest, NextResponse } from "next/server";
import { PivotLevelsDetector, LevelResult, OHLCV } from "@/lib/scanners/levels-detector";

/**
 * 📊 Levels Scanner API Route - Updated to use direct fetch
 * واجهة برمجة تطبيقات ماسح مستويات الدعم والمقاومة
 * 
 * @author CCWAYS Team
 * @version 1.2.0
 * @created 2026-01-19
 */

// Cache for results
const cache = new Map<string, { data: LevelResult; timestamp: number }>();
const CACHE_DURATION = 60 * 1000; // 1 minute

export async function GET ( request: NextRequest )
{
  try
  {
    const { searchParams } = new URL( request.url );

    // Clean symbol - remove / and - and convert to uppercase
    let symbol = searchParams.get( "symbol" ) || "BTCUSDT";
    symbol = symbol.replace( /[\/\-]/g, '' ).toUpperCase();

    const exchange = ( searchParams.get( "exchange" ) || "bybit" ).toLowerCase();
    const timeframe = searchParams.get( "timeframe" ) || "1h";

    console.log( `[Levels API] Request: symbol=${ symbol }, exchange=${ exchange }, timeframe=${ timeframe }` );

    // Validate timeframe
    const validTimeframes = [ "15m", "1h", "4h", "1d", "1w" ];
    if ( !validTimeframes.includes( timeframe ) )
    {
      return NextResponse.json(
        { error: `Invalid timeframe. Supported: ${ validTimeframes.join( ", " ) }` },
        { status: 400 }
      );
    }

    // Check cache
    const cacheKey = `${ exchange }-${ symbol }-${ timeframe }`;
    const cached = cache.get( cacheKey );
    if ( cached && Date.now() - cached.timestamp < CACHE_DURATION )
    {
      console.log( `[Levels API] Cache hit: ${ cacheKey }` );
      return NextResponse.json( cached.data );
    }

    // Fetch OHLCV data using the internal unified API
    console.log( `[Levels API] Fetching OHLCV for ${ symbol } on ${ exchange }...` );
    const baseUrl = request.nextUrl.origin;
    const ohlcvParams = new URLSearchParams( {
      exchange,
      symbol,
      interval: timeframe,
      limit: '500'
    } );

    const response = await fetch( `${ baseUrl }/api/ohlcv?${ ohlcvParams.toString() }` );
    if ( !response.ok )
    {
      const errorData = await response.json();
      throw new Error( errorData.error || `Failed to fetch OHLCV from ${ exchange }` );
    }

    const ohlcvData = await response.json();
    const candles: OHLCV[] = ohlcvData.data || [];

    console.log( `[Levels API] Got ${ candles?.length || 0 } candles` );

    if ( !candles || candles.length < 100 )
    {
      return NextResponse.json(
        { error: "Insufficient data for level detection" },
        { status: 400 }
      );
    }

    // Detect levels
    const detector = new PivotLevelsDetector();
    const result = detector.detect( candles, symbol, exchange, timeframe );

    // Cache result
    cache.set( cacheKey, { data: result, timestamp: Date.now() } );

    return NextResponse.json( result );

  } catch ( error )
  {
    console.error( "[Levels API] Error:", error );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to detect levels" },
      { status: 500 }
    );
  }
}
