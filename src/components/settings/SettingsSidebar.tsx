"use client";

import * as React from "react";
import {
  User,
  Settings,
  Bell,
  Sparkles,
  Grid2X2,
  ShieldCheck,
  Lock,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SettingsSectionId } from "./types/settings";

interface SettingsSidebarProps {
  activeSection: SettingsSectionId;
  onSectionChange: (section: SettingsSectionId) => void;
  onClose?: () => void;
}

interface SectionItem {
  id: SettingsSectionId;
  label: string;
  icon: React.ReactNode;
}

const sections: SectionItem[] = [
  { id: "general", label: "عام", icon: <Settings className="w-[18px] h-[18px]" /> },
  { id: "notifications", label: "الإشعارات", icon: <Bell className="w-[18px] h-[18px]" /> },
  { id: "personalization", label: "تخصيص", icon: <Sparkles className="w-[18px] h-[18px]" /> },
  { id: "apps", label: "التطبيقات", icon: <Grid2X2 className="w-[18px] h-[18px]" /> },
  { id: "data-controls", label: "عناصر التحكم في البيانات", icon: <ShieldCheck className="w-[18px] h-[18px]" /> },
  { id: "security", label: "الأمان", icon: <Lock className="w-[18px] h-[18px]" /> },
  { id: "account", label: "الحساب", icon: <User className="w-[18px] h-[18px]" /> },
];

/* ── Label lookup (for mobile header) ── */
const sectionLabelMap = Object.fromEntries(sections.map((s) => [s.id, s.label]));

export function SettingsSidebar({
  activeSection,
  onSectionChange,
  onClose,
}: SettingsSidebarProps) {
  return (
    <>
      {/* ═══════════════════════════════════════════════
          DESKTOP / IPAD — Vertical sidebar (right side)
          ═══════════════════════════════════════════════ */}
      <div
        className="hidden md:flex flex-col w-[210px] shrink-0 py-4 px-3 gap-1"
        dir="rtl"
      >
        {/* Close button */}
        {onClose && (
          <div className="flex items-center justify-between px-2 pb-3">
            <h2 className="text-sm font-semibold text-white/90">الإعدادات</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white/90 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab buttons */}
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onSectionChange(section.id)}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm transition-all text-right",
              activeSection === section.id
                ? "bg-white/15 text-white/95 font-medium shadow-sm border border-white/15"
                : "text-white/60 hover:bg-white/10 hover:text-white/80 border border-transparent"
            )}
          >
            <span className="shrink-0 opacity-80">{section.icon}</span>
            <span className="truncate">{section.label}</span>
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════
          MOBILE — Horizontal top bar (like ChatGPT phone)
          ═══════════════════════════════════════════════ */}
      <div className="md:hidden flex flex-col w-full shrink-0 z-10" dir="rtl">
        {/* Header: active section title + close */}
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-base font-semibold text-white/90">
            {sectionLabelMap[activeSection] ?? "الإعدادات"}
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white/90 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Horizontal scrollable tab strip */}
        <div className="px-3 pb-2.5 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-1.5 min-w-max">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => onSectionChange(section.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                  activeSection === section.id
                    ? "bg-white/15 text-white/95 shadow-sm border border-white/15"
                    : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80 border border-transparent"
                )}
              >
                <span className="[&>svg]:w-3.5 [&>svg]:h-3.5">{section.icon}</span>
                <span>{section.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
