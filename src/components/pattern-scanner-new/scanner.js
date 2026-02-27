const ZigzagEngine = require('./zigzag_engine');

// Import all patterns
const ascending_channel = require('./patterns/channels/ascending_channel');
const descending_channel = require('./patterns/channels/descending_channel');
const ranging_channel = require('./patterns/channels/ranging_channel');
const ascending_triangle_contracting = require('./patterns/triangles/ascending_triangle_contracting');
const ascending_triangle_expanding = require('./patterns/triangles/ascending_triangle_expanding');
const descending_triangle_contracting = require('./patterns/triangles/descending_triangle_contracting');
const descending_triangle_expanding = require('./patterns/triangles/descending_triangle_expanding');
const symmetrical_triangle_contracting = require('./patterns/triangles/symmetrical_triangle_contracting');
const symmetrical_triangle_expanding = require('./patterns/triangles/symmetrical_triangle_expanding');
const falling_wedge_contracting = require('./patterns/wedges/falling_wedge_contracting');
const falling_wedge_expanding = require('./patterns/wedges/falling_wedge_expanding');
const rising_wedge_contracting = require('./patterns/wedges/rising_wedge_contracting');
const rising_wedge_expanding = require('./patterns/wedges/rising_wedge_expanding');

// Import Flag & Pennant patterns
const flag_bull = require('./patterns/flags/flag_bull');
const flag_bear = require('./patterns/flags/flag_bear');
const pennant_bull = require('./patterns/pennants/pennant_bull');
const pennant_bear = require('./patterns/pennants/pennant_bear');

class Scanner {
    constructor(config = {}) {
        this.config = {
            numberOfPivots: config.numberOfPivots || 5,
            errorRatio: config.errorRatio || 20.0,
            flatRatio: config.flatRatio || 0.2,
            flagRatio: config.flagRatio || 0.618,
            checkBarRatio: config.checkBarRatio !== undefined ? config.checkBarRatio : true,
            barRatioLimit: config.barRatioLimit || 0.382,
            avoidOverlap: config.avoidOverlap !== undefined ? config.avoidOverlap : true,
            applyAngleDiff: config.applyAngleDiff || false,
            minAngleDiff: config.minAngleDiff || 5,
            maxAngleDiff: config.maxAngleDiff || 20,
            maxPatterns: config.maxPatterns || 20,
            zigzags: config.zigzags || [
                { enabled: true, length: 3, depth: 144 },
                { enabled: true, length: 5, depth: 89 },
                { enabled: true, length: 8, depth: 55 },
                { enabled: true, length: 13, depth: 34 }
            ]
        };

        this.engines = this.config.zigzags.map((z, i) => 
            z.enabled ? new ZigzagEngine(z.length, z.depth, i + 1) : null
        );

        this.detectedPatterns = [];
        this.detectedFlags = [];
        this.detectedPennants = [];
        this.lastDBar = new Map();
    }

    /**
     * Reset all accumulated state — MUST be called before scanning a new symbol
     * to prevent cross-symbol data pollution.
     */
    reset() {
        this.detectedPatterns = [];
        this.detectedFlags = [];
        this.detectedPennants = [];
        this.lastDBar = new Map();
        // Re-initialize zigzag engines to clear cached pivots
        this.engines = this.config.zigzags.map((z, i) =>
            z.enabled ? new ZigzagEngine(z.length, z.depth, i + 1) : null
        );
    }

    scan(data) {
        const { high, low } = data;
        
        this.engines.forEach((engine, level) => {
            if (!engine) return;
            engine.calculate(high, low);

            if (engine.flags.newPivot) {
                const pivots = engine.pivots;
                const lastBar = pivots[0].index;
                const currentLastDBar = this.lastDBar.get(level + 1) || -1;

                if (lastBar > currentLastDBar) {
                    this.lastDBar.set(level + 1, lastBar);
                    this.detectAllPatterns(pivots, data, level + 1);
                }
            }
        });

        // Return copies to trigger React state updates
        return {
            patterns: [...this.detectedPatterns],
            flags: [...this.detectedFlags],
            pennants: [...this.detectedPennants]
        };
    }

