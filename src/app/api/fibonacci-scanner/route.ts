/**
 * 🔢 Fibonacci 0.618 Scanner API Route
 * Scans TOP coins across multiple timeframes for proximity to the 0.618 Fibonacci level
 *
 * GET /api/fibonacci-scanner?exchange=bybit&timeframes=4h,1d,1w&count=100&proximity=5
 */

import { NextRequest, NextResponse } from 'next/server';

// Import scanner engine types inline to avoid bundling issues
// The actual scanning logic is duplicated here for server-side execution

// ─── Types ───

interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

type FibDirection = 'bull' | 'bear';
type ProximityZone = 'AT_LEVEL' | 'APPROACHING' | 'AWAY';
type EMACrossType = 'bullish' | 'bearish' | 'none';

interface FibLevel {
  ratio: number;
  price: number;
  label: string;
}

interface FibScanResult {
  symbol: string;
  name: string;
  timeframe: string;
  direction: FibDirection;
  currentPrice: number;
  fib618Price: number;
  proximityPercent: number;
  zone: ProximityZone;
  swingHigh: number;
  swingLow: number;
  outerHigh: number;
  outerLow: number;
  fibRange: number;
  allLevels: FibLevel[];
  rulerPosition: number;
  r2: number;
  ema20: number;
  ema50: number;
  emaCross: EMACrossType;
  emaCrossRecent: boolean;
  timestamp: number;
  candleTimestamp: number;
}

// ─── TOP 100 Coins (inlined subset) ───

