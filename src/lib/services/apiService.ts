/**
 * Unified API Service for Frontend Integration
 * Priority: FastAPI (port 8000) → Unified API → Local fallback → Firebase
 */
import { exchangeOrchestrator } from "./ExchangeOrchestrator";
import { fastApiClient } from "./fastApiClient";

// Server-side: call backend directly; Client-side: use relative URL (hides origin)
const _isServer = typeof window === 'undefined';
const API_BASE_URL = _isServer
  ? (process.env.FRONTEND_API_URL || 'http://127.0.0.1:8000/api/v1')
  : '/api/v1';
const IS_LOCAL_API_BASE = false; // always routed through Nginx or proxy
const REQUEST_TIMEOUT_MS = 12000;

function normalizeTimeframe ( timeframe?: string )
{
  // Backward compatibility: legacy timeframe "3d" is treated as weekly ("1w")
  if ( !timeframe ) return timeframe;
  if ( timeframe === '3d' || timeframe === '3D' ) return '1w';
  return timeframe;
}

export interface FetchParams
{
  exchange?: string;
  symbol?: string;
  timeframe?: string;
  limit?: number;
  from?: string;
  to?: string;
  type?: string;
}

async function fetchWithTimeout ( url: string, options: RequestInit = {}, timeoutMs = REQUEST_TIMEOUT_MS )
{
  const controller = new AbortController();
  const timer = setTimeout( () => controller.abort(), timeoutMs );
  try
  {
    return await fetch( url, { ...options, signal: controller.signal } );
  } finally
  {
    clearTimeout( timer );
  }
}

