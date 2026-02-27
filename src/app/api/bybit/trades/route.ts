import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse, Trade } from "@/types/exchanges";
import { normalizeBybitSpotSymbol } from "../_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ✅ Bybit (Spot) Recent Trades — Typed
 * GET /api/bybit/trades?symbol=BTCUSDT&limit=80
 */
export async function GET ( request: NextRequest )
{
    const { searchParams } = new URL( request.url );
    const symbolParam = searchParams.get( "symbol" ) || "";
    const limit = Math.max( 1, Math.min( 200, Number( searchParams.get( "limit" ) || 80 ) ) );

    const { bybit, display } = normalizeBybitSpotSymbol( symbolParam );
    if ( !bybit )
    {
        const res: ApiResponse<Trade[]> = { success: false, error: "Missing symbol", timestamp: Date.now() };
        return NextResponse.json( res, { status: 400 } );
    }

    try
    {
        const url = `https://api.bybit.com/v5/market/recent-trade?category=spot&symbol=${ bybit }&limit=${ limit }`;
        const r = await fetch( url, { headers: { accept: "application/json" }, cache: "no-store" } );
        if ( !r.ok )
        {
            const res: ApiResponse<Trade[]> = { success: false, error: `Bybit API Error: ${ r.status }`, timestamp: Date.now() };
            return NextResponse.json( res, { status: 502 } );
        }

        const raw = await r.json();
        const list = raw?.result?.list;

        const trades: Trade[] = Array.isArray( list )
            ? list.map( ( t: any ) => ( {
                id: String( t?.execId ?? `${ t?.time }_${ t?.price }_${ t?.size }` ),
                symbol: display,
                side: String( t?.side || "" ).toLowerCase() === "sell" ? "sell" : "buy",
                price: Number( t?.price ?? 0 ),
                amount: Number( t?.size ?? 0 ),
                timestamp: Number( t?.time ?? Date.now() ),
            } ) ).filter( ( t: Trade ) => Number.isFinite( t.price ) && Number.isFinite( t.amount ) && Number.isFinite( t.timestamp ) )
            : [];

        const res: ApiResponse<Trade[]> = { success: true, data: trades, timestamp: Date.now() };
        return NextResponse.json( res, { headers: { "Cache-Control": "no-store" } } );
    } catch ( e )
    {
        const res: ApiResponse<Trade[]> = { success: false, error: ( e as Error ).message, timestamp: Date.now() };
        return NextResponse.json( res, { status: 500 } );
    }
}
