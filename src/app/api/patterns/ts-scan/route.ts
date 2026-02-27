import { NextRequest, NextResponse } from 'next/server';
import {
  detectAllPatterns,
  getPatternInfo,
  OHLCV,
  PatternResult as TSPatternResult,
  isSupportedPatternId,
  TrendLine
} from '@/lib/indicators/chart-patterns';

/**
 * TypeScript Pattern Scanner API
 * يستخدم مكتبة كشف النماذج المحلية بدلاً من Python backend
 */

type CandleTuple = [number, number, number, number, number, number];

// Pattern analysis window settings
const CANDLE_WINDOW = 70;          // تحليل آخر 70 شمعة فقط
const PATTERN_MAX_AGE = 150;       // النموذج يختفي بعد 150 شمعة
const MIN_PATTERN_BARS = 10;       // النماذج أقل من 10 شمعات لا ترسم

// ✅ نظام الـ Caching لتجنب إعادة المسح
const CACHE_TTL = 60 * 1000; // 60 ثانية
interface CacheEntry {
  patterns: AdaptedPattern[];
  timestamp: number;
  lastCandleTime: number;
}
const patternCache = new Map<string, CacheEntry>();

function getCacheKey(symbol: string, timeframe: string): string {
  return `${symbol}:${timeframe}`;
}

function getFromCache(symbol: string, timeframe: string, lastCandleTime: number): AdaptedPattern[] | null {
  const key = getCacheKey(symbol, timeframe);
  const entry = patternCache.get(key);
  
  if (!entry) return null;
  
  // تحقق من صلاحية الـ cache (نفس الشمعة الأخيرة ولم يمر وقت طويل)
  const isExpired = Date.now() - entry.timestamp > CACHE_TTL;
  const isSameData = entry.lastCandleTime === lastCandleTime;
  
  if (!isExpired && isSameData) {
    return entry.patterns;
  }
  
  return null;
}

function saveToCache(symbol: string, timeframe: string, patterns: AdaptedPattern[], lastCandleTime: number): void {
  const key = getCacheKey(symbol, timeframe);
  patternCache.set(key, {
    patterns,
    timestamp: Date.now(),
    lastCandleTime
  });
  
  // تنظيف الـ cache القديم (حد أقصى 500 مدخل)
  if (patternCache.size > 500) {
    const oldestKey = patternCache.keys().next().value;
    if (oldestKey) patternCache.delete(oldestKey);
  }
}

interface RequestBody {
  symbol?: string;
  timeframe?: string;
  ohlcv?: CandleTuple[];
  minConfidence?: number;
}

interface AdaptedPattern {
  id: string;
  name: string;
  nameAr: string;
  category: string;
  type: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  strength: 'strong' | 'medium' | 'weak';
  symbol?: string;
  timeframe?: string;
  formation_time: number;
  breakout_target: number | null;
  stop_loss: number | null;
  entry_price: number | null;
  target_price: number | null;
  risk_reward: number;
  pattern_height: number;
  lines: Array<{
    slope: number;
    intercept: number;
    touches: number[];
    quality_score: number;
    coords: [{ xAxis: number; yAxis: number }, { xAxis: number; yAxis: number }];
  }>;
  pivot_highs: [number, number][];
  pivot_lows: [number, number][];
  startIndex: number;
  endIndex: number;
  description: string;
  volume_confirmation: boolean;
  rendering_coords: unknown;
  scores?: {
    line_quality: number;
    geometric: number;
    volume: number;
    position: number;
    context: number;
  };
}

function convertOHLCV(tuples: CandleTuple[]): OHLCV[] {
  return tuples.map(([timestamp, open, high, low, close, volume]) => ({
    timestamp: timestamp,
    open,
    high,
    low,
    close,
    volume
  }));
}

function getPatternCategory(patternType: string): string {
  // تصنيف النماذج حسب الفئة
  if (patternType.includes('triangle')) return 'triangles';
  if (patternType.includes('channel')) return 'channels';
  if (patternType.includes('flag')) return 'flags';
  if (patternType.includes('pennant')) return 'pennants';
  if (patternType.includes('wedge')) return 'wedges';
  if (patternType.includes('double') || patternType.includes('triple')) return 'double_triple';
  if (patternType.includes('rectangle')) return 'ranges';
  return 'other';
}

function getStrength(confidence: number): 'strong' | 'medium' | 'weak' {
  if (confidence >= 75) return 'strong';
  if (confidence >= 55) return 'medium';
  return 'weak';
}

