import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse, OrderBook } from "@/types/exchanges";
import { normalizeBybitSpotSymbol } from "../_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ✅ Bybit (Spot) Orderbook — Typed
 * GET /api/bybit/orderbook?symbol=BTCUSDT&limit=50
 */
export async function GET ( request: NextRequest )
{
    const { searchParams } = new URL( request.url );
    const symbolParam = searchParams.get( "symbol" ) || "";
    const limit = Math.max( 1, Math.min( 200, Number( searchParams.get( "limit" ) || 50 ) ) );

    const { bybit, display } = normalizeBybitSpotSymbol( symbolParam );
    if ( !bybit )
    {
        const res: ApiResponse<OrderBook> = { success: false, error: "Missing symbol", timestamp: Date.now() };
        return NextResponse.json( res, { status: 400 } );
    }

    try
    {
        const url = `https://api.bybit.com/v5/market/orderbook?category=spot&symbol=${ bybit }&limit=${ limit }`;
        const r = await fetch( url, { headers: { accept: "application/json" }, cache: "no-store" } );
        if ( !r.ok )
        {
            const res: ApiResponse<OrderBook> = { success: false, error: `Bybit API Error: ${ r.status }`, timestamp: Date.now() };
            return NextResponse.json( res, { status: 502 } );
        }

        const raw = await r.json();
        const result = raw?.result;

        const bids: [ number, number ][] = Array.isArray( result?.b )
            ? result.b.map( ( x: [ string, string ] ) => [ Number( x[ 0 ] ), Number( x[ 1 ] ) ] )
            : [];

        const asks: [ number, number ][] = Array.isArray( result?.a )
            ? result.a.map( ( x: [ string, string ] ) => [ Number( x[ 0 ] ), Number( x[ 1 ] ) ] )
            : [];

        const data: OrderBook = {
            symbol: display,
            bids: bids.filter( ( [ p, q ] ) => Number.isFinite( p ) && Number.isFinite( q ) ),
            asks: asks.filter( ( [ p, q ] ) => Number.isFinite( p ) && Number.isFinite( q ) ),
            timestamp: Date.now(),
        };

        const res: ApiResponse<OrderBook> = { success: true, data, timestamp: Date.now() };
        return NextResponse.json( res, {
            headers: { "Cache-Control": "no-store" },
        } );
    } catch ( e )
    {
        const res: ApiResponse<OrderBook> = { success: false, error: ( e as Error ).message, timestamp: Date.now() };
        return NextResponse.json( res, { status: 500 } );
    }
}
