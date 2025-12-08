"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Puzzle,
  Download,
  Trash2,
  Settings,
  Star,
  Search,
  Check,
  ExternalLink,
  TrendingUp,
  BarChart3,
  Wallet,
  Bot,
  Newspaper,
  Calculator,
} from "lucide-react";
import { 
  SettingCard, 
  SettingToggle,
  SettingGroup,
  ConfirmModal,
} from "../components";

interface Plugin {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  installed: boolean;
  enabled?: boolean;
  version?: string;
  author?: string;
  rating?: number;
  downloads?: string;
}

const installedPlugins: Plugin[] = [
  {
    id: "ta-indicators",
    name: "المؤشرات الفنية المتقدمة",
    description: "مجموعة شاملة من المؤشرات الفنية",
    icon: TrendingUp,
    color: "bg-green-500",
    installed: true,
    enabled: true,
    version: "2.1.0",
    author: "CCC Trading",
  },
  {
    id: "portfolio-tracker",
    name: "متتبع المحفظة",
    description: "تتبع أداء محفظتك في الوقت الفعلي",
    icon: Wallet,
    color: "bg-blue-500",
    installed: true,
    enabled: true,
    version: "1.5.3",
    author: "FinTech Pro",
  },
  {
    id: "ai-signals",
    name: "إشارات AI",
    description: "إشارات تداول مدعومة بالذكاء الاصطناعي",
    icon: Bot,
    color: "bg-purple-500",
    installed: true,
    enabled: false,
    version: "3.0.0",
    author: "AI Trading Lab",
  },
];

const availablePlugins: Plugin[] = [
  {
    id: "news-feed",
    name: "أخبار السوق",
    description: "آخر أخبار الأسواق المالية",
    icon: Newspaper,
    color: "bg-orange-500",
    installed: false,
    rating: 4.5,
    downloads: "10K+",
  },
  {
    id: "risk-calc",
    name: "حاسبة المخاطر",
    description: "حساب حجم الصفقة وإدارة المخاطر",
    icon: Calculator,
    color: "bg-red-500",
    installed: false,
    rating: 4.8,
    downloads: "25K+",
  },
  {
    id: "chart-patterns",
    name: "أنماط الشارت",
    description: "كشف تلقائي لأنماط الرسم البياني",
    icon: BarChart3,
    color: "bg-cyan-500",
    installed: false,
    rating: 4.3,
    downloads: "8K+",
  },
];

export function PluginsSection() {
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [selectedPlugin, setSelectedPlugin] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [enabledPlugins, setEnabledPlugins] = React.useState<Record<string, boolean>>({
    "ta-indicators": true,
    "portfolio-tracker": true,
    "ai-signals": false,
  });

  const handleUninstall = (pluginId: string) => {
    setSelectedPlugin(pluginId);
    setShowDeleteModal(true);
  };

  const togglePlugin = (pluginId: string) => {
    setEnabledPlugins(prev => ({ ...prev, [pluginId]: !prev[pluginId] }));
  };

  const filteredAvailable = availablePlugins.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Installed Plugins */}
      <SettingGroup title={`الإضافات المثبتة (${installedPlugins.length})`}>
        <div className="space-y-3">
          {installedPlugins.map((plugin) => {
            const Icon = plugin.icon;
            return (
              <motion.div
                key={plugin.id}
                layout
                  className="p-4 rounded-xl bg-card border border-border hover:border-primary transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl ${plugin.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-foreground">{plugin.name}</h4>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        v{plugin.version}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{plugin.description}</p>
                    <p className="text-xs text-muted-foreground">بواسطة {plugin.author}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <SettingToggle
                      checked={enabledPlugins[plugin.id] ?? false}
                      onCheckedChange={() => togglePlugin(plugin.id)}
                    />
                    <button className="p-2 rounded-lg hover:bg-muted transition-colors">
                      <Settings className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => handleUninstall(plugin.id)}
                      className="p-2 rounded-lg transition-colors hover:bg-destructive hover:text-white"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </SettingGroup>

      {/* Plugin Store */}
      <SettingGroup title="متجر الإضافات">
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث عن إضافات..."
              className="w-full pr-10 pl-4 py-2 rounded-lg bg-muted border border-border
                       text-foreground placeholder:text-muted-foreground
                       focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            />
          </div>

          {/* Available Plugins Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AnimatePresence mode="popLayout">
              {filteredAvailable.map((plugin) => {
                const Icon = plugin.icon;
                return (
                  <motion.div
                    key={plugin.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-4 rounded-xl bg-card border border-border hover:border-primary 
                             transition-all cursor-pointer group"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-xl ${plugin.color} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground truncate">{plugin.name}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">{plugin.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          {plugin.rating}
                        </span>
                        <span>{plugin.downloads}</span>
                      </div>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white 
                                       text-xs font-medium transition-colors hover:brightness-90
                                       opacity-0 group-hover:opacity-100">
                        <Download className="w-3 h-3" />
                        <span>تثبيت</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {filteredAvailable.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Puzzle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>لا توجد إضافات مطابقة</p>
            </div>
          )}

          {/* Browse All */}
          <button className="w-full py-3 rounded-lg border border-border text-foreground
                           hover:bg-muted transition-colors flex items-center justify-center gap-2">
            <span>تصفح جميع الإضافات</span>
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </SettingGroup>

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => {
          setShowDeleteModal(false);
          setSelectedPlugin(null);
        }}
        title="إزالة الإضافة"
        description="هل أنت متأكد من إزالة هذه الإضافة؟ سيتم حذف جميع بياناتها."
        confirmText="إزالة"
        type="danger"
      />
    </div>
  );
}
