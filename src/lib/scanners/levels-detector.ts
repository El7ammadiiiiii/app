/**
 * 📊 Pivot Levels Detection Engine - محرك الكشف عن مستويات الدعم والمقاومة
 * 
 * خوارزمية Pivot Levels للكشف عن مستويات الدعم والمقاومة الأفقية
 * Pivot Levels algorithm for detecting horizontal support and resistance levels
 * 
 * @author CCWAYS Team
 * @version 1.0.0
 * @created 2025-12-31
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

export type LevelType = 'resistance' | 'support';

export type LevelStatus =
  | 'all'              // جميع المستويات
  | 'near_resistance'  // قريب من المقاومة (≤6%)
  | 'near_support'     // قريب من الدعم (≤6%)
  | 'broke_resistance' // كسر المقاومة (أغلق فوقها)
  | 'broke_support';   // كسر الدعم (أغلق تحته)

export interface PivotLevel
{
  price: number;
  type: LevelType;
  pivotLength: number;    // طول الـ Pivot (5, 25, 50, 100)
  startIndex: number;     // فهرس بداية المستوى
  timestamp: number;      // وقت تشكل المستوى
  touches: number;        // عدد مرات اللمس
  strength: number;       // قوة المستوى (1-100)
}

export interface LevelResult
{
  id: string;
  symbol: string;
  exchange: string;
  timeframe: string;
  currentPrice: number;
  levels: PivotLevel[];
  status: LevelStatus;
  distanceToNearestResistance: number | null;  // % من السعر الحالي
  distanceToNearestSupport: number | null;     // % من السعر الحالي
  nearestResistance: PivotLevel | null;
  nearestSupport: PivotLevel | null;
  timestamp: number;
  candles: OHLCV[];
  scannedAt: number;
}

// ============================================================================
// 🎨 COLORS
// ============================================================================

export const LEVEL_COLORS = {
  resistance: 'rgb(255, 82, 82)',   // أحمر متشبع
  support: 'rgb(0, 230, 118)',       // أخضر متشبع
};

// ============================================================================
// 📋 LABELS
// ============================================================================

export const LEVEL_STATUS_LABELS: Record<LevelStatus, { ar: string; en: string }> = {
  all: { ar: 'الكل', en: 'All' },
  near_resistance: { ar: 'قريب من المقاومة', en: 'Near Resistance' },
  near_support: { ar: 'قريب من الدعم', en: 'Near Support' },
  broke_resistance: { ar: 'كسر المقاومة', en: 'Broke Resistance' },
  broke_support: { ar: 'كسر الدعم', en: 'Broke Support' },
};

export const TIMEFRAME_LABELS: Record<string, { ar: string; en: string }> = {
  '15m': { ar: '15 دقيقة', en: '15m' },
  '1h': { ar: '1 ساعة', en: '1h' },
  '4h': { ar: '4 ساعات', en: '4h' },
  '1d': { ar: '1 يوم', en: '1d' },
  '1w': { ar: 'أسبوع', en: '1W' },
};

// ============================================================================
// 🔧 PIVOT LEVELS CONFIGURATION
// ============================================================================

export const PIVOT_LENGTHS = [ 5, 25, 50, 100 ];
export const NEAR_THRESHOLD_PERCENT = 6; // 6% أو أقل = قريب

// ============================================================================
// 📊 PIVOT LEVELS DETECTOR CLASS
// ============================================================================

export class PivotLevelsDetector
{
  private pivotLengths: number[];
  private nearThreshold: number;

  constructor (
    pivotLengths: number[] = PIVOT_LENGTHS,
    nearThreshold: number = NEAR_THRESHOLD_PERCENT
  )
  {
    this.pivotLengths = pivotLengths;
    this.nearThreshold = nearThreshold;
  }

  /**
   * 🔍 الكشف عن جميع مستويات Pivot
   * Detect all pivot levels from candles
   */
  detect (
    candles: OHLCV[],
    symbol: string,
    exchange: string,
    timeframe: string
  ): LevelResult
  {
    if ( candles.length < Math.max( ...this.pivotLengths ) * 2 )
    {
      return this.createEmptyResult( symbol, exchange, timeframe, candles );
    }

    const allLevels: PivotLevel[] = [];

    // الكشف عن المستويات لكل طول Pivot
    for ( const length of this.pivotLengths )
    {
      const resistanceLevels = this.findPivotHighs( candles, length );
      const supportLevels = this.findPivotLows( candles, length );

      allLevels.push( ...resistanceLevels, ...supportLevels );
    }

    // دمج المستويات القريبة من بعضها
    const mergedLevels = this.mergeSimilarLevels( allLevels, candles );

    // حساب السعر الحالي
    const currentPrice = candles[ candles.length - 1 ].close;

    // إيجاد أقرب مستوى مقاومة ودعم
    const { nearestResistance, nearestSupport, distanceToResistance, distanceToSupport } =
      this.findNearestLevels( mergedLevels, currentPrice );

    // تحديد الحالة
    const status = this.determineStatus(
      currentPrice,
      nearestResistance,
      nearestSupport,
      distanceToResistance,
      distanceToSupport,
      candles
    );

    return {
      id: `${ exchange }-${ symbol }-${ timeframe }-${ Date.now() }`,
      symbol,
      exchange,
      timeframe,
      currentPrice,
      levels: mergedLevels,
      status,
      distanceToNearestResistance: distanceToResistance,
      distanceToNearestSupport: distanceToSupport,
      nearestResistance,
      nearestSupport,
      timestamp: candles[ candles.length - 1 ].timestamp,
      candles,
      scannedAt: Date.now(),
    };
  }

  /**
   * 🔺 البحث عن قمم Pivot (مستويات المقاومة)
   */
  private findPivotHighs ( candles: OHLCV[], length: number ): PivotLevel[]
  {
    const levels: PivotLevel[] = [];

    for ( let i = length; i < candles.length - length; i++ )
    {
      const currentHigh = candles[ i ].high;
      let isPivot = true;

      // التحقق من أن القمة الحالية أعلى من الشموع المحيطة
      for ( let j = 1; j <= length; j++ )
      {
        if ( candles[ i - j ].high >= currentHigh || candles[ i + j ].high >= currentHigh )
        {
          isPivot = false;
          break;
        }
      }

      if ( isPivot )
      {
        levels.push( {
          price: currentHigh,
          type: 'resistance',
          pivotLength: length,
          startIndex: i,
          timestamp: candles[ i ].timestamp,
          touches: 1,
          strength: this.calculateStrength( length, candles, i, 'resistance' ),
        } );
      }
    }

    return levels;
  }

  /**
   * 🔻 البحث عن قيعان Pivot (مستويات الدعم)
   */
  private findPivotLows ( candles: OHLCV[], length: number ): PivotLevel[]
  {
    const levels: PivotLevel[] = [];

    for ( let i = length; i < candles.length - length; i++ )
    {
      const currentLow = candles[ i ].low;
      let isPivot = true;

      // التحقق من أن القاع الحالي أقل من الشموع المحيطة
      for ( let j = 1; j <= length; j++ )
      {
        if ( candles[ i - j ].low <= currentLow || candles[ i + j ].low <= currentLow )
        {
          isPivot = false;
          break;
        }
      }

      if ( isPivot )
      {
        levels.push( {
          price: currentLow,
          type: 'support',
          pivotLength: length,
          startIndex: i,
          timestamp: candles[ i ].timestamp,
          touches: 1,
          strength: this.calculateStrength( length, candles, i, 'support' ),
        } );
      }
    }

    return levels;
  }

  /**
   * 💪 حساب قوة المستوى
   */
  private calculateStrength (
    pivotLength: number,
    candles: OHLCV[],
    index: number,
    type: LevelType
  ): number
  {
    let strength = 0;

    // القوة الأساسية حسب طول الـ Pivot
    const lengthScore = ( pivotLength / 100 ) * 40; // 40% من النتيجة

    // قوة الحجم
    const avgVolume = candles.slice( Math.max( 0, index - 20 ), index )
      .reduce( ( sum, c ) => sum + c.volume, 0 ) / 20;
    const volumeRatio = candles[ index ].volume / avgVolume;
    const volumeScore = Math.min( volumeRatio * 20, 30 ); // 30% max

    // قوة التفاعل (الذيل)
    const candle = candles[ index ];
    const bodySize = Math.abs( candle.close - candle.open );
    const totalRange = candle.high - candle.low;
    const wickRatio = type === 'resistance'
      ? ( candle.high - Math.max( candle.open, candle.close ) ) / totalRange
      : ( Math.min( candle.open, candle.close ) - candle.low ) / totalRange;
    const wickScore = wickRatio * 30; // 30% max

    strength = lengthScore + volumeScore + wickScore;
    return Math.min( Math.round( strength ), 100 );
  }

  /**
   * 🔗 دمج المستويات القريبة من بعضها
   */
  private mergeSimilarLevels ( levels: PivotLevel[], candles: OHLCV[] ): PivotLevel[]
  {
    if ( levels.length === 0 ) return [];

    const avgPrice = candles.reduce( ( sum, c ) => sum + c.close, 0 ) / candles.length;
    const mergeThreshold = avgPrice * 0.005; // 0.5% من متوسط السعر

    const sortedLevels = [ ...levels ].sort( ( a, b ) => a.price - b.price );
    const merged: PivotLevel[] = [];

    let currentGroup: PivotLevel[] = [ sortedLevels[ 0 ] ];

    for ( let i = 1; i < sortedLevels.length; i++ )
    {
      const level = sortedLevels[ i ];
      const groupAvgPrice = currentGroup.reduce( ( sum, l ) => sum + l.price, 0 ) / currentGroup.length;

      if ( Math.abs( level.price - groupAvgPrice ) <= mergeThreshold &&
        level.type === currentGroup[ 0 ].type )
      {
        currentGroup.push( level );
      } else
      {
        // دمج المجموعة الحالية
        merged.push( this.mergeGroup( currentGroup ) );
        currentGroup = [ level ];
      }
    }

    // دمج المجموعة الأخيرة
    if ( currentGroup.length > 0 )
    {
      merged.push( this.mergeGroup( currentGroup ) );
    }

    // ترتيب حسب القوة
    return merged.sort( ( a, b ) => b.strength - a.strength );
  }

  /**
   * 🔗 دمج مجموعة من المستويات
   */
  private mergeGroup ( group: PivotLevel[] ): PivotLevel
  {
    const avgPrice = group.reduce( ( sum, l ) => sum + l.price, 0 ) / group.length;
    const maxStrength = Math.max( ...group.map( l => l.strength ) );
    const minPivotLength = Math.min( ...group.map( l => l.pivotLength ) );
    const latestTimestamp = Math.max( ...group.map( l => l.timestamp ) );
    const minStartIndex = Math.min( ...group.map( l => l.startIndex ) );

    return {
      price: avgPrice,
      type: group[ 0 ].type,
      pivotLength: minPivotLength,
      startIndex: minStartIndex,
      timestamp: latestTimestamp,
      touches: group.length,
      strength: Math.min( maxStrength + ( group.length - 1 ) * 5, 100 ), // زيادة القوة بعدد اللمسات
    };
  }

  /**
   * 📏 إيجاد أقرب مستويات المقاومة والدعم
   */
  private findNearestLevels (
    levels: PivotLevel[],
    currentPrice: number
  ):
      {
        nearestResistance: PivotLevel | null;
        nearestSupport: PivotLevel | null;
        distanceToResistance: number | null;
        distanceToSupport: number | null;
      }
  {
    const resistances = levels.filter( l => l.type === 'resistance' && l.price > currentPrice );
    const supports = levels.filter( l => l.type === 'support' && l.price < currentPrice );

    // أقرب مقاومة (أقل سعر فوق السعر الحالي)
    const nearestResistance = resistances.length > 0
      ? resistances.reduce( ( min, l ) => l.price < min.price ? l : min )
      : null;

    // أقرب دعم (أعلى سعر تحت السعر الحالي)
    const nearestSupport = supports.length > 0
      ? supports.reduce( ( max, l ) => l.price > max.price ? l : max )
      : null;

    const distanceToResistance = nearestResistance
      ? ( ( nearestResistance.price - currentPrice ) / currentPrice ) * 100
      : null;

    const distanceToSupport = nearestSupport
      ? ( ( currentPrice - nearestSupport.price ) / currentPrice ) * 100
      : null;

    return {
      nearestResistance,
      nearestSupport,
      distanceToResistance,
      distanceToSupport,
    };
  }

  /**
   * 🏷️ تحديد حالة السعر بالنسبة للمستويات
   */
  private determineStatus (
    currentPrice: number,
    nearestResistance: PivotLevel | null,
    nearestSupport: PivotLevel | null,
    distanceToResistance: number | null,
    distanceToSupport: number | null,
    candles: OHLCV[]
  ): LevelStatus
  {
    const lastCandle = candles[ candles.length - 1 ];
    const prevCandle = candles[ candles.length - 2 ];

    // التحقق من كسر المقاومة
    if ( nearestResistance && prevCandle )
    {
      // إذا أغلقت الشمعة الأخيرة فوق المقاومة وكانت الشمعة السابقة تحتها
      if ( lastCandle.close > nearestResistance.price &&
        prevCandle.close <= nearestResistance.price )
      {
        return 'broke_resistance';
      }
    }

    // التحقق من كسر الدعم
    if ( nearestSupport && prevCandle )
    {
      // إذا أغلقت الشمعة الأخيرة تحت الدعم وكانت الشمعة السابقة فوقه
      if ( lastCandle.close < nearestSupport.price &&
        prevCandle.close >= nearestSupport.price )
      {
        return 'broke_support';
      }
    }

    // التحقق من القرب من المقاومة (≤6%)
    if ( distanceToResistance !== null && distanceToResistance <= this.nearThreshold )
    {
      return 'near_resistance';
    }

    // التحقق من القرب من الدعم (≤6%)
    if ( distanceToSupport !== null && distanceToSupport <= this.nearThreshold )
    {
      return 'near_support';
    }

    return 'all';
  }

  /**
   * 📭 إنشاء نتيجة فارغة
   */
  private createEmptyResult (
    symbol: string,
    exchange: string,
    timeframe: string,
    candles: OHLCV[]
  ): LevelResult
  {
    return {
      id: `${ exchange }-${ symbol }-${ timeframe }-${ Date.now() }`,
      symbol,
      exchange,
      timeframe,
      currentPrice: candles.length > 0 ? candles[ candles.length - 1 ].close : 0,
      levels: [],
      status: 'all',
      distanceToNearestResistance: null,
      distanceToNearestSupport: null,
      nearestResistance: null,
      nearestSupport: null,
      timestamp: candles.length > 0 ? candles[ candles.length - 1 ].timestamp : Date.now(),
      candles,
      scannedAt: Date.now(),
    };
  }

  /**
   * 🎨 الحصول على لون المستوى
   */
  static getLevelColor ( type: LevelType ): string
  {
    return LEVEL_COLORS[ type ];
  }

  /**
   * 📊 فلترة النتائج حسب الحالة
   */
  static filterByStatus ( results: LevelResult[], status: LevelStatus ): LevelResult[]
  {
    if ( status === 'all' ) return results;
    return results.filter( r => r.status === status );
  }
}

export default PivotLevelsDetector;
