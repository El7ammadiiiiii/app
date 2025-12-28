# ═══════════════════════════════════════════════════════════════
# TRENDLINES DETECTOR
# ═══════════════════════════════════════════════════════════════

import numpy as np
import pandas as pd
from typing import List
from .base_detector import BaseDetector, PatternResult


class TrendlinesDetector(BaseDetector):
    """Detect significant trendlines"""
    
    def detect(self, df: pd.DataFrame, timeframe: str) -> List[PatternResult]:
        self.patterns = []
        
        if len(df) < 20:
            return self.patterns
        
        pivot_highs, pivot_lows = self.detect_pivots(df, window=5)
        high_points = self.get_pivot_points(df, pivot_highs, 'high')
        low_points = self.get_pivot_points(df, pivot_lows, 'low')
        
        # Detect resistance trendlines
        if len(high_points) >= 2:
            self._detect_trendline(df, high_points, 'resistance', timeframe)
        
        # Detect support trendlines
        if len(low_points) >= 2:
            self._detect_trendline(df, low_points, 'support', timeframe)
        
        return self.patterns
    
    def _detect_trendline(self, df: pd.DataFrame, points: List, line_type: str, timeframe: str):
        line = self.fit_trendline_ransac(points)
        
        if not line or line['r_squared'] < 0.7:
            return
        
        touches = len([p for p in points if line.get('inliers', [True] * len(points))[points.index(p)]])
        
        if touches < 2:
            return
        
        start_idx = points[0][0]
        end_idx = points[-1][0]
        
        current_price = df['close'].iloc[-1]
        line_at_current = self.get_trendline_value(line, len(df) - 1)
        
        # Determine bias
        if line_type == 'support':
            bias = 'bullish'
            target = current_price + abs(current_price - line_at_current)
            stop = line_at_current * 0.98
        else:
            bias = 'bearish'
            target = current_price - abs(current_price - line_at_current)
            stop = line_at_current * 1.02
        
        rr = self.calculate_risk_reward(current_price, target, stop)
        confidence = self.calculate_confidence(line['r_squared'], 0.7, 0.6, 0.7, 0.6)
        
        start_time = int(df.iloc[start_idx]['timestamp'].timestamp() * 1000) if hasattr(df.iloc[start_idx]['timestamp'], 'timestamp') else int(df.iloc[start_idx]['timestamp'])
        end_time = int(df.iloc[end_idx]['timestamp'].timestamp() * 1000) if hasattr(df.iloc[end_idx]['timestamp'], 'timestamp') else int(df.iloc[end_idx]['timestamp'])
        
        pattern_name = f"{line_type.title()} Trendline"
        
        self.patterns.append(PatternResult(
            pattern_id=self.generate_pattern_id(pattern_name, start_idx),
            name=pattern_name,
            category='trendlines',
            type=bias,
            confidence=confidence,
            strength=self.classify_strength(confidence),
            entry_price=current_price,
            target_price=target,
            stop_loss=stop,
            risk_reward=rr,
            start_index=start_idx,
            end_index=end_idx,
            start_time=start_time,
            end_time=end_time,
            trendlines=[{
                'type': line_type,
                'coords': self.generate_trendline_coords(line, start_idx, end_idx, df)
            }],
            completion_percentage=100.0
        ))
