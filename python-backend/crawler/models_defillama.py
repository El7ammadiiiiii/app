"""
📊 نماذج بيانات DeFiLlama — TVL, DEX, الرسوم, العوائد, الجسور
══════════════════════════════════════════════════════════════════
بيانات عبر-سلاسل (cross-chain) من DeFiLlama.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any


@dataclass
class DefiProtocol:
    """بروتوكول DeFi واحد"""
    name: str = ""
    symbol: str = ""
    category: str = ""
    chains: List[str] = field(default_factory=list)
    tvl: Optional[float] = None
    change_1d: Optional[float] = None
    change_7d: Optional[float] = None
    chain_tvls: Dict[str, float] = field(default_factory=dict)
    url: str = ""


@dataclass
class ChainTVL:
    """TVL لسلسلة واحدة"""
    name: str = ""
    gecko_id: str = ""
    token_symbol: str = ""
    chain_id: Optional[int] = None
    tvl: Optional[float] = None


@dataclass
class DexVolume:
    """حجم DEX لبروتوكول"""
    name: str = ""
    chains: List[str] = field(default_factory=list)
    total_24h: Optional[float] = None
    total_7d: Optional[float] = None
    total_30d: Optional[float] = None
    change_1d: Optional[float] = None


@dataclass
class FeesRevenue:
    """رسوم وإيرادات بروتوكول"""
    name: str = ""
    chains: List[str] = field(default_factory=list)
    total_24h: Optional[float] = None
    total_30d: Optional[float] = None
    revenue_24h: Optional[float] = None


@dataclass
class YieldPool:
    """مسبح عوائد/APY"""
    pool_id: str = ""
    chain: str = ""
    project: str = ""
    symbol: str = ""
    tvl_usd: Optional[float] = None
    apy: Optional[float] = None
    apy_base: Optional[float] = None
    apy_reward: Optional[float] = None
    stablecoin: bool = False
    il_risk: str = ""
    exposure: str = ""


@dataclass
class Stablecoin:
    """عملة مستقرة"""
    name: str = ""
    symbol: str = ""
    peg_type: str = ""
    peg_mechanism: str = ""
    circulating: Optional[float] = None
    circulating_prev_day: Optional[float] = None
    circulating_prev_week: Optional[float] = None
    chain_circulating: Dict[str, float] = field(default_factory=dict)
    price: Optional[float] = None


@dataclass
class Bridge:
    """جسر بين السلاسل"""
    name: str = ""
    display_name: str = ""
    volume_24h: Optional[float] = None
    volume_7d: Optional[float] = None
    volume_30d: Optional[float] = None
    chains: List[str] = field(default_factory=list)
    url: str = ""


@dataclass
class DefiLlamaSnapshot:
    """لقطة كاملة من DeFiLlama — cross-chain"""
    timestamp: str = ""
    crawler_version: str = "1.0.0"

    # ── TVL ──
    total_defi_tvl: Optional[float] = None
    chains_tvl: List[ChainTVL] = field(default_factory=list)
    top_protocols: List[DefiProtocol] = field(default_factory=list)
    protocols_count: int = 0

    # ── DEX ──
    dex_total_24h: Optional[float] = None
    dex_total_7d: Optional[float] = None
    dex_total_30d: Optional[float] = None
    dex_change_1d: Optional[float] = None
    top_dexes: List[DexVolume] = field(default_factory=list)
    dex_chains_count: int = 0

    # ── الرسوم ──
    fees_total_24h: Optional[float] = None
    fees_total_30d: Optional[float] = None
    top_fees: List[FeesRevenue] = field(default_factory=list)

    # ── العوائد/APY ──
    total_yield_pools: int = 0
    top_yield_pools: List[YieldPool] = field(default_factory=list)

    # ── العملات المستقرة ──
    total_stablecoin_mcap: Optional[float] = None
    stablecoins_count: int = 0
    top_stablecoins: List[Stablecoin] = field(default_factory=list)

    # ── الجسور ──
    bridges_count: int = 0
    top_bridges: List[Bridge] = field(default_factory=list)

    # ── الفائدة المفتوحة (Perps) ──
    perps_oi_total: Optional[float] = None
    perps_protocols_count: int = 0

    # حالة الزحف
    sections_crawled: List[str] = field(default_factory=list)
    sections_failed: List[str] = field(default_factory=list)
    crawl_duration_seconds: float = 0.0
    errors: List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        import dataclasses
        return dataclasses.asdict(self)
