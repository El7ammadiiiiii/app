/**
 * نظام الألوان الذكي للإشارات والأخبار
 * Intelligent Color System for Signals & News
 * 
 * - الأرقام السلبية (نزول) = أحمر
 * - الأرقام الإيجابية (صعود) = أخضر
 * - الأخبار السلبية = خط أحمر أسفل النص
 * - الأخبار الإيجابية = خط أخضر أسفل النص
 */

export type SentimentType = "positive" | "negative" | "neutral";

// كلمات مفتاحية للكشف عن المشاعر
const POSITIVE_KEYWORDS = [
  // English
  "bullish", "buy", "up", "rise", "surge", "pump", "moon", "breakout", 
  "support", "accumulation", "growth", "gain", "profit", "approve", 
  "adoption", "partnership", "launch", "success", "record", "high",
  "recovery", "rally", "strong", "outperform",
  // Arabic
  "صعود", "ارتفاع", "شراء", "صاعد", "إيجابي", "موافقة", "نمو", "ربح",
  "دعم", "تجميع", "شراكة", "إطلاق", "نجاح", "قياسي", "أعلى", "تعافي",
  "قوي", "ممتاز", "رائع", "زيادة", "تحسن"
];

const NEGATIVE_KEYWORDS = [
  // English
  "bearish", "sell", "down", "drop", "crash", "dump", "fall", "breakdown",
  "resistance", "distribution", "loss", "decline", "reject", "ban",
  "hack", "scam", "fraud", "warning", "risk", "low", "weak",
  "correction", "fear", "concern", "underperform",
  // Arabic
  "هبوط", "انخفاض", "بيع", "هابط", "سلبي", "رفض", "خسارة", "تراجع",
  "مقاومة", "تصريف", "اختراق", "احتيال", "تحذير", "خطر", "أدنى",
  "تصحيح", "خوف", "قلق", "ضعيف", "سيء", "فشل", "إفلاس"
];

/**
 * تحليل المشاعر من النص
 */
export function analyzeSentiment(text: string): SentimentType {
  const lowerText = text.toLowerCase();
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  for (const keyword of POSITIVE_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      positiveCount++;
    }
  }
  
  for (const keyword of NEGATIVE_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      negativeCount++;
    }
  }
  
  if (positiveCount > negativeCount) return "positive";
  if (negativeCount > positiveCount) return "negative";
  return "neutral";
}

/**
 * تحليل المشاعر من رقم التغيير
 */
export function analyzeChangeValue(value: string | number): SentimentType {
  const numValue = typeof value === 'string' 
    ? parseFloat(value.replace(/[^0-9.-]/g, '')) 
    : value;
  
  if (isNaN(numValue)) return "neutral";
  if (numValue > 0) return "positive";
  if (numValue < 0) return "negative";
  return "neutral";
}

/**
 * الحصول على لون النص للقيمة
 */
export function getValueColor(sentiment: SentimentType): string {
  switch (sentiment) {
    case "positive":
      return "text-green-500";
    case "negative":
      return "text-red-500";
    default:
      return "text-muted-foreground";
  }
}

/**
 * الحصول على لون الخلفية للقيمة
 */
export function getValueBgColor(sentiment: SentimentType): string {
  switch (sentiment) {
    case "positive":
      return "bg-green-500/10";
    case "negative":
      return "bg-red-500/10";
    default:
      return "bg-muted/10";
  }
}

/**
 * الحصول على ستايل الخط السفلي للأخبار
 */
export function getNewsUnderlineStyle(sentiment: SentimentType): string {
  switch (sentiment) {
    case "positive":
      return "underline decoration-green-500 decoration-2 underline-offset-4";
    case "negative":
      return "underline decoration-red-500 decoration-2 underline-offset-4";
    default:
      return "";
  }
}

/**
 * الحصول على كلاسات CSS كاملة للقيمة
 */
export function getValueClasses(value: string | number): {
  text: string;
  bg: string;
  border: string;
  sentiment: SentimentType;
} {
  const sentiment = analyzeChangeValue(value);
  
  return {
    sentiment,
    text: sentiment === "positive" 
      ? "text-green-500" 
      : sentiment === "negative" 
        ? "text-red-500" 
        : "text-muted-foreground",
    bg: sentiment === "positive"
      ? "bg-green-500/10"
      : sentiment === "negative"
        ? "bg-red-500/10"
        : "bg-muted/10",
    border: sentiment === "positive"
      ? "border-green-500/20"
      : sentiment === "negative"
        ? "border-red-500/20"
        : "border-border",
  };
}

/**
 * الحصول على كلاسات CSS للأخبار
 */
export function getNewsClasses(text: string): {
  underline: string;
  sentiment: SentimentType;
  indicator: string;
} {
  const sentiment = analyzeSentiment(text);
  
  return {
    sentiment,
    underline: sentiment === "positive"
      ? "underline decoration-green-500 decoration-2 underline-offset-4"
      : sentiment === "negative"
        ? "underline decoration-red-500 decoration-2 underline-offset-4"
        : "",
    indicator: sentiment === "positive"
      ? "bg-green-500"
      : sentiment === "negative"
        ? "bg-red-500"
        : "bg-muted",
  };
}

/**
 * تنسيق رقم التغيير مع اللون
 */
export function formatChange(value: string | number): {
  formatted: string;
  color: string;
  bgColor: string;
  isPositive: boolean;
  isNegative: boolean;
} {
  const numValue = typeof value === 'string'
    ? parseFloat(value.replace(/[^0-9.-]/g, ''))
    : value;
  
  const isPositive = numValue > 0;
  const isNegative = numValue < 0;
  
  let formatted = typeof value === 'string' ? value : `${numValue}%`;
  
  // إضافة + للأرقام الإيجابية إذا لم تكن موجودة
  if (isPositive && typeof value === 'string' && !value.startsWith('+')) {
    formatted = `+${value}`;
  }
  
  return {
    formatted,
    color: isPositive ? "text-green-500" : isNegative ? "text-red-500" : "text-muted-foreground",
    bgColor: isPositive ? "bg-green-500/10" : isNegative ? "bg-red-500/10" : "bg-muted/10",
    isPositive,
    isNegative,
  };
}
