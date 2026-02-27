/**
 * Smart Money Concepts (SMC) Indicators
 * Order Blocks, Fair Value Gaps, Market Structure, Liquidity Zones
 * 
 * مفاهيم الأموال الذكية - كشف مناطق السيولة والتراكم المؤسسي
 */

import { CandleData } from './types';

type EChartsGraphicElement = Record<string, unknown>;
type EChartsMarkPoint = { data: unknown[] };
type EChartsMarkLine = { data: unknown[] };
type EChartsMarkArea = { data: unknown[] };
type EChartsMarkAreaSegment = [ Record<string, unknown>, Record<string, unknown> ];

// ============================================
// Types & Interfaces
// ============================================

export interface OrderBlock
{
  type: 'bullish' | 'bearish';
  startIndex: number;
  endIndex: number;
  topPrice: number;
  bottomPrice: number;
  strength: number;  // 0-100
  mitigated: boolean;
  retested: boolean;
}

export interface FairValueGap
{
  type: 'bullish' | 'bearish';
  index: number;
  topPrice: number;
  bottomPrice: number;
  size: number;
  filled: boolean;
  fillPercent: number;
}

export interface MarketStructurePoint
{
  type: 'HH' | 'HL' | 'LH' | 'LL' | 'BOS' | 'CHOCH';
  index: number;
  price: number;
  trend: 'bullish' | 'bearish' | 'neutral';
}

export interface LiquidityZone
{
  type: 'equal_highs' | 'equal_lows' | 'swing_high' | 'swing_low';
  price: number;
  startIndex: number;
  endIndex: number;
  swept: boolean;
  strength: number;
}

export interface SMCSettings
{
  orderBlocks?: boolean;
  fairValueGaps?: boolean;
  marketStructure?: boolean;
  liquidityZones?: boolean;
  wyckoffEvents?: boolean;
  breakerBlocks?: boolean;
  obLookback?: number;
  fvgMinSize?: number;
  swingLength?: number;
}

// ============================================
// Constants
// ============================================

const DEFAULT_SETTINGS: Required<SMCSettings> = {
  orderBlocks: true,
  fairValueGaps: true,
  marketStructure: true,
  liquidityZones: true,
  wyckoffEvents: false,
  breakerBlocks: true,
  obLookback: 50,
  fvgMinSize: 0.001,
  swingLength: 5
};

const COLORS = {
  bullishOB: { fill: 'rgba(0, 230, 118, 0.15)', border: '#00E676' },
  bearishOB: { fill: 'rgba(255, 82, 82, 0.15)', border: '#FF5252' },
  bullishFVG: { fill: 'rgba(0, 150, 255, 0.2)', border: '#0096FF' },
  bearishFVG: { fill: 'rgba(255, 150, 0, 0.2)', border: '#FF9600' },
  bos: '#2196F3',
  choch: '#FF9800',
  liquidity: '#9C27B0'
};

// ============================================
// Detection Functions
// ============================================

/**
 * Find swing highs/lows
 */
function findSwings ( data: CandleData[], length: number ): { highs: number[]; lows: number[] }
{
  const highs: number[] = [];
  const lows: number[] = [];

  for ( let i = length; i < data.length - length; i++ )
  {
    let isHigh = true;
    let isLow = true;

    for ( let j = 1; j <= length; j++ )
    {
      if ( data[ i ].high <= data[ i - j ].high || data[ i ].high <= data[ i + j ].high ) isHigh = false;
      if ( data[ i ].low >= data[ i - j ].low || data[ i ].low >= data[ i + j ].low ) isLow = false;
    }

    if ( isHigh ) highs.push( i );
    if ( isLow ) lows.push( i );
  }

  return { highs, lows };
}

/**
 * Detect Order Blocks
 */
