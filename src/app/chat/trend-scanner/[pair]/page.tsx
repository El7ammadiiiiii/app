"use client";

/**
 * ⚠️ PROTECTED FILE - DO NOT MODIFY ⚠️
 * 🔒 ملف محمي - لا تقم بالتعديل 🔒
 * 
 * Trend Scanner Pair Details Page - صفحة تفاصيل الزوج
 * @locked true
 * @last-reviewed 2025-12-14
 */

import React, { useState, useEffect, useMemo } from "react";
import ReactDOM from "react-dom";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import
{
  ArrowLeft, TrendingUp, TrendingDown, RefreshCw, ChevronDown, ChevronUp
} from "lucide-react";
import
{
  type OHLCV,
  type Timeframe,
  timeframeLabels
} from "@/lib/indicators/technical";
import { analysisAPI, createDefaultIndicatorConfig, type AnalysisResponse, type OHLCVData } from "@/lib/analysis-api";
import { TradingChartV2 as TradingChart } from "@/components/charts/TradingChartV2";
import { IndicatorPanel, useIndicatorSettings, type IndicatorSettings } from "@/components/charts/IndicatorPanel";
import { SubChartsContainerV2 as SubChartsContainer } from "@/components/charts/SubIndicatorChartV2";
import { SMCSummary } from "@/components/charts/SMCOverlay";
import type { SMCAnalysis } from "@/lib/indicators/smartMoneyConcepts";
import { TOP_200_COINS } from "@/lib/constants/market";
import { useExchangeStore } from "@/stores/exchangeStore";
import { apiService } from "@/lib/services/apiService";

// ============================================
// Types & Constants
// ============================================

const TIMEFRAMES: Timeframe[] = [ "15m", "1h", "4h", "1d", "1w" ];

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

const getWidthClass = ( percent: number ) =>
{
  const clamped = Math.max( 0, Math.min( 100, percent ) );
  const step = Math.round( clamped / 5 ) * 5;
  return WIDTH_CLASSES[ step ] || 'w-[0%]';
};

type TrendStrengthSnapshot = {
  trend: 'bullish' | 'bearish' | 'neutral';
  bullishScore: number;
  bearishScore: number;
  score?: number;
  regime?: string;
  positives?: string[];
  negatives?: string[];
  notes?: string[];
};

type SignalItem = { indicator: string; strength: number };

type PythonAnalysis = {
  trendStrength: TrendStrengthSnapshot;
  signals: { buySignals: SignalItem[]; sellSignals: SignalItem[] };
  confidence?: { confidenceLevel?: string };
};

const normalizeStrength = ( value: unknown ) =>
{
  if ( typeof value === 'number' )
  {
    return value <= 1 ? value * 100 : value;
  }
  if ( typeof value === 'string' )
  {
    const v = value.toLowerCase();
    if ( v.includes( 'strong' ) ) return 80;
    if ( v.includes( 'medium' ) ) return 60;
    if ( v.includes( 'weak' ) ) return 40;
  }
  return 60;
};

const buildSignalList = ( reasons: string[] | undefined, strength: number ) =>
{
  if ( !reasons || reasons.length === 0 ) return [] as SignalItem[];
  return reasons.map( ( reason ) => ( {
    indicator: reason,
    strength
  } ) );
};

const mapTrendStrength = ( trendStrength?: AnalysisResponse[ 'trend_strength' ] ): TrendStrengthSnapshot | null =>
{
  if ( !trendStrength ) return null;
  return {
    trend: trendStrength.trend,
    bullishScore: trendStrength.bullish_score,
    bearishScore: trendStrength.bearish_score,
    score: trendStrength.score,
    regime: trendStrength.regime,
    positives: trendStrength.positives ?? [],
    negatives: trendStrength.negatives ?? [],
    notes: trendStrength.notes ?? []
  };
};

// ============================================
// Hooks
// ============================================

