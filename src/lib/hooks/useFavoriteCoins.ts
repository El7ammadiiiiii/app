"use client";

import { useState, useEffect, useCallback } from "react";

// ============================================
// Types
// ============================================

export interface FavoriteCoin {
  symbol: string;      // e.g., "BTCUSDT"
  name: string;        // e.g., "Bitcoin"
  coingeckoId: string; // e.g., "bitcoin"
  addedAt: number;     // timestamp when added
}

const STORAGE_KEY = "trend_scanner_favorites";

// ============================================
// Custom Hook: useFavoriteCoins
// ============================================

export function useFavoriteCoins() {
  const [favorites, setFavorites] = useState<FavoriteCoin[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load favorites from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as FavoriteCoin[];
          // Sort by addedAt (newest first)
          const sorted = parsed.sort((a, b) => b.addedAt - a.addedAt);
          setFavorites(sorted);
        }
      } catch (error) {
        console.error("[FavoriteCoins] Failed to load favorites:", error);
      }
      setIsLoaded(true);
    }
  }, []);

  // Save favorites to localStorage
  const saveFavorites = useCallback((newFavorites: FavoriteCoin[]) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newFavorites));
      } catch (error) {
        console.error("[FavoriteCoins] Failed to save favorites:", error);
      }
    }
  }, []);

  // Add coin to favorites
  const addFavorite = useCallback((coin: { symbol: string; name: string; coingeckoId: string }) => {
    setFavorites((prev) => {
      // Check if already exists
      if (prev.some((f) => f.symbol === coin.symbol)) {
        return prev;
      }
      
      const newFavorite: FavoriteCoin = {
        ...coin,
        addedAt: Date.now(),
      };
      
      // Add to beginning (newest first)
      const newFavorites = [newFavorite, ...prev];
      saveFavorites(newFavorites);
      return newFavorites;
    });
  }, [saveFavorites]);

  // Remove coin from favorites
  const removeFavorite = useCallback((symbol: string) => {
    setFavorites((prev) => {
      const newFavorites = prev.filter((f) => f.symbol !== symbol);
      saveFavorites(newFavorites);
      return newFavorites;
    });
  }, [saveFavorites]);

  // Toggle favorite status
  const toggleFavorite = useCallback((coin: { symbol: string; name: string; coingeckoId: string }) => {
    if (favorites.some((f) => f.symbol === coin.symbol)) {
      removeFavorite(coin.symbol);
    } else {
      addFavorite(coin);
    }
  }, [favorites, addFavorite, removeFavorite]);

  // Check if coin is favorite
  const isFavorite = useCallback((symbol: string) => {
    return favorites.some((f) => f.symbol === symbol);
  }, [favorites]);

  // Get favorites count
  const favoritesCount = favorites.length;

  return {
    favorites,
    isLoaded,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    favoritesCount,
  };
}

export default useFavoriteCoins;
