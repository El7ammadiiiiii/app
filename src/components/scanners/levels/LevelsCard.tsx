'use client';

/**
 * 🎴 Levels Card Component - بطاقة المستويات المبسطة
 * 
 * مبني على مواصفات my-card.css
 * يعرض: الزوج + الفريم + المنصة + أزرار حفظ/مفضلة + شارت بسيط
 * عند الضغط على الشارت يفتح الشارت الموسّع مع خيارات المؤشرات
 * 
 * @author CCWAYS Team
 * @version 4.0.0 - My Card Style (Simplified)
 */

import React, { useRef, useCallback } from 'react';
import { toPng } from 'html-to-image';
import
{
  LevelResult,
  LEVEL_COLORS,
  TIMEFRAME_LABELS,
} from '@/lib/scanners/levels-detector';
import { ChartConfig } from '@/lib/ChartConfig';
import '@/styles/my-card.css';

// ============================================================================
// 📊 TYPES
// ============================================================================

interface LevelsCardProps
{
  result: LevelResult;
  isFavorite: boolean;
  onToggleFavorite: ( id: string ) => void;
  onExpand: ( result: LevelResult ) => void;
}

// ============================================================================
// 🏷️ EXCHANGE LABELS
// ============================================================================

const EXCHANGE_LABELS: Record<string, string> = {
  binance: 'Binance',
  bybit: 'Bybit',
  okx: 'OKX',
  kucoin: 'KuCoin',
  mexc: 'MEXC',
  bitget: 'Bitget',
  gate: 'Gate.io',
  htx: 'HTX',
  bingx: 'BingX',
  phemex: 'Phemex',
  cryptocom: 'Crypto.com',
  kraken: 'Kraken',
  coinbase: 'Coinbase',
};

// ============================================================================
// 🎨 MINI CHART COMPONENT - Simple Candlestick Chart (300px)
// ============================================================================

