# ═══════════════════════════════════════════════════════════════
# NEXUS Technical Analysis - Chart Patterns Detection
# ═══════════════════════════════════════════════════════════════
# Detects bullish, bearish, and neutral chart patterns
# ═══════════════════════════════════════════════════════════════

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
from scipy.signal import argrelextrema
from scipy.stats import linregress


class PatternType(Enum):
    """Pattern classification"""
    BULLISH = "bullish"
    BEARISH = "bearish"
    NEUTRAL = "neutral"


class PatternStrength(Enum):
    """Pattern strength/reliability"""
    WEAK = "weak"
    MODERATE = "moderate"
    STRONG = "strong"


@dataclass
class PatternResult:
    """Result of pattern detection"""
    name: str
    pattern_type: PatternType
    strength: PatternStrength
    start_index: int
    end_index: int
    points: List[Dict]  # Key points forming the pattern
    target_price: Optional[float] = None
    stop_loss: Optional[float] = None
    probability: float = 0.0
    description: str = ""


# ═══════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════

def find_swing_highs(
    df: pd.DataFrame,
    order: int = 5
) -> List[int]:
    """Find swing high points (local maxima)"""
    highs = df['high'].values
    indices = argrelextrema(highs, np.greater_equal, order=order)[0]
    return list(indices)


def find_swing_lows(
    df: pd.DataFrame,
    order: int = 5
) -> List[int]:
    """Find swing low points (local minima)"""
    lows = df['low'].values
    indices = argrelextrema(lows, np.less_equal, order=order)[0]
    return list(indices)


def calculate_trendline(
    points: List[Tuple[int, float]]
) -> Tuple[float, float]:
    """Calculate trendline slope and intercept using linear regression"""
    if len(points) < 2:
        return 0, 0
    
    x = np.array([p[0] for p in points])
    y = np.array([p[1] for p in points])
    
    slope, intercept, _, _, _ = linregress(x, y)
    return slope, intercept


def get_line_value(slope: float, intercept: float, x: int) -> float:
    """Get y value on a line at point x"""
    return slope * x + intercept


def calculate_r2(points: List[Tuple[int, float]], slope: float, intercept: float) -> float:
    """Calculate R² (coefficient of determination) for trendline fit"""
    if len(points) < 2:
        return 0
    
    y_actual = np.array([p[1] for p in points])
    y_predicted = np.array([slope * p[0] + intercept for p in points])
    
    ss_res = np.sum((y_actual - y_predicted) ** 2)
    ss_tot = np.sum((y_actual - np.mean(y_actual)) ** 2)
    
    return 1 - (ss_res / ss_tot) if ss_tot > 0 else 0


@dataclass
class ZigzagPivot:
    """Zigzag pivot point"""
    index: int
    price: float
    direction: int  # 1 for up, -1 for down


def calculate_zigzag(df: pd.DataFrame, length: int = 5) -> List[ZigzagPivot]:
    """
    Calculate zigzag pivots based on Pine Script logic
    # Pine Script ref: zg.Zigzag.new and calculate methods
    """
    pivots = []
    if len(df) < length * 2:
        return pivots
    
    last_dir = 0
    last_pivot_idx = -1
    last_pivot_price = 0
    
    for i in range(length, len(df) - length):
        # Check for pivot high
        is_high = True
        for j in range(1, length + 1):
            if df['high'].iloc[i] <= df['high'].iloc[i - j] or df['high'].iloc[i] <= df['high'].iloc[i + j]:
                is_high = False
                break
        
        # Check for pivot low
        is_low = True
        for j in range(1, length + 1):
            if df['low'].iloc[i] >= df['low'].iloc[i - j] or df['low'].iloc[i] >= df['low'].iloc[i + j]:
                is_low = False
                break
        
        if is_high and last_dir != 1:
            if last_pivot_idx != -1:
                pivots.append(ZigzagPivot(last_pivot_idx, last_pivot_price, last_dir))
            last_dir = 1
            last_pivot_idx = i
            last_pivot_price = df['high'].iloc[i]
        elif is_low and last_dir != -1:
            if last_pivot_idx != -1:
                pivots.append(ZigzagPivot(last_pivot_idx, last_pivot_price, last_dir))
            last_dir = -1
            last_pivot_idx = i
            last_pivot_price = df['low'].iloc[i]
    
    # Add last pivot
    if last_pivot_idx != -1:
        pivots.append(ZigzagPivot(last_pivot_idx, last_pivot_price, last_dir))
    
    return pivots


def is_converging(
    slope1: float,
    slope2: float,
    tolerance: float = 0.001
) -> bool:
    """Check if two lines are converging"""
    # Lines converge if slopes have opposite signs or one is steeper
    return (slope1 > 0 and slope2 < 0) or (slope1 < 0 and slope2 > 0) or \
           (slope1 > 0 and slope2 > 0 and slope1 > slope2) or \
           (slope1 < 0 and slope2 < 0 and slope1 < slope2)