function adaptPattern(
  result: TSPatternResult,
  symbol?: string,
  timeframe?: string,
  ohlcv?: OHLCV[]
): AdaptedPattern {
  const info = getPatternInfo((result as any).type as any);
  
  // تحويل نقاط الرسم إلى خطوط متوافقة مع PatternResult
  const lines: AdaptedPattern['lines'] = [];
  const pivot_highs: [number, number][] = [];
  const pivot_lows: [number, number][] = [];

  const maxIdx = Math.max(0, (ohlcv?.length ?? 0) - 1);
  const clampIdx = (x: number) => Math.min(Math.max(Math.round(x), 0), maxIdx);

  // ✅ بناء خريطة من timestamp إلى index
  const timeToIndex = new Map<number, number>();
  ohlcv?.forEach((candle, idx) => {
    timeToIndex.set((candle as any).timestamp ?? (candle as any).time, idx);
  });

  // ✅ دالة للبحث عن أقرب index لـ timestamp
  const findIndexForTime = (time: number): number => {
    // إذا كان الـ time موجود في الخريطة، أرجع الـ index مباشرة
    if (timeToIndex.has(time)) return timeToIndex.get(time)!;
    
    // إذا كان الـ time قيمة صغيرة (index وليس timestamp)، استخدمه مباشرة
    if (time >= 0 && time <= maxIdx) return clampIdx(time);
    
    // البحث عن أقرب timestamp في البيانات
    let closestIdx = 0;
    let closestDiff = Infinity;
    ohlcv?.forEach((candle, idx) => {
      const diff = Math.abs(((candle as any).timestamp ?? (candle as any).time) - time);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIdx = idx;
      }
    });
    return closestIdx;
  };

  // Convert TrendLine objects (from DetectedPattern) into rendering points and internal line representation
  const getPointsFromTrendLine = (t?: TrendLine | null) => {
    if (!t) return [] as Array<{ time: number; price: number }>;
    const x1 = clampIdx(t.startIdx);
    const x2 = clampIdx(t.endIdx);
    const pts: Array<{ time: number; price: number }> = [];
    const addPointFromIdx = (idx: number, priceOverride?: number) => {
      const clamped = clampIdx(idx);
      pts.push({ time: (ohlcv?.[clamped] as any)?.timestamp ?? clamped, price: priceOverride ?? t.startPrice ?? (ohlcv?.[clamped]?.close ?? 0) });
    };

    addPointFromIdx(t.startIdx, t.startPrice);
    if (Array.isArray(t.touchPoints) && t.touchPoints.length) {
      t.touchPoints.forEach((idx, i) => {
        const price = Array.isArray(t.touchPrices) ? (t.touchPrices[i] ?? (ohlcv?.[idx]?.close ?? 0)) : (ohlcv?.[idx]?.close ?? 0);
        pts.push({ time: (ohlcv?.[idx] as any)?.timestamp ?? idx, price });
      });
    }
    addPointFromIdx(t.endIdx, t.endPrice);
    return pts;
  };

  const addLineFromTrendLine = (
    t?: TrendLine | null,
    kind: 'upperLine' | 'lowerLine' | 'neckLine' | 'targetLine' | 'stopLossLine' = 'upperLine'
  ) => {
    const points = getPointsFromTrendLine(t);
    if (!Array.isArray(points) || points.length < 2) return;

    const x1 = findIndexForTime(points[0].time);
    const x2 = findIndexForTime(points[points.length - 1].time);
    if (x1 === x2) return;

    const y1 = points[0].price;
    const y2 = points[points.length - 1].price;
    const slope = (y2 - y1) / ((x2 - x1) || 1);

    lines.push({
      slope,
      intercept: y1 - slope * x1,
      touches: (t?.touchPoints ?? []),
      quality_score: result.confidence / 100,
      coords: [
        { xAxis: x1, yAxis: y1 },
        { xAxis: x2, yAxis: y2 },
      ],
    });

    if (kind === 'upperLine') {
      points.forEach((p) => pivot_highs.push([findIndexForTime(p.time), p.price]));
    }
    if (kind === 'lowerLine') {
      points.forEach((p) => pivot_lows.push([findIndexForTime(p.time), p.price]));
    }
  };

  // Use TrendLine objects exposed on DetectedPattern
  addLineFromTrendLine((result as any).upperLine, 'upperLine');
  addLineFromTrendLine((result as any).lowerLine, 'lowerLine');
  addLineFromTrendLine((result as any).middleLine, 'neckLine');

  // If the detector provides a targetPrice, add a horizontal target line
  if (typeof (result as any).targetPrice === 'number') {
    const x1 = clampIdx(result.startIdx);
    const x2 = clampIdx(result.endIdx ?? maxIdx);
    const target = (result as any).targetPrice;
    lines.push({
      slope: 0,
      intercept: target,
      touches: [],
      quality_score: result.confidence / 100,
      coords: [
        { xAxis: x1, yAxis: target },
        { xAxis: x2, yAxis: target }
      ]
    });
  }

  // Formation in bars (consistent with DetectedPattern naming)
  const formationTime = Math.max(0, result.endIdx - result.startIdx + 1);

  // تجميع نقاط الرسم للرندر (من TrendLine objects)
  const rendering_coords = {
    upperLine: getPointsFromTrendLine((result as any).upperLine),
    lowerLine: getPointsFromTrendLine((result as any).lowerLine),
    neckLine: getPointsFromTrendLine((result as any).middleLine),
    targetLine: typeof (result as any).targetPrice === 'number' ? [
      { time: (ohlcv?.[clampIdx(result.startIdx)] as any)?.timestamp ?? result.startIdx, price: (result as any).targetPrice },
      { time: (ohlcv?.[clampIdx(result.endIdx ?? maxIdx)] as any)?.timestamp ?? (result as any).targetPrice, price: (result as any).targetPrice }
    ] : [],
    stopLossLine: [],
    peaks: pivot_highs,
    troughs: pivot_lows
  };

  // Compute pattern height when possible (max high - min low in range)
  let patternHeight = 0;
  try {
    if (typeof result.startIdx === 'number' && typeof result.endIdx === 'number' && ohlcv && ohlcv.length) {
      const s = clampIdx(result.startIdx);
      const e = clampIdx(result.endIdx);
      const slice = ohlcv.slice(Math.min(s, e), Math.max(s, e) + 1);
      const highs = slice.map(c => c.high);
      const lows = slice.map(c => c.low);
      patternHeight = (Math.max(...highs) - Math.min(...lows)) || 0;
    }
  } catch (err) {
    patternHeight = 0;
  }

  return {
    id: `${(result as any).type}:${symbol ?? ''}:${timeframe ?? ''}:${result.startIdx}:${result.endIdx}`,
    name: info.name,
    nameAr: info.nameAr,
    category: getPatternCategory((result as any).type),
    type: ((result as any).breakoutDirection === 'up') ? 'bullish' : ((result as any).breakoutDirection === 'down') ? 'bearish' : 'neutral',
    confidence: Math.round(result.confidence),
    strength: getStrength(result.confidence),
    symbol,
    timeframe,
    formation_time: formationTime,
    breakout_target: (result as any).targetPrice ?? null,
    stop_loss: null,
    entry_price: null,
    target_price: (result as any).targetPrice ?? null,
    risk_reward: 0,
    pattern_height: patternHeight,
    lines,
    pivot_highs,
    pivot_lows,
    startIndex: result.startIdx,
    endIndex: result.endIdx,
    description: result.description ?? '',
    volume_confirmation: (result as any).volumeConfirmation?.declining ?? false,
    rendering_coords,
    scores: {
      line_quality: result.qualityScore ? 1 : result.confidence / 100,
      geometric: result.confidence / 100,
      volume: (result as any).volumeConfirmation?.declining ? 0.8 : 0.5,
      position: 0.7,
      context: 0.7
    }
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { symbol, timeframe, ohlcv, minConfidence = 0 } = body;

    if (!ohlcv || !Array.isArray(ohlcv) || ohlcv.length < 20) {
      return NextResponse.json(
        { error: 'Insufficient OHLCV data', details: 'Need at least 20 candles' },
        { status: 400 }
      );
    }

    // Enforce window (200 candles) so scan & render indices match.
    const windowed = ohlcv.slice(-CANDLE_WINDOW);
    const convertedOHLCV = convertOHLCV(windowed);
    const lastCandleTime = (convertedOHLCV[convertedOHLCV.length - 1] as any)?.timestamp ?? (convertedOHLCV[convertedOHLCV.length - 1] as any)?.time ?? 0;

    // ✅ تحقق من الـ cache أولاً
    if (symbol && timeframe) {
      const cached = getFromCache(symbol, timeframe, lastCandleTime);
      if (cached) {
        console.log(`[TS-Scan] ✅ Cache HIT for ${symbol}:${timeframe} (${cached.length} patterns)`);
        return NextResponse.json({
          success: true,
          patterns: cached,
          stats: {
            total: cached.length,
            bullish: cached.filter(p => p.type === 'bullish').length,
            bearish: cached.filter(p => p.type === 'bearish').length,
            neutral: cached.filter(p => p.type === 'neutral').length
          },
          engine: 'typescript',
          cached: true,
          timestamp: Date.now()
        });
      }
    }

    // كشف جميع النماذج
    const detectedPatterns = detectAllPatterns(convertedOHLCV, {
      minConfidence
    });

    console.log('[TS-Scan] Symbol:', symbol, 'Timeframe:', timeframe);
    console.log('[TS-Scan] OHLCV length:', convertedOHLCV.length);
    console.log('[TS-Scan] Raw detected patterns:', detectedPatterns.length);
    detectedPatterns.slice(0, 5).forEach(p => {
        console.log(`  - ${p.type}: confidence=${p.confidence}`);
      console.log(`    upperLine/lowerLine:`, JSON.stringify({ upper: (p as any).upperLine ?? null, lower: (p as any).lowerLine ?? null }).slice(0, 200));
    });

    // تحويل النتائج للتنسيق المطلوب
    const afterSupported = detectedPatterns.filter((p) => isSupportedPatternId((p as any).type));
    console.log('[TS-Scan] After isSupportedPatternId:', afterSupported.length);

    const adapted = afterSupported.map((p) => adaptPattern(p, symbol, timeframe, convertedOHLCV));
    console.log('[TS-Scan] After adaptPattern:', adapted.length);
    adapted.slice(0, 3).forEach(p => {
      console.log(`  - ${p.id}: lines.length=${p.lines?.length}, lines=`, JSON.stringify(p.lines).slice(0, 300));
    });

    // مؤقتاً: تعطيل الفلاتر الصارمة للتشخيص
    const afterDrawable = adapted.filter((p) => {
      const hasLines = Array.isArray(p.lines) && p.lines.length > 0;
      if (!hasLines) console.log(`  [FILTERED by noLines] ${p.id}`);
      return hasLines;
    });
    console.log('[TS-Scan] After hasDrawableLines (local):', afterDrawable.length);

    const adaptedPatterns = afterDrawable.filter((p) => {
      const passes = (p.confidence >= 50) && (Array.isArray(p.lines) && p.lines.length > 0);
      if (!passes) console.log(`  [FILTERED by confidence/overlay] ${p.id}`);
      return passes;
    });
    console.log('[TS-Scan] After passesMediumOverlayGate (local):', adaptedPatterns.length);

    // Filter by pattern bars (minimum 10 candles)
    const afterMinBars = adaptedPatterns.filter((p) => {
      // Use formation_time if available, otherwise calculate from indices (+1 for inclusive)
      const patternBars = p.formation_time ?? ((p.endIndex ?? 0) - (p.startIndex ?? 0) + 1);
      if (patternBars < MIN_PATTERN_BARS) {
        console.log(`  [FILTERED by MIN_PATTERN_BARS] ${p.id} - bars: ${patternBars}`);
        return false;
      }
      return true;
    });
    console.log('[TS-Scan] After MIN_PATTERN_BARS filter:', afterMinBars.length);

    // Filter by pattern age (disappear after 150 candles from end)
    const candleCount = convertedOHLCV.length;
    const afterMaxAge = afterMinBars.filter((p) => {
      const endIndex = p.endIndex ?? candleCount - 1;
      const age = candleCount - 1 - endIndex;
      if (age > PATTERN_MAX_AGE) {
        console.log(`  [FILTERED by PATTERN_MAX_AGE] ${p.id} - age: ${age}`);
        return false;
      }
      return true;
    });
    console.log('[TS-Scan] After PATTERN_MAX_AGE filter:', afterMaxAge.length);

    // ✅ حفظ في الـ cache
    if (symbol && timeframe) {
      saveToCache(symbol, timeframe, afterMaxAge, lastCandleTime);
      console.log(`[TS-Scan] 💾 Cached ${afterMaxAge.length} patterns for ${symbol}:${timeframe}`);
    }

    return NextResponse.json({
      success: true,
      patterns: afterMaxAge,
      stats: {
        total: afterMaxAge.length,
        bullish: afterMaxAge.filter(p => p.type === 'bullish').length,
        bearish: afterMaxAge.filter(p => p.type === 'bearish').length,
        neutral: afterMaxAge.filter(p => p.type === 'neutral').length
      },
      engine: 'typescript',
      cached: false,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('[TS Pattern Scan Error]:', error);
    return NextResponse.json(
      { 
        error: 'Pattern detection failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
