"use client";

/**
 * Sub Indicator Charts - الرسوم البيانية الفرعية للمؤشرات
 * Professional Grade Technical Indicators with High Precision Algorithms
 * خوارزميات احترافية عالية الدقة مثل TradingView و Bloomberg Terminal
 */

import React, { useMemo, useState, useRef, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import { X, GripHorizontal } from "lucide-react";
import * as echarts from "echarts";
import
  {
    calculateSuperSmoother,
    calculateInstantaneousTrendline,
    calculateFisherTransform,
    calculateMAMA,
    calculateFRAMA,
    calculateCyberCycle,
  } from "@/lib/indicators/ehlers-dsp";
import
  {
    calculateIchimoku,
    calculateATRBands,
    calculateParabolicSAR,
    calculateSmartPivots,
    calculateWilliamsR,
    calculateAdvancedCCI,
    calculateMomentumROC,
    calculateUltimateOscillator,
    calculateKeltnerChannels,
    calculateDonchianChannels,
    calculateCMF,
    calculateForceIndex,
    calculateChoppinessIndex,
    calculateTRIX,
    calculateAwesomeOscillator
  } from "@/lib/indicators/advanced-indicators";

// Type definitions compatible with lightweight-charts for existing calculations
export type Time = string | number;

export interface CandleData
{
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// ============================================
// PROFESSIONAL INDICATOR CALCULATION ENGINE
// High-Precision Algorithms with Wilder's Smoothing
// ============================================

function wilderSmooth ( values: number[], period: number ): number[]
{
  const result: number[] = new Array( values.length ).fill( NaN );
  if ( values.length < period ) return result;

  let sum = 0;
  for ( let i = 0; i < period; i++ )
  {
    sum += values[ i ];
  }
  result[ period - 1 ] = sum / period;

  const alpha = 1 / period;
  for ( let i = period; i < values.length; i++ )
  {
    result[ i ] = alpha * values[ i ] + ( 1 - alpha ) * result[ i - 1 ];
  }

  return result;
}

function calculateEMA ( values: number[], period: number ): number[]
{
  const result: number[] = new Array( values.length ).fill( NaN );
  if ( values.length < period ) return result;

  const multiplier = 2 / ( period + 1 );

  let sum = 0;
  for ( let i = 0; i < period; i++ )
  {
    sum += values[ i ];
  }
  result[ period - 1 ] = sum / period;

  for ( let i = period; i < values.length; i++ )
  {
    result[ i ] = ( values[ i ] - result[ i - 1 ] ) * multiplier + result[ i - 1 ];
  }

  return result;
}

function calculateTrueRange ( data: CandleData[] ): number[]
{
  const tr: number[] = [ data[ 0 ].high - data[ 0 ].low ];

  for ( let i = 1; i < data.length; i++ )
  {
    const hl = data[ i ].high - data[ i ].low;
    const hc = Math.abs( data[ i ].high - data[ i - 1 ].close );
    const lc = Math.abs( data[ i ].low - data[ i - 1 ].close );
    tr.push( Math.max( hl, hc, lc ) );
  }

  return tr;
}

function calculateRSI ( data: CandleData[], period: number = 14 ): { time: Time; value: number }[]
{
  const result: { time: Time; value: number }[] = [];
  if ( data.length < period + 1 ) return result;

  const changes: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  for ( let i = 1; i < data.length; i++ )
  {
    const change = data[ i ].close - data[ i - 1 ].close;
    changes.push( change );
    gains.push( change > 0 ? change : 0 );
    losses.push( change < 0 ? Math.abs( change ) : 0 );
  }

  let avgGain = 0;
  let avgLoss = 0;
  for ( let i = 0; i < period; i++ )
  {
    avgGain += gains[ i ];
    avgLoss += losses[ i ];
  }
  avgGain /= period;
  avgLoss /= period;

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  let rsi = avgLoss === 0 ? 100 : 100 - ( 100 / ( 1 + rs ) );
  result.push( { time: data[ period ].time, value: rsi } );

  for ( let i = period; i < changes.length; i++ )
  {
    avgGain = ( avgGain * ( period - 1 ) + gains[ i ] ) / period;
    avgLoss = ( avgLoss * ( period - 1 ) + losses[ i ] ) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi = avgLoss === 0 ? 100 : 100 - ( 100 / ( 1 + rs ) );

    rsi = Math.max( 0, Math.min( 100, rsi ) );
    result.push( { time: data[ i + 1 ].time, value: rsi } );
  }

  return result;
}

function calculateMACD (
  data: CandleData[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
):
    {
      macd: { time: Time; value: number }[];
      signal: { time: Time; value: number }[];
      histogram: { time: Time; value: number; color: string }[];
    }
{
  const closes = data.map( d => d.close );
  const fastEMA = calculateEMA( closes, fastPeriod );
  const slowEMA = calculateEMA( closes, slowPeriod );

  const macdLine: number[] = [];
  for ( let i = 0; i < closes.length; i++ )
  {
    if ( !isNaN( fastEMA[ i ] ) && !isNaN( slowEMA[ i ] ) )
    {
      macdLine.push( fastEMA[ i ] - slowEMA[ i ] );
    } else
    {
      macdLine.push( NaN );
    }
  }

  const validMacd = macdLine.filter( v => !isNaN( v ) );
  const signalLine = calculateEMA( validMacd, signalPeriod );

  const macd: { time: Time; value: number }[] = [];
  const signal: { time: Time; value: number }[] = [];
  const histogram: { time: Time; value: number; color: string }[] = [];

  let signalIndex = 0;
  let prevHistogram = 0;

  for ( let i = 0; i < macdLine.length; i++ )
  {
    if ( !isNaN( macdLine[ i ] ) )
    {
      macd.push( { time: data[ i ].time, value: macdLine[ i ] } );

      if ( signalIndex >= signalPeriod - 1 && !isNaN( signalLine[ signalIndex - signalPeriod + 1 ] ) )
      {
        const sigVal = signalLine[ signalIndex - signalPeriod + 1 ];
        signal.push( { time: data[ i ].time, value: sigVal } );

        const histVal = macdLine[ i ] - sigVal;

        let color: string;
        if ( histVal >= 0 )
        {
          color = histVal > prevHistogram ? "rgba(34, 197, 94, 1)" : "rgba(34, 197, 94, 0.5)";
        } else
        {
          color = histVal < prevHistogram ? "rgba(239, 68, 68, 1)" : "rgba(239, 68, 68, 0.5)";
        }

        histogram.push( { time: data[ i ].time, value: histVal, color } );
        prevHistogram = histVal;
      }
      signalIndex++;
    }
  }

  return { macd, signal, histogram };
}

function calculateStochRSI (
  data: CandleData[],
  rsiPeriod: number = 14,
  stochPeriod: number = 14,
  kSmooth: number = 3,
  dSmooth: number = 3
):
    {
      k: { time: Time; value: number }[];
      d: { time: Time; value: number }[];
    }
{
  const rsiData = calculateRSI( data, rsiPeriod );
  if ( rsiData.length < stochPeriod ) return { k: [], d: [] };

  const rsiValues = rsiData.map( r => r.value );
  const stochRsiRaw: number[] = [];

  for ( let i = stochPeriod - 1; i < rsiValues.length; i++ )
  {
    const slice = rsiValues.slice( i - stochPeriod + 1, i + 1 );
    const minRSI = Math.min( ...slice );
    const maxRSI = Math.max( ...slice );

    const stochRsi = maxRSI === minRSI ? 50 : ( ( rsiValues[ i ] - minRSI ) / ( maxRSI - minRSI ) ) * 100;
    stochRsiRaw.push( stochRsi );
  }

  const kValues: number[] = [];
  for ( let i = kSmooth - 1; i < stochRsiRaw.length; i++ )
  {
    const avg = stochRsiRaw.slice( i - kSmooth + 1, i + 1 ).reduce( ( a, b ) => a + b, 0 ) / kSmooth;
    kValues.push( avg );
  }

  const dValues: number[] = [];
  for ( let i = dSmooth - 1; i < kValues.length; i++ )
  {
    const avg = kValues.slice( i - dSmooth + 1, i + 1 ).reduce( ( a, b ) => a + b, 0 ) / dSmooth;
    dValues.push( avg );
  }

  const k: { time: Time; value: number }[] = [];
  const d: { time: Time; value: number }[] = [];

  const startIndex = rsiPeriod + stochPeriod + kSmooth - 2;

  for ( let i = 0; i < kValues.length; i++ )
  {
    const dataIndex = startIndex + i;
    if ( dataIndex < data.length )
    {
      k.push( { time: data[ dataIndex ].time, value: Math.max( 0, Math.min( 100, kValues[ i ] ) ) } );
    }
  }

  for ( let i = 0; i < dValues.length; i++ )
  {
    const dataIndex = startIndex + dSmooth - 1 + i;
    if ( dataIndex < data.length )
    {
      d.push( { time: data[ dataIndex ].time, value: Math.max( 0, Math.min( 100, dValues[ i ] ) ) } );
    }
  }

  return { k, d };
}

function calculateOBV ( data: CandleData[] ): { time: Time; value: number }[]
{
  const result: { time: Time; value: number }[] = [];
  let obv = 0;

  for ( let i = 0; i < data.length; i++ )
  {
    const volume = data[ i ].volume || 0;

    if ( i > 0 )
    {
      if ( data[ i ].close > data[ i - 1 ].close )
      {
        obv += volume;
      } else if ( data[ i ].close < data[ i - 1 ].close )
      {
        obv -= volume;
      }
    }

    result.push( { time: data[ i ].time, value: obv } );
  }

  return result;
}

function calculateADX ( data: CandleData[], period: number = 14 ):
  {
    adx: { time: Time; value: number }[];
    plusDI: { time: Time; value: number }[];
    minusDI: { time: Time; value: number }[];
  }
{
  if ( data.length < period * 2 ) return { adx: [], plusDI: [], minusDI: [] };

  const tr = calculateTrueRange( data );
  const plusDM: number[] = [ 0 ];
  const minusDM: number[] = [ 0 ];

  for ( let i = 1; i < data.length; i++ )
  {
    const upMove = data[ i ].high - data[ i - 1 ].high;
    const downMove = data[ i - 1 ].low - data[ i ].low;

    if ( upMove > downMove && upMove > 0 )
    {
      plusDM.push( upMove );
    } else
    {
      plusDM.push( 0 );
    }

    if ( downMove > upMove && downMove > 0 )
    {
      minusDM.push( downMove );
    } else
    {
      minusDM.push( 0 );
    }
  }

  const smoothedTR = wilderSmooth( tr, period );
  const smoothedPlusDM = wilderSmooth( plusDM, period );
  const smoothedMinusDM = wilderSmooth( minusDM, period );

  const plusDIValues: number[] = [];
  const minusDIValues: number[] = [];
  const dxValues: number[] = [];

  for ( let i = 0; i < data.length; i++ )
  {
    if ( !isNaN( smoothedTR[ i ] ) && smoothedTR[ i ] !== 0 )
    {
      const pdi = ( smoothedPlusDM[ i ] / smoothedTR[ i ] ) * 100;
      const mdi = ( smoothedMinusDM[ i ] / smoothedTR[ i ] ) * 100;
      plusDIValues.push( pdi );
      minusDIValues.push( mdi );

      const diSum = pdi + mdi;
      const dx = diSum === 0 ? 0 : ( Math.abs( pdi - mdi ) / diSum ) * 100;
      dxValues.push( dx );
    } else
    {
      plusDIValues.push( NaN );
      minusDIValues.push( NaN );
      dxValues.push( NaN );
    }
  }

  const adxValues = wilderSmooth( dxValues.filter( v => !isNaN( v ) ), period );

  const adx: { time: Time; value: number }[] = [];
  const plusDI: { time: Time; value: number }[] = [];
  const minusDI: { time: Time; value: number }[] = [];

  let adxIdx = 0;
  for ( let i = period - 1; i < data.length; i++ )
  {
    if ( !isNaN( plusDIValues[ i ] ) )
    {
      plusDI.push( { time: data[ i ].time, value: plusDIValues[ i ] } );
      minusDI.push( { time: data[ i ].time, value: minusDIValues[ i ] } );

      if ( adxIdx < adxValues.length && !isNaN( adxValues[ adxIdx ] ) )
      {
        adx.push( { time: data[ i ].time, value: adxValues[ adxIdx ] } );
      }
      adxIdx++;
    }
  }

  return { adx, plusDI, minusDI };
}

function calculateMFI ( data: CandleData[], period: number = 14 ): { time: Time; value: number }[]
{
  const result: { time: Time; value: number }[] = [];
  if ( data.length < period + 1 ) return result;

  const typicalPrices: number[] = [];
  const rawMoneyFlow: number[] = [];

  for ( let i = 0; i < data.length; i++ )
  {
    const tp = ( data[ i ].high + data[ i ].low + data[ i ].close ) / 3;
    typicalPrices.push( tp );

    if ( i > 0 )
    {
      const volume = data[ i ].volume || 0;
      const rmf = tp * volume;
      rawMoneyFlow.push( tp > typicalPrices[ i - 1 ] ? rmf : -rmf );
    }
  }

  for ( let i = period; i <= rawMoneyFlow.length; i++ )
  {
    const window = rawMoneyFlow.slice( i - period, i );
    const positiveFlow = window.filter( f => f > 0 ).reduce( ( a, b ) => a + b, 0 );
    const negativeFlow = Math.abs( window.filter( f => f < 0 ).reduce( ( a, b ) => a + b, 0 ) );

    let mfi: number;
    if ( negativeFlow === 0 )
    {
      mfi = 100;
    } else if ( positiveFlow === 0 )
    {
      mfi = 0;
    } else
    {
      const moneyRatio = positiveFlow / negativeFlow;
      mfi = 100 - ( 100 / ( 1 + moneyRatio ) );
    }

    result.push( { time: data[ i ].time, value: Math.max( 0, Math.min( 100, mfi ) ) } );
  }

  return result;
}

function calculateCCI ( data: CandleData[], period: number = 20 ): { time: Time; value: number }[]
{
  const result: { time: Time; value: number }[] = [];
  if ( data.length < period ) return result;

  const typicalPrices: number[] = data.map( d => ( d.high + d.low + d.close ) / 3 );
  const CONSTANT = 0.015;

  for ( let i = period - 1; i < data.length; i++ )
  {
    const slice = typicalPrices.slice( i - period + 1, i + 1 );
    const sma = slice.reduce( ( a, b ) => a + b, 0 ) / period;
    const meanDev = slice.reduce( ( a, b ) => a + Math.abs( b - sma ), 0 ) / period;

    const cci = meanDev === 0 ? 0 : ( typicalPrices[ i ] - sma ) / ( CONSTANT * meanDev );
    result.push( { time: data[ i ].time, value: cci } );
  }

  return result;
}

function calculateConnorsRSI ( data: CandleData[] ): { time: Time; value: number }[]
{
  const result: { time: Time; value: number }[] = [];
  if ( data.length < 100 ) return result;

  const rsi3 = calculateRSI( data, 3 );

  const streaks: number[] = [ 0 ];
  let currentStreak = 0;

  for ( let i = 1; i < data.length; i++ )
  {
    if ( data[ i ].close > data[ i - 1 ].close )
    {
      currentStreak = currentStreak > 0 ? currentStreak + 1 : 1;
    } else if ( data[ i ].close < data[ i - 1 ].close )
    {
      currentStreak = currentStreak < 0 ? currentStreak - 1 : -1;
    } else
    {
      currentStreak = 0;
    }
    streaks.push( currentStreak );
  }

  const streakRSI: number[] = [];
  for ( let i = 2; i < streaks.length; i++ )
  {
    const streak = streaks[ i ];
    const normalized = 50 + streak * 10;
    streakRSI.push( Math.max( 0, Math.min( 100, normalized ) ) );
  }

  const percentRank: number[] = [];
  const lookback = 100;

  for ( let i = lookback + 1; i < data.length; i++ )
  {
    if ( !data[ i ] || !data[ i - 1 ] ) continue;
    const currentReturn = ( data[ i ].close - data[ i - 1 ].close ) / data[ i - 1 ].close;
    let count = 0;

    for ( let j = i - lookback; j < i; j++ )
    {
      if ( !data[ j ] || !data[ j - 1 ] ) continue;
      const pastReturn = ( data[ j ].close - data[ j - 1 ].close ) / data[ j - 1 ].close;
      if ( pastReturn < currentReturn ) count++;
    }

    percentRank.push( ( count / lookback ) * 100 );
  }

  const startIdx = Math.max( lookback, 3 );

  for ( let i = startIdx; i < data.length; i++ )
  {
    const rsi3Val = rsi3.find( r => r.time === data[ i ].time )?.value ?? 50;
    const streakVal = i - 2 < streakRSI.length ? streakRSI[ i - 2 ] : 50;
    const rankVal = i - lookback < percentRank.length ? percentRank[ i - lookback ] : 50;

    const connorsRsi = ( rsi3Val + streakVal + rankVal ) / 3;
    result.push( { time: data[ i ].time, value: Math.max( 0, Math.min( 100, connorsRsi ) ) } );
  }

  return result;
}

function calculateLaguerreRSI ( data: CandleData[], gamma: number = 0.7 ): { time: Time; value: number }[]
{
  const result: { time: Time; value: number }[] = [];
  if ( data.length < 5 ) return result;

  let L0 = 0, L1 = 0, L2 = 0, L3 = 0;
  let L0_prev = 0, L1_prev = 0, L2_prev = 0, L3_prev = 0;

  for ( let i = 0; i < data.length; i++ )
  {
    const price = data[ i ].close;

    L0 = ( 1 - gamma ) * price + gamma * L0_prev;
    L1 = -gamma * L0 + L0_prev + gamma * L1_prev;
    L2 = -gamma * L1 + L1_prev + gamma * L2_prev;
    L3 = -gamma * L2 + L2_prev + gamma * L3_prev;

    L0_prev = L0;
    L1_prev = L1;
    L2_prev = L2;
    L3_prev = L3;

    if ( i >= 4 )
    {
      const cu = Math.max( L0 - L1, 0 ) + Math.max( L1 - L2, 0 ) + Math.max( L2 - L3, 0 );
      const cd = Math.max( L1 - L0, 0 ) + Math.max( L2 - L1, 0 ) + Math.max( L3 - L2, 0 );

      let lrsi: number;
      if ( cu + cd === 0 )
      {
        lrsi = 50;
      } else
      {
        lrsi = ( cu / ( cu + cd ) ) * 100;
      }

      result.push( { time: data[ i ].time, value: Math.max( 0, Math.min( 100, lrsi ) ) } );
    }
  }

  return result;
}

function calculateVWAP ( data: CandleData[] ): { time: Time; value: number }[]
{
  const result: { time: Time; value: number }[] = [];

  let cumulativeTPV = 0;
  let cumulativeVolume = 0;

  for ( let i = 0; i < data.length; i++ )
  {
    const typicalPrice = ( data[ i ].high + data[ i ].low + data[ i ].close ) / 3;
    const volume = data[ i ].volume || 1;

    cumulativeTPV += typicalPrice * volume;
    cumulativeVolume += volume;

    const vwap = cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : typicalPrice;
    result.push( { time: data[ i ].time, value: vwap } );
  }

  return result;
}

function calculateCVD ( data: CandleData[] ): { time: Time; value: number; color: string }[]
{
  const result: { time: Time; value: number; color: string }[] = [];
  let cvd = 0;

  for ( let i = 0; i < data.length; i++ )
  {
    const volume = data[ i ].volume || 0;
    const range = data[ i ].high - data[ i ].low;

    if ( range > 0 && volume > 0 )
    {
      const bodyTop = Math.max( data[ i ].open, data[ i ].close );
      const bodyBottom = Math.min( data[ i ].open, data[ i ].close );

      const closePosition = ( data[ i ].close - data[ i ].low ) / range;

      const buyVolume = volume * closePosition;
      const sellVolume = volume * ( 1 - closePosition );
      const delta = buyVolume - sellVolume;

      cvd += delta;
    }

    const color = cvd >= 0
      ? "rgba(34, 197, 94, 0.8)"
      : "rgba(239, 68, 68, 0.8)";

    result.push( { time: data[ i ].time, value: cvd, color } );
  }

  return result;
}

function calculateKlinger (
  data: CandleData[],
  fastPeriod: number = 34,
  slowPeriod: number = 55,
  signalPeriod: number = 13
):
    {
      klinger: { time: Time; value: number }[];
      signal: { time: Time; value: number }[];
      histogram: { time: Time; value: number; color: string }[];
    }
{
  if ( data.length < slowPeriod + signalPeriod )
  {
    return { klinger: [], signal: [], histogram: [] };
  }

  const hlc: number[] = data.map( d => d.high + d.low + d.close );

  const trend: number[] = [ 0 ];
  for ( let i = 1; i < data.length; i++ )
  {
    trend.push( hlc[ i ] > hlc[ i - 1 ] ? 1 : -1 );
  }

  const dm: number[] = data.map( d => d.high - d.low );

  const cm: number[] = [ dm[ 0 ] ];
  for ( let i = 1; i < data.length; i++ )
  {
    if ( trend[ i ] === trend[ i - 1 ] )
    {
      cm.push( cm[ i - 1 ] + dm[ i ] );
    } else
    {
      cm.push( dm[ i - 1 ] + dm[ i ] );
    }
  }

  const vf: number[] = [];
  for ( let i = 0; i < data.length; i++ )
  {
    const volume = data[ i ].volume || 0;
    if ( cm[ i ] !== 0 )
    {
      const vfValue = volume * Math.abs( 2 * ( dm[ i ] / cm[ i ] ) - 1 ) * trend[ i ] * 100;
      vf.push( vfValue );
    } else
    {
      vf.push( 0 );
    }
  }

  const fastEMA = calculateEMA( vf, fastPeriod );
  const slowEMA = calculateEMA( vf, slowPeriod );

  const kvoValues: number[] = [];
  for ( let i = 0; i < vf.length; i++ )
  {
    if ( !isNaN( fastEMA[ i ] ) && !isNaN( slowEMA[ i ] ) )
    {
      kvoValues.push( fastEMA[ i ] - slowEMA[ i ] );
    }
  }

  const signalEMA = calculateEMA( kvoValues, signalPeriod );

  const klinger: { time: Time; value: number }[] = [];
  const signal: { time: Time; value: number }[] = [];
  const histogram: { time: Time; value: number; color: string }[] = [];

  let prevHist = 0;

  for ( let i = slowPeriod - 1; i < data.length; i++ )
  {
    const kvoIdx = i - ( slowPeriod - 1 );
    if ( kvoIdx >= 0 && kvoIdx < kvoValues.length )
    {
      klinger.push( { time: data[ i ].time, value: kvoValues[ kvoIdx ] } );

      const sigIdx = kvoIdx - ( signalPeriod - 1 );
      if ( sigIdx >= 0 && sigIdx < signalEMA.length && !isNaN( signalEMA[ sigIdx ] ) )
      {
        signal.push( { time: data[ i ].time, value: signalEMA[ sigIdx ] } );

        const histVal = kvoValues[ kvoIdx ] - signalEMA[ sigIdx ];
        let color: string;
        if ( histVal >= 0 )
        {
          color = histVal > prevHist ? "rgba(34, 197, 94, 1)" : "rgba(34, 197, 94, 0.5)";
        } else
        {
          color = histVal < prevHist ? "rgba(239, 68, 68, 1)" : "rgba(239, 68, 68, 0.5)";
        }
        histogram.push( { time: data[ i ].time, value: histVal, color } );
        prevHist = histVal;
      }
    }
  }

  return { klinger, signal, histogram };
}

// ============================================
// Sub Chart Component
// ============================================

// Height presets for resizing
// TradingView-style resize constants
const MIN_HEIGHT = 60;
const MAX_HEIGHT = 400;
const DEFAULT_HEIGHT = 120;

const clamp = ( value: number, min: number, max: number ) => Math.min( Math.max( value, min ), max );

interface SubChartProps
{
  type: "rsi" | "macd" | "stochRsi" | "obv" | "adx" | "mfi" | "cci" | "volume" | "connorsRsi" | "laguerreRsi" | "vwap" | "cvd" | "klinger" | "superSmoother" | "instantaneousTrendline" | "fisherTransform" | "mama" | "frama" | "cyberCycle" | "ichimoku" | "atrBands" | "parabolicSar" | "pivots" | "williamsR" | "advancedCci" | "momentumRoc" | "ultimateOsc" | "keltner" | "donchian" | "cmf" | "forceIndex" | "choppiness" | "trix" | "awesomeOsc";
  data: CandleData[];
  height?: number;
  onClose: () => void;
}

export function SubIndicatorChart ( { type, data, height = DEFAULT_HEIGHT, onClose }: SubChartProps )
{
  const [ currentHeight, setCurrentHeight ] = useState( height );
  const [ isDragging, setIsDragging ] = useState( false );
  const [ isValueZoomDragging, setIsValueZoomDragging ] = useState( false );
  const containerRef = useRef<HTMLDivElement>( null );
  const dragStartY = useRef( 0 );
  const dragStartHeight = useRef( 0 );
  const valueZoomStart = useRef( { y: 0, start: 0, end: 100 } );
  const dataZoomRef = useRef( { start: 0, end: 100 } );
  const chartInstanceRef = useRef<echarts.ECharts | null>( null );

  // === TradingView-Style Zoom State ===
  const [ xRange, setXRange ] = useState( { start: 0, end: 100 } );
  const [ yRange, setYRange ] = useState( { start: 0, end: 100 } );
  const [ dragMode, setDragMode ] = useState<'none' | 'pan' | 'yScale' | 'xScale'>( 'none' );
  const interactionRef = useRef( {
    startX: 0,
    startY: 0,
    startXRange: { start: 0, end: 100 },
    startYRange: { start: 0, end: 100 }
  } );

  // بدء السحب
  const startDrag = ( e: React.MouseEvent ) =>
  {
    e.preventDefault();
    e.stopPropagation();
    dragStartY.current = e.clientY;
    dragStartHeight.current = currentHeight;
    setIsDragging( true );
  };

  // سحب على محور القيم (الأرقام) لتكبير/تصغير النطاق العمودي
  const startValueZoomDrag = ( e: React.MouseEvent ) =>
  {
    e.preventDefault();
    e.stopPropagation();
    valueZoomStart.current = {
      y: e.clientY,
      start: dataZoomRef.current.start,
      end: dataZoomRef.current.end,
    };
    setIsValueZoomDragging( true );
  };

  // التعامل مع حركة الماوس أثناء السحب
  useEffect( () =>
  {
    if ( !isDragging ) return;

    const onMouseMove = ( e: MouseEvent ) =>
    {
      const delta = e.clientY - dragStartY.current;
      const newHeight = Math.max( MIN_HEIGHT, Math.min( MAX_HEIGHT, dragStartHeight.current + delta ) );
      setCurrentHeight( newHeight );
    };

    const onMouseUp = () =>
    {
      setIsDragging( false );
    };

    // إضافة مستمعي الأحداث للـ window
    window.addEventListener( 'mousemove', onMouseMove );
    window.addEventListener( 'mouseup', onMouseUp );

    // تغيير مؤشر الماوس
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';

    return () =>
    {
      window.removeEventListener( 'mousemove', onMouseMove );
      window.removeEventListener( 'mouseup', onMouseUp );
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [ isDragging ] );

  // سحب لتغيير نطاق التكبير العمودي (مثل TradingView عند الأرقام)
  useEffect( () =>
  {
    if ( !isValueZoomDragging ) return;

    const onMouseMove = ( e: MouseEvent ) =>
    {
      const delta = e.clientY - valueZoomStart.current.y;
      // حساسية التكبير/التصغير العمودي
      const zoomChange = delta * 0.1;
      let start = clamp( valueZoomStart.current.start + zoomChange, 0, 99 );
      let end = clamp( valueZoomStart.current.end - zoomChange, start + 1, 100 );

      if ( chartInstanceRef.current )
      {
        chartInstanceRef.current.dispatchAction( {
          type: 'dataZoom',
          yAxisIndex: 0,
          start,
          end,
        } );
      }
    };

    const onMouseUp = () =>
    {
      setIsValueZoomDragging( false );
    };

    window.addEventListener( 'mousemove', onMouseMove );
    window.addEventListener( 'mouseup', onMouseUp );
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';

    return () =>
    {
      window.removeEventListener( 'mousemove', onMouseMove );
      window.removeEventListener( 'mouseup', onMouseUp );
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [ isValueZoomDragging ] );

  const resetZoom = () =>
  {
    setCurrentHeight( DEFAULT_HEIGHT );
    setXRange( { start: 0, end: 100 } );
    setYRange( { start: 0, end: 100 } );
    if ( chartInstanceRef.current )
    {
      chartInstanceRef.current.dispatchAction( { type: 'dataZoom', xAxisIndex: 0, start: 0, end: 100 } );
      chartInstanceRef.current.dispatchAction( { type: 'dataZoom', yAxisIndex: 0, start: 0, end: 100 } );
    }
  };

  // === TradingView-Style Mouse Drag Interactions ===
  useEffect( () =>
  {
    if ( dragMode === 'none' ) return;

    const onMouseMove = ( e: MouseEvent ) =>
    {
      const { startX, startY, startXRange, startYRange } = interactionRef.current;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if ( !containerRef.current ) return;
      const rect = containerRef.current.getBoundingClientRect();
      const chartW = rect.width - 50; // Y axis width
      const chartH = currentHeight;

      if ( dragMode === 'pan' )
      {
        // Pan horizontally
        const xLen = startXRange.end - startXRange.start;
        const pxPerPct = chartW / xLen;
        const shift = -( dx / pxPerPct );

        let ns = clamp( startXRange.start + shift, 0, 100 - xLen );
        let ne = ns + xLen;
        if ( ne > 100 ) { ne = 100; ns = 100 - xLen; }

        setXRange( { start: ns, end: ne } );
        if ( chartInstanceRef.current )
        {
          chartInstanceRef.current.dispatchAction( { type: 'dataZoom', xAxisIndex: 0, start: ns, end: ne } );
        }
      }

      if ( dragMode === 'yScale' )
      {
        // Y-axis drag: down = zoom in, up = zoom out
        const factor = 1 + dy * 0.008;
        const range = startYRange.end - startYRange.start;
        const center = ( startYRange.start + startYRange.end ) / 2;
        const newRange = clamp( range * factor, 5, 100 );
        const newStart = clamp( center - newRange / 2, 0, 100 );
        const newEnd = clamp( center + newRange / 2, 0, 100 );

        setYRange( { start: newStart, end: newEnd } );
        if ( chartInstanceRef.current )
        {
          chartInstanceRef.current.dispatchAction( { type: 'dataZoom', yAxisIndex: 0, start: newStart, end: newEnd } );
        }
      }

      if ( dragMode === 'xScale' )
      {
        // X-axis drag: right = zoom out, left = zoom in
        const xLen = startXRange.end - startXRange.start;
        const center = ( startXRange.start + startXRange.end ) / 2;
        const change = dx * 0.2;
        const newLen = clamp( xLen + change, 5, 100 );

        let ns = clamp( center - newLen / 2, 0, 100 );
        let ne = clamp( center + newLen / 2, 0, 100 );
        if ( ns === 0 ) ne = Math.min( newLen, 100 );
        if ( ne === 100 ) ns = Math.max( 0, 100 - newLen );

        setXRange( { start: ns, end: ne } );
        if ( chartInstanceRef.current )
        {
          chartInstanceRef.current.dispatchAction( { type: 'dataZoom', xAxisIndex: 0, start: ns, end: ne } );
        }
      }
    };

    const onMouseUp = () => setDragMode( 'none' );

    const cursors = { pan: 'grabbing', yScale: 'ns-resize', xScale: 'ew-resize', none: '' };
    document.body.style.cursor = cursors[ dragMode ] || '';
    document.body.style.userSelect = 'none';

    window.addEventListener( 'mousemove', onMouseMove );
    window.addEventListener( 'mouseup', onMouseUp );

    return () =>
    {
      window.removeEventListener( 'mousemove', onMouseMove );
      window.removeEventListener( 'mouseup', onMouseUp );
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [ dragMode, currentHeight ] );

  // === TradingView-Style Wheel Zoom Handler ===
  const handleWheelZoom = ( e: React.WheelEvent ) =>
  {
    e.preventDefault();
    e.stopPropagation();
    if ( !containerRef.current || !data || data.length === 0 ) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const chartW = rect.width - 50;

    const zoomIn = e.deltaY < 0;

    // Ctrl + Wheel = تكبير عمودي
    if ( e.ctrlKey )
    {
      const factor = zoomIn ? 0.88 : 1.14;
      const range = yRange.end - yRange.start;
      const center = ( yRange.start + yRange.end ) / 2;
      const newRange = clamp( range * factor, 5, 100 );
      const newStart = clamp( center - newRange / 2, 0, 100 );
      const newEnd = clamp( center + newRange / 2, 0, 100 );

      setYRange( { start: newStart, end: newEnd } );
      if ( chartInstanceRef.current )
      {
        chartInstanceRef.current.dispatchAction( { type: 'dataZoom', yAxisIndex: 0, start: newStart, end: newEnd } );
      }
      return;
    }

    // تكبير أفقي متمركز على موقع المؤشر
    const ratio = clamp( mouseX / chartW, 0, 1 );
    const { start, end } = xRange;
    const range = end - start;
    const factor = zoomIn ? 0.82 : 1.22;
    let newRange = clamp( range * factor, 5, 100 );

    const cursorPos = start + range * ratio;
    let newStart = cursorPos - newRange * ratio;
    let newEnd = newStart + newRange;

    if ( newStart < 0 ) { newStart = 0; newEnd = Math.min( newRange, 100 ); }
    if ( newEnd > 100 ) { newEnd = 100; newStart = Math.max( 0, 100 - newRange ); }

    setXRange( { start: newStart, end: newEnd } );
    if ( chartInstanceRef.current )
    {
      chartInstanceRef.current.dispatchAction( { type: 'dataZoom', xAxisIndex: 0, start: newStart, end: newEnd } );
    }
  };

  // Start pan interaction
  const startPanDrag = ( e: React.MouseEvent ) =>
  {
    e.preventDefault();
    e.stopPropagation();
    interactionRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startXRange: { ...xRange },
      startYRange: { ...yRange }
    };
    setDragMode( 'pan' );
  };

  // Start Y-axis zoom interaction
  const startYAxisDrag = ( e: React.MouseEvent ) =>
  {
    e.preventDefault();
    e.stopPropagation();
    interactionRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startXRange: { ...xRange },
      startYRange: { ...yRange }
    };
    setDragMode( 'yScale' );
  };

  // Start X-axis zoom interaction
  const startXAxisDrag = ( e: React.MouseEvent ) =>
  {
    e.preventDefault();
    e.stopPropagation();
    interactionRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startXRange: { ...xRange },
      startYRange: { ...yRange }
    };
    setDragMode( 'xScale' );
  };

  const getIndicatorConfig = () =>
  {
    switch ( type )
    {
      case "rsi": return { title: "RSI (14)", color: "#a855f7", levels: [ 30, 70 ] };
      case "macd": return { title: "MACD (12,26,9)", color: "#3b82f6", levels: [] };
      case "stochRsi": return { title: "Stoch RSI (14,14,3,3)", color: "#ec4899", levels: [ 20, 80 ] };
      case "obv": return { title: "OBV", color: "#14b8a6", levels: [] };
      case "adx": return { title: "ADX (14)", color: "#f59e0b", levels: [ 25 ] };
      case "mfi": return { title: "MFI (14)", color: "#22c55e", levels: [ 20, 80 ] };
      case "cci": return { title: "CCI (20)", color: "#ef4444", levels: [ -100, 100 ] };
      case "volume": return { title: "Volume", color: "#6366f1", levels: [] };
      case "connorsRsi": return { title: "Connors RSI", color: "#ec4899", levels: [ 20, 80 ] };
      case "laguerreRsi": return { title: "Laguerre RSI", color: "#db2777", levels: [ 20, 80 ] };
      case "vwap": return { title: "VWAP", color: "#f59e0b", levels: [] };
      case "cvd": return { title: "CVD (Delta)", color: "#b45309", levels: [] };
      case "klinger": return { title: "Klinger", color: "#92400e", levels: [] };
      case "superSmoother": return { title: "Super Smoother", color: "#06b6d4", levels: [] };
      case "instantaneousTrendline": return { title: "Instantaneous Trendline", color: "#0ea5e9", levels: [] };
      case "fisherTransform": return { title: "Fisher Transform", color: "#8b5cf6", levels: [ 0 ] };
      case "mama": return { title: "MAMA/FAMA", color: "#f43f5e", levels: [] };
      case "frama": return { title: "FRAMA", color: "#6366f1", levels: [] };
      case "cyberCycle": return { title: "Cyber Cycle", color: "#84cc16", levels: [ 0 ] };
      case "ichimoku": return { title: "Ichimoku Cloud", color: "#06b6d4", levels: [] };
      case "atrBands": return { title: "ATR Bands", color: "#8b5cf6", levels: [] };
      case "parabolicSar": return { title: "Parabolic SAR", color: "#f59e0b", levels: [] };
      case "pivots": return { title: "Smart Pivots", color: "#ec4899", levels: [] };
      case "williamsR": return { title: "Williams %R", color: "#10b981", levels: [ -20, -80 ] };
      case "advancedCci": return { title: "Advanced CCI", color: "#ef4444", levels: [ -200, 200 ] };
      case "momentumRoc": return { title: "Momentum/ROC", color: "#3b82f6", levels: [ 0 ] };
      case "ultimateOsc": return { title: "Ultimate Oscillator", color: "#a855f7", levels: [ 30, 70 ] };
      case "keltner": return { title: "Keltner Channels", color: "#f97316", levels: [] };
      case "donchian": return { title: "Donchian Channels", color: "#14b8a6", levels: [] };
      case "cmf": return { title: "Chaikin Money Flow", color: "#22c55e", levels: [ 0 ] };
      case "forceIndex": return { title: "Force Index", color: "#f43f5e", levels: [ 0 ] };
      case "choppiness": return { title: "Choppiness Index", color: "#6366f1", levels: [ 38.2, 61.8 ] };
      case "trix": return { title: "TRIX", color: "#84cc16", levels: [ 0 ] };
      case "awesomeOsc": return { title: "Awesome Oscillator", color: "#06b6d4", levels: [ 0 ] };
      default: return { title: "Indicator", color: "#6b7280", levels: [] };
    }
  };

  const config = getIndicatorConfig();
  const chartHeightClass = `sub-indicator-height-${ Math.round( currentHeight ) }`;
  const dotClass = `sub-indicator-dot-${ config.color.replace( /[^a-z0-9]/gi, '' ) }`;

  const option = useMemo( () =>
  {
    if ( !data || data.length === 0 ) return {};

    const timestamps = data.map( d =>
    {
      if ( typeof d.time === 'number' ) return d.time * 1000;
      return new Date( d.time ).getTime();
    } );

    const commonGrid = {
      left: 50, right: 20, top: 15, bottom: 15,
      containLabel: false,
      borderColor: '#1f2937',
      show: true,
      borderWidth: 0
    };

    const commonXAxis = {
      type: 'time',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
      splitLine: { show: false },
      min: timestamps[ 0 ],
      max: timestamps[ timestamps.length - 1 ]
    };

    const commonYAxis = {
      type: 'value',
      scale: true,
      splitLine: {
        show: true,
        lineStyle: { color: '#1f2937', width: 1 }
      },
      axisLabel: { color: '#9ca3af', fontSize: 10 }
    };

    const baseOption: any = {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 500,
      animationEasing: 'cubicOut',
      grid: commonGrid,
      // تمكين التكبير/التصغير داخل الشارت دون إظهار أشرطة التحكم
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: 0,
          filterMode: 'none',
          zoomOnMouseWheel: true,
          moveOnMouseWheel: true,
          moveOnMouseMove: true,
          throttle: 50
        },
        {
          type: 'inside',
          yAxisIndex: 0,
          filterMode: 'none',
          zoomOnMouseWheel: true,
          moveOnMouseWheel: true,
          moveOnMouseMove: true,
          throttle: 50
        }
      ],
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(10, 25, 41, 0.95)',
        borderColor: '#0f3133',
        textStyle: { color: '#e6edf3' },
        axisPointer: { type: 'cross', label: { backgroundColor: '#0f3133' } }
      },
      xAxis: commonXAxis,
      yAxis: commonYAxis,
      series: []
    };

    // Helper to format data for ECharts - returns [timestamp, value] pairs
    const formatDataByIndex = ( values: { time: Time; value: number }[] ) =>
    {
      return values.map( v => [
        typeof v.time === 'number' ? v.time * 1000 : new Date( v.time ).getTime(),
        v.value
      ] ).filter( d => !isNaN( d[ 1 ] as number ) );
    };

    switch ( type )
    {
      case "rsi": {
        const rsiData = calculateRSI( data );
        baseOption.series.push( {
          name: 'RSI',
          type: 'line',
          data: formatDataByIndex( rsiData ),
          itemStyle: { color: config.color },
          lineStyle: { width: 2 },
          showSymbol: false,
          markLine: {
            symbol: 'none',
            data: config.levels.map( l => ( { yAxis: l, lineStyle: { color: '#4b5563', type: 'dashed' } } ) )
          }
        } );
        break;
      }
      case "macd": {
        const { macd, signal, histogram } = calculateMACD( data );
        baseOption.series.push(
          {
            name: 'MACD',
            type: 'line',
            data: formatDataByIndex( macd ),
            itemStyle: { color: '#3b82f6' },
            showSymbol: false,
            lineStyle: { width: 2 }
          },
          {
            name: 'Signal',
            type: 'line',
            data: formatDataByIndex( signal ),
            itemStyle: { color: '#f97316' },
            showSymbol: false,
            lineStyle: { width: 2 }
          },
          {
            name: 'Histogram',
            type: 'bar',
            data: histogram.map( h => ( {
              value: [ typeof h.time === 'number' ? h.time * 1000 : new Date( h.time ).getTime(), h.value ],
              itemStyle: { color: h.color }
            } ) )
          }
        );
        break;
      }
      case "stochRsi": {
        const { k, d } = calculateStochRSI( data );
        baseOption.series.push(
          {
            name: 'K',
            type: 'line',
            data: formatDataByIndex( k ),
            itemStyle: { color: '#3b82f6' },
            showSymbol: false,
            lineStyle: { width: 2 }
          },
          {
            name: 'D',
            type: 'line',
            data: formatDataByIndex( d ),
            itemStyle: { color: '#f97316' },
            showSymbol: false,
            lineStyle: { width: 2 }
          }
        );
        baseOption.yAxis.min = 0;
        baseOption.yAxis.max = 100;
        break;
      }
      case "obv": {
        const obvData = calculateOBV( data );
        baseOption.series.push( {
          name: 'OBV',
          type: 'line',
          data: formatDataByIndex( obvData ),
          itemStyle: { color: config.color },
          showSymbol: false,
          areaStyle: {
            color: new echarts.graphic.LinearGradient( 0, 0, 0, 1, [
              { offset: 0, color: config.color + '40' },
              { offset: 1, color: config.color + '00' }
            ] )
          }
        } );
        break;
      }
      case "adx": {
        const { adx, plusDI, minusDI } = calculateADX( data );
        baseOption.series.push(
          { name: 'ADX', type: 'line', data: formatDataByIndex( adx ), itemStyle: { color: config.color }, showSymbol: false },
          { name: '+DI', type: 'line', data: formatDataByIndex( plusDI ), itemStyle: { color: '#22c55e' }, showSymbol: false, lineStyle: { width: 1 } },
          { name: '-DI', type: 'line', data: formatDataByIndex( minusDI ), itemStyle: { color: '#ef4444' }, showSymbol: false, lineStyle: { width: 1 } }
        );
        break;
      }
      case "mfi": {
        const mfiData = calculateMFI( data );
        baseOption.series.push( {
          name: 'MFI',
          type: 'line',
          data: formatDataByIndex( mfiData ),
          itemStyle: { color: config.color },
          showSymbol: false,
          markLine: {
            symbol: 'none',
            data: config.levels.map( l => ( { yAxis: l, lineStyle: { color: '#4b5563', type: 'dashed' } } ) )
          }
        } );
        break;
      }
      case "cci": {
        const cciData = calculateCCI( data );
        baseOption.series.push( {
          name: 'CCI',
          type: 'line',
          data: formatDataByIndex( cciData ),
          itemStyle: { color: config.color },
          showSymbol: false
        } );
        break;
      }
      case "volume": {
        const volData = data.map( d => ( {
          value: [ typeof d.time === 'number' ? d.time * 1000 : new Date( d.time ).getTime(), d.volume || 0 ],
          itemStyle: { color: ( d.close >= d.open ) ? '#22c55e' : '#ef4444' }
        } ) );
        baseOption.series.push( {
          name: 'Volume',
          type: 'bar',
          data: volData
        } );
        break;
      }
      case "connorsRsi": {
        const crsiData = calculateConnorsRSI( data );
        baseOption.series.push( {
          name: 'Connors RSI',
          type: 'line',
          data: formatDataByIndex( crsiData ),
          itemStyle: { color: config.color },
          showSymbol: false
        } );
        break;
      }
      case "laguerreRsi": {
        const lrsiData = calculateLaguerreRSI( data );
        baseOption.series.push( {
          name: 'Laguerre RSI',
          type: 'line',
          data: formatDataByIndex( lrsiData ),
          itemStyle: { color: config.color },
          showSymbol: false
        } );
        break;
      }
      case "vwap": {
        const vwapData = calculateVWAP( data );
        baseOption.series.push( {
          name: 'VWAP',
          type: 'line',
          data: formatDataByIndex( vwapData ),
          itemStyle: { color: config.color },
          showSymbol: false
        } );
        break;
      }
      case "cvd": {
        const cvdData = calculateCVD( data );
        baseOption.series.push( {
          name: 'CVD',
          type: 'line',
          data: cvdData.map( d => [ typeof d.time === 'number' ? d.time * 1000 : new Date( d.time ).getTime(), d.value ] ),
          itemStyle: { color: config.color },
          showSymbol: false,
          areaStyle: { opacity: 0.2 }
        } );
        break;
      }
      case "klinger": {
        const { klinger, signal, histogram } = calculateKlinger( data );
        baseOption.series.push(
          { name: 'Klinger', type: 'line', data: formatDataByIndex( klinger ), itemStyle: { color: '#3b82f6' }, showSymbol: false },
          { name: 'Signal', type: 'line', data: formatDataByIndex( signal ), itemStyle: { color: '#f97316' }, showSymbol: false },
          {
            name: 'Histogram',
            type: 'bar',
            data: histogram.map( h => ( {
              value: [ typeof h.time === 'number' ? h.time * 1000 : new Date( h.time ).getTime(), h.value ],
              itemStyle: { color: h.color }
            } ) )
          }
        );
        break;
      }
      case "superSmoother": {
        const ohlcv = data.map( d => ( { ...d, timestamp: typeof d.time === 'number' ? d.time : 0, volume: d.volume || 0 } ) );
        const ss = calculateSuperSmoother( ohlcv.map( d => d.close ) );
        baseOption.series.push( {
          name: 'Super Smoother',
          type: 'line',
          data: ss.values.map( ( v, i ) => [ timestamps[ i ], v ] ).filter( d => !isNaN( d[ 1 ] as number ) ),
          itemStyle: { color: config.color },
          showSymbol: false
        } );
        break;
      }
      case "instantaneousTrendline": {
        const closes = data.map( d => d.close );
        const it = calculateInstantaneousTrendline( closes );
        baseOption.series.push(
          { name: 'Trendline', type: 'line', data: it.values.map( ( v, i ) => [ timestamps[ i ], v ] ).filter( d => !isNaN( d[ 1 ] as number ) ), itemStyle: { color: config.color }, showSymbol: false },
          { name: 'Price', type: 'line', data: closes.map( ( v, i ) => [ timestamps[ i ], v ] ).filter( d => !isNaN( d[ 1 ] as number ) ), itemStyle: { color: '#f97316' }, showSymbol: false, lineStyle: { type: 'dashed' } }
        );
        break;
      }
      case "fisherTransform": {
        const ohlcv = data.map( d => ( { ...d, timestamp: typeof d.time === 'number' ? d.time : 0, volume: d.volume || 0 } ) );
        const ft = calculateFisherTransform( ohlcv );
        const fisherArray = Array.isArray( ft.fisherArray ) ? ft.fisherArray : [];
        const triggerArray = Array.isArray( ft.triggerArray ) ? ft.triggerArray : [];
        baseOption.series.push(
          { name: 'Fisher', type: 'line', data: fisherArray.map( ( v, i ) => [ timestamps[ i ], v ] ).filter( d => d[ 1 ] !== null && !isNaN( d[ 1 ] as number ) ), itemStyle: { color: config.color }, showSymbol: false },
          { name: 'Trigger', type: 'line', data: triggerArray.map( ( v, i ) => [ timestamps[ i ], v ] ).filter( d => d[ 1 ] !== null && !isNaN( d[ 1 ] as number ) ), itemStyle: { color: '#f97316' }, showSymbol: false }
        );
        break;
      }
      case "mama": {
        const closes = data.map( d => d.close );
        const mama = calculateMAMA( closes );
        baseOption.series.push(
          { name: 'MAMA', type: 'line', data: mama.mamaArray.map( ( v, i ) => [ timestamps[ i ], v ] ).filter( d => !isNaN( d[ 1 ] as number ) ), itemStyle: { color: config.color }, showSymbol: false },
          { name: 'FAMA', type: 'line', data: mama.famaArray.map( ( v, i ) => [ timestamps[ i ], v ] ).filter( d => !isNaN( d[ 1 ] as number ) ), itemStyle: { color: '#f97316' }, showSymbol: false }
        );
        break;
      }
      case "frama": {
        const ohlcv = data.map( d => ( { ...d, timestamp: typeof d.time === 'number' ? d.time : 0, volume: d.volume || 0 } ) );
        const framaResult = calculateFRAMA( ohlcv );
        const framaValues = Array.isArray( framaResult.framaArray ) ? framaResult.framaArray : [];
        baseOption.series.push( {
          name: 'FRAMA',
          type: 'line',
          data: framaValues.map( ( v: number, i: number ) => [ timestamps[ i ], v ] as [ number, number ] ).filter( ( d ) => !isNaN( d[ 1 ] ) ),
          itemStyle: { color: config.color },
          showSymbol: false
        } );
        break;
      }
      case "cyberCycle": {
        const closes = data.map( d => d.close );
        const cc = calculateCyberCycle( closes );
        baseOption.series.push(
          { name: 'Cycle', type: 'line', data: cc.cycleArray.map( ( v, i ) => [ timestamps[ i ], v ] ).filter( d => !isNaN( d[ 1 ] as number ) ), itemStyle: { color: config.color }, showSymbol: false },
          { name: 'Trigger', type: 'line', data: cc.triggerArray.map( ( v, i ) => [ timestamps[ i ], v ] ).filter( d => !isNaN( d[ 1 ] as number ) ), itemStyle: { color: '#f97316' }, showSymbol: false }
        );
        break;
      }
      case "ichimoku": {
        const ohlcv = data.map( d => ( { ...d, timestamp: typeof d.time === 'number' ? d.time : 0, volume: d.volume || 0 } ) );
        const ichi = calculateIchimoku( ohlcv );
        baseOption.series.push(
          { name: 'Conversion', type: 'line', data: ichi.tenkan.map( ( v: number, i: number ) => [ timestamps[ i ], v ] ).filter( d => !isNaN( d[ 1 ] as number ) ), itemStyle: { color: '#3b82f6' }, showSymbol: false },
          { name: 'Base', type: 'line', data: ichi.kijun.map( ( v: number, i: number ) => [ timestamps[ i ], v ] ).filter( d => !isNaN( d[ 1 ] as number ) ), itemStyle: { color: '#ef4444' }, showSymbol: false }
        );
        break;
      }
      case "atrBands": {
        const ohlcv = data.map( d => ( { ...d, timestamp: typeof d.time === 'number' ? d.time : 0, volume: d.volume || 0 } ) );
        const atr = calculateATRBands( ohlcv );
        baseOption.series.push(
          { name: 'Upper', type: 'line', data: atr.upper.map( ( v, i ) => [ timestamps[ i ], v ] ).filter( d => !isNaN( d[ 1 ] as number ) ), itemStyle: { color: config.color }, showSymbol: false, lineStyle: { type: 'dashed' } },
          { name: 'Lower', type: 'line', data: atr.lower.map( ( v, i ) => [ timestamps[ i ], v ] ).filter( d => !isNaN( d[ 1 ] as number ) ), itemStyle: { color: config.color }, showSymbol: false, lineStyle: { type: 'dashed' } }
        );
        break;
      }
      case "parabolicSar": {
        const ohlcv = data.map( d => ( { ...d, timestamp: typeof d.time === 'number' ? d.time : 0, volume: d.volume || 0 } ) );
        const sar = calculateParabolicSAR( ohlcv );
        baseOption.series.push( {
          name: 'SAR',
          type: 'scatter',
          symbolSize: 4,
          data: sar.sar.map( ( v, i ) => [ timestamps[ i ], v ] ).filter( d => !isNaN( d[ 1 ] as number ) ),
          itemStyle: { color: config.color }
        } );
        break;
      }
      case "pivots": {
        break;
      }
      case "williamsR": {
        const ohlcv = data.map( d => ( { ...d, timestamp: typeof d.time === 'number' ? d.time : 0, volume: d.volume || 0 } ) );
        const wr = calculateWilliamsR( ohlcv );
        baseOption.series.push( {
          name: 'Williams %R',
          type: 'line',
          data: wr.values.map( ( v, i ) => [ timestamps[ i ], v ] ).filter( d => !isNaN( d[ 1 ] as number ) ),
          itemStyle: { color: config.color },
          showSymbol: false
        } );
        break;
      }
      case "advancedCci": {
        const ohlcv = data.map( d => ( { ...d, timestamp: typeof d.time === 'number' ? d.time : 0, volume: d.volume || 0 } ) );
        const acci = calculateAdvancedCCI( ohlcv );
        baseOption.series.push( {
          name: 'Advanced CCI',
          type: 'line',
          data: acci.values.map( ( v, i ) => [ timestamps[ i ], v ] ).filter( d => !isNaN( d[ 1 ] as number ) ),
          itemStyle: { color: config.color },
          showSymbol: false
        } );
        break;
      }
      case "momentumRoc": {
        const ohlcv = data.map( d => ( { ...d, timestamp: typeof d.time === 'number' ? d.time : 0, volume: d.volume || 0 } ) );
        const roc = calculateMomentumROC( ohlcv );
        baseOption.series.push( {
          name: 'ROC',
          type: 'line',
          data: roc.roc.map( ( v, i ) => [ timestamps[ i ], v ] ).filter( d => !isNaN( d[ 1 ] as number ) ),
          itemStyle: { color: config.color },
          showSymbol: false
        } );
        break;
      }
      case "ultimateOsc": {
        const ohlcv = data.map( d => ( { ...d, timestamp: typeof d.time === 'number' ? d.time : 0, volume: d.volume || 0 } ) );
        const uo = calculateUltimateOscillator( ohlcv );
        baseOption.series.push( {
          name: 'Ultimate Osc',
          type: 'line',
          data: uo.values.map( ( v, i ) => [ timestamps[ i ], v ] ).filter( d => !isNaN( d[ 1 ] as number ) ),
          itemStyle: { color: config.color },
          showSymbol: false
        } );
        break;
      }
      case "keltner": {
        const ohlcv = data.map( d => ( { ...d, timestamp: typeof d.time === 'number' ? d.time : 0, volume: d.volume || 0 } ) );
        const kelt = calculateKeltnerChannels( ohlcv );
        baseOption.series.push(
          { name: 'Upper', type: 'line', data: kelt.upper.map( ( v, i ) => [ timestamps[ i ], v ] ).filter( d => !isNaN( d[ 1 ] as number ) ), itemStyle: { color: config.color }, showSymbol: false },
          { name: 'Lower', type: 'line', data: kelt.lower.map( ( v, i ) => [ timestamps[ i ], v ] ).filter( d => !isNaN( d[ 1 ] as number ) ), itemStyle: { color: config.color }, showSymbol: false }
        );
        break;
      }
      case "donchian": {
        const ohlcv = data.map( d => ( { ...d, timestamp: typeof d.time === 'number' ? d.time : 0, volume: d.volume || 0 } ) );
        const don = calculateDonchianChannels( ohlcv );
        baseOption.series.push(
          { name: 'Upper', type: 'line', data: don.upper.map( ( v, i ) => [ timestamps[ i ], v ] ).filter( d => !isNaN( d[ 1 ] as number ) ), itemStyle: { color: config.color }, showSymbol: false },
          { name: 'Lower', type: 'line', data: don.lower.map( ( v, i ) => [ timestamps[ i ], v ] ).filter( d => !isNaN( d[ 1 ] as number ) ), itemStyle: { color: config.color }, showSymbol: false }
        );
        break;
      }
      case "cmf": {
        const ohlcv = data.map( d => ( { ...d, timestamp: typeof d.time === 'number' ? d.time : 0, volume: d.volume || 0 } ) );
        const cmf = calculateCMF( ohlcv );
        baseOption.series.push( {
          name: 'CMF',
          type: 'line',
          data: cmf.values.map( ( v, i ) => [ timestamps[ i ], v ] ).filter( d => !isNaN( d[ 1 ] as number ) ),
          itemStyle: { color: config.color },
          showSymbol: false,
          areaStyle: { opacity: 0.2 }
        } );
        break;
      }
      case "forceIndex": {
        const ohlcv = data.map( d => ( { ...d, timestamp: typeof d.time === 'number' ? d.time : 0, volume: d.volume || 0 } ) );
        const fi = calculateForceIndex( ohlcv );
        baseOption.series.push( {
          name: 'Force Index',
          type: 'line',
          data: fi.smoothed.map( ( v, i ) => [ timestamps[ i ], v ] ).filter( d => !isNaN( d[ 1 ] as number ) ),
          itemStyle: { color: config.color },
          showSymbol: false
        } );
        break;
      }
      case "choppiness": {
        const ohlcv = data.map( d => ( { ...d, timestamp: typeof d.time === 'number' ? d.time : 0, volume: d.volume || 0 } ) );
        const chop = calculateChoppinessIndex( ohlcv );
        baseOption.series.push( {
          name: 'Choppiness',
          type: 'line',
          data: chop.values.map( ( v, i ) => [ timestamps[ i ], v ] ).filter( d => !isNaN( d[ 1 ] as number ) ),
          itemStyle: { color: config.color },
          showSymbol: false
        } );
        break;
      }
      case "trix": {
        const ohlcv = data.map( d => ( { ...d, timestamp: typeof d.time === 'number' ? d.time : 0, volume: d.volume || 0 } ) );
        const trix = calculateTRIX( ohlcv );
        baseOption.series.push(
          { name: 'TRIX', type: 'line', data: trix.values.map( ( v, i ) => [ timestamps[ i ], v ] ).filter( d => !isNaN( d[ 1 ] as number ) ), itemStyle: { color: config.color }, showSymbol: false },
          { name: 'Signal', type: 'line', data: trix.signal.map( ( v, i ) => [ timestamps[ i ], v ] ).filter( d => !isNaN( d[ 1 ] as number ) ), itemStyle: { color: '#f97316' }, showSymbol: false }
        );
        break;
      }
      case "awesomeOsc": {
        const ohlcv = data.map( d => ( { ...d, timestamp: typeof d.time === 'number' ? d.time : 0, volume: d.volume || 0 } ) );
        const ao = calculateAwesomeOscillator( ohlcv );
        baseOption.series.push( {
          name: 'AO',
          type: 'bar',
          data: ao.values.map( ( v, i ) => ( {
            value: [ timestamps[ i ], v ],
            itemStyle: { color: v >= 0 ? '#22c55e' : '#ef4444' }
          } ) )
        } );
        break;
      }
    }

    return baseOption;
  }, [ data, type, config ] );

  return (
    <div
      ref={ containerRef }
      className="relative border-t border-[#363a45] bg-[linear-gradient(90deg,_#030508,_#0d3b3b)]"
    >
      <style>{ `.${ chartHeightClass }{height:${ currentHeight }px;} .${ dotClass }{background-color:${ config.color };}` }</style>
      {/* Y-Axis interaction zone (Left side) - تكبير/تصغير عمودي */ }
      <div
        className={ `absolute inset-y-3 left-0 w-12 cursor-ns-resize z-40 flex items-center justify-center touch-none 
          ${ dragMode === 'yScale' ? 'bg-blue-500/20' : 'hover:bg-blue-500/10' }` }
        onMouseDown={ startYAxisDrag }
      >
        <div className={ `h-10 w-0.5 rounded-full 
          ${ dragMode === 'yScale' ? 'bg-blue-400' : 'bg-blue-400/40' }` } />
      </div>

      {/* Main chart interaction overlay - wheel zoom + pan */ }
      <div
        className={ `absolute z-15 pointer-events-auto top-[35px] left-[50px] right-[20px] bottom-[15px] ${ dragMode === 'pan' ? 'cursor-grabbing' : 'cursor-crosshair' }` }
        onMouseDown={ startPanDrag }
        onWheel={ handleWheelZoom }
        onDoubleClick={ resetZoom }
      />

      {/* X-Axis interaction zone (Bottom) - تكبير/تصغير أفقي */ }
      <div
        className={ `absolute left-12 right-5 h-4 bottom-0 cursor-ew-resize z-40 
          ${ dragMode === 'xScale' ? 'bg-blue-500/20' : 'hover:bg-blue-500/10' }` }
        onMouseDown={ startXAxisDrag }
      />

      {/* TradingView-style Top Resize Handle - سحب من الحافة العلوية */ }
      <div
        className={ `absolute top-0 left-0 right-0 h-3 cursor-ns-resize z-30 touch-none 
          ${ isDragging ? 'bg-blue-500/50' : 'hover:bg-blue-500/40' }` }
        onMouseDown={ startDrag }
      >
        {/* خط مرئي */ }
        <div className={ `absolute bottom-0 left-0 right-0 h-1 
          ${ isDragging ? 'bg-blue-500' : 'bg-blue-500/30' }` } />
        {/* أيقونة السحب في المنتصف */ }
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <GripHorizontal className={ `w-8 h-4 ${ isDragging ? 'text-blue-400' : 'text-blue-400/60' }` } />
        </div>
      </div>

      {/* Header */ }
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/30 mt-3">
        <div className="flex items-center gap-2">
          <div className={ `w-2 h-2 rounded-full ${ dotClass }` } />
          <span className="text-xs font-medium text-white/90">{ config.title }</span>
          { config.levels.length > 0 && (
            <span className="text-[10px] text-muted-foreground">
              [{ config.levels.join( "/" ) }]
            </span>
          ) }
          <span className="text-[10px] text-blue-400/70 font-mono">
            { currentHeight }px | { Math.round( xRange.end - xRange.start ) }%
          </span>
        </div>

        <button
          onClick={ onClose }
          className="p-1 hover:bg-red-500/20 rounded transition-colors"
          title="إغلاق"
        >
          <X className="w-4 h-4 text-muted-foreground hover:text-red-400" />
        </button>
      </div>

      {/* Chart */ }
      <div
        className={ `w-full overflow-hidden ${ chartHeightClass }` }
      >
        <ReactECharts
          option={ option }
          className={ `w-full ${ chartHeightClass }` }
          theme="dark"
          onChartReady={ ( instance ) =>
          {
            chartInstanceRef.current = instance;
          } }
          onEvents={ {
            datazoom: ( params: any ) =>
            {
              const dz = Array.isArray( params?.batch ) ? params.batch[ 0 ] : params;
              if ( dz && dz.start != null && dz.end != null )
              {
                dataZoomRef.current = { start: dz.start, end: dz.end };
              }
            },
            dblclick: resetZoom,
          } }
        />
      </div>

      {/* TradingView-style Bottom Resize Handle - سحب من الحافة السفلية */ }
      <div
        className={ `absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize z-30 touch-none 
          ${ isDragging ? 'bg-blue-500/50' : 'hover:bg-blue-500/40' }` }
        onMouseDown={ startDrag }
      >
        {/* خط مرئي */ }
        <div className={ `absolute top-0 left-0 right-0 h-1 
          ${ isDragging ? 'bg-blue-500' : 'bg-blue-500/30' }` } />
        {/* أيقونة السحب في المنتصف */ }
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <GripHorizontal className={ `w-8 h-4 ${ isDragging ? 'text-blue-400' : 'text-blue-400/60' }` } />
        </div>
      </div>
    </div>
  );
}

// ============================================
// Sub Charts Container
// ============================================

interface SubChartsContainerProps
{
  data: CandleData[];
  indicators: {
    rsi: boolean;
    macd: boolean;
    stochRsi: boolean;
    obv: boolean;
    adx: boolean;
    mfi: boolean;
    volume: boolean;
    connorsRsi?: boolean;
    laguerreRsi?: boolean;
    vwap?: boolean;
    cvd?: boolean;
    klinger?: boolean;
    superSmoother?: boolean;
    instantaneousTrendline?: boolean;
    fisherTransform?: boolean;
    mama?: boolean;
    frama?: boolean;
    cyberCycle?: boolean;
    ichimoku?: boolean;
    atrBands?: boolean;
    parabolicSar?: boolean;
    pivots?: boolean;
    williamsR?: boolean;
    advancedCci?: boolean;
    momentumRoc?: boolean;
    ultimateOsc?: boolean;
    keltner?: boolean;
    donchian?: boolean;
    cmf?: boolean;
    forceIndex?: boolean;
    choppiness?: boolean;
    trix?: boolean;
    awesomeOsc?: boolean;
  };
  onToggle: ( indicator: string, value: boolean ) => void;
}

export function SubChartsContainer ( { data, indicators, onToggle }: SubChartsContainerProps )
{
  const activeIndicators = Object.entries( indicators )
    .filter( ( [ _, active ] ) => active )
    .map( ( [ key ] ) => key );

  if ( activeIndicators.length === 0 ) return null;

  return (
    <div className="rounded-b-xl overflow-hidden">
      { activeIndicators.map( ( indicator ) => (
        <SubIndicatorChart
          key={ indicator }
          type={ indicator as any }
          data={ data }
          height={ 120 }
          onClose={ () => onToggle( indicator, false ) }
        />
      ) ) }
    </div>
  );
}

export default SubIndicatorChart;
