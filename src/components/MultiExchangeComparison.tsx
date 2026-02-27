/**
 * 🔗 Multi-Exchange Price Comparison Component
 * Compare prices across multiple exchanges in real-time
 */

'use client';

import { useState, useEffect } from 'react';
import type { ExchangeId, Ticker, ApiResponse } from '@/types/exchanges';

interface ExchangePrice {
  exchange: ExchangeId;
  price: number | null;
  volume: number | null;
  spread: number | null;
  loading: boolean;
  error: string | null;
}

export default function MultiExchangeComparison() {
  const [symbol, setSymbol] = useState<string>('BTC/USDT');
  const [exchanges] = useState<ExchangeId[]>([
    'bybit',
    'coinbase',
    'okx',
    'bitget',
    'kucoin',
    'mexc',
  ]);
  
  const [prices, setPrices] = useState<Partial<Record<ExchangeId, ExchangePrice>>>({
    bybit: { exchange: 'bybit', price: null, volume: null, spread: null, loading: true, error: null },
    coinbase: { exchange: 'coinbase', price: null, volume: null, spread: null, loading: true, error: null },
    okx: { exchange: 'okx', price: null, volume: null, spread: null, loading: true, error: null },
    bitget: { exchange: 'bitget', price: null, volume: null, spread: null, loading: true, error: null },
    kucoin: { exchange: 'kucoin', price: null, volume: null, spread: null, loading: true, error: null },
    mexc: { exchange: 'mexc', price: null, volume: null, spread: null, loading: true, error: null },
  });

  const [aggregatedOrderBook, setAggregatedOrderBook] = useState<any>(null);

  // Fetch prices from all exchanges
  const fetchPrices = async () => {
    const promises = exchanges.map(async (exchange) => {
      try {
        const response = await fetch(
          `/api/exchanges/ticker?exchange=${exchange}&symbol=${encodeURIComponent(symbol)}`
        );
        const result: ApiResponse<Ticker> = await response.json();

        if (result.success && result.data) {
          return {
            exchange,
            price: result.data.last,
            volume: result.data.baseVolume,
            spread: result.data.ask && result.data.bid ? result.data.ask - result.data.bid : null,
            loading: false,
            error: null,
          };
        } else {
          return {
            exchange,
            price: null,
            volume: null,
            spread: null,
            loading: false,
            error: result.error || 'Unknown error',
          };
        }
      } catch (error) {
        return {
          exchange,
          price: null,
          volume: null,
          spread: null,
          loading: false,
          error: (error as Error).message,
        };
      }
    });

    const results = await Promise.all(promises);
    
    const newPrices: Partial<Record<ExchangeId, ExchangePrice>> = {};
    results.forEach((result) => {
      newPrices[result.exchange] = result;
    });
    
    setPrices(newPrices);
  };

  // Fetch aggregated order book
  const fetchAggregatedOrderBook = async () => {
    try {
      const exchangesList = exchanges.join(',');
      const response = await fetch(
        `/api/exchanges/aggregated?exchanges=${exchangesList}&symbol=${encodeURIComponent(symbol)}&limit=10`
      );
      const result = await response.json();

      if (result.success && result.data) {
        setAggregatedOrderBook(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch aggregated order book:', error);
    }
  };

  // Auto-refresh every 2 seconds
  useEffect(() => {
    fetchPrices();
    fetchAggregatedOrderBook();

    const interval = setInterval(() => {
      fetchPrices();
      fetchAggregatedOrderBook();
    }, 2000);

    return () => clearInterval(interval);
  }, [symbol]);

  // Calculate price stats
  const validPrices = Object.values(prices)
    .filter((p) => p.price !== null)
    .map((p) => p.price!);

  const lowestPrice = validPrices.length > 0 ? Math.min(...validPrices) : null;
  const highestPrice = validPrices.length > 0 ? Math.max(...validPrices) : null;
  const averagePrice = validPrices.length > 0
    ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length
    : null;

  const priceDiff = lowestPrice && highestPrice ? highestPrice - lowestPrice : null;
  const priceDiffPercent = lowestPrice && priceDiff ? (priceDiff / lowestPrice) * 100 : null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Multi-Exchange Price Comparison</h1>

      {/* Symbol Input */}
      <div className="mb-6">
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="BTC/USDT"
          className="px-4 py-2 border rounded-lg w-full max-w-md"
        />
      </div>

      {/* Price Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-white rounded-lg shadow">
          <p className="text-sm text-gray-600">Average Price</p>
          <p className="text-2xl font-bold">
            {averagePrice ? `$${averagePrice.toFixed(2)}` : '-'}
          </p>
        </div>
        <div className="p-4 bg-green-50 rounded-lg shadow">
          <p className="text-sm text-gray-600">Lowest Price</p>
          <p className="text-2xl font-bold text-green-600">
            {lowestPrice ? `$${lowestPrice.toFixed(2)}` : '-'}
          </p>
        </div>
        <div className="p-4 bg-red-50 rounded-lg shadow">
          <p className="text-sm text-gray-600">Highest Price</p>
          <p className="text-2xl font-bold text-red-600">
            {highestPrice ? `$${highestPrice.toFixed(2)}` : '-'}
          </p>
        </div>
        <div className="p-4 bg-blue-50 rounded-lg shadow">
          <p className="text-sm text-gray-600">Arbitrage Opportunity</p>
          <p className="text-2xl font-bold text-blue-600">
            {priceDiffPercent ? `${priceDiffPercent.toFixed(3)}%` : '-'}
          </p>
          {priceDiff && (
            <p className="text-sm text-gray-600">${priceDiff.toFixed(2)}</p>
          )}
        </div>
      </div>

      {/* Exchange Prices Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Exchange
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Price
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Spread
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                24h Volume
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Diff from Avg
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {exchanges.map((exchange) => {
              const data = prices[exchange];
              if (!data) return null;
              
              const diffFromAvg = data.price && averagePrice
                ? ((data.price - averagePrice) / averagePrice) * 100
                : null;

              return (
                <tr key={exchange} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-semibold capitalize">{exchange}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {data.loading ? (
                      <span className="text-gray-400">Loading...</span>
                    ) : data.error ? (
                      <span className="text-red-500 text-xs">Error</span>
                    ) : data.price ? (
                      <span className="text-lg font-semibold">
                        ${data.price.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {data.spread ? (
                      <span className="text-sm">${data.spread.toFixed(2)}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {data.volume ? (
                      <span className="text-sm">{data.volume.toFixed(2)}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {diffFromAvg !== null ? (
                      <span
                        className={`text-sm font-semibold ${
                          diffFromAvg > 0 ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        {diffFromAvg > 0 ? '+' : ''}
                        {diffFromAvg.toFixed(3)}%
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Aggregated Order Book */}
      {aggregatedOrderBook && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Aggregated Order Book (All Exchanges)</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600">Exchanges</p>
              <p className="text-lg font-semibold">
                {aggregatedOrderBook.exchanges.join(', ')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Spread</p>
              <p className="text-lg font-semibold">
                ${aggregatedOrderBook.spread.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Spread %</p>
              <p className="text-lg font-semibold">
                {aggregatedOrderBook.spreadPercent.toFixed(4)}%
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Aggregated Bids */}
            <div>
              <h3 className="text-sm font-semibold text-green-600 mb-2">
                AGGREGATED BIDS
              </h3>
              <div className="space-y-1 text-sm">
                {aggregatedOrderBook.bids.slice(0, 10).map((bid: any, i: number) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-green-600">{bid.price.toFixed(2)}</span>
                    <span className="text-gray-600">{bid.amount.toFixed(4)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Aggregated Asks */}
            <div>
              <h3 className="text-sm font-semibold text-red-600 mb-2">
                AGGREGATED ASKS
              </h3>
              <div className="space-y-1 text-sm">
                {aggregatedOrderBook.asks.slice(0, 10).map((ask: any, i: number) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-red-600">{ask.price.toFixed(2)}</span>
                    <span className="text-gray-600">{ask.amount.toFixed(4)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
