/**
 * 🔄 Real-Time Divergence Scanner Service - خدمة فحص الدايفرجنس في الوقت الفعلي
 * 
 * خدمة متكاملة لفحص عدة أزواج ومنصات وأطر زمنية
 * Comprehensive service for scanning multiple pairs, exchanges, and timeframes
 * 
 * @author CCWAYS Team
 * @version 2.0.0
 * @created 2025-12-14
 */

import
  {
    AdvancedDivergenceDetector,
    DivergenceResult,
    IndicatorType,
    DivergenceType,
    DivergenceDirection,
    OHLCV
  } from './advanced-divergence-detector';
import { TOP_200_SYMBOLS } from '../constants/market';

// ============================================================================
// 📊 TYPES AND INTERFACES
// ============================================================================

export interface ScannerConfig
{
  exchanges: string[];
  pairs: string[];
  timeframes: string[];
  indicators: IndicatorType[];
  divergenceTypes: DivergenceType[];
  directions: DivergenceDirection[];
  minScore: number;
  strictMode: boolean;
}

export interface ScanProgress
{
  total: number;
  completed: number;
  current: string;
  percentage: number;
  startTime: number;
  estimatedTimeRemaining: number;
}

export interface ScanResult
{
  results: DivergenceResult[];
  scannedAt: Date;
  totalScanned: number;
  totalFound: number;
  duration: number;
  errors: string[];
}

export interface FavoriteItem
{
  id: string;
  divergence: DivergenceResult;
  addedAt: Date;
  notes?: string;
}

type ProgressCallback = ( progress: ScanProgress ) => void;
type ResultCallback = ( result: DivergenceResult ) => void;

// ✅ Detection window - last 50 candles
const DETECTION_CANDLE_LIMIT = 50;

// ============================================================================
// 💾 CACHE MANAGER - تخزين مؤقت للأنماط المكتشفة
// ============================================================================

class CacheManager
{
  private cache: Map<string, { data: OHLCV[]; timestamp: number }> = new Map();
  private readonly TTL = 60000; // 1 minute cache for OHLCV data

  set ( key: string, data: OHLCV[] ): void
  {
    this.cache.set( key, { data, timestamp: Date.now() } );
  }

  get ( key: string ): OHLCV[] | null
  {
    const cached = this.cache.get( key );
    if ( !cached ) return null;

    if ( Date.now() - cached.timestamp > this.TTL )
    {
      this.cache.delete( key );
      return null;
    }

    return cached.data;
  }

  clear (): void
  {
    this.cache.clear();
  }

  getKey ( symbol: string, exchange: string, timeframe: string ): string
  {
    return `${ exchange }:${ symbol }:${ timeframe }`;
  }
}

// ✅ NEW: Pattern Cache Manager - تخزين مؤقت للأنماط المكتشفة لتسريع البحث
class PatternCacheManager
{
  private patternCache: Map<string, { patterns: DivergenceResult[]; timestamp: number }> = new Map();

  // TTL per timeframe (in ms) - matching freshness policy
  private getTTL ( timeframe: string ): number
  {
    const TIMEFRAME_MS: Record<string, number> = {
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000,
    };
    const FRESH_BARS: Record<string, number> = {
      '15m': 20,
      '1h': 10,
      '4h': 10,
      '1d': 5,
      '1w': 5,
    };
    const bars = FRESH_BARS[ timeframe ] || 10;
    const tfMs = TIMEFRAME_MS[ timeframe ] || 60 * 60 * 1000;
    return bars * tfMs;
  }

  setPatterns ( key: string, patterns: DivergenceResult[], timeframe: string ): void
  {
    this.patternCache.set( key, { patterns, timestamp: Date.now() } );
  }

  getPatterns ( key: string, timeframe: string ): DivergenceResult[] | null
  {
    const cached = this.patternCache.get( key );
    if ( !cached ) return null;

    const ttl = this.getTTL( timeframe );
    if ( Date.now() - cached.timestamp > ttl )
    {
      this.patternCache.delete( key );
      return null;
    }

    return cached.patterns;
  }

  getPatternKey ( symbol: string, exchange: string, timeframe: string, indicator: string ): string
  {
    return `pattern:${ exchange }:${ symbol }:${ timeframe }:${ indicator }`;
  }

  clear (): void
  {
    this.patternCache.clear();
  }

  // Auto-cleanup expired patterns
  cleanup (): void
  {
    const now = Date.now();
    for ( const [ key, value ] of this.patternCache.entries() )
    {
      // Extract timeframe from key
      const parts = key.split( ':' );
      const timeframe = parts[ 3 ] || '1h';
      const ttl = this.getTTL( timeframe );
      if ( now - value.timestamp > ttl )
      {
        this.patternCache.delete( key );
      }
    }
  }
}

// ============================================================================
// 📡 DATA FETCHER (Unified with Orchestrator)
// ============================================================================
import { apiService } from '../services/apiService';

