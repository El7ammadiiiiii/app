# ═══════════════════════════════════════════════════════════════
# NEXUS Technical Analysis - Trendlines & Support/Resistance
# ═══════════════════════════════════════════════════════════════
# Advanced trendline detection, S/R levels, and Fibonacci
# ═══════════════════════════════════════════════════════════════

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from scipy.signal import argrelextrema
from scipy.stats import linregress
from scipy.cluster.hierarchy import fclusterdata


@dataclass
class TrendLine:
    """Represents a trendline"""
    start_point: Tuple[int, float]  # (index, price)
    end_point: Tuple[int, float]
    slope: float
    intercept: float
    touches: int
    strength: float  # 0-1 based on touches and accuracy
    line_type: str  # 'support', 'resistance', 'trend'
    is_valid: bool = True


@dataclass
class HorizontalLevel:
    """Represents a horizontal support/resistance level"""
    price: float
    touches: int
    strength: float
    level_type: str  # 'support', 'resistance', 'pivot'
    volume_at_level: float = 0


@dataclass
class FibonacciLevels:
    """Fibonacci retracement levels"""
    swing_high: float
    swing_low: float
    direction: str  # 'up' or 'down'
    levels: Dict[float, float]  # ratio: price


# ═══════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════

def find_pivots(
    df: pd.DataFrame,
    order: int = 5,
    k: int = 2
) -> Tuple[List[int], List[int]]:
    """
    Find pivot highs and lows
    
    Parameters:
    -----------
    df : DataFrame with OHLCV data
    order : Number of bars on each side for comparison
    k : Minimum number of pivots to consider
    """
    highs = df['high'].values
    lows = df['low'].values
    
    pivot_highs = argrelextrema(highs, np.greater_equal, order=order)[0]
    pivot_lows = argrelextrema(lows, np.less_equal, order=order)[0]
    
    return list(pivot_highs), list(pivot_lows)


def cluster_levels(
    levels: List[float],
    tolerance: float = 0.02
) -> List[float]:
    """
    Cluster nearby price levels together
    
    Parameters:
    -----------
    levels : List of price levels
    tolerance : Percentage tolerance for clustering
    """
    if len(levels) < 2:
        return levels
    
    levels_array = np.array(levels).reshape(-1, 1)
    
    try:
        # Use hierarchical clustering
        clusters = fclusterdata(levels_array, t=tolerance, criterion='distance')
        
        # Get mean of each cluster
        clustered_levels = []
        for cluster_id in np.unique(clusters):
            cluster_values = levels_array[clusters == cluster_id]
            clustered_levels.append(float(np.mean(cluster_values)))
        
        return sorted(clustered_levels)
    except Exception:
        return sorted(levels)


def line_touches_price(
    slope: float,
    intercept: float,
    prices: pd.Series,
    tolerance: float = 0.01
) -> int:
    """Count how many times price touches a trendline"""
    touches = 0
    
    for i in range(len(prices)):
        line_value = slope * i + intercept
        price = prices.iloc[i]
        
        if abs(price - line_value) / line_value < tolerance:
            touches += 1
    
    return touches


# ═══════════════════════════════════════════════════════════════
# TRENDLINE DETECTION
# ═══════════════════════════════════════════════════════════════

