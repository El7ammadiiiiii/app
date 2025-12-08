"use client";

import * as React from "react";
import { 
  Globe,
  Clock,
  Calendar,
  Type,
  Languages,
} from "lucide-react";
import { 
  SettingCard, 
  SettingToggle, 
  SettingSelect,
  SettingGroup,
} from "../components";
import { useSettingsStore } from "../store/settingsStore";

const languageOptions = [
  { value: "ar", label: "العربية", icon: <span>🇸🇦</span> },
  { value: "en", label: "English", icon: <span>🇬🇧</span> },
  { value: "fr", label: "Français", icon: <span>🇫🇷</span> },
];

const directionOptions = [
  { value: "rtl", label: "من اليمين لليسار (RTL)" },
  { value: "ltr", label: "من اليسار لليمين (LTR)" },
  { value: "auto", label: "تلقائي" },
];

const dateFormatOptions = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY (اليوم/الشهر/السنة)" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY (الشهر/اليوم/السنة)" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (السنة-الشهر-اليوم)" },
];

const timeFormatOptions = [
  { value: "12h", label: "12 ساعة (AM/PM)" },
  { value: "24h", label: "24 ساعة" },
];

const calendarOptions = [
  { value: "gregorian", label: "ميلادي" },
  { value: "hijri", label: "هجري" },
];

const timezoneOptions = [
  { value: "Asia/Riyadh", label: "توقيت الرياض (GMT+3)" },
  { value: "Asia/Dubai", label: "توقيت دبي (GMT+4)" },
  { value: "Asia/Kuwait", label: "توقيت الكويت (GMT+3)" },
  { value: "Africa/Cairo", label: "توقيت القاهرة (GMT+2)" },
  { value: "Europe/London", label: "توقيت لندن (GMT+0)" },
  { value: "America/New_York", label: "توقيت نيويورك (GMT-5)" },
];

export function LanguageSection() {
  const {
    language,
    direction,
    dateFormat,
    timeFormat,
    calendar,
    timezone,
    autoCorrect,
    autoComplete,
    animatedTyping,
    updateSetting,
  } = useSettingsStore();

  return (
    <div className="space-y-6">
      {/* Language */}
      <SettingGroup title="اللغة">
        <SettingSelect
          label="لغة الواجهة"
          description="اللغة المستخدمة في واجهة التطبيق"
          value={language}
          onValueChange={(v) => updateSetting("language", v as any)}
          options={languageOptions}
        />

        <SettingSelect
          label="لغة المحادثات"
          description="اللغة المفضلة للتحدث مع المساعد"
          value="auto"
          onValueChange={() => {}}
          options={[
            { value: "auto", label: "تلقائي (حسب لغة السؤال)" },
            { value: "ar", label: "العربية دائماً" },
            { value: "en", label: "English always" },
          ]}
        />

        <SettingSelect
          label="اتجاه النص"
          value={direction}
          onValueChange={(v) => updateSetting("direction", v as any)}
          options={directionOptions}
        />
      </SettingGroup>

      {/* Date & Time */}
      <SettingGroup title="التاريخ والوقت">
        <SettingSelect
          label="المنطقة الزمنية"
          value={timezone}
          onValueChange={(v) => updateSetting("timezone", v)}
          options={timezoneOptions}
        />

        <SettingSelect
          label="صيغة التاريخ"
          value={dateFormat}
          onValueChange={(v) => updateSetting("dateFormat", v as any)}
          options={dateFormatOptions}
        />

        <SettingSelect
          label="صيغة الوقت"
          value={timeFormat}
          onValueChange={(v) => updateSetting("timeFormat", v as any)}
          options={timeFormatOptions}
        />

        <SettingSelect
          label="التقويم"
          value={calendar}
          onValueChange={(v) => updateSetting("calendar", v as any)}
          options={calendarOptions}
        />
      </SettingGroup>

      {/* Writing */}
      <SettingGroup title="الكتابة">
        <SettingCard
          icon={<Type className="w-5 h-5" />}
          title="التصحيح التلقائي"
          description="تصحيح الأخطاء الإملائية تلقائياً"
        >
          <SettingToggle
            checked={autoCorrect}
            onCheckedChange={(v) => updateSetting("autoCorrect", v)}
          />
        </SettingCard>

        <SettingCard
          icon={<Type className="w-5 h-5" />}
          title="الإكمال التلقائي"
          description="اقتراحات أثناء الكتابة"
        >
          <SettingToggle
            checked={autoComplete}
            onCheckedChange={(v) => updateSetting("autoComplete", v)}
          />
        </SettingCard>

        <SettingCard
          icon={<Type className="w-5 h-5" />}
          title="الكتابة المتحركة للردود"
          description="تأثير الطباعة التدريجية لردود المساعد"
        >
          <SettingToggle
            checked={animatedTyping}
            onCheckedChange={(v) => updateSetting("animatedTyping", v)}
          />
        </SettingCard>
      </SettingGroup>
    </div>
  );
}
