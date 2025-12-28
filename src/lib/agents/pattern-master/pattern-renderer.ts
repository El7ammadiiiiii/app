/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🎨 PATTERN RENDERER - محرك رسم الأنماط على الشارت
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * يحول الأنماط المكتشفة إلى رسومات على الشارت (ECharts)
 * 
 * المميزات:
 * ✅ رسم الأنماط الهارمونيك (XABCD) بدقة 100%
 * ✅ رسم الأنماط الكلاسيكية (H&S, Double Top/Bottom, Triangles)
 * ✅ رسم خطوط الترند والدعم والمقاومة
 * ✅ رسم أهداف الربح ووقف الخسارة
 * ✅ رسم إشارات الشراء والبيع
 * ✅ رسم منطقة الدخول (Entry Zone)
 */

import type { 
  DetectedPattern, 
  ChartSignal, 
  TrendLineData, 
  SupportResistanceLevel,
  PatternPoint 
} from './index';
import type { ConfirmationResult } from './signal-confirmation';

// ============================================
// ECHARTS TYPES
// ============================================

export interface EChartsMarkLine {
  silent: boolean;
  symbol: string[];
  lineStyle: {
    color: string;
    width: number;
    type: "solid" | "dashed" | "dotted";
  };
  label: {
    show: boolean;
    position: "start" | "middle" | "end";
    formatter: string;
    color: string;
    fontSize: number;
    backgroundColor?: string;
    padding?: number[];
  };
  data: { xAxis?: number; yAxis?: number; coord?: [number, number] }[][];
}

export interface EChartsMarkPoint {
  symbol: string;
  symbolSize: number | number[];
  symbolRotate?: number;
  label: {
    show: boolean;
    position: "top" | "bottom" | "inside" | "left" | "right";
    formatter: string;
    color: string;
    fontSize: number;
    fontWeight?: string;
    backgroundColor?: string;
    borderRadius?: number;
    padding?: number[];
  };
  itemStyle: {
    color: string;
    borderColor?: string;
    borderWidth?: number;
    shadowColor?: string;
    shadowBlur?: number;
  };
  data: { coord: [number, number]; value?: string | number }[];
}

export interface EChartsMarkArea {
  silent: boolean;
  itemStyle: {
    color: string;
    opacity?: number;
  };
  data: [{ coord: [number, number] }, { coord: [number, number] }][];
}

export interface PatternGraphics {
  markLines: EChartsMarkLine[];
  markPoints: EChartsMarkPoint[];
  markAreas: EChartsMarkArea[];
  graphic: GraphicElement[];
}

export interface GraphicElement {
  type: "line" | "polygon" | "text" | "circle" | "rect";
  left?: number;
  top?: number;
  shape?: Record<string, unknown>;
  style?: Record<string, unknown>;
  z?: number;
}

// ============================================
// COLORS - ألوان مخصصة لكل نوع من الأنماط
// ============================================

