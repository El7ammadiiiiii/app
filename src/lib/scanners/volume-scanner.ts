/**
 * 📊 Volume Scanner - محرك رصد الفوليوم غير الطبيعي
 * 
 * جميع المعادلات الرياضية لتحليل حجم التداول
 * Mathematical formulas for volume analysis
 * 
 * @author CCWAYS Team
 * @version 1.0.0
 * @created 2026-01-01
 */

// ============================================================================
// 📊 TYPES AND INTERFACES
// ============================================================================

export interface OHLCV
{
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type SignalStrength = 'EXTREME' | 'VERY_HIGH' | 'HIGH' | 'MODERATE';

export type VolumeStatus =
  | 'all'
  | 'extreme_spike'    // Z-Score >= 3
  | 'high_spike'       // Z-Score >= 2
  | 'increasing'       // VROC > 50%
  | 'decreasing';      // VROC < -30%

export interface VolumeMetrics
{
  currentVolume: number;
  averageVolumeSMA: number;
  averageVolumeEMA: number;
  stdDeviation: number;
  volumeRatio: number;
  zScore: number;
  vrocPercent: number;
  volumeUSD: number;
  avgVolumeUSD: number;
  currentPrice: number;
  priceChange24h: number;
}

export interface AdvancedMetrics
{
  obv: number;
  obvChange: number;
  vwap: number;
  priceVsVWAP: number;
  mfi: number;
  volumePriceRatio: number;
  divergence: {
    priceChangePercent: number;
    volumeChangePercent: number;
    divergenceType: 'BULLISH' | 'BEARISH' | null;
  };
}

export interface VolumeResult
{
  id: string;
  symbol: string;
  exchange: string;
  timeframe: string;
  signalStrength: SignalStrength;
  status: VolumeStatus;
  metrics: VolumeMetrics;
  advanced?: AdvancedMetrics;
  candles?: OHLCV[];
  scannedAt: number;
}

export interface VolumeScannerConfig
{
  exchanges: string[];
  pairs: string[];
  timeframes: string[];
  statusFilter: VolumeStatus;
  ratioThreshold: number;
  zScoreThreshold: number;
  minVolumeUSD: number;
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
  results: VolumeResult[];
  scannedAt: Date;
  totalScanned: number;
  totalFound: number;
  duration: number;
  errors: string[];
}

// ============================================================================
// 🎨 CONSTANTS
// ============================================================================

export const SIGNAL_COLORS: Record<SignalStrength, string> = {
  EXTREME: '#FF0000',
  VERY_HIGH: '#FF6600',
  HIGH: '#FFCC00',
  MODERATE: '#00CC00',
};

export const VOLUME_STATUS_LABELS: Record<VolumeStatus, { ar: string; en: string }> = {
  all: { ar: 'الكل', en: 'All' },
  extreme_spike: { ar: 'ارتفاع استثنائي', en: 'Extreme Spike' },
  high_spike: { ar: 'ارتفاع كبير', en: 'High Spike' },
  increasing: { ar: 'متزايد', en: 'Increasing' },
  decreasing: { ar: 'متناقص', en: 'Decreasing' },
};

export const TIMEFRAME_LABELS: Record<string, { ar: string; en: string }> = {
  '15m': { ar: '15 دقيقة', en: '15m' },
  '1h': { ar: '1 ساعة', en: '1h' },
  '4h': { ar: '4 ساعات', en: '4h' },
  '1d': { ar: '1 يوم', en: '1d' },
  '1w': { ar: 'أسبوع', en: '1W' },
};

export const DEFAULT_EXCHANGES = [
  'bybit', 'coinbase', 'okx', 'kucoin', 'mexc',
  'bitget', 'gate', 'htx', 'bingx', 'phemex',
  'cryptocom', 'kraken',
];

export const DEFAULT_TIMEFRAMES = [ '15m', '1h', '4h', '1d', '1w' ];

import { TOP_200_SYMBOLS } from '../constants/market';
export const DEFAULT_PAIRS = TOP_200_SYMBOLS;

// ============================================================================
// 📐 MATHEMATICAL CALCULATIONS
// ============================================================================

/**
 * حساب المتوسط المتحرك البسيط (SMA)
 * المعادلة: SMA = Σ(Volume[i]) / n
 */
export function calculateSMA ( data: number[], period: number ): number
{
  if ( data.length < period ) return 0;
  const slice = data.slice( -period );
  return slice.reduce( ( sum, val ) => sum + val, 0 ) / period;
}

/**
 * حساب المتوسط المتحرك الأسي (EMA)
 * المعادلة: EMA = Price(t) × k + EMA(y) × (1−k)
 * حيث k = 2 / (period + 1)
 */
export function calculateEMA ( data: number[], period: number ): number
{
  if ( data.length < period ) return 0;
  const k = 2 / ( period + 1 );
  let ema = data[ 0 ];
  for ( let i = 1; i < data.length; i++ )
  {
    ema = data[ i ] * k + ema * ( 1 - k );
  }
  return ema;
}

/**
 * حساب الانحراف المعياري (Standard Deviation)
 * المعادلة: σ = √[Σ(Volume[i] - SMA)² / n]
 */
export function calculateStdDev ( data: number[], period: number ): number
{
  if ( data.length < period ) return 0;
  const slice = data.slice( -period );
  const mean = calculateSMA( slice, period );
  const squaredDiffs = slice.map( val => Math.pow( val - mean, 2 ) );
  const variance = squaredDiffs.reduce( ( sum, val ) => sum + val, 0 ) / period;
  return Math.sqrt( variance );
}

/**
 * حساب Z-Score
 * المعادلة: Z = (Current Value - Mean) / Standard Deviation
 * 
 * التفسير:
 * - Z > 2: انحراف كبير (95% confidence)
 * - Z > 3: انحراف استثنائي (99% confidence)
 */
export function calculateZScore ( currentValue: number, mean: number, stdDev: number ): number
{
  if ( stdDev === 0 ) return 0;
  return ( currentValue - mean ) / stdDev;
}

/**
 * حساب نسبة الفوليوم
 * المعادلة: Ratio = Current Volume / Average Volume
 */
export function calculateVolumeRatio ( currentVolume: number, averageVolume: number ): number
{
  if ( averageVolume === 0 ) return 0;
  return currentVolume / averageVolume;
}

/**
 * حساب معدل تغير الفوليوم (VROC)
 * المعادلة: VROC = [(Current - Past) / Past] × 100
 */
export function calculateVROC ( currentVolume: number, pastVolume: number ): number
{
  if ( pastVolume === 0 ) return 0;
  return ( ( currentVolume - pastVolume ) / pastVolume ) * 100;
}

/**
 * حساب نسبة الفوليوم للسعر (VPR)
 * المعادلة: VPR = Volume / Price
 */
export function calculateVPR ( volume: number, price: number ): number
{
  if ( price === 0 ) return 0;
  return volume / price;
}

// ============================================================================
// 📊 ADVANCED INDICATORS
// ============================================================================

/**
 * حساب On-Balance Volume (OBV)
 * المعادلة:
 * - إذا Close > Close السابق: OBV = OBV السابق + Volume
 * - إذا Close < Close السابق: OBV = OBV السابق - Volume
 * - إذا Close = Close السابق: OBV = OBV السابق
 */
export function calculateOBV ( data: OHLCV[] ): number[]
{
  const obv: number[] = [ 0 ];
  for ( let i = 1; i < data.length; i++ )
  {
    if ( data[ i ].close > data[ i - 1 ].close )
    {
      obv.push( obv[ i - 1 ] + data[ i ].volume );
    } else if ( data[ i ].close < data[ i - 1 ].close )
    {
      obv.push( obv[ i - 1 ] - data[ i ].volume );
    } else
    {
      obv.push( obv[ i - 1 ] );
    }
  }
  return obv;
}

/**
 * حساب Volume Weighted Average Price (VWAP)
 * المعادلة: VWAP = Σ(Price × Volume) / Σ(Volume)
 */
export function calculateVWAP ( data: OHLCV[] ): number
{
  let sumPV = 0;
  let sumV = 0;
  for ( const candle of data )
  {
    const typicalPrice = ( candle.high + candle.low + candle.close ) / 3;
    sumPV += typicalPrice * candle.volume;
    sumV += candle.volume;
  }
  return sumV === 0 ? 0 : sumPV / sumV;
}

/**
 * حساب Money Flow Index (MFI)
 * المعادلات:
 * 1. Typical Price = (High + Low + Close) / 3
 * 2. Raw Money Flow = Typical Price × Volume
 * 3. Money Flow Ratio = Positive Flow / Negative Flow
 * 4. MFI = 100 - (100 / (1 + Money Flow Ratio))
 */
export function calculateMFI ( data: OHLCV[], period: number = 14 ): number
{
  if ( data.length < period + 1 ) return 50;

  const typicalPrices = data.map( d => ( d.high + d.low + d.close ) / 3 );
  const rawMoneyFlow = data.map( ( d, i ) => typicalPrices[ i ] * d.volume );

  const positiveFlow: number[] = [];
  const negativeFlow: number[] = [];

  for ( let i = 1; i < data.length; i++ )
  {
    if ( typicalPrices[ i ] > typicalPrices[ i - 1 ] )
    {
      positiveFlow.push( rawMoneyFlow[ i ] );
      negativeFlow.push( 0 );
    } else
    {
      positiveFlow.push( 0 );
      negativeFlow.push( rawMoneyFlow[ i ] );
    }
  }

  const positiveSum = positiveFlow.slice( -period ).reduce( ( sum, val ) => sum + val, 0 );
  const negativeSum = negativeFlow.slice( -period ).reduce( ( sum, val ) => sum + val, 0 );

  if ( negativeSum === 0 ) return 100;

  const moneyFlowRatio = positiveSum / negativeSum;
  return 100 - ( 100 / ( 1 + moneyFlowRatio ) );
}

/**
 * رصد تباعد الفوليوم مع السعر
 * - Bullish Divergence: السعر يهبط + الفوليوم يرتفع
 * - Bearish Divergence: السعر يرتفع + الفوليوم يهبط
 */
export function detectVolumeDivergence (
  data: OHLCV[],
  period: number = 14
): AdvancedMetrics[ 'divergence' ]
{
  if ( data.length < period )
  {
    return { priceChangePercent: 0, volumeChangePercent: 0, divergenceType: null };
  }

  const recentData = data.slice( -period );
  const priceChange = ( ( recentData[ recentData.length - 1 ].close - recentData[ 0 ].close ) / recentData[ 0 ].close ) * 100;
  const volumeChange = ( ( recentData[ recentData.length - 1 ].volume - recentData[ 0 ].volume ) / recentData[ 0 ].volume ) * 100;

  let divergenceType: 'BULLISH' | 'BEARISH' | null = null;

  if ( priceChange < 0 && volumeChange > 20 )
  {
    divergenceType = 'BULLISH';
  } else if ( priceChange > 0 && volumeChange < -20 )
  {
    divergenceType = 'BEARISH';
  }

  return { priceChangePercent: priceChange, volumeChangePercent: volumeChange, divergenceType };
}

// ============================================================================
// 📊 VOLUME ANALYSIS
// ============================================================================

/**
 * حساب الفوليوم النسبي مع جميع المؤشرات
 */
export function calculateRelativeVolume ( data: OHLCV[], period: number = 20 ): VolumeMetrics | null
{
  if ( data.length < period + 1 ) return null;

  const historicalVolume = data.slice( -( period + 1 ), -1 ).map( d => d.volume );
  const currentVolume = data[ data.length - 1 ].volume;
  const currentPrice = data[ data.length - 1 ].close;
  const previousPrice = data[ data.length - 2 ]?.close || currentPrice;

  const sma = calculateSMA( historicalVolume, period );
  const ema = calculateEMA( data.slice( 0, -1 ).map( d => d.volume ), period );
  const stdDev = calculateStdDev( historicalVolume, period );

  const volumeRatio = calculateVolumeRatio( currentVolume, sma );
  const zScore = calculateZScore( currentVolume, sma, stdDev );
  const vroc = calculateVROC( currentVolume, historicalVolume[ 0 ] );

  const volumeUSD = currentVolume * currentPrice;
  const avgPrices = data.slice( -( period + 1 ), -1 ).map( d => d.close );
  const avgPrice = calculateSMA( avgPrices, period );
  const avgVolumeUSD = sma * avgPrice;

  const priceChange24h = ( ( currentPrice - previousPrice ) / previousPrice ) * 100;

  return {
    currentVolume,
    averageVolumeSMA: sma,
    averageVolumeEMA: ema,
    stdDeviation: stdDev,
    volumeRatio,
    zScore,
    vrocPercent: vroc,
    volumeUSD,
    avgVolumeUSD,
    currentPrice,
    priceChange24h,
  };
}

/**
 * حساب المؤشرات المتقدمة
 */
export function calculateAdvancedMetrics ( data: OHLCV[] ): AdvancedMetrics | null
{
  if ( data.length < 20 ) return null;

  const obvValues = calculateOBV( data );
  const vwap = calculateVWAP( data );
  const mfi = calculateMFI( data );
  const divergence = detectVolumeDivergence( data );

  const currentPrice = data[ data.length - 1 ].close;
  const currentVolume = data[ data.length - 1 ].volume;

  return {
    obv: obvValues[ obvValues.length - 1 ],
    obvChange: obvValues[ obvValues.length - 1 ] - obvValues[ Math.max( 0, obvValues.length - 6 ) ],
    vwap,
    priceVsVWAP: currentPrice - vwap,
    mfi,
    volumePriceRatio: calculateVPR( currentVolume, currentPrice ),
    divergence,
  };
}

/**
 * تحديد قوة الإشارة
 */
export function getSignalStrength ( zScore: number ): SignalStrength
{
  if ( zScore >= 3 ) return 'EXTREME';
  if ( zScore >= 2.5 ) return 'VERY_HIGH';
  if ( zScore >= 2 ) return 'HIGH';
  return 'MODERATE';
}

/**
 * تحديد حالة الفوليوم
 */
export function getVolumeStatus ( zScore: number, vroc: number ): VolumeStatus
{
  if ( zScore >= 3 ) return 'extreme_spike';
  if ( zScore >= 2 ) return 'high_spike';
  if ( vroc > 50 ) return 'increasing';
  if ( vroc < -30 ) return 'decreasing';
  return 'all';
}

/**
 * رصد ارتفاع الفوليوم غير الطبيعي
 */
export function detectVolumeSpike (
  symbol: string,
  exchange: string,
  timeframe: string,
  data: OHLCV[],
  lookbackPeriod: number = 20,
  ratioThreshold: number = 2.0,
  zScoreThreshold: number = 2.0,
  minVolumeUSD: number = 100000
): VolumeResult | null
{
  const metrics = calculateRelativeVolume( data, lookbackPeriod );
  if ( !metrics ) return null;

  const isSpike = metrics.volumeRatio >= ratioThreshold || metrics.zScore >= zScoreThreshold;
  if ( !isSpike || metrics.volumeUSD < minVolumeUSD ) return null;

  const signalStrength = getSignalStrength( metrics.zScore );
  const status = getVolumeStatus( metrics.zScore, metrics.vrocPercent );
  const advanced = calculateAdvancedMetrics( data );

  return {
    id: `${ exchange }-${ symbol.replace( '/', '-' ) }-${ timeframe }-${ Date.now() }`,
    symbol,
    exchange,
    timeframe,
    signalStrength,
    status,
    metrics,
    advanced: advanced || undefined,
    candles: data.slice( -50 ),
    scannedAt: Date.now(),
  };
}

// ============================================================================
// 📊 VOLUME SCANNER CLASS
// ============================================================================

type ProgressCallback = ( progress: ScanProgress ) => void;
type ResultCallback = ( result: VolumeResult ) => void;

export class VolumeScanner
{
  private isScanning: boolean = false;
  private shouldStop: boolean = false;
  private results: VolumeResult[] = [];

