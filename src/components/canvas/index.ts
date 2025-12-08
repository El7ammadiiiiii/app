/**
 * 🎨 CCCWAYS Canvas - Main Index
 * الملف الرئيسي لنظام الكانفاس - تصدير جميع المكونات
 * 
 * نظام كانفاس لانهائي متكامل مع:
 * - ذكاء اصطناعي للرسم والتحرير
 * - تعاون فوري متعدد المستخدمين
 * - أدوات رسم متقدمة
 * - تصدير متعدد الصيغ
 */

// ========== Core Components ==========
export { CanvasProvider, useCanvasContext } from './core/CanvasContext';
export { InfiniteCanvas, type InfiniteCanvasProps, type InfiniteCanvasRef } from './core/InfiniteCanvas';
export { VirtualViewport } from './core/VirtualViewport';
export { default as CanvasRenderer } from './core/CanvasRenderer';

// ========== Tools Components ==========
export { Toolbar } from './tools/Toolbar';
export { ToolPalette } from './tools/ToolPalette';
export { QuickActions } from './tools/QuickActions';
export { KeyboardShortcuts } from './tools/KeyboardShortcuts';

// ========== Elements Components ==========
export { Shape } from './elements/Shape';
export { FreehandPath } from './elements/FreehandPath';
export { TextBlock } from './elements/TextBlock';
export { ImageElement } from './elements/ImageElement';
export { StickyNote } from './elements/StickyNote';
export { Connector } from './elements/Connector';
export { Frame } from './elements/Frame';

// ========== Panels Components ==========
export { PropertiesPanel } from './panels/PropertiesPanel';
export { LayersPanel } from './panels/LayersPanel';
export { HistoryPanel } from './panels/HistoryPanel';
export { ExportPanel } from './panels/ExportPanel';

// ========== AI Components ==========
export { AIAssistant } from './ai/AIAssistant';
export { SmartSuggestions } from './ai/SmartSuggestions';

// ========== Collaboration Components ==========
export { Cursors } from './collaboration/Cursors';
export { PresenceIndicator } from './collaboration/PresenceIndicator';
export { Comments } from './collaboration/Comments';

// ========== Default Export - Simplified Canvas Component ==========
export { InfiniteCanvas as default, InfiniteCanvas as CCCWAYSCanvas } from './core/InfiniteCanvas';
