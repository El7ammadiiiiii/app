/**
 * Base Search Engine
 * الفئة الأساسية لجميع محركات البحث
 */

import
    {
        type EngineName,
        type EngineConfig,
        type UnifiedSearchResult,
        type EngineSearchResponse,
        type SearchOptions,
        ENGINE_CONFIGS,
        getRandomUserAgent,
        generateResultId,
        extractDomain,
    } from './types';

export abstract class BaseSearchEngine
{
    protected config: EngineConfig;
    protected lastRequestTime: number = 0;

    constructor ( engineName: EngineName )
    {
        this.config = ENGINE_CONFIGS[ engineName ];
    }

    /**
     * تنفيذ البحث (يجب تنفيذه في الفئات الفرعية)
     */
    abstract search ( options: SearchOptions ): Promise<UnifiedSearchResult[]>;

    /**
     * البحث مع معالجة الأخطاء والتأخير
     */
    async safeSearch ( options: SearchOptions ): Promise<EngineSearchResponse>
    {
        const startTime = Date.now();

        try
        {
            // تطبيق التأخير بين الطلبات
            await this.applyRateLimit();

            // تنفيذ البحث مع timeout
            const results = await this.withTimeout(
                this.search( options ),
                this.config.timeout
            );

            return {
                engine: this.config.name,
                success: true,
                results,
                totalResults: results.length,
                searchTime: Date.now() - startTime,
            };
        } catch ( error )
        {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            console.error( `[${ this.config.name }] Search error:`, errorMessage );

            return {
                engine: this.config.name,
                success: false,
                results: [],
                searchTime: Date.now() - startTime,
                error: errorMessage,
                rateLimited: errorMessage.includes( 'rate' ) || errorMessage.includes( '429' ),
            };
        }
    }

    /**
     * تطبيق حد المعدل
     */
    protected async applyRateLimit (): Promise<void>
    {
        const now = Date.now();
        const elapsed = now - this.lastRequestTime;
        const minDelay = this.config.rateLimit.delayBetweenRequests;

        if ( elapsed < minDelay )
        {
            await this.sleep( minDelay - elapsed );
        }

        this.lastRequestTime = Date.now();
    }

    /**
     * تنفيذ مع timeout
     */
    protected async withTimeout<T> (
        promise: Promise<T>,
        timeoutMs: number
    ): Promise<T>
    {
        return Promise.race( [
            promise,
            new Promise<T>( ( _, reject ) =>
                setTimeout( () => reject( new Error( 'Request timeout' ) ), timeoutMs )
            ),
        ] );
    }

    /**
     * إعادة المحاولة
     */
    protected async withRetry<T> (
        fn: () => Promise<T>,
        retries: number = this.config.retries
    ): Promise<T>
    {
        let lastError: Error | null = null;

        for ( let i = 0; i <= retries; i++ )
        {
            try
            {
                return await fn();
            } catch ( error )
            {
                lastError = error instanceof Error ? error : new Error( String( error ) );

                if ( i < retries )
                {
                    // Exponential backoff
                    await this.sleep( Math.pow( 2, i ) * 1000 );
                }
            }
        }

        throw lastError || new Error( 'Max retries exceeded' );
    }

    /**
     * انتظار
     */
    protected sleep ( ms: number ): Promise<void>
    {
        return new Promise( resolve => setTimeout( resolve, ms ) );
    }

    /**
     * الحصول على User-Agent عشوائي
     */
    protected getUserAgent (): string
    {
        return getRandomUserAgent();
    }

    /**
     * توليد ID للنتيجة
     */
    protected generateId (): string
    {
        return generateResultId( this.config.name );
    }

    /**
     * استخراج النطاق
     */
    protected extractDomain ( url: string ): string
    {
        return extractDomain( url );
    }

    /**
     * بناء Headers أساسية
     */
    protected getBaseHeaders (): Record<string, string>
    {
        return {
            'User-Agent': this.getUserAgent(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache',
        };
    }

    /**
     * تنظيف النص
     */
    protected cleanText ( text: string ): string
    {
        return text
            .replace( /\s+/g, ' ' )
            .replace( /[\r\n\t]/g, ' ' )
            .trim();
    }

    /**
     * معلومات المحرك
     */
    getInfo (): EngineConfig
    {
        return { ...this.config };
    }
}

export default BaseSearchEngine;
