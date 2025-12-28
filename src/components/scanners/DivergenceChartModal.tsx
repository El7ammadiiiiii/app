'use client';

/**
 * 🔍 Divergence Chart Modal - مودال عرض الشارت الموسع
 * 
 * عرض شارت الدايفرجنس بحجم كامل في مودال
 * Full-size divergence chart modal display
 * 
 * @author Nexus Elite Team
 * @version 2.0.0
 */

import React, { useEffect } from 'react';
import { DivergenceResult } from '@/lib/scanners/advanced-divergence-detector';
import { DivergenceTradingChart as DivergenceChart } from './DivergenceTradingChart';
import { DIVERGENCE_COLORS } from '@/lib/scanners/precision-drawing-engine';

interface DivergenceChartModalProps {
  divergence: DivergenceResult | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DivergenceChartModal({
  divergence,
  isOpen,
  onClose
}: DivergenceChartModalProps) {
  
  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);
  
  if (!isOpen || !divergence || !divergence.candles || !divergence.indicatorValues) {
    return null;
  }
  
  const color = DIVERGENCE_COLORS[divergence.direction][divergence.type];
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden animate-border-glow"
        style={{ 
          background: 'linear-gradient(90deg, #030508, #0d3b3b)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 0 30px rgba(255, 255, 255, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Symbol */}
            <div>
              <h2 className="text-xl font-bold text-white">
                {divergence.symbol.replace('USDT', '')}
                <span className="text-gray-500 text-sm ml-1">/USDT</span>
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-400 capitalize">{divergence.exchange}</span>
                <span className="text-gray-600">•</span>
                <span className="text-xs text-gray-400">{divergence.timeframe}</span>
              </div>
            </div>
            
            {/* Type Badge */}
            <div 
              className="px-3 py-1.5 rounded-lg text-sm font-semibold"
              style={{ 
                backgroundColor: color + '20',
                color: color,
                borderLeft: `3px solid ${color}`
              }}
            >
              {divergence.type.toUpperCase()}
            </div>
          </div>
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/[0.05] text-gray-400 hover:text-white transition-all"
            title="إغلاق (ESC)"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Chart Content */}
        <div>
          <DivergenceChart
            candles={divergence.candles}
            divergence={divergence}
            indicatorValues={divergence.indicatorValues}
            height={500}
            className="w-full"
          />
        </div>
        
        {/* Stats Footer */}
        <div className="px-6 py-4 border-t border-white/[0.08]" style={{ background: 'rgba(0, 27, 66, 0.5)' }}>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">الثقة</div>
              <div className="text-lg font-bold text-emerald-400">
                {divergence.confidence}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">النتيجة</div>
              <div className="text-lg font-bold" style={{ color }}>
                {divergence.score}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">النوع</div>
              <div className="text-lg font-bold" style={{ color }}>
                {divergence.type.toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DivergenceChartModal;
