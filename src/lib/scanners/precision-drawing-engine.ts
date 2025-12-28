/**
 * 🎨 Precision Drawing Engine - محرك الرسم بالملي
 * 
 * رسم خطوط الدايفرجنس بدقة متناهية مع منحنيات Bezier
 * Millimeter-precision divergence line drawing with Bezier curves
 * Enhanced with lightweight-charts integration support
 * 
 * @author Nexus Elite Team
 * @version 3.0.0
 * @created 2025-12-14
 * @updated 2025-12-14
 */

import { DivergenceResult, DivergenceDirection, DivergenceType, OHLCV } from './advanced-divergence-detector';
import { Time } from 'lightweight-charts';

// ============================================================================
// 📊 TYPES AND INTERFACES
// ============================================================================

export interface Point {
  x: number;
  y: number;
}

export interface Line {
  start: Point;
  end: Point;
  color: string;
  width: number;
  style: 'solid' | 'dashed' | 'dotted';
}

export interface DrawingConfig {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
  priceRange: { min: number; max: number };
  indicatorRange: { min: number; max: number };
  barsRange: { start: number; end: number };
}

export interface DivergenceDrawing {
  priceLine: Line;
  indicatorLine: Line;
  pricePoints: Point[];
  indicatorPoints: Point[];
  label: {
    text: string;
    position: Point;
    color: string;
  };
  arrows: {
    price: { position: Point; direction: 'up' | 'down' };
    indicator: { position: Point; direction: 'up' | 'down' };
  };
}

export interface ChartCoordinates {
  priceToY: (price: number) => number;
  indexToX: (index: number) => number;
  indicatorToY: (value: number, panelHeight: number) => number;
}

/**
 * خوارزمية رسم الدايفرجنس على lightweight-charts
 * Algorithm for drawing divergence on lightweight-charts
 */
export interface LightweightChartsDivergenceDrawing {
  priceLineData: Array<{ time: Time; value: number }>;
  indicatorLineData: Array<{ time: Time; value: number }>;
  priceMarkers: Array<{
    time: Time;
    position: 'aboveBar' | 'belowBar';
    color: string;
    shape: 'circle' | 'arrowUp' | 'arrowDown';
    text: string;
  }>;
  indicatorMarkers: Array<{
    time: Time;
    position: 'aboveBar' | 'belowBar';
    color: string;
    shape: 'circle';
  }>;
  color: string;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  lineWidth: number;
}

// ============================================================================
// 🎨 COLOR SCHEMES
// ============================================================================

export const DIVERGENCE_COLORS: Record<DivergenceDirection, Record<DivergenceType, string>> = {
  bullish: {
    strong: '#22c55e',      // Green 500
    medium: '#4ade80',      // Green 400
    weak: '#86efac',        // Green 300
    hidden: '#059669',      // Emerald 600
    exaggerated: '#10b981', // Emerald 500
    reverse: '#34d399'      // Emerald 400
  },
  bearish: {
    strong: '#ef4444',      // Red 500
    medium: '#f87171',      // Red 400
    weak: '#fca5a5',        // Red 300
    hidden: '#dc2626',      // Red 600
    exaggerated: '#f43f5e', // Rose 500
    reverse: '#fb7185'      // Rose 400
  }
};

export const LINE_STYLES: Record<DivergenceType, { width: number; style: 'solid' | 'dashed' | 'dotted' }> = {
  strong: { width: 2.5, style: 'solid' },
  medium: { width: 2, style: 'solid' },
  weak: { width: 1.5, style: 'dashed' },
  hidden: { width: 2, style: 'dashed' },
  exaggerated: { width: 2.5, style: 'solid' },
  reverse: { width: 1.5, style: 'dotted' }
};

// ============================================================================
// 📐 COORDINATE CALCULATOR
// ============================================================================

export class CoordinateCalculator {
  private config: DrawingConfig;
  
  constructor(config: DrawingConfig) {
    this.config = config;
  }
  
