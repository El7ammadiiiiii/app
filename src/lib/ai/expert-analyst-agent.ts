/**
 * Expert Technical Analyst Agent - وكيل المحلل الفني الخبير
 * يعتمد على جميع المؤشرات المتاحة في النظام
 * @version 2.0.0
 */

import { OHLCV } from '../indicators/technical';
import {
  calculateSuperSmoother,
  calculateInstantaneousTrendline,
  calculateFisherTransform,
  calculateLaguerreRSI,
  calculateConnorsRSI,
  calculateMAMA
} from '../indicators/ehlers-dsp';
import { EliteTrendResult } from '../indicators/elite-trend-algorithms';
import { OpenAIClient, ChatMessage } from './openai-client';

// ==========================================================
// TYPES
// ==========================================================

export interface IndicatorReading {
  name: string;
  nameAr: string;
  value: number | string;
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: number;
  description: string;
  descriptionAr: string;
}

export interface IndicatorCategory {
  name: string;
  nameAr: string;
  indicators: IndicatorReading[];
  overallSignal: 'bullish' | 'bearish' | 'neutral';
  score: number;
}

export interface AIAnalysisRequest {
  symbol: string;
  timeframe: string;
  currentPrice: number;
  priceChange24h?: number;
  indicators: IndicatorCategory[];
  eliteResult?: EliteTrendResult;
  candles?: OHLCV[];
}

export interface AIAnalysisResponse {
  recommendation: 'شراء قوي' | 'شراء' | 'محايد' | 'بيع' | 'بيع قوي';
  recommendationEn: 'Strong Buy' | 'Buy' | 'Neutral' | 'Sell' | 'Strong Sell';
  confidence: number;
  summary: string;
  summaryEn: string;
  positives: string[];
  negatives: string[];
  positivesEn: string[];
  negativesEn: string[];
  keyLevels: { support: number[]; resistance: number[]; stopLoss: number; takeProfit1: number; takeProfit2: number };
  riskAssessment: { level: 'منخفض' | 'متوسط' | 'مرتفع' | 'مرتفع جداً'; levelEn: 'Low' | 'Medium' | 'High' | 'Very High'; factors: string[]; factorsEn: string[] };
  suggestedTimeframe: string;
  categoryAnalysis: { category: string; analysis: string; sentiment: 'bullish' | 'bearish' | 'neutral' }[];
  timestamp: number;
}

// ==========================================================
// HELPERS
// ==========================================================

function calcEMA(data: number[], period: number): number | null {
  if (data.length < period) return null;
  const m = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((s, v) => s + v, 0) / period;
  for (let i = period; i < data.length; i++) ema = (data[i] - ema) * m + ema;
  return ema;
}

function calcSMA(data: number[], period: number): number | null {
  if (data.length < period) return null;
  return data.slice(-period).reduce((s, v) => s + v, 0) / period;
}

function calcRSI(closes: number[], period: number = 14): number | null {
  if (closes.length < period + 1) return null;
  let g = 0, l = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const c = closes[i] - closes[i - 1];
    if (c > 0) g += c; else l -= c;
  }
  if (l === 0) return 100;
  return 100 - (100 / (1 + (g / period) / (l / period)));
}

function calcMACD(closes: number[]): { macd: number; signal: number; histogram: number } | null {
  if (closes.length < 35) return null;
  const e12 = calcEMA(closes, 12), e26 = calcEMA(closes, 26);
  if (!e12 || !e26) return null;
  const macd = e12 - e26;
  const vals: number[] = [];
  for (let i = 26; i < closes.length; i++) {
    const a = calcEMA(closes.slice(0, i + 1), 12), b = calcEMA(closes.slice(0, i + 1), 26);
    if (a && b) vals.push(a - b);
  }
  const signal = calcEMA(vals, 9) ?? macd;
  return { macd, signal, histogram: macd - signal };
}

