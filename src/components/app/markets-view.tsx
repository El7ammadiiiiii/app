"use client";

import { motion } from "framer-motion";
import { Search, Filter, ArrowUpRight, ArrowDownRight, Star, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { SmartValue } from "@/components/ui/smart-colors";

const assets = [
  { id: 1, name: "Bitcoin", symbol: "BTC", price: "$97,540.20", change: "+2.4%", volume: "$45B", cap: "$1.9T", isUp: true },
  { id: 2, name: "Ethereum", symbol: "ETH", price: "$3,840.50", change: "-0.8%", volume: "$18B", cap: "$450B", isUp: false },
  { id: 3, name: "Solana", symbol: "SOL", price: "$145.20", change: "+5.6%", volume: "$4.2B", cap: "$65B", isUp: true },
  { id: 4, name: "Binance Coin", symbol: "BNB", price: "$605.10", change: "+0.5%", volume: "$1.1B", cap: "$92B", isUp: true },
  { id: 5, name: "Cardano", symbol: "ADA", price: "$0.55", change: "-1.2%", volume: "$450M", cap: "$19B", isUp: false },
  { id: 6, name: "Ripple", symbol: "XRP", price: "$0.62", change: "+1.1%", volume: "$1.2B", cap: "$34B", isUp: true },
  { id: 7, name: "Polkadot", symbol: "DOT", price: "$7.80", change: "-2.5%", volume: "$250M", cap: "$11B", isUp: false },
  { id: 8, name: "Dogecoin", symbol: "DOGE", price: "$0.12", change: "+8.4%", volume: "$2.1B", cap: "$17B", isUp: true },
];

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
  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6 bg-gradient-to-b from-background to-background/50">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">الأسواق المباشرة</h1>
          <p className="text-muted-foreground text-sm mt-2 font-medium">تتبع أسعار العملات الرقمية والتحليلات الفورية بدقة عالية</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="بحث عن عملة..." 
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
              {assets.map((asset, i) => (
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
                    <button className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
