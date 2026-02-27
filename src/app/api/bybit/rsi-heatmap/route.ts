import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ─── RSI calculation (Wilder's smoothing) ─── */
function calcRSI(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gainSum += diff;
    else lossSum += Math.abs(diff);
  }
  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/* ─── Timeframe → Bybit interval + required candle count ─── */
function getIntervalConfig(tf: string) {
  switch (tf) {
    case "15m": return { interval: "15", limit: 200, label: "15m" };
    case "1h":  return { interval: "60", limit: 200, label: "1h" };
    case "4h":  return { interval: "240", limit: 200, label: "4h" };
    case "24h": return { interval: "D", limit: 100, label: "24h" };
    case "7d":  return { interval: "W", limit: 52, label: "7d" };
    default:    return { interval: "D", limit: 100, label: "24h" };
  }
}

/* ─── Fetch all USDT spot tickers from Bybit ─── */
async function fetchAllTickers(): Promise<
  { symbol: string; price: number; volume24h: number; turnover24h: number; price24hPcnt: number }[]
> {
  const r = await fetch(
    "https://api.bybit.com/v5/market/tickers?category=spot",
    { headers: { accept: "application/json" }, cache: "no-store" }
  );
  if (!r.ok) throw new Error(`Bybit Tickers: ${r.status}`);
  const raw = await r.json();
  const list = raw?.result?.list ?? [];
  return list
    .filter((t: Record<string, string>) => t.symbol?.endsWith("USDT"))
    .map((t: Record<string, string>) => ({
      symbol: t.symbol,
      price: Number(t.lastPrice) || 0,
      volume24h: Number(t.volume24h) || 0,
      turnover24h: Number(t.turnover24h) || 0,
      price24hPcnt: Math.round((Number(t.price24hPcnt) || 0) * 10000) / 100,
    }))
    .filter((t: { price: number; turnover24h: number }) => t.price > 0 && t.turnover24h > 500);
}

/* ─── Fetch kline closes for one symbol ─── */
async function fetchCloses(
  symbol: string,
  interval: string,
  limit: number
): Promise<number[]> {
  const url = `https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const r = await fetch(url, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!r.ok) return [];
  const raw = await r.json();
  const rows: string[][] = raw?.result?.list ?? [];
  return rows.map((row) => Number(row[4])).reverse();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const ALL_TIMEFRAMES = ["15m", "1h", "4h", "24h", "7d"] as const;

/* ────────────────────────────────────────────────────────── */
/**
 * GET /api/bybit/rsi-heatmap?timeframe=24h&top=200
 * GET /api/bybit/rsi-heatmap?timeframe=all&top=100
 *
 * Returns RSI values for top Bybit spot USDT pairs.
 * Timeframes: 15m | 1h | 4h | 24h | 7d | all
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const timeframe = searchParams.get("timeframe") || "24h";
  const topN = Math.min(300, Math.max(20, Number(searchParams.get("top") || 200)));

  try {
    const tickers = await fetchAllTickers();
    tickers.sort((a, b) => b.turnover24h - a.turnover24h);
    const selected = tickers.slice(0, topN);

    if (timeframe === "all") {
      /* ─── Multi-timeframe: fetch all 5 timeframes per coin ─── */
      const BATCH_SIZE = 3;
      const results: {
        symbol: string;
        name: string;
        price: number;
        volume24h: number;
        turnover24h: number;
        price24hPcnt: number;
        rsi: Record<string, number | null>;
      }[] = [];

      for (let i = 0; i < selected.length; i += BATCH_SIZE) {
        const batch = selected.slice(i, i + BATCH_SIZE);
        const promises = batch.map(async (tk) => {
          try {
            const rsiMap: Record<string, number | null> = {};
            await Promise.all(
              ALL_TIMEFRAMES.map(async (tf) => {
                const { interval, limit } = getIntervalConfig(tf);
                const closes = await fetchCloses(tk.symbol, interval, limit);
                const rsi = calcRSI(closes);
                rsiMap[tf] = rsi !== null ? Math.round(rsi * 100) / 100 : null;
              })
            );
            return {
              symbol: tk.symbol,
              name: tk.symbol.replace(/USDT$/, ""),
              price: tk.price,
              volume24h: tk.volume24h,
              turnover24h: tk.turnover24h,
              price24hPcnt: tk.price24hPcnt,
              rsi: rsiMap,
            };
          } catch {
            return null;
          }
        });
        const batchResults = await Promise.all(promises);
        for (const r of batchResults) {
          if (r) results.push(r);
        }
        if (i + BATCH_SIZE < selected.length) await sleep(150);
      }

      return NextResponse.json(
        { success: true, timeframe: "all", count: results.length, data: results, timestamp: Date.now() },
        { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } }
      );
    }

    /* ─── Single timeframe (backward-compatible) ─── */
    const { interval, limit, label } = getIntervalConfig(timeframe);
    const BATCH_SIZE = 10;
    const results: {
      symbol: string;
      name: string;
      rsi: number;
      price: number;
      volume24h: number;
      turnover24h: number;
      price24hPcnt: number;
    }[] = [];

    for (let i = 0; i < selected.length; i += BATCH_SIZE) {
      const batch = selected.slice(i, i + BATCH_SIZE);
      const promises = batch.map(async (tk) => {
        try {
          const closes = await fetchCloses(tk.symbol, interval, limit);
          const rsi = calcRSI(closes);
          if (rsi !== null) {
            return {
              symbol: tk.symbol,
              name: tk.symbol.replace(/USDT$/, ""),
              rsi: Math.round(rsi * 100) / 100,
              price: tk.price,
              volume24h: tk.volume24h,
              turnover24h: tk.turnover24h,
              price24hPcnt: tk.price24hPcnt,
            };
          }
        } catch {
          // skip
        }
        return null;
      });
      const batchResults = await Promise.all(promises);
      for (const r of batchResults) {
        if (r) results.push(r);
      }
      if (i + BATCH_SIZE < selected.length) await sleep(200);
    }

    return NextResponse.json(
      { success: true, timeframe: label, count: results.length, data: results, timestamp: Date.now() },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
    );
  } catch (e) {
    return NextResponse.json(
      { success: false, error: (e as Error).message, timestamp: Date.now() },
      { status: 500 }
    );
  }
}
