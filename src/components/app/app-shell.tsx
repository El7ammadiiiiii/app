"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, Settings, MessageSquare, LayoutDashboard, TrendingUp, Wallet, Zap, ChevronLeft, Play, ShieldCheck, Loader2 } from "lucide-react";
import { LeftSidebar } from "./left-sidebar";
import { RightSidebar } from "./right-sidebar";
import { ExchangeHealthMonitor } from "./ExchangeHealthMonitor";
import { useExchangeStore } from "@/stores/exchangeStore";
import { EXCHANGE_CONFIGS } from "@/constants/exchanges";
import { usePatternScanner } from "@/contexts/PatternScannerContext";
import { ChatArea } from "./chat-area";
import { Dashboard } from "./dashboard";
import { MarketsView } from "./markets-view";
import { PortfolioView } from "./portfolio-view";
import { SettingsView } from "@/components/settings";
import { cn } from "@/lib/utils";

type ViewType = "chat" | "dashboard" | "markets" | "portfolio" | "strategies" | "settings";

const navItems = [
  { id: "dashboard" as ViewType, label: "لوحة التحكم", icon: LayoutDashboard },
  { id: "chat" as ViewType, label: "المحادثات", icon: MessageSquare },
  { id: "markets" as ViewType, label: "الأسواق", icon: TrendingUp },
  { id: "portfolio" as ViewType, label: "المحفظة", icon: Wallet },
  { id: "strategies" as ViewType, label: "الاستراتيجيات", icon: Zap },
];

