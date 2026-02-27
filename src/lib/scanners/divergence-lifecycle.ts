/**
 * ⏰ Divergence Lifecycle Manager - مدير دورة حياة الدايفرجنس
 * 
 * نظام ذكي لإدارة دورة حياة الدايفرجنس:
 * - تحديث الحالة عند إغلاق كل شمعة
 * - حساب الوقت المتبقي للانتهاء
 * - توقيع فريد لمنع التكرار
 * 
 * @author CCWAYS Team
 * @version 1.0.0
 * @created 2025-12-15
 */

import { DivergenceResult, EXPIRATION_CANDLES } from './advanced-divergence-detector';
import { getOccurrenceTimeMs } from './freshness-policy';

// ============================================================================
// 📅 TIMEFRAME INTERVALS - مدد الفريمات بالمللي ثانية
// ============================================================================

export const REFRESH_INTERVALS: Record<string, number> = {
  '15m': 15 * 60 * 1000,      // 15 دقيقة
  '1h': 60 * 60 * 1000,       // 1 ساعة
  '4h': 4 * 60 * 60 * 1000,   // 4 ساعات
  '1d': 24 * 60 * 60 * 1000,  // يوم
  '1w': 7 * 24 * 60 * 60 * 1000, // أسبوع
};

// ============================================================================
// 🔑 SIGNATURE GENERATION - توليد التوقيع الفريد
// ============================================================================

/**
 * توليد توقيع فريد للنموذج لمنع التكرار
 * Generate unique signature for pattern deduplication
 * 
 * التوقيع يعتمد على:
 * - الرمز والمؤشر والاتجاه والنوع والفريم
 * - فهرس البداية والنهاية (لمنع نفس النموذج مرتين)
 */
export function generateSignature ( divergence: DivergenceResult ): string
{
  const {
    symbol,
    indicator,
    type,
    direction,
    timeframe,
    startPoint,
    endPoint
  } = divergence;

  const occurrenceTs = getOccurrenceTimeMs( divergence ) ?? divergence.timestamp;
  const startTs = startPoint?.timestamp ?? startPoint?.index ?? 0;
  const endTs = endPoint?.timestamp ?? endPoint?.index ?? 0;

  return `${ symbol }-${ indicator }-${ type }-${ direction }-${ timeframe }-${ startTs }-${ endTs }-${ occurrenceTs }`;
}

// ============================================================================
// ⏱️ CANDLE CLOSE TIMING - حساب وقت إغلاق الشمعة
// ============================================================================

/**
 * حساب المللي ثانية المتبقية حتى إغلاق الشمعة التالية
 * Calculate milliseconds until next candle close
 * 
 * @param timeframe - الفريم الزمني (15m, 1h, 4h, 1d, 1w)
 * @returns عدد المللي ثانية حتى إغلاق الشمعة التالية
 */
export function calculateNextCandleClose ( timeframe: string ): number
{
  const interval = REFRESH_INTERVALS[ timeframe ];

  if ( !interval )
  {

    return REFRESH_INTERVALS[ '15m' ];
  }

  const now = Date.now();
  const nextClose = Math.ceil( now / interval ) * interval;

  return nextClose - now;
}

/**
 * حساب وقت إغلاق الشمعة التالية للفريم الأصغر (15m)
 * Calculate next 15m candle close (smallest timeframe for smart refresh)
 */
export function calculateNext15mCandleClose (): number
{
  return calculateNextCandleClose( '15m' );
}

// ============================================================================
// 🔄 LIFECYCLE STATUS CHECK - فحص حالة دورة الحياة
// ============================================================================

export type LifecycleStatus = 'active' | 'expired' | 'history';

export interface LifecycleCheckResult
{
  status: LifecycleStatus;
  candlesPassed: number;
  candlesRemaining: number;
  expirationLimit: number;
}

/**
 * فحص حالة دورة حياة الدايفرجنس
 * Check divergence lifecycle status
 * 
 * @param divergence - النموذج المراد فحصه
 * @param currentCandleCount - عدد الشموع الحالي (من البيانات الجديدة)
 * @returns حالة النموذج ومعلومات إضافية
 */
