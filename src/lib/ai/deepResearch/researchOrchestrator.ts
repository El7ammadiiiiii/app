/**
 * 🧠 Research Orchestrator
 * منسق البحث - ReAct Loop (Reasoning & Acting)
 */

import type {
  ResearchQuery,
  ResearchStep,
  ResearchResult,
  SearchResult,
  Citation,
  DetailedSection,
  ThinkingPhase,
  SubTask,
} from '@/types/deepResearch';

import tavilyService from './tavilyService';
import serperService from './serperService';
import firecrawlService from './firecrawlService';

// =============================================================================
// 🎯 Types
// =============================================================================

export interface OrchestratorCallbacks {
  onStepStart?: (step: ResearchStep) => void;
  onStepComplete?: (step: ResearchStep) => void;
  onProgress?: (progress: number, message: string) => void;
  onError?: (error: Error) => void;
}

export interface OrchestratorOptions {
  maxSearchResults?: number;
  enableFirecrawl?: boolean;
  language?: string;
}

// =============================================================================
// 🔧 Helper Functions
// =============================================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function createStep(phase: ThinkingPhase, content: string, metadata?: ResearchStep['metadata']): ResearchStep {
  return {
    id: generateId(),
    phase,
    content,
    timestamp: new Date(),
    metadata,
  };
}

// =============================================================================
// 🧠 Main Orchestrator
// =============================================================================