function useMultiTimeframeAnalysis ( symbol: string, exchange: string )
{
  const [ data, setData ] = useState<{
    [ key in Timeframe ]?: {
      ohlcv: OHLCV[];
      analysis: TrendStrengthSnapshot | null;
      advancedAnalysis?: PythonAnalysis | null;
    };
  }>( {} );
  const [ loading, setLoading ] = useState( true );
  const [ error, setError ] = useState<string | null>( null );
  const [ priceInfo, setPriceInfo ] = useState( { price: 0, change24h: 0 } );
  const [ lastUpdate, setLastUpdate ] = useState<Date | null>( null );

  const fetchData = async () =>
  {
    try
    {
      setLoading( true );

      const results = await Promise.all(
        TIMEFRAMES.map( async ( tf ) =>
        {
          try
          {
            // استخدام نظام المنصات المركزي
            const ohlcv = await apiService.getCandlesticks( {
              exchange,
              symbol,
              timeframe: tf,
              limit: 500
            } ) || [];

            // Transform to advanced format
            const ohlcvData: OHLCVData = {
              open: ohlcv.map( ( d: OHLCV ) => d.open ),
              high: ohlcv.map( ( d: OHLCV ) => d.high ),
              low: ohlcv.map( ( d: OHLCV ) => d.low ),
              close: ohlcv.map( ( d: OHLCV ) => d.close ),
              volume: ohlcv.map( ( d: OHLCV ) => d.volume ),
              timestamp: ohlcv.map( ( d: OHLCV ) => d.timestamp || Date.now() )
            };

            let advancedAnalysis: PythonAnalysis | null = null;
            let analysis: TrendStrengthSnapshot | null = null;

            if ( ohlcv.length >= 50 )
            {
              try
              {
                const indicatorConfig = createDefaultIndicatorConfig();
                const response = await analysisAPI.analyze( {
                  ohlcv: ohlcvData,
                  indicators: indicatorConfig
                } );

                const trendStrength = mapTrendStrength( response.trend_strength );
                if ( trendStrength )
                {
                  const bullishStrength = normalizeStrength( trendStrength.bullishScore );
                  const bearishStrength = normalizeStrength( trendStrength.bearishScore );
                  advancedAnalysis = {
                    trendStrength,
                    signals: {
                      buySignals: buildSignalList( trendStrength.positives, bullishStrength ),
                      sellSignals: buildSignalList( trendStrength.negatives, bearishStrength )
                    }
                  };
                  analysis = trendStrength;
                }
              } catch
              {
                analysis = null;
                advancedAnalysis = null;
              }
            }

            return { tf, ohlcv, analysis, advancedAnalysis };
          } catch
          {
            return { tf, ohlcv: [], analysis: null, advancedAnalysis: null };
          }
        } )
      );

      const newData: typeof data = {};
      results.forEach( ( { tf, ohlcv, analysis, advancedAnalysis } ) =>
      {
        newData[ tf ] = { ohlcv, analysis, advancedAnalysis };
      } );

      setData( newData );

      // Calculate price and 24h change from 1d data
      const dailyData = newData[ "1d" ]?.ohlcv || [];
      if ( dailyData.length > 0 )
      {
        const currentPrice = dailyData[ dailyData.length - 1 ].close;
        const prevPrice = dailyData.length > 1 ? dailyData[ dailyData.length - 2 ].close : currentPrice;
        const change = ( ( currentPrice - prevPrice ) / prevPrice ) * 100;
        setPriceInfo( { price: currentPrice, change24h: change } );
      }

      setLastUpdate( new Date() );
      setError( null );
    } catch ( err )
    {
      setError( String( err ) );
    } finally
    {
      setLoading( false );
    }
  };

  useEffect( () =>
  {
    fetchData();
    const intervalId = setInterval( fetchData, 60000 );
    return () => clearInterval( intervalId );
  }, [ symbol, exchange ] );

  return { data, loading, error, priceInfo, lastUpdate, refetch: fetchData };
}

// ============================================
// Components
// ============================================

