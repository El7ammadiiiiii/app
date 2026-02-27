const { calculateRegression, calculateErrorRatio, checkBarRatio } = require('../utils');

/**
 * Ranging Channel Detection
 */
function detect(pivots, ohlc, scanSettings) {
    if (pivots.length < scanSettings.numberOfPivots) return { valid: false };

    const selectedPivots = pivots.slice(0, scanSettings.numberOfPivots);
    const highs = selectedPivots.filter(p => p.dir === 1).map(p => ({ x: p.index, y: p.price }));
    const lows = selectedPivots.filter(p => p.dir === -1).map(p => ({ x: p.index, y: p.price }));

    if (highs.length < 2 || lows.length < 2) return { valid: false };

    const highReg = calculateRegression(highs);
    const lowReg = calculateRegression(lows);

    // Ranging Channel: Both slopes must be near zero
    if (Math.abs(highReg.slope) > scanSettings.flatRatio || Math.abs(lowReg.slope) > scanSettings.flatRatio) return { valid: false };

    const highError = calculateErrorRatio(highs, highReg.slope, highReg.intercept);
    const lowError = calculateErrorRatio(lows, lowReg.slope, lowReg.intercept);

    if (highError > scanSettings.errorRatio || lowError > scanSettings.errorRatio) return { valid: false };

    if (scanSettings.checkBarRatio && !checkBarRatio(selectedPivots, scanSettings.barRatioLimit)) return { valid: false };

    // ── Breakout detection (bidirectional — above resistance = bullish, below support = bearish) ──
    const newestPivotIdx = selectedPivots[0].index;
    let breakout = { detected: false, index: -1, price: 0, direction: 'none' };
    let direction = 'neutral';

    const totalBars = ohlc.close ? ohlc.close.length : 0;
    for (let i = newestPivotIdx + 1; i < totalBars; i++) {
        const close = ohlc.close[i];
        if (close == null) continue;
        const resistanceLevel = highReg.slope * i + highReg.intercept;
        const supportLevel = lowReg.slope * i + lowReg.intercept;

        if (close > resistanceLevel) {
            // Bullish breakout — price closes above resistance
            breakout = { detected: true, index: i, price: close, direction: 'bullish' };
            direction = 'bullish';
            break;
        }
        if (close < supportLevel) {
            // Bearish breakout — price closes below support
            breakout = { detected: true, index: i, price: close, direction: 'bearish' };
            direction = 'bearish';
            break;
        }
    }

    return {
        valid: true,
        direction,
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
