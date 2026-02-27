/**
 * Support Resistance Major/Minor [TradingFinder] Market Structure
 * Converted from Pine Script by TFlab
 * 
 * This indicator identifies major and minor support/resistance levels
 * based on market structure (HH, HL, LH, LL patterns)
 */

import type { CandleData } from "@/components/charts/types";

export interface SRLevel {
  price: number;
  index: number;
  type: 'major-support' | 'major-resistance' | 'minor-support' | 'minor-resistance';
  pivotType: string; // HH, HL, LH, LL, H, L
  term: 'long' | 'short';
}

export interface SRConfig {
  longTermPivotPeriod: number;
  shortTermPivotPeriod: number;
  showLongMajor: boolean;
  showLongMinor: boolean;
  showShortMajor: boolean;
  showShortMinor: boolean;
  colors: {
    longMajorSupport: string;
    longMajorResistance: string;
    longMinorSupport: string;
    longMinorResistance: string;
    shortMajorSupport: string;
    shortMajorResistance: string;
    shortMinorSupport: string;
    shortMinorResistance: string;
  };
}

export const defaultSRConfig: SRConfig = {
  longTermPivotPeriod: 21,
  shortTermPivotPeriod: 5,
  showLongMajor: true,
  showLongMinor: true,
  showShortMajor: true,
  showShortMinor: true,
  colors: {
    longMajorSupport: '#085d31',
    longMajorResistance: '#b70909',
    longMinorSupport: '#3e7d5c',
    longMinorResistance: '#b14848',
    shortMajorSupport: '#83a091',
    shortMajorResistance: '#986464',
    shortMinorSupport: '#6e7d75',
    shortMinorResistance: '#93716f',
  }
};

interface PivotArrays {
  types: string[];
  values: number[];
  indices: number[];
  typesAdv: string[];
  valuesAdv: number[];
  indicesAdv: number[];
}

interface MajorMinorLevels {
  majorHighLevel: number | null;
  majorLowLevel: number | null;
  majorHighIndex: number | null;
  majorLowIndex: number | null;
  majorHighType: string | null;
  majorLowType: string | null;
}

/**
 * Detect pivot high
 */
function pivotHigh(data: CandleData[], index: number, leftBars: number, rightBars: number): number | null {
  if (index < leftBars || index >= data.length - rightBars) return null;
  
  const pivotValue = data[index].high;
  
  // Check left bars
  for (let i = 1; i <= leftBars; i++) {
    if (data[index - i].high >= pivotValue) return null;
  }
  
  // Check right bars
  for (let i = 1; i <= rightBars; i++) {
    if (data[index + i].high >= pivotValue) return null;
  }
  
  return pivotValue;
}

/**
 * Detect pivot low
 */
function pivotLow(data: CandleData[], index: number, leftBars: number, rightBars: number): number | null {
  if (index < leftBars || index >= data.length - rightBars) return null;
  
  const pivotValue = data[index].low;
  
  // Check left bars
  for (let i = 1; i <= leftBars; i++) {
    if (data[index - i].low <= pivotValue) return null;
  }
  
  // Check right bars
  for (let i = 1; i <= rightBars; i++) {
    if (data[index + i].low <= pivotValue) return null;
  }
  
  return pivotValue;
}

/**
 * ZigZag detection with market structure classification
 */
