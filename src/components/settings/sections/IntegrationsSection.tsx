"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Link2,
  Key,
  Webhook,
  Twitter,
  Send,
  MessageCircle,
  Plus,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Check,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import {
  SettingToggle,
  SettingGroup,
  SettingsTabs,
  ConfirmModal,
} from "../components";

const tabs = [
  { id: "services", label: "الخدمات", icon: <Link2 className="w-4 h-4" /> },
  { id: "api-keys", label: "مفاتيح API", icon: <Key className="w-4 h-4" /> },
  { id: "webhooks", label: "Webhooks", icon: <Webhook className="w-4 h-4" /> },
];

const services = [
  {
    id: "twitter",
    name: "تويتر / X",
    description: "مشاركة التحليلات والتنبيهات",
    icon: Twitter,
    color: "bg-black",
    connected: true,
    username: "@trader_ali",
  },
  {
    id: "telegram",
    name: "تيليجرام",
    description: "إشعارات فورية وتنبيهات",
    icon: Send,
    color: "bg-blue-500",
    connected: true,
    username: "Ali_Trader",
  },
  {
    id: "discord",
    name: "ديسكورد",
    description: "مشاركة مع المجتمع",
    icon: MessageCircle,
    color: "bg-indigo-500",
    connected: false,
  },
];

const apiKeys = [
  {
    id: "1",
    name: "Trading Bot",
    key: "sk-xxxxx...xxxxx",
    created: "2024-01-15",
    lastUsed: "منذ ساعة",
  },
  {
    id: "2",
    name: "Webhook Integration",
    key: "sk-xxxxx...xxxxx",
    created: "2024-02-20",
    lastUsed: "منذ 3 أيام",
  },
];

const webhookEvents = [
  { id: "trade_signal", label: "إشارات التداول", enabled: true },
  { id: "price_alert", label: "تنبيهات الأسعار", enabled: true },
  { id: "analysis_complete", label: "اكتمال التحليل", enabled: false },
  { id: "daily_report", label: "التقرير اليومي", enabled: true },
];

export function IntegrationsSection() {
  const [activeTab, setActiveTab] = React.useState("services");
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);
  const [revealedKeys, setRevealedKeys] = React.useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = React.useState("");
  const selectedKeyName = React.useMemo(
    () => apiKeys.find((k) => k.id === selectedKey)?.name ?? "المفتاح المحدد",
    [selectedKey]
  );

  const toggleKeyVisibility = (keyId: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(keyId)) {
        next.delete(keyId);
      } else {
        next.add(keyId);
      }
      return next;
    });
  };

  const copyKey = (keyId: string) => {
    const keyValue = apiKeys.find((k) => k.id === keyId)?.key;
    if (!keyValue) return;

    navigator.clipboard?.writeText(keyValue).catch(() => {});
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 1600);
  };

  const handleDeleteKey = (keyId: string) => {
    setSelectedKey(keyId);
    setShowDeleteModal(true);
  };

  return (
    <div className="space-y-6">
      <SettingsTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "services" && (
            <SettingGroup title="الخدمات المتصلة">
              <div className="space-y-3">
                {services.map((service) => {
                  const Icon = service.icon;
                  return (
                    <div
                      key={service.id}
                      className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border"
                    >
                      <div className={`w-12 h-12 rounded-xl ${service.color} flex items-center justify-center`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-foreground">{service.name}</span>
                          {service.connected && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-green-500 text-white">
                              متصل
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {service.connected ? service.username : service.description}
                        </p>
                      </div>
                      <button
                        className={`
                          px-4 py-2 rounded-lg text-sm font-medium transition-colors
                          ${service.connected
                            ? "bg-card border border-destructive text-destructive hover:bg-destructive hover:text-white"
                            : "bg-primary text-white transition-colors hover:brightness-90"}
                        `}
                      >
                        {service.connected ? "فصل" : "ربط"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </SettingGroup>
          )}

          {activeTab === "api-keys" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-foreground">مفاتيح API</h3>
                  <p className="text-sm text-muted-foreground">
                    إدارة مفاتيح الوصول لتطبيقاتك الخارجية
                  </p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white transition-colors hover:brightness-90">
                  <Plus className="w-4 h-4" />
                  <span>إنشاء مفتاح</span>
                </button>
              </div>

              <div className="space-y-3">
                {apiKeys.map((apiKey) => (
                  <div
                    key={apiKey.id}
                    className="p-4 rounded-xl bg-card border border-border"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-foreground">{apiKey.name}</h4>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleKeyVisibility(apiKey.id)}
                          className="p-2 rounded-lg hover:bg-muted transition-colors"
                        >
                          {revealedKeys.has(apiKey.id) ? (
                            <EyeOff className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <Eye className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                        <button
                          onClick={() => copyKey(apiKey.id)}
                          className="p-2 rounded-lg hover:bg-muted transition-colors"
                        >
                          {copiedKey === apiKey.id ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteKey(apiKey.id)}
                          className="p-2 rounded-lg transition-colors hover:bg-destructive hover:text-white"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-muted font-mono text-sm">
                      <span className="text-muted-foreground">
                        {revealedKeys.has(apiKey.id)
                          ? "sk-1234567890abcdef1234567890abcdef"
                          : apiKey.key}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <span>تم الإنشاء: {apiKey.created}</span>
                      <span>آخر استخدام: {apiKey.lastUsed}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "webhooks" && (
            <div className="space-y-6">
              <SettingGroup title="إعداد Webhook">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      رابط Webhook
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        placeholder="https://your-server.com/webhook"
                        className="flex-1 px-4 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        dir="ltr"
                      />
                      <button className="p-2 rounded-lg bg-muted transition-colors hover:brightness-90" aria-label="تحديث الرابط">
                        <RefreshCw className="w-5 h-5 text-muted-foreground" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium text-foreground">
                      الأحداث المُفعّلة
                    </label>
                    {webhookEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted"
                      >
                        <span className="text-foreground">{event.label}</span>
                        <SettingToggle checked={event.enabled} onCheckedChange={() => {}} />
                      </div>
                    ))}
                  </div>

                  <button className="w-full py-2 rounded-lg bg-primary text-white transition-colors hover:brightness-90">
                    حفظ إعدادات Webhook
                  </button>
                </div>
              </SettingGroup>

              <div className="p-4 rounded-xl bg-card border border-border">
                <div className="flex items-start gap-3">
                  <ExternalLink className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium text-foreground">وثائق API</h4>
                    <p className="text-sm text-muted-foreground">
                      اطلع على وثائق API الكاملة للتكامل مع تطبيقاتك
                    </p>
                    <button className="mt-2 text-sm text-primary hover:underline">
                      عرض الوثائق ←
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => {
          setShowDeleteModal(false);
          setSelectedKey(null);
        }}
        title="حذف مفتاح API"
        description={`هل أنت متأكد من حذف المفتاح "${selectedKeyName}"؟ لن تتمكن من استخدامه مرة أخرى.`}
        confirmText="حذف"
        type="danger"
      />
    </div>
  );
}
