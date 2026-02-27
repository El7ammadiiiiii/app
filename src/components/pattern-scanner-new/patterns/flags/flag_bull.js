const { calculateRegression, calculateErrorRatio, checkBarRatio } = require('../utils');

/**
 * Bullish Flag Detection — Trendoscope® v6 Faithful Port
 * 
 * Rule (from Pine Script & Cheat Sheet):
 *   Bullish Impulse (pole up) + Descending Channel / Falling Wedge = Bullish Flag
 * 
 * Structure: 6 pivots  P0(pole start LOW) → P1(pole end HIGH) → P2-P5 (consolidation)
 *   - P1, P3, P5 are HIGHs (dir=1)  →  upper regression (resistance, descending)
 *   - P2, P4 are LOWs  (dir=-1)     →  lower regression (support, descending)
 *   - Both lines have SIMILAR slope (near-parallel channel)
 *   - Consolidation slopes downward (counter-trend to the bullish pole)
 *
 * Key visual: Flag = rectangle / parallelogram tilted slightly against pole direction
 */
function detect(pivots, ohlc, scanSettings) {
    if (pivots.length < 6) return { valid: false };

    // Pivots come newest-first from ZigzagEngine
    const p0 = pivots[5]; // Pole Start (LOW)
    const p1 = pivots[4]; // Pole End / Flag Start (HIGH)
    const p2 = pivots[3]; // First consolidation LOW
    const p3 = pivots[2]; // Second consolidation HIGH
    const p4 = pivots[1]; // Second consolidation LOW
    const p5 = pivots[0]; // Third consolidation HIGH (newest)

    // ─── 1. Pole Validation ────────────────────────────────────────────
    if (p0.dir !== -1 || p1.dir !== 1) return { valid: false };
    const poleHeight = p1.price - p0.price;
    if (poleHeight <= 0) return { valid: false };
    if (poleHeight / p0.price < 0.03) return { valid: false };

    // ─── 2. Retracement Validation (Pine: flagRatio = 0.618) ──────────
    const maxRetracement = p1.price - (poleHeight * (scanSettings.flagRatio || 0.618));
    const lowestInFlag = Math.min(p2.price, p4.price);
    if (lowestInFlag < maxRetracement) return { valid: false };

    // ─── 3. Direction Check ────────────────────────────────────────────
    if (p2.dir !== -1 || p3.dir !== 1 || p4.dir !== -1 || p5.dir !== 1) return { valid: false };

    // ─── 4. Regression Lines ───────────────────────────────────────────
    const highs = [p1, p3, p5].map(p => ({ x: p.index, y: p.price }));
    const lows  = [p2, p4].map(p => ({ x: p.index, y: p.price }));

    const highReg = calculateRegression(highs);
    const lowReg  = calculateRegression(lows);

    // ─── 5. Flag Shape: Near-Parallel (Channel) ───────────────────────
    const flatRatio = scanSettings.flatRatio || 0.2;

    // Bull flag consolidation must slope downward or flat
    if (highReg.slope > flatRatio) return { valid: false };

    // Parallelism check
    const slopeDiff = Math.abs(highReg.slope - lowReg.slope);
    const avgAbsSlope = (Math.abs(highReg.slope) + Math.abs(lowReg.slope)) / 2;
    const isParallel = avgAbsSlope < 0.001 
        ? slopeDiff < 0.005
        : (slopeDiff / avgAbsSlope) < 1.5;
    if (!isParallel) return { valid: false };

    // ─── 6. Error Validation (Both lines) ─────────────────────────────
    const highError = calculateErrorRatio(highs, highReg.slope, highReg.intercept);
    const lowError  = calculateErrorRatio(lows, lowReg.slope, lowReg.intercept);
    if (highError > (scanSettings.errorRatio || 20)) return { valid: false };
    if (lowError > (scanSettings.errorRatio || 20)) return { valid: false };

    // ─── 7. Bar Ratio Check (Optional) ────────────────────────────────
    if (scanSettings.checkBarRatio) {
        if (!checkBarRatio([p0, p1, p2, p3, p4, p5], scanSettings.barRatioLimit || 0.382)) return { valid: false };
    }

    // ─── 8. Breakout Detection ────────────────────────────────────────
    let breakout = { detected: false };
    let status = 'forming';
    const lastPivotIdx = p5.index;
    const ohlcLen = ohlc.close ? ohlc.close.length : 0;
    for (let i = lastPivotIdx + 1; i < ohlcLen; i++) {
        const close = ohlc.close[i];
        if (close == null) continue;
        const resistanceAtBar = highReg.slope * i + highReg.intercept;
        if (close > resistanceAtBar) {
            breakout = { detected: true, index: i, price: close, direction: 'bullish' };
            status = 'broken_resistance';
            break;
        }
    }

    // ─── 9. Confidence Scoring ────────────────────────────────────────
    const flagRetrace = (p1.price - lowestInFlag) / poleHeight;
    const parallelScore = 1 - Math.min(1, slopeDiff / (avgAbsSlope + 0.0001));
    const errorScore = 1 - (highError + lowError) / 200;
    const confidence = Math.round(Math.min(95,
        parallelScore * 40 + errorScore * 30 + (1 - flagRetrace) * 30
    ));

    return {
        valid: true,
        direction: 'bullish',
        patternName: 'Bullish Flag',
        pivots: [p0, p1, p2, p3, p4, p5],
        pole: { start: p0, end: p1 },
        regression: {
            high: { slope: highReg.slope, intercept: highReg.intercept, r2: highReg.r2 },
            low:  { slope: lowReg.slope,  intercept: lowReg.intercept,  r2: lowReg.r2 }
        },
        breakout,
        status,
        confidence
    };
}

module.exports = { detect };
