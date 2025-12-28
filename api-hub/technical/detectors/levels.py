# ═══════════════════════════════════════════════════════════════
# LEVELS DETECTOR - Support & Resistance
# ═══════════════════════════════════════════════════════════════

import numpy as np
import pandas as pd
from typing import List
from .base_detector import BaseDetector, PatternResult


class LevelsDetector(BaseDetector):
    """Detect horizontal support and resistance levels"""
    
    def detect(self, df: pd.DataFrame, timeframe: str) -> List[PatternResult]:
        self.patterns = []
        
        if len(df) < 20:
            return self.patterns
        
        pivot_highs, pivot_lows = self.detect_pivots(df, window=5)
        high_points = self.get_pivot_points(df, pivot_highs, 'high')
        low_points = self.get_pivot_points(df, pivot_lows, 'low')
        
        # Find resistance levels
        self._find_levels(df, high_points, 'resistance', timeframe)
        
        # Find support levels
        self._find_levels(df, low_points, 'support', timeframe)
        
        return self.patterns
    
    def _find_levels(self, df: pd.DataFrame, points: List, level_type: str, timeframe: str):
        if len(points) < 2:
            return
        
        prices = [p[1] for p in points]
        tolerance = np.mean(prices) * 0.01  # 1% tolerance
        
        # Cluster similar prices
        clusters = []
        for idx, price in points:
            found = False
            for cluster in clusters:
                if abs(cluster['price'] - price) < tolerance:
                    cluster['touches'].append(idx)
                    cluster['price'] = np.mean([cluster['price'], price])
                    found = True
                    break
            if not found:
                clusters.append({'price': price, 'touches': [idx]})
        
        # Keep clusters with multiple touches
        for cluster in clusters:
            if len(cluster['touches']) < 2:
                continue
            
            level_price = cluster['price']
            current_price = df['close'].iloc[-1]
            
            start_idx = min(cluster['touches'])
            end_idx = max(cluster['touches'])
            
            if level_type == 'support':
                bias = 'bullish'
                target = current_price + (current_price - level_price)
                stop = level_price * 0.98
            else:
                bias = 'bearish'
                target = current_price - (level_price - current_price)
                stop = level_price * 1.02
            
            rr = self.calculate_risk_reward(current_price, target, stop)
            confidence = self.calculate_confidence(0.75, 0.7 + len(cluster['touches']) * 0.05, 0.6, 0.7, 0.6)
            
            start_time = int(df.iloc[start_idx]['timestamp'].timestamp() * 1000) if hasattr(df.iloc[start_idx]['timestamp'], 'timestamp') else int(df.iloc[start_idx]['timestamp'])
            end_time = int(df.iloc[end_idx]['timestamp'].timestamp() * 1000) if hasattr(df.iloc[end_idx]['timestamp'], 'timestamp') else int(df.iloc[end_idx]['timestamp'])
            
            self.patterns.append(PatternResult(
                pattern_id=self.generate_pattern_id(f'{level_type}_level', start_idx),
                name=f"{level_type.title()} Level",
                category='levels',
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
                zones=[{
                    'type': level_type,
                    'price': level_price,
                    'touches': len(cluster['touches'])
                }],
                completion_percentage=100.0
            ))