const COLORS = {
  // Harmonic Patterns - أنماط هارمونيك (ألوان مميزة)
  harmonic: {
    bullish: {
      line: "#00E676",      // أخضر زاهي نيون
      fill: "rgba(0, 230, 118, 0.12)",
      point: "#00E676",
      glow: "rgba(0, 230, 118, 0.4)",
    },
    bearish: {
      line: "#FF5252",      // أحمر زاهي
      fill: "rgba(255, 82, 82, 0.12)",
      point: "#FF5252",
      glow: "rgba(255, 82, 82, 0.4)",
    },
    xabcd: "#AB47BC",       // بنفسجي للخطوط الرئيسية
    prz: "rgba(171, 71, 188, 0.2)", // منطقة PRZ
  },
  
  // Classic Patterns - أنماط كلاسيكية
  classic: {
    bullish: {
      line: "#2196F3",      // أزرق
      fill: "rgba(33, 150, 243, 0.1)",
      point: "#2196F3",
    },
    bearish: {
      line: "#FF9800",      // برتقالي
      fill: "rgba(255, 152, 0, 0.1)",
      point: "#FF9800",
    },
    neckline: "#FFD600",    // خط العنق - أصفر
  },
  
  // Candlestick Patterns - أنماط الشموع
  candlestick: {
    bullish: "#4CAF50",
    bearish: "#E91E63",
    neutral: "#9E9E9E",
  },
  
  // Channel Patterns - القنوات
  channel: {
    ascending: "#00BCD4",   // سماوي
    descending: "#9C27B0",  // بنفسجي
    horizontal: "#607D8B",  // رمادي
    fill: "rgba(0, 188, 212, 0.08)",
  },
  
  // Trade Setup - إعداد الصفقة
  entry: {
    line: "#FFEB3B",        // أصفر للدخول
    fill: "rgba(255, 235, 59, 0.15)",
  },
  stopLoss: {
    line: "#FF1744",        // أحمر حاد لوقف الخسارة
    fill: "rgba(255, 23, 68, 0.12)",
  },
  targets: {
    tp1: "#00E676",         // أخضر نيون - TP1
    tp2: "#00C853",         // أخضر متوسط - TP2
    tp3: "#00BFA5",         // تركواز - TP3
    fill: "rgba(0, 230, 118, 0.1)",
  },
  retest: {
    line: "#7C4DFF",        // بنفسجي فاتح
    fill: "rgba(124, 77, 255, 0.12)",
  },
  
  // Support/Resistance - الدعم والمقاومة
  support: "#00E676",
  resistance: "#FF5252",
  pivot: "#FFC107",
  
  // Signals - إشارات الشراء والبيع
  signals: {
    buy: "#00E676",
    sell: "#FF5252",
    strongBuy: "#00FF88",
    strongSell: "#FF0044",
  },
  
  // Confirmation Status - حالة التأكيد
  confirmation: {
    strong: "#00E676",      // ✓ مؤكد
    moderate: "#FFC107",    // ⚠ متوسط
    weak: "#9E9E9E",        // ضعيف
    trap: "#FF5252",        // ✕ فخ
  },
  
  // Legacy colors for backward compatibility
  bullish: "#10B981",
  bearish: "#EF4444",
  neutral: "#6B7280",
  harmonicLine: "#8B5CF6",
  harmonicFill: "rgba(139, 92, 246, 0.1)",
  classicLine: "#3B82F6",
  classicFill: "rgba(59, 130, 246, 0.1)",
  buySignal: "#10B981",
  sellSignal: "#EF4444",
  confirmed: "#10B981",
  needsConfirmation: "#F59E0B",
  trap: "#EF4444",
  przFill: "rgba(245, 158, 11, 0.15)",
  target1: "#10B981",
  target2: "#059669",
  target3: "#047857",
};

// ============================================
// PATTERN RENDERING
// ============================================

export function renderPatterns(
  patterns: DetectedPattern[],
  signals: ChartSignal[],
  trendLines: TrendLineData[],
  supportResistance: SupportResistanceLevel[],
  dataLength: number
): PatternGraphics {
  const graphics: PatternGraphics = {
    markLines: [],
    markPoints: [],
    markAreas: [],
    graphic: [],
  };
  
  // Render each pattern type
  for (const pattern of patterns) {
    if (!pattern.isValid) continue;
    
    switch (pattern.category) {
      case "harmonic":
        Object.assign(graphics, mergeGraphics(graphics, renderHarmonicPattern(pattern)));
        break;
      case "classic":
        Object.assign(graphics, mergeGraphics(graphics, renderClassicPattern(pattern)));
        break;
      case "channel":
        Object.assign(graphics, mergeGraphics(graphics, renderChannelPattern(pattern)));
        break;
    }
    
    // Render trade setup for all patterns
    Object.assign(graphics, mergeGraphics(graphics, renderTradeSetup(pattern, dataLength)));
  }
  
  // Render trend lines
  Object.assign(graphics, mergeGraphics(graphics, renderTrendLines(trendLines, dataLength)));
  
  // Render support/resistance
  Object.assign(graphics, mergeGraphics(graphics, renderSupportResistance(supportResistance, dataLength)));
  
  // Render signals
  Object.assign(graphics, mergeGraphics(graphics, renderSignals(signals)));
  
  return graphics;
}

