"use client";

import { motion } from "framer-motion";
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Zap, 
  Globe, 
  Clock, 
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  BrainCircuit,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";
import CandlestickChart from "@/components/charts/CandlestickChart";
import { SmartValue, SmartStat, AIInsightCard, NewsCard } from "@/components/ui/smart-colors";

// Mock Data
const marketStats = [
  { label: "BTC/USD", value: "$97,540.20", change: "+2.4%", isUp: true },
  { label: "ETH/USD", value: "$3,840.50", change: "-0.8%", isUp: false },
  { label: "Global Cap", value: "$3.2T", change: "+1.2%", isUp: true },
  { label: "Fear & Greed", value: "78", change: "Extreme Greed", isUp: true, neutral: true },
];

const aiInsights = [
  {
    id: 1,
    title: "Bitcoin Breakout Detected",
    time: "2m ago",
    type: "Technical",
    content: "BTC just broke the $97k resistance with high volume. Next target $100k.",
    confidence: "92%",
    sentiment: "Bullish"
  },
  {
    id: 2,
    title: "Whale Movement Alert",
    time: "15m ago",
    type: "On-Chain",
    content: "Large transfer of 5,000 BTC from cold wallet to Binance.",
    confidence: "High Impact",
    sentiment: "Bearish"
  },
  {
    id: 3,
    title: "DeFi Sector Rotation",
    time: "1h ago",
    type: "Market",
    content: "Capital flowing from Layer 1s to DeFi protocols. Watch UNI, AAVE.",
    confidence: "85%",
    sentiment: "Neutral"
  }
];

const mockCandles = Array.from({ length: 30 }, (_, i) => ({
  time: new Date(Date.now() - (30 - i) * 3600000).toISOString(),
  open: 95000 + Math.random() * 2000,
  high: 98000 + Math.random() * 1000,
  low: 94000 + Math.random() * 1000,
  close: 96000 + Math.random() * 2000,
}));