function calcStochastic(candles: OHLCV[], period: number = 14): { k: number; d: number } | null {
  if (candles.length < period + 3) return null;
  const r = candles.slice(-period);
  const h = Math.max(...r.map(c => c.high)), l = Math.min(...r.map(c => c.low));
  if (h === l) return { k: 50, d: 50 };
  const k = ((r[r.length - 1].close - l) / (h - l)) * 100;
  const kVals: number[] = [];
  for (let i = period; i < candles.length; i++) {
    const s = candles.slice(i - period, i);
    const hh = Math.max(...s.map(c => c.high)), ll = Math.min(...s.map(c => c.low));
    if (hh !== ll) kVals.push(((s[s.length - 1].close - ll) / (hh - ll)) * 100);
  }
  return { k, d: kVals.slice(-3).reduce((s, v) => s + v, 0) / 3 };
}

function calcOBV(candles: OHLCV[]): number {
  let obv = 0;
  for (let i = 1; i < candles.length; i++) {
    if (candles[i].close > candles[i - 1].close) obv += candles[i].volume;
    else if (candles[i].close < candles[i - 1].close) obv -= candles[i].volume;
  }
  return obv;
}

function calcADX(candles: OHLCV[], period: number = 14): number | null {
  if (candles.length < period * 2 + 1) return null;
  const trs: number[] = [], pDM: number[] = [], mDM: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    trs.push(Math.max(candles[i].high - candles[i].low, Math.abs(candles[i].high - candles[i - 1].close), Math.abs(candles[i].low - candles[i - 1].close)));
    const up = candles[i].high - candles[i - 1].high, down = candles[i - 1].low - candles[i].low;
    pDM.push(up > down && up > 0 ? up : 0);
    mDM.push(down > up && down > 0 ? down : 0);
  }
  const sTR = trs.slice(-period).reduce((s, v) => s + v, 0) / period;
  const sPDM = pDM.slice(-period).reduce((s, v) => s + v, 0) / period;
  const sMDM = mDM.slice(-period).reduce((s, v) => s + v, 0) / period;
  if (sTR === 0) return null;
  const pDI = (sPDM / sTR) * 100, mDI = (sMDM / sTR) * 100;
  return Math.abs(pDI - mDI) / (pDI + mDI) * 100;
}

function calcMFI(candles: OHLCV[], period: number = 14): number | null {
  if (candles.length < period + 1) return null;
  let pos = 0, neg = 0;
  const r = candles.slice(-period - 1);
  for (let i = 1; i < r.length; i++) {
    const tp = (r[i].high + r[i].low + r[i].close) / 3;
    const ptp = (r[i - 1].high + r[i - 1].low + r[i - 1].close) / 3;
    const mf = tp * r[i].volume;
    if (tp > ptp) pos += mf; else if (tp < ptp) neg += mf;
  }
  return neg === 0 ? 100 : 100 - (100 / (1 + pos / neg));
}

function calcWilliamsR(candles: OHLCV[], period: number = 14): number | null {
  if (candles.length < period) return null;
  const r = candles.slice(-period);
  const h = Math.max(...r.map(c => c.high)), l = Math.min(...r.map(c => c.low));
  return h === l ? -50 : ((h - r[r.length - 1].close) / (h - l)) * -100;
}

function calcCCI(candles: OHLCV[], period: number = 20): number | null {
  if (candles.length < period) return null;
  const r = candles.slice(-period);
  const tps = r.map(c => (c.high + c.low + c.close) / 3);
  const sma = tps.reduce((s, v) => s + v, 0) / period;
  const md = tps.reduce((s, v) => s + Math.abs(v - sma), 0) / period;
  return md === 0 ? 0 : (tps[tps.length - 1] - sma) / (0.015 * md);
}

function calcROC(closes: number[], period: number = 12): number | null {
  if (closes.length <= period) return null;
  const p = closes[closes.length - 1 - period];
  return p === 0 ? 0 : ((closes[closes.length - 1] - p) / p) * 100;
}

