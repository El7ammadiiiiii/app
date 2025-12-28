# ═══════════════════════════════════════════════════════════════
# NEXUS Pattern Detectors - 77 Patterns across 12 Categories
# ═══════════════════════════════════════════════════════════════

from .base_detector import BaseDetector, PatternResult
from .triangles import TrianglesDetector
from .channels import ChannelsDetector
from .flags_pennants import FlagsPennantsDetector
from .wedges import WedgesDetector
from .tops_bottoms import TopsBottomsDetector
from .head_shoulders import HeadShouldersDetector
from .ranges import RangesDetector
from .trendlines import TrendlinesDetector
from .levels import LevelsDetector
from .breakouts import BreakoutsDetector
from .liquidity import LiquidityDetector
from .scalping import ScalpingDetector

__all__ = [
    'BaseDetector',
    'PatternResult',
    'TrianglesDetector',
    'ChannelsDetector',
    'FlagsPennantsDetector',
    'WedgesDetector',
    'TopsBottomsDetector',
    'HeadShouldersDetector',
    'RangesDetector',
    'TrendlinesDetector',
    'LevelsDetector',
    'BreakoutsDetector',
    'LiquidityDetector',
    'ScalpingDetector',
]