class DataFetcher
{
  async fetchOHLCV (
    symbol: string,
    exchange: string,
    timeframe: string,
    limit: number = 200
  ): Promise<OHLCV[]>
  {
    try
    {
      // 🧠 استخدام apiService الموحد الذي يدعم التبديل التلقائي (Failover)
      const data = await apiService.getCandlesticks( {
        symbol,
        exchange,
        timeframe,
        limit
      } );

      if ( !data || !Array.isArray( data ) )
      {
        return [];
      }

      return data.map( ( d: any ) => ( {
        timestamp: Array.isArray( d ) ? d[ 0 ] : d.timestamp,
        open: Number( Array.isArray( d ) ? d[ 1 ] : d.open ),
        high: Number( Array.isArray( d ) ? d[ 2 ] : d.high ),
        low: Number( Array.isArray( d ) ? d[ 3 ] : d.low ),
        close: Number( Array.isArray( d ) ? d[ 4 ] : d.close ),
        volume: Number( Array.isArray( d ) ? d[ 5 ] : d.volume )
      } ) );
    } catch ( error )
    {
      console.error( `[DivergenceFetcher] Error for ${ symbol }:`, error );
      return [];
    }
  }
}

// ============================================================================
// 🔍 MAIN SCANNER SERVICE
// ============================================================================

export class DivergenceScannerService
{
  private detector: AdvancedDivergenceDetector;
  private cache: CacheManager;
  private patternCache: PatternCacheManager;
  private fetcher: DataFetcher;
  private isRunning: boolean = false;
  private shouldStop: boolean = false;
  private favorites: Map<string, FavoriteItem> = new Map();
  // store interval id so it can be cleared on stop/destroy
  private patternCleanupIntervalId: number | null = null;

  constructor ( baseUrl?: string )
  {
    this.detector = new AdvancedDivergenceDetector();
    this.cache = new CacheManager();
    this.patternCache = new PatternCacheManager();
    this.fetcher = new DataFetcher( baseUrl );
    this.loadFavorites();

    // ✅ Auto-cleanup expired patterns every 30 seconds
    if ( typeof window !== 'undefined' )
    {
      this.patternCleanupIntervalId = window.setInterval( () => this.patternCache.cleanup(), 30000 );
      // Also attempt initial cleanup scheduling in next tick to avoid blocking constructor
      setTimeout( () => this.patternCache.cleanup(), 0 );
    }
  }

