import { NextRequest, NextResponse } from 'next/server';

/**
 * Pattern Scanner API Proxy
 * Proxies requests to Python FastAPI backend
 */

const PYTHON_API = process.env.PYTHON_API_URL || 'http://127.0.0.1:8001';

type CandleTuple = [number, number, number, number, number, number];

interface PythonTrendlineCoord {
  x?: number;
  y?: number;
  time?: number;
}

interface PythonTrendline {
  type?: string;
  quality?: number;
  touches?: number[];
  coords?: {
    start?: PythonTrendlineCoord;
    end?: PythonTrendlineCoord;
  };
}

interface PythonKeyPoint {
  x?: number;
  y?: number;
  time?: number;
  label?: string;
}

interface PythonZone {
  price?: unknown;
  touches?: unknown;
  [key: string]: unknown;
}

interface PythonPattern {
  name?: string;
  category?: string;
  type?: string;
  confidence?: number;
  strength?: string;
  formation_time?: number;
  breakout_target?: number | null;
  stop_loss?: number | null;
  lines?: unknown;
  pivot_highs?: [number, number][];
  pivot_lows?: [number, number][];
  scores?: Record<string, number>;
  rendering_coords?: unknown;
  symbol?: string;
  timeframe?: string;
  entry?: number;
  entry_price?: number;
  target?: number;
  target_price?: number;
  targetPrice?: number;
  stopLoss?: number;
  riskReward?: number;
  risk_reward?: number;
  startIndex?: number;
  endIndex?: number;
  trendlines?: PythonTrendline[];
  zones?: PythonZone[];
  keyPoints?: PythonKeyPoint[];
  key_points?: PythonKeyPoint[];
  volumeConfirmation?: boolean;
  volume_confirmation?: boolean;
  completion?: number;
  completion_percentage?: number;
  [key: string]: unknown;
}

interface ScanProxyRequestBody {
  ohlcv?: CandleTuple[];
  [key: string]: unknown;
}

interface PythonScanResponse {
  patterns?: PythonPattern[];
  [key: string]: unknown;
}

interface AdaptedPattern extends PythonPattern {
  name: string;
  category: string;
  type: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  strength: 'strong' | 'medium' | 'weak';
  formation_time: number;
  breakout_target: number | null;
  stop_loss: number | null;
  lines: TrendLine[];
  pivot_highs: [number, number][];
  pivot_lows: [number, number][];
  scores?: Record<string, number>;
  rendering_coords: unknown;
  symbol?: string;
  timeframe?: string;
  entry_price?: number;
  target_price?: number;
  risk_reward?: number;
  volume_confirmation?: boolean;
  completion?: number;
  raw_pattern?: Record<string, unknown>;
}

interface TrendLine {
  slope: number;
  intercept: number;
  touches: number[];
  quality_score: number;
  coords: [{ xAxis: number; yAxis: number }, { xAxis: number; yAxis: number }];
}

interface PatternConversionContext {
  startIndex: number;
  endIndex: number;
  maxIndex: number;
  timestampIndex: Map<number, number>;
  candles: CandleTuple[];
}

const normalizeNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const clampIndex = (value: number | undefined, maxIndex: number): number => {
  if (value === undefined || Number.isNaN(value)) return 0;
  const max = Math.max(0, maxIndex);
  return Math.min(Math.max(Math.round(value), 0), max);
};

const normalizeType = (value: unknown): 'bullish' | 'bearish' | 'neutral' => {
  const val = typeof value === 'string' ? value.toLowerCase() : '';
  if (val === 'bullish' || val === 'bearish' || val === 'neutral') {
    return val;
  }
  return 'neutral';
};

const normalizeStrength = (value: unknown): 'strong' | 'medium' | 'weak' => {
  const val = typeof value === 'string' ? value.toLowerCase() : '';
  if (val === 'strong') return 'strong';
  if (val === 'medium') return 'medium';
  if (val === 'moderate') return 'medium';
  if (val === 'weak') return 'weak';
  return 'weak';
};

const normalizeCategory = (pattern: PythonPattern | undefined): string => {
  const rawCategory = (pattern?.category ?? '').toString().trim();
  const cat = rawCategory.toLowerCase();
  const name = (pattern?.name ?? '').toString().trim().toLowerCase();

  // Finer-grained categories derived from pattern names
  if (name.includes('pennant')) return 'pennants';
  if (name.includes('broadening')) return 'broadening';
  if (name.includes('continuation') && name.includes('wedge')) return 'continuation-wedges';
  if (name.includes('reversal') && name.includes('wedge')) return 'reversal-wedges';

  if (name.includes('liquidity pool')) return 'liquidity-pools';
  if (name.includes('liquidity sweep')) return 'liquidity-sweeps';

  // Basic normalization of python snake_case -> kebab-case
  if (cat) return cat.replace(/_/g, '-');
  return 'general';
};