const TOP_COINS: { symbol: string; name: string }[] = [
  { symbol: 'BTCUSDT', name: 'BTC' }, { symbol: 'ETHUSDT', name: 'ETH' },
  { symbol: 'XRPUSDT', name: 'XRP' }, { symbol: 'SOLUSDT', name: 'SOL' },
  { symbol: 'BNBUSDT', name: 'BNB' }, { symbol: 'DOGEUSDT', name: 'DOGE' },
  { symbol: 'SUIUSDT', name: 'SUI' }, { symbol: 'ADAUSDT', name: 'ADA' },
  { symbol: 'TRXUSDT', name: 'TRX' }, { symbol: 'LINKUSDT', name: 'LINK' },
  { symbol: 'AVAXUSDT', name: 'AVAX' }, { symbol: 'XLMUSDT', name: 'XLM' },
  { symbol: 'TONUSDT', name: 'TON' }, { symbol: 'SHIBUSDT', name: 'SHIB' },
  { symbol: 'DOTUSDT', name: 'DOT' }, { symbol: 'HBARUSDT', name: 'HBAR' },
  { symbol: 'BCHUSDT', name: 'BCH' }, { symbol: 'LTCUSDT', name: 'LTC' },
  { symbol: 'UNIUSDT', name: 'UNI' }, { symbol: 'NEARUSDT', name: 'NEAR' },
  { symbol: 'APTUSDT', name: 'APT' }, { symbol: 'ICPUSDT', name: 'ICP' },
  { symbol: 'ETCUSDT', name: 'ETC' }, { symbol: 'RENDERUSDT', name: 'RENDER' },
  { symbol: 'PEPEUSDT', name: 'PEPE' }, { symbol: 'AAVEUSDT', name: 'AAVE' },
  { symbol: 'FETUSDT', name: 'FET' }, { symbol: 'FILUSDT', name: 'FIL' },
  { symbol: 'ATOMUSDT', name: 'ATOM' }, { symbol: 'ARBUSDT', name: 'ARB' },
  { symbol: 'OPUSDT', name: 'OP' }, { symbol: 'MKRUSDT', name: 'MKR' },
  { symbol: 'INJUSDT', name: 'INJ' }, { symbol: 'GRTUSDT', name: 'GRT' },
  { symbol: 'IMXUSDT', name: 'IMX' }, { symbol: 'THETAUSDT', name: 'THETA' },
  { symbol: 'FTMUSDT', name: 'FTM' }, { symbol: 'TIAUSDT', name: 'TIA' },
  { symbol: 'ALGOUSDT', name: 'ALGO' }, { symbol: 'SEIUSDT', name: 'SEI' },
  { symbol: 'FLOWUSDT', name: 'FLOW' }, { symbol: 'MANAUSDT', name: 'MANA' },
  { symbol: 'SANDUSDT', name: 'SAND' }, { symbol: 'AXSUSDT', name: 'AXS' },
  { symbol: 'GALAUSDT', name: 'GALA' }, { symbol: 'APEUSDT', name: 'APE' },
  { symbol: 'CHZUSDT', name: 'CHZ' }, { symbol: 'CRVUSDT', name: 'CRV' },
  { symbol: 'LDOUSDT', name: 'LDO' }, { symbol: 'SNXUSDT', name: 'SNX' },
  { symbol: 'ENAUSDT', name: 'ENA' }, { symbol: 'WLDUSDT', name: 'WLD' },
  { symbol: 'JUPUSDT', name: 'JUP' }, { symbol: 'STXUSDT', name: 'STX' },
  { symbol: 'PENDLEUSDT', name: 'PENDLE' }, { symbol: 'DYDXUSDT', name: 'DYDX' },
  { symbol: 'RUNEUSDT', name: 'RUNE' }, { symbol: 'COMPUSDT', name: 'COMP' },
  { symbol: 'EGLDUSDT', name: 'EGLD' }, { symbol: 'MINAUSDT', name: 'MINA' },
  { symbol: 'CFXUSDT', name: 'CFX' }, { symbol: 'ORCAUSDT', name: 'ORCA' },
  { symbol: 'WUSDT', name: 'W' }, { symbol: 'ENSUSDT', name: 'ENS' },
  { symbol: 'AGIXUSDT', name: 'AGIX' }, { symbol: 'ZETAUSDT', name: 'ZETA' },
  { symbol: 'PYTHUSDT', name: 'PYTH' }, { symbol: 'JASMYUSDT', name: 'JASMY' },
  { symbol: 'IOTAUSDT', name: 'IOTA' }, { symbol: 'ARUSDT', name: 'AR' },
  { symbol: 'ONDOUSDT', name: 'ONDO' }, { symbol: 'STRKUSDT', name: 'STRK' },
  { symbol: 'MATICUSDT', name: 'MATIC' }, { symbol: 'XTZUSDT', name: 'XTZ' },
  { symbol: '1INCHUSDT', name: '1INCH' }, { symbol: 'QNTUSDT', name: 'QNT' },
  { symbol: 'GMXUSDT', name: 'GMX' }, { symbol: 'ZRXUSDT', name: 'ZRX' },
  { symbol: 'KAVAUSDT', name: 'KAVA' }, { symbol: 'LRCUSDT', name: 'LRC' },
  { symbol: 'SUPERUSDT', name: 'SUPER' }, { symbol: 'RVNUSDT', name: 'RVN' },
  { symbol: 'SKLUSDT', name: 'SKL' }, { symbol: 'YFIUSDT', name: 'YFI' },
  { symbol: 'CELOUSDT', name: 'CELO' }, { symbol: 'ANKRUSDT', name: 'ANKR' },
  { symbol: 'BLURUSDT', name: 'BLUR' }, { symbol: 'MAGICUSDT', name: 'MAGIC' },
  { symbol: 'WOOUSDT', name: 'WOO' }, { symbol: 'GTCUSDT', name: 'GTC' },
  { symbol: 'KSMUSDT', name: 'KSM' }, { symbol: 'MASKUSDT', name: 'MASK' },
  { symbol: 'ONEUSDT', name: 'ONE' }, { symbol: 'OCEANUSDT', name: 'OCEAN' },
  { symbol: 'ROSEUSDT', name: 'ROSE' }, { symbol: 'ZECUSDT', name: 'ZEC' },
  { symbol: 'BATUSDT', name: 'BAT' }, { symbol: 'BANDUSDT', name: 'BAND' },
  { symbol: 'DASHUSDT', name: 'DASH' }, { symbol: 'NEOUSDT', name: 'NEO' },
  { symbol: 'WAVESUSDT', name: 'WAVES' }, { symbol: 'ZILUSDT', name: 'ZIL' },
  { symbol: 'IOSTUSDT', name: 'IOST' }, { symbol: 'COTIUSDT', name: 'COTI' },
];

// ─── Scanner Engine (server-side) ───

const LOOKBACK_BY_TF: Record<string, number> = { '1h': 20, '4h': 15, '1d': 10, '1w': 8 };
const FIB_RATIOS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1] as const;

interface PivotPoint { index: number; price: number; }

function detectPivotHighs(data: OHLCV[], lookback: number): PivotPoint[] {
  const pivots: PivotPoint[] = [];
  for (let i = lookback; i < data.length - lookback; i++) {
    let ok = true;
    for (let j = 1; j <= lookback; j++) {
      if (data[i].high <= data[i - j].high || data[i].high <= data[i + j].high) { ok = false; break; }
    }
    if (ok) pivots.push({ index: i, price: data[i].high });
  }
  return pivots;
}

function detectPivotLows(data: OHLCV[], lookback: number): PivotPoint[] {
  const pivots: PivotPoint[] = [];
  for (let i = lookback; i < data.length - lookback; i++) {
    let ok = true;
    for (let j = 1; j <= lookback; j++) {
      if (data[i].low >= data[i - j].low || data[i].low >= data[i + j].low) { ok = false; break; }
    }
    if (ok) pivots.push({ index: i, price: data[i].low });
  }
  return pivots;
}

