/**
 * Deep Research Engine Types
 * أنواع محركات البحث المتعددة
 */

// =============================================================================
// Search Engine Types
// =============================================================================

/** نوع محرك البحث */
export type EngineType = 'api' | 'scrape';

/** اسم المحرك */
export type EngineName =
    | 'bing'
    | 'serper'
    | 'duckduckgo'
    | 'brave'
    | 'mojeek'
    | 'yep'
    | 'youcom'
    | 'yandex'
    | 'naver'
    | 'startpage';

/** أولوية المحرك */
export type EngineTier = 'api' | 'scrape-easy' | 'scrape-medium' | 'scrape-hard';

// =============================================================================
// Search Result Types
// =============================================================================

/** نتيجة بحث موحدة من أي محرك */
export interface UnifiedSearchResult
{
    id: string;
    title: string;
    url: string;
    snippet: string;
    content?: string;
    source: EngineName;
    relevanceScore: number;
    publishedDate?: string;
    domain: string;
    language?: string;
    metadata?: Record<string, unknown>;
}

/** نتائج محرك واحد */
export interface EngineSearchResponse
{
    engine: EngineName;
    success: boolean;
    results: UnifiedSearchResult[];
    totalResults?: number;
    searchTime: number;
    error?: string;
    rateLimited?: boolean;
}

// =============================================================================
// Engine Configuration
// =============================================================================

/** إعدادات المحرك */
export interface EngineConfig
{
    name: EngineName;
    type: EngineType;
    tier: EngineTier;
    enabled: boolean;
    targetResults: number;
    rateLimit: {
        requestsPerMinute: number;
        delayBetweenRequests: number;
    };
    timeout: number;
    retries: number;
    priority: number;
}

/** إعدادات البحث */
export interface SearchOptions
{
    query: string;
    maxResults?: number;
    language?: string;
    region?: string;
    freshness?: 'day' | 'week' | 'month' | 'year';
    safeSearch?: boolean;
}

// =============================================================================
// Engine Configs
// =============================================================================

export const ENGINE_CONFIGS: Record<EngineName, EngineConfig> = {
    bing: {
        name: 'bing',
        type: 'api',
        tier: 'api',
        enabled: true,
        targetResults: 35,
        rateLimit: { requestsPerMinute: 100, delayBetweenRequests: 100 },
        timeout: 10000,
        retries: 3,
        priority: 1,
    },
    serper: {
        name: 'serper',
        type: 'api',
        tier: 'api',
        enabled: true,
        targetResults: 45,
        rateLimit: { requestsPerMinute: 100, delayBetweenRequests: 100 },
        timeout: 10000,
        retries: 3,
        priority: 1,
    },
    duckduckgo: {
        name: 'duckduckgo',
        type: 'scrape',
        tier: 'scrape-easy',
        enabled: true,
        targetResults: 8,
        rateLimit: { requestsPerMinute: 20, delayBetweenRequests: 2000 },
        timeout: 15000,
        retries: 2,
        priority: 2,
    },
    brave: {
        name: 'brave',
        type: 'scrape',
        tier: 'scrape-medium',
        enabled: true,
        targetResults: 8,
        rateLimit: { requestsPerMinute: 15, delayBetweenRequests: 3000 },
        timeout: 15000,
        retries: 2,
        priority: 2,
    },
    mojeek: {
        name: 'mojeek',
        type: 'scrape',
        tier: 'scrape-easy',
        enabled: true,
        targetResults: 6,
        rateLimit: { requestsPerMinute: 20, delayBetweenRequests: 2000 },
        timeout: 15000,
        retries: 2,
        priority: 2,
    },
    yep: {
        name: 'yep',
        type: 'scrape',
        tier: 'scrape-easy',
        enabled: true,
        targetResults: 6,
        rateLimit: { requestsPerMinute: 20, delayBetweenRequests: 2000 },
        timeout: 15000,
        retries: 2,
        priority: 2,
    },
    youcom: {
        name: 'youcom',
        type: 'scrape',
        tier: 'scrape-medium',
        enabled: true,
        targetResults: 6,
        rateLimit: { requestsPerMinute: 15, delayBetweenRequests: 3000 },
        timeout: 15000,
        retries: 2,
        priority: 2,
    },
    yandex: {
        name: 'yandex',
        type: 'scrape',
        tier: 'scrape-medium',
        enabled: true,
        targetResults: 6,
        rateLimit: { requestsPerMinute: 15, delayBetweenRequests: 2500 },
        timeout: 15000,
        retries: 2,
        priority: 2,
    },
    naver: {
        name: 'naver',
        type: 'scrape',
        tier: 'scrape-medium',
        enabled: true,
        targetResults: 5,
        rateLimit: { requestsPerMinute: 15, delayBetweenRequests: 2000 },
        timeout: 15000,
        retries: 2,
        priority: 3,
    },
    startpage: {
        name: 'startpage',
        type: 'scrape',
        tier: 'scrape-hard',
        enabled: true,
        targetResults: 5,
        rateLimit: { requestsPerMinute: 10, delayBetweenRequests: 4000 },
        timeout: 20000,
        retries: 2,
        priority: 3,
    },
};

