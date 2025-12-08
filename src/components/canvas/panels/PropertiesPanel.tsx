/**
 * 🎨 CCCWAYS Canvas - Properties Panel
 * لوحة خصائص العناصر - تحرير الخصائص المرئية والهندسية
 * 
 * الوظائف:
 * - تحرير الموقع والحجم
 * - تحرير الألوان والحدود
 * - تحرير النص والخطوط
 * - تحرير الظلال والتأثيرات
 * - تحرير الزوايا والدوران
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useCanvasStore } from '../../../stores/canvasStore';
import type { CanvasElement, ElementStyle } from '../../../types/canvas';

// ألوان مسبقة
const PRESET_COLORS = [
  '#000000', '#ffffff', '#ef4444', '#f97316', '#f59e0b',
  '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#64748b', '#475569', '#334155'
];

// أنماط الخطوط
const FONT_FAMILIES = [
  'Inter', 'Arial', 'Helvetica', 'Georgia', 'Times New Roman',
  'Courier New', 'Verdana', 'Tahoma', 'Cairo', 'Tajawal'
];

// أنماط الحدود
const STROKE_STYLES: { value: string; label: string }[] = [
  { value: 'solid', label: 'متصل' },
  { value: 'dashed', label: 'متقطع' },
  { value: 'dotted', label: 'منقط' }
];

interface PropertiesPanelProps {
  className?: string;
  onClose?: () => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  className = '',
  onClose
}) => {
  const { elements, selectedIds, selectedElementIds, updateElement } = useCanvasStore();
  
  // استخدام selectedIds أو selectedElementIds
  const selection = selectedElementIds ?? selectedIds ?? [];
  
  // العناصر المحددة - تحويل elements من Record إلى Array
  const elementsArray = useMemo(() => Object.values(elements), [elements]);
  const selectedElements = useMemo(
    () => elementsArray.filter((el: CanvasElement) => selection.includes(el.id)),
    [elementsArray, selection]
  );
  const selectedElement = selectedElements[0];
  const hasSelection = selectedElements.length > 0;
  const isMultiSelection = selectedElements.length > 1;
  
  // حالة محلية للتحرير
  const [localStyle, setLocalStyle] = useState<Partial<ElementStyle>>({});
  const [localPosition, setLocalPosition] = useState({ x: 0, y: 0 });
  const [localSize, setLocalSize] = useState({ width: 0, height: 0 });
  const [localRotation, setLocalRotation] = useState(0);
  
  // تحديث الحالة المحلية عند تغيير العنصر المحدد
  useEffect(() => {
    if (selectedElement) {
      // Convert ConnectorStyle to ElementStyle if needed
      const elementStyle = (selectedElement.style || {}) as any;
      const normalizedStyle: Partial<ElementStyle> = {
        ...elementStyle,
        // Ensure stroke is in correct format
        stroke: typeof elementStyle.stroke === 'string' 
          ? { color: elementStyle.stroke, width: 1, style: 'solid' as const, opacity: 1 }
          : elementStyle.stroke,
      };
      setLocalStyle(normalizedStyle);
      setLocalPosition({ x: selectedElement.x, y: selectedElement.y });
      setLocalSize({ width: selectedElement.width, height: selectedElement.height });
      setLocalRotation(selectedElement.rotation || 0);
    }
  }, [selectedElement]);
  
  // تحديث خصائص العنصر
  const handleUpdateElement = useCallback((updates: Partial<CanvasElement>) => {
    if (selectedElement) {
      updateElement(selectedElement.id, updates);
    }
    // تحديث جميع العناصر المحددة إذا كان تحديد متعدد
    if (isMultiSelection) {
      selectedElements.forEach((el: CanvasElement) => {
        updateElement(el.id, updates);
      });
    }
  }, [selectedElement, selectedElements, isMultiSelection, updateElement]);
  
  // تحديث النمط
  const handleStyleUpdate = useCallback((styleUpdates: Partial<ElementStyle>) => {
    const newStyle = { ...localStyle, ...styleUpdates };
    setLocalStyle(newStyle);
    handleUpdateElement({ style: newStyle as ElementStyle });
  }, [localStyle, handleUpdateElement]);
  
  // تحديث الموقع
  const handlePositionUpdate = useCallback((axis: 'x' | 'y', value: number) => {
    const newPosition = { ...localPosition, [axis]: value };
    setLocalPosition(newPosition);
    handleUpdateElement({ [axis]: value });
  }, [localPosition, handleUpdateElement]);
  
  // تحديث الحجم
  const handleSizeUpdate = useCallback((dimension: 'width' | 'height', value: number) => {
    const newSize = { ...localSize, [dimension]: value };
    setLocalSize(newSize);
    handleUpdateElement({ [dimension]: value });
  }, [localSize, handleUpdateElement]);
  
  // تحديث الدوران
  const handleRotationUpdate = useCallback((value: number) => {
    setLocalRotation(value);
    handleUpdateElement({ rotation: value });
  }, [handleUpdateElement]);
  
  if (!hasSelection) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 w-72 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            الخصائص
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              ✕
            </button>
          )}
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          اختر عنصراً لتحرير خصائصه
        </p>
      </div>
    );
  }
  
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 w-72 overflow-y-auto max-h-[calc(100vh-100px)] ${className}`}>
      {/* العنوان */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {isMultiSelection ? `${selectedElements.length} عناصر محددة` : `خصائص ${selectedElement?.type}`}
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            ✕
          </button>
        )}
      </div>
      
      {/* قسم الموقع والحجم */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          الموقع والحجم
        </h4>
        
        <div className="grid grid-cols-2 gap-3">
          {/* X */}
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">X</label>
            <input
              type="number"
              value={Math.round(localPosition.x)}
              onChange={(e) => handlePositionUpdate('x', parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          
          {/* Y */}
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">Y</label>
            <input
              type="number"
              value={Math.round(localPosition.y)}
              onChange={(e) => handlePositionUpdate('y', parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          
          {/* Width */}
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">العرض</label>
            <input
              type="number"
              value={Math.round(localSize.width)}
              onChange={(e) => handleSizeUpdate('width', parseFloat(e.target.value) || 0)}
              min={1}
              className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          
          {/* Height */}
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">الارتفاع</label>
            <input
              type="number"
              value={Math.round(localSize.height)}
              onChange={(e) => handleSizeUpdate('height', parseFloat(e.target.value) || 0)}
              min={1}
              className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
        </div>
        
        {/* الدوران */}
        <div className="mt-3">
          <label className="text-xs text-gray-500 dark:text-gray-400">الدوران (درجة)</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={360}
              value={localRotation}
              onChange={(e) => handleRotationUpdate(parseFloat(e.target.value))}
              className="flex-1"
            />
            <input
              type="number"
              value={Math.round(localRotation)}
              onChange={(e) => handleRotationUpdate(parseFloat(e.target.value) || 0)}
              min={0}
              max={360}
              className="w-16 px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
        </div>
      </div>
      
      {/* قسم الألوان */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          الألوان
        </h4>
        
        {/* لون التعبئة */}
        <div className="mb-3">
          <label className="text-xs text-gray-500 dark:text-gray-400">لون التعبئة</label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="color"
              value={typeof localStyle.fill === 'string' ? localStyle.fill : localStyle.fill?.color || '#ffffff'}
              onChange={(e) => handleStyleUpdate({ fill: { color: e.target.value, style: 'solid', opacity: 1 } })}
              className="w-8 h-8 rounded cursor-pointer"
            />
            <input
              type="text"
              value={typeof localStyle.fill === 'string' ? localStyle.fill : localStyle.fill?.color || '#ffffff'}
              onChange={(e) => handleStyleUpdate({ fill: { color: e.target.value, style: 'solid', opacity: 1 } })}
              className="flex-1 px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          
          {/* ألوان مسبقة */}
          <div className="flex flex-wrap gap-1 mt-2">
            {PRESET_COLORS.slice(0, 10).map(color => (
              <button
                key={color}
                onClick={() => handleStyleUpdate({ fill: { color, style: 'solid', opacity: 1 } })}
                className="w-5 h-5 rounded border border-gray-300 dark:border-gray-600"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
        
        {/* لون الحدود */}
        <div className="mb-3">
          <label className="text-xs text-gray-500 dark:text-gray-400">لون الحدود</label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="color"
              value={typeof localStyle.stroke === 'string' ? localStyle.stroke : localStyle.stroke?.color || '#000000'}
              onChange={(e) => handleStyleUpdate({ stroke: { color: e.target.value, width: 2, style: 'solid', opacity: 1 } })}
              className="w-8 h-8 rounded cursor-pointer"
            />
            <input
              type="text"
              value={typeof localStyle.stroke === 'string' ? localStyle.stroke : localStyle.stroke?.color || '#000000'}
              onChange={(e) => handleStyleUpdate({ stroke: { color: e.target.value, width: 2, style: 'solid', opacity: 1 } })}
              className="flex-1 px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
        </div>
        
        {/* سمك الحدود */}
        <div className="mb-3">
          <label className="text-xs text-gray-500 dark:text-gray-400">سمك الحدود</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={20}
              value={localStyle.strokeWidth || 1}
              onChange={(e) => handleStyleUpdate({ strokeWidth: parseFloat(e.target.value) })}
              className="flex-1"
            />
            <span className="text-sm w-8 text-center">{localStyle.strokeWidth || 1}</span>
          </div>
        </div>
        
        {/* نمط الحدود */}
        <div className="mb-3">
          <label className="text-xs text-gray-500 dark:text-gray-400">نمط الحدود</label>
          <select
            value={localStyle.strokeStyle || 'solid'}
            onChange={(e) => handleStyleUpdate({ strokeStyle: e.target.value as 'solid' | 'dashed' | 'dotted' })}
            className="w-full px-2 py-1 border rounded text-sm mt-1 dark:bg-gray-700 dark:border-gray-600"
          >
            {STROKE_STYLES.map(style => (
              <option key={style.value} value={style.value}>
                {style.label}
              </option>
            ))}
          </select>
        </div>
        
        {/* الشفافية */}
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400">الشفافية</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={localStyle.opacity ?? 1}
              onChange={(e) => handleStyleUpdate({ opacity: parseFloat(e.target.value) })}
              className="flex-1"
            />
            <span className="text-sm w-12 text-center">{Math.round((localStyle.opacity ?? 1) * 100)}%</span>
          </div>
        </div>
      </div>
      
      {/* قسم النص (للعناصر النصية) */}
      {(selectedElement?.type === 'text' || selectedElement?.type === 'sticky') && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            النص
          </h4>
          
          {/* الخط */}
          <div className="mb-3">
            <label className="text-xs text-gray-500 dark:text-gray-400">الخط</label>
            <select
              value={localStyle.fontFamily || 'Inter'}
              onChange={(e) => handleStyleUpdate({ fontFamily: e.target.value })}
              className="w-full px-2 py-1 border rounded text-sm mt-1 dark:bg-gray-700 dark:border-gray-600"
            >
              {FONT_FAMILIES.map(font => (
                <option key={font} value={font} style={{ fontFamily: font }}>
                  {font}
                </option>
              ))}
            </select>
          </div>
          
          {/* حجم الخط */}
          <div className="mb-3">
            <label className="text-xs text-gray-500 dark:text-gray-400">حجم الخط</label>
            <input
              type="number"
              value={localStyle.fontSize || 16}
              onChange={(e) => handleStyleUpdate({ fontSize: parseFloat(e.target.value) || 16 })}
              min={8}
              max={200}
              className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          
          {/* نمط الخط */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => handleStyleUpdate({ fontWeight: localStyle.fontWeight === 'bold' ? 'normal' : 'bold' })}
              className={`flex-1 px-3 py-1 border rounded text-sm font-bold ${
                localStyle.fontWeight === 'bold' ? 'bg-blue-500 text-white' : ''
              }`}
            >
              B
            </button>
            <button
              onClick={() => handleStyleUpdate({ fontStyle: localStyle.fontStyle === 'italic' ? 'normal' : 'italic' })}
              className={`flex-1 px-3 py-1 border rounded text-sm italic ${
                localStyle.fontStyle === 'italic' ? 'bg-blue-500 text-white' : ''
              }`}
            >
              I
            </button>
            <button
              onClick={() => handleStyleUpdate({ textDecoration: localStyle.textDecoration === 'underline' ? 'none' : 'underline' })}
              className={`flex-1 px-3 py-1 border rounded text-sm underline ${
                localStyle.textDecoration === 'underline' ? 'bg-blue-500 text-white' : ''
              }`}
            >
              U
            </button>
          </div>
          
          {/* محاذاة النص */}
          <div className="mb-3">
            <label className="text-xs text-gray-500 dark:text-gray-400">المحاذاة</label>
            <div className="flex gap-2 mt-1">
              {(['left', 'center', 'right'] as const).map(align => (
                <button
                  key={align}
                  onClick={() => handleStyleUpdate({ textAlign: align })}
                  className={`flex-1 px-3 py-1 border rounded text-sm ${
                    localStyle.textAlign === align ? 'bg-blue-500 text-white' : ''
                  }`}
                >
                  {align === 'left' ? '←' : align === 'center' ? '↔' : '→'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* قسم الظل */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          الظل
        </h4>
        
        <div className="flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            checked={!!localStyle.shadow}
            onChange={(e) => handleStyleUpdate({
              shadow: e.target.checked ? {
                offsetX: 4,
                offsetY: 4,
                blur: 8,
                color: 'rgba(0,0,0,0.2)'
              } : undefined
            })}
            className="w-4 h-4"
          />
          <label className="text-sm">تفعيل الظل</label>
        </div>
        
        {localStyle.shadow && (
          <>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="text-xs text-gray-500">X</label>
                <input
                  type="number"
                  value={localStyle.shadow.offsetX}
                  onChange={(e) => handleStyleUpdate({
                    shadow: { ...localStyle.shadow!, offsetX: parseFloat(e.target.value) || 0 }
                  })}
                  className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Y</label>
                <input
                  type="number"
                  value={localStyle.shadow.offsetY}
                  onChange={(e) => handleStyleUpdate({
                    shadow: { ...localStyle.shadow!, offsetY: parseFloat(e.target.value) || 0 }
                  })}
                  className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500">التمويه</label>
              <input
                type="range"
                min={0}
                max={50}
                value={localStyle.shadow.blur}
                onChange={(e) => handleStyleUpdate({
                  shadow: { ...localStyle.shadow!, blur: parseFloat(e.target.value) }
                })}
                className="w-full"
              />
            </div>
          </>
        )}
      </div>
      
      {/* قسم الزوايا */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          الزوايا الدائرية
        </h4>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={50}
            value={localStyle.borderRadius || 0}
            onChange={(e) => handleStyleUpdate({ borderRadius: parseFloat(e.target.value) })}
            className="flex-1"
          />
          <span className="text-sm w-10 text-center">{localStyle.borderRadius || 0}px</span>
        </div>
      </div>
      
      {/* معلومات العنصر */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          ID: {selectedElement?.id.slice(0, 8)}...
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          الطبقة: {selectedElement?.zIndex || 0}
        </p>
      </div>
    </div>
  );
};

export default PropertiesPanel;
