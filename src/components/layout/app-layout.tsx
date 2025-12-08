"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { AlignLeft, AlignRight, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarLeft } from "./sidebar-left";
import { SidebarRight } from "./sidebar-right";
import { SettingsView } from "@/components/settings";
import { ChatArea } from "./chat-area";
import { 
  CreateProjectModal, 
  ProjectSettings, 
  QuickSwitcher 
} from "@/components/projects";
import { useProjectShortcuts } from "@/hooks/useProjectShortcuts";

// Dynamic import for background
const CryptoBackground = dynamic(
  () => import("@/components/ui/crypto-background").then((mod) => mod.CryptoBackground),
  { ssr: false }
);

interface AppLayoutProps {
  children?: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [activeAgent, setActiveAgent] = useState<"general" | "institute">("general");
  const [isMobile, setIsMobile] = useState(false);
  const [showTransition, setShowTransition] = useState(true);
  const pathname = usePathname();

  // تفعيل اختصارات لوحة المفاتيح للمشاريع
  useProjectShortcuts();

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

  // Show a quick transition overlay on initial load and whenever the route changes
  useEffect(() => {
    setShowTransition(true);
    const timer = setTimeout(() => setShowTransition(false), 420);
    return () => clearTimeout(timer);
  }, [pathname]);

  // Calculate main content margins - improved for responsive design
  const getMainContentStyle = () => {
    if (isMobile) {
      return { marginRight: 0, marginLeft: 0 };
    }
    return {
      marginRight: leftSidebarOpen ? 280 : 0,
      marginLeft: rightSidebarOpen ? 300 : 0,
    };
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent text-foreground">
      {/* Transition overlay (Skeleton + Shimmer) */}
      <AnimatePresence>
        {showTransition && (
          <motion.div
            key="page-transition"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-black/75 via-black/70 to-black/75 backdrop-blur-sm"
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
      <div className="fixed inset-0 bg-background -z-20" />
      <CryptoBackground opacity={0.06} />

      {/* Header - Visible on all screens */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-transparent backdrop-blur-0 border-b border-transparent shadow-none">
        <div className="flex items-center justify-between p-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
            className="p-2.5 rounded-full hover:bg-muted dark:hover:bg-white/[0.08] text-muted-foreground hover:text-foreground transition-colors border border-transparent hover:border-border dark:hover:border-white/[0.08]"
          >
            <AlignLeft className={cn(
              "w-5 h-5 transition-transform duration-300",
              !leftSidebarOpen && "rotate-180"
            )} />
          </motion.button>

          <div className="flex-1" />



          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
            className="p-2.5 rounded-full hover:bg-muted dark:hover:bg-white/[0.08] text-muted-foreground hover:text-foreground transition-colors border border-transparent hover:border-border dark:hover:border-white/[0.08]"
          >
            <AlignRight className={cn(
              "w-5 h-5 transition-transform duration-300",
              !rightSidebarOpen && "rotate-180"
            )} />
          </motion.button>
        </div>
      </header>

      {/* Left Sidebar (Right in RTL) */}
      <div className={cn(showTransition && "opacity-0 pointer-events-none")}
      >
        <SidebarLeft
          isOpen={leftSidebarOpen}
          onToggle={() => setLeftSidebarOpen(!leftSidebarOpen)}
          isMobile={isMobile}
          onOpenSettings={() => setShowSettings(true)}
        />
      </div>

      {/* Right Sidebar (Left in RTL) */}
      <div className={cn(showTransition && "opacity-0 pointer-events-none")}
      >
        <SidebarRight
          isOpen={rightSidebarOpen}
          onToggle={() => setRightSidebarOpen(!rightSidebarOpen)}
          isMobile={isMobile}
        />
      </div>

      {/* Main Content */}
      <motion.main
        className={cn(
          "min-h-screen overflow-hidden transition-all duration-300 relative z-0 pt-12",
          showTransition && "opacity-0 pointer-events-none"
        )}
        animate={getMainContentStyle()}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* Chat or Page Content */}
        <div className="h-[calc(100vh-68px)] bg-gradient-to-b from-background/80 to-background/90 backdrop-blur-[2px]">
          {children || (
            <ChatArea
              activeAgent={activeAgent}
              onAgentChange={setActiveAgent}
            />
          )}
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