def detect_trendlines(
    df: pd.DataFrame,
    sensitivity: int = 3,
    min_touches: int = 2,
    lookback: int = 100
) -> List[TrendLine]:
    """
    Detect automatic trendlines
    
    Parameters:
    -----------
    df : DataFrame with OHLCV data
    sensitivity : Sensitivity for pivot detection (higher = fewer pivots)
    min_touches : Minimum touches required for valid trendline
    lookback : Number of bars to analyze
    """
    data = df.tail(lookback)
    trendlines = []
    
    pivot_highs, pivot_lows = find_pivots(data, order=sensitivity)
    
    # Detect resistance trendlines (connecting highs)
    if len(pivot_highs) >= 2:
        for i in range(len(pivot_highs)):
            for j in range(i + 1, len(pivot_highs)):
                idx1, idx2 = pivot_highs[i], pivot_highs[j]
                price1, price2 = data['high'].iloc[idx1], data['high'].iloc[idx2]
                
                # Calculate line
                slope = (price2 - price1) / (idx2 - idx1)
                intercept = price1 - slope * idx1
                
                # Count touches
                touches = line_touches_price(slope, intercept, data['high'], tolerance=0.015)
                
                if touches >= min_touches:
                    # Calculate strength based on touches and accuracy
                    strength = min(touches / 5, 1.0)
                    
                    trendlines.append(TrendLine(
                        start_point=(idx1, price1),
                        end_point=(idx2, price2),
                        slope=slope,
                        intercept=intercept,
                        touches=touches,
                        strength=strength,
                        line_type='resistance'
                    ))
    
    # Detect support trendlines (connecting lows)
    if len(pivot_lows) >= 2:
        for i in range(len(pivot_lows)):
            for j in range(i + 1, len(pivot_lows)):
                idx1, idx2 = pivot_lows[i], pivot_lows[j]
                price1, price2 = data['low'].iloc[idx1], data['low'].iloc[idx2]
                
                slope = (price2 - price1) / (idx2 - idx1)
                intercept = price1 - slope * idx1
                
                touches = line_touches_price(slope, intercept, data['low'], tolerance=0.015)
                
                if touches >= min_touches:
                    strength = min(touches / 5, 1.0)
                    
                    trendlines.append(TrendLine(
                        start_point=(idx1, price1),
                        end_point=(idx2, price2),
                        slope=slope,
                        intercept=intercept,
                        touches=touches,
                        strength=strength,
                        line_type='support'
                    ))
    
    # Sort by strength and remove duplicates
    trendlines = sorted(trendlines, key=lambda x: x.strength, reverse=True)
    
    # Keep top 10 lines
    return trendlines[:10]


def extend_trendline(
    trendline: TrendLine,
    future_bars: int = 50
) -> List[Tuple[int, float]]:
    """
    Extend a trendline into the future
    
    Returns list of (index, price) points
    """
    points = []
    start_idx = trendline.end_point[0]
    
    for i in range(future_bars):
        idx = start_idx + i
        price = trendline.slope * idx + trendline.intercept
        points.append((idx, price))
    
    return points


# ═══════════════════════════════════════════════════════════════
# HORIZONTAL SUPPORT/RESISTANCE
# ═══════════════════════════════════════════════════════════════

def detect_horizontal_levels(
    df: pd.DataFrame,
    num_levels: int = 5,
    lookback: int = 100,
    tolerance: float = 0.02
) -> List[HorizontalLevel]:
    """
    Detect horizontal support and resistance levels
    
    Parameters:
    -----------
    df : DataFrame with OHLCV data
    num_levels : Number of levels to return
    lookback : Number of bars to analyze
    tolerance : Clustering tolerance
    """
    data = df.tail(lookback)
    levels = []
    
    # Find all pivot points
    pivot_highs, pivot_lows = find_pivots(data, order=5)
    
    # Collect all pivot prices
    all_pivots = []
    for idx in pivot_highs:
        all_pivots.append(data['high'].iloc[idx])
    for idx in pivot_lows:
        all_pivots.append(data['low'].iloc[idx])
    
    # Cluster nearby levels
    clustered = cluster_levels(all_pivots, tolerance)
    
    current_price = data['close'].iloc[-1]
    
    # Analyze each clustered level
    for level_price in clustered:
        # Count touches
        touches = 0
        total_volume = 0
        
        for i in range(len(data)):
            high, low = data['high'].iloc[i], data['low'].iloc[i]
            
            # Check if price touched this level
            if abs(high - level_price) / level_price < tolerance or \
               abs(low - level_price) / level_price < tolerance:
                touches += 1
                total_volume += data['volume'].iloc[i]
        
        # Determine if support or resistance
        if level_price > current_price:
            level_type = 'resistance'
        else:
            level_type = 'support'
        
        strength = min(touches / 10, 1.0)
        
        levels.append(HorizontalLevel(
            price=level_price,
            touches=touches,
            strength=strength,
            level_type=level_type,
            volume_at_level=total_volume
        ))
    
    # Sort by strength and return top levels
    levels = sorted(levels, key=lambda x: x.strength, reverse=True)
    return levels[:num_levels * 2]  # Return both support and resistance


def detect_support_resistance_zones(
    df: pd.DataFrame,
    lookback: int = 200
) -> Dict[str, List[Dict]]:
    """
    Detect support and resistance zones (not just lines)
    
    Returns zones with price ranges
    """
    data = df.tail(lookback)
    current_price = data['close'].iloc[-1]
    
    # Get horizontal levels
    levels = detect_horizontal_levels(data, num_levels=10, lookback=lookback)
    
    zones = {
        'support': [],
        'resistance': []
    }
    
    for level in levels:
        zone_range = level.price * 0.01  # 1% zone
        
        zone = {
            'center': level.price,
            'upper': level.price + zone_range,
            'lower': level.price - zone_range,
            'strength': level.strength,
            'touches': level.touches
        }
        
        if level.level_type == 'support':
            zones['support'].append(zone)
        else:
            zones['resistance'].append(zone)
    
    return zones


