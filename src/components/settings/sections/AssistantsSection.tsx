"use client";

import * as React from "react";
import { 
  Sparkles,
  Brain,
  Lightbulb,
} from "lucide-react";
import { 
  SettingCard, 
  SettingToggle, 
  SettingSelect,
  SettingGroup,
} from "../components";
import { useSettingsStore } from "../store/settingsStore";
import type { ResponseStyle } from "../types/settings";

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
      {/* Response Style */}
      <SettingGroup title="أسلوب الاستجابة">
        <SettingSelect
          id="settings-assistants-response-length"
          variant="cmdk"
          label="طول الردود"
          description="مستوى التفصيل في ردود المساعد"
          value={responseLength}
          onValueChange={(v) => updateSetting("responseLength", v as ResponseStyle)}
          options={responseStyleOptions}
        />

        <SettingSelect
          id="settings-assistants-response-tone"
          variant="cmdk"
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
