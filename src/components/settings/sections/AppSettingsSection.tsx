"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Settings,
  Monitor,
  Cpu,
  Accessibility,
  Power,
  Minimize2,
  RefreshCw,
  Zap,
  Eye,
  Keyboard,
  Volume2,
} from "lucide-react";
import { 
  SettingCard, 
  SettingToggle, 
  SettingSelect,
  SettingGroup,
  SettingsTabs,
} from "../components";
import { useSettingsStore } from "../store/settingsStore";

const tabs = [
  { id: "general", label: "عام", icon: <Settings className="w-4 h-4" /> },
  { id: "performance", label: "الأداء", icon: <Cpu className="w-4 h-4" /> },
  { id: "accessibility", label: "إمكانية الوصول", icon: <Accessibility className="w-4 h-4" /> },
];

const defaultPageOptions = [
  { value: "dashboard", label: "لوحة القيادة" },
  { value: "chat", label: "المحادثات" },
  { value: "analysis", label: "التحليل" },
];

const qualityOptions = [
  { value: "low", label: "منخفض" },
  { value: "medium", label: "متوسط" },
  { value: "high", label: "عالي" },
];

export function AppSettingsSection() {
  const [activeTab, setActiveTab] = React.useState("general");
  const {
    defaultPage,
    openLastConversation,
    startMinimized,
    autoUpdate,
    notifyBeforeUpdate,
    hardwareAcceleration,
    lowPowerMode,
    quality,
    reducedMotion,
    highContrast,
    screenReader,
    swipeNavigation,
    landscapeMode,
    updateSetting,
  } = useSettingsStore();

  return (
    <div className="space-y-6">
      <SettingsTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {/* General Tab */}
          {activeTab === "general" && (
            <div className="space-y-6">
              <SettingGroup title="بدء التشغيل">
                <SettingSelect
                  label="الصفحة الافتراضية"
                  description="ماذا يظهر عند فتح التطبيق"
                  value={defaultPage}
                  onValueChange={(v) => updateSetting("defaultPage", v as "dashboard" | "chat" | "markets")}
                  options={defaultPageOptions}
                />

                <SettingCard
                  icon={<Power className="w-5 h-5" />}
                  title="فتح آخر محادثة"
                  description="استئناف آخر محادثة عند فتح التطبيق"
                >
                  <SettingToggle
                    checked={openLastConversation}
                    onCheckedChange={(v) => updateSetting("openLastConversation", v)}
                  />
                </SettingCard>

                <SettingCard
                  icon={<Minimize2 className="w-5 h-5" />}
                  title="البدء مصغراً"
                  description="تشغيل التطبيق في الخلفية"
                >
                  <SettingToggle
                    checked={startMinimized}
                    onCheckedChange={(v) => updateSetting("startMinimized", v)}
                  />
                </SettingCard>
              </SettingGroup>

              <SettingGroup title="التحديثات">
                <SettingCard
                  icon={<RefreshCw className="w-5 h-5" />}
                  title="التحديث التلقائي"
                  description="تحديث التطبيق تلقائياً عند توفر إصدار جديد"
                >
                  <SettingToggle
                    checked={autoUpdate}
                    onCheckedChange={(v) => updateSetting("autoUpdate", v)}
                  />
                </SettingCard>

                <SettingCard
                  icon={<RefreshCw className="w-5 h-5" />}
                  title="الإشعار قبل التحديث"
                  description="إظهار إشعار قبل بدء التحديث"
                >
                  <SettingToggle
                    checked={notifyBeforeUpdate}
                    onCheckedChange={(v) => updateSetting("notifyBeforeUpdate", v)}
                  />
                </SettingCard>
              </SettingGroup>
            </div>
          )}

          {/* Performance Tab */}
          {activeTab === "performance" && (
            <div className="space-y-6">
              <SettingGroup title="الأداء">
                <SettingCard
                  icon={<Zap className="w-5 h-5" />}
                  title="تسريع العتاد"
                  description="استخدام كرت الشاشة لتحسين الأداء"
                >
                  <SettingToggle
                    checked={hardwareAcceleration}
                    onCheckedChange={(v) => updateSetting("hardwareAcceleration", v)}
                  />
                </SettingCard>

                <SettingCard
                  icon={<Cpu className="w-5 h-5" />}
                  title="وضع توفير الطاقة"
                  description="تقليل استهلاك الموارد على البطارية"
                >
                  <SettingToggle
                    checked={lowPowerMode}
                    onCheckedChange={(v) => updateSetting("lowPowerMode", v)}
                  />
                </SettingCard>

                <SettingSelect
                  label="جودة العرض"
                  description="مستوى جودة الرسومات والتأثيرات"
                  value={quality}
                  onValueChange={(v) => updateSetting("quality", v as "low" | "medium" | "high")}
                  options={qualityOptions}
                />

                <SettingCard
                  icon={<Monitor className="w-5 h-5" />}
                  title="تقليل الحركة"
                  description="تعطيل الانيميشن لتحسين الأداء"
                >
                  <SettingToggle
                    checked={reducedMotion}
                    onCheckedChange={(v) => updateSetting("reducedMotion", v)}
                  />
                </SettingCard>
              </SettingGroup>

              <SettingGroup title="الذاكرة">
                <div className="p-4 rounded-xl bg-card border border-border">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-medium text-foreground">استخدام الذاكرة</h4>
                      <p className="text-sm text-muted-foreground">الاستهلاك الحالي</p>
                    </div>
                    <span className="text-2xl font-bold text-primary">256 MB</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: "25%" }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">256 MB من 1 GB كحد أقصى</p>
                </div>
              </SettingGroup>
            </div>
          )}

          {/* Accessibility Tab */}
          {activeTab === "accessibility" && (
            <div className="space-y-6">
              <SettingGroup title="العرض">
                <SettingCard
                  icon={<Eye className="w-5 h-5" />}
                  title="تباين عالي"
                  description="زيادة التباين لتحسين القراءة"
                >
                  <SettingToggle
                    checked={highContrast}
                    onCheckedChange={(v) => updateSetting("highContrast", v)}
                  />
                </SettingCard>

                <SettingCard
                  icon={<Monitor className="w-5 h-5" />}
                  title="تقليل الحركة"
                  description="تعطيل الانيميشن والتأثيرات"
                >
                  <SettingToggle
                    checked={reducedMotion}
                    onCheckedChange={(v) => updateSetting("reducedMotion", v)}
                  />
                </SettingCard>
              </SettingGroup>

              <SettingGroup title="قارئ الشاشة">
                <SettingCard
                  icon={<Volume2 className="w-5 h-5" />}
                  title="تحسين لقارئ الشاشة"
                  description="تحسين التوافق مع برامج قراءة الشاشة"
                >
                  <SettingToggle
                    checked={screenReader}
                    onCheckedChange={(v) => updateSetting("screenReader", v)}
                  />
                </SettingCard>
              </SettingGroup>

              <SettingGroup title="التنقل">
                <SettingCard
                  icon={<Keyboard className="w-5 h-5" />}
                  title="التنقل بالسحب"
                  description="السماح بالتنقل باستخدام السحب"
                >
                  <SettingToggle
                    checked={swipeNavigation}
                    onCheckedChange={(v) => updateSetting("swipeNavigation", v)}
                  />
                </SettingCard>

                <SettingCard
                  icon={<Monitor className="w-5 h-5" />}
                  title="الوضع الأفقي"
                  description="دعم العرض الأفقي"
                >
                  <SettingToggle
                    checked={landscapeMode}
                    onCheckedChange={(v) => updateSetting("landscapeMode", v)}
                  />
                </SettingCard>
              </SettingGroup>

              <div className="p-4 rounded-xl bg-card border border-border">
                <h4 className="font-medium text-foreground mb-3">اختصارات مهمة</h4>
                <div className="space-y-2">
                  {[
                    { keys: ["Ctrl", "N"], action: "محادثة جديدة" },
                    { keys: ["Ctrl", "K"], action: "البحث السريع" },
                    { keys: ["Ctrl", ","], action: "الإعدادات" },
                    { keys: ["Esc"], action: "إغلاق النافذة" },
                  ].map((shortcut, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{shortcut.action}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, j) => (
                          <React.Fragment key={j}>
                            <kbd className="px-2 py-1 rounded bg-card border border-border 
                                          text-xs font-mono text-foreground">
                              {key}
                            </kbd>
                            {j < shortcut.keys.length - 1 && (
                              <span className="text-muted-foreground">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
