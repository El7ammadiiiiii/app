"use client";

import { motion } from "framer-motion";
import { PROJECT_TEMPLATES, PROJECT_COLORS, type ProjectTemplate } from "@/types/project";
import { Check } from "lucide-react";

interface ProjectTemplatesProps {
  selectedTemplate: string | null;
  onSelect: (templateId: string | null) => void;
}

export function ProjectTemplates({ selectedTemplate, onSelect }: ProjectTemplatesProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">قوالب جاهزة</h4>
      
      <div className="grid grid-cols-2 gap-3">
        {/* خيار بدون قالب */}
        <motion.button
          type="button"
          onClick={() => onSelect(null)}
          className={`
            relative p-4 rounded-xl border-2 transition-all
            flex flex-col items-center gap-2 text-center
            ${selectedTemplate === null
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-accent/50"
            }
          `}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {selectedTemplate === null && (
            <motion.div 
              className="absolute top-2 right-2 text-primary"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
            >
              <Check size={16} />
            </motion.div>
          )}
          <span className="text-2xl">✨</span>
          <div>
            <p className="font-medium text-sm">مشروع فارغ</p>
            <p className="text-xs text-muted-foreground">ابدأ من الصفر</p>
          </div>
        </motion.button>

        {/* القوالب */}
        {PROJECT_TEMPLATES.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            isSelected={selectedTemplate === template.id}
            onSelect={() => onSelect(template.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Template Card
// ═══════════════════════════════════════════════════════════════

interface TemplateCardProps {
  template: import("@/types/project").ProjectTemplateConfig;
  isSelected: boolean;
  onSelect: () => void;
}

function TemplateCard({ template, isSelected, onSelect }: TemplateCardProps) {
  const colorClasses = PROJECT_COLORS[template.color];

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      className={`
        relative p-4 rounded-xl border-2 transition-all
        flex flex-col items-center gap-2 text-center
        ${isSelected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50 hover:bg-accent/50"
        }
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* شريط اللون */}
      <div 
        className={`absolute top-0 left-0 right-0 h-1 rounded-t-xl ${colorClasses.bg}`}
      />

      {/* علامة الاختيار */}
      {isSelected && (
        <motion.div 
          className="absolute top-2 right-2 text-primary"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        >
          <Check size={16} />
        </motion.div>
      )}

      <span className="text-2xl">{template.emoji}</span>
      <div>
        <p className="font-medium text-sm">{template.name}</p>
        <p className="text-xs text-muted-foreground line-clamp-1">{template.description}</p>
      </div>
    </motion.button>
  );
}

// ═══════════════════════════════════════════════════════════════
// Template Preview
// ═══════════════════════════════════════════════════════════════

interface TemplatePreviewProps {
  templateId: string;
}

export function TemplatePreview({ templateId }: TemplatePreviewProps) {
  const template = PROJECT_TEMPLATES.find(t => t.id === templateId);
  
  if (!template) return null;

  const colorClasses = PROJECT_COLORS[template.color];

  return (
    <div className="p-4 rounded-xl border bg-card space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{template.emoji}</span>
        <div>
          <h4 className="font-semibold">{template.name}</h4>
          <p className="text-sm text-muted-foreground">{template.description}</p>
        </div>
      </div>
      
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">التعليمات المدمجة:</p>
        <div className={`p-3 rounded-lg ${colorClasses.bg}/10 border ${colorClasses.border}`}>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {template.instructions}
          </p>
        </div>
      </div>
    </div>
  );
}
