"""
🥩 زاحف StakingRewards — APY, نسبة الستاكينغ, المزودون
══════════════════════════════════════════════════════════

يستخرج بيانات الستاكينغ من StakingRewards.com بدون API key.
الاستراتيجية: يقرأ RSC payload المُضمّن في HTML (React Server Components)
بدلاً من Playwright لتوفير الموارد.

البيانات المتوفرة:
────────────────────
- 19+ أصل (ETH, SOL, ADA, DOT, ATOM, ...)
- reward_rate لكل أصل (+ min/max عبر المزودين)
- price_usd + staked_tokens
- تغيرات 24h/7d/30d/1y
- مزودو الستاكينغ (hosting, pool, liquid, exchange)
- روابط stakelink لكل مزود

الاستخدام:
    scraper = StakingRewardsScraper()
    snapshot = await scraper.crawl_all()
    # snapshot.assets → [StakingAsset(ETH, rate=3.2%), ...]

ملاحظة:
    لا يحتاج API key — يقرأ من HTML مباشرة.
    GraphQL API محمي بمصادقة مدفوعة.
"""

import asyncio
import time
from datetime import datetime
from typing import Optional, List, Dict

import aiohttp
from loguru import logger

from .base_scraper import BaseScraper
from .config import CrawlerSettings, DEFAULT_SETTINGS
from .models_stakingrewards import StakingRewardsSnapshot, StakingAsset
from .parsers.stakingrewards_rsc import parse_stakingrewards_page
from .utils import get_random_user_agent


# ── الصفحات المستهدفة ──
STAKINGREWARDS_PAGES = {
    "assets_listing": {
        "url": "https://www.stakingrewards.com/assets",
        "desc": "صفحة قائمة الأصول — تحتوي RSC payload لـ 19+ أصل",
        "priority": 1,
    },
}

TIMEFRAMES = ["24h", "7d", "30d", "90d", "1y"]

TYPE_FILTERS = [
    {"key": "all", "name": "All"},
    {"key": "proof-of-stake", "name": "Proof of Stake"},
    {"key": "liquid-staking", "name": "Liquid (Re)Staking"},
    {"key": "actively-validated-service", "name": "Actively Validated Services"},
    {"key": "stablecoin", "name": "Stablecoins"},
    {"key": "bitcoin-and-others", "name": "Bitcoin & Others"},
    {"key": "testnet", "name": "Testnet"},
]

ECOSYSTEM_FILTERS = [
    {"key": "ethereum-ecosystem", "name": "Ethereum"},
    {"key": "cosmos-ecosystem", "name": "Cosmos"},
    {"key": "polkadot-ecosystem", "name": "Polkadot"},
    {"key": "binance-smart-chain-ecosystem", "name": "BNB Chain"},
]

DEFAULT_COLUMNS = [
    {"key": "reward_rate", "label": "Reward Rate", "group": "Reward"},
    {"key": "price", "label": "Price", "group": "General"},
    {"key": "staking_marketcap", "label": "Staking MC", "group": "Risk"},
    {"key": "staking_ratio", "label": "Staking Ratio", "group": "Risk"},
    {"key": "reputation", "label": "Reputation", "group": "General"},
    {"key": "net_staking_flow_7d", "label": "Net Staking Flow 7d", "group": "Momentum"},
]

# الأصول الفردية — تستخدم فقط إذا احتجنا بيانات أعمق
TOP_STAKING_ASSETS = [
    "ethereum", "solana", "cardano", "polkadot", "cosmos",
    "avalanche", "tron", "near-protocol", "aptos", "sui",
    "tezos", "injective-protocol", "polygon", "sei-network",
]


