/**
 * 🎨 CCCWAYS Canvas - History Panel
 * لوحة التاريخ - عرض سجل العمليات والتراجع والإعادة
 * 
 * الوظائف:
 * - عرض سجل جميع العمليات
 * - التراجع إلى أي نقطة
 * - الإعادة للعمليات الملغاة
 * - تصفية حسب نوع العملية
 * - حفظ نقاط استعادة
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useCanvasStore } from '../../../stores/canvasStore';

// أنواع العمليات
type ActionType = 
  | 'add' 
  | 'delete' 
  | 'update' 
  | 'move' 
  | 'resize' 
  | 'rotate' 
  | 'style'
  | 'group'
  | 'ungroup'
  | 'reorder'
  | 'batch';

// أيقونات العمليات
const ACTION_ICONS: Record<ActionType, string> = {
  add: '➕',
  delete: '🗑️',
  update: '✏️',
  move: '↔️',
  resize: '↕️',
  rotate: '🔄',
  style: '🎨',
  group: '📦',
  ungroup: '📤',
  reorder: '🔀',
  batch: '📋'
};

// أسماء العمليات
const ACTION_NAMES: Record<ActionType, string> = {
  add: 'إضافة',
  delete: 'حذف',
  update: 'تعديل',
  move: 'نقل',
  resize: 'تغيير الحجم',
  rotate: 'تدوير',
  style: 'تغيير النمط',
  group: 'تجميع',
  ungroup: 'فك التجميع',
  reorder: 'إعادة ترتيب',
  batch: 'عمليات متعددة'
};

// واجهة سجل العملية
interface HistoryEntry {
  id: string;
  type: ActionType;
  description: string;
  timestamp: Date;
  elementIds: string[];
  isSavePoint?: boolean;
  savePointName?: string;
}

interface HistoryPanelProps {
  className?: string;
  onClose?: () => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  className = '',
  onClose
}) => {
  const { 
    history, 
    historyIndex, 
    undo, 
    redo, 
    canUndo, 
    canRedo,
    clearHistory 
  } = useCanvasStore();
  
  const [filter, setFilter] = useState<ActionType | 'all'>('all');
  const [savePoints, setSavePoints] = useState<HistoryEntry[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [savePointName, setSavePointName] = useState('');
  
  // محاكاة سجل التاريخ (في التطبيق الحقيقي يأتي من الـ store)
  const mockHistory: HistoryEntry[] = useMemo(() => {
    // هنا نفترض أن الـ history يحتوي على سجلات
    // في التطبيق الحقيقي، هذا يأتي من الـ store
    return history?.map((entry: any, index: number) => ({
      id: `hist-${index}`,
      type: entry.type || 'update',
      description: entry.description || `عملية ${index + 1}`,
      timestamp: entry.timestamp || new Date(Date.now() - (history.length - index) * 60000),
      elementIds: entry.elementIds || [],
      isSavePoint: entry.isSavePoint,
      savePointName: entry.savePointName
    })) || [];
  }, [history]);
  
  // تصفية السجل
  const filteredHistory = useMemo(() => {
    if (filter === 'all') return mockHistory;
    return mockHistory.filter(entry => entry.type === filter);
  }, [mockHistory, filter]);
  
  // التراجع إلى نقطة معينة
  const handleGoToEntry = useCallback((entryIndex: number) => {
    const diff = historyIndex - entryIndex;
    if (diff > 0) {
      // تراجع
      for (let i = 0; i < diff; i++) {
        undo();
      }
    } else if (diff < 0) {
      // إعادة
      for (let i = 0; i < Math.abs(diff); i++) {
        redo();
      }
    }
  }, [historyIndex, undo, redo]);
  
  // حفظ نقطة استعادة
  const handleSavePoint = useCallback(() => {
    if (!savePointName.trim()) return;
    
    const savePoint: HistoryEntry = {
      id: `save-${Date.now()}`,
      type: 'batch',
      description: savePointName,
      timestamp: new Date(),
      elementIds: [],
      isSavePoint: true,
      savePointName: savePointName
    };
    
    setSavePoints(prev => [...prev, savePoint]);
    setSavePointName('');
    setShowSaveDialog(false);
  }, [savePointName]);
  
  // تنسيق الوقت
  const formatTime = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'الآن';
    if (diff < 3600000) return `قبل ${Math.floor(diff / 60000)} دقيقة`;
    if (diff < 86400000) return `قبل ${Math.floor(diff / 3600000)} ساعة`;
    return date.toLocaleDateString('ar-SA');
  };
  
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg w-72 flex flex-col max-h-[calc(100vh-100px)] ${className}`}>
      {/* العنوان */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          التاريخ
        </h3>
        <div className="flex items-center gap-1">
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      
      {/* أزرار التراجع/الإعادة */}
      <div className="flex items-center gap-2 p-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={undo}
          disabled={!canUndo}
          className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded ${
            canUndo
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          ↶ تراجع
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded ${
            canRedo
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          ↷ إعادة
        </button>
      </div>
      
      {/* تصفية */}
      <div className="p-2 border-b border-gray-200 dark:border-gray-700">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as ActionType | 'all')}
          className="w-full px-3 py-1.5 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
        >
          <option value="all">جميع العمليات</option>
          {Object.entries(ACTION_NAMES).map(([key, name]) => (
            <option key={key} value={key}>
              {ACTION_ICONS[key as ActionType]} {name}
            </option>
          ))}
        </select>
      </div>
      
      {/* نقاط الاستعادة */}
      {savePoints.length > 0 && (
        <div className="p-2 border-b border-gray-200 dark:border-gray-700 bg-yellow-50 dark:bg-yellow-900/20">
          <h4 className="text-xs font-medium text-yellow-800 dark:text-yellow-200 mb-2">
            📌 نقاط الاستعادة
          </h4>
          {savePoints.map(point => (
            <div
              key={point.id}
              className="flex items-center justify-between p-1 text-sm hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded cursor-pointer"
            >
              <span>{point.savePointName}</span>
              <span className="text-xs text-gray-500">{formatTime(point.timestamp)}</span>
            </div>
          ))}
        </div>
      )}
      
      {/* قائمة السجل */}
      <div className="flex-1 overflow-y-auto">
        {filteredHistory.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            لا يوجد سجل
          </div>
        ) : (
          <div className="py-1">
            {filteredHistory.map((entry, index) => {
              const isCurrent = index === historyIndex;
              const isPast = index < historyIndex;
              
              return (
                <div
                  key={entry.id}
                  onClick={() => handleGoToEntry(index)}
                  className={`
                    flex items-center gap-2 px-3 py-2 cursor-pointer
                    transition-colors duration-150
                    ${isCurrent 
                      ? 'bg-blue-100 dark:bg-blue-900 border-r-2 border-blue-500' 
                      : isPast
                        ? 'bg-gray-50 dark:bg-gray-750 opacity-75'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                    ${entry.isSavePoint ? 'border-r-2 border-yellow-500' : ''}
                  `}
                >
                  {/* أيقونة العملية */}
                  <span className="text-lg">
                    {entry.isSavePoint ? '📌' : ACTION_ICONS[entry.type]}
                  </span>
                  
                  {/* تفاصيل العملية */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${
                      isPast ? 'text-gray-500' : 'text-gray-900 dark:text-white'
                    }`}>
                      {entry.isSavePoint ? entry.savePointName : ACTION_NAMES[entry.type]}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTime(entry.timestamp)}
                    </p>
                  </div>
                  
                  {/* مؤشر الحالة */}
                  {isCurrent && (
                    <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">
                      الحالي
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* شريط الحالة */}
      <div className="p-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500">
        {mockHistory.length} عملية • الموقع {historyIndex + 1}
      </div>
      
      {/* أزرار إضافية */}
      <div className="flex items-center gap-1 p-2 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setShowSaveDialog(true)}
          className="flex-1 px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded hover:bg-yellow-200"
          title="حفظ نقطة استعادة"
        >
          📌 حفظ نقطة
        </button>
        <button
          onClick={() => {
            if (confirm('مسح سجل التاريخ؟ هذا الإجراء لا يمكن التراجع عنه.')) {
              clearHistory?.();
            }
          }}
          className="flex-1 px-2 py-1 text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200"
          title="مسح السجل"
        >
          🗑️ مسح
        </button>
      </div>
      
      {/* نافذة حفظ نقطة الاستعادة */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-80 shadow-xl">
            <h4 className="text-lg font-semibold mb-3">حفظ نقطة استعادة</h4>
            <input
              type="text"
              value={savePointName}
              onChange={(e) => setSavePointName(e.target.value)}
              placeholder="اسم النقطة..."
              className="w-full px-3 py-2 border rounded mb-3 dark:bg-gray-700 dark:border-gray-600"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleSavePoint}
                disabled={!savePointName.trim()}
                className="flex-1 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
              >
                حفظ
              </button>
              <button
                onClick={() => setShowSaveDialog(false)}
                className="flex-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryPanel;
