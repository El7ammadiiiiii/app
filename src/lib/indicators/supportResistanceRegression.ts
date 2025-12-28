/**
 * Support and Resistance Polynomial Regressions
 * Converted from Pine Script v5
 */

import { CandleData } from "@/components/charts/TradingChart";

export interface SupportResistanceConfig {
  resistanceLine: boolean;
  supportLine: boolean;
  resistanceRegressionType: 'linear' | 'quadratic' | 'cubic' | 'custom';
  supportRegressionType: 'linear' | 'quadratic' | 'cubic' | 'custom';
  resistanceCustomPoly: number[];
  supportCustomPoly: number[];
  resistancePivotSizeL: number;
  resistancePivotSizeR: number;
  supportPivotSizeL: number;
  supportPivotSizeR: number;
  resYOffset: number;
  supYOffset: number;
  extendFuture: number;
  resistanceLeftIndex: number;
  resistanceRightIndex: number;
  supportLeftIndex: number;
  supportRightIndex: number;
}

export const defaultSupportResistanceConfig: SupportResistanceConfig = {
  resistanceLine: true,
  supportLine: true,
  resistanceRegressionType: 'linear',
  supportRegressionType: 'linear',
  resistanceCustomPoly: [0, 3, 4],
  supportCustomPoly: [0, 3, 4],
  resistancePivotSizeL: 5,
  resistancePivotSizeR: 5,
  supportPivotSizeL: 5,
  supportPivotSizeR: 5,
  resYOffset: 0,
  supYOffset: 0,
  extendFuture: 150,
  resistanceLeftIndex: 100,
  resistanceRightIndex: 50,
  supportLeftIndex: 100,
  supportRightIndex: 50
};

interface Pivot {
  index: number;
  price: number;
  offset: number;
}

interface RegressionLine {
  coefficients: number[];
  startIndex: number;
  endIndex: number;
  forecast: { index: number; value: number }[];
}

interface BreakTest {
  index: number;
  type: 'break' | 'retest';
  level: 'support' | 'resistance';
  price: number;
}

export interface SupportResistanceResult {
  resistanceLine: RegressionLine | null;
  supportLine: RegressionLine | null;
  resistancePivots: Pivot[];
  supportPivots: Pivot[];
  breakTests: BreakTest[];
  centerLine: { index: number; value: number }[] | null;
}

function pivotHigh(data: CandleData[], index: number, left: number, right: number): number | null {
  if (index < left || index >= data.length - right) return null;
  const pivot = data[index].high;
  for (let i = 1; i <= left; i++) {
    if (data[index - i].high >= pivot) return null;
  }
  for (let i = 1; i <= right; i++) {
    if (index + i >= data.length) return null;
    if (data[index + i].high >= pivot) return null;
  }
  return pivot;
}

function pivotLow(data: CandleData[], index: number, left: number, right: number): number | null {
  if (index < left || index >= data.length - right) return null;
  const pivot = data[index].low;
  for (let i = 1; i <= left; i++) {
    if (data[index - i].low <= pivot) return null;
  }
  for (let i = 1; i <= right; i++) {
    if (index + i >= data.length) return null;
    if (data[index + i].low <= pivot) return null;
  }
  return pivot;
}

function matrixMultiply(a: number[][], b: number[][]): number[][] {
  const rows = a.length;
  const cols = b[0].length;
  const inner = b.length;
  const result: number[][] = [];
  for (let i = 0; i < rows; i++) {
    result[i] = [];
    for (let j = 0; j < cols; j++) {
      let sum = 0;
      for (let k = 0; k < inner; k++) {
        sum += a[i][k] * b[k][j];
      }
      result[i][j] = sum;
    }
  }
  return result;
}

function transposeMatrix(matrix: number[][]): number[][] {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const result: number[][] = [];
  for (let j = 0; j < cols; j++) {
    result[j] = [];
    for (let i = 0; i < rows; i++) {
      result[j][i] = matrix[i][j];
    }
  }
  return result;
}

function invertMatrix(matrix: number[][]): number[][] | null {
  const n = matrix.length;
  const augmented: number[][] = [];
  for (let i = 0; i < n; i++) {
    augmented[i] = [...matrix[i], ...Array(n).fill(0)];
    augmented[i][n + i] = 1;
  }
  
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
        maxRow = k;
      }
    }
    [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
    
    if (Math.abs(augmented[i][i]) < 1e-10) return null;
    
    for (let k = i + 1; k < 2 * n; k++) {
      augmented[i][k] /= augmented[i][i];
    }
    augmented[i][i] = 1;
    
    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = augmented[k][i];
        for (let j = i; j < 2 * n; j++) {
          augmented[k][j] -= factor * augmented[i][j];
        }
      }
    }
  }
  
  const result: number[][] = [];
  for (let i = 0; i < n; i++) {
    result[i] = augmented[i].slice(n);
  }
  return result;
}

function polynomialRegression(x: number[], y: number[], degrees: number[]): number[] {
  const n = x.length;
  const m = degrees.length;
  
  const X: number[][] = [];
  for (let i = 0; i < n; i++) {
    X[i] = [];
    for (let j = 0; j < m; j++) {
      X[i][j] = Math.pow(x[i], degrees[j]);
    }
  }
  
  const Xt = transposeMatrix(X);
  const XtX = matrixMultiply(Xt, X);
  const XtXinv = invertMatrix(XtX);
  
  if (!XtXinv) return degrees.map(() => 0);
  
  const Xty: number[][] = [];
  for (let i = 0; i < m; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) {
      sum += Xt[i][j] * y[j];
    }
    Xty[i] = [sum];
  }
  
  const coeffs = matrixMultiply(XtXinv, Xty);
  return coeffs.map(row => row[0]);
}

