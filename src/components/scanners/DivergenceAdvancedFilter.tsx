'use client';

/**
 * Divergence Advanced Filter Component
 * فلتر متقدم لاختيار أنواع الدايفرجنس
 * 
 * Allows users to select which divergence types to scan
 * يسمح للمستخدمين باختيار أنواع الدايفرجنس للبحث عنها
 */

import React, { useState } from 'react';
import {
  DIVERGENCE_CATALOG,
  DivergenceCategory,
  ExtendedIndicatorType,
  SignalQuality,
  DivergenceTypeMetadata
} from '@/lib/scanners/divergence-types-catalog';

interface FilterState {
  selectedTypes: string[];
  selectedIndicators: ExtendedIndicatorType[];
  selectedCategories: DivergenceCategory[];
  minReliability: number;
  qualityFilter: SignalQuality[];
}

interface DivergenceAdvancedFilterProps {
  onFilterChange: (selectedTypes: string[]) => void;
  initialSelection?: string[];
}

export function DivergenceAdvancedFilter({
  onFilterChange,
  initialSelection = []
}: DivergenceAdvancedFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<FilterState>({
    selectedTypes: initialSelection,
    selectedIndicators: [],
    selectedCategories: [],
    minReliability: 0,
    qualityFilter: []
  });

  // Get filtered catalog based on current filters
  const getFilteredCatalog = (): DivergenceTypeMetadata[] => {
    return DIVERGENCE_CATALOG.filter(type => {
      // Category filter
      if (filter.selectedCategories.length > 0 && !filter.selectedCategories.includes(type.category)) {
        return false;
      }
      
      // Indicator filter
      if (filter.selectedIndicators.length > 0) {
        const hasIndicator = type.indicators.some(ind => filter.selectedIndicators.includes(ind));
        if (!hasIndicator) return false;
      }
      
      // Reliability filter
      if (type.reliability < filter.minReliability) {
        return false;
      }
      
      // Quality filter
      if (filter.qualityFilter.length > 0 && !filter.qualityFilter.includes(type.quality)) {
        return false;
      }
      
      return true;
    });
  };

  const filteredCatalog = getFilteredCatalog();

  // Toggle type selection
  const toggleType = (typeId: string) => {
    const newSelected = filter.selectedTypes.includes(typeId)
      ? filter.selectedTypes.filter(id => id !== typeId)
      : [...filter.selectedTypes, typeId];
    
    const newFilter = { ...filter, selectedTypes: newSelected };
    setFilter(newFilter);
    onFilterChange(newSelected);
  };

  // Toggle indicator
  const toggleIndicator = (indicator: ExtendedIndicatorType) => {
    const newIndicators = filter.selectedIndicators.includes(indicator)
      ? filter.selectedIndicators.filter(ind => ind !== indicator)
      : [...filter.selectedIndicators, indicator];
    
    setFilter({ ...filter, selectedIndicators: newIndicators });
  };

  // Toggle category
  const toggleCategory = (category: DivergenceCategory) => {
    const newCategories = filter.selectedCategories.includes(category)
      ? filter.selectedCategories.filter(cat => cat !== category)
      : [...filter.selectedCategories, category];
    
    setFilter({ ...filter, selectedCategories: newCategories });
  };

  // Select all visible types
  const selectAll = () => {
    const allVisibleIds = filteredCatalog.map(type => type.id);
    setFilter({ ...filter, selectedTypes: allVisibleIds });
    onFilterChange(allVisibleIds);
  };

  // Clear all selections
  const clearAll = () => {
    setFilter({ ...filter, selectedTypes: [] });
    onFilterChange([]);
  };

  // Reset all filters
  const resetFilters = () => {
    const resetFilter: FilterState = {
      selectedTypes: [],
      selectedIndicators: [],
      selectedCategories: [],
      minReliability: 0,
      qualityFilter: []
    };
    setFilter(resetFilter);
    onFilterChange([]);
  };

  // Category names
  const categoryNames: Record<DivergenceCategory, { name: string; emoji: string; color: string }> = {
    [DivergenceCategory.REGULAR_BULLISH]: { name: 'صاعد منتظم', emoji: '📈', color: 'bg-green-500/20 border-green-500/40 text-green-400' },
    [DivergenceCategory.REGULAR_BEARISH]: { name: 'هابط منتظم', emoji: '📉', color: 'bg-red-500/20 border-red-500/40 text-red-400' },
    [DivergenceCategory.HIDDEN_BULLISH]: { name: 'صاعد مخفي', emoji: '🔺', color: 'bg-blue-500/20 border-blue-500/40 text-blue-400' },
    [DivergenceCategory.HIDDEN_BEARISH]: { name: 'هابط مخفي', emoji: '🔻', color: 'bg-orange-500/20 border-orange-500/40 text-orange-400' },
    [DivergenceCategory.EXAGGERATED_BULLISH]: { name: 'صاعد مبالغ', emoji: '🚀', color: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' },
    [DivergenceCategory.EXAGGERATED_BEARISH]: { name: 'هابط مبالغ', emoji: '💣', color: 'bg-purple-500/20 border-purple-500/40 text-purple-400' },
  };

  // Indicator tiers
  const goldTierIndicators: ExtendedIndicatorType[] = [
    ExtendedIndicatorType.RSI,
    ExtendedIndicatorType.OBV,
    ExtendedIndicatorType.MFI,
    ExtendedIndicatorType.CCI,
    ExtendedIndicatorType.WILLIAMS_R
  ];

  const silverTierIndicators: ExtendedIndicatorType[] = [
    ExtendedIndicatorType.MACD,
    ExtendedIndicatorType.STOCH_RSI,
    ExtendedIndicatorType.ROC,
    ExtendedIndicatorType.FORCE_INDEX,
    ExtendedIndicatorType.CMF
  ];

  return (
    <div className="relative">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 transition-all"
      >
        <span>🎯</span>
        <span className="font-medium">فلتر متقدم</span>
        <span className="text-xs bg-purple-500/30 px-2 py-0.5 rounded-full">
          {filter.selectedTypes.length}/{DIVERGENCE_CATALOG.length}
        </span>
        <span className="text-sm">{isOpen ? '▲' : '▼'}</span>
      </button>

      {/* Filter Panel */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-[90vw] max-w-[600px] max-h-[600px] overflow-y-auto template-card rounded-xl shadow-2xl z-[100] p-4">
          {/* Header Actions */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1a4a4d]">
            <h3 className="text-lg font-bold text-white">تحديد أنواع الدايفرجنس</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={selectAll}
                className="px-3 py-1.5 text-xs rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 transition-all"
              >
                تحديد الكل ({filteredCatalog.length})
              </button>
              <button
                onClick={clearAll}
                className="px-3 py-1.5 text-xs rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all"
              >
                إلغاء الكل
              </button>
              <button
                onClick={resetFilters}
                className="px-3 py-1.5 text-xs rounded-lg bg-gray-500/10 hover:bg-gray-500/20 text-gray-400 border border-gray-500/30 transition-all"
              >
                إعادة تعيين
              </button>
            </div>
          </div>

          {/* Category Filter */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">التصنيفات:</h4>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(categoryNames).map(([category, info]) => {
                const isSelected = filter.selectedCategories.includes(category as DivergenceCategory);
                return (
                  <button
                    key={category}
                    onClick={() => toggleCategory(category as DivergenceCategory)}
                    className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                      isSelected ? info.color : 'bg-[#0f3133] border-[#1a4a4d] text-gray-400 hover:bg-[#0f3133]'
                    }`}
                  >
                    <span className="mr-1">{info.emoji}</span>
                    {info.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Indicator Filter */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">المؤشرات:</h4>
            
            {/* Gold Tier */}
            <div className="mb-3">
              <div className="text-xs text-amber-400 font-semibold mb-1.5">⭐ الفئة الذهبية</div>
              <div className="grid grid-cols-5 gap-2">
                {goldTierIndicators.map(indicator => {
                  const isSelected = filter.selectedIndicators.includes(indicator);
                  return (
                    <button
                      key={indicator}
                      onClick={() => toggleIndicator(indicator)}
                      className={`px-2 py-1.5 rounded text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                          : 'bg-[#0f3133] border border-[#1a4a4d] text-gray-400 hover:bg-[#0f3133]'
                      }`}
                    >
                      {indicator}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Silver Tier */}
            <div>
              <div className="text-xs text-gray-400 font-semibold mb-1.5">🥈 الفئة الفضية</div>
              <div className="grid grid-cols-5 gap-2">
                {silverTierIndicators.map(indicator => {
                  const isSelected = filter.selectedIndicators.includes(indicator);
                  return (
                    <button
                      key={indicator}
                      onClick={() => toggleIndicator(indicator)}
                      className={`px-2 py-1.5 rounded text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-gray-500/20 border border-gray-500/40 text-gray-300'
                          : 'bg-[#0f3133] border border-[#1a4a4d] text-gray-400 hover:bg-[#0f3133]'
                      }`}
                    >
                      {indicator}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Reliability Slider */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">
              الحد الأدنى للموثوقية: {filter.minReliability}%
            </h4>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={filter.minReliability}
              onChange={(e) => setFilter({ ...filter, minReliability: parseInt(e.target.value) })}
              className="w-full h-2 bg-[#1a4a4d] rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Quality Filter */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">جودة الإشارة:</h4>
            <div className="flex gap-2">
              {[SignalQuality.A_PLUS, SignalQuality.A, SignalQuality.B, SignalQuality.C].map(quality => {
                const isSelected = filter.qualityFilter.includes(quality);
                return (
                  <button
                    key={quality}
                    onClick={() => {
                      const newQuality = isSelected
                        ? filter.qualityFilter.filter(q => q !== quality)
                        : [...filter.qualityFilter, quality];
                      setFilter({ ...filter, qualityFilter: newQuality });
                    }}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-400'
                        : 'bg-[#0f3133] border border-[#1a4a4d] text-gray-400 hover:bg-[#0f3133]'
                    }`}
                  >
                    {quality}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filtered Results */}
          <div className="mb-3 text-sm text-gray-400">
            عرض {filteredCatalog.length} من {DIVERGENCE_CATALOG.length} نوع
          </div>

          {/* Type Selection Grid */}
          <div className="grid grid-cols-2 gap-2 max-h-[250px] overflow-y-auto">
            {filteredCatalog.map(type => {
              const isSelected = filter.selectedTypes.includes(type.id);
              return (
                <button
                  key={type.id}
                  onClick={() => toggleType(type.id)}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'bg-cyan-500/10 border-cyan-500/40'
                      : 'bg-[#0f3133] border-[#1a4a4d] hover:bg-[#0f3133]'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                      isSelected ? 'bg-cyan-500 border-cyan-500' : 'border-gray-600'
                    }`}
                  >
                    {isSelected && <span className="text-white text-xs">✓</span>}
                  </div>
                  <span className="text-lg">{type.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-white truncate">{type.nameAr}</div>
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-gray-500">{type.quality}</span>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-500">{type.reliability}%</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default DivergenceAdvancedFilter;
