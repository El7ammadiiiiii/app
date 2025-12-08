// =============================================================================
// 🎯 CCCWAYS Canvas - Type Definitions
// نظام الكانفاس اللانهائي - تعريفات الأنواع الأساسية
// =============================================================================

// ═══════════════════════════════════════════════════════════════════════════
// النقاط والأبعاد الأساسية
// ═══════════════════════════════════════════════════════════════════════════

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Transform {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// منطقة العرض (Viewport)
// ═══════════════════════════════════════════════════════════════════════════

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
  minZoom: number;
  maxZoom: number;
}

export interface ViewportBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// أدوات الكانفاس
// ═══════════════════════════════════════════════════════════════════════════

export type CanvasTool = 
  | 'select'       // أداة التحديد
  | 'pan'          // أداة التحريك
  | 'hand'         // أداة اليد (للتحريك)
  | 'draw'         // الرسم الحر
  | 'freehand'     // الرسم الحر (alias)
  | 'eraser'       // الممحاة
  | 'shape'        // الأشكال
  | 'rectangle'    // مستطيل
  | 'ellipse'      // بيضاوي
  | 'triangle'     // مثلث
  | 'star'         // نجمة
  | 'polygon'      // مضلع
  | 'line'         // خط
  | 'arrow'        // سهم
  | 'text'         // النصوص
  | 'sticky'       // الملاحظات اللاصقة
  | 'connector'    // الروابط
  | 'frame'        // الإطارات
  | 'image'        // الصور
  | 'embed'        // المحتوى المضمن
  | 'laser'        // مؤشر الليزر
  | 'comment'      // التعليقات
  | 'ai';          // الذكاء الاصطناعي

export type ShapeType = 
  | 'rectangle'
  | 'ellipse'
  | 'circle'
  | 'triangle'
  | 'diamond'
  | 'hexagon'
  | 'pentagon'
  | 'octagon'
  | 'parallelogram'
  | 'trapezoid'
  | 'polygon'
  | 'star'
  | 'arrow'
  | 'arrow-right'
  | 'arrow-left'
  | 'callout'
  | 'cloud'
  | 'heart'
  | 'cross'
  | 'line';

// ═══════════════════════════════════════════════════════════════════════════
// أنماط الخطوط والألوان
// ═══════════════════════════════════════════════════════════════════════════

export type StrokeStyle = 'solid' | 'dashed' | 'dotted';
export type FillStyle = 'solid' | 'semi' | 'hatch' | 'cross' | 'none';
export type FontFamily = 'hand' | 'normal' | 'mono' | 'serif';
export type TextAlign = 'left' | 'center' | 'right';
export type ArrowHead = 'none' | 'arrow' | 'triangle' | 'circle' | 'diamond' | 'bar';

export interface StrokeOptions {
  color: string;
  width: number;
  style: StrokeStyle;
  opacity: number;
}

export interface FillOptions {
  color: string;
  style: FillStyle;
  opacity: number;
}

export interface TextOptions {
  fontFamily: FontFamily;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textAlign: TextAlign;
  lineHeight: number;
  color: string;
}

// أنماط العناصر المختلفة
export interface ElementStyle {
  stroke: StrokeOptions;
  fill: FillOptions;
  opacity: number;
  // Extended properties
  fillOpacity?: number;
  strokeWidth?: number;
  strokeOpacity?: number;
  strokeStyle?: StrokeStyle;
  strokeLinecap?: 'round' | 'butt' | 'square';
  strokeLinejoin?: 'round' | 'miter' | 'bevel';
  gradientColors?: string[];
  gradientAngle?: number;
  shadow?: {
    offsetX: number;
    offsetY: number;
    blur: number;
    color: string;
  };
  // Text properties
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through';
  color?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: number;
  letterSpacing?: number;
  backgroundColor?: string;
  padding?: number;
  borderRadius?: number;
  cornerRadius?: number;
  // Connector properties
  curvature?: number;
  startArrow?: ArrowHead;
  endArrow?: ArrowHead;
  arrowSize?: number;
}

export interface TextStyle extends TextOptions {
  textDecoration?: 'none' | 'underline' | 'line-through';
  letterSpacing?: number;
  backgroundColor?: string;
  padding?: number;
  borderRadius?: number;
}

export interface PathStyle {
  strokeColor: string;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  fill: string;
  opacity: number;
}