function TimeframeCard ( {
  timeframe,
  analysis,
  advancedAnalysis
}: {
  timeframe: Timeframe;
  analysis: TrendStrengthSnapshot | null;
  advancedAnalysis?: PythonAnalysis | null;
} )
{
  if ( !analysis )
  {
    return (
      <div className="template-card rounded-xl p-4">
        <div className="text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const { bullishScore, bearishScore, trend } = analysis;
  const total = bullishScore + bearishScore;
  const bullishPercent = total > 0 ? ( bullishScore / total ) * 100 : 50;

  const trendColor = trend === "bullish"
    ? "text-emerald-400"
    : trend === "bearish"
      ? "text-red-400"
      : "text-gray-400";

  const trendBg = trend === "bullish"
    ? "bg-emerald-500/10 border-emerald-500/30"
    : trend === "bearish"
      ? "bg-red-500/10 border-red-500/30"
      : "bg-gray-500/10 border-gray-500/30";

  return (
    <motion.div
      initial={ { opacity: 0, y: 20 } }
      animate={ { opacity: 1, y: 0 } }
      className={ `rounded-xl p-4 border ${ trendBg }` }
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-lg font-bold text-white">
          { timeframeLabels[ timeframe ] }
        </span>
        <span className={ `text-sm font-medium ${ trendColor }` }>
          { trend === "bullish" ? "Bullish" : trend === "bearish" ? "Bearish" : "Neutral" }
        </span>
      </div>

      {/* Progress bar */ }
      <div className="mb-4">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Bullish { bullishScore.toFixed( 0 ) }%</span>
          <span>Bearish { bearishScore.toFixed( 0 ) }%</span>
        </div>
        <div className="h-3 rounded-full overflow-hidden flex bg-black/30">
          <div
            className={ `h-full bg-gradient-to-r from-emerald-600 to-emerald-400 ${ getWidthClass( bullishPercent ) }` }
          />
          <div
            className={ `h-full bg-gradient-to-r from-red-400 to-red-600 ${ getWidthClass( 100 - bullishPercent ) }` }
          />
        </div>
      </div>

      {/* Indicators */ }
      { advancedAnalysis && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Indicators:</div>
          <div className="flex flex-wrap gap-1">
            { advancedAnalysis.signals.buySignals.slice( 0, 3 ).map( ( sig, idx ) => (
              <span key={ idx } className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                { sig.indicator }
              </span>
            ) ) }
            { advancedAnalysis.signals.sellSignals.slice( 0, 3 ).map( ( sig, idx ) => (
              <span key={ idx } className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-300">
                { sig.indicator }
              </span>
            ) ) }
          </div>
        </div>
      ) }
    </motion.div>
  );
}

// ============================================
// Indicator Dropdown Bar Component
// ============================================

interface IndicatorDropdownBarProps
{
  indicatorSettings: IndicatorSettings;
  setIndicatorSettings: React.Dispatch<React.SetStateAction<IndicatorSettings>>;
}

function IndicatorDropdownBar ( { indicatorSettings, setIndicatorSettings }: IndicatorDropdownBarProps )
{
  const [ openDropdown, setOpenDropdown ] = useState<string | null>( null );
  const [ dropdownPosition, setDropdownPosition ] = useState<{ top: number; left: number } | null>( null );
  const buttonRefs = React.useRef<Record<string, HTMLButtonElement | null>>( {} );

  const toggleDropdown = ( name: string, buttonEl: HTMLButtonElement | null ) =>
  {
    if ( openDropdown === name )
    {
      setOpenDropdown( null );
      setDropdownPosition( null );
    } else
    {
      if ( buttonEl )
      {
        const rect = buttonEl.getBoundingClientRect();
        setDropdownPosition( {
          top: rect.bottom + 8,
          left: rect.left
        } );
      }
      setOpenDropdown( name );
    }
  };

  // Close dropdown when clicking outside
  React.useEffect( () =>
  {
    if ( !openDropdown ) return;

    const handleClickOutside = ( e: MouseEvent ) =>
    {
      const target = e.target as HTMLElement;
      if ( !target.closest( '[data-dropdown-menu]' ) && !target.closest( '[data-dropdown-trigger]' ) )
      {
        setOpenDropdown( null );
        setDropdownPosition( null );
      }
    };

    document.addEventListener( 'mousedown', handleClickOutside );
    return () => document.removeEventListener( 'mousedown', handleClickOutside );
  }, [ openDropdown ] );

  const toggleIndicator = ( key: keyof IndicatorSettings ) =>
  {
    setIndicatorSettings( { ...indicatorSettings, [ key ]: !indicatorSettings[ key ] } );
  };

  // Define indicator groups
  const indicatorGroups = [
    {
      name: 'core',
      label: 'Core',
      color: 'cyan',
      indicators: [
        { key: 'volume' as keyof IndicatorSettings, label: 'Volume' },
        { key: 'rsi' as keyof IndicatorSettings, label: 'RSI' },
        { key: 'macd' as keyof IndicatorSettings, label: 'MACD' },
        { key: 'stochRsi' as keyof IndicatorSettings, label: 'Stoch' },
        { key: 'obv' as keyof IndicatorSettings, label: 'OBV' },
        { key: 'adx' as keyof IndicatorSettings, label: 'ADX' },
        { key: 'mfi' as keyof IndicatorSettings, label: 'MFI' },
      ]
    },
    {
      name: 'advanced',
      label: 'Advanced',
      color: 'emerald',
      indicators: [
        { key: 'connorsRsi' as keyof IndicatorSettings, label: 'Connors' },
        { key: 'laguerreRsi' as keyof IndicatorSettings, label: 'Laguerre' },
        { key: 'vwap' as keyof IndicatorSettings, label: 'VWAP' },
        { key: 'cvd' as keyof IndicatorSettings, label: 'CVD' },
        { key: 'klinger' as keyof IndicatorSettings, label: 'Klinger' },
      ]
    },
    {
      name: 'ehlers',
      label: 'Ehlers DSP',
      color: 'violet',
      indicators: [
        { key: 'superSmoother' as keyof IndicatorSettings, label: 'Super Smoother' },
        { key: 'instantaneousTrendline' as keyof IndicatorSettings, label: 'Inst. Trendline' },
        { key: 'fisherTransform' as keyof IndicatorSettings, label: 'Fisher Transform' },
        { key: 'mama' as keyof IndicatorSettings, label: 'Adaptive MAMA' },
        { key: 'frama' as keyof IndicatorSettings, label: 'FRAMA' },
        { key: 'cyberCycle' as keyof IndicatorSettings, label: 'Cyber Cycle' },
      ]
    },
    {
      name: 'elite',
      label: 'Elite',
      color: 'amber',
      indicators: [
        { key: 'williamsR' as keyof IndicatorSettings, label: 'Williams %R' },
        { key: 'advancedCci' as keyof IndicatorSettings, label: 'CCI' },
        { key: 'momentumRoc' as keyof IndicatorSettings, label: 'ROC' },
        { key: 'ultimateOsc' as keyof IndicatorSettings, label: 'Ultimate' },
        { key: 'cmf' as keyof IndicatorSettings, label: 'CMF' },
        { key: 'forceIndex' as keyof IndicatorSettings, label: 'Force' },
        { key: 'choppiness' as keyof IndicatorSettings, label: 'Chop' },
        { key: 'trix' as keyof IndicatorSettings, label: 'TRIX' },
        { key: 'awesomeOsc' as keyof IndicatorSettings, label: 'AO' },
      ]
    }
  ];

  const getActiveCount = ( group: typeof indicatorGroups[ 0 ] ) =>
  {
    return group.indicators.filter( ind => indicatorSettings[ ind.key ] ).length;
  };

  const colorClasses: Record<string, { btn: string; btnActive: string; dropdown: string }> = {
    cyan: {
      btn: 'bg-cyan-900/30 border-cyan-500/30 text-cyan-400 hover:bg-cyan-800/40',
      btnActive: 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300',
      dropdown: 'border-cyan-500/30'
    },
    emerald: {
      btn: 'bg-emerald-900/30 border-emerald-500/30 text-emerald-400 hover:bg-emerald-800/40',
      btnActive: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300',
      dropdown: 'border-emerald-500/30'
    },
    violet: {
      btn: 'bg-violet-900/30 border-violet-500/30 text-violet-400 hover:bg-violet-800/40',
      btnActive: 'bg-violet-500/20 border-violet-500/50 text-violet-300',
      dropdown: 'border-violet-500/30'
    },
    amber: {
      btn: 'bg-amber-900/30 border-amber-500/30 text-amber-400 hover:bg-amber-800/40',
      btnActive: 'bg-amber-500/20 border-amber-500/50 text-amber-300',
      dropdown: 'border-amber-500/30'
    }
  };

  // Get the current open group for portal rendering
  const currentOpenGroup = openDropdown ? indicatorGroups.find( g => g.name === openDropdown ) : null;

  return (
    <div className="px-4 py-3 border-t border-white/10" style={ { background: 'rgba(255, 255, 255, 0.05)' } }>
      <div className="flex items-center justify-center gap-3 flex-wrap">
        { indicatorGroups.map( ( group ) =>
        {
          const isOpen = openDropdown === group.name;
          const activeCount = getActiveCount( group );
          const colors = colorClasses[ group.color ];

          return (
            <div key={ group.name }>
              {/* Dropdown Trigger Button */ }
              <button
                ref={ ( el ) => { buttonRefs.current[ group.name ] = el; } }
                data-dropdown-trigger
                onClick={ ( e ) => toggleDropdown( group.name, e.currentTarget ) }
                className={ `flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border transition-all ${ isOpen ? colors.btnActive : colors.btn
                  }` }
              >
                <span>{ group.label }</span>
                { activeCount > 0 && (
                  <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] font-bold">
                    { activeCount }
                  </span>
                ) }
                { isOpen ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) }
              </button>
            </div>
          );
        } ) }
      </div>

      {/* Portal-rendered Dropdown Menu */ }
      { typeof document !== 'undefined' && currentOpenGroup && dropdownPosition && ReactDOM.createPortal(
        <div
          data-dropdown-menu
          className={ `fixed w-40 rounded-xl border ${ colorClasses[ currentOpenGroup.color ].dropdown } shadow-2xl overflow-hidden` }
          style={ {
            backgroundColor: '#264a46',
            zIndex: 99999999,
            top: dropdownPosition.top,
            left: dropdownPosition.left,
          } }
        >
          <div className="py-2 max-h-72 overflow-y-auto">
            { currentOpenGroup.indicators.map( ( indicator ) =>
            {
              const isActive = indicatorSettings[ indicator.key ];
              return (
                <button
                  key={ indicator.key }
                  onClick={ () => toggleIndicator( indicator.key ) }
                  className={ `w-full flex items-center justify-between px-3 py-2 text-sm font-medium transition-all ${ isActive
                      ? 'bg-white/10 text-white'
                      : 'text-white/60 hover:bg-white/5 hover:text-white/80'
                    }` }
                >
                  <span>{ indicator.label }</span>
                  { isActive && (
                    <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 2 } d="M5 13l4 4L19 7" />
                    </svg>
                  ) }
                </button>
              );
            } ) }
          </div>
        </div>,
        document.body
      ) }
    </div>
  );
}

