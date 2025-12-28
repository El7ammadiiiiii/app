# ═══════════════════════════════════════════════════════════════
# NEXUS Technical Analysis - Configuration
# ═══════════════════════════════════════════════════════════════

from dataclasses import dataclass, field
from typing import Dict, List, Optional
from enum import Enum


class IndicatorCategory(Enum):
    """Categories of technical indicators"""
    TREND = "trend"
    MOMENTUM = "momentum"
    VOLATILITY = "volatility"
    VOLUME = "volume"
    OVERLAP = "overlap"
    PATTERN = "pattern"


@dataclass
class IndicatorConfig:
    """Configuration for a single indicator"""
    name: str
    enabled: bool = False
    params: Dict = field(default_factory=dict)
    color: str = "#ffffff"
    line_width: int = 1
    category: IndicatorCategory = IndicatorCategory.TREND


@dataclass
class ChartConfig:
    """Main chart configuration"""
    
    # ═══════════════════════════════════════════════════════════════
    # OVERLAY INDICATORS (on main chart)
    # ═══════════════════════════════════════════════════════════════
    
    # Supertrend
    supertrend: IndicatorConfig = field(default_factory=lambda: IndicatorConfig(
        name="Supertrend",
        enabled=False,
        params={"length": 10, "multiplier": 3.0},
        color="#00ff00",
        category=IndicatorCategory.TREND
    ))
    
    # Bollinger Bands
    bollinger_bands: IndicatorConfig = field(default_factory=lambda: IndicatorConfig(
        name="Bollinger Bands",
        enabled=False,
        params={"length": 20, "std": 2.0},
        color="#ffd700",
        category=IndicatorCategory.VOLATILITY
    ))
    
    # ═══════════════════════════════════════════════════════════════
    # STANDARD MOVING AVERAGES (SMA)
    # ═══════════════════════════════════════════════════════════════
    
    sma10: IndicatorConfig = field(default_factory=lambda: IndicatorConfig(
        name="SMA10",
        enabled=False,
        params={"length": 10},
        color="#ff6b6b",
        category=IndicatorCategory.OVERLAP
    ))
    
    sma25: IndicatorConfig = field(default_factory=lambda: IndicatorConfig(
        name="SMA25",
        enabled=False,
        params={"length": 25},
        color="#ffa726",
        category=IndicatorCategory.OVERLAP
    ))
    
    sma50: IndicatorConfig = field(default_factory=lambda: IndicatorConfig(
        name="SMA50",
        enabled=False,
        params={"length": 50},
        color="#ffee58",
        category=IndicatorCategory.OVERLAP
    ))
    
    sma100: IndicatorConfig = field(default_factory=lambda: IndicatorConfig(
        name="SMA100",
        enabled=False,
        params={"length": 100},
        color="#66bb6a",
        category=IndicatorCategory.OVERLAP
    ))
    
    sma200: IndicatorConfig = field(default_factory=lambda: IndicatorConfig(
        name="SMA200",
        enabled=False,
        params={"length": 200},
        color="#42a5f5",
        category=IndicatorCategory.OVERLAP
    ))
    
    # ═══════════════════════════════════════════════════════════════
    # EXPONENTIAL MOVING AVERAGES (EMA)
    # ═══════════════════════════════════════════════════════════════
    
    ema10: IndicatorConfig = field(default_factory=lambda: IndicatorConfig(
        name="EMA10",
        enabled=False,
        params={"length": 10},
        color="#ef5350",
        category=IndicatorCategory.OVERLAP
    ))
    
    ema25: IndicatorConfig = field(default_factory=lambda: IndicatorConfig(
        name="EMA25",
        enabled=False,
        params={"length": 25},
        color="#ff7043",
        category=IndicatorCategory.OVERLAP
    ))
    
    ema50: IndicatorConfig = field(default_factory=lambda: IndicatorConfig(
        name="EMA50",
        enabled=False,
        params={"length": 50},
        color="#ffca28",
        category=IndicatorCategory.OVERLAP
    ))
    
    ema100: IndicatorConfig = field(default_factory=lambda: IndicatorConfig(
        name="EMA100",
        enabled=False,
        params={"length": 100},
        color="#26a69a",
        category=IndicatorCategory.OVERLAP
    ))
    
    ema200: IndicatorConfig = field(default_factory=lambda: IndicatorConfig(
        name="EMA200",
        enabled=False,
        params={"length": 200},
        color="#29b6f6",
        category=IndicatorCategory.OVERLAP
    ))
    
    # ═══════════════════════════════════════════════════════════════
    # TRENDLINES & LEVELS
    # ═══════════════════════════════════════════════════════════════
    
    trendlines: IndicatorConfig = field(default_factory=lambda: IndicatorConfig(
        name="Trendlines",
        enabled=False,
        params={"sensitivity": 3, "min_touches": 2},
        color="#9c27b0",
        category=IndicatorCategory.TREND
    ))
    
    horizontal_levels: IndicatorConfig = field(default_factory=lambda: IndicatorConfig(
        name="Horizontal Levels",
        enabled=False,
        params={"num_levels": 5, "lookback": 100},
        color="#00bcd4",
        category=IndicatorCategory.TREND
    ))
    
    fibonacci_retracements: IndicatorConfig = field(default_factory=lambda: IndicatorConfig(
        name="Fibonacci Retracements",
        enabled=False,
        params={"levels": [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0]},
        color="#e91e63",
        category=IndicatorCategory.TREND
    ))
    
    vertical_resistance: IndicatorConfig = field(default_factory=lambda: IndicatorConfig(
        name="Vertical Resistance",
        enabled=False,
        params={"sensitivity": 0.5},
        color="#f44336",
        category=IndicatorCategory.TREND
    ))
    
    vertical_support: IndicatorConfig = field(default_factory=lambda: IndicatorConfig(
        name="Vertical Support",
        enabled=False,
        params={"sensitivity": 0.5},
        color="#4caf50",
        category=IndicatorCategory.TREND
    ))