function mergeGraphics(a: PatternGraphics, b: PatternGraphics): PatternGraphics {
  return {
    markLines: [...a.markLines, ...b.markLines],
    markPoints: [...a.markPoints, ...b.markPoints],
    markAreas: [...a.markAreas, ...b.markAreas],
    graphic: [...a.graphic, ...b.graphic],
  };
}

// ============================================
// HARMONIC PATTERN RENDERING
// ============================================

function renderHarmonicPattern(pattern: DetectedPattern): PatternGraphics {
  const graphics: PatternGraphics = {
    markLines: [],
    markPoints: [],
    markAreas: [],
    graphic: [],
  };
  
  if (pattern.points.length < 5) return graphics;
  
  const [X, A, B, C, D] = pattern.points;
  const color = pattern.type === "bullish" ? COLORS.bullish : COLORS.bearish;
  
  // Draw XABCD lines
  const lineData: { xAxis?: number; yAxis?: number; coord?: [number, number] }[][] = [
    [{ coord: [X.index, X.price] }, { coord: [A.index, A.price] }],
    [{ coord: [A.index, A.price] }, { coord: [B.index, B.price] }],
    [{ coord: [B.index, B.price] }, { coord: [C.index, C.price] }],
    [{ coord: [C.index, C.price] }, { coord: [D.index, D.price] }],
    // Connect X to B (dashed)
    [{ coord: [X.index, X.price] }, { coord: [B.index, B.price] }],
    // Connect A to C (dashed)
    [{ coord: [A.index, A.price] }, { coord: [C.index, C.price] }],
    // Connect B to D (dashed)
    [{ coord: [B.index, B.price] }, { coord: [D.index, D.price] }],
  ];
  
  // Main pattern lines
  graphics.markLines.push({
    silent: true,
    symbol: ["none", "none"],
    lineStyle: {
      color: COLORS.harmonicLine,
      width: 2,
      type: "solid",
    },
    label: {
      show: false,
      position: "middle",
      formatter: "",
      color: "#fff",
      fontSize: 10,
    },
    data: lineData.slice(0, 4),
  });
  
  // Connecting lines (dashed)
  graphics.markLines.push({
    silent: true,
    symbol: ["none", "none"],
    lineStyle: {
      color: COLORS.harmonicLine,
      width: 1,
      type: "dashed",
    },
    label: {
      show: false,
      position: "middle",
      formatter: "",
      color: "#fff",
      fontSize: 10,
    },
    data: lineData.slice(4),
  });
  
  // Draw XABCD labels
  const points: { point: PatternPoint; label: string }[] = [
    { point: X, label: "X" },
    { point: A, label: "A" },
    { point: B, label: "B" },
    { point: C, label: "C" },
    { point: D, label: "D" },
  ];
  
  for (const { point, label } of points) {
    const isTop = point.price > (pattern.type === "bullish" ? A.price : X.price);
    
    graphics.markPoints.push({
      symbol: "circle",
      symbolSize: 12,
      label: {
        show: true,
        position: isTop ? "top" : "bottom",
        formatter: label,
        color: COLORS.harmonicLine,
        fontSize: 14,
        fontWeight: "bold",
      },
      itemStyle: {
        color: COLORS.harmonicLine,
        borderColor: "#fff",
        borderWidth: 2,
      },
      data: [{ coord: [point.index, point.price] }],
    });
  }
  
  // Pattern name label
  const centerX = Math.round((X.index + D.index) / 2);
  const centerY = (X.price + A.price + B.price + C.price + D.price) / 5;
  
  graphics.markPoints.push({
    symbol: "rect",
    symbolSize: [0, 0],
    label: {
      show: true,
      position: "inside",
      formatter: `${pattern.nameAr}\n${pattern.confidence.toFixed(0)}%`,
      color: color,
      fontSize: 12,
      fontWeight: "bold",
      backgroundColor: "rgba(0,0,0,0.7)",
      borderRadius: 4,
      padding: [4, 8],
    },
    itemStyle: {
      color: "transparent",
    },
    data: [{ coord: [centerX, centerY] }],
  });
  
  // PRZ Zone (Potential Reversal Zone)
  if (pattern.tradeSetup.retestZone) {
    const { min, max } = pattern.tradeSetup.retestZone;
    graphics.markAreas.push({
      silent: true,
      itemStyle: {
        color: COLORS.przFill,
      },
      data: [
        [
          { coord: [D.index - 5, max] },
          { coord: [D.index + 20, min] },
        ],
      ],
    });
  }
  
  return graphics;
}

