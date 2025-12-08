/**
 * 🎨 CCCWAYS Canvas - Panels Index
 * ملف تصدير مكونات اللوحات
 */

// لوحة الخصائص
export { PropertiesPanel } from './PropertiesPanel';
export { default as PropertiesPanelDefault } from './PropertiesPanel';

// لوحة الطبقات
export { LayersPanel } from './LayersPanel';
export { default as LayersPanelDefault } from './LayersPanel';

// لوحة التاريخ
export { HistoryPanel } from './HistoryPanel';
export { default as HistoryPanelDefault } from './HistoryPanel';

// لوحة التصدير
export { ExportPanel } from './ExportPanel';
export { default as ExportPanelDefault } from './ExportPanel';

/**
 * جميع اللوحات كـ object واحد
 */
export const Panels = {
  Properties: PropertiesPanel,
  Layers: LayersPanel,
  History: HistoryPanel,
  Export: ExportPanel
};

export default Panels;
