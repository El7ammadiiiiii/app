"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Star,
  FolderOpen,
  GraduationCap,
  MessageCircle,
  ChevronRight,
  Plus,
  Search,
  LayoutDashboard,
  Activity,
  Briefcase,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

type View = "dashboard" | "chat" | "markets" | "portfolio" | "strategies" | "settings";

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  view?: View;
  count?: number;
  children?: { id: string; label: string }[];
}

const mainNavItems: SidebarItem[] = [
  {
    id: "dashboard",
    label: "لوحة القيادة",
    icon: <LayoutDashboard className="w-[18px] h-[18px]" />,
    view: "dashboard",
  },
  {
    id: "chat",
    label: "مساعد AI",
    icon: <MessageCircle className="w-[18px] h-[18px]" />,
    view: "chat",
    count: 12,
  },
  {
    id: "markets",
    label: "الأسواق",
    icon: <Activity className="w-[18px] h-[18px]" />,
    view: "markets",
  },
  {
    id: "portfolio",
    label: "المحفظة",
    icon: <Briefcase className="w-[18px] h-[18px]" />,
    view: "portfolio",
  },
  {
    id: "strategies",
    label: "الاستراتيجيات",
    icon: <Zap className="w-[18px] h-[18px]" />,
    view: "strategies",
  },
];

const secondaryNavItems: SidebarItem[] = [
  {
    id: "projects",
    label: "المشاريع",
    icon: <FolderOpen className="w-[18px] h-[18px]" />,
    count: 3,
    children: [
      { id: "p1", label: "تحليل BTC" },
      { id: "p2", label: "محفظة DeFi" },
      { id: "p3", label: "Alt Season" },
    ],
  },
  {
    id: "favorites",
    label: "المفضلة",
    icon: <Star className="w-[18px] h-[18px]" />,
    count: 8,
    children: [
      { id: "fav-messages", label: "رسائل محفوظة" },
      { id: "fav-coins", label: "عملات مفضلة" },
    ],
  },
  {
    id: "institute",
    label: "المعهد",
    icon: <GraduationCap className="w-[18px] h-[18px]" />,
    children: [
      { id: "courses", label: "الدورات" },
      { id: "certs", label: "الشهادات" },
    ],
  },
];

interface LeftSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeView: View;
  onNavigate: (view: View) => void;
  onOpenSettings?: () => void;
}

export function LeftSidebar({ isOpen, onClose, activeView, onNavigate, onOpenSettings }: LeftSidebarProps) {
  const [expanded, setExpanded] = useState<string | null>("projects");
  const [search, setSearch] = useState("");

  const handleNavigation = (view: View) => {
    onNavigate(view);
  };

  // تصفية العناصر بناءً على البحث
  const filteredMain = mainNavItems.filter(item => 
    item.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-card">
      {/* User Profile */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <User className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground text-sm truncate">Ahmed Ali</p>
            <p className="text-xs text-muted-foreground truncate">Pro Member</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="بحث سريع..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pr-9 pl-3 rounded-lg bg-muted/50 border border-border text-sm 
                     placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* New Chat Button */}
      <div className="px-3 pb-3">
        <button 
          onClick={() => handleNavigation("chat")}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg 
                   bg-primary/10 border border-primary/20 text-primary 
                   hover:bg-primary/20 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          محادثة جديدة
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        {/* Main Navigation */}
        <div className="mb-4">
          <p className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            القائمة الرئيسية
          </p>
          <div className="space-y-1">
            {filteredMain.map((item) => (
              <button
                key={item.id}
                onClick={() => item.view && handleNavigation(item.view)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  activeView === item.view
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <span className={activeView === item.view ? "text-primary" : ""}>{item.icon}</span>
                <span className="flex-1 text-right">{item.label}</span>
                {item.count && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    {item.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Navigation */}
        <div>
          <p className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            المساحات
          </p>
          <div className="space-y-1">
            {secondaryNavItems.map((item) => (
              <div key={item.id}>
                <button
                  onClick={() => {
                    if (item.view) {
                      handleNavigation(item.view);
                    } else {
                      setExpanded(expanded === item.id ? null : item.id);
                    }
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm 
                           text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <span>{item.icon}</span>
                  <span className="flex-1 text-right">{item.label}</span>
                  {item.count && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted">
                      {item.count}
                    </span>
                  )}
                  {item.children && (
                    <ChevronRight
                      className={cn(
                        "w-3.5 h-3.5 transition-transform",
                        expanded === item.id && "rotate-90"
                      )}
                    />
                  )}
                </button>

                {/* Children */}
                <AnimatePresence>
                  {item.children && expanded === item.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mr-5 pr-3 border-r border-border mt-1 space-y-0.5">
                        {item.children.map((child) => (
                          <button
                            key={child.id}
                            className="w-full text-right px-3 py-2 rounded-lg text-sm 
                                     text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                          >
                            {child.label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </nav>


    </div>
  );
}
