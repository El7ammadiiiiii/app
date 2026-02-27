const { calculateRegression, calculateErrorRatio, checkBarRatio } = require('../utils');

/**
 * Symmetrical Triangle (Contracting) Detection
 */
function detect(pivots, ohlc, scanSettings) {
    if (pivots.length < scanSettings.numberOfPivots) return { valid: false };

    const selectedPivots = pivots.slice(0, scanSettings.numberOfPivots);
    const highs = selectedPivots.filter(p => p.dir === 1).map(p => ({ x: p.index, y: p.price }));
    const lows = selectedPivots.filter(p => p.dir === -1).map(p => ({ x: p.index, y: p.price }));

    if (highs.length < 2 || lows.length < 2) return { valid: false };

    const highReg = calculateRegression(highs);
    const lowReg = calculateRegression(lows);

    // Symmetrical Triangle: Descending resistance and ascending support
    if (highReg.slope >= -scanSettings.flatRatio) return { valid: false };
    if (lowReg.slope <= scanSettings.flatRatio) return { valid: false };

    // Contracting: Lines must converge
    if (lowReg.slope <= highReg.slope) return { valid: false };

    const highError = calculateErrorRatio(highs, highReg.slope, highReg.intercept);
    const lowError = calculateErrorRatio(lows, lowReg.slope, lowReg.intercept);

    if (highError > scanSettings.errorRatio || lowError > scanSettings.errorRatio) return { valid: false };

    if (scanSettings.checkBarRatio && !checkBarRatio(selectedPivots, scanSettings.barRatioLimit)) return { valid: false };

    // ── Regression data for renderer ──
    const regression = {
        high: { slope: highReg.slope, intercept: highReg.intercept, r2: highReg.r2 },
        low:  { slope: lowReg.slope,  intercept: lowReg.intercept,  r2: lowReg.r2  }
    };

    // ── Bidirectional breakout detection ──
    // Symmetrical triangle can break in either direction
    const newestPivotIdx = selectedPivots[0].index;
    let breakout = { detected: false, index: -1, price: 0, direction: 'none' };
    let status = 'forming';

    const totalBars = ohlc.close ? ohlc.close.length : 0;
    for (let i = newestPivotIdx + 1; i < totalBars; i++) {
        const close = ohlc.close[i];
        if (close == null) continue;
        const resY = highReg.slope * i + highReg.intercept;
        const supY = lowReg.slope * i + lowReg.intercept;

        if (close > resY) {
            breakout = { detected: true, index: i, price: close, direction: 'bullish' };
            status = 'breakout';
            break;
        }
        if (close < supY) {
            breakout = { detected: true, index: i, price: close, direction: 'bearish' };
            status = 'breakout';
            break;
        }
    }

    return {
        valid: true,
        direction: 'neutral',
        pivots: selectedPivots,
        confidence: Math.max(0, 100 - (highError + lowError)),
        regression,
        breakout,
        status
    };
}

module.exports = { detect };