// ShapeStyle للاستخدام في مكونات الرسم - تقبل string أو StrokeOptions/FillOptions
export interface ShapeStyle {
  fill: string | FillOptions;
  stroke: string | StrokeOptions;
  opacity?: number;
  cornerRadius?: number;
  fillOpacity?: number;
  strokeWidth?: number;
  strokeOpacity?: number;
  strokeStyle?: StrokeStyle;
  strokeLinecap?: 'round' | 'butt' | 'square';
  strokeLinejoin?: 'round' | 'miter' | 'bevel';
  gradientColors?: string[];
  gradientAngle?: number;
  shadow?: {
    offsetX: number;
    offsetY: number;
    blur: number;
    color: string;
  };
}

export interface ConnectorStyle {
  strokeColor?: string;
  stroke?: string | StrokeOptions; // alias for strokeColor
  strokeWidth?: number;
  strokeStyle?: StrokeStyle;
  startArrow?: ArrowHead;
  endArrow?: ArrowHead;
  arrowSize?: number;
  curvature?: number;
  cornerRadius?: number;
  // Additional style properties
  fill?: string | FillOptions;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  borderRadius?: number;
  opacity?: number;
}

export type ConnectorType = 'straight' | 'curved' | 'elbow' | 'orthogonal' | 'wavy';

export interface StickyElement extends BaseElement {
  type: 'sticky';
  text: string;
  content?: string; // alias for text
  color?: string; // alias for noteColor
  textOptions: TextOptions;
  noteColor: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// الطبقات
// ═══════════════════════════════════════════════════════════════════════════

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  color: string;
  elementIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// حالة الكانفاس
// ═══════════════════════════════════════════════════════════════════════════

export interface CanvasState {
  // العناصر
  elements: Record<string, CanvasElement>;
  elementOrder: string[];
  
  // الطبقات
  layers: Layer[];
  activeLayerId: string | null;
  
  // التحديد
  selectedIds: string[];
  selectedElementIds?: string[]; // alias for selectedIds
  hoveredId: string | null;
  
  // العرض
  viewport: Viewport;
  viewportOffset?: Point;  // alias for viewport.x, viewport.y
  zoom?: number;           // alias for viewport.zoom
  
  // الأداة الحالية
  activeTool: CanvasTool;
  activeShapeType: ShapeType;
  
  // الأنماط الافتراضية
  defaultStroke: StrokeOptions;
  defaultFill: FillOptions;
  defaultText: TextOptions;
  
  // الحالة
  isDrawing: boolean;
  isDragging: boolean;
  isPanning: boolean;
  isResizing: boolean;
  
  // التاريخ
  canUndo: boolean;
  canRedo: boolean;
  
  // الشبكة والمحاذاة
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  snapToElements: boolean;
  
  // الأداء
  isLoading: boolean;
  lastSaved: Date | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// العنصر الأساسي
// ═══════════════════════════════════════════════════════════════════════════

export interface BaseElement {
  id: string;
  type: string;
  layerId: string;
  
  // الموقع والحجم
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  
  // Bounds helper (computed from x, y, width, height)
  bounds?: Bounds;
  
  // الأنماط
  stroke: StrokeOptions;
  fill: FillOptions;
  opacity: number;
  style?: ElementStyle;
  
  // الحالة
  locked: boolean;
  visible: boolean;
  