class StakingRewardsScraper(BaseScraper):
    """
    🥩 زاحف StakingRewards — بيانات ستاكينغ عبر كل الأصول.

    يقرأ من HTML + RSC payload بدلاً من API المحمي.
    يُنتج StakingRewardsSnapshot بدلاً من ChainSnapshot لأنه cross-asset.
    """

    def __init__(self, settings: CrawlerSettings = None):
        super().__init__(settings)
        self._base_delay = 5.0  # تأخير أعلى — موقع واحد
        self._user_agent = get_random_user_agent()

    def _get_headers(self) -> dict:
        """إعداد headers مُقنعة"""
        return {
            "User-Agent": self._user_agent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Connection": "keep-alive",
            "Cache-Control": "max-age=0",
        }

    @staticmethod
    def _merge_assets(base: StakingAsset, incoming: StakingAsset) -> StakingAsset:
        """دمج بيانات أصل من صفحة/فريم آخر داخل نفس الأصل."""
        if (base.price_usd is None) and (incoming.price_usd is not None):
            base.price_usd = incoming.price_usd
        if (base.reward_rate is None) and (incoming.reward_rate is not None):
            base.reward_rate = incoming.reward_rate
        if (base.staked_tokens is None) and (incoming.staked_tokens is not None):
            base.staked_tokens = incoming.staked_tokens
        if (base.staking_ratio is None) and (incoming.staking_ratio is not None):
            base.staking_ratio = incoming.staking_ratio

        if incoming.reward_rate_min is not None:
            if base.reward_rate_min is None:
                base.reward_rate_min = incoming.reward_rate_min
            else:
                base.reward_rate_min = min(base.reward_rate_min, incoming.reward_rate_min)

        if incoming.reward_rate_max is not None:
            if base.reward_rate_max is None:
                base.reward_rate_max = incoming.reward_rate_max
            else:
                base.reward_rate_max = max(base.reward_rate_max, incoming.reward_rate_max)

        for tf, metrics in (incoming.timeframe_metrics or {}).items():
            if tf not in base.timeframe_metrics:
                base.timeframe_metrics[tf] = {}
            base.timeframe_metrics[tf].update(metrics or {})

        base.providers_count = max(base.providers_count, incoming.providers_count)
        if not base.providers and incoming.providers:
            base.providers = incoming.providers

        if incoming.type_keys:
            base.type_keys = sorted(set(base.type_keys + incoming.type_keys))
        if incoming.ecosystem_keys:
            base.ecosystem_keys = sorted(set(base.ecosystem_keys + incoming.ecosystem_keys))

        return base

    @staticmethod
    def _sort_key(asset: StakingAsset) -> float:
        """ترتيب افتراضي: Staking MC على فريم 7d إن توفر."""
        seven_day = asset.timeframe_metrics.get("7d", {}) if asset.timeframe_metrics else {}
        val = seven_day.get("staking_marketcap")
        if val is None:
            if asset.price_usd is not None and asset.staked_tokens is not None:
                val = asset.price_usd * asset.staked_tokens
            else:
                val = 0.0
        return float(val or 0.0)

    async def fetch_page(
        self,
        url: str,
        delay: float = 5.0,
        retries: int = 3,
    ) -> Optional[str]:
        """
        جلب صفحة HTML مع rate limiting وإعادة المحاولة.
        """
        session = await self._get_session()

        for attempt in range(1, retries + 1):
            try:
                # rate limiting
                await asyncio.sleep(delay + (attempt - 1) * 2)

                logger.debug(f"🌐 GET {url} (محاولة {attempt}/{retries})")

                async with session.get(
                    url,
                    headers=self._get_headers(),
                    timeout=aiohttp.ClientTimeout(total=30),
                ) as resp:
                    self._request_count += 1

                    if resp.status == 200:
                        html = await resp.text()
                        logger.info(f"✅ {url} → {len(html):,} bytes")
                        return html

                    elif resp.status == 403:
                        logger.warning(
                            f"🚫 403 Forbidden: {url} — "
                            f"Cloudflare قد يحظر الطلب"
                        )
                        # تغيير User-Agent
                        self._user_agent = get_random_user_agent()
                        await asyncio.sleep(10)

                    elif resp.status == 429:
                        wait = 30 * attempt
                        logger.warning(f"⏳ 429 Rate Limit: انتظار {wait}ث")
                        await asyncio.sleep(wait)

                    else:
                        logger.warning(f"⚠️ {resp.status}: {url}")

            except asyncio.TimeoutError:
                logger.warning(f"⏰ Timeout: {url}")
            except aiohttp.ClientError as e:
                logger.warning(f"🔌 Connection error: {e}")
            except Exception as e:
                logger.error(f"❌ Unexpected: {e}")

        self._error_count += 1
        return None

    async def crawl_all(self) -> StakingRewardsSnapshot:
        """
        زحف كامل — يجلب صفحة الأصول ويحلل RSC payload.

        Returns:
            StakingRewardsSnapshot مع كل الأصول والمقاييس
        """
        start_time = time.time()
        snapshot = StakingRewardsSnapshot(
            timestamp=datetime.utcnow().isoformat(),
        )

        logger.info("🥩 ═══ بدء زحف StakingRewards ═══")

        snapshot.timeframes = TIMEFRAMES.copy()
        snapshot.available_type_filters = TYPE_FILTERS.copy()
        snapshot.available_ecosystem_filters = ECOSYSTEM_FILTERS.copy()
        snapshot.available_columns = DEFAULT_COLUMNS.copy()

        target_assets = 200
        page_size = 100
        max_pages = 4

        merged_assets: Dict[str, StakingAsset] = {}

        for timeframe in TIMEFRAMES:
            logger.info(f"⏱️ StakingRewards timeframe: {timeframe}")
            for page in range(max_pages):
                url = (
                    f"https://www.stakingrewards.com/assets/all"
                    f"?page={page}&pageSize={page_size}&timeframe={timeframe}"
                )

                html = await self.fetch_page(url, delay=2.0)
                if not html:
                    snapshot.pages_failed.append(f"assets_all_{timeframe}_p{page}")
                    continue

                try:
                    parsed = parse_stakingrewards_page(html, timeframe=timeframe)
                    parsed_count = len(parsed.assets)
                    snapshot.pages_crawled.append(f"assets_all_{timeframe}_p{page}")

                    if parsed_count == 0:
                        break

                    for asset in parsed.assets:
                        existing = merged_assets.get(asset.slug)
                        if existing is None:
                            merged_assets[asset.slug] = asset
                        else:
                            merged_assets[asset.slug] = self._merge_assets(existing, asset)

                    # إذا أقل من page_size غالبًا لا توجد صفحات إضافية
                    if parsed_count < page_size:
                        break

                except Exception as e:
                    logger.error(f"❌ Parse failed ({timeframe}, p{page}): {e}")
                    snapshot.errors.append(f"Parse error [{timeframe} p{page}]: {e}")
                    snapshot.pages_failed.append(f"assets_all_{timeframe}_p{page}")

            # توفير الطلبات بعد الوصول لحجم كافٍ من الأصول
            if len(merged_assets) >= target_assets and timeframe == "7d":
                logger.info("✅ وصلنا إلى 200+ أصل من فريم 7d")

        # ترتيب + حد أعلى 200 أصل
        ordered_assets = sorted(merged_assets.values(), key=self._sort_key, reverse=True)
        snapshot.assets = ordered_assets[:target_assets]
        snapshot.assets_count = len(snapshot.assets)

        # الملخص العام
        reward_values: List[float] = []
        total_staked_value = 0.0
        for asset in snapshot.assets:
            rr = None
            if asset.timeframe_metrics:
                rr = (asset.timeframe_metrics.get("7d") or {}).get("reward_rate")
            if rr is None:
                rr = asset.reward_rate
            if rr is not None:
                reward_values.append(float(rr))

            price = asset.price_usd
            staked = asset.staked_tokens
            if price is not None and staked is not None:
                total_staked_value += float(price) * float(staked)

        snapshot.avg_reward_rate = (sum(reward_values) / len(reward_values)) if reward_values else None
        snapshot.total_staked_value_usd = total_staked_value if total_staked_value > 0 else None

        snapshot.crawl_duration_seconds = time.time() - start_time

        logger.info(
            f"🥩 ═══ اكتمل زحف StakingRewards "
            f"({snapshot.crawl_duration_seconds:.1f}ث) | "
            f"assets={snapshot.assets_count} ═══"
        )

        return snapshot

    async def crawl_asset(self, slug: str) -> Optional[StakingRewardsSnapshot]:
        """
        زحف أصل واحد (صفحة مفردة).
        مفيد للحصول على بيانات أعمق لأصل محدد.

        ملاحظة: الصفحة الفردية تعيد نفس RSC payload مثل صفحة القائمة
        لأن StakingRewards SPA يحمّل كل البيانات في الحزمة الأولية.
        """
        url = f"https://www.stakingrewards.com/assets/{slug}"
        html = await self.fetch_page(url, delay=3.0)

        if html:
            try:
                return parse_stakingrewards_page(html)
            except Exception as e:
                logger.error(f"❌ فشل تحليل {slug}: {e}")

        return None

    async def close(self):
        """إغلاق الجلسة"""
        if self._session and not self._session.closed:
            await self._session.close()
            self._session = None
