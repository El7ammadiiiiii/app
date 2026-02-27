const { calculateRegression, calculateErrorRatio, checkBarRatio } = require('../utils');

/**
 * Ascending Triangle (Contracting) Detection
 */
function detect(pivots, ohlc, scanSettings) {
    if (pivots.length < scanSettings.numberOfPivots) return { valid: false };

    const selectedPivots = pivots.slice(0, scanSettings.numberOfPivots);
    const highs = selectedPivots.filter(p => p.dir === 1).map(p => ({ x: p.index, y: p.price }));
    const lows = selectedPivots.filter(p => p.dir === -1).map(p => ({ x: p.index, y: p.price }));

    if (highs.length < 2 || lows.length < 2) return { valid: false };

    const highReg = calculateRegression(highs);
    const lowReg = calculateRegression(lows);

    // Ascending Triangle: Flat resistance (highs) and ascending support (lows)
    if (Math.abs(highReg.slope) > scanSettings.flatRatio) return { valid: false };
    if (lowReg.slope <= scanSettings.flatRatio) return { valid: false };

    // Contracting: Lines must converge
    if (highReg.slope >= lowReg.slope) return { valid: false };

    const highError = calculateErrorRatio(highs, highReg.slope, highReg.intercept);
    const lowError = calculateErrorRatio(lows, lowReg.slope, lowReg.intercept);

    if (highError > scanSettings.errorRatio || lowError > scanSettings.errorRatio) return { valid: false };

    if (scanSettings.checkBarRatio && !checkBarRatio(selectedPivots, scanSettings.barRatioLimit)) return { valid: false };

    // ── Breakout detection (bullish — close above flat resistance) ──
    const newestPivotIdx = selectedPivots[0].index;
    let breakout = { detected: false, index: -1, price: 0 };

    const totalBars = ohlc.close ? ohlc.close.length : 0;
    for (let i = newestPivotIdx + 1; i < totalBars; i++) {
        const close = ohlc.close[i];
        if (close == null) continue;
        const resistanceLevel = highReg.slope * i + highReg.intercept;

        if (close > resistanceLevel) {
            breakout = { detected: true, index: i, price: close };
            break;
        }
    }

    return {
        valid: true,
        direction: 'bullish',
        pivots: selectedPivots,
        confidence: Math.max(0, 100 - (highError + lowError)),
        regression: {
            high: { slope: highReg.slope, intercept: highReg.intercept, r2: highReg.r2 },
            low:  { slope: lowReg.slope,  intercept: lowReg.intercept,  r2: lowReg.r2 }
        },
        breakout,
        status: breakout.detected ? 'confirmed' : 'forming'
    };
}

module.exports = { detect };
