"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TestTube, Loader2, RefreshCw } from "lucide-react";
import { TradingChart, CandleData } from "@/components/charts/TradingChart";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBinanceKlines } from "@/hooks/useBinanceKlines";
import { Time } from "lightweight-charts";
import * as Display6 from "@/Display_6_Models";
import * as Display7 from "@/Display_7_Models";

type TradingPair = "BTC/USDT" | "XRP/USDT" | "SOL/USDT";
type TimeInterval = "5m" | "15m" | "30m" | "1h" | "4h" | "1d" | "3d";

const timeIntervals: { value: TimeInterval; label: string }[] = [
  { value: "5m", label: "5 دقائق" },
  { value: "15m", label: "15 دقيقة" },
  { value: "30m", label: "30 دقيقة" },
  { value: "1h", label: "ساعة" },
  { value: "4h", label: "4 ساعات" },
  { value: "1d", label: "يوم" },
  { value: "3d", label: "3 أيام" },
];

export default function TestPage() {
  const [selectedPair, setSelectedPair] = useState<TradingPair>("BTC/USDT");
  const [selectedInterval, setSelectedInterval] = useState<TimeInterval>("1d");
  const [selectedPattern, setSelectedPattern] = useState<string>("");
  const [selectedPattern2, setSelectedPattern2] = useState<string>("");
  const [selectedPattern3, setSelectedPattern3] = useState<string>("");
  const [selectedPattern4, setSelectedPattern4] = useState<string>("");
  const [selectedPattern5, setSelectedPattern5] = useState<string>("");
  const [selectedPattern6, setSelectedPattern6] = useState<string>("");
  const [selectedPattern7, setSelectedPattern7] = useState<string>("");
  const [indicators, setIndicators] = useState({});

  const { data, loading, error } = useBinanceKlines({
    symbol: selectedPair,
    interval: selectedInterval,
    limit: 200,
  });

  const chartData: CandleData[] = useMemo(() => {
    return data.map((candle: any) => ({
      ...candle,
      time: candle.time as Time,
    }));
  }, [data]);

  // Detect Display 7 patterns (AUJ5 Advanced)
  const display7Patterns = useMemo(() => {
    if (!selectedPattern7 || data.length === 0) return null;

    const candleData = data.map((d: any) => ({
      time: d.time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume
    }));

    if (selectedPattern7 === 'd7_auj5_wedge') {
      return Display7.detectAUJ5AdvancedWedge(candleData);
    }

    return null;
  }, [selectedPattern7, data]);

  const handlePatternChange = (pattern: string) => {
    setSelectedPattern(pattern);
    updateIndicators(pattern, selectedPattern2, selectedPattern3, selectedPattern4, selectedPattern5, selectedPattern6, selectedPattern7);
  };

  const handlePattern2Change = (pattern: string) => {
    setSelectedPattern2(pattern);
    updateIndicators(selectedPattern, pattern, selectedPattern3, selectedPattern4, selectedPattern5, selectedPattern6, selectedPattern7);
  };

  const handlePattern3Change = (pattern: string) => {
    setSelectedPattern3(pattern);
    updateIndicators(selectedPattern, selectedPattern2, pattern, selectedPattern4, selectedPattern5, selectedPattern6, selectedPattern7);
  };

  const handlePattern4Change = (pattern: string) => {
    setSelectedPattern4(pattern);
    updateIndicators(selectedPattern, selectedPattern2, selectedPattern3, pattern, selectedPattern5, selectedPattern6, selectedPattern7);
  };

  const handlePattern5Change = (pattern: string) => {
    setSelectedPattern5(pattern);
    updateIndicators(selectedPattern, selectedPattern2, selectedPattern3, selectedPattern4, pattern, selectedPattern6, selectedPattern7);
  };

  const handlePattern6Change = (pattern: string) => {
    setSelectedPattern6(pattern);
    updateIndicators(selectedPattern, selectedPattern2, selectedPattern3, selectedPattern4, selectedPattern5, pattern, selectedPattern7);
  };

  const handlePattern7Change = (pattern: string) => {
    setSelectedPattern7(pattern);
    updateIndicators(selectedPattern, selectedPattern2, selectedPattern3, selectedPattern4, selectedPattern5, selectedPattern6, pattern);
  };

  const updateIndicators = (pattern1: string, pattern2: string, pattern3: string, pattern4: string, pattern5: string, pattern6: string, pattern7: string) => {
    const newIndicators: any = {};
    if (pattern1) newIndicators[pattern1] = true;
    if (pattern2) newIndicators[pattern2] = true;
    if (pattern3) newIndicators[pattern3] = true;
    if (pattern4) newIndicators[pattern4] = true;
    if (pattern5) newIndicators[pattern5] = true;
    if (pattern6) newIndicators[pattern6] = true;
    if (pattern7) newIndicators[pattern7] = true;
    setIndicators(newIndicators);
  };

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-full mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                <TestTube className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-black dark:text-white">صفحة الاختبار</h1>
                <p className="text-black/70 dark:text-white/70 text-sm">شارت التحليل الفني - {selectedPair} ({timeIntervals.find(t => t.value === selectedInterval)?.label})</p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                {(["BTC/USDT", "XRP/USDT", "SOL/USDT"] as TradingPair[]).map((pair) => (
                  <Button
                    key={pair}
                    variant={selectedPair === pair ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedPair(pair)}
                    className={cn("transition-all", selectedPair === pair && "glow-primary")}
                    aria-label={`اختيار زوج ${pair}`}
                  >
                    <TrendingUp className="w-4 h-4 ml-1" />
                    {pair}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2 flex-wrap">
                {timeIntervals.map((interval) => (
                  <Button
                    key={interval.value}
                    variant={selectedInterval === interval.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedInterval(interval.value)}
                    className={cn("transition-all text-xs", selectedInterval === interval.value && "glow-primary")}
                    aria-label={`اختيار إطار زمني ${interval.label}`}
                  >
                    {interval.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
          <Card className="overflow-hidden">
            <CardHeader className="border-b border-surface-border">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-accent-primary" />
                    الرسم البياني - {selectedPair}
                    {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                    {!loading && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                  </CardTitle>
                  <CardDescription>
                    التحليل الفني - بيانات حية من Binance
                    {data.length > 0 && ` (${data.length} شمعة)`}
                  </CardDescription>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <select 
                    value={selectedPattern}
                    onChange={(e) => handlePatternChange(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-black text-sm min-w-[200px]"
                  >
                    <option value="">-- اختر النمط --</option>
                    <optgroup label="الأنماط الكلاسيكية">
                      <option value="headAndShoulders">Head and Shoulders (رأس وكتفين)</option>
                      <option value="inverseHeadAndShoulders">Inverse H&S (رأس وكتفين مقلوب)</option>
                      <option value="doubleTop">Double Top (قمة مزدوجة)</option>
                      <option value="doubleBottom">Double Bottom (قاع مزدوج)</option>
                      <option value="tripleTop">Triple Top (قمة ثلاثية)</option>
                      <option value="tripleBottom">Triple Bottom (قاع ثلاثي)</option>
                      <option value="cupAndHandle">Cup and Handle (كوب وعروة)</option>
                    </optgroup>
                    <optgroup label="القنوات والمثلثات">
                      <option value="ascendingChannel">Ascending Channel (قناة صاعدة)</option>
                      <option value="descendingChannel">Descending Channel (قناة هابطة)</option>
                      <option value="ascendingTriangle">Ascending Triangle (مثلث صاعد)</option>
                      <option value="descendingTriangle">Descending Triangle (مثلث هابط)</option>
                      <option value="symmetricalTriangle">Symmetrical Triangle (مثلث متماثل)</option>
                    </optgroup>
                    <optgroup label="الأعلام والرايات">
                      <option value="bullFlag">Bull Flag (علم صاعد)</option>
                      <option value="bearFlag">Bear Flag (علم هابط)</option>
                      <option value="bullPennant">Bull Pennant (راية صاعدة)</option>
                      <option value="bearPennant">Bear Pennant (راية هابطة)</option>
                    </optgroup>
                    <optgroup label="الأوتاد">
                      <option value="reversalRisingWedge">Rising Wedge (وتد صاعد)</option>
                      <option value="reversalFallingWedge">Falling Wedge (وتد هابط)</option>
                    </optgroup>
                  </select>
                  <select 
                    value={selectedPattern2}
                    onChange={(e) => handlePattern2Change(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-black text-sm min-w-[220px]"
                  >
                    <option value="">-- Display 2: TRADING_AGENT --</option>
                    <optgroup label="SMC - Smart Money">
                      <option value="orderBlocks">Order Blocks (كتل الأوامر)</option>
                      <option value="fairValueGaps">Fair Value Gaps (FVG)</option>
                      <option value="liquidityZones">Liquidity Zones (مناطق السيولة)</option>
                      <option value="liquiditySweeps">Liquidity Sweeps (مسح السيولة)</option>
                      <option value="marketStructure">Market Structure (بنية السوق)</option>
                      <option value="wyckoffEvents">Wyckoff Events</option>
                      <option value="breakerBlocks">Breaker Blocks</option>
                    </optgroup>
                    <optgroup label="خطوط ومستويات">
                      <option value="trendlines">Trendlines (خطوط الاتجاه)</option>
                      <option value="horizontalLevels">Support/Resistance (دعم/مقاومة)</option>
                      <option value="fibonacciRetracements">Fibonacci Retracements</option>
                    </optgroup>
                  </select>
                  <select 
                    value={selectedPattern3}
                    onChange={(e) => handlePattern3Change(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-black text-sm min-w-[220px]"
                  >
                    <option value="">— Display 3: AI_TRADING_BOT —</option>
                    <optgroup label="أنماط YOLOv8">
                      <option value="cupAndHandle">Cup and Handle (الكأس والمقبض - صعودي)</option>
                      <option value="invertedCupAndHandle">Inverse Cup and Handle (معكوس - هبوطي)</option>
                      <option value="doubleBottom">Double Bottom (القاع المزدوج - صعودي)</option>
                      <option value="headAndShoulders">Head and Shoulders (الرأس والكتفين - هبوطي)</option>
                    </optgroup>
                  </select>
                  <select 
                    value={selectedPattern4}
                    onChange={(e) => handlePattern4Change(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-black text-sm min-w-[220px]"
                  >
                    <option value="">— Display 4: TRADEMATE —</option>
                    <optgroup label="🔴 أنماط الانعكاس (مفعلة ✓)">
                      <option value="headAndShoulders">Head and Shoulders (هبوطي)</option>
                      <option value="inverseHeadAndShoulders">Inverse H&S (صعودي)</option>
                      <option value="doubleTop">Double Top (هبوطي)</option>
                      <option value="doubleBottom">Double Bottom (صعودي)</option>
                    </optgroup>
                    <optgroup label="🔵 القنوات (مفعلة ✓)">
                      <option value="ascendingChannel">Ascending Channel (صعودي)</option>
                      <option value="descendingChannel">Descending Channel (هبوطي)</option>
                    </optgroup>
                    <optgroup label="🔶 المثلثات (مفعلة ✓)">
                      <option value="ascendingTriangle">Ascending Triangle</option>
                      <option value="descendingTriangle">Descending Triangle</option>
                      <option value="symmetricalTriangle">Symmetrical Triangle</option>
                    </optgroup>
                    <optgroup label="⚡ الأعلام والرايات (مفعلة ✓)">
                      <option value="bullFlag">Bull Flag (صعودي)</option>
                      <option value="bearFlag">Bear Flag (هبوطي)</option>
                      <option value="bullPennant">Bull Pennant (استمرار)</option>
                      <option value="bearPennant">Bear Pennant (استمرار)</option>
                    </optgroup>
                    <optgroup label="📐 الأوتاد (مفعلة ✓)">
                      <option value="reversalRisingWedge">Rising Wedge (هبوطي)</option>
                      <option value="reversalFallingWedge">Falling Wedge (صعودي)</option>
                      <option value="continuationRisingWedge">Rising Wedge - Continuation</option>
                      <option value="continuationFallingWedge">Falling Wedge - Continuation</option>
                    </optgroup>
                    <optgroup label="مؤشرات تقنية">
                      <option value="bollingerBands">Bollinger Bands</option>
                      <option value="supertrend">SuperTrend</option>
                      <option value="parabolicSar">Parabolic SAR</option>
                      <option value="ichimoku">Ichimoku Cloud</option>
                      <option value="pivots">Pivot Points</option>
                    </optgroup>
                    <optgroup label="🤖 AI Agents">
                      <option value="agent1UltraPrecision">Agent 1: Ultra Precision (قنوات وأعلام)</option>
                      <option value="agent2ClassicPatterns">Agent 2: Classic Patterns (كلاسيكية)</option>
                      <option value="agent3GeometricPatterns">Agent 3: Geometric (مثلثات وأوتاد)</option>
                      <option value="agent4ContinuationPatterns">Agent 4: Continuation (رايات)</option>
                    </optgroup>
                  </select>
                  <select 
                    value={selectedPattern5}
                    onChange={(e) => handlePattern5Change(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-black text-sm min-w-[220px]"
                  >
                    <option value="">— Display 5: CUSTOM MODELS —</option>
                    <optgroup label="📊 Market Structure">
                      <option value="srMajorMinor">S/R Major/Minor [TFlab] - Market Structure</option>
                      <option value="wolfeWavesBigBeluga">Wolfe Waves [BigBeluga] - 5-Point Pattern</option>
                      <option value="deviationTrendProfile">Deviation Trend Profile [BigBeluga] - StdDev Bands</option>
                      <option value="logRegressionOscillator">Log Regression Oscillator Channel [BigBeluga]</option>
                      <option value="donAltToolkit">DonAlt Toolkit [BigBeluga] - Levels & OB</option>
                      <option value="psychologicalSR">Psychological Support/Resistance [HunterAlgos]</option>
                      <option value="wedgeFlagFinder">Wedge & Flag Finder [Trendoscope] - Multi-Zigzag</option>
                      <option value="priceHeatMeter">Price Heat Meter [ChartPrime] - Heat Visualization</option>
                    </optgroup>
                    <optgroup label="💎 Smart Money Concepts">
                      <option value="smartMoneyDynamics">Smart Money Dynamics Blocks - Pearson Matrix</option>
                      <option value="ravmMatrix">RAVM Matrix - RSI Analytic Volume Matrix</option>
                      <option value="trendBreakTargets">Trend Break Targets + CHOCH [TBT]</option>
                      <option value="squeezeMomentum">Squeeze Momentum Oscillator</option>
                      <option value="recursiveReversalPatterns">Recursive Reversal Patterns [RRCP]</option>
                      <option value="htfAscendingTriangle">HTF Ascending Triangle</option>
                      <option value="htfDescendingTriangle">HTF Descending Triangle</option>
                      <option value="wedgeMaker">Wedge Maker - Pivot Trendlines</option>
                      <option value="wolfeWaves">Wolfe Waves - 5-Point Reversal</option>
                      <option value="wolfeWavesLux">Wolfe Waves LuxAlgo - Advanced</option>
                      <option value="autoChannel">Auto Channel - Parallel Detection</option>
                      <option value="trendlineNavigator">Trendline Breakout Navigator [LuxAlgo]</option>
                      <option value="luxTrendLines">Trend Lines [LuxAlgo]</option>
                      <option value="sessionBreakout">Session Breakout - Time Range Breaks</option>
                      <option value="gartleyPattern">Gartley Harmonic Pattern - XABCD</option>
                      <option value="alternateBatPattern">Alternate Bat Harmonic Pattern - ALT Bat</option>
                      <option value="abcdPattern">ABCD Harmonic Pattern - 4 Point</option>
                      <option value="alternativeSharkPattern">Alternative Shark Harmonic Pattern</option>
                      <option value="threeDrivePattern">Three Drive Pattern [LuxAlgo]</option>
                      <option value="ehlersIT">Ehlers Instantaneous Trend [LazyBear]</option>
                      <option value="supertrendMA">SuperTrended Moving Averages</option>
                      <option value="ichimokuPourSamadi">Ichimoku PourSamadi Signal [TradingFinder]</option>
                      <option value="autoChartPatterns">Auto Chart Patterns [Trendoscope®]</option>
                      <option value="nadarayaWatsonEnvelope">Nadaraya-Watson Envelope [LuxAlgo]</option>
                      <option value="cyclicRSI">RSI Cyclic Smoothed (cRSI) [whentotrade]</option>
                      <option value="chronoPulse">ChronoPulse MS-MACD Resonance</option>
                      <option value="luxySuperTrend">Luxy Super-Duper SuperTrend</option>
                      <option value="supportResistanceRegression">S/R Polynomial Regression [Flux]</option>
                      <option value="trendLineMethods">Trend Line Methods (Pivot/5-Point)</option>
                      <option value="dynamicSR">Dynamic S/R with Matrix (Multi-Strategy)</option>
                      <option value="flagsPennants">Flags & Pennants [Trendoscope®]</option>
                      <option value="pivotTrendlines">Pivot Trendlines with Breaks [HG]</option>
                      <option value="dynamicFibonacci">Dynamic Fibonacci Retracement [HG]</option>
                      <option value="srPowerChannel">S&R Power Channel [ChartPrime]</option>
                      <option value="divergenceScreener">Divergence Screener [Trendoscope®]</option>
                      <option value="autoChartPatterns">Auto Chart Patterns [Trendoscope®]</option>
                      <option value="rangeBreakout">Range Breakout [BigBeluga]</option>
                      <option value="harmonicSystem">Harmonic Pattern System [reees]</option>
                      <option value="dragonPattern">Dragon Harmonic Pattern [TFlab]</option>
                      <option value="pivotTrendlinesV2">Pivot Trendlines V2 [HG]</option>
                      <option value="cypherPattern">Cypher Harmonic Pattern [TFlab]</option>
                    </optgroup>
                  </select>
                  <select 
                    value={selectedPattern6}
                    onChange={(e) => handlePattern6Change(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-black text-sm min-w-[220px]"
                  >
                    <option value="">— Display 6: ajaygm18/chart —</option>
                    <optgroup label="📊 Reversal Patterns">
                      <option value="d6_head_and_shoulders">Head and Shoulders (رأس وكتفين)</option>
                      <option value="d6_inverse_head_and_shoulders">Inverse H&S (رأس وكتفين مقلوب)</option>
                      <option value="d6_double_top">Double Top (قمة مزدوجة)</option>
                      <option value="d6_double_bottom">Double Bottom (قاع مزدوج)</option>
                      <option value="d6_triple_top">Triple Top (قمة ثلاثية)</option>
                      <option value="d6_triple_bottom">Triple Bottom (قاع ثلاثي)</option>
                      <option value="d6_rounding_bottom">Rounding Bottom (قاع دائري)</option>
                    </optgroup>
                    <optgroup label="📐 Triangle Patterns">
                      <option value="d6_ascending_triangle">Ascending Triangle (مثلث صاعد)</option>
                      <option value="d6_descending_triangle">Descending Triangle (مثلث هابط)</option>
                      <option value="d6_symmetrical_triangle">Symmetrical Triangle (مثلث متماثل)</option>
                    </optgroup>
                    <optgroup label="🔺 Wedge Patterns">
                      <option value="d6_rising_wedge">Rising Wedge (وتد صاعد)</option>
                      <option value="d6_falling_wedge">Falling Wedge (وتد هابط)</option>
                    </optgroup>
                    <optgroup label="🚩 Flag & Pennant Patterns">
                      <option value="d6_bull_flag">Bull Flag (علم صاعد)</option>
                      <option value="d6_bear_flag">Bear Flag (علم هابط)</option>
                      <option value="d6_bull_pennant">Bull Pennant (راية صاعدة)</option>
                      <option value="d6_bear_pennant">Bear Pennant (راية هابطة)</option>
                    </optgroup>
                    <optgroup label="📈 Channel & Rectangle">
                      <option value="d6_channel_up">Channel Up (قناة صاعدة)</option>
                      <option value="d6_channel_down">Channel Down (قناة هابطة)</option>
                      <option value="d6_rectangle">Rectangle (مستطيل)</option>
                      <option value="d6_cup_and_handle">Cup and Handle (كوب وعروة)</option>
                    </optgroup>
                  </select>
                  <select 
                    value={selectedPattern7}
                    onChange={(e) => handlePattern7Change(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-purple-500 bg-gradient-to-r from-purple-50 to-pink-50 text-black text-sm min-w-[280px] font-semibold shadow-lg"
                  >
                    <option value="">✨ Display 7: AUJ5 Advanced (دقة الميلي) ✨</option>
                    <optgroup label="🎯 AUJ5 Ultra-Precise Wedge Patterns">
                      <option value="d7_auj5_wedge">🔬 AUJ5 Advanced Wedge (Fractal + ML)</option>
                    </optgroup>
                    <optgroup label="📊 Pattern Types Detected">
                      <option value="d7_info_rising" disabled>• Rising Wedge (Bearish)</option>
                      <option value="d7_info_falling" disabled>• Falling Wedge (Bullish)</option>
                      <option value="d7_info_asc_tri" disabled>• Ascending Triangle</option>
                      <option value="d7_info_desc_tri" disabled>• Descending Triangle</option>
                      <option value="d7_info_sym_tri" disabled>• Symmetrical Triangle</option>
                      <option value="d7_info_expand" disabled>• Expanding Wedge</option>
                      <option value="d7_info_contract" disabled>• Contracting Wedge</option>
                    </optgroup>
                    <optgroup label="🧬 Advanced Features">
                      <option value="d7_info_fractal" disabled>• Fractal Dimension Analysis</option>
                      <option value="d7_info_robust" disabled>• Robust Regression (Huber)</option>
                      <option value="d7_info_stats" disabled>• Statistical Validation (p-value)</option>
                      <option value="d7_info_fib" disabled>• Fibonacci Alignment</option>
                      <option value="d7_info_ml" disabled>• ML Confidence Scoring</option>
                      <option value="d7_info_precision" disabled>• 0.1% Convergence Precision</option>
                    </optgroup>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {error && (
                <div className="flex items-center justify-center h-[600px] text-red-500">
                  <div className="text-center">
                    <p className="text-lg font-semibold mb-2">خطأ في جلب البيانات</p>
                    <p className="text-sm text-foreground-muted">{error}</p>
                  </div>
                </div>
              )}
              {loading && !data.length && (
                <div className="flex items-center justify-center h-[600px]">
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-accent-primary mx-auto mb-4" />
                    <p className="text-lg font-semibold">جاري تحميل البيانات الحية...</p>
                    <p className="text-sm text-foreground-muted mt-2">من Binance API</p>
                  </div>
                </div>
              )}
              {!loading && !error && data.length > 0 && (
                <div className="w-full" style={{ height: "600px" }}>
                  {selectedPattern7 && display7Patterns && display7Patterns.length > 0 && (
                    <div className="mb-4 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-purple-500 animate-pulse" />
                          <span className="text-sm font-bold text-purple-400">✨ Display 7: AUJ5 Advanced Wedge Detection</span>
                        </div>
                        <span className="text-xs text-purple-300 font-semibold">
                          {display7Patterns.length} pattern{display7Patterns.length > 1 ? 's' : ''} • دقة الميلي (0.1%)
                        </span>
                      </div>
                      {display7Patterns.slice(0, 3).map((pattern: Display7.Display7Pattern, idx: number) => {
                        const details = Display7.getDisplay7PatternDetails(pattern);
                        return (
                          <div key={idx} className="mt-3 p-3 bg-black/20 rounded-lg border border-purple-400/20">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                              <div>
                                <span className="text-gray-400">Pattern:</span>
                                <p className="font-semibold text-purple-300">{details.name}</p>
                              </div>
                              <div>
                                <span className="text-gray-400">Direction:</span>
                                <p className={`font-bold ${
                                  details.direction === 'BULLISH' ? 'text-green-400' : 
                                  details.direction === 'BEARISH' ? 'text-red-400' : 'text-blue-400'
                                }`}>{details.direction}</p>
                              </div>
                              <div>
                                <span className="text-gray-400">Confidence:</span>
                                <p className="font-semibold text-yellow-300">{details.confidence}</p>
                              </div>
                              <div>
                                <span className="text-gray-400">Strength:</span>
                                <p className="font-semibold text-orange-300">{details.strength}</p>
                              </div>
                              <div>
                                <span className="text-gray-400">Breakout Prob:</span>
                                <p className="font-semibold text-cyan-300">{details.breakoutProb}</p>
                              </div>
                              <div>
                                <span className="text-gray-400">Risk/Reward:</span>
                                <p className="font-semibold text-lime-300">{details.riskReward}</p>
                              </div>
                              <div>
                                <span className="text-gray-400">Target:</span>
                                <p className="font-semibold text-green-300">{details.target}</p>
                              </div>
                              <div>
                                <span className="text-gray-400">Stop Loss:</span>
                                <p className="font-semibold text-red-300">{details.stopLoss}</p>
                              </div>
                              <div>
                                <span className="text-gray-400">Fractal Dim:</span>
                                <p className="font-mono text-purple-200">{details.fractalDim}</p>
                              </div>
                              <div>
                                <span className="text-gray-400">Convergence:</span>
                                <p className="font-mono text-blue-200">{details.convergenceAngle}</p>
                              </div>
                              <div>
                                <span className="text-gray-400">Maturity:</span>
                                <p className="font-semibold text-pink-300">{details.patternMaturity}</p>
                              </div>
                              <div>
                                <span className="text-gray-400">Time to Breakout:</span>
                                <p className="font-semibold text-indigo-300">{details.timeToBreakout}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <TradingChart data={chartData} indicators={indicators} />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