  async scan (
    config: VolumeScannerConfig,
    fetchOHLCV: ( exchange: string, symbol: string, timeframe: string, limit: number ) => Promise<OHLCV[] | null>,
    progressCallback?: ProgressCallback,
    resultCallback?: ResultCallback
  ): Promise<ScanResult>
  {
    this.isScanning = true;
    this.shouldStop = false;
    this.results = [];

    const startTime = Date.now();
    const { exchanges, pairs, timeframes, statusFilter, ratioThreshold, zScoreThreshold, minVolumeUSD } = config;

    const total = pairs.length * exchanges.length * timeframes.length;
    let completed = 0;
    const errors: string[] = [];

    for ( const exchange of exchanges )
    {
      if ( this.shouldStop ) break;

      for ( const pair of pairs )
      {
        if ( this.shouldStop ) break;

        for ( const timeframe of timeframes )
        {
          if ( this.shouldStop ) break;

          completed++;
          const current = `${ exchange }/${ pair }/${ timeframe }`;

          const progress: ScanProgress = {
            total,
            completed,
            current,
            percentage: Math.round( ( completed / total ) * 100 ),
            startTime,
            estimatedTimeRemaining: this.estimateTimeRemaining( startTime, completed, total ),
          };

          progressCallback?.( progress );

          try
          {
            const candles = await fetchOHLCV( exchange, pair, timeframe, 50 );

            if ( candles && candles.length >= 20 )
            {
              const result = detectVolumeSpike(
                pair,
                exchange,
                timeframe,
                candles,
                20,
                ratioThreshold,
                zScoreThreshold,
                minVolumeUSD
              );

              if ( result )
              {
                if ( statusFilter === 'all' || result.status === statusFilter )
                {
                  this.results.push( result );
                  resultCallback?.( result );
                }
              }
            }
          } catch ( error )
          {
            errors.push( `${ current }: ${ error }` );
          }

          await new Promise( resolve => setTimeout( resolve, 50 ) );
        }
      }
    }

    this.isScanning = false;

    this.results.sort( ( a, b ) => b.metrics.zScore - a.metrics.zScore );

    return {
      results: this.results,
      scannedAt: new Date(),
      totalScanned: completed,
      totalFound: this.results.length,
      duration: Date.now() - startTime,
      errors,
    };
  }

