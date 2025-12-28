"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Link2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Search,
} from "lucide-react";
import { SettingGroup } from "../components";
import { useIntegrationStore, Integration, IntegrationCategory } from "@/store/integrationStore";
import { ProviderType } from "@/lib/auth/providers/base";
import { useSearchParams } from "next/navigation";

export function IntegrationsSection() {
  const searchParams = useSearchParams();
  const {
    integrations,
    categories,
    isLoading,
    error,
    fetchIntegrations,
    connectIntegration,
    disconnectIntegration,
  } = useIntegrationStore();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Handle OAuth callback success/error
  React.useEffect(() => {
    if (!searchParams) return;

    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success) {
      setSuccessMessage(`تم ربط ${success} بنجاح!`);
      setTimeout(() => setSuccessMessage(null), 5000);
    }
    if (error) {
      setErrorMessage(`فشل الربط: ${error}`);
      setTimeout(() => setErrorMessage(null), 5000);
    }
  }, [searchParams]);

  // Fetch integrations on mount
  React.useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  // Filter integrations based on search and category
  const filteredIntegrations = React.useMemo(() => {
    let filtered = Object.values(integrations);

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.name.toLowerCase().includes(query) ||
          i.nameAr.includes(query) ||
          i.provider.includes(query)
      );
    }

    // Filter by category
    if (selectedCategory !== "all") {
      const category = categories.find((c) => c.id === selectedCategory);
      if (category) {
        filtered = filtered.filter((i) =>
          category.integrations.includes(i.provider)
        );
      }
    }

    return filtered;
  }, [integrations, searchQuery, selectedCategory, categories]);

  // Get connected count
  const connectedCount = Object.values(integrations).filter((i) => i.isConnected).length;

  const handleConnect = async (provider: ProviderType) => {
    connectIntegration(provider);
  };

  const handleDisconnect = async (provider: ProviderType) => {
    if (confirm("هل أنت متأكد من فصل هذا التكامل؟")) {
      await disconnectIntegration(provider);
    }
  };

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20"
          >
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-green-500">{successMessage}</span>
          </motion.div>
        )}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20"
          >
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-500">{errorMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link2 className="w-4 h-4" />
            <span>{connectedCount} تكامل متصل</span>
          </div>
        </div>
        <button
          onClick={() => fetchIntegrations()}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          تحديث
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="البحث في التكاملات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-accent border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              selectedCategory === "all"
                ? "bg-primary text-white"
                : "bg-accent text-foreground hover:bg-accent/80"
            }`}
          >
            الكل
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${
                selectedCategory === category.id
                  ? "bg-primary text-white"
                  : "bg-accent text-foreground hover:bg-accent/80"
              }`}
            >
              <span>{category.icon}</span>
              <span>{category.nameAr}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Integrations Grid */}
      <SettingGroup title="التطبيقات والتكاملات">
        {isLoading && Object.keys(integrations).length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredIntegrations.map((integration) => (
                <IntegrationCard
                  key={integration.provider}
                  integration={integration}
                  onConnect={() => handleConnect(integration.provider)}
                  onDisconnect={() => handleDisconnect(integration.provider)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {filteredIntegrations.length === 0 && !isLoading && (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>لا توجد تكاملات مطابقة للبحث</p>
          </div>
        )}
      </SettingGroup>

      {/* API Keys Info */}
      <SettingGroup title="معلومات مهمة">
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm text-amber-500 font-medium">
                بعض التكاملات تتطلب مفاتيح API
              </p>
              <p className="text-xs text-muted-foreground">
                تأكد من إعداد متغيرات البيئة المطلوبة في ملف .env.local
                للحصول على أفضل تجربة.
              </p>
            </div>
          </div>
        </div>
      </SettingGroup>
    </div>
  );
}

interface IntegrationCardProps {
  integration: Integration;
  onConnect: () => void;
  onDisconnect: () => void;
}

function IntegrationCard({ integration, onConnect, onDisconnect }: IntegrationCardProps) {
  const { isLoading, isConnected, error } = integration;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`
        relative p-4 rounded-xl border transition-all
        ${isConnected
          ? "bg-green-500/5 border-green-500/20"
          : "glass-panel border-[var(--glass-border-subtle)] hover:border-primary/30"
        }
      `}
    >
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 theme-bg/50 rounded-xl flex items-center justify-center z-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-12 h-12 rounded-xl ${integration.color} flex items-center justify-center text-2xl`}>
          {integration.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-foreground truncate">
              {integration.name}
            </h4>
            {isConnected && (
              <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs bg-green-500 text-white">
                متصل
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {integration.nameAr}
          </p>
        </div>
      </div>

      {/* Profile Info (if connected) */}
      {isConnected && integration.profile && (
        <div className="mb-3 p-2 rounded-lg bg-accent/50 text-xs text-muted-foreground">
          {/* @ts-expect-error - dynamic profile fields */}
          {integration.profile.name || integration.profile.username || integration.profile.email || "متصل بنجاح"}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-3 p-2 rounded-lg bg-red-500/10 text-xs text-red-500">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {isConnected ? (
          <>
            <button
              onClick={onDisconnect}
              disabled={isLoading}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium border border-destructive text-destructive hover:bg-destructive hover:text-white transition-colors disabled:opacity-50"
            >
              فصل
            </button>
            {integration.profile && (
              <button
                onClick={() => {
                  // Open provider dashboard if available
                  const urls: Record<string, string> = {
                    canva: "https://www.canva.com",
                    stripe: "https://dashboard.stripe.com",
                    monday: "https://monday.com",
                    telegram: "https://web.telegram.org",
                    alpaca: "https://app.alpaca.markets",
                    discord: "https://discord.com",
                    twitter: "https://twitter.com",
                  };
                  const url = urls[integration.provider];
                  if (url) window.open(url, "_blank");
                }}
                className="p-2 rounded-lg border border-border text-muted-foreground hover:bg-accent transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}
          </>
        ) : (
          <button
            onClick={onConnect}
            disabled={isLoading}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:brightness-90 transition-all disabled:opacity-50"
          >
            ربط
          </button>
        )}
      </div>

      {/* Connected time */}
      {isConnected && integration.connectedAt && (
        <p className="mt-2 text-xs text-muted-foreground text-center">
          متصل منذ {formatDate(integration.connectedAt)}
        </p>
      )}
    </motion.div>
  );
}

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "اليوم";
  if (days === 1) return "أمس";
  if (days < 7) return `${days} أيام`;
  if (days < 30) return `${Math.floor(days / 7)} أسابيع`;
  return `${Math.floor(days / 30)} أشهر`;
}