# ═══════════════════════════════════════════════════════════════
# FIBONACCI RETRACEMENTS
# ═══════════════════════════════════════════════════════════════

def calculate_fibonacci_levels(
    df: pd.DataFrame,
    lookback: int = 100,
    custom_levels: List[float] = None
) -> FibonacciLevels:
    """
    Calculate Fibonacci retracement levels
    
    Parameters:
    -----------
    df : DataFrame with OHLCV data
    lookback : Number of bars to find swing high/low
    custom_levels : Custom Fibonacci ratios (default: standard)
    """
    data = df.tail(lookback)
    
    # Default Fibonacci levels
    if custom_levels is None:
        custom_levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0, 1.272, 1.618]
    
    # Find swing high and low
    swing_high = data['high'].max()
    swing_low = data['low'].min()
    
    swing_high_idx = data['high'].idxmax()
    swing_low_idx = data['low'].idxmin()
    
    # Determine direction (uptrend or downtrend)
    if swing_high_idx > swing_low_idx:
        # Uptrend - retracement from high
        direction = 'up'
        diff = swing_high - swing_low
        levels = {}
        for ratio in custom_levels:
            levels[ratio] = swing_high - (diff * ratio)
    else:
        # Downtrend - retracement from low
        direction = 'down'
        diff = swing_high - swing_low
        levels = {}
        for ratio in custom_levels:
            levels[ratio] = swing_low + (diff * ratio)
    
    return FibonacciLevels(
        swing_high=swing_high,
        swing_low=swing_low,
        direction=direction,
        levels=levels
    )


def calculate_fibonacci_extensions(
    df: pd.DataFrame,
    lookback: int = 100
) -> Dict[float, float]:
    """
    Calculate Fibonacci extension levels for price targets
    """
    data = df.tail(lookback)
    
    swing_high = data['high'].max()
    swing_low = data['low'].min()
    diff = swing_high - swing_low
    
    extension_ratios = [1.0, 1.272, 1.414, 1.618, 2.0, 2.272, 2.618]
    
    extensions = {}
    for ratio in extension_ratios:
        # Bullish extensions (above swing high)
        extensions[ratio] = swing_high + (diff * (ratio - 1))
    
    return extensions


# ═══════════════════════════════════════════════════════════════
# VERTICAL SUPPORT/RESISTANCE (TIME-BASED)
# ═══════════════════════════════════════════════════════════════

def detect_vertical_levels(
    df: pd.DataFrame,
    sensitivity: float = 0.5,
    lookback: int = 200
) -> Dict[str, List[Dict]]:
    """
    Detect vertical support/resistance levels (significant time points)
    
    These are indices where price action showed significant reversals
    """
    data = df.tail(lookback)
    
    vertical_levels = {
        'resistance_times': [],
        'support_times': []
    }
    
    pivot_highs, pivot_lows = find_pivots(data, order=10)
    
    # Major highs (resistance times)
    for idx in pivot_highs:
        high_price = data['high'].iloc[idx]
        
        # Check if this was a significant reversal
        if idx > 10 and idx < len(data) - 10:
            before_avg = data['close'].iloc[idx-10:idx].mean()
            after_avg = data['close'].iloc[idx:idx+10].mean()
            
            reversal_strength = (high_price - after_avg) / high_price
            
            if reversal_strength > sensitivity * 0.01:
                vertical_levels['resistance_times'].append({
                    'index': idx,
                    'price': high_price,
                    'reversal_strength': reversal_strength,
                    'timestamp': data.index[idx] if isinstance(data.index, pd.DatetimeIndex) else idx
                })
    
    # Major lows (support times)
    for idx in pivot_lows:
        low_price = data['low'].iloc[idx]
        
        if idx > 10 and idx < len(data) - 10:
            before_avg = data['close'].iloc[idx-10:idx].mean()
            after_avg = data['close'].iloc[idx:idx+10].mean()
            
            reversal_strength = (after_avg - low_price) / low_price
            
            if reversal_strength > sensitivity * 0.01:
                vertical_levels['support_times'].append({
                    'index': idx,
                    'price': low_price,
                    'reversal_strength': reversal_strength,
                    'timestamp': data.index[idx] if isinstance(data.index, pd.DatetimeIndex) else idx
                })
    
    return vertical_levels


