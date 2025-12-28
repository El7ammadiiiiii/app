"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { AlignLeft, AlignRight } from "lucide-react";
import { cn } from "@/lib/utils";
// Dynamic imports to prevent hydration errors
const SidebarLeft = dynamic(() => import("./sidebar-left").then(mod => mod.SidebarLeft), { ssr: false });
const SidebarRight = dynamic(() => import("./sidebar-right").then(mod => mod.SidebarRight), { ssr: false });
import { SettingsView } from "@/components/settings";
import { 
  CreateProjectModal, 
  ProjectSettings, 
  QuickSwitcher 
} from "@/components/projects";
import { useProjectShortcuts } from "@/hooks/useProjectShortcuts";
import { useMounted } from "@/hooks/use-mounted";

// Dynamic import for background
const CryptoBackground = dynamic(
  () => import("@/components/ui/crypto-background").then((mod) => mod.CryptoBackground),
  { ssr: false }
);

// Layout component for the main application
interface AppLayoutProps {
  children?: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const mounted = useMounted();
  const pathname = usePathname();
  const prevPathnameRef = useRef(pathname);

  // تفعيل اختصارات لوحة المفاتيح للمشاريع
  useProjectShortcuts();

  // Track mount state - No longer needed, useMounted hook handles this
  // useEffect(() => {
  //   setMounted(true);
  // }, []);

  // Detect screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) {
        setLeftSidebarOpen(false);
        setRightSidebarOpen(false);
      } else {
        setLeftSidebarOpen(true);
        setRightSidebarOpen(true);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Show a quick transition overlay only on route changes (not initial load)
  useEffect(() => {
    if (!mounted) return;
    if (prevPathnameRef.current !== pathname) {
      setShowTransition(true);
      prevPathnameRef.current = pathname;
      const timer = setTimeout(() => setShowTransition(false), 420);
      return () => clearTimeout(timer);
    }
  }, [pathname, mounted]);

  // Calculate main content margins - improved for responsive design
  const getMainContentStyle = () => {
    if (isMobile) {
      return { marginRight: 0, marginLeft: 0 };
    }
    return {
      marginRight: leftSidebarOpen ? 280 : 0,
      marginLeft: 0, // The left sidebar (SidebarRight) is an overlay and does not push content.
    };
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden text-foreground">
      {/* Transition overlay (Skeleton + Shimmer) */}
      <AnimatePresence>
        {showTransition && (
          <motion.div
            key="page-transition"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center theme-bg"
          >
            <div className="w-full max-w-6xl px-4">
              <div className="grid grid-cols-12 gap-4">
                {/* Left sidebar skeleton */}
                <div className="col-span-3 space-y-3">
                  {[1,2,3,4,5].map((i) => (
                    <div key={i} className="h-10 rounded-xl overflow-hidden bg-gray-600/50 shimmer" />
                  ))}
                </div>

                {/* Main content skeleton */}
                <div className="col-span-6 space-y-4">
                  <div className="h-12 rounded-2xl bg-gray-600/50 shimmer" />
                  <div className="h-64 rounded-2xl bg-gray-600/50 shimmer" />
                  <div className="grid grid-cols-3 gap-3">
                    {[1,2,3].map((i) => (
                      <div key={i} className="h-20 rounded-xl bg-gray-600/50 shimmer" />
                    ))}
                  </div>
                  <div className="space-y-3">
                    {[1,2,3].map((i) => (
                      <div key={i} className="h-12 rounded-xl bg-gray-600/50 shimmer" />
                    ))}
                  </div>
                </div>

                {/* Right sidebar skeleton */}
                <div className="col-span-3 space-y-3">
                  {[1,2,3,4].map((i) => (
                    <div key={i} className="h-12 rounded-xl bg-gray-600/50 shimmer" />
                  ))}
                </div>
              </div>
            </div>

            <style jsx global>{`
              .shimmer {
                position: relative;
                overflow: hidden;
                background: linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.14) 37%, rgba(255,255,255,0.06) 63%);
                background-size: 400% 100%;
                animation: shimmer 1.2s ease-in-out infinite;
              }
              @keyframes shimmer {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
              }
            `}</style>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Background - Visible throughout the app */}
      <div className="fixed inset-0 -z-20 theme-bg" />
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <CryptoBackground opacity={0.06} />
      </div>

      {/* Header - Main top bar with CCCWAYS */}
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-white/[0.04] theme-header">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
              className="p-2.5 rounded-xl hover:bg-white/[0.08] text-gray-400 hover:text-white transition-colors border border-white/[0.08]"
            >
              <AlignLeft className={cn(
                "w-5 h-5 transition-transform duration-300",
                !leftSidebarOpen && "rotate-180"
              )} />
            </motion.button>
          </div>

          {/* CCCWAYS Logo - Center */}
          <motion.span
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xl font-bold tracking-[0.3em] text-gray-400"
          >
            CCCWAYS
          </motion.span>

          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
              className="p-2.5 rounded-xl hover:bg-white/[0.08] text-gray-400 hover:text-white transition-colors border border-white/[0.08]"
            >
              <AlignRight className={cn(
                "w-5 h-5 transition-transform duration-300",
                !rightSidebarOpen && "rotate-180"
              )} />
            </motion.button>
          </div>
        </div>
      </header>

      {/* Left Sidebar (Right in RTL) */}
      <div className={cn(showTransition && "opacity-0 pointer-events-none")}>
        {mounted && (
          <SidebarLeft
            isOpen={leftSidebarOpen}
            onToggle={() => setLeftSidebarOpen(!leftSidebarOpen)}
            isMobile={isMobile}
            onOpenSettings={() => setShowSettings(true)}
          />
        )}
      </div>

      {/* Right Sidebar (Left in RTL) */}
      <div className={cn(showTransition && "opacity-0 pointer-events-none")}>
        {mounted && (
          <SidebarRight
            isOpen={rightSidebarOpen}
            onToggle={() => setRightSidebarOpen(!rightSidebarOpen)}
            isMobile={isMobile}
          />
        )}
      </div>

      {/* Main Content - استخدام flex لضمان ظهور قالب الكتابة */}
      <motion.main
        className={cn(
          "fixed inset-0 top-16 flex flex-col transition-all duration-300 z-30",
          showTransition && "opacity-0 pointer-events-none"
        )}
        animate={getMainContentStyle()}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* Chat or Page Content */}
        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto overflow-x-hidden">
          {children}
        </div>
      </motion.main>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <SettingsView onClose={() => setShowSettings(false)} />
        )}
      </AnimatePresence>

      {/* Project System Modals */}
      <CreateProjectModal />
      <ProjectSettings />
      <QuickSwitcher />
    </div>
  );
}
