'use client';

/**
 * ⚠️ PROTECTED FILE - DO NOT MODIFY ⚠️
 * 🔒 ملف محمي - لا تقم بالتعديل 🔒
 * 
 * This file is locked and should not be modified by AI agents.
 * هذا الملف مقفل ولا يجب تعديله بواسطة الوكلاء الذكيين
 * 
 * Expert Analyst Panel Component - لوحة المحلل الخبير
 * واجهة مستخدم متقدمة لعرض تحليل الذكاء الاصطناعي
 * 
 * @author CCWAYS Team
 * @version 1.0.0
 * @locked true
 * @last-reviewed 2025-12-14
 */

import React, { useState, useEffect, useCallback } from 'react';
import { OHLCV } from '@/lib/indicators/technical';
import { 
  ExpertAnalystAgent, 
  AIAnalysisResponse, 
  calculateAllIndicatorReadings,
  analyzeWithAI 
} from '@/lib/ai/expert-analyst-agent';
import { EliteTrendResult } from '@/lib/indicators/elite-trend-algorithms';

interface ExpertAnalystPanelProps {
  symbol: string;
  timeframe: string;
  currentPrice: number;
  priceChange24h?: number;
  candles: OHLCV[];
  eliteResult?: EliteTrendResult;
  onAnalysisComplete?: (analysis: AIAnalysisResponse) => void;
}

const RECOMMENDATION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'شراء قوي': { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/50' },
  'شراء': { bg: 'bg-green-400/15', text: 'text-green-300', border: 'border-green-400/40' },
  'محايد': { bg: 'bg-yellow-500/15', text: 'text-yellow-300', border: 'border-yellow-500/40' },
  'بيع': { bg: 'bg-red-400/15', text: 'text-red-300', border: 'border-red-400/40' },
  'بيع قوي': { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/50' },
};

const RISK_COLORS: Record<string, { bg: string; text: string }> = {
  'منخفض': { bg: 'bg-green-500/20', text: 'text-green-400' },
  'متوسط': { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  'مرتفع': { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  'مرتفع جداً': { bg: 'bg-red-500/20', text: 'text-red-400' },
};

export function ExpertAnalystPanel({
  symbol,
  timeframe,
  currentPrice,
  priceChange24h,
  candles,
  eliteResult,
  onAnalysisComplete
}: ExpertAnalystPanelProps) {
  const [analysis, setAnalysis] = useState<AIAnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAnalyzedTimeframe, setLastAnalyzedTimeframe] = useState<string>('');

  const runAnalysis = useCallback(async () => {
    if (candles.length < 50) {
      setError('لا توجد بيانات كافية للتحليل');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Calculate all indicator readings
      const indicators = calculateAllIndicatorReadings(candles);
      
      // Get API key from environment
      const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
      
      let result: AIAnalysisResponse;
      
      if (apiKey) {
        // Use AI analysis
        result = await analyzeWithAI({
          symbol,
          timeframe,
          currentPrice,
          priceChange24h,
          indicators,
          eliteResult,
          candles
        }, apiKey);
      } else {
        // Use fallback analysis
        result = ExpertAnalystAgent.generateFallbackAnalysis({
          symbol,
          timeframe,
          currentPrice,
          priceChange24h,
          indicators,
          eliteResult,
          candles
        });
      }
      
      setAnalysis(result);
      setLastAnalyzedTimeframe(timeframe);
      onAnalysisComplete?.(result);
    } catch (err) {
      console.error('Analysis error:', err);
      setError('حدث خطأ أثناء التحليل');
    } finally {
      setIsLoading(false);
    }
  }, [candles, symbol, timeframe, currentPrice, priceChange24h, eliteResult, onAnalysisComplete]);

  // Auto-analyze when timeframe changes
  useEffect(() => {
    if (timeframe !== lastAnalyzedTimeframe && candles.length > 0) {
      runAnalysis();
    }
  }, [timeframe, candles, lastAnalyzedTimeframe, runAnalysis]);

  const recColors = analysis ? RECOMMENDATION_COLORS[analysis.recommendation] : null;
  const riskColors = analysis ? RISK_COLORS[analysis.riskAssessment.level] : null;

  return (
    <div className="template-card rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1a4a4d] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <span className="text-amber-400">📋</span> ملخص التحليل
        </h3>
        
        <button
          onClick={runAnalysis}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-medium transition-all disabled:opacity-50"
        >
          {isLoading ? 'جاري التحليل...' : '🔄 تحديث'}
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {error && (
          <div className="mb-3 p-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-xs">
            {error}
          </div>
        )}

        {isLoading && !analysis && (
          <div className="flex items-center justify-center py-6">
            <div className="w-8 h-8 rounded-full border-2 border-cyan-500/30 border-t-cyan-500 animate-spin" />
          </div>
        )}

        {analysis && (
          <div className="space-y-3">
            {/* Recommendation Badge */}
            <div className={`flex items-center justify-between p-3 rounded-lg ${recColors?.bg} border ${recColors?.border}`}>
              <span className={`text-lg font-bold ${recColors?.text}`}>{analysis.recommendation}</span>
              <span className="text-white text-sm font-medium">{analysis.confidence}%</span>
            </div>



            {/* Key Levels - Compact */}
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-1 rounded bg-red-500/10 text-red-400">
                SL: {analysis.keyLevels.stopLoss.toFixed(currentPrice < 1 ? 4 : 2)}
              </span>
              <span className="px-2 py-1 rounded bg-green-500/10 text-green-400">
                TP1: {analysis.keyLevels.takeProfit1.toFixed(currentPrice < 1 ? 4 : 2)}
              </span>
              <span className={`px-2 py-1 rounded ${riskColors?.bg} ${riskColors?.text}`}>
                المخاطر: {analysis.riskAssessment.level}
              </span>
            </div>
          </div>
        )}

        {!analysis && !isLoading && !error && (
          <div className="text-center py-4">
            <button
              onClick={runAnalysis}
              className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 text-sm font-medium hover:bg-cyan-500/30 transition-all"
            >
              بدء التحليل
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExpertAnalystPanel;
