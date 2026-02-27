"use client";

/**
 * Indicator Panel Component - مثل DYOR
 * لوحة تحكم المؤشرات مع إمكانية التفعيل/التعطيل
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

export interface IndicatorSettings
{
  // المؤشرات الأساسية
  supertrend: boolean;
  bollingerBands: boolean;

  // المتوسطات المتحركة البسيطة
  sma10: boolean;
  sma25: boolean;
  sma50: boolean;
  sma100: boolean;
  sma200: boolean;

  // المتوسطات المتحركة الأسية
  ema10: boolean;
  ema25: boolean;
  ema50: boolean;
  ema100: boolean;
  ema200: boolean;

  // خطوط الاتجاه
  trendlines: boolean;
  horizontalLevels: boolean;
  fibonacciRetracements: boolean;
  verticalResistance: boolean;
  verticalSupport: boolean;

  // ==========================================
  // كشف الاختراقات (Breakout Detection)
  // ==========================================
  breakoutDetection: boolean;        // كشف الاختراقات
  rangeBreakout: boolean;            // اختراق النطاق
  volumeSurgeBreakout: boolean;      // اختراق بحجم قوي

  // ==========================================
  // مناطق التلاقي (Confluence Zones)
  // ==========================================
  confluenceZones: boolean;          // مناطق التلاقي
  fibonacciConfluence: boolean;      // تلاقي فيبوناتشي
  pivotPointConfluence: boolean;     // تلاقي نقاط الارتكاز


  // Ehlers DSP المؤشرات المتقدمة
  superSmoother: boolean;
  instantaneousTrendline: boolean;
  fisherTransform: boolean;
  mama: boolean;
  frama: boolean;
  cyberCycle: boolean;

  // Advanced RSI أنواع RSI المتقدمة
  connorsRsi: boolean;
  laguerreRsi: boolean;

  // Elite Advanced Indicators - المؤشرات المتقدمة النخبوية
  ichimoku: boolean;           // سحابة إيشيموكو
  atrBands: boolean;           // نطاقات ATR الديناميكية
  parabolicSar: boolean;       // Parabolic SAR التكيفي
  pivots: boolean;             // نقاط الارتكاز الذكية
  williamsR: boolean;          // Williams %R
  advancedCci: boolean;        // CCI المتقدم
  momentumRoc: boolean;        // Momentum/ROC
  ultimateOsc: boolean;        // Ultimate Oscillator
  keltner: boolean;            // قنوات كيلتنر
  donchian: boolean;           // قنوات دونشيان
  cmf: boolean;                // Chaikin Money Flow
  forceIndex: boolean;         // Force Index
  choppiness: boolean;         // Choppiness Index
  trix: boolean;               // TRIX
  awesomeOsc: boolean;         // Awesome Oscillator

  // Smart Money Concepts
  orderBlocks: boolean;
  fairValueGaps: boolean;
  marketStructure: boolean;
  liquidityZones: boolean;
  wyckoffEvents: boolean;
  breakerBlocks: boolean;

  // Advanced Volume تحليل الحجم المتقدم
  vwap: boolean;
  volumeProfile: boolean;
  cvd: boolean;
  klinger: boolean;
  mfi: boolean;

  // الرسوم البيانية الافتراضية
  volume: boolean;
  rsi: boolean;
  stochRsi: boolean;
  macd: boolean;
  obv: boolean;
  adx: boolean;

  // ==========================================
  // 🎛️ AI AGENTS - مفاتيح التحكم الرئيسية
  // ==========================================
  agent1UltraPrecision: boolean;    // Agent 1: القنوات والأعلام الدقيقة
  agent2ClassicPatterns: boolean;   // Agent 2: الأنماط الكلاسيكية
  agent3GeometricPatterns: boolean; // Agent 3: المثلثات والأوتاد
  agent4ContinuationPatterns: boolean; // Agent 4: الرايات والاستمرارية
}

const defaultSettings: IndicatorSettings = {
  supertrend: false,
  bollingerBands: false,
  sma10: false,
  sma25: false,
  sma50: false,
  sma100: false,
  sma200: false,
  ema10: false,
  ema25: false,
  ema50: false,
  ema100: false,
  ema200: false,
  trendlines: false,
  horizontalLevels: false,
  fibonacciRetracements: false,
  verticalResistance: false,
  verticalSupport: false,
  // Breakout Detection - كشف الاختراقات
  breakoutDetection: false,
  rangeBreakout: false,
  volumeSurgeBreakout: false,
  // Confluence Zones - مناطق التلاقي
  confluenceZones: false,
  fibonacciConfluence: false,
  pivotPointConfluence: false,
  // Ehlers DSP
  superSmoother: false,
  instantaneousTrendline: false,
  fisherTransform: false,
  mama: false,
  frama: false,
  cyberCycle: false,
  // Advanced RSI
  connorsRsi: false,
  laguerreRsi: false,
  // Elite Advanced Indicators
  ichimoku: false,
  atrBands: false,
  parabolicSar: false,
  pivots: false,
  williamsR: false,
  advancedCci: false,
  momentumRoc: false,
  ultimateOsc: false,
  keltner: false,
  donchian: false,
  cmf: false,
  forceIndex: false,
  choppiness: false,
  trix: false,
  awesomeOsc: false,
  // Smart Money Concepts
  orderBlocks: false,
  fairValueGaps: false,
  marketStructure: false,
  liquidityZones: false,
  wyckoffEvents: false,
  breakerBlocks: false,
  // Advanced Volume
  vwap: false,
  volumeProfile: false,
  cvd: false,
  klinger: false,
  mfi: false,
  // Charts - الرسوم البيانية الفرعية (مخفية افتراضياً)
  volume: false,
  rsi: false,
  stochRsi: false,
  macd: false,
  obv: false,
  adx: false,
  // 🎛️ AI Agents - تفعيل واحد فقط لتجنب التداخل
  agent1UltraPrecision: false,     // ❌ معطل افتراضياً
  agent2ClassicPatterns: false,    // ❌ معطل افتراضياً
  agent3GeometricPatterns: false,  // ❌ معطل افتراضياً
  agent4ContinuationPatterns: false, // ❌ معطل افتراضياً
};

interface IndicatorPanelProps
{
  settings: IndicatorSettings;
  onSettingsChange: ( settings: IndicatorSettings ) => void;
  onSave?: () => void;
}

interface IndicatorGroup
{
  title: string;
  titleAr: string;
  color?: string;
  items: {
    key: keyof IndicatorSettings;
    label: string;
    labelAr: string;
    color?: string;
  }[];
}

const indicatorGroups: IndicatorGroup[] = [
  // ==========================================
  // 🤖 AI AGENTS - الوكلاء الذكيون
  // ==========================================
  {
    title: "🤖 AI Pattern Agents",
    titleAr: "🤖 وكلاء النماذج الذكية",
    color: "#8b5cf6",
    items: [
      { key: "agent1UltraPrecision", label: "Agent 1: Ultra Precision", labelAr: "الوكيل 1: الدقة الفائقة 🎯", color: "#00e676" },
      { key: "agent2ClassicPatterns", label: "Agent 2: Classic Patterns", labelAr: "الوكيل 2: الأنماط الكلاسيكية 📊", color: "#06b6d4" },
      { key: "agent3GeometricPatterns", label: "Agent 3: Geometric Patterns", labelAr: "الوكيل 3: الأنماط الهندسية 📐", color: "#f59e0b" },
      { key: "agent4ContinuationPatterns", label: "Agent 4: Continuation", labelAr: "الوكيل 4: الاستمرارية 🏳️", color: "#ec4899" },
    ],
  },
  {
    title: "Indicators",
    titleAr: "المؤشرات",
    items: [
      { key: "supertrend", label: "Supertrend", labelAr: "سوبرترند", color: "#22c55e" },
      { key: "bollingerBands", label: "Bollinger Bands", labelAr: "بولنجر باندز", color: "#3b82f6" },
    ],
  },
  {
    title: "Standard Moving Averages",
    titleAr: "المتوسطات المتحركة البسيطة",
    items: [
      { key: "sma10", label: "SMA10", labelAr: "SMA10", color: "#ef4444" },
      { key: "sma25", label: "SMA25", labelAr: "SMA25", color: "#f97316" },
      { key: "sma50", label: "SMA50", labelAr: "SMA50", color: "#eab308" },
      { key: "sma100", label: "SMA100", labelAr: "SMA100", color: "#22c55e" },
      { key: "sma200", label: "SMA200", labelAr: "SMA200", color: "#3b82f6" },
    ],
  },
  {
    title: "Exponential Moving Averages",
    titleAr: "المتوسطات المتحركة الأسية",
    items: [
      { key: "ema10", label: "EMA10", labelAr: "EMA10", color: "#ef4444" },
      { key: "ema25", label: "EMA25", labelAr: "EMA25", color: "#f97316" },
      { key: "ema50", label: "EMA50", labelAr: "EMA50", color: "#eab308" },
      { key: "ema100", label: "EMA100", labelAr: "EMA100", color: "#22c55e" },
      { key: "ema200", label: "EMA200", labelAr: "EMA200", color: "#3b82f6" },
    ],
  },
  {
    title: "Trendlines",
    titleAr: "خطوط الاتجاه",
    items: [
      { key: "trendlines", label: "Trendlines", labelAr: "خطوط الاتجاه التلقائية" },
      { key: "horizontalLevels", label: "Horizontal Levels", labelAr: "المستويات الأفقية" },
      { key: "fibonacciRetracements", label: "Fibonacci Retracements", labelAr: "فيبوناتشي" },
      { key: "verticalResistance", label: "Diagonal Resistance", labelAr: "خط المقاومة المائل", color: "#ef4444" },
      { key: "verticalSupport", label: "Diagonal Support", labelAr: "خط الدعم المائل", color: "#22c55e" },
    ],
  },
  {
    title: "Breakout Detection",
    titleAr: "كشف الاختراقات 🚀",
    color: "#f59e0b",
    items: [
      { key: "breakoutDetection", label: "Smart Breakout", labelAr: "الاختراق الذكي", color: "#f59e0b" },
      { key: "rangeBreakout", label: "Range Breakout", labelAr: "اختراق النطاق", color: "#eab308" },
      { key: "volumeSurgeBreakout", label: "Volume Surge Breakout", labelAr: "اختراق بحجم قوي", color: "#ca8a04" },
    ],
  },
  {
    title: "Confluence Zones",
    titleAr: "مناطق التلاقي 🎯",
    color: "#ec4899",
    items: [
      { key: "confluenceZones", label: "Auto Confluence", labelAr: "التلاقي التلقائي", color: "#ec4899" },
      { key: "fibonacciConfluence", label: "Fibonacci Confluence", labelAr: "تلاقي فيبوناتشي", color: "#db2777" },
      { key: "pivotPointConfluence", label: "Pivot Points", labelAr: "نقاط الارتكاز", color: "#be185d" },
    ],
  },
  {
    title: "Risk Management",
    titleAr: "إدارة المخاطر 🛡️",
    color: "#10b981",
    items: [
      { key: "riskRewardZones", label: "Risk/Reward Zones", labelAr: "مناطق المخاطرة/العائد", color: "#10b981" },
      { key: "patternQualityScore", label: "Pattern Quality Score", labelAr: "تقييم جودة الأنماط", color: "#059669" },
    ],
  },
  {
    title: "Elite Advanced Indicators",
    titleAr: "المؤشرات المتقدمة النخبوية",
    color: "#f59e0b",
    items: [
      { key: "ichimoku", label: "Ichimoku Cloud", labelAr: "سحابة إيشيموكو", color: "#06b6d4" },
      { key: "atrBands", label: "ATR Bands", labelAr: "نطاقات ATR", color: "#8b5cf6" },
      { key: "parabolicSar", label: "Parabolic SAR", labelAr: "Parabolic SAR", color: "#f59e0b" },
      { key: "pivots", label: "Smart Pivots", labelAr: "نقاط الارتكاز الذكية", color: "#ec4899" },
      { key: "keltner", label: "Keltner Channels", labelAr: "قنوات كيلتنر", color: "#f97316" },
      { key: "donchian", label: "Donchian Channels", labelAr: "قنوات دونشيان", color: "#14b8a6" },
    ],
  },
  {
    title: "Smart Money Concepts",
    titleAr: "مفاهيم السيولة الذكية",
    color: "#14b8a6",
    items: [
      { key: "orderBlocks", label: "Order Blocks", labelAr: "كتل الأوامر", color: "#14b8a6" },
      { key: "fairValueGaps", label: "Fair Value Gaps", labelAr: "فجوات القيمة العادلة", color: "#0d9488" },
      { key: "marketStructure", label: "Market Structure", labelAr: "هيكل السوق (BOS/CHoCH)", color: "#0f766e" },
      { key: "liquidityZones", label: "Liquidity Zones", labelAr: "مناطق السيولة", color: "#115e59" },
      { key: "wyckoffEvents", label: "Wyckoff Events", labelAr: "أحداث Wyckoff", color: "#134e4a" },
      { key: "breakerBlocks", label: "Breaker Blocks", labelAr: "كتل الكسر", color: "#042f2e" },
    ],
  },
];

const COLOR_CLASS_MAP: Record<string, { text: string; bg: string }> = {
  '#8b5cf6': { text: 'text-[#8b5cf6]', bg: 'bg-[#8b5cf6]' },
  '#00e676': { text: 'text-[#00e676]', bg: 'bg-[#00e676]' },
  '#06b6d4': { text: 'text-[#06b6d4]', bg: 'bg-[#06b6d4]' },
  '#f59e0b': { text: 'text-[#f59e0b]', bg: 'bg-[#f59e0b]' },
  '#ec4899': { text: 'text-[#ec4899]', bg: 'bg-[#ec4899]' },
  '#22c55e': { text: 'text-[#22c55e]', bg: 'bg-[#22c55e]' },
  '#3b82f6': { text: 'text-[#3b82f6]', bg: 'bg-[#3b82f6]' },
  '#ef4444': { text: 'text-[#ef4444]', bg: 'bg-[#ef4444]' },
  '#f97316': { text: 'text-[#f97316]', bg: 'bg-[#f97316]' },
  '#eab308': { text: 'text-[#eab308]', bg: 'bg-[#eab308]' },
  '#10b981': { text: 'text-[#10b981]', bg: 'bg-[#10b981]' },
  '#FFD700': { text: 'text-[#FFD700]', bg: 'bg-[#FFD700]' },
  '#ff1744': { text: 'text-[#ff1744]', bg: 'bg-[#ff1744]' },
  '#dc2626': { text: 'text-[#dc2626]', bg: 'bg-[#dc2626]' },
  '#059669': { text: 'text-[#059669]', bg: 'bg-[#059669]' },
  '#6366f1': { text: 'text-[#6366f1]', bg: 'bg-[#6366f1]' },
  '#64748b': { text: 'text-[#64748b]', bg: 'bg-[#64748b]' },
  '#db2777': { text: 'text-[#db2777]', bg: 'bg-[#db2777]' },
  '#be185d': { text: 'text-[#be185d]', bg: 'bg-[#be185d]' },
  '#059669': { text: 'text-[#059669]', bg: 'bg-[#059669]' },
  '#4c1d95': { text: 'text-[#4c1d95]', bg: 'bg-[#4c1d95]' },
  '#c084fc': { text: 'text-[#c084fc]', bg: 'bg-[#c084fc]' },
  '#a78bfa': { text: 'text-[#a78bfa]', bg: 'bg-[#a78bfa]' },
  '#818cf8': { text: 'text-[#818cf8]', bg: 'bg-[#818cf8]' },
  '#4f46e5': { text: 'text-[#4f46e5]', bg: 'bg-[#4f46e5]' },
  '#fb923c': { text: 'text-[#fb923c]', bg: 'bg-[#fb923c]' },
  '#4ade80': { text: 'text-[#4ade80]', bg: 'bg-[#4ade80]' },
  '#84cc16': { text: 'text-[#84cc16]', bg: 'bg-[#84cc16]' },
  '#b91c1c': { text: 'text-[#b91c1c]', bg: 'bg-[#b91c1c]' },
  '#14b8a6': { text: 'text-[#14b8a6]', bg: 'bg-[#14b8a6]' },
  '#0ea5e9': { text: 'text-[#0ea5e9]', bg: 'bg-[#0ea5e9]' },
  '#f43f5e': { text: 'text-[#f43f5e]', bg: 'bg-[#f43f5e]' },
  '#e11d48': { text: 'text-[#e11d48]', bg: 'bg-[#e11d48]' },
  '#0891b2': { text: 'text-[#0891b2]', bg: 'bg-[#0891b2]' },
  '#a855f7': { text: 'text-[#a855f7]', bg: 'bg-[#a855f7]' },
  '#7c3aed': { text: 'text-[#7c3aed]', bg: 'bg-[#7c3aed]' },
  '#6d28d9': { text: 'text-[#6d28d9]', bg: 'bg-[#6d28d9]' },
  '#5b21b6': { text: 'text-[#5b21b6]', bg: 'bg-[#5b21b6]' },
  '#9333ea': { text: 'text-[#9333ea]', bg: 'bg-[#9333ea]' },
  '#f97316': { text: 'text-[#f97316]', bg: 'bg-[#f97316]' },
};

export function IndicatorPanel ( { settings, onSettingsChange, onSave }: IndicatorPanelProps )
{
  const [ isOpen, setIsOpen ] = useState( false );
  const buttonRef = useRef<HTMLButtonElement>( null );
  const [ position, setPosition ] = useState( { top: 0, right: 16 } );

  useEffect( () =>
  {
    if ( isOpen && buttonRef.current )
    {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition( {
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right
      } );
    }
  }, [ isOpen ] );

  const toggleIndicator = useCallback( ( key: keyof IndicatorSettings ) =>
  {
    onSettingsChange( {
      ...settings,
      [ key ]: !settings[ key ],
    } );
  }, [ settings, onSettingsChange ] );

  const handleSave = () =>
  {
    // حفظ الإعدادات في localStorage
    if ( typeof window !== "undefined" )
    {
      localStorage.setItem( "indicatorSettings_v8", JSON.stringify( settings ) ); // v8 - display patterns removed
    }
    onSave?.();
    setIsOpen( false );
  };

  return (
    <>
      {/* Display Button */ }
      <motion.button
        ref={ buttonRef }
        onClick={ () => setIsOpen( !isOpen ) }
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-white/90 hover:text-white text-xs font-medium transition-all shadow-lg"
        style={ { backdropFilter: 'blur(12px)', background: 'rgba(255, 255, 255, 0.08)' } }
        whileHover={ { scale: 1.02 } }
        whileTap={ { scale: 0.98 } }
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 2 } d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
        Display
      </motion.button>

      {/* Panel Dropdown */ }
      { isOpen && typeof document !== 'undefined' && createPortal(
        <>
          {/* Backdrop - خلفية غير شفافة */ }
          <motion.div
            initial={ { opacity: 0 } }
            animate={ { opacity: 1 } }
            exit={ { opacity: 0 } }
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            style={ { zIndex: 9999998 } }
            onClick={ () => setIsOpen( false ) }
          />
          <AnimatePresence mode="wait">
            {/* Panel */ }
            <motion.div
              initial={ { opacity: 0, y: -8, scale: 0.96 } }
              animate={ { opacity: 1, y: 0, scale: 1 } }
              exit={ { opacity: 0, y: -8, scale: 0.96 } }
              transition={ { type: "spring", stiffness: 350, damping: 25 } }
              className="fixed w-64 border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden"
              style={ {
                zIndex: 9999999,
                top: position.top,
                right: position.right,
                maxHeight: 'min(450px, 80vh)',
                backgroundColor: '#264a46'
              } }
            >
              {/* Header */ }
              <div className="flex-shrink-0 border-b border-white/10 px-4 py-3 flex items-center justify-between">
                <h3 className="text-primary font-semibold text-sm">Indicators</h3>
                <button
                  type="button"
                  aria-label="Close indicators panel"
                  onClick={ () => setIsOpen( false ) }
                  className="text-white/50 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 2 } d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Scrollable Content */ }
              <div className="flex-1 overflow-y-auto px-3 py-2 min-h-0">
                { indicatorGroups.length === 0 ? (
                  <p className="text-white/50 text-sm text-center py-4">No indicators available</p>
                ) : (
                  indicatorGroups.map( ( group ) => (
                    <div key={ group.title } className="mb-3">
                      <h4
                        className={ `text-xs font-bold uppercase tracking-wider mb-2 pb-1 border-b border-white/10 ${ COLOR_CLASS_MAP[ group.color || '' ]?.text || 'text-cyan-400' }` }
                      >
                        { group.title }
                      </h4>
                      <div className="flex flex-col">
                        { group.items.map( ( item ) =>
                        {
                          const isChecked = settings[ item.key ];
                          return (
                            <div
                              key={ item.key }
                              onClick={ () => toggleIndicator( item.key ) }
                              className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-white/5 cursor-pointer select-none"
                              role="checkbox"
                              aria-checked={ isChecked ? "true" : "false" }
                              tabIndex={ 0 }
                              onKeyDown={ ( e ) =>
                              {
                                if ( e.key === 'Enter' || e.key === ' ' )
                                {
                                  e.preventDefault();
                                  toggleIndicator( item.key );
                                }
                              } }
                            >
                              {/* Color dot on left */ }
                              { item.color && (
                                <div
                                  className={ `w-2 h-2 rounded-full flex-shrink-0 ${ COLOR_CLASS_MAP[ item.color ]?.bg || 'bg-cyan-400' }` }
                                />
                              ) }

                              {/* Label */ }
                              <span
                                className={ `text-sm flex-1 min-w-0 truncate ${ isChecked ? 'text-white' : 'text-gray-400' }` }
                              >
                                { item.label }
                              </span>

                              {/* Checkbox on right */ }
                              <div
                                className={ `w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${ isChecked
                                  ? "border-primary bg-primary"
                                  : "border-white/30"
                                  }` }
                              >
                                { isChecked && (
                                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 3 } d="M5 13l4 4L19 7" />
                                  </svg>
                                ) }
                              </div>
                            </div>
                          );
                        } ) }
                      </div>
                    </div>
                  ) )
                ) }
              </div>

              {/* Footer - Save Button */ }
              <div className="flex-shrink-0 border-t border-white/10 px-4 py-3 theme-header">
                <motion.button
                  onClick={ handleSave }
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary/90 rounded-lg text-white font-medium text-sm transition-colors"
                  whileHover={ { scale: 1.01 } }
                  whileTap={ { scale: 0.99 } }
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 2 } d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Save config
                </motion.button>
              </div>
            </motion.div>
          </AnimatePresence>
        </>,
        document.body
      ) }
    </>
  );
}