def is_diverging(slope1: float, slope2: float) -> bool:
    """Check if two lines are diverging (broadening)"""
    return not is_converging(slope1, slope2)


# ═══════════════════════════════════════════════════════════════
# BULLISH PATTERNS
# ═══════════════════════════════════════════════════════════════

def detect_ascending_channel(
    df: pd.DataFrame,
    min_touches: int = 3,
    lookback: int = 100
) -> List[PatternResult]:
    """
    Detect Ascending Channel pattern
    - Parallel upward sloping support and resistance lines
    - Bullish continuation pattern
    """
    patterns = []
    data = df.tail(lookback)
    
    swing_highs = find_swing_highs(data, order=5)
    swing_lows = find_swing_lows(data, order=5)
    
    if len(swing_highs) < min_touches or len(swing_lows) < min_touches:
        return patterns
    
    # Get high points
    high_points = [(i, data['high'].iloc[i]) for i in swing_highs[-min_touches:]]
    low_points = [(i, data['low'].iloc[i]) for i in swing_lows[-min_touches:]]
    
    # Calculate trendlines
    high_slope, high_intercept = calculate_trendline(high_points)
    low_slope, low_intercept = calculate_trendline(low_points)
    
    # Check for ascending parallel lines (both positive slopes, similar)
    slope_diff = abs(high_slope - low_slope)
    avg_slope = (high_slope + low_slope) / 2
    
    if high_slope > 0 and low_slope > 0 and slope_diff < abs(avg_slope) * 0.3:
        # Valid ascending channel
        channel_width = (get_line_value(high_slope, high_intercept, len(data)-1) - 
                        get_line_value(low_slope, low_intercept, len(data)-1))
        
        target = data['close'].iloc[-1] + channel_width
        stop_loss = get_line_value(low_slope, low_intercept, len(data)-1) * 0.99
        
        patterns.append(PatternResult(
            name="Ascending Channel",
            pattern_type=PatternType.BULLISH,
            strength=PatternStrength.MODERATE,
            start_index=min(swing_highs[-min_touches], swing_lows[-min_touches]),
            end_index=len(data) - 1,
            points=high_points + low_points,
            target_price=target,
            stop_loss=stop_loss,
            probability=0.65,
            description="Parallel upward sloping channel - bullish continuation"
        ))
    
    return patterns


def detect_ascending_triangle(
    df: pd.DataFrame,
    min_touches: int = 3,
    lookback: int = 100
) -> List[PatternResult]:
    """
    Detect Ascending Triangle pattern
    - Flat resistance line at top
    - Rising support line at bottom
    - Bullish breakout pattern
    """
    patterns = []
    data = df.tail(lookback)
    
    swing_highs = find_swing_highs(data, order=5)
    swing_lows = find_swing_lows(data, order=5)
    
    if len(swing_highs) < min_touches or len(swing_lows) < min_touches:
        return patterns
    
    # Get high and low points
    high_points = [(i, data['high'].iloc[i]) for i in swing_highs[-min_touches:]]
    low_points = [(i, data['low'].iloc[i]) for i in swing_lows[-min_touches:]]
    
    # Check for flat resistance
    high_values = [p[1] for p in high_points]
    high_std = np.std(high_values)
    high_mean = np.mean(high_values)
    
    # Check for rising support
    low_slope, low_intercept = calculate_trendline(low_points)
    
    # Valid if highs are flat (low std) and lows are ascending
    if high_std < high_mean * 0.02 and low_slope > 0:
        resistance = high_mean
        pattern_height = resistance - low_points[0][1]
        target = resistance + pattern_height
        stop_loss = get_line_value(low_slope, low_intercept, len(data)-1) * 0.98
        
        patterns.append(PatternResult(
            name="Ascending Triangle",
            pattern_type=PatternType.BULLISH,
            strength=PatternStrength.STRONG,
            start_index=min(swing_highs[-min_touches], swing_lows[-min_touches]),
            end_index=len(data) - 1,
            points=high_points + low_points,
            target_price=target,
            stop_loss=stop_loss,
            probability=0.75,
            description="Flat resistance with rising support - bullish breakout pattern"
        ))
    
    return patterns


