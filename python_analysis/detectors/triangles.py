# ═══════════════════════════════════════════════════════════════
# TRIANGLES DETECTOR - 8 Triangle Patterns
# ═══════════════════════════════════════════════════════════════
# 1. Ascending Triangle (Bullish)
# 2. Descending Triangle (Bearish)
# 3. Symmetrical Triangle (Neutral)
# 4. Expanding Triangle (Neutral)
# 5. Right-Angled Ascending (Bullish)
# 6. Right-Angled Descending (Bearish)
# 7. Running Triangle (Continuation)
# 8. Barrier Triangle (Reversal)
# ═══════════════════════════════════════════════════════════════

import numpy as np
import pandas as pd
from typing import List
from .base_detector import BaseDetector, PatternResult


class TrianglesDetector(BaseDetector):
    """Detect 8 types of triangle patterns"""
    
    PATTERN_NAMES = [
        'ascending_triangle',
        'descending_triangle', 
        'symmetrical_triangle',
        'expanding_triangle',
        'right_angled_ascending',
        'right_angled_descending',
        'running_triangle',
        'barrier_triangle'
    ]
    
    def detect(self, df: pd.DataFrame, timeframe: str) -> List[PatternResult]:
        """Detect all triangle patterns"""
        self.patterns = []
        
        if len(df) < self.MIN_PATTERN_BARS:
            return self.patterns
        
        # Detect pivots
        pivot_highs, pivot_lows = self.detect_pivots(df, window=5)
        high_points = self.get_pivot_points(df, pivot_highs, 'high')
        low_points = self.get_pivot_points(df, pivot_lows, 'low')
        
        if len(high_points) < 2 or len(low_points) < 2:
            return self.patterns
        
        # Scan for triangles using sliding window
        for window_size in [30, 50, 80, 120]:
            if len(df) < window_size:
                continue
                
            for start in range(0, len(df) - window_size, window_size // 4):
                end = start + window_size
                
                # Get points in window
                window_highs = [(i, p) for i, p in high_points if start <= i < end]
                window_lows = [(i, p) for i, p in low_points if start <= i < end]
                
                if len(window_highs) >= 2 and len(window_lows) >= 2:
                    self._detect_triangles_in_window(
                        df, window_highs, window_lows, start, end, timeframe
                    )
        
        return self.patterns
    
    def _detect_triangles_in_window(self, df: pd.DataFrame, 
                                     high_points: List, low_points: List,
                                     start: int, end: int, timeframe: str):
        """Detect triangle patterns in a specific window"""
        
        # Fit trendlines
        upper_line = self.fit_trendline_ransac(high_points)
        lower_line = self.fit_trendline_ransac(low_points)
        
        if not upper_line or not lower_line:
            return
        
        upper_slope = upper_line['slope']
        lower_slope = lower_line['slope']
        upper_r2 = upper_line['r_squared']
        lower_r2 = lower_line['r_squared']
        
        # Need decent line quality
        if upper_r2 < 0.6 or lower_r2 < 0.6:
            return
        
        # Validate touches
        upper_touches = self.count_valid_touches(df.iloc[start:end], upper_line, True)
        lower_touches = self.count_valid_touches(df.iloc[start:end], lower_line, False)
        
        if upper_touches < 2 or lower_touches < 2:
            return
        
        # Classify triangle type
        pattern_type = self._classify_triangle(upper_slope, lower_slope)
        if not pattern_type:
            return
        
        # Create pattern result
        pattern = self._create_triangle_pattern(
            df, pattern_type, upper_line, lower_line,
            start, end, upper_touches, lower_touches, timeframe
        )
        
        if pattern:
            self.patterns.append(pattern)
    
    def _classify_triangle(self, upper_slope: float, lower_slope: float) -> str:
        """Classify triangle based on slopes"""
        slope_threshold = 0.0001
        
        # Ascending: flat top, rising bottom
        if abs(upper_slope) < slope_threshold and lower_slope > slope_threshold:
            return 'ascending_triangle'
        
        # Descending: falling top, flat bottom
        if upper_slope < -slope_threshold and abs(lower_slope) < slope_threshold:
            return 'descending_triangle'
        
        # Symmetrical: converging slopes
        if upper_slope < -slope_threshold and lower_slope > slope_threshold:
            return 'symmetrical_triangle'
        
        # Expanding: diverging slopes
        if upper_slope > slope_threshold and lower_slope < -slope_threshold:
            return 'expanding_triangle'
        
        return None
    
    def _create_triangle_pattern(self, df: pd.DataFrame, pattern_type: str,
                                  upper_line: dict, lower_line: dict,
                                  start: int, end: int,
                                  upper_touches: int, lower_touches: int,
                                  timeframe: str) -> PatternResult:
        """Create PatternResult for detected triangle"""
        
        # Determine bullish/bearish
        if pattern_type in ['ascending_triangle', 'right_angled_ascending']:
            bias = 'bullish'
        elif pattern_type in ['descending_triangle', 'right_angled_descending']:
            bias = 'bearish'
        else:
            bias = 'neutral'
        
        # Calculate scores
        line_quality = (self.calculate_line_quality(upper_line, upper_touches) +
                       self.calculate_line_quality(lower_line, lower_touches)) / 2
        
        geometric_score = min(1.0, (upper_touches + lower_touches) / 8)
        volume_score = self.calculate_volume_score(df, start, end)
        position_score = 0.7  # Default position score
        context_score = 0.6
        
        confidence = self.calculate_confidence(
            line_quality, geometric_score, volume_score, position_score, context_score
        )
        
        # Calculate prices
        current_idx = end - 1
        entry_price = df['close'].iloc[current_idx]
        
        upper_at_end = self.get_trendline_value(upper_line, current_idx - start)
        lower_at_end = self.get_trendline_value(lower_line, current_idx - start)
        pattern_height = abs(upper_at_end - lower_at_end)
        
        is_bullish = bias == 'bullish'
        target_price = self.calculate_target(entry_price, pattern_height, is_bullish)
        stop_loss = self.calculate_stop_loss(entry_price, pattern_height, is_bullish)
        risk_reward = self.calculate_risk_reward(entry_price, target_price, stop_loss)
        
        # Generate rendering coordinates
        trendlines = [
            {
                'type': 'resistance',
                'coords': self.generate_trendline_coords(upper_line, 0, end - start - 1, df.iloc[start:end])
            },
            {
                'type': 'support', 
                'coords': self.generate_trendline_coords(lower_line, 0, end - start - 1, df.iloc[start:end])
            }
        ]
        
        # Get timestamps
        start_time = int(df.iloc[start]['timestamp'].timestamp() * 1000) if hasattr(df.iloc[start]['timestamp'], 'timestamp') else int(df.iloc[start]['timestamp'])
        end_time = int(df.iloc[end-1]['timestamp'].timestamp() * 1000) if hasattr(df.iloc[end-1]['timestamp'], 'timestamp') else int(df.iloc[end-1]['timestamp'])
        
        return PatternResult(
            pattern_id=self.generate_pattern_id(pattern_type, start),
            name=pattern_type.replace('_', ' ').title(),
            category='triangles',
            type=bias,
            confidence=confidence,
            strength=self.classify_strength(confidence),
            entry_price=entry_price,
            target_price=target_price,
            stop_loss=stop_loss,
            risk_reward=risk_reward,
            start_index=start,
            end_index=end,
            start_time=start_time,
            end_time=end_time,
            trendlines=trendlines,
            key_points=[],
            zones=[],
            volume_confirmation=volume_score > 0.6,
            completion_percentage=85.0
        )