function OverallSummary ( {
  data,
  priceInfo,
  symbol
}: {
  data: {
    [ key in Timeframe ]?: {
      analysis: TrendStrengthSnapshot | null;
    };
  };
  priceInfo: { price: number; change24h: number };
  symbol: string;
} )
{
  const baseCurrency = symbol.replace( "USDT", "" );
  const pairLabel = `${ baseCurrency } / USDT`;

  return (
    <motion.div
      initial={ { opacity: 0, scale: 0.95 } }
      animate={ { opacity: 1, scale: 1 } }
      className="glass-lite glass-lite--strong rounded-2xl p-4 border border-white/10"
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 sm:gap-4">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            { pairLabel }
          </h2>
          { priceInfo.price > 0 && (
            <>
              <span className="text-xl sm:text-2xl font-bold text-white">
                ${ priceInfo.price.toLocaleString( 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 } ) }
              </span>
              <span className={ `text-sm sm:text-base font-medium px-2 py-1 rounded ${ priceInfo.change24h >= 0
                ? 'text-emerald-400 bg-emerald-500/20'
                : 'text-red-400 bg-red-500/20'
                }` }>
                { priceInfo.change24h >= 0 ? '↑' : '↓' } { Math.abs( priceInfo.change24h ).toFixed( 2 ) }%
              </span>
            </>
          ) }
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// Main Page Component
// ============================================

export function TrendScannerPairContent ( {
  symbol,
  embedded = false,
  showBackButton = true,
  onClose,
  exportMode = 'none'
}: {
  symbol: string;
  embedded?: boolean;
  showBackButton?: boolean;
  onClose?: () => void;
  exportMode?: 'none' | 'png' | 'pdf';
} )
{
  const router = useRouter();
  const { activeExchange } = useExchangeStore();
  const [ selectedTimeframe, setSelectedTimeframe ] = useState<Timeframe>( "1d" );
  const [ smcAnalysis, setSmcAnalysis ] = useState<SMCAnalysis | null>( null );
  const [ mounted, setMounted ] = useState( false );

  // استخدام hook المؤشرات الكامل
  const { settings: indicatorSettings, updateSettings: setIndicatorSettings, saveSettings } = useIndicatorSettings();

  // Fix hydration mismatch - wait for client mount
  useEffect( () =>
  {
    setMounted( true );
  }, [] );

  const { data, loading, error, priceInfo, lastUpdate, refetch } = useMultiTimeframeAnalysis( symbol, activeExchange );

  // Transform OHLCV to CandleData for TradingChart
  const chartData = useMemo( () =>
  {
    const ohlcv = data[ selectedTimeframe ]?.ohlcv || [];
    return ohlcv.map( ( d ) => ( {
      time: ( d.timestamp ? Math.floor( d.timestamp / 1000 ) : Math.floor( Date.now() / 1000 ) ) as any,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume,
    } ) );
  }, [ data, selectedTimeframe ] );

  // Get current analysis data
  const currentAnalysis = data[ selectedTimeframe ]?.advancedAnalysis;
  const buySignals = currentAnalysis?.signals.buySignals ?? [];
  const sellSignals = currentAnalysis?.signals.sellSignals ?? [];
  const buyScrollable = buySignals.length > 5;
  const sellScrollable = sellSignals.length > 5;
  const signalsLoading = loading && !currentAnalysis;

  // Check if any SMC indicator is enabled
  const smcEnabled = indicatorSettings.orderBlocks || indicatorSettings.fairValueGaps ||
    indicatorSettings.marketStructure || indicatorSettings.liquidityZones ||
    indicatorSettings.wyckoffEvents || indicatorSettings.breakerBlocks;

  const handleBack = () =>
  {
    if ( onClose ) return onClose();
    router.push( "/chat/trend-scanner" );
  };

  return (
    <div
      className={ `${ embedded ? "min-h-0" : "min-h-screen trend-scanner-standalone" } text-white p-6 bg-white/5 backdrop-blur-2xl ${ exportMode === 'pdf' ? 'export-mode-pdf' : '' }` }
      data-export-mode={ embedded ? undefined : exportMode }
    >
      {/* Header */ }
      <div className="flex items-center justify-between mb-8">
        { showBackButton ? (
          <button
            onClick={ handleBack }
            className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Scanner</span>
          </button>
        ) : (
          <div />
        ) }

        <div className="flex items-center gap-4">
          { lastUpdate && (
            <span className="text-xs text-muted-foreground">
              Last update: { lastUpdate.toLocaleTimeString( "en-US" ) }
            </span>
          ) }
          <button
            onClick={ refetch }
            disabled={ loading }
            className="flex items-center gap-2 px-3 py-1.5 theme-surface rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={ `w-4 h-4 ${ loading ? "animate-spin" : "" }` } />
            Refresh
          </button>
        </div>
      </div>

      { error ? (
        <div className="text-center py-20">
          <div className="text-red-400 text-lg mb-2">⚠️ Failed to load data</div>
          <div className="text-muted-foreground">{ error }</div>
          <button
            onClick={ refetch }
            className="mt-4 px-4 py-2 bg-primary hover:bg-primary/80 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Overall Summary */ }
          <div className="mb-8">
            <OverallSummary data={ data } priceInfo={ priceInfo } symbol={ symbol } />
          </div>

          {/* Buy/Sell Indicators Panel */ }
          <motion.div
            initial={ { opacity: 0, y: 10 } }
            animate={ { opacity: 1, y: 0 } }
            className="grid grid-cols-2 gap-4 mb-8"
          >
            {/* Buy Signals */ }
            <div className="glass-lite rounded-xl p-6 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-4 text-emerald-400 font-semibold text-xl">
                <TrendingUp className="w-6 h-6" />
                <span>Buy Signals</span>
                <span className="text-base bg-emerald-500/20 px-3 py-1 rounded-full">
                  { buySignals.length }
                </span>
              </div>
              <ul className={ `space-y-1 text-xs ${ buyScrollable ? 'max-h-32 overflow-y-auto pr-2 custom-scrollbar touch-pan-y' : '' }` }>
                { buySignals.length > 0 ? (
                  buySignals.map( ( sig, idx ) => (
                    <li key={ idx } className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span className="text-emerald-200 text-xs font-medium truncate">{ sig.indicator }</span>
                      <span className="ml-auto text-[10px] text-emerald-400/70">{ sig.strength.toFixed( 0 ) }%</span>
                    </li>
                  ) )
                ) : (
                  <li className="text-xs text-muted-foreground italic">
                    { signalsLoading ? 'Loading signals…' : 'No signals' }
                  </li>
                ) }
              </ul>
            </div>

            {/* Sell Signals */ }
            <div className="glass-lite rounded-xl p-6 border border-red-500/20">
              <div className="flex items-center gap-2 mb-4 text-red-400 font-semibold text-xl">
                <TrendingDown className="w-6 h-6" />
                <span>Sell Signals</span>
                <span className="text-base bg-red-500/20 px-3 py-1 rounded-full">
                  { sellSignals.length }
                </span>
              </div>
              <ul className={ `space-y-1 text-xs ${ sellScrollable ? 'max-h-32 overflow-y-auto pr-2 custom-scrollbar touch-pan-y' : '' }` }>
                { sellSignals.length > 0 ? (
                  sellSignals.map( ( sig, idx ) => (
                    <li key={ idx } className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                      <span className="text-red-200 text-xs font-medium truncate">{ sig.indicator }</span>
                      <span className="ml-auto text-[10px] text-red-400/70">{ sig.strength.toFixed( 0 ) }%</span>
                    </li>
                  ) )
                ) : (
                  <li className="text-xs text-muted-foreground italic">
                    { signalsLoading ? 'Loading signals…' : 'No sell signals' }
                  </li>
                ) }
              </ul>
            </div>
          </motion.div>

          {/* Trading Chart Section */ }
          <motion.div
            initial={ { opacity: 0, y: 20 } }
            animate={ { opacity: 1, y: 0 } }
            className="glass-lite glass-lite--strong rounded-xl overflow-hidden mb-8 export-keep-colors border border-white/10"
          >
            {/* Chart Header with Timeframe Selector */ }
            <div className="flex items-center justify-between p-2 sm:p-4 border-b border-white/10">
              <button
                onClick={ () =>
                {
                  // تصدير الشارت كصورة
                  const chartElement = document.querySelector( '.pair-template-chart' );
                  if ( chartElement )
                  {
                    import( 'html2canvas' ).then( ( { default: html2canvas } ) =>
                    {
                      html2canvas( chartElement as HTMLElement, {
                        backgroundColor: '#0a0e1a',
                        scale: 2
                      } ).then( canvas =>
                      {
                        const link = document.createElement( 'a' );
                        link.download = `${ symbol }_chart_${ new Date().toISOString().slice( 0, 10 ) }.png`;
                        link.href = canvas.toDataURL();
                        link.click();
                      } );
                    } );
                  }
                } }
                className="p-2 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-colors"
                title="Save as image"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 2 } d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              <div className="flex items-center gap-3">
                <IndicatorPanel
                  settings={ indicatorSettings }
                  onSettingsChange={ setIndicatorSettings }
                  onSave={ saveSettings }
                />
                <div className="flex items-center gap-1 theme-surface rounded-lg p-1">
                  { TIMEFRAMES.map( ( tf ) => (
                    <button
                      key={ tf }
                      onClick={ () => setSelectedTimeframe( tf ) }
                      className={ `px-3 py-1.5 rounded-md text-xs font-medium transition-all ${ selectedTimeframe === tf
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                        : "text-muted-foreground hover:text-white hover:bg-white/5"
                        }` }
                    >
                      { timeframeLabels[ tf ] }
                    </button>
                  ) ) }
                </div>
              </div>
            </div>

            {/* Chart */ }
            <div className="p-4 relative">
              { chartData.length > 0 ? (
                <TradingChart
                  data={ chartData }
                  height={ 337 }
                  theme="dark"
                  showVolume={ false }
                  indicators={ {
                    sma10: indicatorSettings.sma10,
                    sma25: indicatorSettings.sma25,
                    sma50: indicatorSettings.sma50,
                    sma100: indicatorSettings.sma100,
                    sma200: indicatorSettings.sma200,
                    ema10: indicatorSettings.ema10,
                    ema25: indicatorSettings.ema25,
                    ema50: indicatorSettings.ema50,
                    ema100: indicatorSettings.ema100,
                    ema200: indicatorSettings.ema200,
                    bollingerBands: indicatorSettings.bollingerBands,
                    supertrend: indicatorSettings.supertrend,
                    // SMC Indicators
                    orderBlocks: indicatorSettings.orderBlocks,
                    fairValueGaps: indicatorSettings.fairValueGaps,
                    marketStructure: indicatorSettings.marketStructure,
                    liquidityZones: indicatorSettings.liquidityZones,
                    wyckoffEvents: indicatorSettings.wyckoffEvents,
                    breakerBlocks: indicatorSettings.breakerBlocks,
                    // Ehlers DSP Indicators
                    superSmoother: indicatorSettings.superSmoother,
                    instantaneousTrendline: indicatorSettings.instantaneousTrendline,
                    fisherTransform: indicatorSettings.fisherTransform,
                    mama: indicatorSettings.mama,
                    frama: indicatorSettings.frama,
                    cyberCycle: indicatorSettings.cyberCycle,
                    // Confluence & Risk Management
                    confluenceZones: indicatorSettings.confluenceZones,
                    fibonacciConfluence: indicatorSettings.fibonacciConfluence,
                    pivotPointConfluence: indicatorSettings.pivotPointConfluence,
                    // Breakout Detection - كشف الاختراقات
                    breakoutDetection: indicatorSettings.breakoutDetection,
                    rangeBreakout: indicatorSettings.rangeBreakout,
                    volumeSurgeBreakout: indicatorSettings.volumeSurgeBreakout,

                    // Trendlines / Levels / Fibonacci
                    trendlines: indicatorSettings.trendlines,
                    horizontalLevels: indicatorSettings.horizontalLevels,
                    fibonacciRetracements: indicatorSettings.fibonacciRetracements,
                    verticalResistance: indicatorSettings.verticalResistance,
                    verticalSupport: indicatorSettings.verticalSupport,
                    // Elite Overlay Indicators - المؤشرات النخبوية على الشارت الرئيسي
                    ichimoku: indicatorSettings.ichimoku,
                    parabolicSar: indicatorSettings.parabolicSar,
                    pivots: indicatorSettings.pivots,
                    keltner: indicatorSettings.keltner,
                    donchian: indicatorSettings.donchian,
                    atrBands: indicatorSettings.atrBands,
                    // 🤖 AI Agents - الوكلاء الذكيون
                    agent1UltraPrecision: indicatorSettings.agent1UltraPrecision,
                    agent2ClassicPatterns: indicatorSettings.agent2ClassicPatterns,
                    agent3GeometricPatterns: indicatorSettings.agent3GeometricPatterns,
                    agent4ContinuationPatterns: indicatorSettings.agent4ContinuationPatterns,
                  } }
                />
              ) : (
                <div className="h-[450px] flex items-center justify-center text-muted-foreground">
                  { loading ? "Loading data..." : "No data available" }
                </div>
              ) }
            </div>

            {/* Indicator Toggle Bar - شريط أيقونات المؤشرات */ }
            { mounted && (
              <IndicatorDropdownBar
                indicatorSettings={ indicatorSettings }
                setIndicatorSettings={ setIndicatorSettings }
              />
            ) }

            {/* Sub Indicator Charts - الرسوم البيانية الفرعية للمؤشرات */ }
            { chartData.length > 0 && (
              <SubChartsContainer
                data={ chartData }
                indicators={ {
                  volume: indicatorSettings.volume,
                  rsi: indicatorSettings.rsi,
                  macd: indicatorSettings.macd,
                  stochRsi: indicatorSettings.stochRsi,
                  obv: indicatorSettings.obv,
                  adx: indicatorSettings.adx,
                  mfi: indicatorSettings.mfi,
                  connorsRsi: indicatorSettings.connorsRsi,
                  laguerreRsi: indicatorSettings.laguerreRsi,
                  vwap: indicatorSettings.vwap,
                  cvd: indicatorSettings.cvd,
                  klinger: indicatorSettings.klinger,
                  superSmoother: indicatorSettings.superSmoother,
                  instantaneousTrendline: indicatorSettings.instantaneousTrendline,
                  fisherTransform: indicatorSettings.fisherTransform,
                  mama: indicatorSettings.mama,
                  frama: indicatorSettings.frama,
                  cyberCycle: indicatorSettings.cyberCycle,
                  // Elite Advanced Indicators - Oscillators only (sub-chart)
                  // Note: ichimoku, parabolicSar, pivots, keltner, donchian, atrBands are on MAIN chart
                  williamsR: indicatorSettings.williamsR,
                  advancedCci: indicatorSettings.advancedCci,
                  momentumRoc: indicatorSettings.momentumRoc,
                  ultimateOsc: indicatorSettings.ultimateOsc,
                  cmf: indicatorSettings.cmf,
                  forceIndex: indicatorSettings.forceIndex,
                  choppiness: indicatorSettings.choppiness,
                  trix: indicatorSettings.trix,
                  awesomeOsc: indicatorSettings.awesomeOsc,
                } }
                onToggle={ ( indicator, value ) =>
                {
                  setIndicatorSettings( {
                    ...indicatorSettings,
                    [ indicator ]: value,
                  } );
                } }
              />
            ) }

            {/* SMC Summary Card - ملخص مفاهيم السيولة الذكية */ }
            { smcEnabled && smcAnalysis && (
              <div className="p-4 border-t border-white/10">
                <SMCSummary analysis={ smcAnalysis } />
              </div>
            ) }
          </motion.div>

        </>
      ) }
    </div>
  );
}

export default function TrendScannerPairPage ()
{
  const params = useParams();
  const symbol = ( params?.pair as string )?.toUpperCase() || "BTCUSDT";
  return <TrendScannerPairContent symbol={ symbol } />;
}
