"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Puzzle,
  Download,
  Star,
  Search,
  ExternalLink,
  Newspaper,
  Calculator,
  BarChart3,
} from "lucide-react";
import { 
  SettingGroup,
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
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredAvailable = availablePlugins.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
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
          <div className="grid grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
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
                    className="p-2.5 sm:p-4 rounded-xl glass-lite glass-lite--interactive border border-[var(--glass-border)] hover:border-primary 
                             transition-all cursor-pointer group"
                  >
                    <div className="flex flex-col items-center text-center gap-2 mb-2 sm:flex-row sm:items-start sm:text-right sm:gap-3 sm:mb-3">
                      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${plugin.color} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground truncate text-[12px] sm:text-[14px]">{plugin.name}</h4>
                        <p className="hidden sm:block text-xs text-muted-foreground line-clamp-2">{plugin.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          {plugin.rating}
                        </span>
                        <span>{plugin.downloads}</span>
                      </div>
                      <button className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-primary text-white 
                                       text-[11px] sm:text-xs font-medium transition-colors hover:brightness-90
                                       opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
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
    </div>
  );
}
