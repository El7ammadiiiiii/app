"use client";

/**
 * ⚠️ PROTECTED FILE - DO NOT MODIFY ⚠️
 * 🔒 ملف محمي - لا تقم بالتعديل 🔒
 * 
 * Trend Scanner Pair Details Page - صفحة تفاصيل الزوج
 * @locked true
 * @last-reviewed 2025-12-14
 */

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, TrendingUp, TrendingDown, Activity, RefreshCw, BarChart3, Clock, Target, Zap,
  Layers, Triangle, Hexagon
} from "lucide-react";
import {
  calculateTrendStrength,
  type OHLCV,
  type Timeframe,
  timeframeLabels
} from "@/lib/indicators/technical";
import { analyzeTimeframe, type OHLCVData, type FullAnalysis } from "@/lib/analysis/engine";
import {
  TrendGaugeCompact,
  IndicatorSignalBadge,
  TrendSummaryCard
} from "@/components/charts/TrendGauge";
import { TradingChartV2 as TradingChart } from "@/components/charts/TradingChartV2";
import { IndicatorPanel, useIndicatorSettings, type IndicatorSettings } from "@/components/charts/IndicatorPanel";
import { SubChartsContainerV2 as SubChartsContainer } from "@/components/charts/SubIndicatorChartV2";
import { SMCSummary } from "@/components/charts/SMCOverlay";
import type { SMCAnalysis } from "@/lib/indicators/smartMoneyConcepts";

// ============================================
// Types & Constants
// ============================================

const TIMEFRAMES: Timeframe[] = ["15m", "1h", "4h", "1d", "3d"];

const TOP_COINS = [
  { symbol: "BTCUSDT", name: "Bitcoin", coingeckoId: "bitcoin" },
  { symbol: "ETHUSDT", name: "Ethereum", coingeckoId: "ethereum" },
  { symbol: "BNBUSDT", name: "BNB", coingeckoId: "binancecoin" },
  { symbol: "SOLUSDT", name: "Solana", coingeckoId: "solana" },
  { symbol: "XRPUSDT", name: "XRP", coingeckoId: "ripple" },
  { symbol: "DOGEUSDT", name: "Dogecoin", coingeckoId: "dogecoin" },
  { symbol: "ADAUSDT", name: "Cardano", coingeckoId: "cardano" },
  { symbol: "TRXUSDT", name: "TRON", coingeckoId: "tron" },
  { symbol: "AVAXUSDT", name: "Avalanche", coingeckoId: "avalanche-2" },
  { symbol: "SHIBUSDT", name: "Shiba Inu", coingeckoId: "shiba-inu" },
  { symbol: "LINKUSDT", name: "Chainlink", coingeckoId: "chainlink" },
  { symbol: "DOTUSDT", name: "Polkadot", coingeckoId: "polkadot" },
  { symbol: "BCHUSDT", name: "Bitcoin Cash", coingeckoId: "bitcoin-cash" },
  { symbol: "NEARUSDT", name: "NEAR Protocol", coingeckoId: "near" },
  { symbol: "LTCUSDT", name: "Litecoin", coingeckoId: "litecoin" },
  { symbol: "SUIUSDT", name: "Sui", coingeckoId: "sui" },
  { symbol: "PEPEUSDT", name: "Pepe", coingeckoId: "pepe" },
  { symbol: "UNIUSDT", name: "Uniswap", coingeckoId: "uniswap" },
  { symbol: "APTUSDT", name: "Aptos", coingeckoId: "aptos" },
  { symbol: "ICPUSDT", name: "Internet Computer", coingeckoId: "internet-computer" },
];

// ============================================
// Hooks
// ============================================