// =============================================================================
// Wave Configuration
// =============================================================================

/** موجة بحث */
export interface SearchWave
{
    id: number;
    name: string;
    engines: EngineName[];
    queriesPerEngine: number;
    isRequired: boolean;
}

/** إعدادات الموجات */
export const WAVE_CONFIGS: SearchWave[] = [
    {
        id: 1,
        name: 'API Wave',
        engines: [ 'bing', 'serper' ],
        queriesPerEngine: 5,
        isRequired: true,
    },
    {
        id: 2,
        name: 'Crawler Wave',
        engines: [ 'duckduckgo', 'brave', 'mojeek', 'yep', 'youcom', 'yandex', 'naver', 'startpage' ],
        queriesPerEngine: 2,
        isRequired: false,
    },
];

// =============================================================================
// SSE Event Types
// =============================================================================

/** أنواع أحداث SSE */
export type DeepResearchEventType =
    | 'session_start'
    | 'wave_start'
    | 'wave_progress'
    | 'wave_complete'
    | 'engine_start'
    | 'engine_result'
    | 'engine_error'
    | 'source_found'
    | 'scraping_start'
    | 'scraping_complete'
    | 'synthesis_start'
    | 'synthesis_progress'
    | 'report_section'
    | 'complete'
    | 'error';

/** حدث SSE */
export interface DeepResearchSSEEvent
{
    type: DeepResearchEventType;
    timestamp: number;
    data: unknown;
}

/** بيانات بدء الجلسة */
export interface SessionStartData
{
    sessionId: string;
    query: string;
    subQuestions: string[];
    targetSources: number;
    estimatedTime: number;
}

/** بيانات بدء الموجة */
export interface WaveStartData
{
    waveId: number;
    waveName: string;
    engines: EngineName[];
    isRequired: boolean;
}

/** بيانات تقدم الموجة */
export interface WaveProgressData
{
    waveId: number;
    completedEngines: number;
    totalEngines: number;
    sourcesFound: number;
}

/** بيانات اكتمال الموجة */
export interface WaveCompleteData
{
    waveId: number;
    sourcesFound: number;
    duration: number;
    engineResults: Record<EngineName, { success: boolean; count: number }>;
}

/** بيانات نتيجة محرك */
export interface EngineResultData
{
    engine: EngineName;
    success: boolean;
    count: number;
    duration: number;
    error?: string;
}

/** بيانات الاكتمال */
export interface CompleteData
{
    sessionId: string;
    totalSources: number;
    totalDuration: number;
    enginesUsed: EngineName[];
    report: {
        summary: string;
        sections: { title: string; content: string }[];
        citations: { id: number; url: string; title: string; domain: string }[];
    };
}

// =============================================================================
// User Agent Pool
// =============================================================================

export const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
];

export function getRandomUserAgent (): string
{
    return USER_AGENTS[ Math.floor( Math.random() * USER_AGENTS.length ) ];
}

export function generateResultId ( engine: EngineName ): string
{
    return `${ engine }-${ Date.now() }-${ Math.random().toString( 36 ).substring( 2, 9 ) }`;
}

export function extractDomain ( url: string ): string
{
    try
    {
        return new URL( url ).hostname.replace( 'www.', '' );
    } catch
    {
        return url;
    }
}
