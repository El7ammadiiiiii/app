# ═══════════════════════════════════════════════════════════════
# BREAKOUTS DETECTOR
# ═══════════════════════════════════════════════════════════════

import numpy as np
import pandas as pd
from typing import List
from .base_detector import BaseDetector, PatternResult


class BreakoutsDetector(BaseDetector):
    """Detect breakout patterns"""
    
    def detect(self, df: pd.DataFrame, timeframe: str) -> List[PatternResult]:
        self.patterns = []
        
        if len(df) < 30:
            return self.patterns
        
        # Look for recent breakouts
        lookback = min(50, len(df) - 10)
        
        for i in range(lookback, len(df)):
            self._check_breakout(df, i, timeframe)
        
        return self.patterns
    
    def _check_breakout(self, df: pd.DataFrame, idx: int, timeframe: str):
        lookback = 20
        start = max(0, idx - lookback)
        
        historical_high = df['high'].iloc[start:idx].max()
        historical_low = df['low'].iloc[start:idx].min()
        
        current_close = df['close'].iloc[idx]
        current_high = df['high'].iloc[idx]
        current_low = df['low'].iloc[idx]
        current_volume = df['volume'].iloc[idx] if 'volume' in df.columns else 0
        avg_volume = df['volume'].iloc[start:idx].mean() if 'volume' in df.columns else 0
        
        # Check for bullish breakout
        if current_close > historical_high:
            volume_confirm = current_volume > avg_volume * 1.5 if avg_volume > 0 else False
            
            range_size = historical_high - historical_low
            target = current_close + range_size
            stop = historical_high * 0.98
            rr = self.calculate_risk_reward(current_close, target, stop)
            
            confidence = self.calculate_confidence(0.75, 0.8, 0.9 if volume_confirm else 0.5, 0.7, 0.65)
            
            start_time = int(df.iloc[start]['timestamp'].timestamp() * 1000) if hasattr(df.iloc[start]['timestamp'], 'timestamp') else int(df.iloc[start]['timestamp'])
            end_time = int(df.iloc[idx]['timestamp'].timestamp() * 1000) if hasattr(df.iloc[idx]['timestamp'], 'timestamp') else int(df.iloc[idx]['timestamp'])
            
            self.patterns.append(PatternResult(
                pattern_id=self.generate_pattern_id('bullish_breakout', start),
                name='Bullish Breakout',
                category='breakouts',
                type='bullish',
                confidence=confidence,
                strength=self.classify_strength(confidence),
                entry_price=current_close,
                target_price=target,
                stop_loss=stop,
                risk_reward=rr,
                start_index=start,
                end_index=idx,
                start_time=start_time,
                end_time=end_time,
                volume_confirmation=volume_confirm,
                breakout_confirmed=True,
                completion_percentage=100.0
            ))
        
        # Check for bearish breakout
        elif current_close < historical_low:
            volume_confirm = current_volume > avg_volume * 1.5 if avg_volume > 0 else False
            
            range_size = historical_high - historical_low
            target = current_close - range_size
            stop = historical_low * 1.02
            rr = self.calculate_risk_reward(current_close, target, stop)
            
            confidence = self.calculate_confidence(0.75, 0.8, 0.9 if volume_confirm else 0.5, 0.7, 0.65)
            
            start_time = int(df.iloc[start]['timestamp'].timestamp() * 1000) if hasattr(df.iloc[start]['timestamp'], 'timestamp') else int(df.iloc[start]['timestamp'])
            end_time = int(df.iloc[idx]['timestamp'].timestamp() * 1000) if hasattr(df.iloc[idx]['timestamp'], 'timestamp') else int(df.iloc[idx]['timestamp'])
            
            self.patterns.append(PatternResult(
                pattern_id=self.generate_pattern_id('bearish_breakout', start),
                name='Bearish Breakout',
                category='breakouts',
                type='bearish',
                confidence=confidence,
                strength=self.classify_strength(confidence),
                entry_price=current_close,
                target_price=target,
                stop_loss=stop,
                risk_reward=rr,
                start_index=start,
                end_index=idx,
                start_time=start_time,
                end_time=end_time,
                volume_confirmation=volume_confirm,
                breakout_confirmed=True,
                completion_percentage=100.0
            ))
