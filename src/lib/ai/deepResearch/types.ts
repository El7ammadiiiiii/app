/**
 * Deep Research Types
 * الأنواع المشتركة لنظام البحث العميق
 * ✅ آمن للاستخدام في Client و Server
 */

// ====== أنواع Firestore ======
// نستخدم Date بدلاً من Timestamp للتوافق مع Client

export interface StoredResearch
{
    id: string;
    userId: string;
    conversationId?: string;
    query: string;
    result: DeepResearchResult;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    progress?: ResearchProgress;
    createdAt: Date | { toDate: () => Date };
    updatedAt: Date | { toDate: () => Date };
    completedAt?: Date | { toDate: () => Date };
}

export interface ResearchHistoryItem
{
    id: string;
    query: string;
    sourcesCount: number;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    createdAt: Date;
    duration?: number;
}

// ====== أنواع Orchestrator ======

export interface DeepResearchConfig
{
    maxQueries: number;
    minSources: number;
    targetSources: number;
    extractContent: boolean;
    firecrawlEnabled: boolean;
}

export interface ResearchQuery
{
    id: string;
    original: string;
    transformed: string[];
    focus: string;
}

export interface ContentExtract
{
    url: string;
    title: string;
    content: string;
    wordCount: number;
    extractedAt: Date;
}

export interface DeepResearchResult
{
    id: string;
    originalQuery: string;
    queries: ResearchQuery[];
    allSources: UnifiedSearchResult[];
    uniqueSources: UnifiedSearchResult[];
    extractedContent: ContentExtract[];
    synthesis: string;
    citations: Citation[];
    metadata: {
        totalSources: number;
        uniqueSources: number;
        apiSources: number;
        scrapeSources: number;
        extractedPages: number;
        duration: number;
        successRate: number;
        timestamp: Date;
    };
}

export interface Citation
{
    id: number;
    title: string;
    url: string;
    domain: string;
    snippet?: string;
}

export interface ResearchProgress
{
    phase: 'query_generation' | 'searching' | 'extracting' | 'synthesizing' | 'complete' | 'error';
    message: string;
    progress: number;
    details?: {
        currentQuery?: string;
        sourcesFound?: number;
        wave?: 'api' | 'scrape';
        engine?: string;
    };
}

// ====== أنواع Search Engine ======

export interface UnifiedSearchResult
{
    id: string;
    title: string;
    url: string;
    snippet?: string;
    source: string;
    relevanceScore?: number;
    domain?: string;
    publishedDate?: string;
    imageUrl?: string;
}
