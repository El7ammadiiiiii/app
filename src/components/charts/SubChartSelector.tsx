"use client";

/**
 * Sub Chart Selector - أزرار اختيار الرسوم البيانية الفرعية
 * يسمح للمستخدم باختيار أي من Volume, RSI, StochRSI, MACD, OBV, ADX
 */

import { useState } from "react";
import { motion } from "framer-motion";

export interface SubChartSettings {
  volume: boolean;
  rsi: boolean;
  stochRsi: boolean;
  macd: boolean;
  obv: boolean;
  adx: boolean;
  // Advanced RSI
  connorsRsi: boolean;
  laguerreRsi: boolean;
  // Ehlers DSP
  fisherTransform: boolean;
  cyberCycle: boolean;
  // Advanced Volume
  cvd: boolean;
  klinger: boolean;
  mfi: boolean;
}

export const defaultSubChartSettings: SubChartSettings = {
  volume: true,
  rsi: true,
  stochRsi: true,
  macd: true,
  obv: true,
  adx: true,
  // Advanced RSI
  connorsRsi: false,
  laguerreRsi: false,
  // Ehlers DSP
  fisherTransform: false,
  cyberCycle: false,
  // Advanced Volume
  cvd: false,
  klinger: false,
  mfi: false,
};

interface SubChartSelectorProps {
  settings: SubChartSettings;
  onChange: (settings: SubChartSettings) => void;
}

const subCharts = [
  { key: "volume" as keyof SubChartSettings, label: "Volume", labelAr: "الحجم", color: "#6366f1" },
  { key: "rsi" as keyof SubChartSettings, label: "RSI", labelAr: "RSI", color: "#8b5cf6" },
  { key: "stochRsi" as keyof SubChartSettings, label: "Stoch RSI", labelAr: "Stoch RSI", color: "#a855f7" },
  { key: "macd" as keyof SubChartSettings, label: "MACD", labelAr: "MACD", color: "#22c55e" },
  { key: "obv" as keyof SubChartSettings, label: "OBV", labelAr: "OBV", color: "#14b8a6" },
  { key: "adx" as keyof SubChartSettings, label: "ADX", labelAr: "ADX", color: "#f59e0b" },
  // Advanced RSI
  { key: "connorsRsi" as keyof SubChartSettings, label: "Connors RSI", labelAr: "Connors RSI", color: "#ec4899" },
  { key: "laguerreRsi" as keyof SubChartSettings, label: "Laguerre RSI", labelAr: "Laguerre RSI", color: "#db2777" },
  // Ehlers DSP
  { key: "fisherTransform" as keyof SubChartSettings, label: "Fisher Transform", labelAr: "تحويل فيشر", color: "#7c3aed" },
  { key: "cyberCycle" as keyof SubChartSettings, label: "Cyber Cycle", labelAr: "الدورة السيبرانية", color: "#4c1d95" },
  // Advanced Volume
  { key: "cvd" as keyof SubChartSettings, label: "CVD", labelAr: "دلتا الحجم", color: "#0d9488" },
  { key: "klinger" as keyof SubChartSettings, label: "Klinger", labelAr: "Klinger", color: "#d97706" },
  { key: "mfi" as keyof SubChartSettings, label: "MFI", labelAr: "تدفق الأموال", color: "#78350f" },
];

export function SubChartSelector({ settings, onChange }: SubChartSelectorProps) {
  const toggleChart = (key: keyof SubChartSettings) => {
    onChange({
      ...settings,
      [key]: !settings[key],
    });
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 p-3 backdrop-blur-sm border-t border-white/5 theme-surface">
      {subCharts.map((chart) => (
        <motion.button
          key={chart.key}
          onClick={() => toggleChart(chart.key)}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
            ${settings[chart.key]
              ? "bg-primary/20 text-primary border border-primary/40"
              : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white/70"
            }
          `}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div
            className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
              settings[chart.key]
                ? "border-primary bg-primary"
                : "border-white/30"
            }`}
          >
            {settings[chart.key] && (
              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          {chart.label}
        </motion.button>
      ))}
    </div>
  );
}

// Hook to manage sub chart settings with localStorage persistence
export function useSubChartSettings() {
  const getInitialSettings = (): SubChartSettings => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("subChartSettings");
      if (saved) {
        try {
          return { ...defaultSubChartSettings, ...JSON.parse(saved) };
        } catch {
          return defaultSubChartSettings;
        }
      }
    }
    return defaultSubChartSettings;
  };

  const [settings, setSettings] = useState<SubChartSettings>(getInitialSettings);

  const updateSettings = (newSettings: SubChartSettings) => {
    setSettings(newSettings);
    if (typeof window !== "undefined") {
      localStorage.setItem("subChartSettings", JSON.stringify(newSettings));
    }
  };

  return { settings, updateSettings };
}