  // البيانات الوصفية
  name?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  
  // التواريخ
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// أنواع العناصر المختلفة
// ═══════════════════════════════════════════════════════════════════════════

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shapeType: ShapeType;
  points?: Point[];
  cornerRadius?: number;
}

export interface FreehandElement extends BaseElement {
  type: 'freehand';
  points: Point[];
  pressure?: number[];
  smoothing: number;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  content?: string; // alias for text
  textOptions: TextOptions;
  autoResize: boolean;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  alt?: string;
  naturalWidth: number;
  naturalHeight: number;
  crop?: Bounds;
  filters?: ImageFilters;
}

export interface ImageFilters {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  grayscale: boolean;
  invert: boolean;
}

export interface StickyNoteElement extends BaseElement {
  type: 'sticky';
  text: string;
  textOptions: TextOptions;
  noteColor: string;
}

export interface ConnectorElement extends BaseElement {
  type: 'connector';
  startId: string | null;
  endId: string | null;
  startPoint: Point;
  endPoint: Point;
  startArrow?: ArrowHead;
  endArrow?: ArrowHead;
  path: Point[];
  pathType: 'straight' | 'curved' | 'elbow' | 'orthogonal' | 'wavy';
  connectorType?: 'straight' | 'curved' | 'elbow' | 'orthogonal' | 'wavy'; // alias for pathType
  label?: string;
  connectorStyle?: ConnectorStyle;
}

export interface FrameElement extends BaseElement {
  type: 'frame';
  childIds: string[];
  children?: string[]; // alias for childIds
  backgroundColor?: string;
  showName: boolean;
  clipContent: boolean;
}

export interface EmbedElement extends BaseElement {
  type: 'embed';
  url: string;
  embedType: 'video' | 'website' | 'document' | 'code';
  aspectRatio?: number;
  isLoaded: boolean;
}

export interface CommentElement extends BaseElement {
  type: 'comment';
  text: string;
  authorId: string;
  authorName: string;
  resolved: boolean;
  replies: CommentReply[];
}

export interface CommentReply {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  createdAt: Date;
}

// Union type لكل العناصر
export type CanvasElement = 
  | ShapeElement 
  | FreehandElement 
  | TextElement 
  | ImageElement 
  | StickyNoteElement 
  | ConnectorElement 
  | FrameElement 
  | EmbedElement
  | CommentElement;

// ═══════════════════════════════════════════════════════════════════════════
// التاريخ (Undo/Redo)
// ═══════════════════════════════════════════════════════════════════════════

export interface HistoryEntry {
  id: string;
  type: HistoryActionType;
  timestamp: Date;
  userId?: string;
  elements: Record<string, CanvasElement>;
  selectedIds: string[];
  description: string;
}

export type HistoryActionType = 
  | 'create'
  | 'update'
  | 'delete'
  | 'move'
  | 'resize'
  | 'rotate'
  | 'style'
  | 'group'
  | 'ungroup'
  | 'layer'
  | 'paste'
  | 'import';

// ═══════════════════════════════════════════════════════════════════════════
// الأحداث
// ═══════════════════════════════════════════════════════════════════════════

export interface CanvasPointerEvent {
  point: Point;
  pressure: number;
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  button: number;
  timestamp: number;
}

export interface CanvasGesture {
  type: 'pan' | 'pinch' | 'rotate';
  delta: Point;
  scale?: number;
  rotation?: number;
  center: Point;
}

// ═══════════════════════════════════════════════════════════════════════════
// التصدير
// ═══════════════════════════════════════════════════════════════════════════

export interface ExportOptions {
  format: 'png' | 'svg' | 'pdf' | 'json';
  quality: number;
  scale: number;
  background: boolean;
  selectedOnly: boolean;
  padding: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// الألوان المحددة مسبقاً
// ═══════════════════════════════════════════════════════════════════════════

export const CANVAS_COLORS = {
  primary: '#00D4B4',
  black: '#1e1e1e',
  white: '#ffffff',
  gray: '#9ca3af',
  red: '#ef4444',
  orange: '#f97316',
  yellow: '#eab308',
  green: '#22c55e',
  blue: '#3b82f6',
  purple: '#a855f7',
  pink: '#ec4899',
} as const;

export const STICKY_COLORS = {
  yellow: '#fef08a',
  green: '#bbf7d0',
  blue: '#bfdbfe',
  pink: '#fbcfe8',
  purple: '#e9d5ff',
  orange: '#fed7aa',
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// الثوابت
// ═══════════════════════════════════════════════════════════════════════════

export const CANVAS_DEFAULTS = {
  viewport: {
    x: 0,
    y: 0,
    zoom: 1,
    minZoom: 0.1,
    maxZoom: 10,
  },
  stroke: {
    color: '#1e1e1e',
    width: 2,
    style: 'solid' as StrokeStyle,
    opacity: 1,
  },
  fill: {
    color: '#ffffff',
    style: 'solid' as FillStyle,
    opacity: 1,
  },
  text: {
    fontFamily: 'normal' as FontFamily,
    fontSize: 16,
    fontWeight: 'normal' as const,
    fontStyle: 'normal' as const,
    textAlign: 'center' as TextAlign,
    lineHeight: 1.5,
    color: '#1e1e1e',
  },
  gridSize: 20,
} as const;
