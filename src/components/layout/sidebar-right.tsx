"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  TrendingUp,
  BarChart3,
  CandlestickChart,
  Activity,
  Target,
  Layers,
  Waves,
  LineChart,
  Link2,
  Wallet,
  Users,
  Coins,
  Building2,
  FileText,
  Calculator,
  Bell,
  Wand2,
  Zap,
  Bot,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Gauge,
  Eye,
  TrendingDown,
  PieChart,
  BarChart2,
  Scale,
  Flame,
  Network,
  Plus,
  Pin,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types
interface AnalysisCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  pages: { id: string; label: string; icon: React.ReactNode; description?: string }[];
}

interface SidebarRightProps {
  isOpen: boolean;
  onToggle: () => void;
  isMobile?: boolean;
}

// Analysis Categories Data
const analysisCategories: AnalysisCategory[] = [
  {
    id: "scanners",
    label: "الماسحات الذكية",
    icon: <Eye className="w-5 h-5" />,
    color: "text-cyan-400",
    pages: [
      { 
        id: "nexus-scanner", 
        label: "🔥 Nexus Scanner", 
        icon: <Activity className="w-4 h-4" />,
        description: "ماسح السوق الشامل"
      },
      { 
        id: "smart-money", 
        label: "🎯 Smart Money Radar", 
        icon: <Target className="w-4 h-4" />,
        description: "تتبع الأموال الذكية"
      },
      { 
        id: "momentum-matrix", 
        label: "⚡ Momentum Matrix", 
        icon: <Zap className="w-4 h-4" />,
        description: "تحليل الزخم والقوة"
      },
    ],
  },
  {
    id: "technical-pro",
    label: "التحليل الفني المتقدم",
    icon: <TrendingUp className="w-5 h-5" />,
    color: "text-purple-400",
    pages: [
      { 
        id: "harmonic-hunter", 
        label: "🌀 Harmonic Hunter", 
        icon: <Waves className="w-4 h-4" />,
        description: "اكتشاف النماذج التوافقية"
      },
      { 
        id: "pattern-ai", 
        label: "🔮 Pattern AI", 
        icon: <Wand2 className="w-4 h-4" />,
        description: "الذكاء الاصطناعي للأنماط"
      },
      { 
        id: "mtf-confluence", 
        label: "📊 MTF Confluence", 
        icon: <Layers className="w-4 h-4" />,
        description: "توافق الأطر الزمنية"
      },
      { 
        id: "volatility-theater", 
        label: "🎪 Volatility Theater", 
        icon: <Activity className="w-4 h-4" />,
        description: "تحليل التقلبات"
      },
    ],
  },
  {
    id: "onchain-fund",
    label: "On-Chain & أساسي",
    icon: <Link2 className="w-5 h-5" />,
    color: "text-green-400",
    pages: [
      { 
        id: "whale-intel", 
        label: "🐋 Whale Intelligence", 
        icon: <Wallet className="w-4 h-4" />,
        description: "ذكاء الحيتان"
      },
      { 
        id: "tokenomics-lab", 
        label: "💎 Tokenomics Lab", 
        icon: <PieChart className="w-4 h-4" />,
        description: "مختبر الاقتصاديات"
      },
      { 
        id: "network-health", 
        label: "🌐 Network Health", 
        icon: <Network className="w-4 h-4" />,
        description: "صحة الشبكة"
      },
      { 
        id: "macro-liquidity", 
        label: "🏦 Macro Liquidity", 
        icon: <Building2 className="w-4 h-4" />,
        description: "السيولة الكلية"
      },
    ],
  },
  {
    id: "security-strategy",
    label: "الأمان والاستراتيجية",
    icon: <Scale className="w-5 h-5" />,
    color: "text-amber-400",
    pages: [
      { 
        id: "security-scanner", 
        label: "🔐 Security Scanner", 
        icon: <Gauge className="w-4 h-4" />,
        description: "فحص الأمان والمخاطر"
      },
      { 
        id: "ai-advisor", 
        label: "🤖 AI Advisor", 
        icon: <Bot className="w-4 h-4" />,
        description: "المستشار الذكي"
      },
      { 
        id: "genius-alerts", 
        label: "🔔 Genius Alerts", 
        icon: <Bell className="w-4 h-4" />,
        description: "تنبيهات العبقرية"
      },
      { 
        id: "strategy-builder", 
        label: "🛠️ Strategy Builder", 
        icon: <Wand2 className="w-4 h-4" />,
        description: "باني الاستراتيجيات"
      },
    ],
  },
];

