/**
 * Session Breakout [hiimannshu]
 * Converted from Pine Script to TypeScript for Display 5 custom models.
 * Original: https://www.tradingview.com/script/...
 * License: Mozilla Public License 2.0 (https://mozilla.org/MPL/2.0/)
 * 
 * Tracks session-based price ranges and identifies breakouts above session high
 * or below session low. Can also detect liquidity sweeps (fake-outs).
 */

export type BreakoutType = 'bullish_breakout' | 'bearish_breakout';
export type DetectionMethod = 'breakout' | 'liquidity_sweep';
export type IndicatorStyle = 'fixed' | 'moving' | 'none';

export interface SessionRange {
  startIndex: number;
  endIndex: number;
  startTime: number;
  endTime: number;
  high: number;
  low: number;
  mid: number;
  isActive: boolean;
  isConfirmed: boolean;
}

export interface BreakoutSignal {
  index: number;
  price: number;
  type: BreakoutType;
  sessionHigh: number;
  sessionLow: number;
  method: DetectionMethod;
}

export interface PreviousLevels {
  dayHigh: number;
  dayLow: number;
  weekHigh: number;
  weekLow: number;
}

export interface SessionBreakoutConfig {
  // Session timing in 24h format (e.g., '1800-0101' = 18:00 to 01:01)
  sessionStartHour: number;
  sessionStartMinute: number;
  sessionEndHour: number;
  sessionEndMinute: number;
  
  // Detection settings
  useCloseAsConfirmation: boolean;
  detectionMethod: DetectionMethod;
  
  // Display settings
  showSessionBox: boolean;
  showLevels: boolean;
  showPreviousDayLevels: boolean;
  showPreviousWeekLevels: boolean;
  extendHours: number;
  indicatorStyle: IndicatorStyle;
  
  // Maximum sessions to track
  maxSessions: number;
}

export interface SessionBreakoutResult {
  sessions: SessionRange[];
  breakouts: BreakoutSignal[];
  previousLevels: PreviousLevels | null;
  config: SessionBreakoutConfig;
}

const DEFAULT_CONFIG: SessionBreakoutConfig = {
  sessionStartHour: 18,
  sessionStartMinute: 0,
  sessionEndHour: 1,
  sessionEndMinute: 1,
  useCloseAsConfirmation: false,
  detectionMethod: 'breakout',
  showSessionBox: true,
  showLevels: true,
  showPreviousDayLevels: false,
  showPreviousWeekLevels: false,
  extendHours: 5,
  indicatorStyle: 'fixed',
  maxSessions: 10
};

/**
 * Check if a timestamp falls within a session time range
 */
