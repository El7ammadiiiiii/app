// @author LazyBear - Converted to TypeScript for Display 5 Models
// List of LazyBear's indicators: http://bit.ly/1LQaPK8

/**
 * Ehlers Instantaneous Trend (EIT)
 * 
 * Developed by John Ehlers, this indicator uses a sophisticated filter
 * to calculate the instantaneous trend of price action. Unlike simple
 * moving averages, it adapts more quickly to price changes while
 * filtering out noise.
 * 
 * Algorithm:
 * - Uses an alpha parameter (0.07 default) to control responsiveness
 * - Calculates instantaneous trend (IT) using recursive formula
 * - Lag line = 2*IT - IT[2] for signal generation
 * 
 * Trading Signals:
 * - Bullish: IT crosses above Lag (green zone)
 * - Bearish: IT crosses below Lag (red zone)
 * - IT line represents the trend
 * - Lag line represents the trigger/signal line
 * 
 * Parameters:
 * - Alpha: Controls smoothing (lower = smoother, higher = more responsive)
 * - Typical range: 0.03 to 0.15
 * - Default: 0.07
 */

export interface EhlersITConfig {
  alpha: number;              // Alpha parameter for smoothing (0.07 default)
  source: 'close' | 'hl2' | 'hlc3' | 'ohlc4'; // Price source
  showFillRegion: boolean;    // Fill area between IT and Lag
  enableBarColors: boolean;   // Color bars based on trend
}

export const defaultEhlersITConfig: EhlersITConfig = {
  alpha: 0.07,
  source: 'hl2',
  showFillRegion: true,
  enableBarColors: false,
};

export interface EhlersITResult {
  it: (number | null)[];      // Instantaneous Trend line
  lag: (number | null)[];     // Lag/Trigger line
  trend: ('up' | 'down' | 'neutral')[];  // Trend direction
}

/**
 * Calculate price based on source type
 */
function calculateSource(
  open: number,
  high: number,
  low: number,
  close: number,
  source: EhlersITConfig['source']
): number {
  switch (source) {
    case 'close':
      return close;
    case 'hl2':
      return (high + low) / 2;
    case 'hlc3':
      return (high + low + close) / 3;
    case 'ohlc4':
      return (open + high + low + close) / 4;
    default:
      return (high + low) / 2;
  }
}

/**
 * Calculate Ehlers Instantaneous Trend
 */
export function calculateEhlersIT(
  opens: number[],
  highs: number[],
  lows: number[],
  closes: number[],
  config: EhlersITConfig = defaultEhlersITConfig
): EhlersITResult {
  const length = closes.length;
  const it: (number | null)[] = new Array(length).fill(null);
  const lag: (number | null)[] = new Array(length).fill(null);
  const trend: ('up' | 'down' | 'neutral')[] = new Array(length).fill('neutral');
  
  if (length < 3) {
    return { it, lag, trend };
  }

  const a = config.alpha;
  const src: number[] = [];
  
  // Calculate source values
  for (let i = 0; i < length; i++) {
    src.push(calculateSource(opens[i], highs[i], lows[i], closes[i], config.source));
  }

  // Initialize first values
  // IT[0] and IT[1] = (src[0] + 2*src[1] + src[2]) / 4
  const initValue = (src[0] + 2 * src[1] + src[2]) / 4;
  it[0] = initValue;
  it[1] = initValue;
  
  // Calculate IT using Ehlers formula
  // it = (a - (a*a)/4) * src + 0.5*a*a*src[1] - (a - 0.75*a*a)*src[2] 
  //      + 2*(1-a)*it[1] - (1-a)*(1-a)*it[2]
  
  for (let i = 2; i < length; i++) {
    const coef1 = a - (a * a) / 4.0;
    const coef2 = 0.5 * a * a;
    const coef3 = a - 0.75 * a * a;
    const coef4 = 2 * (1 - a);
    const coef5 = (1 - a) * (1 - a);
    
    const itValue = 
      coef1 * src[i] +
      coef2 * src[i - 1] -
      coef3 * src[i - 2] +
      coef4 * (it[i - 1] ?? initValue) -
      coef5 * (it[i - 2] ?? initValue);
    
    it[i] = itValue;
  }

  // Calculate Lag line
  // lag = 2 * it - it[2]
  for (let i = 2; i < length; i++) {
    if (it[i] !== null && it[i - 2] !== null) {
      lag[i] = 2 * it[i]! - it[i - 2]!;
    }
  }

  // Determine trend
  for (let i = 0; i < length; i++) {
    if (it[i] !== null && lag[i] !== null) {
      if (it[i]! > lag[i]!) {
        trend[i] = 'up';
      } else if (it[i]! < lag[i]!) {
        trend[i] = 'down';
      } else {
        trend[i] = 'neutral';
      }
    }
  }

  return { it, lag, trend };
}

/**
 * Detect crossovers between IT and Lag lines
 */
export function detectEhlersITCrossovers(result: EhlersITResult): {
  bullishCrosses: number[];
  bearishCrosses: number[];
} {
  const bullishCrosses: number[] = [];
  const bearishCrosses: number[] = [];
  
  for (let i = 1; i < result.it.length; i++) {
    const prevIT = result.it[i - 1];
    const currIT = result.it[i];
    const prevLag = result.lag[i - 1];
    const currLag = result.lag[i];
    
    if (prevIT !== null && currIT !== null && prevLag !== null && currLag !== null) {
      // Bullish cross: IT crosses above Lag
      if (prevIT <= prevLag && currIT > currLag) {
        bullishCrosses.push(i);
      }
      // Bearish cross: IT crosses below Lag
      if (prevIT >= prevLag && currIT < currLag) {
        bearishCrosses.push(i);
      }
    }
  }
  
  return { bullishCrosses, bearishCrosses };
}
