'use client';

/**
 * 🔍 Divergence Chart Modal - مودال عرض الشارت الموسع
 * 
 * عرض شارت الدايفرجنس بحجم كامل في مودال
 * Full-size divergence chart modal display
 * 
 * @author CCWAYS Team
 * @version 2.0.0
 */

import React, { useEffect } from 'react';
import { DivergenceResult } from '@/lib/scanners/advanced-divergence-detector';
import { DivergenceTradingChart as DivergenceChart } from './DivergenceTradingChart';
import { DIVERGENCE_COLORS } from '@/lib/scanners/precision-drawing-engine';

const DIVERGENCE_COLOR_CLASSES: Record<string, { text: string; bg: string; borderLeft: string }> = {
  '#22c55e': { text: 'text-[#22c55e]', bg: 'bg-[#22c55e]/20', borderLeft: 'border-l-2 border-[#22c55e]' },
  '#4ade80': { text: 'text-[#4ade80]', bg: 'bg-[#4ade80]/20', borderLeft: 'border-l-2 border-[#4ade80]' },
  '#86efac': { text: 'text-[#86efac]', bg: 'bg-[#86efac]/20', borderLeft: 'border-l-2 border-[#86efac]' },
  '#059669': { text: 'text-[#059669]', bg: 'bg-[#059669]/20', borderLeft: 'border-l-2 border-[#059669]' },
  '#10b981': { text: 'text-[#10b981]', bg: 'bg-[#10b981]/20', borderLeft: 'border-l-2 border-[#10b981]' },
  '#34d399': { text: 'text-[#34d399]', bg: 'bg-[#34d399]/20', borderLeft: 'border-l-2 border-[#34d399]' },
  '#ef4444': { text: 'text-[#ef4444]', bg: 'bg-[#ef4444]/20', borderLeft: 'border-l-2 border-[#ef4444]' },
  '#f87171': { text: 'text-[#f87171]', bg: 'bg-[#f87171]/20', borderLeft: 'border-l-2 border-[#f87171]' },
  '#fca5a5': { text: 'text-[#fca5a5]', bg: 'bg-[#fca5a5]/20', borderLeft: 'border-l-2 border-[#fca5a5]' },
  '#dc2626': { text: 'text-[#dc2626]', bg: 'bg-[#dc2626]/20', borderLeft: 'border-l-2 border-[#dc2626]' },
  '#f43f5e': { text: 'text-[#f43f5e]', bg: 'bg-[#f43f5e]/20', borderLeft: 'border-l-2 border-[#f43f5e]' },
  '#fb7185': { text: 'text-[#fb7185]', bg: 'bg-[#fb7185]/20', borderLeft: 'border-l-2 border-[#fb7185]' },
};

interface DivergenceChartModalProps
{
  divergence: DivergenceResult | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DivergenceChartModal ( {
  divergence,
  isOpen,
  onClose
}: DivergenceChartModalProps )
{

  // Close on ESC key
  useEffect( () =>
  {
    const handleEsc = ( e: KeyboardEvent ) =>
    {
      if ( e.key === 'Escape' ) onClose();
    };

    if ( isOpen )
    {
      window.addEventListener( 'keydown', handleEsc );
      document.body.style.overflow = 'hidden';
    }

    return () =>
    {
      window.removeEventListener( 'keydown', handleEsc );
      document.body.style.overflow = 'unset';
    };
  }, [ isOpen, onClose ] );

  if ( !isOpen || !divergence || !divergence.candles || !divergence.indicatorValues )
  {
    return null;
  }

  const color = DIVERGENCE_COLORS[ divergence.direction ][ divergence.type ];
  const colorClasses = DIVERGENCE_COLOR_CLASSES[ color ] || {
    text: 'text-cyan-300',
    bg: 'bg-cyan-500/20',
    borderLeft: 'border-l-2 border-cyan-400'
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={ onClose }
    >
      {/* Modal with my-card glow effects */ }
      <div
        className="relative w-full max-w-4xl rounded-xl overflow-hidden"
        onClick={ ( e ) => e.stopPropagation() }
        style={ {
          background: 'linear-gradient(54deg, #264a46, #1d2b28, #183e3a, #1a3232, #141f1f)',
          boxShadow: `
            -4px 0 20px rgba(74, 222, 200, 0.25),
            0 4px 20px rgba(74, 222, 200, 0.2),
            -2px 2px 30px rgba(74, 222, 200, 0.15),
            inset -1px -1px 0 rgba(255, 255, 255, 0.1),
            0 0 40px rgba(74, 222, 200, 0.08)
          `,
          borderLeft: '1px solid rgba(74, 222, 200, 0.35)',
          borderBottom: '1px solid rgba(74, 222, 200, 0.3)',
          borderRight: '1px solid rgba(255, 255, 255, 0.05)',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)'
        } }
      >
        {/* Header - RTL Layout */ }
        <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
          {/* Close Button - Left side */ }
          <button
            onClick={ onClose }
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all"
            title="إغلاق (ESC)"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 2 } d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Symbol & Info - Right side */ }
          <div className="flex items-center gap-3">
            {/* Type Badge */ }
            <div
              className={ `px-2 py-1 rounded text-xs font-semibold ${ colorClasses.bg } ${ colorClasses.text } ${ colorClasses.borderLeft }` }
            >
              { divergence.type.toUpperCase() }
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>{ divergence.timeframe }</span>
              <span className="text-gray-600">•</span>
              <span className="capitalize">{ divergence.exchange }</span>
            </div>

            <div className="text-right">
              <span className="text-gray-500 text-sm">USDT/</span>
              <span className="text-lg font-bold text-white">{ divergence.symbol.replace( 'USDT', '' ) }</span>
            </div>
          </div>
        </div>

        {/* Chart Content - fills the modal */ }
        <div style={ { backgroundColor: '#2a4f4a' } }>
          <DivergenceChart
            candles={ divergence.candles }
            divergence={ divergence }
            indicatorValues={ divergence.indicatorValues }
            height={ 310 }
            className="w-full"
          />
        </div>

        {/* Stats Footer - RTL */ }
        <div className="px-4 py-3 border-t border-white/10">
          <div className="flex items-center justify-end gap-6">
            <div className="text-center">
              <div className="text-[10px] text-gray-500">النوع</div>
              <div className={ `text-sm font-bold ${ colorClasses.text }` }>
                { divergence.type.toUpperCase() }
              </div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-gray-500">النتيجة</div>
              <div className={ `text-sm font-bold ${ colorClasses.text }` }>
                { divergence.score }
              </div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-gray-500">الثقة</div>
              <div className="text-sm font-bold text-emerald-400">
                { divergence.confidence }%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DivergenceChartModal;
