"use client";

import * as React from "react";
import { SettingsRow } from "../components/SettingsRow";
import { SettingSelect } from "../components/SettingSelect";
import { SettingToggle } from "../components/SettingToggle";
import { useSettingsStore } from "../store/settingsStore";
import { getProfile, updateProfile } from "@/lib/services/userProfileService";

/* ── Options ── */
const styleOptions = [
  { value: "formal", label: "رسمي" },
  { value: "informal", label: "غير رسمي" },
  { value: "technical", label: "تقني" },
  { value: "simple", label: "بسيط" },
];

const creativityOptions = [
  { value: "low", label: "منخفض" },
  { value: "medium", label: "متوسط" },
  { value: "high", label: "مرتفع" },
];

const detailOptions = [
  { value: "concise", label: "مختصر" },
  { value: "balanced", label: "متوازن" },
  { value: "detailed", label: "مفصّل" },
];

const toneOptions = [
  { value: "neutral", label: "محايد" },
  { value: "warm", label: "دافئ" },
  { value: "professional", label: "مهني" },
];

const lengthOptions = [
  { value: "short", label: "قصير" },
  { value: "medium", label: "متوسط" },
  { value: "long", label: "طويل" },
];

export function PersonalizationSection() {
  const store = useSettingsStore();

  /* ── Firestore-backed fields ── */
  const [preferredName, setPreferredName] = React.useState("");
  const [occupation, setOccupation] = React.useState("");
  const [additionalInfo, setAdditionalInfo] = React.useState("");
  const [customInstructions, setCustomInstructions] = React.useState("");
  const [loaded, setLoaded] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    getProfile().then((p) => {
      if (p) {
        setPreferredName(p.preferredName || "");
        setOccupation(p.occupation || "");
        setAdditionalInfo(p.additionalInfo || "");
        setCustomInstructions(p.customInstructions || "");
      }
      setLoaded(true);
    });
  }, []);

  const saveField = async (field: string, value: string) => {
    setSaving(true);
    await updateProfile({ [field]: value } as any);
    // Also sync to local store
    if (field === "customInstructions") store.updateSetting("customInstructions", value);
    if (field === "preferredName") store.updateSetting("preferredName", value);
    if (field === "occupation") store.updateSetting("occupation", value);
    if (field === "additionalInfo") store.updateSetting("additionalInfo", value);
    setSaving(false);
  };

  return (
    <div className="space-y-1">
      <h3 className="text-lg font-semibold text-white/90 mb-4">تخصيص</h3>

      {/* ── الأسلوب / النبرة ── */}
      <SettingsRow
        title="الأسلوب"
        description="أسلوب الردود المفضّل"
        control={
          <SettingSelect
            id="settings-pers-style"
            value={store.stylePreference}
            onValueChange={(v) => store.updateSetting("stylePreference", v as any)}
            options={styleOptions}
          />
        }
      />

      {/* ── السمات الأربعة ── */}
      <div className="pt-2 pb-1">
        <p className="text-xs font-medium text-white/50 px-4 mb-2">السمات</p>
      </div>

      <SettingsRow
        title="الإبداع"
        control={
          <SettingSelect
            id="settings-pers-creativity"
            value={store.traitCreativity}
            onValueChange={(v) => store.updateSetting("traitCreativity", v as any)}
            options={creativityOptions}
          />
        }
      />
      <SettingsRow
        title="التفصيل"
        control={
          <SettingSelect
            id="settings-pers-detail"
            value={store.traitDetail}
            onValueChange={(v) => store.updateSetting("traitDetail", v as any)}
            options={detailOptions}
          />
        }
      />
      <SettingsRow
        title="النبرة"
        control={
          <SettingSelect
            id="settings-pers-tone"
            value={store.traitTone}
            onValueChange={(v) => store.updateSetting("traitTone", v as any)}
            options={toneOptions}
          />
        }
      />
      <SettingsRow
        title="الطول"
        control={
          <SettingSelect
            id="settings-pers-length"
            value={store.traitLength}
            onValueChange={(v) => store.updateSetting("traitLength", v as any)}
            options={lengthOptions}
          />
        }
      />

      {/* ── التعليمات المخصصة ── */}
      <div className="pt-4">
        <p className="text-xs font-medium text-white/50 px-4 mb-2">التعليمات المخصصة</p>
        <div className="px-4">
          <textarea
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            onBlur={() => saveField("customInstructions", customInstructions)}
            placeholder="أخبر المساعد كيف تريده أن يستجيب..."
            rows={3}
            dir="rtl"
            className="w-full bg-white/8 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/90 placeholder:text-white/40 resize-none focus:border-teal-500/40 focus:outline-none"
          />
        </div>
      </div>

      {/* ── معلومات عنك ── */}
      <div className="pt-4">
        <p className="text-xs font-medium text-white/50 px-4 mb-2">معلومات عنك</p>
      </div>

      <div className="px-4 space-y-3">
        <div>
          <label className="text-xs text-white/60 mb-1 block text-right">الاسم المفضّل</label>
          <input
            value={preferredName}
            onChange={(e) => setPreferredName(e.target.value)}
            onBlur={() => saveField("preferredName", preferredName)}
            placeholder="كيف تحب أن يناديك المساعد؟"
            dir="rtl"
            className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/40 focus:border-teal-500/40 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-white/60 mb-1 block text-right">الوظيفة</label>
          <input
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
            onBlur={() => saveField("occupation", occupation)}
            placeholder="مثال: مهندس برمجيات، محلل مالي..."
            dir="rtl"
            className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder:text-white/40 focus:border-teal-500/40 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-white/60 mb-1 block text-right">معلومات إضافية</label>
          <textarea
            value={additionalInfo}
            onChange={(e) => setAdditionalInfo(e.target.value)}
            onBlur={() => saveField("additionalInfo", additionalInfo)}
            placeholder="أي معلومات إضافية تساعد المساعد على فهمك..."
            rows={2}
            dir="rtl"
            className="w-full bg-white/8 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/90 placeholder:text-white/40 resize-none focus:border-teal-500/40 focus:outline-none"
          />
        </div>
      </div>

      {/* ── الذاكرة ── */}
      <div className="pt-4">
        <p className="text-xs font-medium text-white/50 px-4 mb-2">الذاكرة</p>
      </div>

      <SettingsRow
        title="تفعيل الذاكرة"
        description="يتذكر المساعد تفاصيل من محادثاتك"
        control={
          <SettingToggle
            checked={store.memoryEnabled}
            onCheckedChange={(v) => store.updateSetting("memoryEnabled", v)}
            size="sm"
          />
        }
      />

      <SettingsRow
        title="تحسين النموذج"
        description="السماح باستخدام محادثاتك لتحسين النموذج"
        control={
          <SettingToggle
            checked={store.improveModelForAll}
            onCheckedChange={(v) => store.updateSetting("improveModelForAll", v)}
            size="sm"
          />
        }
      />

      {/* ── متقدم ── */}
      <div className="pt-4">
        <p className="text-xs font-medium text-white/50 px-4 mb-2">متقدم</p>
      </div>

      <SettingsRow
        title="البحث في الويب"
        description="السماح للمساعد بالبحث في الإنترنت"
        control={
          <SettingToggle
            checked={store.webSearchEnabled}
            onCheckedChange={(v) => store.updateSetting("webSearchEnabled", v)}
            size="sm"
          />
        }
      />

      <SettingsRow
        title="Canvas"
        description="تفعيل محرر Canvas التفاعلي"
        control={
          <SettingToggle
            checked={store.canvasEnabled}
            onCheckedChange={(v) => store.updateSetting("canvasEnabled", v)}
            size="sm"
          />
        }
      />

      {saving && (
        <p className="text-xs text-teal-400/80 text-center pt-2">جاري الحفظ...</p>
      )}
    </div>
  );
}
