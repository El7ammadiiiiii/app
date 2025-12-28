# ═══════════════════════════════════════════════════════════════
# BASE DETECTOR - 5-Layer Precision Architecture
# ═══════════════════════════════════════════════════════════════
# Layer 1: Multi-Resolution Pivot Detection (MRPD)
# Layer 2: RANSAC Trendline Fitting
# Layer 3: Touch Point Validation (0.2% tolerance)
# Layer 4: Pattern Classification & Scoring
# Layer 5: Pixel-Perfect Rendering Coordinates
# ═══════════════════════════════════════════════════════════════

import numpy as np
import pandas as pd
from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Optional, Any
from abc import ABC, abstractmethod
from scipy import stats
from sklearn.linear_model import RANSACRegressor


@dataclass
class PatternResult:
    """Pattern detection result with full rendering data"""
    pattern_id: str
    name: str
    category: str
    type: str  # bullish, bearish, neutral
    confidence: float  # 0-100
    strength: str  # weak, moderate, strong
    
    # Price targets
    entry_price: float
    target_price: float
    stop_loss: float
    risk_reward: float
    
    # Time coordinates
    start_index: int
    end_index: int
    start_time: int
    end_time: int
    
    # Rendering coordinates for pixel-perfect drawing
    trendlines: List[Dict] = field(default_factory=list)
    key_points: List[Dict] = field(default_factory=list)
    zones: List[Dict] = field(default_factory=list)
    
    # Additional metadata
    volume_confirmation: bool = False
    breakout_confirmed: bool = False
    completion_percentage: float = 0.0
    
    def to_dict(self) -> Dict:
        """Convert to JSON-serializable dict"""
        return {
            'id': self.pattern_id,
            'name': self.name,
            'category': self.category,
            'type': self.type,
            'confidence': round(float(self.confidence), 2),
            'strength': self.strength,
            'entry': round(float(self.entry_price), 8),
            'target': round(float(self.target_price), 8),
            'stopLoss': round(float(self.stop_loss), 8),
            'riskReward': round(float(self.risk_reward), 2),
            'startIndex': int(self.start_index),
            'endIndex': int(self.end_index),
            'startTime': int(self.start_time),
            'endTime': int(self.end_time),
            'trendlines': self.trendlines,
            'keyPoints': self.key_points,
            'zones': self.zones,
            'volumeConfirmation': bool(self.volume_confirmation),
            'breakoutConfirmed': bool(self.breakout_confirmed),
            'completion': round(float(self.completion_percentage), 1)
        }


