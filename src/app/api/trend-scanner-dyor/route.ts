/**
 * 📊 DYOR-Style Trend Scanner API
 * Scans coins across 5 timeframes with 38 indicator checks each
 *
 * GET /api/trend-scanner-dyor?exchange=bybit&count=100
 *
 * Returns per-coin, per-timeframe: { bullishScore, bearishScore, score, bullishCount, bearishCount }
 */

import { NextRequest, NextResponse } from 'next/server';

// ─── Types (inlined for server-side) ───

interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

type IndicatorVerdict = 'buy' | 'sell' | 'neutral';

interface TFResult {
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  bullishScore: number;
  bearishScore: number;
  score: number;
}

interface CoinResult {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  timeframes: Record<string, TFResult>;
}

// ─── TOP 200 Coins (inlined) ───

const TOP_COINS: { symbol: string; name: string }[] = [
  { symbol: "BTCUSDT", name: "BTC" },
  { symbol: "ETHUSDT", name: "ETH" },
  { symbol: "XRPUSDT", name: "XRP" },
  { symbol: "SOLUSDT", name: "SOL" },
  { symbol: "BNBUSDT", name: "BNB" },
  { symbol: "DOGEUSDT", name: "DOGE" },
  { symbol: "ADAUSDT", name: "ADA" },
  { symbol: "TRXUSDT", name: "TRX" },
  { symbol: "LINKUSDT", name: "LINK" },
  { symbol: "AVAXUSDT", name: "AVAX" },
  { symbol: "SUIUSDT", name: "SUI" },
  { symbol: "XLMUSDT", name: "XLM" },
  { symbol: "DOTUSDT", name: "DOT" },
  { symbol: "HBARUSDT", name: "HBAR" },
  { symbol: "TONUSDT", name: "TON" },
  { symbol: "SHIBUSDT", name: "SHIB" },
  { symbol: "LTCUSDT", name: "LTC" },
  { symbol: "BCHUSDT", name: "BCH" },
  { symbol: "UNIUSDT", name: "UNI" },
  { symbol: "NEARUSDT", name: "NEAR" },
  { symbol: "APTUSDT", name: "APT" },
  { symbol: "ICPUSDT", name: "ICP" },
  { symbol: "ATOMUSDT", name: "ATOM" },
  { symbol: "RENDERUSDT", name: "RENDER" },
  { symbol: "VETUSDT", name: "VET" },
  { symbol: "FILUSDT", name: "FIL" },
  { symbol: "ARBUSDT", name: "ARB" },
  { symbol: "IMXUSDT", name: "IMX" },
  { symbol: "OPUSDT", name: "OP" },
  { symbol: "INJUSDT", name: "INJ" },
  { symbol: "FTMUSDT", name: "FTM" },
  { symbol: "GRTUSDT", name: "GRT" },
  { symbol: "AAVEUSDT", name: "AAVE" },
  { symbol: "STXUSDT", name: "STX" },
  { symbol: "SANDUSDT", name: "SAND" },
  { symbol: "MANAUSDT", name: "MANA" },
  { symbol: "THETAUSDT", name: "THETA" },
  { symbol: "AXSUSDT", name: "AXS" },
  { symbol: "ALGOUSDT", name: "ALGO" },
  { symbol: "FLOWUSDT", name: "FLOW" },
  { symbol: "EGLDUSDT", name: "EGLD" },
  { symbol: "CHZUSDT", name: "CHZ" },
  { symbol: "APEUSDT", name: "APE" },
  { symbol: "EOSUSDT", name: "EOS" },
  { symbol: "XTZUSDT", name: "XTZ" },
  { symbol: "SNXUSDT", name: "SNX" },
  { symbol: "MKRUSDT", name: "MKR" },
  { symbol: "COMPUSDT", name: "COMP" },
  { symbol: "CRVUSDT", name: "CRV" },
  { symbol: "LDOUSDT", name: "LDO" },
  { symbol: "RNDRUSDT", name: "RNDR" },
  { symbol: "RUNEUSDT", name: "RUNE" },
  { symbol: "DYDXUSDT", name: "DYDX" },
  { symbol: "CFXUSDT", name: "CFX" },
  { symbol: "QNTUSDT", name: "QNT" },
  { symbol: "FETUSDT", name: "FET" },
  { symbol: "AGIXUSDT", name: "AGIX" },
  { symbol: "SEIUSDT", name: "SEI" },
  { symbol: "TIAUSDT", name: "TIA" },
  { symbol: "BLURUSDT", name: "BLUR" },
  { symbol: "WLDUSDT", name: "WLD" },
  { symbol: "JUPUSDT", name: "JUP" },
  { symbol: "PYTHUSDT", name: "PYTH" },
  { symbol: "ORDIUSDT", name: "ORDI" },
  { symbol: "WUSDT", name: "W" },
  { symbol: "ENAUSDT", name: "ENA" },
  { symbol: "PENDLEUSDT", name: "PENDLE" },
  { symbol: "ONDOUSDT", name: "ONDO" },
  { symbol: "KASUSDT", name: "KAS" },
  { symbol: "MATICUSDT", name: "MATIC" },
  { symbol: "PEPEUSDT", name: "PEPE" },
  { symbol: "BONKUSDT", name: "BONK" },
  { symbol: "FLOKIUSDT", name: "FLOKI" },
  { symbol: "WIFUSDT", name: "WIF" },
  { symbol: "1000SATSUSDT", name: "1000SATS" },
  { symbol: "GALAUSDT", name: "GALA" },
  { symbol: "ROSAUSDT", name: "ROSE" },
  { symbol: "MINAUSDT", name: "MINA" },
  { symbol: "KAVAUSDT", name: "KAVA" },
  { symbol: "LRCUSDT", name: "LRC" },
  { symbol: "CELOUSDT", name: "CELO" },
  { symbol: "1INCHUSDT", name: "1INCH" },
  { symbol: "ANKRUSDT", name: "ANKR" },
  { symbol: "IOTAUSDT", name: "IOTA" },
  { symbol: "MASKUSDT", name: "MASK" },
  { symbol: "SKLUSDT", name: "SKL" },
  { symbol: "GMTUSDT", name: "GMT" },
  { symbol: "ILVUSDT", name: "ILV" },
  { symbol: "ZILUSDT", name: "ZIL" },
  { symbol: "ENJUSDT", name: "ENJ" },
  { symbol: "YFIUSDT", name: "YFI" },
  { symbol: "BALUSDT", name: "BAL" },
  { symbol: "SUSHIUSDT", name: "SUSHI" },
  { symbol: "ZRXUSDT", name: "ZRX" },
  { symbol: "BATUSDT", name: "BAT" },
  { symbol: "CELRUSDT", name: "CELR" },
  { symbol: "ONTUSDT", name: "ONT" },
  { symbol: "HOTUSDT", name: "HOT" },
  { symbol: "COTIUSDT", name: "COTI" },
  { symbol: "KSMUSDT", name: "KSM" },
];

