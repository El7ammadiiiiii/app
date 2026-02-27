/**
 * Lightweight Charts Adapter - Extended for Flags and Pennants
 * Provides methods to draw patterns, zigzags, and labels on TradingView Lightweight Charts.
 */

class LightweightChartsAdapter {
    constructor(chart, series) {
        this.chart = chart;
        this.series = series;
        this.drawings = [];
    }

    /**
     * Draw a detected pattern (Standard or Flag)
     * @param {Object} pattern - Detected pattern object
     */
    drawPattern(pattern) {
        const { pivots, name, direction, pole } = pattern;
        const color = direction === 'bullish' ? '#22c55e' : direction === 'bearish' ? '#ef4444' : '#3b82f6';

        // 1. Draw Pole if it exists (for Flags)
        if (pole) {
            this.drawLine(pole.start, pole.end, color, 3); // Thicker line for pole
        }

        // 2. Draw trend lines (connecting highs and connecting lows)
        // For flags, pivots[1-5] form the flag
        const flagPivots = pole ? pivots.slice(1) : pivots;
        const highs = flagPivots.filter(p => p.dir === 1);
        const lows = flagPivots.filter(p => p.dir === -1);

        if (highs.length >= 2) {
            this.drawLine(highs[0], highs[highs.length - 1], color);
        }
        if (lows.length >= 2) {
            this.drawLine(lows[0], lows[lows.length - 1], color);
        }

        // 3. Add label
        this.addLabel(pivots[0], name, color);
    }

    /**
     * Draw a line between two pivots
     */
    drawLine(p1, p2, color, width = 2) {
        // Implementation note: In a real browser environment, this would create a new 
        // LineSeries or use a plugin to draw on the canvas.
        console.log(`[Drawing] ${width > 2 ? 'POLE' : 'LINE'} from (${p1.index}, ${p1.price}) to (${p2.index}, ${p2.price}) color: ${color}`);
    }

    /**
     * Add a label to a pivot
     */
    addLabel(pivot, text, color) {
        const marker = {
            time: pivot.index,
            position: pivot.dir === 1 ? 'aboveBar' : 'belowBar',
            color: color,
            shape: pivot.dir === 1 ? 'arrowDown' : 'arrowUp',
            text: text,
        };
        
        const currentMarkers = this.series.markers() || [];
        this.series.setMarkers([...currentMarkers, marker]);
    }

    /**
     * Draw zigzag lines
     */
    drawZigzag(pivots, color = '#3b82f6') {
        for (let i = 1; i < pivots.length; i++) {
            this.drawLine(pivots[i-1], pivots[i], color, 1);
        }
    }

    clear() {
        this.series.setMarkers([]);
        this.drawings = [];
    }
}

module.exports = LightweightChartsAdapter;
