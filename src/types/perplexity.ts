/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PERPLEXITY TYPES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Type definitions for Perplexity-style search interface
 * 
 * @version 1.0.0
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * مراحل البحث
 */
export enum SearchPhase {
  IDLE = 'idle',
  SEARCHING = 'searching',
  READING = 'reading',
  ANALYZING = 'analyzing',
  GENERATING = 'generating',
  COMPLETE = 'complete',
  ERROR = 'error',
}

/**
 * أنواع المصادر
 */
export enum SourceType {
  WEB = 'web',
  NEWS = 'news',
  ACADEMIC = 'academic',
  VIDEO = 'video',
  IMAGE = 'image',
  SOCIAL = 'social',
  DOCUMENTATION = 'documentation',
  FORUM = 'forum',
  BLOG = 'blog',
  WIKI = 'wiki',
}

/**
 * أنواع الوكلاء
 */
export enum AgentType {
  GENERAL = 'general',
  TECHNICAL_ANALYSIS = 'technical_analysis',
  ON_CHAIN = 'on_chain',
  FUNDAMENTAL_ANALYSIS = 'fundamental_analysis',
  CCCWAYS_ACADEMY = 'cccways_academy',
}

/**
 * أنواع الأدوات
 */
export enum ToolType {
  RESEARCH = 'research',
  SEARCH = 'search',
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * مصدر واحد
 */
export interface PerplexitySource {
  id: string;
  index: number;  // [1], [2], etc.
  type: SourceType;
  title: string;
  url: string;
  domain: string;
  favicon: string;
  snippet?: string;
  publishedDate?: string;
  author?: string;
  relevance: number;  // 0-100
  imageUrl?: string;
}

/**
 * Citation داخل النص
 */
export interface Citation {
  id: string;
  index: number;  // رقم المصدر [1], [2]
  sourceId: string;
  startOffset: number;
  endOffset: number;
  text: string;  // النص المرجعي
}

/**
 * سؤال مقترح
 */
export interface RelatedQuestion {
  id: string;
  question: string;
  category?: string;
}

/**
 * حالة البحث لرسالة واحدة
 */
export interface PerplexitySearchState {
  id: string;
  messageId: string;
  query: string;
  phase: SearchPhase;
  progress: number;  // 0-100
  sources: PerplexitySource[];
  content: string;
  citations: Citation[];
  relatedQuestions: RelatedQuestion[];
  agentType?: AgentType;
  toolType?: ToolType;
  startTime: number;
  endTime?: number;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * إعدادات عرض البحث
 */
export interface PerplexityDisplayConfig {
  maxVisibleSources: number;  // عدد المصادر المرئية قبل "+N more"
  showRelatedQuestions: boolean;
  enableSourcePreview: boolean;
  animationDuration: number;
}

/**
 * Response من API
 */
export interface PerplexityAPIResponse {
  success: boolean;
  searchId: string;
  sources: PerplexitySource[];
  answer: string;
  citations: Citation[];
  relatedQuestions: RelatedQuestion[];
  metadata?: {
    searchTime: number;
    totalResults: number;
    model?: string;
  };
}

/**
 * SSE Event types
 */
export type PerplexitySSEEvent = 
  | { type: 'phase'; phase: SearchPhase; progress: number }
  | { type: 'sources'; sources: PerplexitySource[] }
  | { type: 'content'; chunk: string; citations?: Citation[] }
  | { type: 'related'; questions: RelatedQuestion[] }
  | { type: 'complete'; metadata?: Record<string, unknown> }
  | { type: 'error'; error: { code: string; message: string } };

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_DISPLAY_CONFIG: PerplexityDisplayConfig = {
  maxVisibleSources: 6,
  showRelatedQuestions: true,
  enableSourcePreview: true,
  animationDuration: 300,
};

/**
 * ألوان أنواع المصادر
 */
export const SOURCE_TYPE_COLORS: Record<SourceType, { bg: string; text: string; border: string }> = {
  [SourceType.WEB]: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  [SourceType.NEWS]: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  [SourceType.ACADEMIC]: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  [SourceType.VIDEO]: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20' },
  [SourceType.IMAGE]: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  [SourceType.SOCIAL]: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  [SourceType.DOCUMENTATION]: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
  [SourceType.FORUM]: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  [SourceType.BLOG]: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
  [SourceType.WIKI]: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
};

/**
 * أيقونات أنواع المصادر
 */
export const SOURCE_TYPE_ICONS: Record<SourceType, string> = {
  [SourceType.WEB]: '🌐',
  [SourceType.NEWS]: '📰',
  [SourceType.ACADEMIC]: '📚',
  [SourceType.VIDEO]: '🎬',
  [SourceType.IMAGE]: '🖼️',
  [SourceType.SOCIAL]: '💬',
  [SourceType.DOCUMENTATION]: '📄',
  [SourceType.FORUM]: '💭',
  [SourceType.BLOG]: '✍️',
  [SourceType.WIKI]: '📖',
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * استخراج domain من URL
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

/**
 * توليد favicon URL من domain
 */
export function getFaviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

/**
 * تحديد نوع المصدر من URL
 */
export function detectSourceType(url: string, title?: string): SourceType {
  const domain = extractDomain(url).toLowerCase();
  const titleLower = title?.toLowerCase() || '';
  
  // Video platforms
  if (['youtube.com', 'vimeo.com', 'dailymotion.com', 'twitch.tv'].some(d => domain.includes(d))) {
    return SourceType.VIDEO;
  }
  
  // News sites
  if (['reuters.com', 'bloomberg.com', 'cnbc.com', 'bbc.com', 'cnn.com', 'aljazeera.com', 'coindesk.com', 'cointelegraph.com'].some(d => domain.includes(d))) {
    return SourceType.NEWS;
  }
  
  // Social media
  if (['twitter.com', 'x.com', 'facebook.com', 'linkedin.com', 'instagram.com'].some(d => domain.includes(d))) {
    return SourceType.SOCIAL;
  }
  
  // Documentation
  if (['docs.', 'developer.', 'documentation'].some(d => domain.includes(d)) || titleLower.includes('documentation')) {
    return SourceType.DOCUMENTATION;
  }
  
  // Forums
  if (['reddit.com', 'stackoverflow.com', 'stackexchange.com', 'quora.com', 'discord.com'].some(d => domain.includes(d))) {
    return SourceType.FORUM;
  }
  
  // Academic
  if (['arxiv.org', 'scholar.google', 'researchgate.net', 'academia.edu', '.edu'].some(d => domain.includes(d))) {
    return SourceType.ACADEMIC;
  }
  
  // Wiki
  if (domain.includes('wikipedia.org') || domain.includes('wiki')) {
    return SourceType.WIKI;
  }
  
  // Blog platforms
  if (['medium.com', 'substack.com', 'ghost.io', 'wordpress.com', 'blogger.com'].some(d => domain.includes(d))) {
    return SourceType.BLOG;
  }
  
  return SourceType.WEB;
}

/**
 * توليد ID فريد
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Parse citations من النص [1], [2], etc.
 */
export function parseCitationsFromText(text: string, sources: PerplexitySource[]): { 
  cleanText: string; 
  citations: Citation[] 
} {
  const citations: Citation[] = [];
  const citationRegex = /\[(\d+)\]/g;
  let match;
  
  while ((match = citationRegex.exec(text)) !== null) {
    const index = parseInt(match[1], 10);
    const source = sources.find(s => s.index === index);
    
    if (source) {
      citations.push({
        id: generateId(),
        index,
        sourceId: source.id,
        startOffset: match.index,
        endOffset: match.index + match[0].length,
        text: match[0],
      });
    }
  }
  
  return { cleanText: text, citations };
}

/**
 * Format duration بالثواني
 */
export function formatSearchDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}
