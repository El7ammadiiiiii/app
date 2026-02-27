'use client';

import React from 'react';
import { Check } from 'lucide-react';

interface PatternFiltersProps {
  selectedPatterns: string[];
  onPatternToggle: (patternId: string) => void;
}

const patternGroups = [
  {
    name: 'القنوات (Channels)',
    patterns: [
      { id: 'ascending_channel', name: 'قناة صاعدة' },
      { id: 'descending_channel', name: 'قناة هابطة' },
      { id: 'ranging_channel', name: 'قناة عرضية' },
    ]
  },
  {
    name: 'المثلثات (Triangles)',
    patterns: [
      { id: 'ascending_triangle_contracting', name: 'مثلث صاعد (منقبض)' },
      { id: 'ascending_triangle_expanding', name: 'مثلث صاعد (متوسع)' },
      { id: 'descending_triangle_contracting', name: 'مثلث هابط (منقبض)' },
      { id: 'descending_triangle_expanding', name: 'مثلث هابط (متوسع)' },
      { id: 'symmetrical_triangle_contracting', name: 'مثلث متماثل (منقبض)' },
      { id: 'symmetrical_triangle_expanding', name: 'مثلث متماثل (متوسع)' },
    ]
  },
  {
    name: 'الأوتاد (Wedges)',
    patterns: [
      { id: 'falling_wedge_contracting', name: 'وتد هابط (منقبض)' },
      { id: 'falling_wedge_expanding', name: 'وتد هابط (متوسع)' },
      { id: 'rising_wedge_contracting', name: 'وتد صاعد (منقبض)' },
      { id: 'rising_wedge_expanding', name: 'وتد صاعد (متوسع)' },
    ]
  },
  {
    name: 'الأعلام والرايات (Flags & Pennants)',
    patterns: [
      { id: 'flag_bull', name: 'علم صاعد' },
      { id: 'flag_bear', name: 'علم هابط' },
      { id: 'pennant_bull', name: 'راية صاعدة' },
      { id: 'pennant_bear', name: 'راية هابطة' },
    ]
  }
];

export default function PatternFilters({ selectedPatterns, onPatternToggle }: PatternFiltersProps) {
  return (
    <div className="flex flex-col w-full bg-transparent">
      {/* Content - No Header */}
      <div className="flex-1 overflow-y-auto max-h-[300px] py-4 px-2 space-y-6 custom-scrollbar">
        {patternGroups.map((group) => (
          <div key={group.name} className="space-y-3">
            <div className="flex items-center gap-2 px-2">
              <div className="h-px flex-1 bg-white/10" />
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">
                {group.name}
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-1">
              {group.patterns.map((pattern) => {
                const isActive = selectedPatterns.includes(pattern.id);
                return (
                  <button
                    key={pattern.id}
                    onClick={() => onPatternToggle(pattern.id)}
                    className="group flex items-center justify-between px-2 py-2 rounded-lg transition-colors hover:bg-white/5 text-right gap-3"
                  >
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all border order-2 shrink-0 ${
                      isActive 
                        ? 'bg-cyan-500 border-cyan-500 text-white scale-110 shadow-[0_0_10px_rgba(6,182,212,0.3)]' 
                        : 'bg-transparent border-white/10 group-hover:border-white/20'
                    }`}>
                      {isActive && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <span className={`text-xs transition-colors order-1 flex-1 pr-1 ${
                      isActive ? 'text-cyan-400 font-bold' : 'text-slate-300'
                    }`}>
                      {pattern.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/10 sticky bottom-0 bg-transparent backdrop-blur-md z-10">
        <button 
          onClick={() => onPatternToggle('all_reset')}
          className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-bold uppercase transition-all border border-white/5"
        >
          إعادة ضبط
        </button>
      </div>
    </div>
  );
}
