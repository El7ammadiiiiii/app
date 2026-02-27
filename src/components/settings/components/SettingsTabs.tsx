"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Tab
{
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export interface SettingsTabsProps
{
  tabs: Tab[];
  activeTab: string;
  onTabChange: ( id: string ) => void;
  children?: React.ReactNode;
  className?: string;
}

export function SettingsTabs ( {
  tabs,
  activeTab,
  onTabChange,
  children,
  className,
}: SettingsTabsProps )
{
  return (
    <div className={ cn( "w-full", className ) }>
      {/* Tabs Header */ }
      <div className="flex gap-1 border-b border-white/8 mb-5 overflow-x-auto">
        { tabs.map( ( tab ) => (
          <button
            key={ tab.id }
            onClick={ () => onTabChange( tab.id ) }
            className={ cn(
              "relative px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap",
              "hover:text-white/90 focus:outline-none",
              activeTab === tab.id
                ? "text-teal-400"
                : "text-white/50"
            ) }
          >
            <div className="flex items-center gap-2">
              <span className="[&>svg]:w-4 [&>svg]:h-4">{ tab.icon }</span>
              <span>{ tab.label }</span>
            </div>

            {/* Active Indicator */ }
            { activeTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500"
                initial={ false }
                transition={ { type: "spring", stiffness: 500, damping: 30 } }
              />
            ) }
          </button>
        ) ) }
      </div>

      {/* Tab Content */ }
      { children && (
        <AnimatePresence mode="wait">
          <motion.div
            key={ activeTab }
            initial={ { opacity: 0, x: 10 } }
            animate={ { opacity: 1, x: 0 } }
            exit={ { opacity: 0, x: -10 } }
            transition={ { duration: 0.15 } }
          >
            { children }
          </motion.div>
        </AnimatePresence>
      ) }
    </div>
  );
}
