'use client';

/**
 * Divergence Export System
 * نظام تصدير نتائج الدايفرجنس
 * 
 * Exports scan results in multiple formats: JSON, CSV, Markdown
 * تصدير نتائج المسح بتنسيقات متعددة: JSON, CSV, Markdown
 */

import React from 'react';
import { DivergenceResult } from '@/lib/scanners/advanced-divergence-detector';
import { getDivergenceTypeById } from '@/lib/scanners/divergence-types-catalog';

interface DivergenceExportSystemProps {
  results: DivergenceResult[];
  scanConfig?: {
    symbols: string[];
    exchanges: string[];
    timeframes: string[];
    timestamp: string;
  };
}

export function DivergenceExportSystem({ 
  results, 
  scanConfig 
}: DivergenceExportSystemProps) {
  
  /**
   * Export to JSON format
   */
  const exportToJSON = () => {
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        totalResults: results.length,
        scanConfig: scanConfig || {},
        version: '2.0.0'
      },
      results: results.map(result => {
        const typeMetadata = getDivergenceTypeById(result.type);
        return {
          ...result,
          typeMetadata: typeMetadata ? {
            name: typeMetadata.name,
            nameAr: typeMetadata.nameAr,
            category: typeMetadata.category,
            reliability: typeMetadata.reliability,
            quality: typeMetadata.quality,
            tradingSignal: typeMetadata.tradingSignal
          } : null
        };
      })
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `divergence-scan-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Export to CSV format
   */
  const exportToCSV = () => {
    // CSV Headers
    const headers = [
      'ID',
      'Type',
      'Direction',
      'Indicator',
      'Symbol',
      'Exchange',
      'Timeframe',
      'Score',
      'Confidence',
      'Quality',
      'Reliability',
      'Price Start',
      'Price End',
      'Indicator Start',
      'Indicator End',
      'Bar Start',
      'Bar End',
      'Timestamp'
    ];

    // CSV Rows
    const rows = results.map(result => {
      const typeMetadata = getDivergenceTypeById(result.type);
      return [
        result.id,
        result.type,
        result.direction,
        result.indicator,
        result.symbol,
        result.exchange,
        result.timeframe,
        result.score.toFixed(2),
        result.confidence.toFixed(2),
        typeMetadata?.quality || 'N/A',
        typeMetadata?.reliability || 'N/A',
        result.startPoint.price.toFixed(6),
        result.endPoint.price.toFixed(6),
        result.startPoint.indicatorValue.toFixed(6),
        result.endPoint.indicatorValue.toFixed(6),
        result.startPoint.index,
        result.endPoint.index,
        result.timestamp
      ];
    });

    // Build CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `divergence-scan-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Export to Markdown format
   */
  const exportToMarkdown = () => {
    const now = new Date().toLocaleString('ar-EG');
    
    // Calculate statistics
    const bullishCount = results.filter(r => r.direction === 'bullish').length;
    const bearishCount = results.filter(r => r.direction === 'bearish').length;
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

    // Group by quality
    const qualityGroups: Record<string, number> = {};
    results.forEach(result => {
      const typeMetadata = getDivergenceTypeById(result.type);
      const quality = typeMetadata?.quality || 'Unknown';
      qualityGroups[quality] = (qualityGroups[quality] || 0) + 1;
    });

    let markdown = `# تقرير مسح الدايفرجنس (Divergence Scan Report)\n\n`;
    markdown += `**تاريخ التصدير:** ${now}\n\n`;
    markdown += `**إجمالي النتائج:** ${results.length}\n\n`;
    
    markdown += `---\n\n`;
    markdown += `## 📊 الإحصائيات العامة\n\n`;
    markdown += `- **إشارات صاعدة (Bullish):** ${bullishCount} (${((bullishCount/results.length)*100).toFixed(1)}%)\n`;
    markdown += `- **إشارات هابطة (Bearish):** ${bearishCount} (${((bearishCount/results.length)*100).toFixed(1)}%)\n`;
    markdown += `- **متوسط النقاط:** ${avgScore.toFixed(2)}\n`;
    markdown += `- **متوسط الثقة:** ${avgConfidence.toFixed(2)}%\n\n`;

    markdown += `### توزيع الجودة\n\n`;
    Object.entries(qualityGroups)
      .sort((a, b) => b[1] - a[1])
      .forEach(([quality, count]) => {
        markdown += `- **${quality}:** ${count} (${((count/results.length)*100).toFixed(1)}%)\n`;
      });

    markdown += `\n---\n\n`;
    markdown += `## 📋 النتائج التفصيلية\n\n`;
    
    // Group results by symbol
    const bySymbol: Record<string, DivergenceResult[]> = {};
    results.forEach(result => {
      if (!bySymbol[result.symbol]) {
        bySymbol[result.symbol] = [];
      }
      bySymbol[result.symbol].push(result);
    });

    Object.entries(bySymbol).forEach(([symbol, symbolResults]) => {
      markdown += `### ${symbol}\n\n`;
      markdown += `| النوع | الاتجاه | المؤشر | الإطار الزمني | النقاط | الثقة | الجودة |\n`;
      markdown += `|-------|---------|--------|--------------|--------|------|--------|\n`;
      
      symbolResults
        .sort((a, b) => b.score - a.score)
        .forEach(result => {
          const typeMetadata = getDivergenceTypeById(result.type);
          const directionEmoji = result.direction === 'bullish' ? '📈' : '📉';
          markdown += `| ${typeMetadata?.emoji || '❓'} ${typeMetadata?.nameAr || result.type} | ${directionEmoji} ${result.direction} | ${result.indicator} | ${result.timeframe} | ${result.score.toFixed(1)} | ${result.confidence.toFixed(0)}% | ${typeMetadata?.quality || 'N/A'} |\n`;
        });
      
      markdown += `\n`;
    });

    markdown += `---\n\n`;
    markdown += `## ℹ️ معلومات المسح\n\n`;
    if (scanConfig) {
      markdown += `- **الرموز:** ${scanConfig.symbols.join(', ')}\n`;
      markdown += `- **البورصات:** ${scanConfig.exchanges.join(', ')}\n`;
      markdown += `- **الأطر الزمنية:** ${scanConfig.timeframes.join(', ')}\n`;
      markdown += `- **وقت المسح:** ${scanConfig.timestamp}\n`;
    }
    
    markdown += `\n---\n\n`;
    markdown += `*تم إنشاء هذا التقرير بواسطة CCWAYS Divergence Scanner v2.0*\n`;

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `divergence-scan-${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const hasResults = results.length > 0;

  return (
    <div className="flex items-center gap-2">
      {/* JSON Export */}
      <button
        onClick={exportToJSON}
        disabled={!hasResults}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        title="تصدير JSON"
      >
        <span>📄</span>
        <span>JSON</span>
      </button>

      {/* CSV Export */}
      <button
        onClick={exportToCSV}
        disabled={!hasResults}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        title="تصدير CSV"
      >
        <span>📊</span>
        <span>CSV</span>
      </button>

      {/* Markdown Export */}
      <button
        onClick={exportToMarkdown}
        disabled={!hasResults}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        title="تصدير Markdown"
      >
        <span>📝</span>
        <span>MD</span>
      </button>

      {!hasResults && (
        <span className="text-xs text-gray-500 mr-2">لا توجد نتائج للتصدير</span>
      )}
    </div>
  );
}

export default DivergenceExportSystem;