// ============================================
// CLASSIC PATTERN RENDERING
// ============================================

function renderClassicPattern(pattern: DetectedPattern): PatternGraphics {
  const graphics: PatternGraphics = {
    markLines: [],
    markPoints: [],
    markAreas: [],
    graphic: [],
  };
  
  const color = pattern.type === "bullish" ? COLORS.bullish : COLORS.bearish;
  
  // Draw pattern lines
  if (pattern.trendLines.length > 0) {
    const lineData: { coord: [number, number] }[][] = pattern.trendLines.map(tl => [
      { coord: [tl.startIndex, tl.startPrice] },
      { coord: [tl.endIndex, tl.endPrice] },
    ]);
    
    graphics.markLines.push({
      silent: true,
      symbol: ["none", "none"],
      lineStyle: {
        color: COLORS.classicLine,
        width: 2,
        type: "solid",
      },
      label: {
        show: false,
        position: "middle",
        formatter: "",
        color: "#fff",
        fontSize: 10,
      },
      data: lineData,
    });
  }
  
  // Draw pattern points with labels
  for (const point of pattern.points) {
    const isTop = point.label.includes("H") || point.label.includes("T") || point.label.includes("RS") || point.label.includes("LS");
    
    graphics.markPoints.push({
      symbol: "circle",
      symbolSize: 10,
      label: {
        show: true,
        position: isTop ? "top" : "bottom",
        formatter: point.label,
        color: COLORS.classicLine,
        fontSize: 12,
        fontWeight: "bold",
      },
      itemStyle: {
        color: COLORS.classicLine,
        borderColor: "#fff",
        borderWidth: 2,
      },
      data: [{ coord: [point.index, point.price] }],
    });
  }
  
  // Pattern name label
  if (pattern.points.length >= 2) {
    const firstPoint = pattern.points[0];
    const lastPoint = pattern.points[pattern.points.length - 1];
    const centerX = Math.round((firstPoint.index + lastPoint.index) / 2);
    const maxPrice = Math.max(...pattern.points.map(p => p.price));
    
    graphics.markPoints.push({
      symbol: "rect",
      symbolSize: [0, 0],
      label: {
        show: true,
        position: "inside",
        formatter: `${pattern.nameAr}`,
        color: color,
        fontSize: 12,
        fontWeight: "bold",
        backgroundColor: "rgba(0,0,0,0.7)",
        borderRadius: 4,
        padding: [4, 8],
      },
      itemStyle: {
        color: "transparent",
      },
      data: [{ coord: [centerX, maxPrice * 1.02] }],
    });
  }
  
  return graphics;
}

// ============================================
// CHANNEL PATTERN RENDERING
// ============================================

function renderChannelPattern(pattern: DetectedPattern): PatternGraphics {
  const graphics: PatternGraphics = {
    markLines: [],
    markPoints: [],
    markAreas: [],
    graphic: [],
  };
  
  // Draw channel lines
  if (pattern.trendLines.length >= 2) {
    const lineData: { coord: [number, number] }[][] = pattern.trendLines.map(tl => [
      { coord: [tl.startIndex, tl.startPrice] },
      { coord: [tl.projected ? tl.endIndex + 20 : tl.endIndex, tl.projectedEndPrice || tl.endPrice] },
    ]);
    
    graphics.markLines.push({
      silent: true,
      symbol: ["none", "none"],
      lineStyle: {
        color: pattern.type === "bullish" ? COLORS.bullish : COLORS.bearish,
        width: 2,
        type: "solid",
      },
      label: {
        show: false,
        position: "end",
        formatter: "",
        color: "#fff",
        fontSize: 10,
      },
      data: lineData,
    });
  }
  
  return graphics;
}

// ============================================
// TRADE SETUP RENDERING
// ============================================

