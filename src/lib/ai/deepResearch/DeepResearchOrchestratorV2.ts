/**
 * Deep Research Orchestrator V2
 * النظام الرئيسي للبحث العميق متعدد المصادر
 * يدعم 80+ مصدر API + 50+ مصدر زحف
 */

import { getSearchOrchestrator, type OrchestratedSearchResult, type SearchProgress } from './SearchOrchestrator';
import type {
    UnifiedSearchResult,
    DeepResearchConfig,
    ResearchQuery,
    ContentExtract,
    DeepResearchResult,
    Citation,
    ResearchProgress,
} from './types';

// Re-export types for convenience
export type {
    DeepResearchConfig,
    ResearchQuery,
    ContentExtract,
    DeepResearchResult,
    Citation,
    ResearchProgress,
};

export type ProgressCallback = ( progress: ResearchProgress ) => void;

// ====== الإعدادات الافتراضية ======

const DEFAULT_CONFIG: DeepResearchConfig = {
    maxQueries: 5,
    minSources: 50,
    targetSources: 130,
    extractContent: true,
    firecrawlEnabled: true,
};

// ====== الكلاس الرئيسي ======

export class DeepResearchOrchestratorV2
{
    private config: DeepResearchConfig;
    private searchOrchestrator = getSearchOrchestrator();
    private aborted = false;