function calcCMF(candles: OHLCV[], period: number = 20): number | null {
  if (candles.length < period) return null;
  const r = candles.slice(-period);
  let mfv = 0, vol = 0;
  for (const c of r) {
    const clv = c.high !== c.low ? ((c.close - c.low) - (c.high - c.close)) / (c.high - c.low) : 0;
    mfv += clv * c.volume; vol += c.volume;
  }
  return vol === 0 ? 0 : mfv / vol;
}

function calcATR(candles: OHLCV[], period: number = 14): number | null {
  if (candles.length < period + 1) return null;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    trs.push(Math.max(candles[i].high - candles[i].low, Math.abs(candles[i].high - candles[i - 1].close), Math.abs(candles[i].low - candles[i - 1].close)));
  }
  return trs.slice(-period).reduce((s, v) => s + v, 0) / period;
}

function calcBB(closes: number[], period: number = 20): { percentB: number } | null {
  if (closes.length < period) return null;
  const sl = closes.slice(-period);
  const m = sl.reduce((s, v) => s + v, 0) / period;
  const std = Math.sqrt(sl.reduce((s, v) => s + Math.pow(v - m, 2), 0) / period);
  const u = m + 2 * std, l = m - 2 * std;
  return { percentB: (closes[closes.length - 1] - l) / (u - l) * 100 };
}

function calcUO(candles: OHLCV[]): number | null {
  if (candles.length < 30) return null;
  const bp: number[] = [], tr: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const pc = candles[i - 1].close;
    bp.push(candles[i].close - Math.min(candles[i].low, pc));
    tr.push(Math.max(candles[i].high, pc) - Math.min(candles[i].low, pc));
  }
  const a7 = bp.slice(-7).reduce((s, v) => s + v, 0) / tr.slice(-7).reduce((s, v) => s + v, 0);
  const a14 = bp.slice(-14).reduce((s, v) => s + v, 0) / tr.slice(-14).reduce((s, v) => s + v, 0);
  const a28 = bp.slice(-28).reduce((s, v) => s + v, 0) / tr.slice(-28).reduce((s, v) => s + v, 0);
  return ((4 * a7) + (2 * a14) + a28) / 7 * 100;
}

function calcAO(candles: OHLCV[]): number | null {
  if (candles.length < 34) return null;
  const mp = candles.map(c => (c.high + c.low) / 2);
  const s5 = calcSMA(mp, 5), s34 = calcSMA(mp, 34);
  return s5 && s34 ? s5 - s34 : null;
}

function calcChop(candles: OHLCV[], period: number = 14): number | null {
  if (candles.length < period + 1) return null;
  const r = candles.slice(-period - 1);
  let atr = 0, hh = -Infinity, ll = Infinity;
  for (let i = 1; i < r.length; i++) {
    atr += Math.max(r[i].high - r[i].low, Math.abs(r[i].high - r[i - 1].close), Math.abs(r[i].low - r[i - 1].close));
    if (r[i].high > hh) hh = r[i].high; if (r[i].low < ll) ll = r[i].low;
  }
  const range = hh - ll;
  return range === 0 ? 50 : 100 * Math.log10(atr / range) / Math.log10(period);
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(2) + 'K';
  return n.toFixed(2);
}

// ==========================================================
// MAIN
// ==========================================================

