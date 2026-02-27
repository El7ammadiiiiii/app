/**
 * 🔄 Real-Time Levels Scanner Service - خدمة فحص مستويات الدعم والمقاومة
 * 
 * خدمة متكاملة لفحص عدة أزواج ومنصات وأطر زمنية
 * Comprehensive service for scanning multiple pairs, exchanges, and timeframes
 * 
 * @author CCWAYS Team
 * @version 1.0.0
 * @created 2025-12-31
 */

import
  {
    PivotLevelsDetector,
    LevelResult,
    LevelStatus,
    OHLCV,
  } from './levels-detector';

// ============================================================================
// 📊 TYPES AND INTERFACES
// ============================================================================

export interface LevelsScannerConfig
{
  exchanges: string[];
  pairs: string[];
  timeframes: string[];
  statusFilter: LevelStatus;
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
  results: LevelResult[];
  scannedAt: Date;
  totalScanned: number;
  totalFound: number;
  duration: number;
  errors: string[];
}

type ProgressCallback = ( progress: ScanProgress ) => void;
type ResultCallback = ( result: LevelResult ) => void;

// ============================================================================
// 🎛️ DEFAULT CONFIGURATIONS
// ============================================================================

export const DEFAULT_EXCHANGES = [
  'bybit',
  'coinbase',
  'okx',
  'kucoin',
  'mexc',
  'bitget',
  'gate',
  'htx',
  'bingx',
  'phemex',
  'cryptocom',
  'kraken',
];

export const DEFAULT_TIMEFRAMES = [ '15m', '1h', '4h', '1d', '1w' ];

import { TOP_100_SYMBOLS } from '../constants/market';
// أزواج USDT الافتراضية
export const DEFAULT_PAIRS = TOP_100_SYMBOLS;

// ============================================================================
// 📊 LEVELS SCANNER CLASS
// ============================================================================

export class LevelsScanner
{
  private detector: PivotLevelsDetector;
  private isScanning: boolean = false;
  private shouldStop: boolean = false;
  private results: LevelResult[] = [];

  constructor ()
  {
    this.detector = new PivotLevelsDetector();
  }

  /**
   * 🚀 بدء الفحص
   */
  async scan (
    config: LevelsScannerConfig,
    onProgress?: ProgressCallback,
    onResult?: ResultCallback
  ): Promise<ScanResult>
  {
    this.isScanning = true;
    this.shouldStop = false;
    this.results = [];
    const errors: string[] = [];
    const startTime = Date.now();

    const { exchanges, pairs, timeframes, statusFilter } = config;

    // حساب إجمالي العمليات
    const totalOperations = exchanges.length * pairs.length * timeframes.length;
    let completed = 0;

    for ( const exchange of exchanges )
    {
      if ( this.shouldStop ) break;

      for ( const pair of pairs )
      {
        if ( this.shouldStop ) break;

        for ( const timeframe of timeframes )
        {
          if ( this.shouldStop ) break;

          try
          {
            // تحديث التقدم
            if ( onProgress )
            {
              const elapsed = Date.now() - startTime;
              const avgTimePerOp = completed > 0 ? elapsed / completed : 500;
              const remaining = ( totalOperations - completed ) * avgTimePerOp;

              onProgress( {
                total: totalOperations,
                completed,
                current: `${ exchange } - ${ pair } - ${ timeframe }`,
                percentage: Math.round( ( completed / totalOperations ) * 100 ),
                startTime,
                estimatedTimeRemaining: remaining,
              } );
            }

            // جلب البيانات
            const candles = await this.fetchOHLCV( pair, exchange, timeframe );

            if ( candles.length > 0 )
            {
              // الكشف عن المستويات
              const result = this.detector.detect( candles, pair, exchange, timeframe );

              // فلترة حسب الحالة
              if ( statusFilter === 'all' || result.status === statusFilter )
              {
                this.results.push( result );

                if ( onResult )
                {
                  onResult( result );
                }
              }
            }
          } catch ( error )
          {
            const errorMsg = `Error scanning ${ exchange }:${ pair }:${ timeframe }: ${ error }`;
            errors.push( errorMsg );
            console.error( errorMsg );
          }

          completed++;
        }
      }
    }

    this.isScanning = false;
    const duration = Date.now() - startTime;

    return {
      results: this.results,
      scannedAt: new Date(),
      totalScanned: completed,
      totalFound: this.results.length,
      duration,
      errors,
    };
  }

  /**
   * 🛑 إيقاف الفحص
   */
  stop (): void
  {
    this.shouldStop = true;
  }

