/**
 * 🧠 Exchange Orchestrator - المحرك المركزي الذكي للمنصات
 * مسؤول عن إدارة أولويات المنصات، مراقبة الصحة، والتبديل التلقائي (Failover)
 * @author CCWAYS Team
 * @version 1.0.0
 */

import { ExchangeId } from './centralizedExchanges';
import { EXCHANGE_PRIORITY } from './exchangeRegistry';

export type ExchangeHealthStatus = 'healthy' | 'disabled';

export interface ExchangeStatus
{
  id: ExchangeId;
  status: ExchangeHealthStatus;
  latencyMs: number;
  lastChecked: number;
  lastSuccessAt?: number;
  lastErrorAt?: number;
  lastErrorType?: string;
  errorCount: number;
  errorWindowStart?: number;
  consecutiveErrors: number;
  disabledAt?: number;
  disabledReason?: string;
  healthCheckSuccesses: number;
}

const ERROR_THRESHOLD = 3;
const ERROR_WINDOW_MS = 10 * 60 * 1000;
const HEALTHCHECK_INTERVAL_MS = 60 * 1000;
const HEALTHCHECK_SUCCESS_THRESHOLD = 2;

class ExchangeOrchestrator
{
  private static instance: ExchangeOrchestrator;

  // قائمة المنصات المرتبة حسب الأولوية (Binance دائماً الأولى)
  private priorityList: ExchangeId[] = [ ...EXCHANGE_PRIORITY ];

  // حالة المنصات الحالية
  private statusMap: Map<ExchangeId, ExchangeStatus> = new Map();

  // المنصة النشطة حالياً في الواجهة
  private currentActiveIndex: number = 0;

  // المنصة المختارة يدوياً (قفل يدوي)
  private manualExchange: ExchangeId | null = 'binance';

  private subscribers: Set<( exchangeId: ExchangeId ) => void> = new Set();
  private healthCheckTimers: Map<ExchangeId, number> = new Map();

  private constructor ()
  {
    this.initializeStatus();
  }

  public static getInstance (): ExchangeOrchestrator
  {
    if ( !ExchangeOrchestrator.instance )
    {
      ExchangeOrchestrator.instance = new ExchangeOrchestrator();
    }
    return ExchangeOrchestrator.instance;
  }

  /**
   * تهيئة الحالة الأولية للمنصات
   */
  private initializeStatus ()
  {
    this.priorityList.forEach( id =>
    {
      this.statusMap.set( id, {
        id,
        status: 'healthy',
        latencyMs: 0,
        lastChecked: Date.now(),
        errorCount: 0,
        consecutiveErrors: 0,
        healthCheckSuccesses: 0,
      } );
    } );
  }

  /**
   * تحديث قائمة المنصات الثابتة (14 منصة)
   */
  public updatePriorityList ( _exchanges: ExchangeId[] )
  {
    // الترتيب ثابت حسب متطلبات النظام
    this.priorityList = [ ...EXCHANGE_PRIORITY ];

    this.priorityList.forEach( id =>
    {
      if ( !this.statusMap.has( id ) )
      {
        this.statusMap.set( id, {
          id,
          status: 'healthy',
          latencyMs: 0,
          lastChecked: Date.now(),
          errorCount: 0,
          consecutiveErrors: 0,
          healthCheckSuccesses: 0,
        } );
      }
    } );
  }

  /**
   * الحصول على المنصة التي يجب استخدامها حالياً
   */
  public getActiveExchange (): ExchangeId
  {
    if ( this.manualExchange )
    {
      return this.manualExchange;
    }
    const next = this.getFirstHealthyExchange();
    return next;
  }

  public resolvePreferredExchange ( exchangeId: ExchangeId ): ExchangeId
  {
    this.setManualExchange( exchangeId );
    return exchangeId;
  }

  /**
   * قفل المنصة يدوياً (لا تغيير تلقائي حتى يختار المستخدم منصة أخرى)
   */
  public setManualExchange ( exchangeId: ExchangeId )
  {
    this.manualExchange = exchangeId;
    this.setActiveExchange( exchangeId );
    this.notifyActiveChange( exchangeId, true );
  }

  /**
   * إلغاء القفل اليدوي (يسمح بالتبديل التلقائي)
   */
  public clearManualExchange ()
  {
    this.manualExchange = null;
    this.notifyActiveChange( this.getFirstHealthyExchange(), true );
  }

  /**
   * التبديل للمنصة التالية عند حدوث خطأ
   */
  public reportError ( exchangeId: ExchangeId, errorType?: string )
  {
    const status = this.statusMap.get( exchangeId );
    if ( !status ) return;

    const now = Date.now();
    status.lastErrorAt = now;
    status.lastErrorType = errorType;
    status.consecutiveErrors += 1;

    if ( !status.errorWindowStart || now - status.errorWindowStart > ERROR_WINDOW_MS )
    {
      status.errorWindowStart = now;
      status.errorCount = 1;
    } else
    {
      status.errorCount += 1;
    }

    if ( status.errorCount >= ERROR_THRESHOLD || status.consecutiveErrors >= ERROR_THRESHOLD )
    {
      this.disableExchange( exchangeId, `errors:${ status.errorCount }` );
    }
  }

