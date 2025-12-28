"use client";

/**
 * SignalsSidebar Component
 * الشريط الجانبي للإشارات - تصميم نصي بسيط
 */

import { Signal, SignalSummary, getSentimentColor, getSentimentIcon } from "@/lib/signals/signal-detector";

interface SignalsSidebarProps {
  signals: SignalSummary | null;
  loading?: boolean;
  className?: string;
}

export function SignalsSidebar({
  signals,
  loading = false,
  className = "",
}: SignalsSidebarProps) {
  if (loading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-black/20 dark:bg-black/40 rounded w-24"></div>
          <div className="h-20 bg-black/20 dark:bg-black/40 rounded"></div>
          <div className="h-4 bg-black/20 dark:bg-black/40 rounded w-16"></div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-black/20 dark:bg-black/40 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!signals) {
    return (
      <div className={`p-4 ${className}`}>
        <p className="text-muted-foreground text-center">لا توجد بيانات</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Sentiment Summary */}
      <div className="bg-[#0f3133] border border-white/10 rounded-xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Sentiment Label */}
          <div className="flex items-center gap-3">
            <span className="text-3xl">{getSentimentIcon(signals.overallSentiment)}</span>
            <div>
              <span
                className="text-xl font-bold block"
                style={{ color: getSentimentColor(signals.overallSentiment) }}
              >
                {signals.overallSentiment === "strong_buy" && "شراء قوي"}
                {signals.overallSentiment === "buy" && "شراء"}
                {signals.overallSentiment === "neutral" && "محايد"}
                {signals.overallSentiment === "sell" && "بيع"}
                {signals.overallSentiment === "strong_sell" && "بيع قوي"}
              </span>
              <p className="text-sm text-white/60 mt-1">{signals.recommendationAr}</p>
            </div>
          </div>
          
          {/* Score Bar */}
          <div className="flex-1 max-w-md">
            <div className="h-3 border border-white/10 rounded-full overflow-hidden theme-card">
              <div className="flex h-full">
                <div
                  className="bg-gradient-to-r from-[#a9203e] to-[#c02848] transition-all duration-500"
                  style={{ 
                    width: `${(signals.sellScore / (signals.buyScore + signals.sellScore || 1)) * 100}%` 
                  }}
                />
                <div
                  className="bg-gradient-to-r from-[#186d48] to-[#1a7d52] transition-all duration-500"
                  style={{ 
                    width: `${(signals.buyScore / (signals.buyScore + signals.sellScore || 1)) * 100}%` 
                  }}
                />
              </div>
            </div>
            <div className="flex justify-between text-xs mt-2">
              <span className="text-[#a9203e] font-medium">بيع: {signals.sellScore}</span>
              <span className="text-[#186d48] font-medium">شراء: {signals.buyScore}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Buy & Sell Signals - Side by Side */}
      <div className="border border-white/10 rounded-xl p-4 sm:p-5 theme-card">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Buy Signals */}
          <div>
            <h3 className="text-[#186d48] font-semibold mb-4 flex items-center gap-2 text-base border-b border-white/10 pb-3">
              <span>✅</span>
              <span>إشارات الشراء ({signals.buySignals.length})</span>
            </h3>
            <div className="space-y-3 max-h-52 overflow-y-auto custom-scrollbar pr-2">
              {signals.buySignals.length === 0 ? (
                <p className="text-white/50 text-sm text-center py-4">لا توجد إشارات شراء</p>
              ) : (
                signals.buySignals.map((signal, index) => (
                  <SignalItem key={signal.id} signal={signal} />
                ))
              )}
            </div>
          </div>

          {/* Sell Signals */}
          <div className="sm:border-l sm:border-white/10 sm:pl-6">
            <h3 className="text-[#a9203e] font-semibold mb-4 flex items-center gap-2 text-base border-b border-white/10 pb-3">
              <span>🔻</span>
              <span>إشارات البيع ({signals.sellSignals.length})</span>
            </h3>
            <div className="space-y-3 max-h-52 overflow-y-auto custom-scrollbar pr-2">
              {signals.sellSignals.length === 0 ? (
                <p className="text-white/50 text-sm text-center py-4">لا توجد إشارات بيع</p>
              ) : (
                signals.sellSignals.map((signal, index) => (
                  <SignalItem key={signal.id} signal={signal} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Signal Item - Simple text-based display
 */
function SignalItem({ signal }: { signal: Signal }) {
  const strengthStars = "⭐".repeat(signal.strength);
  
  return (
    <div className="flex items-start gap-2 py-1.5">
      <span className={`text-sm ${signal.type === "buy" ? "text-[#186d48]" : "text-[#a9203e]"}`}>
        {signal.type === "buy" ? "↗" : "↘"}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${
            signal.type === "buy" ? "text-[#186d48]" : "text-[#a9203e]"
          }`}>
            {signal.sourceAr}
          </span>
          <span className="text-[10px]">{strengthStars}</span>
        </div>
        <p className="text-xs text-black/60 dark:text-white/50 mt-0.5">
          {signal.descriptionAr}
        </p>
      </div>
    </div>
  );
}

interface CompactSignalBadgeProps {
  signal: Signal;
}

export function CompactSignalBadge({ signal }: CompactSignalBadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium
        ${signal.type === "buy" 
          ? "bg-[#186d48]/15 text-[#186d48] border border-[#186d48]/30" 
          : "bg-[#a9203e]/15 text-[#a9203e] border border-[#a9203e]/30"
        }
      `}
    >
      <span>{signal.type === "buy" ? "↗" : "↘"}</span>
      <span>{signal.sourceAr}</span>
    </span>
  );
}
