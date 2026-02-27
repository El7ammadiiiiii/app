/**
 * 🔥 Advanced Divergence Detection Engine - محرك الكشف المتقدم عن الدايفرجنس
 * 
 * خوارزميات عميقة ومعقدة للكشف عن جميع أنواع الدايفرجنس بدقة الملي
 * Deep and complex algorithms for detecting all divergence types with millimeter precision
 * 
 * @author CCWAYS Team
 * @version 2.0.0
 * @created 2025-12-14
 */

// ============================================================================
// � CONSTANTS - الثوابت الداخلية
// ============================================================================

/**
 * 🎯 خصومات الثقة الثابتة حسب نطاق البحث الموسع
 * Fixed confidence penalties based on expanded search range
 * 
 * النطاق الافتراضي (±3) = لا يوجد خصم
 * كلما وسعنا البحث، كلما قل التزامن، كلما قلت الثقة
 */
const SEARCH_PENALTIES: Record<number, number> = {
  3: 0,    // النطاق المثالي - no penalty
  4: -5,   // توسع بسيط - minor expansion
  5: -10,  // توسع متوسط - medium expansion
  6: -15,  // توسع كبير - large expansion
  7: -20,  // الحد الأقصى المقبول - maximum acceptable
};

const MAX_EXPANDED_SEARCH = 7; // الحد الأقصى لتوسيع البحث

/**
 * ⏰ عدد الشموع المطلوبة لانتهاء صلاحية الدايفرجنس حسب الفريم
 * Candle expiration limits per timeframe
 */
export const EXPIRATION_CANDLES: Record<string, number> = {
  '15m': 7,  // ~1.5 ساعة
  '1h': 6,   // ~5 ساعات
  '4h': 6,   // ~16 ساعة
  '1d': 5,   // 3 أيام
  '1w': 4,   // 4 أسابيع
};

// ============================================================================
// 📊 TYPES AND INTERFACES - الأنواع والواجهات
// ============================================================================

/**
 * 🚫 أسباب رفض الدايفرجنس
 * Rejection reasons for divergences that don't meet criteria
 */
export enum RejectionReason
{
  NO_PRICE_PIVOT = 'NO_PRICE_PIVOT',                   // لم يتم العثور على قمة/قاع في السعر
  NO_INDICATOR_PIVOT = 'NO_INDICATOR_PIVOT',           // لم يتم العثور على قمة/قاع في المؤشر
  SYNC_OFFSET_EXCEEDED = 'SYNC_OFFSET_EXCEEDED',       // فرق التزامن تجاوز الحد المسموح
  LOW_CONFIDENCE = 'LOW_CONFIDENCE',                   // الثقة أقل من الحد الأدنى
  NO_DIVERGENCE = 'NO_DIVERGENCE',                     // السعر والمؤشر بنفس الاتجاه
  INSUFFICIENT_PIVOTS = 'INSUFFICIENT_PIVOTS',         // عدد النقاط المحورية غير كافٍ
  INVALID_SLOPE = 'INVALID_SLOPE',                     // ميل الخطوط غير صالح
  EXPANDED_SEARCH_FAILED = 'EXPANDED_SEARCH_FAILED',   // فشل البحث الموسع حتى ±7 شموع
}

/**
 * 📝 مستويات التسجيل
 * Logging levels for debug mode
 */
export type LogLevel = 'OFF' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'TRACE';

/**
 * 📋 سجل رفض الدايفرجنس
 * Rejection log entry
 */
export interface RejectionLogEntry
{
  reason: RejectionReason;
  message: string;
  details?: Record<string, unknown>;
  timestamp: number;
}

export type DivergenceType =
  | 'strong'      // قوي - Strong: Lower Low (price) + Higher Low (indicator) = Bullish
  | 'medium'      // متوسط - Medium: Equal price movement with different indicator
  | 'weak'        // ضعيف - Weak: Price moves more than indicator
  | 'hidden'      // خفي - Hidden: Continuation signal
  | 'exaggerated' // مبالغ - Exaggerated: Equal highs/lows with indicator discrepancy
  | 'reverse';    // معكوس - Reverse: Trend confirmation

export type DivergenceDirection = 'bullish' | 'bearish';

export type IndicatorType = 'RSI' | 'MACD' | 'OBV' | 'STOCH_RSI' | 'CCI' | 'MFI' | 'WILLIAMS_R';

export interface PeakPoint
{
  index: number;
  price: number;
  indicatorValue: number;
  indicatorPeakIndex: number;  // 🆕 الفهرس الفعلي لقمة/قاع المؤشر (قد يختلف عن index)
  syncOffset: number;          // 🆕 الفرق بين قمة السعر وقمة المؤشر (0 = مثالي)
  timestamp: number;
  volume: number;
  isHigh: boolean;
  prominence: number;      // بروز القمة/القاع
  width: number;           // عرض القمة/القاع
  leftBase: number;        // قاعدة اليسار
  rightBase: number;       // قاعدة اليمين
}

export interface DivergenceResult
{
  id: string;
  type: DivergenceType;
  direction: DivergenceDirection;
  indicator: IndicatorType;
  symbol: string;
  exchange: string;
  timeframe: string;

  // نقاط الدايفرجنس
  startPoint: PeakPoint;
  endPoint: PeakPoint;

  // قياسات الدقة
  priceSlope: number;           // ميل السعر
  indicatorSlope: number;       // ميل المؤشر
  slopeDifference: number;      // فرق الميل (أهم قياس)

  // التقييم
  score: number;                // 0-100 نقاط القوة
  confidence: number;           // 0-100 مستوى الثقة
  reliability: 'high' | 'medium' | 'low';

  // بيانات الرسم بالملي
  drawingData: {
    priceLine: { x1: number; y1: number; x2: number; y2: number };
    indicatorLine: { x1: number; y1: number; x2: number; y2: number };
    priceAngle: number;
    indicatorAngle: number;
  };

  // إحصائيات إضافية
  barsCount: number;            // عدد الشموع بين النقطتين
  volumeProfile: 'increasing' | 'decreasing' | 'stable';
  timestamp: number;
  detectedAt: Date;

  // 🆕 بيانات التزامن بين السعر والمؤشر
  syncOffset: number;           // فرق التزامن (0 = مثالي، ±1-3 = جيد)
  syncQuality: 'perfect' | 'good' | 'acceptable' | 'weak';  // جودة التزامن

  // 🆕 بيانات دورة الحياة (Lifecycle)
  status: 'active' | 'expired' | 'history';  // حالة النموذج
  signature: string;            // توقيع فريد للنموذج (للتمييز عن التكرارات)
  totalCandlesAtDetection: number;  // عدد الشموع الكلي عند الاكتشاف

  // بيانات الشموع والمؤشر للرسم الاحترافي
  candles?: OHLCV[];            // الشموع الكاملة للرسم
  indicatorValues?: number[];   // قيم المؤشر لكل شمعة
}

export interface OHLCV
{
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface DetectorConfig
{
  minBars: number;              // الحد الأدنى للشموع بين النقاط
  maxBars: number;              // الحد الأقصى للشموع بين النقاط
  minProminence: number;        // الحد الأدنى لبروز القمة/القاع
  slopeThreshold: number;       // عتبة فرق الميل للتأكيد
  volumeWeight: number;         // وزن الحجم في التقييم
  strictMode: boolean;          // الوضع الصارم (أقل إشارات، دقة أعلى)

  // 🆕 إعدادات التزامن والنطاق
  pivotRange: number;           // نطاق البحث عن القمم/القيعان (افتراضي: 3، نطاق: 2-7)
  maxSyncOffset: number;        // الحد الأقصى للفرق بين قمة السعر وقمة المؤشر (افتراضي: 3، نطاق: 0-5)
  timeframeAdaptive: boolean;   // تعديل تلقائي حسب الفريم الزمني

  // 🆕 إعدادات التحقق من Pivot (موحدة للسعر والمؤشر)
  pivotLookback: number;        // نطاق التحقق من القمة المحلية (±N شموع، افتراضي: 2، نطاق: 1-5)

  // 🆕 إعدادات Debug
  debugMode: boolean;           // وضع التشخيص (يبطئ الأداء)
  logLevel: LogLevel;           // مستوى التسجيل
}

// ============================================================================
// 🧮 INDICATOR CALCULATIONS - حسابات المؤشرات
// ============================================================================

class IndicatorCalculator
{

