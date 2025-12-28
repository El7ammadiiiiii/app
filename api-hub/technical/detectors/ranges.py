# ═══════════════════════════════════════════════════════════════
# RANGES DETECTOR
# ═══════════════════════════════════════════════════════════════

import numpy as np
import pandas as pd
from typing import List
from .base_detector import BaseDetector, PatternResult


class RangesDetector(BaseDetector):
    """Detect range-bound patterns"""
    
    def detect(self, df: pd.DataFrame, timeframe: str) -> List[PatternResult]:
        self.patterns = []
        
        if len(df) < 20:
            return self.patterns
        
        for window in [20, 40, 60]:
            if len(df) < window:
                continue
            
            for start in range(0, len(df) - window, window // 4):
                end = start + window
                self._detect_range(df, start, end, timeframe)
        
        return self.patterns
    
    def _detect_range(self, df: pd.DataFrame, start: int, end: int, timeframe: str):
        window_data = df.iloc[start:end]
        
        high_max = window_data['high'].max()
        low_min = window_data['low'].min()
        range_size = high_max - low_min
        avg_price = (high_max + low_min) / 2
        
        # Check if range-bound (less than 5% range)
        if range_size / avg_price > 0.05:
            return
        
        # Count touches to resistance/support
        resistance_touches = sum(1 for h in window_data['high'] if h > high_max * 0.995)
        support_touches = sum(1 for l in window_data['low'] if l < low_min * 1.005)
        
        if resistance_touches < 2 or support_touches < 2:
            return
        
        current_price = df['close'].iloc[end - 1]
        
        # Determine breakout direction based on position
        if current_price > avg_price:
            bias = 'bullish'
            target = high_max + range_size
            stop = low_min
        else:
            bias = 'bearish'
            target = low_min - range_size
            stop = high_max
        
        rr = self.calculate_risk_reward(current_price, target, stop)
        confidence = self.calculate_confidence(0.7, 0.75, 0.6, 0.65, 0.6)
        
        start_time = int(df.iloc[start]['timestamp'].timestamp() * 1000) if hasattr(df.iloc[start]['timestamp'], 'timestamp') else int(df.iloc[start]['timestamp'])
        end_time = int(df.iloc[end-1]['timestamp'].timestamp() * 1000) if hasattr(df.iloc[end-1]['timestamp'], 'timestamp') else int(df.iloc[end-1]['timestamp'])
        
        self.patterns.append(PatternResult(
            pattern_id=self.generate_pattern_id('trading_range', start),
            name='Trading Range',
            category='ranges',
            type=bias,
            confidence=confidence,
            strength=self.classify_strength(confidence),
            entry_price=current_price,
            target_price=target,
            stop_loss=stop,
            risk_reward=rr,
            start_index=start,
            end_index=end,
            start_time=start_time,
            end_time=end_time,
            zones=[{
                'type': 'range',
                'top': high_max,
                'bottom': low_min,
                'start': start,
                'end': end
            }],
            completion_percentage=70.0
        ))
