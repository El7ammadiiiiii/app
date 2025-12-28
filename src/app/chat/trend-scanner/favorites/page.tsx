"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ArrowLeft, Trash2, Clock, TrendingUp, TrendingDown } from "lucide-react";
import { useFavoriteCoins, FavoriteCoin } from "@/lib/hooks/useFavoriteCoins";

// ============================================
// Types
// ============================================

interface PriceData {
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
}

// ============================================
// FavoriteRow Component
// ============================================

function FavoriteRow({
  coin,
  priceData,
  onRemove,
  onRowClick,
}: {
  coin: FavoriteCoin;
  priceData: PriceData | null;
  onRemove: () => void;
  onRowClick: () => void;
}) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("ar-SA", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <motion.tr
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      whileHover={{ backgroundColor: "rgba(255,255,255,0.02)" }}
      className="border-b border-white/5 cursor-pointer transition-colors"
      onClick={onRowClick}
    >
      {/* Star & Coin */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-bold text-sm">
            {coin.name.charAt(0)}
          </div>
          <div>
            <div className="text-foreground font-medium text-sm">{coin.name}</div>
            <div className="text-muted-foreground text-xs">{coin.symbol.replace("USDT", "")}</div>
          </div>
        </div>
      </td>

      {/* Price */}
      <td className="py-4 px-4 text-right">
        {priceData ? (
          <div className="text-foreground font-mono text-sm">
            ${priceData.price.toLocaleString(undefined, { 
              minimumFractionDigits: 2, 
              maximumFractionDigits: priceData.price < 1 ? 6 : 2 
            })}
          </div>
        ) : (
          <div className="w-20 h-4 bg-white/5 rounded animate-pulse" />
        )}
      </td>

      {/* 24h Change */}
      <td className="py-4 px-4 text-right">
        {priceData ? (
          <div className={`flex items-center justify-end gap-1 font-mono text-sm ${
            priceData.change24h >= 0 ? "text-[#186d48]" : "text-[#a9203e]"
          }`}>
            {priceData.change24h >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            {priceData.change24h >= 0 ? "+" : ""}{priceData.change24h.toFixed(2)}%
          </div>
        ) : (
          <div className="w-16 h-4 bg-white/5 rounded animate-pulse" />
        )}
      </td>

      {/* Volume */}
      <td className="py-4 px-4 text-right hidden md:table-cell">
        {priceData ? (
          <div className="text-muted-foreground font-mono text-sm">
            ${(priceData.volume24h / 1e6).toFixed(2)}M
          </div>
        ) : (
          <div className="w-16 h-4 bg-white/5 rounded animate-pulse" />
        )}
      </td>

      {/* Added Time */}
      <td className="py-4 px-4 text-right hidden lg:table-cell">
        <div className="flex items-center justify-end gap-1.5 text-muted-foreground text-xs">
          <Clock className="w-3 h-3" />
          {formatDate(coin.addedAt)}
        </div>
      </td>

      {/* Remove Button */}
      <td className="py-4 px-4 text-center">
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="p-2 rounded-lg text-muted-foreground/50 hover:text-red-400 hover:bg-red-400/10 transition-all"
          title="إزالة من المفضلة"
        >
          <Trash2 className="w-4 h-4" />
        </motion.button>
      </td>
    </motion.tr>
  );
}

// ============================================
// Main Favorites Page
// ============================================

export default function FavoritesPage() {
  const router = useRouter();
  const { favorites, removeFavorite, isLoaded } = useFavoriteCoins();
  const [priceData, setPriceData] = useState<Record<string, PriceData>>({});
  const [loading, setLoading] = useState(true);

  // Fetch price data for all favorites
  useEffect(() => {
    if (!isLoaded || favorites.length === 0) {
      setLoading(false);
      return;
    }

    const fetchPrices = async () => {
      try {
        const ids = favorites.map((f) => f.coingeckoId).join(",");
        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=false&price_change_percentage=24h`
        );

        if (response.ok) {
          const data = await response.json();
          const newPriceData: Record<string, PriceData> = {};

          data.forEach((coin: any) => {
            const favorite = favorites.find((f) => f.coingeckoId === coin.id);
            if (favorite) {
              newPriceData[favorite.symbol] = {
                price: coin.current_price || 0,
                change24h: coin.price_change_percentage_24h || 0,
                volume24h: coin.total_volume || 0,
                marketCap: coin.market_cap || 0,
              };
            }
          });

          setPriceData(newPriceData);
        }
      } catch (error) {
        console.error("[Favorites] Failed to fetch prices:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, [favorites, isLoaded]);

  // Navigate to coin detail
  const handleRowClick = useCallback(
    (symbol: string) => {
      router.push(`/chat/trend-scanner/${symbol.toLowerCase()}`);
    },
    [router]
  );

  // Calculate stats
  const stats = useMemo(() => {
    const prices = Object.values(priceData);
    const gainers = prices.filter((p) => p.change24h > 0).length;
    const losers = prices.filter((p) => p.change24h < 0).length;
    const totalVolume = prices.reduce((sum, p) => sum + p.volume24h, 0);

    return { gainers, losers, totalVolume };
  }, [priceData]);

  return (
    <div className="min-h-screen theme-bg p-3 sm:p-4 md:p-6 pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 sm:mb-8"
      >
        <div className="flex items-center justify-between gap-4">
          {/* Back Button */}
          <motion.button
            onClick={() => router.push("/chat/trend-scanner")}
            className="p-2 rounded-lg bg-black/5 dark:bg-black/30 hover:bg-black/10 dark:hover:bg-black/40 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>

          {/* Title */}
          <div className="text-center flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-black dark:text-foreground flex items-center justify-center gap-2 sm:gap-3">
              <Star className="w-7 h-7 sm:w-8 sm:h-8 fill-yellow-400 text-yellow-400" />
              المفضلة
            </h1>
            <p className="text-black/60 dark:text-muted-foreground text-xs sm:text-sm mt-1 sm:mt-2">
              العملات التي تتابعها ({favorites.length} عملة)
            </p>
          </div>

          {/* Placeholder for alignment */}
          <div className="w-10" />
        </div>
      </motion.div>

      {/* Stats Summary */}
      {favorites.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-[#186d48]/15 to-[#186d48]/5 border border-[#186d48]/30 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center"
          >
            <div className="text-2xl sm:text-3xl font-bold text-[#186d48]">{stats.gainers}</div>
            <div className="text-xs sm:text-sm text-[#186d48]/80">صاعدة 📈</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-yellow-500/15 to-yellow-500/5 border border-yellow-500/30 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center"
          >
            <div className="text-2xl sm:text-3xl font-bold text-yellow-400">{favorites.length}</div>
            <div className="text-xs sm:text-sm text-yellow-400/80">مفضلة ⭐</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-[#a9203e]/15 to-[#a9203e]/5 border border-[#a9203e]/30 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center"
          >
            <div className="text-2xl sm:text-3xl font-bold text-[#a9203e]">{stats.losers}</div>
            <div className="text-xs sm:text-sm text-[#a9203e]/80">هابطة 📉</div>
          </motion.div>
        </div>
      )}

      {/* Favorites Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="backdrop-blur-xl border border-border/40 dark:border-white/[0.06] rounded-2xl overflow-hidden shadow-sm theme-card"
      >
        {favorites.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/30 dark:bg-white/[0.02] border-b border-border/30 dark:border-white/[0.06]">
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium text-sm">
                    العملة
                  </th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium text-sm">
                    السعر
                  </th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium text-sm">
                    24h %
                  </th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium text-sm hidden md:table-cell">
                    الحجم
                  </th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium text-sm hidden lg:table-cell">
                    تاريخ الإضافة
                  </th>
                  <th className="text-center py-3 px-4 text-muted-foreground font-medium text-sm w-16">
                    حذف
                  </th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {favorites.map((coin) => (
                    <FavoriteRow
                      key={coin.symbol}
                      coin={coin}
                      priceData={priceData[coin.symbol] || null}
                      onRemove={() => removeFavorite(coin.symbol)}
                      onRowClick={() => handleRowClick(coin.symbol)}
                    />
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 15 }}
            >
              <Star className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" />
            </motion.div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              لا توجد عملات مفضلة
            </h3>
            <p className="text-muted-foreground text-sm mb-6">
              أضف عملات لمتابعتها بالنقر على ⭐ بجانب أي عملة
            </p>
            <motion.button
              onClick={() => router.push("/chat/trend-scanner")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm"
            >
              العودة للماسح
            </motion.button>
          </div>
        )}
      </motion.div>

      {/* Footer */}
      <div className="mt-6 text-center text-muted-foreground/60 text-xs">
        البيانات من CoinGecko API • التحديث كل 30 ثانية •
        <span className="text-primary"> NEXUS Trading Platform</span>
      </div>
    </div>
  );
}
