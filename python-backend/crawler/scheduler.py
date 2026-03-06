"""
⏰ جدولة التحديث التلقائي — Auto Scheduler
=============================================
يُشغّل الزاحف تلقائياً بشكل دوري:
- تحديث سريع كل ساعة (الرئيسية + charts فقط)
- تحديث كامل كل 6 ساعات (كل الصفحات)
- تنظيف الأرشيف القديم كل يوم

يدعم 8 عائلات:
- Etherscan (20 سلسلة EVM)
- Blockscout (8 سلاسل — API v2 + HTML fallback)
- Independent (23 سلسلة مستقلة)
- Subscan (6 سلاسل Substrate — POST API)
- Cosmos/Mintscan (12 سلسلة — LCD REST API)
- Level2 Others (10 سلاسل متنوعة — Mixed APIs)
- DeFiLlama (8 API endpoints — cross-chain TVL/DEX/Fees/APY)
- StakingRewards (19+ أصول — RSC HTML scraping)
"""

import asyncio
import signal
import sys
from datetime import datetime
from typing import List, Optional

from loguru import logger

from .config import (
    DEFAULT_SETTINGS,
    CrawlerSettings,
    ETHERSCAN_CHAINS,
    BLOCKSCOUT_CHAINS,
    INDEPENDENT_CHAINS,
    SUBSCAN_CHAINS,
    COSMOS_CHAINS,
    LEVEL2_CHAINS,
)
from .etherscan_scraper import EtherscanScraper
from .blockscout_scraper import BlockscoutScraper
from .independent_scraper import IndependentScraper
from .subscan_scraper import SubscanScraper
from .cosmos_scraper import CosmosScraper
from .level2_scraper import Level2Scraper
from .defillama_scraper import DefiLlamaScraper
from .stakingrewards_scraper import StakingRewardsScraper
from .storage import DataStorage


