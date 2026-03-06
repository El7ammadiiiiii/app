"""
📐 chart_patterns.py — Lightweight chart pattern detector for backend scanner

Design goals:
- Server-side only (no browser computation)
- Stable deterministic output for Firebase lifecycle tracking
- Detect core 2-line structures (triangle/channel/wedge-like)
- Provide anchored upper/lower lines that can be extended as new pivots appear
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple


@dataclass
class Line:
    x1: int
    y1: float
    x2: int
    y2: float
    slope: float
    intercept: float
    touches: int


@dataclass
class PatternCandidate:
    pattern_type: str
    pattern_name: str
    pattern_name_ar: str
    direction: str
    confidence: int
    start_idx: int
    end_idx: int
    upper: Line
    lower: Line


def _detect_pivots(candles: List[Dict], period: int = 3) -> Tuple[List[Tuple[int, float]], List[Tuple[int, float]]]:
    highs = [float(c["high"]) for c in candles]
    lows = [float(c["low"]) for c in candles]
    n = len(candles)

    piv_h: List[Tuple[int, float]] = []
    piv_l: List[Tuple[int, float]] = []

    for i in range(period, n - period):
        h = highs[i]
        l = lows[i]

        is_h = True
        is_l = True
        for j in range(1, period + 1):
            if highs[i - j] > h or highs[i + j] > h:
                is_h = False
            if lows[i - j] < l or lows[i + j] < l:
                is_l = False
            if not is_h and not is_l:
                break

        if is_h:
            piv_h.append((i, h))
        if is_l:
            piv_l.append((i, l))

    return piv_h, piv_l


def _count_violations(
    candles: List[Dict],
    slope: float,
    intercept: float,
    side: str,
    start_idx: int,
    end_idx: int,
) -> int:
    violations = 0
    for i in range(start_idx, end_idx + 1):
        close = float(candles[i]["close"])
        line_y = slope * i + intercept
        if side == "upper" and close > line_y:
            violations += 1
        elif side == "lower" and close < line_y:
            violations += 1
    return violations


def _choose_line(
    pivots: List[Tuple[int, float]],
    candles: List[Dict],
    side: str,
    start_idx: int,
    end_idx: int,
) -> Optional[Line]:
    if len(pivots) < 2:
        return None

    n = end_idx - start_idx + 1
    highs = [float(c["high"]) for c in candles]
    lows = [float(c["low"]) for c in candles]
    avg_range = max(1e-8, sum(h - l for h, l in zip(highs, lows)) / max(1, len(candles)))
    tol = avg_range * 0.35

    best: Optional[Line] = None
    best_score = -1e18

    for i in range(len(pivots) - 1):
        for j in range(i + 1, len(pivots)):
            x1, y1 = pivots[i]
            x2, y2 = pivots[j]
            if x2 <= x1:
                continue

            span = x2 - x1
            if span < max(8, n // 4):
                continue

            slope = (y2 - y1) / (x2 - x1)
            intercept = y1 - slope * x1

            violations = _count_violations(candles, slope, intercept, side, start_idx, end_idx)
            violation_pct = (violations / max(1, n)) * 100
            if violation_pct > 10.0:
                continue

            touches = 0
            for px, py in pivots:
                line_y = slope * px + intercept
                if abs(py - line_y) <= tol:
                    touches += 1

            if touches < 2:
                continue

            edge_penalty = abs(x1 - start_idx) + abs(x2 - end_idx)
            score = span * 3 + touches * 14 - violation_pct * 7 - edge_penalty * 1.8

            if score > best_score:
                best_score = score
                best = Line(
                    x1=x1,
                    y1=y1,
                    x2=x2,
                    y2=y2,
                    slope=slope,
                    intercept=intercept,
                    touches=touches,
                )

    return best


def _line_y(line: Line, x: int) -> float:
    return line.slope * x + line.intercept


def _classify(upper: Line, lower: Line) -> Tuple[str, str, str, str]:
    # Returns (pattern_type, name, name_ar, direction)
    u = upper.slope
    l = lower.slope

    # Horizontal threshold (small absolute slope)
    flat_thr = 0.00025
    upper_flat = abs(u) <= flat_thr
    lower_flat = abs(l) <= flat_thr

    if upper_flat and l > flat_thr:
        return ("descending_triangle", "Descending Triangle", "مثلث هابط", "bearish")

    if u < -flat_thr and l > flat_thr:
        return ("symmetrical_triangle", "Symmetrical Triangle", "مثلث متماثل", "neutral")

    if u > flat_thr and l > flat_thr:
        return ("ascending_channel", "Ascending Channel", "قناة صاعدة", "bullish")

    if u < -flat_thr and l < -flat_thr:
        return ("descending_channel", "Descending Channel", "قناة هابطة", "bearish")

    if u > flat_thr and l < -flat_thr:
        return ("ascending_broadening", "Ascending Broadening", "توسع صاعد", "bearish")

    return ("triangle", "Triangle", "مثلث", "neutral")


def detect_chart_pattern(
    candles: List[Dict],
    seed_min_bars: int = 30,
    seed_max_bars: int = 80,
) -> Optional[Dict]:
    """
    Detect a best pattern from candles using seed range 30..80 bars.

    Returns dict with structured lines and metadata, or None.
    """
    n = len(candles)
    if n < seed_min_bars:
        return None

    end_idx = n - 1
    best: Optional[PatternCandidate] = None

    # Seed search range (first detection window)
    for bars in range(min(seed_max_bars, n), seed_min_bars - 1, -1):
        start_idx = n - bars
        window = candles[start_idx : end_idx + 1]

        piv_h, piv_l = _detect_pivots(window, period=3)
        if len(piv_h) < 2 or len(piv_l) < 2:
            continue

        # Map local pivot index to global index
        piv_h_global = [(start_idx + i, p) for i, p in piv_h]
        piv_l_global = [(start_idx + i, p) for i, p in piv_l]

        upper = _choose_line(piv_h_global, candles, "upper", start_idx, end_idx)
        lower = _choose_line(piv_l_global, candles, "lower", start_idx, end_idx)
        if not upper or not lower:
            continue

        # Keep positive envelope at start/end
        gap_start = _line_y(upper, start_idx) - _line_y(lower, start_idx)
        gap_end = _line_y(upper, end_idx) - _line_y(lower, end_idx)
        if gap_start <= 0 or gap_end <= 0:
            continue

        # Require near-converging or structured channel envelope
        span = max(1, end_idx - start_idx)
        upper_len = upper.x2 - upper.x1
        lower_len = lower.x2 - lower.x1
        if abs(upper_len - lower_len) > 12:
            continue

        p_type, p_name, p_name_ar, direction = _classify(upper, lower)

        touches_score = min(1.0, (upper.touches + lower.touches) / 8.0)
        span_score = min(1.0, span / 80.0)
        convergence_score = 1.0 if gap_end <= gap_start else 0.5
        confidence = int(round((touches_score * 45) + (span_score * 35) + (convergence_score * 20)))

        candidate = PatternCandidate(
            pattern_type=p_type,
            pattern_name=p_name,
            pattern_name_ar=p_name_ar,
            direction=direction,
            confidence=confidence,
            start_idx=start_idx,
            end_idx=end_idx,
            upper=upper,
            lower=lower,
        )

        # Pick the strongest candidate and stop early on high quality
        if best is None or candidate.confidence > best.confidence:
            best = candidate
        if candidate.confidence >= 78:
            break

    if best is None:
        return None

    result = {
        "type": best.pattern_type,
        "name": best.pattern_name,
        "nameAr": best.pattern_name_ar,
        "direction": best.direction,
        "confidence": best.confidence,
        "startIdx": best.start_idx,
        "endIdx": best.end_idx,
        "upperLine": {
            "x1": best.upper.x1,
            "y1": round(best.upper.y1, 8),
            "x2": best.upper.x2,
            "y2": round(best.upper.y2, 8),
            "slope": round(best.upper.slope, 10),
            "touches": best.upper.touches,
        },
        "lowerLine": {
            "x1": best.lower.x1,
            "y1": round(best.lower.y1, 8),
            "x2": best.lower.x2,
            "y2": round(best.lower.y2, 8),
            "slope": round(best.lower.slope, 10),
            "touches": best.lower.touches,
        },
    }

    # Embed candle timestamps for line endpoints → frontend can align precisely
    for line_key in ("upperLine", "lowerLine"):
        ld = result[line_key]
        x1i, x2i = ld["x1"], ld["x2"]
        if 0 <= x1i < len(candles):
            ld["x1_ts"] = int(candles[x1i].get("timestamp", 0))
        if 0 <= x2i < len(candles):
            ld["x2_ts"] = int(candles[x2i].get("timestamp", 0))

    return result