async function fetchFromUnifiedApi ( endpoint: string, params: FetchParams = {} ): Promise<any>
{
  // 🧠 استخدام المنصة النشطة من المحرك المركزي إذا لم يتم تحديد منصة
  const requestedExchange = params.exchange as any;
  const activeExchange = requestedExchange
    ? exchangeOrchestrator.resolvePreferredExchange( requestedExchange )
    : exchangeOrchestrator.getActiveExchange();

  const tryLocalCandlesticks = async () =>
  {
    if ( endpoint !== 'candlesticks' ) return null;

    const safeTimeframe = normalizeTimeframe( params.timeframe );

    const queryParams = new URLSearchParams();
    queryParams.append( 'exchange', String( activeExchange || 'bybit' ) );
    if ( params.symbol ) queryParams.append( 'symbol', String( params.symbol ) );
    if ( safeTimeframe ) queryParams.append( 'timeframe', String( safeTimeframe ) );
    if ( params.limit ) queryParams.append( 'limit', String( params.limit ) );

    const response = await fetchWithTimeout( `/api/exchanges/ohlcv?${ queryParams.toString() }` );
    if ( !response.ok ) return null;

    const data = await response.json();
    if ( Array.isArray( data?.data ) ) return data.data;
    if ( Array.isArray( data ) ) return data;
    return null;
  };

  const queryParams = new URLSearchParams();
  const normalizedParams: FetchParams = {
    ...params,
    exchange: activeExchange,
    timeframe: normalizeTimeframe( params.timeframe )
  };

  Object.entries( normalizedParams ).forEach( ( [ key, value ] ) =>
  {
    if ( value !== undefined && value !== null && value !== 'all' )
    {
      queryParams.append( key, value.toString() );
    }
  } );

  const url = `${ API_BASE_URL }/${ endpoint }?${ queryParams.toString() }`;

  // ─── PRIMARY: Try FastAPI backend first ───
  try
  {
    const isHealthy = await fastApiClient.isHealthy();
    if ( isHealthy )
    {
      if ( endpoint === 'candlesticks' )
      {
        const resp = await fastApiClient.getOHLCV(
          String( activeExchange || 'binance' ),
          String( normalizedParams.symbol || '' ),
          String( normalizedParams.timeframe || '1h' ),
          Number( normalizedParams.limit || 500 )
        ) as { success?: boolean; data?: unknown[] };
        if ( resp?.success && Array.isArray( resp.data ) && resp.data.length > 0 )
        {
          return resp.data;
        }
      }
    }
  } catch
  {
    // FastAPI unavailable — continue to unified API
  }

  try
  {
    if ( endpoint === 'candlesticks' && IS_LOCAL_API_BASE )
    {
      const localFirst = await tryLocalCandlesticks();
      if ( localFirst ) return localFirst;
    }

    const start = Date.now();
    const response = await fetchWithTimeout( url );
    if ( !response.ok )
    {
      console.warn( `[UnifiedAPI] Warning: ${ response.status } for ${ endpoint } on ${ activeExchange }` );

      const errorType = response.status >= 500
        ? `server:${ response.status }`
        : response.status === 429
          ? 'rate-limit'
          : response.status === 403 || response.status === 401
            ? 'blocked'
            : `http:${ response.status }`;

      // 🚨 إبلاغ المحرك المركزي بالخطأ للتبديل التلقائي
      exchangeOrchestrator.reportError( activeExchange as any, errorType );

      const localFallback = await tryLocalCandlesticks();
      if ( localFallback ) return localFallback;

      // محاولة الطلب مرة أخرى بالمنصة التالية (Recursive Failover)
      const nextExchange = exchangeOrchestrator.getActiveExchange();
      if ( nextExchange !== activeExchange )
      {
        console.log( `🔄 Switching to next exchange: ${ nextExchange }` );
        return fetchFromUnifiedApi( endpoint, { ...params, exchange: nextExchange } );
      }

      return null;
    }
    const result = await response.json();
    exchangeOrchestrator.reportSuccess( activeExchange as any, Date.now() - start );
    return result.data;
  } catch ( error )
  {
    const isAbort = ( error as Error )?.name === 'AbortError';
    const errorType = isAbort ? 'timeout' : 'network';

    // 🚨 إبلاغ المحرك المركزي بفشل الاتصال
    exchangeOrchestrator.reportError( activeExchange as any, errorType );

    const localFallback = await tryLocalCandlesticks();
    if ( localFallback ) return localFallback;

    // 🛡️ Robust Error Handling: Fallback to Firebase if Backend is down
    console.warn( `[UnifiedAPI] Backend unreachable for ${ endpoint }. Falling back to Firebase memory.` );

    // If it's a scanner endpoint, we can try to fetch from Firebase directly as a fallback
    const scannerEndpoints: Record<string, string> = {
      'patterns': 'pattern-scanner-new',
      'levels': 'levels-scanner',
      'volume': 'volume-scanner',
      'trends': 'trend-scanner',
      'divergences': 'divergence-scanner'
    };

    if ( scannerEndpoints[ endpoint ] )
    {
      try
      {
        // تصحيح الاستيراد الديناميكي لضمان الوصول للكائن الصحيح
        const module = await import( './firebaseMemoryService' );
        const service = module.FirebaseMemoryService;

        if ( !service || typeof service.getScannerResults !== 'function' )
        {
          console.error( '[UnifiedAPI] FirebaseMemoryService or getScannerResults not found' );
          return null;
        }

        const pageId = scannerEndpoints[ endpoint ];
        const exchange = params.exchange || exchangeOrchestrator.getActiveExchange() || 'bybit';

        return await service.getScannerResults( pageId, exchange );
      } catch ( fbError )
      {
        console.error( `[UnifiedAPI] Firebase fallback failed for ${ endpoint }`, fbError );
      }
    }

    return null;
  }
}

export const apiService = {
  getPatterns: ( params: FetchParams ) => fetchFromUnifiedApi( 'patterns', params ),
  getLevels: ( params: FetchParams ) => fetchFromUnifiedApi( 'levels', params ),
  getVolume: ( params: FetchParams ) => fetchFromUnifiedApi( 'volume', params ),
  getTrends: ( params: FetchParams ) => fetchFromUnifiedApi( 'trends', params ),
  getDivergences: ( params: FetchParams ) => fetchFromUnifiedApi( 'divergences', params ),
  getCandlesticks: ( params: FetchParams ) => fetchFromUnifiedApi( 'candlesticks', params ),
};