  /**
   * حساب RSI بخوارزمية Wilder
   */
  static calculateRSI ( candles: OHLCV[], period: number = 14 ): number[]
  {
    if ( candles.length === 0 ) return [];

    const rsi: number[] = new Array( candles.length ).fill( 50 );
    if ( candles.length <= period ) return rsi;

    let avgGain = 0;
    let avgLoss = 0;

    // Initial averages (TA-Lib Wilder's smoothing seed)
    for ( let i = 1; i <= period; i++ )
    {
      const change = candles[ i ].close - candles[ i - 1 ].close;
      if ( change > 0 ) avgGain += change;
      else avgLoss += Math.abs( change );
    }

    avgGain /= period;
    avgLoss /= period;

    for ( let i = period + 1; i < candles.length; i++ )
    {
      const change = candles[ i ].close - candles[ i - 1 ].close;
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? Math.abs( change ) : 0;

      avgGain = ( avgGain * ( period - 1 ) + gain ) / period;
      avgLoss = ( avgLoss * ( period - 1 ) + loss ) / period;

      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsi[ i ] = 100 - ( 100 / ( 1 + rs ) );
    }

    // Fill early values with first computed RSI to avoid NaN gaps
    const firstValid = rsi[ period + 1 ] ?? 50;
    for ( let i = 0; i <= period + 1 && i < rsi.length; i++ )
    {
      rsi[ i ] = firstValid;
    }

    return rsi;
  }

  /**
   * حساب MACD Histogram
   */
  static calculateMACD ( candles: OHLCV[], fast: number = 12, slow: number = 26, signal: number = 9 ): number[]
  {
    const closes = candles.map( c => c.close );
    const emaFast = this.calculateEMA( closes, fast );
    const emaSlow = this.calculateEMA( closes, slow );

    const macdLine: number[] = [];
    for ( let i = 0; i < closes.length; i++ )
    {
      macdLine.push( emaFast[ i ] - emaSlow[ i ] );
    }

    const signalLine = this.calculateEMA( macdLine, signal );
    const histogram: number[] = [];

    for ( let i = 0; i < closes.length; i++ )
    {
      histogram.push( macdLine[ i ] - signalLine[ i ] );
    }

    // Normalize to 0-100 range for consistent chart scaling
    const min = Math.min( ...histogram );
    const max = Math.max( ...histogram );
    const range = max - min || 1;

    return histogram.map( v => ( ( v - min ) / range ) * 100 );
  }

  /**
   * حساب OBV
   */
  static calculateOBV ( candles: OHLCV[] ): number[]
  {
    const obv: number[] = [ 0 ];

    for ( let i = 1; i < candles.length; i++ )
    {
      const prevClose = candles[ i - 1 ].close;
      const currClose = candles[ i ].close;
      const currVolume = candles[ i ].volume;

      if ( currClose > prevClose )
      {
        obv.push( obv[ i - 1 ] + currVolume );
      } else if ( currClose < prevClose )
      {
        obv.push( obv[ i - 1 ] - currVolume );
      } else
      {
        obv.push( obv[ i - 1 ] );
      }
    }

    // Normalize to 0-100 for consistency
    const min = Math.min( ...obv );
    const max = Math.max( ...obv );
    const range = max - min || 1;

    return obv.map( v => ( ( v - min ) / range ) * 100 );
  }

  /**
   * حساب Stochastic RSI
   */
  static calculateStochRSI ( candles: OHLCV[], rsiPeriod: number = 14, stochPeriod: number = 14 ): number[]
  {
    const rsi = this.calculateRSI( candles, rsiPeriod );
    const fastK: number[] = [];

    for ( let i = 0; i < rsi.length; i++ )
    {
      if ( i < stochPeriod - 1 )
      {
        fastK.push( 50 );
        continue;
      }

      const slice = rsi.slice( i - stochPeriod + 1, i + 1 );
      const min = Math.min( ...slice );
      const max = Math.max( ...slice );
      const range = max - min || 1;

      fastK.push( ( ( rsi[ i ] - min ) / range ) * 100 );
    }

    // TA-Lib returns both fastK and fastD; we use fastK for divergence logic
    return fastK;
  }

  /**
   * حساب CCI
   */
  static calculateCCI ( candles: OHLCV[], period: number = 20 ): number[]
  {
    const cci: number[] = [];
    const typicalPrices = candles.map( c => ( c.high + c.low + c.close ) / 3 );

    for ( let i = 0; i < candles.length; i++ )
    {
      if ( i < period - 1 )
      {
        cci.push( 0 );
        continue;
      }

      const slice = typicalPrices.slice( i - period + 1, i + 1 );
      const sma = slice.reduce( ( a, b ) => a + b, 0 ) / period;
      const meanDev = slice.reduce( ( sum, val ) => sum + Math.abs( val - sma ), 0 ) / period;

      const cciValue = meanDev === 0 ? 0 : ( typicalPrices[ i ] - sma ) / ( 0.015 * meanDev );
      cci.push( cciValue );
    }

    // Normalize to 0-100 range
    const min = Math.min( ...cci );
    const max = Math.max( ...cci );
    const range = max - min || 1;

    return cci.map( v => ( ( v - min ) / range ) * 100 );
  }

  /**
   * حساب MFI
   */
  static calculateMFI ( candles: OHLCV[], period: number = 14 ): number[]
  {
    const mfi: number[] = [];
    const typicalPrices = candles.map( c => ( c.high + c.low + c.close ) / 3 );
    const rawMF = typicalPrices.map( ( tp, i ) => tp * candles[ i ].volume );

    for ( let i = 0; i < candles.length; i++ )
    {
      if ( i < period )
      {
        mfi.push( 50 );
        continue;
      }

      let positiveMF = 0;
      let negativeMF = 0;

      for ( let j = i - period + 1; j <= i; j++ )
      {
        if ( typicalPrices[ j ] > typicalPrices[ j - 1 ] )
        {
          positiveMF += rawMF[ j ];
        } else
        {
          negativeMF += rawMF[ j ];
        }
      }

      const mfRatio = negativeMF === 0 ? 100 : positiveMF / negativeMF;
      mfi.push( 100 - ( 100 / ( 1 + mfRatio ) ) );
    }

    return mfi;
  }

  /**
   * حساب Williams %R
   */
  static calculateWilliamsR ( candles: OHLCV[], period: number = 14 ): number[]
  {
    const williamsR: number[] = [];

    for ( let i = 0; i < candles.length; i++ )
    {
      if ( i < period - 1 )
      {
        williamsR.push( -50 );
        continue;
      }

      const slice = candles.slice( i - period + 1, i + 1 );
      const highestHigh = Math.max( ...slice.map( c => c.high ) );
      const lowestLow = Math.min( ...slice.map( c => c.low ) );
      const range = highestHigh - lowestLow || 1;

      const wr = ( ( highestHigh - candles[ i ].close ) / range ) * -100;
      williamsR.push( wr + 100 ); // Convert to 0-100
    }

    return williamsR;
  }

  /**
   * حساب EMA
   */
  private static calculateEMA ( data: number[], period: number ): number[]
  {
    if ( data.length === 0 ) return [];

    const ema: number[] = new Array( data.length );
    const multiplier = 2 / ( period + 1 );

    const seedPeriod = Math.min( period, data.length );
    let sma = 0;
    for ( let i = 0; i < seedPeriod; i++ )
    {
      sma += data[ i ];
    }

    const seed = sma / seedPeriod;

    // Fill initial values with seed (TA-Lib style lookback handling)
    for ( let i = 0; i < seedPeriod; i++ )
    {
      ema[ i ] = seed;
    }

    for ( let i = seedPeriod; i < data.length; i++ )
    {
      const prevEMA = ema[ i - 1 ];
      ema[ i ] = ( data[ i ] - prevEMA ) * multiplier + prevEMA;
    }

    return ema;
  }
}

// ============================================================================
// � DIVERGENCE LOGGER - مسجل الدايفرجنس
// ============================================================================

/**
 * 📋 فئة مسجل الدايفرجنس - لتسجيل أسباب الرفض والتشخيص
 * Divergence Logger class for tracking rejection reasons and debugging
 */
class DivergenceLogger
{
  private enabled: boolean;
  private logLevel: LogLevel;
  private logs: RejectionLogEntry[] = [];

