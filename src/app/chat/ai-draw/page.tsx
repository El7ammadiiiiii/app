"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, TrendingUp, AlertCircle, Zap, Brain, Activity, BarChart3 } from "lucide-react";
import { useBinanceKlines } from "@/hooks/useBinanceKlines";
import * as echarts from "echarts";

type Pair = "BTC/USDT" | "ETH/USDT" | "SOL/USDT" | "XRP/USDT" | "BNB/USDT" | "ADA/USDT";
type TF = "15m" | "1h" | "4h" | "1d";

interface DrawingLine {
  type: string;
  label: string;
  points: { time: number; price: number }[];
  color: string;
  style: string;
  description?: string;
}

interface Analysis {
  drawings: DrawingLine[];
  summary: string;
  patterns: string[];
  trend: string;
  keyLevels: { type: string; price: number }[];
}

// ═══════════════════════════════════════════════════════════
// 📊 Technical Indicators Calculations
// ═══════════════════════════════════════════════════════════

interface Indicators {
  rsi: number[];
  macd: { macd: number; signal: number; histogram: number }[];
  sma20: number[];
  sma50: number[];
  ema12: number[];
  ema26: number[];
  bollingerBands: { upper: number; middle: number; lower: number }[];
}

// Calculate RSI
function calculateRSI(closes: number[], period = 14): number[] {
  const rsi: number[] = [];
  let gains = 0;
  let losses = 0;

  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      if (i > 0) {
        const change = closes[i] - closes[i - 1];
        if (change > 0) gains += change;
        else losses -= change;
      }
      if (i === period - 1) {
        const avgGain = gains / period;
        const avgLoss = losses / period;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
      } else {
        rsi.push(NaN);
      }
    } else {
      const change = closes[i] - closes[i - 1];
      const currentGain = change > 0 ? change : 0;
      const currentLoss = change < 0 ? -change : 0;
      gains = (gains * (period - 1) + currentGain) / period;
      losses = (losses * (period - 1) + currentLoss) / period;
      const rs = losses === 0 ? 100 : gains / losses;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }
  return rsi;
}

// Calculate SMA
function calculateSMA(data: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(NaN);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
  }
  return sma;
}

// Calculate EMA
function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      ema.push(NaN);
    } else if (i === period - 1) {
      const sum = data.slice(0, period).reduce((a, b) => a + b, 0);
      ema.push(sum / period);
    } else {
      ema.push((data[i] - ema[i - 1]) * multiplier + ema[i - 1]);
    }
  }
  return ema;
}

// Calculate MACD
function calculateMACD(closes: number[]): { macd: number; signal: number; histogram: number }[] {
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macdLine: number[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (isNaN(ema12[i]) || isNaN(ema26[i])) {
      macdLine.push(NaN);
    } else {
      macdLine.push(ema12[i] - ema26[i]);
    }
  }
  
  const signalLine = calculateEMA(macdLine.filter(v => !isNaN(v)), 9);
  const result: { macd: number; signal: number; histogram: number }[] = [];
  let signalIdx = 0;
  
  for (let i = 0; i < closes.length; i++) {
    if (isNaN(macdLine[i])) {
      result.push({ macd: NaN, signal: NaN, histogram: NaN });
    } else {
      const sig = signalLine[signalIdx] ?? NaN;
      result.push({
        macd: macdLine[i],
        signal: sig,
        histogram: isNaN(sig) ? NaN : macdLine[i] - sig
      });
      signalIdx++;
    }
  }
  return result;
}

// Calculate Bollinger Bands
function calculateBollingerBands(closes: number[], period = 20, stdDev = 2): { upper: number; middle: number; lower: number }[] {
  const sma = calculateSMA(closes, period);
  const bands: { upper: number; middle: number; lower: number }[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      bands.push({ upper: NaN, middle: NaN, lower: NaN });
    } else {
      const slice = closes.slice(i - period + 1, i + 1);
      const mean = sma[i];
      const variance = slice.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / period;
      const std = Math.sqrt(variance);
      bands.push({
        upper: mean + stdDev * std,
        middle: mean,
        lower: mean - stdDev * std
      });
    }
  }
  return bands;
}

// Calculate all indicators
function calculateIndicators(ohlcv: { close: number }[]): Indicators {
  const closes = ohlcv.map(c => c.close);
  return {
    rsi: calculateRSI(closes),
    macd: calculateMACD(closes),
    sma20: calculateSMA(closes, 20),
    sma50: calculateSMA(closes, 50),
    ema12: calculateEMA(closes, 12),
    ema26: calculateEMA(closes, 26),
    bollingerBands: calculateBollingerBands(closes)
  };
}

// API Keys
const DEEPSEEK_KEY = process.env.NEXT_PUBLIC_DEEPSEEK_KEY || "";
const GROQ_KEY = process.env.NEXT_PUBLIC_GROQ_KEY || "";
const GPT_KEY = process.env.NEXT_PUBLIC_GPT_KEY || "";
const CLAUDE_KEY = process.env.NEXT_PUBLIC_CLAUDE_KEY || "";
const GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_KEY || "";