function renderTradeSetup(pattern: DetectedPattern, dataLength: number): PatternGraphics {
  const graphics: PatternGraphics = {
    markLines: [],
    markPoints: [],
    markAreas: [],
    graphic: [],
  };
  
  const { tradeSetup } = pattern;
  const startIndex = pattern.endIndex;
  const endIndex = Math.min(dataLength - 1, startIndex + 50);
  
  // Entry line
  graphics.markLines.push({
    silent: true,
    symbol: ["none", "arrow"],
    lineStyle: {
      color: COLORS.entry.line,
      width: 2,
      type: "dashed",
    },
    label: {
      show: true,
      position: "end",
      formatter: `الدخول: ${tradeSetup.entry.toFixed(2)}`,
      color: COLORS.entry.line,
      fontSize: 11,
      backgroundColor: "rgba(0,0,0,0.7)",
      padding: [2, 6],
    },
    data: [
      [
        { coord: [startIndex, tradeSetup.entry] },
        { coord: [endIndex, tradeSetup.entry] },
      ],
    ],
  });
  
  // Stop Loss line
  graphics.markLines.push({
    silent: true,
    symbol: ["none", "none"],
    lineStyle: {
      color: COLORS.stopLoss.line,
      width: 2,
      type: "dotted",
    },
    label: {
      show: true,
      position: "end",
      formatter: `وقف الخسارة: ${tradeSetup.stopLoss.toFixed(2)}`,
      color: COLORS.stopLoss.line,
      fontSize: 11,
      backgroundColor: "rgba(0,0,0,0.7)",
      padding: [2, 6],
    },
    data: [
      [
        { coord: [startIndex, tradeSetup.stopLoss] },
        { coord: [endIndex, tradeSetup.stopLoss] },
      ],
    ],
  });
  
  // Target lines
  const targetColors = [COLORS.target1, COLORS.target2, COLORS.target3];
  
  for (let i = 0; i < tradeSetup.targets.length && i < 3; i++) {
    const target = tradeSetup.targets[i];
    
    graphics.markLines.push({
      silent: true,
      symbol: ["none", "none"],
      lineStyle: {
        color: targetColors[i],
        width: 2,
        type: "dashed",
      },
      label: {
        show: true,
        position: "end",
        formatter: `${target.label}: ${target.price.toFixed(2)} (${target.ratio.toFixed(1)}R)`,
        color: targetColors[i],
        fontSize: 11,
        backgroundColor: "rgba(0,0,0,0.7)",
        padding: [2, 6],
      },
      data: [
        [
          { coord: [startIndex, target.price] },
          { coord: [endIndex, target.price] },
        ],
      ],
    });
  }
  
  // Risk/Reward box
  graphics.markPoints.push({
    symbol: "rect",
    symbolSize: [0, 0],
    label: {
      show: true,
      position: "inside",
      formatter: `R/R: ${tradeSetup.riskReward.toFixed(1)}`,
      color: tradeSetup.riskReward >= 2 ? COLORS.bullish : COLORS.neutral,
      fontSize: 11,
      backgroundColor: "rgba(0,0,0,0.8)",
      borderRadius: 4,
      padding: [4, 8],
    },
    itemStyle: {
      color: "transparent",
    },
    data: [{ coord: [endIndex - 10, tradeSetup.entry] }],
  });
  
  return graphics;
}

// ============================================
// TREND LINES RENDERING
// ============================================

function renderTrendLines(trendLines: TrendLineData[], dataLength: number): PatternGraphics {
  const graphics: PatternGraphics = {
    markLines: [],
    markPoints: [],
    markAreas: [],
    graphic: [],
  };
  
  for (const tl of trendLines) {
    const color = tl.type === "ascending" ? COLORS.bullish : 
                  tl.type === "descending" ? COLORS.bearish : 
                  COLORS.neutral;
    
    const endIndex = tl.projected ? Math.min(dataLength - 1, tl.endIndex + 30) : tl.endIndex;
    const endPrice = tl.projectedEndPrice || tl.endPrice;
    
    graphics.markLines.push({
      silent: true,
      symbol: ["none", "none"],
      lineStyle: {
        color,
        width: Math.max(1, tl.strength / 50),
        type: tl.projected ? "dashed" : "solid",
      },
      label: {
        show: tl.strength >= 70,
        position: "middle",
        formatter: `${tl.touches} لمسات`,
        color,
        fontSize: 10,
      },
      data: [
        [
          { coord: [tl.startIndex, tl.startPrice] },
          { coord: [endIndex, endPrice] },
        ],
      ],
    });
  }
  
  return graphics;
}