    checkForOverlap(currentPattern, existingPatterns) {
        if (existingPatterns.length === 0) return false;
        const currentStart = currentPattern.pivots[currentPattern.pivots.length - 1].index;
        const currentEnd = currentPattern.pivots[0].index;

        for (const pattern of existingPatterns) {
            const start = pattern.pivots[pattern.pivots.length - 1].index;
            const end = pattern.pivots[0].index;
            if ((currentStart >= start && currentStart <= end) || (currentEnd >= start && currentEnd <= end)) {
                return true;
            }
        }
        return false;
    }

    detectAllPatterns(pivots, ohlc, level) {
        // 1. Standard Patterns
        const standardModules = [
            { name: 'Ascending Channel', module: ascending_channel },
            { name: 'Descending Channel', module: descending_channel },
            { name: 'Ranging Channel', module: ranging_channel },
            { name: 'Ascending Triangle (Contracting)', module: ascending_triangle_contracting },
            { name: 'Ascending Triangle (Expanding)', module: ascending_triangle_expanding },
            { name: 'Descending Triangle (Contracting)', module: descending_triangle_contracting },
            { name: 'Descending Triangle (Expanding)', module: descending_triangle_expanding },
            { name: 'Symmetrical Triangle (Contracting)', module: symmetrical_triangle_contracting },
            { name: 'Symmetrical Triangle (Expanding)', module: symmetrical_triangle_expanding },
            { name: 'Falling Wedge (Contracting)', module: falling_wedge_contracting },
            { name: 'Falling Wedge (Expanding)', module: falling_wedge_expanding },
            { name: 'Rising Wedge (Contracting)', module: rising_wedge_contracting },
            { name: 'Rising Wedge (Expanding)', module: rising_wedge_expanding }
        ];

        for (const p of standardModules) {
            const result = p.module.detect(pivots, ohlc, this.config);
            if (result.valid) {
                const newPattern = { ...result, name: p.name, level, timestamp: Date.now() };
                if (!this.config.avoidOverlap || !this.checkForOverlap(newPattern, this.detectedPatterns)) {
                    this.detectedPatterns.push(newPattern);
                    if (this.detectedPatterns.length > this.config.maxPatterns) this.detectedPatterns.shift();
                }
            }
        }

        // 2. Flags
        const flagModules = [
            { name: 'Bullish Flag', module: flag_bull },
            { name: 'Bearish Flag', module: flag_bear }
        ];

        for (const f of flagModules) {
            const result = f.module.detect(pivots, ohlc, this.config);
            if (result.valid) {
                const newFlag = { ...result, name: f.name, level, timestamp: Date.now() };
                if (!this.config.avoidOverlap || !this.checkForOverlap(newFlag, this.detectedFlags)) {
                    this.detectedFlags.push(newFlag);
                    if (this.detectedFlags.length > this.config.maxPatterns) this.detectedFlags.shift();
                    console.log(`[Scanner] New Flag Detected: ${f.name} at level ${level}`);
                }
            }
        }

        // 3. Pennants
        const pennantModules = [
            { name: 'Bullish Pennant', module: pennant_bull },
            { name: 'Bearish Pennant', module: pennant_bear }
        ];

        for (const pn of pennantModules) {
            const result = pn.module.detect(pivots, ohlc, this.config);
            if (result.valid) {
                const newPennant = { ...result, name: pn.name, level, timestamp: Date.now() };
                if (!this.config.avoidOverlap || !this.checkForOverlap(newPennant, this.detectedPennants)) {
                    this.detectedPennants.push(newPennant);
                    if (this.detectedPennants.length > this.config.maxPatterns) this.detectedPennants.shift();
                    console.log(`[Scanner] New Pennant Detected: ${pn.name} at level ${level}`);
                }
            }
        }
    }
}

module.exports = Scanner;
