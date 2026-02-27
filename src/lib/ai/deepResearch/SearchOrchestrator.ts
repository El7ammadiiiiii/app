/**
 * Search Orchestrator
 * منسق البحث متعدد المحركات مع Graceful Degradation
 */

import
    {
        createApiEngines,
        createScrapeEngines,
        type UnifiedSearchResult,
        type EngineName,
        type EngineSearchResponse,
        WAVE_CONFIGS,
        ENGINE_CONFIGS,
    } from './engines';
import type { BaseSearchEngine } from './engines/BaseSearchEngine';

export interface SearchWaveResult
{
    wave: 'api' | 'scrape';
    results: UnifiedSearchResult[];
    successfulEngines: EngineName[];
    failedEngines: Array<{ engine: EngineName; error: string }>;
    duration: number;
}

export interface OrchestratedSearchResult
{
    allResults: UnifiedSearchResult[];
    uniqueResults: UnifiedSearchResult[];
    waveResults: SearchWaveResult[];
    totalSources: number;
    successRate: number;
    duration: number;
}

export interface SearchProgress
{
    type: 'wave_start' | 'engine_complete' | 'engine_error' | 'wave_complete';
    wave: 'api' | 'scrape';
    engine?: EngineName;
    resultCount?: number;
    error?: string;
    progress: number; // 0-100
}

export type ProgressCallback = ( progress: SearchProgress ) => void;

export class SearchOrchestrator
{
    private apiEngines: BaseSearchEngine[];
    private scrapeEngines: BaseSearchEngine[];
    private abortController: AbortController | null = null;

    constructor ()
    {
        this.apiEngines = createApiEngines();
        this.scrapeEngines = createScrapeEngines();
    }

    /**
     * البحث الكامل عبر جميع المحركات
     */
    async search (
        query: string,
        onProgress?: ProgressCallback
    ): Promise<OrchestratedSearchResult>
    {
        const startTime = Date.now();
        this.abortController = new AbortController();

        const waveResults: SearchWaveResult[] = [];
        let allResults: UnifiedSearchResult[] = [];

        try
        {
            // الموجة الأولى: محركات API (الأساسية)
            const apiWave = await this.runWave(
                'api',
                this.apiEngines,
                query,
                ( progress ) =>
                {
                    if ( onProgress )
                    {
                        onProgress( {
                            ...progress,
                            progress: Math.floor( progress.progress * 0.5 ), // 0-50%
                        } );
                    }
                }
            );
            waveResults.push( apiWave );
            allResults.push( ...apiWave.results );

            // الموجة الثانية: محركات الزحف (تكميلية)
            // تعمل بشكل متوازي مع graceful degradation
            const scrapeWave = await this.runWave(
                'scrape',
                this.scrapeEngines,
                query,
                ( progress ) =>
                {
                    if ( onProgress )
                    {
                        onProgress( {
                            ...progress,
                            progress: 50 + Math.floor( progress.progress * 0.5 ), // 50-100%
                        } );
                    }
                }
            );
            waveResults.push( scrapeWave );
            allResults.push( ...scrapeWave.results );

        } catch ( error )
        {
            console.error( '[SearchOrchestrator] Error:', error );
        }

        // إزالة التكرارات
        const uniqueResults = this.deduplicateResults( allResults );

        // ترتيب حسب الـ relevance
        uniqueResults.sort( ( a, b ) => ( b.relevanceScore || 0 ) - ( a.relevanceScore || 0 ) );

        const totalEngines = this.apiEngines.length + this.scrapeEngines.length;
        const successfulEngines = waveResults.reduce(
            ( acc, w ) => acc + w.successfulEngines.length,
            0
        );

        return {
            allResults,
            uniqueResults,
            waveResults,
            totalSources: uniqueResults.length,
            successRate: ( successfulEngines / totalEngines ) * 100,
            duration: Date.now() - startTime,
        };
    }

