'use client';

/**
 * 📊 Pattern Grid Component
 * 
 * Displays pattern cards in a responsive grid with pagination.
 * 
 * @author CCWAYS Team
 * @version 1.0.0
 */

import React, { useMemo, useCallback } from 'react';
import { PatternCard, type PatternCardData } from './PatternCard';

// ============================================================================
// 📊 TYPES
// ============================================================================

export type SortField = 'symbol';
export type SortOrder = 'asc' | 'desc';

interface PatternGridProps {
  results: PatternCardData[];
  exchange: string;
  timeframe: string;
  isLoading: boolean;
  error?: string | null;
  itemsPerPage: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

// ============================================================================
// 🎨 COMPONENT
// ============================================================================

export function PatternGrid({
  results,
  exchange,
  timeframe,
  isLoading,
  error,
  itemsPerPage,
  currentPage,
  onPageChange,
}: PatternGridProps) {

  // Paginate results
  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return results.slice(start, start + itemsPerPage);
  }, [results, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(results.length / itemsPerPage);

  const handlePageChange = useCallback((page: number) => {
    onPageChange(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages, onPageChange]);

  // Loading state
  if (isLoading && results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-full border-2 border-cyan-500/30 border-t-cyan-500 animate-spin mb-4" />
        <h3 className="text-lg font-semibold text-gray-300 mb-2">Loading symbols...</h3>
        <p className="text-gray-500 text-sm">Fetching symbol list</p>
      </div>
    );
  }

  // Empty state
  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-white/[0.05] flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-300 mb-2">No symbols available</h3>
        <p className="text-gray-500 text-sm max-w-md">
          Chart patterns will appear here when backend scanner writes results.
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
      {/* Results Counter */}
      <div className="text-sm text-gray-400">
        Showing {paginatedResults.length} of {results.length} detected symbols
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginatedResults.map((item) => (
          <PatternCard
            key={`${item.symbol}-${exchange}-${timeframe}`}
            data={{
              symbol: item.symbol,
              exchange,
              timeframe,
              pattern: item.pattern,
            }}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-8">
          <button
            type="button"
            aria-label="First page"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            className="p-2 rounded-lg bg-white/[0.05] text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>

          <button
            type="button"
            aria-label="Previous"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 rounded-lg bg-white/[0.05] text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) pageNum = i + 1;
              else if (currentPage <= 3) pageNum = i + 1;
              else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = currentPage - 2 + i;

              return (
                <button
                  type="button"
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${
                    currentPage === pageNum
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                      : 'bg-white/[0.05] text-gray-400 hover:text-white border border-transparent hover:border-white/10'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            aria-label="Next"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg bg-white/[0.05] text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            type="button"
            aria-label="Last page"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg bg-white/[0.05] text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

export default PatternGrid;