function useMultiTimeframeAnalysis(symbol: string) {
  const [data, setData] = useState<{
    [key in Timeframe]?: {
      ohlcv: OHLCV[];
      analysis: ReturnType<typeof calculateTrendStrength> | null;
      advancedAnalysis?: FullAnalysis | null;
    };
  }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priceInfo, setPriceInfo] = useState({ price: 0, change24h: 0 });
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const results = await Promise.all(
        TIMEFRAMES.map(async (tf) => {
          try {
            // More history = better classic-pattern detection (H&S / double / triple often need >200 bars)
            const response = await fetch(
              `/api/ohlcv?symbol=${symbol}&interval=${tf}&limit=500&exchange=binance`
            );
            if (!response.ok) throw new Error(`Failed to fetch ${symbol} ${tf}`);
            const result = await response.json();
            const ohlcv = result.data || [];
            
            // Transform to advanced format
            const ohlcvData: OHLCVData = {
              open: ohlcv.map((d: OHLCV) => d.open),
              high: ohlcv.map((d: OHLCV) => d.high),
              low: ohlcv.map((d: OHLCV) => d.low),
              close: ohlcv.map((d: OHLCV) => d.close),
              volume: ohlcv.map((d: OHLCV) => d.volume),
              timestamp: ohlcv.map((d: OHLCV) => d.timestamp || Date.now())
            };
            
            let advancedAnalysis: FullAnalysis | null = null;
            let analysis: ReturnType<typeof calculateTrendStrength> | null = null;
            
            if (ohlcv.length >= 50) {
              try {
                advancedAnalysis = analyzeTimeframe(ohlcvData, symbol, tf);
                analysis = {
                  bullishScore: advancedAnalysis.trendStrength.bullishScore,
                  bearishScore: advancedAnalysis.trendStrength.bearishScore,
                  overallTrend: advancedAnalysis.trendStrength.trend as "bullish" | "bearish" | "neutral",
                  indicators: [
                    ...advancedAnalysis.signals.buySignals.map(s => ({
                      name: s.indicator,
                      signal: "bullish" as const,
                      strength: s.strength
                    })),
                    ...advancedAnalysis.signals.sellSignals.map(s => ({
                      name: s.indicator,
                      signal: "bearish" as const,
                      strength: s.strength
                    }))
                  ]
                };
              } catch {
                analysis = calculateTrendStrength(ohlcv);
              }
            }
            
            return { tf, ohlcv, analysis, advancedAnalysis };
          } catch {
            return { tf, ohlcv: [], analysis: null, advancedAnalysis: null };
          }
        })
      );

      const newData: typeof data = {};
      results.forEach(({ tf, ohlcv, analysis, advancedAnalysis }) => {
        newData[tf] = { ohlcv, analysis, advancedAnalysis };
      });

      setData(newData);

      // Calculate price and 24h change from 1d data
      const dailyData = newData["1d"]?.ohlcv || [];
      if (dailyData.length > 0) {
        const currentPrice = dailyData[dailyData.length - 1].close;
        const prevPrice = dailyData.length > 1 ? dailyData[dailyData.length - 2].close : currentPrice;
        const change = ((currentPrice - prevPrice) / prevPrice) * 100;
        setPriceInfo({ price: currentPrice, change24h: change });
      }

      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, 60000);
    return () => clearInterval(intervalId);
  }, [symbol]);

  return { data, loading, error, priceInfo, lastUpdate, refetch: fetchData };
}

// ============================================
// Components
// ============================================

