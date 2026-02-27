/**
 * Ichimoku PourSamadi Signal [TradingFinder]
 * Converted from Pine Script
 * 
 * Features:
 * - Standard Ichimoku Cloud components
 * - "Logical" Kijun-Sen (52 period) for flat detection
 * - Timing Box analysis based on Kijun-Sen flat breakouts
 */

import type { CandleData } from "@/components/charts/types";

export interface IchimokuPourSamadiConfig {
  // Logical Settings
  kijunSenLogicalPeriod: number;
  flatFilter: 'All' | 'Automatic' | 'Custom';
  customCount: number;
  updateEvent: boolean;
  
  // Ichimoku Settings
  tenkanSenPeriod: number;
  kijunSenPeriod: number;
  spanBPeriod: number;
  displacement: number;
  
  // Display Settings
  showLogicalKijunSen: boolean;
  showTenkanSen: boolean;
  showKijunSen: boolean;
  showChikouSpan: boolean;
  showSpanA: boolean;
  showSpanB: boolean;
  showCloud: boolean;
  
  // Colors
  colors: {
    logicalKijunSen: string;
    tenkanSen: string;
    kijunSen: string;
    chikouSpan: string;
    spanA: string;
    spanB: string;
    cloudBullish: string;
    cloudBearish: string;
    timingBox: string;
  };
}

export const defaultIchimokuPourSamadiConfig: IchimokuPourSamadiConfig = {
  kijunSenLogicalPeriod: 52,
  flatFilter: 'Automatic',
  customCount: 15,
  updateEvent: false,
  
  tenkanSenPeriod: 9,
  kijunSenPeriod: 26,
  spanBPeriod: 52,
  displacement: 26,
  
  showLogicalKijunSen: true,
  showTenkanSen: false,
  showKijunSen: false,
  showChikouSpan: false,
  showSpanA: false,
  showSpanB: false,
  showCloud: false,
  
  colors: {
    logicalKijunSen: '#f80d0d',
    tenkanSen: '#1090f8',
    kijunSen: '#f80d0d',
    chikouSpan: '#989cac',
    spanA: '#02e027',
    spanB: '#ff911c',
    cloudBullish: 'rgba(76, 175, 80, 0.23)',
    cloudBearish: 'rgba(235, 84, 14, 0.27)',
    timingBox: '#808080'
  }
};

export interface IchimokuResult {
  tenkanSen: (number | null)[];
  kijunSen: (number | null)[];
  spanA: (number | null)[];
  spanB: (number | null)[];
  chikouSpan: (number | null)[];
  logicalKijunSen: (number | null)[];
  timingBoxes: TimingBox[];
}

export interface TimingBox {
  triggerIndex: number;
  triggerTime: number;
  top: number;
  bottom: number;
  verticalLines: number[]; // Timestamps
}

function donchian(data: CandleData[], index: number, length: number): number | null {
  if (index < length - 1) return null;
  let max = -Infinity;
  let min = Infinity;
  
  for (let i = 0; i < length; i++) {
    const idx = index - i;
    if (data[idx].high > max) max = data[idx].high;
    if (data[idx].low < min) min = data[idx].low;
  }
  
  return (max + min) / 2;
}

function highest(data: CandleData[], index: number, length: number): number {
  let max = -Infinity;
  for (let i = 0; i < length; i++) {
    const idx = index - i;
    if (idx >= 0 && data[idx].high > max) max = data[idx].high;
  }
  return max;
}

function lowest(data: CandleData[], index: number, length: number): number {
  let min = Infinity;
  for (let i = 0; i < length; i++) {
    const idx = index - i;
    if (idx >= 0 && data[idx].low < min) min = data[idx].low;
  }
  return min;
}

function atr(data: CandleData[], index: number, length: number): number {
  if (index < length) return 0;
  
  let sumTr = 0;
  for (let i = 0; i < length; i++) {
    const idx = index - i;
    const high = data[idx].high;
    const low = data[idx].low;
    const prevClose = idx > 0 ? data[idx - 1].close : data[idx].open;
    
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    sumTr += tr;
  }
  
  return sumTr / length;
}

