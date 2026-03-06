"""
🥩 نماذج بيانات StakingRewards — Staking APY, Validators, Providers
══════════════════════════════════════════════════════════════════════
بيانات ستاكينغ عبر-أصول من StakingRewards.com
يُستخرَج من RSC payload في صفحة الأصول بدون API key.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class StakingProvider:
    """مزوّد خدمة ستاكينغ (validator / pool)"""
    name: str = ""
    provider_type: str = ""          # hosting, pool, liquid, exchange
    reward_rate: Optional[float] = None
    stakelink: str = ""
    is_verified: bool = False


@dataclass
class StakingAsset:
    """أصل واحد قابل للستاكينغ"""
    slug: str = ""
    name: str = ""
    symbol: str = ""
    logo_url: str = ""

    # ── المقاييس الأساسية ──
    price_usd: Optional[float] = None
    reward_rate: Optional[float] = None        # متوسط مرجّح
    reward_rate_min: Optional[float] = None
    reward_rate_max: Optional[float] = None
    staked_tokens: Optional[float] = None
    staking_ratio: Optional[float] = None      # % من المعروض المحجوز

    # ── التغيرات ──
    reward_change_24h: Optional[float] = None
    reward_change_7d: Optional[float] = None
    reward_change_30d: Optional[float] = None
    price_change_24h: Optional[float] = None

    # ── المزودون ──
    providers: List[StakingProvider] = field(default_factory=list)
    providers_count: int = 0

    # ── مقاييس متعددة الفريمات (24h/7d/30d/90d/1y) ──
    timeframe_metrics: Dict[str, Dict[str, Optional[float]]] = field(default_factory=dict)

    # ── فلاتر التصنيف ──
    type_keys: List[str] = field(default_factory=list)
    ecosystem_keys: List[str] = field(default_factory=list)

    # ── تفاصيل الأصل (للـ deep-link About/Providers) ──
    about: str = ""

    # ── بيانات CoinGecko المكملة ──
    coingecko_data: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        import dataclasses
        return dataclasses.asdict(self)


@dataclass
class StakingRewardsSnapshot:
    """لقطة كاملة من StakingRewards — cross-asset"""
    timestamp: str = ""
    crawler_version: str = "1.0.0"

    # ── الأصول ──
    assets: List[StakingAsset] = field(default_factory=list)
    assets_count: int = 0

    # ── ميتاداتا واجهة Staking & Rewards ──
    timeframes: List[str] = field(default_factory=list)
    available_type_filters: List[Dict[str, str]] = field(default_factory=list)
    available_ecosystem_filters: List[Dict[str, str]] = field(default_factory=list)
    available_columns: List[Dict[str, str]] = field(default_factory=list)

    # ── ملخص عام ──
    avg_reward_rate: Optional[float] = None       # متوسط معدل المكافآت لكل الأصول
    total_staked_value_usd: Optional[float] = None  # إجمالي قيمة المحجوز

    # حالة الزحف
    pages_crawled: List[str] = field(default_factory=list)
    pages_failed: List[str] = field(default_factory=list)
    crawl_duration_seconds: float = 0.0
    errors: List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        import dataclasses
        return dataclasses.asdict(self)