const TIMEFRAMES = ['15m', '1h', '4h', '1d', '1w'];
const MA_PERIODS = [10, 25, 50, 100, 200];

// ─── Indicator Calculations (inlined) ───

function calcSMA(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  let sum = 0;
  for (let i = closes.length - period; i < closes.length; i++) sum += closes[i];
  return sum / period;
}

function calcEMA(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const k = 2 / (period + 1);
  // SMA-seeded EMA (industry standard): seed with SMA of first `period` values
  let ema = 0;
  for (let i = 0; i < period; i++) ema += closes[i];
  ema /= period;
  for (let i = period; i < closes.length; i++) ema = closes[i] * k + ema * (1 - k);
  return ema;
}

function highest(data: number[], period: number, endIdx: number): number {
  let max = -Infinity;
  for (let i = Math.max(0, endIdx - period + 1); i <= endIdx; i++) {
    if (data[i] > max) max = data[i];
  }
  return max;
}

function lowest(data: number[], period: number, endIdx: number): number {
  let min = Infinity;
  for (let i = Math.max(0, endIdx - period + 1); i <= endIdx; i++) {
    if (data[i] < min) min = data[i];
  }
  return min;
}

function calcIchimoku(candles: OHLCV[]) {
  const len = candles.length;
  if (len < 52) return null;
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const last = len - 1;
  const tenkan = (highest(highs, 9, last) + lowest(lows, 9, last)) / 2;
  const kijun = (highest(highs, 26, last) + lowest(lows, 26, last)) / 2;
  const ssa = (tenkan + kijun) / 2;
  const ssb = (highest(highs, 52, last) + lowest(lows, 52, last)) / 2;
  const chikou = candles[last].close;
  const priceAt26 = last >= 26 ? candles[last - 26].close : candles[0].close;
  return { tenkan, kijun, ssa, ssb, chikou, priceAt26 };
}

