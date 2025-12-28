import { evaluatePatternLifecycle, type ClassicPattern } from "../src/lib/indicators/pattern-lifecycle";
import type { OHLCV } from "../src/lib/indicators/technical";
import type { RectanglePattern } from "../src/lib/indicators/missing-patterns";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function makeCandles(length: number, start = 100, step = 0.2): OHLCV[] {
  const out: OHLCV[] = [];
  for (let i = 0; i < length; i++) {
    const close = start + step * i;
    out.push({
      timestamp: i,
      open: close - 0.1,
      high: close + 0.2,
      low: close - 0.2,
      close,
      volume: 0,
    });
  }
  return out;
}

function rectPattern(overrides: Partial<RectanglePattern> = {}): RectanglePattern {
  return {
    type: "rectangle_continuation",
    topBoundary: 110,
    bottomBoundary: 100,
    touches: [
      { index: 5, price: 110, boundary: "top" },
      { index: 8, price: 100, boundary: "bottom" },
    ],
    breakoutDirection: "neutral",
    targetPrice: 120,
    confidence: 0.8,
    startIndex: 0,
    endIndex: 30,
    ...overrides,
  };
}

function runScenario(name: string, pattern: ClassicPattern, candles: OHLCV[]) {
  const evaluation = evaluatePatternLifecycle(pattern, candles);
  // eslint-disable-next-line no-console
  console.log(`${name}:`, evaluation.stage, {
    dir: evaluation.direction,
    trigger: evaluation.triggerIndex,
    confirm: evaluation.confirmIndex,
    hit: evaluation.targetHitIndex,
    invalid: evaluation.invalidationIndex,
    reasons: evaluation.reasons,
  });
  return evaluation;
}

// Scenario 1: neutral rectangle breaks up, confirms (RSI fallback), then hits target
{
  const candles = makeCandles(80, 100, 0.25);
  // Force a clean breakout at ~index 40 by lifting prices well above the top boundary.
  for (let i = 38; i < candles.length; i++) {
    candles[i].close += 8;
    candles[i].high += 8;
    candles[i].open += 8;
    candles[i].low += 8;
  }

  const pattern = rectPattern({ endIndex: 35, topBoundary: 112, bottomBoundary: 102, targetPrice: 122 });
  const ev = runScenario("break+confirm+hit", pattern, candles);
  assert(ev.stage === "hit_target" || ev.stage === "confirmed", "expected confirmed or hit_target");
}

// Scenario 2: confirm then invalidate (close back under breakout boundary with buffer)
{
  const candles = makeCandles(80, 100, 0.25);
  for (let i = 38; i < candles.length; i++) {
    candles[i].close += 8;
    candles[i].high += 8;
    candles[i].open += 8;
    candles[i].low += 8;
  }

  // After a few bars, dump below top boundary to invalidate.
  for (let i = 50; i < candles.length; i++) {
    candles[i].close = 105;
    candles[i].open = 105.1;
    candles[i].high = 105.3;
    candles[i].low = 104.9;
  }

  const pattern = rectPattern({ endIndex: 35, topBoundary: 112, bottomBoundary: 102, targetPrice: 122 });
  const ev = runScenario("break+confirm+invalidate", pattern, candles);
  assert(ev.stage === "invalidated" || ev.stage === "expired", "expected invalidated (or expired if too late)");
}

// Scenario 3: never breaks -> expired
{
  const candles = makeCandles(120, 100, 0.05);
  const pattern = rectPattern({ endIndex: 10, topBoundary: 110, bottomBoundary: 100, targetPrice: 120 });
  const ev = runScenario("no_break_expired", pattern, candles);
  assert(ev.stage === "expired" || ev.stage === "forming", "expected forming or expired depending on horizon");
}

// eslint-disable-next-line no-console
console.log("Pattern lifecycle smoke OK");