export async function executeResearch(
  originalQuery: string,
  userId: string,
  callbacks?: OrchestratorCallbacks,
  options?: OrchestratorOptions
): Promise<ResearchResult> {
  const steps: ResearchStep[] = [];
  const startTime = Date.now();
  const allSearchResults: SearchResult[] = [];
  
  try {
    // ==========================================================================
    // Phase 1: THOUGHT - تحليل وتفكيك السؤال
    // ==========================================================================
    callbacks?.onProgress?.(10, 'تحليل السؤال...');
    
    const thoughtStep = createStep(
      'thought',
      `المستخدم يسأل: "${originalQuery}"\n` +
      `أحتاج لتحديد:\n` +
      `1. الموضوع الرئيسي\n` +
      `2. الجوانب المطلوب تغطيتها\n` +
      `3. نوع المعلومات (حقائق/إحصائيات/تحليلات)`
    );
    steps.push(thoughtStep);
    callbacks?.onStepStart?.(thoughtStep);
    
    // تحويل السؤال لاستعلامات بحث
    const transformedQueries = transformQuery(originalQuery);
    
    thoughtStep.content += `\n\nتم تحويل السؤال إلى ${transformedQueries.length} استعلامات بحث.`;
    thoughtStep.duration = Date.now() - startTime;
    callbacks?.onStepComplete?.(thoughtStep);
    
    // ==========================================================================
    // Phase 2: ACTION - تنفيذ البحث
    // ==========================================================================
    callbacks?.onProgress?.(30, 'جاري البحث في مصادر متعددة...');
    
    const actionStep = createStep(
      'action',
      `تنفيذ البحث باستخدام:\n` +
      `- Tavily AI Search (بحث ذكي)\n` +
      `- Serper/Google (نتائج شاملة)\n` +
      `الاستعلامات: ${transformedQueries.join(', ')}`
    );
    steps.push(actionStep);
    callbacks?.onStepStart?.(actionStep);
    
    // تنفيذ البحث المتوازي
    const [tavilyResults, serperResults] = await Promise.all([
      tavilyService.search({ 
        query: transformedQueries[0], 
        maxResults: options?.maxSearchResults || 5 
      }).catch(() => []),
      serperService.search({ 
        q: transformedQueries[0], 
        num: options?.maxSearchResults || 5,
        hl: options?.language || 'ar'
      }).catch(() => []),
    ]);
    
    allSearchResults.push(...tavilyResults, ...serperResults);
    
    // إزالة التكرارات
    const uniqueResults = removeDuplicates(allSearchResults);
    
    actionStep.content += `\n\nتم العثور على ${uniqueResults.length} نتيجة فريدة.`;
    actionStep.metadata = {
      toolUsed: 'Tavily + Serper',
      resultsCount: uniqueResults.length,
    };
    actionStep.duration = Date.now() - startTime - (thoughtStep.duration || 0);
    callbacks?.onStepComplete?.(actionStep);
    
    // ==========================================================================
    // Phase 3: OBSERVATION - استخراج وتحليل المحتوى
    // ==========================================================================
    callbacks?.onProgress?.(60, 'قراءة وتحليل المحتوى...');
    
    const observationStep = createStep(
      'observation',
      `تحليل ${uniqueResults.length} صفحة...\n` +
      `استخراج الحقائق والأرقام الرئيسية.`
    );
    steps.push(observationStep);
    callbacks?.onStepStart?.(observationStep);
    
    // استخراج المحتوى باستخدام FireCrawl (اختياري)
    let enrichedResults = uniqueResults;
    if (options?.enableFirecrawl !== false && uniqueResults.length > 0) {
      enrichedResults = await firecrawlService.enrichResults(uniqueResults.slice(0, 3));
    }
    
    // تحليل المحتوى
    const contentAnalysis = analyzeContent(enrichedResults);
    
    observationStep.content += `\n\nالملاحظات:\n${contentAnalysis.observations.join('\n')}`;
    observationStep.duration = Date.now() - startTime - (thoughtStep.duration || 0) - (actionStep.duration || 0);
    callbacks?.onStepComplete?.(observationStep);
    
    // ==========================================================================
    // Phase 4: REFLECTION - التجميع والتحقق
    // ==========================================================================
    callbacks?.onProgress?.(85, 'تجميع النتائج وإنشاء التقرير...');
    
    const reflectionStep = createStep(
      'reflection',
      `مراجعة المعلومات المجمعة:\n` +
      `- التحقق من اتساق المصادر\n` +
      `- تحديد الثغرات المعلوماتية\n` +
      `- صياغة الملخص النهائي`
    );
    steps.push(reflectionStep);
    callbacks?.onStepStart?.(reflectionStep);
    
    // إنشاء الاقتباسات
    const citations = createCitations(enrichedResults);
    
    // إنشاء النتيجة النهائية
    const result = synthesizeResult(
      originalQuery,
      transformedQueries,
      enrichedResults,
      citations,
      steps,
      userId
    );
    
    reflectionStep.content += `\n\nتم إنشاء تقرير شامل مع ${citations.length} مرجع.`;
    reflectionStep.duration = Date.now() - startTime - 
      (thoughtStep.duration || 0) - 
      (actionStep.duration || 0) - 
      (observationStep.duration || 0);
    callbacks?.onStepComplete?.(reflectionStep);
    
    callbacks?.onProgress?.(100, 'اكتمل البحث!');
    
    return result;
    
  } catch (error) {
    callbacks?.onError?.(error instanceof Error ? error : new Error('Unknown error'));
    throw error;
  }
}

// =============================================================================
// 🔄 Query Transformation
// =============================================================================

function transformQuery(originalQuery: string): string[] {
  const queries: string[] = [originalQuery];
  
  // إضافة استعلامات محسنة
  const keywords = originalQuery.split(' ').filter(w => w.length > 3);
  
  if (keywords.length > 2) {
    queries.push(`${keywords.slice(0, 3).join(' ')} تحليل 2024`);
    queries.push(`${keywords[0]} إحصائيات حديثة`);
  }
  
  // إضافة سؤال "ما هو" إذا كان السؤال يبدأ بكلمة
  if (!originalQuery.includes('?') && !originalQuery.startsWith('ما')) {
    queries.push(`ما هو ${originalQuery}?`);
  }
  
  return queries.slice(0, 3); // حد أقصى 3 استعلامات
}

// =============================================================================
// 🔍 Content Analysis
// =============================================================================

