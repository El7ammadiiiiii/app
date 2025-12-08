/**
 * 🤖 CCCWAYS Canvas - Smart Suggestions
 * اقتراحات ذكية - تحليل اللوحة وتقديم اقتراحات تحسين
 * 
 * الوظائف:
 * - اقتراح محاذاة العناصر
 * - اقتراح تناسق الألوان
 * - اقتراح تحسين التخطيط
 * - اقتراح إضافة عناصر
 * - اقتراح توصيلات بين العناصر
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useCanvasStore } from '../../../stores/canvasStore';
import type { CanvasElement } from '../../../types/canvas';

// أنواع الاقتراحات
type SuggestionType = 
  | 'alignment' 
  | 'spacing' 
  | 'color' 
  | 'layout' 
  | 'connection' 
  | 'enhancement'
  | 'accessibility';

// أيقونات الاقتراحات
const SUGGESTION_ICONS: Record<SuggestionType, string> = {
  alignment: '📐',
  spacing: '↔️',
  color: '🎨',
  layout: '📊',
  connection: '🔗',
  enhancement: '✨',
  accessibility: '♿'
};

// أسماء الاقتراحات
const SUGGESTION_NAMES: Record<SuggestionType, string> = {
  alignment: 'محاذاة',
  spacing: 'مسافات',
  color: 'ألوان',
  layout: 'تخطيط',
  connection: 'توصيل',
  enhancement: 'تحسين',
  accessibility: 'إمكانية الوصول'
};

// واجهة الاقتراح
interface Suggestion {
  id: string;
  type: SuggestionType;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  affectedElements: string[];
  action: () => void;
  preview?: () => void;
}

interface SmartSuggestionsProps {
  className?: string;
  onClose?: () => void;
  isOpen?: boolean;
  maxSuggestions?: number;
}

export const SmartSuggestions: React.FC<SmartSuggestionsProps> = ({
  className = '',
  onClose,
  isOpen = true,
  maxSuggestions = 10
}) => {
  const { 
    elements, 
    selectedElementIds, 
    updateElement
  } = useCanvasStore();
  
  // تحويل elements من Record إلى Array
  const elementsArray = React.useMemo(() => Object.values(elements), [elements]);
  
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [filterType, setFilterType] = useState<SuggestionType | 'all'>('all');
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  
  // تحليل اللوحة وإنشاء الاقتراحات
  const analyzeSuggestions = useCallback(async () => {
    setIsAnalyzing(true);
    
    // محاكاة التحليل (في التطبيق الحقيقي يمكن استخدام AI)
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newSuggestions: Suggestion[] = [];
    
    // 1. اقتراحات المحاذاة
    const alignmentSuggestions = analyzeAlignment(elementsArray, updateElement);
    newSuggestions.push(...alignmentSuggestions);
    
    // 2. اقتراحات المسافات
    const spacingSuggestions = analyzeSpacing(elementsArray, updateElement);
    newSuggestions.push(...spacingSuggestions);
    
    // 3. اقتراحات الألوان
    const colorSuggestions = analyzeColors(elementsArray, updateElement);
    newSuggestions.push(...colorSuggestions);
    
    // 4. اقتراحات التوصيل
    const connectionSuggestions = analyzeConnections(elementsArray);
    newSuggestions.push(...connectionSuggestions);
    
    // 5. اقتراحات التحسين
    const enhancementSuggestions = analyzeEnhancements(elementsArray, updateElement);
    newSuggestions.push(...enhancementSuggestions);
    
    // فلترة المرفوضة
    const filteredSuggestions = newSuggestions
      .filter(s => !dismissedIds.has(s.id))
      .slice(0, maxSuggestions);
    
    setSuggestions(filteredSuggestions);
    setIsAnalyzing(false);
  }, [elementsArray, updateElement, dismissedIds, maxSuggestions]);
  
  // تحليل تلقائي عند تغيير العناصر
  useEffect(() => {
    if (isOpen && elementsArray.length > 0) {
      analyzeSuggestions();
    }
  }, [elementsArray.length, isOpen]);
  
  // تطبيق اقتراح
  const applySuggestion = useCallback((suggestion: Suggestion) => {
    suggestion.action();
    setDismissedIds(prev => new Set([...prev, suggestion.id]));
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
  }, []);
  
  // رفض اقتراح
  const dismissSuggestion = useCallback((id: string) => {
    setDismissedIds(prev => new Set([...prev, id]));
    setSuggestions(prev => prev.filter(s => s.id !== id));
  }, []);
  
  // تصفية الاقتراحات
  const filteredSuggestions = useMemo(() => {
    if (filterType === 'all') return suggestions;
    return suggestions.filter(s => s.type === filterType);
  }, [suggestions, filterType]);
  
  // إحصائيات الاقتراحات
  const stats = useMemo(() => {
    const byType: Record<SuggestionType, number> = {
      alignment: 0,
      spacing: 0,
      color: 0,
      layout: 0,
      connection: 0,
      enhancement: 0,
      accessibility: 0
    };
    
    suggestions.forEach(s => byType[s.type]++);
    
    return {
      total: suggestions.length,
      high: suggestions.filter(s => s.priority === 'high').length,
      byType
    };
  }, [suggestions]);
  
  if (!isOpen) return null;
  
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-80 flex flex-col max-h-[500px] ${className}`}>
      {/* العنوان */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-xl">💡</span>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            اقتراحات ذكية
          </h3>
          {stats.total > 0 && (
            <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full">
              {stats.total}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={analyzeSuggestions}
            disabled={isAnalyzing}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title="تحديث الاقتراحات"
          >
            {isAnalyzing ? '⏳' : '🔄'}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      
      {/* فلتر الأنواع */}
      <div className="p-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          <button
            onClick={() => setFilterType('all')}
            className={`px-2 py-1 text-xs rounded ${
              filterType === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200'
            }`}
          >
            الكل ({stats.total})
          </button>
          {(Object.keys(SUGGESTION_ICONS) as SuggestionType[]).map(type => (
            stats.byType[type] > 0 && (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-2 py-1 text-xs rounded flex items-center gap-1 ${
                  filterType === type
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200'
                }`}
              >
                {SUGGESTION_ICONS[type]} {stats.byType[type]}
              </button>
            )
          ))}
        </div>
      </div>
      
      {/* قائمة الاقتراحات */}
      <div className="flex-1 overflow-y-auto">
        {isAnalyzing ? (
          <div className="p-8 text-center">
            <span className="text-3xl animate-spin inline-block">⚙️</span>
            <p className="text-sm text-gray-500 mt-2">جاري تحليل اللوحة...</p>
          </div>
        ) : filteredSuggestions.length === 0 ? (
          <div className="p-8 text-center">
            <span className="text-3xl">✅</span>
            <p className="text-sm text-gray-500 mt-2">
              {elementsArray.length === 0 
                ? 'أضف عناصر للحصول على اقتراحات'
                : 'لا توجد اقتراحات حالياً'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredSuggestions.map(suggestion => (
              <div
                key={suggestion.id}
                className="p-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
              >
                {/* رأس الاقتراح */}
                <div className="flex items-start gap-2">
                  <span className="text-lg">{SUGGESTION_ICONS[suggestion.type]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {suggestion.title}
                      </h4>
                      {suggestion.priority === 'high' && (
                        <span className="text-xs px-1.5 py-0.5 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">
                          مهم
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {suggestion.description}
                    </p>
                    
                    {suggestion.affectedElements.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        يؤثر على {suggestion.affectedElements.length} عنصر
                      </p>
                    )}
                  </div>
                </div>
                
                {/* أزرار الإجراءات */}
                <div className="flex items-center gap-2 mt-2 mr-6">
                  <button
                    onClick={() => applySuggestion(suggestion)}
                    className="flex-1 px-3 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    ✓ تطبيق
                  </button>
                  {suggestion.preview && (
                    <button
                      onClick={suggestion.preview}
                      className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      👁️
                    </button>
                  )}
                  <button
                    onClick={() => dismissSuggestion(suggestion.id)}
                    className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 transition-colors"
                    title="تجاهل"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* شريط الأولويات العالية */}
      {stats.high > 0 && (
        <div className="p-2 border-t border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/20">
          <p className="text-xs text-red-700 dark:text-red-300 flex items-center gap-1">
            ⚠️ {stats.high} اقتراح ذو أولوية عالية
          </p>
        </div>
      )}
      
      {/* إجراءات سريعة */}
      <div className="p-2 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => {
            filteredSuggestions.forEach(s => applySuggestion(s));
          }}
          disabled={filteredSuggestions.length === 0}
          className={`w-full px-3 py-2 text-sm rounded ${
            filteredSuggestions.length > 0
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          ✨ تطبيق جميع الاقتراحات ({filteredSuggestions.length})
        </button>
      </div>
    </div>
  );
};

// ========== Analysis Functions ==========

function analyzeAlignment(
  elements: CanvasElement[],
  updateElement: (id: string, updates: Partial<CanvasElement>) => void
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  
  if (elements.length < 2) return suggestions;
  
  // البحث عن عناصر قريبة من المحاذاة
  const tolerance = 20;
  
  for (let i = 0; i < elements.length; i++) {
    for (let j = i + 1; j < elements.length; j++) {
      const a = elements[i];
      const b = elements[j];
      
      // محاذاة أفقية قريبة
      const yDiff = Math.abs(a.y - b.y);
      if (yDiff > 0 && yDiff < tolerance) {
        suggestions.push({
          id: `align-h-${a.id}-${b.id}`,
          type: 'alignment',
          title: 'محاذاة أفقية',
          description: `يمكن محاذاة ${a.name || a.type} و ${b.name || b.type} أفقياً`,
          priority: 'medium',
          affectedElements: [a.id, b.id],
          action: () => {
            updateElement(b.id, { y: a.y });
          }
        });
      }
      
      // محاذاة رأسية قريبة
      const xDiff = Math.abs(a.x - b.x);
      if (xDiff > 0 && xDiff < tolerance) {
        suggestions.push({
          id: `align-v-${a.id}-${b.id}`,
          type: 'alignment',
          title: 'محاذاة رأسية',
          description: `يمكن محاذاة ${a.name || a.type} و ${b.name || b.type} رأسياً`,
          priority: 'medium',
          affectedElements: [a.id, b.id],
          action: () => {
            updateElement(b.id, { x: a.x });
          }
        });
      }
    }
  }
  
  return suggestions.slice(0, 3);
}

function analyzeSpacing(
  elements: CanvasElement[],
  updateElement: (id: string, updates: Partial<CanvasElement>) => void
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  
  if (elements.length < 3) return suggestions;
  
  // البحث عن مسافات غير متساوية
  const sortedByX = [...elements].sort((a, b) => a.x - b.x);
  const gaps: number[] = [];
  
  for (let i = 1; i < sortedByX.length; i++) {
    const gap = sortedByX[i].x - (sortedByX[i-1].x + sortedByX[i-1].width);
    gaps.push(gap);
  }
  
  // التحقق من التباين في المسافات
  if (gaps.length >= 2) {
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const variance = gaps.reduce((sum, gap) => sum + Math.pow(gap - avgGap, 2), 0) / gaps.length;
    
    if (variance > 100) {
      suggestions.push({
        id: 'spacing-horizontal',
        type: 'spacing',
        title: 'توزيع أفقي متساوي',
        description: 'توزيع العناصر بمسافات متساوية أفقياً',
        priority: 'low',
        affectedElements: elements.map(e => e.id),
        action: () => {
          // تطبيق التوزيع المتساوي
          const totalWidth = sortedByX[sortedByX.length - 1].x + sortedByX[sortedByX.length - 1].width - sortedByX[0].x;
          const elementsWidth = elements.reduce((sum, e) => sum + e.width, 0);
          const equalGap = (totalWidth - elementsWidth) / (elements.length - 1);
          
          let currentX = sortedByX[0].x;
          sortedByX.forEach((el, i) => {
            if (i > 0) {
              updateElement(el.id, { x: currentX });
            }
            currentX += el.width + equalGap;
          });
        }
      });
    }
  }
  
  return suggestions;
}

function analyzeColors(
  elements: CanvasElement[],
  updateElement: (id: string, updates: Partial<CanvasElement>) => void
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  
  // جمع الألوان المستخدمة
  const colors = new Set<string>();
  elements.forEach(el => {
    const fill = el.style?.fill;
    const stroke = el.style?.stroke;
    if (fill) {
      const fillColor = typeof fill === 'object' ? fill.color : fill;
      colors.add(fillColor);
    }
    if (stroke) {
      const strokeColor = typeof stroke === 'object' ? stroke.color : stroke;
      colors.add(strokeColor);
    }
  });
  
  // إذا كان هناك تنوع كبير في الألوان
  if (colors.size > 5) {
    suggestions.push({
      id: 'color-harmony',
      type: 'color',
      title: 'تناسق الألوان',
      description: `يوجد ${colors.size} ألوان مختلفة. يُنصح بتقليلها لتناسق أفضل`,
      priority: 'low',
      affectedElements: [],
      action: () => {
        // اقتراح لوحة ألوان موحدة
        console.log('Color harmony suggestion');
      }
    });
  }
  
  // البحث عن تباين منخفض
  elements.forEach(el => {
    if (el.type === 'text' && el.style?.fill && el.style?.stroke) {
      // تحقق من تباين النص
      // في التطبيق الحقيقي، نحسب التباين
    }
  });
  
  return suggestions;
}

function analyzeConnections(elements: CanvasElement[]): Suggestion[] {
  const suggestions: Suggestion[] = [];
  
  // البحث عن عناصر قريبة يمكن توصيلها
  const shapes = elements.filter(e => 
    e.type === 'shape' || ['shape', 'sticky'].includes(e.type)
  );
  const connectors = elements.filter(e => e.type === 'connector');
  
  if (shapes.length >= 2 && connectors.length === 0) {
    suggestions.push({
      id: 'add-connectors',
      type: 'connection',
      title: 'إضافة روابط',
      description: 'يوجد عدة أشكال بدون روابط. هل تريد إضافة خطوط توصيل؟',
      priority: 'low',
      affectedElements: shapes.map(s => s.id),
      action: () => {
        console.log('Add connectors between shapes');
      }
    });
  }
  
  return suggestions;
}

function analyzeEnhancements(
  elements: CanvasElement[],
  updateElement: (id: string, updates: Partial<CanvasElement>) => void
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  
  // البحث عن عناصر بدون ظل يمكن تحسينها
  const elementsWithoutShadow = elements.filter(e => {
    const style = e.style as any;
    return !style?.shadow && ['shape', 'sticky'].includes(e.type);
  });
  
  if (elementsWithoutShadow.length >= 3) {
    suggestions.push({
      id: 'add-shadows',
      type: 'enhancement',
      title: 'إضافة ظلال',
      description: 'إضافة ظلال للعناصر لمظهر أكثر احترافية',
      priority: 'low',
      affectedElements: elementsWithoutShadow.map(e => e.id),
      action: () => {
        elementsWithoutShadow.forEach(el => {
          updateElement(el.id, {
            style: {
              ...el.style,
              shadow: { offsetX: 4, offsetY: 4, blur: 8, color: 'rgba(0,0,0,0.15)' }
            }
          } as any);
        });
      }
    });
  }
  
  // البحث عن زوايا حادة في أشكال مستطيلة
  const sharpCorners = elements.filter(e => {
    if (e.type !== 'shape') return false;
    const shapeEl = e as any;
    const style = e.style as any;
    return shapeEl.shapeType === 'rectangle' && (!style?.borderRadius || style.borderRadius === 0);
  });
  
  if (sharpCorners.length >= 2) {
    suggestions.push({
      id: 'round-corners',
      type: 'enhancement',
      title: 'زوايا دائرية',
      description: 'تدوير زوايا المستطيلات لمظهر أنعم',
      priority: 'low',
      affectedElements: sharpCorners.map(e => e.id),
      action: () => {
        sharpCorners.forEach(el => {
          updateElement(el.id, {
            style: {
              ...el.style,
              borderRadius: 8
            }
          } as any);
        });
      }
    });
  }
  
  return suggestions;
}

export default SmartSuggestions;
