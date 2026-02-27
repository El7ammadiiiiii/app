/**
 * Signal Detector - Buy/Sell Signal Detection
 * كاشف الإشارات - اكتشاف إشارات الشراء والبيع
 */

import { calculateRSI, calculateMACD, calculateSMA, calculateEMA, calculateSupertrend, calculateADX, type OHLCV } from "../indicators/technical";
import { calculateStochRSI } from "../analysis/engine";
import { calculateOBVWithAnalysis } from "../indicators/obv";
import { detectPatterns, CandleData } from "../indicators/candlestick-patterns";

export interface Signal {
  id: string;
  type: "buy" | "sell";
  source: string;
  sourceAr: string;
  strength: number; // 1-3
  description: string;
  descriptionAr: string;
  timestamp: number;
  price: number;
}

export interface SignalSummary {
  buySignals: Signal[];
  sellSignals: Signal[];
  overallSentiment: "strong_buy" | "buy" | "neutral" | "sell" | "strong_sell";
  buyScore: number;
  sellScore: number;
  recommendation: string;
  recommendationAr: string;
}

export interface OHLCVData {
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume: number[];
  timestamp: number[];
}

/**
 * Detect all trading signals from OHLCV data
 * اكتشاف جميع إشارات التداول من بيانات OHLCV
 */