// ============================================
// SUPPORT/RESISTANCE RENDERING
// ============================================

function renderSupportResistance(levels: SupportResistanceLevel[], dataLength: number): PatternGraphics {
  const graphics: PatternGraphics = {
    markLines: [],
    markPoints: [],
    markAreas: [],
    graphic: [],
  };
  
  for (const level of levels) {
    if (!level.isActive || level.strength < 50) continue;
    
    const color = level.type === "support" ? COLORS.support : COLORS.resistance;
    const typeLabel = level.type === "support" ? "دعم" : "مقاومة";
    
    graphics.markLines.push({
      silent: true,
      symbol: ["none", "none"],
      lineStyle: {
        color,
        width: Math.max(1, level.strength / 40),
        type: "solid",
      },
      label: {
        show: true,
        position: "start",
        formatter: `${typeLabel} ${level.price.toFixed(2)}`,
        color,
        fontSize: 10,
        backgroundColor: "rgba(0,0,0,0.6)",
        padding: [2, 4],
      },
      data: [
        [
          { coord: [level.firstIndex, level.price] },
          { coord: [Math.min(dataLength - 1, level.lastIndex + 30), level.price] },
        ],
      ],
    });
    
    // Add touch points
    if (level.touches >= 2) {
      graphics.markPoints.push({
        symbol: "circle",
        symbolSize: 6,
        label: {
          show: false,
          position: "top",
          formatter: "",
          color: color,
          fontSize: 10,
        },
        itemStyle: {
          color,
          borderColor: "#fff",
          borderWidth: 1,
        },
        data: [{ coord: [level.firstIndex, level.price] }, { coord: [level.lastIndex, level.price] }],
      });
    }
  }
  
  return graphics;
}

// ============================================
// SIGNALS RENDERING
// ============================================

function renderSignals(signals: ChartSignal[]): PatternGraphics {
  const graphics: PatternGraphics = {
    markLines: [],
    markPoints: [],
    markAreas: [],
    graphic: [],
  };
  
  for (const signal of signals) {
    const isBuy = signal.type === "buy";
    const color = isBuy ? COLORS.buySignal : COLORS.sellSignal;
    const arrow = isBuy ? "triangle" : "triangle";
    const rotation = isBuy ? 0 : 180;
    const position = isBuy ? "bottom" : "top";
    
    // Signal strength affects size
    const size = signal.strength === "strong" ? 20 : signal.strength === "moderate" ? 16 : 12;
    
    // Main signal arrow
    graphics.markPoints.push({
      symbol: arrow,
      symbolSize: [size, size * 0.8],
      symbolRotate: rotation,
      label: {
        show: true,
        position: isBuy ? "top" : "bottom",
        formatter: isBuy ? "شراء" : "بيع",
        color: "#fff",
        fontSize: 12,
        fontWeight: "bold",
        backgroundColor: color,
        borderRadius: 4,
        padding: [4, 8],
      },
      itemStyle: {
        color,
        borderColor: "#fff",
        borderWidth: 2,
        shadowColor: color,
        shadowBlur: 10,
      },
      data: [{ coord: [signal.index, signal.price] }],
    });
    
    // Confidence indicator
    const confidenceLabel = signal.strength === "strong" ? "✓✓✓" : 
                           signal.strength === "moderate" ? "✓✓" : "✓";
    
    graphics.markPoints.push({
      symbol: "rect",
      symbolSize: [0, 0],
      label: {
        show: true,
        position: "inside",
        formatter: `${signal.patternAr}\n${signal.confidence.toFixed(0)}% ${confidenceLabel}`,
        color: "#fff",
        fontSize: 10,
        backgroundColor: "rgba(0,0,0,0.8)",
        borderRadius: 4,
        padding: [4, 8],
      },
      itemStyle: {
        color: "transparent",
      },
      data: [{ coord: [signal.index + 3, signal.price] }],
    });
  }
  
  return graphics;
}

