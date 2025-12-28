/**
 * Candlestick Pattern Detection
 * كشف أنماط الشموع اليابانية
 */

export interface CandleData {
  open: number;
  high: number;
  low: number;
  close: number;
  timestamp: number;
}

export interface PatternResult {
  name: string;
  nameAr: string;
  type: "bullish" | "bearish" | "neutral";
  strength: number; // 1-3 (weak, moderate, strong)
  description: string;
  index: number;
}

/**
 * Check if candle is bullish
 */
function isBullish(candle: CandleData): boolean {
  return candle.close > candle.open;
}

/**
 * Check if candle is bearish
 */
function isBearish(candle: CandleData): boolean {
  return candle.close < candle.open;
}

/**
 * Get candle body size
 */
function bodySize(candle: CandleData): number {
  return Math.abs(candle.close - candle.open);
}

/**
 * Get candle range (high - low)
 */
function candleRange(candle: CandleData): number {
  return candle.high - candle.low;
}

/**
 * Get upper shadow
 */
function upperShadow(candle: CandleData): number {
  return candle.high - Math.max(candle.open, candle.close);
}

/**
 * Get lower shadow
 */
function lowerShadow(candle: CandleData): number {
  return Math.min(candle.open, candle.close) - candle.low;
}

/**
 * Check for Doji pattern
 * شمعة الدوجي
 */
export function isDoji(candle: CandleData): boolean {
  const range = candleRange(candle);
  if (range === 0) return false;
  
  const body = bodySize(candle);
  return body / range < 0.1; // Body is less than 10% of range
}

/**
 * Check for Hammer pattern (bullish reversal)
 * شمعة المطرقة
 */
export function isHammer(candle: CandleData): boolean {
  const body = bodySize(candle);
  const range = candleRange(candle);
  const lower = lowerShadow(candle);
  const upper = upperShadow(candle);
  
  if (range === 0 || body === 0) return false;
  
  return (
    lower >= body * 2 && // Lower shadow at least 2x body
    upper <= body * 0.3 && // Upper shadow is small
    body / range >= 0.1 // Has a real body
  );
}

/**
 * Check for Inverted Hammer pattern
 * شمعة المطرقة المقلوبة
 */
export function isInvertedHammer(candle: CandleData): boolean {
  const body = bodySize(candle);
  const range = candleRange(candle);
  const lower = lowerShadow(candle);
  const upper = upperShadow(candle);
  
  if (range === 0 || body === 0) return false;
  
  return (
    upper >= body * 2 && // Upper shadow at least 2x body
    lower <= body * 0.3 && // Lower shadow is small
    body / range >= 0.1 // Has a real body
  );
}

/**
 * Check for Hanging Man pattern (bearish reversal)
 * شمعة الرجل المشنوق
 */
export function isHangingMan(candle: CandleData, prevCandles: CandleData[]): boolean {
  // Same shape as hammer but in uptrend
  if (!isHammer(candle)) return false;
  
  if (prevCandles.length < 3) return false;
  
  // Check for uptrend
  const trend = prevCandles.slice(-3).every((c, i, arr) => 
    i === 0 || c.close > arr[i - 1].close
  );
  
  return trend;
}

/**
 * Check for Shooting Star pattern (bearish reversal)
 * شمعة النجم الساقط
 */
export function isShootingStar(candle: CandleData, prevCandles: CandleData[]): boolean {
  // Same shape as inverted hammer but in uptrend
  if (!isInvertedHammer(candle)) return false;
  
  if (prevCandles.length < 3) return false;
  
  // Check for uptrend
  const trend = prevCandles.slice(-3).every((c, i, arr) => 
    i === 0 || c.close > arr[i - 1].close
  );
  
  return trend;
}

/**
 * Check for Bullish Engulfing pattern
 * نمط الابتلاع الصعودي
 */
export function isBullishEngulfing(candle: CandleData, prevCandle: CandleData): boolean {
  return (
    isBearish(prevCandle) &&
    isBullish(candle) &&
    candle.open < prevCandle.close &&
    candle.close > prevCandle.open &&
    bodySize(candle) > bodySize(prevCandle)
  );
}

/**
 * Check for Bearish Engulfing pattern
 * نمط الابتلاع الهبوطي
 */
export function isBearishEngulfing(candle: CandleData, prevCandle: CandleData): boolean {
  return (
    isBullish(prevCandle) &&
    isBearish(candle) &&
    candle.open > prevCandle.close &&
    candle.close < prevCandle.open &&
    bodySize(candle) > bodySize(prevCandle)
  );
}

/**
 * Check for Morning Star pattern (bullish reversal)
 * نمط نجمة الصباح
 */
export function isMorningStar(candles: CandleData[]): boolean {
  if (candles.length < 3) return false;
  
  const [first, second, third] = candles.slice(-3);
  
  return (
    isBearish(first) &&
    bodySize(first) > candleRange(first) * 0.5 && // Strong bearish candle
    bodySize(second) < candleRange(second) * 0.3 && // Small body (star)
    second.close < first.close && // Gap down
    isBullish(third) &&
    bodySize(third) > candleRange(third) * 0.5 && // Strong bullish candle
    third.close > (first.open + first.close) / 2 // Closes above midpoint of first
  );
}

/**
 * Check for Evening Star pattern (bearish reversal)
 * نمط نجمة المساء
 */
