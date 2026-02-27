import type { OHLCV } from "@/types/exchanges";

export const normalizeBybitSpotSymbol = ( input: string ) =>
{
    const raw = ( input || "" ).trim();
    if ( !raw ) return { bybit: "", display: "" };

    // Accept: BTCUSDT, BTC/USDT, BTC-USDT
    const cleaned = raw.replaceAll( "/", "" ).replaceAll( "-", "" ).toUpperCase();

    // If someone passes BTC, assume USDT for trader pages.
    const bybit = cleaned.endsWith( "USDT" ) ? cleaned : `${ cleaned }USDT`;
    const base = bybit.replace( /USDT$/i, "" );
    const display = `${ base }/USDT`;

    return { bybit, display };
};

export const mapTimeframeToBybitInterval = ( timeframe: string ) =>
{
    const tf = ( timeframe || "1h" ).toLowerCase();

    // Bybit v5 kline interval reference (spot): 1,3,5,15,30,60,120,240,360,720, D, W, M
    // We'll support a common subset.
    switch ( tf )
    {
        case "1m":
            return "1";
        case "3m":
            return "3";
        case "5m":
            return "5";
        case "15m":
            return "15";
        case "30m":
            return "30";
        case "1h":
            return "60";
        case "2h":
            return "120";
        case "4h":
            return "240";
        case "6h":
            return "360";
        case "12h":
            return "720";
        case "1d":
            return "D";
        case "1w":
            return "W";
        case "1mo":
        case "1mth":
        case "1month":
            return "M";
        default:
            return "60";
    }
};

export const parseBybitKlines = ( list: unknown ): OHLCV[] =>
{
    if ( !Array.isArray( list ) ) return [];

    // Each item: [ startTime, open, high, low, close, volume, turnover ] (strings)
    return list
        .map( ( row ) =>
        {
            if ( !Array.isArray( row ) || row.length < 6 ) return null;

            const ts = Number( row[ 0 ] );
            const open = Number( row[ 1 ] );
            const high = Number( row[ 2 ] );
            const low = Number( row[ 3 ] );
            const close = Number( row[ 4 ] );
            const volume = Number( row[ 5 ] );

            if ( !Number.isFinite( ts ) ) return null;
            return { timestamp: ts, open, high, low, close, volume };
        } )
        .filter( Boolean ) as OHLCV[];
};