const buildTimestampIndex = (candles: CandleTuple[]): Map<number, number> => {
  const map = new Map<number, number>();
  candles.forEach((candle, idx) => {
    if (!Array.isArray(candle)) return;
    const ts = normalizeNumber(candle[0]);
    if (ts === undefined) return;
    map.set(ts, idx);
    if (ts >= 1e12) {
      map.set(Math.floor(ts / 1000), idx);
    } else {
      map.set(ts * 1000, idx);
    }
  });
  return map;
};

const resolveIndexByTime = (timeValue: unknown, ctx: PatternConversionContext): number | undefined => {
  const time = normalizeNumber(timeValue);
  if (time === undefined) return undefined;
  if (ctx.timestampIndex.has(time)) {
    return ctx.timestampIndex.get(time);
  }
  if (time < 1e12) {
    const ms = time * 1000;
    return ctx.timestampIndex.get(ms);
  }
  const seconds = Math.floor(time / 1000);
  return ctx.timestampIndex.get(seconds);
};

const resolveCoord = (coord: PythonTrendlineCoord | undefined, ctx: PatternConversionContext): { x: number; y: number } | null => {
  if (!coord) return null;
  const idxFromTime = resolveIndexByTime(coord.time, ctx);
  let x = idxFromTime;
  if (x === undefined) {
    const rawX = normalizeNumber(coord.x);
    if (rawX === undefined) return null;
    const looksRelative = ctx.startIndex > 0 && rawX < ctx.startIndex;
    x = looksRelative ? rawX + ctx.startIndex : rawX;
  }
  const y = normalizeNumber(coord.y);
  if (y === undefined) return null;
  return {
    x: clampIndex(x, ctx.maxIndex),
    y,
  };
};

const adaptTrendlines = (trendlines: PythonTrendline[] | undefined, ctx: PatternConversionContext): TrendLine[] => {
  if (!Array.isArray(trendlines)) return [];
  return trendlines
    .map((line) => {
      const coords = line?.coords;
      if (!coords) return null;
      const start = resolveCoord(coords.start, ctx);
      const end = resolveCoord(coords.end, ctx);
      if (!start || !end) return null;
      if (start.x === end.x) return null;
      const slope = (end.y - start.y) / ((end.x - start.x) || 1);
      const intercept = start.y - slope * start.x;
      return {
        slope,
        intercept,
        touches: Array.isArray(line?.touches) ? line.touches : [],
        quality_score: normalizeNumber(line?.quality) ?? 0,
        coords: [
          { xAxis: start.x, yAxis: start.y },
          { xAxis: end.x, yAxis: end.y },
        ],
      };
    })
    .filter((line): line is TrendLine => Boolean(line));
};

const adaptZones = (zones: PythonZone[] | undefined, pattern: PythonPattern, ctx: PatternConversionContext): TrendLine[] => {
  if (!Array.isArray(zones) || zones.length === 0) return [];
  
  const startIdx = normalizeNumber(pattern?.startIndex) ?? 0;
  const endIdx = normalizeNumber(pattern?.endIndex) ?? ctx.maxIndex;
  
  return zones
    .map((zone) => {
      const price = normalizeNumber(zone?.price);
      if (price === undefined) return null;
      
      const clampedStart = clampIndex(startIdx, ctx.maxIndex);
      const clampedEnd = clampIndex(endIdx, ctx.maxIndex);
      
      return {
        slope: 0,
        intercept: price,
        touches: [] as number[],
        quality_score: normalizeNumber(zone?.touches) ?? 0,
        coords: [
          { xAxis: clampedStart, yAxis: price },
          { xAxis: clampedEnd, yAxis: price },
        ] as [{ xAxis: number; yAxis: number }, { xAxis: number; yAxis: number }],
      };
    })
    .filter((line): line is TrendLine => Boolean(line));
};

const adaptKeyPoints = (keyPoints: PythonKeyPoint[] | undefined, ctx: PatternConversionContext) => {
  const pivotHighs: [number, number][] = [];
  const pivotLows: [number, number][] = [];

  if (!Array.isArray(keyPoints)) return { pivotHighs, pivotLows };

  keyPoints.forEach((point) => {
    const idx = resolveIndexByTime(point?.time, ctx) ?? (() => {
      const rawX = normalizeNumber(point?.x);
      if (rawX === undefined) return undefined;
      const looksRelative = ctx.startIndex > 0 && rawX < ctx.startIndex;
      const adjusted = looksRelative ? rawX + ctx.startIndex : rawX;
      return clampIndex(adjusted, ctx.maxIndex);
    })();

    if (idx === undefined) return;

    const price = normalizeNumber(point?.y);
    if (price === undefined) return;
    const candle = ctx.candles[idx];
    const high = normalizeNumber(candle?.[2]);
    const low = normalizeNumber(candle?.[3]);

    if (high === undefined || low === undefined) {
      pivotHighs.push([idx, price]);
      return;
    }

    const distHigh = Math.abs(price - high);
    const distLow = Math.abs(price - low);
    if (distHigh <= distLow) {
      pivotHighs.push([idx, price]);
    } else {
      pivotLows.push([idx, price]);
    }
  });

  return { pivotHighs, pivotLows };
};