  // رسائل الرفض بالعربية
  private static readonly REJECTION_MESSAGES: Record<RejectionReason, string> = {
    [ RejectionReason.NO_PRICE_PIVOT ]: 'لم يتم العثور على قمة/قاع في السعر',
    [ RejectionReason.NO_INDICATOR_PIVOT ]: 'لم يتم العثور على قمة/قاع في المؤشر ضمن ±{offset} شمعة',
    [ RejectionReason.SYNC_OFFSET_EXCEEDED ]: 'فرق التزامن ({offset} شموع) تجاوز الحد المسموح ({max})',
    [ RejectionReason.LOW_CONFIDENCE ]: 'الثقة ({confidence}%) أقل من الحد الأدنى ({min}%)',
    [ RejectionReason.NO_DIVERGENCE ]: 'السعر والمؤشر بنفس الاتجاه - لا يوجد تناقض',
    [ RejectionReason.INSUFFICIENT_PIVOTS ]: 'عدد النقاط المحورية غير كافٍ (وجد {found}، مطلوب 2)',
    [ RejectionReason.INVALID_SLOPE ]: 'ميل الخطوط غير صالح للنموذج المطلوب',
    [ RejectionReason.EXPANDED_SEARCH_FAILED ]: 'فشل البحث الموسع حتى ±{max} شموع',
  };

  constructor ( enabled: boolean, logLevel: LogLevel = 'OFF' )
  {
    this.enabled = enabled;
    this.logLevel = logLevel;
  }

  /**
   * تسجيل رفض دايفرجنس
   */
  logRejection ( reason: RejectionReason, details?: Record<string, unknown> ): void
  {
    if ( !this.enabled || this.logLevel === 'OFF' ) return;

    let message = DivergenceLogger.REJECTION_MESSAGES[ reason ] || reason;

    // Replace placeholders
    if ( details )
    {
      Object.entries( details ).forEach( ( [ key, value ] ) =>
      {
        message = message.replace( `{${ key }}`, String( value ) );
      } );
    }

    const entry: RejectionLogEntry = {
      reason,
      message,
      details,
      timestamp: Date.now(),
    };

    this.logs.push( entry );

    // Console output based on log level
    if ( this.shouldLog( 'DEBUG' ) )
    {

    }
  }

  /**
   * تسجيل DEBUG
   */
  debug ( message: string, ...args: unknown[] ): void
  {
    if ( this.shouldLog( 'DEBUG' ) )
    {

    }
  }

  /**
   * تسجيل INFO
   */
  info ( message: string, ...args: unknown[] ): void
  {
    if ( this.shouldLog( 'INFO' ) )
    {

    }
  }

  /**
   * تسجيل WARN
   */
  warn ( message: string, ...args: unknown[] ): void
  {
    if ( this.shouldLog( 'WARN' ) )
    {

    }
  }

  /**
   * تسجيل ERROR
   */
  error ( message: string, ...args: unknown[] ): void
  {
    if ( this.shouldLog( 'ERROR' ) )
    {
      console.error( `[ERROR] ${ message }`, ...args );
    }
  }

  /**
   * تسجيل TRACE
   */
  trace ( message: string, ...args: unknown[] ): void
  {
    if ( this.shouldLog( 'TRACE' ) )
    {

    }
  }

  /**
   * التحقق من إمكانية التسجيل
   */
  private shouldLog ( level: LogLevel ): boolean
  {
    if ( !this.enabled || this.logLevel === 'OFF' ) return false;

    const levels: LogLevel[] = [ 'ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE' ];
    const currentIndex = levels.indexOf( this.logLevel );
    const requestedIndex = levels.indexOf( level );

    return requestedIndex <= currentIndex;
  }

  /**
   * الحصول على جميع السجلات
   */
  getLogs (): RejectionLogEntry[]
  {
    return [ ...this.logs ];
  }

  /**
   * مسح السجلات
   */
  clearLogs (): void
  {
    this.logs = [];
  }
}

// ============================================================================
// �🔍 PEAK DETECTION - كشف القمم والقيعان
// ============================================================================

class ZigZagPeakDetector
{

  /**
   * كشف القمم والقيعان باستخدام خوارزمية Zigzag المتقدمة
   * مع حساب البروز والعرض لكل نقطة
   * 🆕 مع البحث عن قمة/قاع المؤشر الفعلية ضمن نطاق maxSyncOffset
   * 🔧 إصلاح: استخدام isLocalPivot الموحدة للتحقق من قمم السعر
   */
  static detectPeaks (
    candles: OHLCV[],
    indicatorValues: number[],
    minProminence: number = 0.5,
    maxSyncOffset: number = 3,
    pivotLookback: number = 2,
    logger?: DivergenceLogger
  ): { highs: PeakPoint[]; lows: PeakPoint[] }
  {
    const highs: PeakPoint[] = [];
    const lows: PeakPoint[] = [];

    logger?.debug( `🔍 بدء كشف القمم والقيعان باستخدام pivotLookback=${ pivotLookback }` );

    // استخدام pivotLookback لتحديد نطاق البحث
    const lookback = Math.max( pivotLookback, 3 );

    // إعداد مصفوفة قيم السعر للتحقق من Pivot
    const highs_values = candles.map( c => c.high );
    const lows_values = candles.map( c => c.low );

    for ( let i = lookback; i < candles.length - lookback; i++ )
    {
      const currentHigh = candles[ i ].high;
      const currentLow = candles[ i ].low;

      // ✅ التحقق من High Peak باستخدام isLocalPivot الموحدة
      if ( this.isLocalPivot( highs_values, i, true, pivotLookback ) )
      {
        const prominence = this.calculateProminence( candles, i, true );
        if ( prominence >= minProminence )
        {
          // 🔍 البحث عن قمة المؤشر الفعلية
          const indicatorPeak = this.findIndicatorPeakNearIndex(
            indicatorValues,
            i,
            true,
            maxSyncOffset,
            pivotLookback,
            logger
          );

          // ❌ إذا لم يتم العثور على قمة محلية، تخطى هذه القمة
          if ( !indicatorPeak )
          {
            logger?.trace( `  → تخطي قمة السعر عند شمعة #${ i } (لا توجد قمة مؤشر محلية)` );
            continue;
          }

          highs.push( {
            index: i,
            price: currentHigh,
            indicatorValue: indicatorPeak.value,       // 🆕 استخدام القيمة الفعلية للقمة
            indicatorPeakIndex: indicatorPeak.index,   // 🆕 فهرس قمة المؤشر
            syncOffset: indicatorPeak.offset,          // 🆕 الفرق بين قمة السعر وقمة المؤشر
            timestamp: candles[ i ].timestamp,
            volume: candles[ i ].volume,
            isHigh: true,
            prominence,
            width: this.calculateWidth( candles, i, true ),
            leftBase: this.findLeftBase( candles, i, true ),
            rightBase: this.findRightBase( candles, i, true )
          } );
        }
      }

      // ✅ التحقق من Low Peak باستخدام isLocalPivot الموحدة
      if ( this.isLocalPivot( lows_values, i, false, pivotLookback ) )
      {
        const prominence = this.calculateProminence( candles, i, false );
        if ( prominence >= minProminence )
        {
          // 🔍 البحث عن قاع المؤشر الفعلي
          const indicatorPeak = this.findIndicatorPeakNearIndex(
            indicatorValues,
            i,
            false,
            maxSyncOffset,
            pivotLookback,
            logger
          );

          // ❌ إذا لم يتم العثور على قاع محلي، تخطى هذا القاع
          if ( !indicatorPeak )
          {
            logger?.trace( `  → تخطي قاع السعر عند شمعة #${ i } (لا يوجد قاع مؤشر محلي)` );
            continue;
          }

          lows.push( {
            index: i,
            price: currentLow,
            indicatorValue: indicatorPeak.value,       // 🆕 استخدام القيمة الفعلية للقاع
            indicatorPeakIndex: indicatorPeak.index,   // 🆕 فهرس قاع المؤشر
            syncOffset: indicatorPeak.offset,          // 🆕 الفرق بين قاع السعر وقاع المؤشر
            timestamp: candles[ i ].timestamp,
            volume: candles[ i ].volume,
            isHigh: false,
            prominence,
            width: this.calculateWidth( candles, i, false ),
            leftBase: this.findLeftBase( candles, i, false ),
            rightBase: this.findRightBase( candles, i, false )
          } );
        }
      }
    }

    return { highs, lows };
  }