function zigZagAnalysis(data: CandleData[], pivotPeriod: number): PivotArrays {
  const arrays: PivotArrays = {
    types: [],
    values: [],
    indices: [],
    typesAdv: [],
    valuesAdv: [],
    indicesAdv: []
  };
  
  const levels: MajorMinorLevels = {
    majorHighLevel: null,
    majorLowLevel: null,
    majorHighIndex: null,
    majorLowIndex: null,
    majorHighType: null,
    majorLowType: null
  };
  
  let lock0 = true;
  let lock1 = true;

  for (let i = pivotPeriod; i < data.length - pivotPeriod; i++) {
    const highPivot = pivotHigh(data, i, pivotPeriod, pivotPeriod);
    const lowPivot = pivotLow(data, i, pivotPeriod, pivotPeriod);
    
    const highValue = highPivot ?? 0;
    const lowValue = lowPivot ?? 0;
    const highIndex = highPivot ? i : 0;
    const lowIndex = lowPivot ? i : 0;
    const close = data[i].close;

    // Process both high and low pivots at the same time
    if (highPivot !== null && lowPivot !== null) {
      if (arrays.types.length === 0) {
        // First pivot - skip
      } else if (arrays.types.length >= 1) {
        const lastType = arrays.types[arrays.types.length - 1];
        const lastValue = arrays.values[arrays.values.length - 1];
        
        if (lastType === 'L' || lastType === 'LL') {
          if (lowValue < lastValue) {
            arrays.types.pop();
            arrays.values.pop();
            arrays.indices.pop();
            const newType = arrays.types.length > 2 
              ? (arrays.values[arrays.values.length - 2] < lowValue ? 'HL' : 'LL')
              : 'L';
            arrays.types.push(newType);
            arrays.values.push(lowValue);
            arrays.indices.push(lowIndex);
          } else {
            const newType = arrays.types.length > 2
              ? (arrays.values[arrays.values.length - 2] < highValue ? 'HH' : 'LH')
              : 'H';
            arrays.types.push(newType);
            arrays.values.push(highValue);
            arrays.indices.push(highIndex);
          }
        } else if (lastType === 'H' || lastType === 'HH') {
          if (highValue > lastValue) {
            arrays.types.pop();
            arrays.values.pop();
            arrays.indices.pop();
            const newType = arrays.types.length > 2
              ? (arrays.values[arrays.values.length - 2] < highValue ? 'HH' : 'LH')
              : 'H';
            arrays.types.push(newType);
            arrays.values.push(highValue);
            arrays.indices.push(highIndex);
          } else {
            const newType = arrays.types.length > 2
              ? (arrays.values[arrays.values.length - 2] < lowValue ? 'HL' : 'LL')
              : 'L';
            arrays.types.push(newType);
            arrays.values.push(lowValue);
            arrays.indices.push(lowIndex);
          }
        } else if (lastType === 'LH') {
          if (highValue < lastValue) {
            const newType = arrays.types.length > 2
              ? (arrays.values[arrays.values.length - 2] < lowValue ? 'HL' : 'LL')
              : 'L';
            arrays.types.push(newType);
            arrays.values.push(lowValue);
            arrays.indices.push(lowIndex);
          } else if (highValue > lastValue) {
            if (close < lastValue) {
              arrays.types.pop();
              arrays.values.pop();
              arrays.indices.pop();
              const newType = arrays.types.length > 2
                ? (arrays.values[arrays.values.length - 2] < highValue ? 'HH' : 'LH')
                : 'H';
              arrays.types.push(newType);
              arrays.values.push(highValue);
              arrays.indices.push(highIndex);
            } else if (close > lastValue) {
              const newType = arrays.types.length > 2
                ? (arrays.values[arrays.values.length - 2] < lowValue ? 'HL' : 'LL')
                : 'L';
              arrays.types.push(newType);
              arrays.values.push(lowValue);
              arrays.indices.push(lowIndex);
            }
          }
        } else if (lastType === 'HL') {
          if (lowValue > lastValue) {
            const newType = arrays.types.length > 2
              ? (arrays.values[arrays.values.length - 2] < highValue ? 'HH' : 'LH')
              : 'H';
            arrays.types.push(newType);
            arrays.values.push(highValue);
            arrays.indices.push(highIndex);
          } else if (lowValue < lastValue) {
            if (close > lastValue) {
              arrays.types.pop();
              arrays.values.pop();
              arrays.indices.pop();
              const newType = arrays.types.length > 2
                ? (arrays.values[arrays.values.length - 2] < lowValue ? 'HL' : 'LL')
                : 'L';
              arrays.types.push(newType);
              arrays.values.push(lowValue);
              arrays.indices.push(lowIndex);
            } else if (close < lastValue) {
              const newType = arrays.types.length > 2
                ? (arrays.values[arrays.values.length - 2] < highValue ? 'HH' : 'LH')
                : 'H';
              arrays.types.push(newType);
              arrays.values.push(highValue);
              arrays.indices.push(highIndex);
            }
          }
        }
      }
    } else if (highPivot !== null) {
      // Only high pivot
      if (arrays.types.length === 0) {
        arrays.types.push('H');
        arrays.values.push(highValue);
        arrays.indices.push(highIndex);
      } else if (arrays.types.length >= 1) {
        const lastType = arrays.types[arrays.types.length - 1];
        const lastValue = arrays.values[arrays.values.length - 1];
        
        if (lastType === 'L' || lastType === 'HL' || lastType === 'LL') {
          if (highValue > lastValue) {
            const newType = arrays.types.length > 2
              ? (arrays.values[arrays.values.length - 2] < highValue ? 'HH' : 'LH')
              : 'H';
            arrays.types.push(newType);
            arrays.values.push(highValue);
            arrays.indices.push(highIndex);
          } else if (highValue < lastValue) {
            arrays.types.pop();
            arrays.values.pop();
            arrays.indices.pop();
            const newType = arrays.types.length > 2
              ? (arrays.values[arrays.values.length - 2] < lowValue ? 'HL' : 'LL')
              : 'L';
            arrays.types.push(newType);
            arrays.values.push(data[i].low);
            arrays.indices.push(i);
          }
        } else if (lastType === 'H' || lastType === 'HH' || lastType === 'LH') {
          if (lastValue < highValue) {
            arrays.types.pop();
            arrays.values.pop();
            arrays.indices.pop();
            const newType = arrays.types.length > 2
              ? (arrays.values[arrays.values.length - 2] < highValue ? 'HH' : 'LH')
              : 'H';
            arrays.types.push(newType);
            arrays.values.push(highValue);
            arrays.indices.push(highIndex);
          }
        }
      }
    } else if (lowPivot !== null) {
      // Only low pivot
      if (arrays.types.length === 0) {
        arrays.types.push('L');
        arrays.values.push(lowValue);
        arrays.indices.push(lowIndex);
      } else if (arrays.types.length >= 1) {
        const lastType = arrays.types[arrays.types.length - 1];
        const lastValue = arrays.values[arrays.values.length - 1];
        
        if (lastType === 'H' || lastType === 'HH' || lastType === 'LH') {
          if (lowValue < lastValue) {
            const newType = arrays.types.length > 2
              ? (arrays.values[arrays.values.length - 2] < lowValue ? 'HL' : 'LL')
              : 'L';
            arrays.types.push(newType);
            arrays.values.push(lowValue);
            arrays.indices.push(lowIndex);
          } else if (lowValue > lastValue) {
            arrays.types.pop();
            arrays.values.pop();
            arrays.indices.pop();
            const newType = arrays.types.length > 2
              ? (arrays.values[arrays.values.length - 2] < highValue ? 'HH' : 'LH')
              : 'H';
            arrays.types.push(newType);
            arrays.values.push(data[i].high);
            arrays.indices.push(i);
          }
        } else if (lastType === 'L' || lastType === 'HL' || lastType === 'LL') {
          if (lastValue > lowValue) {
            arrays.types.pop();
            arrays.values.pop();
            arrays.indices.pop();
            const newType = arrays.types.length > 2
              ? (arrays.values[arrays.values.length - 2] < lowValue ? 'HL' : 'LL')
              : 'L';
            arrays.types.push(newType);
            arrays.values.push(lowValue);
            arrays.indices.push(lowIndex);
          }
        }
      }
    }

    // Initialize major levels when we have 2 pivots
    if (arrays.types.length === 2) {
      if (arrays.types[0] === 'H') {
        levels.majorHighLevel = arrays.values[0];
        levels.majorLowLevel = arrays.values[1];
        levels.majorHighIndex = arrays.indices[0];
        levels.majorLowIndex = arrays.indices[1];
        levels.majorHighType = arrays.types[0];
        levels.majorLowType = arrays.types[1];
      } else if (arrays.types[0] === 'L') {
        levels.majorHighLevel = arrays.values[1];
        levels.majorLowLevel = arrays.values[0];
        levels.majorHighIndex = arrays.indices[1];
        levels.majorLowIndex = arrays.indices[0];
        levels.majorHighType = arrays.types[1];
        levels.majorLowType = arrays.types[0];
      }
    }

    // Build advanced arrays (Major/Minor classification)
    if (arrays.values.length === 1 && lock0) {
      arrays.typesAdv.push('M' + arrays.types[0]);
      arrays.valuesAdv.push(arrays.values[0]);
      arrays.indicesAdv.push(arrays.indices[0]);
      lock0 = false;
    }

    if (arrays.values.length === 2 && lock1) {
      arrays.typesAdv.push('M' + arrays.types[1]);
      arrays.valuesAdv.push(arrays.values[1]);
      arrays.indicesAdv.push(arrays.indices[1]);
      lock1 = false;
    }

    // Check for new pivots and classify as major/minor
    if (arrays.values.length > 1 && arrays.typesAdv.length > 0) {
      const lastValue = arrays.values[arrays.values.length - 1];
      const lastType = arrays.types[arrays.types.length - 1];
      const lastAdvValue = arrays.valuesAdv[arrays.valuesAdv.length - 1];
      
      if (lastValue !== lastAdvValue) {
        const lastChar = lastType.charAt(lastType.length - 1);
        const lastAdvType = arrays.typesAdv[arrays.typesAdv.length - 1];
        const lastAdvChar = lastAdvType.charAt(lastAdvType.length - 1);
        
        if (lastChar !== lastAdvChar) {
          arrays.typesAdv.push('m' + lastType);
          arrays.valuesAdv.push(lastValue);
          arrays.indicesAdv.push(arrays.indices[arrays.indices.length - 1]);
        } else {
          arrays.valuesAdv[arrays.valuesAdv.length - 1] = lastValue;
          arrays.indicesAdv[arrays.indicesAdv.length - 1] = arrays.indices[arrays.indices.length - 1];
        }
      }
    }

    // Major/Minor detection based on price breaking levels
    if (arrays.valuesAdv.length > 1 && levels.majorHighLevel !== null && levels.majorLowLevel !== null) {
      const lastAdvType = arrays.typesAdv[arrays.typesAdv.length - 1];
      const lastAdvValue = arrays.valuesAdv[arrays.valuesAdv.length - 1];
      const lastType = arrays.types[arrays.types.length - 1];

      // High Major Detector - price breaks above major high
      if (close > levels.majorHighLevel) {
        if (['mL', 'mHL', 'mLL'].includes(lastAdvType)) {
          arrays.typesAdv[arrays.typesAdv.length - 1] = 'M' + lastType;
          levels.majorLowLevel = lastAdvValue;
          levels.majorLowIndex = arrays.indicesAdv[arrays.indicesAdv.length - 1];
          levels.majorLowType = arrays.typesAdv[arrays.typesAdv.length - 1];
        } else if (['mLH', 'mHH', 'MLH', 'MHH'].includes(lastAdvType) && arrays.typesAdv.length > 1) {
          const secondLastAdvType = arrays.typesAdv[arrays.typesAdv.length - 2];
          if (['mHL', 'mLL'].includes(secondLastAdvType)) {
            arrays.typesAdv[arrays.typesAdv.length - 2] = 'M' + (arrays.types[arrays.types.length - 2] || lastType);
            levels.majorLowLevel = arrays.valuesAdv[arrays.valuesAdv.length - 2];
            levels.majorLowIndex = arrays.indicesAdv[arrays.indicesAdv.length - 2];
            levels.majorLowType = arrays.typesAdv[arrays.typesAdv.length - 2];
          }
        }
      }

      // New higher high detection
      if (lastAdvValue > levels.majorHighLevel) {
        if (['mH', 'mLH', 'mHH', 'MHH'].includes(lastAdvType)) {
          arrays.typesAdv[arrays.typesAdv.length - 1] = 'M' + lastType;
          levels.majorHighLevel = lastAdvValue;
          levels.majorHighIndex = arrays.indicesAdv[arrays.indicesAdv.length - 1];
          levels.majorHighType = arrays.typesAdv[arrays.typesAdv.length - 1];
        }
      }

      // Low Major Detector - price breaks below major low
      if (close < levels.majorLowLevel) {
        if (['mH', 'mLH', 'mHH'].includes(lastAdvType)) {
          arrays.typesAdv[arrays.typesAdv.length - 1] = 'M' + lastType;
          levels.majorHighLevel = lastAdvValue;
          levels.majorHighIndex = arrays.indicesAdv[arrays.indicesAdv.length - 1];
          levels.majorHighType = arrays.typesAdv[arrays.typesAdv.length - 1];
        } else if (['mHL', 'mLL', 'MHL', 'MLL'].includes(lastAdvType) && arrays.typesAdv.length > 1) {
          const secondLastAdvType = arrays.typesAdv[arrays.typesAdv.length - 2];
          if (['mLH', 'mHH'].includes(secondLastAdvType)) {
            arrays.typesAdv[arrays.typesAdv.length - 2] = 'M' + (arrays.types[arrays.types.length - 2] || lastType);
            levels.majorHighLevel = arrays.valuesAdv[arrays.valuesAdv.length - 2];
            levels.majorHighIndex = arrays.indicesAdv[arrays.indicesAdv.length - 2];
            levels.majorHighType = arrays.typesAdv[arrays.typesAdv.length - 2];
          }
        }
      }

      // New lower low detection
      if (lastAdvValue < levels.majorLowLevel) {
        if (['mL', 'mHL', 'mLL', 'MLL'].includes(lastAdvType)) {
          arrays.typesAdv[arrays.typesAdv.length - 1] = 'M' + lastType;
          levels.majorLowLevel = lastAdvValue;
          levels.majorLowIndex = arrays.indicesAdv[arrays.indicesAdv.length - 1];
          levels.majorLowType = arrays.typesAdv[arrays.typesAdv.length - 1];
        }
      }
    }
  }

  return arrays;
}

