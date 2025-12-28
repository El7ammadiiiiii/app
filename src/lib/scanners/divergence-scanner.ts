/**
 * 🔄 Real-Time Divergence Scanner Service - خدمة فحص الدايفرجنس في الوقت الفعلي
 * 
 * خدمة متكاملة لفحص عدة أزواج ومنصات وأطر زمنية
 * Comprehensive service for scanning multiple pairs, exchanges, and timeframes
 * 
 * @author Nexus Elite Team
 * @version 2.0.0
 * @created 2025-12-14
 */

import {
  AdvancedDivergenceDetector,
  DivergenceResult,
  IndicatorType,
  DivergenceType,
  DivergenceDirection,
  OHLCV
} from './advanced-divergence-detector';

// ============================================================================
// 📊 TYPES AND INTERFACES
// ============================================================================

export interface ScannerConfig {
  exchanges: string[];
  pairs: string[];
  timeframes: string[];
  indicators: IndicatorType[];
  divergenceTypes: DivergenceType[];
  directions: DivergenceDirection[];
  minScore: number;
  strictMode: boolean;
}

export interface ScanProgress {
  total: number;
  completed: number;
  current: string;
  percentage: number;
  startTime: number;
  estimatedTimeRemaining: number;
}

export interface ScanResult {
  results: DivergenceResult[];
  scannedAt: Date;
  totalScanned: number;
  totalFound: number;
  duration: number;
  errors: string[];
}

export interface FavoriteItem {
  id: string;
  divergence: DivergenceResult;
  addedAt: Date;
  notes?: string;
}

type ProgressCallback = (progress: ScanProgress) => void;
type ResultCallback = (result: DivergenceResult) => void;

// ✅ Detection window - last 50 candles
const DETECTION_CANDLE_LIMIT = 50;

// ============================================================================
// 💾 CACHE MANAGER - تخزين مؤقت للأنماط المكتشفة
// ============================================================================

class CacheManager {
  private cache: Map<string, { data: OHLCV[]; timestamp: number }> = new Map();
  private readonly TTL = 60000; // 1 minute cache for OHLCV data
  
  set(key: string, data: OHLCV[]): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
  
  get(key: string): OHLCV[] | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  getKey(symbol: string, exchange: string, timeframe: string): string {
    return `${exchange}:${symbol}:${timeframe}`;
  }
}

// ✅ NEW: Pattern Cache Manager - تخزين مؤقت للأنماط المكتشفة لتسريع البحث
class PatternCacheManager {
  private patternCache: Map<string, { patterns: DivergenceResult[]; timestamp: number }> = new Map();
  
  // TTL per timeframe (in ms) - matching freshness policy
  private getTTL(timeframe: string): number {
    const TIMEFRAME_MS: Record<string, number> = {
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '3d': 3 * 24 * 60 * 60 * 1000,
    };
    const FRESH_BARS: Record<string, number> = {
      '15m': 20,
      '1h': 10,
      '4h': 10,
      '1d': 5,
      '3d': 5,
    };
    const bars = FRESH_BARS[timeframe] || 10;
    const tfMs = TIMEFRAME_MS[timeframe] || 60 * 60 * 1000;
    return bars * tfMs;
  }
  
  setPatterns(key: string, patterns: DivergenceResult[], timeframe: string): void {
    this.patternCache.set(key, { patterns, timestamp: Date.now() });
  }
  
  getPatterns(key: string, timeframe: string): DivergenceResult[] | null {
    const cached = this.patternCache.get(key);
    if (!cached) return null;
    
    const ttl = this.getTTL(timeframe);
    if (Date.now() - cached.timestamp > ttl) {
      this.patternCache.delete(key);
      return null;
    }
    
    return cached.patterns;
  }
  
  getPatternKey(symbol: string, exchange: string, timeframe: string, indicator: string): string {
    return `pattern:${exchange}:${symbol}:${timeframe}:${indicator}`;
  }
  
  clear(): void {
    this.patternCache.clear();
  }
  
  // Auto-cleanup expired patterns
  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.patternCache.entries()) {
      // Extract timeframe from key
      const parts = key.split(':');
      const timeframe = parts[3] || '1h';
      const ttl = this.getTTL(timeframe);
      if (now - value.timestamp > ttl) {
        this.patternCache.delete(key);
      }
    }
  }
}

// ============================================================================
// 📡 DATA FETCHER
// ============================================================================