const adaptPattern = (
  pattern: PythonPattern,
  ctx: PatternConversionContext
): AdaptedPattern => {
  const rawStart = normalizeNumber(pattern?.startIndex) ?? 0;
  const rawEndExclusive = normalizeNumber(pattern?.endIndex);
  const startIndex = clampIndex(rawStart, ctx.maxIndex);
  const inclusiveEnd = (() => {
    if (rawEndExclusive === undefined) return startIndex;
    const inclusive = rawEndExclusive - 1;
    const clamped = clampIndex(Math.max(inclusive, startIndex), ctx.maxIndex);
    return clamped;
  })();

  const localCtx: PatternConversionContext = {
    ...ctx,
    startIndex,
    endIndex: inclusiveEnd,
  };

  const trendlinesFromLines = adaptTrendlines(pattern?.trendlines, localCtx);
  const trendlinesFromZones = adaptZones(pattern?.zones, pattern, localCtx);
  const lines = [...trendlinesFromLines, ...trendlinesFromZones];
  const { pivotHighs, pivotLows } = adaptKeyPoints(pattern?.keyPoints ?? pattern?.key_points, localCtx);

  const formation = Math.max(0, inclusiveEnd - startIndex + 1);

  const breakoutTarget = normalizeNumber(pattern?.target) ??
    normalizeNumber(pattern?.target_price) ??
    normalizeNumber(pattern?.targetPrice) ?? null;

  const stopLoss = normalizeNumber(pattern?.stopLoss) ??
    normalizeNumber(pattern?.stop_loss) ?? null;

  const adapted: AdaptedPattern = {
    ...pattern,
    name: pattern?.name ?? 'Unknown Pattern',
    category: normalizeCategory(pattern),
    type: normalizeType(pattern?.type),
    confidence: normalizeNumber(pattern?.confidence) ?? 0,
    strength: normalizeStrength(pattern?.strength),
    formation_time: formation,
    breakout_target: breakoutTarget,
    stop_loss: stopLoss,
    lines,
    pivot_highs: pivotHighs,
    pivot_lows: pivotLows,
    scores: pattern?.scores,
    rendering_coords: pattern?.trendlines ?? null,
    entry_price: normalizeNumber(pattern?.entry) ?? normalizeNumber(pattern?.entry_price),
    target_price: breakoutTarget ?? undefined,
    risk_reward: normalizeNumber(pattern?.riskReward) ?? normalizeNumber(pattern?.risk_reward),
    volume_confirmation: Boolean(pattern?.volumeConfirmation ?? pattern?.volume_confirmation),
    completion: normalizeNumber(pattern?.completion) ?? normalizeNumber(pattern?.completion_percentage),
    raw_pattern: pattern,
  };

  return adapted;
};

const adaptScanResponse = (data: PythonScanResponse, requestBody: ScanProxyRequestBody): PythonScanResponse => {
  if (!data || !Array.isArray(data.patterns)) {
    return data;
  }

  const candles: CandleTuple[] = Array.isArray(requestBody?.ohlcv)
    ? requestBody.ohlcv
    : [];

  const timestampIndex = buildTimestampIndex(candles);
  const ctx: PatternConversionContext = {
    startIndex: 0,
    endIndex: candles.length ? candles.length - 1 : 0,
    maxIndex: Math.max(0, candles.length - 1),
    timestampIndex,
    candles,
  };

  return {
    ...data,
    patterns: data.patterns.map((pattern) => adaptPattern(pattern, ctx)),
  };
};

function toErrorString(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  return String(err);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Basic validation to avoid proxying obviously bad requests
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const controller = new AbortController();
    const timeoutMs = 20_000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    
    let response: Response;
    try {
      response = await fetch(`${PYTHON_API}/patterns/scan-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      const details = toErrorString(err);
      const isAbort = details.toLowerCase().includes('aborted');
      const hint = 'Start the Python server: python python_analysis/run_server.py (default port 8001)';
      return NextResponse.json(
        {
          error: 'Pattern analysis server is not available',
          details,
          pythonApi: PYTHON_API,
          hint,
          kind: isAbort ? 'timeout' : 'network',
        },
        { status: 503 }
      );
    } finally {
      clearTimeout(timeout);
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: 'Pattern scanning failed',
          details: errorText,
          pythonApi: PYTHON_API,
          pythonStatus: response.status,
        },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    const adapted = adaptScanResponse(data, body);
    return NextResponse.json(adapted);
    
  } catch (error) {
    console.error('Pattern scan proxy error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process scan request',
        details: toErrorString(error),
        pythonApi: PYTHON_API,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const response = await fetch(`${PYTHON_API}/patterns/categories`);
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch categories' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Pattern categories fetch error:', error);
    return NextResponse.json(
      {
        error: 'Failed to connect to pattern scanner',
        details: toErrorString(error),
      },
      { status: 500 }
    );
  }
}
