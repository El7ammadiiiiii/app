'use client';

import React, { useEffect, useState } from 'react';
import UnifiedCryptoTable from './UnifiedCryptoTable';
import CryptoTable from './CryptoTable';
import { readFavoriteIds, subscribeFavorites } from '@/lib/crypto-favorites';

type Tab = 'unified' | 'live';

export default function CryptocurrenciesPage() {
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [tab, setTab] = useState<Tab>('unified');

  useEffect(() => {
    setFavoriteCount(readFavoriteIds().size);
    const unsubscribe = subscribeFavorites(() => setFavoriteCount(readFavoriteIds().size));
    return unsubscribe;
  }, []);

  return (
    <div className="min-h-screen p-4 md:p-8 text-white">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-6" dir="ltr">
          <div>
            <h1 className="text-3xl font-bold">Cryptocurrencies</h1>
            <p className="text-sm text-gray-400 mt-1">
              All coins from CMC + CoinGecko + Messari + CCXT (55 exchanges) + DeFi Llama — unified with live prices
            </p>
          </div>
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-900/20 text-amber-300 text-sm">
            <span>★</span>
            <span>Favorites: {favoriteCount}</span>
          </span>
        </div>

        {/* ── Tab Switcher ── */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl bg-white/[0.03] border border-white/10 w-fit" dir="ltr">
          <button
            onClick={() => setTab('unified')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'unified'
                ? 'bg-cyan-600/25 text-cyan-300 shadow-sm border border-cyan-500/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            🌐 All Coins (Unified)
          </button>
          <button
            onClick={() => setTab('live')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'live'
                ? 'bg-cyan-600/25 text-cyan-300 shadow-sm border border-cyan-500/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            📊 Live Market (Top 500)
          </button>
        </div>

        {/* ── Content ── */}
        {tab === 'unified' ? <UnifiedCryptoTable /> : <CryptoTable />}
      </div>
    </div>
  );
}
