/**
 * 🔍 Deep Research Services V2
 * تصدير جميع خدمات البحث العميق
 * ⚠️ ملاحظة: خدمات Firestore و Admin SDK متاحة فقط في API routes (server-side)
 */

// ====== الخدمات القديمة (للتوافقية) ======
export { default as tavilyService, searchTavily, searchWithAnswer } from './tavilyService';
export { default as serperService, searchSerper, searchNews, getQuickAnswer } from './serperService';
export { default as firecrawlService, scrapeUrl, scrapeMultipleUrls, enrichSearchResults, extractMainText } from './firecrawlService';
export { default as quotaService, getUserQuota, canSearch, consumeQuota, getRemainingSearches, upgradeToPremium, getTimeUntilReset } from './quotaService';
export { default as researchOrchestrator, executeResearch } from './researchOrchestrator';

// ====== الأنواع المشتركة (آمنة للـ Client) ======
export type {
    DeepResearchConfig,
    DeepResearchResult,
    ResearchProgress,
    Citation,
    ResearchQuery,
    ContentExtract,
    StoredResearch,
    ResearchHistoryItem,
    UnifiedSearchResult,
} from './types';

// ⚠️ ملاحظة: المحركات و SearchOrchestrator و firestoreService
// يجب استيرادها مباشرة في API routes فقط:
// import { getSearchOrchestrator } from '@/lib/ai/deepResearch/SearchOrchestrator';
// import { createResearch } from '@/lib/ai/deepResearch/firestoreService';