  /**
   * حساب التقلب (Volatility)
   */
  private static calculateVolatility ( candles: OHLCV[] ): number
  {
    const returns: number[] = [];
    for ( let i = 1; i < candles.length; i++ )
    {
      returns.push( Math.abs( candles[ i ].close - candles[ i - 1 ].close ) / candles[ i - 1 ].close );
    }

    const mean = returns.reduce( ( a, b ) => a + b, 0 ) / returns.length;
    const variance = returns.reduce( ( sum, r ) => sum + Math.pow( r - mean, 2 ), 0 ) / returns.length;

    return Math.sqrt( variance ) * 100;
  }

  /**
   * حساب بروز القمة/القاع
   */
  private static calculateProminence ( candles: OHLCV[], index: number, isHigh: boolean ): number
  {
    const price = isHigh ? candles[ index ].high : candles[ index ].low;
    let leftMin = price, rightMin = price;

    // Find left contour
    for ( let i = index - 1; i >= 0; i-- )
    {
      const val = isHigh ? candles[ i ].high : candles[ i ].low;
      if ( isHigh )
      {
        if ( val > price ) break;
        leftMin = Math.min( leftMin, candles[ i ].low );
      } else
      {
        if ( val < price ) break;
        leftMin = Math.max( leftMin, candles[ i ].high );
      }
    }

    // Find right contour
    for ( let i = index + 1; i < candles.length; i++ )
    {
      const val = isHigh ? candles[ i ].high : candles[ i ].low;
      if ( isHigh )
      {
        if ( val > price ) break;
        rightMin = Math.min( rightMin, candles[ i ].low );
      } else
      {
        if ( val < price ) break;
        rightMin = Math.max( rightMin, candles[ i ].high );
      }
    }

    const base = isHigh ? Math.max( leftMin, rightMin ) : Math.min( leftMin, rightMin );
    return Math.abs( price - base ) / price * 100;
  }

  /**
   * حساب عرض القمة/القاع
   */
  private static calculateWidth ( candles: OHLCV[], index: number, isHigh: boolean ): number
  {
    let leftWidth = 0, rightWidth = 0;
    const threshold = ( isHigh ? candles[ index ].high : candles[ index ].low ) * 0.99;

    for ( let i = index - 1; i >= 0; i-- )
    {
      const val = isHigh ? candles[ i ].high : candles[ i ].low;
      if ( ( isHigh && val < threshold ) || ( !isHigh && val > threshold / 0.99 * 1.01 ) ) break;
      leftWidth++;
    }

    for ( let i = index + 1; i < candles.length; i++ )
    {
      const val = isHigh ? candles[ i ].high : candles[ i ].low;
      if ( ( isHigh && val < threshold ) || ( !isHigh && val > threshold / 0.99 * 1.01 ) ) break;
      rightWidth++;
    }

    return leftWidth + rightWidth + 1;
  }

  private static findLeftBase ( candles: OHLCV[], index: number, isHigh: boolean ): number
  {
    for ( let i = index - 1; i >= 0; i-- )
    {
      if ( isHigh && candles[ i ].high >= candles[ index ].high ) return candles[ i ].low;
      if ( !isHigh && candles[ i ].low <= candles[ index ].low ) return candles[ i ].high;
    }
    return isHigh ? candles[ 0 ].low : candles[ 0 ].high;
  }

  private static findRightBase ( candles: OHLCV[], index: number, isHigh: boolean ): number
  {
    for ( let i = index + 1; i < candles.length; i++ )
    {
      if ( isHigh && candles[ i ].high >= candles[ index ].high ) return candles[ i ].low;
      if ( !isHigh && candles[ i ].low <= candles[ index ].low ) return candles[ i ].high;
    }
    const last = candles[ candles.length - 1 ];
    return isHigh ? last.low : last.high;
  }

