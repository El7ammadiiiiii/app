'use client';

/**
 * 📊 Volume Grid - شبكة عرض نتائج الفوليوم
 * 
 * عرض النتائج في شبكة مع التصفية والترتيب
 * Display results in a grid with filtering and sorting
 * 
 * @author CCWAYS Team
 * @version 1.0.0
 * @created 2026-01-01
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VolumeResult, ScanProgress } from '@/lib/scanners/volume-scanner';
import { VolumeCard } from './VolumeCard';

// ============================================================================
// 📊 TYPES
// ============================================================================

type SortField = 'zScore' | 'volumeRatio' | 'volumeUSD' | 'vrocPercent' | 'symbol';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';

interface VolumeGridProps
{
  results: VolumeResult[];
  favorites: Set<string>;
  onToggleFavorite: ( id: string ) => void;
  onViewChart: ( result: VolumeResult ) => void;
  onSetAlert: ( result: VolumeResult ) => void;
  isScanning: boolean;
  progress?: ScanProgress;
  error?: string;
  showFavoritesOnly: boolean;
  searchQuery: string;
}

// ============================================================================
// 🎨 COMPONENT
// ============================================================================

export function VolumeGrid ( {
  results,
  favorites,
  onToggleFavorite,
  onViewChart,
  onSetAlert,
  isScanning,
  progress,
  error,
  showFavoritesOnly,
  searchQuery,
}: VolumeGridProps )
{
  const [ viewMode, setViewMode ] = useState<ViewMode>( 'grid' );
  const [ sortField, setSortField ] = useState<SortField>( 'zScore' );
  const [ sortOrder, setSortOrder ] = useState<SortOrder>( 'desc' );
  const [ currentPage, setCurrentPage ] = useState( 1 );
  const [ itemsPerPage, setItemsPerPage ] = useState( 12 );

  // تصفية وترتيب النتائج
  const filteredResults = useMemo( () =>
  {
    let filtered = [ ...results ];

    // تصفية المفضلة
    if ( showFavoritesOnly )
    {
      filtered = filtered.filter( r => favorites.has( r.id ) );
    }

    // تصفية البحث
    if ( searchQuery )
    {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter( r =>
        r.symbol.toLowerCase().includes( query ) ||
        r.exchange.toLowerCase().includes( query )
      );
    }

    // الترتيب
    filtered.sort( ( a, b ) =>
    {
      let aVal: number | string;
      let bVal: number | string;

      switch ( sortField )
      {
        case 'zScore':
          aVal = a.metrics.zScore;
          bVal = b.metrics.zScore;
          break;
        case 'volumeRatio':
          aVal = a.metrics.volumeRatio;
          bVal = b.metrics.volumeRatio;
          break;
        case 'volumeUSD':
          aVal = a.metrics.volumeUSD;
          bVal = b.metrics.volumeUSD;
          break;
        case 'vrocPercent':
          aVal = a.metrics.vrocPercent;
          bVal = b.metrics.vrocPercent;
          break;
        case 'symbol':
          aVal = a.symbol;
          bVal = b.symbol;
          break;
        default:
          return 0;
      }

      if ( typeof aVal === 'string' )
      {
        return sortOrder === 'asc'
          ? aVal.localeCompare( bVal as string )
          : ( bVal as string ).localeCompare( aVal );
      }

      return sortOrder === 'asc' ? aVal - ( bVal as number ) : ( bVal as number ) - aVal;
    } );

    return filtered;
  }, [ results, showFavoritesOnly, searchQuery, favorites, sortField, sortOrder ] );

  // ترقيم الصفحات
  const paginatedResults = useMemo( () =>
  {
    const start = ( currentPage - 1 ) * itemsPerPage;
    return filteredResults.slice( start, start + itemsPerPage );
  }, [ filteredResults, currentPage, itemsPerPage ] );

  const totalPages = Math.ceil( filteredResults.length / itemsPerPage );

  // تبديل الترتيب
  const handleSort = useCallback( ( field: SortField ) =>
  {
    if ( sortField === field )
    {
      setSortOrder( prev => prev === 'asc' ? 'desc' : 'asc' );
    } else
    {
      setSortField( field );
      setSortOrder( 'desc' );
    }
    setCurrentPage( 1 );
  }, [ sortField ] );

  // Handle page change
  const handlePageChange = useCallback( ( page: number ) =>
  {
    setCurrentPage( Math.max( 1, Math.min( page, totalPages ) ) );
  }, [ totalPages ] );

  // رسالة الخطأ
  if ( error )
  {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <svg className="w-16 h-16 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 2 }
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h3 className="text-lg font-medium text-white mb-2">حدث خطأ</h3>
        <p className="text-gray-400 text-center max-w-md">{ error }</p>
      </div>
    );
  }

  // شريط التقدم
  if ( isScanning && progress )
  {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        {/* دائرة التقدم */ }
        <div className="relative w-32 h-32 mb-6">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="56"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="8"
            />
            <circle
              cx="64"
              cy="64"
              r="56"
              fill="none"
              stroke="url(#progressGradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={ `${ progress.percentage * 3.52 } 352` }
              className="transition-all duration-300"
            />
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-white">{ progress.percentage }%</span>
            <span className="text-xs text-gray-400">جاري المسح</span>
          </div>
        </div>

        {/* معلومات التقدم */ }
        <div className="text-center space-y-2">
          <p className="text-white font-medium">{ progress.current }</p>
          <p className="text-sm text-gray-400">
            { progress.completed } / { progress.total }
            { progress.estimatedTimeRemaining > 0 && (
              <span> • يتبقى ~{ Math.ceil( progress.estimatedTimeRemaining / 1000 ) }s</span>
            ) }
          </p>
        </div>

        {/* النتائج المكتشفة */ }
        { results.length > 0 && (
          <div className="mt-6 px-4 py-2 rounded-full bg-cyan-500/20 text-cyan-400 text-sm">
            تم اكتشاف { results.length } إشارة
          </div>
        ) }
      </div>
    );
  }

  // لا توجد نتائج
  if ( filteredResults.length === 0 )
  {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <svg className="w-16 h-16 text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 2 }
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-medium text-white mb-2">لا توجد نتائج</h3>
        <p className="text-gray-400 text-center max-w-md">
          { showFavoritesOnly
            ? 'لم تقم بإضافة أي عملة للمفضلة بعد'
            : searchQuery
              ? `لم يتم العثور على نتائج لـ "${ searchQuery }"`
              : 'اضغط على زر "مسح" للبدء في البحث عن العملات ذات الفوليوم غير الطبيعي'
          }
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */ }
      <div className="rounded-xl p-3 border border-white/[0.08] bg-[#00162e]/50">
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Left: Results count and view toggle */ }
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">
              <span className="text-white font-medium">{ filteredResults.length }</span> نتيجة تم إيجادها
            </span>

            {/* View Mode Toggle */ }
            <div className="flex items-center bg-white/[0.05] rounded-lg p-0.5">
              <button
                onClick={ () => setViewMode( 'grid' ) }
                className={ `p-1.5 rounded-md transition-all ${ viewMode === 'grid'
                    ? 'bg-white/[0.1] text-white'
                    : 'text-gray-500 hover:text-gray-300'
                  }` }
                title="عرض شبكي"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 2 } d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={ () => setViewMode( 'list' ) }
                className={ `p-1.5 rounded-md transition-all ${ viewMode === 'list'
                    ? 'bg-white/[0.1] text-white'
                    : 'text-gray-500 hover:text-gray-300'
                  }` }
                title="عرض قائمة"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 2 } d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Right: Sort and items per page */ }
          <div className="flex items-center gap-3">
            {/* Sort Dropdown */ }
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">ترتيب:</span>
              <select
                value={ sortField }
                onChange={ ( e ) => handleSort( e.target.value as SortField ) }
                className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-1 text-sm text-gray-300 focus:outline-none focus:border-cyan-500"
                aria-label="ترتيب النتائج"
              >
                <option value="zScore">Z-Score</option>
                <option value="volumeRatio">نسبة الفوليوم</option>
                <option value="volumeUSD">الفوليوم ($)</option>
                <option value="vrocPercent">VROC</option>
                <option value="symbol">الرمز</option>
              </select>

              <button
                onClick={ () => setSortOrder( prev => prev === 'desc' ? 'asc' : 'desc' ) }
                className="p-1.5 rounded-lg bg-white/[0.05] text-gray-400 hover:text-gray-200 transition-all"
                title={ sortOrder === 'desc' ? 'تنازلي' : 'تصاعدي' }
              >
                <svg
                  className={ `w-4 h-4 transition-transform ${ sortOrder === 'asc' ? 'rotate-180' : '' }` }
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 2 } d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Items per page */ }
            <select
              value={ itemsPerPage }
              onChange={ ( e ) =>
              {
                setItemsPerPage( parseInt( e.target.value ) );
                setCurrentPage( 1 );
              } }
              className="bg-[#1a4a4d] border border-[#1a4a4d] rounded-lg px-2 py-1 text-sm text-gray-300 focus:outline-none focus:border-cyan-500"
              aria-label="عدد العناصر لكل صفحة"
            >
              <option value={ 8 }>8</option>
              <option value={ 12 }>12</option>
              <option value={ 24 }>24</option>
              <option value={ 48 }>48</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Grid/List */ }
      <div className={ viewMode === 'grid'
        ? 'grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-4'
        : 'space-y-3'
      }>
        <AnimatePresence mode="popLayout">
          { paginatedResults.map( ( result, index ) => (
            <motion.div
              key={ result.id }
              initial={ { opacity: 0, scale: 0.9 } }
              animate={ { opacity: 1, scale: 1 } }
              exit={ { opacity: 0, scale: 0.9 } }
              transition={ { delay: index * 0.05 } }
            >
              <VolumeCard
                result={ result }
                isFavorite={ favorites.has( result.id ) }
                onToggleFavorite={ () => onToggleFavorite( result.id ) }
                onViewChart={ () => onViewChart( result ) }
                onSetAlert={ () => onSetAlert( result ) }
                compact={ viewMode === 'list' }
              />
            </motion.div>
          ) ) }
        </AnimatePresence>
      </div>

      {/* Pagination */ }
      { totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-4">
          <button
            onClick={ () => handlePageChange( 1 ) }
            disabled={ currentPage === 1 }
            className="p-2 rounded-lg bg-white/[0.05] text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="الصفحة الأولى"
            title="الصفحة الأولى"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 2 } d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={ () => handlePageChange( currentPage - 1 ) }
            disabled={ currentPage === 1 }
            className="p-2 rounded-lg bg-white/[0.05] text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="الصفحة السابقة"
            title="الصفحة السابقة"
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
                  key={ pageNum }
                  onClick={ () => handlePageChange( pageNum ) }
                  className={ `w-8 h-8 rounded-lg text-sm font-medium transition-all ${ currentPage === pageNum
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                      : 'bg-white/[0.05] text-gray-400 hover:text-white'
                    }` }
                >
                  { pageNum }
                </button>
              );
            } ) }
          </div>

          <button
            onClick={ () => handlePageChange( currentPage + 1 ) }
            disabled={ currentPage === totalPages }
            className="p-2 rounded-lg bg-white/[0.05] text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="الصفحة التالية"
            title="الصفحة التالية"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 2 } d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            onClick={ () => handlePageChange( totalPages ) }
            disabled={ currentPage === totalPages }
            className="p-2 rounded-lg bg-white/[0.05] text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="الصفحة الأخيرة"
            title="الصفحة الأخيرة"
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
