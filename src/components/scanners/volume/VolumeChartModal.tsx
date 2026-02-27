'use client';

/**
 * 📊 Volume Chart Modal - مودال الرسم البياني للفوليوم
 * 
 * عرض الشموع والفوليوم بشكل بياني تفاعلي
 * Display candlesticks and volume in an interactive chart
 * 
 * @author CCWAYS Team
 * @version 1.0.0
 * @created 2026-01-01
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactECharts from 'echarts-for-react';
import
{
  VolumeResult,
  SIGNAL_COLORS,
  formatVolume,
  formatUSD,
  formatPercent,
} from '@/lib/scanners/volume-scanner';

// ============================================================================
// 📊 TYPES
// ============================================================================

interface VolumeChartModalProps
{
  isOpen: boolean;
  onClose: () => void;
  result: VolumeResult | null;
}

// ============================================================================
// 🎨 COMPONENT
// ============================================================================

export function VolumeChartModal ( { isOpen, onClose, result }: VolumeChartModalProps )
{
  const signalBadgeClass = useMemo( () =>
  {
    if ( !result ) return 'signal-badge';
    const key = String( result.signalStrength ).toLowerCase().replace( /\s+/g, '-' );
    return `signal-badge-${ key }`;
  }, [ result?.signalStrength ] );

  const signalBadgeStyle = useMemo( () =>
  {
    if ( !result ) return '';
    const color = SIGNAL_COLORS[ result.signalStrength ];
    return `.${ signalBadgeClass }{background-color:${ color }20;color:${ color };}`;
  }, [ result, signalBadgeClass ] );

  // خيارات الرسم البياني
  const chartOption = useMemo( () =>
  {
    if ( !result?.candles || result.candles.length === 0 ) return null;

    const candles = result.candles;
    const avgVolume = result.metrics.averageVolumeSMA;

    // تحضير البيانات
    const categoryData = candles.map( c =>
      new Date( c.timestamp ).toLocaleTimeString( 'ar-SA', { hour: '2-digit', minute: '2-digit' } )
    );

    const candleData = candles.map( c => [ c.open, c.close, c.low, c.high ] );

    const volumeData = candles.map( c => ( {
      value: c.volume,
      itemStyle: {
        color: c.close >= c.open
          ? 'rgba(38, 166, 154, 0.8)'
          : 'rgba(239, 83, 80, 0.8)'
      }
    } ) );

    // خط المتوسط
    const avgLine = candles.map( () => avgVolume );

    return {
      backgroundColor: 'transparent',
      animation: true,
      grid: [
        { left: '3%', right: '3%', top: '8%', height: '55%' },
        { left: '3%', right: '3%', top: '70%', height: '22%' }
      ],
      xAxis: [
        {
          type: 'category',
          data: categoryData,
          axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
          axisTick: { show: false },
          axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
          splitLine: { show: false }
        },
        {
          type: 'category',
          gridIndex: 1,
          data: categoryData,
          axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
          axisTick: { show: false },
          axisLabel: { show: false },
          splitLine: { show: false }
        }
      ],
      yAxis: [
        {
          scale: true,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
          splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
        },
        {
          scale: true,
          gridIndex: 1,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            color: 'rgba(255,255,255,0.5)',
            fontSize: 10,
            formatter: ( value: number ) => formatVolume( value )
          },
          splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
        }
      ],
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        backgroundColor: 'rgba(20, 25, 30, 0.95)',
        borderColor: 'rgba(255,255,255,0.1)',
        textStyle: { color: '#fff', fontSize: 12 },
        formatter: ( params: any ) =>
        {
          const candle = params.find( ( p: any ) => p.seriesName === 'Candle' );
          const volume = params.find( ( p: any ) => p.seriesName === 'Volume' );

          if ( !candle ) return '';

          const [ open, close, low, high ] = candle.data;
          const change = ( ( close - open ) / open * 100 ).toFixed( 2 );
          const changeColor = close >= open ? '#26a69a' : '#ef5350';

          return `
            <div style="padding: 8px;">
              <div style="font-weight: bold; margin-bottom: 8px;">${ result.symbol }</div>
              <div>الافتتاح: <span style="color: #fff;">${ open.toFixed( 6 ) }</span></div>
              <div>الإغلاق: <span style="color: ${ changeColor };">${ close.toFixed( 6 ) }</span></div>
              <div>الأعلى: <span style="color: #26a69a;">${ high.toFixed( 6 ) }</span></div>
              <div>الأدنى: <span style="color: #ef5350;">${ low.toFixed( 6 ) }</span></div>
              <div>التغير: <span style="color: ${ changeColor };">${ change }%</span></div>
              ${ volume ? `<div style="margin-top: 8px;">الفوليوم: <span style="color: #06b6d4;">${ formatVolume( volume.data.value || volume.data ) }</span></div>` : '' }
            </div>
          `;
        }
      },
      series: [
        {
          name: 'Candle',
          type: 'candlestick',
          data: candleData,
          itemStyle: {
            color: '#26a69a',
            color0: '#ef5350',
            borderColor: '#26a69a',
            borderColor0: '#ef5350'
          }
        },
        {
          name: 'Volume',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: volumeData,
          barWidth: '60%'
        },
        {
          name: 'Avg Volume',
          type: 'line',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: avgLine,
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color: '#f59e0b',
            width: 1,
            type: 'dashed'
          }
        }
      ],
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: [ 0, 1 ],
          start: 50,
          end: 100
        }
      ]
    };
  }, [ result ] );

  if ( !result ) return null;

  return (
    <AnimatePresence>
      { isOpen && (
        <>
          {/* Backdrop */ }
          <motion.div
            initial={ { opacity: 0 } }
            animate={ { opacity: 1 } }
            exit={ { opacity: 0 } }
            onClick={ onClose }
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />

          {/* Modal */ }
          <motion.div
            initial={ { opacity: 0, scale: 0.95, y: 20 } }
            animate={ { opacity: 1, scale: 1, y: 0 } }
            exit={ { opacity: 0, scale: 0.95, y: 20 } }
            className="fixed inset-4 md:inset-10 lg:inset-20 z-50 flex flex-col
                     rounded-2xl shadow-2xl overflow-hidden pair-template"
          >
            <style>{ signalBadgeStyle }</style>
            {/* Header */ }
            <div className="flex items-center justify-between p-4 pair-template-header">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-white">{ result.symbol }</h2>
                <span
                  className={ `px-2 py-0.5 rounded-full text-xs font-medium ${ signalBadgeClass }` }
                >
                  { result.signalStrength }
                </span>
                <span className="text-sm text-gray-400">{ result.exchange } • { result.timeframe }</span>
              </div>

              <button
                onClick={ onClose }
                className="p-2 rounded-lg bg-white/[0.05] text-gray-400 hover:text-white hover:bg-white/[0.1] transition-all"
                aria-label="إغلاق"
                title="إغلاق"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 2 } d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Stats Bar */ }
            <div className="flex flex-wrap gap-4 p-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm">السعر:</span>
                <span className="text-white font-bold">
                  ${ ( result.metrics.currentPrice || 0 ) < 1
                    ? ( result.metrics.currentPrice || 0 ).toFixed( 6 )
                    : ( result.metrics.currentPrice || 0 ).toFixed( 2 ) }
                </span>
                <span className={ `text-sm ${ ( result.metrics.priceChange24h || 0 ) >= 0 ? 'text-green-400' : 'text-red-400' }` }>
                  { formatPercent( result.metrics.priceChange24h || 0 ) }
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm">Z-Score:</span>
                <span className={ `font-bold ${ result.metrics.zScore >= 3 ? 'text-red-400' :
                  result.metrics.zScore >= 2.5 ? 'text-orange-400' :
                    result.metrics.zScore >= 2 ? 'text-yellow-400' : 'text-green-400'
                  }` }>
                  { result.metrics.zScore.toFixed( 2 ) }
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm">نسبة الفوليوم:</span>
                <span className="text-cyan-400 font-bold">{ result.metrics.volumeRatio.toFixed( 2 ) }x</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm">VROC:</span>
                <span className={ `font-bold ${ result.metrics.vrocPercent >= 0 ? 'text-green-400' : 'text-red-400' }` }>
                  { formatPercent( result.metrics.vrocPercent ) }
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm">الفوليوم:</span>
                <span className="text-white font-bold">{ formatUSD( result.metrics.volumeUSD ) }</span>
              </div>

              { result.advanced && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-sm">MFI:</span>
                    <span className={ `font-bold ${ result.advanced.mfi > 80 ? 'text-red-400' :
                      result.advanced.mfi < 20 ? 'text-green-400' : 'text-white'
                      }` }>
                      { result.advanced.mfi.toFixed( 1 ) }
                    </span>
                  </div>

                  { result.advanced.divergence.divergenceType && (
                    <div className={ `px-2 py-0.5 rounded-full text-xs font-medium ${ result.advanced.divergence.divergenceType === 'BULLISH'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                      }` }>
                      { result.advanced.divergence.divergenceType === 'BULLISH' ? '📈 تباعد صعودي' : '📉 تباعد هبوطي' }
                    </div>
                  ) }
                </>
              ) }
            </div>

            {/* Chart */ }
            <div className="flex-1 p-4">
              <div className="h-full w-full rounded-xl pair-template-chart p-2">
                { chartOption ? (
                  <ReactECharts
                    option={ chartOption }
                    className="h-full w-full"
                    opts={ { renderer: 'canvas' } }
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    لا توجد بيانات للعرض
                  </div>
                ) }
              </div>
            </div>

            {/* Footer */ }
            <div className="flex items-center justify-between p-4 pair-template-footer">
              <div className="text-xs text-gray-500">
                آخر تحديث: { result.scannedAt ? new Date( result.scannedAt ).toLocaleString( 'ar-SA' ) : 'N/A' }
              </div>

              <div className="flex gap-2">
                <button className="px-4 py-2 rounded-lg bg-white/[0.05] text-gray-300 hover:bg-white/[0.1] transition-all text-sm">
                  إضافة للمفضلة
                </button>
                <button className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-all text-sm">
                  تعيين تنبيه
                </button>
              </div>
            </div>
          </motion.div>
        </>
      ) }
    </AnimatePresence>
  );
}