  /**
   * 📊 جلب بيانات OHLCV
   */
  private async fetchOHLCV (
    symbol: string,
    exchange: string,
    timeframe: string
  ): Promise<OHLCV[]>
  {
    try
    {
      // استخدام GET مع query parameters (API يستخدم interval وليس timeframe)
      const params = new URLSearchParams( {
        symbol,
        exchange,
        interval: timeframe,
        limit: '500', // نحتاج بيانات كافية للـ Pivot 100
      } );

      const response = await fetch( `/api/ohlcv?${ params.toString() }` );

      if ( !response.ok )
      {
        throw new Error( `HTTP error! status: ${ response.status }` );
      }

      const data = await response.json();

      if ( data.error )
      {
        throw new Error( data.error );
      }

      // الـ API يُرجع data وليس candles
      return data.data || [];
    } catch ( error )
    {
      console.error( `Failed to fetch OHLCV for ${ exchange }:${ symbol }:${ timeframe }:`, error );
      return [];
    }
  }

  /**
   * 📈 جلب قائمة أزواج USDT من المنصة
   */
  async fetchUSDTPairs ( exchange: string ): Promise<string[]>
  {
    try
    {
      const response = await fetch( `/api/exchanges/${ exchange }/pairs?quote=USDT` );

      if ( !response.ok )
      {
        // إرجاع الأزواج الافتراضية إذا فشل الجلب
        return DEFAULT_PAIRS;
      }

      const data = await response.json();
      return data.pairs || DEFAULT_PAIRS;
    } catch ( error )
    {
      console.error( `Failed to fetch pairs for ${ exchange }:`, error );
      return DEFAULT_PAIRS;
    }
  }

  /**
   * 🔍 هل الفحص جاري؟
   */
  getIsScanning (): boolean
  {
    return this.isScanning;
  }

  /**
   * 📊 الحصول على النتائج الحالية
   */
  getResults (): LevelResult[]
  {
    return this.results;
  }

  /**
   * 🧹 مسح النتائج
   */
  clearResults (): void
  {
    this.results = [];
  }

  /**
   * 📊 فلترة النتائج
   */
  filterResults (
    status?: LevelStatus,
    exchange?: string,
    timeframe?: string,
    searchQuery?: string
  ): LevelResult[]
  {
    let filtered = [ ...this.results ];

    if ( status && status !== 'all' )
    {
      filtered = filtered.filter( r => r.status === status );
    }

    if ( exchange )
    {
      filtered = filtered.filter( r => r.exchange === exchange );
    }

    if ( timeframe )
    {
      filtered = filtered.filter( r => r.timeframe === timeframe );
    }

    if ( searchQuery )
    {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter( r =>
        r.symbol.toLowerCase().includes( query ) ||
        r.exchange.toLowerCase().includes( query )
      );
    }

    return filtered;
  }

  /**
   * 📊 ترتيب النتائج
   */
  sortResults (
    results: LevelResult[],
    sortBy: 'symbol' | 'distance' | 'strength' | 'time',
    order: 'asc' | 'desc' = 'desc'
  ): LevelResult[]
  {
    const sorted = [ ...results ];

    sorted.sort( ( a, b ) =>
    {
      let comparison = 0;

      switch ( sortBy )
      {
        case 'symbol':
          comparison = a.symbol.localeCompare( b.symbol );
          break;
        case 'distance':
          const distA = Math.min(
            a.distanceToNearestResistance ?? Infinity,
            a.distanceToNearestSupport ?? Infinity
          );
          const distB = Math.min(
            b.distanceToNearestResistance ?? Infinity,
            b.distanceToNearestSupport ?? Infinity
          );
          comparison = distA - distB;
          break;
        case 'strength':
          const strengthA = Math.max( ...( a.levels.map( l => l.strength ) || [ 0 ] ) );
          const strengthB = Math.max( ...( b.levels.map( l => l.strength ) || [ 0 ] ) );
          comparison = strengthA - strengthB;
          break;
        case 'time':
          comparison = a.scannedAt - b.scannedAt;
          break;
      }

      return order === 'desc' ? -comparison : comparison;
    } );

    return sorted;
  }
}

// ============================================================================
// 🏭 SINGLETON INSTANCE
// ============================================================================

let scannerInstance: LevelsScanner | null = null;

export function getLevelsScanner (): LevelsScanner
{
  if ( !scannerInstance )
  {
    scannerInstance = new LevelsScanner();
  }
  return scannerInstance;
}

export default LevelsScanner;
