"use client";

/**
 * TimeframeSelector Component
 * مكون اختيار الإطار الزمني
 */

import { motion } from "framer-motion";

export interface Timeframe {
  value: string;
  label: string;
  labelAr: string;
}

export const TIMEFRAMES: Timeframe[] = [
  { value: "15m", label: "15m", labelAr: "15 دقيقة" },
  { value: "1h", label: "1H", labelAr: "ساعة" },
  { value: "4h", label: "4H", labelAr: "4 ساعات" },
  { value: "1d", label: "1D", labelAr: "يوم" },
  { value: "3d", label: "3D", labelAr: "3 أيام" },
];

interface TimeframeSelectorProps {
  selected: string;
  onChange: (timeframe: string) => void;
  className?: string;
}

export function TimeframeSelector({
  selected,
  onChange,
  className = "",
}: TimeframeSelectorProps) {
  return (
    <div className={`flex items-center gap-1 rounded-lg p-1 theme-surface ${className}`}>
      {TIMEFRAMES.map((tf) => (
        <motion.button
          key={tf.value}
          onClick={() => onChange(tf.value)}
          className={`
            px-3 py-1.5 rounded-md text-sm font-medium transition-all
            ${
              selected === tf.value
                ? "bg-primary text-white shadow-sm"
                : "text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white hover:bg-gray-300 dark:hover:bg-white/10"
            }
          `}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {tf.label}
        </motion.button>
      ))}
    </div>
  );
}

interface TimeframeSelectorVerticalProps {
  selected: string;
  onChange: (timeframe: string) => void;
  className?: string;
}

export function TimeframeSelectorVertical({
  selected,
  onChange,
  className = "",
}: TimeframeSelectorVerticalProps) {
  return (
    <div className={`flex flex-col gap-1 rounded-lg p-1 theme-surface ${className}`}>
      {TIMEFRAMES.map((tf) => (
        <motion.button
          key={tf.value}
          onClick={() => onChange(tf.value)}
          className={`
            px-3 py-2 rounded-md text-sm font-medium transition-all text-center
            ${
              selected === tf.value
                ? "bg-primary text-white shadow-sm"
                : "text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white hover:bg-gray-300 dark:hover:bg-white/10"
            }
          `}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="text-lg">{tf.label}</div>
          <div className="text-xs text-black/50 dark:text-gray-400">{tf.labelAr}</div>
        </motion.button>
      ))}
    </div>
  );
}

interface IntervalSelectorProps {
  intervals: { value: string; label: string }[];
  selected: string;
  onChange: (interval: string) => void;
  className?: string;
}

export function IntervalSelector({
  intervals,
  selected,
  onChange,
  className = "",
}: IntervalSelectorProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {intervals.map((interval) => (
        <button
          key={interval.value}
          onClick={() => onChange(interval.value)}
          className={`
            px-2 py-1 rounded text-xs font-medium transition-all
            ${
              selected === interval.value
                ? "bg-blue-500/30 text-blue-400 border border-blue-500/50"
                : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
            }
          `}
        >
          {interval.label}
        </button>
      ))}
    </div>
  );
}