# ═══════════════════════════════════════════════════════════════
# CHANNEL DETECTION
# ═══════════════════════════════════════════════════════════════

def detect_price_channel(
    df: pd.DataFrame,
    lookback: int = 50
) -> Optional[Dict]:
    """
    Detect current price channel (parallel support and resistance)
    """
    data = df.tail(lookback)
    
    pivot_highs, pivot_lows = find_pivots(data, order=5)
    
    if len(pivot_highs) < 2 or len(pivot_lows) < 2:
        return None
    
    # Calculate resistance line
    high_points = [(idx, data['high'].iloc[idx]) for idx in pivot_highs[-3:]]
    high_slope, high_intercept = linregress([p[0] for p in high_points], 
                                              [p[1] for p in high_points])[:2]
    
    # Calculate support line
    low_points = [(idx, data['low'].iloc[idx]) for idx in pivot_lows[-3:]]
    low_slope, low_intercept = linregress([p[0] for p in low_points], 
                                            [p[1] for p in low_points])[:2]
    
    # Check if lines are roughly parallel
    slope_diff = abs(high_slope - low_slope)
    avg_slope = (high_slope + low_slope) / 2
    
    if avg_slope == 0:
        return None
    
    parallelism = 1 - (slope_diff / abs(avg_slope)) if avg_slope != 0 else 0
    
    if parallelism < 0.7:
        return None
    
    # Determine channel type
    if avg_slope > 0.001:
        channel_type = 'ascending'
    elif avg_slope < -0.001:
        channel_type = 'descending'
    else:
        channel_type = 'horizontal'
    
    # Current channel width
    current_idx = len(data) - 1
    current_high = high_slope * current_idx + high_intercept
    current_low = low_slope * current_idx + low_intercept
    channel_width = current_high - current_low
    
    return {
        'type': channel_type,
        'resistance_slope': high_slope,
        'resistance_intercept': high_intercept,
        'support_slope': low_slope,
        'support_intercept': low_intercept,
        'channel_width': channel_width,
        'parallelism': parallelism,
        'current_resistance': current_high,
        'current_support': current_low
    }


# ═══════════════════════════════════════════════════════════════
# COMPREHENSIVE TRENDLINE ANALYSIS
# ═══════════════════════════════════════════════════════════════

def analyze_all_trendlines(
    df: pd.DataFrame,
    config: Dict[str, bool] = None
) -> Dict:
    """
    Perform comprehensive trendline and level analysis
    
    Parameters:
    -----------
    df : DataFrame with OHLCV data
    config : Dictionary of analysis types and enabled status
    """
    results = {}
    
    if config is None:
        config = {
            'trendlines': True,
            'horizontal_levels': True,
            'fibonacci_retracements': True,
            'vertical_resistance': True,
            'vertical_support': True,
            'price_channel': True
        }
    
    if config.get('trendlines'):
        trendlines = detect_trendlines(df)
        results['trendlines'] = [{
            'start': line.start_point,
            'end': line.end_point,
            'slope': line.slope,
            'intercept': line.intercept,
            'touches': line.touches,
            'strength': line.strength,
            'type': line.line_type
        } for line in trendlines]
    
    if config.get('horizontal_levels'):
        levels = detect_horizontal_levels(df)
        results['horizontal_levels'] = [{
            'price': level.price,
            'touches': level.touches,
            'strength': level.strength,
            'type': level.level_type,
            'volume': level.volume_at_level
        } for level in levels]
    
    if config.get('fibonacci_retracements'):
        fib = calculate_fibonacci_levels(df)
        results['fibonacci'] = {
            'swing_high': fib.swing_high,
            'swing_low': fib.swing_low,
            'direction': fib.direction,
            'levels': fib.levels
        }
    
    if config.get('vertical_resistance') or config.get('vertical_support'):
        vertical = detect_vertical_levels(df)
        if config.get('vertical_resistance'):
            results['vertical_resistance'] = vertical['resistance_times']
        if config.get('vertical_support'):
            results['vertical_support'] = vertical['support_times']
    
    if config.get('price_channel'):
        channel = detect_price_channel(df)
        results['price_channel'] = channel
    
    return results


def trendlines_to_json(results: Dict) -> Dict:
    """Convert trendline results to JSON-serializable format"""
    # Results are already in a JSON-friendly format
    return results