function detectOrderBlocks ( data: CandleData[], settings: Required<SMCSettings> ): OrderBlock[]
{
  const blocks: OrderBlock[] = [];
  const lookback = settings.obLookback;

  for ( let i = 2; i < data.length - 1; i++ )
  {
    const prev = data[ i - 1 ];

    // Bullish OB: Strong bearish candle followed by strong bullish move
    if ( prev.close < prev.open )
    {  // Previous was bearish
      const bearishSize = Math.abs( prev.close - prev.open );
      const avgSize = data.slice( Math.max( 0, i - 10 ), i ).reduce( ( sum, c ) =>
        sum + Math.abs( c.close - c.open ), 0 ) / 10;

      if ( bearishSize > avgSize * 1.5 )
      {  // Strong bearish
        // Check if price moved up significantly after
        let bullishMove = false;
        for ( let j = i; j < Math.min( i + 5, data.length ); j++ )
        {
          if ( data[ j ].close > prev.high )
          {
            bullishMove = true;
            break;
          }
        }

        if ( bullishMove )
        {
          // Check if mitigated
          let mitigated = false;
          for ( let j = i + 1; j < Math.min( i + lookback, data.length ); j++ )
          {
            if ( data[ j ].low <= prev.low )
            {
              mitigated = true;
              break;
            }
          }

          blocks.push( {
            type: 'bullish',
            startIndex: i - 1,
            endIndex: i,
            topPrice: prev.open,
            bottomPrice: prev.low,
            strength: Math.min( 100, Math.round( ( bearishSize / avgSize ) * 50 ) ),
            mitigated,
            retested: false
          } );
        }
      }
    }

    // Bearish OB: Strong bullish candle followed by strong bearish move
    if ( prev.close > prev.open )
    {  // Previous was bullish
      const bullishSize = Math.abs( prev.close - prev.open );
      const avgSize = data.slice( Math.max( 0, i - 10 ), i ).reduce( ( sum, c ) =>
        sum + Math.abs( c.close - c.open ), 0 ) / 10;

      if ( bullishSize > avgSize * 1.5 )
      {
        let bearishMove = false;
        for ( let j = i; j < Math.min( i + 5, data.length ); j++ )
        {
          if ( data[ j ].close < prev.low )
          {
            bearishMove = true;
            break;
          }
        }

        if ( bearishMove )
        {
          let mitigated = false;
          for ( let j = i + 1; j < Math.min( i + lookback, data.length ); j++ )
          {
            if ( data[ j ].high >= prev.high )
            {
              mitigated = true;
              break;
            }
          }

          blocks.push( {
            type: 'bearish',
            startIndex: i - 1,
            endIndex: i,
            topPrice: prev.high,
            bottomPrice: prev.open,
            strength: Math.min( 100, Math.round( ( bullishSize / avgSize ) * 50 ) ),
            mitigated,
            retested: false
          } );
        }
      }
    }
  }

  return blocks.slice( -20 );  // Keep last 20
}

/**
 * Detect Fair Value Gaps (Imbalances)
 */
function detectFVG ( data: CandleData[], settings: Required<SMCSettings> ): FairValueGap[]
{
  const gaps: FairValueGap[] = [];
  const minSize = settings.fvgMinSize;

  for ( let i = 2; i < data.length; i++ )
  {
    const candle1 = data[ i - 2 ];
    const candle2 = data[ i - 1 ];
    const candle3 = data[ i ];

    // Bullish FVG: Gap up
    if ( candle3.low > candle1.high )
    {
      const gapSize = ( candle3.low - candle1.high ) / candle2.close;
      if ( gapSize > minSize )
      {
        // Check if filled
        let filled = false;
        let fillPercent = 0;
        for ( let j = i + 1; j < data.length; j++ )
        {
          if ( data[ j ].low <= candle1.high )
          {
            filled = true;
            fillPercent = 100;
            break;
          }
          const penetration = Math.max( 0, candle3.low - data[ j ].low );
          fillPercent = Math.max( fillPercent, ( penetration / ( candle3.low - candle1.high ) ) * 100 );
        }

        gaps.push( {
          type: 'bullish',
          index: i - 1,
          topPrice: candle3.low,
          bottomPrice: candle1.high,
          size: gapSize,
          filled,
          fillPercent
        } );
      }
    }

    // Bearish FVG: Gap down
    if ( candle3.high < candle1.low )
    {
      const gapSize = ( candle1.low - candle3.high ) / candle2.close;
      if ( gapSize > minSize )
      {
        let filled = false;
        let fillPercent = 0;
        for ( let j = i + 1; j < data.length; j++ )
        {
          if ( data[ j ].high >= candle1.low )
          {
            filled = true;
            fillPercent = 100;
            break;
          }
          const penetration = Math.max( 0, data[ j ].high - candle3.high );
          fillPercent = Math.max( fillPercent, ( penetration / ( candle1.low - candle3.high ) ) * 100 );
        }

        gaps.push( {
          type: 'bearish',
          index: i - 1,
          topPrice: candle1.low,
          bottomPrice: candle3.high,
          size: gapSize,
          filled,
          fillPercent
        } );
      }
    }
  }

  return gaps.slice( -15 );  // Keep last 15
}

/**
 * Detect Market Structure (BOS/CHOCH)
 */
