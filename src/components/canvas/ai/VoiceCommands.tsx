/**
 * 🎤 CCCWAYS Canvas - Voice Commands
 * أوامر صوتية - التحكم بالكانفاس بالصوت
 * 
 * الوظائف:
 * - التعرف على الكلام
 * - تحويل الأوامر الصوتية لإجراءات
 * - دعم اللغة العربية والإنجليزية
 * - التغذية الراجعة الصوتية
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useCanvasStore } from '../../../stores/canvasStore';

// حالات التسجيل
type RecordingState = 'idle' | 'listening' | 'processing' | 'error';

// الأوامر المدعومة
interface VoiceCommand {
  patterns: RegExp[];
  action: string;
  description: string;
  execute: (match: RegExpMatchArray | null, store: any) => void;
}

// تعريف الأوامر
const VOICE_COMMANDS: VoiceCommand[] = [
  // أوامر الإضافة
  {
    patterns: [/أضف (مستطيل|مربع)/i, /add (rectangle|square)/i],
    action: 'add_rectangle',
    description: 'إضافة مستطيل',
    execute: (match, store) => {
      store.addElement({
        id: `voice-rect-${Date.now()}`,
        type: 'rectangle',
        x: 200,
        y: 200,
        width: 150,
        height: 100,
        style: { fill: '#3b82f6', stroke: '#1e40af', strokeWidth: 2 }
      });
    }
  },
  {
    patterns: [/أضف (دائرة|قرص)/i, /add (circle|ellipse)/i],
    action: 'add_circle',
    description: 'إضافة دائرة',
    execute: (match, store) => {
      store.addElement({
        id: `voice-circle-${Date.now()}`,
        type: 'ellipse',
        x: 200,
        y: 200,
        width: 120,
        height: 120,
        style: { fill: '#22c55e', stroke: '#15803d', strokeWidth: 2 }
      });
    }
  },
  {
    patterns: [/أضف نص/i, /add text/i],
    action: 'add_text',
    description: 'إضافة نص',
    execute: (match, store) => {
      store.addElement({
        id: `voice-text-${Date.now()}`,
        type: 'text',
        x: 200,
        y: 200,
        width: 200,
        height: 50,
        content: 'نص جديد',
        style: { fill: '#000000', fontSize: 16, fontFamily: 'Cairo' }
      });
    }
  },
  
  // أوامر التحكم
  {
    patterns: [/تراجع/i, /undo/i, /رجوع/i],
    action: 'undo',
    description: 'تراجع',
    execute: (match, store) => store.undo()
  },
  {
    patterns: [/إعادة/i, /redo/i, /أعد/i],
    action: 'redo',
    description: 'إعادة',
    execute: (match, store) => store.redo()
  },
  {
    patterns: [/احذف/i, /delete/i, /امسح/i],
    action: 'delete',
    description: 'حذف المحدد',
    execute: (match, store) => {
      store.selectedElementIds.forEach((id: string) => store.deleteElement(id));
    }
  },
  {
    patterns: [/نسخ/i, /copy/i],
    action: 'copy',
    description: 'نسخ المحدد',
    execute: (match, store) => store.copySelected?.()
  },
  {
    patterns: [/لصق/i, /paste/i],
    action: 'paste',
    description: 'لصق',
    execute: (match, store) => store.paste?.()
  },
  
  // أوامر العرض
  {
    patterns: [/كبر/i, /zoom in/i, /تكبير/i],
    action: 'zoom_in',
    description: 'تكبير',
    execute: (match, store) => store.zoomIn?.()
  },
  {
    patterns: [/صغر/i, /zoom out/i, /تصغير/i],
    action: 'zoom_out',
    description: 'تصغير',
    execute: (match, store) => store.zoomOut?.()
  },
  {
    patterns: [/اختر الكل/i, /select all/i],
    action: 'select_all',
    description: 'تحديد الكل',
    execute: (match, store) => {
      store.selectElements(store.elements.map((e: any) => e.id));
    }
  },
  {
    patterns: [/إلغاء التحديد/i, /deselect/i, /ألغِ/i],
    action: 'deselect',
    description: 'إلغاء التحديد',
    execute: (match, store) => store.selectElements([])
  }
];

interface VoiceCommandsProps {
  className?: string;
  onClose?: () => void;
  isOpen?: boolean;
}

export const VoiceCommands: React.FC<VoiceCommandsProps> = ({
  className = '',
  onClose,
  isOpen = true
}) => {
  const store = useCanvasStore();
  
  const [state, setState] = useState<RecordingState>('idle');
  const [transcript, setTranscript] = useState('');
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [commandHistory, setCommandHistory] = useState<Array<{
    text: string;
    action: string;
    timestamp: Date;
    success: boolean;
  }>>([]);
  
  const recognitionRef = useRef<any>(null);
  
  // التحقق من دعم المتصفح
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setIsSupported(false);
      setError('المتصفح لا يدعم التعرف على الكلام');
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = language === 'ar' ? 'ar-SA' : 'en-US';
    
    recognition.onstart = () => {
      setState('listening');
      setTranscript('');
      setError(null);
    };
    
    recognition.onresult = (event: any) => {
      const results = event.results;
      const lastResult = results[results.length - 1];
      const text = lastResult[0].transcript;
      
      setTranscript(text);
      
      if (lastResult.isFinal) {
        processCommand(text);
      }
    };
    
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setState('error');
      
      switch (event.error) {
        case 'no-speech':
          setError('لم يتم اكتشاف كلام');
          break;
        case 'audio-capture':
          setError('لا يوجد ميكروفون');
          break;
        case 'not-allowed':
          setError('تم رفض إذن الميكروفون');
          break;
        default:
          setError(`خطأ: ${event.error}`);
      }
    };
    
    recognition.onend = () => {
      if (state === 'listening') {
        setState('idle');
      }
    };
    
    recognitionRef.current = recognition;
    
    return () => {
      recognition.abort();
    };
  }, [language]);
  
  // معالجة الأمر
  const processCommand = useCallback((text: string) => {
    setState('processing');
    
    let commandFound = false;
    let executedCommand: VoiceCommand | null = null;
    let matchResult: RegExpMatchArray | null = null;
    
    // البحث عن أمر مطابق
    for (const command of VOICE_COMMANDS) {
      for (const pattern of command.patterns) {
        const match = text.match(pattern);
        if (match) {
          commandFound = true;
          executedCommand = command;
          matchResult = match;
          break;
        }
      }
      if (commandFound) break;
    }
    
    // تنفيذ الأمر
    if (executedCommand) {
      try {
        executedCommand.execute(matchResult, store);
        setLastCommand(executedCommand.description);
        setCommandHistory(prev => [...prev, {
          text,
          action: executedCommand!.description,
          timestamp: new Date(),
          success: true
        }]);
        
        // تغذية راجعة صوتية
        speak(`تم: ${executedCommand.description}`);
        
      } catch (err) {
        console.error('Command execution error:', err);
        setCommandHistory(prev => [...prev, {
          text,
          action: 'خطأ في التنفيذ',
          timestamp: new Date(),
          success: false
        }]);
      }
    } else {
      setLastCommand(null);
      setError('لم يتم التعرف على الأمر');
      setCommandHistory(prev => [...prev, {
        text,
        action: 'غير معروف',
        timestamp: new Date(),
        success: false
      }]);
    }
    
    setTimeout(() => setState('idle'), 1500);
  }, [store]);
  
  // بدء التسجيل
  const startListening = useCallback(() => {
    if (!recognitionRef.current || !isSupported) return;
    
    try {
      recognitionRef.current.lang = language === 'ar' ? 'ar-SA' : 'en-US';
      recognitionRef.current.start();
    } catch (err) {
      console.error('Failed to start recognition:', err);
      setError('فشل في بدء التسجيل');
    }
  }, [language, isSupported]);
  
  // إيقاف التسجيل
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setState('idle');
    }
  }, []);
  
  // النطق
  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'ar' ? 'ar-SA' : 'en-US';
      utterance.rate = 1;
      speechSynthesis.speak(utterance);
    }
  }, [language]);
  
  if (!isOpen) return null;
  
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-80 ${className}`}>
      {/* العنوان */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎤</span>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            أوامر صوتية
          </h3>
        </div>
        <div className="flex items-center gap-1">
          {/* تبديل اللغة */}
          <button
            onClick={() => setLanguage(l => l === 'ar' ? 'en' : 'ar')}
            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded"
            title="تبديل اللغة"
          >
            {language === 'ar' ? 'عربي' : 'EN'}
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
      
      {/* منطقة التسجيل */}
      <div className="p-6 text-center">
        {!isSupported ? (
          <div className="text-red-500">
            <span className="text-3xl">⚠️</span>
            <p className="mt-2 text-sm">{error}</p>
          </div>
        ) : (
          <>
            {/* زر الميكروفون */}
            <button
              onClick={state === 'listening' ? stopListening : startListening}
              disabled={state === 'processing'}
              className={`
                w-24 h-24 rounded-full mx-auto flex items-center justify-center
                transition-all duration-300 transform
                ${state === 'listening' 
                  ? 'bg-red-500 animate-pulse scale-110' 
                  : state === 'processing'
                    ? 'bg-yellow-500'
                    : 'bg-blue-500 hover:bg-blue-600 hover:scale-105'
                }
              `}
            >
              <span className="text-4xl text-white">
                {state === 'listening' ? '🔴' : state === 'processing' ? '⏳' : '🎤'}
              </span>
            </button>
            
            {/* حالة التسجيل */}
            <p className={`mt-4 text-sm font-medium ${
              state === 'listening' ? 'text-red-500' :
              state === 'processing' ? 'text-yellow-600' :
              state === 'error' ? 'text-red-500' :
              'text-gray-500'
            }`}>
              {state === 'idle' && 'اضغط للتحدث'}
              {state === 'listening' && 'جاري الاستماع...'}
              {state === 'processing' && 'جاري المعالجة...'}
              {state === 'error' && (error || 'حدث خطأ')}
            </p>
            
            {/* النص المسجل */}
            {transcript && (
              <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  "{transcript}"
                </p>
              </div>
            )}
            
            {/* آخر أمر منفذ */}
            {lastCommand && (
              <div className="mt-3 p-2 bg-green-100 dark:bg-green-900/30 rounded">
                <p className="text-sm text-green-700 dark:text-green-300">
                  ✓ {lastCommand}
                </p>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* الأوامر المتاحة */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-3 max-h-48 overflow-y-auto">
        <h4 className="text-xs font-medium text-gray-500 mb-2">الأوامر المتاحة:</h4>
        <div className="space-y-1">
          {VOICE_COMMANDS.map((cmd, i) => (
            <div 
              key={i}
              className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400"
            >
              <span className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-[10px]">
                {i + 1}
              </span>
              <span>"{language === 'ar' 
                ? cmd.patterns[0].source.replace(/[\/\\^$|]/g, '').split('(')[0] 
                : cmd.patterns[1]?.source.replace(/[\/\\^$|]/g, '').split('(')[0] || cmd.patterns[0].source
              }"</span>
              <span className="text-gray-400">→</span>
              <span>{cmd.description}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* سجل الأوامر */}
      {commandHistory.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-3 max-h-32 overflow-y-auto">
          <h4 className="text-xs font-medium text-gray-500 mb-2">السجل:</h4>
          <div className="space-y-1">
            {commandHistory.slice(-5).reverse().map((entry, i) => (
              <div 
                key={i}
                className={`flex items-center gap-2 text-xs ${
                  entry.success ? 'text-green-600' : 'text-red-600'
                }`}
              >
                <span>{entry.success ? '✓' : '✗'}</span>
                <span className="truncate flex-1">"{entry.text}"</span>
                <span className="text-gray-400 text-[10px]">
                  {entry.timestamp.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* نصائح */}
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-b-lg">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          💡 تحدث بوضوح وانتظر انتهاء التسجيل
        </p>
      </div>
    </div>
  );
};

export default VoiceCommands;