def detect_bull_flag(
    df: pd.DataFrame,
    flag_length: int = 10,
    pole_min_gain: float = 0.05,
    lookback: int = 50
) -> List[PatternResult]:
    """
    Detect Bull Flag pattern
    - Strong upward move (pole)
    - Small consolidation channel sloping down (flag)
    """
    patterns = []
    data = df.tail(lookback)
    
    # Find pole (strong upward move)
    for i in range(flag_length + 10, len(data)):
        pole_start = i - flag_length - 10
        pole_end = i - flag_length
        
        pole_gain = (data['close'].iloc[pole_end] - data['close'].iloc[pole_start]) / data['close'].iloc[pole_start]
        
        if pole_gain >= pole_min_gain:
            # Check for flag (slight downward consolidation)
            flag_data = data.iloc[pole_end:i]
            flag_highs = [(j, flag_data['high'].iloc[j]) for j in range(len(flag_data))]
            flag_lows = [(j, flag_data['low'].iloc[j]) for j in range(len(flag_data))]
            
            if len(flag_highs) >= 3:
                high_slope, _ = calculate_trendline(flag_highs)
                low_slope, _ = calculate_trendline(flag_lows)
                
                # Flag should slope slightly downward
                if high_slope < 0 and low_slope < 0 and abs(high_slope) < 0.02:
                    pole_height = data['close'].iloc[pole_end] - data['close'].iloc[pole_start]
                    target = data['close'].iloc[-1] + pole_height
                    stop_loss = data['low'].iloc[pole_end:i].min() * 0.98
                    
                    patterns.append(PatternResult(
                        name="Bull Flag",
                        pattern_type=PatternType.BULLISH,
                        strength=PatternStrength.STRONG,
                        start_index=pole_start,
                        end_index=i - 1,
                        points=[
                            {'type': 'pole_start', 'index': pole_start, 'price': data['close'].iloc[pole_start]},
                            {'type': 'pole_end', 'index': pole_end, 'price': data['close'].iloc[pole_end]},
                            {'type': 'flag_end', 'index': i-1, 'price': data['close'].iloc[i-1]}
                        ],
                        target_price=target,
                        stop_loss=stop_loss,
                        probability=0.70,
                        description="Strong upward pole followed by downward sloping flag - bullish continuation"
                    ))
                    break  # Only find one pattern
    
    return patterns


def detect_bull_pennant(
    df: pd.DataFrame,
    pennant_length: int = 10,
    lookback: int = 50
) -> List[PatternResult]:
    """
    Detect Bull Pennant pattern based on Pine Script logic
    - Strong upward move (pole) using zigzag pivots
    - Converging triangle formation (pennant) with angle and width validation
    # Pine Script ref: lines 45-120 (zigzag), 200-300 (pattern detection)
    """
    patterns = []
    data = df.tail(lookback)
    
    # Calculate zigzag pivots - # Pine Script ref: zg.Zigzag.new and calculate
    zigzags = calculate_zigzag(data, 5)  # Use length 5 like Pine Script default
    if len(zigzags) < 5:
        return patterns  # Need at least 5 pivots for pattern
    
    # Find pole: strong upward move followed by convergence
    # # Pine Script ref: findPatternPlain logic
    for i in range(len(zigzags) - 4):
        pivot1 = zigzags[i]
        pivot2 = zigzags[i + 1]
        pivot3 = zigzags[i + 2]
        pivot4 = zigzags[i + 3]
        pivot5 = zigzags[i + 4]
        
        # Check for upward pole (pivot1 low to pivot2 high)
        if pivot1.direction == -1 and pivot2.direction == 1 and pivot2.price > pivot1.price:
            pole_height = pivot2.price - pivot1.price
            pole_length = pivot2.index - pivot1.index
            
            # Check if pole is strong enough - # Pine Script ref: retracement check
            if pole_height / pivot1.price < 0.05:
                continue  # Minimum 5% move
            
            # Pennant: pivots 3,4,5 should form converging triangle
            if pivot3.direction == -1 and pivot4.direction == 1 and pivot5.direction == -1:
                # Check convergence: lines from pivot2-pivot4 and pivot3-pivot5 should converge
                upper_points = [pivot2, pivot4]
                lower_points = [pivot3, pivot5]
                
                upper_slope, upper_intercept = calculate_trendline([(p.index, p.price) for p in upper_points])
                lower_slope, lower_intercept = calculate_trendline([(p.index, p.price) for p in lower_points])
                
                # Check angles - # Pine Script ref: f_angle() equivalent
                upper_angle = np.degrees(np.arctan(upper_slope))
                lower_angle = np.degrees(np.arctan(lower_slope))
                
                # For pennant, upper should be descending, lower ascending (converging)
                is_converging_angles = upper_angle < 0 and lower_angle > 0
                if not is_converging_angles:
                    continue
                
                # Check width convergence - # Pine Script ref: convergenceRatio
                start_width = abs(get_line_value(upper_slope, upper_intercept, upper_points[0][0]) - 
                                 get_line_value(lower_slope, lower_intercept, upper_points[0][0]))
                end_width = abs(get_line_value(upper_slope, upper_intercept, upper_points[1][0]) - 
                               get_line_value(lower_slope, lower_intercept, upper_points[1][0]))
                convergence_ratio = end_width / start_width if start_width > 0 else 1
                if convergence_ratio >= 0.5:
                    continue  # Must converge to <50% width
                
                # Check retracement - # Pine Script ref: maxRetracement
                breakout_level = pivot5.price
                retracement = abs(breakout_level - pivot1.price) / pole_height
                if retracement > 0.5:
                    continue  # Max 50% retracement
                
                # Volume analysis - # Pine Script ref: volume decline in consolidation
                pole_start = pivot1.index
                pole_end = pivot2.index
                pennant_end = pivot5.index
                pole_volume = data['volume'].iloc[pole_start:pole_end].mean()
                pennant_volume = data['volume'].iloc[pole_end:pennant_end].mean()
                volume_decline = pennant_volume < pole_volume * 0.95  # 5% decline like Pine Script
                
                # R² validation - # Pine Script ref: errorRatio (approximated)
                # Calculate R² for trendlines
                upper_r2 = calculate_r2(upper_points, upper_slope, upper_intercept)
                lower_r2 = calculate_r2(lower_points, lower_slope, lower_intercept)
                high_precision_fit = upper_r2 >= 0.8 and lower_r2 >= 0.8
                if not high_precision_fit:
                    continue
                
                combined_r2 = (upper_r2 + lower_r2) / 2
                confidence = combined_r2 * 100 * (1.05 if volume_decline else 0.95)
                
                patterns.append(PatternResult(
                    name="Bull Pennant",
                    pattern_type=PatternType.BULLISH,
                    strength=PatternStrength.STRONG,
                    start_index=pole_start,
                    end_index=pennant_end,
                    points=[{"index": p.index, "price": p.price, "type": "high" if p.direction == 1 else "low"} for p in [pivot1, pivot2, pivot3, pivot4, pivot5]],
                    target_price=breakout_level + pole_height,
                    stop_loss=pivot1.price * 0.98,
                    probability=min(0.95, confidence / 100),
                    description=f"Bull Pennant - R² = {combined_r2:.4f} | Volume: {'✓' if volume_decline else '✗'} | Convergence: {convergence_ratio:.1%}"
                ))
                break  # Only find one pattern
    
    return patterns