  /**
   * تحويل السعر إلى إحداثي Y
   */
  priceToY(price: number): number {
    const { height, padding, priceRange } = this.config;
    const chartHeight = height - padding.top - padding.bottom;
    const priceRangeSize = priceRange.max - priceRange.min || 1;
    
    // Invert Y axis (higher prices at top)
    const normalized = (price - priceRange.min) / priceRangeSize;
    return padding.top + chartHeight * (1 - normalized);
  }
  
  /**
   * تحويل الفهرس إلى إحداثي X
   */
  indexToX(index: number): number {
    const { width, padding, barsRange } = this.config;
    const chartWidth = width - padding.left - padding.right;
    const barsCount = barsRange.end - barsRange.start || 1;
    
    const normalized = (index - barsRange.start) / barsCount;
    return padding.left + chartWidth * normalized;
  }
  
  /**
   * تحويل قيمة المؤشر إلى إحداثي Y (في لوحة منفصلة)
   */
  indicatorToY(value: number, panelTop: number, panelHeight: number): number {
    const { indicatorRange } = this.config;
    const rangeSize = indicatorRange.max - indicatorRange.min || 1;
    
    const normalized = (value - indicatorRange.min) / rangeSize;
    return panelTop + panelHeight * (1 - normalized);
  }
  
  /**
   * الحصول على وظائف التحويل
   */
  getCoordinates(): ChartCoordinates {
    return {
      priceToY: (price: number) => this.priceToY(price),
      indexToX: (index: number) => this.indexToX(index),
      indicatorToY: (value: number, panelHeight: number) => this.indicatorToY(value, 0, panelHeight)
    };
  }
}

// ============================================================================
// 🎯 PRECISION DRAWING ENGINE
// ============================================================================

export class PrecisionDrawingEngine {
  
  /**
   * إنشاء رسم كامل للدايفرجنس
   */
  static createDrawing(
    divergence: DivergenceResult,
    config: DrawingConfig,
    indicatorPanelTop: number = 0,
    indicatorPanelHeight: number = 100
  ): DivergenceDrawing {
    const calculator = new CoordinateCalculator(config);
    const color = DIVERGENCE_COLORS[divergence.direction][divergence.type];
    const lineStyle = LINE_STYLES[divergence.type];
    
    // حساب نقاط السعر
    const priceStart: Point = {
      x: calculator.indexToX(divergence.startPoint.index),
      y: calculator.priceToY(divergence.startPoint.price)
    };
    
    const priceEnd: Point = {
      x: calculator.indexToX(divergence.endPoint.index),
      y: calculator.priceToY(divergence.endPoint.price)
    };
    
    // حساب نقاط المؤشر
    const indicatorStart: Point = {
      x: calculator.indexToX(divergence.startPoint.index),
      y: calculator.indicatorToY(
        divergence.startPoint.indicatorValue,
        indicatorPanelTop,
        indicatorPanelHeight
      )
    };
    
    const indicatorEnd: Point = {
      x: calculator.indexToX(divergence.endPoint.index),
      y: calculator.indicatorToY(
        divergence.endPoint.indicatorValue,
        indicatorPanelTop,
        indicatorPanelHeight
      )
    };
    
    // تحديد اتجاه الأسهم
    const priceDirection = priceEnd.y < priceStart.y ? 'up' : 'down';
    const indicatorDirection = indicatorEnd.y < indicatorStart.y ? 'up' : 'down';
    
    return {
      priceLine: {
        start: priceStart,
        end: priceEnd,
        color,
        width: lineStyle.width,
        style: lineStyle.style
      },
      indicatorLine: {
        start: indicatorStart,
        end: indicatorEnd,
        color,
        width: lineStyle.width,
        style: lineStyle.style
      },
      pricePoints: [priceStart, priceEnd],
      indicatorPoints: [indicatorStart, indicatorEnd],
      label: {
        text: `${divergence.type.toUpperCase()} ${divergence.direction.toUpperCase()}`,
        position: {
          x: (priceStart.x + priceEnd.x) / 2,
          y: Math.min(priceStart.y, priceEnd.y) - 10
        },
        color
      },
      arrows: {
        price: { position: priceEnd, direction: priceDirection },
        indicator: { position: indicatorEnd, direction: indicatorDirection }
      }
    };
  }
  