export function detectAllSignals(data: OHLCVData): SignalSummary {
  const buySignals: Signal[] = [];
  const sellSignals: Signal[] = [];
  const currentPrice = data.close[data.close.length - 1];
  const currentTime = data.timestamp[data.timestamp.length - 1];

  // 1. RSI Signals
  const rsi = calculateRSI(data.close, 14);
  if (rsi.value !== null) {
    if (rsi.value < 30) {
      buySignals.push({
        id: "rsi_oversold",
        type: "buy",
        source: "RSI",
        sourceAr: "مؤشر القوة النسبية",
        strength: rsi.value < 20 ? 3 : 2,
        description: `RSI is oversold at ${rsi.value.toFixed(1)}`,
        descriptionAr: `RSI في منطقة ذروة البيع عند ${rsi.value.toFixed(1)}`,
        timestamp: currentTime,
        price: currentPrice
      });
    } else if (rsi.value > 70) {
      sellSignals.push({
        id: "rsi_overbought",
        type: "sell",
        source: "RSI",
        sourceAr: "مؤشر القوة النسبية",
        strength: rsi.value > 80 ? 3 : 2,
        description: `RSI is overbought at ${rsi.value.toFixed(1)}`,
        descriptionAr: `RSI في منطقة ذروة الشراء عند ${rsi.value.toFixed(1)}`,
        timestamp: currentTime,
        price: currentPrice
      });
    }
  }

  // 2. MACD Signals
  const macd = calculateMACD(data.close);
  if (macd.histogram !== 0 && macd.signalLine !== 0) {
    if (macd.histogram > 0 && macd.macd > macd.signalLine) {
      buySignals.push({
        id: "macd_bullish",
        type: "buy",
        source: "MACD",
        sourceAr: "ماكد",
        strength: Math.abs(macd.histogram) > 0.5 ? 3 : 2,
        description: "MACD bullish crossover",
        descriptionAr: "تقاطع صعودي للماكد",
        timestamp: currentTime,
        price: currentPrice
      });
    } else if (macd.histogram < 0 && macd.macd < macd.signalLine) {
      sellSignals.push({
        id: "macd_bearish",
        type: "sell",
        source: "MACD",
        sourceAr: "ماكد",
        strength: Math.abs(macd.histogram) > 0.5 ? 3 : 2,
        description: "MACD bearish crossover",
        descriptionAr: "تقاطع هبوطي للماكد",
        timestamp: currentTime,
        price: currentPrice
      });
    }
  }

  // 3. Moving Average Signals
  const sma20 = calculateSMA(data.close, 20);
  const sma50 = calculateSMA(data.close, 50);
  const ema9 = calculateEMA(data.close, 9);
  const ema21 = calculateEMA(data.close, 21);

  // Price above/below MAs
  if (sma20 !== null && sma50 !== null) {
    if (currentPrice > sma20 && currentPrice > sma50 && sma20 > sma50) {
      buySignals.push({
        id: "ma_bullish_trend",
        type: "buy",
        source: "Moving Averages",
        sourceAr: "المتوسطات المتحركة",
        strength: 2,
        description: "Price above SMA 20 & 50 (bullish trend)",
        descriptionAr: "السعر فوق المتوسطات 20 و 50 (اتجاه صعودي)",
        timestamp: currentTime,
        price: currentPrice
      });
    } else if (currentPrice < sma20 && currentPrice < sma50 && sma20 < sma50) {
      sellSignals.push({
        id: "ma_bearish_trend",
        type: "sell",
        source: "Moving Averages",
        sourceAr: "المتوسطات المتحركة",
        strength: 2,
        description: "Price below SMA 20 & 50 (bearish trend)",
        descriptionAr: "السعر تحت المتوسطات 20 و 50 (اتجاه هبوطي)",
        timestamp: currentTime,
        price: currentPrice
      });
    }
  }

  // EMA crossover
  if (ema9 !== null && ema21 !== null) {
    if (ema9 > ema21) {
      buySignals.push({
        id: "ema_golden_cross",
        type: "buy",
        source: "EMA Crossover",
        sourceAr: "تقاطع EMA",
        strength: 2,
        description: "EMA 9 above EMA 21 (golden cross)",
        descriptionAr: "EMA 9 فوق EMA 21 (التقاطع الذهبي)",
        timestamp: currentTime,
        price: currentPrice
      });
    } else {
      sellSignals.push({
        id: "ema_death_cross",
        type: "sell",
        source: "EMA Crossover",
        sourceAr: "تقاطع EMA",
        strength: 2,
        description: "EMA 9 below EMA 21 (death cross)",
        descriptionAr: "EMA 9 تحت EMA 21 (تقاطع الموت)",
        timestamp: currentTime,
        price: currentPrice
      });
    }
  }

  // 4. Stochastic RSI Signals
  const stochRSI = calculateStochRSI(data.close);
  const stochK = stochRSI.k && stochRSI.k.length ? stochRSI.k[stochRSI.k.length - 1] : null;
  if (stochK !== null && stochK !== undefined) {
    const oversold = stochK < 10;
    const overbought = stochK > 90;
    if (oversold) {
      buySignals.push({
        id: "stochrsi_oversold",
        type: "buy",
        source: "Stochastic RSI",
        sourceAr: "ستوكاستيك RSI",
        strength: stochK < 10 ? 3 : 2,
        description: `Stochastic RSI oversold at ${stochK.toFixed(1)}`,
        descriptionAr: `ستوكاستيك RSI في ذروة البيع عند ${stochK.toFixed(1)}`,
        timestamp: currentTime,
        price: currentPrice
      });
    } else if (overbought) {
      sellSignals.push({
        id: "stochrsi_overbought",
        type: "sell",
        source: "Stochastic RSI",
        sourceAr: "ستوكاستيك RSI",
        strength: stochK > 90 ? 3 : 2,
        description: `Stochastic RSI overbought at ${stochK.toFixed(1)}`,
        descriptionAr: `ستوكاستيك RSI في ذروة الشراء عند ${stochK.toFixed(1)}`,
        timestamp: currentTime,
        price: currentPrice
      });
    }
  }

  // 5. OBV Signals
  const obv = calculateOBVWithAnalysis(data.close, data.volume);
  if (obv.signal === "bullish") {
    buySignals.push({
      id: "obv_bullish",
      type: "buy",
      source: "OBV",
      sourceAr: "حجم التوازن",
      strength: obv.divergence === "bullish" ? 3 : 2,
      description: obv.divergence === "bullish" 
        ? "OBV bullish divergence detected" 
        : "OBV confirms uptrend",
      descriptionAr: obv.divergence === "bullish" 
        ? "تباعد صعودي في OBV" 
        : "OBV يؤكد الاتجاه الصعودي",
      timestamp: currentTime,
      price: currentPrice
    });
  } else if (obv.signal === "bearish") {
    sellSignals.push({
      id: "obv_bearish",
      type: "sell",
      source: "OBV",
      sourceAr: "حجم التوازن",
      strength: obv.divergence === "bearish" ? 3 : 2,
      description: obv.divergence === "bearish" 
        ? "OBV bearish divergence detected" 
        : "OBV confirms downtrend",
      descriptionAr: obv.divergence === "bearish" 
        ? "تباعد هبوطي في OBV" 
        : "OBV يؤكد الاتجاه الهبوطي",
      timestamp: currentTime,
      price: currentPrice
    });
  }

  // 6. Supertrend Signals
  // Build OHLCV candles for Supertrend
  const supertrendCandles: OHLCV[] = data.open.map((_, i) => ({
    timestamp: data.timestamp[i],
    open: data.open[i],
    high: data.high[i],
    low: data.low[i],
    close: data.close[i],
    volume: data.volume[i],
  }));
  const supertrend = calculateSupertrend(supertrendCandles);
  if (supertrend.direction === 1) {
    buySignals.push({
      id: "supertrend_bullish",
      type: "buy",
      source: "Supertrend",
      sourceAr: "سوبرتريند",
      strength: 2,
      description: "Supertrend indicates uptrend",
      descriptionAr: "سوبرتريند يشير إلى اتجاه صعودي",
      timestamp: currentTime,
      price: currentPrice
    });
  } else if (supertrend.direction === -1) {
    sellSignals.push({
      id: "supertrend_bearish",
      type: "sell",
      source: "Supertrend",
      sourceAr: "سوبرتريند",
      strength: 2,
      description: "Supertrend indicates downtrend",
      descriptionAr: "سوبرتريند يشير إلى اتجاه هبوطي",
      timestamp: currentTime,
      price: currentPrice
    });
  }

  // 7. ADX Signals (trend strength)
  // Convert to OHLCV format for ADX
  const ohlcvCandles: OHLCV[] = data.open.map((_, i) => ({
    timestamp: data.timestamp[i],
    open: data.open[i],
    high: data.high[i],
    low: data.low[i],
    close: data.close[i],
    volume: data.volume[i],
  }));
  const adx = calculateADX(ohlcvCandles);
  if (adx.adx !== null && adx.adx > 25) {
    if (adx.plusDI > adx.minusDI) {
      buySignals.push({
        id: "adx_bullish_trend",
        type: "buy",
        source: "ADX",
        sourceAr: "مؤشر الاتجاه المتوسط",
        strength: adx.adx > 40 ? 3 : 2,
        description: `Strong bullish trend (ADX: ${adx.adx.toFixed(1)})`,
        descriptionAr: `اتجاه صعودي قوي (ADX: ${adx.adx.toFixed(1)})`,
        timestamp: currentTime,
        price: currentPrice
      });
    } else {
      sellSignals.push({
        id: "adx_bearish_trend",
        type: "sell",
        source: "ADX",
        sourceAr: "مؤشر الاتجاه المتوسط",
        strength: adx.adx > 40 ? 3 : 2,
        description: `Strong bearish trend (ADX: ${adx.adx.toFixed(1)})`,
        descriptionAr: `اتجاه هبوطي قوي (ADX: ${adx.adx.toFixed(1)})`,
        timestamp: currentTime,
        price: currentPrice
      });
    }
  }

  // 8. Candlestick Patterns
  const candles: CandleData[] = data.open.map((_, i) => ({
    open: data.open[i],
    high: data.high[i],
    low: data.low[i],
    close: data.close[i],
    timestamp: data.timestamp[i]
  }));
  
  const patterns = detectPatterns(candles);
  for (const pattern of patterns) {
    if (pattern.type === "bullish") {
      buySignals.push({
        id: `pattern_${pattern.name.toLowerCase().replace(/\s/g, "_")}`,
        type: "buy",
        source: pattern.name,
        sourceAr: pattern.nameAr,
        strength: pattern.strength,
        description: pattern.description,
        descriptionAr: pattern.description,
        timestamp: currentTime,
        price: currentPrice
      });
    } else if (pattern.type === "bearish") {
      sellSignals.push({
        id: `pattern_${pattern.name.toLowerCase().replace(/\s/g, "_")}`,
        type: "sell",
        source: pattern.name,
        sourceAr: pattern.nameAr,
        strength: pattern.strength,
        description: pattern.description,
        descriptionAr: pattern.description,
        timestamp: currentTime,
        price: currentPrice
      });
    }
  }

  // Calculate scores
  const buyScore = buySignals.reduce((sum, s) => sum + s.strength, 0);
  const sellScore = sellSignals.reduce((sum, s) => sum + s.strength, 0);
  const netScore = buyScore - sellScore;

  // Determine overall sentiment
  let overallSentiment: SignalSummary["overallSentiment"];
  if (netScore >= 8) {
    overallSentiment = "strong_buy";
  } else if (netScore >= 3) {
    overallSentiment = "buy";
  } else if (netScore <= -8) {
    overallSentiment = "strong_sell";
  } else if (netScore <= -3) {
    overallSentiment = "sell";
  } else {
    overallSentiment = "neutral";
  }

  // Generate recommendation
  let recommendation: string;
  let recommendationAr: string;
  
  switch (overallSentiment) {
    case "strong_buy":
      recommendation = "Strong Buy - Multiple bullish signals detected";
      recommendationAr = "شراء قوي - إشارات صعودية متعددة";
      break;
    case "buy":
      recommendation = "Buy - Bullish signals outweigh bearish";
      recommendationAr = "شراء - الإشارات الصعودية تفوق الهبوطية";
      break;
    case "strong_sell":
      recommendation = "Strong Sell - Multiple bearish signals detected";
      recommendationAr = "بيع قوي - إشارات هبوطية متعددة";
      break;
    case "sell":
      recommendation = "Sell - Bearish signals outweigh bullish";
      recommendationAr = "بيع - الإشارات الهبوطية تفوق الصعودية";
      break;
    default:
      recommendation = "Neutral - Mixed signals, wait for confirmation";
      recommendationAr = "محايد - إشارات مختلطة، انتظر التأكيد";
  }

  return {
    buySignals,
    sellSignals,
    overallSentiment,
    buyScore,
    sellScore,
    recommendation,
    recommendationAr
  };
}

/**
 * Get sentiment color
 */
export function getSentimentColor(sentiment: SignalSummary["overallSentiment"]): string {
  switch (sentiment) {
    case "strong_buy":
      return "#00ff88";
    case "buy":
      return "#4ade80";
    case "strong_sell":
      return "#ff4444";
    case "sell":
      return "#f87171";
    default:
      return "#fbbf24";
  }
}

/**
 * Get sentiment icon
 */
export function getSentimentIcon(sentiment: SignalSummary["overallSentiment"]): string {
  switch (sentiment) {
    case "strong_buy":
      return "🚀";
    case "buy":
      return "📈";
    case "strong_sell":
      return "💥";
    case "sell":
      return "📉";
    default:
      return "➡️";
  }
}
