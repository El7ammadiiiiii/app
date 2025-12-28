"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  User,
  CreditCard,
  Lock,
  Palette,
  Globe,
  Mic,
  Bot,
  Link2,
  Settings,
  FolderOpen,
  Bell,
  Puzzle,
  Smartphone,
  Info,
  Search,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SettingsSectionId } from "./types/settings";

interface SettingsSidebarProps {
  activeSection: SettingsSectionId;
  onSectionChange: (section: SettingsSectionId) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClose?: () => void;
  isMobile?: boolean;
}

interface SectionItem {
  id: SettingsSectionId;
  label: string;
  icon: React.ReactNode;
  group?: string;
}

const sections: SectionItem[] = [
  { id: "account", label: "الحساب", icon: <User className="w-5 h-5" />, group: "الحساب" },
  { id: "subscription", label: "الاشتراك", icon: <CreditCard className="w-5 h-5" />, group: "الحساب" },
  { id: "privacy", label: "الخصوصية", icon: <Lock className="w-5 h-5" />, group: "الحساب" },
  
  { id: "appearance", label: "المظهر", icon: <Palette className="w-5 h-5" />, group: "التخصيص" },
  { id: "colors", label: "تخصيص الألوان", icon: <Palette className="w-5 h-5" />, group: "التخصيص" },
  { id: "language", label: "اللغة", icon: <Globe className="w-5 h-5" />, group: "التخصيص" },
  { id: "voice", label: "الصوت", icon: <Mic className="w-5 h-5" />, group: "التخصيص" },
  
  { id: "assistants", label: "المساعدات", icon: <Bot className="w-5 h-5" />, group: "الذكاء" },
  { id: "integrations", label: "التكاملات", icon: <Link2 className="w-5 h-5" />, group: "الذكاء" },
  { id: "plugins", label: "الإضافات", icon: <Puzzle className="w-5 h-5" />, group: "الذكاء" },
  
  { id: "files", label: "الملفات", icon: <FolderOpen className="w-5 h-5" />, group: "البيانات" },
  { id: "notifications", label: "الإشعارات", icon: <Bell className="w-5 h-5" />, group: "البيانات" },
  
  { id: "advanced", label: "متقدم", icon: <Settings className="w-5 h-5" />, group: "النظام" },
  { id: "app-settings", label: "التطبيق", icon: <Smartphone className="w-5 h-5" />, group: "النظام" },
  { id: "about", label: "حول", icon: <Info className="w-5 h-5" />, group: "النظام" },
];

export function SettingsSidebar({
  activeSection,
  onSectionChange,
  searchQuery,
  onSearchChange,
  onClose,
  isMobile = false,
}: SettingsSidebarProps) {
  // Group sections
  const groups = sections.reduce((acc, section) => {
    const group = section.group || "أخرى";
    if (!acc[group]) acc[group] = [];
    acc[group].push(section);
    return acc;
  }, {} as Record<string, SectionItem[]>);

  // Filter sections based on search
  const filteredSections = searchQuery
    ? sections.filter((s) =>
        s.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  return (
    <div
      className={cn(
        "h-full flex flex-col border-l border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl",
        isMobile ? "w-full" : "w-[240px]"
      )}
      dir="rtl"
    >
      {/* Header */}
      <div className="p-3 border-b border-[var(--glass-border)]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-foreground">الإعدادات</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="بحث في الإعدادات..."
            className={cn(
              "w-full pr-8 pl-2.5 py-1.5 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg",
              "text-xs text-foreground placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-primary/50"
            )}
          />
        </div>
      </div>

      {/* Sections List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {filteredSections ? (
          // Search Results
          <div className="space-y-0.5">
            {filteredSections.map((section, index) => (
              <SectionButton
                key={section.id}
                section={section}
                isActive={activeSection === section.id}
                index={index}
                onClick={() => {
                  onSectionChange(section.id);
                  if (isMobile) onClose?.();
                }}
              />
            ))}
            {filteredSections.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                لا توجد نتائج
              </p>
            )}
          </div>
        ) : (
          // Grouped Sections with Stagger
          Object.entries(groups).map(([groupName, groupSections], groupIndex) => (
            <motion.div 
              key={groupName}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: groupIndex * 0.08 }}
            >
              <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2.5 mb-1.5">
                {groupName}
              </h3>
              <div className="space-y-0.5">
                {groupSections.map((section, index) => (
                  <SectionButton
                    key={section.id}
                    section={section}
                    isActive={activeSection === section.id}
                    index={groupIndex * 3 + index}
                    onClick={() => {
                      onSectionChange(section.id);
                      if (isMobile) onClose?.();
                    }}
                  />
                ))}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

// Section Button Component with Staggered Animation
function SectionButton({
  section,
  isActive,
  onClick,
  index = 0,
}: {
  section: SectionItem;
  isActive: boolean;
  onClick: () => void;
  index?: number;
}) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, x: 20, filter: "blur(4px)" }}
      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
      transition={{ 
        delay: index * 0.03,
        type: "spring",
        stiffness: 400,
        damping: 25
      }}
      className={cn(
        "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs sm:text-sm transition-colors",
        "relative overflow-hidden",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-[var(--glass-bg)]"
      )}
      whileHover={{ x: -3, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
    >
      {isActive && (
        <motion.div
          layoutId="activeSectionIndicator"
          className="absolute right-0 top-0 bottom-0 w-0.5 bg-primary"
          initial={false}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
      <span className={cn(
        "[&>svg]:w-4 [&>svg]:h-4",
        isActive ? "text-primary" : ""
      )}>{section.icon}</span>
      <span className="font-medium">{section.label}</span>
    </motion.button>
  );
}
