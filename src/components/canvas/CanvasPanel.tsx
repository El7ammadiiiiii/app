"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Palette, 
  X, 
  Loader2, 
  Send,
  Sparkles,
  ChevronDown,
  ChevronUp,
  MessageSquarePlus,
  AlertCircle,
  RefreshCw,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  PenTool,
  Layers,
  Wand2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CanvasNote {
  id: string;
  title: string;
  content: string;
  timestamp: Date;
  type: 'code' | 'design' | 'diagram' | 'text';
}

interface CanvasPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertToChat?: (content: string) => void;
  onCanvasCreated?: (canvas: CanvasNote) => void;
  initialPrompt?: string;
}

type CanvasStatus = 'idle' | 'generating' | 'completed' | 'error';
type CanvasType = 'code' | 'design' | 'diagram' | 'text';

export function CanvasPanel({ 
  isOpen, 
  onClose, 
  onInsertToChat,
  onCanvasCreated,
  initialPrompt = ''
}: CanvasPanelProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [status, setStatus] = useState<CanvasStatus>('idle');
  const [canvasContent, setCanvasContent] = useState<string>('');
  const [canvasTitle, setCanvasTitle] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<CanvasType>('text');
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Update prompt if initialPrompt changes
  useEffect(() => {
    if (initialPrompt) {
      setPrompt(initialPrompt);
    }
  }, [initialPrompt]);

  // Canvas types
  const canvasTypes: { type: CanvasType; icon: React.ReactNode; label: string; description: string }[] = [
    { 
      type: 'text', 
      icon: <PenTool className="w-4 h-4" />, 
      label: 'نص',
      description: 'كتابة نصية أو مقال'
    },
    { 
      type: 'code', 
      icon: <Layers className="w-4 h-4" />, 
      label: 'كود',
      description: 'كود برمجي'
    },
    { 
      type: 'design', 
      icon: <Palette className="w-4 h-4" />, 
      label: 'تصميم',
      description: 'تصميم UI/UX'
    },
    { 
      type: 'diagram', 
      icon: <Wand2 className="w-4 h-4" />, 
      label: 'مخطط',
      description: 'رسم بياني أو مخطط'
    }
  ];

  // Generate canvas content (simulated AI response)
  const generateCanvas = useCallback(async () => {
    if (!prompt.trim()) {
      setError('يرجى إدخال وصف للكانفاس');
      return;
    }

    setStatus('generating');
    setError(null);
    setCanvasContent('');
    setCanvasTitle('');

    try {
      // Simulate AI generation with delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Generate title from prompt
      const generatedTitle = `Canvas: ${prompt.slice(0, 30)}${prompt.length > 30 ? '...' : ''}`;
      setCanvasTitle(generatedTitle);

      // Generate content based on type
      let generatedContent = '';
      switch (selectedType) {
        case 'code':
          generatedContent = `// ${prompt}\n\nfunction analyzeData(data) {\n  // تحليل البيانات\n  const result = data.map(item => {\n    return {\n      ...item,\n      analyzed: true,\n      score: calculateScore(item)\n    };\n  });\n  \n  return result;\n}\n\nfunction calculateScore(item) {\n  // حساب النتيجة\n  return item.value * 0.85;\n}`;
          break;
        case 'design':
          generatedContent = `🎨 **تصميم: ${prompt}**\n\n**المكونات الرئيسية:**\n• Header - شريط علوي بالشعار والتنقل\n• Hero Section - قسم رئيسي جذاب\n• Features Grid - شبكة المميزات (3 أعمدة)\n• CTA Section - دعوة للإجراء\n• Footer - ذيل الصفحة\n\n**الألوان المقترحة:**\n• Primary: #3B82F6 (أزرق)\n• Secondary: #10B981 (أخضر)\n• Background: #0F172A (داكن)\n• Text: #F8FAFC (فاتح)\n\n**الخطوط:**\n• العناوين: Cairo Bold\n• النص: Cairo Regular`;
          break;
        case 'diagram':
          generatedContent = `📊 **مخطط: ${prompt}**\n\n\`\`\`\n┌─────────────────┐\n│     البداية     │\n└────────┬────────┘\n         │\n         ▼\n┌─────────────────┐\n│  جمع البيانات   │\n└────────┬────────┘\n         │\n         ▼\n┌─────────────────┐\n│    التحليل     │\n└────────┬────────┘\n         │\n    ┌────┴────┐\n    ▼         ▼\n┌───────┐ ┌───────┐\n│ نجاح  │ │ فشل  │\n└───┬───┘ └───┬───┘\n    │         │\n    ▼         ▼\n┌───────┐ ┌───────┐\n│ تقرير │ │ إعادة │\n└───────┘ └───────┘\n\`\`\``;
          break;
        case 'text':
        default:
          generatedContent = `📝 **${prompt}**\n\n${prompt} هو موضوع مهم يستحق الدراسة والتحليل المعمق.\n\n**النقاط الرئيسية:**\n\n1. **التعريف والمفهوم**\n   يشير هذا المصطلح إلى...\n\n2. **الأهمية**\n   تكمن أهميته في...\n\n3. **التطبيقات العملية**\n   يمكن تطبيقه في...\n\n4. **التحديات**\n   من أبرز التحديات...\n\n5. **الخلاصة**\n   في الختام، يمكن القول...`;
      }

      setCanvasContent(generatedContent);
      setStatus('completed');

      // Notify parent about canvas creation
      if (onCanvasCreated) {
        onCanvasCreated({
          id: `canvas-${Date.now()}`,
          title: generatedTitle,
          content: generatedContent,
          timestamp: new Date(),
          type: selectedType
        });
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ أثناء إنشاء الكانفاس';
      setError(errorMessage);
      setStatus('error');
    }
  }, [prompt, selectedType, onCanvasCreated]);

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      generateCanvas();
    }
  };

  // Copy to clipboard
  const handleCopy = async () => {
    if (canvasContent) {
      await navigator.clipboard.writeText(canvasContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Insert to chat and close
  const handleInsertAndClose = () => {
    if (canvasContent && onInsertToChat) {
      onInsertToChat(canvasContent);
      onClose();
    }
  };

  // Reset state
  const handleReset = () => {
    setPrompt('');
    setStatus('idle');
    setCanvasContent('');
    setCanvasTitle('');
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed inset-4 md:inset-8 lg:inset-12 z-50
                   bg-gray-900/98 backdrop-blur-xl rounded-2xl border border-white/10
                   flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Palette className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">كانفاس الذكاء الاصطناعي</h2>
              <p className="text-xs text-gray-400">إنشاء محتوى ذكي بناءً على طلبك</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {status === 'completed' && (
              <>
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  title="نسخ"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-green-400" />
                  ) : (
                    <Copy className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  {isExpanded ? (
                    <Minimize2 className="w-5 h-5 text-gray-400" />
                  ) : (
                    <Maximize2 className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Canvas Types */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-gray-400">نوع الكانفاس:</span>
            </div>
            <div className="flex items-center gap-2">
              {canvasTypes.map(({ type, icon, label, description }) => (
                <motion.button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200",
                    selectedType === type
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                  )}
                  title={description}
                >
                  {icon}
                  <span>{label}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Input Section */}
          <div className="p-4 border-b border-white/10">
            <div className="relative">
              <textarea
                ref={inputRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="صف ما تريد إنشاءه في الكانفاس..."
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12
                         text-white placeholder:text-gray-500 resize-none
                         focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20
                         transition-all outline-none"
                disabled={status === 'generating'}
              />
              <button
                onClick={generateCanvas}
                disabled={status === 'generating' || !prompt.trim()}
                className={cn(
                  "absolute left-3 top-3 p-2 rounded-lg transition-all",
                  status === 'generating' || !prompt.trim()
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-purple-500 text-white hover:bg-purple-600'
                )}
              >
                {status === 'generating' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Result Area */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Loading State */}
            {status === 'generating' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full space-y-4"
              >
                <div className="relative">
                  <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
                  <Sparkles className="w-5 h-5 text-yellow-400 absolute -top-1 -right-1 animate-pulse" />
                </div>
                <p className="text-gray-400">جاري إنشاء الكانفاس...</p>
              </motion.div>
            )}

            {/* Error State */}
            {status === 'error' && error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-red-500/30 bg-red-500/10 p-4"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-red-300 font-medium mb-1">حدث خطأ</p>
                    <p className="text-red-300/70 text-sm">{error}</p>
                  </div>
                  <button
                    onClick={generateCanvas}
                    className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                    title="إعادة المحاولة"
                  >
                    <RefreshCw className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Result Content */}
            {status === 'completed' && canvasContent && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Title */}
                {canvasTitle && (
                  <div className="flex items-center gap-2 text-purple-400 font-medium">
                    <Palette className="w-5 h-5" />
                    <span>{canvasTitle}</span>
                  </div>
                )}

                {/* Content */}
                <div className={cn(
                  "rounded-xl border border-white/10 bg-white/5 p-6 transition-all",
                  isExpanded ? 'min-h-[300px]' : 'max-h-[200px] overflow-hidden'
                )}>
                  <div className="prose prose-sm prose-invert max-w-none whitespace-pre-wrap">
                    {canvasContent}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Empty State */}
            {status === 'idle' && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="p-4 rounded-full bg-purple-500/10 mb-4">
                  <Palette className="w-10 h-10 text-purple-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-300 mb-2">
                  أنشئ كانفاس جديد
                </h3>
                <p className="text-sm text-gray-500 max-w-md">
                  اكتب وصفاً لما تريد إنشاءه وسيقوم الذكاء الاصطناعي بإنشاء المحتوى لك.
                  يمكنك اختيار نوع الكانفاس: نص، كود، تصميم، أو مخطط.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        {status === 'completed' && (
          <div className="p-4 border-t border-white/10 flex items-center justify-between">
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 
                       text-gray-400 hover:text-white transition-colors text-sm"
            >
              إنشاء كانفاس جديد
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handleInsertAndClose}
                className="flex items-center gap-2 px-4 py-2 rounded-lg
                         bg-purple-500 hover:bg-purple-600 text-white
                         transition-colors text-sm font-medium"
              >
                <MessageSquarePlus className="w-4 h-4" />
                <span>إدراج وإغلاق</span>
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
      />
    </AnimatePresence>
  );
}

export default CanvasPanel;