  /**
   * ✅ التحقق من أن النقطة هي قمة/قاع محلية حقيقية للمؤشر
   * Local Pivot = نقطة أعلة/أدنى من جيرانها على الأقل ±lookback شموع
   * 
   * 💡 هذه الدالة موحدة للسعر والمؤشر - Unified for price and indicator
   * 
   * @param values قيم المؤشر أو السعر
   * @param index فهرس النقطة المراد فحصها
   * @param isHigh true = قمة, false = قاع
   * @param lookback عدد الشموع على كل جانب (افتراضي: 2)
   * @returns true إذا كانت قمة/قاع محلية حقيقية
   */
  static isLocalPivot (
    values: number[],
    index: number,
    isHigh: boolean,
    lookback: number = 2
  ): boolean
  {
    // التحقق من الحدود
    if ( index < lookback || index >= values.length - lookback )
    {
      return false;
    }

    const currentValue = values[ index ];
    if ( currentValue === undefined || currentValue === null || isNaN( currentValue ) )
    {
      return false;
    }

    // التحقق من الجيران على اليسار واليمين
    for ( let i = index - lookback; i <= index + lookback; i++ )
    {
      if ( i === index ) continue; // تخطى النقطة نفسها

      const neighborValue = values[ i ];
      if ( neighborValue === undefined || neighborValue === null || isNaN( neighborValue ) )
      {
        continue; // تخطى القيم الفارغة
      }

      if ( isHigh )
      {
        // للقمم: يجب أن تكون أعلى من كل الجيران (أو تساويها - للسماح بالقمم المزدوجة)
        if ( neighborValue > currentValue )
        {
          return false;
        }
      } else
      {
        // للقيعان: يجب أن تكون أدنى من كل الجيران (أو تساويها)
        if ( neighborValue < currentValue )
        {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * 🔧 إصلاح: البحث عن قمة/قاع محلية حقيقية للمؤشر ببحث تصاعدي
   * 
   * الخوارزمية الجديدة:
   * 1️⃣ ابحث في نطاق ±3 → وجدت؟ ✅ استخدمها (خصم 0%)
   * 2️⃣ وسّع إلى ±4 → وجدت؟ ✅ استخدمها (خصم -5%)
   * 3️⃣ وسّع إلى ±5 → وجدت؟ ✅ استخدمها (خصم -10%)
   * 4️⃣ وسّع إلى ±6 → وجدت؟ ✅ استخدمها (خصم -15%)
   * 5️⃣ وسّع إلى ±7 → وجدت؟ ✅ استخدمها (خصم -20%)
   * 6️⃣ لم يتم العثور → ❌ أرجع null (رفض الدايفرجنس)
   * 
   * @param indicatorValues قيم المؤشر
   * @param priceIndex فهرس قمة/قاع السعر
   * @param isHigh هل نبحث عن قمة (true) أم قاع (false)
   * @param maxSyncOffset الحد الأقصى للفرق المسموح (افتراضي: 3)
   * @param pivotLookback نطاق التحقق من Pivot (افتراضي: 2)
   * @param logger مسجل لتسجيل أسباب الرفض
   * @returns { index, value, offset, penalty } أو null إذا لم يتم العثور على قمة محلية
   */
  static findIndicatorPeakNearIndex (
    indicatorValues: number[],
    priceIndex: number,
    isHigh: boolean,
    maxSyncOffset: number = 3,
    pivotLookback: number = 2,
    logger?: DivergenceLogger
  ): { index: number; value: number; offset: number; penalty: number } | null
  {
    logger?.trace( `🔍 بدء البحث عن ${ isHigh ? 'قمة' : 'قاع' } مؤشر بالقرب من شمعة #${ priceIndex }` );

    // البحث التصاعدي: نطاق 3 → 4 → 5 → 6 → 7
    for ( let searchRange = maxSyncOffset; searchRange <= MAX_EXPANDED_SEARCH; searchRange++ )
    {
      logger?.trace( `  → فحص نطاق ±${ searchRange } شموع...` );

      // حدود البحث
      const start = Math.max( pivotLookback, priceIndex - searchRange );
      const end = Math.min( indicatorValues.length - pivotLookback - 1, priceIndex + searchRange );

      // البحث عن قمم/قيعان محلية حقيقية
      const localPivots: { index: number; value: number; offset: number }[] = [];

      for ( let i = start; i <= end; i++ )
      {
        // التحقق أن هذه قمة/قاع محلية حقيقية
        if ( this.isLocalPivot( indicatorValues, i, isHigh, pivotLookback ) )
        {
          localPivots.push( {
            index: i,
            value: indicatorValues[ i ],
            offset: Math.abs( i - priceIndex )
          } );
        }
      }

      logger?.trace( `  → عثر على ${ localPivots.length } قمة محلية في نطاق ±${ searchRange }` );

      // إذا وجدنا قمم محلية، اختر الأفضل
      if ( localPivots.length > 0 )
      {
        // الترتيب حسب القوة (Magnitude) أولاً، ثم القرب (Proximity)
        // هذا يضمن اختيار القمة الحقيقية حتى لو كانت أبعد قليلاً
        localPivots.sort( ( a, b ) =>
        {
          // 1. الأولوية للقيمة (الأعلى للقمم، الأدنى للقيعان)
          const valDiff = isHigh ? b.value - a.value : a.value - b.value;

          // إذا كان الفرق في القيمة كبيراً، نختار القيمة الأفضل
          if ( Math.abs( valDiff ) > 0.00001 ) return valDiff;

          // 2. إذا تساوت القيم، نختار الأقرب زمنياً
          return a.offset - b.offset;
        } );

        const best = localPivots[ 0 ];
        const penalty = SEARCH_PENALTIES[ searchRange ] || -20;

        logger?.debug(
          `  ✅ عثر على ${ isHigh ? 'قمة' : 'قاع' } محلية عند شمعة #${ best.index }، القيمة: ${ best.value.toFixed( 2 ) }، الفرق: ${ best.offset }، الخصم: ${ penalty }%`
        );

        return {
          index: best.index,
          value: best.value,
          offset: best.offset,
          penalty
        };
      }
    }

    // ❌ فشل البحث الموسع حتى ±7 شموع
    logger?.logRejection( RejectionReason.NO_INDICATOR_PIVOT, {
      max: MAX_EXPANDED_SEARCH,
      priceIndex,
      type: isHigh ? 'high' : 'low'
    } );

    return null;
  }

  /**
   * 🆕 تحديد جودة التزامن بناءً على الفرق
   */
  static getSyncQuality ( offset: number ): 'perfect' | 'good' | 'acceptable' | 'weak'
  {
    if ( offset === 0 ) return 'perfect';
    if ( offset <= 1 ) return 'good';
    if ( offset <= 2 ) return 'acceptable';
    return 'weak';
  }

  /**
   * 🆕 حساب مكافأة الثقة بناءً على التزامن
   * كلما كان التزامن أفضل، زادت مكافأة الثقة
   */
  static calculateSyncConfidenceBonus ( offset: number ): number
  {
    switch ( offset )
    {
      case 0: return 20;  // تزامن مثالي
      case 1: return 15;  // تزامن ممتاز
      case 2: return 10;  // تزامن جيد
      case 3: return 5;   // تزامن مقبول
      default: return 0;  // تزامن ضعيف
    }
  }
}

// ============================================================================
// 🎯 MAIN DIVERGENCE DETECTOR - الكاشف الرئيسي
// ============================================================================

export class AdvancedDivergenceDetector
{
  private config: DetectorConfig;
  private logger: DivergenceLogger;

  constructor ( config?: Partial<DetectorConfig> )
  {
    this.config = {
      minBars: 3,               // ← تخفيف: كان 5
      maxBars: 150,             // ← توسيع: كان 100
      minProminence: 0.1,       // ← تخفيف: كان 0.3
      slopeThreshold: 0.02,     // ← تخفيف: كان 0.1
      volumeWeight: 0.1,        // ← تخفيف: كان 0.15
      strictMode: false,
      // 🆕 إعدادات التزامن والنطاق الجديدة
      pivotRange: 5,             // ← توسيع: كان 3
      maxSyncOffset: 5,          // ← توسيع: كان 3
      timeframeAdaptive: true,
      // 🆕 إعدادات التحقق من Pivot الموحدة
      pivotLookback: 3,          // ← توسيع: كان 2
      // 🆕 إعدادات Debug
      debugMode: false,
      logLevel: 'OFF',
      ...config
    };

    // إنشاء المسجل
    this.logger = new DivergenceLogger( this.config.debugMode, this.config.logLevel );

    if ( this.config.debugMode )
    {
      this.logger.info( '🛠️ Advanced Divergence Detector مفعل بوضع Debug', this.config );
    }
  }

  /**
   * 🆕 تحديد نطاق Pivot المناسب حسب الفريم الزمني
   */
  private getAdaptivePivotLookback ( timeframe: string ): number
  {
    if ( this.config.timeframeAdaptive )
    {
      const tf = timeframe.toLowerCase();
      if ( tf.includes( '1m' ) || tf.includes( '5m' ) || tf.includes( '15m' ) ) return 1;
      if ( tf.includes( '30m' ) || tf.includes( '1h' ) ) return 2;
      if ( tf.includes( '4h' ) ) return 2;
      if ( tf.includes( '1d' ) || tf.includes( 'd' ) ) return 3;
      if ( tf.includes( '1w' ) || tf.includes( 'w' ) ) return 4;
    }
    return this.config.pivotLookback;
  }

  /**
   * 🆕 تحديد نطاق Pivot المناسب حسب الفريم الزمني
   */
  private getAdaptivePivotRange ( timeframe: string ): number
  {
    if ( this.config.timeframeAdaptive )
    {
      const tf = timeframe.toLowerCase();
      if ( tf.includes( '1m' ) || tf.includes( '5m' ) || tf.includes( '15m' ) ) return 2;
      if ( tf.includes( '30m' ) || tf.includes( '1h' ) ) return 3;
      if ( tf.includes( '4h' ) ) return 3;
      if ( tf.includes( '1d' ) || tf.includes( 'd' ) ) return 4;
      if ( tf.includes( '1w' ) || tf.includes( 'w' ) ) return 5;
    }
    return this.config.pivotRange;
  }

  /**
   * 🆕 تحديد maxSyncOffset المناسب حسب الفريم الزمني
   */
  private getAdaptiveMaxSyncOffset ( timeframe: string ): number
  {
    if ( this.config.timeframeAdaptive )
    {
      const tf = timeframe.toLowerCase();
      if ( tf.includes( '1m' ) || tf.includes( '5m' ) || tf.includes( '15m' ) ) return 2;
      if ( tf.includes( '30m' ) || tf.includes( '1h' ) ) return 3;
      if ( tf.includes( '4h' ) ) return 3;
      if ( tf.includes( '1d' ) || tf.includes( 'd' ) ) return 4;
      if ( tf.includes( '1w' ) || tf.includes( 'w' ) ) return 5;
    }
    return this.config.maxSyncOffset;
  }

  /**
   * الكشف الكامل عن جميع أنواع الدايفرجنس
   * 🆕 مع دعم التزامن الذكي ونطاق Pivot التكيفي
   */
  detectAll (
    candles: OHLCV[],
    indicator: IndicatorType,
    symbol: string,
    exchange: string,
    timeframe: string
  ): DivergenceResult[]
  {
    if ( candles.length < 50 ) return [];

    // 🆕 الحصول على الإعدادات التكيفية حسب الفريم
    const adaptiveMaxSyncOffset = this.getAdaptiveMaxSyncOffset( timeframe );
    const adaptivePivotLookback = this.getAdaptivePivotLookback( timeframe );

    this.logger.info( `🔍 بدء الكشف عن الدايفرجنس - ${ symbol } ${ timeframe }`, {
      indicator,
      maxSyncOffset: adaptiveMaxSyncOffset,
      pivotLookback: adaptivePivotLookback,
      candlesCount: candles.length
    } );

    // حساب المؤشر
    const indicatorValues = this.calculateIndicator( candles, indicator );

    // 🆕 كشف القمم والقيعان مع maxSyncOffset وpivotLookback وlogger
    const { highs, lows } = ZigZagPeakDetector.detectPeaks(
      candles,
      indicatorValues,
      this.config.minProminence,
      adaptiveMaxSyncOffset,  // 🆕 تمرير maxSyncOffset
      adaptivePivotLookback,   // 🆕 تمرير pivotLookback
      this.logger              // 🆕 تمرير logger
    );

    this.logger.debug( `  → عثر على ${ highs.length } قمة و${ lows.length } قاع` );

    const results: DivergenceResult[] = [];

    // تحليل القيعان للدايفرجنس الصعودي
    for ( let i = 0; i < lows.length - 1; i++ )
    {
      for ( let j = i + 1; j < lows.length; j++ )
      {
        const barsCount = lows[ j ].index - lows[ i ].index;
        if ( barsCount < this.config.minBars || barsCount > this.config.maxBars ) continue;

        // 🆕 التحقق من أن التزامن ضمن الحد المسموح
        if ( lows[ i ].syncOffset > adaptiveMaxSyncOffset || lows[ j ].syncOffset > adaptiveMaxSyncOffset )
        {
          continue;
        }

        // التحقق من صحة خط الدايفرجنس (لا توجد نقاط وسطية تخترق الخط)
        if ( !this.validateDivergenceLine( lows[ i ], lows[ j ], candles, indicatorValues ) )
        {
          continue;
        }

        const divergence = this.analyzePair( lows[ i ], lows[ j ], 'bullish', indicator, candles );
        if ( divergence )
        {
          // التحقق من الاتجاهات المتعاكسة (السعر والمؤشر)
          if ( !this.validateOppositeDirections( lows[ i ], lows[ j ], 'bullish' ) )
          {
            continue;
          }

          results.push( this.createResult(
            divergence,
            lows[ i ],
            lows[ j ],
            indicator,
            symbol,
            exchange,
            timeframe,
            barsCount,
            candles,
            indicatorValues
          ) );
        }
      }
    }

    // تحليل القمم للدايفرجنس الهبوطي
    for ( let i = 0; i < highs.length - 1; i++ )
    {
      for ( let j = i + 1; j < highs.length; j++ )
      {
        const barsCount = highs[ j ].index - highs[ i ].index;
        if ( barsCount < this.config.minBars || barsCount > this.config.maxBars ) continue;

        // 🆕 التحقق من أن التزامن ضمن الحد المسموح
        if ( highs[ i ].syncOffset > adaptiveMaxSyncOffset || highs[ j ].syncOffset > adaptiveMaxSyncOffset )
        {
          continue;
        }

        // التحقق من صحة خط الدايفرجنس (لا توجد نقاط وسطية تخترق الخط)
        if ( !this.validateDivergenceLine( highs[ i ], highs[ j ], candles, indicatorValues ) )
        {
          continue;
        }

        const divergence = this.analyzePair( highs[ i ], highs[ j ], 'bearish', indicator, candles );
        if ( divergence )
        {
          // التحقق من الاتجاهات المتعاكسة (السعر والمؤشر)
          if ( !this.validateOppositeDirections( highs[ i ], highs[ j ], 'bearish' ) )
          {
            continue;
          }

          results.push( this.createResult(
            divergence,
            highs[ i ],
            highs[ j ],
            indicator,
            symbol,
            exchange,
            timeframe,
            barsCount,
            candles,
            indicatorValues
          ) );
        }
      }
    }

    // 🆕 ترتيب محسّن: الثقة أولاً، ثم التزامن، ثم الحداثة
    return results
      .sort( ( a, b ) =>
      {
        // 1️⃣ الأولوية الأولى: الثقة (إذا الفرق أكثر من 5%)
        const confidenceDiff = b.confidence - a.confidence;
        if ( Math.abs( confidenceDiff ) > 5 )
        {
          return confidenceDiff;
        }

        // 2️⃣ الأولوية الثانية: جودة التزامن (الأقل أفضل)
        const syncDiff = a.syncOffset - b.syncOffset;
        if ( syncDiff !== 0 )
        {
          return syncDiff;
        }

        // 3️⃣ الأولوية الثالثة: الحداثة (الأحدث أولاً)
        return b.endPoint.index - a.endPoint.index;
      } )
      .slice( 0, 50 ); // أفضل 50 نتيجة
  }

  /**
   * ✅ التحقق من صحة الدايفرجنس - الخط يجب ألا يمر بنقاط وسطية أعلى/أدنى
   * Validates that the divergence line does not intersect the price or indicator graph
   */
  private validateDivergenceLine (
    point1: PeakPoint,
    point2: PeakPoint,
    candles: OHLCV[],
    indicatorValues: number[]
  ): boolean
  {
    // 1. التحقق من خط السعر
    // 1. Validate Price Line
    const startPriceIdx = Math.min( point1.index, point2.index );
    const endPriceIdx = Math.max( point1.index, point2.index );

    // حساب معادلة الخط للسعر (y = mx + b)
    const priceSlope = ( point2.price - point1.price ) / ( point2.index - point1.index );
    const priceIntercept = point1.price - priceSlope * point1.index;

    const priceTolerance = 0.012; // ← تخفيف: كان 0.002 (0.2%) الآن 1.2%

    for ( let i = startPriceIdx + 1; i < endPriceIdx; i++ )
    {
      const expectedPrice = priceSlope * i + priceIntercept;

      // للقمم: لا يجب أن توجد قمة أعلى من الخط
      if ( point1.isHigh )
      {
        if ( candles[ i ].high > expectedPrice * ( 1 + priceTolerance ) )
        {
          return false; // قمة وسطية تخترق الخط
        }
      } else
      {
        // للقيعان: لا يجب أن يوجد قاع أدنى من الخط
        if ( candles[ i ].low < expectedPrice * ( 1 - priceTolerance ) )
        {
          return false; // قاع وسطي يخترق الخط
        }
      }
    }

    // 2. التحقق من خط المؤشر (السبب الرئيسي للمشكلة البصرية)
    // 2. Validate Indicator Line (Main cause of visual issues)
    // نستخدم مؤشرات القمم الفعلية للمؤشر بدلاً من مؤشرات السعر
    const startIndIdx = Math.min( point1.indicatorPeakIndex, point2.indicatorPeakIndex );
    const endIndIdx = Math.max( point1.indicatorPeakIndex, point2.indicatorPeakIndex );

    // إذا كانت النقاط قريبة جداً، نتجاوز الفحص
    if ( Math.abs( endIndIdx - startIndIdx ) < 2 ) return true;

    // حساب معادلة الخط للمؤشر باستخدام إحداثيات المؤشر الصحيحة
    const indSlope = ( point2.indicatorValue - point1.indicatorValue ) / ( point2.indicatorPeakIndex - point1.indicatorPeakIndex );
    const indIntercept = point1.indicatorValue - indSlope * point1.indicatorPeakIndex;

    const indicatorTolerance = 0.15; // ← إضافة: 15% تسامح للمؤشر

    // التحقق من اختراق المؤشر للخط
    for ( let i = startIndIdx + 1; i < endIndIdx; i++ )
    {
      const expectedIndValue = indSlope * i + indIntercept;
      const actualValue = indicatorValues[ i ];
      const tolerance = Math.abs( expectedIndValue ) * indicatorTolerance;

      if ( point1.isHigh )
      {
        // في القمم (Bearish)، الخط يربط القمم العلوية
        // يجب ألا تكون هناك قيمة للمؤشر أعلى من الخط
        if ( actualValue > expectedIndValue + tolerance )
        {
          return false; // المؤشر يخترق الخط للأعلى
        }
      } else
      {
        // في القيعان (Bullish)، الخط يربط القيعان السفلية
        // يجب ألا تكون هناك قيمة للمؤشر أقل من الخط
        if ( actualValue < expectedIndValue - tolerance )
        {
          return false; // المؤشر يخترق الخط للأسفل
        }
      }
    }

    return true;
  }

  /**
   * ✅ التحقق من أن الاتجاهات متعاكسة (شرط الدايفرجنس الحقيقي)
   */
  private validateOppositeDirections (
    point1: PeakPoint,
    point2: PeakPoint,
    direction: DivergenceDirection
  ): boolean
  {
    const priceDirection = point2.price > point1.price ? 'up' : 'down';
    const indicatorDirection = point2.indicatorValue > point1.indicatorValue ? 'up' : 'down';

    // للدايفرجنس الصاعد (Regular): السعر هابط + المؤشر صاعد
    if ( direction === 'bullish' )
    {
      // Regular Bullish: price down, indicator up
      // Hidden Bullish: price up, indicator down (استمرار)
      return ( priceDirection === 'down' && indicatorDirection === 'up' ) ||
        ( priceDirection === 'up' && indicatorDirection === 'down' );
    }

    // للدايفرجنس الهابط (Regular): السعر صاعد + المؤشر هابط
    if ( direction === 'bearish' )
    {
      // Regular Bearish: price up, indicator down
      // Hidden Bearish: price down, indicator up (استمرار)
      return ( priceDirection === 'up' && indicatorDirection === 'down' ) ||
        ( priceDirection === 'down' && indicatorDirection === 'up' );
    }

    return false;
  }

  /**
   * تحليل زوج من النقاط لتحديد نوع الدايفرجنس
   */
  private analyzePair (
    point1: PeakPoint,
    point2: PeakPoint,
    direction: DivergenceDirection,
    indicator: IndicatorType,
    candles: OHLCV[]
  ): { type: DivergenceType; score: number; priceSlope: number; indicatorSlope: number } | null
  {

    // ✅ إضافة: التحقق من أن النقطتين من نفس النوع (قمتين أو قاعين)
    if ( point1.isHigh !== point2.isHigh )
    {
      return null;
    }

    const priceDiff = point2.price - point1.price;
    const priceChange = priceDiff / point1.price;

    const indicatorDiff = point2.indicatorValue - point1.indicatorValue;
    const indicatorChange = point1.indicatorValue !== 0
      ? indicatorDiff / Math.abs( point1.indicatorValue )
      : indicatorDiff;

    // حساب الميل (Slope)
    const bars = point2.index - point1.index;
    const priceSlope = priceChange / bars * 100;
    const indicatorSlope = indicatorChange / bars * 100;

    let type: DivergenceType | null = null;
    let baseScore = 0;

    if ( direction === 'bullish' )
    {
      // ===== BULLISH DIVERGENCES (تحليل القيعان) =====

      // 🔥 Strong Bullish: Lower Low (price) + Higher Low (indicator)
      if ( priceChange < -0.003 && indicatorChange > 0.005 )
      {  // ← تخفيف
        type = 'strong';
        baseScore = 90;
      }
      // 📊 Medium Bullish: Equal/Slight Lower Low (price) + Higher Low (indicator)
      else if ( priceChange < 0.005 && priceChange > -0.03 && indicatorChange > 0.005 )
      {  // ← تخفيف
        type = 'medium';
        baseScore = 70;
      }
      // 📉 Weak Bullish: Lower Low (price) + Equal/Slight Higher Low (indicator)
      else if ( priceChange < -0.005 && indicatorChange > -0.01 && indicatorChange < 0.02 )
      {  // ← تخفيف
        type = 'weak';
        baseScore = 50;
      }
      // 🔄 Hidden Bullish: Higher Low (price) + Lower Low (indicator) - Continuation
      else if ( priceChange > 0.003 && indicatorChange < -0.005 )
      {  // ← تخفيف
        type = 'hidden';
        baseScore = 75;
      }
      // ⚡ Exaggerated Bullish: Equal Lows (price) + Significantly Higher Low (indicator)
      else if ( Math.abs( priceChange ) < 0.005 && indicatorChange > 0.02 )
      {  // ← تخفيف
        type = 'exaggerated';
        baseScore = 65;
      }
      // ↩️ Reverse Bullish: Lower Low (price) + Lower Low (indicator) but indicator shows accumulation
      else if ( priceChange < -0.005 && indicatorChange < -0.003 && this.checkAccumulation( candles, point1.index, point2.index ) )
      {  // ← تخفيف
        type = 'reverse';
        baseScore = 55;
      }

    } else
    {
      // ===== BEARISH DIVERGENCES (تحليل القمم) =====

      // 🔥 Strong Bearish: Higher High (price) + Lower High (indicator)
      if ( priceChange > 0.003 && indicatorChange < -0.005 )
      {  // ← تخفيف
        type = 'strong';
        baseScore = 90;
      }
      // 📊 Medium Bearish: Equal/Slight Higher High (price) + Lower High (indicator)
      else if ( priceChange > -0.005 && priceChange < 0.03 && indicatorChange < -0.005 )
      {  // ← تخفيف
        type = 'medium';
        baseScore = 70;
      }
      // 📉 Weak Bearish: Higher High (price) + Equal/Slight Lower High (indicator)
      else if ( priceChange > 0.005 && indicatorChange < 0.01 && indicatorChange > -0.02 )
      {  // ← تخفيف
        type = 'weak';
        baseScore = 50;
      }
      // 🔄 Hidden Bearish: Lower High (price) + Higher High (indicator) - Continuation
      else if ( priceChange < -0.003 && indicatorChange > 0.005 )
      {  // ← تخفيف
        type = 'hidden';
        baseScore = 75;
      }
      // ⚡ Exaggerated Bearish: Equal Highs (price) + Significantly Lower High (indicator)
      else if ( Math.abs( priceChange ) < 0.005 && indicatorChange < -0.02 )
      {  // ← تخفيف
        type = 'exaggerated';
        baseScore = 65;
      }
      // ↩️ Reverse Bearish: Higher High (price) + Higher High (indicator) but indicator shows distribution
      else if ( priceChange > 0.005 && indicatorChange > 0.003 && this.checkDistribution( candles, point1.index, point2.index ) )
      {  // ← تخفيف
        type = 'reverse';
        baseScore = 55;
      }
    }

    if ( !type ) return null;

    // حساب النتيجة النهائية
    const slopeDiff = Math.abs( priceSlope - indicatorSlope );
    const prominenceBonus = ( point1.prominence + point2.prominence ) / 2 * 2;
    const volumeBonus = this.calculateVolumeBonus( candles, point1.index, point2.index );

    let finalScore = baseScore + prominenceBonus + volumeBonus * this.config.volumeWeight * 100;

    // معاقبة النتيجة إذا كان فرق الميل صغير جداً
    if ( slopeDiff < this.config.slopeThreshold )
    {
      finalScore *= 0.9;  // ← تخفيف: كان 0.8
    }

    // في الوضع الصارم، نرفض النتائج المنخفضة
    if ( this.config.strictMode && finalScore < 40 )
    {  // ← تخفيف: كان 60
      return null;
    }

    return {
      type,
      score: Math.min( 100, Math.max( 0, finalScore ) ),
      priceSlope,
      indicatorSlope
    };
  }

  /**
   * حساب المؤشر المطلوب
   */
  private calculateIndicator ( candles: OHLCV[], indicator: IndicatorType ): number[]
  {
    switch ( indicator )
    {
      case 'RSI':
        return IndicatorCalculator.calculateRSI( candles, 14 );
      case 'MACD':
        return IndicatorCalculator.calculateMACD( candles, 12, 26, 9 );
      case 'OBV':
        return IndicatorCalculator.calculateOBV( candles );
      case 'STOCH_RSI':
        return IndicatorCalculator.calculateStochRSI( candles, 14, 14 );
      case 'CCI':
        return IndicatorCalculator.calculateCCI( candles, 20 );
      case 'MFI':
        return IndicatorCalculator.calculateMFI( candles, 14 );
      case 'WILLIAMS_R':
        return IndicatorCalculator.calculateWilliamsR( candles, 14 );
      default:
        return IndicatorCalculator.calculateRSI( candles, 14 );
    }
  }

  /**
   * التحقق من التراكم (Accumulation)
   */
  private checkAccumulation ( candles: OHLCV[], startIndex: number, endIndex: number ): boolean
  {
    let totalVolume = 0;
    let upVolume = 0;

    for ( let i = startIndex; i <= endIndex; i++ )
    {
      totalVolume += candles[ i ].volume;
      if ( candles[ i ].close > candles[ i ].open )
      {
        upVolume += candles[ i ].volume;
      }
    }

    return ( upVolume / totalVolume ) > 0.55; // أكثر من 55% حجم صاعد
  }

  /**
   * التحقق من التوزيع (Distribution)
   */
  private checkDistribution ( candles: OHLCV[], startIndex: number, endIndex: number ): boolean
  {
    let totalVolume = 0;
    let downVolume = 0;

    for ( let i = startIndex; i <= endIndex; i++ )
    {
      totalVolume += candles[ i ].volume;
      if ( candles[ i ].close < candles[ i ].open )
      {
        downVolume += candles[ i ].volume;
      }
    }

    return ( downVolume / totalVolume ) > 0.55; // أكثر من 55% حجم هابط
  }

  /**
   * حساب مكافأة الحجم
   */
  private calculateVolumeBonus ( candles: OHLCV[], startIndex: number, endIndex: number ): number
  {
    const avgVolumeBefore = candles
      .slice( Math.max( 0, startIndex - 20 ), startIndex )
      .reduce( ( sum, c ) => sum + c.volume, 0 ) / 20;

    const avgVolumeDuring = candles
      .slice( startIndex, endIndex + 1 )
      .reduce( ( sum, c ) => sum + c.volume, 0 ) / ( endIndex - startIndex + 1 );

    // إذا كان الحجم أثناء الدايفرجنس أعلى من المتوسط، نعطي مكافأة
    const ratio = avgVolumeDuring / ( avgVolumeBefore || 1 );
    return Math.min( 1, Math.max( 0, ( ratio - 1 ) * 0.5 ) );
  }

  /**
   * إنشاء نتيجة الدايفرجنس
   * 🆕 مع حساب جودة التزامن ومكافأة الثقة
   */
  private createResult (
    divergence: { type: DivergenceType; score: number; priceSlope: number; indicatorSlope: number },
    startPoint: PeakPoint,
    endPoint: PeakPoint,
    indicator: IndicatorType,
    symbol: string,
    exchange: string,
    timeframe: string,
    barsCount: number,
    candles?: OHLCV[],
    indicatorValues?: number[]
  ): DivergenceResult
  {
    const slopeDifference = Math.abs( divergence.priceSlope - divergence.indicatorSlope );

    // 🆕 حساب متوسط التزامن بين النقطتين
    const avgSyncOffset = Math.round( ( startPoint.syncOffset + endPoint.syncOffset ) / 2 );

    // 🆕 تحديد جودة التزامن
    const syncQuality = ZigZagPeakDetector.getSyncQuality( avgSyncOffset );

    // 🆕 حساب مكافأة التزامن للثقة
    const syncBonus = ZigZagPeakDetector.calculateSyncConfidenceBonus( avgSyncOffset );

    // تحديد مستوى الموثوقية
    let reliability: 'high' | 'medium' | 'low' = 'low';
    if ( divergence.score >= 80 && slopeDifference > 0.2 ) reliability = 'high';
    else if ( divergence.score >= 60 && slopeDifference > 0.1 ) reliability = 'medium';

    // 🆕 تحسين الموثوقية إذا كان التزامن مثالي
    if ( syncQuality === 'perfect' && reliability === 'medium' )
    {
      reliability = 'high';
    }

    // حساب زوايا الرسم
    const priceAngle = Math.atan2( endPoint.price - startPoint.price, barsCount ) * ( 180 / Math.PI );
    const indicatorAngle = Math.atan2(
      endPoint.indicatorValue - startPoint.indicatorValue,
      barsCount
    ) * ( 180 / Math.PI );

    // 🆕 حساب الثقة مع مكافأة التزامن
    const baseConfidence = divergence.score * 0.9 + slopeDifference * 10;
    const finalConfidence = Math.min( 100, Math.max( 0, Math.round( baseConfidence + syncBonus ) ) );

    return {
      id: `${ symbol }-${ indicator }-${ divergence.type }-${ endPoint.timestamp }`,
      type: divergence.type,
      direction: startPoint.isHigh ? 'bearish' : 'bullish',
      indicator,
      symbol,
      exchange,
      timeframe,
      startPoint,
      endPoint,
      priceSlope: divergence.priceSlope,
      indicatorSlope: divergence.indicatorSlope,
      slopeDifference,
      score: Math.round( divergence.score ),
      // 🆕 الثقة محدودة بين 0-100% مع مكافأة التزامن
      confidence: finalConfidence,
      reliability,
      drawingData: {
        priceLine: {
          x1: startPoint.index,
          y1: startPoint.price,
          x2: endPoint.index,
          y2: endPoint.price
        },
        indicatorLine: {
          x1: startPoint.indicatorPeakIndex,  // 🆕 استخدام فهرس قمة المؤشر الفعلي
          y1: startPoint.indicatorValue,
          x2: endPoint.indicatorPeakIndex,    // 🆕 استخدام فهرس قمة المؤشر الفعلي
          y2: endPoint.indicatorValue
        },
        priceAngle,
        indicatorAngle
      },
      barsCount,
      volumeProfile: this.getVolumeProfile( startPoint, endPoint ),
      timestamp: endPoint.timestamp,
      detectedAt: new Date(),
      // 🆕 بيانات التزامن الجديدة
      syncOffset: avgSyncOffset,
      syncQuality,
      // 🆕 بيانات دورة الحياة (Lifecycle)
      status: 'active',
      signature: '', // سيتم ملؤه في الماسح
      totalCandlesAtDetection: candles?.length || 0,
      candles,
      indicatorValues
    };
  }

  /**
   * تحديد ملف الحجم
   */
  private getVolumeProfile ( start: PeakPoint, end: PeakPoint ): 'increasing' | 'decreasing' | 'stable'
  {
    const ratio = end.volume / ( start.volume || 1 );
    if ( ratio > 1.2 ) return 'increasing';
    if ( ratio < 0.8 ) return 'decreasing';
    return 'stable';
  }
}

// ============================================================================
// 📤 EXPORTS - التصديرات
// ============================================================================

export { IndicatorCalculator, ZigZagPeakDetector };

export const DIVERGENCE_TYPE_LABELS: Record<DivergenceType, { en: string; ar: string }> = {
  strong: { en: 'Strong', ar: 'قوي' },
  medium: { en: 'Medium', ar: 'متوسط' },
  weak: { en: 'Weak', ar: 'ضعيف' },
  hidden: { en: 'Hidden', ar: 'خفي' },
  exaggerated: { en: 'Exaggerated', ar: 'مبالغ' },
  reverse: { en: 'Reverse', ar: 'معكوس' }
};

export const DIRECTION_LABELS: Record<DivergenceDirection, { en: string; ar: string; color: string }> = {
  bullish: { en: 'Bullish', ar: 'صعودي', color: '#22c55e' },
  bearish: { en: 'Bearish', ar: 'هبوطي', color: '#ef4444' }
};

export const INDICATOR_LABELS: Record<IndicatorType, { en: string; ar: string }> = {
  RSI: { en: 'RSI', ar: 'مؤشر القوة النسبية' },
  MACD: { en: 'MACD Histogram', ar: 'هيستوجرام ماكد' },
  OBV: { en: 'OBV', ar: 'حجم التداول التراكمي' },
  STOCH_RSI: { en: 'Stoch RSI', ar: 'مؤشر ستوكاستيك RSI' },
  CCI: { en: 'CCI', ar: 'مؤشر قناة السلع' },
  MFI: { en: 'MFI', ar: 'مؤشر تدفق السيولة' },
  WILLIAMS_R: { en: 'Williams %R', ar: 'مؤشر ويليامز' }
};
