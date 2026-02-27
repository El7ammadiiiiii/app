import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse, Ticker } from "@/types/exchanges";
import { normalizeBybitSpotSymbol } from "../_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ✅ Bybit (Spot) Ticker — Typed
 * GET /api/bybit/ticker?symbol=BTCUSDT
 */
export async function GET ( request: NextRequest )
{
    const { searchParams } = new URL( request.url );
    const symbolParam = searchParams.get( "symbol" ) || "";

    const { bybit, display } = normalizeBybitSpotSymbol( symbolParam );
    if ( !bybit )
    {
        const res: ApiResponse<Ticker> = { success: false, error: "Missing symbol", timestamp: Date.now() };
        return NextResponse.json( res, { status: 400 } );
    }

    try
    {
        const url = `https://api.bybit.com/v5/market/tickers?category=spot&symbol=${ bybit }`;
        const r = await fetch( url, { headers: { accept: "application/json" }, cache: "no-store" } );
        if ( !r.ok )
        {
            const res: ApiResponse<Ticker> = { success: false, error: `Bybit API Error: ${ r.status }`, timestamp: Date.now() };
            return NextResponse.json( res, { status: 502 } );
        }

        const raw = await r.json();
        const item = raw?.result?.list?.[ 0 ];

        const last = Number( item?.lastPrice ?? item?.last ?? 0 );
        const high = Number( item?.highPrice24h ?? item?.high ?? 0 );
        const low = Number( item?.lowPrice24h ?? item?.low ?? 0 );
        const volume = Number( item?.volume24h ?? item?.volume ?? 0 );

        // Bybit provides 24h pct like 0.0123 => 1.23%
        const pctRaw = Number( item?.price24hPcnt ?? 0 );
        const change24h = Number.isFinite( pctRaw ) ? pctRaw * 100 : undefined;

        const data: Ticker = {
            symbol: display,
            last,
            high: Number.isFinite( high ) ? high : undefined,
            low: Number.isFinite( low ) ? low : undefined,
            volume: Number.isFinite( volume ) ? volume : undefined,
            change24h: Number.isFinite( change24h ) ? change24h : undefined,
            timestamp: Date.now(),
        };

        const res: ApiResponse<Ticker> = { success: true, data, timestamp: Date.now() };
        return NextResponse.json( res, { headers: { "Cache-Control": "no-store" } } );
    } catch ( e )
    {
        const res: ApiResponse<Ticker> = { success: false, error: ( e as Error ).message, timestamp: Date.now() };
        return NextResponse.json( res, { status: 500 } );
    }
}
