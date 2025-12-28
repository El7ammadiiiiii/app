"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  TrendingUp,
  CandlestickChart,
  Activity,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Eye,
  TrendingDown,
  Flame,
  Plus,
  Pin,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types
interface AnalysisPage {
  id: string;
  label: string;
  icon: React.ReactNode;
  description?: string;
  path: string;
}

interface AnalysisCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  basePath: string;
  pages: AnalysisPage[];
}

interface SidebarRightProps {
  isOpen: boolean;
  onToggle: () => void;
  isMobile?: boolean;
}

// Analysis Categories Data - الفئات الأربع الرئيسية للتحليل
const analysisCategories: AnalysisCategory[] = [
  {
    id: "scanners",
    label: "الماسحات الذكية",
    icon: <Eye className="w-5 h-5" />,
    color: "text-cyan-400",
    basePath: "/chat/scanners",
    pages: [
      { 
        id: "scanners-main", 
        label: "📡 ماسحات السوق الحية", 
        icon: <Activity className="w-4 h-4" />,
        description: "بيانات السوق المباشرة من CoinGecko",
        path: "/chat/scanners"
      },
      { 
        id: "trend-scanner", 
        label: "📈 ماسح الاتجاهات", 
        icon: <TrendingUp className="w-4 h-4" />,
        description: "تحليل متعدد المؤشرات",
        path: "/chat/trend-scanner"
      },
      { 
        id: "divergence-scanner", 
        label: "🔀 Divergence Scanner", 
        icon: <TrendingDown className="w-4 h-4" />,
        description: "كشف الدايفرجنس المتقدم",
        path: "/chat/divergence-scanner"
      },
    ],
  },
  {
    id: "technical-pro",
    label: "التحليل الفني المتقدم",
    icon: <TrendingUp className="w-5 h-5" />,
    color: "text-purple-400",
    basePath: "/chat/technical-pro",
    pages: [
      { 
        id: "technical-main", 
        label: "📊 التحليل الفني الحي", 
        icon: <CandlestickChart className="w-4 h-4" />,
        description: "RSI, MACD, أنماط الشموع",
        path: "/chat/technical-pro"
      },
    ],
  },
  {
    id: "patterns",
    label: "الأنماط",
    icon: <Flame className="w-5 h-5" />,
    color: "text-purple-400",
    basePath: "/chat/patterns",
    pages: [
      { 
        id: "patterns-main", 
        label: "🔷 Patterns", 
        icon: <Flame className="w-4 h-4" />,
        description: "أنماط الرسم البياني",
        path: "/chat/patterns"
      },
    ],
  },
  {
    id: "test",
    label: "صفحة الاختبار",
    icon: <Flame className="w-5 h-5" />,
    color: "text-pink-400",
    basePath: "/chat/test",
    pages: [
      { 
        id: "test-main", 
        label: "🧪 Test", 
        icon: <Flame className="w-4 h-4" />,
        description: "صفحة الاختبار والتطوير",
        path: "/chat/test"
      },
    ],
  },
];

export function SidebarRight({ isOpen, onToggle, isMobile = false }: SidebarRightProps) {
  const router = useRouter();
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["scanners", "technical-pro", "onchain-fund", "security-strategy", "test"]);
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
      width: 0,
      opacity: 0,
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
            className="fixed left-0 top-0 h-full w-[280px] z-40 lg:hidden theme-bg"
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
          "fixed left-0 z-50",
          "flex flex-col",
          "bg-white/5 backdrop-blur-xl border-r border-white/10",
          "shadow-[0_0_60px_rgba(0,0,0,0.5)]",
          // Mobile: full height from top, Desktop: below header
          isMobile ? "top-0 h-full" : "top-[65px] h-[calc(100vh-65px)]"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border dark:border-white/[0.08]">
          {/* Toggle button - only show on mobile */}
          {isMobile && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onToggle}
              className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border border-transparent hover:border-border"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </motion.button>
          )}

          <AnimatePresence mode="wait">
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={cn(
                  "flex items-center gap-2",
                  !isMobile && "w-full"
                )}
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
                          onClick={() => {
                            setActivePageId(page.id);
                            // Handle hash navigation properly
                            if (page.path.includes('#')) {
                              const [basePath, hash] = page.path.split('#');
                              router.push(basePath);
                              // Wait for navigation then scroll to element
                              setTimeout(() => {
                                const element = document.getElementById(hash);
                                if (element) {
                                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                              }, 300);
                            } else {
                              router.push(page.path);
                            }
                          }}
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
