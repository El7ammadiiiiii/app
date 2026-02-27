"use client";

import * as React from "react";
import { 
  Sun,
  Moon,
  Monitor,
  Type,
  Palette,
} from "lucide-react";
import { 
  SettingCard, 
  SettingSelect,
  SettingGroup,
} from "../components";
import { useSettingsStore } from "../store/settingsStore";
import { useTheme } from "next-themes";
import type { ThemeMode, AccentColor } from "../types/settings";

const fontOptions = [
  { value: "Cairo", label: "Cairo" },
  { value: "Tajawal", label: "Tajawal" },
  { value: "IBM Plex Sans Arabic", label: "IBM Plex Arabic" },
];

const themeOptions = [
  { value: "light", label: "فاتح", icon: <Sun className="w-3.5 h-3.5" /> },
  { value: "dark", label: "داكن", icon: <Moon className="w-3.5 h-3.5" /> },
  { value: "system", label: "تلقائي", icon: <Monitor className="w-3.5 h-3.5" /> },
];

export function AppearanceSection() {
  const { setTheme } = useTheme();
  const {
    theme,
    fontSize,
    updateSetting,
  } = useSettingsStore();

  const handleThemeChange = (newTheme: string) => {
    updateSetting("theme", newTheme as ThemeMode);
    setTheme(newTheme);
  };

  return (
    <div className="space-y-4">
      <SettingGroup title="المظهر العام">
        <SettingCard
          icon={<Palette />}
          title="السمة"
          description="اختر مظهر التطبيق المفضل"
        >
          <SettingSelect
            id="settings-appearance-theme"
            variant="cmdk"
            modalTitle="اختيار السمة"
            value={theme}
            onValueChange={handleThemeChange}
            options={themeOptions}
          />
        </SettingCard>

        <SettingCard
          icon={<Type />}
          title="الخط"
          description="تغيير نوع الخط المستخدم"
        >
          <SettingSelect
            id="settings-appearance-font"
            variant="cmdk"
            modalTitle="اختيار الخط"
            value="Cairo" // Default or from store
            onValueChange={(v) => {}} 
            options={fontOptions}
          />
        </SettingCard>

        <SettingCard
          icon={<Type />}
          title="حجم الخط"
        >
          <SettingSelect
            id="settings-appearance-font-size"
            variant="cmdk"
            modalTitle="اختيار حجم الخط"
            value={fontSize}
            onValueChange={(v) => updateSetting("fontSize", v as any)}
            options={[
              { value: "small", label: "صغير" },
              { value: "medium", label: "متوسط" },
              { value: "large", label: "كبير" },
            ]}
          />
        </SettingCard>
      </SettingGroup>
    </div>
  );
}
