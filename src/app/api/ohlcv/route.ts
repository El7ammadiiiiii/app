import { NextRequest, NextResponse } from "next/server";

/**
 * Multi-Exchange OHLCV API Route - Enhanced Version
 * واجهة برمجة تطبيقات بيانات الشموع من منصات متعددة - النسخة المحسنة
 * 
 * Supported: Bybit, MEXC, Coinbase, KuCoin, OKX,
 *            Bitget, BingX, Phemex, HTX, Gate.io, Crypto.com, Kraken
 */

// Exchange API URLs
const EXCHANGE_APIS = {
  binance: "https://api.binance.com/api/v3",
  bybit: "https://api.bybit.com/v5",
  mexc: "https://api.mexc.com/api/v3",
  coinbase: "https://api.exchange.coinbase.com",
  kucoin: "https://api.kucoin.com/api/v1",
  okx: "https://www.okx.com/api/v5",
  bitget: "https://api.bitget.com/api/spot/v1",
  bingx: "https://open-api.bingx.com/openApi/swap/v2",
  phemex: "https://api.phemex.com",
  htx: "https://api.huobi.pro",
  gate: "https://api.gateio.ws/api/v4",
  cryptocom: "https://api.crypto.com/v2",
  kraken: "https://api.kraken.com/0",
  bitmart: "https://api-cloud.bitmart.com/spot/v1",
  coinex: "https://api.coinex.com/v1",
  digifinex: "https://openapi.digifinex.com/v3"
};

// Interval mappings for different exchanges
const INTERVAL_MAPPINGS: Record<string, Record<string, string>> = {
  binance: { "1m": "1m", "5m": "5m", "15m": "15m", "30m": "30m", "1h": "1h", "4h": "4h", "1d": "1d", "1w": "1w" },
  bybit: { "1m": "1", "5m": "5", "15m": "15", "30m": "30", "1h": "60", "4h": "240", "1d": "D", "1w": "W" },
  mexc: { "1m": "1m", "5m": "5m", "15m": "15m", "30m": "30m", "1h": "60m", "4h": "4h", "1d": "1d", "1w": "1W" },
  coinbase: { "1m": "60", "5m": "300", "15m": "900", "30m": "1800", "1h": "3600", "4h": "14400", "1d": "86400", "1w": "604800" },
  kucoin: { "1m": "1min", "5m": "5min", "15m": "15min", "30m": "30min", "1h": "1hour", "4h": "4hour", "1d": "1day", "1w": "1week" },
  okx: { "1m": "1m", "5m": "5m", "15m": "15m", "30m": "30m", "1h": "1H", "4h": "4H", "1d": "1D", "1w": "1W" },
  bitget: { "1m": "1min", "5m": "5min", "15m": "15min", "30m": "30min", "1h": "1h", "4h": "4h", "1d": "1day", "1w": "1week" },
  bingx: { "1m": "1m", "5m": "5m", "15m": "15m", "30m": "30m", "1h": "1h", "4h": "4h", "1d": "1d", "1w": "1w" },
  phemex: { "1m": "1", "5m": "5", "15m": "15", "30m": "30", "1h": "60", "4h": "240", "1d": "1440", "1w": "10080" },
  htx: { "1m": "1min", "5m": "5min", "15m": "15min", "30m": "30min", "1h": "60min", "4h": "4hour", "1d": "1day", "1w": "1week" },
  gate: { "1m": "1m", "5m": "5m", "15m": "15m", "30m": "30m", "1h": "1h", "4h": "4h", "1d": "1d", "1w": "1w" },
  cryptocom: { "1m": "1m", "5m": "5m", "15m": "15m", "30m": "30m", "1h": "1h", "4h": "4h", "1d": "1D", "1w": "1W" },
  kraken: { "1m": "1", "5m": "5", "15m": "15", "30m": "30", "1h": "60", "4h": "240", "1d": "1440", "1w": "10080" },
  bitmart: { "1m": "1", "5m": "5", "15m": "15", "30m": "30", "1h": "60", "4h": "240", "1d": "1440", "1w": "10080" },
  coinex: { "1m": "1min", "5m": "5min", "15m": "15min", "30m": "30min", "1h": "1hour", "4h": "4hour", "1d": "1day", "1w": "1week" },
  digifinex: { "1m": "1", "5m": "5", "15m": "15", "30m": "30", "1h": "60", "4h": "240", "1d": "1440", "1w": "10080" }
};

