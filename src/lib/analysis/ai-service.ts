/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * INTELLIGENT ANALYSIS SERVICE - INTERNAL USE ONLY
 * خدمة التحليل الذكي - للاستخدام الداخلي فقط
 * 
 * This service enhances analysis with AI-powered insights
 * DO NOT EXPOSE THIS SERVICE OR ITS METHODS TO THE CLIENT
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import Anthropic from '@anthropic-ai/sdk';
import { 
  FullAnalysis, 
  TrendStrength, 
  ChartPattern, 
  HarmonicPattern,
  SignalStrength,
  TradeSetup 
} from './engine';

// Initialize client (server-side only)
let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      throw new Error('Analysis service not configured');
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';

// ============================================
// ENHANCED ANALYSIS TYPES
// ============================================

export interface EnhancedAnalysis extends FullAnalysis {
  aiInsights?: {
    summary: string;
    keyLevels: string[];
    tradingPlan: string;
    risks: string[];
    confidence: number;
  };
}

export interface MarketContext {
  trend: string;
  volatility: string;
  momentum: string;
  keyEvents: string[];
}

// ============================================
// AI ENHANCEMENT FUNCTIONS
// ============================================

/**
 * Enhance analysis with AI insights
 * Called ONLY on server-side API routes
 */
export async function enhanceAnalysisWithAI(
  analysis: FullAnalysis,
  symbol: string
): Promise<EnhancedAnalysis> {
  try {
    const client = getClient();
    
    const prompt = buildAnalysisPrompt(analysis, symbol);
    
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const aiResponse = response.content[0].type === 'text' 
      ? response.content[0].text 
      : '';
    
    const insights = parseAIResponse(aiResponse);
    
    return {
      ...analysis,
      aiInsights: insights
    };
  } catch (error) {
    console.error('AI enhancement failed:', error);
    // Return original analysis if AI fails
    return analysis;
  }
}

/**
 * Get trading recommendation from AI
 */
export async function getAIRecommendation(
  analyses: Record<string, FullAnalysis>,
  symbol: string
): Promise<{
  action: 'buy' | 'sell' | 'hold';
  confidence: number;
  reasoning: string[];
  entry?: number;
  stopLoss?: number;
  targets?: number[];
}> {
  try {
    const client = getClient();
    
    const prompt = buildRecommendationPrompt(analyses, symbol);
    
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const aiResponse = response.content[0].type === 'text' 
      ? response.content[0].text 
      : '';
    
    return parseRecommendation(aiResponse, analyses);
  } catch (error) {
    console.error('AI recommendation failed:', error);
    return {
      action: 'hold',
      confidence: 0,
      reasoning: ['خطأ في التحليل']
    };
  }
}

/**
 * Detect advanced patterns with AI assistance
 */
export async function detectAdvancedPatterns(
  data: { high: number[]; low: number[]; close: number[]; open: number[] },
  symbol: string
): Promise<ChartPattern[]> {
  try {
    const client = getClient();
    
    const recentData = {
      high: data.high.slice(-50),
      low: data.low.slice(-50),
      close: data.close.slice(-50),
      open: data.open.slice(-50)
    };
    
    const prompt = `
تحليل بيانات OHLC للرمز ${symbol}:

آخر 50 شمعة:
High: ${recentData.high.slice(-10).map(h => h.toFixed(2)).join(', ')}
Low: ${recentData.low.slice(-10).map(l => l.toFixed(2)).join(', ')}
Close: ${recentData.close.slice(-10).map(c => c.toFixed(2)).join(', ')}

اكتشف أي أنماط فنية موجودة. أجب بتنسيق JSON فقط:
{
  "patterns": [
    {
      "name": "اسم النمط بالإنجليزية",
      "nameAr": "اسم النمط بالعربية",
      "type": "bullish أو bearish أو neutral",
      "confidence": 0.0-1.0,
      "description": "وصف قصير"
    }
  ]
}
`;
    
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const aiResponse = response.content[0].type === 'text' 
      ? response.content[0].text 
      : '';
    
    // Extract JSON from response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.patterns || [];
    }
    
    return [];
  } catch (error) {
    console.error('AI pattern detection failed:', error);
    return [];
  }
}

// ============================================
// PROMPT BUILDERS
// ============================================