export function calculateAllIndicatorReadings(candles: OHLCV[]): IndicatorCategory[] {
  const closes = candles.map(c => c.close);
  const hl2 = candles.map(c => (c.high + c.low) / 2);
  const price = closes[closes.length - 1];
  const cats: IndicatorCategory[] = [];

  // MOMENTUM
  const mom: IndicatorReading[] = [];
  const rsi = calcRSI(closes);
  if (rsi !== null) mom.push({ name: 'RSI', nameAr: 'RSI', value: rsi.toFixed(1), signal: rsi > 70 ? 'bearish' : rsi < 30 ? 'bullish' : 'neutral', strength: rsi > 70 ? 80 : rsi < 30 ? 80 : 50, description: rsi > 70 ? 'Overbought' : rsi < 30 ? 'Oversold' : 'Neutral', descriptionAr: rsi > 70 ? 'تشبع شرائي' : rsi < 30 ? 'تشبع بيعي' : 'محايد' });
  const stoch = calcStochastic(candles);
  if (stoch) mom.push({ name: 'Stoch', nameAr: 'ستوكاستك', value: `${stoch.k.toFixed(0)}`, signal: stoch.k > 80 ? 'bearish' : stoch.k < 20 ? 'bullish' : 'neutral', strength: stoch.k > 80 || stoch.k < 20 ? 75 : 50, description: stoch.k > 80 ? 'Overbought' : stoch.k < 20 ? 'Oversold' : 'Neutral', descriptionAr: stoch.k > 80 ? 'تشبع شرائي' : stoch.k < 20 ? 'تشبع بيعي' : 'محايد' });
  const wr = calcWilliamsR(candles);
  if (wr !== null) mom.push({ name: 'W%R', nameAr: 'ويليامز', value: wr.toFixed(0), signal: wr > -20 ? 'bearish' : wr < -80 ? 'bullish' : 'neutral', strength: 70, description: wr > -20 ? 'Overbought' : wr < -80 ? 'Oversold' : 'Neutral', descriptionAr: wr > -20 ? 'تشبع شرائي' : wr < -80 ? 'تشبع بيعي' : 'محايد' });
  const cci = calcCCI(candles);
  if (cci !== null) mom.push({ name: 'CCI', nameAr: 'CCI', value: cci.toFixed(0), signal: cci > 100 ? 'bullish' : cci < -100 ? 'bearish' : 'neutral', strength: Math.min(100, Math.abs(cci) / 2), description: cci > 100 ? 'Bullish' : cci < -100 ? 'Bearish' : 'Neutral', descriptionAr: cci > 100 ? 'صعودي' : cci < -100 ? 'هبوطي' : 'محايد' });
  const roc = calcROC(closes);
  if (roc !== null) mom.push({ name: 'ROC', nameAr: 'ROC', value: `${roc.toFixed(1)}%`, signal: roc > 5 ? 'bullish' : roc < -5 ? 'bearish' : 'neutral', strength: Math.min(100, Math.abs(roc) * 10), description: roc > 0 ? 'Positive' : 'Negative', descriptionAr: roc > 0 ? 'إيجابي' : 'سلبي' });
  const uo = calcUO(candles);
  if (uo !== null) mom.push({ name: 'UO', nameAr: 'Ultimate', value: uo.toFixed(1), signal: uo > 70 ? 'bearish' : uo < 30 ? 'bullish' : uo > 50 ? 'bullish' : 'bearish', strength: Math.abs(uo - 50), description: uo > 70 ? 'Overbought' : uo < 30 ? 'Oversold' : 'Neutral', descriptionAr: uo > 70 ? 'تشبع شرائي' : uo < 30 ? 'تشبع بيعي' : 'محايد' });
  const ao = calcAO(candles);
  if (ao !== null) mom.push({ name: 'AO', nameAr: 'AO', value: ao.toFixed(2), signal: ao > 0 ? 'bullish' : 'bearish', strength: Math.min(100, Math.abs(ao) * 50), description: ao > 0 ? 'Bullish' : 'Bearish', descriptionAr: ao > 0 ? 'صاعد' : 'هابط' });
  const mB = mom.filter(i => i.signal === 'bullish').length, mBe = mom.filter(i => i.signal === 'bearish').length;
  const mS = ((mB - mBe) / Math.max(1, mom.length)) * 100;
  cats.push({ name: 'Momentum', nameAr: 'الزخم', indicators: mom, overallSignal: mS > 20 ? 'bullish' : mS < -20 ? 'bearish' : 'neutral', score: mS });

  // TREND
  const trend: IndicatorReading[] = [];
  const macd = calcMACD(closes);
  if (macd) trend.push({ name: 'MACD', nameAr: 'الماكد', value: macd.histogram > 0 ? 'صاعد' : 'هابط', signal: macd.histogram > 0 ? 'bullish' : 'bearish', strength: Math.min(100, Math.abs(macd.histogram) * 100), description: macd.histogram > 0 ? 'Bullish' : 'Bearish', descriptionAr: macd.histogram > 0 ? 'صاعد' : 'هابط' });
  const adx = calcADX(candles);
  if (adx !== null) trend.push({ name: 'ADX', nameAr: 'ADX', value: adx.toFixed(1), signal: adx > 25 ? 'bullish' : 'neutral', strength: Math.min(100, adx * 2), description: adx > 40 ? 'Strong' : adx > 25 ? 'Trending' : 'Weak', descriptionAr: adx > 40 ? 'قوي' : adx > 25 ? 'يتجه' : 'ضعيف' });
  const e9 = calcEMA(closes, 9), e21 = calcEMA(closes, 21), e50 = calcEMA(closes, 50);
  if (e9 && e21) trend.push({ name: 'EMA9/21', nameAr: 'EMA تقاطع', value: e9 > e21 ? 'ذهبي' : 'وفاة', signal: e9 > e21 ? 'bullish' : 'bearish', strength: Math.min(100, Math.abs(e9 - e21) / e21 * 1000), description: e9 > e21 ? 'Golden' : 'Death', descriptionAr: e9 > e21 ? 'تقاطع ذهبي' : 'تقاطع الوفاة' });
  if (e50) trend.push({ name: 'EMA50', nameAr: 'EMA50', value: price > e50 ? 'فوق' : 'تحت', signal: price > e50 ? 'bullish' : 'bearish', strength: Math.min(100, Math.abs(price - e50) / e50 * 500), description: price > e50 ? 'Above' : 'Below', descriptionAr: price > e50 ? 'فوق' : 'تحت' });
  const chop = calcChop(candles);
  if (chop !== null) trend.push({ name: 'Chop', nameAr: 'التذبذب', value: chop.toFixed(1), signal: chop < 38 ? 'bullish' : 'neutral', strength: chop < 38 ? 80 : 40, description: chop < 38 ? 'Trending' : 'Choppy', descriptionAr: chop < 38 ? 'يتجه' : 'متذبذب' });
  const tB = trend.filter(i => i.signal === 'bullish').length, tBe = trend.filter(i => i.signal === 'bearish').length;
  const tS = ((tB - tBe) / Math.max(1, trend.length)) * 100;
  cats.push({ name: 'Trend', nameAr: 'الاتجاه', indicators: trend, overallSignal: tS > 20 ? 'bullish' : tS < -20 ? 'bearish' : 'neutral', score: tS });

  // VOLUME
  const vol: IndicatorReading[] = [];
  const obv = calcOBV(candles), obvP = calcOBV(candles.slice(0, -10)), obvT = obv - obvP;
  vol.push({ name: 'OBV', nameAr: 'OBV', value: fmt(obv), signal: obvT > 0 ? 'bullish' : obvT < 0 ? 'bearish' : 'neutral', strength: Math.min(100, Math.abs(obvT) / (Math.abs(obv) + 1) * 100), description: obvT > 0 ? 'Accumulation' : 'Distribution', descriptionAr: obvT > 0 ? 'تراكم' : 'توزيع' });
  const mfi = calcMFI(candles);
  if (mfi !== null) vol.push({ name: 'MFI', nameAr: 'MFI', value: mfi.toFixed(1), signal: mfi > 80 ? 'bearish' : mfi < 20 ? 'bullish' : 'neutral', strength: mfi > 80 || mfi < 20 ? 80 : 50, description: mfi > 80 ? 'Outflow' : mfi < 20 ? 'Inflow' : 'Neutral', descriptionAr: mfi > 80 ? 'تدفق خارج' : mfi < 20 ? 'تدفق داخل' : 'محايد' });
  const cmf = calcCMF(candles);
  if (cmf !== null) vol.push({ name: 'CMF', nameAr: 'CMF', value: cmf.toFixed(3), signal: cmf > 0.1 ? 'bullish' : cmf < -0.1 ? 'bearish' : 'neutral', strength: Math.min(100, Math.abs(cmf) * 500), description: cmf > 0 ? 'Buying' : 'Selling', descriptionAr: cmf > 0 ? 'ضغط شرائي' : 'ضغط بيعي' });
  const avgV = candles.slice(-20).reduce((s, c) => s + c.volume, 0) / 20, curV = candles[candles.length - 1].volume, vR = curV / avgV;
  vol.push({ name: 'Vol', nameAr: 'الحجم', value: `${(vR * 100).toFixed(0)}%`, signal: vR > 1.5 ? 'bullish' : vR < 0.5 ? 'bearish' : 'neutral', strength: Math.min(100, vR * 50), description: vR > 1.5 ? 'High' : vR < 0.5 ? 'Low' : 'Normal', descriptionAr: vR > 1.5 ? 'مرتفع' : vR < 0.5 ? 'منخفض' : 'طبيعي' });
  const vB = vol.filter(i => i.signal === 'bullish').length, vBe = vol.filter(i => i.signal === 'bearish').length;
  const vS = ((vB - vBe) / Math.max(1, vol.length)) * 100;
  cats.push({ name: 'Volume', nameAr: 'الحجم', indicators: vol, overallSignal: vS > 20 ? 'bullish' : vS < -20 ? 'bearish' : 'neutral', score: vS });

  // VOLATILITY
  const vola: IndicatorReading[] = [];
  const atr = calcATR(candles);
  if (atr !== null) { const ap = (atr / price) * 100; vola.push({ name: 'ATR', nameAr: 'ATR', value: `${ap.toFixed(2)}%`, signal: 'neutral', strength: Math.min(100, ap * 20), description: ap > 5 ? 'High' : ap < 2 ? 'Low' : 'Normal', descriptionAr: ap > 5 ? 'عالي' : ap < 2 ? 'منخفض' : 'طبيعي' }); }
  const bb = calcBB(closes);
  if (bb) vola.push({ name: 'BB%B', nameAr: 'بولينجر', value: bb.percentB.toFixed(1), signal: bb.percentB > 100 ? 'bearish' : bb.percentB < 0 ? 'bullish' : 'neutral', strength: bb.percentB > 100 || bb.percentB < 0 ? 80 : 50, description: bb.percentB > 100 ? 'Above upper' : bb.percentB < 0 ? 'Below lower' : 'In bands', descriptionAr: bb.percentB > 100 ? 'فوق العلوي' : bb.percentB < 0 ? 'تحت السفلي' : 'داخل النطاق' });
  const volaB = vola.filter(i => i.signal === 'bullish').length, volaBe = vola.filter(i => i.signal === 'bearish').length;
  const volaS = ((volaB - volaBe) / Math.max(1, vola.length)) * 100;
  cats.push({ name: 'Volatility', nameAr: 'التقلب', indicators: vola, overallSignal: volaS > 20 ? 'bullish' : volaS < -20 ? 'bearish' : 'neutral', score: volaS });

  // EHLERS DSP
  const ehlers: IndicatorReading[] = [];
  try { const ss = calculateSuperSmoother(closes, 10); if (ss.values.length > 0) ehlers.push({ name: 'SuperSmoother', nameAr: 'سوبر سموذر', value: ss.trend, signal: ss.signal, strength: 70, description: ss.trend === 'up' ? 'Up' : ss.trend === 'down' ? 'Down' : 'Flat', descriptionAr: ss.trend === 'up' ? 'صاعد' : ss.trend === 'down' ? 'هابط' : 'عرضي' }); } catch {}
  try { const it = calculateInstantaneousTrendline(hl2); if (it.values.length > 0) ehlers.push({ name: 'ITrendline', nameAr: 'الاتجاه الفوري', value: it.crossover ? 'تقاطع' : it.signal, signal: it.signal, strength: it.crossover ? 90 : 60, description: it.crossover ? 'Crossover' : it.signal, descriptionAr: it.crossover ? 'تقاطع' : it.signal === 'bullish' ? 'صاعد' : 'هابط' }); } catch {}
  try { const f = calculateFisherTransform(candles); if (f.fisherArray.length > 0) ehlers.push({ name: 'Fisher', nameAr: 'فيشر', value: f.fisher.toFixed(2), signal: f.signal, strength: f.strength, description: f.crossover ? 'Crossover' : f.signal, descriptionAr: f.crossover ? 'تقاطع' : f.signal === 'bullish' ? 'صاعد' : 'هابط' }); } catch {}
  try { const lr = calculateLaguerreRSI(closes); if (lr.lrsiArray.length > 0) ehlers.push({ name: 'LaguerreRSI', nameAr: 'لاغير', value: lr.lrsi.toFixed(1), signal: lr.signal || 'neutral', strength: lr.strength || 50, description: lr.oversold ? 'Oversold' : lr.overbought ? 'Overbought' : 'Neutral', descriptionAr: lr.oversold ? 'تشبع بيعي' : lr.overbought ? 'تشبع شرائي' : 'محايد' }); } catch {}
  try { const cr = calculateConnorsRSI(closes); if (cr.crsiArray.length > 0 && cr.crsi) ehlers.push({ name: 'ConnorsRSI', nameAr: 'كونورز', value: cr.crsi.toFixed(1), signal: cr.signal || 'neutral', strength: cr.strength || 50, description: cr.crsi < 20 ? 'Oversold' : cr.crsi > 80 ? 'Overbought' : 'Neutral', descriptionAr: cr.crsi < 20 ? 'تشبع بيعي' : cr.crsi > 80 ? 'تشبع شرائي' : 'محايد' }); } catch {}
  try { const ma = calculateMAMA(hl2); if (ma.mamaArray.length > 0) ehlers.push({ name: 'MAMA', nameAr: 'ماما', value: ma.crossover ? 'تقاطع' : ma.signal, signal: ma.signal, strength: ma.crossover ? 85 : 60, description: ma.crossover ? 'Crossover' : ma.signal, descriptionAr: ma.crossover ? 'تقاطع' : ma.signal === 'bullish' ? 'صاعد' : 'هابط' }); } catch {}
  const eB = ehlers.filter(i => i.signal === 'bullish').length, eBe = ehlers.filter(i => i.signal === 'bearish').length;
  const eS = ((eB - eBe) / Math.max(1, ehlers.length)) * 100;
  cats.push({ name: 'Ehlers DSP', nameAr: 'إيهلرز', indicators: ehlers, overallSignal: eS > 20 ? 'bullish' : eS < -20 ? 'bearish' : 'neutral', score: eS });

  return cats;
}