# ═══════════════════════════════════════════════════════════════
# PATTERN CONFIGURATIONS
# ═══════════════════════════════════════════════════════════════

@dataclass
class PatternConfig:
    """Configuration for chart patterns"""
    
    # Bullish Patterns
    bullish_patterns: Dict[str, IndicatorConfig] = field(default_factory=lambda: {
        "ascending_channel": IndicatorConfig(
            name="Ascending Channel",
            enabled=False,
            params={"min_touches": 3},
            color="#186d48",
            category=IndicatorCategory.PATTERN
        ),
        "ascending_triangle": IndicatorConfig(
            name="Ascending Triangle",
            enabled=False,
            params={"min_touches": 3},
            color="#2e7d32",
            category=IndicatorCategory.PATTERN
        ),
        "bull_flag": IndicatorConfig(
            name="Bull Flag",
            enabled=False,
            params={"flag_length": 10},
            color="#388e3c",
            category=IndicatorCategory.PATTERN
        ),
        "bull_pennant": IndicatorConfig(
            name="Bull Pennant",
            enabled=False,
            params={"pennant_length": 10},
            color="#43a047",
            category=IndicatorCategory.PATTERN
        ),
        "continuation_falling_wedge": IndicatorConfig(
            name="Continuation Falling Wedge",
            enabled=False,
            params={"min_length": 10},
            color="#4caf50",
            category=IndicatorCategory.PATTERN
        ),
        "descending_broadening_wedge": IndicatorConfig(
            name="Descending Broadening Wedge",
            enabled=False,
            params={"min_length": 10},
            color="#66bb6a",
            category=IndicatorCategory.PATTERN
        ),
        "reversal_falling_wedge": IndicatorConfig(
            name="Reversal Falling Wedge",
            enabled=False,
            params={"min_length": 10},
            color="#81c784",
            category=IndicatorCategory.PATTERN
        ),
    })
    
    # Bearish Patterns
    bearish_patterns: Dict[str, IndicatorConfig] = field(default_factory=lambda: {
        "ascending_broadening_wedge": IndicatorConfig(
            name="Ascending Broadening Wedge",
            enabled=False,
            params={"min_length": 10},
            color="#a9203e",
            category=IndicatorCategory.PATTERN
        ),
        "bear_flag": IndicatorConfig(
            name="Bear Flag",
            enabled=False,
            params={"flag_length": 10},
            color="#c62828",
            category=IndicatorCategory.PATTERN
        ),
        "bear_pennant": IndicatorConfig(
            name="Bear Pennant",
            enabled=False,
            params={"pennant_length": 10},
            color="#d32f2f",
            category=IndicatorCategory.PATTERN
        ),
        "continuation_rising_wedge": IndicatorConfig(
            name="Continuation Rising Wedge",
            enabled=False,
            params={"min_length": 10},
            color="#e53935",
            category=IndicatorCategory.PATTERN
        ),
        "descending_channel": IndicatorConfig(
            name="Descending Channel",
            enabled=False,
            params={"min_touches": 3},
            color="#ef5350",
            category=IndicatorCategory.PATTERN
        ),
        "descending_triangle": IndicatorConfig(
            name="Descending Triangle",
            enabled=False,
            params={"min_touches": 3},
            color="#f44336",
            category=IndicatorCategory.PATTERN
        ),
        "reversal_rising_wedge": IndicatorConfig(
            name="Reversal Rising Wedge",
            enabled=False,
            params={"min_length": 10},
            color="#ff5252",
            category=IndicatorCategory.PATTERN
        ),
    })
    
    # Neutral Patterns
    neutral_patterns: Dict[str, IndicatorConfig] = field(default_factory=lambda: {
        "symmetrical_triangle": IndicatorConfig(
            name="Symmetrical Triangle",
            enabled=False,
            params={"min_touches": 3},
            color="#9e9e9e",
            category=IndicatorCategory.PATTERN
        ),
    })


# ═══════════════════════════════════════════════════════════════
# DEFAULT CONFIGURATIONS
# ═══════════════════════════════════════════════════════════════

DEFAULT_CHART_CONFIG = ChartConfig()
DEFAULT_PATTERN_CONFIG = PatternConfig()


def get_all_indicators() -> List[str]:
    """Get list of all available indicator names"""
    config = ChartConfig()
    indicators = []
    
    for field_name in config.__dataclass_fields__:
        field_value = getattr(config, field_name)
        if isinstance(field_value, IndicatorConfig):
            indicators.append(field_value.name)
    
    return indicators


def get_all_patterns() -> Dict[str, List[str]]:
    """Get all available patterns grouped by type"""
    config = PatternConfig()
    
    return {
        "bullish": [p.name for p in config.bullish_patterns.values()],
        "bearish": [p.name for p in config.bearish_patterns.values()],
        "neutral": [p.name for p in config.neutral_patterns.values()],
    }
