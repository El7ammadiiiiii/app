"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { ScannerConfig } from '../../types/patterns';
import { Filter, Sliders } from 'lucide-react';
import { getCategories } from '../../lib/indicators/patterns/registry';

interface PatternFiltersProps {
  config: ScannerConfig;
  onChange: (config: ScannerConfig) => void;
}

// Get categories from registry (12 category groups from Python backend)
const CATEGORY_META = getCategories();

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  ...CATEGORY_META.map(cat => ({
    value: cat.id,
    label: cat.label,
    description: cat.description,
    proOnly: cat.proOnly
  }))
];

export default function PatternFilters({ config, onChange }: PatternFiltersProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-3 bg-gray-800/50 rounded-xl border border-gray-700"
    >
      <div className="flex flex-wrap items-center gap-3">
        {/* Filter Icon */}
        <div className="flex items-center gap-2 text-blue-400">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium hidden sm:inline">Filters</span>
        </div>

        {/* Category Filter */}
        <select
          id="pattern-category"
          aria-label="Pattern Category Filter"
          value={config.categories[0]}
          onChange={(e) => onChange({ ...config, categories: [e.target.value] })}
          className="px-3 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer hover:border-gray-600"
        >
          {CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>

        {/* Strength Filter */}
        <select
          id="pattern-strength"
          aria-label="Pattern Strength Filter"
          value={config.strengthFilter}
          onChange={(e) => onChange({ ...config, strengthFilter: e.target.value as any })}
          className="px-3 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer hover:border-gray-600"
        >
          <option value="all">All Strengths</option>
          <option value="strong">Strong</option>
          <option value="medium">Medium</option>
          <option value="weak">Weak</option>
        </select>

        {/* Type Filter */}
        <select
          id="pattern-type"
          aria-label="Pattern Type Filter"
          value={config.typeFilter}
          onChange={(e) => onChange({ ...config, typeFilter: e.target.value as any })}
          className="px-3 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer hover:border-gray-600"
        >
          <option value="all">All Types</option>
          <option value="bullish">Bullish</option>
          <option value="bearish">Bearish</option>
          <option value="neutral">Neutral</option>
        </select>

        {/* Reset Button */}
        <motion.button
          onClick={() => onChange({
            categories: ['all'],
            minConfidence: 80,
            strengthFilter: 'all',
            typeFilter: 'all',
          })}
          aria-label="Reset all pattern filters"
          className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors ml-auto"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Reset
        </motion.button>
      </div>
    </motion.div>
  );
}
