'use client';

/**
 * 📊 Divergence Grid Component - شبكة الدايفرجنس
 * 
 * عرض نتائج البحث في شبكة أو قائمة مع دعم التقسيم والترتيب
 * Display scan results in grid or list with pagination and sorting
 * 
 * @author CCWAYS Team
 * @version 2.3.0
 * @created 2026-01-19
 */

import React, { useMemo, useCallback } from 'react';
import { DivergenceResult } from '@/lib/scanners/advanced-divergence-detector';
import { DivergenceCard } from './DivergenceCard';
import { ScanProgress } from '@/lib/scanners/divergence-scanner';

const WIDTH_CLASSES = [
  'w-0',
  'w-[5%]',
  'w-[10%]',
  'w-[15%]',
  'w-[20%]',
  'w-[25%]',
  'w-[30%]',
  'w-[35%]',
  'w-[40%]',
  'w-[45%]',
  'w-[50%]',
  'w-[55%]',
  'w-[60%]',
  'w-[65%]',
  'w-[70%]',
  'w-[75%]',
  'w-[80%]',
  'w-[85%]',
  'w-[90%]',
  'w-[95%]',
  'w-full',
];

const getWidthClass = ( percent: number ) =>
{
  const clamped = Math.min( 100, Math.max( 0, percent ) );
  const index = Math.min( 20, Math.max( 0, Math.round( clamped / 5 ) ) );
  return WIDTH_CLASSES[ index ];
};

// ============================================================================
// 📊 TYPES
// ============================================================================

export type SortField = 'score' | 'confidence' | 'timestamp' | 'symbol' | 'type';
export type SortOrder = 'asc' | 'desc';
export type ViewMode = 'grid' | 'list';

interface DivergenceGridProps
{
  results: DivergenceResult[];
  favorites: Set<string>;
  onToggleFavorite: ( id: string ) => void;
  onDownload: ( divergence: DivergenceResult ) => void;
  onExpand?: ( divergence: DivergenceResult ) => void;
  isScanning: boolean;
  progress?: ScanProgress;
  error?: string;
  // Controlled state from parent
  viewMode: ViewMode;
  sortField: SortField;
  sortOrder: SortOrder;
  itemsPerPage: number;
  currentPage: number;
  onPageChange: ( page: number ) => void;
}

// ============================================================================
// 🎨 COMPONENT
// ============================================================================

export function DivergenceGrid ( {
  results,
  favorites,
  onToggleFavorite,
  onDownload,
  onExpand,
  isScanning,
  progress,
  error,
  viewMode,
  sortField,
  sortOrder,
  itemsPerPage,
  currentPage,
  onPageChange
}: DivergenceGridProps )
{

  // Sort results
  const sortedResults = useMemo( () =>
  {
    const sorted = [ ...results ].sort( ( a, b ) =>
    {
      let comparison = 0;

      switch ( sortField )
      {
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
          comparison = a.symbol.localeCompare( b.symbol );
          break;
        case 'type':
          comparison = a.type.localeCompare( b.type );
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    } );

    return sorted;
  }, [ results, sortField, sortOrder ] );

  // Paginate results
  const paginatedResults = useMemo( () =>
  {
    const start = ( currentPage - 1 ) * itemsPerPage;
    return sortedResults.slice( start, start + itemsPerPage );
  }, [ sortedResults, currentPage, itemsPerPage ] );

  // Calculate total pages
  const totalPages = Math.ceil( sortedResults.length / itemsPerPage );

  // Handle page change
  const handlePageChange = useCallback( ( page: number ) =>
  {
    onPageChange( Math.max( 1, Math.min( page, totalPages ) ) );
  }, [ totalPages, onPageChange ] );

  // Progress bar
  const ProgressBar = useMemo( () =>
  {
    if ( !isScanning || !progress ) return null;

    return (
      <div className="rounded-xl p-4 mb-4 border border-[#2b403d]/70 ring-1 ring-[#2b403d]/30 overlay-dropdown backdrop-blur-xl bg-transparent">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-300">Scanning...</span>
          <span className="text-sm text-cyan-400">{ progress.percentage }%</span>
        </div>
        <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
          <div
            className={ `h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300 ${ getWidthClass( progress.percentage ) }` }
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span className="truncate max-w-[200px]">{ progress.current }</span>
          <span>
            { progress.completed }/{ progress.total }
          </span>
        </div>
      </div>
    );
  }, [ isScanning, progress ] );

  // Empty state
  if ( !isScanning && results.length === 0 )
  {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-white/[0.05] flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 1.5 } d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-300 mb-2">No divergences found</h3>
        <p className="text-gray-500 text-sm max-w-md">
          Detected divergences will appear here automatically.
        </p>
      </div>
    );
  }

  // Error state
  if ( error )
  {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 2 } d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-sm text-red-300">{ error }</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress */ }
      { ProgressBar }

      {/* Results Grid/List */ }
      <div className={ viewMode === 'grid'
        ? 'grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-4'
        : 'space-y-3'
      }>
        { paginatedResults.map( ( divergence, index ) => (
          <DivergenceCard
            key={ `${ divergence.id }-${ divergence.symbol }-${ divergence.timestamp }-${ index }` }
            divergence={ divergence }
            isFavorite={ favorites.has( divergence.id ) }
            onToggleFavorite={ onToggleFavorite }
            onDownload={ onDownload }
            onExpand={ onExpand }
            showMiniChart={ viewMode === 'grid' }
            compact={ viewMode === 'list' }
          />
        ) ) }
      </div>

      {/* Pagination */ }
      { totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-8">
          <button
            type="button"
            aria-label="Go to first page"
            onClick={ () => handlePageChange( 1 ) }
            disabled={ currentPage === 1 }
            className="p-2 rounded-lg bg-white/[0.05] text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 2 } d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>

          <button
            type="button"
            aria-label="Go to previous page"
            onClick={ () => handlePageChange( currentPage - 1 ) }
            disabled={ currentPage === 1 }
            className="p-2 rounded-lg bg-white/[0.05] text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 2 } d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex items-center gap-1">
            { Array.from( { length: Math.min( 5, totalPages ) }, ( _, i ) =>
            {
              let pageNum: number;
              if ( totalPages <= 5 )
              {
                pageNum = i + 1;
              } else if ( currentPage <= 3 )
              {
                pageNum = i + 1;
              } else if ( currentPage >= totalPages - 2 )
              {
                pageNum = totalPages - 4 + i;
              } else
              {
                pageNum = currentPage - 2 + i;
              }

              return (
                <button
                  type="button"
                  key={ pageNum }
                  onClick={ () => handlePageChange( pageNum ) }
                  className={ `w-9 h-9 rounded-lg text-sm font-bold transition-all ${ currentPage === pageNum
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                      : 'bg-white/[0.05] text-gray-400 hover:text-white border border-transparent hover:border-white/10'
                    }` }
                >
                  { pageNum }
                </button>
              );
            } ) }
          </div>

          <button
            type="button"
            aria-label="Go to next page"
            onClick={ () => handlePageChange( currentPage + 1 ) }
            disabled={ currentPage === totalPages }
            className="p-2 rounded-lg bg-white/[0.05] text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 2 } d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            type="button"
            aria-label="Go to last page"
            onClick={ () => handlePageChange( totalPages ) }
            disabled={ currentPage === totalPages }
            className="p-2 rounded-lg bg-white/[0.05] text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 2 } d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      ) }
    </div>
  );
}

export default DivergenceGrid;