class DataFetcher {
  private baseUrl: string;
  
  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }
  
  async fetchOHLCV(
    symbol: string,
    exchange: string,
    timeframe: string,
    limit: number = 200
  ): Promise<OHLCV[]> {
    try {
      const url = `${this.baseUrl}/api/ohlcv?symbol=${encodeURIComponent(symbol)}&exchange=${exchange}&interval=${timeframe}&limit=${limit}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      // API returns { symbol, exchange, interval, count, data: [...], lastUpdated }
      // Or { error: "..." } on failure
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid response: missing data array');
      }
      
      if (data.data.length === 0) {
        throw new Error('No data available');
      }
      
      return data.data.map((d: any) => ({
        timestamp: d.timestamp,
        open: Number(d.open),
        high: Number(d.high),
        low: Number(d.low),
        close: Number(d.close),
        volume: Number(d.volume)
      }));
    } catch (error) {
      console.error(`[DataFetcher] Error fetching ${symbol} from ${exchange}:`, error);
      throw error;
    }
  }
}

// ============================================================================
// 🔍 MAIN SCANNER SERVICE
// ============================================================================

export class DivergenceScannerService {
  private detector: AdvancedDivergenceDetector;
  private cache: CacheManager;
  private patternCache: PatternCacheManager;
  private fetcher: DataFetcher;
  private isRunning: boolean = false;
  private shouldStop: boolean = false;
  private favorites: Map<string, FavoriteItem> = new Map();
  
  constructor(baseUrl?: string) {
    this.detector = new AdvancedDivergenceDetector();
    this.cache = new CacheManager();
    this.patternCache = new PatternCacheManager();
    this.fetcher = new DataFetcher(baseUrl);
    this.loadFavorites();
    
    // ✅ Auto-cleanup expired patterns every 30 seconds
    if (typeof window !== 'undefined') {
      setInterval(() => this.patternCache.cleanup(), 30000);
    }
  }
  
  /**
   * بدء الفحص الشامل
   */
  async scan(
    config: ScannerConfig,
    onProgress?: ProgressCallback,
    onResult?: ResultCallback
  ): Promise<ScanResult> {
    if (this.isRunning) {
      throw new Error('Scanner is already running');
    }
    
    this.isRunning = true;
    this.shouldStop = false;
    
    const startTime = Date.now();
    const results: DivergenceResult[] = [];
    const errors: string[] = [];
    
    // حساب العدد الإجمالي للمهام
    const tasks: { symbol: string; exchange: string; timeframe: string; indicator: IndicatorType }[] = [];
    
    for (const exchange of config.exchanges) {
      for (const pair of config.pairs) {
        for (const timeframe of config.timeframes) {
          for (const indicator of config.indicators) {
            tasks.push({ symbol: pair, exchange, timeframe, indicator });
          }
        }
      }
    }
    
    const total = tasks.length;
    let completed = 0;
    
    // تنفيذ المهام
    for (const task of tasks) {
      if (this.shouldStop) break;
      
      try {
        // تحديث التقدم
        if (onProgress) {
          const elapsed = Date.now() - startTime;
          const avgTimePerTask = completed > 0 ? elapsed / completed : 1000;
          const remaining = (total - completed) * avgTimePerTask;
          
          onProgress({
            total,
            completed,
            current: `${task.exchange}:${task.symbol}:${task.timeframe}:${task.indicator}`,
            percentage: Math.round((completed / total) * 100),
            startTime,
            estimatedTimeRemaining: remaining
          });
        }
        
        // ✅ Check pattern cache first for faster search
        const patternCacheKey = this.patternCache.getPatternKey(task.symbol, task.exchange, task.timeframe, task.indicator);
        const cachedPatterns = this.patternCache.getPatterns(patternCacheKey, task.timeframe);
        
        if (cachedPatterns) {
          // Use cached patterns
          const filtered = cachedPatterns.filter(d => {
            if (d.score < config.minScore) return false;
            if (!config.divergenceTypes.includes(d.type)) return false;
            if (!config.directions.includes(d.direction)) return false;
            return true;
          });
          
          for (const divergence of filtered) {
            results.push(divergence);
            if (onResult) onResult(divergence);
          }
          
          completed++;
          continue;
        }
        
        // جلب البيانات - ✅ Using only last 50 candles
        const cacheKey = this.cache.getKey(task.symbol, task.exchange, task.timeframe);
        let candles = this.cache.get(cacheKey);
        
        if (!candles) {
          candles = await this.fetcher.fetchOHLCV(task.symbol, task.exchange, task.timeframe, DETECTION_CANDLE_LIMIT);
          this.cache.set(cacheKey, candles);
        } else {
          // ✅ Limit to last 50 candles even from cache
          candles = candles.slice(-DETECTION_CANDLE_LIMIT);
        }
        
        // الكشف عن الدايفرجنس
        const divergences = this.detector.detectAll(
          candles,
          task.indicator,
          task.symbol,
          task.exchange,
          task.timeframe
        );
        
        // ✅ Cache the detected patterns for faster subsequent searches
        this.patternCache.setPatterns(patternCacheKey, divergences, task.timeframe);
        
        // تصفية النتائج
        const filtered = divergences.filter(d => {
          if (d.score < config.minScore) return false;
          if (!config.divergenceTypes.includes(d.type)) return false;
          if (!config.directions.includes(d.direction)) return false;
          return true;
        });
        
        // إضافة النتائج
        for (const divergence of filtered) {
          results.push(divergence);
          if (onResult) onResult(divergence);
        }
        
      } catch (error) {
        const errorMsg = `Failed to scan ${task.exchange}:${task.symbol}:${task.timeframe}: ${error}`;
        errors.push(errorMsg);
        console.error('[Scanner]', errorMsg);
      }
      
      completed++;
      
      // تأخير صغير لتجنب الحد من المعدل
      await this.delay(100);
    }
    
    this.isRunning = false;
    
    // ترتيب النتائج حسب القوة
    results.sort((a, b) => b.score - a.score);
    
    return {
      results,
      scannedAt: new Date(),
      totalScanned: completed,
      totalFound: results.length,
      duration: Date.now() - startTime,
      errors
    };
  }
  
  /**
   * إيقاف الفحص
   */
  stop(): void {
    this.shouldStop = true;
  }
  
  /**
   * التحقق من حالة التشغيل
   */
  isScanning(): boolean {
    return this.isRunning;
  }
  
  /**
   * مسح الذاكرة المؤقتة
   */
  clearCache(): void {
    this.cache.clear();
    this.patternCache.clear();
  }
  
  /**
   * ✅ Clear pattern cache only (for refresh without re-fetching OHLCV)
   */
  clearPatternCache(): void {
    this.patternCache.clear();
  }
  
  // ============================================================================
  // ⭐ FAVORITES MANAGEMENT
  // ============================================================================
  
  addToFavorites(divergence: DivergenceResult, notes?: string): void {
    this.favorites.set(divergence.id, {
      id: divergence.id,
      divergence,
      addedAt: new Date(),
      notes
    });
    this.saveFavorites();
  }
  
  removeFromFavorites(id: string): void {
    this.favorites.delete(id);
    this.saveFavorites();
  }
  
  isFavorite(id: string): boolean {
    return this.favorites.has(id);
  }
  
  getFavorites(): FavoriteItem[] {
    return Array.from(this.favorites.values());
  }
  
  private saveFavorites(): void {
    if (typeof localStorage !== 'undefined') {
      const data = Array.from(this.favorites.entries());
      localStorage.setItem('divergence_favorites', JSON.stringify(data));
    }
  }
  
  private loadFavorites(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const data = localStorage.getItem('divergence_favorites');
        if (data) {
          const entries = JSON.parse(data);
          this.favorites = new Map(entries);
        }
      } catch (error) {
        console.error('[Scanner] Failed to load favorites:', error);
      }
    }
  }
  
  // ============================================================================
  // 🔧 UTILITIES
  // ============================================================================
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// 📋 DEFAULT CONFIGURATIONS
// ============================================================================

export const DEFAULT_EXCHANGES = [
  'binance',
  'bybit',
  'okx',
  'mexc',
  'kucoin',
  'bitget'
];

export const DEFAULT_PAIRS = [
  '0GUSDT',
  '1000CATUSDT',
  '1000CHEEMSUSDT',
  '1000SATSUSDT',
  '1INCHUSDT',
  '1MBABYDOGEUSDT',
  '2ZUSDT',
  'A2ZUSDT',
  'AAVEUSDT',
  'ACAUSDT',
  'ACEUSDT',
  'ACHUSDT',
  'ACMUSDT',
  'ACTUSDT',
  'ACXUSDT',
  'ADAUSDT',
  'ADXUSDT',
  'AEURUSDT',
  'AEVOUSDT',
  'AGLDUSDT',
  'AIUSDT',
  'AIXBTUSDT',
  'ALCXUSDT',
  'ALGOUSDT',
  'ALICEUSDT',
  'ALLOUSDT',
  'ALPINEUSDT',
  'ALTUSDT',
  'AMPUSDT',
  'ANIMEUSDT',
  'ANKRUSDT',
  'APEUSDT',
  'API3USDT',
  'APTUSDT',
  'ARBUSDT',
  'ARDRUSDT',
  'ARKMUSDT',
  'ARKUSDT',
  'ARPAUSDT',
  'ARUSDT',
  'ASRUSDT',
  'ASTERUSDT',
  'ASTRUSDT',
  'ATAUSDT',
  'ATMUSDT',
  'ATOMUSDT',
  'ATUSDT',
  'AUCTIONUSDT',
  'AUDIOUSDT',
  'AUSDT',
  'AVAUSDT',
  'AVAXUSDT',
  'AVNTUSDT',
  'AWEUSDT',
  'AXLUSDT',
  'AXSUSDT',
  'BABYUSDT',
  'BANANAS31USDT',
  'BANANAUSDT',
  'BANDUSDT',
  'BANKUSDT',
  'BARDUSDT',
  'BARUSDT',
  'BATUSDT',
  'BBUSDT',
  'BCHUSDT',
  'BEAMXUSDT',
  'BELUSDT',
  'BERAUSDT',
  'BFUSDUSDT',
  'BICOUSDT',
  'BIFIUSDT',
  'BIGTIMEUSDT',
  'BIOUSDT',
  'BLURUSDT',
  'BMTUSDT',
  'BNBUSDT',
  'BNSOLUSDT',
  'BNTUSDT',
  'BOMEUSDT',
  'BONKUSDT',
  'BROCCOLI714USDT',
  'BTCUSDT',
  'BTTCUSDT',
  'C98USDT',
  'CAKEUSDT',
  'CATIUSDT',
  'CELOUSDT',
  'CELRUSDT',
  'CETUSUSDT',
  'CFXUSDT',
  'CGPTUSDT',
  'CHESSUSDT',
  'CHRUSDT',
  'CHZUSDT',
  'CITYUSDT',
  'CKBUSDT',
  'COMPUSDT',
  'COOKIEUSDT',
  'COSUSDT',
  'COTIUSDT',
  'COWUSDT',
  'CRVUSDT',
  'CTKUSDT',
  'CTSIUSDT',
  'CUSDT',
  'CVCUSDT',
  'CVXUSDT',
  'CYBERUSDT',
  'DASHUSDT',
  'DATAUSDT',
  'DCRUSDT',
  'DEGOUSDT',
  'DENTUSDT',
  'DEXEUSDT',
  'DFUSDT',
  'DGBUSDT',
  'DIAUSDT',
  'DODOUSDT',
  'DOGEUSDT',
  'DOGSUSDT',
  'DOLOUSDT',
  'DOTUSDT',
  'DUSDT',
  'DUSKUSDT',
  'DYDXUSDT',
  'DYMUSDT',
  'EDENUSDT',
  'EDUUSDT',
  'EGLDUSDT',
  'EIGENUSDT',
  'ENAUSDT',
  'ENJUSDT',
  'ENSOUSDT',
  'ENSUSDT',
  'EPICUSDT',
  'ERAUSDT',
  'ETCUSDT',
  'ETHFIUSDT',
  'ETHUSDT',
  'EULUSDT',
  'EURIUSDT',
  'EURUSDT',
  'FARMUSDT',
  'FDUSDUSDT',
  'FETUSDT',
  'FFUSDT',
  'FIDAUSDT',
  'FILUSDT',
  'FIOUSDT',
  'FISUSDT',
  'FLOKIUSDT',
  'FLOWUSDT',
  'FLUXUSDT',
  'FORMUSDT',
  'FORTHUSDT',
  'FTTUSDT',
  'FUNUSDT',
  'FUSDT',
  'FXSUSDT',
  'GALAUSDT',
  'GASUSDT',
  'GHSTUSDT',
  'GIGGLEUSDT',
  'GLMRUSDT',
  'GLMUSDT',
  'GMTUSDT',
  'GMXUSDT',
  'GNOUSDT',
  'GNSUSDT',
  'GPSUSDT',
  'GRTUSDT',
  'GTCUSDT',
  'GUNUSDT',
  'GUSDT',
  'HAEDALUSDT',
  'HBARUSDT',
  'HEIUSDT',
  'HEMIUSDT',
  'HFTUSDT',
  'HIGHUSDT',
  'HIVEUSDT',
  'HMSTRUSDT',
  'HOLOUSDT',
  'HOMEUSDT',
  'HOOKUSDT',
  'HOTUSDT',
  'HUMAUSDT',
  'HYPERUSDT',
  'ICPUSDT',
  'ICXUSDT',
  'IDEXUSDT',
  'IDUSDT',
  'ILVUSDT',
  'IMXUSDT',
  'INITUSDT',
  'INJUSDT',
  'IOSTUSDT',
  'IOTAUSDT',
  'IOTXUSDT',
  'IOUSDT',
  'IQUSDT',
  'JASMYUSDT',
  'JOEUSDT',
  'JSTUSDT',
  'JTOUSDT',
  'JUPUSDT',
  'JUVUSDT',
  'KAIAUSDT',
  'KAITOUSDT',
  'KAVAUSDT',
  'KERNELUSDT',
  'KITEUSDT',
  'KMNOUSDT',
  'KNCUSDT',
  'KSMUSDT',
  'LAUSDT',
  'LAYERUSDT',
  'LAZIOUSDT',
  'LDOUSDT',
  'LINEAUSDT',
  'LINKUSDT',
  'LISTAUSDT',
  'LPTUSDT',
  'LQTYUSDT',
  'LRCUSDT',
  'LSKUSDT',
  'LTCUSDT',
  'LUMIAUSDT',
  'LUNAUSDT',
  'LUNCUSDT',
  'MAGICUSDT',
  'MANAUSDT',
  'MANTAUSDT',
  'MASKUSDT',
  'MAVUSDT',
  'MBLUSDT',
  'MBOXUSDT',
  'MDTUSDT',
  'MEMEUSDT',
  'METISUSDT',
  'METUSDT',
  'MEUSDT',
  'MINAUSDT',
  'MIRAUSDT',
  'MITOUSDT',
  'MLNUSDT',
  'MMTUSDT',
  'MORPHOUSDT',
  'MOVEUSDT',
  'MOVRUSDT',
  'MTLUSDT',
  'MUBARAKUSDT',
  'NEARUSDT',
  'NEIROUSDT',
  'NEOUSDT',
  'NEWTUSDT',
  'NEXOUSDT',
  'NFPUSDT',
  'NILUSDT',
  'NKNUSDT',
  'NMRUSDT',
  'NOMUSDT',
  'NOTUSDT',
  'NTRNUSDT',
  'NXPCUSDT',
  'OGNUSDT',
  'OGUSDT',
  'OMUSDT',
  'ONDOUSDT',
  'ONEUSDT',
  'ONGUSDT',
  'ONTUSDT',
  'OPENUSDT',
  'OPUSDT',
  'ORCAUSDT',
  'ORDIUSDT',
  'OSMOUSDT',
  'OXTUSDT',
  'PARTIUSDT',
  'PAXGUSDT',
  'PENDLEUSDT',
  'PENGUUSDT',
  'PEOPLEUSDT',
  'PEPEUSDT',
  'PHAUSDT',
  'PHBUSDT',
  'PIVXUSDT',
  'PIXELUSDT',
  'PLUMEUSDT',
  'PNUTUSDT',
  'POLUSDT',
  'POLYXUSDT',
  'PONDUSDT',
  'PORTALUSDT',
  'PORTOUSDT',
  'POWRUSDT',
  'PROMUSDT',
  'PROVEUSDT',
  'PSGUSDT',
  'PUMPUSDT',
  'PUNDIXUSDT',
  'PYRUSDT',
  'PYTHUSDT',
  'QIUSDT',
  'QKCUSDT',
  'QNTUSDT',
  'QTUMUSDT',
  'QUICKUSDT',
  'RADUSDT',
  'RAREUSDT',
  'RAYUSDT',
  'RDNTUSDT',
  'REDUSDT',
  'REIUSDT',
  'RENDERUSDT',
  'REQUSDT',
  'RESOLVUSDT',
  'REZUSDT',
  'RIFUSDT',
  'RLCUSDT',
  'RONINUSDT',
  'ROSEUSDT',
  'RPLUSDT',
  'RSRUSDT',
  'RUNEUSDT',
  'RVNUSDT',
  'SAGAUSDT',
  'SAHARAUSDT',
  'SANDUSDT',
  'SANTOSUSDT',
  'SAPIENUSDT',
  'SCRTUSDT',
  'SCRUSDT',
  'SCUSDT',
  'SEIUSDT',
  'SFPUSDT',
  'SHELLUSDT',
  'SHIBUSDT',
  'SIGNUSDT',
  'SKLUSDT',
  'SKYUSDT',
  'SLPUSDT',
  'SNXUSDT',
  'SOLUSDT',
  'SOLVUSDT',
  'SOMIUSDT',
  'SOPHUSDT',
  'SPELLUSDT',
  'SPKUSDT',
  'SSVUSDT',
  'STEEMUSDT',
  'STGUSDT',
  'STORJUSDT',
  'STOUSDT',
  'STRAXUSDT',
  'STRKUSDT',
  'STXUSDT',
  'SUIUSDT',
  'SUNUSDT',
  'SUPERUSDT',
  'SUSDT',
  'SUSHIUSDT',
  'SXPUSDT',
  'SXTUSDT',
  'SYNUSDT',
  'SYRUPUSDT',
  'SYSUSDT',
  'TAOUSDT',
  'TFUELUSDT',
  'THETAUSDT',
  'THEUSDT',
  'TIAUSDT',
  'TKOUSDT',
  'TLMUSDT',
  'TNSRUSDT',
  'TONUSDT',
  'TOWNSUSDT',
  'TRBUSDT',
  'TREEUSDT',
  'TRUMPUSDT',
  'TRUUSDT',
  'TRXUSDT',
  'TSTUSDT',
  'TURBOUSDT',
  'TURTLEUSDT',
  'TUSDT',
  'TUSDUSDT',
  'TUTUSDT',
  'TWTUSDT',
  'UMAUSDT',
  'UNIUSDT',
  'USD1USDT',
  'USDCUSDT',
  'USDEUSDT',
  'USDPUSDT',
  'USTCUSDT',
  'USUALUSDT',
  'UTKUSDT',
  'VANAUSDT',
  'VANRYUSDT',
  'VELODROMEUSDT',
  'VETUSDT',
  'VICUSDT',
  'VIRTUALUSDT',
  'VOXELUSDT',
  'VTHOUSDT',
  'WALUSDT',
  'WANUSDT',
  'WAXPUSDT',
  'WBETHUSDT',
  'WBTCUSDT',
  'WCTUSDT',
  'WIFUSDT',
  'WINUSDT',
  'WLDUSDT',
  'WLFIUSDT',
  'WOOUSDT',
  'WUSDT',
  'XAIUSDT',
  'XECUSDT',
  'XLMUSDT',
  'XNOUSDT',
  'XPLUSDT',
  'XRPUSDT',
  'XTZUSDT',
  'XUSDUSDT',
  'XVGUSDT',
  'XVSUSDT',
  'YBUSDT',
  'YFIUSDT',
  'YGGUSDT',
  'ZBTUSDT',
  'ZECUSDT',
  'ZENUSDT',
  'ZILUSDT',
  'ZKCUSDT',
  'ZKUSDT',
  'ZROUSDT',
  'ZRXUSDT'
];

export const DEFAULT_TIMEFRAMES = [
  '15m',
  '1h',
  '4h',
  '1d',
  '3d'
];

export const DEFAULT_INDICATORS: IndicatorType[] = [
  'RSI',
  'MACD',
  'OBV',
  'STOCH_RSI',
  'CCI',
  'MFI',
  'WILLIAMS_R'
];

export const DEFAULT_DIVERGENCE_TYPES: DivergenceType[] = [
  'strong',
  'medium',
  'weak',
  'hidden',
  'exaggerated',
  'reverse'
];

export const DEFAULT_DIRECTIONS: DivergenceDirection[] = [
  'bullish',
  'bearish'
];

export const DEFAULT_SCANNER_CONFIG: ScannerConfig = {
  exchanges: DEFAULT_EXCHANGES.slice(0, 3), // Top 3 for speed
  pairs: DEFAULT_PAIRS.slice(0, 10),        // Top 10 pairs
  timeframes: DEFAULT_TIMEFRAMES,
  indicators: DEFAULT_INDICATORS,
  divergenceTypes: DEFAULT_DIVERGENCE_TYPES,
  directions: DEFAULT_DIRECTIONS,
  minScore: 30,  // ← تخفيف: كان 50
  strictMode: false
};

// ============================================================================
// 📤 SINGLETON INSTANCE
// ============================================================================

let scannerInstance: DivergenceScannerService | null = null;

export function getScannerInstance(baseUrl?: string): DivergenceScannerService {
  if (!scannerInstance) {
    scannerInstance = new DivergenceScannerService(baseUrl);
  }
  return scannerInstance;
}
