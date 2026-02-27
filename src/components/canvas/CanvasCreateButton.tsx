"use client";

/**
 * ═══════════════════════════════════════════════════════════════
 * Wave 5.1 — Canvas Create Button (Gemini-style)
 * ═══════════════════════════════════════════════════════════════
 * Dropdown with 6 creation options:
 *   Document · Code · Web page · Slides · Audio summary · Custom task
 */

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Code2, Globe, Presentation, AudioLines, Sparkles, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvasStore, type CanvasType } from "@/store/canvasStore";
import { useChatStore } from "@/store/chatStore";

interface CreateOption {
  id: string;
  label: string;
  labelAr: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  type: CanvasType;
  language: string;
  defaultContent: string;
}

const CREATE_OPTIONS: CreateOption[] = [
  {
    id: "document",
    label: "Document",
    labelAr: "مستند",
    description: "مستند نصي غني بالتنسيق",
    icon: FileText,
    color: "#a78bfa",
    type: "DOC",
    language: "markdown",
    defaultContent: "# مستند جديد\n\nابدأ الكتابة هنا...\n",
  },
  {
    id: "code",
    label: "Code",
    labelAr: "كود",
    description: "محرر كود مع تلوين وتشغيل مباشر",
    icon: Code2,
    color: "#22d3ee",
    type: "CODE",
    language: "typescript",
    defaultContent: '// New Code\nconsole.log("Hello, CCWAYS!");\n',
  },
  {
    id: "webpage",
    label: "Web Page",
    labelAr: "صفحة ويب",
    description: "HTML/CSS/JS مع معاينة حيّة",
    icon: Globe,
    color: "#60a5fa",
    type: "CODE",
    language: "html",
    defaultContent: `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>صفحة جديدة</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0f172a; color: #e2e8f0; }
    h1 { font-size: 2.5rem; background: linear-gradient(135deg, #2dd4bf, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  </style>
</head>
<body>
  <h1>مرحباً بالعالم! 🌍</h1>
</body>
</html>`,
  },
  {
    id: "slides",
    label: "Slides",
    labelAr: "شرائح",
    description: "عرض تقديمي بالشرائح",
    icon: Presentation,
    color: "#fbbf24",
    type: "SLIDES",
    language: "markdown",
    defaultContent: `# عنوان العرض التقديمي

مقدمة ونظرة عامة

---

# الشريحة الثانية

- النقطة الأولى
- النقطة الثانية
- النقطة الثالثة

---

# الخاتمة

شكراً لكم!`,
  },
  {
    id: "audio-summary",
    label: "Audio Summary",
    labelAr: "ملخص صوتي",
    description: "نص ملخص جاهز للتحويل الصوتي",
    icon: AudioLines,
    color: "#34d399",
    type: "TEXT",
    language: "markdown",
    defaultContent: "# ملخص صوتي\n\n> اكتب نص الملخص هنا وسيكون جاهزاً للتحويل الصوتي...\n",
  },
  {
    id: "custom",
    label: "Custom Task",
    labelAr: "مهمة مخصصة",
    description: "ابدأ مع وصف مخصّص للمهمة",
    icon: Sparkles,
    color: "#f472b6",
    type: "TEXT",
    language: "markdown",
    defaultContent: "",
  },
];

export function CanvasCreateButton() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const createArtifact = useCanvasStore((s) => s.createArtifact);
  const activeChatId = useChatStore((s) => s.activeConversationId);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen]);

  const handleCreate = (option: CreateOption) => {
    const chatId = activeChatId || `chat_${Date.now()}`;
    createArtifact({
      title: option.labelAr,
      type: option.type,
      language: option.language,
      content: option.defaultContent,
      chatId,
    });
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium",
          "border border-white/[0.08] transition-all duration-150",
          isOpen
            ? "bg-teal-500/15 text-teal-400 border-teal-500/30"
            : "bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white/80"
        )}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="إنشاء canvas جديد"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Canvas</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={cn(
              "absolute bottom-full mb-2 left-0",
              "w-72 rounded-2xl border border-white/[0.08]",
              "bg-[#1a1a2e]/95 backdrop-blur-xl shadow-2xl shadow-black/40",
              "overflow-hidden z-50"
            )}
            role="menu"
            aria-label="أنواع Canvas"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <p className="text-xs font-semibold text-white/70">إنشاء Canvas جديد</p>
            </div>

            {/* Options */}
            <div className="py-1">
              {CREATE_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.id}
                    onClick={() => handleCreate(option)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5",
                      "hover:bg-white/[0.06] transition-colors duration-100",
                      "text-right"
                    )}
                    role="menuitem"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${option.color}15`, border: `1px solid ${option.color}25` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: option.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white/90">{option.labelAr}</div>
                      <div className="text-[11px] text-white/40 truncate">{option.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
