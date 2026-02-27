const { calculateRegression, calculateErrorRatio, checkBarRatio } = require('../utils');

/**
 * Descending Channel Detection
 */
function detect(pivots, ohlc, scanSettings) {
    if (pivots.length < scanSettings.numberOfPivots) return { valid: false };

    const selectedPivots = pivots.slice(0, scanSettings.numberOfPivots);
    const highs = selectedPivots.filter(p => p.dir === 1).map(p => ({ x: p.index, y: p.price }));
    const lows = selectedPivots.filter(p => p.dir === -1).map(p => ({ x: p.index, y: p.price }));

    if (highs.length < 2 || lows.length < 2) return { valid: false };

    const highReg = calculateRegression(highs);
    const lowReg = calculateRegression(lows);

    // Descending Channel: Both slopes must be negative
    if (highReg.slope >= -scanSettings.flatRatio || lowReg.slope >= -scanSettings.flatRatio) return { valid: false };

    // Parallel check
    const slopeDiff = Math.abs(highReg.slope - lowReg.slope) / Math.max(Math.abs(highReg.slope), Math.abs(lowReg.slope));
    if (slopeDiff > scanSettings.errorRatio / 100) return { valid: false };

    const highError = calculateErrorRatio(highs, highReg.slope, highReg.intercept);
    const lowError = calculateErrorRatio(lows, lowReg.slope, lowReg.intercept);

    if (highError > scanSettings.errorRatio || lowError > scanSettings.errorRatio) return { valid: false };

    if (scanSettings.checkBarRatio && !checkBarRatio(selectedPivots, scanSettings.barRatioLimit)) return { valid: false };

    // ── Breakout Detection ──────────────────────────────────────────────────
    // Descending Channel = bearish formation → breakout is BULLISH (price closes ABOVE resistance)
    let breakout = { detected: false, index: -1, price: 0 };
    let status = 'forming';

    // Scan bars after the newest pivot (pivots are newest-first → pivots[0])
    const newestPivotIdx = selectedPivots[0].index;
    const totalBars = ohlc.close.length;

    for (let i = newestPivotIdx + 1; i < totalBars; i++) {
        const resistanceAtI = highReg.slope * i + highReg.intercept;
        if (ohlc.close[i] > resistanceAtI) {
            breakout = { detected: true, index: i, price: ohlc.close[i] };
            status = 'confirmed';
            break;
        }
    }

    return {
        valid: true,
        direction: 'bearish',
        pivots: selectedPivots,
        confidence: Math.max(0, 100 - (highError + lowError)),
        regression: {
            high: { slope: highReg.slope, intercept: highReg.intercept, r2: highReg.r2 },
            low:  { slope: lowReg.slope,  intercept: lowReg.intercept,  r2: lowReg.r2  }
        },
        breakout,
        status
    };
}

module.exports = { detect };