// Pattern Categories for focused analysis
const PATTERN_CATEGORIES = [
  { value: 'all', label: 'كل الأنماط 🎯', description: 'All Patterns' },
  { value: 'triangles', label: 'المثلثات 📐', description: 'Triangles' },
  { value: 'channels', label: 'القنوات 📊', description: 'Channels' },
  { value: 'flags', label: 'الأعلام 🚩', description: 'Flags' },
  { value: 'pennants', label: 'الرايات 🔺', description: 'Pennants' },
  { value: 'wedges', label: 'الأوتاد 🔷', description: 'Wedges' },
  { value: 'continuation_wedges', label: 'أوتاد استمرارية ➡️', description: 'Continuation Wedges' },
  { value: 'reversal_wedges', label: 'أوتاد انعكاسية 🔄', description: 'Reversal Wedges' },
  { value: 'broadening', label: 'التوسع 📢', description: 'Broadening' },
  { value: 'double_patterns', label: 'الأنماط المزدوجة 🔁', description: 'Double Patterns' },
  { value: 'head_shoulders', label: 'الرأس والكتفين 👤', description: 'Head & Shoulders' },
  { value: 'ranges', label: 'النطاقات ↔️', description: 'Ranges' },
  { value: 'trendlines', label: 'خطوط الاتجاه 📈', description: 'Trendlines' },
  { value: 'levels', label: 'الدعم والمقاومة ➖', description: 'Support/Resistance' },
  { value: 'breakouts', label: 'الاختراقات 💥', description: 'Breakouts' },
  { value: 'liquidity', label: 'السيولة 💧', description: 'Liquidity' },
  { value: 'liquidity_pools', label: 'تجمعات السيولة 🏊', description: 'Liquidity Pools' },
  { value: 'liquidity_sweeps', label: 'مسح السيولة 🧹', description: 'Liquidity Sweeps' },
  { value: 'scalping', label: 'أنماط السكالبينج ⚡', description: 'Scalping Patterns' },
];

