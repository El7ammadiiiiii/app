/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ALTRA ORCHESTRATOR
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * محرك استدلال متقدم - 6 مراحل:
 * 1. تصنيف (Classify) - تحديد نوع السؤال ومتطلباته
 * 2. تحليل (Decompose) - تفكيك السؤال إلى استعلامات فرعية
 * 3. بحث متوازي (Search) - بحث متعدد المصادر بالتوازي
 * 4. تجميع المصادر (Collect) - دمج وتصفية النتائج
 * 5. استنتاج (Reason) - تحليل عميق للمعلومات المجمّعة
 * 6. تركيب (Synthesize) - بناء الإجابة النهائية
 * 
 * @version 1.0.0
 */

import { quickSearch, searchWithAnswer, searchNews, smartSearch } from '@/lib/ai/webSearch/webSearchService';
import type { WebSearchResult, WebSearchResponse } from '@/types/webSearch';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type AltraPhase =
    | 'classify'
    | 'decompose'
    | 'search'
    | 'collect'
    | 'reason'
    | 'synthesize'
    | 'complete'
    | 'error';

export type QueryCategory =
    | 'factual'        // سؤال حقيقي يحتاج مصادر
    | 'analytical'     // تحليل يحتاج بحث + استنتاج
    | 'creative'       // إبداعي لا يحتاج بحث
    | 'technical'      // تقني يحتاج بحث + كود
    | 'conversational' // محادثة عادية
    | 'multi_hop';     // سؤال متعدد الخطوات

export interface AltraProgress
{
    phase: AltraPhase;
    message: string;
    progress: number; // 0-100
    details?: {
        category?: QueryCategory;
        subQueries?: string[];
        currentQuery?: string;
        sourcesFound?: number;
        uniqueSources?: number;
        searchEngine?: string;
        reasoningStep?: string;
        blocksCompleted?: number;
        totalBlocks?: number;
    };
}

export interface AltraCitation
{
    id: number;
    title: string;
    url: string;
    domain: string;
    snippet?: string;
    relevanceScore?: number;
}

export interface AltraSource
{
    id: string;
    title: string;
    url: string;
    snippet: string;
    domain: string;
    relevanceScore: number;
    source: string;
    publishedDate?: string;
}

export interface AltraBlock
{
    id: string;
    type: 'heading' | 'paragraph' | 'list' | 'code' | 'quote' | 'citation_group';
    content: string;
    citations?: number[];
    status: 'pending' | 'streaming' | 'complete';
}

export interface AltraResult
{
    id: string;
    query: string;
    category: QueryCategory;
    subQueries: string[];
    sources: AltraSource[];
    citations: AltraCitation[];
    reasoning: string;
    synthesis: string;
    blocks: AltraBlock[];
    metadata: {
        totalSources: number;
        uniqueSources: number;
        searchQueries: number;
        duration: number;
        timestamp: Date;
        phaseDurations: Record<AltraPhase, number>;
    };
}

export interface AltraConfig
{
    maxSubQueries: number;
    maxSourcesPerQuery: number;
    enableNews: boolean;
    enableDeepExtract: boolean;
    reasoningDepth: 'shallow' | 'medium' | 'deep';
}

type ProgressCallback = ( progress: AltraProgress ) => void;

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG: AltraConfig = {
    maxSubQueries: 5,
    maxSourcesPerQuery: 8,
    enableNews: true,
    enableDeepExtract: false,
    reasoningDepth: 'deep',
};

// ═══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════════

export class AltraOrchestrator
{
    private config: AltraConfig;
    private phaseDurations: Partial<Record<AltraPhase, number>> = {};
    private abortSignal?: AbortSignal;