export function AppShell() {
  // حالات التطبيق
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState<ViewType>("chat");
  const [showSettings, setShowSettings] = useState(false);
  const [activeAgent, setActiveAgent] = useState<"general" | "institute">("general");
  
  // كشف حجم الشاشة
  const [screenSize, setScreenSize] = useState<"mobile" | "tablet" | "desktop">("desktop");

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setScreenSize("mobile");
        setLeftSidebarOpen(false);
        setRightSidebarOpen(false);
      } else if (width < 1280) {
        setScreenSize("tablet");
        setLeftSidebarOpen(false);
        setRightSidebarOpen(false);
      } else {
        setScreenSize("desktop");
        setLeftSidebarOpen(true);
        setRightSidebarOpen(true);
      }
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // التنقل
  const handleNavigate = useCallback((view: ViewType) => {
    if (view === "settings") {
      setShowSettings(true);
    } else {
      setActiveView(view);
      // إغلاق القوائم على الموبايل بعد التنقل
      if (screenSize === "mobile") {
        setLeftSidebarOpen(false);
      }
    }
  }, [screenSize]);

  // إغلاق القوائم عند الضغط على Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showSettings) setShowSettings(false);
        else if (leftSidebarOpen && screenSize !== "desktop") setLeftSidebarOpen(false);
        else if (rightSidebarOpen && screenSize !== "desktop") setRightSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [showSettings, leftSidebarOpen, rightSidebarOpen, screenSize]);

  const isMobile = screenSize === "mobile";
  const isDesktop = screenSize === "desktop";
  
  const { activeExchange, setActiveExchange, exchangePriority } = useExchangeStore();
  const { startGlobalScan, isScanning } = usePatternScanner();

  return (
    <div className="h-screen w-screen theme-surface flex flex-col overflow-hidden" dir="rtl">
      {/* ===== الهيدر الرئيسي ===== */}
      <header className="h-14 min-h-[56px] flex items-center justify-between px-3 sm:px-4 bg-background/60 backdrop-blur-xl z-40 shrink-0">
        {/* الجانب الأيمن - القائمة والشعار */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* زر القائمة اليمنى */}
          {!isDesktop && (
            <button
              onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="فتح القائمة"
            >
              <Menu className="w-5 h-5 text-foreground" />
            </button>
          )}
          
          {/* الشعار */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-primary-foreground font-bold text-sm">C</span>
            </div>
            <span className="font-bold text-foreground hidden sm:block">CCWAYS</span>
          </div>
        </div>

        {/* الوسط - التنقل السريع واختيار المنصة */}
        {!isMobile && (
          <div className="hidden sm:flex items-center gap-4">
            {/* Exchange Selector Dropdown */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/50 border border-border">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <select 
                value={activeExchange}
                onChange={(e) => setActiveExchange(e.target.value as any)}
                className="bg-transparent border-none text-xs font-bold text-foreground focus:outline-none cursor-pointer"
              >
                {exchangePriority.map((id) => (
                  <option key={id} value={id} className="bg-background">
                    {EXCHANGE_CONFIGS[id]?.name || id}
                  </option>
                ))}
              </select>
              
              <div className="w-px h-4 bg-border mx-1" />
              
              <button 
                onClick={startGlobalScan}
                disabled={isScanning}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all",
                  isScanning 
                    ? "bg-muted text-muted-foreground cursor-not-allowed" 
                    : "bg-primary/10 text-primary hover:bg-primary/20"
                )}
              >
                {isScanning ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Play className="w-3 h-3 fill-current" />
                )}
                <span className="text-[10px] font-bold">
                  {isScanning ? "جاري المسح..." : "بدء المسح"}
                </span>
              </button>
            </div>

            <nav className="flex items-center gap-1 bg-muted/50 rounded-xl p-1">
              {navItems.slice(0, 4).map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden lg:inline">{item.label}</span>
                </button>
              );
              })}
            </nav>
          </div>
        )}

        {/* الجانب الأيسر - الإعدادات ومعلومات المستخدم */}
        <div className="flex items-center gap-3">
          {/* زر القائمة اليسرى (أدوات التحليل) */}
          {!isDesktop && (
            <button
              onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="أدوات التحليل"
            >
              <ChevronLeft className={cn(
                "w-5 h-5 text-foreground transition-transform",
                rightSidebarOpen && "rotate-180"
              )} />
            </button>
          )}

          {/* زر الإعدادات */}
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-lg hover:bg-muted transition-colors group"
            aria-label="الإعدادات"
          >
            <Settings className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:rotate-45 transition-all" />
          </button>

          {/* فاصل */}
          <div className="w-px h-6 bg-border" />

          {/* معلومات المستخدم */}
          <div className="flex items-center gap-3">
            <div className="text-left hidden sm:block">
              <p className="text-sm font-semibold text-foreground leading-tight">Ahmed Ali</p>
              <p className="text-[11px] text-muted-foreground">ahmed@ccways.com</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
              A
            </div>
          </div>
        </div>
      </header>

      {/* ===== المحتوى الرئيسي ===== */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* === القائمة الجانبية اليمنى (الرئيسية) === */}
        {/* Desktop - ثابتة */}
        {isDesktop && (
          <aside className={cn(
            "h-full border-l border-border theme-card transition-all duration-300 overflow-hidden shrink-0",
            leftSidebarOpen ? "w-72" : "w-0"
          )}>
            {leftSidebarOpen && (
              <LeftSidebar
                isOpen={true}
                onClose={() => setLeftSidebarOpen(false)}
                activeView={activeView}
                onNavigate={handleNavigate}
                onOpenSettings={() => setShowSettings(true)}
              />
            )}
          </aside>
        )}

        {/* Mobile/Tablet - Overlay */}
        <AnimatePresence>
          {!isDesktop && leftSidebarOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setLeftSidebarOpen(false)}
                className="fixed inset-0 overlay-backdrop z-40"
              />
              {/* Sidebar */}
              <motion.aside
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed top-0 right-0 h-full w-[280px] max-w-[85vw] overlay-panel z-50 shadow-2xl overflow-y-auto"
              >
                <div className="flex items-center justify-between p-4 sticky top-0 overlay-header z-10">
                  <span className="font-bold text-foreground">القائمة</span>
                  <button
                    onClick={() => setLeftSidebarOpen(false)}
                    className="p-2 rounded-lg hover:bg-white/10"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <LeftSidebar
                  isOpen={true}
                  onClose={() => setLeftSidebarOpen(false)}
                  activeView={activeView}
                  onNavigate={handleNavigate}
                  onOpenSettings={() => setShowSettings(true)}
                />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* === المحتوى الرئيسي === */}
        <main className="flex-1 min-w-0 overflow-hidden theme-surface">
          <ExchangeHealthMonitor />
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="h-full w-full"
            >
              {activeView === "chat" && (
                <ChatArea activeAgent={activeAgent} onAgentChange={setActiveAgent} />
              )}
              {activeView === "dashboard" && <Dashboard />}
              {activeView === "markets" && <MarketsView />}
              {activeView === "portfolio" && <PortfolioView />}
              {activeView === "strategies" && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-8">
                    <Zap className="w-16 h-16 text-primary/30 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-foreground mb-2">قريباً</h2>
                    <p className="text-muted-foreground">صفحة الاستراتيجيات قيد التطوير</p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* === القائمة الجانبية اليسرى (أدوات التحليل) === */}
        {/* Desktop - ثابتة */}
        {isDesktop && (
          <aside className={cn(
            "h-full border-r border-border theme-card transition-all duration-300 overflow-hidden shrink-0",
            rightSidebarOpen ? "w-80" : "w-0"
          )}>
            {rightSidebarOpen && (
              <RightSidebar isOpen={true} onClose={() => setRightSidebarOpen(false)} />
            )}
          </aside>
        )}

        {/* Mobile/Tablet - Overlay */}
        <AnimatePresence>
          {!isDesktop && rightSidebarOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setRightSidebarOpen(false)}
                className="fixed inset-0 overlay-backdrop z-40"
              />
              {/* Sidebar */}
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed top-0 left-0 h-full w-[300px] max-w-[85vw] overlay-panel z-50 shadow-2xl overflow-y-auto"
              >
                <div className="flex items-center justify-between p-4 sticky top-0 overlay-header z-10">
                  <span className="font-bold text-foreground">أدوات التحليل</span>
                  <button
                    onClick={() => setRightSidebarOpen(false)}
                    className="p-2 rounded-lg hover:bg-white/10"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <RightSidebar isOpen={true} onClose={() => setRightSidebarOpen(false)} />
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* ===== شريط التنقل السفلي (موبايل فقط) ===== */}
      {isMobile && (
        <nav className="h-16 min-h-[64px] flex items-center justify-around px-2 border-t border-[var(--overlay-border)] glass-lite glass-lite--sheen shrink-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all min-w-[56px]",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  isActive && "bg-primary/10"
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-medium truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* ===== نافذة الإعدادات ===== */}
      <AnimatePresence>
        {showSettings && (
          <SettingsView onClose={() => setShowSettings(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