/**
 * Calculate Support/Resistance levels
 */
export function calculateSupportResistance(
  data: CandleData[],
  config: SRConfig = defaultSRConfig
): SRLevel[] {
  const levels: SRLevel[] = [];
  
  if (data.length < Math.max(config.longTermPivotPeriod, config.shortTermPivotPeriod) * 2 + 1) {
    return levels;
  }

  // Long term analysis
  const longTermArrays = zigZagAnalysis(data, config.longTermPivotPeriod);
  
  // Short term analysis  
  const shortTermArrays = zigZagAnalysis(data, config.shortTermPivotPeriod);

  // Extract levels from long term
  for (let i = 0; i < longTermArrays.typesAdv.length; i++) {
    const type = longTermArrays.typesAdv[i];
    const value = longTermArrays.valuesAdv[i];
    const index = longTermArrays.indicesAdv[i];

    if (config.showLongMajor) {
      if (type === 'MLL' || type === 'MHL') {
        levels.push({
          price: value,
          index: index,
          type: 'major-support',
          pivotType: type,
          term: 'long'
        });
      } else if (type === 'MHH' || type === 'MLH') {
        levels.push({
          price: value,
          index: index,
          type: 'major-resistance',
          pivotType: type,
          term: 'long'
        });
      }
    }

    if (config.showLongMinor) {
      if (type === 'mLL' || type === 'mHL') {
        levels.push({
          price: value,
          index: index,
          type: 'minor-support',
          pivotType: type,
          term: 'long'
        });
      } else if (type === 'mHH' || type === 'mLH') {
        levels.push({
          price: value,
          index: index,
          type: 'minor-resistance',
          pivotType: type,
          term: 'long'
        });
      }
    }
  }

  // Extract levels from short term
  for (let i = 0; i < shortTermArrays.typesAdv.length; i++) {
    const type = shortTermArrays.typesAdv[i];
    const value = shortTermArrays.valuesAdv[i];
    const index = shortTermArrays.indicesAdv[i];

    if (config.showShortMajor) {
      if (type === 'MLL' || type === 'MHL') {
        levels.push({
          price: value,
          index: index,
          type: 'major-support',
          pivotType: type,
          term: 'short'
        });
      } else if (type === 'MHH' || type === 'MLH') {
        levels.push({
          price: value,
          index: index,
          type: 'major-resistance',
          pivotType: type,
          term: 'short'
        });
      }
    }

    if (config.showShortMinor) {
      if (type === 'mLL' || type === 'mHL') {
        levels.push({
          price: value,
          index: index,
          type: 'minor-support',
          pivotType: type,
          term: 'short'
        });
      } else if (type === 'mHH' || type === 'mLH') {
        levels.push({
          price: value,
          index: index,
          type: 'minor-resistance',
          pivotType: type,
          term: 'short'
        });
      }
    }
  }

  return levels;
}

