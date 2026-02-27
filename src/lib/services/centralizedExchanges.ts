/**
 * 🏢 Centralized Exchanges (CEX) Manager
 * Unified class to manage API integrations via internal proxy.
 */

export interface CEXCoin {
  symbol: string;
  base: string;
  quote: string;
  volume: number;
}

export type ExchangeId = 
  | 'binance' | 'bybit' | 'okx' | 'coinbase' | 'kraken' 
  | 'kucoin' | 'mexc' | 'gateio' | 'bitget' | 'htx' 
  | 'cryptocom' | 'bingx' | 'phemex' | 'pionex' 
  | 'bitmart' | 'coinex' | 'digifinex';

class CEXManager {
  private static instance: CEXManager;
  private cache: Record<string, { data: any; timestamp: number }> = {};
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): CEXManager {
    if (!CEXManager.instance) {
      CEXManager.instance = new CEXManager();
    }
    return CEXManager.instance;
  }

  private async fetchViaProxy(exchange: string, endpoint: string) {
    const res = await fetch(`/api/cex?exchange=${exchange}&endpoint=${encodeURIComponent(endpoint)}`);
    if (!res.ok) throw new Error('Proxy request failed');
    return res.json();
  }

  private async fetchBybitTop(limit: number): Promise<CEXCoin[]> {
    try {
      const data = await this.fetchViaProxy('bybit', 'https://api.bybit.com/v5/market/tickers?category=spot');
      if (!data?.result?.list) return [];
      
      return data.result.list
        .filter((t: any) => t.symbol.endsWith('USDT'))
        .sort((a: any, b: any) => parseFloat(b.volume24h) - parseFloat(a.volume24h))
        .slice(0, limit)
        .map((t: any) => {
          const base = t.symbol.replace('USDT', '');
          return { symbol: `${base}/USDT`, base, quote: 'USDT', volume: parseFloat(t.volume24h) };
        });
    } catch (err) {
      console.error("Error fetching Bybit top coins:", err);
      return [];
    }
  }

  private async fetchBinanceTop(limit: number): Promise<CEXCoin[]> {
    try {
      const data = await this.fetchViaProxy('binance', 'https://api.binance.com/api/v3/ticker/24hr');
      if (!Array.isArray(data)) return [];

      return data
        .filter((t: any) => t.symbol.endsWith('USDT'))
        .sort((a: any, b: any) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
        .slice(0, limit)
        .map((t: any) => {
          const base = t.symbol.replace('USDT', '');
          return { symbol: `${base}/USDT`, base, quote: 'USDT', volume: parseFloat(t.quoteVolume) };
        });
    } catch (err) {
      console.error("Error fetching Binance top coins:", err);
      return [];
    }
  }

  async getTopCoinsByVolume(exchangeId: ExchangeId): Promise<CEXCoin[]> {
    const cacheKey = `top_coins_${exchangeId}`;
    const cached = this.cache[cacheKey];
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      let results: CEXCoin[] = [];
      switch (exchangeId) {
        case 'binance':
          return this.fetchBinanceTop(300);
        case 'pionex':
          return this.fetchBybitTop(300); // Redirecting pionex to bybit or remove
        case 'bybit':
          return this.fetchBybitTop(300);
        case 'okx':
          return this.fetchOKXTop(300);
        case 'coinbase':
          return this.fetchCoinbaseTop(300);
        case 'kraken':
          return this.fetchKrakenTop(300);
        case 'kucoin':
          return this.fetchKuCoinTop(300);
        case 'mexc':
          return this.fetchMEXCTop(300);
        case 'gateio':
          return this.fetchGateioTop(300);
        case 'bitget':
          return this.fetchBitgetTop(300);
        case 'htx':
          return this.fetchHTXTop(300);
        case 'cryptocom':
          return this.fetchCryptoComTop(300);
        case 'bingx':
          return this.fetchBingXTop(300);
        case 'phemex':
          return this.fetchPhemexTop(300);
        case 'bitmart':
          return this.fetchBitmartTop(300);
        case 'coinex':
          return this.fetchCoinexTop(300);
        case 'digifinex':
          return this.fetchDigifinexTop(300);
        default:
          results = await this.fetchBybitTop(300);
      }
      
      this.cache[cacheKey] = { data: results, timestamp: Date.now() };
      return results;
    } catch (error) {
      console.error(`Error fetching top coins for ${exchangeId}:`, error);
      return [];
    }
  }

  private async fetchOKXTop(limit: number): Promise<CEXCoin[]> {
    const data = await this.fetchViaProxy('okx', 'https://www.okx.com/api/v5/market/tickers?instType=SPOT');
    return data.data
      .filter((t: any) => t.instId.endsWith('-USDT') || t.instId.endsWith('-USDC') || t.instId.endsWith('-USD'))
      .sort((a: any, b: any) => parseFloat(b.vol24h) - parseFloat(a.vol24h))
      .slice(0, limit)
      .map((t: any) => {
        const [base, quote] = t.instId.split('-');
        return { symbol: `${base}/${quote}`, base, quote, volume: parseFloat(t.vol24h) };
      });
  }

  private async fetchCoinbaseTop(limit: number): Promise<CEXCoin[]> {
    const products = await this.fetchViaProxy('coinbase', 'https://api.exchange.coinbase.com/products');
    const quotes = ['USD', 'USDT', 'USDC', 'EUR', 'GBP', 'BTC', 'ETH'];
    return products
      .filter((p: any) => quotes.includes(p.quote_currency))
      .slice(0, limit)
      .map((p: any) => ({ symbol: `${p.base_currency}/${p.quote_currency}`, base: p.base_currency, quote: p.quote_currency, volume: 0 }));
  }

  private async fetchKrakenTop(limit: number): Promise<CEXCoin[]> {
    const data = await this.fetchViaProxy('kraken', 'https://api.kraken.com/0/public/AssetPairs');
    const pairs = Object.values(data.result);
    return pairs
      .filter((p: any) => p.wsname && (p.wsname.endsWith('/USDT') || p.wsname.endsWith('/USD') || p.wsname.endsWith('/USDC')))
      .slice(0, limit)
      .map((p: any) => {
        const [base, quote] = p.wsname.split('/');
        return { symbol: `${base}/${quote}`, base, quote, volume: 0 };
      });
  }

  private async fetchKuCoinTop(limit: number): Promise<CEXCoin[]> {
    const data = await this.fetchViaProxy('kucoin', 'https://api.kucoin.com/api/v1/market/allTickers');
    return data.data.ticker
      .filter((t: any) => t.symbol.endsWith('-USDT'))
      .sort((a: any, b: any) => parseFloat(b.volValue) - parseFloat(a.volValue))
      .slice(0, limit)
      .map((t: any) => {
        const base = t.symbol.replace('-USDT', '');
        return { symbol: `${base}/USDT`, base, quote: 'USDT', volume: parseFloat(t.volValue) };
      });
  }

  private async fetchMEXCTop(limit: number): Promise<CEXCoin[]> {
    const data = await this.fetchViaProxy('mexc', 'https://api.mexc.com/api/v3/ticker/24hr');
    return data
      .filter((t: any) => t.symbol.endsWith('USDT'))
      .sort((a: any, b: any) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
      .slice(0, limit)
      .map((t: any) => {
        const base = t.symbol.replace('USDT', '');
        return { symbol: `${base}/USDT`, base, quote: 'USDT', volume: parseFloat(t.quoteVolume) };
      });
  }

  private async fetchGateioTop(limit: number): Promise<CEXCoin[]> {
    const data = await this.fetchViaProxy('gateio', 'https://api.gateio.ws/api/v4/spot/tickers');
    return data
      .filter((t: any) => t.currency_pair.endsWith('_USDT'))
      .sort((a: any, b: any) => parseFloat(b.quote_volume) - parseFloat(a.quote_volume))
      .slice(0, limit)
      .map((t: any) => {
        const base = t.currency_pair.replace('_USDT', '');
        return { symbol: `${base}/USDT`, base, quote: 'USDT', volume: parseFloat(t.quote_volume) };
      });
  }

  private async fetchBitgetTop(limit: number): Promise<CEXCoin[]> {
    const data = await this.fetchViaProxy('bitget', 'https://api.bitget.com/api/spot/v1/market/tickers');
    return data.data
      .filter((t: any) => t.symbol.endsWith('USDT'))
      .sort((a: any, b: any) => parseFloat(b.quoteVol) - parseFloat(a.quoteVol))
      .slice(0, limit)
      .map((t: any) => {
        const base = t.symbol.replace('USDT', '');
        return { symbol: `${base}/USDT`, base, quote: 'USDT', volume: parseFloat(t.quoteVol) };
      });
  }

  private async fetchHTXTop(limit: number): Promise<CEXCoin[]> {
    const data = await this.fetchViaProxy('htx', 'https://api.huobi.pro/market/tickers');
    return data.data
      .filter((t: any) => t.symbol.endsWith('usdt'))
      .sort((a: any, b: any) => b.vol - a.vol)
      .slice(0, limit)
      .map((t: any) => {
        const base = t.symbol.replace('usdt', '').toUpperCase();
        return { symbol: `${base}/USDT`, base, quote: 'USDT', volume: t.vol };
      });
  }

  private async fetchCryptoComTop(limit: number): Promise<CEXCoin[]> {
    const data = await this.fetchViaProxy('cryptocom', 'https://api.crypto.com/v2/public/get-ticker');
    return data.result.data
      .filter((t: any) => t.i.endsWith('_USDT'))
      .sort((a: any, b: any) => b.vv - a.vv)
      .slice(0, limit)
      .map((t: any) => {
        const base = t.i.replace('_USDT', '');
        return { symbol: `${base}/USDT`, base, quote: 'USDT', volume: t.vv };
      });
  }

  private async fetchBingXTop(limit: number): Promise<CEXCoin[]> {
    const data = await this.fetchViaProxy('bingx', 'https://open-api.bingx.com/openApi/spot/v1/market/tickers');
    return data.data.tickers
      .filter((t: any) => t.symbol.endsWith('-USDT'))
      .sort((a: any, b: any) => parseFloat(b.volume) - parseFloat(a.volume))
      .slice(0, limit)
      .map((t: any) => {
        const base = t.symbol.replace('-USDT', '');
        return { symbol: `${base}/USDT`, base, quote: 'USDT', volume: parseFloat(t.volume) };
      });
  }

  private async fetchPhemexTop(limit: number): Promise<CEXCoin[]> {
    const data = await this.fetchViaProxy('phemex', 'https://api.phemex.com/md/spot/ticker/24hr/all');
    return data.result
      .filter((t: any) => t.symbol.startsWith('s') && t.symbol.endsWith('USDT'))
      .sort((a: any, b: any) => b.turnoverEv - a.turnoverEv)
      .slice(0, limit)
      .map((t: any) => {
        const base = t.symbol.replace('s', '').replace('USDT', '');
        return { symbol: `${base}/USDT`, base, quote: 'USDT', volume: t.turnoverEv / 1e8 };
      });
  }

  private async fetchBitmartTop(limit: number): Promise<CEXCoin[]> {
    const data = await this.fetchViaProxy('bitmart', 'https://api-cloud.bitmart.com/spot/v1/ticker');
    return data.data.tickers
      .filter((t: any) => t.symbol.endsWith('_USDT'))
      .sort((a: any, b: any) => parseFloat(b.quote_volume_24h) - parseFloat(a.quote_volume_24h))
      .slice(0, limit)
      .map((t: any) => {
        const base = t.symbol.replace('_USDT', '');
        return { symbol: `${base}/USDT`, base, quote: 'USDT', volume: parseFloat(t.quote_volume_24h) };
      });
  }

  private async fetchCoinexTop(limit: number): Promise<CEXCoin[]> {
    const data = await this.fetchViaProxy('coinex', 'https://api.coinex.com/v1/market/ticker/all');
    return Object.entries(data.data.ticker)
      .filter(([symbol]) => symbol.endsWith('USDT'))
      .sort(([, a]: any, [, b]: any) => parseFloat(b.vol) - parseFloat(a.vol))
      .slice(0, limit)
      .map(([symbol, t]: any) => {
        const base = symbol.replace('USDT', '');
        return { symbol: `${base}/USDT`, base, quote: 'USDT', volume: parseFloat(t.vol) };
      });
  }

  private async fetchDigifinexTop(limit: number): Promise<CEXCoin[]> {
    const data = await this.fetchViaProxy('digifinex', 'https://openapi.digifinex.com/v3/ticker');
    return data.ticker
      .filter((t: any) => t.symbol.endsWith('_usdt'))
      .sort((a: any, b: any) => b.base_vol - a.base_vol)
      .slice(0, limit)
      .map((t: any) => {
        const base = t.symbol.replace('_usdt', '').toUpperCase();
        return { symbol: `${base}/USDT`, base, quote: 'USDT', volume: t.base_vol };
      });
  }
}

export const cexManager = CEXManager.getInstance();
