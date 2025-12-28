/**
 * Divergence Types Catalog - كتالوج أنواع الدايفرجنس
 * نظام شامل يحتوي على 34 نوع مع البيانات الوصفية الكاملة
 * 
 * @module divergence-types-catalog
 * @version 2.0.0
 */

// ===============================
// Signal Quality Ratings
// ===============================
export enum SignalQuality {
  A_PLUS = 'A+',
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  F = 'F'
}

// ===============================
// Extended Indicator Types
// ===============================
export enum ExtendedIndicatorType {
  // Gold Tier (الفئة الذهبية)
  RSI = 'RSI',
  OBV = 'OBV',
  MFI = 'MFI',
  CCI = 'CCI',
  WILLIAMS_R = 'WILLIAMS_R',
  
  // Silver Tier (الفئة الفضية)
  MACD = 'MACD',
  STOCH_RSI = 'STOCH_RSI',
  ROC = 'ROC',
  FORCE_INDEX = 'FORCE_INDEX',
  CMF = 'CMF'
}

// ===============================
// Divergence Categories
// ===============================
export enum DivergenceCategory {
  REGULAR_BULLISH = 'regular_bullish',
  REGULAR_BEARISH = 'regular_bearish',
  HIDDEN_BULLISH = 'hidden_bullish',
  HIDDEN_BEARISH = 'hidden_bearish',
  EXAGGERATED_BULLISH = 'exaggerated_bullish',
  EXAGGERATED_BEARISH = 'exaggerated_bearish'
}

