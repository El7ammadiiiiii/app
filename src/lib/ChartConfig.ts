/**
 * 📊 ChartConfig - كلاس إعدادات الشارت الموحد
 * 
 * مواصفات مستخرجة من DivergenceTradingChart.tsx
 * كل الشارتات في التطبيق يجب أن تستخدم هذا الكلاس
 * 
 * @author CCWAYS Team
 * @version 3.0.0 - Divergence Spec Based
 */

import type { EChartsCoreOption as EChartsOption } from 'echarts';
import * as echarts from 'echarts';
import React from 'react';

// ============================================================================
// 📋 TYPES - الأنواع
// ============================================================================

export type ThemeMode = 'light' | 'dark';
export type DragMode = 'none' | 'pan' | 'yScale' | 'indicatorYScale';
export type CursorType = 'crosshair' | 'grabbing' | 'ns-resize' | 'default';

export interface ChartPalette
{
  candleUp: string;
  candleDown: string;
  background: string;
  grid: string;
  text: string;
  textSecondary: string;
  crosshair: string;
  border: string;
}

export interface DragRef
{
  startX: number;
  startY: number;
  startXRange: { start: number; end: number };
  startYRange: { min: number; max: number };
  startIndicatorYRange: { min: number; max: number };
}

// ============================================================================
// 📊 CHART CONFIG CLASS
// ============================================================================

export class ChartConfig
{

  // ==========================================================================
  // 🎨 1. الخلفية - BACKGROUND
  // ==========================================================================

  /**
   * تدرج الخلفية الأساسي - من theme.css
   * linear-gradient(135deg, #0C0E0DF2 0%, #20403EF2 50%, #365956F2 100%)
   */
  static readonly BACKGROUND = {
    // ألوان التدرج الأساسية
    gradient: {
      start: '#223a37',      // 0%
      middle: '#223a37',     // 50%
      end: '#223a37',        // 100%
      opacity: 'E6',         // 90% شفافية (hex)
      opacityDecimal: 0.9,   // 90% شفافية (decimal)
    },

    // التدرج الكامل للاستخدام المباشر
    gradientCSS: '#223a37',

    // خلفية شفافة للـ ECharts
    transparent: 'transparent',

    // خلفية السطح (للهيدر والفوتر)
    surface: '#223a37',
    surfaceHex: '#223a37',
  };

  // ==========================================================================
  // 🏷️ 2. شكل البطاقة - CARD SHAPE
  // ==========================================================================