export function calculateIchimokuPourSamadi(
  data: CandleData[],
  config: IchimokuPourSamadiConfig = defaultIchimokuPourSamadiConfig
): IchimokuResult {
  const tenkanSen: (number | null)[] = [];
  const kijunSen: (number | null)[] = [];
  const spanA: (number | null)[] = [];
  const spanB: (number | null)[] = [];
  const chikouSpan: (number | null)[] = [];
  const logicalKijunSen: (number | null)[] = [];
  const timingBoxes: TimingBox[] = [];
  
  // Flat Filter State
  let flatCounter = 1;
  const flatCountSave: number[] = [];
  
  // Timing Box State
  const timingOffsets = [0, 5, 9, 13, 17, 26, 35, 43, 52, 63, 72, 81, 90];
  let lastTriggerIndex = -1;
  
  for (let i = 0; i < data.length; i++) {
    // Calculate Ichimoku Components
    const ts = donchian(data, i, config.tenkanSenPeriod);
    const ks = donchian(data, i, config.kijunSenPeriod);
    const lks = donchian(data, i, config.kijunSenLogicalPeriod);
    const sb = donchian(data, i, config.spanBPeriod);
    
    tenkanSen.push(ts);
    kijunSen.push(ks);
    logicalKijunSen.push(lks);
    
    // Span A (shifted forward)
    if (ts !== null && ks !== null) {
      const sa = (ts + ks) / 2;
      // We store it at current index, renderer handles shift
      spanA.push(sa);
    } else {
      spanA.push(null);
    }
    
    // Span B (shifted forward)
    spanB.push(sb);
    
    // Chikou Span (shifted backward)
    // We store current close, renderer handles shift
    chikouSpan.push(data[i].close);
    
    // Flat Event Logic
    if (i > 0 && lks !== null && logicalKijunSen[i - 1] !== null) {
      if (lks === logicalKijunSen[i - 1]) {
        flatCounter++;
      } else {
        // Flat period ended
        if (flatCounter > 1) {
          flatCountSave.push(flatCounter);
          if (flatCountSave.length > 500) flatCountSave.shift();
        }
        
        // Check for Event Trigger
        let isEvent = false;
        const prevFlatCounter = flatCounter; // The counter value before reset
        
        if (config.flatFilter === 'All') {
          isEvent = prevFlatCounter > 1;
        } else if (config.flatFilter === 'Custom') {
          isEvent = prevFlatCounter >= config.customCount;
        } else { // Automatic
          const avgFlat = flatCountSave.length > 0 
            ? flatCountSave.reduce((a, b) => a + b, 0) / flatCountSave.length 
            : 2;
          isEvent = prevFlatCounter >= (prevFlatCounter > 1 ? Math.floor(avgFlat) : 2);
        }
        
        if (isEvent) {
          // Trigger Timing Box
          // Logic: If UpdateEvent is true, we always update.
          // If false, we only update if the previous box is finished (90 bars passed).
          
          const canUpdate = config.updateEvent || (lastTriggerIndex === -1 || (i > lastTriggerIndex + 90));
          
          if (canUpdate) {
            lastTriggerIndex = i;
            
            const top = highest(data, i, 90);
            const bottom = lowest(data, i, 90);
            const currentATR = atr(data, i, 55);
            
            const boxTop = top + currentATR;
            const boxBottom = bottom - currentATR;
            
            const verticalLines: number[] = [];
            timingOffsets.forEach(offset => {
              // We project future timestamps if needed, or just use index
              // For simplicity in this context, we'll store indices relative to data start
              // But the chart needs timestamps. We can estimate future timestamps if needed.
              // Here we'll just store the timestamps we have, and for future ones, we might need to extrapolate in the renderer.
              // However, the request is for existing data.
              
              const targetIdx = i + offset;
              // If target is within data, use its timestamp.
              // If outside, we can't easily guess timestamp without knowing interval.
              // We will store the target INDEX, and let the renderer handle it.
              // Actually, let's store timestamps for existing bars, and null for future?
              // Or better: The renderer usually handles x-axis by index or time.
              // Let's try to provide timestamps for what we can.
              
              if (targetIdx < data.length) {
                verticalLines.push(data[targetIdx].time as number);
              } else {
                // Estimate timestamp based on last interval
                const lastTime = data[data.length - 1].time as number;
                const interval = data.length > 1 ? (data[data.length - 1].time as number) - (data[data.length - 2].time as number) : 60000;
                const diff = targetIdx - (data.length - 1);
                verticalLines.push(lastTime + diff * interval);
              }
            });
            
            timingBoxes.push({
              triggerIndex: i,
              triggerTime: data[i].time as number,
              top: boxTop,
              bottom: boxBottom,
              verticalLines
            });
          }
        }
        
        flatCounter = 1;
      }
    }
  }
  
  // Filter timing boxes to only keep the active one(s) if we want to mimic the script exactly
  // The script keeps updating the SAME variables (H_Lines, L_Lines).
  // So effectively only the LAST valid trigger is shown.
  // "Update Timing Analysis BoX Per Event" controls if we switch to a new event immediately.
  // But visually, usually only the latest active box is relevant.
  // We will return all detected boxes, but the renderer can choose to show only the last one.
  
  return {
    tenkanSen,
    kijunSen,
    spanA,
    spanB,
    chikouSpan,
    logicalKijunSen,
    timingBoxes: timingBoxes.slice(-1) // Only return the last one as per script behavior (it clears lines)
  };
}
