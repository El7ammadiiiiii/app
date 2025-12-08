"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { 
  Sun,
  Moon,
  Monitor,
  Type,
  Minimize2,
  Sparkles,
  Check,
} from "lucide-react";
import { 
  SettingCard, 
  SettingToggle, 
  SettingSelect,
  SettingGroup,
  SettingSlider,
} from "../components";
import { useSettingsStore } from "../store/settingsStore";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import type { ThemeMode, AccentColor, FontSize } from "../types/settings";

const accentColors: { id: AccentColor; color: string; label: string }[] = [
  { id: "green", color: "#22c55e", label: "أخضر" },
  { id: "blue", color: "#3b82f6", label: "أزرق" },
  { id: "purple", color: "#a855f7", label: "بنفسجي" },
  { id: "pink", color: "#ec4899", label: "وردي" },
  { id: "orange", color: "#f97316", label: "برتقالي" },
  { id: "red", color: "#ef4444", label: "أحمر" },
  { id: "yellow", color: "#eab308", label: "أصفر" },
  { id: "gray", color: "#6b7280", label: "رمادي" },
];

const fontOptions = [
  { value: "Cairo", label: "Cairo" },
  { value: "Tajawal", label: "Tajawal" },
  { value: "IBM Plex Sans Arabic", label: "IBM Plex Arabic" },
];

export function AppearanceSection() {
  const { setTheme, theme: currentTheme } = useTheme();
  const {
    theme,
    accentColor,
    fontSize,
    compactMode,
    animations,
    reducedMotion,
    updateSetting,
  } = useSettingsStore();

  const handleThemeChange = (newTheme: ThemeMode) => {
    updateSetting("theme", newTheme);
    setTheme(newTheme);
  };

  const fontSizeValue = fontSize === "small" ? 14 : fontSize === "medium" ? 16 : 18;

  return (
    <div className="space-y-6">
      {/* Theme Selection */}
      <SettingGroup title="السمة">
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: "light" as ThemeMode, icon: Sun, label: "فاتح" },
            { id: "dark" as ThemeMode, icon: Moon, label: "داكن" },
            { id: "system" as ThemeMode, icon: Monitor, label: "تلقائي" },
          ].map((option) => (
            <motion.button
              key={option.id}
              onClick={() => handleThemeChange(option.id)}
                className={cn(
                "relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors",
                theme === option.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-primary"
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {theme === option.id && (
                <motion.div
                  layoutId="themeIndicator"
                  className="absolute top-2 left-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  <Check className="w-3 h-3 text-primary-foreground" />
                </motion.div>
              )}
              <option.icon className={cn(
                "w-8 h-8",
                theme === option.id ? "text-primary" : "text-muted-foreground"
              )} />
              <span className={cn(
                "font-medium",
                theme === option.id ? "text-primary" : "text-foreground"
              )}>
                {option.label}
              </span>
            </motion.button>
          ))}
        </div>
      </SettingGroup>

      {/* Accent Color */}
      <SettingGroup title="لون التمييز">
        <div className="flex flex-wrap gap-3 justify-center">
          {accentColors.map((color) => (
            <motion.button
              key={color.id}
              onClick={() => updateSetting("accentColor", color.id)}
              className={cn(
                "w-10 h-10 rounded-full transition-all",
                accentColor === color.id && "ring-2 ring-offset-2 ring-offset-background ring-current"
              )}
              style={{ 
                backgroundColor: color.color,
                color: color.color,
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              title={color.label}
            >
              {accentColor === color.id && (
                <Check className="w-5 h-5 text-white mx-auto" />
              )}
            </motion.button>
          ))}
        </div>
      </SettingGroup>

      {/* Font Settings */}
      <SettingGroup title="الخط">
        <SettingSlider
          label="حجم الخط"
          value={fontSizeValue}
          onValueChange={(v) => {
            const size: FontSize = v <= 14 ? "small" : v <= 16 ? "medium" : "large";
            updateSetting("fontSize", size);
          }}
          min={12}
          max={20}
          step={2}
          valueFormatter={(v) => `${v}px`}
        />

        <SettingSelect
          label="نوع الخط العربي"
          value="Cairo"
          onValueChange={() => {}}
          options={fontOptions}
        />
      </SettingGroup>

      {/* Interface Settings */}
      <SettingGroup title="الواجهة">
        <SettingCard
          icon={<Minimize2 className="w-5 h-5" />}
          title="الوضع المضغوط"
          description="تقليل المسافات بين العناصر"
        >
          <SettingToggle
            checked={compactMode}
            onCheckedChange={(v) => updateSetting("compactMode", v)}
          />
        </SettingCard>

        <SettingCard
          icon={<Sparkles className="w-5 h-5" />}
          title="تفعيل الحركات"
          description="تشغيل تأثيرات الأنيميشن"
        >
          <SettingToggle
            checked={animations}
            onCheckedChange={(v) => updateSetting("animations", v)}
          />
        </SettingCard>

        <SettingCard
          icon={<Sparkles className="w-5 h-5" />}
          title="تقليل الحركة"
          description="لذوي الاحتياجات الخاصة أو من يفضل حركات أقل"
        >
          <SettingToggle
            checked={reducedMotion}
            onCheckedChange={(v) => updateSetting("reducedMotion", v)}
          />
        </SettingCard>
      </SettingGroup>
    </div>
  );
}
