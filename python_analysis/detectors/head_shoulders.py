# ═══════════════════════════════════════════════════════════════
# HEAD & SHOULDERS DETECTOR
# ═══════════════════════════════════════════════════════════════

import numpy as np
import pandas as pd
from typing import List
from .base_detector import BaseDetector, PatternResult


class HeadShouldersDetector(BaseDetector):
    """Detect head and shoulders patterns"""
    
    def detect(self, df: pd.DataFrame, timeframe: str) -> List[PatternResult]:
        self.patterns = []
        
        if len(df) < 40:
            return self.patterns
        
        pivot_highs, pivot_lows = self.detect_pivots(df, window=5)
        high_points = self.get_pivot_points(df, pivot_highs, 'high')
        low_points = self.get_pivot_points(df, pivot_lows, 'low')
        
        # Detect H&S (bearish)
        self._detect_head_shoulders(df, high_points, low_points, timeframe)
        
        # Detect Inverse H&S (bullish)
        self._detect_inverse_head_shoulders(df, low_points, high_points, timeframe)
        
        return self.patterns
    
    def _detect_head_shoulders(self, df: pd.DataFrame, highs: List, lows: List, timeframe: str):
        if len(highs) < 3:
            return
        
        for i in range(len(highs) - 2):
            ls_idx, ls_price = highs[i]      # Left shoulder
            h_idx, h_price = highs[i + 1]    # Head
            rs_idx, rs_price = highs[i + 2]  # Right shoulder
            
            # Head must be higher than shoulders
            if h_price <= ls_price or h_price <= rs_price:
                continue
            
            # Shoulders should be roughly equal
            if abs(ls_price - rs_price) / ls_price > 0.05:
                continue
            
            # Find neckline points
            neckline_points = [(idx, p) for idx, p in lows if ls_idx < idx < rs_idx]
            if len(neckline_points) < 1:
                continue
            
            neckline_price = min(p for _, p in neckline_points)
            
            entry = df['close'].iloc[min(rs_idx + 3, len(df) - 1)]
            height = h_price - neckline_price
            target = neckline_price - height
            stop = h_price * 1.01
            rr = self.calculate_risk_reward(entry, target, stop)
            
            confidence = self.calculate_confidence(0.8, 0.85, 0.7, 0.75, 0.7)
            
            start_time = int(df.iloc[ls_idx]['timestamp'].timestamp() * 1000) if hasattr(df.iloc[ls_idx]['timestamp'], 'timestamp') else int(df.iloc[ls_idx]['timestamp'])
            end_time = int(df.iloc[rs_idx]['timestamp'].timestamp() * 1000) if hasattr(df.iloc[rs_idx]['timestamp'], 'timestamp') else int(df.iloc[rs_idx]['timestamp'])
            
            self.patterns.append(PatternResult(
                pattern_id=self.generate_pattern_id('head_shoulders', ls_idx),
                name='Head & Shoulders',
                category='head_shoulders',
                type='bearish',
                confidence=confidence,
                strength=self.classify_strength(confidence),
                entry_price=entry,
                target_price=target,
                stop_loss=stop,
                risk_reward=rr,
                start_index=ls_idx,
                end_index=rs_idx,
                start_time=start_time,
                end_time=end_time,
                key_points=[
                    {'label': 'Left Shoulder', 'x': ls_idx, 'y': ls_price},
                    {'label': 'Head', 'x': h_idx, 'y': h_price},
                    {'label': 'Right Shoulder', 'x': rs_idx, 'y': rs_price}
                ],
                completion_percentage=90.0
            ))
    
    def _detect_inverse_head_shoulders(self, df: pd.DataFrame, lows: List, highs: List, timeframe: str):
        if len(lows) < 3:
            return
        
        for i in range(len(lows) - 2):
            ls_idx, ls_price = lows[i]
            h_idx, h_price = lows[i + 1]
            rs_idx, rs_price = lows[i + 2]
            
            # Head must be lower
            if h_price >= ls_price or h_price >= rs_price:
                continue
            
            if abs(ls_price - rs_price) / ls_price > 0.05:
                continue
            
            neckline_points = [(idx, p) for idx, p in highs if ls_idx < idx < rs_idx]
            if len(neckline_points) < 1:
                continue
            
            neckline_price = max(p for _, p in neckline_points)
            
            entry = df['close'].iloc[min(rs_idx + 3, len(df) - 1)]
            height = neckline_price - h_price
            target = neckline_price + height
            stop = h_price * 0.99
            rr = self.calculate_risk_reward(entry, target, stop)
            
            confidence = self.calculate_confidence(0.8, 0.85, 0.7, 0.75, 0.7)
            
            start_time = int(df.iloc[ls_idx]['timestamp'].timestamp() * 1000) if hasattr(df.iloc[ls_idx]['timestamp'], 'timestamp') else int(df.iloc[ls_idx]['timestamp'])
            end_time = int(df.iloc[rs_idx]['timestamp'].timestamp() * 1000) if hasattr(df.iloc[rs_idx]['timestamp'], 'timestamp') else int(df.iloc[rs_idx]['timestamp'])
            
            self.patterns.append(PatternResult(
                pattern_id=self.generate_pattern_id('inverse_head_shoulders', ls_idx),
                name='Inverse Head & Shoulders',
                category='head_shoulders',
                type='bullish',
                confidence=confidence,
                strength=self.classify_strength(confidence),
                entry_price=entry,
                target_price=target,
                stop_loss=stop,
                risk_reward=rr,
                start_index=ls_idx,
                end_index=rs_idx,
                start_time=start_time,
                end_time=end_time,
                key_points=[
                    {'label': 'Left Shoulder', 'x': ls_idx, 'y': ls_price},
                    {'label': 'Head', 'x': h_idx, 'y': h_price},
                    {'label': 'Right Shoulder', 'x': rs_idx, 'y': rs_price}
                ],
                completion_percentage=90.0
            ))
