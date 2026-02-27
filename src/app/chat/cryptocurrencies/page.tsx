'use client';

import React, { useEffect, useState } from 'react';
import CryptoTable from './CryptoTable';
import { readFavoriteIds, subscribeFavorites } from '@/lib/crypto-favorites';

export default function CryptocurrenciesPage() {
  const [favoriteCount, setFavoriteCount] = useState(0);

  useEffect(() => {
    setFavoriteCount(readFavoriteIds().size);
    const unsubscribe = subscribeFavorites(() => setFavoriteCount(readFavoriteIds().size));
    return unsubscribe;
  }, []);

  return (
    <div className="min-h-screen p-4 md:p-8 text-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6" dir="ltr">
          <h1 className="text-3xl font-bold">Cryptocurrencies</h1>
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-900/20 text-amber-300 text-sm">
            <span>★</span>
            <span>Favorites: {favoriteCount}</span>
          </span>
        </div>
        <CryptoTable />
      </div>
    </div>
  );
}