class BaseDetector(ABC):
    """
    5-Layer Precision Pattern Detection Base Class
    Surpassing global analysis platforms with pixel-perfect accuracy
    """
    
    # Detection parameters
    TOUCH_TOLERANCE = 0.002  # 0.2% tolerance for touch validation
    MIN_TOUCHES = 2
    MIN_PATTERN_BARS = 10
    MAX_PATTERN_BARS = 500
    
    # Scoring weights
    WEIGHT_LINE_QUALITY = 0.30
    WEIGHT_GEOMETRIC = 0.25
    WEIGHT_VOLUME = 0.20
    WEIGHT_POSITION = 0.15
    WEIGHT_CONTEXT = 0.10
    
    def __init__(self):
        self.patterns: List[PatternResult] = []
    
    @abstractmethod
    def detect(self, df: pd.DataFrame, timeframe: str) -> List[PatternResult]:
        """Detect patterns in the given DataFrame"""
        pass
    
    # ═══════════════════════════════════════════════════════════════
    # LAYER 1: Multi-Resolution Pivot Detection (MRPD)
    # ═══════════════════════════════════════════════════════════════
    
    def detect_pivots(self, df: pd.DataFrame, window: int = 5) -> Tuple[np.ndarray, np.ndarray]:
        """
        Detect pivot highs and lows with multi-resolution analysis
        Returns: (pivot_highs, pivot_lows) as boolean arrays
        """
        highs = df['high'].values
        lows = df['low'].values
        n = len(df)
        
        pivot_highs = np.zeros(n, dtype=bool)
        pivot_lows = np.zeros(n, dtype=bool)
        
        for i in range(window, n - window):
            # Check pivot high
            if highs[i] == max(highs[i-window:i+window+1]):
                pivot_highs[i] = True
            
            # Check pivot low
            if lows[i] == min(lows[i-window:i+window+1]):
                pivot_lows[i] = True
        
        return pivot_highs, pivot_lows
    
    def get_pivot_points(self, df: pd.DataFrame, pivot_mask: np.ndarray, 
                         price_col: str = 'high') -> List[Tuple[int, float]]:
        """Get list of (index, price) for pivot points"""
        indices = np.where(pivot_mask)[0]
        prices = df[price_col].values
        return [(int(i), float(prices[i])) for i in indices]
    
    # ═══════════════════════════════════════════════════════════════
    # LAYER 2: RANSAC Trendline Fitting
    # ═══════════════════════════════════════════════════════════════
    
    def fit_trendline_ransac(self, points: List[Tuple[int, float]], 
                              min_samples: int = 2) -> Optional[Dict]:
        """
        Fit trendline using RANSAC for robust regression
        Returns: {slope, intercept, r_squared, inliers}
        """
        if len(points) < min_samples:
            return None
        
        X = np.array([[p[0]] for p in points])
        y = np.array([p[1] for p in points])
        
        try:
            ransac = RANSACRegressor(min_samples=min_samples, random_state=42)
            ransac.fit(X, y)
            
            slope = float(ransac.estimator_.coef_[0])
            intercept = float(ransac.estimator_.intercept_)
            
            # Calculate R-squared
            y_pred = ransac.predict(X)
            ss_res = np.sum((y - y_pred) ** 2)
            ss_tot = np.sum((y - np.mean(y)) ** 2)
            r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0
            
            return {
                'slope': slope,
                'intercept': intercept,
                'r_squared': max(0, r_squared),
                'inliers': ransac.inlier_mask_.tolist()
            }
        except Exception:
            # Fallback to simple linear regression
            return self.fit_trendline_simple(points)
    
    def fit_trendline_simple(self, points: List[Tuple[int, float]]) -> Optional[Dict]:
        """Simple linear regression fallback"""
        if len(points) < 2:
            return None
        
        X = np.array([p[0] for p in points])
        y = np.array([p[1] for p in points])
        
        slope, intercept, r_value, _, _ = stats.linregress(X, y)
        
        return {
            'slope': float(slope),
            'intercept': float(intercept),
            'r_squared': float(r_value ** 2),
            'inliers': [True] * len(points)
        }
    
    def get_trendline_value(self, line: Dict, index: int) -> float:
        """Get the y-value of a trendline at given index"""
        return line['slope'] * index + line['intercept']
    
    # ═══════════════════════════════════════════════════════════════
    # LAYER 3: Touch Point Validation
    # ═══════════════════════════════════════════════════════════════
    
    def validate_touches(self, df: pd.DataFrame, line: Dict, 
                         use_high: bool = True) -> List[int]:
        """
        Validate touch points with 0.2% tolerance
        Returns list of indices that touch the trendline
        """
        touches = []
        prices = df['high'].values if use_high else df['low'].values
        
        for i in range(len(df)):
            line_value = self.get_trendline_value(line, i)
            price = prices[i]
            
            # Check if price touches within tolerance
            tolerance = line_value * self.TOUCH_TOLERANCE
            if abs(price - line_value) <= tolerance:
                touches.append(i)
        
        return touches
    
    def count_valid_touches(self, df: pd.DataFrame, line: Dict,
                           use_high: bool = True) -> int:
        """Count number of valid touches"""
        return len(self.validate_touches(df, line, use_high))
    
    # ═══════════════════════════════════════════════════════════════
    # LAYER 4: Pattern Classification & Scoring
    # ═══════════════════════════════════════════════════════════════
    
    def calculate_confidence(self, 
                            line_quality: float,
                            geometric_score: float,
                            volume_score: float,
                            position_score: float,
                            context_score: float) -> float:
        """
        Calculate weighted confidence score (0-100)
        """
        score = (
            line_quality * self.WEIGHT_LINE_QUALITY +
            geometric_score * self.WEIGHT_GEOMETRIC +
            volume_score * self.WEIGHT_VOLUME +
            position_score * self.WEIGHT_POSITION +
            context_score * self.WEIGHT_CONTEXT
        )
        return min(100, max(0, score * 100))
    
    def classify_strength(self, confidence: float) -> str:
        """Classify pattern strength based on confidence"""
        if confidence >= 80:
            return 'strong'
        elif confidence >= 60:
            return 'moderate'
        return 'weak'
    
    def calculate_line_quality(self, line: Dict, touch_count: int) -> float:
        """Score based on R² and touch count"""
        r_squared = line.get('r_squared', 0)
        touch_score = min(1.0, touch_count / 5)  # Max at 5 touches
        return (r_squared * 0.6 + touch_score * 0.4)
    
    def calculate_volume_score(self, df: pd.DataFrame, 
                               start_idx: int, end_idx: int) -> float:
        """Analyze volume pattern for confirmation"""
        if 'volume' not in df.columns:
            return 0.5  # Neutral if no volume
        
        volumes = df['volume'].values[start_idx:end_idx+1]
        if len(volumes) < 2:
            return 0.5
        
        # Check for volume trend
        avg_first_half = np.mean(volumes[:len(volumes)//2])
        avg_second_half = np.mean(volumes[len(volumes)//2:])
        
        if avg_second_half > avg_first_half * 1.2:
            return 0.8  # Increasing volume
        elif avg_second_half < avg_first_half * 0.8:
            return 0.6  # Decreasing volume
        return 0.5
    
    # ═══════════════════════════════════════════════════════════════
    # LAYER 5: Pixel-Perfect Rendering Coordinates
    # ═══════════════════════════════════════════════════════════════
    
    def generate_trendline_coords(self, line: Dict, start_idx: int, 
                                   end_idx: int, df: pd.DataFrame) -> Dict:
        """Generate precise coordinates for trendline rendering"""
        start_price = self.get_trendline_value(line, start_idx)
        end_price = self.get_trendline_value(line, end_idx)
        
        return {
            'start': {
                'x': int(start_idx),
                'y': round(start_price, 8),
                'time': int(df.index[start_idx].timestamp() * 1000) if hasattr(df.index[start_idx], 'timestamp') else int(start_idx)
            },
            'end': {
                'x': int(end_idx),
                'y': round(end_price, 8),
                'time': int(df.index[end_idx].timestamp() * 1000) if hasattr(df.index[end_idx], 'timestamp') else int(end_idx)
            },
            'slope': round(line['slope'], 10),
            'angle': round(np.degrees(np.arctan(line['slope'])), 2)
        }
    
    def generate_zone_coords(self, top_price: float, bottom_price: float,
                             start_idx: int, end_idx: int, df: pd.DataFrame) -> Dict:
        """Generate coordinates for zone/rectangle rendering"""
        return {
            'topLeft': {'x': int(start_idx), 'y': round(top_price, 8)},
            'topRight': {'x': int(end_idx), 'y': round(top_price, 8)},
            'bottomLeft': {'x': int(start_idx), 'y': round(bottom_price, 8)},
            'bottomRight': {'x': int(end_idx), 'y': round(bottom_price, 8)},
            'height': round(top_price - bottom_price, 8),
            'width': end_idx - start_idx
        }
    
    def generate_point_coord(self, idx: int, price: float, 
                             df: pd.DataFrame, label: str = '') -> Dict:
        """Generate coordinate for a single point"""
        return {
            'x': int(idx),
            'y': round(price, 8),
            'time': int(df.index[idx].timestamp() * 1000) if hasattr(df.index[idx], 'timestamp') else int(idx),
            'label': label
        }
    
    # ═══════════════════════════════════════════════════════════════
    # Utility Methods
    # ═══════════════════════════════════════════════════════════════
    
    def calculate_target(self, entry: float, pattern_height: float, 
                        is_bullish: bool, multiplier: float = 1.0) -> float:
        """Calculate price target based on pattern height"""
        move = pattern_height * multiplier
        return entry + move if is_bullish else entry - move
    
    def calculate_stop_loss(self, entry: float, pattern_height: float,
                           is_bullish: bool, factor: float = 0.5) -> float:
        """Calculate stop loss based on pattern"""
        buffer = pattern_height * factor
        return entry - buffer if is_bullish else entry + buffer
    
    def calculate_risk_reward(self, entry: float, target: float, 
                              stop_loss: float) -> float:
        """Calculate risk/reward ratio"""
        risk = abs(entry - stop_loss)
        reward = abs(target - entry)
        return reward / risk if risk > 0 else 0
    
    def generate_pattern_id(self, name: str, start_idx: int) -> str:
        """Generate unique pattern ID"""
        import hashlib
        data = f"{name}_{start_idx}_{pd.Timestamp.now().timestamp()}"
        return hashlib.md5(data.encode()).hexdigest()[:12]
