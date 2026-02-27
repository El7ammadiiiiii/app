"use client";

import * as React from "react";
import { Monitor, Sun, Moon, Globe, User, Mail } from "lucide-react";
import { SettingsRow } from "../components/SettingsRow";
import { SettingSelect } from "../components/SettingSelect";
import { useSettingsStore } from "../store/settingsStore";
import { useTheme } from "next-themes";
import { getProfile, updateProfile } from "@/lib/services/userProfileService";
import type { ThemeMode } from "../types/settings";

/* ── Language list (reused from LanguageSection) ── */
const languages = [
  { value: "ar", label: "العربية" },
  { value: "en", label: "English" },
  { value: "zh", label: "中文" },
  { value: "hi", label: "हिन्दी" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "bn", label: "বাংলা" },
  { value: "pt", label: "Português" },
  { value: "ru", label: "Русский" },
  { value: "ur", label: "اردو" },
  { value: "id", label: "Bahasa Indonesia" },
  { value: "de", label: "Deutsch" },
  { value: "ja", label: "日本語" },
  { value: "tr", label: "Türkçe" },
  { value: "ko", label: "한국어" },
  { value: "vi", label: "Tiếng Việt" },
  { value: "it", label: "Italiano" },
  { value: "th", label: "ไทย" },
  { value: "fa", label: "فارسی" },
  { value: "pl", label: "Polski" },
  { value: "uk", label: "Українська" },
  { value: "ro", label: "Română" },
  { value: "nl", label: "Nederlands" },
  { value: "el", label: "Ελληνικά" },
  { value: "hu", label: "Magyar" },
  { value: "cs", label: "Čeština" },
  { value: "sv", label: "Svenska" },
  { value: "da", label: "Dansk" },
  { value: "fi", label: "Suomi" },
  { value: "no", label: "Norsk" },
  { value: "he", label: "עברית" },
  { value: "ms", label: "Bahasa Melayu" },
];

const themeOptions = [
  { value: "light", label: "فاتح", icon: <Sun className="w-3.5 h-3.5" /> },
  { value: "dark", label: "داكن", icon: <Moon className="w-3.5 h-3.5" /> },
  { value: "system", label: "النظام", icon: <Monitor className="w-3.5 h-3.5" /> },
];

export function GeneralSection() {
  const { setTheme } = useTheme();
  const { theme, language, updateSetting } = useSettingsStore();

  // ── Profile state (real Firestore) ──
  const [displayName, setDisplayName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [editingName, setEditingName] = React.useState(false);
  const [nameInput, setNameInput] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    getProfile().then((p) => {
      if (p) {
        setDisplayName(p.displayName || "");
        setEmail(p.email || "");
      }
    });
  }, []);

  const handleThemeChange = (v: string) => {
    updateSetting("theme", v as ThemeMode);
    setTheme(v);
  };

  const handleLanguageChange = (v: string) => {
    updateSetting("language", v);
  };

  const saveName = async () => {
    if (!nameInput.trim()) return;
    setSaving(true);
    const ok = await updateProfile({ displayName: nameInput.trim() });
    if (ok) setDisplayName(nameInput.trim());
    setSaving(false);
    setEditingName(false);
  };

  return (
    <div className="space-y-1">
      <h3 className="text-lg font-semibold text-white/90 mb-4">عام</h3>

      {/* المظهر */}
      <SettingsRow
        title="المظهر"
        control={
          <SettingSelect
            id="settings-general-theme"
            value={theme}
            onValueChange={handleThemeChange}
            options={themeOptions}
          />
        }
      />

      {/* اللغة */}
      <SettingsRow
        title="اللغة"
        control={
          <SettingSelect
            id="settings-general-language"
            variant="cmdk"
            modalTitle="اختيار اللغة"
            value={language}
            onValueChange={handleLanguageChange}
            options={languages}
          />
        }
      />

      {/* الاسم — editable inline */}
      <SettingsRow
        title="الاسم"
        description={editingName ? undefined : displayName || "لم يتم تحديده"}
        icon={<User className="w-4 h-4" />}
        control={
          editingName ? (
            <div className="flex items-center gap-2">
              <button
                onClick={saveName}
                disabled={saving}
                className="text-xs text-teal-400 hover:text-teal-300 font-medium disabled:opacity-50"
              >
                {saving ? "جاري الحفظ..." : "حفظ"}
              </button>
              <input
                autoFocus
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveName()}
                className="w-[140px] bg-white/10 border border-white/12 rounded-lg px-2.5 py-1.5 text-sm text-white/90 placeholder:text-white/40 focus:border-teal-500/40 focus:outline-none text-right"
                placeholder="أدخل اسمك"
                dir="rtl"
              />
            </div>
          ) : (
            <button
              onClick={() => { setNameInput(displayName); setEditingName(true); }}
              className="text-xs text-teal-400 hover:text-teal-300 font-medium"
            >
              تعديل
            </button>
          )
        }
      />

      {/* البريد الإلكتروني — read only */}
      <SettingsRow
        title="البريد الإلكتروني"
        description={email || "غير مربوط"}
        icon={<Mail className="w-4 h-4" />}
      />
    </div>
  );
}
