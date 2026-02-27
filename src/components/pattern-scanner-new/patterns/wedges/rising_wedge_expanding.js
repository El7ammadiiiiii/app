const { calculateRegression, calculateErrorRatio, checkBarRatio } = require('../utils');

/**
 * Rising Wedge (Expanding) Detection
 */
function detect(pivots, ohlc, scanSettings) {
    if (pivots.length < scanSettings.numberOfPivots) return { valid: false };

    const selectedPivots = pivots.slice(0, scanSettings.numberOfPivots);
    const highs = selectedPivots.filter(p => p.dir === 1).map(p => ({ x: p.index, y: p.price }));
    const lows = selectedPivots.filter(p => p.dir === -1).map(p => ({ x: p.index, y: p.price }));

    if (highs.length < 2 || lows.length < 2) return { valid: false };

    const highReg = calculateRegression(highs);
    const lowReg = calculateRegression(lows);

    // Rising Wedge: Both slopes must be positive
    if (highReg.slope <= scanSettings.flatRatio || lowReg.slope <= scanSettings.flatRatio) return { valid: false };

    // Expanding: Lines must diverge (high slope > low slope because both are positive)
    if (highReg.slope <= lowReg.slope) return { valid: false };

    const highError = calculateErrorRatio(highs, highReg.slope, highReg.intercept);
    const lowError = calculateErrorRatio(lows, lowReg.slope, lowReg.intercept);

    if (highError > scanSettings.errorRatio || lowError > scanSettings.errorRatio) return { valid: false };

    if (scanSettings.checkBarRatio && !checkBarRatio(selectedPivots, scanSettings.barRatioLimit)) return { valid: false };

    // ── Breakout Detection ──────────────────────────────────────────────────
    // Rising wedge = bearish → breakout is when price closes BELOW support line
    let breakout = { detected: false, index: -1, price: 0 };
    let status = 'forming';

    // Scan bars after the newest pivot (pivots are newest-first → pivots[0])
    const newestPivotIdx = selectedPivots[0].index;
    const totalBars = ohlc.close.length;

    for (let i = newestPivotIdx + 1; i < totalBars; i++) {
        const supportAtI = lowReg.slope * i + lowReg.intercept;
        if (ohlc.close[i] < supportAtI) {
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
