import { NextRequest, NextResponse } from 'next/server';

/**
 * 📊 Ticker API Route - Updated to use direct fetch
 * GET /api/exchanges/ticker?exchange=bybit&symbol=BTCUSDT
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const exchange = searchParams.get('exchange');
    const symbol = searchParams.get('symbol');

    if (!exchange || !symbol) {
      return NextResponse.json(
        { error: 'Missing required parameters: exchange and symbol' },
        { status: 400 }
      );
    }

    // Use the internal proxy to fetch ticker data for all 17 exchanges
    const cleanSymbol = symbol.replace('/', '');
    let url = '';
    
    switch (exchange) {
      case 'pionex':
        url = `https://api.bybit.com/v5/market/tickers?category=spot&symbol=${cleanSymbol}`;
        break;
      case 'bybit':
        url = `https://api.bybit.com/v5/market/tickers?category=spot&symbol=${cleanSymbol}`;
        break;
      case 'okx':
        url = `https://www.okx.com/api/v5/market/ticker?instId=${symbol.replace('/', '-')}`;
        break;
      case 'kucoin':
        url = `https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=${symbol.replace('/', '-')}`;
        break;
      case 'mexc':
        url = `https://api.mexc.com/api/v3/ticker/24hr?symbol=${cleanSymbol}`;
        break;
      case 'gateio':
        url = `https://api.gateio.ws/api/v4/spot/tickers?currency_pair=${symbol.replace('/', '_')}`;
        break;
      case 'bitget':
        url = `https://api.bitget.com/api/spot/v1/market/ticker?symbol=${cleanSymbol}`;
        break;
      case 'htx':
        url = `https://api.huobi.pro/market/detail/merged?symbol=${cleanSymbol.toLowerCase()}`;
        break;
      case 'cryptocom':
        url = `https://api.crypto.com/v2/public/get-ticker?instrument_name=${symbol.replace('/', '_')}`;
        break;
      case 'bitmart':
        url = `https://api-cloud.bitmart.com/spot/v1/ticker?symbol=${symbol.replace('/', '_')}`;
        break;
      case 'coinex':
        url = `https://api.coinex.com/v1/market/ticker?market=${cleanSymbol}`;
        break;
      case 'digifinex':
        url = `https://openapi.digifinex.com/v3/ticker?symbol=${symbol.replace('/', '_').toLowerCase()}`;
        break;
      default:
        url = `https://api.bybit.com/v5/market/tickers?category=spot&symbol=${cleanSymbol}`;
    }

    const baseUrl = request.nextUrl.origin;
    const proxyUrl = `${baseUrl}/api/cex?exchange=${exchange}&endpoint=${encodeURIComponent(url)}`;
    
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(`Exchange API Proxy responded with ${response.status}`);
    }

    const rawData = await response.json();
    
    // Normalize data format
    let normalizedData = rawData;
    if (exchange === 'bybit') normalizedData = rawData.result?.list?.[0] || rawData;
    if (exchange === 'okx') normalizedData = rawData.data?.[0] || rawData;
    if (exchange === 'kucoin') normalizedData = rawData.data || rawData;
    if (exchange === 'htx') normalizedData = rawData.tick || rawData;
    if (exchange === 'cryptocom') normalizedData = rawData.result?.data?.[0] || rawData;
    if (exchange === 'bitmart') normalizedData = rawData.data?.tickers?.[0] || rawData;
    if (exchange === 'coinex') normalizedData = rawData.data?.ticker || rawData;
    if (exchange === 'digifinex') normalizedData = rawData.ticker?.[0] || rawData;

    // Map common fields for MarketsView
    const finalData = {
      symbol: symbol,
      last: parseFloat(normalizedData.last || normalizedData.lastPrice || normalizedData.idxPrice || normalizedData.close || 0),
      percentage: parseFloat(normalizedData.priceChangePercent || normalizedData.change24h || normalizedData.percent || 0),
      quoteVolume: parseFloat(normalizedData.quoteVolume || normalizedData.turnover || normalizedData.vol24h || normalizedData.vol || 0)
    };

    return NextResponse.json({
      success: true,
      data: finalData,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Ticker API Error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
