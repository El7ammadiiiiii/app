"""
📊 Pivot Levels - Port from BigBeluga PineScript
Multi-period pivot high/low levels with volume distribution

Detects support and resistance levels based on pivot points.
Used by pivot_levels_scanner.py to populate Firebase.

@author CCWAYS Team
@version 1.0.0
"""

import logging
from dataclasses import dataclass, asdict
from typing import List, Dict, Any, Optional

import numpy as np

logger = logging.getLogger("indicators.pivot_levels")


@dataclass
class PivotLevel:
    """Represents a pivot level"""
    price: float
    type: str           # 'resistance' or 'support'
    pivotLength: int    # Which pivot period (5, 25, 50, 100)
    startIndex: int     # Bar index where pivot occurred
    timestamp: int      # Timestamp of pivot bar
    touches: int        # Estimated touches
    strength: int       # Strength score (1-100)
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass 
class PivotLevelsResult:
    """Result from Pivot Levels detection"""
    levels: List[PivotLevel]
    nearestResistance: Optional[PivotLevel] = None
    nearestSupport: Optional[PivotLevel] = None
    distanceToNearestResistance: Optional[float] = None
    distanceToNearestSupport: Optional[float] = None
    status: str = 'all'


class PivotLevelsDetector:
    """
    Pivot Levels Detector
    
    Finds pivot high/low levels at multiple periods (5, 25, 50, 100).
    Determines if price is near support, near resistance, or broke a level.
    
    Parameters:
    -----------
    pivot_lengths : list
        List of pivot periods (default: [5, 25, 50, 100])
    near_threshold : float
        Percentage threshold for "near" detection (default: 6.0)
    """
    
    PIVOT_LENGTHS = [5, 25, 50, 100]
    NEAR_THRESHOLD = 6.0  # 6%
    
    def __init__(
        self,
        pivot_lengths: List[int] = None,
        near_threshold: float = None
    ):
        self.pivot_lengths = pivot_lengths or self.PIVOT_LENGTHS
        self.near_threshold = near_threshold or self.NEAR_THRESHOLD
    
    def _find_pivot_highs(self, highs: np.ndarray, period: int) -> List[tuple]:
        """Find all pivot highs with given period - returns list of (idx, price)"""
        pivots = []
        n = len(highs)
        
        for i in range(period, n - period):
            val = highs[i]
            left = highs[i - period:i]
            right = highs[i + 1:i + period + 1]
            
            if val >= np.max(left) and val >= np.max(right):
                pivots.append((i, val))
        
        return pivots
    
    def _find_pivot_lows(self, lows: np.ndarray, period: int) -> List[tuple]:
        """Find all pivot lows with given period - returns list of (idx, price)"""
        pivots = []
        n = len(lows)
        
        for i in range(period, n - period):
            val = lows[i]
            left = lows[i - period:i]
            right = lows[i + 1:i + period + 1]
            
            if val <= np.min(left) and val <= np.min(right):
                pivots.append((i, val))
        
        return pivots
    
    def _count_touches(
        self, 
        price: float, 
        highs: np.ndarray, 
        lows: np.ndarray, 
        tolerance: float
    ) -> int:
        """Count how many times price has touched this level"""
        touches = 0
        for i in range(len(highs)):
            # Check if candle touched the level
            if lows[i] <= price + tolerance and highs[i] >= price - tolerance:
                touches += 1
        return min(touches, 10)  # Cap at 10
    
    def _calculate_strength(self, touches: int, period: int) -> int:
        """Calculate strength score (1-100) based on touches and period"""
        # Higher period = stronger level
        period_score = {5: 20, 25: 40, 50: 60, 100: 80}.get(period, 50)
        # More touches = stronger
        touch_score = min(touches * 5, 50)
        return min(period_score + touch_score, 100)
    
    def detect(self, candles: List[Dict]) -> Dict[str, Any]:
        """
        Detect pivot levels from OHLCV candle data.
        
        Parameters:
        -----------
        candles : list of dict
            Each candle has: timestamp, open, high, low, close, volume
            
        Returns:
        --------
        dict with:
            - levels: list of PivotLevel dicts
            - nearestResistance: PivotLevel or None
            - nearestSupport: PivotLevel or None
            - distanceToNearestResistance: float or None
            - distanceToNearestSupport: float or None
            - status: 'all' | 'near_resistance' | 'near_support' | 'broke_resistance' | 'broke_support'
        """
        # Need at least enough data for smallest period
        min_period = min(self.pivot_lengths)
        if len(candles) < min_period * 2 + 1:
            return self._empty_result()
        
        # Extract arrays
        timestamps = np.array([c.get('timestamp', 0) for c in candles])
        highs = np.array([c['high'] for c in candles])
        lows = np.array([c['low'] for c in candles])
        closes = np.array([c['close'] for c in candles])
        
        current_price = closes[-1]
        n = len(candles)
        
        # Tolerance for touch detection (0.5% of price)
        tolerance = current_price * 0.005
        
        all_levels: List[PivotLevel] = []
        
        for period in self.pivot_lengths:
            # Find pivot highs (resistance)
            pivot_highs = self._find_pivot_highs(highs, period)
            if pivot_highs:
                # Use most recent pivot high for this period
                idx, price = pivot_highs[-1]
                touches = self._count_touches(price, highs, lows, tolerance)
                strength = self._calculate_strength(touches, period)
                
                # Resistance is above or near current price
                level = PivotLevel(
                    price=price,
                    type='resistance' if price > current_price else 'support',
                    pivotLength=period,
                    startIndex=idx,
                    timestamp=int(timestamps[idx]) if idx < len(timestamps) else 0,
                    touches=touches,
                    strength=strength
                )
                all_levels.append(level)
            
            # Find pivot lows (support)
            pivot_lows = self._find_pivot_lows(lows, period)
            if pivot_lows:
                idx, price = pivot_lows[-1]
                touches = self._count_touches(price, highs, lows, tolerance)
                strength = self._calculate_strength(touches, period)
                
                level = PivotLevel(
                    price=price,
                    type='support' if price < current_price else 'resistance',
                    pivotLength=period,
                    startIndex=idx,
                    timestamp=int(timestamps[idx]) if idx < len(timestamps) else 0,
                    touches=touches,
                    strength=strength
                )
                all_levels.append(level)
        
        # Find nearest resistance and support
        resistance_levels = [l for l in all_levels if l.price > current_price]
        support_levels = [l for l in all_levels if l.price < current_price]
        
        nearest_resistance = min(resistance_levels, key=lambda l: l.price) if resistance_levels else None
        nearest_support = max(support_levels, key=lambda l: l.price) if support_levels else None
        
        # Calculate distances
        dist_resistance = None
        dist_support = None
        
        if nearest_resistance:
            dist_resistance = round((nearest_resistance.price - current_price) / current_price * 100, 2)
        
        if nearest_support:
            dist_support = round((current_price - nearest_support.price) / current_price * 100, 2)
        
        # Determine status
        status = 'all'
        if dist_resistance is not None and dist_resistance <= self.near_threshold:
            status = 'near_resistance'
        elif dist_support is not None and dist_support <= self.near_threshold:
            status = 'near_support'
        
        # Check for breaks (price closed beyond level)
        if nearest_resistance and closes[-2] < nearest_resistance.price and closes[-1] > nearest_resistance.price:
            status = 'broke_resistance'
        elif nearest_support and closes[-2] > nearest_support.price and closes[-1] < nearest_support.price:
            status = 'broke_support'
        
        return {
            'levels': [l.to_dict() for l in all_levels],
            'nearestResistance': nearest_resistance.to_dict() if nearest_resistance else None,
            'nearestSupport': nearest_support.to_dict() if nearest_support else None,
            'distanceToNearestResistance': dist_resistance,
            'distanceToNearestSupport': dist_support,
            'status': status,
        }
    
    def _empty_result(self) -> Dict[str, Any]:
        """Return empty result when not enough data"""
        return {
            'levels': [],
            'nearestResistance': None,
            'nearestSupport': None,
            'distanceToNearestResistance': None,
            'distanceToNearestSupport': None,
            'status': 'all',
        }
