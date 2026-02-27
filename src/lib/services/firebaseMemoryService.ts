/**
 * 🧠 Firebase Memory Service
 * Handles uploading scanner results to Firebase to act as a permanent memory.
 * @author CCWAYS Team
 * @version 1.1.0
 */

import { db } from '../firebase/client';
import { exchangeOrchestrator } from './ExchangeOrchestrator';
import
{
  collection,
  doc,
  setDoc,
  serverTimestamp,
  query,
  getDocs,
  limit,
  orderBy
} from 'firebase/firestore';

export interface ScannerMetaPayload
{
  sourceExchange?: string;
  latencyMs?: number;
  healthStatus?: string;
  errorCount?: number;
  lastErrorType?: string;
  lastErrorAt?: number;
}

const cleanUndefined = <T extends Record<string, any>>(payload: T): Partial<T> =>
  Object.fromEntries(Object.entries(payload).filter(([_, v]) => v !== undefined));

export const FirebaseMemoryService = {
  /**
   * Generic save function for any scanner page and exchange
  * 🧠 يدعم الهيكل المركزي الجديد لـ 14 منصة
   */
  async saveScannerData (
    pageId: string,
    exchange: string,
    symbol: string,
    data: any,
    meta?: ScannerMetaPayload
  )
  {
    if ( !db ) return;
    try
    {
      const { ensureAnonymousAuth } = await import( '../firebase/client' );
      const user = await ensureAnonymousAuth();
      if ( !user )
      {
        console.warn( `FirebaseMemory: anonymous auth unavailable. Skipping write for ${ pageId }/${ exchange }` );
        return;
      }

      // 🏗️ الهيكل الموحد: scanners_results/{pageId}/exchanges/{exchange}/data/{symbol}
      const exchangeId = exchange.toLowerCase();
      const id = symbol.replace( /[\/\-]/g, '' ).toLowerCase();
      const ref = doc( db, 'scanners_results', pageId, 'exchanges', exchangeId, 'data', id );

      // تنظيف البيانات من أي قيم undefined لتجنب أخطاء Firestore
      const cleanData = cleanUndefined( data );

      const status = exchangeOrchestrator.getExchangeStatus( exchangeId as any );
      const resolvedMeta: ScannerMetaPayload = meta ?? {
        sourceExchange: exchangeId,
        latencyMs: status?.latencyMs,
        healthStatus: status?.status,
        errorCount: status?.errorCount,
        lastErrorType: status?.lastErrorType,
        lastErrorAt: status?.lastErrorAt,
      };

      const payload = cleanUndefined({
        ...cleanData,
        exchange: exchangeId,
        symbol: symbol.toUpperCase(),
        detectedAt: serverTimestamp(),
        expiresAt: new Date( Date.now() + 15 * 60 * 1000 ),
        sourceExchange: resolvedMeta?.sourceExchange || exchangeId,
        latencyMs: resolvedMeta?.latencyMs,
        healthStatus: resolvedMeta?.healthStatus,
      });

      await setDoc( ref, payload, { merge: true } );

      // تحديث حالة "آخر تحديث" للمنصة لسهولة المراقبة
      const metaRef = doc( db, 'scanners_results', pageId, 'exchanges', exchangeId );
      const metaPayload = {
        lastUpdate: serverTimestamp(),
        status: resolvedMeta?.healthStatus || 'online',
        lastLatencyMs: resolvedMeta?.latencyMs,
        errorCount: resolvedMeta?.errorCount,
        lastErrorType: resolvedMeta?.lastErrorType,
        lastErrorAt: resolvedMeta?.lastErrorAt ? new Date( resolvedMeta.lastErrorAt ) : undefined,
      };

      const cleanMeta = cleanUndefined( metaPayload );

      await setDoc( metaRef, cleanMeta, { merge: true } );

    } catch ( err )
    {
      console.error( `FirebaseMemory: Failed to save ${ pageId } data for ${ exchange }`, err );
    }
  },

  /**
   * Get all results for a specific scanner and exchange
   */
  async getScannerResults ( pageId: string, exchange: string )
  {
    if ( !db ) return [];
    try
    {
      const { ensureAnonymousAuth } = await import( '../firebase/client' );
      await ensureAnonymousAuth();

      // تم إزالة orderBy مؤقتاً لتجنب خطأ الصلاحيات الناتج عن نقص الفهارس (Indexes)
      const q = query(
        collection( db, 'scanners_results', pageId, 'exchanges', exchange.toLowerCase(), 'data' ),
        limit( 300 )
      );
      const snap = await getDocs( q );
      return snap.docs.map( doc => ( { id: doc.id, ...doc.data() } ) );
    } catch ( err )
    {
      console.error( `FirebaseMemory: Failed to fetch ${ pageId } results`, err );
      return [];
    }
  },

  /**
   * Saves trend analysis results to Firebase (Legacy support)
   */
  async saveTrendAnalysis ( exchange: string, symbol: string, data: any )
  {
    await this.saveScannerData( 'trend-scanner', exchange, symbol, data );
  },

  /**
   * Checks if memory needs refresh (older than 15 mins)
   */
  async needsRefresh ( pageId: string, exchange: string ): Promise<boolean>
  {
    if ( !db ) return false;
    try
    {
      const { ensureAnonymousAuth } = await import( '../firebase/client' );
      await ensureAnonymousAuth();

      // تم إزالة orderBy مؤقتاً لتجنب خطأ الصلاحيات الناتج عن نقص الفهارس (Indexes)
      const q = query(
        collection( db, 'scanners_results', pageId, 'exchanges', exchange.toLowerCase(), 'data' ),
        limit( 1 )
      );
      const snap = await getDocs( q );
      if ( snap.empty ) return true;

      const lastDoc = snap.docs[ 0 ].data();
      const lastUpdate = lastDoc.detectedAt?.toMillis() || 0;
      const fifteenMins = 15 * 60 * 1000;

      return ( Date.now() - lastUpdate ) > fifteenMins;
    } catch ( err )
    {
      console.error( `FirebaseMemory: Refresh check failed for ${ pageId }`, err );
      return true;
    }
  },

  /**
   * Auto-scan trigger for Bybit when online
   */
  async triggerAutoScanIfBybit ( exchange: string, callback: () => void )
  {
    if ( exchange.toLowerCase() === 'bybit' && typeof window !== 'undefined' && navigator.onLine )
    {
      console.log( '🚀 Auto-scan triggered for Bybit (Online)' );
      callback();
    }
  }
};