function detectMarketStructure ( data: CandleData[], settings: Required<SMCSettings> ): MarketStructurePoint[]
{
  const points: MarketStructurePoint[] = [];
  const { highs, lows } = findSwings( data, settings.swingLength );

  let lastHighPrice = 0;
  let lastLowPrice = Infinity;
  let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';

  // Process swings chronologically
  const allSwings = [
    ...highs.map( i => ( { i, type: 'high' as const, price: data[ i ].high } ) ),
    ...lows.map( i => ( { i, type: 'low' as const, price: data[ i ].low } ) )
  ].sort( ( a, b ) => a.i - b.i );

  for ( const swing of allSwings )
  {
    if ( swing.type === 'high' )
    {
      if ( swing.price > lastHighPrice )
      {
        // Higher High
        points.push( { type: 'HH', index: swing.i, price: swing.price, trend: 'bullish' } );
        if ( trend === 'bearish' )
        {
          // Change of Character
          points.push( { type: 'CHOCH', index: swing.i, price: swing.price, trend: 'bullish' } );
        }
        trend = 'bullish';
      } else
      {
        // Lower High
        points.push( { type: 'LH', index: swing.i, price: swing.price, trend: 'bearish' } );
        if ( trend === 'bullish' )
        {
          // Potential reversal
          points.push( { type: 'BOS', index: swing.i, price: swing.price, trend: 'bearish' } );
        }
      }
      lastHighPrice = swing.price;
    } else
    {
      if ( swing.price < lastLowPrice )
      {
        // Lower Low
        points.push( { type: 'LL', index: swing.i, price: swing.price, trend: 'bearish' } );
        if ( trend === 'bullish' )
        {
          points.push( { type: 'CHOCH', index: swing.i, price: swing.price, trend: 'bearish' } );
        }
        trend = 'bearish';
      } else
      {
        // Higher Low
        points.push( { type: 'HL', index: swing.i, price: swing.price, trend: 'bullish' } );
        if ( trend === 'bearish' )
        {
          points.push( { type: 'BOS', index: swing.i, price: swing.price, trend: 'bullish' } );
        }
      }
      lastLowPrice = swing.price;
    }
  }

  return points.slice( -30 );
}

/**
 * Detect Liquidity Zones (Equal Highs/Lows)
 */
function detectLiquidityZones ( data: CandleData[], settings: Required<SMCSettings> ): LiquidityZone[]
{
  const zones: LiquidityZone[] = [];
  const { highs, lows } = findSwings( data, settings.swingLength );
  const tolerance = 0.002;  // 0.2%

  // Find equal highs
  for ( let i = 0; i < highs.length - 1; i++ )
  {
    for ( let j = i + 1; j < highs.length; j++ )
    {
      const price1 = data[ highs[ i ] ].high;
      const price2 = data[ highs[ j ] ].high;
      const diff = Math.abs( price1 - price2 ) / price1;

      if ( diff < tolerance )
      {
        // Check if swept
        const avgPrice = ( price1 + price2 ) / 2;
        let swept = false;
        for ( let k = highs[ j ] + 1; k < data.length; k++ )
        {
          if ( data[ k ].high > Math.max( price1, price2 ) )
          {
            swept = true;
            break;
          }
        }

        zones.push( {
          type: 'equal_highs',
          price: avgPrice,
          startIndex: highs[ i ],
          endIndex: highs[ j ],
          swept,
          strength: 80
        } );
      }
    }
  }

  // Find equal lows
  for ( let i = 0; i < lows.length - 1; i++ )
  {
    for ( let j = i + 1; j < lows.length; j++ )
    {
      const price1 = data[ lows[ i ] ].low;
      const price2 = data[ lows[ j ] ].low;
      const diff = Math.abs( price1 - price2 ) / price1;

      if ( diff < tolerance )
      {
        const avgPrice = ( price1 + price2 ) / 2;
        let swept = false;
        for ( let k = lows[ j ] + 1; k < data.length; k++ )
        {
          if ( data[ k ].low < Math.min( price1, price2 ) )
          {
            swept = true;
            break;
          }
        }

        zones.push( {
          type: 'equal_lows',
          price: avgPrice,
          startIndex: lows[ i ],
          endIndex: lows[ j ],
          swept,
          strength: 80
        } );
      }
    }
  }

  return zones.slice( -20 );
}

// ============================================
// ECharts Visualization
// ============================================

export function orderBlocksToGraphic ( blocks: OrderBlock[], dataLength: number ): EChartsGraphicElement[]
{
  return blocks.filter( b => !b.mitigated ).map( block => ( {
    type: 'rect',
    z2: 10,
    shape: {
      x: block.startIndex,
      y: block.bottomPrice,
      width: dataLength - block.startIndex,
      height: block.topPrice - block.bottomPrice
    },
    style: {
      fill: block.type === 'bullish' ? COLORS.bullishOB.fill : COLORS.bearishOB.fill,
      stroke: block.type === 'bullish' ? COLORS.bullishOB.border : COLORS.bearishOB.border,
      lineWidth: 1
    }
  } ) );
}

