'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useExchangeStore } from '@/stores/exchangeStore';
import { ExchangeSelector } from '@/components/layout/ExchangeSelector';
import { fastApiClient } from '@/lib/services/fastApiClient';
import { cn } from '@/lib/utils';
import {
  TrendingUp, TrendingDown, RefreshCw, Search,
  ArrowUpDown, ChevronDown, AlertTriangle, Zap,
} from 'lucide-react';

// ─── Types (mirror the API response) ───

type FibDirection = 'bull' | 'bear';
type ProximityZone = 'AT_LEVEL' | 'APPROACHING' | 'AWAY';
type EMACrossType = 'bullish' | 'bearish' | 'none';

interface FibLevel { ratio: number; price: number; label: string; }

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

interface ScanSummary {
  totalCoins: number;
  scanned: number;
  timeframes: number;
  found: number;
  atLevel: number;
  approaching: number;
  bullish: number;
  bearish: number;
}

// ─── Constants ───

const TIMEFRAMES = [
  { id: '4h', label: '4 ساعات', labelEn: '4H' },
  { id: '1d', label: 'يومي', labelEn: '1D' },
  { id: '1w', label: 'أسبوعي', labelEn: '1W' },
];

type SortField = 'proximity' | 'symbol' | 'timeframe' | 'r2' | 'direction';

