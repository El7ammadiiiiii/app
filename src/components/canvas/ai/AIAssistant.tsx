/**
 * 🤖 CCCWAYS Canvas - AI Assistant
 * مساعد الذكاء الاصطناعي - إنشاء وتحرير العناصر بالأوامر النصية
 * 
 * الوظائف:
 * - إنشاء رسومات من الوصف النصي
 * - تحرير العناصر بالأوامر
 * - اقتراح تحسينات للتصميم
 * - شرح العناصر والمخططات
 * - ترجمة المخططات
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useCanvasStore } from '../../../stores/canvasStore';
import type { CanvasElement } from '../../../types/canvas';

// أنواع الرسائل
type MessageType = 'user' | 'assistant' | 'system' | 'error';

interface Message {
  id: string;
  type: MessageType;
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  elements?: CanvasElement[];
}

// اقتراحات سريعة
const QUICK_PROMPTS = [
  '📊 أنشئ مخطط انسيابي بسيط',
  '🏗️ ارسم هيكل تنظيمي',
  '🧠 إنشاء خريطة ذهنية',
  '📈 مخطط علاقات ERD',
  '🔄 دورة حياة المشروع',
  '🎯 مصفوفة القرارات'
];

// أمثلة الأوامر
const COMMAND_EXAMPLES = [
  { command: 'أضف مستطيل أزرق', description: 'إضافة شكل' },
  { command: 'حرك العنصر المحدد لليمين', description: 'نقل' },
  { command: 'كبّر النص 50%', description: 'تغيير الحجم' },
  { command: 'اجعل الخلفية شفافة', description: 'تعديل النمط' },
  { command: 'اربط العناصر بخطوط', description: 'إضافة روابط' }
];

interface AIAssistantProps {
  className?: string;
  onClose?: () => void;
  isOpen?: boolean;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({
  className = '',
  onClose,
  isOpen = true
}) => {
  const { 
    elements, 
    selectedElementIds, 
    addElement, 
    updateElement,
    selectElements 
  } = useCanvasStore();
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      type: 'assistant',
      content: 'مرحباً! أنا مساعد CCCWAYS الذكي. كيف يمكنني مساعدتك في تصميم لوحتك اليوم؟ 🎨',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showQuickPrompts, setShowQuickPrompts] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // التمرير للأسفل عند الرسائل الجديدة
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // إضافة رسالة
  const addMessage = useCallback((type: MessageType, content: string, elements?: CanvasElement[]) => {
    const message: Message = {
      id: `msg-${Date.now()}`,
      type,
      content,
      timestamp: new Date(),
      elements
    };
    setMessages(prev => [...prev, message]);
    return message.id;
  }, []);
  
  // معالجة الأمر
  const processCommand = useCallback(async (command: string) => {
    if (!command.trim()) return;
    
    // إضافة رسالة المستخدم
    addMessage('user', command);
    setInput('');
    setShowQuickPrompts(false);
    setIsProcessing(true);
    
    // إضافة رسالة تحميل
    const loadingId = `loading-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: loadingId,
      type: 'assistant',
      content: 'جاري التفكير... 🤔',
      timestamp: new Date(),
      isLoading: true
    }]);
    
    try {
      // محاكاة معالجة AI (في التطبيق الحقيقي، نستخدم OpenAI API)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // تحويل elements من Record إلى Array
      const elementsArray = Object.values(elements);
      
      // تحليل الأمر وتنفيذه
      const result = await executeAICommand(command, elementsArray, selectedElementIds || []);
      
      // إزالة رسالة التحميل
      setMessages(prev => prev.filter(m => m.id !== loadingId));
      
      // إضافة الرد
      addMessage('assistant', result.response, result.elements);
      
      // تنفيذ الإجراءات
      if (result.actions) {
        result.actions.forEach(action => {
          switch (action.type) {
            case 'add':
              if (action.element) {
                addElement(action.element as any);
              }
              break;
            case 'update':
              if (action.id && action.updates) {
                updateElement(action.id, action.updates);
              }
              break;
            case 'select':
              if (action.ids) {
                selectElements(action.ids);
              }
              break;
          }
        });
      }
      
    } catch (error) {
      // إزالة رسالة التحميل
      setMessages(prev => prev.filter(m => m.id !== loadingId));
      addMessage('error', 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsProcessing(false);
    }
  }, [elements, selectedElementIds, addMessage, addElement, updateElement, selectElements]);
  
  // إرسال الأمر
  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    processCommand(input);
  }, [input, processCommand]);
  
  // معالجة Enter
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);
  
  // تحديد اقتراح سريع
  const handleQuickPrompt = useCallback((prompt: string) => {
    processCommand(prompt);
  }, [processCommand]);
  
  // مسح المحادثة
  const handleClear = useCallback(() => {
    setMessages([{
      id: 'welcome-new',
      type: 'assistant',
      content: 'تم مسح المحادثة. كيف يمكنني مساعدتك؟ 🎨',
      timestamp: new Date()
    }]);
    setShowQuickPrompts(true);
  }, []);
  
  if (!isOpen) return null;
  
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-96 flex flex-col max-h-[600px] ${className}`}>
      {/* العنوان */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-500 to-purple-500 rounded-t-lg">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          <h3 className="text-lg font-semibold text-white">
            مساعد CCCWAYS
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleClear}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/20 rounded"
            title="مسح المحادثة"
          >
            🗑️
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-white/70 hover:text-white hover:bg-white/20 rounded"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      
      {/* الرسائل */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map(message => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 ${
                message.type === 'user'
                  ? 'bg-blue-500 text-white'
                  : message.type === 'error'
                    ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
              } ${message.isLoading ? 'animate-pulse' : ''}`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              
              {/* عناصر مُنشأة */}
              {message.elements && message.elements.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                  <p className="text-xs opacity-70 mb-1">
                    تم إنشاء {message.elements.length} عنصر
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {message.elements.slice(0, 3).map(el => (
                      <span
                        key={el.id}
                        className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900 rounded"
                      >
                        {el.type}
                      </span>
                    ))}
                    {message.elements.length > 3 && (
                      <span className="text-xs opacity-70">
                        +{message.elements.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              <p className="text-xs opacity-50 mt-1">
                {message.timestamp.toLocaleTimeString('ar-SA', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
        
        {/* اقتراحات سريعة */}
        {showQuickPrompts && (
          <div className="pt-2">
            <p className="text-xs text-gray-500 mb-2">اقتراحات سريعة:</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map(prompt => (
                <button
                  key={prompt}
                  onClick={() => handleQuickPrompt(prompt)}
                  className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* حقل الإدخال */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="اكتب أمرك هنا... (Enter للإرسال)"
            disabled={isProcessing}
            rows={2}
            className="flex-1 px-3 py-2 border rounded-lg resize-none text-sm dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={isProcessing || !input.trim()}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isProcessing || !input.trim()
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isProcessing ? '⏳' : '➤'}
          </button>
        </form>
        
        {/* نصائح */}
        <div className="mt-2 text-xs text-gray-500">
          💡 جرب: "أضف دائرة حمراء" أو "أنشئ مخطط انسيابي"
        </div>
      </div>
    </div>
  );
};

// ========== AI Command Execution ==========

interface AIAction {
  type: 'add' | 'update' | 'delete' | 'select';
  element?: Partial<CanvasElement>;
  id?: string;
  ids?: string[];
  updates?: Partial<CanvasElement>;
}

interface AIResult {
  response: string;
  actions?: AIAction[];
  elements?: CanvasElement[];
}

/**
 * تنفيذ أمر AI
 */
async function executeAICommand(
  command: string,
  elements: CanvasElement[],
  selectedIds: string[]
): Promise<AIResult> {
  const lowerCommand = command.toLowerCase();
  
  // أوامر إضافة الأشكال
  if (lowerCommand.includes('أضف') || lowerCommand.includes('ارسم') || lowerCommand.includes('أنشئ')) {
    // مستطيل
    if (lowerCommand.includes('مستطيل')) {
      const color = extractColor(command);
      const newElement = createShape('rectangle', color);
      return {
        response: `تم إضافة مستطيل ${color ? getColorName(color) : ''} إلى اللوحة! 🎨`,
        actions: [{ type: 'add', element: newElement }],
        elements: [newElement as CanvasElement]
      };
    }
    
    // دائرة
    if (lowerCommand.includes('دائرة') || lowerCommand.includes('ellipse')) {
      const color = extractColor(command);
      const newElement = createShape('ellipse', color);
      return {
        response: `تم إضافة دائرة ${color ? getColorName(color) : ''} إلى اللوحة! ⭕`,
        actions: [{ type: 'add', element: newElement }],
        elements: [newElement as CanvasElement]
      };
    }
    
    // نص
    if (lowerCommand.includes('نص') || lowerCommand.includes('text')) {
      const newElement = createTextElement(command);
      return {
        response: 'تم إضافة عنصر نصي! 📝',
        actions: [{ type: 'add', element: newElement }],
        elements: [newElement as CanvasElement]
      };
    }
    
    // مخطط انسيابي
    if (lowerCommand.includes('مخطط انسيابي') || lowerCommand.includes('flowchart')) {
      const flowElements = createFlowchart();
      return {
        response: 'تم إنشاء مخطط انسيابي بسيط! 📊\n\nيمكنك تعديل العناصر وإضافة المزيد.',
        actions: flowElements.map(el => ({ type: 'add', element: el })),
        elements: flowElements as CanvasElement[]
      };
    }
    
    // خريطة ذهنية
    if (lowerCommand.includes('خريطة ذهنية') || lowerCommand.includes('mindmap')) {
      const mindmapElements = createMindmap();
      return {
        response: 'تم إنشاء خريطة ذهنية! 🧠\n\nأضف المزيد من الفروع حسب الحاجة.',
        actions: mindmapElements.map(el => ({ type: 'add', element: el })),
        elements: mindmapElements as CanvasElement[]
      };
    }
  }
  
  // أوامر التعديل
  if (selectedIds.length > 0) {
    if (lowerCommand.includes('حرك') || lowerCommand.includes('انقل')) {
      const direction = extractDirection(command);
      const amount = extractNumber(command) || 50;
      
      return {
        response: `تم نقل ${selectedIds.length} عنصر ${direction}! ↔️`,
        actions: selectedIds.map(id => ({
          type: 'update',
          id,
          updates: getMoveUpdates(direction, amount, elements.find(e => e.id === id))
        }))
      };
    }
    
    if (lowerCommand.includes('كبّر') || lowerCommand.includes('صغّر')) {
      const scale = lowerCommand.includes('كبّر') ? 1.5 : 0.5;
      return {
        response: `تم تغيير حجم ${selectedIds.length} عنصر! ↕️`,
        actions: selectedIds.map(id => ({
          type: 'update',
          id,
          updates: getScaleUpdates(scale, elements.find(e => e.id === id))
        }))
      };
    }
  }
  
  // رد افتراضي
  return {
    response: `أفهم أنك تريد "${command}".\n\nيمكنني مساعدتك في:\n• إضافة أشكال (مستطيل، دائرة، نص)\n• إنشاء مخططات (انسيابي، ذهني)\n• تعديل العناصر المحددة\n\nجرب صياغة الأمر بشكل مختلف! 💡`
  };
}

// ========== Helper Functions ==========

function extractColor(text: string): string | null {
  const colors: Record<string, string> = {
    'أحمر': '#ef4444',
    'أخضر': '#22c55e',
    'أزرق': '#3b82f6',
    'أصفر': '#eab308',
    'برتقالي': '#f97316',
    'بنفسجي': '#8b5cf6',
    'وردي': '#ec4899',
    'أسود': '#000000',
    'أبيض': '#ffffff',
    'رمادي': '#6b7280'
  };
  
  for (const [name, hex] of Object.entries(colors)) {
    if (text.includes(name)) return hex;
  }
  return null;
}

function getColorName(hex: string): string {
  const names: Record<string, string> = {
    '#ef4444': 'أحمر',
    '#22c55e': 'أخضر',
    '#3b82f6': 'أزرق',
    '#eab308': 'أصفر',
    '#f97316': 'برتقالي',
    '#8b5cf6': 'بنفسجي',
    '#ec4899': 'وردي'
  };
  return names[hex] || '';
}

function extractDirection(text: string): string {
  if (text.includes('يمين') || text.includes('right')) return 'right';
  if (text.includes('يسار') || text.includes('left')) return 'left';
  if (text.includes('أعلى') || text.includes('up')) return 'up';
  if (text.includes('أسفل') || text.includes('down')) return 'down';
  return 'right';
}

function extractNumber(text: string): number | null {
  const match = text.match(/\d+/);
  return match ? parseInt(match[0]) : null;
}

function createShape(type: string, fill?: string | null): Partial<CanvasElement> {
  const shapeType = type === 'ellipse' ? 'ellipse' : 
                   type === 'diamond' ? 'diamond' : 'rectangle';
  return {
    id: `ai-${Date.now()}`,
    type: 'shape',
    shapeType: shapeType as any,
    x: 100 + Math.random() * 200,
    y: 100 + Math.random() * 200,
    width: 150,
    height: type === 'ellipse' ? 150 : 100,
    rotation: 0,
    fill: { color: fill || '#3b82f6', style: 'solid', opacity: 1 },
    stroke: { color: '#1e40af', width: 2, style: 'solid' },
    style: {
      fill: { color: fill || '#3b82f6', style: 'solid', opacity: 1 },
      stroke: { color: '#1e40af', width: 2, style: 'solid' },
      opacity: 1
    }
  } as any;
}

function createTextElement(content: string): Partial<CanvasElement> {
  return {
    id: `ai-text-${Date.now()}`,
    type: 'text',
    x: 100 + Math.random() * 200,
    y: 100 + Math.random() * 200,
    width: 200,
    height: 50,
    rotation: 0,
    content: content || 'نص جديد',
    fill: { color: '#000000', style: 'solid', opacity: 1 },
    stroke: { color: 'transparent', width: 0, style: 'solid' },
    style: {
      fill: { color: '#000000', style: 'solid', opacity: 1 },
      stroke: { color: 'transparent', width: 0, style: 'solid' },
      opacity: 1,
      fontSize: 16,
      fontFamily: 'Cairo'
    }
  } as any;
}

function createFlowchart(): Partial<CanvasElement>[] {
  const baseX = 150, baseY = 100;
  return [
    { 
      id: `flow-1-${Date.now()}`, 
      type: 'shape', 
      shapeType: 'rectangle',
      x: baseX, y: baseY, width: 120, height: 60, 
      fill: { color: '#22c55e', style: 'solid', opacity: 1 },
      stroke: { color: '#15803d', width: 2, style: 'solid' },
      style: { 
        fill: { color: '#22c55e', style: 'solid', opacity: 1 }, 
        stroke: { color: '#15803d', width: 2, style: 'solid' }, 
        opacity: 1,
        borderRadius: 30 
      } 
    },
    { 
      id: `flow-2-${Date.now()}`, 
      type: 'shape', 
      shapeType: 'rectangle',
      x: baseX, y: baseY + 100, width: 120, height: 60, 
      fill: { color: '#3b82f6', style: 'solid', opacity: 1 },
      stroke: { color: '#1d4ed8', width: 2, style: 'solid' },
      style: { 
        fill: { color: '#3b82f6', style: 'solid', opacity: 1 }, 
        stroke: { color: '#1d4ed8', width: 2, style: 'solid' }, 
        opacity: 1 
      } 
    },
    { 
      id: `flow-3-${Date.now()}`, 
      type: 'shape', 
      shapeType: 'diamond',
      x: baseX, y: baseY + 200, width: 120, height: 80, 
      fill: { color: '#f59e0b', style: 'solid', opacity: 1 },
      stroke: { color: '#d97706', width: 2, style: 'solid' },
      style: { 
        fill: { color: '#f59e0b', style: 'solid', opacity: 1 }, 
        stroke: { color: '#d97706', width: 2, style: 'solid' }, 
        opacity: 1 
      } 
    },
    { 
      id: `flow-4-${Date.now()}`, 
      type: 'shape', 
      shapeType: 'rectangle',
      x: baseX, y: baseY + 320, width: 120, height: 60, 
      fill: { color: '#ef4444', style: 'solid', opacity: 1 },
      stroke: { color: '#dc2626', width: 2, style: 'solid' },
      style: { 
        fill: { color: '#ef4444', style: 'solid', opacity: 1 }, 
        stroke: { color: '#dc2626', width: 2, style: 'solid' }, 
        opacity: 1,
        borderRadius: 30 
      } 
    }
  ] as any[];
}

function createMindmap(): Partial<CanvasElement>[] {
  const centerX = 300, centerY = 250;
  return [
    { 
      id: `mind-center-${Date.now()}`, 
      type: 'shape', 
      shapeType: 'ellipse',
      x: centerX - 60, y: centerY - 40, width: 120, height: 80, 
      fill: { color: '#8b5cf6', style: 'solid', opacity: 1 },
      stroke: { color: '#6d28d9', width: 3, style: 'solid' },
      style: { 
        fill: { color: '#8b5cf6', style: 'solid', opacity: 1 }, 
        stroke: { color: '#6d28d9', width: 3, style: 'solid' }, 
        opacity: 1 
      } 
    },
    { 
      id: `mind-1-${Date.now()}`, 
      type: 'shape', 
      shapeType: 'ellipse',
      x: centerX - 200, y: centerY - 120, width: 100, height: 60, 
      fill: { color: '#3b82f6', style: 'solid', opacity: 1 },
      stroke: { color: '#1d4ed8', width: 2, style: 'solid' },
      style: { 
        fill: { color: '#3b82f6', style: 'solid', opacity: 1 }, 
        stroke: { color: '#1d4ed8', width: 2, style: 'solid' }, 
        opacity: 1 
      } 
    },
    { 
      id: `mind-2-${Date.now()}`, 
      type: 'shape', 
      shapeType: 'ellipse',
      x: centerX + 100, y: centerY - 120, width: 100, height: 60, 
      fill: { color: '#22c55e', style: 'solid', opacity: 1 },
      stroke: { color: '#15803d', width: 2, style: 'solid' },
      style: { 
        fill: { color: '#22c55e', style: 'solid', opacity: 1 }, 
        stroke: { color: '#15803d', width: 2, style: 'solid' }, 
        opacity: 1 
      } 
    },
    { 
      id: `mind-3-${Date.now()}`, 
      type: 'shape', 
      shapeType: 'ellipse',
      x: centerX - 200, y: centerY + 80, width: 100, height: 60, 
      fill: { color: '#f59e0b', style: 'solid', opacity: 1 },
      stroke: { color: '#d97706', width: 2, style: 'solid' },
      style: { 
        fill: { color: '#f59e0b', style: 'solid', opacity: 1 }, 
        stroke: { color: '#d97706', width: 2, style: 'solid' }, 
        opacity: 1 
      } 
    },
    { 
      id: `mind-4-${Date.now()}`, 
      type: 'shape', 
      shapeType: 'ellipse',
      x: centerX + 100, y: centerY + 80, width: 100, height: 60, 
      fill: { color: '#ec4899', style: 'solid', opacity: 1 },
      stroke: { color: '#db2777', width: 2, style: 'solid' },
      style: { 
        fill: { color: '#ec4899', style: 'solid', opacity: 1 }, 
        stroke: { color: '#db2777', width: 2, style: 'solid' }, 
        opacity: 1 
      } 
    }
  ] as any[];
}

function getMoveUpdates(direction: string, amount: number, element?: CanvasElement): Partial<CanvasElement> {
  if (!element) return {};
  switch (direction) {
    case 'right': return { x: element.x + amount };
    case 'left': return { x: element.x - amount };
    case 'up': return { y: element.y - amount };
    case 'down': return { y: element.y + amount };
    default: return {};
  }
}

function getScaleUpdates(scale: number, element?: CanvasElement): Partial<CanvasElement> {
  if (!element) return {};
  return {
    width: element.width * scale,
    height: element.height * scale
  };
}

export default AIAssistant;