  static readonly CARD = {
    // === الحدود ===
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderColorHover: 'rgba(255, 255, 255, 0.12)',

    // === الزوايا ===
    borderRadius: {
      small: '8px',      // للشارتات المصغرة
      medium: '12px',    // للبطاقات العادية
      large: '16px',     // للمودالات
      round: '9999px',   // للأزرار الدائرية
    },

    // === الظلال ===
    shadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
    shadowHover: '0 8px 32px rgba(0, 0, 0, 0.35)',
    shadowModal: '0 8px 32px rgba(0, 0, 0, 0.4)',

    // === المسافات الداخلية ===
    padding: {
      compact: '12px',
      normal: '16px',
      large: '20px',
      header: '16px 20px',
      footer: '16px 20px',
    },

    // === الهيدر والفوتر ===
    header: {
      background: 'rgba(255, 255, 255, 0.16)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    },
    footer: {
      background: 'rgba(255, 255, 255, 0.16)',
      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    },
  };

  // ==========================================================================
  // � LAYOUT - التخطيط العام
  // ==========================================================================

  static readonly LAYOUT = {
    padding: '16px',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    borderRadius: '12px',
  };

  // ==========================================================================
  // 🕯️ 3. الشموع - CANDLES
  // ==========================================================================

  static readonly CANDLE = {
    // === الألوان ===
    colors: {
      up: '#089981',        // أخضر - صاعد
      down: '#f23645',      // أحمر - هابط
      upBorder: '#089981',  // حدود الصاعد
      downBorder: '#f23645', // حدود الهابط
    },

    // === الأبعاد ===
    dimensions: {
      widthRatio: 0.75,     // 75% من المساحة المخصصة
      gapRatio: 0.25,       // 25% مسافة بين الشموع
      borderWidth: 1,       // عرض الحدود
      minBodyHeight: 1,     // أقل ارتفاع للجسم بالبكسل
    },

    // === الفتيل (Wick) ===
    wick: {
      width: 1,
      color: 'inherit',     // يأخذ لون الشمعة
    },

    // === التمييز (Hover) ===
    hover: {
      opacity: 1,
      normalOpacity: 0.9,
    },
  };

  // ==========================================================================
  // 📐 4. الشبكة - GRID
  // ==========================================================================

  static readonly GRID = {
    // === الخطوط الأفقية ===
    horizontal: {
      color: 'rgba(255, 255, 255, 0.04)',
      width: 1,
      type: 'solid' as const,
    },

    // === الخطوط العمودية ===
    vertical: {
      color: 'rgba(255, 255, 255, 0.04)',
      width: 1,
      type: 'solid' as const,
      interval: 8,  // كل 8 شموع
    },

    // === خطوط ECharts (dashed) ===
    echarts: {
      color: 'rgba(255, 255, 255, 0.22)',
      type: 'dashed' as const,
      opacity: 0.55,
    },

    // === المسافات ===
    padding: {
      top: 5,
      bottom: 10,
      left: 5,
      right: 95,  // مساحة لمحور الأسعار
    },
  };

  // ==========================================================================
  // 💰 5. محور الأسعار - PRICE SCALE (Y-Axis)
  // ==========================================================================

  static readonly PRICE_SCALE = {
    // === الموقع والأبعاد ===
    position: 'right' as const,
    width: 45,

    // === النصوص ===
    text: {
      color: '#787b86',
      fontSize: 10,
      fontFamily: 'monospace',
    },

    // === التنسيق ===
    format: {
      // دالة تنسيق السعر
      formatPrice: ( price: number ): string =>
      {
        const absPrice = Math.abs( price );

        let decimals = 2;
        if ( absPrice >= 1000 ) decimals = 0;
        else if ( absPrice >= 100 ) decimals = 1;
        else if ( absPrice >= 1 ) decimals = 2;
        else if ( absPrice >= 0.1 ) decimals = 4;
        else if ( absPrice >= 0.01 ) decimals = 5;
        else if ( absPrice >= 0.001 ) decimals = 6;
        else if ( absPrice >= 0.0001 ) decimals = 7;
        else decimals = 8;

        return price.toLocaleString( 'en-US', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        } );
      },
    },

    // === الخط والمحور ===
    axisLine: { show: false },
    axisTick: { show: false },

    // === خط السعر الحالي ===
    currentPrice: {
      color: '#2196f3',
      width: 1,
      dashArray: [ 4, 4 ],
    },
  };

  // ==========================================================================
  // ⏰ 6. محور الزمن - TIME SCALE (X-Axis)
  // ==========================================================================