function calcEMAArray(data: number[], period: number): number[] {
  if (data.length < period) return [];
  const arr: number[] = [];
  const m = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((s, v) => s + v, 0) / period;
  arr.push(ema);
  for (let i = period; i < data.length; i++) { ema = (data[i] - ema) * m + ema; arr.push(ema); }
  return arr;
}

function scanSymbol(ohlcv: OHLCV[], symbol: string, name: string, timeframe: string, maxProx: number): FibScanResult | null {
  const lookback = LOOKBACK_BY_TF[timeframe] ?? 15;
  if (ohlcv.length < lookback * 3) return null;

  const pivotHighs = detectPivotHighs(ohlcv, lookback);
  const pivotLows = detectPivotLows(ohlcv, lookback);
  if (pivotHighs.length === 0 || pivotLows.length === 0) return null;

  const phMap = new Map<number, number>();
  const plMap = new Map<number, number>();
  for (const p of pivotHighs) phMap.set(p.index, p.price);
  for (const p of pivotLows) plMap.set(p.index, p.price);

  let lastPH: PivotPoint | null = null;
  let lastPL: PivotPoint | null = null;
  let outerH = -Infinity, outerL = Infinity;
  let dir: FibDirection = 'bull';

  for (let i = 0; i < ohlcv.length; i++) {
    const bar = ohlcv[i];
    const newPH = phMap.get(i);
    const newPL = plMap.get(i);

    if (newPH !== undefined) { lastPH = { index: i, price: newPH }; outerH = newPH; }
    if (newPL !== undefined) { lastPL = { index: i, price: newPL }; outerL = newPL; }

    if (lastPH && bar.high > outerH) outerH = bar.high;
    if (lastPL && bar.low < outerL) outerL = bar.low;

    if (lastPL && lastPH) {
      if (newPH !== undefined || (lastPL && bar.low < lastPL.price)) dir = 'bear';
      if (newPL !== undefined || (lastPH && bar.high > lastPH.price)) dir = 'bull';
    }
  }

  if (!lastPH || !lastPL || outerH <= outerL) return null;

  const range = outerH - outerL;
  if (range <= 0) return null;

  const allLevels: FibLevel[] = FIB_RATIOS.map(ratio => {
    const price = dir === 'bull' ? outerH - range * ratio : outerL + range * ratio;
    return { ratio, price, label: `${(ratio * 100).toFixed(1)}%` };
  });

  const fib618 = allLevels.find(l => l.ratio === 0.618)!;
  const currentPrice = ohlcv[ohlcv.length - 1].close;
  const proximityPercent = Math.abs(currentPrice - fib618.price) / fib618.price * 100;

  if (proximityPercent > maxProx) return null;

  let zone: ProximityZone = 'AWAY';
  if (proximityPercent <= 2) zone = 'AT_LEVEL';
  else if (proximityPercent <= 5) zone = 'APPROACHING';

  const rulerPosition = Math.max(0, Math.min(1, (currentPrice - outerL) / range));

  // R²
  const si = Math.min(lastPL.index, lastPH.index);
  const ei = Math.max(lastPL.index, lastPH.index);
  const swingSlice = ohlcv.slice(si, ei + 1);
  let r2 = 0;
  if (swingSlice.length >= 3) {
    const n = swingSlice.length;
    const pts = swingSlice.map((d, j) => ({ x: j, y: dir === 'bull' ? d.close : -d.close }));
    let sx = 0, sy = 0, sxy = 0, sx2 = 0;
    for (const { x, y } of pts) { sx += x; sy += y; sxy += x * y; sx2 += x * x; }
    const dn = n * sx2 - sx * sx;
    if (dn !== 0) {
      const slope = (n * sxy - sx * sy) / dn;
      const intercept = (sy - slope * sx) / n;
      const yMean = sy / n;
      let ssTot = 0, ssRes = 0;
      for (const { x, y } of pts) { ssTot += (y - yMean) ** 2; ssRes += (y - (slope * x + intercept)) ** 2; }
      r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
    }
  }

  // EMA
  const closes = ohlcv.map(d => d.close);
  const ema20Arr = calcEMAArray(closes, 20);
  const ema50Arr = calcEMAArray(closes, 50);
  const ema20 = ema20Arr.length > 0 ? ema20Arr[ema20Arr.length - 1] : 0;
  const ema50 = ema50Arr.length > 0 ? ema50Arr[ema50Arr.length - 1] : 0;

  let emaCross: EMACrossType = 'none';
  if (ema20 > 0 && ema50 > 0) emaCross = ema20 > ema50 ? 'bullish' : 'bearish';

  let emaCrossRecent = false;
  if (ema20Arr.length >= 5 && ema50Arr.length >= 5) {
    for (let k = 1; k <= 5; k++) {
      const p20 = ema20Arr[ema20Arr.length - 1 - k];
      const p50 = ema50Arr[ema50Arr.length - 1 - k];
      const c20 = ema20Arr[ema20Arr.length - k];
      const c50 = ema50Arr[ema50Arr.length - k];
      if ((p20 - p50) * (c20 - c50) < 0) { emaCrossRecent = true; break; }
    }
  }

  return {
    symbol, name, timeframe, direction: dir, currentPrice,
    fib618Price: Math.round(fib618.price * 10000) / 10000,
    proximityPercent: Math.round(proximityPercent * 100) / 100,
    zone, swingHigh: lastPH.price, swingLow: lastPL.price,
    outerHigh: outerH, outerLow: outerL, fibRange: range,
    allLevels, rulerPosition: Math.round(rulerPosition * 1000) / 1000,
    r2: Math.round(r2 * 1000) / 1000,
    ema20: Math.round(ema20 * 100) / 100, ema50: Math.round(ema50 * 100) / 100,
    emaCross, emaCrossRecent,
    timestamp: Date.now(), candleTimestamp: ohlcv[ohlcv.length - 1].timestamp,
  };
}

