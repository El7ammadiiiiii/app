import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse, OHLCV } from "@/types/exchanges";
import { mapTimeframeToBybitInterval, normalizeBybitSpotSymbol, parseBybitKlines } from "../_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ✅ Bybit (Spot) OHLCV — Typed
 * GET /api/bybit/ohlcv?symbol=BTCUSDT&timeframe=1h&limit=500
 */
export async function GET ( request: NextRequest )
{
    const { searchParams } = new URL( request.url );
    const symbolParam = searchParams.get( "symbol" ) || "";
    const timeframe = searchParams.get( "timeframe" ) || "1h";
    const limit = Math.max( 10, Math.min( 1000, Number( searchParams.get( "limit" ) || 300 ) ) );

    const { bybit, display } = normalizeBybitSpotSymbol( symbolParam );
    if ( !bybit )
    {
        const res: ApiResponse<OHLCV[]> = { success: false, error: "Missing symbol", timestamp: Date.now() };
        return NextResponse.json( res, { status: 400 } );
    }

    try
    {
        const interval = mapTimeframeToBybitInterval( timeframe );
        const url = `https://api.bybit.com/v5/market/kline?category=spot&symbol=${ bybit }&interval=${ interval }&limit=${ limit }`;

        const r = await fetch( url, { headers: { accept: "application/json" }, cache: "no-store" } );
        if ( !r.ok )
        {
            const res: ApiResponse<OHLCV[]> = { success: false, error: `Bybit API Error: ${ r.status }`, timestamp: Date.now() };
            return NextResponse.json( res, { status: 502 } );
        }

        const raw = await r.json();
        const list = raw?.result?.list;

        // Bybit returns newest first; for charts, sort ascending.
        const candles = parseBybitKlines( list ).sort( ( a, b ) => a.timestamp - b.timestamp );

        // Override symbol to display format for UI.
        const normalized = candles.map( ( c ) => ( { ...c } ) );

        const res: ApiResponse<OHLCV[]> = { success: true, data: normalized, timestamp: Date.now() };
        return NextResponse.json( res, { headers: { "Cache-Control": "no-store" } } );
    } catch ( e )
    {
        const res: ApiResponse<OHLCV[]> = { success: false, error: ( e as Error ).message, timestamp: Date.now() };
        return NextResponse.json( res, { status: 500 } );
    }
}
