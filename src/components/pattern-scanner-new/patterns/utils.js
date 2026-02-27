/**
 * Pattern Detection Utilities
 */

/**
 * Calculate linear regression for a set of points
 * @param {Array} points - Array of {x, y} points
 * @returns {Object} { slope, intercept, r2 }
 */
function calculateRegression(points) {
    const n = points.length;
    if (n < 2) return { slope: 0, intercept: 0, r2: 0 };

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (const p of points) {
        sumX += p.x;
        sumY += p.y;
        sumXY += p.x * p.y;
        sumX2 += p.x * p.x;
        sumY2 += p.y * p.y;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    let ssRes = 0;
    let ssTot = 0;
    const yMean = sumY / n;
    for (const p of points) {
        const yPred = slope * p.x + intercept;
        ssRes += Math.pow(p.y - yPred, 2);
        ssTot += Math.pow(p.y - yMean, 2);
    }
    const r2 = ssTot === 0 ? 1 : 1 - (ssRes / ssTot);

    return { slope, intercept, r2 };
}

/**
 * Calculate True Range (TR)
 */
function calculateTR(high, low, prevClose) {
    if (prevClose === undefined) return high - low;
    return Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
}

/**
 * Calculate Angle (f_angle in Pine Script)
 * Pine Script: ang = rad2degree * math.atan((a - b)/(2*math.sum(ta.tr, loopback+1)/(loopback+1)))
 */
function calculateAngle(price1, price2, bars, ohlc) {
    const rad2degree = 180 / Math.PI;
    
    // Calculate average TR over the period
    let sumTR = 0;
    const startIndex = Math.max(0, ohlc.high.length - bars - 1);
    for (let i = startIndex; i < ohlc.high.length; i++) {
        sumTR += calculateTR(ohlc.high[i], ohlc.low[i], ohlc.close[i-1]);
    }
    const avgTR = sumTR / (bars + 1);
    
    if (avgTR === 0) return 0;
    
    const ang = rad2degree * Math.atan((price1 - price2) / (2 * avgTR));
    return ang;
}

/**
 * Calculate error ratio for points against a line
 * @param {Array} points - Array of {x, y} points
 * @param {number} slope 
 * @param {number} intercept 
 * @returns {number} Average error percentage
 */
function calculateErrorRatio(points, slope, intercept) {
    if (points.length === 0) return 0;
    let totalError = 0;
    for (const p of points) {
        const expectedY = slope * p.x + intercept;
        totalError += Math.abs(p.y - expectedY) / expectedY;
    }
    return (totalError / points.length) * 100;
}

/**
 * Check if bars are proportionately placed
 * @param {Array} pivots - Array of pivots
 * @param {number} limit - Ratio limit (e.g., 0.382)
 * @returns {boolean}
 */
function checkBarRatio(pivots, limit) {
    for (let i = 2; i < pivots.length; i++) {
        const d1 = Math.abs(pivots[i].index - pivots[i-1].index);
        const d2 = Math.abs(pivots[i-1].index - pivots[i-2].index);
        if (d1 / d2 < limit || d2 / d1 < limit) return false;
    }
    return true;
}

module.exports = {
    calculateRegression,
    calculateTR,
    calculateAngle,
    calculateErrorRatio,
    checkBarRatio
};
