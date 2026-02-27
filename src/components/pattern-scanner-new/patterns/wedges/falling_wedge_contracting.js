const { calculateRegression, calculateErrorRatio, checkBarRatio } = require('../utils');

/**
 * Falling Wedge (Contracting) Detection
 */
function detect(pivots, ohlc, scanSettings) {
    if (pivots.length < scanSettings.numberOfPivots) return { valid: false };

    const selectedPivots = pivots.slice(0, scanSettings.numberOfPivots);
    const highs = selectedPivots.filter(p => p.dir === 1).map(p => ({ x: p.index, y: p.price }));
    const lows = selectedPivots.filter(p => p.dir === -1).map(p => ({ x: p.index, y: p.price }));

    if (highs.length < 2 || lows.length < 2) return { valid: false };

    const highReg = calculateRegression(highs);
    const lowReg = calculateRegression(lows);

    // Falling Wedge: Both slopes must be negative
    if (highReg.slope >= -scanSettings.flatRatio || lowReg.slope >= -scanSettings.flatRatio) return { valid: false };

    // Contracting: Lines must converge (low slope > high slope because both are negative)
    if (lowReg.slope <= highReg.slope) return { valid: false };

    const highError = calculateErrorRatio(highs, highReg.slope, highReg.intercept);
    const lowError = calculateErrorRatio(lows, lowReg.slope, lowReg.intercept);

    if (highError > scanSettings.errorRatio || lowError > scanSettings.errorRatio) return { valid: false };

    if (scanSettings.checkBarRatio && !checkBarRatio(selectedPivots, scanSettings.barRatioLimit)) return { valid: false };

    // --- Breakout Detection ---
    // pivots are newest-first, so pivots[0] is the most recent pivot
    const newestPivotIndex = selectedPivots[0].index;
    const dataLength = ohlc.close ? ohlc.close.length : 0;
    let breakout = { detected: false, index: -1, price: 0 };
    let status = 'forming';

    if (dataLength > newestPivotIndex + 1) {
        // Scan candles after the most recent pivot
        for (let i = newestPivotIndex + 1; i < dataLength; i++) {
            const resistanceAtI = highReg.slope * i + highReg.intercept;
            // Bullish breakout: close above resistance line
            if (ohlc.close[i] > resistanceAtI) {
                breakout = { detected: true, index: i, price: ohlc.close[i] };
                status = 'confirmed';
                break;
            }
        }
    }

    return {
        valid: true,
        direction: 'bullish',
        pivots: selectedPivots,
        confidence: Math.max(0, 100 - (highError + lowError)),
        regression: {
            high: highReg,
            low: lowReg
        },
        breakout,
        status
    };
}

module.exports = { detect };
