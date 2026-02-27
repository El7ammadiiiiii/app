"use client";

import { motion } from "framer-motion";
import { Search, Filter, ArrowUpRight, ArrowDownRight, Star, MoreHorizontal, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SmartValue } from "@/components/ui/smart-colors";
import { useState, useEffect } from "react";
import { useExchangeStore } from "@/stores/exchangeStore";
import { EXCHANGE_CONFIGS } from "@/constants/exchanges";

interface Asset {
  id: string | number;
  name: string;
  symbol: string;
  price: string;
  change: string;
  volume: string;
  cap: string;
  isUp: boolean;
}

// Mock trend data (simple SVG path) - Green for up, Red for down
const TrendLine = ({ isUp }: { isUp: boolean }) => (
  <svg width="100" height="30" viewBox="0 0 100 30" className="opacity-80">
    <path
      d={isUp 
        ? "M0 25 C20 25 20 10 40 15 C60 20 60 5 100 0" 
        : "M0 5 C20 5 20 20 40 15 C60 10 60 25 100 30"}
      fill="none"
      stroke={isUp ? "currentColor" : "currentColor"}
      strokeWidth="2"
      className={isUp ? "text-green-500" : "text-red-500"}
    />
  </svg>
);

export function MarketsView() {
  const { activeExchange } = useExchangeStore();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchMarketData = async () => {
      setLoading(true);
      try {
        // 1. Get available symbols for the exchange
        const marketsRes = await fetch(`/api/exchanges/markets?exchange=${activeExchange}`);
        const marketsData = await marketsRes.json();
        
        if (!marketsData.success || !Array.isArray(marketsData.data)) return;

        // 2. Fetch tickers for top symbols (limiting to 15 for performance)
        const topSymbols = marketsData.data
          .filter((s: string) => s.endsWith('/USDT'))
          .slice(0, 15);

        const tickerPromises = topSymbols.map(async (symbol: string) => {
          try {
            const res = await fetch(`/api/exchanges/ticker?exchange=${activeExchange}&symbol=${encodeURIComponent(symbol)}`);
            const json = await res.json();
            return json.success ? json.data : null;
          } catch { return null; }
        });

        const tickers = (await Promise.all(tickerPromises)).filter(Boolean);

        const formattedAssets: Asset[] = tickers.map((ticker: any) => ({
          id: ticker.symbol,
          name: ticker.symbol.split('/')[0],
          symbol: ticker.symbol,
          price: ticker.last ? `$${ticker.last.toLocaleString()}` : '$0.00',
          change: ticker.percentage ? `${ticker.percentage > 0 ? '+' : ''}${ticker.percentage.toFixed(2)}%` : '0.00%',
          volume: ticker.quoteVolume ? `$${(ticker.quoteVolume / 1e6).toFixed(1)}M` : '0.0M',
          cap: 'N/A',
          isUp: (ticker.percentage || 0) >= 0
        }));
        
        setAssets(formattedAssets);
      } catch (error) {
        console.error("Failed to fetch market data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMarketData();
    const interval = setInterval(fetchMarketData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [activeExchange]);

  const filteredAssets = assets.filter(a => 
    a.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6 bg-gradient-to-b from-background to-background/50">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">الأسواق المباشرة</h1>
            <div className="px-2 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase">
              {EXCHANGE_CONFIGS[activeExchange]?.name || activeExchange}
            </div>
          </div>
          <p className="text-muted-foreground text-sm mt-2 font-medium">تتبع أسعار العملات الرقمية والتحليلات الفورية بدقة عالية</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="بحث عن عملة..." 
              aria-label="بحث عن عملة رقمية"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-4 pr-10 py-2.5 rounded-xl theme-card/50 border border-border text-sm text-foreground focus:outline-none focus:border-primary/50 focus:theme-card w-64 transition-all shadow-sm"
            />
          </div>
          <button className="p-2.5 rounded-xl theme-card/50 border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all shadow-sm">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Market Table */}
      <div className="rounded-3xl border border-white/10 theme-card/30 backdrop-blur-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-white/5 bg-muted/30 text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-6 py-5 font-bold">الأصل</th>
                <th className="px-6 py-5 font-bold">السعر</th>
                <th className="px-6 py-5 font-bold">التغير (24س)</th>
                <th className="px-6 py-5 font-bold hidden md:table-cell">حجم التداول</th>
                <th className="px-6 py-5 font-bold hidden lg:table-cell">القيمة السوقية</th>
                <th className="px-6 py-5 font-bold hidden xl:table-cell">المسار (7أيام)</th>
                <th className="px-6 py-5 font-bold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && assets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                      <p className="text-muted-foreground text-sm">جاري جلب بيانات السوق من {EXCHANGE_CONFIGS[activeExchange]?.name}...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-muted-foreground">
                    لا توجد نتائج تطابق بحثك
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset, i) => (
                  <motion.tr 
                    key={asset.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="group hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-4">
                      <button className="text-muted-foreground/50 hover:text-yellow-500 transition-colors">
                        <Star className="w-4 h-4" />
                      </button>
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center text-xs font-bold text-foreground shadow-inner border border-white/5">
                        {asset.symbol[0]}
                      </div>
                      <div>
                        <div className="font-bold text-foreground text-sm">{asset.name}</div>
                        <div className="text-xs text-muted-foreground font-medium">{asset.symbol}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-bold text-foreground text-sm">
                    {asset.price}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {/* Smart Color for Change - Green/Red based on value */}
                    <SmartValue 
                      value={asset.change} 
                      showIcon={true}
                      showBackground={true}
                      size="sm"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-muted-foreground text-sm font-medium hidden md:table-cell">
                    {asset.volume}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-muted-foreground text-sm font-medium hidden lg:table-cell">
                    {asset.cap}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap hidden xl:table-cell">
                    <TrendLine isUp={asset.isUp} />
                  </td>
                    <td className="px-6 py-4 whitespace-nowrap text-left">
                      <button className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
