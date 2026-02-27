"use client";

import { motion } from "framer-motion";
import { PROJECT_TEMPLATES, PROJECT_COLORS } from "@/types/project";
import { Check } from "lucide-react";

interface ProjectTemplatesProps {
  selectedTemplate: string | null;
  onSelect: (templateId: string | null) => void;
}

export function ProjectTemplates({ selectedTemplate, onSelect }: ProjectTemplatesProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {/* القوالب كـ Pills */}
      {PROJECT_TEMPLATES.map((template) => (
        <TemplatePill
          key={template.id}
          template={template}
          isSelected={selectedTemplate === template.id}
          onSelect={() => onSelect(template.id)}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Template Pill Component
// ═══════════════════════════════════════════════════════════════

interface TemplatePillProps {
  template: import("@/types/project").ProjectTemplateConfig;
  isSelected: boolean;
  onSelect: () => void;
}

function TemplatePill({ template, isSelected, onSelect }: TemplatePillProps) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full 
        text-sm font-medium transition-all border
        ${isSelected
          ? "bg-gray-100 dark:bg-zinc-700 border-gray-300 dark:border-zinc-500 text-gray-900 dark:text-white"
          : "bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-700"
        }
      `}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
    >
      <span>{template.emoji}</span>
      <span>{template.name}</span>
      {isSelected && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-green-600 dark:text-green-400"
        >
          <Check size={14} strokeWidth={2.5} />
        </motion.span>
      )}
    </motion.button>
  );
}

// ═══════════════════════════════════════════════════════════════
// Template Preview - للاستخدام في أماكن أخرى
// ═══════════════════════════════════════════════════════════════

export function TemplatePreview({ templateId }: { templateId: string }) {
  const template = PROJECT_TEMPLATES.find(t => t.id === templateId);
  
  if (!template) return null;

  const colorClasses = PROJECT_COLORS[template.color];

  return (
    <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{template.emoji}</span>
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white">{template.name}</h4>
          <p className="text-sm text-gray-500 dark:text-zinc-400">{template.description}</p>
        </div>
      </div>
    </div>
  );
}