  /**
   * بدء الفحص الشامل
   */
  async scan (
    config: ScannerConfig,
    onProgress?: ProgressCallback,
    onResult?: ResultCallback
  ): Promise<ScanResult>
  {
    if ( this.isRunning )
    {
      throw new Error( 'Scanner is already running' );
    }

    this.isRunning = true;
    this.shouldStop = false;

    const startTime = Date.now();
    const results: DivergenceResult[] = [];
    const errors: string[] = [];

    // حساب العدد الإجمالي للمهام
    const tasks: { symbol: string; exchange: string; timeframe: string; indicator: IndicatorType }[] = [];

    for ( const exchange of config.exchanges )
    {
      for ( const pair of config.pairs )
      {
        for ( const timeframe of config.timeframes )
        {
          for ( const indicator of config.indicators )
          {
            tasks.push( { symbol: pair, exchange, timeframe, indicator } );
          }
        }
      }
    }

    const total = tasks.length;
    let completed = 0;

    // تنفيذ المهام
    for ( const task of tasks )
    {
      if ( this.shouldStop ) break;

      try
      {
        // تحديث التقدم
        if ( onProgress )
        {
          const elapsed = Date.now() - startTime;
          const avgTimePerTask = completed > 0 ? elapsed / completed : 1000;
          const remaining = ( total - completed ) * avgTimePerTask;

          onProgress( {
            total,
            completed,
            current: `${ task.exchange }:${ task.symbol }:${ task.timeframe }:${ task.indicator }`,
            percentage: Math.round( ( completed / total ) * 100 ),
            startTime,
            estimatedTimeRemaining: remaining
          } );
        }

        // ✅ Check pattern cache first for faster search
        const patternCacheKey = this.patternCache.getPatternKey( task.symbol, task.exchange, task.timeframe, task.indicator );
        const cachedPatterns = this.patternCache.getPatterns( patternCacheKey, task.timeframe );

        if ( cachedPatterns )
        {
          // Use cached patterns
          const filtered = cachedPatterns.filter( d =>
          {
            if ( d.score < config.minScore ) return false;
            if ( !config.divergenceTypes.includes( d.type ) ) return false;
            if ( !config.directions.includes( d.direction ) ) return false;
            return true;
          } );

          for ( const divergence of filtered )
          {
            results.push( divergence );
            if ( onResult ) onResult( divergence );
          }

          completed++;
          continue;
        }

        // جلب البيانات - ✅ Using only last 50 candles
        const cacheKey = this.cache.getKey( task.symbol, task.exchange, task.timeframe );
        let candles = this.cache.get( cacheKey );

        if ( !candles )
        {
          candles = await this.fetcher.fetchOHLCV( task.symbol, task.exchange, task.timeframe, DETECTION_CANDLE_LIMIT );
          this.cache.set( cacheKey, candles );
        } else
        {
          // ✅ Limit to last 50 candles even from cache
          candles = candles.slice( -DETECTION_CANDLE_LIMIT );
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
        this.patternCache.setPatterns( patternCacheKey, divergences, task.timeframe );

        // تصفية النتائج
        const filtered = divergences.filter( d =>
        {
          if ( d.score < config.minScore ) return false;
          if ( !config.divergenceTypes.includes( d.type ) ) return false;
          if ( !config.directions.includes( d.direction ) ) return false;
          return true;
        } );

        // إضافة النتائج
        for ( const divergence of filtered )
        {
          results.push( divergence );
          if ( onResult ) onResult( divergence );
        }

      } catch ( error )
      {
        const errorMsg = `Failed to scan ${ task.exchange }:${ task.symbol }:${ task.timeframe }: ${ error }`;
        errors.push( errorMsg );

        // ✅ Use warn instead of error for HTTP 404 to avoid Next.js error overlay
        if ( String( error ).includes( '404' ) )
        {
          console.warn( '[Scanner]', errorMsg );
        } else
        {
          console.error( '[Scanner]', errorMsg );
        }
      }

      completed++;

      // تأخير صغير لتجنب الحد من المعدل
      await this.delay( 100 );
    }

    this.isRunning = false;

    // ترتيب النتائج حسب القوة
    results.sort( ( a, b ) => b.score - a.score );

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
  stop (): void
  {
    this.shouldStop = true;

    // Clear any background interval used for pattern cache cleanup
    if ( this.patternCleanupIntervalId != null )
    {
      clearInterval( this.patternCleanupIntervalId );
      this.patternCleanupIntervalId = null;
    }
  }

  /**
   * التحقق من حالة التشغيل
   */
  isScanning (): boolean
  {
    return this.isRunning;
  }

  /**
   * مسح الذاكرة المؤقتة
   */
  clearCache (): void
  {
    this.cache.clear();
    this.patternCache.clear();
  }

  /**
   * ✅ Clear pattern cache only (for refresh without re-fetching OHLCV)
   */
  clearPatternCache (): void
  {
    this.patternCache.clear();
  }

  // ============================================================================
  // ⭐ FAVORITES MANAGEMENT
  // ============================================================================

  addToFavorites ( divergence: DivergenceResult, notes?: string ): void
  {
    this.favorites.set( divergence.id, {
      id: divergence.id,
      divergence,
      addedAt: new Date(),
      notes
    } );
    this.saveFavorites();
  }

  removeFromFavorites ( id: string ): void
  {
    this.favorites.delete( id );
    this.saveFavorites();
  }

  isFavorite ( id: string ): boolean
  {
    return this.favorites.has( id );
  }

  getFavorites (): FavoriteItem[]
  {
    return Array.from( this.favorites.values() );
  }

  private saveFavorites (): void
  {
    if ( typeof localStorage !== 'undefined' )
    {
      const data = Array.from( this.favorites.entries() );
      localStorage.setItem( 'divergence_favorites', JSON.stringify( data ) );
    }
  }

  private loadFavorites (): void
  {
    if ( typeof localStorage !== 'undefined' )
    {
      try
      {
        const data = localStorage.getItem( 'divergence_favorites' );
        if ( data )
        {
          const entries = JSON.parse( data );
          this.favorites = new Map( entries );
        }
      } catch ( error )
      {
        console.error( '[Scanner] Failed to load favorites:', error );
      }
    }
  }

  // ============================================================================
  // 🔧 UTILITIES
  // ============================================================================

  private delay ( ms: number ): Promise<void>
  {
    return new Promise( resolve => setTimeout( resolve, ms ) );
  }
}

// ============================================================================
// 📋 DEFAULT CONFIGURATIONS
// ============================================================================

export const DEFAULT_EXCHANGES = [
  'bybit',
  'okx',
  'coinbase',
  'kraken',
  'kucoin',
  'mexc',
  'gateio',
  'bitget',
  'htx',
  'cryptocom',
  'bingx',
  'phemex',
  'pionex',
  'bitmart',
  'coinex',
  'digifinex'
];

export const DEFAULT_PAIRS = TOP_200_SYMBOLS;

export const DEFAULT_TIMEFRAMES = [
  '15m',
  '1h',
  '4h',
  '1d',
  '1w'
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
  exchanges: DEFAULT_EXCHANGES.slice( 0, 3 ), // Top 3 for speed
  pairs: DEFAULT_PAIRS.slice( 0, 10 ),        // Top 10 pairs
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

export function getScannerInstance ( baseUrl?: string ): DivergenceScannerService
{
  if ( !scannerInstance )
  {
    scannerInstance = new DivergenceScannerService( baseUrl );
  }
  return scannerInstance;
}
