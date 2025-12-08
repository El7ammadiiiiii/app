"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  Activity,
  CandlestickChart,
  Target,
  Layers,
  LineChart,
  Link2,
  Wallet,
  Users,
  Building2,
  FileText,
  PieChart,
  BarChart2,
  Bell,
  Calculator,
  Bot,
  Flame,
  ChevronDown,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalysisPage {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface Category {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  pages: AnalysisPage[];
}

const categories: Category[] = [
  {
    id: "technical",
    label: "التحليل الفني",
    icon: <TrendingUp className="w-4 h-4" />,
    color: "text-cyan-400",
    pages: [
      { id: "trends", label: "الاتجاهات", icon: <TrendingUp className="w-4 h-4" /> },
      { id: "indicators", label: "المؤشرات", icon: <Activity className="w-4 h-4" /> },
      { id: "patterns", label: "الأنماط", icon: <CandlestickChart className="w-4 h-4" /> },
      { id: "levels", label: "الدعم والمقاومة", icon: <Target className="w-4 h-4" /> },
      { id: "fibonacci", label: "فيبوناتشي", icon: <Layers className="w-4 h-4" /> },
      { id: "waves", label: "موجات إليوت", icon: <LineChart className="w-4 h-4" /> },
    ],
  },
  {
    id: "onchain",
    label: "On-Chain",
    icon: <Link2 className="w-4 h-4" />,
    color: "text-purple-400",
    pages: [
      { id: "whales", label: "الحيتان", icon: <Wallet className="w-4 h-4" /> },
      { id: "exchange", label: "تدفقات المنصات", icon: <Building2 className="w-4 h-4" /> },
      { id: "holders", label: "تحليل الحاملين", icon: <Users className="w-4 h-4" /> },
    ],
  },
  {
    id: "fundamental",
    label: "التحليل الأساسي",
    icon: <FileText className="w-4 h-4" />,
    color: "text-emerald-400",
    pages: [
      { id: "tokenomics", label: "الاقتصاد", icon: <PieChart className="w-4 h-4" /> },
      { id: "metrics", label: "المقاييس", icon: <BarChart2 className="w-4 h-4" /> },
    ],
  },
  {
    id: "tools",
    label: "أدوات ذكية",
    icon: <Zap className="w-4 h-4" />,
    color: "text-amber-400",
    pages: [
      { id: "alerts", label: "التنبيهات", icon: <Bell className="w-4 h-4" /> },
      { id: "calculator", label: "الحاسبة", icon: <Calculator className="w-4 h-4" /> },
      { id: "ai", label: "توقعات AI", icon: <Bot className="w-4 h-4" /> },
      { id: "hot", label: "الساخنة", icon: <Flame className="w-4 h-4" /> },
    ],
  },
];

interface RightSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPage?: (pageId: string) => void;
}

export function RightSidebar({ isOpen, onClose, onSelectPage }: RightSidebarProps) {
  const [expanded, setExpanded] = useState<string[]>(["technical"]);
  const [activePage, setActivePage] = useState<string | null>(null);

  const toggleCategory = (id: string) => {
    setExpanded((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectPage = (pageId: string) => {
    setActivePage(pageId);
    onSelectPage?.(pageId);
  };

  // Desktop: render inline without animation
  // Mobile: render as overlay with animation
  const sidebarContent = (
    <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm text-foreground">صفحات التحليل</span>
          </div>
          <button 
            onClick={onClose} 
            className="lg:hidden p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Categories */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {categories.map((cat) => (
            <div key={cat.id} className="rounded-xl overflow-hidden bg-muted/50">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(cat.id)}
                className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
              >
                <span className={cat.id === 'fundamental' ? 'text-primary' : cat.color}>{cat.icon}</span>
                <span className="flex-1 text-right text-sm font-medium text-foreground">{cat.label}</span>
                <span className="text-[10px] text-muted-foreground">{cat.pages.length}</span>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform",
                    expanded.includes(cat.id) && "rotate-180"
                  )}
                />
              </button>

              {/* Pages */}
              <AnimatePresence>
                {expanded.includes(cat.id) && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-2 pt-0 space-y-1">
                      {cat.pages.map((page) => (
                        <button
                          key={page.id}
                          onClick={() => handleSelectPage(page.id)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                            activePage === page.id
                              ? "bg-primary/10 text-primary border border-primary/20"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          )}
                        >
                          <span className={cn(
                            "p-1.5 rounded-md",
                            activePage === page.id ? "bg-primary/20" : "bg-muted"
                          )}>
                            {page.icon}
                          </span>
                          <span className="flex-1 text-right">{page.label}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border">
          <p className="text-center text-[11px] text-muted-foreground">
            اختر صفحة للتحليل
          </p>
        </div>
      </div>
    );

  return (
    <>
      {/* Desktop Mode - Inline sidebar */}
      <div className="hidden lg:flex">
        <div className="w-80 h-full bg-card border-l border-border flex flex-col shrink-0">
          {sidebarContent}
        </div>
      </div>

      {/* Mobile Mode - Overlay sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="lg:hidden fixed inset-0 bg-background/60 z-40"
            />
            {/* Sidebar */}
            <motion.div
              initial={{ x: -288 }}
              animate={{ x: 0 }}
              exit={{ x: -288 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="lg:hidden fixed top-0 left-0 h-full w-72 z-50 bg-card border-l border-border flex flex-col"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