    constructor ( config: Partial<DeepResearchConfig> = {} )
    {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * تنفيذ البحث العميق الكامل
     */
    async research (
        query: string,
        onProgress?: ProgressCallback
    ): Promise<DeepResearchResult>
    {
        const startTime = Date.now();
        this.aborted = false;

        const researchId = this.generateId();

        try
        {
            // المرحلة 1: توليد الاستعلامات المتعددة
            this.emit( onProgress, {
                phase: 'query_generation',
                message: 'تحليل السؤال وتوليد استعلامات متعددة...',
                progress: 5,
            } );

            const queries = await this.generateQueries( query );

            if ( this.aborted ) throw new Error( 'Research aborted' );

            // المرحلة 2: البحث عبر جميع المحركات
            this.emit( onProgress, {
                phase: 'searching',
                message: 'البحث عبر محركات متعددة...',
                progress: 10,
            } );

            const allSources: UnifiedSearchResult[] = [];
            const searchResults: OrchestratedSearchResult[] = [];

            for ( let i = 0; i < queries.length; i++ )
            {
                if ( this.aborted ) throw new Error( 'Research aborted' );

                const q = queries[ i ];

                this.emit( onProgress, {
                    phase: 'searching',
                    message: `البحث عن: ${ q.transformed[ 0 ] }`,
                    progress: 10 + Math.floor( ( i / queries.length ) * 40 ),
                    details: {
                        currentQuery: q.transformed[ 0 ],
                        sourcesFound: allSources.length,
                    },
                } );

                // البحث باستخدام الاستعلام المحول
                for ( const transformedQuery of q.transformed )
                {
                    const result = await this.searchOrchestrator.search(
                        transformedQuery,
                        ( searchProgress: SearchProgress ) =>
                        {
                            this.emit( onProgress, {
                                phase: 'searching',
                                message: `البحث في ${ searchProgress.wave === 'api' ? 'APIs' : 'الزواحف' }...`,
                                progress: 10 + Math.floor( ( i / queries.length ) * 40 ) +
                                    Math.floor( ( searchProgress.progress / 100 ) * ( 40 / queries.length ) ),
                                details: {
                                    currentQuery: transformedQuery,
                                    sourcesFound: allSources.length,
                                    wave: searchProgress.wave,
                                    engine: searchProgress.engine,
                                },
                            } );
                        }
                    );

                    searchResults.push( result );
                    allSources.push( ...result.uniqueResults );

                    // التحقق من الوصول للهدف
                    if ( allSources.length >= this.config.targetSources )
                    {
                        break;
                    }
                }

                if ( allSources.length >= this.config.targetSources )
                {
                    break;
                }
            }

            // إزالة التكرارات النهائية
            const uniqueSources = this.deduplicateSources( allSources );

            this.emit( onProgress, {
                phase: 'searching',
                message: `تم جمع ${ uniqueSources.length } مصدر فريد`,
                progress: 50,
                details: { sourcesFound: uniqueSources.length },
            } );

            // المرحلة 3: استخراج المحتوى (اختياري)
            let extractedContent: ContentExtract[] = [];

            if ( this.config.extractContent && this.config.firecrawlEnabled )
            {
                this.emit( onProgress, {
                    phase: 'extracting',
                    message: 'استخراج المحتوى من المصادر الأهم...',
                    progress: 55,
                } );

                extractedContent = await this.extractContent(
                    uniqueSources.slice( 0, 20 ), // أهم 20 مصدر
                    ( extracted ) =>
                    {
                        this.emit( onProgress, {
                            phase: 'extracting',
                            message: `استخراج المحتوى: ${ extracted }/${ Math.min( 20, uniqueSources.length ) }`,
                            progress: 55 + Math.floor( ( extracted / 20 ) * 20 ),
                        } );
                    }
                );
            }

            if ( this.aborted ) throw new Error( 'Research aborted' );

            // المرحلة 4: توليد التقرير النهائي
            this.emit( onProgress, {
                phase: 'synthesizing',
                message: 'تجميع وتحليل النتائج...',
                progress: 80,
            } );

            const { synthesis, citations } = await this.synthesizeResults(
                query,
                uniqueSources,
                extractedContent
            );

            // حساب الإحصائيات
            const apiSources = searchResults.reduce(
                ( acc, r ) => acc + r.waveResults.find( w => w.wave === 'api' )?.results.length || 0,
                0
            );
            const scrapeSources = searchResults.reduce(
                ( acc, r ) => acc + r.waveResults.find( w => w.wave === 'scrape' )?.results.length || 0,
                0
            );
            const avgSuccessRate = searchResults.length > 0
                ? searchResults.reduce( ( acc, r ) => acc + r.successRate, 0 ) / searchResults.length
                : 0;

            this.emit( onProgress, {
                phase: 'complete',
                message: 'اكتمل البحث العميق',
                progress: 100,
            } );

            return {
                id: researchId,
                originalQuery: query,
                queries,
                allSources,
                uniqueSources,
                extractedContent,
                synthesis,
                citations,
                metadata: {
                    totalSources: allSources.length,
                    uniqueSources: uniqueSources.length,
                    apiSources,
                    scrapeSources,
                    extractedPages: extractedContent.length,
                    duration: Date.now() - startTime,
                    successRate: avgSuccessRate,
                    timestamp: new Date(),
                },
            };

        } catch ( error )
        {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            this.emit( onProgress, {
                phase: 'error',
                message: `خطأ: ${ errorMessage }`,
                progress: 0,
            } );

            throw error;
        }
    }

    /**
     * توليد استعلامات متعددة من السؤال الأصلي
     */
    private async generateQueries ( originalQuery: string ): Promise<ResearchQuery[]>
    {
        // استخدام تحويلات بسيطة
        const transformations = [
            originalQuery,
            `${ originalQuery } latest research`,
            `${ originalQuery } comprehensive analysis`,
            `${ originalQuery } expert opinions`,
            `what is ${ originalQuery }`,
        ];

        // تقسيم حسب التركيز
        const focusAreas = [
            'overview',
            'recent developments',
            'in-depth analysis',
            'expert perspectives',
            'fundamentals',
        ];

        return transformations.slice( 0, this.config.maxQueries ).map( ( transformed, i ) => ( {
            id: `q-${ i + 1 }`,
            original: originalQuery,
            transformed: [ transformed ],
            focus: focusAreas[ i ] || 'general',
        } ) );
    }

    /**
     * استخراج المحتوى باستخدام Firecrawl
     */
    private async extractContent (
        sources: UnifiedSearchResult[],
        onProgress?: ( count: number ) => void
    ): Promise<ContentExtract[]>
    {
        const extracted: ContentExtract[] = [];
        const firecrawlKey = process.env.FIRECRAWL_API_KEY;

        if ( !firecrawlKey )
        {
            console.warn( '[DeepResearch] Firecrawl API key not found, skipping content extraction' );
            return [];
        }

        for ( let i = 0; i < sources.length; i++ )
        {
            const source = sources[ i ];

            try
            {
                const response = await fetch( 'https://api.firecrawl.dev/v1/scrape', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${ firecrawlKey }`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify( {
                        url: source.url,
                        formats: [ 'markdown' ],
                        onlyMainContent: true,
                    } ),
                } );

                if ( response.ok )
                {
                    const data = await response.json();
                    const content = data.data?.markdown || data.data?.content || '';

                    if ( content.length > 100 )
                    {
                        extracted.push( {
                            url: source.url,
                            title: source.title,
                            content,
                            wordCount: content.split( /\s+/ ).length,
                            extractedAt: new Date(),
                        } );
                    }
                }
            } catch ( error )
            {
                console.warn( `[DeepResearch] Failed to extract: ${ source.url }`, error );
            }

            if ( onProgress )
            {
                onProgress( i + 1 );
            }

            // تأخير بسيط لتجنب rate limiting
            await this.delay( 200 );
        }

        return extracted;
    }

    /**
     * تجميع النتائج وتوليد التقرير
     */
    private async synthesizeResults (
        query: string,
        sources: UnifiedSearchResult[],
        content: ContentExtract[]
    ): Promise<{ synthesis: string; citations: Citation[] }>
    {
        // إنشاء الاقتباسات
        const citations: Citation[] = sources.slice( 0, 50 ).map( ( source, i ) => ( {
            id: i + 1,
            title: source.title,
            url: source.url,
            domain: source.domain || this.extractDomain( source.url ),
            snippet: source.snippet,
        } ) );

        // بناء ملخص المصادر
        const sourcesSummary = sources.slice( 0, 30 ).map( ( s, i ) =>
            `[${ i + 1 }] ${ s.title }: ${ s.snippet || 'No description' }`
        ).join( '\n\n' );

        // بناء ملخص المحتوى المستخرج
        const contentSummary = content.slice( 0, 10 ).map( c =>
            `### ${ c.title }\n${ c.content.slice( 0, 1000 ) }...`
        ).join( '\n\n---\n\n' );

        // النص التجميعي
        const synthesis = this.buildSynthesis( query, citations, sourcesSummary, contentSummary );

        return { synthesis, citations };
    }

    /**
     * بناء التقرير التجميعي
     */
    private buildSynthesis (
        query: string,
        citations: Citation[],
        sourcesSummary: string,
        contentSummary: string
    ): string
    {
        const citationsList = citations.map( c =>
            `${ c.id }. ${ c.title } - ${ c.domain }`
        ).join( '\n' );

        return `
# تقرير البحث العميق

## السؤال الأصلي
${ query }

## ملخص النتائج
تم جمع ${ citations.length } مصدر موثوق من محركات بحث متعددة.

## المصادر الرئيسية
${ sourcesSummary.slice( 0, 3000 ) }

${ contentSummary ? `## المحتوى المستخرج\n${ contentSummary.slice( 0, 5000 ) }` : '' }

## قائمة المراجع
${ citationsList }
`.trim();
    }

    /**
     * إزالة المصادر المكررة
     */
    private deduplicateSources ( sources: UnifiedSearchResult[] ): UnifiedSearchResult[]
    {
        const seen = new Map<string, UnifiedSearchResult>();

        for ( const source of sources )
        {
            const key = this.normalizeUrl( source.url );
            if ( !seen.has( key ) )
            {
                seen.set( key, source );
            }
        }

        return Array.from( seen.values() );
    }

    /**
     * تطبيع URL
     */
    private normalizeUrl ( url: string ): string
    {
        try
        {
            const parsed = new URL( url );
            return `${ parsed.hostname.replace( /^www\./, '' ) }${ parsed.pathname.replace( /\/$/, '' ) }`.toLowerCase();
        } catch
        {
            return url.toLowerCase();
        }
    }

    /**
     * استخراج النطاق
     */
    private extractDomain ( url: string ): string
    {
        try
        {
            const parsed = new URL( url );
            return parsed.hostname.replace( /^www\./, '' );
        } catch
        {
            return url;
        }
    }

    /**
     * توليد معرف فريد
     */
    private generateId (): string
    {
        return `dr-${ Date.now() }-${ Math.random().toString( 36 ).substr( 2, 9 ) }`;
    }

    /**
     * تأخير
     */
    private delay ( ms: number ): Promise<void>
    {
        return new Promise( resolve => setTimeout( resolve, ms ) );
    }

    /**
     * إرسال تحديث التقدم
     */
    private emit ( callback: ProgressCallback | undefined, progress: ResearchProgress ): void
    {
        if ( callback )
        {
            callback( progress );
        }
    }

    /**
     * إلغاء البحث
     */
    abort (): void
    {
        this.aborted = true;
        this.searchOrchestrator.abort();
    }
}

// Factory function
export function createDeepResearchOrchestrator (
    config?: Partial<DeepResearchConfig>
): DeepResearchOrchestratorV2
{
    return new DeepResearchOrchestratorV2( config );
}

export default DeepResearchOrchestratorV2;