    constructor ( config?: Partial<AltraConfig>, abortSignal?: AbortSignal )
    {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.abortSignal = abortSignal;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MAIN PIPELINE
    // ─────────────────────────────────────────────────────────────────────────

    async execute (
        query: string,
        onProgress: ProgressCallback
    ): Promise<AltraResult>
    {
        const startTime = Date.now();
        const resultId = `altra-${ Date.now() }-${ Math.random().toString( 36 ).substr( 2, 6 ) }`;

        try
        {
            // ── المرحلة 1: تصنيف ──
            this.checkAbort();
            const phaseStart1 = Date.now();
            onProgress( {
                phase: 'classify',
                message: 'تحليل نوع السؤال...',
                progress: 5,
            } );

            const category = this.classifyQuery( query );
            this.phaseDurations.classify = Date.now() - phaseStart1;

            onProgress( {
                phase: 'classify',
                message: `تم التصنيف: ${ this.getCategoryLabel( category ) }`,
                progress: 10,
                details: { category },
            } );

            // ── المرحلة 2: تحليل ──
            this.checkAbort();
            const phaseStart2 = Date.now();
            onProgress( {
                phase: 'decompose',
                message: 'تفكيك السؤال إلى استعلامات فرعية...',
                progress: 15,
            } );

            const subQueries = this.decomposeQuery( query, category );
            this.phaseDurations.decompose = Date.now() - phaseStart2;

            onProgress( {
                phase: 'decompose',
                message: `تم إنشاء ${ subQueries.length } استعلام فرعي`,
                progress: 20,
                details: { subQueries },
            } );

            // ── المرحلة 3: بحث متوازي ──
            this.checkAbort();
            const phaseStart3 = Date.now();
            onProgress( {
                phase: 'search',
                message: 'بدء البحث المتوازي...',
                progress: 25,
            } );

            const allSources = await this.parallelSearch(
                subQueries,
                category,
                ( current, total, engine ) =>
                {
                    const searchProgress = 25 + ( ( current / total ) * 30 );
                    onProgress( {
                        phase: 'search',
                        message: `بحث: ${ current }/${ total } استعلامات`,
                        progress: Math.round( searchProgress ),
                        details: {
                            currentQuery: subQueries[ current - 1 ],
                            sourcesFound: allSources?.length || 0,
                            searchEngine: engine,
                        },
                    } );
                }
            );
            this.phaseDurations.search = Date.now() - phaseStart3;

            // ── المرحلة 4: تجميع المصادر ──
            this.checkAbort();
            const phaseStart4 = Date.now();
            onProgress( {
                phase: 'collect',
                message: `تجميع وتصفية ${ allSources.length } مصدر...`,
                progress: 60,
                details: { sourcesFound: allSources.length },
            } );

            const { uniqueSources, citations } = this.collectAndDeduplicate( allSources );
            this.phaseDurations.collect = Date.now() - phaseStart4;

            onProgress( {
                phase: 'collect',
                message: `${ uniqueSources.length } مصدر فريد من ${ allSources.length }`,
                progress: 70,
                details: {
                    sourcesFound: allSources.length,
                    uniqueSources: uniqueSources.length,
                },
            } );

            // ── المرحلة 5: استنتاج ──
            this.checkAbort();
            const phaseStart5 = Date.now();
            onProgress( {
                phase: 'reason',
                message: 'تحليل عميق للمعلومات...',
                progress: 75,
            } );

            const reasoning = this.buildReasoning( query, category, uniqueSources, citations );
            this.phaseDurations.reason = Date.now() - phaseStart5;

            onProgress( {
                phase: 'reason',
                message: 'اكتمل التحليل',
                progress: 85,
                details: { reasoningStep: 'complete' },
            } );

            // ── المرحلة 6: تركيب ──
            this.checkAbort();
            const phaseStart6 = Date.now();
            onProgress( {
                phase: 'synthesize',
                message: 'بناء الإجابة النهائية...',
                progress: 90,
            } );

            const { synthesis, blocks } = this.synthesizeAnswer(
                query,
                category,
                uniqueSources,
                citations,
                reasoning
            );
            this.phaseDurations.synthesize = Date.now() - phaseStart6;

            // ── اكتمال ──
            const duration = Date.now() - startTime;

            onProgress( {
                phase: 'complete',
                message: `اكتمل في ${ ( duration / 1000 ).toFixed( 1 ) } ثانية`,
                progress: 100,
                details: {
                    sourcesFound: allSources.length,
                    uniqueSources: uniqueSources.length,
                },
            } );

            return {
                id: resultId,
                query,
                category,
                subQueries,
                sources: uniqueSources,
                citations,
                reasoning,
                synthesis,
                blocks,
                metadata: {
                    totalSources: allSources.length,
                    uniqueSources: uniqueSources.length,
                    searchQueries: subQueries.length,
                    duration,
                    timestamp: new Date(),
                    phaseDurations: this.phaseDurations as Record<AltraPhase, number>,
                },
            };

        } catch ( error )
        {
            if ( ( error as Error ).name === 'AbortError' )
            {
                throw error;
            }

            const errorMessage = error instanceof Error ? error.message : 'خطأ غير متوقع';
            onProgress( {
                phase: 'error',
                message: errorMessage,
                progress: 0,
            } );
            throw error;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 1: CLASSIFY
    // ─────────────────────────────────────────────────────────────────────────

    private classifyQuery ( query: string ): QueryCategory
    {
        const lower = query.toLowerCase();
        const len = query.length;

        // أنماط المحادثة العادية
        const conversationalPatterns = [
            /^(hi|hello|hey|مرحبا|اهلا|سلام)/i,
            /^(thanks|شكرا|مشكور)/i,
            /^(ok|okay|حسنا|طيب)/i,
        ];
        if ( conversationalPatterns.some( p => p.test( lower ) ) || len < 15 )
        {
            return 'conversational';
        }

        // أنماط تقنية
        const technicalPatterns = [
            /code|bug|error|function|api|database|server|framework/i,
            /كود|خطأ|برمج|دالة|قاعدة بيانات|سيرفر/,
            /\b(python|javascript|typescript|react|node|sql|css|html)\b/i,
        ];
        if ( technicalPatterns.some( p => p.test( query ) ) )
        {
            return 'technical';
        }

        // أنماط إبداعية
        const creativePatterns = [
            /write|create|compose|draft|imagine|design/i,
            /اكتب|أنشئ|صمم|ألف|تخيل/,
            /story|poem|essay|article|blog/i,
            /قصة|قصيدة|مقال/,
        ];
        if ( creativePatterns.some( p => p.test( query ) ) )
        {
            return 'creative';
        }

        // أنماط متعددة الخطوات
        const multiHopPatterns = [
            /compare|versus|vs|difference|between/i,
            /قارن|مقارنة|الفرق|بين/,
            /and.*also|then.*after|first.*second/i,
        ];
        if ( multiHopPatterns.some( p => p.test( query ) ) )
        {
            return 'multi_hop';
        }

        // أنماط تحليلية
        const analyticalPatterns = [
            /why|how|explain|analyze|impact|effect|cause|reason/i,
            /لماذا|كيف|اشرح|حلل|تأثير|سبب/,
            /trend|pattern|forecast|predict/i,
        ];
        if ( analyticalPatterns.some( p => p.test( query ) ) )
        {
            return 'analytical';
        }

        // افتراضي: سؤال حقيقي
        return 'factual';
    }

    private getCategoryLabel ( category: QueryCategory ): string
    {
        const labels: Record<QueryCategory, string> = {
            factual: 'سؤال حقيقي',
            analytical: 'تحليلي',
            creative: 'إبداعي',
            technical: 'تقني',
            conversational: 'محادثة',
            multi_hop: 'متعدد الخطوات',
        };
        return labels[ category ];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 2: DECOMPOSE
    // ─────────────────────────────────────────────────────────────────────────

    private decomposeQuery ( query: string, category: QueryCategory ): string[]
    {
        const queries: string[] = [ query ]; // الاستعلام الأصلي دائماً

        switch ( category )
        {
            case 'conversational':
            case 'creative':
                // لا يحتاج استعلامات إضافية
                break;

            case 'factual':
                // إضافة صيغ بديلة
                queries.push( `${ query } latest information` );
                if ( this.config.enableNews )
                {
                    queries.push( `${ query } news` );
                }
                break;

            case 'technical':
                queries.push( `${ query } documentation` );
                queries.push( `${ query } best practices` );
                queries.push( `${ query } examples` );
                break;

            case 'analytical':
                queries.push( `${ query } analysis` );
                queries.push( `${ query } research` );
                queries.push( `${ query } data statistics` );
                break;

            case 'multi_hop':
                // تفكيك المقارنات
                const parts = query.split( /\bvs\b|\bversus\b|\bمقابل\b|\bأو\b|\bor\b/i );
                if ( parts.length > 1 )
                {
                    parts.forEach( p =>
                    {
                        const trimmed = p.trim();
                        if ( trimmed.length > 3 )
                        {
                            queries.push( trimmed );
                        }
                    } );
                }
                queries.push( `${ query } comparison` );
                break;
        }

        // تحديد العدد الأقصى
        return queries.slice( 0, this.config.maxSubQueries );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 3: PARALLEL SEARCH
    // ─────────────────────────────────────────────────────────────────────────

    private async parallelSearch (
        queries: string[],
        category: QueryCategory,
        onQueryProgress: ( current: number, total: number, engine: string ) => void
    ): Promise<AltraSource[]>
    {
        // المحادثة العادية والإبداعية لا تحتاج بحث
        if ( category === 'conversational' || category === 'creative' )
        {
            return [];
        }

        const allSources: AltraSource[] = [];
        const searchPromises: Promise<void>[] = [];

        // تقسيم الاستعلامات إلى دفعات متوازية
        const batchSize = 3;
        const batches: string[][] = [];
        for ( let i = 0; i < queries.length; i += batchSize )
        {
            batches.push( queries.slice( i, i + batchSize ) );
        }

        let completedQueries = 0;
        const totalQueries = queries.length;

        for ( const batch of batches )
        {
            this.checkAbort();

            const batchPromises = batch.map( async ( query ) =>
            {
                try
                {
                    // بحث ذكي (Tavily + Serper)
                    const smartResult = await smartSearch( query, {
                        maxResults: this.config.maxSourcesPerQuery,
                        includeAnswer: true,
                    } );

                    const sources = this.convertToAltraSources( smartResult, 'smart' );
                    allSources.push( ...sources );

                    completedQueries++;
                    onQueryProgress( completedQueries, totalQueries, 'smart' );

                    // بحث أخبار إضافي للمواضيع الحقيقية
                    if ( this.config.enableNews && ( category === 'factual' || category === 'analytical' ) )
                    {
                        try
                        {
                            const newsResult = await searchNews( query, { maxResults: 4 } );
                            const newsSources = this.convertToAltraSources( newsResult, 'news' );
                            allSources.push( ...newsSources );
                        } catch
                        {
                            // تجاهل أخطاء الأخبار - ليست حرجة
                        }
                    }

                } catch ( error )
                {
                    console.warn( `[Altra] Search failed for "${ query }":`, error );

                    // إعادة محاولة مع بحث سريع
                    try
                    {
                        const fallbackResult = await quickSearch( query, {
                            maxResults: this.config.maxSourcesPerQuery,
                        } );
                        const sources = this.convertToAltraSources( fallbackResult, 'fallback' );
                        allSources.push( ...sources );
                    } catch
                    {
                        // تسجيل الخطأ والمتابعة
                        console.warn( `[Altra] Fallback search also failed for "${ query }"` );
                    }

                    completedQueries++;
                    onQueryProgress( completedQueries, totalQueries, 'fallback' );
                }
            } );

            await Promise.allSettled( batchPromises );
        }

        return allSources;
    }

    private convertToAltraSources ( response: WebSearchResponse, engine: string ): AltraSource[]
    {
        return response.results.map( ( r ) => ( {
            id: r.id,
            title: r.title,
            url: r.url,
            snippet: r.snippet || '',
            domain: r.domain,
            relevanceScore: r.relevanceScore || 0.5,
            source: engine,
            publishedDate: r.publishedDate,
        } ) );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 4: COLLECT & DEDUPLICATE
    // ─────────────────────────────────────────────────────────────────────────

    private collectAndDeduplicate ( sources: AltraSource[] ): {
        uniqueSources: AltraSource[];
        citations: AltraCitation[];
    }
    {
        // إزالة التكرارات بناءً على URL
        const seen = new Map<string, AltraSource>();

        for ( const source of sources )
        {
            const normalizedUrl = this.normalizeUrl( source.url );

            if ( !seen.has( normalizedUrl ) )
            {
                seen.set( normalizedUrl, source );
            } else
            {
                // الاحتفاظ بالمصدر ذو الدرجة الأعلى
                const existing = seen.get( normalizedUrl )!;
                if ( source.relevanceScore > existing.relevanceScore )
                {
                    seen.set( normalizedUrl, source );
                }
            }
        }

        // ترتيب حسب الأهمية
        const uniqueSources = Array.from( seen.values() )
            .sort( ( a, b ) => b.relevanceScore - a.relevanceScore );

        // بناء الاستشهادات
        const citations: AltraCitation[] = uniqueSources.map( ( source, index ) => ( {
            id: index + 1,
            title: source.title,
            url: source.url,
            domain: source.domain,
            snippet: source.snippet,
            relevanceScore: source.relevanceScore,
        } ) );

        return { uniqueSources, citations };
    }

    private normalizeUrl ( url: string ): string
    {
        try
        {
            const u = new URL( url );
            // إزالة المعلمات التتبعية
            [ 'utm_source', 'utm_medium', 'utm_campaign', 'ref', 'source' ].forEach( param =>
            {
                u.searchParams.delete( param );
            } );
            return u.origin + u.pathname + u.search;
        } catch
        {
            return url;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 5: REASONING
    // ─────────────────────────────────────────────────────────────────────────

    private buildReasoning (
        query: string,
        category: QueryCategory,
        sources: AltraSource[],
        citations: AltraCitation[]
    ): string
    {
        const parts: string[] = [];

        // ملخص التحليل
        parts.push( `## تحليل: "${ query }"\n` );
        parts.push( `**التصنيف:** ${ this.getCategoryLabel( category ) }` );
        parts.push( `**المصادر المجمعة:** ${ sources.length } مصدر فريد\n` );

        // تحليل المصادر
        if ( sources.length > 0 )
        {
            // تجميع حسب النطاق
            const domainCounts = new Map<string, number>();
            sources.forEach( s =>
            {
                domainCounts.set( s.domain, ( domainCounts.get( s.domain ) || 0 ) + 1 );
            } );

            parts.push( `### المصادر الرئيسية` );
            const topDomains = Array.from( domainCounts.entries() )
                .sort( ( a, b ) => b[ 1 ] - a[ 1 ] )
                .slice( 0, 5 );

            topDomains.forEach( ( [ domain, count ] ) =>
            {
                parts.push( `- **${ domain }**: ${ count } نتيجة` );
            } );

            parts.push( '' );

            // استخراج المعلومات الرئيسية
            parts.push( `### المعلومات المستخلصة` );
            const topSources = sources.slice( 0, 8 );
            topSources.forEach( ( source, i ) =>
            {
                parts.push( `${ i + 1 }. **${ source.title }** [${ source.domain }]` );
                if ( source.snippet )
                {
                    parts.push( `   > ${ source.snippet.slice( 0, 200 ) }` );
                }
            } );
        } else
        {
            parts.push( `*لم يتم العثور على مصادر - الإجابة ستعتمد على المعرفة المدمجة*` );
        }

        return parts.join( '\n' );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 6: SYNTHESIZE
    // ─────────────────────────────────────────────────────────────────────────

    private synthesizeAnswer (
        query: string,
        category: QueryCategory,
        sources: AltraSource[],
        citations: AltraCitation[],
        reasoning: string
    ): { synthesis: string; blocks: AltraBlock[] }
    {
        const blocks: AltraBlock[] = [];
        let blockCounter = 0;

        const makeBlockId = () => `block-${ ++blockCounter }`;

        if ( sources.length === 0 )
        {
            // بدون مصادر
            blocks.push( {
                id: makeBlockId(),
                type: 'paragraph',
                content: `بناءً على المعرفة المتاحة حول: "${ query }"`,
                status: 'complete',
            } );
        } else
        {
            // مع مصادر
            blocks.push( {
                id: makeBlockId(),
                type: 'heading',
                content: `نتائج البحث والتحليل`,
                status: 'complete',
            } );

            // ملخص
            blocks.push( {
                id: makeBlockId(),
                type: 'paragraph',
                content: `تم تحليل **${ sources.length }** مصدر من الويب للإجابة على سؤالك. إليك النتائج:`,
                status: 'complete',
            } );

            // أبرز النتائج
            const topResults = sources.slice( 0, 6 );
            if ( topResults.length > 0 )
            {
                blocks.push( {
                    id: makeBlockId(),
                    type: 'heading',
                    content: `أبرز النتائج`,
                    status: 'complete',
                } );

                topResults.forEach( ( source, i ) =>
                {
                    const citationId = citations.find( c => c.url === source.url )?.id;
                    blocks.push( {
                        id: makeBlockId(),
                        type: 'paragraph',
                        content: `**${ source.title }**\n${ source.snippet }`,
                        citations: citationId ? [ citationId ] : [],
                        status: 'complete',
                    } );
                } );
            }

            // مجموعة الاستشهادات
            blocks.push( {
                id: makeBlockId(),
                type: 'citation_group',
                content: citations.slice( 0, 15 ).map( c =>
                    `[${ c.id }] ${ c.title } - ${ c.domain }`
                ).join( '\n' ),
                citations: citations.slice( 0, 15 ).map( c => c.id ),
                status: 'complete',
            } );
        }

        // بناء النص المركّب
        const synthesis = blocks
            .filter( b => b.type !== 'citation_group' )
            .map( b =>
            {
                if ( b.type === 'heading' ) return `## ${ b.content }`;
                return b.content;
            } )
            .join( '\n\n' );

        return { synthesis, blocks };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    private checkAbort (): void
    {
        if ( this.abortSignal?.aborted )
        {
            const error = new Error( 'تم إلغاء العملية' );
            error.name = 'AbortError';
            throw error;
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

export function createAltraOrchestrator (
    config?: Partial<AltraConfig>,
    abortSignal?: AbortSignal
): AltraOrchestrator
{
    return new AltraOrchestrator( config, abortSignal );
}