// ==========================================================
// AI
// ==========================================================

const PROMPT = `أنت محلل فني. اقرأ المؤشرات وأجب JSON فقط:
{"recommendation":"شراء قوي"|"شراء"|"محايد"|"بيع"|"بيع قوي","confidence":number,"positives":[],"negatives":[],"keyLevels":{"stopLoss":number,"takeProfit1":number,"takeProfit2":number,"support":[],"resistance":[]},"riskLevel":"منخفض"|"متوسط"|"مرتفع"|"مرتفع جداً","riskFactors":[]}`;

export async function analyzeWithAI(req: AIAnalysisRequest, apiKey: string): Promise<AIAnalysisResponse> {
  try {
    const client = new OpenAIClient({ apiKey, model: 'gpt-4o-mini', temperature: 0.3, maxTokens: 1200 });
    const data = req.indicators.map(c => `${c.nameAr}(${c.score.toFixed(0)}%):${c.indicators.map(i => `${i.nameAr}=${i.value}[${i.signal}]`).join(',')}`).join('\n');
    const prompt = `${req.symbol} ${req.timeframe} السعر:${req.currentPrice}\n${data}`;
    const res = await client.createChatCompletion([{ role: 'system', content: PROMPT }, { role: 'user', content: prompt }]);
    const m = (res.choices[0]?.message?.content || '').match(/\{[\s\S]*\}/);
    if (!m) throw new Error('Invalid');
    const ai = JSON.parse(m[0]);
    return { recommendation: ai.recommendation || 'محايد', recommendationEn: mapR(ai.recommendation), confidence: ai.confidence || 50, summary: '', summaryEn: '', positives: ai.positives || [], negatives: ai.negatives || [], positivesEn: [], negativesEn: [], keyLevels: ai.keyLevels || { support: [], resistance: [], stopLoss: req.currentPrice * 0.95, takeProfit1: req.currentPrice * 1.05, takeProfit2: req.currentPrice * 1.1 }, riskAssessment: { level: ai.riskLevel || 'متوسط', levelEn: mapRisk(ai.riskLevel), factors: ai.riskFactors || [], factorsEn: [] }, suggestedTimeframe: req.timeframe, categoryAnalysis: [], timestamp: Date.now() };
  } catch { return generateFallbackAnalysis(req); }
}

