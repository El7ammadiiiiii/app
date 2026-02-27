/**
 * Zigzag Engine - Trendoscope® & HeWhoMustNotBeNamed Compatible
 * Implements multi-level zigzag calculation with pivot ratios and directions.
 */

class ZigzagEngine {
    constructor(length = 5, depth = 55, level = 0) {
        this.length = length;
        this.depth = depth;
        this.level = level;
        this.pivots = []; // { index, price, dir, level, ratio }
        this.flags = {
            newPivot: false,
            doublePivot: false
        };
    }

    /**
     * Calculate zigzag pivots
     * Matches logic of zg.czigzag in Pine Script
     */
    calculate(highSource, lowSource) {
        const oldPivotCount = this.pivots.length;
        this.pivots = [];
        this.flags.newPivot = false;
        this.flags.doublePivot = false;

        if (highSource.length < this.length) return;

        let direction = 0;
        let lastPivotPrice = highSource[0];
        let lastPivotIndex = 0;

        for (let i = 1; i < highSource.length; i++) {
            const h = highSource[i];
            const l = lowSource[i];

            if (direction === 0) {
                if (h > lastPivotPrice * (1 + this.length / 100)) {
                    direction = 1;
                    lastPivotPrice = h;
                    lastPivotIndex = i;
                } else if (l < lastPivotPrice * (1 - this.length / 100)) {
                    direction = -1;
                    lastPivotPrice = l;
                    lastPivotIndex = i;
                }
            } else if (direction === 1) {
                if (h > lastPivotPrice) {
                    lastPivotPrice = h;
                    lastPivotIndex = i;
                } else if (l < lastPivotPrice * (1 - this.length / 100)) {
                    // New Low Pivot
                    const prevPivot = this.pivots[0];
                    const ratio = prevPivot ? Math.abs(lastPivotPrice - prevPivot.price) / prevPivot.price : 0;
                    
                    this.pivots.unshift({
                        index: lastPivotIndex,
                        price: lastPivotPrice,
                        dir: 1,
                        level: this.level,
                        ratio: ratio
                    });
                    
                    direction = -1;
                    lastPivotPrice = l;
                    lastPivotIndex = i;
                    this.flags.newPivot = true;
                }
            } else if (direction === -1) {
                if (l < lastPivotPrice) {
                    lastPivotPrice = l;
                    lastPivotIndex = i;
                } else if (h > lastPivotPrice * (1 + this.length / 100)) {
                    // New High Pivot
                    const prevPivot = this.pivots[0];
                    const ratio = prevPivot ? Math.abs(lastPivotPrice - prevPivot.price) / prevPivot.price : 0;

                    this.pivots.unshift({
                        index: lastPivotIndex,
                        price: lastPivotPrice,
                        dir: -1,
                        level: this.level,
                        ratio: ratio
                    });

                    direction = 1;
                    lastPivotPrice = h;
                    lastPivotIndex = i;
                    this.flags.newPivot = true;
                }
            }
        }

        if (this.pivots.length > oldPivotCount && oldPivotCount > 0) {
            this.flags.doublePivot = (this.pivots.length - oldPivotCount) >= 2;
        }
    }
}

module.exports = ZigzagEngine;
