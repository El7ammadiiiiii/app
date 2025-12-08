/**
 * 🎨 CCCWAYS Canvas - Layers Panel
 * لوحة الطبقات - إدارة ترتيب العناصر وقفلها وإخفائها
 * 
 * الوظائف:
 * - عرض جميع العناصر كطبقات
 * - السحب والإفلات لإعادة الترتيب
 * - قفل/فتح العناصر
 * - إظهار/إخفاء العناصر
 * - تحديد العناصر من اللوحة
 * - تجميع العناصر
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useCanvasStore } from '../../../stores/canvasStore';
import type { CanvasElement } from '../../../types/canvas';

// أيقونات الطبقات
const LAYER_ICONS: Record<string, string> = {
  rectangle: '⬜',
  ellipse: '⭕',
  diamond: '◇',
  triangle: '△',
  star: '⭐',
  hexagon: '⬡',
  arrow: '➡️',
  text: '📝',
  freehand: '✏️',
  image: '🖼️',
  sticky: '📌',
  connector: '🔗',
  frame: '📐',
  group: '📦'
};

interface LayersPanelProps {
  className?: string;
  onClose?: () => void;
}

export const LayersPanel: React.FC<LayersPanelProps> = ({
  className = '',
  onClose
}) => {
  const { 
    elements,
    selectedIds,
    selectedElementIds,
    setSelectedIds,
    updateElement,
    deleteElement,
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward
  } = useCanvasStore();
  
  // استخدام selectedIds أو selectedElementIds
  const selection = selectedElementIds ?? selectedIds ?? [];
  // دالة لتحديد العناصر
  const selectElements = setSelectedIds;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  // تحويل elements من Record إلى Array
  const elementsArray = useMemo(() => Object.values(elements), [elements]);
  
  // ترتيب العناصر بالـ zIndex (الأعلى أولاً)
  const sortedElements = useMemo(() => {
    return [...elementsArray]
      .filter((el: CanvasElement) => {
        if (!searchTerm) return true;
        const name = el.name || `${el.type}-${el.id.slice(0, 4)}`;
        return name.toLowerCase().includes(searchTerm.toLowerCase());
      })
      .sort((a: CanvasElement, b: CanvasElement) => (b.zIndex || 0) - (a.zIndex || 0));
  }, [elementsArray, searchTerm]);
  
  // تحديد عنصر
  const handleSelectElement = useCallback((id: string, append: boolean = false) => {
    if (append) {
      if (selection.includes(id)) {
        selectElements(selection.filter((eid: string) => eid !== id));
      } else {
        selectElements([...selection, id]);
      }
    } else {
      selectElements([id]);
    }
  }, [selection, selectElements]);
  
  // قفل/فتح عنصر
  const handleToggleLock = useCallback((id: string, locked: boolean) => {
    updateElement(id, { locked: !locked });
  }, [updateElement]);
  
  // إظهار/إخفاء عنصر
  const handleToggleVisibility = useCallback((id: string, visible: boolean) => {
    updateElement(id, { visible: !visible });
  }, [updateElement]);
  
  // حذف عنصر
  const handleDeleteElement = useCallback((id: string) => {
    deleteElement(id);
  }, [deleteElement]);
  
  // بداية السحب
  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  }, []);
  
  // نهاية السحب
  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
  }, []);
  
  // الإفلات على عنصر
  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    
    if (!draggedId || draggedId === targetId) return;
    
    const draggedElement = elementsArray.find((el: CanvasElement) => el.id === draggedId);
    const targetElement = elementsArray.find((el: CanvasElement) => el.id === targetId);
    
    if (!draggedElement || !targetElement) return;
    
    // تبديل الـ zIndex
    const draggedZ = draggedElement.zIndex || 0;
    const targetZ = targetElement.zIndex || 0;
    
    updateElement(draggedId, { zIndex: targetZ });
    updateElement(targetId, { zIndex: draggedZ });
    
    setDraggedId(null);
  }, [draggedId, elementsArray, updateElement]);
  
  // السماح بالإفلات
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);
  
  // توسيع/طي المجموعة
  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);
  
  // الحصول على اسم العنصر
  const getElementName = (element: CanvasElement): string => {
    if (element.name) return element.name;
    return `${element.type}-${element.id.slice(0, 4)}`;
  };
  
  // رندر عنصر طبقة
  const renderLayerItem = (element: CanvasElement, depth: number = 0) => {
    const isSelected = selection.includes(element.id);
    const isDragging = draggedId === element.id;
    const isLocked = element.locked || false;
    const isVisible = element.visible !== false;
    const icon = LAYER_ICONS[element.type] || '📄';
    
    return (
      <div
        key={element.id}
        className={`
          relative flex items-center gap-2 px-2 py-1.5 cursor-pointer
          transition-colors duration-150
          ${isSelected ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}
          ${isDragging ? 'opacity-50' : ''}
          ${!isVisible ? 'opacity-50' : ''}
        `}
        style={{ paddingRight: `${depth * 16 + 8}px` }}
        draggable={!isLocked}
        onDragStart={(e) => handleDragStart(e, element.id)}
        onDragEnd={handleDragEnd}
        onDrop={(e) => handleDrop(e, element.id)}
        onDragOver={handleDragOver}
        onClick={(e) => handleSelectElement(element.id, e.ctrlKey || e.metaKey)}
      >
        {/* مقبض السحب */}
        <span className="text-gray-400 cursor-grab">⋮⋮</span>
        
        {/* أيقونة النوع */}
        <span className="text-lg">{icon}</span>
        
        {/* اسم العنصر */}
        <span className={`flex-1 text-sm truncate ${isLocked ? 'text-gray-500' : ''}`}>
          {getElementName(element)}
        </span>
        
        {/* أزرار التحكم */}
        <div className="flex items-center gap-1">
          {/* زر الرؤية */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleVisibility(element.id, isVisible);
            }}
            className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 ${
              isVisible ? 'text-gray-600' : 'text-gray-400'
            }`}
            title={isVisible ? 'إخفاء' : 'إظهار'}
          >
            {isVisible ? '👁️' : '🙈'}
          </button>
          
          {/* زر القفل */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleLock(element.id, isLocked);
            }}
            className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 ${
              isLocked ? 'text-red-500' : 'text-gray-400'
            }`}
            title={isLocked ? 'فتح القفل' : 'قفل'}
          >
            {isLocked ? '🔒' : '🔓'}
          </button>
        </div>
      </div>
    );
  };
  
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg w-64 flex flex-col max-h-[calc(100vh-100px)] ${className}`}>
      {/* العنوان */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          الطبقات ({elementsArray.length})
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
      
      {/* البحث */}
      <div className="p-2 border-b border-gray-200 dark:border-gray-700">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="بحث في الطبقات..."
          className="w-full px-3 py-1.5 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
        />
      </div>
      
      {/* أزرار الترتيب */}
      {selection.length > 0 && (
        <div className="flex items-center gap-1 p-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => bringToFront(selection)}
            className="flex-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200"
            title="إلى الأمام"
          >
            ⬆️ أمام
          </button>
          <button
            onClick={() => bringForward(selection)}
            className="flex-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200"
            title="للأمام"
          >
            ↑
          </button>
          <button
            onClick={() => sendBackward(selection)}
            className="flex-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200"
            title="للخلف"
          >
            ↓
          </button>
          <button
            onClick={() => sendToBack(selection)}
            className="flex-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200"
            title="إلى الخلف"
          >
            ⬇️ خلف
          </button>
        </div>
      )}
      
      {/* قائمة الطبقات */}
      <div className="flex-1 overflow-y-auto">
        {sortedElements.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchTerm ? 'لا توجد نتائج' : 'لا توجد عناصر'}
          </div>
        ) : (
          <div className="py-1">
            {sortedElements.map(element => renderLayerItem(element))}
          </div>
        )}
      </div>
      
      {/* شريط الحالة */}
      <div className="p-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500">
        {selection.length > 0 
          ? `${selection.length} عنصر محدد`
          : 'اضغط للتحديد، Ctrl+اضغط للتحديد المتعدد'}
      </div>
      
      {/* أزرار إضافية */}
      <div className="flex items-center gap-1 p-2 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => selectElements(elementsArray.map((el: CanvasElement) => el.id))}
          className="flex-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200"
          title="تحديد الكل"
        >
          ✅ الكل
        </button>
        <button
          onClick={() => selectElements([])}
          className="flex-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200"
          title="إلغاء التحديد"
        >
          ❌ إلغاء
        </button>
        <button
          onClick={() => {
            if (selection.length > 0 && confirm('حذف العناصر المحددة؟')) {
              selection.forEach((id: string) => deleteElement(id));
              selectElements([]);
            }
          }}
          className="flex-1 px-2 py-1 text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200"
          title="حذف المحدد"
          disabled={selection.length === 0}
        >
          🗑️ حذف
        </button>
      </div>
    </div>
  );
};

export default LayersPanel;