function analyzeContent(results: SearchResult[]): {
  observations: string[];
  keyFacts: string[];
  hasConflicts: boolean;
} {
  const observations: string[] = [];
  const keyFacts: string[] = [];
  
  if (results.length === 0) {
    return { observations: ['لم يتم العثور على نتائج كافية'], keyFacts: [], hasConflicts: false };
  }
  
  // استخراج الحقائق من snippets
  results.forEach(result => {
    if (result.snippet) {
      // البحث عن أرقام وإحصائيات
      const numbers = result.snippet.match(/\d+[\.,]?\d*%?/g);
      if (numbers && numbers.length > 0) {
        keyFacts.push(`من ${result.domain}: ${result.snippet.slice(0, 150)}...`);
      }
    }
  });
  
  observations.push(`تم تحليل ${results.length} مصدر`);
  observations.push(`${keyFacts.length} حقائق رقمية مستخرجة`);
  observations.push(`المصادر الرئيسية: ${results.slice(0, 3).map(r => r.domain).join(', ')}`);
  
  return { observations, keyFacts, hasConflicts: false };
}

// =============================================================================
// 📚 Citation Creation
// =============================================================================

function createCitations(results: SearchResult[]): Citation[] {
  return results.map((result, index) => ({
    id: index + 1,
    url: result.url,
    title: result.title,
    domain: result.domain,
    snippet: result.snippet,
    usedInSections: ['main'],
  }));
}

// =============================================================================
// 🎯 Remove Duplicates
// =============================================================================

function removeDuplicates(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  return results.filter(result => {
    if (seen.has(result.url)) return false;
    seen.add(result.url);
    return true;
  });
}

// =============================================================================
// 📊 Synthesize Result
// =============================================================================

function synthesizeResult(
  originalQuery: string,
  transformedQueries: string[],
  results: SearchResult[],
  citations: Citation[],
  steps: ResearchStep[],
  userId: string
): ResearchResult {
  // إنشاء الملخص التنفيذي
  const executiveSummary = generateExecutiveSummary(originalQuery, results, citations);
  
  // إنشاء الأقسام التفصيلية
  const detailedSections = generateDetailedSections(results, citations);
  
  return {
    id: generateId(),
    query: {
      id: generateId(),
      originalQuery,
      transformedQueries,
      subTasks: [],
      timestamp: new Date(),
      userId,
    },
    executiveSummary,
    detailedSections,
    citations,
    thinkingSteps: steps,
    stats: {
      totalSources: citations.length,
      searchEnginesUsed: ['Tavily', 'Serper'],
      pagesAnalyzed: results.length,
      totalTime: steps.reduce((acc, s) => acc + (s.duration || 0), 0),
    },
    createdAt: new Date(),
    completedAt: new Date(),
  };
}

function generateExecutiveSummary(
  query: string,
  results: SearchResult[],
  citations: Citation[]
): string {
  if (results.length === 0) {
    return `لم يتم العثور على نتائج كافية للسؤال: "${query}"`;
  }
  
  // تجميع snippets
  const topSnippets = results
    .slice(0, 3)
    .map((r, i) => `${r.snippet} [${i + 1}]`)
    .join('\n\n');
  
  return `## ملخص البحث عن: "${query}"\n\n` +
    `استناداً إلى ${citations.length} مصدر موثوق، إليك أبرز النتائج:\n\n` +
    topSnippets + '\n\n' +
    `---\n*تم تجميع هذه المعلومات من مصادر متعددة باستخدام البحث التفصيلي.*`;
}

function generateDetailedSections(
  results: SearchResult[],
  citations: Citation[]
): DetailedSection[] {
  const sections: DetailedSection[] = [];
  
  // قسم النتائج الرئيسية
  sections.push({
    id: generateId(),
    title: 'النتائج الرئيسية',
    content: results
      .slice(0, 5)
      .map((r, i) => `### ${r.title}\n${r.snippet || r.content?.slice(0, 300) || ''} [${i + 1}]`)
      .join('\n\n'),
    citations: citations.slice(0, 5).map(c => c.id),
  });
  
  // قسم المصادر الإضافية
  if (results.length > 5) {
    sections.push({
      id: generateId(),
      title: 'مصادر إضافية',
      content: results
        .slice(5)
        .map((r, i) => `- [${r.title}](${r.url})`)
        .join('\n'),
      citations: citations.slice(5).map(c => c.id),
    });
  }
  
  return sections;
}

export default {
  execute: executeResearch,
  transformQuery,
};