export function isEveningStar(candles: CandleData[]): boolean {
  if (candles.length < 3) return false;
  
  const [first, second, third] = candles.slice(-3);
  
  return (
    isBullish(first) &&
    bodySize(first) > candleRange(first) * 0.5 && // Strong bullish candle
    bodySize(second) < candleRange(second) * 0.3 && // Small body (star)
    second.close > first.close && // Gap up
    isBearish(third) &&
    bodySize(third) > candleRange(third) * 0.5 && // Strong bearish candle
    third.close < (first.open + first.close) / 2 // Closes below midpoint of first
  );
}

/**
 * Check for Three White Soldiers pattern (strong bullish)
 * نمط الجنود البيض الثلاثة
 */
export function isThreeWhiteSoldiers(candles: CandleData[]): boolean {
  if (candles.length < 3) return false;
  
  const [first, second, third] = candles.slice(-3);
  
  return (
    isBullish(first) && isBullish(second) && isBullish(third) &&
    second.open > first.open && second.close > first.close &&
    third.open > second.open && third.close > second.close &&
    upperShadow(first) < bodySize(first) * 0.3 &&
    upperShadow(second) < bodySize(second) * 0.3 &&
    upperShadow(third) < bodySize(third) * 0.3
  );
}

/**
 * Check for Three Black Crows pattern (strong bearish)
 * نمط الغربان السود الثلاثة
 */
export function isThreeBlackCrows(candles: CandleData[]): boolean {
  if (candles.length < 3) return false;
  
  const [first, second, third] = candles.slice(-3);
  
  return (
    isBearish(first) && isBearish(second) && isBearish(third) &&
    second.open < first.open && second.close < first.close &&
    third.open < second.open && third.close < second.close &&
    lowerShadow(first) < bodySize(first) * 0.3 &&
    lowerShadow(second) < bodySize(second) * 0.3 &&
    lowerShadow(third) < bodySize(third) * 0.3
  );
}

/**
 * Detect all patterns in candle data
 * كشف جميع الأنماط في بيانات الشموع
 */
export function detectPatterns(candles: CandleData[]): PatternResult[] {
  const patterns: PatternResult[] = [];
  
  if (candles.length < 3) return patterns;
  
  const lastIndex = candles.length - 1;
  const current = candles[lastIndex];
  const previous = candles[lastIndex - 1];
  const prevCandles = candles.slice(0, -1);
  
  // Single candle patterns
  if (isDoji(current)) {
    patterns.push({
      name: "Doji",
      nameAr: "دوجي",
      type: "neutral",
      strength: 1,
      description: "Market indecision",
      index: lastIndex
    });
  }
  
  if (isHammer(current)) {
    patterns.push({
      name: "Hammer",
      nameAr: "المطرقة",
      type: "bullish",
      strength: 2,
      description: "Potential bullish reversal",
      index: lastIndex
    });
  }
  
  if (isInvertedHammer(current)) {
    patterns.push({
      name: "Inverted Hammer",
      nameAr: "المطرقة المقلوبة",
      type: "bullish",
      strength: 2,
      description: "Potential bullish reversal",
      index: lastIndex
    });
  }
  
  if (isHangingMan(current, prevCandles)) {
    patterns.push({
      name: "Hanging Man",
      nameAr: "الرجل المشنوق",
      type: "bearish",
      strength: 2,
      description: "Potential bearish reversal after uptrend",
      index: lastIndex
    });
  }
  
  if (isShootingStar(current, prevCandles)) {
    patterns.push({
      name: "Shooting Star",
      nameAr: "النجم الساقط",
      type: "bearish",
      strength: 2,
      description: "Potential bearish reversal after uptrend",
      index: lastIndex
    });
  }
  
  // Two candle patterns
  if (isBullishEngulfing(current, previous)) {
    patterns.push({
      name: "Bullish Engulfing",
      nameAr: "الابتلاع الصعودي",
      type: "bullish",
      strength: 3,
      description: "Strong bullish reversal signal",
      index: lastIndex
    });
  }
  
  if (isBearishEngulfing(current, previous)) {
    patterns.push({
      name: "Bearish Engulfing",
      nameAr: "الابتلاع الهبوطي",
      type: "bearish",
      strength: 3,
      description: "Strong bearish reversal signal",
      index: lastIndex
    });
  }
  
  // Three candle patterns
  if (isMorningStar(candles)) {
    patterns.push({
      name: "Morning Star",
      nameAr: "نجمة الصباح",
      type: "bullish",
      strength: 3,
      description: "Strong bullish reversal after downtrend",
      index: lastIndex
    });
  }
  
  if (isEveningStar(candles)) {
    patterns.push({
      name: "Evening Star",
      nameAr: "نجمة المساء",
      type: "bearish",
      strength: 3,
      description: "Strong bearish reversal after uptrend",
      index: lastIndex
    });
  }
  
  if (isThreeWhiteSoldiers(candles)) {
    patterns.push({
      name: "Three White Soldiers",
      nameAr: "الجنود البيض الثلاثة",
      type: "bullish",
      strength: 3,
      description: "Strong bullish continuation",
      index: lastIndex
    });
  }
  
  if (isThreeBlackCrows(candles)) {
    patterns.push({
      name: "Three Black Crows",
      nameAr: "الغربان السود الثلاثة",
      type: "bearish",
      strength: 3,
      description: "Strong bearish continuation",
      index: lastIndex
    });
  }
  
  return patterns;
}

/**
 * Get pattern icon/emoji
 */
export function getPatternIcon(pattern: PatternResult): string {
  switch (pattern.type) {
    case "bullish":
      return pattern.strength === 3 ? "🚀" : pattern.strength === 2 ? "📈" : "⬆️";
    case "bearish":
      return pattern.strength === 3 ? "💥" : pattern.strength === 2 ? "📉" : "⬇️";
    default:
      return "➡️";
  }
}
