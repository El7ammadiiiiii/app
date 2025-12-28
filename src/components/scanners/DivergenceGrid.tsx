'use client';

/**
 * 📊 Divergence Grid Component - شبكة الدايفرجنس
 * 
 * عرض نتائج البحث في شبكة أو قائمة مع دعم التقسيم والترتيب
 * Display scan results in grid or list with pagination and sorting
 * 
 * @author Nexus Elite Team
 * @version 2.0.0
 * @created 2025-12-14
 */

import React, { useState, useMemo, useCallback } from 'react';
import { DivergenceResult } from '@/lib/scanners/advanced-divergence-detector';
import { DivergenceCard } from './DivergenceCard';
import { ScanProgress } from '@/lib/scanners/divergence-scanner';

// ============================================================================
// 📊 TYPES
// ============================================================================

type SortField = 'score' | 'confidence' | 'timestamp' | 'symbol' | 'type';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';

interface DivergenceGridProps {
  results: DivergenceResult[];
  favorites: Set<string>;
  onToggleFavorite: (id: string) => void;
  onDownload: (divergence: DivergenceResult) => void;
  onExpand?: (divergence: DivergenceResult) => void;
  isScanning: boolean;
  progress?: ScanProgress;
  error?: string;
}

// ============================================================================
// 🎨 COMPONENT
// ============================================================================

export function DivergenceGrid({
  results,
  favorites,
  onToggleFavorite,
  onDownload,
  onExpand,
  isScanning,
  progress,
  error
}: DivergenceGridProps) {
  // State
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortField, setSortField] = useState<SortField>('score');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  // Sort results
  const sortedResults = useMemo(() => {
    const sorted = [...results].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'score':
          comparison = a.score - b.score;
          break;
        case 'confidence':
          comparison = a.confidence - b.confidence;
          break;
        case 'timestamp':
          comparison = a.timestamp - b.timestamp;
          break;
        case 'symbol':
          comparison = a.symbol.localeCompare(b.symbol);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });
    
    return sorted;
  }, [results, sortField, sortOrder]);

  // Paginate results
  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedResults.slice(start, start + itemsPerPage);
  }, [sortedResults, currentPage, itemsPerPage]);

  // Calculate total pages
  const totalPages = Math.ceil(sortedResults.length / itemsPerPage);

  // Handle sort
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  }, [sortField]);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  // Progress bar
  const ProgressBar = useMemo(() => {
    if (!isScanning || !progress) return null;
    
    return (
      <div className="rounded-xl p-4 mb-4 border border-white/[0.08]" style={{ background: 'rgba(0, 22, 46, 0.5)' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-300">جاري الفحص...</span>
          <span className="text-sm text-cyan-400">{progress.percentage}%</span>
        </div>
        <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span className="truncate max-w-[200px]">{progress.current}</span>
          <span>
            {progress.completed}/{progress.total} • 
            ~{Math.round(progress.estimatedTimeRemaining / 1000)}ث متبقية
          </span>
        </div>
      </div>
    );
  }, [isScanning, progress]);

  // Empty state
  if (!isScanning && results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-white/[0.05] flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-300 mb-2">لم يتم العثور على دايفرجنس</h3>
        <p className="text-gray-500 text-sm max-w-md">
          ابدأ الفحص للكشف عن الدايفرجنس عبر عدة منصات وأزواج وإطارات زمنية.
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-sm text-red-300">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      {ProgressBar}
      
      {/* Toolbar */}
      <div className="rounded-xl p-3 border border-white/[0.08]" style={{ background: 'rgba(0, 22, 46, 0.5)' }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Left: Results count and view toggle */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">
              <span className="text-white font-medium">{results.length}</span> دايفرجنس تم إيجاده
            </span>
            
            {/* View Mode Toggle */}
            <div className="flex items-center bg-white/[0.05] rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === 'grid' 
                    ? 'bg-white/[0.1] text-white' 
                    : 'text-gray-500 hover:text-gray-300'
                }`}
                title="عرض شبكي"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === 'list' 
                    ? 'bg-white/[0.1] text-white' 
                    : 'text-gray-500 hover:text-gray-300'
                }`}
                title="عرض قائمة"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Right: Sort and items per page */}
          <div className="flex items-center gap-3">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">ترتيب:</span>
              <select
                value={sortField}
                onChange={(e) => handleSort(e.target.value as SortField)}
                className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-1 text-sm text-gray-300 focus:outline-none focus:border-cyan-500"
              >
                <option value="score">النقاط</option>
                <option value="confidence">الثقة</option>
                <option value="timestamp">الوقت</option>
                <option value="symbol">الزوج</option>
                <option value="type">النوع</option>
              </select>
              
              <button
                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                className="p-1.5 rounded-lg bg-white/[0.05] text-gray-400 hover:text-gray-200 transition-all"
                title={sortOrder === 'desc' ? 'تنازلي' : 'تصاعدي'}
              >
                <svg 
                  className={`w-4 h-4 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            
            {/* Items per page */}
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(parseInt(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-[#1a4a4d] border border-[#1a4a4d] rounded-lg px-2 py-1 text-sm text-gray-300 focus:outline-none focus:border-cyan-500"
            >
              <option value={8}>8</option>
              <option value={12}>12</option>
              <option value={24}>24</option>
              <option value={48}>48</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Results Grid/List */}
      <div className={viewMode === 'grid' 
        ? 'grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-4'
        : 'space-y-3'
      }>
        {paginatedResults.map((divergence) => (
          <DivergenceCard
            key={divergence.id}
            divergence={divergence}
            isFavorite={favorites.has(divergence.id)}
            onToggleFavorite={onToggleFavorite}
            onDownload={onDownload}
            onExpand={onExpand}
            showMiniChart={viewMode === 'grid'}
            compact={viewMode === 'list'}
          />
        ))}
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-4">
          <button
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            className="p-2 rounded-lg bg-white/[0.05] text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
          
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 rounded-lg bg-white/[0.05] text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                    currentPage === pageNum
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                      : 'bg-white/[0.05] text-gray-400 hover:text-white'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg bg-white/[0.05] text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg bg-white/[0.05] text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

export default DivergenceGrid;
