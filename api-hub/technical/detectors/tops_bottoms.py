# ═══════════════════════════════════════════════════════════════
# TOPS & BOTTOMS DETECTOR
# ═══════════════════════════════════════════════════════════════

import numpy as np
import pandas as pd
from typing import List
from .base_detector import BaseDetector, PatternResult


class TopsBottomsDetector(BaseDetector):
    """Detect double/triple tops and bottoms"""
    
    def detect(self, df: pd.DataFrame, timeframe: str) -> List[PatternResult]:
        self.patterns = []
        
        if len(df) < 30:
            return self.patterns
        
        pivot_highs, pivot_lows = self.detect_pivots(df, window=5)
        high_points = self.get_pivot_points(df, pivot_highs, 'high')
        low_points = self.get_pivot_points(df, pivot_lows, 'low')
        
        # Detect double/triple tops
        self._detect_tops(df, high_points, timeframe)
        
        # Detect double/triple bottoms
        self._detect_bottoms(df, low_points, timeframe)
        
        return self.patterns
    
    def _detect_tops(self, df: pd.DataFrame, high_points: List, timeframe: str):
        if len(high_points) < 2:
            return
        
        tolerance = 0.02  # 2% tolerance for equal highs
        
        for i in range(len(high_points) - 1):
            idx1, price1 = high_points[i]
            
            for j in range(i + 1, min(i + 5, len(high_points))):
                idx2, price2 = high_points[j]
                
                # Check if prices are similar
                if abs(price1 - price2) / price1 < tolerance:
                    # Double top found
                    pattern_type = 'double_top'
                    
                    # Find neckline (lowest point between)
                    between_data = df.iloc[idx1:idx2+1]
                    neckline = between_data['low'].min()
                    
                    entry = df['close'].iloc[min(idx2 + 5, len(df) - 1)]
                    height = price1 - neckline
                    target = neckline - height
                    stop = price1 * 1.01
                    rr = self.calculate_risk_reward(entry, target, stop)
                    
                    confidence = self.calculate_confidence(0.75, 0.8, 0.65, 0.7, 0.6)
                    
                    start_time = int(df.iloc[idx1]['timestamp'].timestamp() * 1000) if hasattr(df.iloc[idx1]['timestamp'], 'timestamp') else int(df.iloc[idx1]['timestamp'])
                    end_time = int(df.iloc[idx2]['timestamp'].timestamp() * 1000) if hasattr(df.iloc[idx2]['timestamp'], 'timestamp') else int(df.iloc[idx2]['timestamp'])
                    
                    self.patterns.append(PatternResult(
                        pattern_id=self.generate_pattern_id(pattern_type, idx1),
                        name='Double Top',
                        category='tops_bottoms',
                        type='bearish',
                        confidence=confidence,
                        strength=self.classify_strength(confidence),
                        entry_price=entry,
                        target_price=target,
                        stop_loss=stop,
                        risk_reward=rr,
                        start_index=idx1,
                        end_index=idx2,
                        start_time=start_time,
                        end_time=end_time,
                        key_points=[
                            {'label': 'Top 1', 'x': idx1, 'y': price1},
                            {'label': 'Top 2', 'x': idx2, 'y': price2},
                            {'label': 'Neckline', 'x': (idx1+idx2)//2, 'y': neckline}
                        ],
                        completion_percentage=85.0
                    ))
    
    def _detect_bottoms(self, df: pd.DataFrame, low_points: List, timeframe: str):
        if len(low_points) < 2:
            return
        
        tolerance = 0.02
        
        for i in range(len(low_points) - 1):
            idx1, price1 = low_points[i]
            
            for j in range(i + 1, min(i + 5, len(low_points))):
                idx2, price2 = low_points[j]
                
                if abs(price1 - price2) / price1 < tolerance:
                    pattern_type = 'double_bottom'
                    
                    between_data = df.iloc[idx1:idx2+1]
                    neckline = between_data['high'].max()
                    
                    entry = df['close'].iloc[min(idx2 + 5, len(df) - 1)]
                    height = neckline - price1
                    target = neckline + height
                    stop = price1 * 0.99
                    rr = self.calculate_risk_reward(entry, target, stop)
                    
                    confidence = self.calculate_confidence(0.75, 0.8, 0.65, 0.7, 0.6)
                    
                    start_time = int(df.iloc[idx1]['timestamp'].timestamp() * 1000) if hasattr(df.iloc[idx1]['timestamp'], 'timestamp') else int(df.iloc[idx1]['timestamp'])
                    end_time = int(df.iloc[idx2]['timestamp'].timestamp() * 1000) if hasattr(df.iloc[idx2]['timestamp'], 'timestamp') else int(df.iloc[idx2]['timestamp'])
                    
                    self.patterns.append(PatternResult(
                        pattern_id=self.generate_pattern_id(pattern_type, idx1),
                        name='Double Bottom',
                        category='tops_bottoms',
                        type='bullish',
                        confidence=confidence,
                        strength=self.classify_strength(confidence),
                        entry_price=entry,
                        target_price=target,
                        stop_loss=stop,
                        risk_reward=rr,
                        start_index=idx1,
                        end_index=idx2,
                        start_time=start_time,
                        end_time=end_time,
                        key_points=[
                            {'label': 'Bottom 1', 'x': idx1, 'y': price1},
                            {'label': 'Bottom 2', 'x': idx2, 'y': price2},
                            {'label': 'Neckline', 'x': (idx1+idx2)//2, 'y': neckline}
                        ],
                        completion_percentage=85.0
                    ))