    /**
     * تشغيل موجة بحث واحدة
     */
    private async runWave (
        waveType: 'api' | 'scrape',
        engines: BaseSearchEngine[],
        query: string,
        onProgress?: ProgressCallback
    ): Promise<SearchWaveResult>
    {
        const startTime = Date.now();
        const results: UnifiedSearchResult[] = [];
        const successfulEngines: EngineName[] = [];
        const failedEngines: Array<{ engine: EngineName; error: string }> = [];

        const waveConfig = WAVE_CONFIGS[ waveType === 'api' ? 0 : 1 ];

        if ( onProgress )
        {
            onProgress( {
                type: 'wave_start',
                wave: waveType,
                progress: 0,
            } );
        }

        // تشغيل جميع المحركات بالتوازي مع Promise.allSettled
        const enginePromises = engines.map( async ( engine, index ) =>
        {
            const engineName = engine.name as EngineName;
            const config = ENGINE_CONFIGS[ engineName ];
            const maxResults = config?.maxResults || 10;

            try
            {
                const engineResults = await engine.safeSearch( {
                    query,
                    maxResults,
                } );

                return {
                    engine: engineName,
                    success: true,
                    results: engineResults,
                };
            } catch ( error )
            {
                return {
                    engine: engineName,
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    results: [] as UnifiedSearchResult[],
                };
            }
        } );

        // انتظار جميع المحركات
        const settledResults = await Promise.allSettled( enginePromises );

        let completedCount = 0;
        const totalEngines = engines.length;

        for ( const settled of settledResults )
        {
            completedCount++;

            if ( settled.status === 'fulfilled' )
            {
                const { engine, success, results: engineResults, error } = settled.value;

                if ( success && engineResults.length > 0 )
                {
                    results.push( ...engineResults );
                    successfulEngines.push( engine );

                    if ( onProgress )
                    {
                        onProgress( {
                            type: 'engine_complete',
                            wave: waveType,
                            engine,
                            resultCount: engineResults.length,
                            progress: ( completedCount / totalEngines ) * 100,
                        } );
                    }
                } else
                {
                    failedEngines.push( {
                        engine,
                        error: error || 'No results returned',
                    } );

                    if ( onProgress )
                    {
                        onProgress( {
                            type: 'engine_error',
                            wave: waveType,
                            engine,
                            error: error || 'No results returned',
                            progress: ( completedCount / totalEngines ) * 100,
                        } );
                    }
                }
            } else
            {
                // Promise rejected
                const error = settled.reason?.message || 'Unknown error';
                console.warn( `[SearchOrchestrator] Engine failed:`, error );
            }
        }

        if ( onProgress )
        {
            onProgress( {
                type: 'wave_complete',
                wave: waveType,
                resultCount: results.length,
                progress: 100,
            } );
        }

        return {
            wave: waveType,
            results,
            successfulEngines,
            failedEngines,
            duration: Date.now() - startTime,
        };
    }

    /**
     * إزالة النتائج المكررة بناءً على URL
     */
    private deduplicateResults ( results: UnifiedSearchResult[] ): UnifiedSearchResult[]
    {
        const seen = new Map<string, UnifiedSearchResult>();

        for ( const result of results )
        {
            const normalizedUrl = this.normalizeUrl( result.url );

            if ( !seen.has( normalizedUrl ) )
            {
                seen.set( normalizedUrl, result );
            } else
            {
                // دمج المعلومات من المصادر المتعددة
                const existing = seen.get( normalizedUrl )!;

                // استخدم الـ snippet الأطول
                if ( ( result.snippet?.length || 0 ) > ( existing.snippet?.length || 0 ) )
                {
                    existing.snippet = result.snippet;
                }

                // استخدم أعلى relevance score
                if ( ( result.relevanceScore || 0 ) > ( existing.relevanceScore || 0 ) )
                {
                    existing.relevanceScore = result.relevanceScore;
                }
            }
        }

        return Array.from( seen.values() );
    }

    /**
     * تطبيع URL للمقارنة
     */
    private normalizeUrl ( url: string ): string
    {
        try
        {
            const parsed = new URL( url );
            // إزالة www
            let host = parsed.hostname.replace( /^www\./, '' );
            // إزالة trailing slash
            let path = parsed.pathname.replace( /\/$/, '' );
            // تحويل للحروف الصغيرة
            return `${ host }${ path }`.toLowerCase();
        } catch
        {
            return url.toLowerCase();
        }
    }

    /**
     * إلغاء البحث
     */
    abort (): void
    {
        if ( this.abortController )
        {
            this.abortController.abort();
            this.abortController = null;
        }
    }

    /**
     * البحث السريع (API فقط)
     */
    async quickSearch ( query: string ): Promise<UnifiedSearchResult[]>
    {
        const wave = await this.runWave( 'api', this.apiEngines, query );
        return this.deduplicateResults( wave.results );
    }

    /**
     * إحصائيات المحركات
     */
    getEngineStats ():
        {
            apiEngines: number;
            scrapeEngines: number;
            totalEngines: number;
            expectedResults: { api: number; scrape: number; total: number };
        }
    {
        const apiMaxResults = WAVE_CONFIGS[ 0 ].engines.reduce( ( acc, name ) =>
        {
            return acc + ( ENGINE_CONFIGS[ name ]?.maxResults || 0 );
        }, 0 );

        const scrapeMaxResults = WAVE_CONFIGS[ 1 ].engines.reduce( ( acc, name ) =>
        {
            return acc + ( ENGINE_CONFIGS[ name ]?.maxResults || 0 );
        }, 0 );

        return {
            apiEngines: this.apiEngines.length,
            scrapeEngines: this.scrapeEngines.length,
            totalEngines: this.apiEngines.length + this.scrapeEngines.length,
            expectedResults: {
                api: apiMaxResults,
                scrape: scrapeMaxResults,
                total: apiMaxResults + scrapeMaxResults,
            },
        };
    }
}

// Singleton instance
let orchestratorInstance: SearchOrchestrator | null = null;

export function getSearchOrchestrator (): SearchOrchestrator
{
    if ( !orchestratorInstance )
    {
        orchestratorInstance = new SearchOrchestrator();
    }
    return orchestratorInstance;
}

export default SearchOrchestrator;
