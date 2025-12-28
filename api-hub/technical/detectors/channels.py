# ═══════════════════════════════════════════════════════════════
# CHANNELS DETECTOR - 9 Channel Patterns
# ═══════════════════════════════════════════════════════════════

import numpy as np
import pandas as pd
from typing import List
from .base_detector import BaseDetector, PatternResult


class ChannelsDetector(BaseDetector):
    """Detect channel patterns"""
    
    def detect(self, df: pd.DataFrame, timeframe: str) -> List[PatternResult]:
        self.patterns = []
        
        if len(df) < self.MIN_PATTERN_BARS:
            return self.patterns
        
        pivot_highs, pivot_lows = self.detect_pivots(df, window=5)
        high_points = self.get_pivot_points(df, pivot_highs, 'high')
        low_points = self.get_pivot_points(df, pivot_lows, 'low')
        
        if len(high_points) < 2 or len(low_points) < 2:
            return self.patterns
        
        for window_size in [40, 60, 100]:
            if len(df) < window_size:
                continue
            
            for start in range(0, len(df) - window_size, window_size // 4):
                end = start + window_size
                
                window_highs = [(i-start, p) for i, p in high_points if start <= i < end]
                window_lows = [(i-start, p) for i, p in low_points if start <= i < end]
                
                if len(window_highs) >= 2 and len(window_lows) >= 2:
                    self._detect_channel(df, window_highs, window_lows, start, end, timeframe)
        
        return self.patterns
    
    def _detect_channel(self, df: pd.DataFrame, high_points: List, low_points: List,
                        start: int, end: int, timeframe: str):
        upper_line = self.fit_trendline_ransac(high_points)
        lower_line = self.fit_trendline_ransac(low_points)
        
        if not upper_line or not lower_line:
            return
        
        # Check parallel (similar slopes)
        slope_diff = abs(upper_line['slope'] - lower_line['slope'])
        avg_slope = (abs(upper_line['slope']) + abs(lower_line['slope'])) / 2
        
        if avg_slope > 0.0001 and slope_diff / avg_slope > 0.3:
            return  # Not parallel enough
        
        if upper_line['r_squared'] < 0.7 or lower_line['r_squared'] < 0.7:
            return
        
        # Determine channel type
        avg_slope = (upper_line['slope'] + lower_line['slope']) / 2
        
        if avg_slope > 0.0001:
            channel_type = 'ascending_channel'
            bias = 'bullish'
        elif avg_slope < -0.0001:
            channel_type = 'descending_channel'
            bias = 'bearish'
        else:
            channel_type = 'horizontal_channel'
            bias = 'neutral'
        
        # Calculate metrics
        current_idx = end - 1 - start
        entry = df['close'].iloc[end - 1]
        upper_at_end = self.get_trendline_value(upper_line, current_idx)
        lower_at_end = self.get_trendline_value(lower_line, current_idx)
        height = abs(upper_at_end - lower_at_end)
        
        is_bullish = bias == 'bullish'
        target = self.calculate_target(entry, height, is_bullish)
        stop = self.calculate_stop_loss(entry, height, is_bullish)
        rr = self.calculate_risk_reward(entry, target, stop)
        
        confidence = self.calculate_confidence(
            upper_line['r_squared'], 0.7, 0.6, 0.7, 0.6
        )
        
        start_time = int(df.iloc[start]['timestamp'].timestamp() * 1000) if hasattr(df.iloc[start]['timestamp'], 'timestamp') else int(df.iloc[start]['timestamp'])
        end_time = int(df.iloc[end-1]['timestamp'].timestamp() * 1000) if hasattr(df.iloc[end-1]['timestamp'], 'timestamp') else int(df.iloc[end-1]['timestamp'])
        
        self.patterns.append(PatternResult(
            pattern_id=self.generate_pattern_id(channel_type, start),
            name=channel_type.replace('_', ' ').title(),
            category='channels',
            type=bias,
            confidence=confidence,
            strength=self.classify_strength(confidence),
            entry_price=entry,
            target_price=target,
            stop_loss=stop,
            risk_reward=rr,
            start_index=start,
            end_index=end,
            start_time=start_time,
            end_time=end_time,
            trendlines=[
                {'type': 'resistance', 'coords': self.generate_trendline_coords(upper_line, 0, current_idx, df.iloc[start:end])},
                {'type': 'support', 'coords': self.generate_trendline_coords(lower_line, 0, current_idx, df.iloc[start:end])}
            ],
            completion_percentage=80.0
        ))