// ===============================
// Divergence Type Metadata
// ===============================
export interface DivergenceTypeMetadata {
  id: string;
  name: string;
  nameAr: string;
  category: DivergenceCategory;
  indicators: ExtendedIndicatorType[];
  description: string;
  descriptionAr: string;
  reliability: number; // 0-100
  quality: SignalQuality;
  emoji: string;
  color: string;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  tradingSignal: 'buy' | 'sell' | 'neutral';
  timeframeRecommendation: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

// ===============================
// Complete Catalog (34 Types)
// ===============================
export const DIVERGENCE_CATALOG: DivergenceTypeMetadata[] = [
  // REGULAR BULLISH (6 types)
  {
    id: 'reg_bull_rsi',
    name: 'Regular Bullish RSI',
    nameAr: 'صاعد منتظم RSI',
    category: DivergenceCategory.REGULAR_BULLISH,
    indicators: [ExtendedIndicatorType.RSI],
    description: 'Price makes lower low, RSI makes higher low',
    descriptionAr: 'السعر يسجل قاع أدنى، RSI يسجل قاع أعلى',
    reliability: 85,
    quality: SignalQuality.A_PLUS,
    emoji: '📈',
    color: '#22c55e',
    lineStyle: 'solid',
    tradingSignal: 'buy',
    timeframeRecommendation: ['1h', '4h', '1d'],
    riskLevel: 'low'
  },
  {
    id: 'reg_bull_macd',
    name: 'Regular Bullish MACD',
    nameAr: 'صاعد منتظم MACD',
    category: DivergenceCategory.REGULAR_BULLISH,
    indicators: [ExtendedIndicatorType.MACD],
    description: 'Price declining, MACD histogram rising',
    descriptionAr: 'السعر ينخفض، MACD هيستوغرام يرتفع',
    reliability: 80,
    quality: SignalQuality.A,
    emoji: '📊',
    color: '#10b981',
    lineStyle: 'solid',
    tradingSignal: 'buy',
    timeframeRecommendation: ['15m', '1h', '4h'],
    riskLevel: 'medium'
  },
  {
    id: 'reg_bull_obv',
    name: 'Regular Bullish OBV',
    nameAr: 'صاعد منتظم OBV',
    category: DivergenceCategory.REGULAR_BULLISH,
    indicators: [ExtendedIndicatorType.OBV],
    description: 'Price falls but volume accumulates',
    descriptionAr: 'السعر ينخفض لكن الحجم يتراكم',
    reliability: 82,
    quality: SignalQuality.A,
    emoji: '📦',
    color: '#16a34a',
    lineStyle: 'solid',
    tradingSignal: 'buy',
    timeframeRecommendation: ['1h', '4h', '1d'],
    riskLevel: 'low'
  },
  {
    id: 'reg_bull_mfi',
    name: 'Regular Bullish MFI',
    nameAr: 'صاعد منتظم MFI',
    category: DivergenceCategory.REGULAR_BULLISH,
    indicators: [ExtendedIndicatorType.MFI],
    description: 'Price decreases, Money Flow increases',
    descriptionAr: 'السعر ينخفض، تدفق المال يزداد',
    reliability: 83,
    quality: SignalQuality.A,
    emoji: '💰',
    color: '#15803d',
    lineStyle: 'solid',
    tradingSignal: 'buy',
    timeframeRecommendation: ['30m', '1h', '4h'],
    riskLevel: 'low'
  },
  {
    id: 'reg_bull_cci',
    name: 'Regular Bullish CCI',
    nameAr: 'صاعد منتظم CCI',
    category: DivergenceCategory.REGULAR_BULLISH,
    indicators: [ExtendedIndicatorType.CCI],
    description: 'Price making lower lows, CCI diverging up',
    descriptionAr: 'السعر قيعان منخفضة، CCI يختلف للأعلى',
    reliability: 78,
    quality: SignalQuality.A,
    emoji: '🔄',
    color: '#22c55e',
    lineStyle: 'solid',
    tradingSignal: 'buy',
    timeframeRecommendation: ['1h', '4h'],
    riskLevel: 'medium'
  },
  {
    id: 'reg_bull_stoch',
    name: 'Regular Bullish Stochastic RSI',
    nameAr: 'صاعد منتظم Stochastic RSI',
    category: DivergenceCategory.REGULAR_BULLISH,
    indicators: [ExtendedIndicatorType.STOCH_RSI],
    description: 'Price drops, Stoch RSI rises from oversold',
    descriptionAr: 'السعر ينخفض، Stoch RSI يرتفع من التشبع البيعي',
    reliability: 77,
    quality: SignalQuality.B,
    emoji: '📉',
    color: '#4ade80',
    lineStyle: 'dashed',
    tradingSignal: 'buy',
    timeframeRecommendation: ['15m', '30m', '1h'],
    riskLevel: 'medium'
  },

  // REGULAR BEARISH (6 types)
  {
    id: 'reg_bear_rsi',
    name: 'Regular Bearish RSI',
    nameAr: 'هابط منتظم RSI',
    category: DivergenceCategory.REGULAR_BEARISH,
    indicators: [ExtendedIndicatorType.RSI],
    description: 'Price makes higher high, RSI makes lower high',
    descriptionAr: 'السعر يسجل قمة أعلى، RSI يسجل قمة أدنى',
    reliability: 86,
    quality: SignalQuality.A_PLUS,
    emoji: '📉',
    color: '#ef4444',
    lineStyle: 'solid',
    tradingSignal: 'sell',
    timeframeRecommendation: ['1h', '4h', '1d'],
    riskLevel: 'low'
  },
  {
    id: 'reg_bear_macd',
    name: 'Regular Bearish MACD',
    nameAr: 'هابط منتظم MACD',
    category: DivergenceCategory.REGULAR_BEARISH,
    indicators: [ExtendedIndicatorType.MACD],
    description: 'Price rising, MACD histogram declining',
    descriptionAr: 'السعر يرتفع، MACD هيستوغرام ينخفض',
    reliability: 81,
    quality: SignalQuality.A,
    emoji: '📊',
    color: '#dc2626',
    lineStyle: 'solid',
    tradingSignal: 'sell',
    timeframeRecommendation: ['15m', '1h', '4h'],
    riskLevel: 'medium'
  },
  {
    id: 'reg_bear_obv',
    name: 'Regular Bearish OBV',
    nameAr: 'هابط منتظم OBV',
    category: DivergenceCategory.REGULAR_BEARISH,
    indicators: [ExtendedIndicatorType.OBV],
    description: 'Price rises but volume distribution occurs',
    descriptionAr: 'السعر يرتفع لكن الحجم يتوزع',
    reliability: 83,
    quality: SignalQuality.A,
    emoji: '📦',
    color: '#b91c1c',
    lineStyle: 'solid',
    tradingSignal: 'sell',
    timeframeRecommendation: ['1h', '4h', '1d'],
    riskLevel: 'low'
  },
  {
    id: 'reg_bear_mfi',
    name: 'Regular Bearish MFI',
    nameAr: 'هابط منتظم MFI',
    category: DivergenceCategory.REGULAR_BEARISH,
    indicators: [ExtendedIndicatorType.MFI],
    description: 'Price increases, Money Flow decreases',
    descriptionAr: 'السعر يزداد، تدفق المال ينخفض',
    reliability: 84,
    quality: SignalQuality.A,
    emoji: '💸',
    color: '#991b1b',
    lineStyle: 'solid',
    tradingSignal: 'sell',
    timeframeRecommendation: ['30m', '1h', '4h'],
    riskLevel: 'low'
  },
  {
    id: 'reg_bear_cci',
    name: 'Regular Bearish CCI',
    nameAr: 'هابط منتظم CCI',
    category: DivergenceCategory.REGULAR_BEARISH,
    indicators: [ExtendedIndicatorType.CCI],
    description: 'Price making higher highs, CCI diverging down',
    descriptionAr: 'السعر قمم مرتفعة، CCI يختلف للأسفل',
    reliability: 79,
    quality: SignalQuality.A,
    emoji: '🔄',
    color: '#ef4444',
    lineStyle: 'solid',
    tradingSignal: 'sell',
    timeframeRecommendation: ['1h', '4h'],
    riskLevel: 'medium'
  },
  {
    id: 'reg_bear_stoch',
    name: 'Regular Bearish Stochastic RSI',
    nameAr: 'هابط منتظم Stochastic RSI',
    category: DivergenceCategory.REGULAR_BEARISH,
    indicators: [ExtendedIndicatorType.STOCH_RSI],
    description: 'Price rises, Stoch RSI falls from overbought',
    descriptionAr: 'السعر يرتفع، Stoch RSI ينخفض من التشبع الشرائي',
    reliability: 76,
    quality: SignalQuality.B,
    emoji: '📈',
    color: '#f87171',
    lineStyle: 'dashed',
    tradingSignal: 'sell',
    timeframeRecommendation: ['15m', '30m', '1h'],
    riskLevel: 'medium'
  },

  // HIDDEN BULLISH (6 types)
  {
    id: 'hid_bull_rsi',
    name: 'Hidden Bullish RSI',
    nameAr: 'صاعد مخفي RSI',
    category: DivergenceCategory.HIDDEN_BULLISH,
    indicators: [ExtendedIndicatorType.RSI],
    description: 'Price higher low, RSI lower low (trend continuation)',
    descriptionAr: 'السعر قاع أعلى، RSI قاع أدنى (استمرار اتجاه)',
    reliability: 75,
    quality: SignalQuality.B,
    emoji: '🔺',
    color: '#3b82f6',
    lineStyle: 'dashed',
    tradingSignal: 'buy',
    timeframeRecommendation: ['1h', '4h', '1d'],
    riskLevel: 'medium'
  },
  {
    id: 'hid_bull_macd',
    name: 'Hidden Bullish MACD',
    nameAr: 'صاعد مخفي MACD',
    category: DivergenceCategory.HIDDEN_BULLISH,
    indicators: [ExtendedIndicatorType.MACD],
    description: 'Uptrend pullback with MACD weakness',
    descriptionAr: 'تراجع في اتجاه صاعد مع ضعف MACD',
    reliability: 72,
    quality: SignalQuality.B,
    emoji: '📊',
    color: '#2563eb',
    lineStyle: 'dashed',
    tradingSignal: 'buy',
    timeframeRecommendation: ['15m', '1h', '4h'],
    riskLevel: 'medium'
  },
  {
    id: 'hid_bull_obv',
    name: 'Hidden Bullish OBV',
    nameAr: 'صاعد مخفي OBV',
    category: DivergenceCategory.HIDDEN_BULLISH,
    indicators: [ExtendedIndicatorType.OBV],
    description: 'Uptrend continuation with volume confirmation',
    descriptionAr: 'استمرار اتجاه صاعد مع تأكيد الحجم',
    reliability: 74,
    quality: SignalQuality.B,
    emoji: '📦',
    color: '#1d4ed8',
    lineStyle: 'dashed',
    tradingSignal: 'buy',
    timeframeRecommendation: ['1h', '4h'],
    riskLevel: 'low'
  },
  {
    id: 'hid_bull_williams',
    name: 'Hidden Bullish Williams %R',
    nameAr: 'صاعد مخفي Williams %R',
    category: DivergenceCategory.HIDDEN_BULLISH,
    indicators: [ExtendedIndicatorType.WILLIAMS_R],
    description: 'Uptrend with Williams %R showing weakness',
    descriptionAr: 'اتجاه صاعد مع Williams %R يظهر ضعف',
    reliability: 70,
    quality: SignalQuality.B,
    emoji: '📐',
    color: '#60a5fa',
    lineStyle: 'dashed',
    tradingSignal: 'buy',
    timeframeRecommendation: ['30m', '1h', '4h'],
    riskLevel: 'medium'
  },
  {
    id: 'hid_bull_roc',
    name: 'Hidden Bullish ROC',
    nameAr: 'صاعد مخفي ROC',
    category: DivergenceCategory.HIDDEN_BULLISH,
    indicators: [ExtendedIndicatorType.ROC],
    description: 'Rate of change divergence in uptrend',
    descriptionAr: 'اختلاف معدل التغيير في اتجاه صاعد',
    reliability: 68,
    quality: SignalQuality.C,
    emoji: '⚡',
    color: '#3b82f6',
    lineStyle: 'dotted',
    tradingSignal: 'buy',
    timeframeRecommendation: ['1h', '4h'],
    riskLevel: 'high'
  },
  {
    id: 'hid_bull_cmf',
    name: 'Hidden Bullish CMF',
    nameAr: 'صاعد مخفي CMF',
    category: DivergenceCategory.HIDDEN_BULLISH,
    indicators: [ExtendedIndicatorType.CMF],
    description: 'Chaikin Money Flow confirms uptrend continuation',
    descriptionAr: 'Chaikin Money Flow يؤكد استمرار الاتجاه الصاعد',
    reliability: 71,
    quality: SignalQuality.B,
    emoji: '💵',
    color: '#2563eb',
    lineStyle: 'dashed',
    tradingSignal: 'buy',
    timeframeRecommendation: ['1h', '4h', '1d'],
    riskLevel: 'medium'
  },

  // HIDDEN BEARISH (6 types)
  {
    id: 'hid_bear_rsi',
    name: 'Hidden Bearish RSI',
    nameAr: 'هابط مخفي RSI',
    category: DivergenceCategory.HIDDEN_BEARISH,
    indicators: [ExtendedIndicatorType.RSI],
    description: 'Price lower high, RSI higher high (trend continuation)',
    descriptionAr: 'السعر قمة أدنى، RSI قمة أعلى (استمرار اتجاه)',
    reliability: 76,
    quality: SignalQuality.B,
    emoji: '🔻',
    color: '#f59e0b',
    lineStyle: 'dashed',
    tradingSignal: 'sell',
    timeframeRecommendation: ['1h', '4h', '1d'],
    riskLevel: 'medium'
  },
  {
    id: 'hid_bear_macd',
    name: 'Hidden Bearish MACD',
    nameAr: 'هابط مخفي MACD',
    category: DivergenceCategory.HIDDEN_BEARISH,
    indicators: [ExtendedIndicatorType.MACD],
    description: 'Downtrend bounce with MACD strength',
    descriptionAr: 'ارتداد في اتجاه هابط مع قوة MACD',
    reliability: 73,
    quality: SignalQuality.B,
    emoji: '📊',
    color: '#d97706',
    lineStyle: 'dashed',
    tradingSignal: 'sell',
    timeframeRecommendation: ['15m', '1h', '4h'],
    riskLevel: 'medium'
  },
  {
    id: 'hid_bear_obv',
    name: 'Hidden Bearish OBV',
    nameAr: 'هابط مخفي OBV',
    category: DivergenceCategory.HIDDEN_BEARISH,
    indicators: [ExtendedIndicatorType.OBV],
    description: 'Downtrend continuation with volume distribution',
    descriptionAr: 'استمرار اتجاه هابط مع توزيع الحجم',
    reliability: 75,
    quality: SignalQuality.B,
    emoji: '📦',
    color: '#b45309',
    lineStyle: 'dashed',
    tradingSignal: 'sell',
    timeframeRecommendation: ['1h', '4h'],
    riskLevel: 'low'
  },
  {
    id: 'hid_bear_williams',
    name: 'Hidden Bearish Williams %R',
    nameAr: 'هابط مخفي Williams %R',
    category: DivergenceCategory.HIDDEN_BEARISH,
    indicators: [ExtendedIndicatorType.WILLIAMS_R],
    description: 'Downtrend with Williams %R showing strength',
    descriptionAr: 'اتجاه هابط مع Williams %R يظهر قوة',
    reliability: 69,
    quality: SignalQuality.C,
    emoji: '📐',
    color: '#fb923c',
    lineStyle: 'dashed',
    tradingSignal: 'sell',
    timeframeRecommendation: ['30m', '1h', '4h'],
    riskLevel: 'medium'
  },
  {
    id: 'hid_bear_roc',
    name: 'Hidden Bearish ROC',
    nameAr: 'هابط مخفي ROC',
    category: DivergenceCategory.HIDDEN_BEARISH,
    indicators: [ExtendedIndicatorType.ROC],
    description: 'Rate of change divergence in downtrend',
    descriptionAr: 'اختلاف معدل التغيير في اتجاه هابط',
    reliability: 67,
    quality: SignalQuality.C,
    emoji: '⚡',
    color: '#f59e0b',
    lineStyle: 'dotted',
    tradingSignal: 'sell',
    timeframeRecommendation: ['1h', '4h'],
    riskLevel: 'high'
  },
  {
    id: 'hid_bear_cmf',
    name: 'Hidden Bearish CMF',
    nameAr: 'هابط مخفي CMF',
    category: DivergenceCategory.HIDDEN_BEARISH,
    indicators: [ExtendedIndicatorType.CMF],
    description: 'Chaikin Money Flow confirms downtrend continuation',
    descriptionAr: 'Chaikin Money Flow يؤكد استمرار الاتجاه الهابط',
    reliability: 70,
    quality: SignalQuality.B,
    emoji: '💸',
    color: '#d97706',
    lineStyle: 'dashed',
    tradingSignal: 'sell',
    timeframeRecommendation: ['1h', '4h', '1d'],
    riskLevel: 'medium'
  },

  // EXAGGERATED BULLISH (5 types)
  {
    id: 'exag_bull_rsi_extreme',
    name: 'Exaggerated Bullish RSI (Extreme)',
    nameAr: 'صاعد مبالغ فيه RSI (متطرف)',
    category: DivergenceCategory.EXAGGERATED_BULLISH,
    indicators: [ExtendedIndicatorType.RSI],
    description: 'Triple divergence: 3+ consecutive lower lows vs RSI higher lows',
    descriptionAr: 'اختلاف ثلاثي: 3+ قيعان متتالية منخفضة مقابل RSI قيعان مرتفعة',
    reliability: 90,
    quality: SignalQuality.A_PLUS,
    emoji: '🚀',
    color: '#06b6d4',
    lineStyle: 'solid',
    tradingSignal: 'buy',
    timeframeRecommendation: ['4h', '1d', '1w'],
    riskLevel: 'low'
  },
  {
    id: 'exag_bull_multi_indicator',
    name: 'Exaggerated Bullish Multi-Indicator',
    nameAr: 'صاعد مبالغ فيه متعدد المؤشرات',
    category: DivergenceCategory.EXAGGERATED_BULLISH,
    indicators: [
      ExtendedIndicatorType.RSI,
      ExtendedIndicatorType.MACD,
      ExtendedIndicatorType.OBV,
      ExtendedIndicatorType.MFI
    ],
    description: '4+ indicators showing bullish divergence simultaneously',
    descriptionAr: '4+ مؤشرات تظهر اختلاف صاعد في نفس الوقت',
    reliability: 92,
    quality: SignalQuality.A_PLUS,
    emoji: '🎯',
    color: '#0891b2',
    lineStyle: 'solid',
    tradingSignal: 'buy',
    timeframeRecommendation: ['1h', '4h', '1d'],
    riskLevel: 'low'
  },
  {
    id: 'exag_bull_volume_spike',
    name: 'Exaggerated Bullish Volume Spike',
    nameAr: 'صاعد مبالغ فيه مع ارتفاع الحجم',
    category: DivergenceCategory.EXAGGERATED_BULLISH,
    indicators: [ExtendedIndicatorType.OBV, ExtendedIndicatorType.MFI],
    description: 'Bullish divergence with 200%+ volume increase',
    descriptionAr: 'اختلاف صاعد مع زيادة 200%+ في الحجم',
    reliability: 88,
    quality: SignalQuality.A_PLUS,
    emoji: '💥',
    color: '#0e7490',
    lineStyle: 'solid',
    tradingSignal: 'buy',
    timeframeRecommendation: ['15m', '30m', '1h'],
    riskLevel: 'medium'
  },
  {
    id: 'exag_bull_force_index',
    name: 'Exaggerated Bullish Force Index',
    nameAr: 'صاعد مبالغ فيه Force Index',
    category: DivergenceCategory.EXAGGERATED_BULLISH,
    indicators: [ExtendedIndicatorType.FORCE_INDEX],
    description: 'Extreme buying force divergence from price action',
    descriptionAr: 'اختلاف شديد في قوة الشراء عن حركة السعر',
    reliability: 85,
    quality: SignalQuality.A,
    emoji: '⚡',
    color: '#06b6d4',
    lineStyle: 'solid',
    tradingSignal: 'buy',
    timeframeRecommendation: ['1h', '4h'],
    riskLevel: 'medium'
  },
  {
    id: 'exag_bull_long_term',
    name: 'Exaggerated Bullish Long-Term',
    nameAr: 'صاعد مبالغ فيه طويل المدى',
    category: DivergenceCategory.EXAGGERATED_BULLISH,
    indicators: [ExtendedIndicatorType.RSI, ExtendedIndicatorType.OBV],
    description: 'Divergence spanning 50+ bars with strong confirmation',
    descriptionAr: 'اختلاف يمتد 50+ شمعة مع تأكيد قوي',
    reliability: 87,
    quality: SignalQuality.A,
    emoji: '📅',
    color: '#0891b2',
    lineStyle: 'solid',
    tradingSignal: 'buy',
    timeframeRecommendation: ['4h', '1d', '1w'],
    riskLevel: 'low'
  },

  // EXAGGERATED BEARISH (5 types)
  {
    id: 'exag_bear_rsi_extreme',
    name: 'Exaggerated Bearish RSI (Extreme)',
    nameAr: 'هابط مبالغ فيه RSI (متطرف)',
    category: DivergenceCategory.EXAGGERATED_BEARISH,
    indicators: [ExtendedIndicatorType.RSI],
    description: 'Triple divergence: 3+ consecutive higher highs vs RSI lower highs',
    descriptionAr: 'اختلاف ثلاثي: 3+ قمم متتالية مرتفعة مقابل RSI قمم منخفضة',
    reliability: 91,
    quality: SignalQuality.A_PLUS,
    emoji: '💣',
    color: '#a855f7',
    lineStyle: 'solid',
    tradingSignal: 'sell',
    timeframeRecommendation: ['4h', '1d', '1w'],
    riskLevel: 'low'
  },
  {
    id: 'exag_bear_multi_indicator',
    name: 'Exaggerated Bearish Multi-Indicator',
    nameAr: 'هابط مبالغ فيه متعدد المؤشرات',
    category: DivergenceCategory.EXAGGERATED_BEARISH,
    indicators: [
      ExtendedIndicatorType.RSI,
      ExtendedIndicatorType.MACD,
      ExtendedIndicatorType.OBV,
      ExtendedIndicatorType.MFI
    ],
    description: '4+ indicators showing bearish divergence simultaneously',
    descriptionAr: '4+ مؤشرات تظهر اختلاف هابط في نفس الوقت',
    reliability: 93,
    quality: SignalQuality.A_PLUS,
    emoji: '🎪',
    color: '#9333ea',
    lineStyle: 'solid',
    tradingSignal: 'sell',
    timeframeRecommendation: ['1h', '4h', '1d'],
    riskLevel: 'low'
  },
  {
    id: 'exag_bear_volume_spike',
    name: 'Exaggerated Bearish Volume Spike',
    nameAr: 'هابط مبالغ فيه مع ارتفاع الحجم',
    category: DivergenceCategory.EXAGGERATED_BEARISH,
    indicators: [ExtendedIndicatorType.OBV, ExtendedIndicatorType.MFI],
    description: 'Bearish divergence with 200%+ volume increase',
    descriptionAr: 'اختلاف هابط مع زيادة 200%+ في الحجم',
    reliability: 89,
    quality: SignalQuality.A_PLUS,
    emoji: '💥',
    color: '#7c3aed',
    lineStyle: 'solid',
    tradingSignal: 'sell',
    timeframeRecommendation: ['15m', '30m', '1h'],
    riskLevel: 'medium'
  },
  {
    id: 'exag_bear_force_index',
    name: 'Exaggerated Bearish Force Index',
    nameAr: 'هابط مبالغ فيه Force Index',
    category: DivergenceCategory.EXAGGERATED_BEARISH,
    indicators: [ExtendedIndicatorType.FORCE_INDEX],
    description: 'Extreme selling force divergence from price action',
    descriptionAr: 'اختلاف شديد في قوة البيع عن حركة السعر',
    reliability: 86,
    quality: SignalQuality.A,
    emoji: '⚡',
    color: '#a855f7',
    lineStyle: 'solid',
    tradingSignal: 'sell',
    timeframeRecommendation: ['1h', '4h'],
    riskLevel: 'medium'
  },
  {
    id: 'exag_bear_long_term',
    name: 'Exaggerated Bearish Long-Term',
    nameAr: 'هابط مبالغ فيه طويل المدى',
    category: DivergenceCategory.EXAGGERATED_BEARISH,
    indicators: [ExtendedIndicatorType.RSI, ExtendedIndicatorType.OBV],
    description: 'Divergence spanning 50+ bars with strong confirmation',
    descriptionAr: 'اختلاف يمتد 50+ شمعة مع تأكيد قوي',
    reliability: 88,
    quality: SignalQuality.A,
    emoji: '📅',
    color: '#9333ea',
    lineStyle: 'solid',
    tradingSignal: 'sell',
    timeframeRecommendation: ['4h', '1d', '1w'],
    riskLevel: 'low'
  }
];

// ===============================
// Helper Functions
// ===============================

/**
 * Get divergence type by ID
 */
export function getDivergenceTypeById(id: string): DivergenceTypeMetadata | undefined {
  return DIVERGENCE_CATALOG.find(type => type.id === id);
}

/**
 * Get all divergence types for a specific category
 */
export function getDivergenceTypesByCategory(category: DivergenceCategory): DivergenceTypeMetadata[] {
  return DIVERGENCE_CATALOG.filter(type => type.category === category);
}

/**
 * Get all divergence types for a specific indicator
 */
export function getDivergenceTypesByIndicator(indicator: ExtendedIndicatorType): DivergenceTypeMetadata[] {
  return DIVERGENCE_CATALOG.filter(type => type.indicators.includes(indicator));
}

/**
 * Get signal quality from reliability score
 */
export function getSignalQualityFromScore(reliability: number): SignalQuality {
  if (reliability >= 90) return SignalQuality.A_PLUS;
  if (reliability >= 80) return SignalQuality.A;
  if (reliability >= 70) return SignalQuality.B;
  if (reliability >= 60) return SignalQuality.C;
  if (reliability >= 50) return SignalQuality.D;
  return SignalQuality.F;
}

/**
 * Get catalog summary statistics
 */
export function getCatalogSummary() {
  return {
    totalTypes: DIVERGENCE_CATALOG.length,
    byCategory: {
      regularBullish: getDivergenceTypesByCategory(DivergenceCategory.REGULAR_BULLISH).length,
      regularBearish: getDivergenceTypesByCategory(DivergenceCategory.REGULAR_BEARISH).length,
      hiddenBullish: getDivergenceTypesByCategory(DivergenceCategory.HIDDEN_BULLISH).length,
      hiddenBearish: getDivergenceTypesByCategory(DivergenceCategory.HIDDEN_BEARISH).length,
      exaggeratedBullish: getDivergenceTypesByCategory(DivergenceCategory.EXAGGERATED_BULLISH).length,
      exaggeratedBearish: getDivergenceTypesByCategory(DivergenceCategory.EXAGGERATED_BEARISH).length,
    },
    averageReliability: DIVERGENCE_CATALOG.reduce((sum, type) => sum + type.reliability, 0) / DIVERGENCE_CATALOG.length,
    qualityDistribution: {
      aPlus: DIVERGENCE_CATALOG.filter(t => t.quality === SignalQuality.A_PLUS).length,
      a: DIVERGENCE_CATALOG.filter(t => t.quality === SignalQuality.A).length,
      b: DIVERGENCE_CATALOG.filter(t => t.quality === SignalQuality.B).length,
      c: DIVERGENCE_CATALOG.filter(t => t.quality === SignalQuality.C).length,
      d: DIVERGENCE_CATALOG.filter(t => t.quality === SignalQuality.D).length,
      f: DIVERGENCE_CATALOG.filter(t => t.quality === SignalQuality.F).length,
    }
  };
}

/**
 * Filter catalog by multiple criteria
 */
export function filterCatalog(filters: {
  categories?: DivergenceCategory[];
  indicators?: ExtendedIndicatorType[];
  minReliability?: number;
  qualities?: SignalQuality[];
  tradingSignals?: ('buy' | 'sell' | 'neutral')[];
}): DivergenceTypeMetadata[] {
  return DIVERGENCE_CATALOG.filter(type => {
    if (filters.categories && !filters.categories.includes(type.category)) return false;
    if (filters.indicators && !type.indicators.some(ind => filters.indicators!.includes(ind))) return false;
    if (filters.minReliability && type.reliability < filters.minReliability) return false;
    if (filters.qualities && !filters.qualities.includes(type.quality)) return false;
    if (filters.tradingSignals && !filters.tradingSignals.includes(type.tradingSignal)) return false;
    return true;
  });
}