export function checkLifecycleStatus (
  divergence: DivergenceResult,
  currentCandleCount: number
): LifecycleCheckResult
{
  const expirationLimit = EXPIRATION_CANDLES[ divergence.timeframe ] || 7;
  const candlesPassed = currentCandleCount - divergence.totalCandlesAtDetection;
  const candlesRemaining = Math.max( 0, expirationLimit - candlesPassed );

  let status: LifecycleStatus;

  if ( candlesPassed < expirationLimit )
  {
    status = 'active';
  } else if ( candlesPassed === expirationLimit )
  {
    status = 'expired';
  } else
  {
    status = 'history'; // بعد شمعة إضافية، ينتقل للتاريخ
  }

  return {
    status,
    candlesPassed,
    candlesRemaining,
    expirationLimit
  };
}

// ============================================================================
// 🔄 BATCH LIFECYCLE UPDATE - تحديث دفعي لدورة الحياة
// ============================================================================

export interface BatchUpdateResult
{
  active: DivergenceResult[];
  expired: DivergenceResult[];
  history: DivergenceResult[];
}

/**
 * تحديث دفعي لحالة جميع النماذج
 * Batch update lifecycle status for all divergences
 * 
 * @param divergences - قائمة النماذج
 * @param currentCandleCounts - خريطة عدد الشموع الحالي لكل فريم
 * @returns النماذج مقسمة حسب الحالة
 */
export function batchUpdateLifecycle (
  divergences: DivergenceResult[],
  currentCandleCounts: Map<string, number>
): BatchUpdateResult
{
  const active: DivergenceResult[] = [];
  const expired: DivergenceResult[] = [];
  const history: DivergenceResult[] = [];

  for ( const divergence of divergences )
  {
    const currentCount = currentCandleCounts.get( divergence.timeframe );

    if ( currentCount === undefined )
    {
      // لو ما حصلنا بيانات للفريم، نخليه active
      active.push( divergence );
      continue;
    }

    const lifecycleCheck = checkLifecycleStatus( divergence, currentCount );
    const updated = { ...divergence, status: lifecycleCheck.status };

    switch ( lifecycleCheck.status )
    {
      case 'active':
        active.push( updated );
        break;
      case 'expired':
        expired.push( updated );
        break;
      case 'history':
        history.push( updated );
        break;
    }
  }

  return { active, expired, history };
}

// ============================================================================
// 💾 LOCALSTORAGE HELPERS - مساعدات التخزين المحلي
// ============================================================================

const SEEN_SIGNATURES_KEY = 'divergence-seen-signatures';
const HISTORY_KEY = 'divergence-history';

/**
 * تحميل التوقيعات المشاهدة من localStorage
 * Load seen signatures from localStorage
 */
export function loadSeenSignatures (): Set<string>
{
  if ( typeof window === 'undefined' ) return new Set();

  try
  {
    const stored = localStorage.getItem( SEEN_SIGNATURES_KEY );
    return stored ? new Set( JSON.parse( stored ) ) : new Set();
  } catch ( e )
  {
    console.error( 'Failed to load seen signatures:', e );
    return new Set();
  }
}

/**
 * حفظ التوقيعات المشاهدة إلى localStorage
 * Save seen signatures to localStorage
 */
export function saveSeenSignatures ( signatures: Set<string> ): void
{
  if ( typeof window === 'undefined' ) return;

  try
  {
    localStorage.setItem( SEEN_SIGNATURES_KEY, JSON.stringify( [ ...signatures ] ) );
  } catch ( e )
  {
    console.error( 'Failed to save seen signatures:', e );
  }
}

/**
 * تحميل التاريخ من localStorage
 * Load history from localStorage
 */
export function loadHistory (): DivergenceResult[]
{
  if ( typeof window === 'undefined' ) return [];

  try
  {
    const stored = localStorage.getItem( HISTORY_KEY );
    return stored ? JSON.parse( stored ) : [];
  } catch ( e )
  {
    console.error( 'Failed to load history:', e );
    return [];
  }
}

/**
 * حفظ التاريخ إلى localStorage
 * Save history to localStorage
 */
export function saveHistory ( history: DivergenceResult[] ): void
{
  if ( typeof window === 'undefined' ) return;

  try
  {
    // احتفظ بآخر 50 نموذج فقط
    const limited = history.slice( 0, 50 );
    localStorage.setItem( HISTORY_KEY, JSON.stringify( limited ) );
  } catch ( e )
  {
    console.error( 'Failed to save history:', e );
  }
}

/**
 * مسح التاريخ من localStorage
 * Clear history from localStorage
 */
export function clearHistory (): void
{
  if ( typeof window === 'undefined' ) return;

  try
  {
    localStorage.removeItem( HISTORY_KEY );
  } catch ( e )
  {
    console.error( 'Failed to clear history:', e );
  }
}
