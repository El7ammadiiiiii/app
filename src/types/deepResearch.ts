/**
 * 🔍 Deep Research Types
 * أنواع نظام البحث التفصيلي مع AI Agents
 */

// =============================================================================
// 🎯 Research Query Types
// =============================================================================

/** استعلام البحث الأصلي */
export interface ResearchQuery {
  id: string;
  originalQuery: string;
  transformedQueries: string[];
  subTasks: SubTask[];
  timestamp: Date;
  userId: string;
}

/** مهمة فرعية مفككة */
export interface SubTask {
  id: string;
  description: string;
  searchQueries: string[];
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  results?: SearchResult[];
}

// =============================================================================
// 🧠 Thinking Phases (ReAct Loop)
// =============================================================================

/** مراحل التفكير */
export type ThinkingPhase = 'thought' | 'action' | 'observation' | 'reflection';

/** خطوة بحث واحدة */
export interface ResearchStep {
  id: string;
  phase: ThinkingPhase;
  content: string;
  timestamp: Date;
  duration?: number;
  metadata?: {
    toolUsed?: string;
    queryExecuted?: string;
    resultsCount?: number;
    confidence?: number;
  };
}

/** حالة التفكير الكاملة */
export interface ThinkingState {
  currentPhase: ThinkingPhase;
  steps: ResearchStep[];
  isComplete: boolean;
  totalDuration: number;
}

// =============================================================================
// 🔎 Search Results
// =============================================================================

/** نتيجة بحث من محرك واحد */
export interface SearchResult {
  id: string;
  title: string;
  url: string;
  snippet: string;
  content?: string;
  source: 'tavily' | 'serper' | 'firecrawl';
  relevanceScore?: number;
  publishedDate?: string;
  domain: string;
}

/** مرجع/اقتباس */
export interface Citation {
  id: number;
  url: string;
  title: string;
  domain: string;
  snippet: string;
  usedInSections: string[];
}

// =============================================================================
// 📊 Research Result
// =============================================================================

/** حالة البحث */
export type ResearchStatus = 
  | 'idle' 
  | 'transforming-query' 
  | 'searching' 
  | 'crawling' 
  | 'synthesizing' 
  | 'completed' 
  | 'error'
  | 'cancelled';

/** النتيجة النهائية للبحث */
export interface ResearchResult {
  id: string;
  query: ResearchQuery;
  
  /** الملخص التنفيذي */
  executiveSummary: string;
  
  /** التفاصيل العميقة */
  detailedSections: DetailedSection[];
  
  /** المصادر المستخدمة */
  citations: Citation[];
  
  /** خطوات التفكير */
  thinkingSteps: ResearchStep[];
  
  /** إحصائيات */
  stats: {
    totalSources: number;
    searchEnginesUsed: string[];
    pagesAnalyzed: number;
    totalTime: number;
  };
  
  /** التوقيت */
  createdAt: Date;
  completedAt?: Date;
}

/** قسم تفصيلي */
export interface DetailedSection {
  id: string;
  title: string;
  content: string;
  citations: number[]; // IDs of citations
}

// =============================================================================
// 💰 User Quota System
// =============================================================================

/** نظام الحصص */
export interface UserQuota {
  userId: string;
  used: number;
  limit: number;
  resetDate: Date;
  isPremium: boolean;
  
  /** سجل الاستخدام */
  usageHistory: QuotaUsage[];
}

/** سجل استخدام واحد */
export interface QuotaUsage {
  id: string;
  queryId: string;
  timestamp: Date;
  queryPreview: string;
}

/** حدود الحصص */
export const QUOTA_LIMITS = {
  FREE: {
    limit: 3,
    period: 'month' as const,
  },
  PREMIUM: {
    limit: 3,
    period: 'day' as const,
  },
} as const;

// =============================================================================
// 🔧 Service Types
// =============================================================================

/** إعدادات Tavily */
export interface TavilySearchParams {
  query: string;
  searchDepth?: 'basic' | 'advanced';
  includeAnswer?: boolean;
  includeRawContent?: boolean;
  maxResults?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
}

/** إعدادات Serper */
export interface SerperSearchParams {
  q: string;
  gl?: string; // country
  hl?: string; // language
  num?: number;
  type?: 'search' | 'news' | 'images';
}

/** إعدادات FireCrawl */
export interface FirecrawlParams {
  url: string;
  formats?: ('markdown' | 'html' | 'text')[];
  onlyMainContent?: boolean;
  waitFor?: number;
}

/** نتيجة FireCrawl */
export interface FirecrawlResult {
  success: boolean;
  data?: {
    markdown?: string;
    html?: string;
    metadata?: {
      title?: string;
      description?: string;
      language?: string;
      sourceURL?: string;
    };
  };
  error?: string;
}

// =============================================================================
// 📨 Message Integration
// =============================================================================

/** بيانات البحث للرسالة */
export interface ResearchMessageData {
  researchId: string;
  query: string;
  executiveSummary: string;
  sectionsCount: number;
  citationsCount: number;
  result: ResearchResult;
}

/** رسالة محادثة موسعة */
export interface ResearchEnabledMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
  isResearch?: boolean;
  researchData?: ResearchMessageData;
}
