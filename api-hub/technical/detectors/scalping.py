# ═══════════════════════════════════════════════════════════════
# SCALPING DETECTOR - Short-term Patterns
# ═══════════════════════════════════════════════════════════════

import numpy as np
import pandas as pd
from typing import List
from .base_detector import BaseDetector, PatternResult


class ScalpingDetector(BaseDetector):
    """Detect scalping patterns for short-term trading"""
    
    def detect(self, df: pd.DataFrame, timeframe: str) -> List[PatternResult]:
        self.patterns = []
        
        if len(df) < 15:
            return self.patterns
        
        # Detect momentum patterns
        self._detect_momentum(df, timeframe)
        
        # Detect reversal candles
        self._detect_reversal_candles(df, timeframe)
        
        return self.patterns
    
    def _detect_momentum(self, df: pd.DataFrame, timeframe: str):
        # Look for 3 consecutive strong candles
        for i in range(3, len(df)):
            candles = df.iloc[i-3:i]
            
            # All bullish
            all_bullish = all(c['close'] > c['open'] for _, c in candles.iterrows())
            # All bearish
            all_bearish = all(c['close'] < c['open'] for _, c in candles.iterrows())
            
            if not (all_bullish or all_bearish):
                continue
            
            # Check momentum strength
            total_move = abs(df['close'].iloc[i-1] - df['open'].iloc[i-3])
            avg_candle = total_move / 3
            
            if avg_candle / df['close'].iloc[i-1] < 0.002:  # Less than 0.2% per candle
                continue
            
            current = df['close'].iloc[i-1]
            
            if all_bullish:
                pattern_type = 'bullish_momentum'
                bias = 'bullish'
                target = current * 1.01
                stop = df['low'].iloc[i-3:i].min()
            else:
                pattern_type = 'bearish_momentum'
                bias = 'bearish'
                target = current * 0.99
                stop = df['high'].iloc[i-3:i].max()
            
            rr = self.calculate_risk_reward(current, target, stop)
            
            start_time = int(df.iloc[i-3]['timestamp'].timestamp() * 1000) if hasattr(df.iloc[i-3]['timestamp'], 'timestamp') else int(df.iloc[i-3]['timestamp'])
            end_time = int(df.iloc[i-1]['timestamp'].timestamp() * 1000) if hasattr(df.iloc[i-1]['timestamp'], 'timestamp') else int(df.iloc[i-1]['timestamp'])
            
            self.patterns.append(PatternResult(
                pattern_id=self.generate_pattern_id(pattern_type, i-3),
                name=pattern_type.replace('_', ' ').title(),
                category='scalping',
                type=bias,
                confidence=65.0,
                strength='moderate',
                entry_price=current,
                target_price=target,
                stop_loss=stop,
                risk_reward=rr,
                start_index=i-3,
                end_index=i-1,
                start_time=start_time,
                end_time=end_time,
                completion_percentage=100.0
            ))
    
    def _detect_reversal_candles(self, df: pd.DataFrame, timeframe: str):
        for i in range(5, len(df)):
            current = df.iloc[i-1]
            prev = df.iloc[i-2]
            
            body = abs(current['close'] - current['open'])
            upper_wick = current['high'] - max(current['close'], current['open'])
            lower_wick = min(current['close'], current['open']) - current['low']
            
            # Hammer (bullish reversal)
            if lower_wick > body * 2 and upper_wick < body * 0.5:
                # Check if in downtrend
                if df['close'].iloc[i-5] > df['close'].iloc[i-2]:
                    start_time = int(df.iloc[i-5]['timestamp'].timestamp() * 1000) if hasattr(df.iloc[i-5]['timestamp'], 'timestamp') else int(df.iloc[i-5]['timestamp'])
                    end_time = int(df.iloc[i-1]['timestamp'].timestamp() * 1000) if hasattr(df.iloc[i-1]['timestamp'], 'timestamp') else int(df.iloc[i-1]['timestamp'])
                    
                    self.patterns.append(PatternResult(
                        pattern_id=self.generate_pattern_id('hammer', i-1),
                        name='Hammer',
                        category='scalping',
                        type='bullish',
                        confidence=68.0,
                        strength='moderate',
                        entry_price=current['close'],
                        target_price=current['close'] * 1.015,
                        stop_loss=current['low'],
                        risk_reward=1.5,
                        start_index=i-5,
                        end_index=i-1,
                        start_time=start_time,
                        end_time=end_time,
                        completion_percentage=100.0
                    ))
            
            # Shooting star (bearish reversal)
            if upper_wick > body * 2 and lower_wick < body * 0.5:
                if df['close'].iloc[i-5] < df['close'].iloc[i-2]:
                    start_time = int(df.iloc[i-5]['timestamp'].timestamp() * 1000) if hasattr(df.iloc[i-5]['timestamp'], 'timestamp') else int(df.iloc[i-5]['timestamp'])
                    end_time = int(df.iloc[i-1]['timestamp'].timestamp() * 1000) if hasattr(df.iloc[i-1]['timestamp'], 'timestamp') else int(df.iloc[i-1]['timestamp'])
                    
                    self.patterns.append(PatternResult(
                        pattern_id=self.generate_pattern_id('shooting_star', i-1),
                        name='Shooting Star',
                        category='scalping',
                        type='bearish',
                        confidence=68.0,
                        strength='moderate',
                        entry_price=current['close'],
                        target_price=current['close'] * 0.985,
                        stop_loss=current['high'],
                        risk_reward=1.5,
                        start_index=i-5,
                        end_index=i-1,
                        start_time=start_time,
                        end_time=end_time,
                        completion_percentage=100.0
                    ))