function calcMACDHistogram(closes: number[]): { macd: number; signal: number; histogram: number } | null {
  if (closes.length < 35) return null; // Need EMA(26) + Signal EMA(9)
  const k12 = 2 / 13, k26 = 2 / 27, k9 = 2 / 10;
  // Compute EMA(12) and EMA(26) in parallel, build MACD series
  let ema12 = closes[0], ema26 = closes[0];
  const macdLine: number[] = [0]; // first bar MACD = 0
  for (let i = 1; i < closes.length; i++) {
    ema12 = closes[i] * k12 + ema12 * (1 - k12);
    ema26 = closes[i] * k26 + ema26 * (1 - k26);
    macdLine.push(ema12 - ema26);
  }
  // Signal line = EMA(9) of MACD series
  let signal = macdLine[0];
  for (let i = 1; i < macdLine.length; i++) {
    signal = macdLine[i] * k9 + signal * (1 - k9);
  }
  const macd = macdLine[macdLine.length - 1];
  return { macd, signal, histogram: macd - signal };
}

function calcADX(candles: OHLCV[], period: number = 14) {
  if (candles.length < period * 3) return null;
  const len = candles.length;
  const plusDM: number[] = [0], minusDM: number[] = [0], tr: number[] = [0];
  for (let i = 1; i < len; i++) {
    const h = candles[i].high, l = candles[i].low;
    const ph = candles[i - 1].high, pl = candles[i - 1].low, pc = candles[i - 1].close;
    tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
    const up = h - ph, down = pl - l;
    plusDM.push(up > down && up > 0 ? up : 0);
    minusDM.push(down > up && down > 0 ? down : 0);
  }
  // Wilder smoothing for TR, +DM, -DM
  let sTR = 0, sPDM = 0, sMDM = 0;
  for (let i = 1; i <= period; i++) { sTR += tr[i]; sPDM += plusDM[i]; sMDM += minusDM[i]; }
  const plusDI_arr: number[] = [], minusDI_arr: number[] = [];
  if (sTR !== 0) { plusDI_arr.push((sPDM / sTR) * 100); minusDI_arr.push((sMDM / sTR) * 100); }
  else { plusDI_arr.push(0); minusDI_arr.push(0); }
  for (let i = period + 1; i < len; i++) {
    sTR = sTR - (sTR / period) + tr[i];
    sPDM = sPDM - (sPDM / period) + plusDM[i];
    sMDM = sMDM - (sMDM / period) + minusDM[i];
    if (sTR !== 0) { plusDI_arr.push((sPDM / sTR) * 100); minusDI_arr.push((sMDM / sTR) * 100); }
    else { plusDI_arr.push(0); minusDI_arr.push(0); }
  }
  // DX series
  const dx: number[] = [];
  for (let i = 0; i < plusDI_arr.length; i++) {
    const sum = plusDI_arr[i] + minusDI_arr[i];
    dx.push(sum === 0 ? 0 : Math.abs(plusDI_arr[i] - minusDI_arr[i]) / sum * 100);
  }
  if (dx.length < period) return null;
  // ADX = Wilder smooth of DX
  let adx = 0;
  for (let i = 0; i < period; i++) adx += dx[i];
  adx /= period;
  for (let i = period; i < dx.length; i++) adx = (adx * (period - 1) + dx[i]) / period;
  const last = plusDI_arr.length - 1;
  return { plusDI: plusDI_arr[last], minusDI: minusDI_arr[last], adx };
}

// ─── True Range (DYOR-identical: no Math.abs, starts at index > 10) ───
function calcTrueRange(highs: number[], lows: number[], closes: number[]): number[] {
  const tr = new Array(highs.length).fill(0);
  for (let i = 0; i < highs.length; i++) {
    if (i > 10) {
      const h = highs[i], l = lows[i];
      // DYOR does NOT use Math.abs — matches their function s(e,t,r)
      tr[i] = Math.max(h - l, h - closes[i - 1], l - closes[i - 1]);
    }
  }
  return tr;
}

