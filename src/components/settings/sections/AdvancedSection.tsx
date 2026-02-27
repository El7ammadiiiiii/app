"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { 
  Cpu,
  Database,
  Zap,
  Globe,
  RefreshCw,
  Trash2,
  Download,
  FlaskConical,
  Network,
} from "lucide-react";
import { 
  SettingCard, 
  SettingToggle, 
  SettingSelect,
  SettingGroup,
  ConfirmModal,
} from "../components";
import { useSettingsStore } from "../store/settingsStore";

const updateChannelOptions = [
  { value: "stable", label: "مستقر" },
  { value: "beta", label: "تجريبي (Beta)" },
];

const memoryLimitOptions = [
  { value: "256MB", label: "256 ميجابايت" },
  { value: "512MB", label: "512 ميجابايت" },
  { value: "1GB", label: "1 جيجابايت" },
];

const proxyOptions = [
  { value: "false", label: "معطّل" },
  { value: "true", label: "مفعّل" },
];

export function AdvancedSection() {
  const {
    preloadData,
    compressImages,
    memoryLimit,
    experimentalFeatures,
    updateChannel,
    useProxy,
    updateSetting,
  } = useSettingsStore();

  const [showClearModal, setShowClearModal] = React.useState(false);
  const [cacheSize, setCacheSize] = React.useState("245 MB");

  return (
    <div className="space-y-6">


      {/* Performance */}
      <SettingGroup title="الأداء">
        <SettingCard
          icon={<Zap className="w-5 h-5" />}
          title="التحميل المسبق للبيانات"
          description="تحميل البيانات مسبقاً لتسريع الأداء"
        >
          <SettingToggle
            checked={preloadData}
            onCheckedChange={(v) => updateSetting("preloadData", v)}
          />
        </SettingCard>

        <SettingCard
          icon={<Cpu className="w-5 h-5" />}
          title="ضغط الصور"
          description="ضغط الصور لتوفير المساحة"
        >
          <SettingToggle
            checked={compressImages}
            onCheckedChange={(v) => updateSetting("compressImages", v)}
          />
        </SettingCard>

        <SettingSelect
          variant="cmdk"
          id="settings-advanced-memory-limit"
          modalTitle="حد الذاكرة"
          label="حد الذاكرة"
          description="الحد الأقصى لاستخدام الذاكرة"
          value={memoryLimit}
          onValueChange={(v) => updateSetting("memoryLimit", v as any)}
          options={memoryLimitOptions}
        />
      </SettingGroup>

      {/* Cache & Storage */}
      <SettingGroup title="الذاكرة المؤقتة والتخزين">
        <div className="p-4 rounded-xl bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Database className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">الذاكرة المؤقتة</h4>
                <p className="text-sm text-muted-foreground">الحجم الحالي: {cacheSize}</p>
              </div>
            </div>
                <button
                  onClick={() => setShowClearModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--glass-bg)] backdrop-blur-xl border border-destructive text-destructive text-sm transition-colors hover:bg-destructive hover:text-white"
                >
              <Trash2 className="w-4 h-4" />
              <span>مسح</span>
            </button>
          </div>
        </div>
      </SettingGroup>

      {/* Updates */}
      <SettingGroup title="التحديثات">
        <SettingSelect
          variant="cmdk"
          id="settings-advanced-update-channel"
          modalTitle="قناة التحديث"
          label="قناة التحديث"
          description="اختر نوع التحديثات التي تريد تلقيها"
          value={updateChannel}
          onValueChange={(v) => updateSetting("updateChannel", v as any)}
          options={updateChannelOptions}
        />
      </SettingGroup>

      {/* Network */}
      <SettingGroup title="الشبكة">
        <SettingCard
          icon={<Globe className="w-5 h-5" />}
          title="استخدام Proxy"
          description="تفعيل الاتصال عبر proxy"
        >
          <SettingToggle
            checked={useProxy}
            onCheckedChange={(v) => updateSetting("useProxy", v)}
          />
        </SettingCard>
      </SettingGroup>

      {/* Experimental */}
      <SettingGroup title="ميزات تجريبية">
        <div className="p-4 rounded-xl bg-yellow-100 border border-yellow-400 mb-4">
          <div className="flex items-start gap-3">
            <FlaskConical className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-600">تحذير</h4>
              <p className="text-sm text-yellow-600/80">
                الميزات التجريبية قد تكون غير مستقرة وقد تتغير أو تُزال في أي وقت.
              </p>
            </div>
          </div>
        </div>

        <SettingCard
          icon={<FlaskConical className="w-5 h-5" />}
          title="تفعيل الميزات التجريبية"
          description="الوصول المبكر للميزات الجديدة"
        >
          <SettingToggle
            checked={experimentalFeatures}
            onCheckedChange={(v) => updateSetting("experimentalFeatures", v)}
          />
        </SettingCard>
      </SettingGroup>

      <ConfirmModal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={() => {
          setCacheSize("0 MB");
          setShowClearModal(false);
        }}
        title="مسح الذاكرة المؤقتة"
        description="سيتم حذف جميع البيانات المخزنة مؤقتاً. قد يؤدي هذا إلى بطء في التحميل مؤقتاً."
        confirmText="مسح الكاش"
        type="warning"
      />
    </div>
  );
}
