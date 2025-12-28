/**
 * 📊 Trading Dashboard Component
 * Example usage of CCXT integration system
 */

'use client';

import { useState } from 'react';
import { useTicker, useOrderBook, useOHLCV, useTrades } from '@/hooks/useExchangeData';
import type { ExchangeId } from '@/lib/exchanges/types';

export default function TradingDashboard() {
  const [exchange, setExchange] = useState<ExchangeId>('binance');
  const [symbol, setSymbol] = useState<string>('BTC/USDT');

  // Fetch data with auto-refresh
  const ticker = useTicker({
    exchange,
    symbol,
    refreshInterval: 1000,
  });

  const orderBook = useOrderBook({
    exchange,
    symbol,
    limit: 20,
    refreshInterval: 500,
  });

  const candles = useOHLCV({
    exchange,
    symbol,
    timeframe: '1h',
    limit: 24,
    refreshInterval: 5000,
  });

  const trades = useTrades({
    exchange,
    symbol,
    limit: 20,
    refreshInterval: 1000,
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4">Trading Dashboard</h1>
        
        <div className="flex gap-4">
          {/* Exchange Selector */}
          <select
            value={exchange}
            onChange={(e) => setExchange(e.target.value as ExchangeId)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="binance">Binance Spot</option>
            <option value="binance-usdm">Binance USDⓈ-M</option>
            <option value="bybit">Bybit Spot</option>
            <option value="bybit-linear">Bybit Linear</option>
            <option value="okx">OKX Spot</option>
            <option value="okx-swap">OKX Swap</option>
            <option value="bitget">Bitget Spot</option>
            <option value="bitget-futures">Bitget Futures</option>
            <option value="kucoin">KuCoin Spot</option>
            <option value="kucoin-futures">KuCoin Futures</option>
          </select>

          {/* Symbol Input */}
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="BTC/USDT"
            className="px-4 py-2 border rounded-lg"
          />
        </div>
      </div>

      {/* Ticker */}
      <div className="mb-6 p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Price Ticker</h2>
        
        {ticker.loading ? (
          <div>Loading...</div>
        ) : ticker.error ? (
          <div className="text-red-500">Error: {ticker.error}</div>
        ) : ticker.data ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Last Price</p>
              <p className="text-2xl font-bold">${ticker.data.last?.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">24h High</p>
              <p className="text-lg text-green-600">${ticker.data.high?.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">24h Low</p>
              <p className="text-lg text-red-600">${ticker.data.low?.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">24h Volume</p>
              <p className="text-lg">{ticker.data.baseVolume?.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Bid</p>
              <p className="text-lg">${ticker.data.bid?.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Ask</p>
              <p className="text-lg">${ticker.data.ask?.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Spread</p>
              <p className="text-lg">
                ${((ticker.data.ask || 0) - (ticker.data.bid || 0)).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Cache Status</p>
              <p className={`text-lg ${ticker.cached ? 'text-blue-600' : 'text-gray-600'}`}>
                {ticker.cached ? 'Cached' : 'Live'}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Order Book */}
        <div className="p-6 bg-white rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Order Book</h2>
          
          {orderBook.loading ? (
            <div>Loading...</div>
          ) : orderBook.error ? (
            <div className="text-red-500">Error: {orderBook.error}</div>
          ) : orderBook.data ? (
            <div className="grid grid-cols-2 gap-4">
              {/* Bids */}
              <div>
                <h3 className="text-sm font-semibold text-green-600 mb-2">BIDS</h3>
                <div className="space-y-1 text-sm">
                  {orderBook.data.bids.slice(0, 10).map((bid, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="text-green-600">{bid.price.toFixed(2)}</span>
                      <span className="text-gray-600">{bid.amount.toFixed(4)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Asks */}
              <div>
                <h3 className="text-sm font-semibold text-red-600 mb-2">ASKS</h3>
                <div className="space-y-1 text-sm">
                  {orderBook.data.asks.slice(0, 10).map((ask, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="text-red-600">{ask.price.toFixed(2)}</span>
                      <span className="text-gray-600">{ask.amount.toFixed(4)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Recent Trades */}
        <div className="p-6 bg-white rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Recent Trades</h2>
          
          {trades.loading ? (
            <div>Loading...</div>
          ) : trades.error ? (
            <div className="text-red-500">Error: {trades.error}</div>
          ) : trades.data ? (
            <div className="space-y-2">
              {trades.data.slice(0, 15).map((trade, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className={trade.side === 'buy' ? 'text-green-600' : 'text-red-600'}>
                    {trade.side.toUpperCase()}
                  </span>
                  <span className="font-semibold">{trade.price.toFixed(2)}</span>
                  <span className="text-gray-600">{trade.amount.toFixed(4)}</span>
                  <span className="text-gray-400 text-xs">
                    {new Date(trade.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* OHLCV Candles */}
      <div className="mt-6 p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">OHLCV Candles (Last 24 Hours)</h2>
        
        {candles.loading ? (
          <div>Loading...</div>
        ) : candles.error ? (
          <div className="text-red-500">Error: {candles.error}</div>
        ) : candles.data ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Time</th>
                  <th className="text-right py-2">Open</th>
                  <th className="text-right py-2">High</th>
                  <th className="text-right py-2">Low</th>
                  <th className="text-right py-2">Close</th>
                  <th className="text-right py-2">Volume</th>
                </tr>
              </thead>
              <tbody>
                {candles.data.slice(-10).reverse().map((candle, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="py-2">
                      {new Date(candle.timestamp).toLocaleString()}
                    </td>
                    <td className="text-right">{candle.open.toFixed(2)}</td>
                    <td className="text-right text-green-600">{candle.high.toFixed(2)}</td>
                    <td className="text-right text-red-600">{candle.low.toFixed(2)}</td>
                    <td className="text-right font-semibold">{candle.close.toFixed(2)}</td>
                    <td className="text-right text-gray-600">{candle.volume.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