def detect_falling_wedge(
    df: pd.DataFrame,
    min_length: int = 10,
    lookback: int = 100,
    is_reversal: bool = True
) -> List[PatternResult]:
    """
    Detect Falling Wedge pattern
    - Both lines sloping downward but converging
    - Bullish reversal or continuation pattern
    """
    patterns = []
    data = df.tail(lookback)
    
    swing_highs = find_swing_highs(data, order=5)
    swing_lows = find_swing_lows(data, order=5)
    
    if len(swing_highs) < 3 or len(swing_lows) < 3:
        return patterns
    
    high_points = [(i, data['high'].iloc[i]) for i in swing_highs[-4:]]
    low_points = [(i, data['low'].iloc[i]) for i in swing_lows[-4:]]
    
    high_slope, high_intercept = calculate_trendline(high_points)
    low_slope, low_intercept = calculate_trendline(low_points)
    
    # Both slopes negative but converging (resistance falling faster than support)
    if high_slope < 0 and low_slope < 0 and high_slope < low_slope:
        wedge_height = high_points[0][1] - low_points[0][1]
        target = data['close'].iloc[-1] + wedge_height
        stop_loss = low_points[-1][1] * 0.98
        
        pattern_name = "Reversal Falling Wedge" if is_reversal else "Continuation Falling Wedge"
        
        patterns.append(PatternResult(
            name=pattern_name,
            pattern_type=PatternType.BULLISH,
            strength=PatternStrength.MODERATE,
            start_index=min(swing_highs[0], swing_lows[0]),
            end_index=len(data) - 1,
            points=high_points + low_points,
            target_price=target,
            stop_loss=stop_loss,
            probability=0.68,
            description=f"Converging downward wedge - bullish {'reversal' if is_reversal else 'continuation'}"
        ))
    
    return patterns


def detect_descending_broadening_wedge(
    df: pd.DataFrame,
    lookback: int = 100
) -> List[PatternResult]:
    """
    Detect Descending Broadening Wedge pattern
    - Expanding pattern with both lines sloping downward
    - Bullish reversal pattern
    """
    patterns = []
    data = df.tail(lookback)
    
    swing_highs = find_swing_highs(data, order=5)
    swing_lows = find_swing_lows(data, order=5)
    
    if len(swing_highs) < 3 or len(swing_lows) < 3:
        return patterns
    
    high_points = [(i, data['high'].iloc[i]) for i in swing_highs[-4:]]
    low_points = [(i, data['low'].iloc[i]) for i in swing_lows[-4:]]
    
    high_slope, _ = calculate_trendline(high_points)
    low_slope, _ = calculate_trendline(low_points)
    
    # Both slopes negative but diverging (support falling faster than resistance)
    if high_slope < 0 and low_slope < 0 and low_slope < high_slope:
        pattern_height = high_points[-1][1] - low_points[-1][1]
        target = data['close'].iloc[-1] + pattern_height
        stop_loss = low_points[-1][1] * 0.97
        
        patterns.append(PatternResult(
            name="Descending Broadening Wedge",
            pattern_type=PatternType.BULLISH,
            strength=PatternStrength.MODERATE,
            start_index=min(swing_highs[0], swing_lows[0]),
            end_index=len(data) - 1,
            points=high_points + low_points,
            target_price=target,
            stop_loss=stop_loss,
            probability=0.62,
            description="Expanding downward wedge - bullish reversal"
        ))
    
    return patterns