  stop (): void
  {
    this.shouldStop = true;
  }

  isRunning (): boolean
  {
    return this.isScanning;
  }

  getResults (): VolumeResult[]
  {
    return this.results;
  }

  private estimateTimeRemaining ( startTime: number, completed: number, total: number ): number
  {
    if ( completed === 0 ) return 0;
    const elapsed = Date.now() - startTime;
    const avgPerItem = elapsed / completed;
    return Math.round( avgPerItem * ( total - completed ) );
  }
}

// ============================================================================
// 🔧 HELPER FUNCTIONS
// ============================================================================

export function formatVolume ( volume: number ): string
{
  if ( volume >= 1e9 ) return `${ ( volume / 1e9 ).toFixed( 2 ) }B`;
  if ( volume >= 1e6 ) return `${ ( volume / 1e6 ).toFixed( 2 ) }M`;
  if ( volume >= 1e3 ) return `${ ( volume / 1e3 ).toFixed( 2 ) }K`;
  return volume.toFixed( 2 );
}

export function formatUSD ( amount: number ): string
{
  return new Intl.NumberFormat( 'en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  } ).format( amount );
}

export function formatPercent ( value: number ): string
{
  const sign = value >= 0 ? '+' : '';
  return `${ sign }${ value.toFixed( 2 ) }%`;
}

export function getSignalColor ( strength: SignalStrength ): string
{
  return SIGNAL_COLORS[ strength ];
}