  public reportSuccess ( exchangeId: ExchangeId, latencyMs?: number )
  {
    const status = this.statusMap.get( exchangeId );
    if ( !status ) return;

    status.status = 'healthy';
    status.lastChecked = Date.now();
    status.lastSuccessAt = Date.now();
    status.errorCount = 0;
    status.consecutiveErrors = 0;
    status.lastErrorType = undefined;
    status.errorWindowStart = undefined;
    status.healthCheckSuccesses = 0;
    if ( typeof latencyMs === 'number' )
    {
      status.latencyMs = latencyMs;
    }

    this.notifyActiveChange( this.getFirstHealthyExchange() );
  }

  /**
   * فحص صحة منصة معينة
   */
  private async checkHealth ( exchangeId: ExchangeId )
  {
    try
    {
      const start = Date.now();
      // محاولة طلب بسيط للفحص
      const res = await fetch( `/api/cex?exchange=${ exchangeId }&endpoint=ping` );
      const status = this.statusMap.get( exchangeId );

      if ( status )
      {
        status.lastChecked = Date.now();
        status.latencyMs = Date.now() - start;
        status.lastChecked = Date.now();
        if ( res.ok )
        {
          status.healthCheckSuccesses += 1;
          if ( status.healthCheckSuccesses >= HEALTHCHECK_SUCCESS_THRESHOLD )
          {
            status.status = 'healthy';
            status.errorCount = 0;
            status.consecutiveErrors = 0;
            status.errorWindowStart = undefined;
            status.disabledAt = undefined;
            status.disabledReason = undefined;
            this.clearHealthCheckTimer( exchangeId );
            this.notifyActiveChange( this.getFirstHealthyExchange() );
          }
        } else
        {
          status.healthCheckSuccesses = 0;
        }
      }
    } catch
    {
      const status = this.statusMap.get( exchangeId );
      if ( status )
      {
        status.healthCheckSuccesses = 0;
      }
    } finally
    {
      const status = this.statusMap.get( exchangeId );
      if ( status?.status === 'disabled' )
      {
        this.scheduleHealthCheck( exchangeId );
      }
    }
  }

  /**
   * الحصول على كافة المنصات (14 منصة)
   */
  public getAllExchanges (): ExchangeId[]
  {
    return this.priorityList;
  }

  public getExchangeStatus ( exchangeId: ExchangeId ): ExchangeStatus | undefined
  {
    return this.statusMap.get( exchangeId );
  }

  public getStatusReport (): ExchangeStatus[]
  {
    return Array.from( this.statusMap.values() );
  }

  public subscribe ( listener: ( exchangeId: ExchangeId ) => void )
  {
    this.subscribers.add( listener );
    return () => this.subscribers.delete( listener );
  }

  private notifyActiveChange ( exchangeId: ExchangeId, force: boolean = false )
  {
    if ( this.manualExchange && !force ) return;
    this.subscribers.forEach( ( listener ) => listener( exchangeId ) );
  }

  private getFirstHealthyExchange (): ExchangeId
  {
    for ( let i = 0; i < this.priorityList.length; i++ )
    {
      const id = this.priorityList[ i ];
      const status = this.statusMap.get( id );
      if ( status && status.status === 'healthy' )
      {
        if ( this.currentActiveIndex !== i )
        {
          this.currentActiveIndex = i;
          this.notifyActiveChange( id );
        }
        return id;
      }
    }
    return 'binance';
  }

  private setActiveExchange ( exchangeId: ExchangeId )
  {
    const index = this.priorityList.indexOf( exchangeId );
    if ( index >= 0 )
    {
      this.currentActiveIndex = index;
      this.notifyActiveChange( exchangeId );
    }
  }

  private disableExchange ( exchangeId: ExchangeId, reason: string )
  {
    const status = this.statusMap.get( exchangeId );
    if ( !status ) return;
    if ( status.status === 'disabled' ) return;

    status.status = 'disabled';
    status.disabledAt = Date.now();
    status.disabledReason = reason;

    console.warn( `🚨 Exchange ${ exchangeId } disabled due to repeated errors (${ reason }).` );

    this.notifyActiveChange( this.getFirstHealthyExchange() );
    this.scheduleHealthCheck( exchangeId );
  }

  private scheduleHealthCheck ( exchangeId: ExchangeId )
  {
    if ( this.healthCheckTimers.has( exchangeId ) ) return;
    const timer = setTimeout( () =>
    {
      this.healthCheckTimers.delete( exchangeId );
      this.checkHealth( exchangeId );
    }, HEALTHCHECK_INTERVAL_MS );
    this.healthCheckTimers.set( exchangeId, timer );
  }

  private clearHealthCheckTimer ( exchangeId: ExchangeId )
  {
    const timer = this.healthCheckTimers.get( exchangeId );
    if ( timer )
    {
      clearTimeout( timer );
      this.healthCheckTimers.delete( exchangeId );
    }
  }
}

export const exchangeOrchestrator = ExchangeOrchestrator.getInstance();