// ─── Helpers ───

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(4);
  if (price >= 0.01) return price.toFixed(6);
  return price.toFixed(8);
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `قبل ${mins} د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `قبل ${hrs} س`;
  return `قبل ${Math.floor(hrs / 24)} ي`;
}

// ─── Fibonacci Ruler Component ───

function FibRuler({ rulerPosition, direction, zone }: { rulerPosition: number; direction: FibDirection; zone: ProximityZone }) {
  const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  const fib618Pos = direction === 'bull' ? 1 - 0.618 : 0.618; // position on ruler

  return (
    <div className="relative h-3 w-full rounded-full bg-white/5 overflow-hidden mt-2">
      {/* Level markers */}
      {levels.map(l => {
        const pos = direction === 'bull' ? (1 - l) * 100 : l * 100;
        return (
          <div
            key={l}
            className={cn(
              'absolute top-0 bottom-0 w-px',
              l === 0.618 ? 'bg-amber-400/80' : 'bg-white/10'
            )}
            style={{ left: `${pos}%` }}
          />
        );
      })}

      {/* 0.618 highlight zone */}
      <div
        className="absolute top-0 bottom-0 bg-amber-400/15"
        style={{
          left: `${fib618Pos * 100 - 3}%`,
          width: '6%',
        }}
      />

      {/* Current price marker */}
      <div
        className={cn(
          'absolute top-0 bottom-0 w-1.5 rounded-full transition-all',
          zone === 'AT_LEVEL' ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.7)]' :
          zone === 'APPROACHING' ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]' :
          'bg-gray-400'
        )}
        style={{ left: `${(direction === 'bull' ? (1 - rulerPosition) : rulerPosition) * 100}%` }}
      />
    </div>
  );
}

// ─── Result Card Component ───

function ScanResultCard({ result }: { result: FibScanResult }) {
  const isBull = result.direction === 'bull';

  return (
    <div className={cn(
      'relative rounded-xl border p-4 transition-all hover:scale-[1.01] hover:shadow-lg',
      result.zone === 'AT_LEVEL'
        ? 'border-red-500/40 bg-red-500/5 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
        : result.zone === 'APPROACHING'
        ? 'border-amber-400/30 bg-amber-400/5'
        : 'border-white/10 bg-white/[0.02]'
    )}>
      {/* Zone badge */}
      <div className="absolute top-3 right-3">
        {result.zone === 'AT_LEVEL' ? (
          <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/15 px-2 py-0.5 rounded-full animate-pulse">
            <Zap className="w-3 h-3" /> عند المستوى
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-400/15 px-2 py-0.5 rounded-full">
            <AlertTriangle className="w-3 h-3" /> مقتربة
          </span>
        )}
      </div>

      {/* Header: Direction + Symbol + Timeframe */}
      <div className="flex items-center gap-2 mb-3">
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center',
          isBull ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
        )}>
          {isBull ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm">{result.name}</span>
            <span className="text-[10px] text-gray-500">{result.symbol}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-[10px] font-medium',
              isBull ? 'text-emerald-400' : 'text-red-400'
            )}>
              {isBull ? '⬆ Bull Retracement' : '⬇ Bear Retracement'}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400 font-mono">
              {result.timeframe}
            </span>
          </div>
        </div>
      </div>

      {/* Price comparison */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div className="text-[10px] text-gray-500 mb-0.5">السعر الحالي</div>
          <div className="text-sm font-mono font-bold text-white">${formatPrice(result.currentPrice)}</div>
        </div>
        <div>
          <div className="text-[10px] text-gray-500 mb-0.5">مستوى 0.618</div>
          <div className="text-sm font-mono font-bold text-amber-400">${formatPrice(result.fib618Price)}</div>
        </div>
      </div>

      {/* Proximity */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-gray-500">القرب من 0.618</span>
        <span className={cn(
          'font-mono font-bold text-sm',
          result.zone === 'AT_LEVEL' ? 'text-red-400' : 'text-amber-400'
        )}>
          {result.proximityPercent.toFixed(2)}%
        </span>
      </div>

      {/* Fibonacci Ruler */}
      <FibRuler rulerPosition={result.rulerPosition} direction={result.direction} zone={result.zone} />

      {/* Swing range */}
      <div className="flex items-center justify-between mt-3 text-[10px] text-gray-500">
        <span>Swing: ${formatPrice(result.outerLow)} → ${formatPrice(result.outerHigh)}</span>
        <span>Range: ${formatPrice(result.fibRange)}</span>
      </div>

      {/* Bottom row: R² + EMA */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
        {/* R² Quality */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-500">R²</span>
          <div className="w-12 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                result.r2 >= 0.7 ? 'bg-emerald-400' : result.r2 >= 0.4 ? 'bg-amber-400' : 'bg-red-400'
              )}
              style={{ width: `${result.r2 * 100}%` }}
            />
          </div>
          <span className={cn(
            'text-[10px] font-mono',
            result.r2 >= 0.7 ? 'text-emerald-400' : result.r2 >= 0.4 ? 'text-amber-400' : 'text-red-400'
          )}>
            {result.r2.toFixed(2)}
          </span>
        </div>

        {/* EMA Cross */}
        <div className="flex items-center gap-1">
          <span className={cn(
            'w-2 h-2 rounded-full',
            result.emaCross === 'bullish' ? 'bg-emerald-400' :
            result.emaCross === 'bearish' ? 'bg-red-400' : 'bg-gray-600'
          )} />
          <span className={cn(
            'text-[10px] font-medium',
            result.emaCross === 'bullish' ? 'text-emerald-400' :
            result.emaCross === 'bearish' ? 'text-red-400' : 'text-gray-500'
          )}>
            EMA {result.emaCross === 'none' ? '—' : result.emaCross === 'bullish' ? '20>50' : '20<50'}
            {result.emaCrossRecent && ' ⚡'}
          </span>
        </div>

        {/* Time */}
        <span className="text-[10px] text-gray-600">{timeAgo(result.timestamp)}</span>
      </div>
    </div>
  );
}

// ─── Main Page Component ───

export default function FibonacciScannerPage() {
  const { activeExchange } = useExchangeStore();

  // State
  const [results, setResults] = useState<FibScanResult[]>([]);
  const [summary, setSummary] = useState<ScanSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [selectedTimeframes, setSelectedTimeframes] = useState<string[]>(['4h', '1d', '1w']);
  const [maxProximity, setMaxProximity] = useState(5);
  const [sortField, setSortField] = useState<SortField>('proximity');
  const [sortAsc, setSortAsc] = useState(true);
  const [filterDirection, setFilterDirection] = useState<'all' | FibDirection>('all');
  const [filterZone, setFilterZone] = useState<'all' | ProximityZone>('all');
  const [filterTimeframe, setFilterTimeframe] = useState<string>('all');
  const [coinCount, setCoinCount] = useState(100);
  const [lastScanTime, setLastScanTime] = useState<number | null>(null);

  // Scan function
  const runScan = useCallback(async () => {
    if (selectedTimeframes.length === 0) return;
    setIsLoading(true);
    setError(null);
    setProgress(10);

    try {
      const params = new URLSearchParams({
        exchange: activeExchange,
        timeframes: selectedTimeframes.join(','),
        count: String(coinCount),
        proximity: String(maxProximity),
      });

      setProgress(30);
      let json: { success: boolean; results?: unknown[]; summary?: unknown; error?: string };
      try {
        json = await fastApiClient.fibonacci(activeExchange, selectedTimeframes.join(','), coinCount, maxProximity) as typeof json;
      } catch {
        const res = await fetch(`/api/fibonacci-scanner?${params}`, {
          signal: AbortSignal.timeout(180_000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        json = await res.json();
      }

      setProgress(90);

      if (!json.success) throw new Error(json.error || 'Scan failed');

      setResults(json.results || []);
      setSummary(json.summary || null);
      setLastScanTime(Date.now());
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل المسح');
      setResults([]);
      setSummary(null);
    } finally {
      setIsLoading(false);
      setTimeout(() => setProgress(0), 500);
    }
  }, [activeExchange, selectedTimeframes, coinCount, maxProximity]);

  // Toggle timeframe
  const toggleTF = (tf: string) => {
    setSelectedTimeframes(prev =>
      prev.includes(tf) ? prev.filter(t => t !== tf) : [...prev, tf]
    );
  };

  // Filtered + sorted results
  const displayResults = useMemo(() => {
    let filtered = [...results];
    if (filterDirection !== 'all') filtered = filtered.filter(r => r.direction === filterDirection);
    if (filterZone !== 'all') filtered = filtered.filter(r => r.zone === filterZone);
    if (filterTimeframe !== 'all') filtered = filtered.filter(r => r.timeframe === filterTimeframe);

    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'proximity': cmp = a.proximityPercent - b.proximityPercent; break;
        case 'symbol': cmp = a.symbol.localeCompare(b.symbol); break;
        case 'timeframe': cmp = a.timeframe.localeCompare(b.timeframe); break;
        case 'r2': cmp = a.r2 - b.r2; break;
        case 'direction': cmp = a.direction.localeCompare(b.direction); break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return filtered;
  }, [results, filterDirection, filterZone, filterTimeframe, sortField, sortAsc]);

  return (
    <div className="min-h-screen text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-sm border-b border-white/[0.08] theme-header">
        <div className="max-w-[1800px] mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center text-xl">
                🔢
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Fibonacci 0.618 Scanner</h1>
                <p className="text-sm text-gray-400 mt-0.5">
                  اكتشاف العملات عند مستوى التراجع الذهبي — {coinCount} عملة × {selectedTimeframes.length} فريم
                </p>
              </div>
            </div>

            {lastScanTime && (
              <div className="text-[11px] text-gray-500">
                آخر سكان: {timeAgo(lastScanTime)}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-4 py-6 space-y-5">
        {/* ─── Control Bar ─── */}
        <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
          {/* Exchange */}
          <ExchangeSelector />

          {/* Timeframes */}
          <div className="flex items-center gap-1 border-r border-white/10 pr-3">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf.id}
                onClick={() => toggleTF(tf.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                  selectedTimeframes.includes(tf.id)
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-white/5 text-gray-500 hover:text-gray-300 border border-transparent'
                )}
              >
                {tf.labelEn}
              </button>
            ))}
          </div>

          {/* Proximity threshold */}
          <div className="flex items-center gap-2 border-r border-white/10 pr-3">
            <span className="text-[10px] text-gray-500">عتبة</span>
            {[2, 5, 8].map(v => (
              <button
                key={v}
                onClick={() => setMaxProximity(v)}
                className={cn(
                  'px-2 py-1 rounded text-[11px] font-bold transition-all',
                  maxProximity === v
                    ? 'bg-white/10 text-white'
                    : 'text-gray-500 hover:text-gray-300'
                )}
              >
                {v}%
              </button>
            ))}
          </div>

          {/* Coin count */}
          <div className="flex items-center gap-2 border-r border-white/10 pr-3">
            <span className="text-[10px] text-gray-500">عملات</span>
            {[50, 100].map(v => (
              <button
                key={v}
                onClick={() => setCoinCount(v)}
                className={cn(
                  'px-2 py-1 rounded text-[11px] font-bold transition-all',
                  coinCount === v
                    ? 'bg-white/10 text-white'
                    : 'text-gray-500 hover:text-gray-300'
                )}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Scan button */}
          <button
            onClick={runScan}
            disabled={isLoading || selectedTimeframes.length === 0}
            className={cn(
              'ml-auto flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all',
              isLoading
                ? 'bg-amber-500/10 text-amber-400/60 cursor-wait'
                : 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/20'
            )}
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {isLoading ? 'جاري المسح...' : '🔍 سكان'}
          </button>
        </div>

        {/* ─── Progress Bar ─── */}
        {isLoading && progress > 0 && (
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* ─── Summary Cards ─── */}
        {summary && !isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <SummaryCard label="تم المسح" value={summary.scanned} icon="📊" />
            <SummaryCard label="مكتشفة" value={summary.found} icon="🎯" color="text-amber-400" />
            <SummaryCard label="🔴 عند المستوى" value={summary.atLevel} color="text-red-400" />
            <SummaryCard label="🟡 مقتربة" value={summary.approaching} color="text-amber-400" />
            <SummaryCard label="⬆ صعود" value={summary.bullish} color="text-emerald-400" />
            <SummaryCard label="⬇ هبوط" value={summary.bearish} color="text-red-400" />
          </div>
        )}

        {/* ─── Filter + Sort Bar ─── */}
        {results.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Direction filter */}
            <FilterPill label="الكل" active={filterDirection === 'all'} onClick={() => setFilterDirection('all')} />
            <FilterPill label="⬆ صعود" active={filterDirection === 'bull'} onClick={() => setFilterDirection('bull')} color="text-emerald-400" />
            <FilterPill label="⬇ هبوط" active={filterDirection === 'bear'} onClick={() => setFilterDirection('bear')} color="text-red-400" />

            <div className="w-px h-5 bg-white/10" />

            {/* Zone filter */}
            <FilterPill label="كل المناطق" active={filterZone === 'all'} onClick={() => setFilterZone('all')} />
            <FilterPill label="🔴 عند المستوى" active={filterZone === 'AT_LEVEL'} onClick={() => setFilterZone('AT_LEVEL')} color="text-red-400" />
            <FilterPill label="🟡 مقتربة" active={filterZone === 'APPROACHING'} onClick={() => setFilterZone('APPROACHING')} color="text-amber-400" />

            <div className="w-px h-5 bg-white/10" />

            {/* Timeframe filter */}
            <FilterPill label="كل الفريمات" active={filterTimeframe === 'all'} onClick={() => setFilterTimeframe('all')} />
            {selectedTimeframes.map(tf => (
              <FilterPill key={tf} label={tf} active={filterTimeframe === tf} onClick={() => setFilterTimeframe(tf)} />
            ))}

            {/* Sort */}
            <div className="ml-auto flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-gray-500" />
              <select
                value={sortField}
                onChange={e => setSortField(e.target.value as SortField)}
                className="bg-transparent text-[11px] text-gray-400 outline-none cursor-pointer"
              >
                <option value="proximity">القرب</option>
                <option value="symbol">الرمز</option>
                <option value="timeframe">الفريم</option>
                <option value="r2">الجودة</option>
              </select>
              <button
                onClick={() => setSortAsc(prev => !prev)}
                className="text-[10px] text-gray-500 hover:text-white transition-colors"
              >
                {sortAsc ? '↑' : '↓'}
              </button>
            </div>

            <span className="text-[11px] text-gray-600">{displayResults.length} نتيجة</span>
          </div>
        )}

        {/* ─── Error ─── */}
        {error && (
          <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* ─── Results Grid ─── */}
        {displayResults.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayResults.map((result, idx) => (
              <ScanResultCard key={`${result.symbol}-${result.timeframe}-${idx}`} result={result} />
            ))}
          </div>
        ) : !isLoading && results.length === 0 ? (
          <div className="flex-1 flex items-center justify-center min-h-[400px] text-gray-500 border-2 border-dashed border-white/5 rounded-2xl">
            <div className="text-center space-y-3">
              <div className="text-5xl">🔢</div>
              <p className="text-lg font-bold">ماسح فيبوناتشي 0.618</p>
              <p className="text-xs opacity-50 max-w-sm">
                يكتشف العملات الواصلة عند مستوى التراجع الذهبي 0.618
                <br />
                على الفريمات 4 ساعات، يومي، وأسبوعي
                <br />
                مع تأكيد EMA 20/50 Cross
              </p>
              <p className="text-[10px] opacity-30 mt-4">اضغط &quot;🔍 سكان&quot; لبدء المسح</p>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

// ─── Sub-components ───

function SummaryCard({ label, value, icon, color }: { label: string; value: number; icon?: string; color?: string }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
      <div className={cn('text-2xl font-bold font-mono', color || 'text-white')}>
        {icon && <span className="text-sm mr-1">{icon}</span>}
        {value}
      </div>
      <div className="text-[10px] text-gray-500 mt-1">{label}</div>
    </div>
  );
}

function FilterPill({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all',
        active
          ? 'bg-white/10 text-white border border-white/20'
          : 'text-gray-500 hover:text-gray-300 border border-transparent'
      )}
    >
      <span className={active && color ? color : undefined}>{label}</span>
    </button>
  );
}
