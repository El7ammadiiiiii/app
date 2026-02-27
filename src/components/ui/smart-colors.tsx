"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import
  {
    analyzeChangeValue,
    analyzeSentiment,
    getValueClasses,
    getNewsClasses,
    formatChange,
    type SentimentType
  } from "@/lib/sentiment-colors";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

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

/**
 * مكون لعرض الأرقام مع ألوان ذكية
 * Positive = Green, Negative = Red
 */
interface SmartValueProps
{
  value: string | number;
  showIcon?: boolean;
  showBackground?: boolean;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
}

export function SmartValue ( {
  value,
  showIcon = true,
  showBackground = false,
  className,
  size = "sm"
}: SmartValueProps )
{
  const { text, bg, sentiment } = getValueClasses( value );

  const sizeClasses = {
    xs: "text-[10px]",
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const iconSize = {
    xs: "w-3 h-3",
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <span className={ cn(
      "inline-flex items-center gap-1 font-bold",
      text,
      sizeClasses[ size ],
      showBackground && `${ bg } px-2 py-0.5 rounded-md`,
      className
    ) }>
      { showIcon && (
        sentiment === "positive" ? (
          <ArrowUpRight className={ iconSize[ size ] } />
        ) : sentiment === "negative" ? (
          <ArrowDownRight className={ iconSize[ size ] } />
        ) : (
          <Minus className={ iconSize[ size ] } />
        )
      ) }
      { typeof value === 'string' ? value : `${ value }%` }
    </span>
  );
}

/**
 * مكون لعرض الأخبار مع خط سفلي ملون
 * Positive = Green underline, Negative = Red underline
 */
interface SmartNewsProps
{
  children: React.ReactNode;
  text?: string;
  showIndicator?: boolean;
  className?: string;
}

export function SmartNews ( {
  children,
  text,
  showIndicator = false,
  className
}: SmartNewsProps )
{
  const content = text || ( typeof children === 'string' ? children : '' );
  const { underline, sentiment, indicator } = getNewsClasses( content );

  return (
    <span className={ cn( "relative inline-flex items-center gap-2", className ) }>
      { showIndicator && sentiment !== "neutral" && (
        <span className={ cn(
          "w-1.5 h-1.5 rounded-full shrink-0",
          indicator
        ) } />
      ) }
      <span className={ underline }>
        { children }
      </span>
    </span>
  );
}

/**
 * مكون لعرض بطاقة خبر مع تحليل المشاعر
 */
interface NewsCardProps
{
  title: string;
  source?: string;
  time?: string;
  className?: string;
  onClick?: () => void;
}

export function NewsCard ( {
  title,
  source,
  time,
  className,
  onClick
}: NewsCardProps )
{
  const { underline, sentiment, indicator } = getNewsClasses( title );

  return (
    <div
      onClick={ onClick }
      className={ cn(
        "group cursor-pointer p-3 rounded-xl hover:theme-surface/20 transition-all",
        className
      ) }
    >
      <div className="flex justify-between items-start mb-2">
        { source && (
          <span className={ cn(
            "text-[10px] font-bold px-2.5 py-1 rounded-md border",
            sentiment === "positive"
              ? "text-green-400 bg-green-500/10 border-green-500/20"
              : sentiment === "negative"
                ? "text-red-400 bg-red-500/10 border-red-500/20"
                : "text-blue-400 bg-blue-500/10 border-blue-500/20"
          ) }>
            { source }
          </span>
        ) }
        { time && (
          <span className="text-[10px] text-muted-foreground font-medium">{ time }</span>
        ) }
      </div>
      <div className="flex items-start gap-2">
        <span className={ cn(
          "w-1 h-1 rounded-full mt-2 shrink-0",
          indicator
        ) } />
        <h3 className={ cn(
          "text-sm font-medium text-foreground/90 group-hover:text-primary transition-colors line-clamp-2 leading-relaxed",
          underline
        ) }>
          { title }
        </h3>
      </div>
    </div>
  );
}

/**
 * مكون لعرض إحصائية مع لون ذكي
 */
interface SmartStatProps
{
  label: string;
  value: string;
  change?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function SmartStat ( {
  label,
  value,
  change,
  icon,
  className
}: SmartStatProps )
{
  const changeData = change ? formatChange( change ) : null;

  return (
    <div className={ cn(
      "relative p-5 rounded-2xl theme-card/40 border border-white/5 backdrop-blur-xl hover:theme-card/60 hover:border-primary/30 transition-all group overflow-hidden shadow-lg",
      className
    ) }>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-3">
          <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            { label }
          </span>
          { icon && (
            <span className={ cn(
              "p-1.5 rounded-lg theme-surface/50 backdrop-blur-sm border border-white/5",
              changeData?.isPositive
                ? "text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.2)]"
                : changeData?.isNegative
                  ? "text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                  : "text-muted-foreground"
            ) }>
              { icon }
            </span>
          ) }
        </div>
        <div className="text-2xl font-bold text-foreground mb-2 tracking-tight">
          { value }
        </div>
        { change && changeData && (
          <div className={ cn(
            "text-xs flex items-center gap-1.5 font-medium",
            changeData.color
          ) }>
            { changeData.isPositive ? (
              <ArrowUpRight className="w-3.5 h-3.5" />
            ) : changeData.isNegative ? (
              <ArrowDownRight className="w-3.5 h-3.5" />
            ) : (
              <Minus className="w-3.5 h-3.5" />
            ) }
            { changeData.formatted }
          </div>
        ) }
      </div>
    </div>
  );
}

/**
 * مكون لعرض تنبيه AI مع تحليل المشاعر
 */
interface AIInsightCardProps
{
  title: string;
  content: string;
  type?: string;
  time?: string;
  confidence?: string;
  sentiment?: "Bullish" | "Bearish" | "Neutral";
  className?: string;
}

export function AIInsightCard ( {
  title,
  content,
  type,
  time,
  confidence,
  sentiment,
  className
}: AIInsightCardProps )
{
  const contentSentiment = analyzeSentiment( content );
  const titleSentiment = analyzeSentiment( title );
  const confidenceValue = confidence ? Number.parseFloat( confidence ) : 0;

  // تحديد المشاعر الإجمالية
  type ExtendedSentiment = SentimentType | "bullish" | "bearish";
  const overallSentiment: ExtendedSentiment = sentiment
    ? sentiment.toLowerCase() as ExtendedSentiment
    : ( titleSentiment !== "neutral" ? titleSentiment : contentSentiment );

  const sentimentColors = {
    bullish: { text: "text-green-400", bg: "bg-green-500/10" },
    bearish: { text: "text-red-400", bg: "bg-red-500/10" },
    neutral: { text: "text-gray-400", bg: "bg-gray-500/10" },
    positive: { text: "text-green-400", bg: "bg-green-500/10" },
    negative: { text: "text-red-400", bg: "bg-red-500/10" },
  };

  const colors = sentimentColors[ overallSentiment ] || sentimentColors.neutral;

  return (
    <div className={ cn(
      "p-5 rounded-2xl theme-card/40 border border-white/5 hover:theme-card/60 transition-all group shadow-md backdrop-blur-md",
      overallSentiment === "positive" || overallSentiment === "bullish"
        ? "hover:border-green-500/30"
        : overallSentiment === "negative" || overallSentiment === "bearish"
          ? "hover:border-red-500/30"
          : "hover:border-primary/30",
      className
    ) }>
      <div className="flex justify-between items-start mb-3">
        { type && (
          <span className={ cn(
            "px-2.5 py-1 rounded-md text-[10px] font-bold border shadow-sm",
            type === "Technical" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
              type === "On-Chain" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                "bg-secondary/10 text-secondary border-secondary/20"
          ) }>
            { type }
          </span>
        ) }
        { time && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1.5 font-medium theme-surface/30 px-2 py-0.5 rounded-full">
            { time }
          </span>
        ) }
      </div>

      <h3 className={ cn(
        "text-sm font-bold text-foreground mb-2 transition-colors leading-tight",
        ( overallSentiment === "positive" || overallSentiment === "bullish" ) && "group-hover:text-green-400",
        ( overallSentiment === "negative" || overallSentiment === "bearish" ) && "group-hover:text-red-400",
        overallSentiment === "neutral" && "group-hover:text-primary"
      ) }>
        { title }
      </h3>

      <p className={ cn(
        "text-xs text-muted-foreground leading-relaxed mb-4 font-medium opacity-80",
        ( overallSentiment === "positive" || overallSentiment === "bullish" ) && "underline decoration-green-500/50 decoration-1 underline-offset-2",
        ( overallSentiment === "negative" || overallSentiment === "bearish" ) && "underline decoration-red-500/50 decoration-1 underline-offset-2"
      ) }>
        { content }
      </p>

      <div className="flex items-center justify-between pt-3 border-t border-white/5">
        { confidence && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground font-medium">الثقة:</span>
            <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
              <div
                className={ cn(
                  "h-full rounded-full",
                  getWidthClass( Number.isNaN( confidenceValue ) ? 0 : confidenceValue ),
                  overallSentiment === "positive" || overallSentiment === "bullish"
                    ? "bg-green-500"
                    : overallSentiment === "negative" || overallSentiment === "bearish"
                      ? "bg-red-500"
                      : "bg-primary"
                ) }
              />
            </div>
          </div>
        ) }
        { sentiment && (
          <span className={ cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full",
            colors.bg,
            colors.text
          ) }>
            { sentiment }
          </span>
        ) }
      </div>
    </div>
  );
}

export { analyzeSentiment, analyzeChangeValue, formatChange };