export default function AIDrawPage() {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  const [pair, setPair] = useState<Pair>("BTC/USDT");
  const [tf, setTf] = useState<TF>("4h");
  const [selectedPattern, setSelectedPattern] = useState<string>('all');
  
  // DeepSeek state
  const [analyzingDeepSeek, setAnalyzingDeepSeek] = useState(false);
  const [analysisDeepSeek, setAnalysisDeepSeek] = useState<Analysis | null>(null);
  
  // Groq state
  const [analyzingGroq, setAnalyzingGroq] = useState(false);
  const [analysisGroq, setAnalysisGroq] = useState<Analysis | null>(null);
  
  // GPT state
  const [analyzingGPT, setAnalyzingGPT] = useState(false);
  const [analysisGPT, setAnalysisGPT] = useState<Analysis | null>(null);
  
  // Claude state
  const [analyzingClaude, setAnalyzingClaude] = useState(false);
  const [analysisClaude, setAnalysisClaude] = useState<Analysis | null>(null);
  
  // Gemini state
  const [analyzingGemini, setAnalyzingGemini] = useState(false);
  const [analysisGemini, setAnalysisGemini] = useState<Analysis | null>(null);
  
  // Active analysis to display
  const [activeProvider, setActiveProvider] = useState<'deepseek' | 'groq' | 'gpt' | 'claude' | 'gemini'>('deepseek');
  const analysis = activeProvider === 'deepseek' ? analysisDeepSeek : activeProvider === 'groq' ? analysisGroq : activeProvider === 'gpt' ? analysisGPT : activeProvider === 'claude' ? analysisClaude : analysisGemini;
  
  const [error, setError] = useState<string | null>(null);
  const [lastRequestTime, setLastRequestTime] = useState<number>(0);

  const { data, loading } = useBinanceKlines({ symbol: pair, interval: tf, limit: 150 });

  const ohlcv = useMemo(() => data.map((c: any) => ({
    time: c.time * 1000,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume
  })), [data]);

  // Calculate indicators
  const indicators = useMemo(() => {
    if (ohlcv.length < 30) return null;
    return calculateIndicators(ohlcv);
  }, [ohlcv]);

  // Get current indicator values for display
  const currentIndicators = useMemo(() => {
    if (!indicators || ohlcv.length === 0) return null;
    const lastIdx = ohlcv.length - 1;
    const rsi = indicators.rsi[lastIdx];
    const macd = indicators.macd[lastIdx];
    const bb = indicators.bollingerBands[lastIdx];
    const sma20 = indicators.sma20[lastIdx];
    const sma50 = indicators.sma50[lastIdx];
    const currentPrice = ohlcv[lastIdx].close;
    
    return {
      rsi: isNaN(rsi) ? null : rsi,
      macd: macd.macd,
      macdSignal: macd.signal,
      macdHistogram: macd.histogram,
      bbUpper: bb.upper,
      bbMiddle: bb.middle,
      bbLower: bb.lower,
      sma20,
      sma50,
      currentPrice,
      // Signals
      rsiSignal: rsi > 70 ? 'overbought' : rsi < 30 ? 'oversold' : 'neutral',
      macdSignal2: macd.histogram > 0 ? 'bullish' : 'bearish',
      bbPosition: currentPrice > bb.upper ? 'above' : currentPrice < bb.lower ? 'below' : 'inside',
      maTrend: sma20 > sma50 ? 'bullish' : 'bearish'
    };
  }, [indicators, ohlcv]);

  // DeepSeek Analysis
  const runDeepSeek = useCallback(async () => {
    if (ohlcv.length < 20) {
      setError("البيانات غير كافية");
      return;
    }

    const now = Date.now();
    if (now - lastRequestTime < 3000) {
      setError("انتظر قليلاً...");
      return;
    }

    setAnalyzingDeepSeek(true);
    setError(null);
    setLastRequestTime(now);
    setActiveProvider('deepseek');
    
    try {
      const res = await fetch('/api/ai-chart-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          symbol: pair, 
          timeframe: tf, 
          ohlcv, 
          apiKey: DEEPSEEK_KEY,
          provider: 'deepseek',
          indicators: currentIndicators,
          patternFilter: selectedPattern
        })
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `خطأ ${res.status}`);
      
      setAnalysisDeepSeek(json.analysis);
    } catch (e: any) {
      setError(e.message || 'خطأ DeepSeek');
    } finally {
      setAnalyzingDeepSeek(false);
    }
  }, [ohlcv, pair, tf, lastRequestTime, currentIndicators, selectedPattern]);

  // Groq Analysis
  const runGroq = useCallback(async () => {
    if (ohlcv.length < 20) {
      setError("البيانات غير كافية");
      return;
    }

    const now = Date.now();
    if (now - lastRequestTime < 3000) {
      setError("انتظر قليلاً...");
      return;
    }

    setAnalyzingGroq(true);
    setError(null);
    setLastRequestTime(now);
    setActiveProvider('groq');
    
    try {
      const res = await fetch('/api/ai-chart-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          symbol: pair, 
          timeframe: tf, 
          ohlcv, 
          apiKey: GROQ_KEY,
          provider: 'groq',
          indicators: currentIndicators,
          patternFilter: selectedPattern
        })
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `خطأ ${res.status}`);
      
      setAnalysisGroq(json.analysis);
    } catch (e: any) {
      setError(e.message || 'خطأ Groq');
    } finally {
      setAnalyzingGroq(false);
    }
  }, [ohlcv, pair, tf, lastRequestTime, currentIndicators, selectedPattern]);

  // GPT Analysis
  const runGPT = useCallback(async () => {
    if (ohlcv.length < 20) {
      setError("البيانات غير كافية");
      return;
    }

    const now = Date.now();
    if (now - lastRequestTime < 3000) {
      setError("انتظر قليلاً...");
      return;
    }

    setAnalyzingGPT(true);
    setError(null);
    setLastRequestTime(now);
    setActiveProvider('gpt');
    
    try {
      const res = await fetch('/api/ai-chart-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          symbol: pair, 
          timeframe: tf, 
          ohlcv, 
          apiKey: GPT_KEY,
          provider: 'openai',
          indicators: currentIndicators,
          patternFilter: selectedPattern
        })
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `خطأ ${res.status}`);
      
      setAnalysisGPT(json.analysis);
    } catch (e: any) {
      setError(e.message || 'خطأ GPT');
    } finally {
      setAnalyzingGPT(false);
    }
  }, [ohlcv, pair, tf, lastRequestTime, currentIndicators, selectedPattern]);

  // Claude Analysis
  const runClaude = useCallback(async () => {
    if (ohlcv.length < 20) {
      setError("البيانات غير كافية");
      return;
    }

    const now = Date.now();
    if (now - lastRequestTime < 3000) {
      setError("انتظر قليلاً...");
      return;
    }

    setAnalyzingClaude(true);
    setError(null);
    setLastRequestTime(now);
    setActiveProvider('claude');
    
    try {
      const res = await fetch('/api/ai-chart-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          symbol: pair, 
          timeframe: tf, 
          ohlcv, 
          apiKey: CLAUDE_KEY,
          provider: 'claude',
          indicators: currentIndicators,
          patternFilter: selectedPattern
        })
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `خطأ ${res.status}`);
      
      setAnalysisClaude(json.analysis);
    } catch (e: any) {
      setError(e.message || 'خطأ Claude');
    } finally {
      setAnalyzingClaude(false);
    }
  }, [ohlcv, pair, tf, lastRequestTime, currentIndicators, selectedPattern]);

  // Gemini Analysis
  const runGemini = useCallback(async () => {
    if (ohlcv.length < 20) {
      setError("البيانات غير كافية");
      return;
    }

    const now = Date.now();
    if (now - lastRequestTime < 3000) {
      setError("انتظر قليلاً...");
      return;
    }

    setAnalyzingGemini(true);
    setError(null);
    setLastRequestTime(now);
    setActiveProvider('gemini');
    
    try {
      const res = await fetch('/api/ai-chart-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          symbol: pair, 
          timeframe: tf, 
          ohlcv, 
          apiKey: GEMINI_KEY,
          provider: 'gemini',
          indicators: currentIndicators,
          patternFilter: selectedPattern
        })
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `خطأ ${res.status}`);
      
      setAnalysisGemini(json.analysis);
    } catch (e: any) {
      setError(e.message || 'خطأ Gemini');
    } finally {
      setAnalyzingGemini(false);
    }
  }, [ohlcv, pair, tf, lastRequestTime, currentIndicators, selectedPattern]);

  // Run All Five
  const runAll = useCallback(async () => {
    if (ohlcv.length < 20) {
      setError("البيانات غير كافية");
      return;
    }
    setError(null);
    
    // Run DeepSeek
    setAnalyzingDeepSeek(true);
    fetch('/api/ai-chart-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: pair, timeframe: tf, ohlcv, apiKey: DEEPSEEK_KEY, provider: 'deepseek', indicators: currentIndicators, patternFilter: selectedPattern })
    }).then(r => r.json()).then(json => {
      if (json.success) setAnalysisDeepSeek(json.analysis);
    }).finally(() => setAnalyzingDeepSeek(false));
    
    // Run Groq (with slight delay)
    setTimeout(() => {
      setAnalyzingGroq(true);
      fetch('/api/ai-chart-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: pair, timeframe: tf, ohlcv, apiKey: GROQ_KEY, provider: 'groq', indicators: currentIndicators, patternFilter: selectedPattern })
      }).then(r => r.json()).then(json => {
        if (json.success) setAnalysisGroq(json.analysis);
      }).finally(() => setAnalyzingGroq(false));
    }, 500);
    
    // Run GPT (with more delay)
    setTimeout(() => {
      setAnalyzingGPT(true);
      fetch('/api/ai-chart-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: pair, timeframe: tf, ohlcv, apiKey: GPT_KEY, provider: 'openai', indicators: currentIndicators, patternFilter: selectedPattern })
      }).then(r => r.json()).then(json => {
        if (json.success) setAnalysisGPT(json.analysis);
      }).finally(() => setAnalyzingGPT(false));
    }, 1000);
    
    // Run Claude (with even more delay)
    setTimeout(() => {
      setAnalyzingClaude(true);
      fetch('/api/ai-chart-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: pair, timeframe: tf, ohlcv, apiKey: CLAUDE_KEY, provider: 'claude', indicators: currentIndicators, patternFilter: selectedPattern })
      }).then(r => r.json()).then(json => {
        if (json.success) setAnalysisClaude(json.analysis);
      }).finally(() => setAnalyzingClaude(false));
    }, 1500);
    
    // Run Gemini (with most delay)
    setTimeout(() => {
      setAnalyzingGemini(true);
      fetch('/api/ai-chart-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: pair, timeframe: tf, ohlcv, apiKey: GEMINI_KEY, provider: 'gemini', indicators: currentIndicators, patternFilter: selectedPattern })
      }).then(r => r.json()).then(json => {
        if (json.success) setAnalysisGemini(json.analysis);
      }).finally(() => setAnalyzingGemini(false));
    }, 2000);
  }, [ohlcv, pair, tf, currentIndicators]);

  // Run Both (DeepSeek + Groq)
  const runBoth = useCallback(async () => {
    if (ohlcv.length < 20) {
      setError("البيانات غير كافية");
      return;
    }
    setError(null);
    
    // Run DeepSeek
    setAnalyzingDeepSeek(true);
    fetch('/api/ai-chart-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: pair, timeframe: tf, ohlcv, apiKey: DEEPSEEK_KEY, provider: 'deepseek', indicators: currentIndicators })
    }).then(r => r.json()).then(json => {
      if (json.success) setAnalysisDeepSeek(json.analysis);
    }).finally(() => setAnalyzingDeepSeek(false));
    
    // Run Groq (with slight delay)
    setTimeout(() => {
      setAnalyzingGroq(true);
      fetch('/api/ai-chart-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: pair, timeframe: tf, ohlcv, apiKey: GROQ_KEY, provider: 'groq', indicators: currentIndicators })
      }).then(r => r.json()).then(json => {
        if (json.success) setAnalysisGroq(json.analysis);
      }).finally(() => setAnalyzingGroq(false));
    }, 500);
  }, [ohlcv, pair, tf, currentIndicators]);

  // Render chart with AI drawings
  useEffect(() => {
    if (!chartRef.current || ohlcv.length === 0) return;

    const chart = chartInstance.current || echarts.init(chartRef.current, 'dark');
    chartInstance.current = chart;

    const xData = ohlcv.map((c: any) => c.time);
    const candleData = ohlcv.map((c: any) => [c.open, c.close, c.low, c.high]);

    // Build markLine from AI drawings
    const aiDrawings = (analysis?.drawings || [])
      .filter(d => d.points && d.points.length >= 2)
      .map((d, drawingIdx) => {
        const p1 = d.points[0];
        const p2 = d.points[d.points.length - 1];
        
        // Validate points have required properties
        if (!p1 || !p2 || p1.time == null || p2.time == null || p1.price == null || p2.price == null) {
          
          return null;
        }
        
        // Find closest index by time
        let idx1 = xData.findIndex((t: number) => Math.abs(t - p1.time) < 60000);
        let idx2 = xData.findIndex((t: number) => Math.abs(t - p2.time) < 60000);
        
        // If exact match fails, use closest time
        if (idx1 === -1) {
          idx1 = xData.reduce((closest, t: number, i: number) => 
            Math.abs(t - p1.time) < Math.abs(xData[closest] - p1.time) ? i : closest, 0);
        }
        if (idx2 === -1) {
          idx2 = xData.reduce((closest, t: number, i: number) => 
            Math.abs(t - p2.time) < Math.abs(xData[closest] - p2.time) ? i : closest, 0);
        }
        
        const color = d.color || '#2962ff';
        const pointStyle = {
          color,
          borderColor: '#fff',
          borderWidth: 2
        };

        return [
          {
            coord: [idx1, p1.price],
            name: d.label,
            symbol: 'circle',
            symbolSize: 5,
            itemStyle: pointStyle
          },
          {
            coord: [idx2, p2.price],
            name: d.label,
            symbol: 'circle',
            symbolSize: 5,
            itemStyle: pointStyle,
            lineStyle: {
              color,
              type: d.style === 'dashed' ? 'dashed' : 'solid',
              width: 2,
              shadowBlur: 0,
              opacity: 0.9
            },
            label: {
              show: false
            }
          }
        ];
      })
      .filter(Boolean);
    
    // Horizontal support/resistance levels
    const levelLines = (analysis?.keyLevels || [])
      .filter(lvl => lvl && lvl.price != null)
      .map((lvl, i) => {
        
        return {
          yAxis: lvl.price,
          name: `${lvl.type || 'level'}-${i}`,
          symbol: 'none',
          lineStyle: {
            color: lvl.type === 'support' ? '#10b981' : '#ef4444',
            type: 'dashed',
            width: 1.5,
            opacity: 0.8
          },
          label: {
            show: false
          }
        };
      });
    
    
    

    // Prepare indicator data
    const rsiData = indicators?.rsi || [];
    const macdData = indicators?.macd || [];
    const sma20Data = indicators?.sma20 || [];
    const sma50Data = indicators?.sma50 || [];
    const bbData = indicators?.bollingerBands || [];

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      animation: false,
      grid: [
        { left: 10, right: 60, top: 30, bottom: '48%', height: '35%' }, // Candlestick
        { left: 10, right: 60, top: '55%', bottom: '32%', height: '12%' }, // RSI
        { left: 10, right: 60, top: '70%', bottom: '15%', height: '12%' }, // MACD
      ],
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        backgroundColor: 'rgba(19, 23, 34, 0.95)',
        borderColor: '#1a4a4d',
        textStyle: { color: '#d1d4dc' },
      },
      axisPointer: {
        link: [{ xAxisIndex: 'all' }]
      },
      xAxis: [
        {
          type: 'category',
          data: xData,
          gridIndex: 0,
          axisLabel: { show: false },
          axisLine: { lineStyle: { color: '#1a4a4d' } },
          splitLine: { show: false }
        },
        {
          type: 'category',
          data: xData,
          gridIndex: 1,
          axisLabel: { show: false },
          axisLine: { lineStyle: { color: '#1a4a4d' } },
          splitLine: { show: false }
        },
        {
          type: 'category',
          data: xData,
          gridIndex: 2,
          axisLabel: {
            formatter: (v: string) => {
              const d = new Date(Number(v));
              return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
            },
            color: '#ffffff',
            fontSize: 10
          },
          axisLine: { lineStyle: { color: '#1a4a4d' } },
          splitLine: { show: false }
        }
      ],
      yAxis: [
        {
          type: 'value',
          scale: true,
          position: 'right',
          gridIndex: 0,
          splitLine: { lineStyle: { color: '#0f3133', type: 'dashed' } },
          axisLabel: { color: '#ffffff', fontSize: 10 }
        },
        {
          type: 'value',
          gridIndex: 1,
          position: 'right',
          min: 0,
          max: 100,
          splitLine: { lineStyle: { color: '#0f3133', type: 'dashed' } },
          axisLabel: { color: '#ffffff', fontSize: 9, formatter: '{value}' }
        },
        {
          type: 'value',
          gridIndex: 2,
          position: 'right',
          splitLine: { lineStyle: { color: '#0f3133', type: 'dashed' } },
          axisLabel: { color: '#ffffff', fontSize: 9 }
        }
      ],
      dataZoom: [
        { type: 'inside', xAxisIndex: [0, 1, 2], start: 60, end: 100 },
        { 
          type: 'slider', 
          xAxisIndex: [0, 1, 2], 
          start: 60, 
          end: 100, 
          bottom: 5,
          height: 20,
          borderColor: '#1a4a4d',
          backgroundColor: 'transparent',
          fillerColor: 'rgba(41, 98, 255, 0.2)',
          handleStyle: { color: '#2962ff' }
        }
      ],
      series: [
        // Candlestick
        {
          name: 'Price',
          type: 'candlestick',
          xAxisIndex: 0,
          yAxisIndex: 0,
          data: candleData,
          itemStyle: {
            color: '#10b981',
            color0: '#ef4444',
            borderColor: '#10b981',
            borderColor0: '#ef4444',
            borderWidth: 1
          },
          markLine: {
            symbol: ['circle', 'circle'],
            symbolSize: 4,
            animation: false,
            silent: false,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: [...aiDrawings, ...levelLines] as any
          }
        },
        // RSI
        {
          name: 'RSI',
          type: 'line',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: rsiData,
          smooth: true,
          showSymbol: false,
          lineStyle: { color: '#a855f7', width: 3 },
          markLine: {
            silent: true,
            symbol: 'none',
            data: [
              { yAxis: 70, lineStyle: { color: '#ef4444', type: 'dashed', width: 2 }, label: { show: false } },
              { yAxis: 30, lineStyle: { color: '#10b981', type: 'dashed', width: 2 }, label: { show: false } }
            ]
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(168, 85, 247, 0.3)' },
                { offset: 1, color: 'rgba(168, 85, 247, 0)' }
              ]
            }
          }
        },
        // MACD Line
        {
          name: 'MACD',
          type: 'line',
          xAxisIndex: 2,
          yAxisIndex: 2,
          data: macdData.map(m => m.macd),
          smooth: true,
          showSymbol: false,
          lineStyle: { color: '#3b82f6', width: 2.5 }
        },
        // MACD Signal
        {
          name: 'Signal',
          type: 'line',
          xAxisIndex: 2,
          yAxisIndex: 2,
          data: macdData.map(m => m.signal),
          smooth: true,
          showSymbol: false,
          lineStyle: { color: '#f59e0b', width: 2.5 }
        },
        // MACD Histogram
        {
          name: 'Histogram',
          type: 'bar',
          xAxisIndex: 2,
          yAxisIndex: 2,
          data: macdData.map(m => ({
            value: m.histogram,
            itemStyle: { color: m.histogram >= 0 ? '#10b981' : '#ef4444' }
          })),
          barWidth: '60%'
        }
      ]
    };

    chart.setOption(option, true);

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [ohlcv, analysis, indicators]);

  return (
    <div className="min-h-screen p-6 theme-bg">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30">
              <Sparkles className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">AI Auto-Draw Comparison</h1>
              <p className="text-gray-400 text-sm">قارن بين DeepSeek V3 🧠 و Groq (Llama 3.3) ⚡</p>
            </div>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            {(["BTC/USDT", "ETH/USDT", "SOL/USDT", "XRP/USDT", "BNB/USDT", "ADA/USDT"] as Pair[]).map(p => (
              <Button 
                key={p} 
                variant={pair === p ? "default" : "outline"} 
                size="sm" 
                onClick={() => setPair(p)}
                className={pair === p ? "bg-blue-600" : ""}
              >
                {p.split('/')[0]}
              </Button>
            ))}
          </div>
        </div>

        {/* Timeframe and Analysis Controls */}
        <Card className="theme-card border-gray-800">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4">
              {/* Timeframe Selection */}
              <div className="flex gap-2">
                {(["15m", "1h", "4h", "1d"] as TF[]).map(t => (
                  <Button 
                    key={t} 
                    variant={tf === t ? "default" : "ghost"} 
                    size="sm" 
                    onClick={() => setTf(t)}
                    className={tf === t ? "bg-purple-600" : ""}
                  >
                    {t}
                  </Button>
                ))}
              </div>
              
              {/* Pattern Selection */}
              <div className="flex items-center gap-2 p-3 theme-surface rounded-lg border border-gray-800">
                <span className="text-gray-400 text-sm whitespace-nowrap">🎯 النموذج:</span>
                <select 
                  value={selectedPattern}
                  onChange={(e) => setSelectedPattern(e.target.value)}
                  className="flex-1 theme-card border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                >
                  {PATTERN_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* AI Analysis Buttons */}
              <div className="flex items-center gap-3 flex-wrap">
                <Button 
                  onClick={runDeepSeek} 
                  disabled={analyzingDeepSeek || loading || ohlcv.length < 20}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50"
                >
                  {analyzingDeepSeek ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin ml-2" />
                      جاري التحليل...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4 ml-2" />
                      DeepSeek V3
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={runGroq} 
                  disabled={analyzingGroq || loading || ohlcv.length < 20}
                  className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 disabled:opacity-50"
                >
                  {analyzingGroq ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin ml-2" />
                      جاري التحليل...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 ml-2" />
                      Groq (Llama 3.3)
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={runGPT} 
                  disabled={analyzingGPT || loading || ohlcv.length < 20}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50"
                >
                  {analyzingGPT ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin ml-2" />
                      جاري التحليل...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 ml-2" />
                      GPT-5.2 🤖
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={runClaude} 
                  disabled={analyzingClaude || loading || ohlcv.length < 20}
                  className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:opacity-50"
                >
                  {analyzingClaude ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin ml-2" />
                      جاري التحليل...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4 ml-2" />
                      Claude Opus 4.5 🧠
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={runGemini} 
                  disabled={analyzingGemini || loading || ohlcv.length < 20}
                  className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:opacity-50"
                >
                  {analyzingGemini ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin ml-2" />
                      جاري التحليل...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 ml-2" />
                      Gemini 3 Pro 💎
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={runAll} 
                  disabled={analyzingDeepSeek || analyzingGroq || analyzingGPT || analyzingClaude || analyzingGemini || loading || ohlcv.length < 20}
                  variant="outline"
                  className="border-pink-500 text-pink-400 hover:bg-pink-500/10"
                >
                  {(analyzingDeepSeek || analyzingGroq || analyzingGPT || analyzingClaude || analyzingGemini) ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin ml-2" />
                      مقارنة...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 ml-2" />
                      🔄 قارن الخمسة
                    </>
                  )}
                </Button>
              </div>
              
              {/* Provider Toggle - Show when any have results */}
              {(analysisDeepSeek || analysisGroq || analysisGPT || analysisClaude || analysisGemini) && (
                <div className="flex items-center gap-2 p-2 theme-surface rounded-lg flex-wrap">
                  <span className="text-gray-400 text-sm">عرض نتائج:</span>
                  <Button 
                    variant={activeProvider === 'deepseek' ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveProvider('deepseek')}
                    className={activeProvider === 'deepseek' ? "bg-blue-600" : ""}
                    disabled={!analysisDeepSeek}
                  >
                    <Brain className="w-3 h-3 ml-1" />
                    DeepSeek
                    {analysisDeepSeek && <span className="mr-1 text-green-400">✓</span>}
                  </Button>
                  <Button 
                    variant={activeProvider === 'groq' ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveProvider('groq')}
                    className={activeProvider === 'groq' ? "bg-orange-600" : ""}
                    disabled={!analysisGroq}
                  >
                    <Zap className="w-3 h-3 ml-1" />
                    Groq
                    {analysisGroq && <span className="mr-1 text-green-400">✓</span>}
                  </Button>
                  <Button 
                    variant={activeProvider === 'gpt' ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveProvider('gpt')}
                    className={activeProvider === 'gpt' ? "bg-green-600" : ""}
                    disabled={!analysisGPT}
                  >
                    <Sparkles className="w-3 h-3 ml-1" />
                    GPT
                    {analysisGPT && <span className="mr-1 text-green-400">✓</span>}
                  </Button>
                  <Button 
                    variant={activeProvider === 'claude' ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveProvider('claude')}
                    className={activeProvider === 'claude' ? "bg-amber-600" : ""}
                    disabled={!analysisClaude}
                  >
                    <Brain className="w-3 h-3 ml-1" />
                    Claude
                    {analysisClaude && <span className="mr-1 text-green-400">✓</span>}
                  </Button>
                  <Button 
                    variant={activeProvider === 'gemini' ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveProvider('gemini')}
                    className={activeProvider === 'gemini' ? "bg-violet-600" : ""}
                    disabled={!analysisGemini}
                  >
                    <Sparkles className="w-3 h-3 ml-1" />
                    Gemini
                    {analysisGemini && <span className="mr-1 text-green-400">✓</span>}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Technical Indicators Panel */}
        {currentIndicators && (
          <Card className="theme-card border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-white text-sm">
                <Activity className="w-4 h-4 text-purple-400" />
                المؤشرات الفنية - قيم حالية
                <BarChart3 className="w-4 h-4 text-blue-400 mr-auto" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* RSI */}
                <div className="p-3 theme-surface rounded-lg border border-gray-800">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    <span className="text-gray-400 text-xs">RSI (14)</span>
                  </div>
                  <p className={`text-lg font-bold ${
                    currentIndicators.rsiSignal === 'overbought' ? 'text-red-400' :
                    currentIndicators.rsiSignal === 'oversold' ? 'text-green-400' : 'text-white'
                  }`}>
                    {currentIndicators.rsi?.toFixed(1) || '---'}
                  </p>
                  <span className={`text-xs ${
                    currentIndicators.rsiSignal === 'overbought' ? 'text-red-400' :
                    currentIndicators.rsiSignal === 'oversold' ? 'text-green-400' : 'text-gray-500'
                  }`}>
                    {currentIndicators.rsiSignal === 'overbought' ? '⚠️ تشبع شرائي' :
                     currentIndicators.rsiSignal === 'oversold' ? '✅ تشبع بيعي' : 'محايد'}
                  </span>
                </div>

                {/* MACD */}
                <div className="p-3 theme-surface rounded-lg border border-gray-800">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-gray-400 text-xs">MACD</span>
                  </div>
                  <p className={`text-lg font-bold ${
                    currentIndicators.macdSignal2 === 'bullish' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {currentIndicators.macd?.toFixed(2) || '---'}
                  </p>
                  <span className="text-xs text-gray-500">
                    Signal: {currentIndicators.macdSignal?.toFixed(2) || '---'}
                  </span>
                </div>

                {/* Moving Averages */}
                <div className="p-3 theme-surface rounded-lg border border-gray-800">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    <span className="text-gray-400 text-xs">MA Trend</span>
                  </div>
                  <p className={`text-lg font-bold ${
                    currentIndicators.maTrend === 'bullish' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {currentIndicators.maTrend === 'bullish' ? '📈 صاعد' : '📉 هابط'}
                  </p>
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <div>SMA20: {currentIndicators.sma20?.toFixed(0) || '---'}</div>
                    <div>SMA50: {currentIndicators.sma50?.toFixed(0) || '---'}</div>
                  </div>
                </div>

                {/* Bollinger Bands */}
                <div className="p-3 theme-surface rounded-lg border border-gray-800">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                    <span className="text-gray-400 text-xs">Bollinger Bands</span>
                  </div>
                  <p className={`text-lg font-bold ${
                    currentIndicators.bbPosition === 'above' ? 'text-red-400' :
                    currentIndicators.bbPosition === 'below' ? 'text-green-400' : 'text-white'
                  }`}>
                    {currentIndicators.bbPosition === 'above' ? '⬆️ فوق' :
                     currentIndicators.bbPosition === 'below' ? '⬇️ تحت' : '↔️ داخل'}
                  </p>
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <div>Upper: {currentIndicators.bbUpper?.toFixed(0) || '---'}</div>
                    <div>Lower: {currentIndicators.bbLower?.toFixed(0) || '---'}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chart with Indicators */}
        <Card className="theme-card border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-white">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              {pair} - {tf}
              {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
              {!loading && ohlcv.length > 0 && (
                <span className="text-xs text-gray-400 font-normal">
                  ({ohlcv.length} شمعة)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {loading && ohlcv.length === 0 ? (
              <div className="flex items-center justify-center h-[650px]">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
                  <p className="text-gray-400">جاري تحميل البيانات...</p>
                </div>
              </div>
            ) : (
              <div ref={chartRef} style={{ height: 650 }} />
            )}
          </CardContent>
        </Card>

        {/* Analysis Summary */}
        {analysis && (
          <Card className="theme-card border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                {activeProvider === 'deepseek' ? (
                  <>
                    <Brain className="w-5 h-5 text-blue-400" />
                    <span>نتيجة تحليل DeepSeek V3</span>
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">🧠 DeepSeek</span>
                  </>
                ) : activeProvider === 'groq' ? (
                  <>
                    <Zap className="w-5 h-5 text-orange-400" />
                    <span>نتيجة تحليل Groq (Llama 3.3 70B)</span>
                    <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded">⚡ Groq</span>
                  </>
                ) : activeProvider === 'gpt' ? (
                  <>
                    <Sparkles className="w-5 h-5 text-green-400" />
                    <span>نتيجة تحليل GPT-5.2</span>
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">🤖 GPT</span>
                  </>
                ) : activeProvider === 'claude' ? (
                  <>
                    <Brain className="w-5 h-5 text-amber-400" />
                    <span>نتيجة تحليل Claude Opus 4.5</span>
                    <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded">🧠 Claude</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-violet-400" />
                    <span>نتيجة تحليل Gemini 3 Pro</span>
                    <span className="text-xs bg-violet-500/20 text-violet-400 px-2 py-1 rounded">💎 Gemini</span>
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="p-3 theme-surface rounded-lg border border-gray-800">
                  <h3 className="text-gray-400 text-sm mb-1">الاتجاه</h3>
                  <p className={`font-bold text-lg ${
                    analysis.trend === 'bullish' ? 'text-green-400' :
                    analysis.trend === 'bearish' ? 'text-red-400' : 'text-yellow-400'
                  }`}>
                    {analysis.trend === 'bullish' ? '🟢 صاعد (Bullish)' : 
                     analysis.trend === 'bearish' ? '🔴 هابط (Bearish)' : '🟡 محايد (Neutral)'}
                  </p>
                </div>
                <div className="p-3 theme-surface rounded-lg border border-gray-800">
                  <h3 className="text-gray-400 text-sm mb-1">الأنماط المكتشفة</h3>
                  <p className="text-white text-sm">
                    {analysis.patterns.length > 0 ? analysis.patterns.join('، ') : 'لا يوجد أنماط واضحة'}
                  </p>
                </div>
                <div className="p-3 theme-surface rounded-lg border border-gray-800">
                  <h3 className="text-gray-400 text-sm mb-1">الرسومات</h3>
                  <p className="text-blue-400 font-semibold">
                    {analysis.drawings.length} خط رسم
                  </p>
                </div>
              </div>
              
              {/* Drawings List */}
              {analysis.drawings.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-gray-400 text-sm mb-2">الخطوط المرسومة:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {analysis.drawings.map((d, i) => (
                      <div key={i} className="p-2 theme-surface rounded border border-gray-800 text-xs">
                        <div className="flex items-center gap-2 mb-1">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: d.color }}
                          />
                          <span className="font-semibold text-white">{d.label}</span>
                          <span className="text-gray-500 text-xs">({d.type})</span>
                        </div>
                        {d.description && (
                          <p className="text-gray-400 mr-5">{d.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="pt-4 border-t border-gray-800">
                <h3 className="text-gray-400 text-sm mb-2">الملخص التحليلي:</h3>
                <p className="text-gray-200 text-sm leading-relaxed">{analysis.summary}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