/**
 * Get the most recent S/R levels (last N levels for each type)
 */
export function getRecentSRLevels(
  data: CandleData[],
  config: SRConfig = defaultSRConfig,
  maxLevels: number = 4
): SRLevel[] {
  const allLevels = calculateSupportResistance(data, config);
  
  // Group by type and term
  const grouped: Record<string, SRLevel[]> = {};
  
  for (const level of allLevels) {
    const key = `${level.type}-${level.term}`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(level);
  }

  // Get the most recent levels for each group
  const result: SRLevel[] = [];
  
  for (const key of Object.keys(grouped)) {
    const group = grouped[key];
    // Sort by index descending (most recent first)
    group.sort((a, b) => b.index - a.index);
    // Take the most recent one
    if (group.length > 0) {
      result.push(group[0]);
    }
  }

  return result;
}

/**
 * Get color for a level based on config
 */
export function getLevelColor(level: SRLevel, config: SRConfig = defaultSRConfig): string {
  if (level.term === 'long') {
    switch (level.type) {
      case 'major-support': return config.colors.longMajorSupport;
      case 'major-resistance': return config.colors.longMajorResistance;
      case 'minor-support': return config.colors.longMinorSupport;
      case 'minor-resistance': return config.colors.longMinorResistance;
    }
  } else {
    switch (level.type) {
      case 'major-support': return config.colors.shortMajorSupport;
      case 'major-resistance': return config.colors.shortMajorResistance;
      case 'minor-support': return config.colors.shortMinorSupport;
      case 'minor-resistance': return config.colors.shortMinorResistance;
    }
  }
  return '#ffffff';
}

/**
 * Get line style for a level
 */
export function getLevelLineStyle(level: SRLevel): 'solid' | 'dashed' | 'dotted' {
  if (level.term === 'long') {
    return level.type.startsWith('major') ? 'solid' : 'dotted';
  } else {
    return 'dashed';
  }
}

/**
 * Get line width for a level
 */
export function getLevelLineWidth(level: SRLevel): number {
  if (level.term === 'long') {
    return level.type.startsWith('major') ? 4 : 2;
  } else {
    return level.type.startsWith('major') ? 3 : 1;
  }
}