// ─── ATR with Wilder Smoothing (DYOR-identical: seed at index 50) ───
function calcATR(trueRangeArr: number[]): number[] {
  const atr = new Array(trueRangeArr.length).fill(0);
  for (let i = 0; i < trueRangeArr.length; i++) {
    if (i === 50) {
      let sum = 0;
      for (let j = 0; j < 10; j++) sum += trueRangeArr[i - j];
      atr[i] = sum / 10;
    } else if (i > 50) {
      atr[i] = (9 * atr[i - 1] + trueRangeArr[i]) / 10;
    }
  }
  return atr;
}

// ─── Supertrend (DYOR-identical: period=10, mult=3, Wilder ATR) ───
function calcSupertrend(candles: OHLCV[], _period: number = 10, mult: number = 3): IndicatorVerdict {
  if (candles.length < 60) return 'neutral'; // need at least 60 bars for ATR seed at 50
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const closes = candles.map(c => c.close);
  const atrArr = calcATR(calcTrueRange(highs, lows, closes));
  const len = closes.length;

  const bUpper: number[] = [], bLower: number[] = [];
  const fUpper: number[] = [], fLower: number[] = [];
  const st: number[] = [];

  for (let i = 0; i < len; i++) {
    const hl2 = (highs[i] + lows[i]) / 2;
    bUpper[i] = hl2 + mult * atrArr[i];
    bLower[i] = hl2 - mult * atrArr[i];
    fUpper[i] = bUpper[i];
    fLower[i] = bLower[i];
  }

  for (let i = 1; i < len; i++) {
    fUpper[i] = bUpper[i] < fUpper[i - 1] || closes[i - 1] > fUpper[i - 1] ? bUpper[i] : fUpper[i - 1];
    fLower[i] = bLower[i] > fLower[i - 1] || closes[i - 1] < fLower[i - 1] ? bLower[i] : fLower[i - 1];

    if (i <= 10) {
      st[i] = fUpper[i];
    } else {
      let dir: number;
      if (st[i - 1] === fUpper[i - 1]) {
        dir = closes[i] > fUpper[i] ? 1 : 0;
      } else {
        dir = closes[i] < fLower[i] ? 0 : 1;
      }
      st[i] = dir === 1 ? fLower[i] : fUpper[i];
    }
  }

  // Determine direction from last bar
  const last = len - 1;
  if (last < 11) return 'neutral';
  return closes[last] > st[last] ? 'buy' : 'sell';
}

// ─── StochRSI (DYOR-identical: RSI=14, StochK=14, smoothK=SMA(3)) ───
function calcStochRSI(closes: number[], rsiP: number = 14, stochP: number = 14, smoothK: number = 3): IndicatorVerdict {
  if (closes.length < rsiP + stochP + smoothK + 1) return 'neutral';
  // Step 1: Compute full RSI array
  const rsiVals: number[] = [];
  let aG = 0, aL = 0;
  for (let i = 1; i <= rsiP; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) aG += d; else aL += Math.abs(d);
  }
  aG /= rsiP; aL /= rsiP;
  rsiVals.push(aL === 0 ? 100 : 100 - (100 / (1 + aG / aL)));
  for (let i = rsiP + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    aG = (aG * (rsiP - 1) + (d > 0 ? d : 0)) / rsiP;
    aL = (aL * (rsiP - 1) + (d < 0 ? Math.abs(d) : 0)) / rsiP;
    rsiVals.push(aL === 0 ? 100 : 100 - (100 / (1 + aG / aL)));
  }
  if (rsiVals.length < stochP) return 'neutral';

  // Step 2: Compute raw StochK for each RSI value where we have enough history
  const rawK: number[] = [];
  for (let i = stochP - 1; i < rsiVals.length; i++) {
    const slice = rsiVals.slice(i - stochP + 1, i + 1);
    const hi = Math.max(...slice), lo = Math.min(...slice);
    if (hi === lo) rawK.push(100);
    else rawK.push(((rsiVals[i] - lo) / (hi - lo)) * 100);
  }
  if (rawK.length < smoothK) return 'neutral';

  // Step 3: Smooth K with SMA(smoothK) — DYOR uses smooth_k=3
  const lastIdx = rawK.length - 1;
  let smoothedK = 0;
  for (let i = lastIdx - smoothK + 1; i <= lastIdx; i++) smoothedK += rawK[i];
  smoothedK /= smoothK;

  return smoothedK < 20 ? 'buy' : smoothedK > 80 ? 'sell' : 'neutral';
}

// ─── Main Engine ───

interface CheckDetail {
  name: string;
  category: string;
  result: IndicatorVerdict;
  computable: boolean; // false = data insufficient, excluded from total
}