function fvgToMarkArea ( gaps: FairValueGap[] ): EChartsMarkAreaSegment[]
{
  return gaps.filter( g => !g.filled ).map( gap => ( [
    {
      name: gap.type === 'bullish' ? 'FVG+' : 'FVG-',
      xAxis: gap.index - 1,
      yAxis: gap.bottomPrice,
      itemStyle: {
        color: gap.type === 'bullish' ? COLORS.bullishFVG.fill : COLORS.bearishFVG.fill,
        borderColor: gap.type === 'bullish' ? COLORS.bullishFVG.border : COLORS.bearishFVG.border,
        borderWidth: 1
      }
    },
    {
      xAxis: gap.index + 20,
      yAxis: gap.topPrice
    }
  ] ) );
}

function marketStructureToMarkPoint ( points: MarketStructurePoint[] ): EChartsGraphicElement[]
{
  return points.map( p => ( {
    name: p.type,
    coord: [ p.index, p.price ],
    value: p.type,
    symbol: p.type.includes( 'H' ) ? 'triangle' : 'arrow',
    symbolRotate: p.type === 'LL' || p.type === 'HL' ? 180 : 0,
    symbolSize: p.type === 'BOS' || p.type === 'CHOCH' ? 25 : 15,
    itemStyle: {
      color: p.type === 'CHOCH' ? COLORS.choch :
        p.type === 'BOS' ? COLORS.bos :
          p.trend === 'bullish' ? '#00E676' : '#FF5252'
    },
    label: {
      show: p.type === 'BOS' || p.type === 'CHOCH',
      formatter: p.type,
      fontSize: 10,
      position: p.type.includes( 'H' ) || p.type === 'HH' ? 'top' : 'bottom'
    }
  } ) );
}

function liquidityToMarkLine ( zones: LiquidityZone[], dataLength: number ): EChartsMarkAreaSegment[]
{
  return zones.filter( z => !z.swept ).map( zone => ( [
    {
      name: zone.type,
      coord: [ zone.startIndex, zone.price ],
    },
    {
      coord: [ dataLength - 1, zone.price ],
      lineStyle: {
        color: COLORS.liquidity,
        width: 2,
        type: zone.type.includes( 'equal' ) ? 'dashed' : 'dotted'
      },
      label: {
        show: true,
        formatter: zone.type.replace( '_', ' ' ),
        position: 'end',
        fontSize: 9
      }
    }
  ] ) );
}

// ============================================
// Main Export
// ============================================

export function generateSMCOverlays (
  data: CandleData[],
  settings: Partial<SMCSettings> = {}
):
    {
      markPoint: EChartsMarkPoint;
      markLine: EChartsMarkLine;
      markArea: EChartsMarkArea;
      orderBlocks: OrderBlock[];
      fvg: FairValueGap[];
      structure: MarketStructurePoint[];
      liquidity: LiquidityZone[];
    }
{
  const markPoint: EChartsMarkPoint = { data: [] };
  const markLine: EChartsMarkLine = { data: [] };
  const markArea: EChartsMarkArea = { data: [] };

  if ( !data || data.length < 30 )
  {
    return { markPoint, markLine, markArea, orderBlocks: [], fvg: [], structure: [], liquidity: [] };
  }

  const cfg = { ...DEFAULT_SETTINGS, ...settings };

  // Detect all SMC elements
  const orderBlocks = cfg.orderBlocks ? detectOrderBlocks( data, cfg ) : [];
  const fvg = cfg.fairValueGaps ? detectFVG( data, cfg ) : [];
  const structure = cfg.marketStructure ? detectMarketStructure( data, cfg ) : [];
  const liquidity = cfg.liquidityZones ? detectLiquidityZones( data, cfg ) : [];

  // Build visualizations
  if ( cfg.fairValueGaps )
  {
    markArea.data.push( ...fvgToMarkArea( fvg ) );
  }

  if ( cfg.marketStructure )
  {
    markPoint.data.push( ...marketStructureToMarkPoint( structure ) );
  }

  if ( cfg.liquidityZones )
  {
    markLine.data.push( ...liquidityToMarkLine( liquidity, data.length ) );
  }

  return {
    markPoint,
    markLine,
    markArea,
    orderBlocks,
    fvg,
    structure,
    liquidity
  };
}

// Export utilities
export { findSwings, detectOrderBlocks, detectFVG, detectMarketStructure, detectLiquidityZones };