function mapR(r: string): AIAnalysisResponse['recommendationEn'] { return ({ 'شراء قوي': 'Strong Buy', 'شراء': 'Buy', 'محايد': 'Neutral', 'بيع': 'Sell', 'بيع قوي': 'Strong Sell' } as any)[r] || 'Neutral'; }
function mapRisk(r: string): 'Low' | 'Medium' | 'High' | 'Very High' { return ({ 'منخفض': 'Low', 'متوسط': 'Medium', 'مرتفع': 'High', 'مرتفع جداً': 'Very High' } as any)[r] || 'Medium'; }

export function generateFallbackAnalysis(req: AIAnalysisRequest): AIAnalysisResponse {
  const s = req.indicators.reduce((a, c) => a + c.score, 0) / req.indicators.length;
  let rec: AIAnalysisResponse['recommendation'] = 'محايد';
  if (s > 40) rec = 'شراء قوي'; else if (s > 15) rec = 'شراء'; else if (s < -40) rec = 'بيع قوي'; else if (s < -15) rec = 'بيع';
  const pos: string[] = [], neg: string[] = [];
  for (const c of req.indicators) for (const i of c.indicators) { if (i.signal === 'bullish' && i.strength > 60) pos.push(`${i.nameAr}: ${i.descriptionAr}`); else if (i.signal === 'bearish' && i.strength > 60) neg.push(`${i.nameAr}: ${i.descriptionAr}`); }
  return { recommendation: rec, recommendationEn: mapR(rec), confidence: Math.min(100, Math.abs(s) + 30), summary: '', summaryEn: '', positives: pos.slice(0, 6), negatives: neg.slice(0, 6), positivesEn: [], negativesEn: [], keyLevels: { support: [], resistance: [], stopLoss: req.currentPrice * 0.95, takeProfit1: req.currentPrice * 1.05, takeProfit2: req.currentPrice * 1.1 }, riskAssessment: { level: Math.abs(s) < 20 ? 'مرتفع' : 'متوسط', levelEn: Math.abs(s) < 20 ? 'High' : 'Medium', factors: [], factorsEn: [] }, suggestedTimeframe: req.timeframe, categoryAnalysis: [], timestamp: Date.now() };
}

export const ExpertAnalystAgent = { calculateAllIndicatorReadings, analyzeWithAI, generateFallbackAnalysis };
export default ExpertAnalystAgent;
