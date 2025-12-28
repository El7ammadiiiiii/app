"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { 
  Bell,
  BellOff,
  Mail,
  Smartphone,
  Monitor,
  Volume2,
  VolumeX,
  Clock,
  Moon,
  Sun,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Calendar,
} from "lucide-react";
import { 
  SettingCard, 
  SettingToggle, 
  SettingSelect,
  SettingGroup,
  SettingSlider,
} from "../components";
import { useSettingsStore } from "../store/settingsStore";

const notificationTypes = [
  { id: "notifyNewMessage", label: "رسائل المساعد", icon: MessageSquare },
  { id: "notifyPriceAlerts", label: "تنبيهات الأسعار", icon: TrendingUp },
  { id: "notifySystemUpdates", label: "تحديثات النظام", icon: Sparkles },
  { id: "notifyTips", label: "النصائح والتلميحات", icon: Calendar },
];

export function NotificationsSection() {
  const {
    inAppNotifications,
    pushNotifications,
    emailNotifications,
    soundEnabled,
    doNotDisturb,
    doNotDisturbStart,
    doNotDisturbEnd,
    dailyDigest,
    notifyNewMessage,
    notifyPriceAlerts,
    notifySystemUpdates,
    notifyTips,
    updateSetting,
  } = useSettingsStore();

  return (
    <div className="space-y-6">
      {/* Master Toggle */}
      <div className="p-4 rounded-xl bg-[var(--glass-bg)] backdrop-blur-xl border border-primary">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {inAppNotifications ? (
              <Bell className="w-6 h-6 text-primary" />
            ) : (
              <BellOff className="w-6 h-6 text-muted-foreground" />
            )}
            <div>
              <h3 className="font-semibold text-foreground">الإشعارات داخل التطبيق</h3>
              <p className="text-sm text-muted-foreground">
                {inAppNotifications ? "مفعّلة" : "معطّلة"}
              </p>
            </div>
          </div>
          <SettingToggle
            checked={inAppNotifications}
            onCheckedChange={(v) => updateSetting("inAppNotifications", v)}
          />
        </div>
      </div>

      {/* Channels */}
      <SettingGroup title="قنوات الإشعارات">
        <SettingCard
          icon={<Smartphone className="w-5 h-5" />}
          title="إشعارات الدفع"
          description="إشعارات على سطح المكتب أو الهاتف"
        >
          <SettingToggle
            checked={pushNotifications}
            onCheckedChange={(v) => updateSetting("pushNotifications", v)}
          />
        </SettingCard>

        <SettingCard
          icon={<Mail className="w-5 h-5" />}
          title="إشعارات البريد"
          description="إرسال ملخص على البريد الإلكتروني"
        >
          <SettingToggle
            checked={emailNotifications}
            onCheckedChange={(v) => updateSetting("emailNotifications", v)}
          />
        </SettingCard>

        {emailNotifications && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
          >
            <SettingCard
              icon={<Clock className="w-5 h-5" />}
              title="ملخص يومي"
              description="إرسال ملخص يومي بالأنشطة"
            >
              <SettingToggle
                checked={dailyDigest}
                onCheckedChange={(v) => updateSetting("dailyDigest", v)}
              />
            </SettingCard>
          </motion.div>
        )}
      </SettingGroup>

      {/* Notification Types */}
      <SettingGroup title="أنواع الإشعارات">
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)]">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">رسائل المساعد</span>
            </div>
            <SettingToggle
              checked={notifyNewMessage}
              onCheckedChange={(v) => updateSetting("notifyNewMessage", v)}
            />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)]">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">تنبيهات الأسعار</span>
            </div>
            <SettingToggle
              checked={notifyPriceAlerts}
              onCheckedChange={(v) => updateSetting("notifyPriceAlerts", v)}
            />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)]">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">تحديثات النظام</span>
            </div>
            <SettingToggle
              checked={notifySystemUpdates}
              onCheckedChange={(v) => updateSetting("notifySystemUpdates", v)}
            />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)]">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">النصائح والتلميحات</span>
            </div>
            <SettingToggle
              checked={notifyTips}
              onCheckedChange={(v) => updateSetting("notifyTips", v)}
            />
          </div>
        </div>
      </SettingGroup>

      {/* Sound Settings */}
      <SettingGroup title="الصوت">
        <SettingCard
          icon={soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          title="أصوات الإشعارات"
          description="تشغيل صوت عند وصول إشعار"
        >
          <SettingToggle
            checked={soundEnabled}
            onCheckedChange={(v) => updateSetting("soundEnabled", v)}
          />
        </SettingCard>
      </SettingGroup>

      {/* Do Not Disturb */}
      <SettingGroup title="وضع عدم الإزعاج">
        <SettingCard
          icon={<Moon className="w-5 h-5" />}
          title="عدم الإزعاج"
          description="إيقاف الإشعارات مؤقتاً"
        >
          <SettingToggle
            checked={doNotDisturb}
            onCheckedChange={(v) => updateSetting("doNotDisturb", v)}
          />
        </SettingCard>

        {doNotDisturb && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="grid grid-cols-2 gap-4"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Moon className="w-4 h-4" />
                من
              </label>
              <input
                type="time"
                value={doNotDisturbStart}
                onChange={(e) => updateSetting("doNotDisturbStart", e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-muted border border-border
                         text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Sun className="w-4 h-4" />
                إلى
              </label>
              <input
                type="time"
                value={doNotDisturbEnd}
                onChange={(e) => updateSetting("doNotDisturbEnd", e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-muted border border-border
                         text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              />
            </div>
          </motion.div>
        )}
      </SettingGroup>
    </div>
  );
}
