# ═══════════════════════════════════════════════════════════════
# NEXUS Technical Analysis Package
# ═══════════════════════════════════════════════════════════════

from .indicators import (
    calculate_supertrend,
    calculate_bollinger_bands,
    calculate_sma,
    calculate_ema,
    calculate_rsi,
    calculate_stoch_rsi,
    calculate_macd,
    calculate_adx,
    calculate_obv,
    calculate_all_indicators,
    detect_ma_crossovers
)

from .patterns import (
    detect_ascending_channel,
    detect_ascending_triangle,
    detect_bull_flag,
    detect_bull_pennant,
    detect_falling_wedge,
    detect_descending_channel,
    detect_descending_triangle,
    detect_bear_flag,
    detect_bear_pennant,
    detect_rising_wedge,
    detect_symmetrical_triangle,
    detect_all_patterns
)

from .trendlines import (
    detect_trendlines,
    detect_horizontal_levels,
    calculate_fibonacci_levels,
    detect_vertical_levels,
    detect_price_channel,
    analyze_all_trendlines
)

from .config import (
    ChartConfig,
    PatternConfig,
    IndicatorConfig,
    IndicatorCategory
)

__version__ = "1.0.0"
__author__ = "NEXUS Team"

__all__ = [
    # Indicators
    'calculate_supertrend',
    'calculate_bollinger_bands',
    'calculate_sma',
    'calculate_ema',
    'calculate_rsi',
    'calculate_stoch_rsi',
    'calculate_macd',
    'calculate_adx',
    'calculate_obv',
    'calculate_all_indicators',
    'detect_ma_crossovers',
    
    # Patterns
    'detect_ascending_channel',
    'detect_ascending_triangle',
    'detect_bull_flag',
    'detect_bull_pennant',
    'detect_falling_wedge',
    'detect_descending_channel',
    'detect_descending_triangle',
    'detect_bear_flag',
    'detect_bear_pennant',
    'detect_rising_wedge',
    'detect_symmetrical_triangle',
    'detect_all_patterns',
    
    # Trendlines
    'detect_trendlines',
    'detect_horizontal_levels',
    'calculate_fibonacci_levels',
    'detect_vertical_levels',
    'detect_price_channel',
    'analyze_all_trendlines',
    
    # Config
    'ChartConfig',
    'PatternConfig',
    'IndicatorConfig',
    'IndicatorCategory',
]