  /**
   * رسم خط بدقة عالية على Canvas
   */
  static drawLine(
    ctx: CanvasRenderingContext2D,
    line: Line,
    antiAlias: boolean = true
  ): void {
    ctx.save();
    
    // تفعيل Anti-aliasing
    if (antiAlias) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    }
    
    ctx.beginPath();
    ctx.strokeStyle = line.color;
    ctx.lineWidth = line.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // تطبيق نمط الخط
    switch (line.style) {
      case 'dashed':
        ctx.setLineDash([8, 4]);
        break;
      case 'dotted':
        ctx.setLineDash([2, 3]);
        break;
      default:
        ctx.setLineDash([]);
    }
    
    // رسم الخط بدقة الملي (subpixel precision)
    const x1 = Math.round(line.start.x * 100) / 100;
    const y1 = Math.round(line.start.y * 100) / 100;
    const x2 = Math.round(line.end.x * 100) / 100;
    const y2 = Math.round(line.end.y * 100) / 100;
    
    ctx.moveTo(x1 + 0.5, y1 + 0.5);
    ctx.lineTo(x2 + 0.5, y2 + 0.5);
    ctx.stroke();
    
    ctx.restore();
  }
  
  /**
   * رسم منحنى Bezier ناعم بين النقاط
   */
  static drawBezierCurve(
    ctx: CanvasRenderingContext2D,
    points: Point[],
    color: string,
    width: number = 2,
    tension: number = 0.3
  ): void {
    if (points.length < 2) return;
    
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];
      
      // Calculate control points
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;
      
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
    
    ctx.stroke();
    ctx.restore();
  }
  
  /**
   * رسم نقطة (دائرة) بدقة عالية
   */
  static drawPoint(
    ctx: CanvasRenderingContext2D,
    point: Point,
    color: string,
    radius: number = 4,
    filled: boolean = true
  ): void {
    ctx.save();
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    
    if (filled) {
      ctx.fillStyle = color;
      ctx.fill();
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    
    ctx.restore();
  }
  
  /**
   * رسم سهم اتجاهي
   */
  static drawArrow(
    ctx: CanvasRenderingContext2D,
    position: Point,
    direction: 'up' | 'down',
    color: string,
    size: number = 8
  ): void {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    
    if (direction === 'up') {
      ctx.moveTo(position.x, position.y - size);
      ctx.lineTo(position.x - size / 2, position.y);
      ctx.lineTo(position.x + size / 2, position.y);
    } else {
      ctx.moveTo(position.x, position.y + size);
      ctx.lineTo(position.x - size / 2, position.y);
      ctx.lineTo(position.x + size / 2, position.y);
    }
    
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  
  /**
   * رسم نص بخلفية
   */
  static drawLabel(
    ctx: CanvasRenderingContext2D,
    text: string,
    position: Point,
    color: string,
    fontSize: number = 10,
    backgroundColor?: string
  ): void {
    ctx.save();
    ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const metrics = ctx.measureText(text);
    const padding = 4;
    const width = metrics.width + padding * 2;
    const height = fontSize + padding * 2;
    
    // Draw background
    if (backgroundColor) {
      ctx.fillStyle = backgroundColor;
      ctx.roundRect(
        position.x - width / 2,
        position.y - height / 2,
        width,
        height,
        3
      );
      ctx.fill();
    }
    
    // Draw text
    ctx.fillStyle = color;
    ctx.fillText(text, position.x, position.y);
    
    ctx.restore();
  }
  
  /**
   * رسم الدايفرجنس الكامل
   */
  static drawDivergence(
    ctx: CanvasRenderingContext2D,
    drawing: DivergenceDrawing,
    showLabels: boolean = true,
    showArrows: boolean = true
  ): void {
    // رسم خط السعر
    this.drawLine(ctx, drawing.priceLine);
    
    // رسم خط المؤشر
    this.drawLine(ctx, drawing.indicatorLine);
    
    // رسم النقاط على خط السعر
    for (const point of drawing.pricePoints) {
      this.drawPoint(ctx, point, drawing.priceLine.color, 5, true);
    }
    
    // رسم النقاط على خط المؤشر
    for (const point of drawing.indicatorPoints) {
      this.drawPoint(ctx, point, drawing.indicatorLine.color, 4, false);
    }
    
    // رسم الأسهم
    if (showArrows) {
      this.drawArrow(
        ctx,
        drawing.arrows.price.position,
        drawing.arrows.price.direction,
        drawing.priceLine.color
      );
      this.drawArrow(
        ctx,
        drawing.arrows.indicator.position,
        drawing.arrows.indicator.direction,
        drawing.indicatorLine.color
      );
    }
    
    // رسم التسمية
    if (showLabels) {
      this.drawLabel(
        ctx,
        drawing.label.text,
        drawing.label.position,
        '#ffffff',
        10,
        drawing.label.color + '99' // Semi-transparent background
      );
    }
  }
}

// ============================================================================
// � LIGHTWEIGHT-CHARTS DRAWING ADAPTER - محول رسم lightweight-charts
// ============================================================================

/**
 * خوارزمية رسم دقيق للدايفرجنس على lightweight-charts
 * Precise drawing algorithm for divergence on lightweight-charts
 */
export class LightweightChartsDivergenceDrawer {
  
  /**
   * تحضير بيانات رسم الدايفرجنس لـ lightweight-charts
   * Prepare divergence drawing data for lightweight-charts
   */
  static prepareDivergenceDrawing(divergence: DivergenceResult): LightweightChartsDivergenceDrawing {
    if (!divergence.candles) {
      throw new Error('Divergence result must include candles data for chart drawing');
    }
    
    const color = DIVERGENCE_COLORS[divergence.direction][divergence.type];
    const lineStyle = LINE_STYLES[divergence.type];
    
    // Convert line style to lightweight-charts compatible format
    const convertedLineStyle = lineStyle.style === 'dotted' ? 'dashed' : lineStyle.style;
    
    // ============ PRICE LINE DATA ============
    // خط يربط بين نقطتي السعر
    const priceLineData = [
      {
        time: Math.floor(divergence.candles[divergence.startPoint.index].timestamp / 1000) as Time,
        value: divergence.startPoint.price
      },
      {
        time: Math.floor(divergence.candles[divergence.endPoint.index].timestamp / 1000) as Time,
        value: divergence.endPoint.price
      }
    ];
    
    // ============ INDICATOR LINE DATA ============
    // خط يربط بين نقطتي المؤشر
    const indicatorLineData = [
      {
        time: Math.floor(divergence.candles[divergence.startPoint.index].timestamp / 1000) as Time,
        value: divergence.startPoint.indicatorValue
      },
      {
        time: Math.floor(divergence.candles[divergence.endPoint.index].timestamp / 1000) as Time,
        value: divergence.endPoint.indicatorValue
      }
    ];
    
    // ============ PRICE MARKERS ============
    // علامات دوائر عند نقاط الدايفرجنس على السعر
    const priceMarkers = [
      {
        time: Math.floor(divergence.candles[divergence.startPoint.index].timestamp / 1000) as Time,
        position: (divergence.startPoint.isHigh ? 'aboveBar' : 'belowBar') as 'aboveBar' | 'belowBar',
        color,
        shape: 'circle' as const,
        text: divergence.direction === 'bullish' ? '🔺' : '🔻'
      },
      {
        time: Math.floor(divergence.candles[divergence.endPoint.index].timestamp / 1000) as Time,
        position: (divergence.endPoint.isHigh ? 'aboveBar' : 'belowBar') as 'aboveBar' | 'belowBar',
        color,
        shape: 'circle' as const,
        text: divergence.direction === 'bullish' ? '🔺' : '🔻'
      }
    ];
    
    // ============ INDICATOR MARKERS ============
    // علامات على المؤشر
    const indicatorMarkers = [
      {
        time: Math.floor(divergence.candles[divergence.startPoint.index].timestamp / 1000) as Time,
        position: 'aboveBar' as const,
        color,
        shape: 'circle' as const
      },
      {
        time: Math.floor(divergence.candles[divergence.endPoint.index].timestamp / 1000) as Time,
        position: 'aboveBar' as const,
        color,
        shape: 'circle' as const
      }
    ];
    
    return {
      priceLineData,
      indicatorLineData,
      priceMarkers,
      indicatorMarkers,
      color,
      lineStyle: convertedLineStyle,
      lineWidth: lineStyle.width
    };
  }
  
  /**
   * حساب نطاق الأسعار الأمثل لعرض الدايفرجنس
   * Calculate optimal price range for divergence visualization
   */
  static calculateOptimalPriceRange(divergence: DivergenceResult): { min: number; max: number } {
    if (!divergence.candles) {
      return {
        min: Math.min(divergence.startPoint.price, divergence.endPoint.price) * 0.995,
        max: Math.max(divergence.startPoint.price, divergence.endPoint.price) * 1.005
      };
    }
    
    // Find min and max prices in the divergence range
    const startIdx = divergence.startPoint.index;
    const endIdx = divergence.endPoint.index;
    
    let min = Infinity;
    let max = -Infinity;
    
    for (let i = startIdx; i <= endIdx; i++) {
      const candle = divergence.candles[i];
      if (candle.low < min) min = candle.low;
      if (candle.high > max) max = candle.high;
    }
    
    // Add 2% padding
    const range = max - min;
    const padding = range * 0.02;
    
    return {
      min: min - padding,
      max: max + padding
    };
  }
  
  /**
   * حساب نطاق المؤشر الأمثل
   * Calculate optimal indicator range
   */
  static calculateOptimalIndicatorRange(divergence: DivergenceResult): { min: number; max: number } {
    if (!divergence.indicatorValues) {
      return {
        min: Math.min(divergence.startPoint.indicatorValue, divergence.endPoint.indicatorValue) * 0.95,
        max: Math.max(divergence.startPoint.indicatorValue, divergence.endPoint.indicatorValue) * 1.05
      };
    }
    
    const startIdx = divergence.startPoint.index;
    const endIdx = divergence.endPoint.index;
    
    const values = divergence.indicatorValues.slice(startIdx, endIdx + 1);
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    const range = max - min;
    const padding = range * 0.1;
    
    return {
      min: min - padding,
      max: max + padding
    };
  }
}

// ============================================================================
// �🖼️ SVG GENERATOR (for export)
// ============================================================================

export class SVGGenerator {
  
  /**
   * إنشاء عنصر SVG للخط
   */
  static createLine(line: Line): string {
    const dashArray = line.style === 'dashed' ? 'stroke-dasharray="8,4"' 
                    : line.style === 'dotted' ? 'stroke-dasharray="2,3"' 
                    : '';
    
    return `<line 
      x1="${line.start.x}" 
      y1="${line.start.y}" 
      x2="${line.end.x}" 
      y2="${line.end.y}" 
      stroke="${line.color}" 
      stroke-width="${line.width}" 
      stroke-linecap="round"
      ${dashArray}
    />`;
  }
  
  /**
   * إنشاء عنصر SVG للدائرة
   */
  static createCircle(point: Point, color: string, radius: number = 4): string {
    return `<circle cx="${point.x}" cy="${point.y}" r="${radius}" fill="${color}" />`;
  }
  
  /**
   * إنشاء SVG كامل للدايفرجنس
   */
  static createDivergenceSVG(
    drawing: DivergenceDrawing,
    width: number,
    height: number
  ): string {
    const elements: string[] = [];
    
    // Price line
    elements.push(this.createLine(drawing.priceLine));
    
    // Indicator line
    elements.push(this.createLine(drawing.indicatorLine));
    
    // Points
    for (const point of drawing.pricePoints) {
      elements.push(this.createCircle(point, drawing.priceLine.color, 5));
    }
    
    for (const point of drawing.indicatorPoints) {
      elements.push(this.createCircle(point, drawing.indicatorLine.color, 4));
    }
    
    // Label
    elements.push(`
      <text 
        x="${drawing.label.position.x}" 
        y="${drawing.label.position.y}" 
        fill="${drawing.label.color}" 
        font-size="10" 
        font-weight="bold" 
        text-anchor="middle"
      >
        ${drawing.label.text}
      </text>
    `);
    
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <style>
          line, circle { shape-rendering: geometricPrecision; }
          text { font-family: Inter, system-ui, sans-serif; }
        </style>
        ${elements.join('\n')}
      </svg>
    `;
  }
}

// Classes are already exported with 'export' keyword above