// Hook to manage indicator settings with localStorage persistence
export function useIndicatorSettings ()
{
  const [ settings, setSettings ] = useState<IndicatorSettings>( () =>
  {
    if ( typeof window !== "undefined" )
    {
      const saved = localStorage.getItem( "indicatorSettings_v8" ); // v8 - display patterns removed
      if ( saved )
      {
        try
        {
          return { ...defaultSettings, ...JSON.parse( saved ) };
        } catch
        {
          return defaultSettings;
        }
      }
    }
    return defaultSettings;
  } );

  const updateSettings = useCallback( ( newSettings: IndicatorSettings ) =>
  {
    setSettings( newSettings );
  }, [] );

  const saveSettings = useCallback( () =>
  {
    if ( typeof window !== "undefined" )
    {
      localStorage.setItem( "indicatorSettings_v8", JSON.stringify( settings ) ); // v8 - display patterns removed
    }
  }, [ settings ] );

  const resetSettings = useCallback( () =>
  {
    setSettings( defaultSettings );
    if ( typeof window !== "undefined" )
    {
      localStorage.removeItem( "indicatorSettings_v8" );
    }
  }, [] );

  return {
    settings,
    updateSettings,
    saveSettings,
    resetSettings,
    defaultSettings,
  };
}

export { defaultSettings };