# ═══════════════════════════════════════════════════════════════
# BEARISH PATTERNS
# ═══════════════════════════════════════════════════════════════

def detect_descending_channel(
    df: pd.DataFrame,
    min_touches: int = 3,
    lookback: int = 100
) -> List[PatternResult]:
    """
    Detect Descending Channel pattern
    - Parallel downward sloping support and resistance lines
    - Bearish continuation pattern
    """
    patterns = []
    data = df.tail(lookback)
    
    swing_highs = find_swing_highs(data, order=5)
    swing_lows = find_swing_lows(data, order=5)
    
    if len(swing_highs) < min_touches or len(swing_lows) < min_touches:
        return patterns
    
    high_points = [(i, data['high'].iloc[i]) for i in swing_highs[-min_touches:]]
    low_points = [(i, data['low'].iloc[i]) for i in swing_lows[-min_touches:]]
    
    high_slope, high_intercept = calculate_trendline(high_points)
    low_slope, low_intercept = calculate_trendline(low_points)
    
    slope_diff = abs(high_slope - low_slope)
    avg_slope = (high_slope + low_slope) / 2
    
    if high_slope < 0 and low_slope < 0 and slope_diff < abs(avg_slope) * 0.3:
        channel_width = (get_line_value(high_slope, high_intercept, len(data)-1) - 
                        get_line_value(low_slope, low_intercept, len(data)-1))
        
        target = data['close'].iloc[-1] - channel_width
        stop_loss = get_line_value(high_slope, high_intercept, len(data)-1) * 1.01
        
        patterns.append(PatternResult(
            name="Descending Channel",
            pattern_type=PatternType.BEARISH,
            strength=PatternStrength.MODERATE,
            start_index=min(swing_highs[-min_touches], swing_lows[-min_touches]),
            end_index=len(data) - 1,
            points=high_points + low_points,
            target_price=target,
            stop_loss=stop_loss,
            probability=0.65,
            description="Parallel downward sloping channel - bearish continuation"
        ))
    
    return patterns


def detect_descending_triangle(
    df: pd.DataFrame,
    min_touches: int = 3,
    lookback: int = 100
) -> List[PatternResult]:
    """
    Detect Descending Triangle pattern
    - Flat support line at bottom
    - Falling resistance line at top
    - Bearish breakdown pattern
    """
    patterns = []
    data = df.tail(lookback)
    
    swing_highs = find_swing_highs(data, order=5)
    swing_lows = find_swing_lows(data, order=5)
    
    if len(swing_highs) < min_touches or len(swing_lows) < min_touches:
        return patterns
    
    high_points = [(i, data['high'].iloc[i]) for i in swing_highs[-min_touches:]]
    low_points = [(i, data['low'].iloc[i]) for i in swing_lows[-min_touches:]]
    
    # Check for flat support
    low_values = [p[1] for p in low_points]
    low_std = np.std(low_values)
    low_mean = np.mean(low_values)
    
    # Check for falling resistance
    high_slope, _ = calculate_trendline(high_points)
    
    if low_std < low_mean * 0.02 and high_slope < 0:
        support = low_mean
        pattern_height = high_points[0][1] - support
        target = support - pattern_height
        stop_loss = high_points[-1][1] * 1.02
        
        patterns.append(PatternResult(
            name="Descending Triangle",
            pattern_type=PatternType.BEARISH,
            strength=PatternStrength.STRONG,
            start_index=min(swing_highs[-min_touches], swing_lows[-min_touches]),
            end_index=len(data) - 1,
            points=high_points + low_points,
            target_price=target,
            stop_loss=stop_loss,
            probability=0.73,
            description="Flat support with falling resistance - bearish breakdown pattern"
        ))
    
    return patterns


def detect_bear_flag(
    df: pd.DataFrame,
    flag_length: int = 10,
    pole_min_loss: float = 0.05,
    lookback: int = 50
) -> List[PatternResult]:
    """
    Detect Bear Flag pattern
    - Strong downward move (pole)
    - Small consolidation channel sloping up (flag)
    """
    patterns = []
    data = df.tail(lookback)
    
    for i in range(flag_length + 10, len(data)):
        pole_start = i - flag_length - 10
        pole_end = i - flag_length
        
        pole_loss = (data['close'].iloc[pole_start] - data['close'].iloc[pole_end]) / data['close'].iloc[pole_start]
        
        if pole_loss >= pole_min_loss:
            flag_data = data.iloc[pole_end:i]
            flag_highs = [(j, flag_data['high'].iloc[j]) for j in range(len(flag_data))]
            flag_lows = [(j, flag_data['low'].iloc[j]) for j in range(len(flag_data))]
            
            if len(flag_highs) >= 3:
                high_slope, _ = calculate_trendline(flag_highs)
                low_slope, _ = calculate_trendline(flag_lows)
                
                if high_slope > 0 and low_slope > 0 and abs(high_slope) < 0.02:
                    pole_height = data['close'].iloc[pole_start] - data['close'].iloc[pole_end]
                    target = data['close'].iloc[-1] - pole_height
                    stop_loss = data['high'].iloc[pole_end:i].max() * 1.02
                    
                    patterns.append(PatternResult(
                        name="Bear Flag",
                        pattern_type=PatternType.BEARISH,
                        strength=PatternStrength.STRONG,
                        start_index=pole_start,
                        end_index=i - 1,
                        points=[
                            {'type': 'pole_start', 'index': pole_start, 'price': data['close'].iloc[pole_start]},
                            {'type': 'pole_end', 'index': pole_end, 'price': data['close'].iloc[pole_end]},
                            {'type': 'flag_end', 'index': i-1, 'price': data['close'].iloc[i-1]}
                        ],
                        target_price=target,
                        stop_loss=stop_loss,
                        probability=0.70,
                        description="Strong downward pole followed by upward sloping flag - bearish continuation"
                    ))
                    break
    
    return patterns