interface DYORResult extends TFResult {
  checks?: CheckDetail[];
  totalComputable?: number;
}

function runDYORChecks(candles: OHLCV[], debug: boolean = false): DYORResult {
  const closes = candles.map(c => c.close);
  const price = closes[closes.length - 1];
  let buys = 0, sells = 0, neutrals = 0;
  let excluded = 0; // checks skipped due to insufficient data
  const checks: CheckDetail[] = [];

  // Vote: only counts computable checks. Null indicators are EXCLUDED (not neutral).
  const vote = (v: IndicatorVerdict, name: string, category: string) => {
    if (v === 'buy') { buys++; checks.push({ name, category, result: 'buy', computable: true }); }
    else if (v === 'sell') { sells++; checks.push({ name, category, result: 'sell', computable: true }); }
    else { neutrals++; checks.push({ name, category, result: 'neutral', computable: true }); }
  };
  const skip = (name: string, category: string) => {
    excluded++;
    checks.push({ name, category, result: 'neutral', computable: false });
  };
  // Neutral threshold: values within 0.15% are "neutral" (common in DYOR-style scanners)
  const NEUTRAL_PCT = 0.0015;
  const priceVs = (val: number | null, maName: string, category: string) => {
    if (val !== null) {
      const diff = Math.abs(price - val) / Math.max(price, val);
      vote(diff < NEUTRAL_PCT ? 'neutral' : price > val ? 'buy' : 'sell', `Price vs ${maName}`, category);
    } else skip(`Price vs ${maName}`, category);
  };
  const compareMAs = (a: number | null, b: number | null, nameA: string, nameB: string, category: string) => {
    if (a !== null && b !== null) {
      const diff = Math.abs(a - b) / Math.max(a, b);
      vote(diff < NEUTRAL_PCT ? 'neutral' : a > b ? 'buy' : 'sell', `${nameA} vs ${nameB}`, category);
    } else skip(`${nameA} vs ${nameB}`, category);
  };

  // SMA: 5 price + 10 cross = 15
  const sma: Record<number, number | null> = {};
  for (const p of MA_PERIODS) sma[p] = calcSMA(closes, p);
  for (const p of MA_PERIODS) priceVs(sma[p], `SMA${p}`, 'SMA');
  for (let i = 0; i < MA_PERIODS.length; i++)
    for (let j = i + 1; j < MA_PERIODS.length; j++)
      compareMAs(sma[MA_PERIODS[i]], sma[MA_PERIODS[j]], `SMA${MA_PERIODS[i]}`, `SMA${MA_PERIODS[j]}`, 'SMA');

  // EMA: 5 price + 10 cross = 15
  const ema: Record<number, number | null> = {};
  for (const p of MA_PERIODS) ema[p] = calcEMA(closes, p);
  for (const p of MA_PERIODS) priceVs(ema[p], `EMA${p}`, 'EMA');
  for (let i = 0; i < MA_PERIODS.length; i++)
    for (let j = i + 1; j < MA_PERIODS.length; j++)
      compareMAs(ema[MA_PERIODS[i]], ema[MA_PERIODS[j]], `EMA${MA_PERIODS[i]}`, `EMA${MA_PERIODS[j]}`, 'EMA');

  // Ichimoku: 4 — EXCLUDED entirely if insufficient data
  const ich = calcIchimoku(candles);
  if (ich) {
    vote(ich.ssa > ich.ssb ? 'buy' : ich.ssa < ich.ssb ? 'sell' : 'neutral', 'Senkou Span A vs B', 'Ichimoku');
    const ct = Math.max(ich.ssa, ich.ssb), cb = Math.min(ich.ssa, ich.ssb);
    vote(ich.kijun > ct ? 'buy' : ich.kijun < cb ? 'sell' : 'neutral', 'Kijun Sen position', 'Ichimoku');
    vote((ich.tenkan > ich.kijun && ich.tenkan > ct) ? 'buy' : (ich.tenkan < ich.kijun && ich.tenkan < cb) ? 'sell' : 'neutral', 'Tenkan Sen position', 'Ichimoku');
    vote(ich.chikou > ich.priceAt26 ? 'buy' : ich.chikou < ich.priceAt26 ? 'sell' : 'neutral', 'Chikou Span vs Price', 'Ichimoku');
  } else {
    skip('Senkou Span A vs B', 'Ichimoku');
    skip('Kijun Sen position', 'Ichimoku');
    skip('Tenkan Sen position', 'Ichimoku');
    skip('Chikou Span vs Price', 'Ichimoku');
  }

  // ADX: 1 — neutral when ADX < 25 (weak trend), otherwise DI+/DI- direction
  const adx = calcADX(candles);
  if (adx) {
    if (adx.adx < 25) vote('neutral', 'ADX DI+/DI-', 'ADX');
    else vote(adx.plusDI > adx.minusDI ? 'buy' : adx.plusDI < adx.minusDI ? 'sell' : 'neutral', 'ADX DI+/DI-', 'ADX');
  } else skip('ADX DI+/DI-', 'ADX');

  // MACD: 1 — uses histogram (MACD - Signal) instead of MACD > 0
  const macd = calcMACDHistogram(closes);
  if (macd !== null) vote(macd.histogram > 0 ? 'buy' : macd.histogram < 0 ? 'sell' : 'neutral', 'MACD Signal', 'MACD');
  else skip('MACD Signal', 'MACD');

  // Supertrend: 1
  const stVerdict = calcSupertrend(candles);
  if (stVerdict !== 'neutral' || candles.length >= 60) vote(stVerdict, 'Supertrend', 'Supertrend');
  else skip('Supertrend', 'Supertrend');

  // StochRSI: 1
  const srVerdict = calcStochRSI(closes);
  // StochRSI always computable if we have enough data, neutral is a valid state (between 20-80)
  if (closes.length >= 14 + 14 + 3 + 1) vote(srVerdict, 'StochRSI', 'StochRSI');
  else skip('StochRSI', 'StochRSI');

  // DYOR formula: divide by computable checks only (exclude null indicators)
  const totalComputable = buys + sells + neutrals;
  const bullishScore = totalComputable > 0 ? Math.round((buys / totalComputable) * 100) : 0;
  const bearishScore = totalComputable > 0 ? Math.round((sells / totalComputable) * 100) : 0;

  const result: DYORResult = {
    bullishCount: buys,
    bearishCount: sells,
    neutralCount: neutrals,
    bullishScore,
    bearishScore,
    score: bullishScore - bearishScore,
  };

  if (debug) {
    result.checks = checks;
    result.totalComputable = totalComputable;
  }

  return result;
}

