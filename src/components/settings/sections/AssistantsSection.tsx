"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { 
  Bot,
  Sparkles,
  Brain,
  Settings2,
  MessageSquare,
  Zap,
  Building2,
  LineChart,
  Lightbulb,
} from "lucide-react";
import { 
  SettingCard, 
  SettingToggle, 
  SettingSelect,
  SettingGroup,
} from "../components";
import { useSettingsStore } from "../store/settingsStore";
import type { AssistantType, ResponseStyle } from "../types/settings";

const assistants: { id: AssistantType; name: string; description: string; icon: typeof Bot; color: string }[] = [
  {
    id: "general",
    name: "المساعد العام",
    description: "مساعد ذكي متعدد الأغراض",
    icon: Bot,
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "analyst",
    name: "المحلل المالي",
    description: "متخصص في التحليل الفني والأساسي",
    icon: LineChart,
    color: "from-green-500 to-emerald-500",
  },
  {
    id: "institute",
    name: "وكيل المعهد",
    description: "مساعد متخصص في تعليم التداول",
    icon: Building2,
    color: "from-purple-500 to-pink-500",
  },
];

const responseStyleOptions = [
  { value: "concise", label: "مختصر - ردود قصيرة ومباشرة" },
  { value: "detailed", label: "تفصيلي - ردود شاملة ومفصلة" },
  { value: "creative", label: "إبداعي - ردود متنوعة ومبتكرة" },
];

const responseToneOptions = [
  { value: "formal", label: "رسمي" },
  { value: "friendly", label: "ودود" },
  { value: "technical", label: "تقني" },
];

export function AssistantsSection() {
  const {
    defaultAssistant,
    responseLength,
    responseTone,
    customInstructions,
    showSources,
    askConfirmation,
    creativity,
    updateSetting,
  } = useSettingsStore();

  return (
    <div className="space-y-6">
      {/* Assistant Selection */}
      <SettingGroup title="اختيار المساعد">
        <div className="grid gap-3">
          {assistants.map((assistant) => {
            const Icon = assistant.icon;
            const isSelected = defaultAssistant === assistant.id;
            
            return (
              <motion.button
                key={assistant.id}
                onClick={() => updateSetting("defaultAssistant", assistant.id)}
                className={`
                  relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-right
                  ${isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:border-primary"
                  }
                `}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className={`
                  w-12 h-12 rounded-xl bg-gradient-to-br ${assistant.color}
                  flex items-center justify-center flex-shrink-0
                `}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground">{assistant.name}</h4>
                  <p className="text-sm text-muted-foreground">{assistant.description}</p>
                </div>
                <div className={`
                  w-5 h-5 rounded-full border-2 flex items-center justify-center
                  ${isSelected ? "border-primary bg-primary" : "border-muted-foreground"}
                `}>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-2 h-2 rounded-full bg-white"
                    />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </SettingGroup>

      {/* Response Style */}
      <SettingGroup title="أسلوب الاستجابة">
        <SettingSelect
          label="طول الردود"
          description="مستوى التفصيل في ردود المساعد"
          value={responseLength}
          onValueChange={(v) => updateSetting("responseLength", v as ResponseStyle)}
          options={responseStyleOptions}
        />

        <SettingSelect
          label="نبرة الرد"
          description="أسلوب التواصل"
          value={responseTone}
          onValueChange={(v) => updateSetting("responseTone", v as any)}
          options={responseToneOptions}
        />
      </SettingGroup>

      {/* Custom Instructions */}
      <SettingGroup title="تعليمات مخصصة">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            تعليمات للمساعد
          </label>
          <p className="text-xs text-muted-foreground">
            أضف تعليمات خاصة يتبعها المساعد في جميع المحادثات
          </p>
          <textarea
            value={customInstructions}
            onChange={(e) => updateSetting("customInstructions", e.target.value)}
            placeholder="مثال: رد دائماً بالعربية الفصحى، استخدم أمثلة من السوق السعودي..."
            className="w-full h-32 p-3 rounded-xl bg-muted border border-border text-foreground
                     placeholder:text-muted-foreground resize-none focus:outline-none 
                     focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all"
          />
          <p className="text-xs text-muted-foreground text-left">
            {customInstructions.length}/1500
          </p>
        </div>
      </SettingGroup>

      {/* Behavior */}
      <SettingGroup title="السلوك">
        <SettingCard
          icon={<Sparkles className="w-5 h-5" />}
          title="عرض المصادر"
          description="إظهار مصادر المعلومات في الردود"
        >
          <SettingToggle
            checked={showSources}
            onCheckedChange={(v) => updateSetting("showSources", v)}
          />
        </SettingCard>

        <SettingCard
          icon={<Lightbulb className="w-5 h-5" />}
          title="طلب التأكيد"
          description="طلب التأكيد قبل الإجراءات المهمة"
        >
          <SettingToggle
            checked={askConfirmation}
            onCheckedChange={(v) => updateSetting("askConfirmation", v)}
          />
        </SettingCard>

        <SettingCard
          icon={<Brain className="w-5 h-5" />}
          title="مستوى الإبداع"
          description={`${creativity}% - توازن بين الدقة والإبداع`}
        >
          <input
            type="range"
            min={0}
            max={100}
            value={creativity}
            onChange={(e) => updateSetting("creativity", parseInt(e.target.value))}
            className="w-24 accent-primary"
          />
        </SettingCard>
      </SettingGroup>
    </div>
  );
}