function isInSession(
  timestamp: number,
  config: SessionBreakoutConfig
): boolean {
  const date = new Date(timestamp);
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const currentMinutes = hour * 60 + minute;
  
  const startMinutes = config.sessionStartHour * 60 + config.sessionStartMinute;
  let endMinutes = config.sessionEndHour * 60 + config.sessionEndMinute;
  
  // Handle sessions that cross midnight
  if (endMinutes < startMinutes) {
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }
  
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

/**
 * Detect session starts and ends
 */
function detectSessions(
  timestamps: number[],
  highs: number[],
  lows: number[],
  config: SessionBreakoutConfig
): SessionRange[] {
  const sessions: SessionRange[] = [];
  let currentSession: SessionRange | null = null;
  
  for (let i = 0; i < timestamps.length; i++) {
    const inSession = isInSession(timestamps[i], config);
    const prevInSession = i > 0 ? isInSession(timestamps[i - 1], config) : false;
    
    // Session started
    if (inSession && !prevInSession) {
      if (currentSession) {
        currentSession.endIndex = i - 1;
        currentSession.endTime = timestamps[i - 1];
        currentSession.isActive = false;
        currentSession.isConfirmed = true;
        sessions.push(currentSession);
      }
      
      currentSession = {
        startIndex: i,
        endIndex: i,
        startTime: timestamps[i],
        endTime: timestamps[i],
        high: highs[i],
        low: lows[i],
        mid: (highs[i] + lows[i]) / 2,
        isActive: true,
        isConfirmed: false
      };
    }
    // Session active - update high/low
    else if (inSession && currentSession) {
      currentSession.high = Math.max(currentSession.high, highs[i]);
      currentSession.low = Math.min(currentSession.low, lows[i]);
      currentSession.mid = (currentSession.high + currentSession.low) / 2;
      currentSession.endIndex = i;
      currentSession.endTime = timestamps[i];
    }
    // Session ended
    else if (!inSession && prevInSession && currentSession) {
      currentSession.isActive = false;
      currentSession.isConfirmed = true;
      sessions.push(currentSession);
      currentSession = null;
    }
  }
  
  // Add active session if exists
  if (currentSession) {
    sessions.push(currentSession);
  }
  
  return sessions.slice(-config.maxSessions);
}

/**
 * Detect breakouts or liquidity sweeps
 */
function detectBreakouts(
  sessions: SessionRange[],
  opens: number[],
  highs: number[],
  lows: number[],
  closes: number[],
  config: SessionBreakoutConfig
): BreakoutSignal[] {
  const breakouts: BreakoutSignal[] = [];
  
  sessions.forEach((session) => {
    if (!session.isConfirmed) return;
    
    let breakoutDetected = false;
    const startIndex = session.endIndex + 1;
    
    for (let i = startIndex; i < closes.length; i++) {
      if (breakoutDetected) break;
      
      const prevHigh = i > 0 ? highs[i - 1] : highs[i];
      const prevLow = i > 0 ? lows[i - 1] : lows[i];
      const prevOpen = i > 0 ? opens[i - 1] : opens[i];
      const prevClose = i > 0 ? closes[i - 1] : closes[i];
      
      if (config.detectionMethod === 'breakout') {
        // Bullish breakout: price breaks above session high
        const bullishBreak = config.useCloseAsConfirmation
          ? prevClose > session.high
          : (prevHigh > session.high && prevOpen < session.high) || prevClose > session.high;
        
        if (bullishBreak) {
          breakouts.push({
            index: i - 1,
            price: prevClose,
            type: 'bullish_breakout',
            sessionHigh: session.high,
            sessionLow: session.low,
            method: config.detectionMethod
          });
          breakoutDetected = true;
        }
        
        // Bearish breakout: price breaks below session low
        const bearishBreak = config.useCloseAsConfirmation
          ? prevClose < session.low
          : (prevLow < session.low && prevOpen > session.low) || prevClose < session.low;
        
        if (bearishBreak) {
          breakouts.push({
            index: i - 1,
            price: prevClose,
            type: 'bearish_breakout',
            sessionHigh: session.high,
            sessionLow: session.low,
            method: config.detectionMethod
          });
          breakoutDetected = true;
        }
      } else {
        // Liquidity sweep: sell-side sweep (wick below low, close above low)
        const sellSideSweep = prevLow < session.low && prevClose > session.low;
        
        if (sellSideSweep) {
          breakouts.push({
            index: i - 1,
            price: prevClose,
            type: 'bullish_breakout',
            sessionHigh: session.high,
            sessionLow: session.low,
            method: config.detectionMethod
          });
          breakoutDetected = true;
        }
        
        // Liquidity sweep: buy-side sweep (wick above high, close below high)
        const buySideSweep = prevHigh > session.high && prevClose < session.high;
        
        if (buySideSweep) {
          breakouts.push({
            index: i - 1,
            price: prevClose,
            type: 'bearish_breakout',
            sessionHigh: session.high,
            sessionLow: session.low,
            method: config.detectionMethod
          });
          breakoutDetected = true;
        }
      }
    }
  });
  
  return breakouts;
}

/**
 * Calculate previous day/week high/low
 */
function calculatePreviousLevels(
  timestamps: number[],
  highs: number[],
  lows: number[]
): PreviousLevels | null {
  if (timestamps.length < 2) return null;
  
  const latestTime = timestamps[timestamps.length - 1];
  const latestDate = new Date(latestTime);
  
  // Find previous day's data
  let dayHigh = -Infinity;
  let dayLow = Infinity;
  const prevDayStart = new Date(latestDate);
  prevDayStart.setUTCDate(prevDayStart.getUTCDate() - 1);
  prevDayStart.setUTCHours(0, 0, 0, 0);
  const prevDayEnd = new Date(prevDayStart);
  prevDayEnd.setUTCHours(23, 59, 59, 999);
  
  // Find previous week's data
  let weekHigh = -Infinity;
  let weekLow = Infinity;
  const prevWeekStart = new Date(latestDate);
  prevWeekStart.setUTCDate(prevWeekStart.getUTCDate() - 7);
  prevWeekStart.setUTCHours(0, 0, 0, 0);
  const prevWeekEnd = new Date(prevWeekStart);
  prevWeekEnd.setUTCDate(prevWeekEnd.getUTCDate() + 7);
  
  for (let i = 0; i < timestamps.length; i++) {
    const time = timestamps[i];
    
    // Check previous day
    if (time >= prevDayStart.getTime() && time <= prevDayEnd.getTime()) {
      dayHigh = Math.max(dayHigh, highs[i]);
      dayLow = Math.min(dayLow, lows[i]);
    }
    
    // Check previous week
    if (time >= prevWeekStart.getTime() && time <= prevWeekEnd.getTime()) {
      weekHigh = Math.max(weekHigh, highs[i]);
      weekLow = Math.min(weekLow, lows[i]);
    }
  }
  
  return {
    dayHigh: dayHigh === -Infinity ? highs[highs.length - 1] : dayHigh,
    dayLow: dayLow === Infinity ? lows[lows.length - 1] : dayLow,
    weekHigh: weekHigh === -Infinity ? highs[highs.length - 1] : weekHigh,
    weekLow: weekLow === Infinity ? lows[lows.length - 1] : weekLow
  };
}

/**
 * Main function to detect session breakouts
 */
export function detectSessionBreakout(
  timestamps: number[],
  opens: number[],
  highs: number[],
  lows: number[],
  closes: number[],
  config?: Partial<SessionBreakoutConfig>
): SessionBreakoutResult {
  const mergedConfig: SessionBreakoutConfig = { ...DEFAULT_CONFIG, ...config };
  
  if (timestamps.length < 10) {
    return {
      sessions: [],
      breakouts: [],
      previousLevels: null,
      config: mergedConfig
    };
  }
  
  // Detect sessions
  const sessions = detectSessions(timestamps, highs, lows, mergedConfig);
  
  // Detect breakouts
  const breakouts = detectBreakouts(sessions, opens, highs, lows, closes, mergedConfig);
  
  // Calculate previous levels
  const previousLevels = (mergedConfig.showPreviousDayLevels || mergedConfig.showPreviousWeekLevels)
    ? calculatePreviousLevels(timestamps, highs, lows)
    : null;
  
  return {
    sessions,
    breakouts,
    previousLevels,
    config: mergedConfig
  };
}