export function SidebarRight({ isOpen, onToggle, isMobile = false }: SidebarRightProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["scanners", "technical-pro", "onchain-fund", "security-strategy"]);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  // Close the sidebar when user clicks anywhere outside it (desktop & mobile)
  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      if (!isOpen) return;
      const target = event.target as Node;
      if (sidebarRef.current && !sidebarRef.current.contains(target)) {
        onToggle();
      }
    };

    document.addEventListener("click", handleGlobalClick);
    return () => document.removeEventListener("click", handleGlobalClick);
  }, [isOpen, onToggle]);

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const sidebarVariants: Variants = {
    open: {
      width: isMobile ? 280 : 280,
      opacity: 1,
      x: 0,
      transition: { type: "spring", stiffness: 300, damping: 30 },
    },
    closed: {
      width: isMobile ? 0 : 72,
      opacity: isMobile ? 0 : 1,
      x: isMobile ? -280 : 0,
      transition: { type: "spring", stiffness: 300, damping: 30 },
    },
  };

  return (
    <>
      {/* Mobile Overlay - limit width to sidebar only */}
      <AnimatePresence>
        {isMobile && isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed left-0 top-0 h-full w-[280px] bg-black/30 backdrop-blur-sm z-40 lg:hidden"
            onClick={onToggle}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        ref={sidebarRef}
        variants={sidebarVariants}
        initial={false}
        animate={isOpen ? "open" : "closed"}
        className={cn(
          "fixed left-0 top-0 h-full z-50",
          "flex flex-col",
          "bg-card border-r border-border shadow-[0_0_24px_rgba(0,0,0,0.08)] dark:bg-[rgba(11,14,17,0.85)] dark:backdrop-blur-2xl dark:border-white/[0.08] dark:shadow-[0_0_60px_rgba(0,0,0,0.5)]",
          isMobile ? "lg:relative" : "relative"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border dark:border-white/[0.08]">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onToggle}
            className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border border-transparent hover:border-border"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </motion.button>

          <AnimatePresence mode="wait">
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-2"
              >
                <span className="font-bold text-lg text-foreground tracking-tight">أدوات التحليل</span>
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 shadow-sm">
                  <Zap className="w-4 h-4" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Categories */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1 custom-scrollbar">
          {analysisCategories.map((category) => (
            <div key={category.id} className="space-y-0.5">
              {/* Category Header */}
              <motion.button
                whileTap={{ scale: 0.99 }}
                onClick={() => toggleCategory(category.id)}
                className={cn(
                  "w-full flex items-center gap-2 py-2 px-3 rounded-lg",
                  "transition-all duration-200",
                  expandedCategories.includes(category.id) 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  !isOpen && "justify-center"
                )}
              >
                {isOpen && (
                  <>
                    <motion.span
                      animate={{ rotate: expandedCategories.includes(category.id) ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </motion.span>
                    <span className="flex-1 text-right font-medium text-sm">
                      {category.label}
                    </span>
                  </>
                )}
              </motion.button>

              {/* Category Pages */}
              <AnimatePresence>
                {isOpen && expandedCategories.includes(category.id) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-0.5"
                  >
                    {category.pages.map((page, index) => (
                      <motion.div
                        key={page.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ 
                          opacity: 1, 
                          x: 0,
                          transition: { delay: index * 0.02 }
                        }}
                        className="relative"
                      >
                        <button
                          onClick={() => setActivePageId(page.id)}
                          className={cn(
                            "w-full flex items-center gap-3 py-2 px-3 rounded-lg",
                            "text-sm transition-all duration-150",
                            activePageId === page.id
                              ? "bg-muted text-foreground"
                              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                          )}
                        >
                          <span className="flex-1 text-right truncate font-medium">
                            {page.label}
                          </span>
                        </button>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </nav>

        {/* Footer - Quick Actions */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 border-t border-border bg-muted/30"
          >
            <div className="flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground bg-muted/50 p-2 rounded-lg border border-border">
              <span className="animate-pulse">💡</span>
              <span>اضغط على أي صفحة للتحليل المتقدم</span>
            </div>
          </motion.div>
        )}
      </motion.aside>
    </>
  );
}
