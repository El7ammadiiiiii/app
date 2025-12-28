# ═══════════════════════════════════════════════════════════════
# LIQUIDITY DETECTOR - Smart Money Concepts
# ═══════════════════════════════════════════════════════════════

import numpy as np
import pandas as pd
from typing import List
from .base_detector import BaseDetector, PatternResult


class LiquidityDetector(BaseDetector):
    """Detect liquidity zones and sweeps"""
    
    def detect(self, df: pd.DataFrame, timeframe: str) -> List[PatternResult]:
        self.patterns = []
        
        if len(df) < 30:
            return self.patterns
        
        # Find equal highs/lows (liquidity pools)
        self._find_equal_highs(df, timeframe)
        self._find_equal_lows(df, timeframe)
        
        # Find liquidity sweeps
        self._find_sweeps(df, timeframe)
        
        return self.patterns
    
    def _find_equal_highs(self, df: pd.DataFrame, timeframe: str):
        pivot_highs, _ = self.detect_pivots(df, window=5)
        high_points = self.get_pivot_points(df, pivot_highs, 'high')
        
        if len(high_points) < 2:
            return
        
        tolerance = 0.003  # 0.3% tolerance
        
        for i in range(len(high_points) - 1):
            idx1, price1 = high_points[i]
            
            for j in range(i + 1, len(high_points)):
                idx2, price2 = high_points[j]
                
                if abs(price1 - price2) / price1 < tolerance:
                    # Equal highs = liquidity above
                    level_price = (price1 + price2) / 2
                    current = df['close'].iloc[-1]
                    
                    start_time = int(df.iloc[idx1]['timestamp'].timestamp() * 1000) if hasattr(df.iloc[idx1]['timestamp'], 'timestamp') else int(df.iloc[idx1]['timestamp'])
                    end_time = int(df.iloc[idx2]['timestamp'].timestamp() * 1000) if hasattr(df.iloc[idx2]['timestamp'], 'timestamp') else int(df.iloc[idx2]['timestamp'])
                    
                    self.patterns.append(PatternResult(
                        pattern_id=self.generate_pattern_id('liquidity_above', idx1),
                        name='Liquidity Pool (Above)',
                        category='liquidity',
                        type='neutral',
                        confidence=70.0,
                        strength='moderate',
                        entry_price=current,
                        target_price=level_price * 1.01,
                        stop_loss=current * 0.98,
                        risk_reward=1.5,
                        start_index=idx1,
                        end_index=idx2,
                        start_time=start_time,
                        end_time=end_time,
                        zones=[{'type': 'liquidity_above', 'price': level_price}],
                        completion_percentage=60.0
                    ))
                    break
    
    def _find_equal_lows(self, df: pd.DataFrame, timeframe: str):
        _, pivot_lows = self.detect_pivots(df, window=5)
        low_points = self.get_pivot_points(df, pivot_lows, 'low')
        
        if len(low_points) < 2:
            return
        
        tolerance = 0.003
        
        for i in range(len(low_points) - 1):
            idx1, price1 = low_points[i]
            
            for j in range(i + 1, len(low_points)):
                idx2, price2 = low_points[j]
                
                if abs(price1 - price2) / price1 < tolerance:
                    level_price = (price1 + price2) / 2
                    current = df['close'].iloc[-1]
                    
                    start_time = int(df.iloc[idx1]['timestamp'].timestamp() * 1000) if hasattr(df.iloc[idx1]['timestamp'], 'timestamp') else int(df.iloc[idx1]['timestamp'])
                    end_time = int(df.iloc[idx2]['timestamp'].timestamp() * 1000) if hasattr(df.iloc[idx2]['timestamp'], 'timestamp') else int(df.iloc[idx2]['timestamp'])
                    
                    self.patterns.append(PatternResult(
                        pattern_id=self.generate_pattern_id('liquidity_below', idx1),
                        name='Liquidity Pool (Below)',
                        category='liquidity',
                        type='neutral',
                        confidence=70.0,
                        strength='moderate',
                        entry_price=current,
                        target_price=level_price * 0.99,
                        stop_loss=current * 1.02,
                        risk_reward=1.5,
                        start_index=idx1,
                        end_index=idx2,
                        start_time=start_time,
                        end_time=end_time,
                        zones=[{'type': 'liquidity_below', 'price': level_price}],
                        completion_percentage=60.0
                    ))
                    break
    
    def _find_sweeps(self, df: pd.DataFrame, timeframe: str):
        # Look for wicks that sweep previous highs/lows
        for i in range(20, len(df)):
            recent_high = df['high'].iloc[i-20:i].max()
            recent_low = df['low'].iloc[i-20:i].min()
            
            current = df.iloc[i]
            
            # Bullish sweep (sweep lows then reverse)
            if current['low'] < recent_low and current['close'] > current['open']:
                start_time = int(df.iloc[i-20]['timestamp'].timestamp() * 1000) if hasattr(df.iloc[i-20]['timestamp'], 'timestamp') else int(df.iloc[i-20]['timestamp'])
                end_time = int(df.iloc[i]['timestamp'].timestamp() * 1000) if hasattr(df.iloc[i]['timestamp'], 'timestamp') else int(df.iloc[i]['timestamp'])
                
                self.patterns.append(PatternResult(
                    pattern_id=self.generate_pattern_id('liquidity_sweep', i),
                    name='Liquidity Sweep (Bullish)',
                    category='liquidity',
                    type='bullish',
                    confidence=75.0,
                    strength='strong',
                    entry_price=current['close'],
                    target_price=recent_high,
                    stop_loss=current['low'],
                    risk_reward=2.0,
                    start_index=i-20,
                    end_index=i,
                    start_time=start_time,
                    end_time=end_time,
                    breakout_confirmed=True,
                    completion_percentage=100.0
                ))
