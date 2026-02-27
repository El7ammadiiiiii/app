const { calculateRegression, calculateErrorRatio, checkBarRatio } = require('../utils');

/**
 * Bearish Pennant Detection — Trendoscope® v6 Faithful Port
 * 
 * Rule (from Pine Script & Cheat Sheet):
 *   Bearish Impulse (pole down) + Converging Triangle / Descending Triangle = Bearish Pennant
 * 
 * Structure: 6 pivots  P0(pole start HIGH) → P1(pole end LOW) → P2-P5 (consolidation)
 *   - P2, P4 are HIGHs (dir=1)  →  upper regression (resistance, DESCENDING)
 *   - P1, P3, P5 are LOWs (dir=-1) → lower regression (support, ASCENDING)
 *   - Lines CONVERGE toward each other (triangle shape narrows)
 *
 * Key visual: Pennant = triangle that narrows → lines converge to a point
 * Difference from Flag: Flag has parallel lines, Pennant has converging lines
 */
function detect(pivots, ohlc, scanSettings) {
    if (pivots.length < 6) return { valid: false };

    // Pivots come newest-first from ZigzagEngine
    const p0 = pivots[5]; // Pole Start (HIGH)
    const p1 = pivots[4]; // Pole End / Pennant Start (LOW)
    const p2 = pivots[3]; // First consolidation HIGH
    const p3 = pivots[2]; // Second consolidation LOW
    const p4 = pivots[1]; // Second consolidation HIGH
    const p5 = pivots[0]; // Third consolidation LOW (newest)

    // ─── 1. Pole Validation ────────────────────────────────────────────
    if (p0.dir !== 1 || p1.dir !== -1) return { valid: false };
    const poleHeight = p0.price - p1.price;
    if (poleHeight <= 0) return { valid: false };
    if (poleHeight / p0.price < 0.03) return { valid: false };

    // ─── 2. Retracement Validation (Pine: flagRatio = 0.618) ──────────
    const highestInPennant = Math.max(p2.price, p4.price);
    const flagRatio = (highestInPennant - p1.price) / poleHeight;
    if (flagRatio >= (scanSettings.flagRatio || 0.618)) return { valid: false };

    // ─── 3. Direction Check ────────────────────────────────────────────
    if (p2.dir !== 1 || p3.dir !== -1 || p4.dir !== 1 || p5.dir !== -1) return { valid: false };

    // ─── 4. Pine Script Ratio-Based Contraction Check ─────────────────
    const a = p5.price, b = p4.price, c = p3.price, d = p2.price, e = p1.price;
    const abDiff = Math.abs(a - b);
    const bcDiff = Math.abs(b - c);
    const cdDiff = Math.abs(c - d);
    const deDiff = Math.abs(d - e);

    if (bcDiff === 0 || cdDiff === 0) return { valid: false };

    const aRatio = abDiff / bcDiff;
    const bRatio = bcDiff / cdDiff;
    const cRatio = cdDiff / deDiff;

    const isContracting = (aRatio >= 1 && bRatio < 1 && cRatio >= 1);

    // ─── 5. Regression Lines ───────────────────────────────────────────
    // Upper (resistance): through HIGHs P2, P4 — should descend
    const highs = [p2, p4].map(p => ({ x: p.index, y: p.price }));
    // Lower (support): through LOWs P1, P3, P5 — should ascend
    const lows  = [p1, p3, p5].map(p => ({ x: p.index, y: p.price }));

    const highReg = calculateRegression(highs);
    const lowReg  = calculateRegression(lows);

    // ─── 6. Convergence Check (Angle-Based) ───────────────────────────
    const startWidth = Math.abs(
        (highReg.slope * p1.index + highReg.intercept) - 
        (lowReg.slope * p1.index + lowReg.intercept)
    );
    const endWidth = Math.abs(
        (highReg.slope * p5.index + highReg.intercept) - 
        (lowReg.slope * p5.index + lowReg.intercept)
    );

    if (startWidth === 0) return { valid: false };
    const convergenceRatio = endWidth / startWidth;

    const angleConverging = highReg.slope < 0 && lowReg.slope > 0;
    const widthConverging = convergenceRatio < 0.8;

    if (!isContracting && !angleConverging && !widthConverging) return { valid: false };

    // Must NOT be parallel (that would be a flag)
    if (convergenceRatio > 0.95) return { valid: false };

    // ─── 7. Error Validation (Both lines) ─────────────────────────────
    const highError = calculateErrorRatio(highs, highReg.slope, highReg.intercept);
    const lowError  = calculateErrorRatio(lows, lowReg.slope, lowReg.intercept);
    if (highError > (scanSettings.errorRatio || 20)) return { valid: false };
    if (lowError > (scanSettings.errorRatio || 20)) return { valid: false };

    // ─── 8. Bar Ratio Check (Optional) ────────────────────────────────
    if (scanSettings.checkBarRatio) {
        if (!checkBarRatio([p0, p1, p2, p3, p4, p5], scanSettings.barRatioLimit || 0.382)) return { valid: false };
    }

    // ─── 9. Direction Consistency (Pine Script) ───────────────────────
    const lastPivot = p5.price;
    const poleStart = p0.price;
    if (Math.sign(lastPivot - poleStart) !== Math.sign(lastPivot - p4.price)) return { valid: false };

    // ─── 10. Breakout Detection ───────────────────────────────────────
    let breakout = { detected: false };
    let status = 'forming';
    const lastPivotIdx = p5.index;
    const ohlcLen = ohlc.close ? ohlc.close.length : 0;
    for (let i = lastPivotIdx + 1; i < ohlcLen; i++) {
        const close = ohlc.close[i];
        if (close == null) continue;
        const supportAtBar = lowReg.slope * i + lowReg.intercept;
        if (close < supportAtBar) {
            breakout = { detected: true, index: i, price: close, direction: 'bearish' };
            status = 'broken_support';
            break;
        }
    }

    // ─── 11. Confidence Scoring ───────────────────────────────────────
    const convergenceScore = Math.max(0, 1 - convergenceRatio);
    const errorScore = 1 - (highError + lowError) / 200;
    const retraceScore = 1 - flagRatio;
    const confidence = Math.round(Math.min(95,
        convergenceScore * 35 + errorScore * 30 + retraceScore * 25 + (isContracting ? 10 : 0)
    ));

    return {
        valid: true,
        type: 'pennant',
        direction: 'bearish',
        patternName: 'Bearish Pennant',
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
