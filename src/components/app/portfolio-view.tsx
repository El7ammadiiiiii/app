"use client";

import { motion } from "framer-motion";
import { 
  Wallet, 
  PieChart, 
  ArrowUpRight, 
  ArrowDownRight, 
  Download, 
  Plus,
  History,
  CreditCard
} from "lucide-react";
import { cn } from "@/lib/utils";

const assets = [
  { symbol: "BTC", name: "Bitcoin", balance: "0.45", value: "$43,893.09", allocation: "45%", change: "+2.4%" },
  { symbol: "ETH", name: "Ethereum", balance: "4.2", value: "$16,128.00", allocation: "28%", change: "-0.8%" },
  { symbol: "SOL", name: "Solana", balance: "150", value: "$21,780.00", allocation: "15%", change: "+5.6%" },
  { symbol: "USDT", name: "Tether", balance: "5,430", value: "$5,430.00", allocation: "12%", change: "0.0%" },
];

export function PortfolioView() {
  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6 bg-gradient-to-b from-background to-background/50">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3 tracking-tight">
            <Wallet className="w-8 h-8 text-primary" />
            المحفظة الاستثمارية
          </h1>
          <p className="text-muted-foreground text-sm mt-2 font-medium">إدارة الأصول وتتبع الأداء المالي بدقة</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5">
            <Plus className="w-5 h-5" />
            إيداع
          </button>
          <button className="p-2.5 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all shadow-sm">
            <History className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02 }}
          className="p-6 rounded-3xl bg-gradient-to-br from-primary/20 via-card to-card border border-primary/20 relative overflow-hidden shadow-xl group"
        >
          <div className="absolute -top-10 -right-10 p-4 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
            <Wallet className="w-48 h-48 text-primary rotate-12" />
          </div>
          <div className="relative z-10">
            <div className="text-muted-foreground text-sm font-medium mb-2">الرصيد الإجمالي</div>
            <div className="text-4xl font-bold text-foreground mb-4 tracking-tight">$87,231.09</div>
            <div className="flex items-center gap-2 text-sm font-bold text-primary bg-primary/10 w-fit px-3 py-1.5 rounded-lg border border-primary/10">
              <ArrowUpRight className="w-4 h-4" />
              +12.5% هذا الشهر
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.02 }}
          className="p-6 rounded-3xl bg-card/50 border border-white/10 backdrop-blur-xl shadow-lg"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <PieChart className="w-5 h-5" />
            </div>
            <div className="text-foreground font-bold">توزيع الأصول</div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground font-medium">Crypto</span>
                <span className="text-foreground font-bold">88%</span>
              </div>
              <div className="w-full h-2.5 bg-muted/50 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 w-[88%] rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground font-medium">Stablecoins</span>
                <span className="text-foreground font-bold">12%</span>
              </div>
              <div className="w-full h-2.5 bg-muted/50 rounded-full overflow-hidden">
                <div className="h-full bg-muted-foreground w-[12%] rounded-full"></div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.02 }}
          className="p-6 rounded-3xl bg-card/50 border border-white/10 backdrop-blur-xl shadow-lg"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="text-foreground font-bold">الأرباح المقدرة</div>
          </div>
          <div className="text-3xl font-bold text-foreground mb-2 tracking-tight">+$3,420.50</div>
          <div className="text-sm text-muted-foreground font-medium">أرباح غير محققة (PNL)</div>
          <div className="mt-4 h-1.5 w-full bg-gradient-to-r from-purple-500/50 to-transparent rounded-full"></div>
        </motion.div>
      </div>

      {/* Assets List */}
      <div className="rounded-3xl border border-white/10 bg-card/30 backdrop-blur-xl overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/5">
          <h3 className="font-bold text-foreground text-lg">الأصول المملوكة</h3>
          <button className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
            <Download className="w-4 h-4" />
            تصدير CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-muted/30 text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-bold">الأصل</th>
                <th className="px-6 py-4 font-bold">الرصيد</th>
                <th className="px-6 py-4 font-bold">القيمة</th>
                <th className="px-6 py-4 font-bold">التخصيص</th>
                <th className="px-6 py-4 font-bold">الأداء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {assets.map((asset, i) => (
                <tr key={asset.symbol} className="group hover:bg-white/5 transition-colors">
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center text-xs font-bold text-foreground shadow-inner border border-white/5">
                        {asset.symbol[0]}
                      </div>
                      <div>
                        <div className="font-bold text-foreground text-sm">{asset.name}</div>
                        <div className="text-xs text-muted-foreground font-medium">{asset.symbol}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-foreground font-medium text-sm">
                    {asset.balance} <span className="text-muted-foreground text-xs">{asset.symbol}</span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap font-bold text-foreground text-sm">
                    {asset.value}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-muted-foreground font-medium text-sm">
                    {asset.allocation}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className={cn(
                      "flex items-center gap-1 text-sm font-bold px-2 py-1 rounded-lg w-fit",
                      asset.change.startsWith('+') ? "text-primary bg-primary/10" : 
                      asset.change.startsWith('-') ? "text-destructive bg-destructive/10" : "text-muted-foreground bg-muted/10"
                    )}>
                      {asset.change}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