// Symbol format for different exchanges
function formatSymbol ( symbol: string, exchange: string ): string
{
  const base = symbol.replace( "USDT", "" );
  switch ( exchange )
  {
    case "binance":
    case "bybit":
    case "mexc":
    case "bingx":
      return symbol; // BTCUSDT
    case "coinbase":
      return `${ base }-USD`; // BTC-USD
    case "kucoin":
    case "okx":
    case "bitget":
    case "gate":
      return `${ base }-USDT`; // BTC-USDT
    case "phemex":
      return `${ base }USD`; // BTCUSD
    case "htx":
      return `${ base.toLowerCase() }usdt`; // btcusdt
    case "cryptocom":
      return `${ base }_USDT`; // BTC_USDT
    case "kraken":
      return `${ base }USD`; // BTCUSD or XBTUSD
    case "bitmart":
      return `${ base }_USDT`;
    case "coinex":
      return `${ base }USDT`;
    case "digifinex":
      return `${ base.toLowerCase() }_usdt`;
    default:
      return symbol;
  }
}

const VALID_INTERVALS = [ "1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w" ];
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 30 * 1000; // 30 seconds

export interface OHLCV
{
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function GET ( request: NextRequest )
{
  try
  {
    const { searchParams } = new URL( request.url );

    // Clean symbol: remove / and - and convert to uppercase
    let symbol = searchParams.get( "symbol" )?.toUpperCase() || "BTCUSDT";
    symbol = symbol.replace( /[\/\-]/g, '' );

    // Backward compatibility: legacy timeframe "3d" is treated as weekly ("1w")
    const rawInterval = searchParams.get( "interval" ) || "1h";
    const interval = rawInterval === "3d" || rawInterval === "3D" ? "1w" : rawInterval;
    const limit = Math.min( parseInt( searchParams.get( "limit" ) || "100" ), 1000 );
    const exchange = ( searchParams.get( "exchange" ) || "bybit" ).toLowerCase();

    if ( !Object.keys( EXCHANGE_APIS ).includes( exchange ) )
    {
      return NextResponse.json(
        { error: `Invalid exchange. Supported: ${ Object.keys( EXCHANGE_APIS ).join( ", " ) }` },
        { status: 400 }
      );
    }

    if ( !VALID_INTERVALS.includes( interval ) )
    {
      return NextResponse.json(
        { error: `Invalid interval. Supported: ${ VALID_INTERVALS.join( ", " ) }` },
        { status: 400 }
      );
    }

    const cacheKey = `${ exchange }-${ symbol }-${ interval }-${ limit }`;
    const cached = cache.get( cacheKey );
    if ( cached && Date.now() - cached.timestamp < CACHE_DURATION )
    {
      return NextResponse.json( cached.data, {
        headers: { "X-Cache": "HIT", "Cache-Control": "public, s-maxage=30" }
      } );
    }

    const ohlcv = await fetchFromExchange( exchange, symbol, interval, limit );

    if ( !ohlcv )
    {
      return NextResponse.json(
        { error: `Symbol ${ symbol } not found or failed to fetch from ${ exchange }` },
        { status: 404 }
      );
    }

    const result = {
      symbol,
      exchange,
      interval,
      count: ohlcv.length,
      data: ohlcv,
      lastUpdated: new Date().toISOString()
    };

    cache.set( cacheKey, { data: result, timestamp: Date.now() } );

    return NextResponse.json( result, {
      headers: { "X-Cache": "MISS", "Cache-Control": "public, s-maxage=30" }
    } );

  } catch ( error )
  {
    console.error( "OHLCV API Error:", error );
    return NextResponse.json(
      { error: "Failed to fetch OHLCV data", details: String( error ) },
      { status: 500 }
    );
  }
}

async function fetchSingleExchange ( exchange: string, formattedSymbol: string, mappedInterval: string, limit: number ): Promise<OHLCV[]>
{
  switch ( exchange )
  {
    case "binance":
      return await fetchBinance( formattedSymbol, mappedInterval, limit );
    case "bybit":
      return await fetchBybit( formattedSymbol, mappedInterval, limit );
    case "mexc":
      return await fetchMexc( formattedSymbol, mappedInterval, limit );
    case "coinbase":
      return await fetchCoinbase( formattedSymbol, mappedInterval, limit );
    case "kucoin":
      return await fetchKucoin( formattedSymbol, mappedInterval, limit );
    case "okx":
      return await fetchOkx( formattedSymbol, mappedInterval, limit );
    case "bitget":
      return await fetchBitget( formattedSymbol, mappedInterval, limit );
    case "bingx":
      return await fetchBingX( formattedSymbol, mappedInterval, limit );
    case "phemex":
      return await fetchPhemex( formattedSymbol, mappedInterval, limit );
    case "htx":
      return await fetchHTX( formattedSymbol, mappedInterval, limit );
    case "gate":
      return await fetchGate( formattedSymbol, mappedInterval, limit );
    case "cryptocom":
      return await fetchCryptoCom( formattedSymbol, mappedInterval, limit );
    case "kraken":
      return await fetchKraken( formattedSymbol, mappedInterval, limit );
    case "bitmart":
      return await fetchBitmart( formattedSymbol, mappedInterval, limit );
    case "coinex":
      return await fetchCoinex( formattedSymbol, mappedInterval, limit );
    case "digifinex":
      return await fetchDigifinex( formattedSymbol, mappedInterval, limit );
    default:
      return await fetchBinance( formattedSymbol, mappedInterval, limit );
  }
}

async function fetchFromExchange ( exchange: string, symbol: string, interval: string, limit: number ): Promise<OHLCV[] | null>
{
  const formattedSymbol = formatSymbol( symbol, exchange );
  const mappedInterval = INTERVAL_MAPPINGS[ exchange ]?.[ interval ] || interval;

  try
  {
    return await fetchSingleExchange( exchange, exchange === "mexc" ? symbol : formattedSymbol, mappedInterval, limit );
  } catch ( error )
  {
    console.error( `Error fetching from ${ exchange }:`, error );
    // Fallback chain: try multiple exchanges until one succeeds
    const fallbacks = [ "okx", "kucoin", "bitget", "bybit", "mexc", "gate" ].filter( e => e !== exchange );
    for ( const fb of fallbacks )
    {
      try
      {
        const fbSymbol = formatSymbol( symbol, fb );
        const fbInterval = INTERVAL_MAPPINGS[ fb ]?.[ interval ] || interval;
        const result = await fetchSingleExchange( fb, fb === "mexc" ? symbol : fbSymbol, fbInterval, limit );
        if ( result && result.length > 0 )
        {
          console.log( `Fallback to ${ fb } succeeded for ${ symbol }` );
          return result;
        }
      } catch ( fallbackError )
      {
        // continue to next fallback
      }
    }
    return null;
  }
}

async function fetchBinance ( symbol: string, interval: string, limit: number ): Promise<OHLCV[]>
{
  const url = `${ EXCHANGE_APIS.binance }/klines?symbol=${ symbol }&interval=${ interval }&limit=${ limit }`;
  const response = await fetch( url );
  if ( !response.ok ) throw new Error( `Binance API error: ${ response.status }` );
  const rawData = await response.json();
  return rawData.map( ( k: ( string | number )[] ) => ( {
    timestamp: k[ 0 ] as number,
    open: parseFloat( k[ 1 ] as string ),
    high: parseFloat( k[ 2 ] as string ),
    low: parseFloat( k[ 3 ] as string ),
    close: parseFloat( k[ 4 ] as string ),
    volume: parseFloat( k[ 7 ] as string )
  } ) );
}

async function fetchBybit ( symbol: string, interval: string, limit: number ): Promise<OHLCV[]>
{
  const url = `${ EXCHANGE_APIS.bybit }/market/kline?category=spot&symbol=${ symbol }&interval=${ interval }&limit=${ limit }`;
  const response = await fetch( url );
  if ( !response.ok ) throw new Error( `Bybit API error: ${ response.status }` );
  const data = await response.json();
  if ( data.retCode !== 0 ) throw new Error( `Bybit error: ${ data.retMsg }` );
  return data.result.list.map( ( k: string[] ) => ( {
    timestamp: parseInt( k[ 0 ] ),
    open: parseFloat( k[ 1 ] ),
    high: parseFloat( k[ 2 ] ),
    low: parseFloat( k[ 3 ] ),
    close: parseFloat( k[ 4 ] ),
    volume: parseFloat( k[ 6 ] )
  } ) ).reverse();
}

async function fetchMexc ( symbol: string, interval: string, limit: number ): Promise<OHLCV[]>
{
  const url = `${ EXCHANGE_APIS.mexc }/klines?symbol=${ symbol }&interval=${ interval }&limit=${ limit }`;
  const response = await fetch( url );
  if ( !response.ok ) throw new Error( `MEXC API error: ${ response.status }` );
  const rawData = await response.json();
  return rawData.map( ( k: ( string | number )[] ) => ( {
    timestamp: k[ 0 ] as number,
    open: parseFloat( k[ 1 ] as string ),
    high: parseFloat( k[ 2 ] as string ),
    low: parseFloat( k[ 3 ] as string ),
    close: parseFloat( k[ 4 ] as string ),
    volume: parseFloat( k[ 7 ] as string )
  } ) );
}

async function fetchCoinbase ( symbol: string, interval: string, limit: number ): Promise<OHLCV[]>
{
  const url = `${ EXCHANGE_APIS.coinbase }/products/${ symbol }/candles?granularity=${ interval }`;
  const response = await fetch( url );
  if ( !response.ok ) throw new Error( `Coinbase API error: ${ response.status }` );
  const rawData = await response.json();
  return rawData.slice( 0, limit ).map( ( k: number[] ) => ( {
    timestamp: k[ 0 ] * 1000,
    low: k[ 1 ],
    high: k[ 2 ],
    open: k[ 3 ],
    close: k[ 4 ],
    volume: k[ 5 ] * k[ 4 ]
  } ) ).reverse();
}

async function fetchKucoin ( symbol: string, interval: string, limit: number ): Promise<OHLCV[]>
{
  const endAt = Math.floor( Date.now() / 1000 );
  const startAt = endAt - ( limit * 60 * 60 );
  const url = `${ EXCHANGE_APIS.kucoin }/market/candles?type=${ interval }&symbol=${ symbol }&startAt=${ startAt }&endAt=${ endAt }`;
  const response = await fetch( url );
  if ( !response.ok ) throw new Error( `KuCoin API error: ${ response.status }` );
  const data = await response.json();
  if ( data.code !== "200000" ) throw new Error( `KuCoin error: ${ data.msg }` );
  return data.data.slice( 0, limit ).map( ( k: string[] ) => ( {
    timestamp: parseInt( k[ 0 ] ) * 1000,
    open: parseFloat( k[ 1 ] ),
    close: parseFloat( k[ 2 ] ),
    high: parseFloat( k[ 3 ] ),
    low: parseFloat( k[ 4 ] ),
    volume: parseFloat( k[ 6 ] )
  } ) ).reverse();
}

async function fetchOkx ( symbol: string, interval: string, limit: number ): Promise<OHLCV[]>
{
  const url = `${ EXCHANGE_APIS.okx }/market/candles?instId=${ symbol }&bar=${ interval }&limit=${ limit }`;
  const response = await fetch( url );
  if ( !response.ok ) throw new Error( `OKX API error: ${ response.status }` );
  const data = await response.json();
  if ( data.code !== "0" ) throw new Error( `OKX error: ${ data.msg }` );
  return data.data.map( ( k: string[] ) => ( {
    timestamp: parseInt( k[ 0 ] ),
    open: parseFloat( k[ 1 ] ),
    high: parseFloat( k[ 2 ] ),
    low: parseFloat( k[ 3 ] ),
    close: parseFloat( k[ 4 ] ),
    volume: parseFloat( k[ 7 ] )
  } ) ).reverse();
}

async function fetchBitget ( symbol: string, interval: string, limit: number ): Promise<OHLCV[]>
{
  const url = `${ EXCHANGE_APIS.bitget }/market/candles?symbol=${ symbol }&period=${ interval }&limit=${ limit }`;
  const response = await fetch( url );
  if ( !response.ok ) throw new Error( `Bitget API error: ${ response.status }` );
  const data = await response.json();
  if ( data.code !== "00000" ) throw new Error( `Bitget error: ${ data.msg }` );
  return data.data.map( ( k: string[] ) => ( {
    timestamp: parseInt( k[ 0 ] ),
    open: parseFloat( k[ 1 ] ),
    high: parseFloat( k[ 2 ] ),
    low: parseFloat( k[ 3 ] ),
    close: parseFloat( k[ 4 ] ),
    volume: parseFloat( k[ 6 ] )
  } ) );
}

async function fetchBingX ( symbol: string, interval: string, limit: number ): Promise<OHLCV[]>
{
  const url = `${ EXCHANGE_APIS.bingx }/quote/klines?symbol=${ symbol }&interval=${ interval }&limit=${ limit }`;
  const response = await fetch( url );
  if ( !response.ok ) throw new Error( `BingX API error: ${ response.status }` );
  const data = await response.json();
  if ( data.code !== 0 ) throw new Error( `BingX error: ${ data.msg }` );
  return data.data.map( ( k: any ) => ( {
    timestamp: k.time,
    open: parseFloat( k.open ),
    high: parseFloat( k.high ),
    low: parseFloat( k.low ),
    close: parseFloat( k.close ),
    volume: parseFloat( k.quoteVolume || '0' ) || ( parseFloat( k.volume ) * parseFloat( k.close ) )
  } ) );
}

async function fetchPhemex ( symbol: string, interval: string, limit: number ): Promise<OHLCV[]>
{
  const url = `${ EXCHANGE_APIS.phemex }/exchange/public/md/kline?symbol=${ symbol }&resolution=${ interval }&limit=${ limit }`;
  const response = await fetch( url );
  if ( !response.ok ) throw new Error( `Phemex API error: ${ response.status }` );
  const data = await response.json();
  if ( data.code !== 0 ) throw new Error( `Phemex error: ${ data.msg }` );
  return data.data.rows.map( ( k: number[] ) => ( {
    timestamp: k[ 0 ] * 1000,
    open: k[ 3 ] / 10000,
    high: k[ 4 ] / 10000,
    low: k[ 5 ] / 10000,
    close: k[ 6 ] / 10000,
    volume: k[ 8 ]
  } ) );
}

async function fetchHTX ( symbol: string, interval: string, limit: number ): Promise<OHLCV[]>
{
  const url = `${ EXCHANGE_APIS.htx }/market/history/kline?symbol=${ symbol }&period=${ interval }&size=${ limit }`;
  const response = await fetch( url );
  if ( !response.ok ) throw new Error( `HTX API error: ${ response.status }` );
  const data = await response.json();
  if ( data.status !== "ok" ) throw new Error( `HTX error: ${ data[ 'err-msg' ] }` );
  return data.data.map( ( k: any ) => ( {
    timestamp: k.id * 1000,
    open: k.open,
    high: k.high,
    low: k.low,
    close: k.close,
    volume: k.vol
  } ) ).reverse();
}

async function fetchGate ( symbol: string, interval: string, limit: number ): Promise<OHLCV[]>
{
  const url = `${ EXCHANGE_APIS.gate }/spot/candlesticks?currency_pair=${ symbol }&interval=${ interval }&limit=${ limit }`;
  const response = await fetch( url );
  if ( !response.ok ) throw new Error( `Gate.io API error: ${ response.status }` );
  const rawData = await response.json();
  return rawData.map( ( k: string[] ) => ( {
    timestamp: parseInt( k[ 0 ] ) * 1000,
    volume: parseFloat( k[ 1 ] ),
    close: parseFloat( k[ 2 ] ),
    high: parseFloat( k[ 3 ] ),
    low: parseFloat( k[ 4 ] ),
    open: parseFloat( k[ 5 ] )
  } ) ).reverse();
}

async function fetchCryptoCom ( symbol: string, interval: string, limit: number ): Promise<OHLCV[]>
{
  const url = `${ EXCHANGE_APIS.cryptocom }/public/get-candlestick?instrument_name=${ symbol }&timeframe=${ interval }`;
  const response = await fetch( url );
  if ( !response.ok ) throw new Error( `Crypto.com API error: ${ response.status }` );
  const data = await response.json();
  if ( data.code !== 0 ) throw new Error( `Crypto.com error: ${ data.message }` );
  return data.result.data.slice( 0, limit ).map( ( k: any ) => ( {
    timestamp: k.t,
    open: parseFloat( k.o ),
    high: parseFloat( k.h ),
    low: parseFloat( k.l ),
    close: parseFloat( k.c ),
    volume: parseFloat( k.v ) * parseFloat( k.c )
  } ) );
}

async function fetchKraken ( symbol: string, interval: string, limit: number ): Promise<OHLCV[]>
{
  const pair = symbol === "BTCUSD" ? "XBTUSD" : symbol;
  const url = `${ EXCHANGE_APIS.kraken }/public/OHLC?pair=${ pair }&interval=${ interval }`;
  const response = await fetch( url );
  if ( !response.ok ) throw new Error( `Kraken API error: ${ response.status }` );
  const data = await response.json();
  if ( data.error && data.error.length > 0 ) throw new Error( `Kraken error: ${ data.error.join( ", " ) }` );
  const pairKey = Object.keys( data.result ).find( k => k !== "last" );
  if ( !pairKey ) throw new Error( "Kraken: No data found" );
  return data.result[ pairKey ].slice( -limit ).map( ( k: ( string | number )[] ) => ( {
    timestamp: ( k[ 0 ] as number ) * 1000,
    open: parseFloat( k[ 1 ] as string ),
    high: parseFloat( k[ 2 ] as string ),
    low: parseFloat( k[ 3 ] as string ),
    close: parseFloat( k[ 4 ] as string ),
    volume: parseFloat( k[ 6 ] as string ) * parseFloat( k[ 5 ] as string )
  } ) );
}

async function fetchBitmart ( symbol: string, interval: string, limit: number ): Promise<OHLCV[]>
{
  const url = `${ EXCHANGE_APIS.bitmart }/history/kline?symbol=${ symbol }&step=${ interval }&limit=${ limit }`;
  const response = await fetch( url );
  if ( !response.ok ) throw new Error( `Bitmart API error: ${ response.status }` );
  const data = await response.json();
  return data.data.map( ( k: any ) => ( {
    timestamp: k.t * 1000,
    open: parseFloat( k.o ),
    high: parseFloat( k.h ),
    low: parseFloat( k.l ),
    close: parseFloat( k.c ),
    volume: parseFloat( k.v ) * parseFloat( k.c )
  } ) );
}

async function fetchCoinex ( symbol: string, interval: string, limit: number ): Promise<OHLCV[]>
{
  const url = `${ EXCHANGE_APIS.coinex }/market/kline?market=${ symbol }&type=${ interval }&limit=${ limit }`;
  const response = await fetch( url );
  if ( !response.ok ) throw new Error( `CoinEx API error: ${ response.status }` );
  const data = await response.json();
  return data.data.map( ( k: any ) => ( {
    timestamp: k[ 0 ] * 1000,
    open: parseFloat( k[ 1 ] ),
    close: parseFloat( k[ 2 ] ),
    high: parseFloat( k[ 3 ] ),
    low: parseFloat( k[ 4 ] ),
    volume: parseFloat( k[ 6 ] )
  } ) );
}

async function fetchDigifinex ( symbol: string, interval: string, limit: number ): Promise<OHLCV[]>
{
  const url = `${ EXCHANGE_APIS.digifinex }/kline?symbol=${ symbol }&period=${ interval }&limit=${ limit }`;
  const response = await fetch( url );
  if ( !response.ok ) throw new Error( `DigiFinex API error: ${ response.status }` );
  const data = await response.json();
  return data.data.map( ( k: any ) => ( {
    timestamp: k[ 0 ] * 1000,
    volume: parseFloat( k[ 1 ] ) * parseFloat( k[ 2 ] ),
    close: parseFloat( k[ 2 ] ),
    high: parseFloat( k[ 3 ] ),
    low: parseFloat( k[ 4 ] ),
    open: parseFloat( k[ 5 ] )
  } ) );
}

export async function POST ( request: NextRequest )
{
  try
  {
    const body = await request.json();
    const { symbols, interval = "1h", limit = 100, exchange = "bybit" } = body;

    if ( !Array.isArray( symbols ) || symbols.length === 0 )
    {
      return NextResponse.json( { error: "symbols must be a non-empty array" }, { status: 400 } );
    }

    if ( symbols.length > 50 )
    {
      return NextResponse.json( { error: "Maximum 50 symbols allowed per request" }, { status: 400 } );
    }

    const results = await Promise.allSettled(
      symbols.map( async ( symbol: string ) =>
      {
        const ohlcv = await fetchFromExchange( exchange, symbol.toUpperCase(), interval, limit );
        return { symbol: symbol.toUpperCase(), interval, data: ohlcv };
      } )
    );

    const successfulResults = results
      .filter( ( r ): r is PromiseFulfilledResult<{ symbol: string; interval: string; data: OHLCV[] | null }> =>
        r.status === "fulfilled" && r.value.data !== null
      )
      .map( r => r.value );

    const failedSymbols = results
      .filter( ( r, i ) => r.status === "rejected" || ( r.status === "fulfilled" && r.value.data === null ) )
      .map( ( _, i ) => symbols[ i ] );

    return NextResponse.json( {
      success: successfulResults,
      failed: failedSymbols,
      exchange,
      lastUpdated: new Date().toISOString()
    } );

  } catch ( error )
  {
    console.error( "Batch OHLCV API Error:", error );
    return NextResponse.json(
      { error: "Failed to fetch batch OHLCV data", details: String( error ) },
      { status: 500 }
    );
  }
}