function TimeframeCard({
  timeframe,
  analysis,
  advancedAnalysis
}: {
  timeframe: Timeframe;
  analysis: ReturnType<typeof calculateTrendStrength> | null;
  advancedAnalysis?: FullAnalysis | null;
}) {
  if (!analysis) {
    return (
      <div className="template-card rounded-xl p-4">
        <div className="text-center text-muted-foreground">جاري التحميل...</div>
      </div>
    );
  }

  const { bullishScore, bearishScore, overallTrend } = analysis;
  const total = bullishScore + bearishScore;
  const bullishPercent = total > 0 ? (bullishScore / total) * 100 : 50;

  const trendColor = overallTrend === "bullish" 
    ? "text-emerald-400" 
    : overallTrend === "bearish" 
      ? "text-red-400" 
      : "text-gray-400";

  const trendBg = overallTrend === "bullish" 
    ? "bg-emerald-500/10 border-emerald-500/30" 
    : overallTrend === "bearish" 
      ? "bg-red-500/10 border-red-500/30" 
      : "bg-gray-500/10 border-gray-500/30";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl p-4 border ${trendBg}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-lg font-bold text-white">
          {timeframeLabels[timeframe]}
        </span>
        <span className={`text-sm font-medium ${trendColor}`}>
          {overallTrend === "bullish" ? "صاعد" : overallTrend === "bearish" ? "هابط" : "محايد"}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>صعود {bullishScore.toFixed(0)}%</span>
          <span>هبوط {bearishScore.toFixed(0)}%</span>
        </div>
        <div className="h-3 rounded-full overflow-hidden flex bg-black/30">
          <div 
            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400"
            style={{ width: `${bullishPercent}%` }}
          />
          <div 
            className="h-full bg-gradient-to-r from-red-400 to-red-600"
            style={{ width: `${100 - bullishPercent}%` }}
          />
        </div>
      </div>

      {/* Indicators */}
      {advancedAnalysis && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">المؤشرات:</div>
          <div className="flex flex-wrap gap-1">
            {advancedAnalysis.signals.buySignals.slice(0, 3).map((sig, idx) => (
              <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                {sig.indicator}
              </span>
            ))}
            {advancedAnalysis.signals.sellSignals.slice(0, 3).map((sig, idx) => (
              <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-300">
                {sig.indicator}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function OverallSummary({
  data,
  priceInfo,
  symbol
}: {
  data: {
    [key in Timeframe]?: {
      analysis: ReturnType<typeof calculateTrendStrength> | null;
    };
  };
  priceInfo: { price: number; change24h: number };
  symbol: string;
}) {
  const overallScore = useMemo(() => {
    let totalBullish = 0;
    let totalBearish = 0;
    let count = 0;

    TIMEFRAMES.forEach((tf) => {
      const analysis = data[tf]?.analysis;
      if (analysis) {
        totalBullish += analysis.bullishScore;
        totalBearish += analysis.bearishScore;
        count++;
      }
    });

    if (count === 0) return { bullish: 50, bearish: 50, trend: "neutral" };

    const bullish = totalBullish / count;
    const bearish = totalBearish / count;
    const trend = bullish > bearish + 10 ? "bullish" : bearish > bullish + 10 ? "bearish" : "neutral";

    return { bullish, bearish, trend };
  }, [data]);

  const coinInfo = TOP_COINS.find(c => c.symbol.toLowerCase() === symbol.toLowerCase());
  const coinName = coinInfo?.name || symbol.replace("USDT", "");

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="theme-card rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            {coinName}
            <span className="text-sm px-2 py-0.5 bg-gray-700 rounded text-gray-300">
              {symbol.replace("USDT", "")}/USDT
            </span>
          </h2>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-3xl font-mono text-white">
              ${priceInfo.price.toLocaleString("ar-EG", { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: priceInfo.price < 1 ? 6 : 2 
              })}
            </span>
            <span className={`text-lg font-medium flex items-center gap-1 ${
              priceInfo.change24h >= 0 ? "text-emerald-400" : "text-red-400"
            }`}>
              {priceInfo.change24h >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              {priceInfo.change24h >= 0 ? "+" : ""}{priceInfo.change24h.toFixed(2)}%
            </span>
          </div>
        </div>

        <div className={`text-center p-4 rounded-xl ${
          overallScore.trend === "bullish" 
            ? "bg-emerald-500/10 border border-emerald-500/30" 
            : overallScore.trend === "bearish"
              ? "bg-red-500/10 border border-red-500/30"
              : "bg-gray-500/10 border border-gray-500/30"
        }`}>
          <div className="text-sm text-muted-foreground mb-1">التحليل الشامل</div>
          <div className={`text-2xl font-bold ${
            overallScore.trend === "bullish" 
              ? "text-emerald-400" 
              : overallScore.trend === "bearish"
                ? "text-red-400"
                : "text-gray-400"
          }`}>
            {overallScore.trend === "bullish" ? "📈 صاعد" : overallScore.trend === "bearish" ? "📉 هابط" : "➖ محايد"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {overallScore.bullish.toFixed(0)}% صعود / {overallScore.bearish.toFixed(0)}% هبوط
          </div>
        </div>
      </div>

      {/* Mini progress bar */}
      <div className="h-2 rounded-full overflow-hidden flex bg-black/30">
        <div 
          className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500"
          style={{ width: `${overallScore.bullish}%` }}
        />
        <div 
          className="h-full bg-gradient-to-r from-red-400 to-red-600 transition-all duration-500"
          style={{ width: `${overallScore.bearish}%` }}
        />
      </div>
    </motion.div>
  );
}

// ============================================
// Main Page Component
// ============================================

export default function TrendScannerPairPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = (params?.pair as string)?.toUpperCase() || "BTCUSDT";
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>("1d");
  const [smcAnalysis, setSmcAnalysis] = useState<SMCAnalysis | null>(null);
  const [mounted, setMounted] = useState(false);
  
  // استخدام hook المؤشرات الكامل
  const { settings: indicatorSettings, updateSettings: setIndicatorSettings, saveSettings } = useIndicatorSettings();
  
  // Fix hydration mismatch - wait for client mount
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const { data, loading, error, priceInfo, lastUpdate, refetch } = useMultiTimeframeAnalysis(symbol);

  // Transform OHLCV to CandleData for TradingChart
  const chartData = useMemo(() => {
    const ohlcv = data[selectedTimeframe]?.ohlcv || [];
    return ohlcv.map((d) => ({
      time: (d.timestamp ? Math.floor(d.timestamp / 1000) : Math.floor(Date.now() / 1000)) as any,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume,
    }));
  }, [data, selectedTimeframe]);

  const coinInfo = TOP_COINS.find(c => c.symbol.toLowerCase() === symbol.toLowerCase());
  const coinName = coinInfo?.name || symbol.replace("USDT", "");

  // Get current analysis data
  const currentAnalysis = data[selectedTimeframe]?.advancedAnalysis;
  
  // Check if any SMC indicator is enabled
  const smcEnabled = indicatorSettings.orderBlocks || indicatorSettings.fairValueGaps || 
                     indicatorSettings.marketStructure || indicatorSettings.liquidityZones ||
                     indicatorSettings.wyckoffEvents || indicatorSettings.breakerBlocks;

  return (
    <div className="min-h-screen text-white p-6 theme-bg">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => router.push("/chat/trend-scanner")}
          className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>العودة للماسح</span>
        </button>

        <div className="flex items-center gap-4">
          {/* Display Menu - القائمة الكاملة */}
          <IndicatorPanel
            settings={indicatorSettings}
            onSettingsChange={setIndicatorSettings}
            onSave={saveSettings}
          />
          {lastUpdate && (
            <span className="text-xs text-muted-foreground">
              آخر تحديث: {lastUpdate.toLocaleTimeString("ar-EG")}
            </span>
          )}
          <button
            onClick={refetch}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 theme-surface rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </button>
        </div>
      </div>

      {error ? (
        <div className="text-center py-20">
          <div className="text-red-400 text-lg mb-2">⚠️ خطأ في تحميل البيانات</div>
          <div className="text-muted-foreground">{error}</div>
          <button
            onClick={refetch}
            className="mt-4 px-4 py-2 bg-primary hover:bg-primary/80 rounded-lg transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : (
        <>
          {/* Overall Summary */}
          <div className="mb-8">
            <OverallSummary data={data} priceInfo={priceInfo} symbol={symbol} />
          </div>

          {/* Buy/Sell Indicators Panel */}
          {currentAnalysis && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
            >
              {/* Buy Signals */}
              <div className="theme-card rounded-xl p-4" style={{ borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                <div className="flex items-center gap-2 mb-3 text-emerald-400 font-medium">
                  <TrendingUp className="w-4 h-4" />
                  <span>إشارات الشراء</span>
                  <span className="text-xs bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    {currentAnalysis.signals.buySignals.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentAnalysis.signals.buySignals.length > 0 ? (
                    currentAnalysis.signals.buySignals.map((sig, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5">
                        <span className="text-xs font-bold text-emerald-300">{sig.indicator}</span>
                        <span className="text-[10px] text-emerald-400/70 border-r border-emerald-500/20 pr-2 mr-1">
                          {sig.strength.toFixed(0)}%
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground italic">لا توجد إشارات شراء قوية حالياً</span>
                  )}
                </div>
              </div>

              {/* Sell Signals */}
              <div className="theme-card rounded-xl p-4" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                <div className="flex items-center gap-2 mb-3 text-red-400 font-medium">
                  <TrendingDown className="w-4 h-4" />
                  <span>إشارات البيع</span>
                  <span className="text-xs bg-red-500/10 px-2 py-0.5 rounded-full">
                    {currentAnalysis.signals.sellSignals.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentAnalysis.signals.sellSignals.length > 0 ? (
                    currentAnalysis.signals.sellSignals.map((sig, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5">
                        <span className="text-xs font-bold text-red-300">{sig.indicator}</span>
                        <span className="text-[10px] text-red-400/70 border-r border-red-500/20 pr-2 mr-1">
                          {sig.strength.toFixed(0)}%
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground italic">لا توجد إشارات بيع قوية حالياً</span>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Trading Chart Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="theme-card rounded-xl overflow-hidden mb-8"
          >
            {/* Chart Header with Timeframe Selector */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-cyan-400" />
                الرسم البياني - {coinName}
              </h3>
              <div className="flex items-center gap-1 theme-surface rounded-lg p-1">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setSelectedTimeframe(tf)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      selectedTimeframe === tf
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                        : "text-muted-foreground hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {timeframeLabels[tf]}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart */}
            <div className="p-4">
              {chartData.length > 0 ? (
                <TradingChart
                  data={chartData}
                  height={450}
                  theme="dark"
                  showVolume={false}
                  indicators={{
                    sma10: indicatorSettings.sma10,
                    sma25: indicatorSettings.sma25,
                    sma50: indicatorSettings.sma50,
                    sma100: indicatorSettings.sma100,
                    sma200: indicatorSettings.sma200,
                    ema10: indicatorSettings.ema10,
                    ema25: indicatorSettings.ema25,
                    ema50: indicatorSettings.ema50,
                    ema100: indicatorSettings.ema100,
                    ema200: indicatorSettings.ema200,
                    bollingerBands: indicatorSettings.bollingerBands,
                    supertrend: indicatorSettings.supertrend,
                    // SMC Indicators
                    orderBlocks: indicatorSettings.orderBlocks,
                    fairValueGaps: indicatorSettings.fairValueGaps,
                    marketStructure: indicatorSettings.marketStructure,
                    liquidityZones: indicatorSettings.liquidityZones,
                    wyckoffEvents: indicatorSettings.wyckoffEvents,
                    breakerBlocks: indicatorSettings.breakerBlocks,
                    // Ehlers DSP Indicators
                    superSmoother: indicatorSettings.superSmoother,
                    instantaneousTrendline: indicatorSettings.instantaneousTrendline,
                    fisherTransform: indicatorSettings.fisherTransform,
                    mama: indicatorSettings.mama,
                    frama: indicatorSettings.frama,
                    cyberCycle: indicatorSettings.cyberCycle,
                    // Confluence & Risk Management
                    confluenceZones: indicatorSettings.confluenceZones,
                    fibonacciConfluence: indicatorSettings.fibonacciConfluence,
                    pivotPointConfluence: indicatorSettings.pivotPointConfluence,
                    riskRewardZones: indicatorSettings.riskRewardZones,
                    patternQualityScore: indicatorSettings.patternQualityScore,
                    // Breakout Detection - كشف الاختراقات
                    breakoutDetection: indicatorSettings.breakoutDetection,
                    rangeBreakout: indicatorSettings.rangeBreakout,
                    volumeSurgeBreakout: indicatorSettings.volumeSurgeBreakout,
                    // Classic Reversal Patterns - أنماط الانعكاس الكلاسيكية
                    headAndShoulders: indicatorSettings.headAndShoulders,
                    inverseHeadAndShoulders: indicatorSettings.inverseHeadAndShoulders,
                    doubleTop: indicatorSettings.doubleTop,
                    doubleBottom: indicatorSettings.doubleBottom,
                    tripleTop: indicatorSettings.tripleTop,
                    tripleBottom: indicatorSettings.tripleBottom,
                    cupAndHandle: indicatorSettings.cupAndHandle,
                    invertedCupAndHandle: indicatorSettings.invertedCupAndHandle,
                    rectangle: indicatorSettings.rectangle,

                    // Trendlines / Levels / Fibonacci
                    trendlines: indicatorSettings.trendlines,
                    horizontalLevels: indicatorSettings.horizontalLevels,
                    fibonacciRetracements: indicatorSettings.fibonacciRetracements,
                    verticalResistance: indicatorSettings.verticalResistance,
                    verticalSupport: indicatorSettings.verticalSupport,

                    // Chart Patterns (Channels / Triangles / Flags / Wedges)
                    ascendingChannel: indicatorSettings.ascendingChannel,
                    descendingChannel: indicatorSettings.descendingChannel,
                    ascendingTriangle: indicatorSettings.ascendingTriangle,
                    descendingTriangle: indicatorSettings.descendingTriangle,
                    symmetricalTriangle: indicatorSettings.symmetricalTriangle,

                    bullFlag: indicatorSettings.bullFlag,
                    bearFlag: indicatorSettings.bearFlag,
                    bullPennant: indicatorSettings.bullPennant,
                    bearPennant: indicatorSettings.bearPennant,

                    continuationFallingWedge: indicatorSettings.continuationFallingWedge,
                    reversalFallingWedge: indicatorSettings.reversalFallingWedge,
                    continuationRisingWedge: indicatorSettings.continuationRisingWedge,
                    reversalRisingWedge: indicatorSettings.reversalRisingWedge,

                    ascendingBroadeningWedge: indicatorSettings.ascendingBroadeningWedge,
                    descendingBroadeningWedge: indicatorSettings.descendingBroadeningWedge,

                    // Elite Overlay Indicators - المؤشرات النخبوية على الشارت الرئيسي
                    ichimoku: indicatorSettings.ichimoku,
                    parabolicSar: indicatorSettings.parabolicSar,
                    pivots: indicatorSettings.pivots,
                    keltner: indicatorSettings.keltner,
                    donchian: indicatorSettings.donchian,
                    atrBands: indicatorSettings.atrBands,

                    // 🏆 Ultra-Precision Patterns - أنماط الدقة الفائقة (R² ≥ 0.82)
                    ultraAscendingTriangle: indicatorSettings.ultraAscendingTriangle,
                    ultraDescendingTriangle: indicatorSettings.ultraDescendingTriangle,
                    ultraSymmetricalTriangle: indicatorSettings.ultraSymmetricalTriangle,
                    ultraRisingWedge: indicatorSettings.ultraRisingWedge,
                    ultraFallingWedge: indicatorSettings.ultraFallingWedge,
                    ultraSymmetricalBroadening: indicatorSettings.ultraSymmetricalBroadening,
                    ultraBroadeningBottom: indicatorSettings.ultraBroadeningBottom,
                    ultraBroadeningTop: indicatorSettings.ultraBroadeningTop,
                    ultraAscendingBroadeningRA: indicatorSettings.ultraAscendingBroadeningRA,
                    ultraDescendingBroadeningRA: indicatorSettings.ultraDescendingBroadeningRA,
                    
                    // 🎯 Ultra Channels & Flags - القنوات والأعلام الدقيقة
                    ultraAscendingChannel: indicatorSettings.ultraAscendingChannel,
                    ultraDescendingChannel: indicatorSettings.ultraDescendingChannel,
                    ultraBullFlag: indicatorSettings.ultraBullFlag,
                    ultraBearFlag: indicatorSettings.ultraBearFlag,
                    
                    // 🌊 Smart Money & Wolfe Wave
                    liquiditySweeps: indicatorSettings.liquiditySweeps,
                    wolfeWavePattern: indicatorSettings.wolfeWavePattern,
                    
                    // 🤖 AI Agents - الوكلاء الذكيون
                    agent1UltraPrecision: indicatorSettings.agent1UltraPrecision,
                    agent2ClassicPatterns: indicatorSettings.agent2ClassicPatterns,
                    agent3GeometricPatterns: indicatorSettings.agent3GeometricPatterns,
                    agent4ContinuationPatterns: indicatorSettings.agent4ContinuationPatterns,
                  }}
                />
              ) : (
                <div className="h-[450px] flex items-center justify-center text-muted-foreground">
                  {loading ? "جاري تحميل البيانات..." : "لا توجد بيانات للعرض"}
                </div>
              )}
            </div>

            {/* Indicator Toggle Bar - شريط أيقونات المؤشرات */}
            {mounted && (
            <div className="px-4 py-3 border-t border-white/10 theme-header">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground ml-2">📊 المؤشرات الأساسية:</span>
                
                {/* Volume */}
                <button
                  onClick={() => setIndicatorSettings({ ...indicatorSettings, volume: !indicatorSettings.volume })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    indicatorSettings.volume
                      ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 shadow-lg shadow-indigo-500/20"
                      : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Volume
                </button>

                {/* RSI */}
                <button
                  onClick={() => setIndicatorSettings({ ...indicatorSettings, rsi: !indicatorSettings.rsi })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    indicatorSettings.rsi
                      ? "bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-lg shadow-purple-500/20"
                      : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  RSI
                </button>

                {/* MACD */}
                <button
                  onClick={() => setIndicatorSettings({ ...indicatorSettings, macd: !indicatorSettings.macd })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    indicatorSettings.macd
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-lg shadow-blue-500/20"
                      : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                  MACD
                </button>

                {/* Stoch RSI */}
                <button
                  onClick={() => setIndicatorSettings({ ...indicatorSettings, stochRsi: !indicatorSettings.stochRsi })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    indicatorSettings.stochRsi
                      ? "bg-pink-500/20 text-pink-400 border border-pink-500/40 shadow-lg shadow-pink-500/20"
                      : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Stoch
                </button>

                {/* OBV */}
                <button
                  onClick={() => setIndicatorSettings({ ...indicatorSettings, obv: !indicatorSettings.obv })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    indicatorSettings.obv
                      ? "bg-teal-500/20 text-teal-400 border border-teal-500/40 shadow-lg shadow-teal-500/20"
                      : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  OBV
                </button>

                {/* ADX */}
                <button
                  onClick={() => setIndicatorSettings({ ...indicatorSettings, adx: !indicatorSettings.adx })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    indicatorSettings.adx
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-lg shadow-amber-500/20"
                      : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                  </svg>
                  ADX
                </button>

                {/* MFI */}
                <button
                  onClick={() => setIndicatorSettings({ ...indicatorSettings, mfi: !indicatorSettings.mfi })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    indicatorSettings.mfi
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-lg shadow-emerald-500/20"
                      : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  MFI
                </button>
              </div>

              {/* Advanced Indicators Row */}
              <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-white/20">
                <span className="text-xs text-muted-foreground ml-2">🚀 المتقدمة:</span>
                
                {/* Connors RSI */}
                <button
                  onClick={() => setIndicatorSettings({ ...indicatorSettings, connorsRsi: !indicatorSettings.connorsRsi })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    indicatorSettings.connorsRsi
                      ? "bg-pink-500/20 text-pink-400 border border-pink-500/40 shadow-lg shadow-pink-500/20"
                      : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Connors
                </button>

                {/* Laguerre RSI */}
                <button
                  onClick={() => setIndicatorSettings({ ...indicatorSettings, laguerreRsi: !indicatorSettings.laguerreRsi })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    indicatorSettings.laguerreRsi
                      ? "bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/40 shadow-lg shadow-fuchsia-500/20"
                      : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                  Laguerre
                </button>

                {/* VWAP */}
                <button
                  onClick={() => setIndicatorSettings({ ...indicatorSettings, vwap: !indicatorSettings.vwap })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    indicatorSettings.vwap
                      ? "bg-orange-500/20 text-orange-400 border border-orange-500/40 shadow-lg shadow-orange-500/20"
                      : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  VWAP
                </button>

                {/* CVD */}
                <button
                  onClick={() => setIndicatorSettings({ ...indicatorSettings, cvd: !indicatorSettings.cvd })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    indicatorSettings.cvd
                      ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 shadow-lg shadow-yellow-500/20"
                      : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  CVD
                </button>

                {/* Klinger */}
                <button
                  onClick={() => setIndicatorSettings({ ...indicatorSettings, klinger: !indicatorSettings.klinger })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    indicatorSettings.klinger
                      ? "bg-amber-600/20 text-amber-500 border border-amber-600/40 shadow-lg shadow-amber-600/20"
                      : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  Klinger
                </button>
              </div>

              {/* Ehlers DSP Row */}
              <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-white/20">
                <span className="text-xs text-muted-foreground ml-2">📡 خوارزميات Ehlers DSP:</span>
                
                {/* Super Smoother */}
                <button
                  onClick={() => setIndicatorSettings({ ...indicatorSettings, superSmoother: !indicatorSettings.superSmoother })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    indicatorSettings.superSmoother
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-lg shadow-cyan-500/20"
                      : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                  التمليس الفائق
                </button>

                {/* Instantaneous Trendline */}
                <button
                  onClick={() => setIndicatorSettings({ ...indicatorSettings, instantaneousTrendline: !indicatorSettings.instantaneousTrendline })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    indicatorSettings.instantaneousTrendline
                      ? "bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-lg shadow-sky-500/20"
                      : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                  خط الاتجاه اللحظي
                </button>

                {/* Fisher Transform */}
                <button
                  onClick={() => setIndicatorSettings({ ...indicatorSettings, fisherTransform: !indicatorSettings.fisherTransform })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    indicatorSettings.fisherTransform
                      ? "bg-violet-500/20 text-violet-400 border border-violet-500/40 shadow-lg shadow-violet-500/20"
                      : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  تحويل فيشر
                </button>

                {/* MAMA */}
                <button
                  onClick={() => setIndicatorSettings({ ...indicatorSettings, mama: !indicatorSettings.mama })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    indicatorSettings.mama
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-lg shadow-rose-500/20"
                      : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  MAMA التكيفي
                </button>

                {/* FRAMA */}
                <button
                  onClick={() => setIndicatorSettings({ ...indicatorSettings, frama: !indicatorSettings.frama })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    indicatorSettings.frama
                      ? "bg-indigo-600/20 text-indigo-400 border border-indigo-600/40 shadow-lg shadow-indigo-600/20"
                      : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  المتوسط الفركتالي
                </button>

                {/* Cyber Cycle */}
                <button
                  onClick={() => setIndicatorSettings({ ...indicatorSettings, cyberCycle: !indicatorSettings.cyberCycle })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    indicatorSettings.cyberCycle
                      ? "bg-lime-500/20 text-lime-400 border border-lime-500/40 shadow-lg shadow-lime-500/20"
                      : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  الدورة السيبرانية
                </button>
              </div>

              {/* Elite Advanced Indicators Row - المؤشرات المتقدمة النخبوية */}
              <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-white/20">
                <span className="text-xs text-muted-foreground ml-2">⭐ المؤشرات النخبوية:</span>
                
                {/* Williams %R */}
                <button
                  onClick={() => setIndicatorSettings({ ...indicatorSettings, williamsR: !indicatorSettings.williamsR })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    indicatorSettings.williamsR
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-lg shadow-emerald-500/20"
                      : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                  </svg>
                  Williams %R
                </button>

                {/* CCI */}
                <button
                  onClick={() => setIndicatorSettings({ ...indicatorSettings, advancedCci: !indicatorSettings.advancedCci })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    indicatorSettings.advancedCci
                      ? "bg-red-500/20 text-red-400 border border-red-500/40 shadow-lg shadow-red-500/20"
                      : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  CCI
                </button>

                {/* Momentum/ROC */}
                <button
                  onClick={() => setIndicatorSettings({ ...indicatorSettings, momentumRoc: !indicatorSettings.momentumRoc })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    indicatorSettings.momentumRoc
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-lg shadow-blue-500/20"
                      : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  ROC
                </button>

                {/* Ultimate Oscillator */}
                <button
                  onClick={() => setIndicatorSettings({ ...indicatorSettings, ultimateOsc: !indicatorSettings.ultimateOsc })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    indicatorSettings.ultimateOsc
                      ? "bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-lg shadow-purple-500/20"
                      : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  Ultimate
                </button>

                {/* CMF */}
                <button
                  onClick={() => setIndicatorSettings({ ...indicatorSettings, cmf: !indicatorSettings.cmf })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    indicatorSettings.cmf
                      ? "bg-green-500/20 text-green-400 border border-green-500/40 shadow-lg shadow-green-500/20"
                      : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  CMF
                </button>

                {/* Force Index */}
                <button
                  onClick={() => setIndicatorSettings({ ...indicatorSettings, forceIndex: !indicatorSettings.forceIndex })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    indicatorSettings.forceIndex
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-lg shadow-rose-500/20"
                      : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Force
                </button>

                {/* Choppiness Index */}
                <button
                  onClick={() => setIndicatorSettings({ ...indicatorSettings, choppiness: !indicatorSettings.choppiness })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    indicatorSettings.choppiness
                      ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 shadow-lg shadow-indigo-500/20"
                      : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Chop
                </button>

                {/* TRIX */}
                <button
                  onClick={() => setIndicatorSettings({ ...indicatorSettings, trix: !indicatorSettings.trix })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    indicatorSettings.trix
                      ? "bg-lime-500/20 text-lime-400 border border-lime-500/40 shadow-lg shadow-lime-500/20"
                      : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                  TRIX
                </button>

                {/* Awesome Oscillator */}
                <button
                  onClick={() => setIndicatorSettings({ ...indicatorSettings, awesomeOsc: !indicatorSettings.awesomeOsc })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    indicatorSettings.awesomeOsc
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-lg shadow-cyan-500/20"
                      : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  AO
                </button>
              </div>
            </div>
            )}

            {/* Sub Indicator Charts - الرسوم البيانية الفرعية للمؤشرات */}
            {chartData.length > 0 && (
              <SubChartsContainer
                data={chartData}
                indicators={{
                  volume: indicatorSettings.volume,
                  rsi: indicatorSettings.rsi,
                  macd: indicatorSettings.macd,
                  stochRsi: indicatorSettings.stochRsi,
                  obv: indicatorSettings.obv,
                  adx: indicatorSettings.adx,
                  mfi: indicatorSettings.mfi,
                  connorsRsi: indicatorSettings.connorsRsi,
                  laguerreRsi: indicatorSettings.laguerreRsi,
                  vwap: indicatorSettings.vwap,
                  cvd: indicatorSettings.cvd,
                  klinger: indicatorSettings.klinger,
                  superSmoother: indicatorSettings.superSmoother,
                  instantaneousTrendline: indicatorSettings.instantaneousTrendline,
                  fisherTransform: indicatorSettings.fisherTransform,
                  mama: indicatorSettings.mama,
                  frama: indicatorSettings.frama,
                  cyberCycle: indicatorSettings.cyberCycle,
                  // Elite Advanced Indicators - Oscillators only (sub-chart)
                  // Note: ichimoku, parabolicSar, pivots, keltner, donchian, atrBands are on MAIN chart
                  williamsR: indicatorSettings.williamsR,
                  advancedCci: indicatorSettings.advancedCci,
                  momentumRoc: indicatorSettings.momentumRoc,
                  ultimateOsc: indicatorSettings.ultimateOsc,
                  cmf: indicatorSettings.cmf,
                  forceIndex: indicatorSettings.forceIndex,
                  choppiness: indicatorSettings.choppiness,
                  trix: indicatorSettings.trix,
                  awesomeOsc: indicatorSettings.awesomeOsc,
                }}
                onToggle={(indicator, value) => {
                  setIndicatorSettings({
                    ...indicatorSettings,
                    [indicator]: value,
                  });
                }}
              />
            )}
            
            {/* SMC Summary Card - ملخص مفاهيم السيولة الذكية */}
            {smcEnabled && smcAnalysis && (
              <div className="p-4 border-t border-white/10">
                <SMCSummary analysis={smcAnalysis} />
              </div>
            )}
          </motion.div>

          {/* Harmonic Patterns */}
          {currentAnalysis && currentAnalysis.harmonics && currentAnalysis.harmonics.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="theme-card rounded-xl p-6"
                >
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Hexagon className="w-5 h-5 text-violet-400" />
                    أنماط الهارمونيك
                    <span className="text-xs bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded-full">
                      {currentAnalysis.harmonics?.length || 0}
                    </span>
                  </h3>
                  <div className="space-y-3 max-h-[250px] overflow-y-auto">
                    {currentAnalysis.harmonics?.map((harmonic, idx) => (
                      <div key={idx} className={`p-3 rounded-lg border ${
                        harmonic.type === 'bullish' 
                          ? 'bg-emerald-500/5 border-emerald-500/20' 
                          : 'bg-red-500/5 border-red-500/20'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`font-medium ${
                            harmonic.type === 'bullish' ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {harmonic.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ثقة: {harmonic.confidence}%
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                          <div>
                            <span className="text-muted-foreground">منطقة الانعكاس: </span>
                            <span className="text-violet-400 font-mono">
                              ${harmonic.prz?.min?.toLocaleString()} - ${harmonic.prz?.max?.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">وقف الخسارة: </span>
                            <span className="text-red-400 font-mono">${harmonic.stopLoss?.toLocaleString()}</span>
                          </div>
                        </div>
                        {harmonic.targets && harmonic.targets.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {harmonic.targets.map((t, i) => (
                              <span key={i} className="text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded">
                                TP{i + 1}: ${t.toLocaleString()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {(!currentAnalysis.harmonics || currentAnalysis.harmonics.length === 0) && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Hexagon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <div>لم يتم اكتشاف أنماط هارمونيك</div>
                      </div>
                    )}
                  </div>
                </motion.div>
          )}
        </>
      )}
    </div>
  );
}