// ─── Cache ───

const scanCache = new Map<string, { data: FibScanResult[]; ts: number }>();
const CACHE_TTL = 120_000; // 2 minutes

// ─── GET Handler ───

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const exchange = (searchParams.get('exchange') || 'bybit').toLowerCase();
    const timeframesParam = searchParams.get('timeframes') || '4h,1d,1w';
    const count = Math.min(parseInt(searchParams.get('count') || '100'), 200);
    const maxProximity = parseFloat(searchParams.get('proximity') || '5');

    const timeframes = timeframesParam.split(',').map(t => t.trim()).filter(Boolean);
    const coins = TOP_COINS.slice(0, count);

    // Cache check
    const cacheKey = `fib-${exchange}-${timeframes.join(',')}-${count}-${maxProximity}`;
    const cached = scanCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return NextResponse.json({
        success: true,
        results: cached.data,
        summary: buildSummary(cached.data, coins.length, timeframes.length),
        cached: true,
        timestamp: cached.ts,
      });
    }

    // Fetch OHLCV and scan
    const allResults: FibScanResult[] = [];
    let scannedCount = 0;
    let errorCount = 0;

    // Process in batches of 10 coins
    const BATCH_SIZE = 10;
    for (let batchStart = 0; batchStart < coins.length; batchStart += BATCH_SIZE) {
      const batch = coins.slice(batchStart, batchStart + BATCH_SIZE);

      // For each timeframe, fetch all symbols in this batch in parallel
      for (const tf of timeframes) {
        const promises = batch.map(async (coin) => {
          try {
            const baseUrl = new URL(request.url).origin;
            const url = `${baseUrl}/api/ohlcv?symbol=${coin.symbol}&exchange=${exchange}&interval=${tf}&limit=200`;
            const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
            if (!res.ok) { errorCount++; return; }
            const json = await res.json();
            const data: OHLCV[] = json.data;
            if (!data || data.length < 60) { errorCount++; return; }

            scannedCount++;
            const result = scanSymbol(data, coin.symbol, coin.name, tf, maxProximity);
            if (result) allResults.push(result);
          } catch {
            errorCount++;
          }
        });

        await Promise.allSettled(promises);
      }

      // Small delay between batches to avoid rate limits
      if (batchStart + BATCH_SIZE < coins.length) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    // Sort: AT_LEVEL first, then APPROACHING, then by proximity ascending
    allResults.sort((a, b) => {
      const zonePriority = { AT_LEVEL: 0, APPROACHING: 1, AWAY: 2 };
      const zDiff = zonePriority[a.zone] - zonePriority[b.zone];
      if (zDiff !== 0) return zDiff;
      return a.proximityPercent - b.proximityPercent;
    });

    // Cache results
    scanCache.set(cacheKey, { data: allResults, ts: Date.now() });

    // Cleanup old cache
    if (scanCache.size > 20) {
      const entries = [...scanCache.entries()].sort((a, b) => a[1].ts - b[1].ts);
      for (let i = 0; i < entries.length - 10; i++) scanCache.delete(entries[i][0]);
    }

    return NextResponse.json({
      success: true,
      results: allResults,
      summary: buildSummary(allResults, scannedCount, timeframes.length),
      errors: errorCount,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('[Fibonacci Scanner API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

function buildSummary(results: FibScanResult[], scanned: number, tfCount: number) {
  return {
    totalCoins: TOP_COINS.length,
    scanned,
    timeframes: tfCount,
    found: results.length,
    atLevel: results.filter(r => r.zone === 'AT_LEVEL').length,
    approaching: results.filter(r => r.zone === 'APPROACHING').length,
    bullish: results.filter(r => r.direction === 'bull').length,
    bearish: results.filter(r => r.direction === 'bear').length,
  };
}