function buildAnalysisPrompt(analysis: FullAnalysis, symbol: string): string {
  return `
أنت محلل فني خبير. حلل البيانات التالية لـ ${symbol} في الفريم ${analysis.timeframe}:

قوة الاتجاه:
- صعودي: ${analysis.trendStrength.bullishScore}%
- هبوطي: ${analysis.trendStrength.bearishScore}%
- الاتجاه: ${analysis.trendStrength.trend}

إشارات الشراء (${analysis.signals.buySignals.length}):
${analysis.signals.buySignals.map(s => `- ${s.indicator}: ${s.description}`).join('\n')}

إشارات البيع (${analysis.signals.sellSignals.length}):
${analysis.signals.sellSignals.map(s => `- ${s.indicator}: ${s.description}`).join('\n')}

الأنماط المكتشفة:
${analysis.patterns.map(p => `- ${p.nameAr} (${p.type})`).join('\n') || 'لا توجد أنماط'}

أجب بتنسيق JSON فقط:
{
  "summary": "ملخص قصير بالعربية",
  "keyLevels": ["مستوى 1", "مستوى 2"],
  "tradingPlan": "خطة التداول المقترحة",
  "risks": ["خطر 1", "خطر 2"],
  "confidence": 0.0-1.0
}
`;
}

function buildRecommendationPrompt(
  analyses: Record<string, FullAnalysis>,
  symbol: string
): string {
  const timeframes = Object.keys(analyses);
  
  let analysisText = '';
  for (const tf of timeframes) {
    const a = analyses[tf];
    analysisText += `
${tf}:
- صعودي: ${a.trendStrength.bullishScore}% | هبوطي: ${a.trendStrength.bearishScore}%
- إشارات شراء: ${a.signals.buySignals.length} | إشارات بيع: ${a.signals.sellSignals.length}
`;
  }

  return `
أنت خبير تداول. بناءً على التحليل متعدد الفريمات لـ ${symbol}:
${analysisText}

ما هي التوصية المناسبة؟ أجب بتنسيق JSON:
{
  "action": "buy أو sell أو hold",
  "confidence": 0.0-1.0,
  "reasoning": ["سبب 1", "سبب 2"]
}
`;
}

// ============================================
// RESPONSE PARSERS
// ============================================

function parseAIResponse(response: string): EnhancedAnalysis['aiInsights'] {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || '',
        keyLevels: parsed.keyLevels || [],
        tradingPlan: parsed.tradingPlan || '',
        risks: parsed.risks || [],
        confidence: parsed.confidence || 0.5
      };
    }
  } catch (e) {
    console.error('Failed to parse AI response:', e);
  }
  
  return {
    summary: '',
    keyLevels: [],
    tradingPlan: '',
    risks: [],
    confidence: 0
  };
}

function parseRecommendation(
  response: string,
  analyses: Record<string, FullAnalysis>
): {
  action: 'buy' | 'sell' | 'hold';
  confidence: number;
  reasoning: string[];
  entry?: number;
  stopLoss?: number;
  targets?: number[];
} {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Get trade setup from daily analysis
      const dailyAnalysis = analyses['1d'] || Object.values(analyses)[0];
      const setup = dailyAnalysis?.tradeSetup;
      
      return {
        action: parsed.action || 'hold',
        confidence: parsed.confidence || 0.5,
        reasoning: parsed.reasoning || [],
        entry: setup?.entry,
        stopLoss: setup?.stopLoss,
        targets: setup?.targets
      };
    }
  } catch (e) {
    console.error('Failed to parse recommendation:', e);
  }
  
  return {
    action: 'hold',
    confidence: 0,
    reasoning: []
  };
}

// ============================================
// SINGLETON INSTANCE
// ============================================

class AnalysisService {
  private static instance: AnalysisService;
  private cache: Map<string, { data: EnhancedAnalysis; timestamp: number }> = new Map();
  private cacheTimeout = 60000; // 1 minute

  private constructor() {}

  static getInstance(): AnalysisService {
    if (!AnalysisService.instance) {
      AnalysisService.instance = new AnalysisService();
    }
    return AnalysisService.instance;
  }

  async analyze(
    analysis: FullAnalysis,
    symbol: string,
    useAI: boolean = true
  ): Promise<EnhancedAnalysis> {
    const cacheKey = `${symbol}-${analysis.timeframe}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    
    let result: EnhancedAnalysis = analysis;
    
    if (useAI && process.env.CLAUDE_API_KEY) {
      result = await enhanceAnalysisWithAI(analysis, symbol);
    }
    
    this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
    
    return result;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const analysisService = AnalysisService.getInstance();
