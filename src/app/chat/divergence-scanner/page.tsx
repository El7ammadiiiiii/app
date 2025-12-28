'use client';

/**
 * 🔍 Divergence Scanner Page - صفحة ماسح الدايفرجنس
 * 
 * صفحة متكاملة للبحث عن الدايفرجنس في جميع الأزواج والمنصات
 * Complete page for scanning divergences across all pairs and exchanges
 * 
 * @author Nexus Elite Team
 * @version 3.0.0
 * @created 2025-12-14
 * @updated 2025-12-14
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { DivergenceFilters, FilterState, DEFAULT_FILTER_STATE } from '@/components/scanners/DivergenceFilters';
import { DivergenceGrid } from '@/components/scanners/DivergenceGrid';
import { DivergenceChartModal } from '@/components/scanners/DivergenceChartModal';
import { DivergenceAdvancedFilter } from '@/components/scanners/DivergenceAdvancedFilter';
import { DivergenceExportSystem } from '@/components/scanners/DivergenceExportSystem';
import { DivergenceStatsDashboard } from '@/components/scanners/DivergenceStatsDashboard';
import { DivergenceAdvancedSettings } from '@/components/scanners/DivergenceAdvancedSettings';
import {
  DivergenceScannerService,
  getScannerInstance,
  ScanProgress,
  ScanResult
} from '@/lib/scanners/divergence-scanner';
import { DivergenceResult } from '@/lib/scanners/advanced-divergence-detector';
import {
  generateSignature,
  loadSeenSignatures,
  saveSeenSignatures
} from '@/lib/scanners/divergence-lifecycle';
import { getFreshnessState, isFresh, getOccurrenceTimeMs } from '@/lib/scanners/freshness-policy';

// ============================================================================
// 🎨 CONSTANTS
// ============================================================================

// ✅ الحد الأدنى لعدد الشموع - Minimum candles between divergence points
const MIN_DIVERGENCE_BARS = 10;

// ============================================================================
// 🎨 PAGE COMPONENT
// ============================================================================

export default function DivergenceScannerPage() {
  // State
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTER_STATE);
  const [results, setResults] = useState<DivergenceResult[]>([]);
  const [seenSignatures, setSeenSignatures] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState<ScanProgress | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [lastScanResult, setLastScanResult] = useState<ScanResult | undefined>();
  const [selectedDivergence, setSelectedDivergence] = useState<DivergenceResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'scanner' | 'stats' | 'settings'>('scanner');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  
  // ⏰ مؤقت لإجبار إعادة حساب الفلترة كل 30 ثانية
  const [tick, setTick] = useState(0);
  
  // Refs
  const scannerRef = useRef<DivergenceScannerService | null>(null);
  
  // ⏰ تحديث تلقائي كل 30 ثانية لإعادة حساب انتهاء الصلاحية
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 30 * 1000); // كل 30 ثانية
    
    return () => clearInterval(interval);
  }, []);
  
  // Initialize scanner
  useEffect(() => {
    scannerRef.current = getScannerInstance();
    const savedFavorites = scannerRef.current.getFavorites();
    setFavorites(new Set(savedFavorites.map(f => f.id)));
    setSeenSignatures(loadSeenSignatures());
    
    return () => {
      scannerRef.current?.stop();
    };
  }, []);
  
  // Start scan
  const handleStartScan = useCallback(async () => {
    if (!scannerRef.current || isScanning) return;
    
    setIsScanning(true);
    setError(undefined);
    setResults([]);
    setProgress(undefined);
    
    try {
      const result = await scannerRef.current.scan(
        {
          exchanges: filters.exchanges,
          pairs: filters.pairs,
          timeframes: filters.timeframes,
          indicators: filters.indicators,
          divergenceTypes: filters.types,
          directions: filters.directions,
          minScore: filters.minScore,
          strictMode: false
        },
        // Progress callback
        (progress) => {
          setProgress(progress);
        },
        // Result callback (real-time results)
        (divergence) => {
          // ✅ Check freshness with new policy (20/10/5 candles per timeframe)
          if (!isFresh(divergence)) return;
          setResults(prev => [...prev, divergence]);
        }
      );
      
      setLastScanResult(result);
      
      // Add lifecycle fields to results
      const resultsWithLifecycle = result.results.map(r => {
        const freshness = getFreshnessState(r);
        return {
          ...r,
          signature: generateSignature(r),
          status: (freshness.status === 'fresh' ? 'active' : 'expired') as 'active' | 'expired' | 'history',
          totalCandlesAtDetection: r.candles?.length || 0
        };
      });
      
      // ✅ Simplified filtering - no old restrictions, just freshness check
      const signatureSet = new Set<string>();
      const uniqueResults = resultsWithLifecycle.filter(r => {
        // ✅ Only fresh patterns (based on new policy: 20/10/5 candles)
        if (!isFresh(r)) return false;
        // Remove duplicates only
        if (signatureSet.has(r.signature) || seenSignatures.has(r.signature)) {
          return false;
        }
        signatureSet.add(r.signature);
        return true;
      });
      
      setResults(prev => [...prev, ...uniqueResults]);
      
      // Update seen signatures
      const newSignatures = new Set(seenSignatures);
      uniqueResults.forEach(r => newSignatures.add(r.signature));
      setSeenSignatures(newSignatures);
      saveSeenSignatures(newSignatures);
      
      if (result.errors.length > 0) {
        
      }
      
    } catch (err) {
      console.error('[DivergenceScanner] Scan failed:', err);
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setIsScanning(false);
      setProgress(undefined);
    }
  }, [filters, isScanning]);
  
  // Stop scan
  const handleStopScan = useCallback(() => {
    scannerRef.current?.stop();
    setIsScanning(false);
  }, []);
  
  // Toggle favorite
  const handleToggleFavorite = useCallback((id: string) => {
    if (!scannerRef.current) return;
    
    if (favorites.has(id)) {
      scannerRef.current.removeFromFavorites(id);
      setFavorites(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } else {
      const divergence = results.find(r => r.id === id);
      if (divergence) {
        scannerRef.current.addToFavorites(divergence);
        setFavorites(prev => new Set([...prev, id]));
      }
    }
  }, [favorites, results]);
  
  // Download divergence
  const handleDownload = useCallback(async (divergence: DivergenceResult) => {
    // Create a formatted text representation
    const text = `
Divergence Detection Report
============================

Symbol: ${divergence.symbol}
Exchange: ${divergence.exchange}
Timeframe: ${divergence.timeframe}

Type: ${divergence.type.toUpperCase()} ${divergence.direction.toUpperCase()}
Indicator: ${divergence.indicator}

Score: ${divergence.score}%
Confidence: ${divergence.confidence}%
Reliability: ${divergence.reliability}

Start Point:
  - Price: $${divergence.startPoint.price}
  - Indicator: ${divergence.startPoint.indicatorValue.toFixed(2)}
  - Index: ${divergence.startPoint.index}

End Point:
  - Price: $${divergence.endPoint.price}
  - Indicator: ${divergence.endPoint.indicatorValue.toFixed(2)}
  - Index: ${divergence.endPoint.index}

Analysis:
  - Price Slope: ${divergence.priceSlope.toFixed(4)}
  - Indicator Slope: ${divergence.indicatorSlope.toFixed(4)}
  - Slope Difference: ${divergence.slopeDifference.toFixed(4)}
  - Bars Count: ${divergence.barsCount}
  - Volume Profile: ${divergence.volumeProfile}

Detected At: ${divergence.detectedAt.toLocaleString()}

============================
Generated by Nexus Divergence Scanner
    `.trim();
    
    // Download as text file
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `divergence_${divergence.symbol}_${divergence.timeframe}_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);
  
  // ✅ دالة حساب قوة الدايفرجنس - Divergence Strength Calculation
  // تجمع بين عدد الشموع وفرق الميل بين السعر والمؤشر
  const calculateDivergenceStrength = useCallback((d: DivergenceResult): number => {
    const barsWeight = 0.4;      // وزن عدد الشموع (40%)
    const slopeWeight = 0.6;     // وزن فرق الميل (60%)
    
    // تطبيع عدد الشموع (5-50 → 0-1)
    const normalizedBars = Math.min(1, d.barsCount / 50);
    
    // تطبيع فرق الميل (0-1 → 0-1)
    const normalizedSlope = Math.min(1, d.slopeDifference || 0);
    
    return (normalizedBars * barsWeight + normalizedSlope * slopeWeight) * 100;
  }, []);

  // ✅ فلترة النتائج - بدون قيود إضافية، فقط حسب سياسة الحداثة الجديدة
  // 15m: 20 شمعة، 1h/4h: 10 شمعات، 1d/3d: 5 شمعات
  const filteredResults = useMemo(() => {
    // ✅ Fresh-only gate - حسب القيود الجديدة
    let filtered = results.filter(r => isFresh(r));

    // ✅ NEW: فلتر الحد الأدنى 10 شموع - Minimum 10 candles filter
    filtered = filtered.filter(r => r.barsCount >= MIN_DIVERGENCE_BARS);

    // ✅ NEW: فلتر المؤشر = 0 أو null - Filter out divergences where indicator value is 0 or invalid
    // ينطبق على جميع المؤشرات:
    // - RSI = 0 لا يظهر ❌
    // - MACD = 0 لا يظهر ❌
    // - OBV = 0 لا يظهر ❌
    // - STOCH_RSI = 0 لا يظهر ❌
    // - CCI = 0 لا يظهر ❌
    // - MFI = 0 لا يظهر ❌
    // - WILLIAMS_R = 0 لا يظهر ❌
    filtered = filtered.filter(r => {
      // التحقق من startPoint
      if (!r.startPoint || r.startPoint.indicatorValue === null || r.startPoint.indicatorValue === undefined) {
        return false;
      }
      // التحقق من endPoint
      if (!r.endPoint || r.endPoint.indicatorValue === null || r.endPoint.indicatorValue === undefined) {
        return false;
      }
      
      const startValue = r.startPoint.indicatorValue;
      const endValue = r.endPoint.indicatorValue;
      
      // رفض إذا كانت القيمة = 0 بالضبط
      if (startValue === 0 || endValue === 0) {
        return false;
      }
      
      // رفض إذا كانت القيمة قريبة جداً من الصفر (أقل من 0.001)
      if (Math.abs(startValue) < 0.001 || Math.abs(endValue) < 0.001) {
        return false;
      }
      
      return true;
    });

    // ✅ إزالة التكرارات فقط (لا قيود أخرى)
    const seen = new Set<string>();
    filtered = filtered.filter(r => {
      const sig = r.signature || generateSignature(r);
      if (seen.has(sig)) return false;
      seen.add(sig);
      return true;
    });

    // ✅ NEW: الاحتفاظ بأقوى دايفرجنس لكل عملة+منصة+إطار زمني
    // Keep only the strongest divergence per symbol+exchange+timeframe
    const bestPerSymbol = new Map<string, DivergenceResult>();
    for (const r of filtered) {
      const key = `${r.symbol}|${r.exchange}|${r.timeframe}`;
      const existing = bestPerSymbol.get(key);
      const currentStrength = calculateDivergenceStrength(r);
      const existingStrength = existing ? calculateDivergenceStrength(existing) : 0;
      
      if (!existing || currentStrength > existingStrength) {
        bestPerSymbol.set(key, r);
      }
    }
    filtered = Array.from(bestPerSymbol.values());

    // ⭐ فلترة المفضلات إذا كانت مفعلة
    if (filters.showFavoritesOnly) {
      filtered = filtered.filter(r => favorites.has(r.id));
    }

    // 📊 الترتيب بالحداثة (حسب وقت حدوث النموذج)
    return [...filtered].sort((a, b) => {
      const aOcc = getOccurrenceTimeMs(a) ?? a.timestamp;
      const bOcc = getOccurrenceTimeMs(b) ?? b.timestamp;
      return bOcc - aOcc;
    });
  }, [results, filters, favorites, tick, calculateDivergenceStrength]); // tick يُجبر إعادة الحساب كل 30 ثانية
  
  return (
    <div className="min-h-screen text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-sm border-b border-white/[0.08] theme-header">
        <div className="max-w-[1800px] mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                🔍 ماسح الدايفرجنس 2.0
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                34 نوع دايفرجنس • 10 مؤشرات • محرك كشف متقدم
              </p>
            </div>
            
            {/* Stats */}
            {lastScanResult && (
              <div className="hidden md:flex items-center gap-4 text-sm">
                <div className="text-gray-400">
                  فحص: <span className="text-white">{lastScanResult.totalScanned}</span>
                </div>
                <div className="text-gray-400">
                  وجد: <span className="text-cyan-400">{lastScanResult.totalFound}</span>
                </div>
                <div className="text-gray-400">
                  المدة: <span className="text-white">{(lastScanResult.duration / 1000).toFixed(1)}ث</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto px-4 py-6 glass-panel mt-6">
        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setActiveTab('scanner')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'scanner'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                : 'text-gray-400 hover:text-gray-300 hover:theme-surface/5'
            }`}
          >
            🔍 الماسح
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'stats'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                : 'text-gray-400 hover:text-gray-300 hover:theme-surface/5'
            }`}
          >
            📊 الإحصائيات
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'settings'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                : 'text-gray-400 hover:text-gray-300 hover:theme-surface/5'
            }`}
          >
            ⚙️ الإعدادات
          </button>
        </div>

        {activeTab === 'scanner' && (
          <>
            <div className="flex gap-6">
              {/* Sidebar - Filters */}
              <aside className="w-72 flex-shrink-0 hidden lg:block">
              <div className="sticky top-24">
                <DivergenceFilters
                  filters={filters}
                  onFiltersChange={setFilters}
                  isScanning={isScanning}
                  onStartScan={handleStartScan}
                  onStopScan={handleStopScan}
                  resultsCount={filteredResults.length}
                  favoritesCount={favorites.size}
                />
              </div>
            </aside>
            
            {/* Main Content - Results */}
            <div className="flex-1 min-w-0">


              {/* Stats Dashboard (Mini) */}
              <div className="mb-4">
                <DivergenceStatsDashboard
                  results={filteredResults}
                  isScanning={isScanning}
                  scanProgress={progress?.percentage}
                />
              </div>

              {/* Mobile Filters Toggle */}
              <div className="lg:hidden mb-4">
                <MobileFiltersDrawer
                  filters={filters}
                  onFiltersChange={setFilters}
                  isScanning={isScanning}
                  onStartScan={handleStartScan}
                  onStopScan={handleStopScan}
                  resultsCount={filteredResults.length}
                  favoritesCount={favorites.size}
                  selectedTypes={selectedTypes}
                  onTypesChange={setSelectedTypes}
                />
              </div>
              
              {/* Results Grid */}
              <DivergenceGrid
                results={filteredResults}
                favorites={favorites}
                onToggleFavorite={handleToggleFavorite}
                onDownload={handleDownload}
                onExpand={(divergence) => {
                  setSelectedDivergence(divergence);
                  setIsModalOpen(true);
                }}
                isScanning={isScanning}
                progress={progress}
                error={error}
              />
            </div>
          </div>          </>        )}

        {activeTab === 'stats' && (
          <div className="max-w-5xl mx-auto">
            <DivergenceStatsDashboard
              results={filteredResults}
              isScanning={isScanning}
              scanProgress={progress?.percentage}
            />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-4xl mx-auto">
            <DivergenceAdvancedSettings />
          </div>
        )}
      </main>
      
      {/* Chart Modal */}
      <DivergenceChartModal
        divergence={selectedDivergence}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedDivergence(null);
        }}
      />
    </div>
  );
}

// ============================================================================
// 📱 MOBILE FILTERS DRAWER
// ============================================================================

interface MobileFiltersDrawerProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  isScanning: boolean;
  onStartScan: () => void;
  onStopScan: () => void;
  resultsCount: number;
  favoritesCount: number;
  selectedTypes: string[];
  onTypesChange: (types: string[]) => void;
}

function MobileFiltersDrawer(props: MobileFiltersDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      {/* Toggle Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={props.isScanning ? props.onStopScan : props.onStartScan}
          className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all ${
            props.isScanning
              ? 'bg-red-500/20 text-red-400 border border-red-500/50'
              : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
          }`}
        >
          {props.isScanning ? 'إيقاف' : 'بدء الفحص'}
        </button>

        <button
          onClick={() => setIsOpen(true)}
          className="flex-1 py-2.5 rounded-lg theme-surface/5 text-gray-300 text-sm font-medium hover:theme-surface/8 transition-all border border-white/[0.08]"
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            الفلاتر
          </span>
        </button>

        <div className="flex-1">
          <DivergenceAdvancedFilter
            onFilterChange={props.onTypesChange}
            initialSelection={props.selectedTypes}
          />
        </div>
      </div>
      
      {/* Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 theme-bg/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Content */}
          <div className="absolute inset-y-0 left-0 w-80 max-w-full border-r border-white/[0.08] overflow-y-auto theme-sidebar">
            <div className="sticky top-0 px-4 py-3 border-b border-white/[0.08] flex items-center justify-between theme-header">
              <h3 className="text-sm font-semibold text-white">الفلاتر</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:theme-surface/8 text-gray-400"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4">
              <DivergenceFilters {...props} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
