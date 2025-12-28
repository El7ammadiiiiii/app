/**
 * On-Balance Volume (OBV) Indicator
 * مؤشر حجم التوازن
 */

export interface OBVResult {
  value: number;
  signal: "bullish" | "bearish" | "neutral";
  trend: "up" | "down" | "sideways";
  divergence: "bullish" | "bearish" | null;
}

export interface OBVArrayResult {
  values: number[];
  sma: number[];
  timestamps: number[];
}

/**
 * Calculate On-Balance Volume
 * حساب حجم التوازن
 */
export function calculateOBV(
  closes: number[],
  volumes: number[]
): number {
  if (closes.length < 2 || volumes.length < 2) {
    return 0;
  }

  let obv = 0;
  
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) {
      obv += volumes[i];
    } else if (closes[i] < closes[i - 1]) {
      obv -= volumes[i];
    }
    // If close equals previous close, OBV remains unchanged
  }
  
  return obv;
}

/**
 * Calculate OBV with analysis
 * حساب OBV مع التحليل
 */
export function calculateOBVWithAnalysis(
  closes: number[],
  volumes: number[],
  smaPeriod: number = 20
): OBVResult {
  const nullResult: OBVResult = {
    value: 0,
    signal: "neutral",
    trend: "sideways",
    divergence: null
  };

  if (closes.length < smaPeriod || volumes.length < smaPeriod) {
    return nullResult;
  }

  // Calculate OBV array
  const obvValues: number[] = [0];
  let obv = 0;
  
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) {
      obv += volumes[i];
    } else if (closes[i] < closes[i - 1]) {
      obv -= volumes[i];
    }
    obvValues.push(obv);
  }

  // Calculate OBV SMA
  const obvSMA = obvValues.slice(-smaPeriod).reduce((sum, val) => sum + val, 0) / smaPeriod;

  // Determine trend
  let trend: "up" | "down" | "sideways" = "sideways";
  const recentOBV = obvValues.slice(-5);
  const obvChange = recentOBV[recentOBV.length - 1] - recentOBV[0];
  const threshold = Math.abs(obv) * 0.01; // 1% threshold

  if (obvChange > threshold) {
    trend = "up";
  } else if (obvChange < -threshold) {
    trend = "down";
  }

  // Determine signal
  let signal: "bullish" | "bearish" | "neutral" = "neutral";
  if (obv > obvSMA && trend === "up") {
    signal = "bullish";
  } else if (obv < obvSMA && trend === "down") {
    signal = "bearish";
  }

  // Check for divergence
  let divergence: "bullish" | "bearish" | null = null;
  const priceChange = closes[closes.length - 1] - closes[closes.length - 6];
  
  // Bullish divergence: price down, OBV up
  if (priceChange < 0 && obvChange > threshold) {
    divergence = "bullish";
  }
  // Bearish divergence: price up, OBV down
  else if (priceChange > 0 && obvChange < -threshold) {
    divergence = "bearish";
  }

  return {
    value: obv,
    signal,
    trend,
    divergence
  };
}

/**
 * Calculate OBV Array for charting
 * حساب مصفوفة OBV للرسم البياني
 */
export function calculateOBVArray(
  closes: number[],
  volumes: number[],
  timestamps: number[],
  smaPeriod: number = 20
): OBVArrayResult {
  const result: OBVArrayResult = { values: [], sma: [], timestamps: [] };

  if (closes.length < 2 || volumes.length < 2) {
    return result;
  }

  // Calculate OBV values
  const obvValues: number[] = [0];
  let obv = 0;
  
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) {
      obv += volumes[i];
    } else if (closes[i] < closes[i - 1]) {
      obv -= volumes[i];
    }
    obvValues.push(obv);
  }

  // Calculate SMA of OBV
  const smaValues: (number | null)[] = [];
  for (let i = 0; i < obvValues.length; i++) {
    if (i < smaPeriod - 1) {
      smaValues.push(null);
    } else {
      const slice = obvValues.slice(i - smaPeriod + 1, i + 1);
      const sma = slice.reduce((sum, val) => sum + val, 0) / smaPeriod;
      smaValues.push(sma);
    }
  }

  // Build result
  for (let i = 0; i < obvValues.length; i++) {
    result.values.push(obvValues[i]);
    result.sma.push(smaValues[i] ?? obvValues[i]);
    result.timestamps.push(timestamps[i]);
  }

  return result;
}

/**
 * Calculate Accumulation/Distribution Line (A/D)
 * حساب خط التجميع/التوزيع
 */
export function calculateADLine(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[]
): number[] {
  const adValues: number[] = [];
  let ad = 0;

  for (let i = 0; i < closes.length; i++) {
    const high = highs[i];
    const low = lows[i];
    const close = closes[i];
    const volume = volumes[i];

    // Money Flow Multiplier
    let mfm = 0;
    if (high !== low) {
      mfm = ((close - low) - (high - close)) / (high - low);
    }

    // Money Flow Volume
    const mfv = mfm * volume;
    
    ad += mfv;
    adValues.push(ad);
  }

  return adValues;
}

/**
 * Calculate Chaikin Money Flow (CMF)
 * حساب تدفق أموال تشايكين
 */
export function calculateCMF(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[],
  period: number = 20
): number | null {
  if (closes.length < period) {
    return null;
  }

  let sumMFV = 0;
  let sumVolume = 0;

  for (let i = closes.length - period; i < closes.length; i++) {
    const high = highs[i];
    const low = lows[i];
    const close = closes[i];
    const volume = volumes[i];

    // Money Flow Multiplier
    let mfm = 0;
    if (high !== low) {
      mfm = ((close - low) - (high - close)) / (high - low);
    }

    sumMFV += mfm * volume;
    sumVolume += volume;
  }

  if (sumVolume === 0) {
    return 0;
  }

  return sumMFV / sumVolume;
}