class CrawlerScheduler:
    """مُجدوِل الزحف التلقائي — يدعم 6 عائلات"""

    def __init__(
        self,
        settings: CrawlerSettings = None,
        chain_keys: List[str] = None,
        family: str = "all",
    ):
        self.settings = settings or DEFAULT_SETTINGS
        self.family = family
        self.storage = DataStorage(self.settings.data_dir)
        self._running = True
        self._cycle_count = 0

        # ── تصنيف السلاسل حسب العائلة ──
        if chain_keys:
            self.eth_keys = [k for k in chain_keys if k in ETHERSCAN_CHAINS]
            self.bs_keys = [k for k in chain_keys if k in BLOCKSCOUT_CHAINS]
            self.ind_keys = [k for k in chain_keys if k in INDEPENDENT_CHAINS]
            self.sub_keys = [k for k in chain_keys if k in SUBSCAN_CHAINS]
            self.cos_keys = [k for k in chain_keys if k in COSMOS_CHAINS]
            self.lv2_keys = [k for k in chain_keys if k in LEVEL2_CHAINS]
        else:
            self.eth_keys = list(ETHERSCAN_CHAINS.keys()) if family in ("etherscan", "all") else []
            self.bs_keys = list(BLOCKSCOUT_CHAINS.keys()) if family in ("blockscout", "all") else []
            self.ind_keys = list(INDEPENDENT_CHAINS.keys()) if family in ("independent", "all") else []
            self.sub_keys = list(SUBSCAN_CHAINS.keys()) if family in ("subscan", "all") else []
            self.cos_keys = list(COSMOS_CHAINS.keys()) if family in ("cosmos", "all") else []
            self.lv2_keys = list(LEVEL2_CHAINS.keys()) if family in ("level2", "all") else []

        # ── إنشاء الزواحف المطلوبة فقط ──
        self.eth_scraper = EtherscanScraper(self.settings) if self.eth_keys else None
        self.bs_scraper = BlockscoutScraper(self.settings) if self.bs_keys else None
        self.ind_scraper = IndependentScraper(self.settings) if self.ind_keys else None
        self.sub_scraper = SubscanScraper(self.settings) if self.sub_keys else None
        self.cos_scraper = CosmosScraper(self.settings) if self.cos_keys else None
        self.lv2_scraper = Level2Scraper(self.settings) if self.lv2_keys else None

    async def start(self):
        """
        بدء حلقة التحديث التلقائي.
        لا تتوقف إلا بإشارة إيقاف (Ctrl+C).
        """
        total = len(self.eth_keys) + len(self.bs_keys) + len(self.ind_keys) + len(self.sub_keys) + len(self.cos_keys) + len(self.lv2_keys)
        families_str = []
        if self.eth_keys:
            families_str.append(f"Etherscan({len(self.eth_keys)})")
        if self.bs_keys:
            families_str.append(f"Blockscout({len(self.bs_keys)})")
        if self.ind_keys:
            families_str.append(f"Independent({len(self.ind_keys)})")
        if self.sub_keys:
            families_str.append(f"Subscan({len(self.sub_keys)})")
        if self.cos_keys:
            families_str.append(f"Cosmos({len(self.cos_keys)})")
        if self.lv2_keys:
            families_str.append(f"Level2({len(self.lv2_keys)})")

        logger.info(f"{'═' * 60}")
        logger.info(f"🚀 بدء الزاحف التلقائي — {' + '.join(families_str)}")
        logger.info(f"   إجمالي السلاسل: {total}")
        logger.info(f"   تحديث سريع: كل {self.settings.update_interval_minutes} دقيقة")
        logger.info(f"   تحديث كامل: كل {self.settings.full_update_interval_hours} ساعة")
        logger.info(f"{'═' * 60}")

        # تسجيل إشارة الإيقاف
        self._setup_signal_handlers()

        # تحديث كامل أول مرة
        await self._full_update()

        # حلقة التحديث
        while self._running:
            try:
                self._cycle_count += 1

                # هل حان وقت التحديث الكامل؟
                if self._cycle_count % (self.settings.full_update_interval_hours * 60 // self.settings.update_interval_minutes) == 0:
                    await self._full_update()
                else:
                    await self._quick_update()

                # تنظيف يومي
                if datetime.now().hour == 3 and datetime.now().minute < self.settings.update_interval_minutes:
                    self.storage.cleanup_old_history(keep_days=30)

                # انتظار حتى الدورة التالية
                wait_minutes = self.settings.update_interval_minutes
                logger.info(f"😴 انتظار {wait_minutes} دقيقة حتى التحديث التالي...")

                for _ in range(wait_minutes * 60):
                    if not self._running:
                        break
                    await asyncio.sleep(1)

            except asyncio.CancelledError:
                logger.info("⏹️ تم إلغاء الحلقة")
                break
            except Exception as e:
                logger.error(f"❗ خطأ في حلقة التحديث: {e}")
                logger.info("🔄 إعادة المحاولة بعد 60 ثانية...")
                await asyncio.sleep(60)

        # تنظيف
        for scraper in (self.eth_scraper, self.bs_scraper, self.ind_scraper,
                        self.sub_scraper, self.cos_scraper, self.lv2_scraper):
            if scraper:
                await scraper.close()
        logger.info("👋 تم إيقاف الزاحف بنجاح")

    async def _quick_update(self):
        """تحديث سريع — الرئيسية + stats فقط"""
        logger.info(f"\n⚡ تحديث سريع #{self._cycle_count} — {datetime.now().strftime('%H:%M:%S')}")

        # Etherscan
        for key in self.eth_keys:
            if not self._running:
                break
            try:
                snapshot = await self.eth_scraper.quick_crawl(key)
                if snapshot:
                    self.storage.save_snapshot(key, snapshot)
            except Exception as e:
                logger.error(f"❌ [ETH] خطأ في {key}: {e}")
                continue

        # Blockscout
        for key in self.bs_keys:
            if not self._running:
                break
            try:
                snapshot = await self.bs_scraper.quick_crawl(key)
                if snapshot:
                    self.storage.save_snapshot(key, snapshot)
            except Exception as e:
                logger.error(f"❌ [BS] خطأ في {key}: {e}")
                continue

        # Independent
        for key in self.ind_keys:
            if not self._running:
                break
            try:
                snapshot = await self.ind_scraper.crawl_chain(key)
                if snapshot:
                    self.storage.save_snapshot(key, snapshot)
            except Exception as e:
                logger.error(f"❌ [IND] خطأ في {key}: {e}")
                continue

        # Subscan
        for key in self.sub_keys:
            if not self._running:
                break
            try:
                snapshot = await self.sub_scraper.crawl_chain(key)
                if snapshot:
                    self.storage.save_snapshot(key, snapshot)
            except Exception as e:
                logger.error(f"❌ [SUB] خطأ في {key}: {e}")
                continue

        # Cosmos
        for key in self.cos_keys:
            if not self._running:
                break
            try:
                snapshot = await self.cos_scraper.quick_crawl(key)
                if snapshot:
                    self.storage.save_snapshot(key, snapshot)
            except Exception as e:
                logger.error(f"❌ [COS] خطأ في {key}: {e}")
                continue

        # Level2
        for key in self.lv2_keys:
            if not self._running:
                break
            try:
                snapshot = await self.lv2_scraper.crawl_chain(key)
                if snapshot:
                    self.storage.save_snapshot(key, snapshot)
            except Exception as e:
                logger.error(f"❌ [LV2] خطأ في {key}: {e}")
                continue

    async def _full_update(self):
        """تحديث كامل — كل النقاط"""
        logger.info(f"\n🔄 تحديث كامل — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

        # ── Etherscan ──
        if self.eth_keys and self.eth_scraper:
            try:
                results = await self.eth_scraper.crawl_all(self.eth_keys)
                self.storage.save_all(results)
                logger.info(f"✅ [ETH] تحديث: {len(results)} سلسلة")
            except Exception as e:
                logger.error(f"❌ [ETH] خطأ جماعي: {e}")
                for key in self.eth_keys:
                    if not self._running:
                        break
                    try:
                        snapshot = await self.eth_scraper.crawl_chain(key)
                        if snapshot:
                            self.storage.save_snapshot(key, snapshot)
                    except Exception as e2:
                        logger.error(f"❌ [ETH] فشل {key}: {e2}")

        # ── Blockscout ──
        if self.bs_keys and self.bs_scraper:
            try:
                results = await self.bs_scraper.crawl_all(self.bs_keys)
                self.storage.save_all(results)
                logger.info(f"✅ [BS] تحديث: {len(results)} سلسلة")
            except Exception as e:
                logger.error(f"❌ [BS] خطأ جماعي: {e}")
                for key in self.bs_keys:
                    if not self._running:
                        break
                    try:
                        snapshot = await self.bs_scraper.crawl_chain(key)
                        if snapshot:
                            self.storage.save_snapshot(key, snapshot)
                    except Exception as e2:
                        logger.error(f"❌ [BS] فشل {key}: {e2}")

        # ── Independent ──
        if self.ind_keys and self.ind_scraper:
            try:
                results = await self.ind_scraper.crawl_all(self.ind_keys)
                self.storage.save_all(results)
                logger.info(f"✅ [IND] تحديث: {len(results)} سلسلة")
            except Exception as e:
                logger.error(f"❌ [IND] خطأ جماعي: {e}")
                for key in self.ind_keys:
                    if not self._running:
                        break
                    try:
                        snapshot = await self.ind_scraper.crawl_chain(key)
                        if snapshot:
                            self.storage.save_snapshot(key, snapshot)
                    except Exception as e2:
                        logger.error(f"❌ [IND] فشل {key}: {e2}")

        # ── Subscan ──
        if self.sub_keys and self.sub_scraper:
            try:
                results = await self.sub_scraper.crawl_all(self.sub_keys)
                self.storage.save_all(results)
                logger.info(f"✅ [SUB] تحديث: {len(results)} سلسلة")
            except Exception as e:
                logger.error(f"❌ [SUB] خطأ جماعي: {e}")
                for key in self.sub_keys:
                    if not self._running:
                        break
                    try:
                        snapshot = await self.sub_scraper.crawl_chain(key)
                        if snapshot:
                            self.storage.save_snapshot(key, snapshot)
                    except Exception as e2:
                        logger.error(f"❌ [SUB] فشل {key}: {e2}")

        # ── Cosmos ──
        if self.cos_keys and self.cos_scraper:
            try:
                results = await self.cos_scraper.crawl_all(self.cos_keys)
                self.storage.save_all(results)
                logger.info(f"✅ [COS] تحديث: {len(results)} سلسلة")
            except Exception as e:
                logger.error(f"❌ [COS] خطأ جماعي: {e}")
                for key in self.cos_keys:
                    if not self._running:
                        break
                    try:
                        snapshot = await self.cos_scraper.crawl_chain(key)
                        if snapshot:
                            self.storage.save_snapshot(key, snapshot)
                    except Exception as e2:
                        logger.error(f"❌ [COS] فشل {key}: {e2}")

        # ── Level2 ──
        if self.lv2_keys and self.lv2_scraper:
            try:
                results = await self.lv2_scraper.crawl_all(self.lv2_keys)
                self.storage.save_all(results)
                logger.info(f"✅ [LV2] تحديث: {len(results)} سلسلة")
            except Exception as e:
                logger.error(f"❌ [LV2] خطأ جماعي: {e}")
                for key in self.lv2_keys:
                    if not self._running:
                        break
                    try:
                        snapshot = await self.lv2_scraper.crawl_chain(key)
                        if snapshot:
                            self.storage.save_snapshot(key, snapshot)
                    except Exception as e2:
                        logger.error(f"❌ [LV2] فشل {key}: {e2}")

    def stop(self):
        """إيقاف الزاحف بشكل نظيف"""
        logger.info("⏹️ جاري الإيقاف...")
        self._running = False

    def _setup_signal_handlers(self):
        """تسجيل إشارات الإيقاف (Ctrl+C)"""
        def handle_signal(sig, frame):
            logger.info(f"\n📛 تم استلام إشارة إيقاف ({sig})")
            self.stop()

        try:
            signal.signal(signal.SIGINT, handle_signal)
            signal.signal(signal.SIGTERM, handle_signal)
        except (OSError, ValueError):
            pass


# ─────────────────────────────────────────────────────
#  دوال التشغيل لمرة واحدة — Run-Once Functions
# ─────────────────────────────────────────────────────

async def run_once(
    chain_keys: List[str] = None,
    pages: List[str] = None,
) -> dict:
    """تشغيل زاحف Etherscan مرة واحدة (بدون جدولة)."""
    scraper = EtherscanScraper()
    storage = DataStorage()

    try:
        if chain_keys and len(chain_keys) == 1:
            snapshot = await scraper.crawl_chain(chain_keys[0], pages)
            if snapshot:
                storage.save_snapshot(chain_keys[0], snapshot)
                return {chain_keys[0]: snapshot}
        else:
            results = await scraper.crawl_all(chain_keys, pages)
            storage.save_all(results)
            return results
    finally:
        await scraper.close()


async def run_once_blockscout(
    chain_keys: List[str] = None,
) -> dict:
    """تشغيل زاحف Blockscout مرة واحدة (بدون جدولة)."""
    scraper = BlockscoutScraper()
    storage = DataStorage()

    try:
        keys = chain_keys or list(BLOCKSCOUT_CHAINS.keys())
        if len(keys) == 1:
            snapshot = await scraper.crawl_chain(keys[0])
            if snapshot:
                storage.save_snapshot(keys[0], snapshot)
                return {keys[0]: snapshot}
        else:
            results = await scraper.crawl_all(keys)
            storage.save_all(results)
            return results
    finally:
        await scraper.close()


async def run_once_independent(
    chain_keys: List[str] = None,
) -> dict:
    """تشغيل زاحف المواقع المستقلة مرة واحدة (بدون جدولة)."""
    scraper = IndependentScraper()
    storage = DataStorage()

    try:
        keys = chain_keys or list(INDEPENDENT_CHAINS.keys())
        if len(keys) == 1:
            snapshot = await scraper.crawl_chain(keys[0])
            if snapshot:
                storage.save_snapshot(keys[0], snapshot)
                return {keys[0]: snapshot}
        else:
            results = await scraper.crawl_all(keys)
            storage.save_all(results)
            return results
    finally:
        await scraper.close()


async def run_once_subscan(
    chain_keys: List[str] = None,
) -> dict:
    """تشغيل زاحف Subscan مرة واحدة (بدون جدولة)."""
    scraper = SubscanScraper()
    storage = DataStorage()

    try:
        keys = chain_keys or list(SUBSCAN_CHAINS.keys())
        if len(keys) == 1:
            snapshot = await scraper.crawl_chain(keys[0])
            if snapshot:
                storage.save_snapshot(keys[0], snapshot)
                return {keys[0]: snapshot}
        else:
            results = await scraper.crawl_all(keys)
            storage.save_all(results)
            return results
    finally:
        await scraper.close()


async def run_once_cosmos(
    chain_keys: List[str] = None,
) -> dict:
    """تشغيل زاحف Cosmos/Mintscan مرة واحدة (بدون جدولة)."""
    scraper = CosmosScraper()
    storage = DataStorage()

    try:
        keys = chain_keys or list(COSMOS_CHAINS.keys())
        if len(keys) == 1:
            snapshot = await scraper.crawl_chain(keys[0])
            if snapshot:
                storage.save_snapshot(keys[0], snapshot)
                return {keys[0]: snapshot}
        else:
            results = await scraper.crawl_all(keys)
            storage.save_all(results)
            return results
    finally:
        await scraper.close()


async def run_once_level2(
    chain_keys: List[str] = None,
) -> dict:
    """تشغيل زاحف Level 2 مرة واحدة (بدون جدولة)."""
    scraper = Level2Scraper()
    storage = DataStorage()

    try:
        keys = chain_keys or list(LEVEL2_CHAINS.keys())
        if len(keys) == 1:
            snapshot = await scraper.crawl_chain(keys[0])
            if snapshot:
                storage.save_snapshot(keys[0], snapshot)
                return {keys[0]: snapshot}
        else:
            results = await scraper.crawl_all(keys)
            storage.save_all(results)
            return results
    finally:
        await scraper.close()


async def run_once_defillama(
    sections: List[str] = None,
    quick: bool = False,
):
    """
    تشغيل زاحف DeFiLlama مرة واحدة (بدون جدولة).
    
    Args:
        sections: أقسام محددة (chains_tvl, protocols, dex_volumes, ...)
        quick: زحف سريع (chains_tvl + dex_volumes فقط)
    
    Returns:
        DefiLlamaSnapshot
    """
    scraper = DefiLlamaScraper()
    storage = DataStorage()

    try:
        if quick:
            snapshot = await scraper.quick_crawl()
        else:
            snapshot = await scraper.crawl_all(sections)

        if snapshot:
            # حفظ باسم خاص
            storage.save_snapshot("__defillama__", snapshot)
            return snapshot
    finally:
        await scraper.close()


async def run_once_stakingrewards():
    """
    تشغيل زاحف StakingRewards مرة واحدة (بدون جدولة).
    يشمل إثراء CoinGecko + Asset Registry.

    Returns:
        StakingRewardsSnapshot
    """
    from .asset_registry import enrich_asset
    from .coingecko_enricher import run_coingecko_enrichment

    scraper = StakingRewardsScraper()
    storage = DataStorage()

    try:
        snapshot = await scraper.crawl_all()

        if snapshot and snapshot.assets:
            # ── إثراء بالـ Registry (type_keys, ecosystem_keys, about) ──
            for asset in snapshot.assets:
                asset_d = asset.to_dict()
                enriched = enrich_asset(asset_d)
                if enriched.get("type_keys"):
                    asset.type_keys = enriched["type_keys"]
                if enriched.get("ecosystem_keys"):
                    asset.ecosystem_keys = enriched["ecosystem_keys"]
                if enriched.get("about"):
                    asset.about = enriched["about"]

            # ── إثراء بـ CoinGecko (market_cap, volume, price_changes) ──
            asset_dicts = [a.to_dict() for a in snapshot.assets]
            enriched_dicts = await run_coingecko_enrichment(asset_dicts)

            # إعادة بناء الأصول من الـ dicts المثرية
            from .models_stakingrewards import StakingAsset
            enriched_assets = []
            for d in enriched_dicts:
                a = StakingAsset()
                for k, v in d.items():
                    if hasattr(a, k):
                        setattr(a, k, v)
                enriched_assets.append(a)
            snapshot.assets = enriched_assets
            snapshot.assets_count = len(enriched_assets)

            storage.save_snapshot("__stakingrewards__", snapshot)
            return snapshot
    finally:
        await scraper.close()