def detect_bear_pennant(
    df: pd.DataFrame,
    pennant_length: int = 10,
    lookback: int = 50
) -> List[PatternResult]:
    """
    Detect Bear Pennant pattern based on Pine Script logic
    - Strong downward move (pole) using zigzag pivots
    - Converging triangle formation (pennant) with angle and width validation
    # Pine Script ref: lines 45-120 (zigzag), 200-300 (pattern detection)
    """
    patterns = []
    data = df.tail(lookback)
    
    # Calculate zigzag pivots - # Pine Script ref: zg.Zigzag.new and calculate
    zigzags = calculate_zigzag(data, 5)  # Use length 5 like Pine Script default
    if len(zigzags) < 5:
        return patterns  # Need at least 5 pivots for pattern
    
    # Find pole: strong downward move followed by convergence
    # # Pine Script ref: findPatternPlain logic
    for i in range(len(zigzags) - 4):
        pivot1 = zigzags[i]
        pivot2 = zigzags[i + 1]
        pivot3 = zigzags[i + 2]
        pivot4 = zigzags[i + 3]
        pivot5 = zigzags[i + 4]
        
        # Check for downward pole (pivot1 high to pivot2 low)
        if pivot1.direction == 1 and pivot2.direction == -1 and pivot2.price < pivot1.price:
            pole_height = pivot1.price - pivot2.price
            pole_length = pivot2.index - pivot1.index
            
            # Check if pole is strong enough - # Pine Script ref: retracement check
            if pole_height / pivot1.price < 0.05:
                continue  # Minimum 5% move
            
            # Pennant: pivots 3,4,5 should form converging triangle
            if pivot3.direction == 1 and pivot4.direction == -1 and pivot5.direction == 1:
                # Check convergence: lines from pivot3-pivot5 (upper) and pivot2-pivot4 (lower)
                upper_points = [pivot3, pivot5]  # Upper trendline from highs
                lower_points = [pivot2, pivot4]  # Lower trendline from lows
                
                upper_slope, upper_intercept = calculate_trendline([(p.index, p.price) for p in upper_points])
                lower_slope, lower_intercept = calculate_trendline([(p.index, p.price) for p in lower_points])
                
                # Check angles - # Pine Script ref: f_angle() equivalent
                upper_angle = np.degrees(np.arctan(upper_slope))
                lower_angle = np.degrees(np.arctan(lower_slope))
                
                # For bear pennant, upper should be descending, lower ascending (converging)
                is_converging_angles = upper_angle < 0 and lower_angle > 0
                if not is_converging_angles:
                    continue
                
                # Check width convergence - # Pine Script ref: convergenceRatio
                start_width = abs(get_line_value(upper_slope, upper_intercept, upper_points[0][0]) - 
                                 get_line_value(lower_slope, lower_intercept, upper_points[0][0]))
                end_width = abs(get_line_value(upper_slope, upper_intercept, upper_points[1][0]) - 
                               get_line_value(lower_slope, lower_intercept, upper_points[1][0]))
                convergence_ratio = end_width / start_width if start_width > 0 else 1
                if convergence_ratio >= 0.5:
                    continue  # Must converge to <50% width
                
                # Check retracement - # Pine Script ref: maxRetracement
                breakout_level = pivot5.price
                retracement = abs(pivot1.price - breakout_level) / pole_height
                if retracement > 0.5:
                    continue  # Max 50% retracement
                
                # Volume analysis - # Pine Script ref: volume decline in consolidation
                pole_start = pivot1.index
                pole_end = pivot2.index
                pennant_end = pivot5.index
                pole_volume = data['volume'].iloc[pole_start:pole_end].mean()
                pennant_volume = data['volume'].iloc[pole_end:pennant_end].mean()
                volume_decline = pennant_volume < pole_volume * 0.95  # 5% decline like Pine Script
                
                # R² validation - # Pine Script ref: errorRatio (approximated)
                upper_r2 = calculate_r2(upper_points, upper_slope, upper_intercept)
                lower_r2 = calculate_r2(lower_points, lower_slope, lower_intercept)
                high_precision_fit = upper_r2 >= 0.8 and lower_r2 >= 0.8
                if not high_precision_fit:
                    continue
                
                combined_r2 = (upper_r2 + lower_r2) / 2
                confidence = combined_r2 * 100 * (1.05 if volume_decline else 0.95)
                
                patterns.append(PatternResult(
                    name="Bear Pennant",
                    pattern_type=PatternType.BEARISH,
                    strength=PatternStrength.STRONG,
                    start_index=pole_start,
                    end_index=pennant_end,
                    points=[{"index": p.index, "price": p.price, "type": "high" if p.direction == 1 else "low"} for p in [pivot1, pivot2, pivot3, pivot4, pivot5]],
                    target_price=breakout_level - pole_height,
                    stop_loss=pivot1.price * 1.02,
                    probability=min(0.95, confidence / 100),
                    description=f"Bear Pennant - R² = {combined_r2:.4f} | Volume: {'✓' if volume_decline else '✗'} | Convergence: {convergence_ratio:.1%}"
                ))
                break  # Only find one pattern
    
    return patterns