export function Dashboard() {
  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6 bg-gradient-to-b from-background to-background/50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3 tracking-tight">
            <Activity className="w-8 h-8 text-primary" />
            لوحة القيادة المركزية
          </h1>
          <p className="text-muted-foreground text-sm mt-2 font-medium">نظرة شاملة على السوق وتحليلات الذكاء الاصطناعي المتقدمة</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold shadow-[0_0_15px_rgba(var(--primary),0.3)]">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
            </span>
            نظام حي
          </span>
          <button className="p-2.5 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all shadow-sm hover:shadow-md">
            <Globe className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats Grid - Using SmartStat */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {marketStats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ scale: 1.02, translateY: -5 }}
            className="relative p-5 rounded-2xl bg-card/40 border border-white/5 backdrop-blur-xl hover:bg-card/60 hover:border-primary/30 transition-all group overflow-hidden shadow-lg"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-3">
                <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">{stat.label}</span>
                <span className={cn(
                  "p-1.5 rounded-lg bg-background/50 backdrop-blur-sm border border-white/5",
                  stat.isUp ? "text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.2)]" : "text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                )}>
                  {stat.isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                </span>
              </div>
              <div className="text-2xl font-bold text-foreground mb-2 tracking-tight">{stat.value}</div>
              {/* Smart Color for Change Value */}
              <SmartValue 
                value={stat.change} 
                showIcon={true}
                showBackground={true}
                size="xs"
                className={stat.neutral ? "!text-secondary !bg-secondary/10" : ""}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-3xl border border-white/10 bg-card/30 backdrop-blur-xl overflow-hidden shadow-2xl"
          >
            <div className="p-5 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-card/50 to-transparent">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-sm text-foreground block">الرسم البياني المتقدم</span>
                  <span className="text-[10px] text-muted-foreground">BTC/USD • Binance Spot</span>
                </div>
              </div>
              <div className="flex gap-1 bg-background/30 p-1 rounded-lg border border-white/5">
                {['1H', '4H', '1D', '1W'].map((tf) => (
                  <button key={tf} className="px-3 py-1.5 rounded-md text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-card transition-all">
                    {tf}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 h-[400px]">
              <CandlestickChart candles={mockCandles} title="" theme="dark" />
            </div>
          </motion.div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "تحليل فني سريع", icon: <Zap className="w-5 h-5 text-yellow-400" />, color: "from-yellow-500/20 to-yellow-500/5" },
              { label: "فحص السيولة", icon: <Activity className="w-5 h-5 text-blue-400" />, color: "from-blue-500/20 to-blue-500/5" },
              { label: "توصيات AI", icon: <BrainCircuit className="w-5 h-5 text-purple-400" />, color: "from-purple-500/20 to-purple-500/5" },
              { label: "إدارة المحفظة", icon: <MoreHorizontal className="w-5 h-5 text-emerald-400" />, color: "from-emerald-500/20 to-emerald-500/5" },
            ].map((action) => (
              <motion.button 
                key={action.label}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border border-white/5 transition-all group shadow-lg",
                  "bg-gradient-to-br hover:border-white/10",
                  action.color
                )}
              >
                <div className="p-3 rounded-xl bg-background/40 shadow-inner group-hover:scale-110 transition-transform duration-300">
                  {action.icon}
                </div>
                <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors">{action.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* AI Insights Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-purple-500" />
              رؤى الذكاء الاصطناعي
            </h2>
            <button className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">عرض الكل</button>
          </div>

          <div className="space-y-3 h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {aiInsights.map((insight, i) => (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                whileHover={{ scale: 1.02 }}
              >
                <AIInsightCard
                  title={insight.title}
                  content={insight.content}
                  type={insight.type}
                  time={insight.time}
                  confidence={insight.confidence}
                  sentiment={insight.sentiment as "Bullish" | "Bearish" | "Neutral"}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-card/30 border border-white/10 p-6 backdrop-blur-xl shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              النشاط الأخير
            </h2>
            <button className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">عرض السجل</button>
          </div>
          <div className="space-y-3">
            {[
              { type: 'buy', asset: 'BTC', amount: '0.45', price: '$43,200', time: 'منذ دقيقتين' },
              { type: 'sell', asset: 'ETH', amount: '12.5', price: '$38,400', time: 'منذ 5 دقائق' },
              { type: 'buy', asset: 'SOL', amount: '150', price: '$21,450', time: 'منذ 12 دقيقة' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-background/20 border border-white/5 hover:bg-background/40 transition-all group">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shadow-inner",
                    item.type === 'buy' ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                  )}>
                    {item.type === 'buy' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{item.type === 'buy' ? 'شراء' : 'بيع'} {item.asset}</div>
                    <div className="text-xs text-muted-foreground font-medium">{item.time}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-foreground">{item.amount} {item.asset}</div>
                  <div className="text-xs text-muted-foreground font-medium">{item.price}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-card/30 border border-white/10 p-6 backdrop-blur-xl shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-500" />
              أخبار السوق العاجلة
            </h2>
            <button className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">المزيد</button>
          </div>
          <div className="space-y-2">
            {[
              { source: "Bloomberg", title: "SEC توافق على صناديق Bitcoin ETF جديدة - خبر إيجابي للسوق", time: "الآن", sentiment: "positive" },
              { source: "CoinDesk", title: "ارتفاع حجم التداول في منصات DeFi بنسبة 40%", time: "منذ 15 دقيقة", sentiment: "positive" },
              { source: "Reuters", title: "تحذير: هبوط حاد محتمل في أسعار العملات الرقمية", time: "منذ ساعة", sentiment: "negative" },
              { source: "CryptoNews", title: "اختراق أمني في منصة تداول يسبب خسائر كبيرة", time: "منذ ساعتين", sentiment: "negative" },
            ].map((news, i) => (
              <NewsCard
                key={i}
                title={news.title}
                source={news.source}
                time={news.time}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
