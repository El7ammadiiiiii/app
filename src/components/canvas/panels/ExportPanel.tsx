/**
 * 🎨 CCCWAYS Canvas - Export Panel
 * لوحة التصدير - تصدير اللوحة بصيغ مختلفة
 * 
 * الوظائف:
 * - تصدير كصورة PNG/JPEG/WebP/SVG
 * - تصدير كـ PDF
 * - تصدير كـ JSON (للاستيراد لاحقاً)
 * - خيارات الجودة والحجم
 * - تصدير العناصر المحددة فقط
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useCanvasStore } from '../../../stores/canvasStore';
import type { CanvasElement, ShapeElement, TextElement } from '../../../types/canvas';

// صيغ التصدير المدعومة
type ExportFormat = 'png' | 'jpeg' | 'webp' | 'svg' | 'pdf' | 'json';

interface ExportSettings {
  format: ExportFormat;
  quality: number; // 0-1 للصور
  scale: number; // نسبة التكبير
  background: 'transparent' | 'white' | 'custom';
  customBg: string;
  includeGrid: boolean;
  selectedOnly: boolean;
  margin: number;
}

// معلومات الصيغ
const FORMAT_INFO: Record<ExportFormat, { name: string; ext: string; icon: string; description: string }> = {
  png: {
    name: 'PNG',
    ext: 'png',
    icon: '🖼️',
    description: 'صورة مع دعم الشفافية'
  },
  jpeg: {
    name: 'JPEG',
    ext: 'jpg',
    icon: '📷',
    description: 'صورة مضغوطة (بدون شفافية)'
  },
  webp: {
    name: 'WebP',
    ext: 'webp',
    icon: '🌐',
    description: 'صورة محسنة للويب'
  },
  svg: {
    name: 'SVG',
    ext: 'svg',
    icon: '✨',
    description: 'رسوميات متجهة قابلة للتكبير'
  },
  pdf: {
    name: 'PDF',
    ext: 'pdf',
    icon: '📄',
    description: 'مستند للطباعة'
  },
  json: {
    name: 'JSON',
    ext: 'json',
    icon: '💾',
    description: 'ملف بيانات للاستيراد لاحقاً'
  }
};

// أحجام الورق للـ PDF
const PAPER_SIZES = [
  { name: 'A4', width: 210, height: 297 },
  { name: 'A3', width: 297, height: 420 },
  { name: 'Letter', width: 216, height: 279 },
  { name: 'Legal', width: 216, height: 356 }
];

interface ExportPanelProps {
  className?: string;
  onClose?: () => void;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
  className = '',
  onClose
}) => {
  const { elements, selectedIds, selectedElementIds, canvasName } = useCanvasStore();
  
  // تحويل elements من Record إلى Array
  const elementsArray = useMemo(() => Object.values(elements), [elements]);
  const selection = selectedElementIds ?? selectedIds ?? [];
  
  const [settings, setSettings] = useState<ExportSettings>({
    format: 'png',
    quality: 0.9,
    scale: 2,
    background: 'white',
    customBg: '#ffffff',
    includeGrid: false,
    selectedOnly: false,
    margin: 20
  });
  
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // العناصر المراد تصديرها
  const elementsToExport = useMemo(() => {
    return settings.selectedOnly
      ? elementsArray.filter(el => selection.includes(el.id))
      : elementsArray;
  }, [elementsArray, selection, settings.selectedOnly]);
  
  // حساب حدود العناصر
  const calculateBounds = useCallback(() => {
    if (elementsToExport.length === 0) {
      return { x: 0, y: 0, width: 800, height: 600 };
    }
    
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    elementsToExport.forEach(el => {
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + el.width);
      maxY = Math.max(maxY, el.y + el.height);
    });
    
    return {
      x: minX - settings.margin,
      y: minY - settings.margin,
      width: maxX - minX + settings.margin * 2,
      height: maxY - minY + settings.margin * 2
    };
  }, [elementsToExport, settings.margin]);
  
  // تحديث الإعدادات
  const updateSettings = useCallback(<K extends keyof ExportSettings>(
    key: K,
    value: ExportSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);
  
  // إنشاء معاينة
  const generatePreview = useCallback(async () => {
    // في التطبيق الحقيقي، هنا نرسم على canvas
    console.log('Generating preview...');
    setPreviewUrl(null);
  }, []);
  
  // تصدير اللوحة
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setExportProgress(0);
    
    try {
      const bounds = calculateBounds();
      const fileName = `${canvasName || 'canvas'}-${Date.now()}`;
      
      // محاكاة تقدم التصدير
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setExportProgress(i);
      }
      
      if (settings.format === 'json') {
        // تصدير JSON
        const data = {
          version: '1.0',
          name: canvasName,
          createdAt: new Date().toISOString(),
          elements: elementsToExport,
          viewport: bounds
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `${fileName}.json`);
        
      } else if (settings.format === 'svg') {
        // تصدير SVG
        const svgContent = generateSVG(elementsToExport, bounds, settings);
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        downloadBlob(blob, `${fileName}.svg`);
        
      } else if (settings.format === 'pdf') {
        // تصدير PDF (يحتاج مكتبة مثل jsPDF)
        console.log('PDF export requires jsPDF library');
        alert('تصدير PDF قيد التطوير');
        
      } else {
        // تصدير صورة (PNG/JPEG/WebP)
        const canvas = await renderToCanvas(elementsToExport, bounds, settings);
        const mimeType = `image/${settings.format}`;
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              downloadBlob(blob, `${fileName}.${FORMAT_INFO[settings.format].ext}`);
            }
          },
          mimeType,
          settings.quality
        );
      }
      
      setExportProgress(100);
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('فشل التصدير');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [settings, elementsToExport, canvasName, calculateBounds]);
  
  // تنزيل الملف
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg w-80 flex flex-col max-h-[calc(100vh-100px)] ${className}`}>
      {/* العنوان */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          تصدير اللوحة
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
      
      {/* محتوى اللوحة */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* اختيار الصيغة */}
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
            صيغة التصدير
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(FORMAT_INFO) as ExportFormat[]).map(format => (
              <button
                key={format}
                onClick={() => updateSettings('format', format)}
                className={`p-2 rounded border text-center transition-colors ${
                  settings.format === format
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <span className="text-xl block">{FORMAT_INFO[format].icon}</span>
                <span className="text-xs">{FORMAT_INFO[format].name}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {FORMAT_INFO[settings.format].description}
          </p>
        </div>
        
        {/* خيارات الصورة */}
        {['png', 'jpeg', 'webp'].includes(settings.format) && (
          <>
            {/* الجودة */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                الجودة: {Math.round(settings.quality * 100)}%
              </label>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.1}
                value={settings.quality}
                onChange={(e) => updateSettings('quality', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
            
            {/* نسبة التكبير */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                نسبة التكبير: {settings.scale}x
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map(scale => (
                  <button
                    key={scale}
                    onClick={() => updateSettings('scale', scale)}
                    className={`flex-1 px-2 py-1 rounded border text-sm ${
                      settings.scale === scale
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    {scale}x
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        
        {/* الخلفية */}
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
            الخلفية
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => updateSettings('background', 'transparent')}
              disabled={settings.format === 'jpeg'}
              className={`flex-1 px-2 py-1 rounded border text-sm ${
                settings.background === 'transparent'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                  : 'border-gray-200 dark:border-gray-600'
              } ${settings.format === 'jpeg' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              شفاف
            </button>
            <button
              onClick={() => updateSettings('background', 'white')}
              className={`flex-1 px-2 py-1 rounded border text-sm ${
                settings.background === 'white'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                  : 'border-gray-200 dark:border-gray-600'
              }`}
            >
              أبيض
            </button>
            <button
              onClick={() => updateSettings('background', 'custom')}
              className={`flex-1 px-2 py-1 rounded border text-sm ${
                settings.background === 'custom'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                  : 'border-gray-200 dark:border-gray-600'
              }`}
            >
              مخصص
            </button>
          </div>
          
          {settings.background === 'custom' && (
            <input
              type="color"
              value={settings.customBg}
              onChange={(e) => updateSettings('customBg', e.target.value)}
              className="w-full h-8 mt-2 rounded cursor-pointer"
            />
          )}
        </div>
        
        {/* خيارات إضافية */}
        <div className="mb-4 space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.includeGrid}
              onChange={(e) => updateSettings('includeGrid', e.target.checked)}
              className="w-4 h-4"
            />
            تضمين الشبكة
          </label>
          
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.selectedOnly}
              onChange={(e) => updateSettings('selectedOnly', e.target.checked)}
              disabled={selection.length === 0}
              className="w-4 h-4"
            />
            العناصر المحددة فقط ({selection.length})
          </label>
        </div>
        
        {/* الهوامش */}
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
            الهوامش: {settings.margin}px
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={settings.margin}
            onChange={(e) => updateSettings('margin', parseInt(e.target.value))}
            className="w-full"
          />
        </div>
        
        {/* معلومات الحجم */}
        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            الحجم التقديري:
          </p>
          <p className="text-lg font-semibold">
            {Math.round(calculateBounds().width * settings.scale)} × {Math.round(calculateBounds().height * settings.scale)} px
          </p>
          <p className="text-xs text-gray-500">
            {elementsToExport.length} عنصر
          </p>
        </div>
      </div>
      
      {/* شريط التقدم */}
      {isExporting && (
        <div className="px-4 pb-2">
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-200"
              style={{ width: `${exportProgress}%` }}
            />
          </div>
          <p className="text-xs text-center text-gray-500 mt-1">
            جاري التصدير... {exportProgress}%
          </p>
        </div>
      )}
      
      {/* زر التصدير */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleExport}
          disabled={isExporting || elementsToExport.length === 0}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium ${
            isExporting || elementsToExport.length === 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {isExporting ? (
            '⏳ جاري التصدير...'
          ) : (
            <>
              {FORMAT_INFO[settings.format].icon} تصدير {FORMAT_INFO[settings.format].name}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// ========== Helper Functions ==========

/**
 * إنشاء SVG من العناصر
 */
function generateSVG(
  elements: CanvasElement[],
  bounds: { x: number; y: number; width: number; height: number },
  settings: ExportSettings
): string {
  const bgColor = settings.background === 'transparent' 
    ? 'none' 
    : settings.background === 'white' 
      ? '#ffffff' 
      : settings.customBg;
  
  let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" 
     width="${bounds.width}" 
     height="${bounds.height}" 
     viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}">
  <rect x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" fill="${bgColor}"/>
`;
  
  // إضافة العناصر
  elements.forEach(el => {
    const style = (el.style || {}) as any;
    const fillColor = typeof style.fill === 'object' ? style.fill?.color : (style.fill || '#ffffff');
    const strokeColor = typeof style.stroke === 'object' ? style.stroke?.color : (style.stroke || '#000000');
    const strokeWidth = typeof style.stroke === 'object' ? style.stroke?.width : (style.strokeWidth || 1);
    const transform = el.rotation ? `rotate(${el.rotation} ${el.x + el.width/2} ${el.y + el.height/2})` : '';
    
    switch (el.type) {
      case 'shape': {
        const shapeEl = el as ShapeElement;
        if (shapeEl.shapeType === 'rectangle') {
          svgContent += `  <rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" 
            fill="${fillColor}" 
            stroke="${strokeColor}" 
            stroke-width="${strokeWidth}"
            rx="${style.borderRadius || 0}"
            transform="${transform}"/>\n`;
        } else if (shapeEl.shapeType === 'ellipse' || shapeEl.shapeType === 'circle') {
          svgContent += `  <ellipse cx="${el.x + el.width/2}" cy="${el.y + el.height/2}" 
            rx="${el.width/2}" ry="${el.height/2}"
            fill="${fillColor}" 
            stroke="${strokeColor}" 
            stroke-width="${strokeWidth}"
            transform="${transform}"/>\n`;
        } else {
          // أشكال أخرى
          svgContent += `  <!-- ${shapeEl.shapeType} shape -->\n`;
        }
        break;
      }
        
      case 'text': {
        const textEl = el as TextElement;
        svgContent += `  <text x="${el.x}" y="${el.y + 20}" 
          font-family="${style.fontFamily || 'Arial'}"
          font-size="${style.fontSize || 16}"
          fill="${fillColor}"
          transform="${transform}">${textEl.content || ''}</text>\n`;
        break;
      }
        
      default:
        // عناصر أخرى
        svgContent += `  <!-- ${el.type} element -->\n`;
    }
  });
  
  svgContent += '</svg>';
  return svgContent;
}

/**
 * رسم العناصر على Canvas
 */
async function renderToCanvas(
  elements: CanvasElement[],
  bounds: { x: number; y: number; width: number; height: number },
  settings: ExportSettings
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = bounds.width * settings.scale;
  canvas.height = bounds.height * settings.scale;
  
  const ctx = canvas.getContext('2d')!;
  ctx.scale(settings.scale, settings.scale);
  ctx.translate(-bounds.x, -bounds.y);
  
  // رسم الخلفية
  if (settings.background !== 'transparent') {
    ctx.fillStyle = settings.background === 'white' ? '#ffffff' : settings.customBg;
    ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
  }
  
  // رسم العناصر
  elements.forEach(el => {
    const style = (el.style || {}) as any;
    const fillColor = typeof style.fill === 'object' ? style.fill?.color : (style.fill || '#ffffff');
    const strokeColor = typeof style.stroke === 'object' ? style.stroke?.color : (style.stroke || '#000000');
    const strokeWidth = typeof style.stroke === 'object' ? style.stroke?.width : (style.strokeWidth || 1);
    
    ctx.save();
    
    if (el.rotation) {
      ctx.translate(el.x + el.width / 2, el.y + el.height / 2);
      ctx.rotate((el.rotation * Math.PI) / 180);
      ctx.translate(-(el.x + el.width / 2), -(el.y + el.height / 2));
    }
    
    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    
    switch (el.type) {
      case 'shape': {
        const shapeEl = el as ShapeElement;
        ctx.beginPath();
        if (shapeEl.shapeType === 'rectangle') {
          ctx.roundRect(el.x, el.y, el.width, el.height, style.borderRadius || 0);
        } else if (shapeEl.shapeType === 'ellipse' || shapeEl.shapeType === 'circle') {
          ctx.ellipse(
            el.x + el.width / 2,
            el.y + el.height / 2,
            el.width / 2,
            el.height / 2,
            0, 0, Math.PI * 2
          );
        }
        ctx.fill();
        ctx.stroke();
        break;
      }
        
      case 'text': {
        const textEl = el as TextElement;
        ctx.font = `${style.fontWeight || 'normal'} ${style.fontSize || 16}px ${style.fontFamily || 'Arial'}`;
        ctx.fillStyle = fillColor;
        ctx.fillText(textEl.content || '', el.x, el.y + (style.fontSize || 16));
        break;
      }
    }
    
    ctx.restore();
  });
  
  return canvas;
}

export default ExportPanel;
