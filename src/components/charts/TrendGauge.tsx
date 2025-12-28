"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

interface TrendGaugeProps {
  bullishPercent: number; // 0-100
  bearishPercent: number; // 0-100
  size?: "sm" | "md" | "lg";
  showLabels?: boolean;
  animated?: boolean;
}

/**
 * TrendGauge Component
 * مكون مقياس الاتجاه - يعرض نسبة الصعود والهبوط
 */
export function TrendGauge({
  bullishPercent,
  bearishPercent,
  size = "md",
  showLabels = true,
  animated = true,
}: TrendGaugeProps) {
  const sizeConfig = useMemo(() => {
    switch (size) {
      case "sm":
        return { height: 6, gap: 1, fontSize: "text-xs" };
      case "lg":
        return { height: 12, gap: 2, fontSize: "text-base" };
      default:
        return { height: 8, gap: 1.5, fontSize: "text-sm" };
    }
  }, [size]);

  // Normalize percentages
  const total = bullishPercent + bearishPercent;
  const normalizedBullish = total > 0 ? (bullishPercent / total) * 100 : 50;
  const normalizedBearish = total > 0 ? (bearishPercent / total) * 100 : 50;

  // Determine dominant trend
  const dominantTrend = normalizedBullish > normalizedBearish ? "bullish" : normalizedBearish > normalizedBullish ? "bearish" : "neutral";

  const BarComponent = animated ? motion.div : "div";

  return (
    <div className="flex flex-col w-full">
      {showLabels && (
        <div className={`flex justify-between mb-1 ${sizeConfig.fontSize}`}>
          <span className="text-[#186d48] font-medium">
            {normalizedBullish.toFixed(0)}%
          </span>
          <span className="text-[#a9203e] font-medium">
            {normalizedBearish.toFixed(0)}%
          </span>
        </div>
      )}
      
      <div 
        className="flex w-full rounded-full overflow-hidden bg-gray-300 dark:bg-gray-700"
        style={{ height: sizeConfig.height, gap: sizeConfig.gap }}
      >
        {/* Bullish Bar */}
        <BarComponent
          className="bg-gradient-to-r from-[#186d48] to-[#1a7d52] rounded-l-full"
          style={{ width: `${normalizedBullish}%` }}
          {...(animated && {
            initial: { width: 0 },
            animate: { width: `${normalizedBullish}%` },
            transition: { duration: 0.8, ease: "easeOut" }
          })}
        />
        
        {/* Bearish Bar */}
        <BarComponent
          className="bg-gradient-to-r from-[#a9203e] to-[#c02848] rounded-r-full"
          style={{ width: `${normalizedBearish}%` }}
          {...(animated && {
            initial: { width: 0 },
            animate: { width: `${normalizedBearish}%` },
            transition: { duration: 0.8, ease: "easeOut", delay: 0.1 }
          })}
        />
      </div>
      
      {showLabels && (
        <div className={`flex justify-center mt-1 ${sizeConfig.fontSize}`}>
          <span className={`font-bold ${
            dominantTrend === "bullish" 
              ? "text-[#186d48]" 
              : dominantTrend === "bearish" 
                ? "text-[#a9203e]" 
                : "text-black/60 dark:text-gray-400"
          }`}>
            {dominantTrend === "bullish" && "صعودي 📈"}
            {dominantTrend === "bearish" && "هبوطي 📉"}
            {dominantTrend === "neutral" && "محايد ⚖️"}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * TrendGaugeCompact - نسخة مضغوطة للجداول
 */
export function TrendGaugeCompact({
  bullishPercent,
  bearishPercent,
}: {
  bullishPercent: number;
  bearishPercent: number;
}) {
  const total = bullishPercent + bearishPercent;
  const normalizedBullish = total > 0 ? (bullishPercent / total) * 100 : 50;
  
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex w-full h-2 rounded-full overflow-hidden bg-gray-300 dark:bg-gray-700">
        <motion.div
          className="bg-[#186d48]"
          initial={{ width: 0 }}
          animate={{ width: `${normalizedBullish}%` }}
          transition={{ duration: 0.5 }}
        />
        <motion.div
          className="bg-[#a9203e]"
          initial={{ width: 0 }}
          animate={{ width: `${100 - normalizedBullish}%` }}
          transition={{ duration: 0.5, delay: 0.05 }}
        />
      </div>
      <span className={`text-xs font-bold min-w-[40px] text-right ${
        normalizedBullish >= 50 ? "text-[#186d48]" : "text-[#a9203e]"
      }`}>
        {normalizedBullish.toFixed(0)}%
      </span>
    </div>
  );
}

/**
 * MultiTimeframeTrendGauge - مقياس متعدد الأطر الزمنية
 */
export function MultiTimeframeTrendGauge({
  timeframes,
}: {
  timeframes: {
    label: string;
    bullish: number;
    bearish: number;
  }[];
}) {
  return (
    <div className="flex flex-col gap-2 w-full">
      {timeframes.map((tf, idx) => (
        <div key={idx} className="flex items-center gap-3">
          <span className="text-xs text-black/60 dark:text-gray-400 w-12 text-right">
            {tf.label}
          </span>
          <div className="flex-1">
            <TrendGaugeCompact
              bullishPercent={tf.bullish}
              bearishPercent={tf.bearish}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * IndicatorSignalBadge - شارة إشارة المؤشر
 */
export function IndicatorSignalBadge({
  signal,
  strength,
  indicatorName,
}: {
  signal: "bullish" | "bearish" | "neutral";
  strength: number;
  indicatorName: string;
}) {
  const getSignalConfig = () => {
    switch (signal) {
      case "bullish":
        return {
          bg: "bg-[#186d48]/20",
          border: "border-[#186d48]/50",
          text: "text-[#186d48]",
          icon: "▲"
        };
      case "bearish":
        return {
          bg: "bg-[#a9203e]/20",
          border: "border-[#a9203e]/50",
          text: "text-[#a9203e]",
          icon: "▼"
        };
      default:
        return {
          bg: "bg-gray-500/20",
          border: "border-gray-500/50",
          text: "text-black/60 dark:text-gray-400",
          icon: "●"
        };
    }
  };

  const config = getSignalConfig();

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`
        inline-flex items-center gap-1 px-2 py-1 rounded-full
        ${config.bg} border ${config.border}
      `}
    >
      <span className={`text-xs font-bold ${config.text}`}>
        {config.icon}
      </span>
      <span className="text-xs text-black/70 dark:text-gray-300">{indicatorName}</span>
      <span className={`text-xs font-bold ${config.text}`}>
        {strength.toFixed(0)}%
      </span>
    </motion.div>
  );
}

/**
 * TrendSummaryCard - بطاقة ملخص الاتجاه
 */
export function TrendSummaryCard({
  symbol,
  bullishScore,
  bearishScore,
  indicators,
}: {
  symbol: string;
  bullishScore: number;
  bearishScore: number;
  indicators: {
    name: string;
    signal: "bullish" | "bearish" | "neutral";
    strength: number;
  }[];
}) {
  const overallTrend = bullishScore > bearishScore ? "صعودي" : bullishScore < bearishScore ? "هبوطي" : "محايد";
  const trendColor = bullishScore > bearishScore ? "text-[#186d48]" : bullishScore < bearishScore ? "text-[#a9203e]" : "text-black/60 dark:text-gray-400";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-100 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl p-4"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-black dark:text-white">{symbol}</h3>
        <span className={`text-xl font-bold ${trendColor}`}>
          {overallTrend}
        </span>
      </div>

      <TrendGauge
        bullishPercent={bullishScore}
        bearishPercent={bearishScore}
        size="lg"
      />

      <div className="mt-4 flex flex-wrap gap-2">
        {indicators.map((ind, idx) => (
          <IndicatorSignalBadge
            key={idx}
            signal={ind.signal}
            strength={ind.strength}
            indicatorName={ind.name}
          />
        ))}
      </div>
    </motion.div>
  );
}

export default TrendGauge;
