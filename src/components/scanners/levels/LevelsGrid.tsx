'use client';

/**
 * 📊 Levels Grid Component - شبكة المستويات
 * 
 * عرض نتائج البحث في شبكة مع دعم التقسيم والترتيب
 * Display scan results in grid with pagination and sorting
 * 
 * @author CCWAYS Team
 * @version 1.0.0
 * @created 2025-12-31
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LevelResult } from '@/lib/scanners/levels-detector';
import { LevelsCard } from './LevelsCard';
import { ScanProgress } from '@/lib/scanners/levels-scanner';

// ============================================================================
// 📊 TYPES
// ============================================================================

type SortField = 'symbol' | 'distance' | 'strength' | 'time';
type SortOrder = 'asc' | 'desc';

interface LevelsGridProps
{
  results: LevelResult[];
  favorites: Set<string>;
  onToggleFavorite: ( id: string ) => void;
  onExpand: ( result: LevelResult ) => void;
  isScanning: boolean;
  progress?: ScanProgress;
  error?: string;
  toolbarControls?: React.ReactNode;
}

// ============================================================================
// 🎨 COMPONENT
// ============================================================================

export function LevelsGrid ( {
  results,
  favorites,
  onToggleFavorite,
  onExpand,
  isScanning,
  progress,
  error,
  toolbarControls,
}: LevelsGridProps )
{
  const WIDTH_CLASSES: Record<number, string> = {
    0: 'w-[0%]',
    5: 'w-[5%]',
    10: 'w-[10%]',
    15: 'w-[15%]',
    20: 'w-[20%]',
    25: 'w-[25%]',
    30: 'w-[30%]',
    35: 'w-[35%]',
    40: 'w-[40%]',
    45: 'w-[45%]',
    50: 'w-[50%]',
    55: 'w-[55%]',
    60: 'w-[60%]',
    65: 'w-[65%]',
    70: 'w-[70%]',
    75: 'w-[75%]',
    80: 'w-[80%]',
    85: 'w-[85%]',
    90: 'w-[90%]',
    95: 'w-[95%]',
    100: 'w-[100%]'
  };

  const getProgressWidthClass = ( percent: number ) =>
  {
    const clamped = Math.max( 0, Math.min( 100, percent ) );
    const step = Math.round( clamped / 5 ) * 5;
    return WIDTH_CLASSES[ step ] || 'w-[0%]';
  };
  // State
  const [ sortField, setSortField ] = useState<SortField>( 'distance' );
  const [ sortOrder, setSortOrder ] = useState<SortOrder>( 'asc' );
  const [ currentPage, setCurrentPage ] = useState( 1 );
  const [ itemsPerPage, setItemsPerPage ] = useState( 12 ); // 12 أو 24 قالب بالصفحة

  // ترتيب النتائج
  const sortedResults = useMemo( () =>
  {
    const sorted = [ ...results ].sort( ( a, b ) =>
    {
      let comparison = 0;

      switch ( sortField )
      {
        case 'symbol':
          comparison = a.symbol.localeCompare( b.symbol );
          break;
        case 'distance':
          const distA = Math.min(
            a.distanceToNearestResistance ?? Infinity,
            a.distanceToNearestSupport ?? Infinity
          );
          const distB = Math.min(
            b.distanceToNearestResistance ?? Infinity,
            b.distanceToNearestSupport ?? Infinity
          );
          comparison = distA - distB;
          break;
        case 'strength':
          const strengthA = Math.max( ...( a.levels.map( l => l.strength ) || [ 0 ] ) );
          const strengthB = Math.max( ...( b.levels.map( l => l.strength ) || [ 0 ] ) );
          comparison = strengthA - strengthB;
          break;
        case 'time':
          comparison = a.scannedAt - b.scannedAt;
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    } );

    return sorted;
  }, [ results, sortField, sortOrder ] );

  // تقسيم النتائج
  const paginatedResults = useMemo( () =>
  {
    const start = ( currentPage - 1 ) * itemsPerPage;
    return sortedResults.slice( start, start + itemsPerPage );
  }, [ sortedResults, currentPage ] );

  // حساب عدد الصفحات
  const totalPages = Math.ceil( sortedResults.length / itemsPerPage );

  // تغيير الترتيب
  const handleSort = useCallback( ( field: SortField ) =>
  {
    if ( sortField === field )
    {
      setSortOrder( prev => prev === 'desc' ? 'asc' : 'desc' );
    } else
    {
      setSortField( field );
      setSortOrder( field === 'distance' ? 'asc' : 'desc' );
    }
    setCurrentPage( 1 );
  }, [ sortField ] );

  // تغيير الصفحة
  const handlePageChange = useCallback( ( page: number ) =>
  {
    setCurrentPage( Math.max( 1, Math.min( page, totalPages ) ) );
  }, [ totalPages ] );

  // شريط التقدم
  const ProgressBar = useMemo( () =>
  {
    if ( !isScanning || !progress ) return null;

    return (
      <div className="rounded-xl p-4 mb-4 border border-white/[0.08] bg-white/[0.02]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-300">جاري الفحص...</span>
          <span className="text-sm text-cyan-400">{ progress.percentage }%</span>
        </div>
        <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
          <div
            className={ `h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300 ${ getProgressWidthClass( progress.percentage ) }` }
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span className="truncate max-w-[200px]">{ progress.current }</span>
          <span>
            { progress.completed }/{ progress.total } •
            ~{ Math.round( progress.estimatedTimeRemaining / 1000 ) }ث متبقية
          </span>
        </div>
      </div>
    );
  }, [ isScanning, progress ] );

  // حالة فارغة
  if ( !isScanning && results.length === 0 )
  {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-white/[0.05] flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 1.5 }
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-300 mb-2">لم يتم العثور على مستويات</h3>
        <p className="text-gray-500 text-sm max-w-md">
          ابدأ الفحص للكشف عن مستويات الدعم والمقاومة عبر عدة منصات وأزواج وإطارات زمنية.
        </p>
      </div>
    );
  }

  // حالة الخطأ
  if ( error )
  {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 2 }
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-sm text-red-300">{ error }</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* شريط التقدم */ }
      { ProgressBar }

      {/* شريط الأدوات - موحد ومناسب للجوال */ }
      <div className="flex items-center h-10 gap-2 px-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md overflow-x-auto">
        {/* أيقونة القائمة */ }
        <button className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-gray-400">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 2 } d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* فاصل */ }
        <div className="h-5 w-px bg-white/10" />

        {/* عدد البطاقات */ }
        <div className="relative">
          <select
            value={ itemsPerPage }
            onChange={ ( e ) => { setItemsPerPage( Number( e.target.value ) ); setCurrentPage( 1 ); } }
            className="appearance-none h-7 bg-transparent border border-white/10 rounded-lg pl-6 pr-2 text-xs text-white cursor-pointer hover:border-cyan-500/50 focus:outline-none"
          >
            <option value={ 12 } className="bg-[#1a2f2c]">12</option>
            <option value={ 24 } className="bg-[#1a2f2c]">24</option>
          </select>
          <svg className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 2 } d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* فاصل */ }
        <div className="h-5 w-px bg-white/10" />

        {/* الترتيب بالوقت */ }
        <button
          onClick={ () => handleSort( 'time' ) }
          className={ `h-7 px-2 flex items-center gap-1 rounded-lg text-xs transition-all ${ sortField === 'time'
            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
            : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
            }` }
        >
          <span>الوقت</span>
          { sortField === 'time' && (
            <svg className={ `w-3 h-3 transition-transform ${ sortOrder === 'asc' ? 'rotate-180' : '' }` } fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 2 } d="M19 9l-7 7-7-7" />
            </svg>
          ) }
        </button>

        { toolbarControls && (
          <div className="flex items-center gap-2 ms-auto">
            { toolbarControls }
          </div>
        ) }
      </div>

      {/* الشبكة - responsive grid */ }
      <div className={ `grid gap-3 ${ itemsPerPage === 12 ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-2 lg:grid-cols-4' }` }>
        <AnimatePresence mode="popLayout">
          { paginatedResults.map( ( result ) => (
            <motion.div
              key={ result.id }
              layout
              initial={ { opacity: 0, scale: 0.95 } }
              animate={ { opacity: 1, scale: 1 } }
              exit={ { opacity: 0, scale: 0.95 } }
              transition={ { duration: 0.2 } }
            >
              <LevelsCard
                result={ result }
                isFavorite={ favorites.has( result.id ) }
                onToggleFavorite={ onToggleFavorite }
                onExpand={ onExpand }
              />
            </motion.div>
          ) ) }
        </AnimatePresence>
      </div>

      {/* التقسيم (Pagination) - مطابق للصورة */ }
      { totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 pt-4 bg-[#1a2f2c]/50 rounded-lg p-2">
          {/* » الأخير */ }
          <button
            onClick={ () => handlePageChange( totalPages ) }
            disabled={ currentPage === totalPages }
            className={ `px-2 py-1.5 rounded text-sm font-bold transition-all ${ currentPage === totalPages
              ? 'text-gray-600 cursor-not-allowed'
              : 'text-gray-400 hover:text-white'
              }` }
          >
            »
          </button>

          {/* › التالي */ }
          <button
            onClick={ () => handlePageChange( currentPage + 1 ) }
            disabled={ currentPage === totalPages }
            className={ `px-2 py-1.5 rounded text-sm font-bold transition-all ${ currentPage === totalPages
              ? 'text-gray-600 cursor-not-allowed'
              : 'text-gray-400 hover:text-white'
              }` }
          >
            ›
          </button>

          {/* أرقام الصفحات - ترتيب عكسي */ }
          <div className="flex items-center gap-1">
            { Array.from( { length: Math.min( 5, totalPages ) }, ( _, i ) =>
            {
              const pageNum = Math.min( totalPages, currentPage + 2 ) - i;
              if ( pageNum < 1 ) return null;

              return (
                <button
                  key={ pageNum }
                  onClick={ () => handlePageChange( pageNum ) }
                  className={ `w-8 h-8 rounded-lg text-sm font-medium transition-all ${ currentPage === pageNum
                    ? 'bg-[#1a3a36] text-cyan-400 border border-cyan-500/50'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
                    }` }
                >
                  { pageNum }
                </button>
              );
            } ) }
          </div>

          {/* ‹ السابق */ }
          <button
            onClick={ () => handlePageChange( currentPage - 1 ) }
            disabled={ currentPage === 1 }
            className={ `px-2 py-1.5 rounded text-sm font-bold transition-all ${ currentPage === 1
              ? 'text-gray-600 cursor-not-allowed'
              : 'text-gray-400 hover:text-white'
              }` }
          >
            ‹
          </button>

          {/* « الأول */ }
          <button
            onClick={ () => handlePageChange( 1 ) }
            disabled={ currentPage === 1 }
            className={ `px-2 py-1.5 rounded text-sm font-bold transition-all ${ currentPage === 1
              ? 'text-gray-600 cursor-not-allowed'
              : 'text-gray-400 hover:text-white'
              }` }
          >
            «
          </button>
        </div>
      ) }

      {/* معلومات الصفحة */ }
      { totalPages > 1 && (
        <div className="text-center text-xs text-gray-500">
          صفحة { currentPage } من { totalPages } • عرض { paginatedResults.length } من { results.length }
        </div>
      ) }
    </div>
  );
}

export default LevelsGrid;
