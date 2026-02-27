/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PERPLEXITY SEARCH API ROUTE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * SSE Streaming API للبحث بنمط Perplexity
 * يستخدم Tavily API للبحث الحقيقي
 * 
 * @version 1.0.0
 */

import { NextRequest } from 'next/server';
import {
  PerplexitySource,
  RelatedQuestion,
  SourceType,
  SearchPhase,
  extractDomain,
  getFaviconUrl,
  detectSourceType,
  generateId,
} from '@/types/perplexity';

// Tavily API Configuration
const TAVILY_API_KEY = process.env.TAVILY_API_KEY || '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';
const TAVILY_API_URL = 'https://api.tavily.com/search';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
}

interface TavilyResponse {
  results: TavilyResult[];
  answer?: string;
  query: string;
}

interface SearchRequestBody {
  query: string;
  agentType?: string;
  toolType?: string;
  locale?: string;
  maxSources?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function createSSEMessage(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function transformTavilyResults(results: TavilyResult[]): PerplexitySource[] {
  return results.map((result, index) => {
    const domain = extractDomain(result.url);
    return {
      id: generateId(),
      index: index + 1,
      type: detectSourceType(result.url, result.title),
      title: result.title,
      url: result.url,
      domain,
      favicon: getFaviconUrl(domain),
      snippet: result.content?.substring(0, 200) + '...',
      publishedDate: result.published_date,
      relevance: Math.round(result.score * 100),
    };
  });
}

function generateRelatedQuestions(query: string, locale: string = 'ar'): RelatedQuestion[] {
  // قائمة أسئلة ديناميكية بناءً على الاستعلام
  const baseQuestions: Record<string, string[]> = {
    ar: [
      `ما هي أحدث التطورات في ${query}؟`,
      `كيف يمكن الاستفادة من ${query}؟`,
      `ما هي المخاطر المرتبطة بـ ${query}؟`,
      `مقارنة ${query} مع البدائل الأخرى`,
    ],
    en: [
      `What are the latest developments in ${query}?`,
      `How can I benefit from ${query}?`,
      `What are the risks associated with ${query}?`,
      `Compare ${query} with alternatives`,
    ],
  };
  
  const questions = baseQuestions[locale] || baseQuestions.en;
  
  return questions.map((q, i) => ({
    id: generateId(),
    question: q,
    category: 'related',
  }));
}

function generateAnswerWithCitations(
  query: string,
  sources: PerplexitySource[],
  tavilyAnswer?: string,
  locale: string = 'ar'
): string {
  // إذا Tavily أعطانا إجابة، نستخدمها مع إضافة citations
  if (tavilyAnswer) {
    // Add citations to existing answer
    let answer = tavilyAnswer;
    sources.slice(0, 5).forEach((source, i) => {
      // Add citation at relevant points
      if (i === 0 && !answer.includes('[1]')) {
        answer = answer.replace(/\. /, ` [${i + 1}]. `);
      }
    });
    return answer;
  }
  
  // Generate answer based on sources
  const isArabic = locale === 'ar';
  const snippets = sources.slice(0, 5).map(s => s.snippet).join(' ');
  
  if (isArabic) {
    return `بناءً على البحث في ${sources.length} مصادر موثوقة، إليك ما وجدته حول "${query}":

${sources.slice(0, 3).map((s, i) => `**${s.title}** [${i + 1}]
${s.snippet}`).join('\n\n')}

### النقاط الرئيسية
${sources.slice(0, 4).map((s, i) => `• ${s.snippet?.split('.')[0]} [${i + 1}]`).join('\n')}

للمزيد من التفاصيل، يمكنك الاطلاع على المصادر المرفقة [${sources.slice(4, 8).map((_, i) => i + 5).join('][')}].`;
  }
  
  return `Based on searching ${sources.length} reliable sources, here's what I found about "${query}":

${sources.slice(0, 3).map((s, i) => `**${s.title}** [${i + 1}]
${s.snippet}`).join('\n\n')}

### Key Points
${sources.slice(0, 4).map((s, i) => `• ${s.snippet?.split('.')[0]} [${i + 1}]`).join('\n')}

For more details, check the attached sources [${sources.slice(4, 8).map((_, i) => i + 5).join('][')}].`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// API HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  // Parse request body
  let body: SearchRequestBody;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  const { query, agentType, toolType, locale = 'ar', maxSources = 10 } = body;
  
  if (!query || typeof query !== 'string') {
    return new Response(JSON.stringify({ error: 'Query is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  // Create SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Phase 1: Searching
        controller.enqueue(encoder.encode(
          createSSEMessage('phase', { phase: SearchPhase.SEARCHING, progress: 10 })
        ));
        
        // Call Tavily API
        const tavilyResponse = await fetch(TAVILY_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            api_key: TAVILY_API_KEY,
            query,
            search_depth: 'advanced',
            include_answer: true,
            include_images: false,
            max_results: maxSources,
          }),
        });
        
        if (!tavilyResponse.ok) {
          throw new Error(`Tavily API error: ${tavilyResponse.status}`);
        }
        
        const tavilyData: TavilyResponse = await tavilyResponse.json();
        
        // Phase 2: Reading Sources
        controller.enqueue(encoder.encode(
          createSSEMessage('phase', { phase: SearchPhase.READING, progress: 40 })
        ));
        
        // Transform and send sources
        const sources = transformTavilyResults(tavilyData.results);
        controller.enqueue(encoder.encode(
          createSSEMessage('sources', { sources })
        ));
        
        // Small delay for better UX
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Phase 3: Analyzing
        controller.enqueue(encoder.encode(
          createSSEMessage('phase', { phase: SearchPhase.ANALYZING, progress: 60 })
        ));
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Phase 4: Generating
        controller.enqueue(encoder.encode(
          createSSEMessage('phase', { phase: SearchPhase.GENERATING, progress: 80 })
        ));
        
        // Generate answer with citations
        const answer = generateAnswerWithCitations(
          query,
          sources,
          tavilyData.answer,
          locale
        );
        
        // Stream the answer in chunks for better UX
        const chunkSize = 50;
        for (let i = 0; i < answer.length; i += chunkSize) {
          const chunk = answer.slice(i, i + chunkSize);
          controller.enqueue(encoder.encode(
            createSSEMessage('content', { chunk })
          ));
          await new Promise(resolve => setTimeout(resolve, 20));
        }
        
        // Send related questions
        const relatedQuestions = generateRelatedQuestions(query, locale);
        controller.enqueue(encoder.encode(
          createSSEMessage('related', { questions: relatedQuestions })
        ));
        
        // Complete
        controller.enqueue(encoder.encode(
          createSSEMessage('complete', { 
            phase: SearchPhase.COMPLETE,
            progress: 100,
            metadata: {
              searchTime: Date.now(),
              totalResults: sources.length,
              agentType,
              toolType,
            }
          })
        ));
        
      } catch (error) {
        console.error('Search error:', error);
        controller.enqueue(encoder.encode(
          createSSEMessage('error', { 
            code: 'SEARCH_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error occurred'
          })
        ));
      } finally {
        controller.close();
      }
    },
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// GET handler for health check
export async function GET() {
  return new Response(JSON.stringify({ 
    status: 'ok',
    service: 'perplexity-search',
    timestamp: new Date().toISOString(),
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