function MiniLevelsChart ( { result, onClick }: { result: LevelResult; onClick: () => void } )
{
  const { candles, levels, currentPrice } = result;
  const svgRef = useRef<SVGSVGElement>( null );

  if ( !candles || candles.length === 0 ) return null;

  // أخذ آخر 60 شمعة للعرض
  const displayCandles = candles.slice( -60 );

  // فلترة المستويات: 2 مقاومة فوق السعر + 2 دعم تحت السعر (مرتبة حسب القوة)
  const resistanceLevels = levels
    .filter( l => l.price > currentPrice )
    .sort( ( a, b ) => b.strength - a.strength )
    .slice( 0, 2 )
    .map( l => ( { ...l, type: 'resistance' as const } ) );

  const supportLevels = levels
    .filter( l => l.price < currentPrice )
    .sort( ( a, b ) => b.strength - a.strength )
    .slice( 0, 2 )
    .map( l => ( { ...l, type: 'support' as const } ) );

  const strongLevels = [ ...resistanceLevels, ...supportLevels ];

  // حساب الحدود
  const prices = displayCandles.flatMap( c => [ c.high, c.low ] );
  const levelPrices = strongLevels.map( l => l.price );
  const allPrices = [ ...prices, ...levelPrices, currentPrice ];

  const minPrice = Math.min( ...allPrices ) * 0.998;
  const maxPrice = Math.max( ...allPrices ) * 1.002;
  const priceRange = maxPrice - minPrice;

  // === الأبعاد - ارتفاع 300px ===
  const width = 320;
  const height = 300;
  const priceScaleWidth = ChartConfig.PRICE_SCALE.width;
  const padding = {
    top: ChartConfig.GRID.padding.top + 3,
    bottom: ChartConfig.GRID.padding.bottom - 2,
    left: ChartConfig.GRID.padding.left - 1,
    right: priceScaleWidth
  };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // تحويل السعر لإحداثي Y
  const priceToY = ( price: number ) =>
  {
    return ChartConfig.priceToY( price, maxPrice, priceRange, chartHeight, padding.top );
  };

  // === أبعاد الشموع ===
  const { width: candleWidth, gap: candleGap } = ChartConfig.calculateCandleWidth( chartWidth, displayCandles.length );

  // تنسيق السعر
  const formatPrice = ChartConfig.formatPrice;

  // حساب أسعار المقياس
  const priceSteps = 5;
  const priceLabels = Array.from( { length: priceSteps }, ( _, i ) =>
  {
    return maxPrice - ( priceRange * i ) / ( priceSteps - 1 );
  } );

  return (
    <div
      className="relative cursor-pointer hover:opacity-90 transition-opacity"
      onClick={ onClick }
      title="Click to expand chart"
    >
      <svg
        ref={ svgRef }
        width="100%"
        height={ height }
        viewBox={ `0 0 ${ width } ${ height }` }
        className="overflow-visible"
      >
        {/* === خطوط الشبكة الأفقية === */ }
        { priceLabels.map( ( price, idx ) => (
          <line
            key={ `grid-${ idx }` }
            x1={ padding.left }
            y1={ priceToY( price ) }
            x2={ width - padding.right }
            y2={ priceToY( price ) }
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={ 0.5 }
          />
        ) ) }

        {/* === خطوط المستويات === */ }
        { strongLevels.map( ( level, idx ) =>
        {
          const y = priceToY( level.price );
          const color = LEVEL_COLORS[ level.type ];

          return (
            <g key={ `level-${ idx }` }>
              <line
                x1={ padding.left }
                y1={ y }
                x2={ width - padding.right }
                y2={ y }
                stroke={ color }
                strokeWidth={ 0.75 }
                strokeOpacity={ 0.8 }
              />
              <rect
                x={ width - priceScaleWidth + 2 }
                y={ y - 8 }
                width={ priceScaleWidth - 4 }
                height={ 16 }
                fill={ color }
                fillOpacity={ 0.2 }
                rx={ 2 }
              />
              <text
                x={ width - priceScaleWidth / 2 }
                y={ y + 4 }
                textAnchor="middle"
                fill={ color }
                fontSize={ ChartConfig.PRICE_SCALE.text.fontSize - 1 }
                fontFamily={ ChartConfig.TEXT.fontFamily.mono }
              >
                { formatPrice( level.price ) }
              </text>
            </g>
          );
        } ) }

        {/* === الشموع === */ }
        { displayCandles.map( ( candle, idx ) =>
        {
          const x = padding.left + idx * ( candleWidth + candleGap );
          const isGreen = candle.close >= candle.open;
          const color = isGreen ? ChartConfig.CANDLE.colors.up : ChartConfig.CANDLE.colors.down;

          const bodyTop = priceToY( Math.max( candle.open, candle.close ) );
          const bodyBottom = priceToY( Math.min( candle.open, candle.close ) );
          const bodyHeight = Math.max( bodyBottom - bodyTop, ChartConfig.CANDLE.dimensions.minBodyHeight );

          const wickTop = priceToY( candle.high );
          const wickBottom = priceToY( candle.low );

          return (
            <g key={ `candle-${ idx }` } opacity={ ChartConfig.CANDLE.hover.normalOpacity }>
              <line
                x1={ x + candleWidth / 2 }
                y1={ wickTop }
                x2={ x + candleWidth / 2 }
                y2={ wickBottom }
                stroke={ color }
                strokeWidth={ ChartConfig.CANDLE.wick.width }
              />
              <rect
                x={ x }
                y={ bodyTop }
                width={ candleWidth }
                height={ bodyHeight }
                fill={ color }
                stroke={ color }
                strokeWidth={ ChartConfig.CANDLE.dimensions.borderWidth }
              />
            </g>
          );
        } ) }

        {/* === خط السعر الحالي === */ }
        <line
          x1={ padding.left }
          y1={ priceToY( currentPrice ) }
          x2={ width - padding.right }
          y2={ priceToY( currentPrice ) }
          stroke={ ChartConfig.PRICE_SCALE.currentPrice.color }
          strokeWidth={ ChartConfig.PRICE_SCALE.currentPrice.width }
          strokeDasharray={ ChartConfig.PRICE_SCALE.currentPrice.dashArray.join( ',' ) }
        />

        {/* === علامة السعر الحالي === */ }
        <rect
          x={ width - priceScaleWidth + 2 }
          y={ priceToY( currentPrice ) - 8 }
          width={ priceScaleWidth - 4 }
          height={ 16 }
          fill={ ChartConfig.PRICE_SCALE.currentPrice.color }
          rx={ 2 }
        />
        <text
          x={ width - priceScaleWidth / 2 }
          y={ priceToY( currentPrice ) + 4 }
          textAnchor="middle"
          fill="#ffffff"
          fontSize={ ChartConfig.PRICE_SCALE.text.fontSize - 1 }
          fontFamily={ ChartConfig.TEXT.fontFamily.mono }
          fontWeight="bold"
        >
          { formatPrice( currentPrice ) }
        </text>

        {/* === مقياس الأسعار === */ }
        { priceLabels.map( ( price, idx ) => (
          <text
            key={ `price-label-${ idx }` }
            x={ width - priceScaleWidth / 2 }
            y={ priceToY( price ) + 3 }
            textAnchor="middle"
            fill={ ChartConfig.PRICE_SCALE.text.color }
            fontSize={ ChartConfig.PRICE_SCALE.text.fontSize - 1 }
            fontFamily={ ChartConfig.TEXT.fontFamily.mono }
          >
            { formatPrice( price ) }
          </text>
        ) ) }
      </svg>

      {/* Click indicator overlay */ }
      <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20">
        <span className="px-3 py-1.5 rounded-lg bg-black/60 text-white/80 text-xs font-medium">
          Click to expand
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// 🎴 MAIN CARD COMPONENT - My Card Style (Simplified)
// ============================================================================

export function LevelsCard ( {
  result,
  isFavorite,
  onToggleFavorite,
  onExpand
}: LevelsCardProps )
{
  const cardRef = useRef<HTMLDivElement>( null );

  // === حفظ كصورة ===
  const handleSaveImage = useCallback( async ( e: React.MouseEvent ) =>
  {
    e.stopPropagation();
    if ( !cardRef.current ) return;

    try
    {
      const dataUrl = await toPng( cardRef.current, {
        quality: 1.0,
        backgroundColor: '#1d2b28',
      } );

      const link = document.createElement( 'a' );
      link.download = `levels-${ result.symbol }-${ result.timeframe }-${ Date.now() }.png`;
      link.href = dataUrl;
      link.click();
    } catch ( err )
    {
      console.error( 'Failed to save image:', err );
    }
  }, [ result.symbol, result.timeframe ] );

  return (
    <div ref={ cardRef } className="my-card my-card--hover">
      {/* ═══════════════════════════════════════════════════════════════════
          HEADER - اسم الزوج + الفريم + المنصة + أزرار
      ═══════════════════════════════════════════════════════════════════ */ }
      <div className="my-card__header">
        {/* Left: Symbol + Timeframe + Exchange */ }
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-1">
            <span className="my-card__title">
              { result.symbol.replace( 'USDT', '' ) }
            </span>
            <span className="my-card__subtitle">/USDT</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <span className="capitalize">{ EXCHANGE_LABELS[ result.exchange ] || result.exchange }</span>
            <span className="w-0.5 h-2 bg-gray-600/50 rounded-full"></span>
            <span className="font-mono">{ TIMEFRAME_LABELS[ result.timeframe ]?.en || result.timeframe }</span>
          </div>
        </div>

        {/* Right: Action Buttons */ }
        <div className="flex items-center gap-1.5">
          {/* Save Image */ }
          <button
            onClick={ handleSaveImage }
            className="my-card__icon-btn"
            title="Save Image"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 1.5 } d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>

          {/* Favorite */ }
          <button
            onClick={ ( e ) => { e.stopPropagation(); onToggleFavorite( result.id ); } }
            className={ `my-card__icon-btn ${ isFavorite ? 'my-card__icon-btn--active' : '' }` }
            title="Toggle Favorite"
          >
            <svg className="w-3.5 h-3.5" fill={ isFavorite ? "currentColor" : "none" } viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 1.5 } d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          BODY - Chart Only (300px, clickable)
      ═══════════════════════════════════════════════════════════════════ */ }
      { result.candles && result.candles.length > 0 && (
        <div className="my-card__inner">
          <div className="my-card__chart-area">
            <MiniLevelsChart result={ result } onClick={ () => onExpand( result ) } />
          </div>
        </div>
      ) }
    </div>
  );
}

export default LevelsCard;
