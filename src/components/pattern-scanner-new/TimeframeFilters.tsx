'use client';

import React from 'react';
import { Check } from 'lucide-react';

interface TimeframeFiltersProps {
  selectedTimeframes: string[];
  onTimeframeToggle: (id: string) => void;
  timeframes: { id: string; label: string }[];
}

export default function TimeframeFilters({ 
  selectedTimeframes, 
  onTimeframeToggle, 
  timeframes 
}: TimeframeFiltersProps) {
  const isAllSelected = selectedTimeframes.length === timeframes.length;

  return (
    <div className="flex flex-col w-full bg-transparent">
      {/* Content - No Header */}
      <div className="flex-1 overflow-y-auto max-h-[300px] py-4 px-2 space-y-1 custom-scrollbar">
        {/* All Option */}
        <button
          onClick={() => onTimeframeToggle('all')}
          className="group flex items-center justify-between w-full px-2 py-2 rounded-xl transition-colors hover:bg-white/5 text-right gap-3"
        >
          <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all border order-2 shrink-0 ${
            isAllSelected 
              ? 'bg-cyan-500 border-cyan-500 text-white scale-110 shadow-[0_0_10px_rgba(6,182,212,0.3)]' 
              : 'bg-transparent border-white/10 group-hover:border-white/20'
          }`}>
            {isAllSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
          </div>
          <span className={`text-sm transition-colors order-1 flex-1 pr-1 ${
            isAllSelected ? 'text-cyan-400 font-bold' : 'text-slate-300'
          }`}>
            كل الفريمات
          </span>
        </button>

        <div className="h-px bg-white/5 my-2 mx-2" />

        {/* Individual Timeframes */}
        {timeframes.map((tf) => {
          const isActive = selectedTimeframes.includes(tf.id);
          return (
            <button
              key={tf.id}
              onClick={() => onTimeframeToggle(tf.id)}
              className="group flex items-center justify-between w-full px-2 py-2 rounded-xl transition-colors hover:bg-white/5 text-right gap-3"
            >
              <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all border order-2 shrink-0 ${
                isActive 
                  ? 'bg-cyan-500 border-cyan-500 text-white scale-110 shadow-[0_0_10px_rgba(6,182,212,0.3)]' 
                  : 'bg-transparent border-white/10 group-hover:border-white/20'
              }`}>
                {isActive && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <span className={`text-sm transition-colors order-1 flex-1 pr-1 ${
                isActive ? 'text-cyan-400 font-bold' : 'text-slate-300'
              }`}>
                {tf.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/10 sticky bottom-0 bg-transparent backdrop-blur-md z-10">
        <button 
          onClick={() => onTimeframeToggle('reset')}
          className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase transition-all border border-white/10"
        >
          إعادة ضبط
        </button>
      </div>
    </div>
  );
}