function evaluatePolynomial(coeffs: number[], degrees: number[], x: number): number {
  let result = 0;
  for (let i = 0; i < coeffs.length; i++) {
    result += coeffs[i] * Math.pow(x, degrees[i]);
  }
  return result;
}

export function calculateSupportResistance(
  data: CandleData[],
  config: SupportResistanceConfig = defaultSupportResistanceConfig
): SupportResistanceResult {
  const resistancePivots: Pivot[] = [];
  const supportPivots: Pivot[] = [];
  const breakTests: BreakTest[] = [];
  
  for (let i = 0; i < data.length; i++) {
    const pivH = pivotHigh(data, i, config.resistancePivotSizeL, config.resistancePivotSizeR);
    if (pivH !== null && i >= config.resistanceLeftIndex && i <= config.resistanceRightIndex) {
      resistancePivots.push({
        index: i,
        price: pivH,
        offset: data.length - 1 - i
      });
    }
    
    const pivL = pivotLow(data, i, config.supportPivotSizeL, config.supportPivotSizeR);
    if (pivL !== null && i >= config.supportLeftIndex && i <= config.supportRightIndex) {
      supportPivots.push({
        index: i,
        price: pivL,
        offset: data.length - 1 - i
      });
    }
  }
  
  let resistanceLine: RegressionLine | null = null;
  let supportLine: RegressionLine | null = null;
  let centerLine: { index: number; value: number }[] | null = null;
  
  if (config.resistanceLine && resistancePivots.length >= 2) {
    const x = resistancePivots.map(p => p.offset);
    const y = resistancePivots.map(p => p.price);
    
    let degrees: number[] = [];
    if (config.resistanceRegressionType === 'linear') {
      degrees = [0, 1];
    } else if (config.resistanceRegressionType === 'quadratic') {
      degrees = [0, 1, 2];
    } else if (config.resistanceRegressionType === 'cubic') {
      degrees = [0, 1, 2, 3];
    } else {
      degrees = config.resistanceCustomPoly;
    }
    
    const coeffs = polynomialRegression(x, y, degrees);
    coeffs[0] += config.resYOffset;
    
    const forecast: { index: number; value: number }[] = [];
    const startOffset = data.length - 1 - config.resistanceRightIndex;
    for (let i = startOffset; i >= -config.extendFuture; i--) {
      const value = evaluatePolynomial(coeffs, degrees, i);
      forecast.push({ index: data.length - 1 - i, value });
    }
    
    resistanceLine = {
      coefficients: coeffs,
      startIndex: config.resistanceLeftIndex,
      endIndex: config.resistanceRightIndex,
      forecast
    };
  }
  
  if (config.supportLine && supportPivots.length >= 2) {
    const x = supportPivots.map(p => p.offset);
    const y = supportPivots.map(p => p.price);
    
    let degrees: number[] = [];
    if (config.supportRegressionType === 'linear') {
      degrees = [0, 1];
    } else if (config.supportRegressionType === 'quadratic') {
      degrees = [0, 1, 2];
    } else if (config.supportRegressionType === 'cubic') {
      degrees = [0, 1, 2, 3];
    } else {
      degrees = config.supportCustomPoly;
    }
    
    const coeffs = polynomialRegression(x, y, degrees);
    coeffs[0] += config.supYOffset;
    
    const forecast: { index: number; value: number }[] = [];
    const startOffset = data.length - 1 - config.supportRightIndex;
    for (let i = startOffset; i >= -config.extendFuture; i--) {
      const value = evaluatePolynomial(coeffs, degrees, i);
      forecast.push({ index: data.length - 1 - i, value });
    }
    
    supportLine = {
      coefficients: coeffs,
      startIndex: config.supportLeftIndex,
      endIndex: config.supportRightIndex,
      forecast
    };
  }
  
  if (resistanceLine && supportLine) {
    centerLine = [];
    const minLen = Math.min(resistanceLine.forecast.length, supportLine.forecast.length);
    for (let i = 0; i < minLen; i++) {
      centerLine.push({
        index: resistanceLine.forecast[i].index,
        value: (resistanceLine.forecast[i].value + supportLine.forecast[i].value) / 2
      });
    }
  }
  
  for (let i = 1; i < data.length; i++) {
    if (resistanceLine) {
      const resValue = resistanceLine.forecast.find(f => f.index === i)?.value;
      const prevResValue = resistanceLine.forecast.find(f => f.index === i - 1)?.value;
      
      if (resValue && prevResValue) {
        if (data[i].close > resValue && data[i - 1].close <= prevResValue) {
          breakTests.push({
            index: i,
            type: 'break',
            level: 'resistance',
            price: data[i].close
          });
        } else if (data[i].high >= resValue && data[i - 1].high < prevResValue && data[i].close < resValue) {
          breakTests.push({
            index: i,
            type: 'retest',
            level: 'resistance',
            price: data[i].high
          });
        }
      }
    }
    
    if (supportLine) {
      const supValue = supportLine.forecast.find(f => f.index === i)?.value;
      const prevSupValue = supportLine.forecast.find(f => f.index === i - 1)?.value;
      
      if (supValue && prevSupValue) {
        if (data[i].close < supValue && data[i - 1].close >= prevSupValue) {
          breakTests.push({
            index: i,
            type: 'break',
            level: 'support',
            price: data[i].close
          });
        } else if (data[i].low <= supValue && data[i - 1].low > prevSupValue && data[i].close > supValue) {
          breakTests.push({
            index: i,
            type: 'retest',
            level: 'support',
            price: data[i].low
          });
        }
      }
    }
  }
  
  return {
    resistanceLine,
    supportLine,
    resistancePivots,
    supportPivots,
    breakTests,
    centerLine
  };
}
