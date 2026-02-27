"use client";

/**
 * SignalsSidebar Component
 * الشريط الجانبي للإشارات - تصميم نصي بسيط
 */

import { Signal, SignalSummary, getSentimentIcon } from "@/lib/signals/signal-detector";

const WIDTH_CLASSES = [
  "w-0",
  "w-[5%]",
  "w-[10%]",
  "w-[15%]",
  "w-[20%]",
  "w-[25%]",
  "w-[30%]",
  "w-[35%]",
  "w-[40%]",
  "w-[45%]",
  "w-[50%]",
  "w-[55%]",
  "w-[60%]",
  "w-[65%]",
  "w-[70%]",
  "w-[75%]",
  "w-[80%]",
  "w-[85%]",
  "w-[90%]",
  "w-[95%]",
  "w-full",
];

const getWidthClass = ( percent: number ) =>
{
  const clamped = Math.min( 100, Math.max( 0, percent ) );
  const index = Math.min( 20, Math.max( 0, Math.round( clamped / 5 ) ) );
  return WIDTH_CLASSES[ index ];
};

const SENTIMENT_TEXT_CLASS: Record<string, string> = {
  strong_buy: "text-[#186d48]",
  buy: "text-[#1a7d52]",
  neutral: "text-white/80",
  sell: "text-[#c02848]",
  strong_sell: "text-[#a9203e]",
};

interface SignalsSidebarProps
{
  signals: SignalSummary | null;
  loading?: boolean;
  className?: string;
}

export function SignalsSidebar ( {
  signals,
  loading = false,
  className = "",
}: SignalsSidebarProps )
{
  if ( loading )
  {
    return (
      <div className={ `p-4 ${ className }` }>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-black/20 dark:bg-black/40 rounded w-24"></div>
          <div className="h-20 bg-black/20 dark:bg-black/40 rounded"></div>
          <div className="h-4 bg-black/20 dark:bg-black/40 rounded w-16"></div>
          <div className="space-y-2">
            { [ 1, 2, 3 ].map( ( i ) => (
              <div key={ i } className="h-8 bg-black/20 dark:bg-black/40 rounded"></div>
            ) ) }
          </div>
        </div>
      </div>
    );
  }

  if ( !signals )
  {
    return (
      <div className={ `p-4 ${ className }` }>
        <p className="text-muted-foreground text-center">لا توجد بيانات</p>
      </div>
    );
  }

  return (
    <div className={ `space-y-4 ${ className }` }>
      {/* Sentiment Summary */ }
      <div className="glass-lite glass-lite--strong border border-white/10 rounded-xl p-8 sm:p-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          {/* Sentiment Label */ }
          <div className="flex items-center gap-4">
            <span className="text-6xl">{ getSentimentIcon( signals.overallSentiment ) }</span>
            <div>
              <span
                className={ `text-4xl font-bold block ${ SENTIMENT_TEXT_CLASS[ signals.overallSentiment ] || "text-white" }` }
              >
                { signals.overallSentiment === "strong_buy" && "شراء قوي" }
                { signals.overallSentiment === "buy" && "شراء" }
                { signals.overallSentiment === "neutral" && "محايد" }
                { signals.overallSentiment === "sell" && "بيع" }
                { signals.overallSentiment === "strong_sell" && "بيع قوي" }
              </span>
              <p className="text-base text-white/60 mt-2">{ signals.recommendationAr }</p>
            </div>
          </div>

          {/* Score Bar */ }
          <div className="flex-1 max-w-md">
            <div className="h-6 border border-white/10 rounded-full overflow-hidden theme-card">
              <div className="flex h-full">
                <div
                  className={ `bg-gradient-to-r from-[#a9203e] to-[#c02848] transition-all duration-500 ${ getWidthClass( ( signals.sellScore / ( signals.buyScore + signals.sellScore || 1 ) ) * 100 ) }` }
                />
                <div
                  className={ `bg-gradient-to-r from-[#186d48] to-[#1a7d52] transition-all duration-500 ${ getWidthClass( ( signals.buyScore / ( signals.buyScore + signals.sellScore || 1 ) ) * 100 ) }` }
                />
              </div>
            </div>
            <div className="flex justify-between text-base mt-3">
              <span className="text-[#a9203e] font-medium">بيع: { signals.sellScore }</span>
              <span className="text-[#186d48] font-medium">شراء: { signals.buyScore }</span>
            </div>
          </div>
        </div>
      </div>

      {/* Buy & Sell Signals - Side by Side */ }
      <div className="border border-white/10 rounded-xl p-6 sm:p-8 theme-card">
        <div className="grid grid-cols-2 gap-4 sm:gap-8">
          {/* Buy Signals */ }
          <div>
            <h3 className="text-[#186d48] font-semibold mb-4 flex items-center gap-2 text-lg sm:text-xl border-b border-white/10 pb-3">
              <span>✅</span>
              <span>إشارات الشراء ({ signals.buySignals.length })</span>
            </h3>
            <div className="space-y-2 max-h-64 sm:max-h-96 overflow-y-auto custom-scrollbar pr-2">
              { signals.buySignals.length === 0 ? (
                <p className="text-white/50 text-base sm:text-lg text-center py-4">لا توجد إشارات شراء</p>
              ) : (
                signals.buySignals.map( ( signal, index ) => (
                  <SignalItem key={ signal.id } signal={ signal } />
                ) )
              ) }
            </div>
          </div>

          {/* Sell Signals */ }
          <div className="border-l border-white/10 pl-4 sm:pl-8">
            <h3 className="text-[#a9203e] font-semibold mb-4 flex items-center gap-2 text-lg sm:text-xl border-b border-white/10 pb-3">
              <span>🔻</span>
              <span>إشارات البيع ({ signals.sellSignals.length })</span>
            </h3>
            <div className="space-y-2 max-h-64 sm:max-h-96 overflow-y-auto custom-scrollbar pr-2">
              { signals.sellSignals.length === 0 ? (
                <p className="text-white/50 text-base sm:text-lg text-center py-4">لا توجد إشارات بيع</p>
              ) : (
                signals.sellSignals.map( ( signal, index ) => (
                  <SignalItem key={ signal.id } signal={ signal } />
                ) )
              ) }
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
function SignalItem ( { signal }: { signal: Signal } )
{
  const strengthStars = "⭐".repeat( signal.strength );

  return (
    <div className="flex items-start gap-3 py-3">
      <span className={ `text-xl ${ signal.type === "buy" ? "text-[#186d48]" : "text-[#a9203e]" }` }>
        { signal.type === "buy" ? "↗" : "↘" }
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <span className={ `text-lg font-medium ${ signal.type === "buy" ? "text-[#186d48]" : "text-[#a9203e]"
            }` }>
            { signal.sourceAr }
          </span>
          <span className="text-base">{ strengthStars }</span>
        </div>
        <p className="text-base text-black/60 dark:text-white/50 mt-1">
          { signal.descriptionAr }
        </p>
      </div>
    </div>
  );
}

interface CompactSignalBadgeProps
{
  signal: Signal;
}

export function CompactSignalBadge ( { signal }: CompactSignalBadgeProps )
{
  return (
    <span
      className={ `
        inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium
        ${ signal.type === "buy"
          ? "bg-[#186d48]/15 text-[#186d48] border border-[#186d48]/30"
          : "bg-[#a9203e]/15 text-[#a9203e] border border-[#a9203e]/30"
        }
      `}
    >
      <span>{ signal.type === "buy" ? "↗" : "↘" }</span>
      <span>{ signal.sourceAr }</span>
    </span>
  );
}
