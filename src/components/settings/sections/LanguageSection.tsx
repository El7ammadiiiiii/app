"use client";

import * as React from "react";
import { Check, Search, Globe } from "lucide-react";
import { useSettingsStore } from "../store/settingsStore";
import { SettingGroup } from "../components/SettingGroup";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  dir?: "ltr" | "rtl";
}

const languages: LanguageOption[] = [
  { code: "ar", name: "Arabic", nativeName: "العربية", dir: "rtl" },
  { code: "en", name: "English", nativeName: "English" },
  { code: "zh", name: "Chinese", nativeName: "中文" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
  { code: "ru", name: "Russian", nativeName: "Русский" },
  { code: "ur", name: "Urdu", nativeName: "اردو", dir: "rtl" },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "sw", name: "Swahili", nativeName: "Kiswahili" },
  { code: "mr", name: "Marathi", nativeName: "मराठी" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்" },
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "th", name: "Thai", nativeName: "ไทย" },
  { code: "fa", name: "Persian", nativeName: "فارسی", dir: "rtl" },
  { code: "pl", name: "Polish", nativeName: "Polski" },
  { code: "uk", name: "Ukrainian", nativeName: "Українська" },
  { code: "ro", name: "Romanian", nativeName: "Română" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands" },
  { code: "el", name: "Greek", nativeName: "Ελληνικά" },
  { code: "hu", name: "Hungarian", nativeName: "Magyar" },
  { code: "cs", name: "Czech", nativeName: "Čeština" },
  { code: "sv", name: "Swedish", nativeName: "Svenska" },
  { code: "bg", name: "Bulgarian", nativeName: "Български" },
  { code: "da", name: "Danish", nativeName: "Dansk" },
  { code: "fi", name: "Finnish", nativeName: "Suomi" },
  { code: "sk", name: "Slovak", nativeName: "Slovenčina" },
  { code: "no", name: "Norwegian", nativeName: "Norsk" },
  { code: "he", name: "Hebrew", nativeName: "עברית", dir: "rtl" },
  { code: "hr", name: "Croatian", nativeName: "Hrvatski" },
  { code: "sr", name: "Serbian", nativeName: "Српски" },
  { code: "sl", name: "Slovenian", nativeName: "Slovenščina" },
  { code: "lt", name: "Lithuanian", nativeName: "Lietuvių" },
  { code: "lv", name: "Latvian", nativeName: "Latviešu" },
  { code: "et", name: "Estonian", nativeName: "Eesti" },
  { code: "ms", name: "Malay", nativeName: "Bahasa Melayu" },
  { code: "tl", name: "Tagalog", nativeName: "Tagalog" },
  { code: "am", name: "Amharic", nativeName: "አማርኛ" },
  { code: "az", name: "Azerbaijani", nativeName: "Azərbaycan" },
  { code: "ka", name: "Georgian", nativeName: "ქართული" },
  { code: "hy", name: "Armenian", nativeName: "Հայերեն" },
  { code: "kk", name: "Kazakh", nativeName: "Қазақша" },
  { code: "uz", name: "Uzbek", nativeName: "Oʻzbek" },
  { code: "km", name: "Khmer", nativeName: "ខ្មែរ" },
  { code: "my", name: "Burmese", nativeName: "မြန်မာစာ" },
  { code: "lo", name: "Lao", nativeName: "ລາວ" },
  { code: "si", name: "Sinhala", nativeName: "සිංහල" },
  { code: "ne", name: "Nepali", nativeName: "नेपाली" },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം" },
  { code: "is", name: "Icelandic", nativeName: "Íslenska" },
  { code: "ga", name: "Irish", nativeName: "Gaeilge" },
  { code: "af", name: "Afrikaans", nativeName: "Afrikaans" },
  { code: "sq", name: "Albanian", nativeName: "Shqip" },
  { code: "bs", name: "Bosnian", nativeName: "Bosanski" },
  { code: "mk", name: "Macedonian", nativeName: "Македонски" },
  { code: "mt", name: "Maltese", nativeName: "Malti" },
  { code: "cy", name: "Welsh", nativeName: "Cymraeg" },
];

export function LanguageSection() {
  const { language, updateSetting } = useSettingsStore();
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredLanguages = languages.filter(
    (lang) =>
      lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lang.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <SettingGroup
        title="لغة التطبيق"
        description="اختر اللغة التي تفضل استخدامها في الواجهة"
      >
        {/* Search Input */}
        <div className="relative mb-4">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن لغة..."
            className="w-full pr-9 pl-4 py-2 rounded-lg glass-lite-input text-[13px] focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
          />
        </div>

        {/* Language Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
          {filteredLanguages.map((lang) => (
            <motion.button
              key={lang.code}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => updateSetting("language", lang.code)}
              className={cn(
                "flex items-center justify-between p-2.5 rounded-lg border text-right transition-all",
                language === lang.code
                  ? "bg-primary/10 border-primary/50 shadow-sm"
                  : "glass-lite border-border/40 hover:border-border"
              )}
            >
              <div className="flex flex-col">
                <span className={cn(
                  "text-[12px] sm:text-sm font-medium",
                  language === lang.code ? "text-primary" : "text-foreground"
                )}>
                  {lang.nativeName}
                </span>
                <span className="hidden sm:block text-xs text-muted-foreground">
                  {lang.name}
                </span>
              </div>
              {language === lang.code && (
                <Check className="w-4 h-4 text-primary" />
              )}
            </motion.button>
          ))}
          
          {filteredLanguages.length === 0 && (
            <div className="col-span-full py-8 text-center text-muted-foreground">
              <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>لا توجد نتائج</p>
            </div>
          )}
        </div>
      </SettingGroup>

      <div className="glass-lite rounded-lg p-3 sm:p-4 border border-border/40">
        <div className="flex items-start gap-3">
          <Globe className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-foreground">ملاحظة حول الترجمة</h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              يتم ترجمة المحتوى باستخدام نماذج الذكاء الاصطناعي المتقدمة. قد تحتوي بعض الترجمات على أخطاء طفيفة. يمكنك دائماً التبديل إلى اللغة الإنجليزية للحصول على النص الأصلي.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