def detect_rising_wedge(
    df: pd.DataFrame,
    min_length: int = 10,
    lookback: int = 100,
    is_reversal: bool = True
) -> List[PatternResult]:
    """
    Detect Rising Wedge pattern
    - Both lines sloping upward but converging
    - Bearish reversal or continuation pattern
    """
    patterns = []
    data = df.tail(lookback)
    
    swing_highs = find_swing_highs(data, order=5)
    swing_lows = find_swing_lows(data, order=5)
    
    if len(swing_highs) < 3 or len(swing_lows) < 3:
        return patterns
    
    high_points = [(i, data['high'].iloc[i]) for i in swing_highs[-4:]]
    low_points = [(i, data['low'].iloc[i]) for i in swing_lows[-4:]]
    
    high_slope, _ = calculate_trendline(high_points)
    low_slope, _ = calculate_trendline(low_points)
    
    # Both slopes positive but converging (support rising faster than resistance)
    if high_slope > 0 and low_slope > 0 and low_slope > high_slope:
        wedge_height = high_points[-1][1] - low_points[-1][1]
        target = data['close'].iloc[-1] - wedge_height
        stop_loss = high_points[-1][1] * 1.02
        
        pattern_name = "Reversal Rising Wedge" if is_reversal else "Continuation Rising Wedge"
        
        patterns.append(PatternResult(
            name=pattern_name,
            pattern_type=PatternType.BEARISH,
            strength=PatternStrength.MODERATE,
            start_index=min(swing_highs[0], swing_lows[0]),
            end_index=len(data) - 1,
            points=high_points + low_points,
            target_price=target,
            stop_loss=stop_loss,
            probability=0.68,
            description=f"Converging upward wedge - bearish {'reversal' if is_reversal else 'continuation'}"
        ))
    
    return patterns


def detect_ascending_broadening_wedge(
    df: pd.DataFrame,
    lookback: int = 100
) -> List[PatternResult]:
    """
    Detect Ascending Broadening Wedge pattern
    - Expanding pattern with both lines sloping upward
    - Bearish reversal pattern
    """
    patterns = []
    data = df.tail(lookback)
    
    swing_highs = find_swing_highs(data, order=5)
    swing_lows = find_swing_lows(data, order=5)
    
    if len(swing_highs) < 3 or len(swing_lows) < 3:
        return patterns
    
    high_points = [(i, data['high'].iloc[i]) for i in swing_highs[-4:]]
    low_points = [(i, data['low'].iloc[i]) for i in swing_lows[-4:]]
    
    high_slope, _ = calculate_trendline(high_points)
    low_slope, _ = calculate_trendline(low_points)
    
    # Both slopes positive but diverging (resistance rising faster than support)
    if high_slope > 0 and low_slope > 0 and high_slope > low_slope:
        pattern_height = high_points[-1][1] - low_points[-1][1]
        target = data['close'].iloc[-1] - pattern_height
        stop_loss = high_points[-1][1] * 1.03
        
        patterns.append(PatternResult(
            name="Ascending Broadening Wedge",
            pattern_type=PatternType.BEARISH,
            strength=PatternStrength.MODERATE,
            start_index=min(swing_highs[0], swing_lows[0]),
            end_index=len(data) - 1,
            points=high_points + low_points,
            target_price=target,
            stop_loss=stop_loss,
            probability=0.62,
            description="Expanding upward wedge - bearish reversal"
        ))
    
    return patterns


# ═══════════════════════════════════════════════════════════════
# NEUTRAL PATTERNS
# ═══════════════════════════════════════════════════════════════

