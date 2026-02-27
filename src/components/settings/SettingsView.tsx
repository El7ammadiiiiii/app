"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { SettingsSidebar } from "./SettingsSidebar";
import type { SettingsSectionId } from "./types/settings";
import {
  GeneralSection,
  NotificationsSection,
  PersonalizationSection,
  AppsSection,
  DataControlsSection,
  SecuritySection,
  AccountSection,
} from "./sections";

interface SettingsViewProps {
  onClose: () => void;
}

const sectionComponents: Record<SettingsSectionId, React.ComponentType> = {
  general: GeneralSection,
  notifications: NotificationsSection,
  personalization: PersonalizationSection,
  apps: AppsSection,
  "data-controls": DataControlsSection,
  security: SecuritySection,
  account: AccountSection,
};

export function SettingsView({ onClose }: SettingsViewProps) {
  const [activeSection, setActiveSection] = React.useState<SettingsSectionId>("general");

  const SectionComponent = sectionComponents[activeSection];

  // Close on Escape
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-0 md:p-6"
      onClick={onClose}
      dir="rtl"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
        className={
          /* Mobile: full height  |  Desktop/iPad: centered modal */
          "w-full h-[100dvh] md:h-[600px] md:max-w-[680px] md:rounded-2xl " +
          "flex flex-col md:flex-row overflow-hidden " +
          /* Glass غامق — الإطار الخارجي */
          "bg-[#264a46]/90 backdrop-blur-2xl " +
          "border-0 md:border md:border-white/10 " +
          "shadow-[0_8px_40px_rgba(0,0,0,0.4)]"
        }
        onClick={(e) => e.stopPropagation()}
      >
        {/* ───── Sidebar (desktop: vertical right | mobile: horizontal top) ───── */}
        <SettingsSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          onClose={onClose}
        />

        {/* ───── Content Panel — Glass فاتح ───── */}
        <div
          className={
            "flex-1 overflow-y-auto custom-scrollbar " +
            /* Glass-lite background */
            "bg-white/10 backdrop-blur-[40px] saturate-[160%] " +
            /* Desktop: rounded left edge, border-right (RTL) */
            "md:border-r md:border-white/14 md:rounded-l-2xl"
          }
        >
          <div className="p-5 sm:p-6 max-w-xl mx-auto w-full">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <SectionComponent />
            </motion.div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
