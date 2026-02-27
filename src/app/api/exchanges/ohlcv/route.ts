import { NextRequest, NextResponse } from 'next/server';

/**
 * 📈 OHLCV (Candlestick) API Route - Redirect to unified OHLCV API
 * This route now acts as a proxy to the direct exchange API implementation
 * to maintain backward compatibility after removing old providers.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET ( request: NextRequest )
{
  try
  {
    const { searchParams } = new URL( request.url );

    // Extract parameters
    const exchange = searchParams.get( 'exchange' );
    const symbol = searchParams.get( 'symbol' );
    const rawTimeframe = searchParams.get( 'timeframe' ) || '1h';
    // Backward compatibility: legacy timeframe "3d" is treated as weekly ("1w")
    const timeframe = rawTimeframe === '3d' || rawTimeframe === '3D' ? '1w' : rawTimeframe;
    const limit = searchParams.get( 'limit' ) || '100';

    if ( !exchange || !symbol )
    {
      return NextResponse.json(
        { error: 'Missing required parameters: exchange and symbol' },
        { status: 400 }
      );
    }

    // Construct the internal URL for the unified OHLCV API
    // Note: The unified API uses 'interval' instead of 'timeframe'
    const internalParams = new URLSearchParams( {
      exchange,
      symbol,
      interval: timeframe,
      limit
    } );

    const baseUrl = request.nextUrl.origin;
    const response = await fetch( `${ baseUrl }/api/ohlcv?${ internalParams.toString() }` );
    if ( !response.ok )
    {
      const errorData = await response.json();
      return NextResponse.json( errorData, { status: response.status } );
    }

    const data = await response.json();
    return NextResponse.json( data );
  } catch ( error )
  {
    console.error( 'Exchanges OHLCV API Error:', error );
    return NextResponse.json(
      { error: ( error as Error ).message },
      { status: 500 }
    );
  }
}
