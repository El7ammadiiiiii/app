"""
Trend Lines v2 - Converted from Pine Script by LonesomeTheBlue
Copy from charting/indicators/trend_lines_v2.py

This indicator finds pivot highs/lows and draws trend lines connecting them.
"""

import logging
from dataclasses import dataclass
from typing import List, Tuple, Optional, Dict, Any

logger = logging.getLogger("indicators.trend_lines")


@dataclass
class TrendLine:
    """Represents a trend line with start and end points"""
    x1: int       # Start bar index
    y1: float     # Start price
    x2: int       # End bar index
    y2: float     # End price
    line_type: str  # 'up' for uptrend (support), 'down' for downtrend (resistance)
    slope: float = 0.0
    strength: int = 2
    age_bars: int = 0


class TrendLinesDetector:
    """
    Trend Lines v2 Indicator
    
    Finds pivot points and draws trend lines connecting them.
    Validates that price doesn't break through the trend line.
    
    Parameters:
    -----------
    pivot_period : int
        Number of bars to look back/forward for pivot detection (default: 20)
    pp_num : int
        Number of pivot points to check for trend lines (default: 3)
    max_lines : int
        Maximum number of trend lines to draw (default: 3)
    """
    
    def __init__(self, pivot_period: int = 20, pp_num: int = 3, max_lines: int = 3):
        self.pivot_period = pivot_period
        self.pp_num = pp_num
        self.max_lines = max_lines
        
        # Storage for pivot values and positions
        self.pivot_highs: List[Tuple[int, float]] = []  # (bar_index, value)
        self.pivot_lows: List[Tuple[int, float]] = []
    
    def _detect_pivot_high(self, highs: List[float], idx: int) -> Optional[float]:
        """
        Detect pivot high at position idx
        A pivot high is the highest point with pivot_period bars on each side being lower
        """
        if idx < self.pivot_period or idx >= len(highs) - self.pivot_period:
            return None
        
        pivot_idx = idx - self.pivot_period
        pivot_val = highs[pivot_idx]
        
        # Check if it's a local maximum
        left_range = highs[pivot_idx - self.pivot_period:pivot_idx]
        right_range = highs[pivot_idx + 1:pivot_idx + self.pivot_period + 1]
        
        if len(left_range) == 0 or len(right_range) == 0:
            return None
            
        if pivot_val >= max(left_range) and pivot_val >= max(right_range):
            return pivot_val
        return None
    
    def _detect_pivot_low(self, lows: List[float], idx: int) -> Optional[float]:
        """
        Detect pivot low at position idx
        A pivot low is the lowest point with pivot_period bars on each side being higher
        """
        if idx < self.pivot_period or idx >= len(lows) - self.pivot_period:
            return None
        
        pivot_idx = idx - self.pivot_period
        pivot_val = lows[pivot_idx]
        
        # Check if it's a local minimum
        left_range = lows[pivot_idx - self.pivot_period:pivot_idx]
        right_range = lows[pivot_idx + 1:pivot_idx + self.pivot_period + 1]
        
        if len(left_range) == 0 or len(right_range) == 0:
            return None
            
        if pivot_val <= min(left_range) and pivot_val <= min(right_range):
            return pivot_val
        return None
    
    def detect(self, candles: List[Dict]) -> Dict[str, Any]:
        """
        Calculate trend lines from OHLCV data
        
        Parameters:
        -----------
        candles : List[Dict]
            List of candles with keys: timestamp, open, high, low, close, volume
            
        Returns:
        --------
        Dict with uptrend_lines, downtrend_lines, filter_type
        """
        highs = [c['high'] for c in candles]
        lows = [c['low'] for c in candles]
        closes = [c['close'] for c in candles]
        n = len(candles)
        
        if n < self.pivot_period * 2 + 10:
            return {
                "uptrend_lines": [],
                "downtrend_lines": [],
                "filter_type": "none",
            }
        
        # Reset pivot storage
        self.pivot_highs = []
        self.pivot_lows = []
        
        # Detect all pivots
        for i in range(self.pivot_period, n):
            ph = self._detect_pivot_high(highs, i)
            if ph is not None:
                pivot_bar = i - self.pivot_period
                self.pivot_highs.append((pivot_bar, ph))
                # Keep only pp_num most recent
                if len(self.pivot_highs) > self.pp_num:
                    self.pivot_highs.pop(0)
            
            pl = self._detect_pivot_low(lows, i)
            if pl is not None:
                pivot_bar = i - self.pivot_period
                self.pivot_lows.append((pivot_bar, pl))
                if len(self.pivot_lows) > self.pp_num:
                    self.pivot_lows.pop(0)
        
        # Find uptrend lines (connecting pivot lows - support)
        uptrend_lines = self._find_uptrend_lines(closes, n)
        
        # Find downtrend lines (connecting pivot highs - resistance)
        downtrend_lines = self._find_downtrend_lines(closes, n)
        
        # Determine filter type
        has_up = len(uptrend_lines) > 0
        has_down = len(downtrend_lines) > 0
        
        if has_up and has_down:
            filter_type = "both"
        elif has_up:
            filter_type = "up"
        elif has_down:
            filter_type = "down"
        else:
            filter_type = "none"
        
        return {
            "uptrend_lines": uptrend_lines,
            "downtrend_lines": downtrend_lines,
            "filter_type": filter_type,
        }
    
    def _find_uptrend_lines(self, closes: List[float], n: int) -> List[TrendLine]:
        """Find valid uptrend lines from pivot lows"""
        lines = []
        
        if len(self.pivot_lows) < 2:
            return lines
        
        # Try pairs of pivot lows (older to newer)
        for i in range(len(self.pivot_lows) - 1):
            for j in range(i + 1, len(self.pivot_lows)):
                pos1, val1 = self.pivot_lows[j]  # More recent (higher position)
                pos2, val2 = self.pivot_lows[i]  # Older (lower position)
                
                # For uptrend, val1 should be > val2 (ascending lows)
                if val1 <= val2:
                    continue
                
                # Calculate slope
                if pos1 == pos2:
                    continue
                    
                slope = (val1 - val2) / (pos1 - pos2)
                
                # Validate: check if price never closes below the line
                valid = True
                for k in range(pos2 + 1, n):
                    line_val = val2 + slope * (k - pos2)
                    if closes[k] < line_val:
                        valid = False
                        break
                
                if valid:
                    # Extend line to current bar
                    end_val = val2 + slope * (n - 1 - pos2)
                    lines.append(TrendLine(
                        x1=pos2,
                        y1=val2,
                        x2=n - 1,
                        y2=end_val,
                        line_type='up',
                        slope=slope,
                        strength=2,
                        age_bars=n - 1 - pos2
                    ))
                    
                    if len(lines) >= self.max_lines:
                        return lines
        
        return lines
    
    def _find_downtrend_lines(self, closes: List[float], n: int) -> List[TrendLine]:
        """Find valid downtrend lines from pivot highs"""
        lines = []
        
        if len(self.pivot_highs) < 2:
            return lines
        
        # Try pairs of pivot highs (older to newer)
        for i in range(len(self.pivot_highs) - 1):
            for j in range(i + 1, len(self.pivot_highs)):
                pos1, val1 = self.pivot_highs[j]  # More recent
                pos2, val2 = self.pivot_highs[i]  # Older
                
                # For downtrend, val1 should be < val2 (descending highs)
                if val1 >= val2:
                    continue
                
                # Calculate slope (negative for downtrend)
                if pos1 == pos2:
                    continue
                    
                slope = (val1 - val2) / (pos1 - pos2)
                
                # Validate: check if price never closes above the line
                valid = True
                for k in range(pos2 + 1, n):
                    line_val = val2 + slope * (k - pos2)
                    if closes[k] > line_val:
                        valid = False
                        break
                
                if valid:
                    # Extend line to current bar
                    end_val = val2 + slope * (n - 1 - pos2)
                    lines.append(TrendLine(
                        x1=pos2,
                        y1=val2,
                        x2=n - 1,
                        y2=end_val,
                        line_type='down',
                        slope=slope,
                        strength=2,
                        age_bars=n - 1 - pos2
                    ))
                    
                    if len(lines) >= self.max_lines:
                        return lines
        
        return lines


def detect_trendlines(
    candles: List[Dict],
    pivot_period: int = 20,
    pp_num: int = 3,
    max_lines: int = 3
) -> Dict[str, Any]:
    """
    Convenience function to detect trend lines.
    
    Returns dict with:
    - uptrend_lines: Support lines (ascending lows, green)
    - downtrend_lines: Resistance lines (descending highs, red)
    - filter_type: 'up', 'down', 'both', or 'none'
    """
    detector = TrendLinesDetector(pivot_period, pp_num, max_lines)
    return detector.detect(candles)