  static readonly TIME_SCALE = {
    // === الموقع والأبعاد ===
    position: 'bottom' as const,
    height: 30,

    // === النصوص ===
    text: {
      color: '#787b86',
      fontSize: 10,
      margin: 8,
    },

    // === التنسيق ===
    format: {
      // دالة تنسيق الوقت
      formatTime: ( timestamp: number ): string =>
      {
        const date = new Date( timestamp );
        return `${ date.getHours().toString().padStart( 2, '0' ) }:${ date.getMinutes().toString().padStart( 2, '0' ) }`;
      },
      // تنسيق موسع
      formatTimeFull: ( timestamp: number ): string =>
      {
        const date = new Date( timestamp );
        return date.toLocaleString( 'en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        } );
      },
    },

    // === الخط والمحور ===
    axisLine: { show: false },
    axisTick: { show: false },
  };

  // ==========================================================================
  // ✚ 7. الكروس هير - CROSSHAIR
  // ==========================================================================

  static readonly CROSSHAIR = {
    // === الخط ===
    line: {
      color: '#9598a1',
      width: 1,
      type: 'dashed' as const,
    },

    // === التسمية ===
    label: {
      show: false,  // مخفية في DivergenceChart
      background: 'rgba(0, 27, 66, 0.95)',
      textColor: '#ffffff',
      fontSize: 10,
      padding: [ 4, 8 ],
    },

    // === المؤشر المحوري ===
    axisPointer: {
      link: [ { xAxisIndex: 'all' } ],
    },
  };

  // ==========================================================================
  // 🖱️ 8. التفاعلات - INTERACTIONS
  // ==========================================================================

  static readonly INTERACTIONS = {
    // === التكبير/التصغير بالعجلة ===
    zoom: {
      enabled: true,
      factor: 1.1,           // نسبة التكبير/التصغير
      minSpan: 5,            // أقل نسبة مرئية (%)
      maxSpan: 100,          // أقصى نسبة مرئية (%)
      wheelEnabled: true,
      moveOnMouseWheel: false,
      moveOnMouseMove: false,
    },

    // === السحب للتحريك ===
    pan: {
      enabled: true,
      cursor: 'grabbing' as CursorType,
    },

    // === تغيير مقياس Y ===
    yScale: {
      enabled: true,
      cursor: 'ns-resize' as CursorType,
      sensitivity: 2,        // حساسية التغيير
    },

    // === النقر المزدوج للإعادة ===
    doubleClick: {
      enabled: true,
      action: 'reset',       // إعادة التكبير والمقياس
    },

    // === المؤشرات ===
    cursors: {
      default: 'crosshair' as CursorType,
      pan: 'grabbing' as CursorType,
      yScale: 'ns-resize' as CursorType,
    },
  };

  // ==========================================================================
  // 📈 9. لوحة المؤشرات - INDICATOR PANEL
  // ==========================================================================

  static readonly INDICATOR = {
    // === التخطيط ===
    layout: {
      mainChartHeight: '58%',
      indicatorHeight: '38%',
      indicatorTop: '60%',
      gap: '2%',
    },

    // === خط المؤشر ===
    line: {
      width: 1.5,
      smooth: 0.3,
      showSymbol: false,
    },

    // === تدرج الخط (RSI style) ===
    gradient: [
      { offset: 0, color: '#22c55e' },    // أخضر - oversold
      { offset: 0.3, color: '#22c55e' },
      { offset: 0.5, color: '#3b82f6' },  // أزرق - neutral
      { offset: 0.7, color: '#3b82f6' },
      { offset: 1, color: '#ef4444' }     // أحمر - overbought
    ],

    // === تعبئة المنطقة ===
    area: {
      gradient: [
        { offset: 0, color: 'rgba(59, 130, 246, 0.12)' },
        { offset: 1, color: 'rgba(59, 130, 246, 0.0)' }
      ],
    },

    // === مستويات RSI ===
    levels: {
      overbought: 70,
      oversold: 30,
      neutral: 50,
      lineColor: 'rgba(255, 255, 255, 0.1)',
    },

    // === المقياس التلقائي ===
    autoScale: {
      padding: 0.15,         // 15% padding
      minRange: 20,
      maxValue: 100,
      minValue: 0,
    },

    // === الشبكة ===
    grid: {
      color: 'rgba(255, 255, 255, 0.06)',
      type: 'dashed' as const,
      opacity: 0.3,
    },
  };

  // ==========================================================================
  // 🔀 10. خطوط الدايفرجنس - DIVERGENCE LINES
  // ==========================================================================

  static readonly DIVERGENCE = {
    // === الألوان ===
    colors: {
      bullish: '#22c55e',    // أخضر للصعود
      bearish: '#ef4444',    // أحمر للهبوط
    },

    // === الخط ===
    line: {
      width: 2.5,
      solid: 'solid' as const,      // للـ regular و strong
      dashed: 'dashed' as const,    // للـ weak و hidden
    },

    // === النقاط ===
    points: {
      start: {
        symbol: 'circle',
        size: 6,
      },
      end: {
        symbol: 'arrow',
        size: 10,
      },
    },

    // === الشارة ===
    badge: {
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '10px',
    },
  };

  // ==========================================================================
  // 📝 11. النصوص - TEXT STYLES
  // ==========================================================================

  static readonly TEXT = {
    colors: {
      primary: '#d1d4dc',
      secondary: '#787b86',
      muted: '#5d606b',
      white: '#ffffff',
      success: '#22c55e',
      danger: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6',
    },

    sizes: {
      xs: '9px',
      sm: '10px',
      base: '12px',
      lg: '14px',
      xl: '16px',
      '2xl': '20px',
    },

    fontFamily: {
      mono: 'monospace',
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
  };

  // ==========================================================================
  // 🎨 12. ألوان المستويات - LEVEL COLORS
  // ==========================================================================

  static readonly LEVEL_COLORS = {
    resistance: {
      strong: '#ef4444',
      normal: '#f87171',
    },
    support: {
      strong: '#22c55e',
      normal: '#4ade80',
    },
    pivot: '#f59e0b',
    fib: {
      0: '#787b86',
      236: '#8b5cf6',
      382: '#3b82f6',
      500: '#f59e0b',
      618: '#ef4444',
      786: '#ec4899',
      1000: '#787b86',
    },
  };

  // ==========================================================================
  // 🧰 HELPER FUNCTIONS - دوال مساعدة
  // ==========================================================================

  /**
   * الحصول على نمط الحاوية
   */
  static getContainerStyle (): React.CSSProperties
  {
    return {
      background: ChartConfig.BACKGROUND.gradientCSS,
      border: ChartConfig.CARD.border,
      borderRadius: ChartConfig.CARD.borderRadius.small,
      boxShadow: ChartConfig.CARD.shadow,
    };
  }

  /**
   * الحصول على نمط البطاقة
   */
  static getCardStyle ( compact: boolean = false ): React.CSSProperties
  {
    return {
      background: ChartConfig.BACKGROUND.gradientCSS,
      border: ChartConfig.CARD.border,
      borderRadius: compact ? ChartConfig.CARD.borderRadius.small : ChartConfig.CARD.borderRadius.medium,
      boxShadow: ChartConfig.CARD.shadow,
      padding: compact ? ChartConfig.CARD.padding.compact : ChartConfig.CARD.padding.normal,
    };
  }

  /**
   * الحصول على نمط المودال
   */
  static getModalStyle (): React.CSSProperties
  {
    return {
      background: ChartConfig.BACKGROUND.gradientCSS,
      border: ChartConfig.CARD.border,
      borderRadius: ChartConfig.CARD.borderRadius.large,
      boxShadow: ChartConfig.CARD.shadowModal,
    };
  }

  /**
   * الحصول على نمط الهيدر
   */
  static getHeaderStyle (): React.CSSProperties
  {
    return {
      background: ChartConfig.CARD.header.background,
      borderBottom: ChartConfig.CARD.header.borderBottom,
      padding: ChartConfig.CARD.padding.header,
    };
  }

  /**
   * الحصول على نمط الفوتر
   */
  static getFooterStyle (): React.CSSProperties
  {
    return {
      background: ChartConfig.CARD.footer.background,
      borderTop: ChartConfig.CARD.footer.borderTop,
      padding: ChartConfig.CARD.padding.footer,
    };
  }

  /**
   * الحصول على المؤشر حسب الوضع
   */
  static getCursor ( mode: DragMode ): CursorType
  {
    switch ( mode )
    {
      case 'pan': return 'grabbing';
      case 'yScale':
      case 'indicatorYScale': return 'ns-resize';
      case 'none':
      default: return 'crosshair';
    }
  }

  /**
   * تنسيق السعر
   */
  static formatPrice ( price: number ): string
  {
    return ChartConfig.PRICE_SCALE.format.formatPrice( price );
  }

  /**
   * تنسيق الوقت
   */
  static formatTime ( timestamp: number ): string
  {
    return ChartConfig.TIME_SCALE.format.formatTime( timestamp );
  }

  /**
   * إنشاء تدرج SVG للشارتات المصغرة
   */
  static getSvgGradientDef ( id: string = 'chartBg' ): React.ReactElement
  {
    return React.createElement( 'defs', { key: `defs-${ id }` },
      React.createElement( 'linearGradient', {
        id,
        x1: '0%',
        y1: '0%',
        x2: '100%',
        y2: '100%'
      },
        React.createElement( 'stop', { offset: '0%', stopColor: ChartConfig.BACKGROUND.gradient.start, stopOpacity: 0.95 } ),
        React.createElement( 'stop', { offset: '50%', stopColor: ChartConfig.BACKGROUND.gradient.middle, stopOpacity: 0.95 } ),
        React.createElement( 'stop', { offset: '100%', stopColor: ChartConfig.BACKGROUND.gradient.end, stopOpacity: 0.95 } )
      )
    );
  }

  /**
   * إنشاء تدرج ECharts للمؤشرات
   */
  static getEChartsLineGradient (): echarts.graphic.LinearGradient
  {
    return new echarts.graphic.LinearGradient( 0, 0, 1, 0, ChartConfig.INDICATOR.gradient );
  }

  /**
   * إنشاء تدرج ECharts للمنطقة
   */
  static getEChartsAreaGradient (): echarts.graphic.LinearGradient
  {
    return new echarts.graphic.LinearGradient( 0, 0, 0, 1, ChartConfig.INDICATOR.area.gradient );
  }

  /**
   * حساب عرض الشمعة
   */
  static calculateCandleWidth ( chartWidth: number, candleCount: number ): { width: number; gap: number }
  {
    const totalPerCandle = chartWidth / candleCount;
    return {
      width: totalPerCandle * ChartConfig.CANDLE.dimensions.widthRatio,
      gap: totalPerCandle * ChartConfig.CANDLE.dimensions.gapRatio,
    };
  }

  /**
   * تحويل السعر إلى إحداثي Y
   */
  static priceToY ( price: number, maxPrice: number, priceRange: number, chartHeight: number, paddingTop: number ): number
  {
    return paddingTop + ( ( maxPrice - price ) / priceRange ) * chartHeight;
  }

  /**
   * تحويل إحداثي Y إلى سعر
   */
  static yToPrice ( y: number, maxPrice: number, priceRange: number, chartHeight: number, paddingTop: number ): number
  {
    return maxPrice - ( ( y - paddingTop ) / chartHeight ) * priceRange;
  }

  // ==========================================================================
  // 📊 ECHARTS OPTIONS GENERATOR
  // ==========================================================================

  /**
   * إنشاء خيارات ECharts الأساسية
   */
  static getBaseEChartsOptions (): Partial<EChartsOption>
  {
    return {
      backgroundColor: ChartConfig.BACKGROUND.transparent,
      animation: false,
      tooltip: { show: false },
      axisPointer: {
        link: [ { xAxisIndex: 'all' } ],
        label: {
          show: false,
          backgroundColor: ChartConfig.CROSSHAIR.label.background,
        },
      },
    };
  }

  /**
   * إنشاء إعدادات الشبكة لـ ECharts
   */
  static getEChartsGridConfig ( withIndicator: boolean = true ): object[]
  {
    if ( withIndicator )
    {
      return [
        {
          left: ChartConfig.GRID.padding.left,
          right: ChartConfig.GRID.padding.right,
          top: ChartConfig.GRID.padding.top,
          height: ChartConfig.INDICATOR.layout.mainChartHeight,
          containLabel: false,
        },
        {
          left: ChartConfig.GRID.padding.left,
          right: ChartConfig.GRID.padding.right,
          top: ChartConfig.INDICATOR.layout.indicatorTop,
          height: ChartConfig.INDICATOR.layout.indicatorHeight,
          containLabel: false,
          bottom: ChartConfig.GRID.padding.bottom,
        },
      ];
    }
    return [ {
      left: ChartConfig.GRID.padding.left,
      right: ChartConfig.GRID.padding.right,
      top: ChartConfig.GRID.padding.top,
      bottom: ChartConfig.GRID.padding.bottom + ChartConfig.TIME_SCALE.height,
      containLabel: false,
    } ];
  }

  /**
   * إنشاء إعدادات DataZoom لـ ECharts
   */
  static getEChartsDataZoom ( xAxisIndex: number[] = [ 0, 1 ], start: number = 0, end: number = 100 ): object[]
  {
    return [ {
      type: 'inside',
      xAxisIndex,
      start,
      end,
      minSpan: ChartConfig.INTERACTIONS.zoom.minSpan,
      maxSpan: ChartConfig.INTERACTIONS.zoom.maxSpan,
      zoomOnMouseWheel: ChartConfig.INTERACTIONS.zoom.wheelEnabled,
      moveOnMouseMove: ChartConfig.INTERACTIONS.zoom.moveOnMouseMove,
      moveOnMouseWheel: ChartConfig.INTERACTIONS.zoom.moveOnMouseWheel,
      preventDefaultMouseMove: false,
    } ];
  }

  /**
   * إنشاء إعدادات الشموع لـ ECharts
   */
  static getEChartsCandlestickStyle (): object
  {
    return {
      color: ChartConfig.CANDLE.colors.up,
      color0: ChartConfig.CANDLE.colors.down,
      borderColor: ChartConfig.CANDLE.colors.upBorder,
      borderColor0: ChartConfig.CANDLE.colors.downBorder,
      borderWidth: ChartConfig.CANDLE.dimensions.borderWidth,
    };
  }

  // ==========================================================================
  // 🔄 LEGACY COMPATIBILITY - للتوافقية مع الكود القديم
  // ==========================================================================

  static readonly COLORS_DARK: ChartPalette = {
    background: '#223a37',
    candleUp: '#089981',
    candleDown: '#f23645',
    grid: 'rgba(255, 255, 255, 0.06)',
    text: '#d1d4dc',
    textSecondary: '#787b86',
    crosshair: '#9598a1',
    border: 'rgba(255, 255, 255, 0.08)',
  };

  static readonly COLORS_LIGHT: ChartPalette = {
    background: '#ffffff',
    candleUp: '#089981',
    candleDown: '#f23645',
    grid: '#f0f3fa',
    text: '#131722',
    textSecondary: '#787b86',
    crosshair: '#787b86',
    border: '#e0e3eb',
  };

  // Shortcuts للتوافقية
  static readonly CARD_BACKGROUND = 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.75) 50%, rgba(255,255,255,0.85) 100%)';
  static readonly CARD_BORDER = 'rgba(255, 255, 255, 0.08)';
  static readonly CARD_SHADOW = '0 4px 20px rgba(0, 0, 0, 0.25)';
  static readonly CHART_BG = '#223a37';
  static readonly TIMEFRAMES = [ '1m', '5m', '15m', '1h', '4h', '1d', '1w' ];

  // للتوافقية مع THEME القديم
  static readonly THEME_CONFIG = {
    gradient: {
      start: '#F8FAFC',
      middle: '#EEF2F7',
      end: '#F1F5F9',
      opacity: 'E6',
    },
    gradientFull: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.75) 50%, rgba(255,255,255,0.85) 100%)',
    surface: 'rgba(255, 255, 255, 0.16)',
    border: 'rgba(255, 255, 255, 0.08)',
    shadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
    shadowStrong: '0 8px 32px rgba(0, 0, 0, 0.4)',
    textPrimary: '#d1d4dc',
    textSecondary: '#787b86',
    candleUp: '#089981',
    candleDown: '#f23645',
    bullishLine: '#22c55e',
    bearishLine: '#ef4444',
  };

  // Back-compat alias expected by many components
  static readonly THEME = ChartConfig.THEME_CONFIG;

  static getTheme ( mode: ThemeMode ): ChartPalette
  {
    return mode === 'dark' ? this.COLORS_DARK : this.COLORS_LIGHT;
  }
}
