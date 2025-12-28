"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import { PROJECT_TEMPLATES, type ProjectColor } from "@/types/project";
import { EmojiPicker } from "./EmojiPicker";
import { ColorPicker } from "./ColorPicker";
import { ProjectTemplates, TemplatePreview } from "./ProjectTemplates";
import { useSound } from "@/lib/sounds";

export function CreateProjectModal() {
  const { isCreateModalOpen, closeCreateModal, createProject } = useProjectStore();
  const { playSound } = useSound();

  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📁");
  const [color, setColor] = useState<ProjectColor>("turquoise");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<import("@/types/project").ProjectTemplate | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // عند اختيار قالب
  const handleTemplateSelect = (templateId: string | null) => {
    setSelectedTemplate(templateId as import("@/types/project").ProjectTemplate | null);
    if (templateId) {
      const template = PROJECT_TEMPLATES.find(t => t.id === templateId);
      if (template) {
        setEmoji(template.emoji);
        setColor(template.color);
        setInstructions(template.instructions);
        setDescription(template.description);
        if (!name) {
          setName(template.name);
        }
      }
    }
  };

  // إنشاء المشروع
  const handleCreate = () => {
    if (!name.trim()) return;

    createProject({
      name: name.trim(),
      emoji,
      color,
      description: description.trim(),
      instructions: instructions.trim(),
      template: selectedTemplate || undefined,
    });

    playSound("projectCreate");
    resetForm();
    closeCreateModal();
  };

  // إعادة تعيين النموذج
  const resetForm = () => {
    setName("");
    setEmoji("📁");
    setColor("turquoise");
    setDescription("");
    setInstructions("");
    setSelectedTemplate(null);
    setShowAdvanced(false);
    setShowEmojiPicker(false);
  };

  // إغلاق Modal
  const handleClose = () => {
    resetForm();
    closeCreateModal();
  };

  return (
    <AnimatePresence>
      {isCreateModalOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 
                       md:w-[600px] md:max-h-[85vh] theme-card border border-border rounded-2xl 
                       shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 
                              flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">مشروع جديد</h2>
                  <p className="text-sm text-muted-foreground">أنشئ مساحة عمل جديدة لمحادثاتك</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-accent transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* اسم المشروع مع الإيموجي */}
              <div className="flex gap-3">
                {/* Emoji Picker */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="w-14 h-14 rounded-xl border-2 border-dashed border-border 
                             hover:border-primary/50 transition-colors flex items-center justify-center
                             text-3xl hover:bg-accent/50"
                  >
                    {emoji}
                  </button>
                  
                  <AnimatePresence>
                    {showEmojiPicker && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -10 }}
                        className="absolute top-16 right-0 z-10 bg-popover border border-border 
                                 rounded-xl shadow-xl min-w-[280px]"
                      >
                        <EmojiPicker
                          selectedEmoji={emoji}
                          onSelect={(e) => {
                            setEmoji(e);
                            setShowEmojiPicker(false);
                          }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* اسم المشروع */}
                <div className="flex-1">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="اسم المشروع..."
                    className="w-full h-14 px-4 rounded-xl border border-border theme-surface
                             focus:border-primary focus:ring-2 focus:ring-primary/20 
                             outline-none transition-all text-lg"
                    autoFocus
                  />
                </div>
              </div>

              {/* القوالب */}
              <ProjectTemplates
                selectedTemplate={selectedTemplate}
                onSelect={handleTemplateSelect}
              />

              {/* معاينة القالب */}
              <AnimatePresence>
                {selectedTemplate && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <TemplatePreview templateId={selectedTemplate} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* لون المشروع */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">لون المشروع</label>
                <ColorPicker selectedColor={color} onSelect={setColor} />
              </div>

              {/* الإعدادات المتقدمة */}
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground 
                         transition-colors"
              >
                {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                إعدادات متقدمة
              </button>

              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 overflow-hidden"
                  >
                    {/* الوصف */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">الوصف (اختياري)</label>
                      <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="وصف مختصر للمشروع..."
                        className="w-full px-4 py-3 rounded-xl border border-border theme-surface
                                 focus:border-primary focus:ring-2 focus:ring-primary/20 
                                 outline-none transition-all"
                      />
                    </div>

                    {/* التعليمات المخصصة */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">تعليمات مخصصة (اختياري)</label>
                      <textarea
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        placeholder="أضف تعليمات خاصة لهذا المشروع..."
                        rows={4}
                        className="w-full px-4 py-3 rounded-xl border border-border theme-surface
                                 focus:border-primary focus:ring-2 focus:ring-primary/20 
                                 outline-none transition-all resize-none"
                      />
                      <p className="text-xs text-muted-foreground">
                        سيتم تطبيق هذه التعليمات على جميع المحادثات في هذا المشروع
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-5 border-t border-border bg-muted/30">
              <button
                onClick={handleClose}
                className="px-5 py-2.5 rounded-xl border border-border hover:bg-accent 
                         transition-colors font-medium"
              >
                إلغاء
              </button>
              <motion.button
                onClick={handleCreate}
                disabled={!name.trim()}
                className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground 
                         hover:bg-primary/90 transition-colors font-medium
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Sparkles size={16} />
                إنشاء المشروع
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