def detect_symmetrical_triangle(
    df: pd.DataFrame,
    min_touches: int = 3,
    lookback: int = 100
) -> List[PatternResult]:
    """
    Detect Symmetrical Triangle pattern
    - Converging trendlines with opposite slopes
    - Neutral pattern - breakout direction determines bias
    """
    patterns = []
    data = df.tail(lookback)
    
    swing_highs = find_swing_highs(data, order=5)
    swing_lows = find_swing_lows(data, order=5)
    
    if len(swing_highs) < min_touches or len(swing_lows) < min_touches:
        return patterns
    
    high_points = [(i, data['high'].iloc[i]) for i in swing_highs[-min_touches:]]
    low_points = [(i, data['low'].iloc[i]) for i in swing_lows[-min_touches:]]
    
    high_slope, high_intercept = calculate_trendline(high_points)
    low_slope, low_intercept = calculate_trendline(low_points)
    
    # Symmetrical: negative high slope, positive low slope, similar magnitudes
    if high_slope < 0 and low_slope > 0 and abs(abs(high_slope) - abs(low_slope)) < 0.005:
        pattern_height = high_points[0][1] - low_points[0][1]
        target_up = data['close'].iloc[-1] + pattern_height
        target_down = data['close'].iloc[-1] - pattern_height
        
        patterns.append(PatternResult(
            name="Symmetrical Triangle",
            pattern_type=PatternType.NEUTRAL,
            strength=PatternStrength.MODERATE,
            start_index=min(swing_highs[0], swing_lows[0]),
            end_index=len(data) - 1,
            points=high_points + low_points,
            target_price=target_up,  # Primary target
            stop_loss=low_points[-1][1],
            probability=0.50,  # 50/50 breakout direction
            description="Converging triangle - wait for breakout direction"
        ))
    
    return patterns


# ═══════════════════════════════════════════════════════════════
# COMPREHENSIVE PATTERN DETECTION
# ═══════════════════════════════════════════════════════════════

def detect_all_patterns(
    df: pd.DataFrame,
    config: Dict[str, bool] = None
) -> Dict[str, List[PatternResult]]:
    """
    Detect all enabled patterns
    
    Parameters:
    -----------
    df : DataFrame with OHLCV data
    config : Dictionary of pattern names and enabled status
    """
    results = {
        'bullish': [],
        'bearish': [],
        'neutral': []
    }
    
    # Default: detect all
    if config is None:
        config = {
            'ascending_channel': True,
            'ascending_triangle': True,
            'bull_flag': True,
            'bull_pennant': True,
            'continuation_falling_wedge': True,
            'descending_broadening_wedge': True,
            'reversal_falling_wedge': True,
            'ascending_broadening_wedge': True,
            'bear_flag': True,
            'bear_pennant': True,
            'continuation_rising_wedge': True,
            'descending_channel': True,
            'descending_triangle': True,
            'reversal_rising_wedge': True,
            'symmetrical_triangle': True
        }
    
    # Bullish patterns
    if config.get('ascending_channel'):
        results['bullish'].extend(detect_ascending_channel(df))
    
    if config.get('ascending_triangle'):
        results['bullish'].extend(detect_ascending_triangle(df))
    
    if config.get('bull_flag'):
        results['bullish'].extend(detect_bull_flag(df))
    
    if config.get('bull_pennant'):
        results['bullish'].extend(detect_bull_pennant(df))
    
    if config.get('continuation_falling_wedge'):
        results['bullish'].extend(detect_falling_wedge(df, is_reversal=False))
    
    if config.get('descending_broadening_wedge'):
        results['bullish'].extend(detect_descending_broadening_wedge(df))
    
    if config.get('reversal_falling_wedge'):
        results['bullish'].extend(detect_falling_wedge(df, is_reversal=True))
    
    # Bearish patterns
    if config.get('ascending_broadening_wedge'):
        results['bearish'].extend(detect_ascending_broadening_wedge(df))
    
    if config.get('bear_flag'):
        results['bearish'].extend(detect_bear_flag(df))
    
    if config.get('bear_pennant'):
        results['bearish'].extend(detect_bear_pennant(df))
    
    if config.get('continuation_rising_wedge'):
        results['bearish'].extend(detect_rising_wedge(df, is_reversal=False))
    
    if config.get('descending_channel'):
        results['bearish'].extend(detect_descending_channel(df))
    
    if config.get('descending_triangle'):
        results['bearish'].extend(detect_descending_triangle(df))
    
    if config.get('reversal_rising_wedge'):
        results['bearish'].extend(detect_rising_wedge(df, is_reversal=True))
    
    # Neutral patterns
    if config.get('symmetrical_triangle'):
        results['neutral'].extend(detect_symmetrical_triangle(df))
    
    return results


def patterns_to_json(results: Dict[str, List[PatternResult]]) -> Dict:
    """Convert pattern results to JSON-serializable format"""
    output = {}
    
    for category, patterns in results.items():
        output[category] = []
        for pattern in patterns:
            output[category].append({
                'name': pattern.name,
                'type': pattern.pattern_type.value,
                'strength': pattern.strength.value,
                'start_index': pattern.start_index,
                'end_index': pattern.end_index,
                'points': pattern.points,
                'target_price': pattern.target_price,
                'stop_loss': pattern.stop_loss,
                'probability': pattern.probability,
                'description': pattern.description
            })
    
    return output