// ============================================
// CONFIRMATION STATUS RENDERING
// ============================================

export function renderConfirmationStatus(
  pattern: DetectedPattern,
  confirmation: ConfirmationResult
): PatternGraphics {
  const graphics: PatternGraphics = {
    markLines: [],
    markPoints: [],
    markAreas: [],
    graphic: [],
  };
  
  const color = confirmation.status === "real" ? COLORS.confirmed :
                confirmation.status === "needs_confirmation" ? COLORS.needsConfirmation :
                COLORS.trap;
  
  const icon = confirmation.status === "real" ? "✅" :
               confirmation.status === "needs_confirmation" ? "⚠️" : "❌";
  
  const label = confirmation.status === "real" ? "مؤكد" :
                confirmation.status === "needs_confirmation" ? "تحتاج تأكيد" : "فخ";
  
  // Add confirmation badge near the pattern
  const lastPoint = pattern.points[pattern.points.length - 1];
  
  graphics.markPoints.push({
    symbol: "roundRect",
    symbolSize: [0, 0],
    label: {
      show: true,
      position: "inside",
      formatter: `${icon} ${label}\nالثقة: ${confirmation.overallScore}%`,
      color: "#fff",
      fontSize: 11,
      fontWeight: "bold",
      backgroundColor: color,
      borderRadius: 6,
      padding: [6, 12],
    },
    itemStyle: {
      color: "transparent",
    },
    data: [{ coord: [lastPoint.index + 5, lastPoint.price * 1.01] }],
  });
  
  // Add warning messages if trap
  if (confirmation.warnings.length > 0) {
    const warningText = confirmation.warningsAr.slice(0, 2).join("\n");
    
    graphics.markPoints.push({
      symbol: "rect",
      symbolSize: [0, 0],
      label: {
        show: true,
        position: "inside",
        formatter: warningText,
        color: COLORS.trap,
        fontSize: 10,
        backgroundColor: "rgba(239, 68, 68, 0.2)",
        borderRadius: 4,
        padding: [4, 8],
      },
      itemStyle: {
        color: "transparent",
      },
      data: [{ coord: [lastPoint.index + 5, lastPoint.price * 0.99] }],
    });
  }
  
  return graphics;
}

// ============================================
// EXPORT FUNCTION FOR ECHARTS
// ============================================

export function getEChartsPatternSeries(graphics: PatternGraphics): {
  markLine: EChartsMarkLine;
  markPoint: EChartsMarkPoint;
  markArea: EChartsMarkArea;
} {
  // Merge all markLines into one
  const allMarkLineData: { xAxis?: number; yAxis?: number; coord?: [number, number] }[][] = [];
  for (const ml of graphics.markLines) {
    allMarkLineData.push(...ml.data);
  }
  
  // Merge all markPoints into one
  const allMarkPointData: { coord: [number, number]; value?: string | number }[] = [];
  for (const mp of graphics.markPoints) {
    allMarkPointData.push(...mp.data);
  }
  
  // Merge all markAreas into one
  const allMarkAreaData: [{ coord: [number, number] }, { coord: [number, number] }][] = [];
  for (const ma of graphics.markAreas) {
    allMarkAreaData.push(...ma.data);
  }
  
  return {
    markLine: {
      silent: true,
      symbol: ["none", "none"],
      lineStyle: {
        color: COLORS.harmonicLine,
        width: 2,
        type: "solid",
      },
      label: {
        show: false,
        position: "end",
        formatter: "",
        color: "#fff",
        fontSize: 10,
      },
      data: allMarkLineData,
    },
    markPoint: {
      symbol: "circle",
      symbolSize: 10,
      label: {
        show: true,
        position: "top",
        formatter: "{b}",
        color: "#fff",
        fontSize: 10,
      },
      itemStyle: {
        color: COLORS.harmonicLine,
      },
      data: allMarkPointData,
    },
    markArea: {
      silent: true,
      itemStyle: {
        color: COLORS.przFill,
      },
      data: allMarkAreaData,
    },
  };
}
