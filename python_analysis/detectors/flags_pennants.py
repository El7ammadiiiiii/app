# ═══════════════════════════════════════════════════════════════
# FLAGS & PENNANTS DETECTOR
# ═══════════════════════════════════════════════════════════════

import numpy as np
import pandas as pd
from typing import List
from .base_detector import BaseDetector, PatternResult


class FlagsPennantsDetector(BaseDetector):
    """Detect flag and pennant continuation patterns"""
    
    def detect(self, df: pd.DataFrame, timeframe: str) -> List[PatternResult]:
        self.patterns = []
        
        if len(df) < 30:
            return self.patterns
        
        # Look for strong moves followed by consolidation
        for i in range(20, len(df) - 10):
            # Check for flagpole (strong move)
            pole_start = max(0, i - 15)
            pole_change = (df['close'].iloc[i] - df['close'].iloc[pole_start]) / df['close'].iloc[pole_start]
            
            if abs(pole_change) > 0.03:  # 3% move
                # Look for flag/pennant formation
                flag_end = min(len(df), i + 15)
                self._check_flag_pennant(df, pole_start, i, flag_end, pole_change > 0, timeframe)
        
        return self.patterns
    
    def _check_flag_pennant(self, df: pd.DataFrame, pole_start: int, pole_end: int, 
                            flag_end: int, is_bullish: bool, timeframe: str):
        flag_data = df.iloc[pole_end:flag_end]
        
        if len(flag_data) < 5:
            return
        
        # Check for consolidation
        flag_range = flag_data['high'].max() - flag_data['low'].min()
        pole_range = abs(df['high'].iloc[pole_start:pole_end].max() - df['low'].iloc[pole_start:pole_end].min())
        
        if flag_range > pole_range * 0.5:
            return  # Not a tight consolidation
        
        pattern_type = 'bull_flag' if is_bullish else 'bear_flag'
        bias = 'bullish' if is_bullish else 'bearish'
        
        entry = df['close'].iloc[flag_end - 1]
        target = self.calculate_target(entry, pole_range, is_bullish, 0.8)
        stop = self.calculate_stop_loss(entry, flag_range, is_bullish)
        rr = self.calculate_risk_reward(entry, target, stop)
        
        confidence = self.calculate_confidence(0.7, 0.75, 0.65, 0.7, 0.6)
        
        start_time = int(df.iloc[pole_start]['timestamp'].timestamp() * 1000) if hasattr(df.iloc[pole_start]['timestamp'], 'timestamp') else int(df.iloc[pole_start]['timestamp'])
        end_time = int(df.iloc[flag_end-1]['timestamp'].timestamp() * 1000) if hasattr(df.iloc[flag_end-1]['timestamp'], 'timestamp') else int(df.iloc[flag_end-1]['timestamp'])
        
        self.patterns.append(PatternResult(
            pattern_id=self.generate_pattern_id(pattern_type, pole_start),
            name=pattern_type.replace('_', ' ').title(),
            category='flags_pennants',
            type=bias,
            confidence=confidence,
            strength=self.classify_strength(confidence),
            entry_price=entry,
            target_price=target,
            stop_loss=stop,
            risk_reward=rr,
            start_index=pole_start,
            end_index=flag_end,
            start_time=start_time,
            end_time=end_time,
            completion_percentage=75.0
        ))