// ─── Bybit Ticker (real-time price, volume, 24h%) ───

interface TickerInfo {
  lastPrice: number;
  price24hPcnt: number;
  highPrice24h: number;
  lowPrice24h: number;
  turnover24h: number; // USDT volume
}

async function fetchBybitTickers(): Promise<Map<string, TickerInfo>> {
  const map = new Map<string, TickerInfo>();
  try {
    const res = await fetch('https://api.bybit.com/v5/market/tickers?category=spot', {
      signal: AbortSignal.timeout(10000),
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) return map;
    const json = await res.json();
    const list = json?.result?.list;
    if (!Array.isArray(list)) return map;
    for (const t of list) {
      if (!t.symbol?.endsWith('USDT')) continue;
      map.set(t.symbol, {
        lastPrice: parseFloat(t.lastPrice) || 0,
        price24hPcnt: parseFloat(t.price24hPcnt) * 100 || 0, // Convert to percentage
        highPrice24h: parseFloat(t.highPrice24h) || 0,
        lowPrice24h: parseFloat(t.lowPrice24h) || 0,
        turnover24h: parseFloat(t.turnover24h) || 0,
      });
    }
  } catch (err) {
    console.error('[Ticker] Bybit ticker fetch error:', err);
  }
  return map;
}

// ─── Cache ───

const scanCache = new Map<string, { data: CoinResult[]; ts: number }>();
const CACHE_TTL = 300_000; // 5 minutes

// ─── GET Handler ───

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const exchange = (searchParams.get('exchange') || 'binance').toLowerCase();
    const count = Math.min(parseInt(searchParams.get('count') || '100'), 200);
    const debugSymbol = searchParams.get('debug'); // e.g. ?debug=BTCUSDT
    const debugTf = searchParams.get('tf') || '1d'; // e.g. ?tf=4h

    // ─── Debug Mode: single coin, single timeframe, full check details ───
    // Per-timeframe candle limits: shorter TFs need more candles for EMA(200) convergence
    const tfLimitMap: Record<string, number> = { '15m': 500, '1h': 500, '4h': 500, '1d': 500, '1w': 500 };

    if (debugSymbol) {
      const baseUrl = new URL(request.url).origin;
      const debugLimit = tfLimitMap[debugTf] || 500;
      const url = `${baseUrl}/api/ohlcv?symbol=${debugSymbol}&exchange=${exchange}&interval=${debugTf}&limit=${debugLimit}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) return NextResponse.json({ success: false, error: `OHLCV fetch failed: ${res.status}` });
      const json = await res.json();
      let data: OHLCV[] = json.data;
      if (!data || data.length < 30) return NextResponse.json({ success: false, error: 'Insufficient data' });

      const result = runDYORChecks(data, true);
      return NextResponse.json({
        success: true,
        debug: true,
        symbol: debugSymbol,
        timeframe: debugTf,
        exchange,
        candles: data.length,
        bullishScore: result.bullishScore,
        bearishScore: result.bearishScore,
        score: result.score,
        bullishCount: result.bullishCount,
        bearishCount: result.bearishCount,
        neutralCount: result.neutralCount,
        totalComputable: result.totalComputable,
        checks: result.checks,
      });
    }

    const coins = TOP_COINS.slice(0, count);

    // Cache check
    const cacheKey = `dyor-${exchange}-${count}`;
    const cached = scanCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return NextResponse.json({ success: true, results: cached.data, cached: true, timestamp: cached.ts });
    }

    // 🚀 Fetch Bybit tickers ONCE for all coins (real-time price, volume, 24h%)
    const tickerMap = await fetchBybitTickers();

    const results: CoinResult[] = [];
    let processedCount = 0;
    let errorCount = 0;

    // Process coins in batches
    const BATCH_SIZE = 5;
    const baseUrl = new URL(request.url).origin;

    for (let batchStart = 0; batchStart < coins.length; batchStart += BATCH_SIZE) {
      const batch = coins.slice(batchStart, batchStart + BATCH_SIZE);

      const batchPromises = batch.map(async (coin) => {
        // Populate market data from Bybit ticker (real-time, USDT volume)
        const ticker = tickerMap.get(coin.symbol);
        const coinResult: CoinResult = {
          symbol: coin.symbol,
          name: coin.name,
          price: ticker?.lastPrice || 0,
          change24h: ticker?.price24hPcnt || 0,
          high24h: ticker?.highPrice24h || 0,
          low24h: ticker?.lowPrice24h || 0,
          volume24h: ticker?.turnover24h || 0,
          timeframes: {},
        };

        // Fetch all timeframes for this coin in parallel
        const tfPromises = TIMEFRAMES.map(async (tf) => {
          try {
            const limit = tfLimitMap[tf] || 500;
            const url = `${baseUrl}/api/ohlcv?symbol=${coin.symbol}&exchange=${exchange}&interval=${tf}&limit=${limit}`;
            const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
            if (!res.ok) return null;
            const json = await res.json();
            let data: OHLCV[] = json.data;
            if (!data || data.length < 30) return null;

            const result = runDYORChecks(data);

            return { tf, result };
          } catch {
            return null;
          }
        });

        const tfResults = await Promise.allSettled(tfPromises);
        
        for (const r of tfResults) {
          if (r.status === 'fulfilled' && r.value) {
            coinResult.timeframes[r.value.tf] = r.value.result;
          }
        }

        // Only include if we got at least some data
        if (Object.keys(coinResult.timeframes).length > 0) {
          processedCount++;
          return coinResult;
        }
        errorCount++;
        return null;
      });

      const batchResults = await Promise.allSettled(batchPromises);
      for (const r of batchResults) {
        if (r.status === 'fulfilled' && r.value) {
          results.push(r.value);
        }
      }

      // Small delay between batches
      if (batchStart + BATCH_SIZE < coins.length) {
        await new Promise(r => setTimeout(r, 150));
      }
    }

    // Cache
    scanCache.set(cacheKey, { data: results, ts: Date.now() });
    if (scanCache.size > 10) {
      const entries = [...scanCache.entries()].sort((a, b) => a[1].ts - b[1].ts);
      for (let i = 0; i < entries.length - 5; i++) scanCache.delete(entries[i][0]);
    }

    return NextResponse.json({
      success: true,
      results,
      processed: processedCount,
      errors: errorCount,
      total: coins.length,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('[DYOR Trend Scanner API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
