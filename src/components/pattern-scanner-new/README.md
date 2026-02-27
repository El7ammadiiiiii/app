# Auto Chart Patterns, Flags & Pennants [Trendoscope®] - JavaScript Implementation

This project is a 1:1 JavaScript reconstruction of the Trendoscope® Auto Chart Patterns, Flags & Pennants, and Wedge/Flag Finder indicators from Pine Script.

## Project Structure

- `zigzag_engine.js`: Multi-level ZigZag engine for pivot detection.
- `scanner.js`: Main scanning logic that coordinates ZigZag levels and pattern detection.
- `patterns/`: Individual pattern detection modules.
  - `pennants/`: Bullish and Bearish pennants (Pole + Symmetrical Wedge).
  - `flags/`: Bullish and Bearish flags (Pole + Consolidation).
  - `triangles/`: Ascending, Descending, and Symmetrical triangles.
  - `wedges/`: Falling and Rising wedges.
  - `channels/`: Ascending, Descending, and Ranging channels.
- `drawing/lightweight_charts_adapter.js`: Adapter for rendering patterns on TradingView Lightweight Charts.
- `tests/`: Unit tests and mock data scanning.

## Mapping from Pine Script (Pennants)

| Pine Script Concept | JavaScript Implementation | Logic Reference |
|---------------------|---------------------------|-----------------|
| `f_angle(a, b, loopback)` | `utils.calculateAngle()` | Angle calculation using ATR |
| `flagRatio < 0.618` | `pennant_bull.js` / `pennant_bear.js` | Retracement validation |
| `isType1Wedge` / `isType2Wedge` | `pennant_bull.js` | Symmetrical contraction logic |
| `if(h < math.min(...) or l > math.max(...))` | `pennant_bull.js` | Price within bounds check |
| `wedgeSize` (5 or 6) | `config.numberOfPivots` | Pivot count requirement |
| `avoidOverlap` | `Scanner.checkForOverlap()` | Overlap prevention |

## Configuration

The scanner can be configured with the following parameters:

- `numberOfPivots`: Number of pivots used for identification (default: 5).
- `errorRatio`: Error threshold for trend line validation (default: 20.0).
- `flatRatio`: Threshold to identify the slope of trend lines (default: 0.2).
- `flagRatio`: Maximum retracement of the flag/pennant relative to the pole (default: 0.618).
- `applyAngleDiff`: Enable angle difference validation for pennants.
- `minAngleDiff` / `maxAngleDiff`: Range for angle between trend lines.
- `zigzags`: Array of 4 zigzag configurations (length and depth).

## How to Run Tests

```bash
node tests/pattern_test.js
```

## Integration with Lightweight Charts

```javascript
const Scanner = require('./scanner');
const LightweightChartsAdapter = require('./drawing/lightweight_charts_adapter');

const scanner = new Scanner(config);
const adapter = new LightweightChartsAdapter(chart, mainSeries);

// On new data
const result = scanner.scan(ohlcData);
result.patterns.forEach(p => adapter.drawPattern(p));
result.flags.forEach(f => adapter.drawPattern(f));
result.pennants.forEach(pn => adapter.drawPattern(pn));
