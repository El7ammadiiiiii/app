'use client';

/**
 * Divergence Statistics Dashboard
 * لوحة إحصائيات الدايفرجنس
 * 
 * Comprehensive statistics and visualization of divergence scan results
 * إحصائيات شاملة وتصور لنتائج مسح الدايفرجنس
 */

import React from 'react';
import { DivergenceResult } from '@/lib/scanners/advanced-divergence-detector';
import { getDivergenceTypeById, SignalQuality } from '@/lib/scanners/divergence-types-catalog';

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

interface DivergenceStatsDashboardProps
{
  results: DivergenceResult[];
  isScanning?: boolean;
  scanProgress?: number;
}

export function DivergenceStatsDashboard ( {
  results,
  isScanning = false,
  scanProgress = 0
}: DivergenceStatsDashboardProps )
{

  // Calculate statistics
  const totalResults = results.length;
  const bullishCount = results.filter( r => r.direction === 'bullish' ).length;
  const bearishCount = results.filter( r => r.direction === 'bearish' ).length;
  const avgScore = totalResults > 0
    ? results.reduce( ( sum, r ) => sum + r.score, 0 ) / totalResults
    : 0;

  // Quality distribution
  const qualityDistribution: Record<string, number> = {
    'A+': 0,
    'A': 0,
    'B': 0,
    'C': 0,
    'D': 0,
    'F': 0
  };

  results.forEach( result =>
  {
    const typeMetadata = getDivergenceTypeById( result.type );
    if ( typeMetadata )
    {
      qualityDistribution[ typeMetadata.quality ] = ( qualityDistribution[ typeMetadata.quality ] || 0 ) + 1;
    }
  } );

  // Reliability breakdown - ✅ عرض High و Medium فقط
  const highReliability = results.filter( r =>
  {
    const meta = getDivergenceTypeById( r.type );
    return meta && meta.reliability >= 80;
  } ).length;

  const mediumReliability = results.filter( r =>
  {
    const meta = getDivergenceTypeById( r.type );
    return meta && meta.reliability >= 60 && meta.reliability < 80;
  } ).length;

  // Top indicators
  const indicatorCounts: Record<string, number> = {};
  results.forEach( result =>
  {
    indicatorCounts[ result.indicator ] = ( indicatorCounts[ result.indicator ] || 0 ) + 1;
  } );

  const topIndicators = Object.entries( indicatorCounts )
    .sort( ( a, b ) => b[ 1 ] - a[ 1 ] )
    .slice( 0, 5 );

  return (
    <div className="space-y-4">
      {/* Scan Progress */ }
      { isScanning && (
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-cyan-400">جاري المسح...</span>
            <span className="text-sm font-bold text-cyan-400">{ scanProgress }%</span>
          </div>
          <div className="w-full bg-[#1a4a4d] rounded-full h-2 overflow-hidden">
            <div
              className={ `bg-cyan-500 h-full transition-all duration-300 ${ getWidthClass( scanProgress ) }` }
            />
          </div>
        </div>
      ) }

      {/* Main Stats Cards */ }
      <div className="grid grid-cols-4 gap-2">
        {/* Total Results */ }
        <div className="template-secondary rounded-lg p-2.5 flex flex-col items-center justify-center text-center">
          <div className="text-xl font-bold text-white mb-0.5">{ totalResults }</div>
          <div className="text-[10px] text-gray-400">إجمالي النتائج</div>
        </div>

        {/* Bullish Count */ }
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2.5 flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xl font-bold text-green-400">{ bullishCount }</span>
            <span className="text-green-400 text-sm">📈</span>
          </div>
          <div className="text-[10px] text-green-300">إشارات صاعدة</div>
        </div>

        {/* Bearish Count */ }
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2.5 flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xl font-bold text-red-400">{ bearishCount }</span>
            <span className="text-red-400 text-sm">📉</span>
          </div>
          <div className="text-[10px] text-red-300">إشارات هابطة</div>
        </div>

        {/* Average Score */ }
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-2.5 flex flex-col items-center justify-center text-center">
          <div className="text-xl font-bold text-purple-400 mb-0.5">{ avgScore.toFixed( 1 ) }</div>
          <div className="text-[10px] text-purple-300">متوسط النقاط</div>
        </div>
      </div>
    </div>
  );
}

export default DivergenceStatsDashboard;
