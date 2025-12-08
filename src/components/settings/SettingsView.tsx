"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SettingsSidebar } from "./SettingsSidebar";
import { SettingsHeader } from "./SettingsHeader";
import { SaveIndicator } from "./components";
import type { SettingsSectionId } from "./types/settings";
import {
  AccountSection,
  SubscriptionSection,
  PrivacySection,
  AppearanceSection,
  LanguageSection,
  VoiceModeSection,
  AssistantsSection,
  IntegrationsSection,
  AdvancedSection,
  FilesSection,
  NotificationsSection,
  PluginsSection,
  AppSettingsSection,
  AboutSection,
} from "./sections";

interface SettingsViewProps {
  onClose: () => void;
}

const sectionComponents: Record<SettingsSectionId, React.ComponentType> = {
  account: AccountSection,
  subscription: SubscriptionSection,
  privacy: PrivacySection,
  appearance: AppearanceSection,
  language: LanguageSection,
  voice: VoiceModeSection,
  assistants: AssistantsSection,
  integrations: IntegrationsSection,
  advanced: AdvancedSection,
  files: FilesSection,
  notifications: NotificationsSection,
  plugins: PluginsSection,
  "app-settings": AppSettingsSection,
  about: AboutSection,
};

const sectionTitles: Record<SettingsSectionId, string> = {
  account: "الحساب",
  subscription: "الاشتراك",
  privacy: "الخصوصية",
  appearance: "المظهر",
  language: "اللغة والتاريخ",
  voice: "الوضع الصوتي",
  assistants: "المساعدون",
  integrations: "التكاملات",
  advanced: "متقدم",
  files: "الملفات",
  notifications: "الإشعارات",
  plugins: "الإضافات",
  "app-settings": "إعدادات التطبيق",
  about: "حول التطبيق",
};

export function SettingsView({ onClose }: SettingsViewProps) {
  const [activeSection, setActiveSection] = React.useState<SettingsSectionId>("account");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showMobileSidebar, setShowMobileSidebar] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);
  const [isTablet, setIsTablet] = React.useState(false);

  // Detect mobile & tablet
  React.useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 640);
      setIsTablet(window.innerWidth >= 640 && window.innerWidth < 1024);
    };
    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  // Ensure the sidebar is visible by default on mobile/tablet when opening settings
  React.useEffect(() => {
    if (isMobile || isTablet) {
      setShowMobileSidebar(true);
    }
  }, [isMobile, isTablet]);

  console.log("SettingsView rendered! activeSection:", activeSection);

  const SectionComponent = sectionComponents[activeSection];

  // إغلاق بـ Escape
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleSectionChange = (section: SettingsSectionId) => {
    setActiveSection(section);
    if (isMobile || isTablet) setShowMobileSidebar(false);
  };

  const showDrawer = isMobile || isTablet;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      dir="rtl"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`
          relative bg-card shadow-2xl overflow-hidden border border-border
          ${isMobile 
            ? "w-full h-full rounded-none flex-col" 
            : isTablet 
              ? "w-[95%] h-[95vh] rounded-xl flex-col" 
              : "w-full max-w-4xl h-[85vh] max-h-[750px] mx-4 rounded-2xl flex-row"
          }
          flex
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile/Tablet Header with Menu Button */}
        {showDrawer && (
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center justify-between p-3 border-b border-border bg-card"
          >
            <motion.button
              onClick={() => setShowMobileSidebar(!showMobileSidebar)}
              className="p-2.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground active:scale-95 transition-all"
              whileTap={{ scale: 0.9 }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </motion.button>
            <span className="text-sm font-semibold">{sectionTitles[activeSection]}</span>
            <motion.button
              onClick={onClose}
              className="p-2.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground active:scale-95 transition-all"
              whileTap={{ scale: 0.9 }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>
          </motion.div>
        )}

        {/* Drawer Overlay */}
        <AnimatePresence>
          {showDrawer && showMobileSidebar && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 z-5"
              onClick={() => setShowMobileSidebar(false)}
            />
          )}
        </AnimatePresence>

        {/* Sidebar - Desktop always visible, Mobile/Tablet as Drawer */}
        {showDrawer ? (
          // Mobile/Tablet: Sidebar as animated drawer
          <AnimatePresence>
            {showMobileSidebar && (
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
                className="absolute inset-y-0 right-0 z-10 w-[280px] max-w-[85vw] shadow-2xl"
              >
                <SettingsSidebar
                  activeSection={activeSection}
                  onSectionChange={handleSectionChange}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onClose={() => setShowMobileSidebar(false)}
                  isMobile={true}
                />
              </motion.div>
            )}
          </AnimatePresence>
        ) : (
          // Desktop: Sidebar always visible
          <SettingsSidebar
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-card">
          {/* Header - Hidden on mobile/tablet */}
          {!showDrawer && (
            <SettingsHeader
              title={sectionTitles[activeSection]}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onClose={onClose}
            />
          )}

          {/* Content with staggered animation */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-card">
            <div className={`p-3 sm:p-4 lg:p-5 ${isMobile ? "pb-20" : ""}`}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, y: 15, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                >
                  <SectionComponent />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Save Indicator */}
        <SaveIndicator />
      </motion.div>
    </motion.div>
  );
}
