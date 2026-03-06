"""
🕷️ زاحف عائلة Etherscan — Etherscan Family Scraper
=====================================================
زاحف واحد يعمل على 20+ سلسلة EVM بنفس الكود لأن كل مواقع
عائلة Etherscan تشترك بنفس بنية HTML.

يزحف الصفحات التالية لكل سلسلة:
- / (الرئيسية): سعر، TPS، غاز، بلوكات
- /charts: 20+ مقياس شبكي
- /accounts: أكبر المحافظ + بورصات
- /tokens: قائمة التوكنات مع السعر والحجم
- /gastracker: رسوم الغاز + أكبر 50 عقد
- /blocks: بلوكات حديثة + معاملات فاشلة
- /stat/supply: المعروض بالتفصيل
- /nodetracker: عُقد الشبكة + التوزيع الجغرافي
- /dex: صفقات DEX
"""

import asyncio
import time
from datetime import datetime
from typing import Optional, List, Dict, Any

from loguru import logger

from .base_scraper import BaseScraper
from .config import (
    ChainConfig, CrawlerSettings, DEFAULT_SETTINGS,
    ETHERSCAN_CHAINS, ETHERSCAN_PAGES,
)
from .models import ChainSnapshot
from .defillama_fetcher import fetch_defillama_history
from .rpc_enricher import enrich_from_rpc
from .parsers.homepage import parse_homepage
from .parsers.charts import parse_charts
from .parsers.accounts import parse_accounts
from .parsers.tokens import parse_tokens
from .parsers.gas_tracker import parse_gas_tracker
from .parsers.blocks import parse_blocks
from .parsers.supply import parse_supply
from .parsers.node_tracker import parse_node_tracker
from .parsers.dex import parse_dex
from .parsers.chart_pages import parse_chart_page, CHART_METRICS
from .coingecko_fetcher import CoinGeckoFetcher
from .browser_fetcher import BrowserChartFetcher


class EtherscanScraper(BaseScraper):
    """
    زاحف عائلة Etherscan — يغطي 20+ سلسلة EVM.
    
    الاستخدام:
        scraper = EtherscanScraper()
        
        # زحف سلسلة واحدة
        snapshot = await scraper.crawl_chain("ethereum")
        
        # زحف كل السلاسل
        results = await scraper.crawl_all()
    """

    def __init__(self, settings: CrawlerSettings = None):
        super().__init__(settings)
        self.chains = ETHERSCAN_CHAINS.copy()

    async def crawl_chain(
        self,
        chain_key: str,
        pages: List[str] = None,
    ) -> Optional[ChainSnapshot]:
        """
        زحف سلسلة واحدة وإرجاع لقطة كاملة.
        
        Args:
            chain_key: مفتاح السلسلة (مثل "ethereum", "bsc")
            pages: قائمة الصفحات المراد زحفها (None = الكل)
            
        Returns:
            ChainSnapshot أو None
        """
        if chain_key not in self.chains:
            logger.error(f"❌ سلسلة غير معروفة: {chain_key}")
            return None
        
        chain = self.chains[chain_key]
        if not chain.enabled:
            logger.info(f"⏭️ السلسلة {chain.name} معطلة، تخطي...")
            return None
        
        start_time = time.time()
        logger.info(f"{'═' * 60}")
        logger.info(f"🔗 بدء زحف: {chain.name} ({chain.base_url})")
        logger.info(f"{'═' * 60}")
        
        snapshot = ChainSnapshot(
            chain_name=chain.name,
            chain_symbol=chain.symbol,
            chain_id=chain.chain_id,
            timestamp=datetime.now().isoformat(),
        )
        
        # تحديد الصفحات المطلوبة
        target_pages = pages or self._get_available_pages(chain)
        
        for page_name in target_pages:
            page_path = ETHERSCAN_PAGES.get(page_name)
            if not page_path:
                continue
            
            url = f"{chain.base_url}{page_path}"
            
            try:
                logger.info(f"  📄 زحف: {page_name} → {url}")
                
                soup = await self.fetch_page(
                    url=url,
                    delay=chain.request_delay,
                    referer=chain.base_url,
                )
                
                if soup is None:
                    logger.warning(f"  ⚠️ فشل جلب {page_name}")
                    snapshot.pages_failed.append(page_name)
                    continue
                
                # تحليل الصفحة حسب نوعها
                self._apply_parsed_data(snapshot, page_name, soup, chain)
                snapshot.pages_crawled.append(page_name)
                
                logger.info(f"  ✅ تم تحليل {page_name}")
                
            except Exception as e:
                logger.error(f"  ❌ خطأ في {page_name}: {e}")
                snapshot.pages_failed.append(page_name)
                snapshot.errors.append(f"{page_name}: {str(e)}")
        
        # ── إثراء ببيانات DeFiLlama التاريخية (TVL, Vol, Fees) ──
        if chain.defillama_slug:
            try:
                logger.info(f"  🦙 جلب تاريخ DeFiLlama للسلسلة: {chain.defillama_slug}")
                defillama_data = await fetch_defillama_history(chain.defillama_slug)
                if defillama_data:
                    snapshot.defillama_series = defillama_data
                    logger.info(f"  ✅ تم جلب {len(defillama_data)} سلاسل من DeFiLlama")
                else:
                    logger.warning(f"  ⚠️ لا توجد بيانات DeFiLlama لـ {chain.defillama_slug}")
            except Exception as e:
                logger.error(f"  ❌ فشل جلب DeFiLlama: {e}")
                snapshot.errors.append(f"defillama: {str(e)}")

        # ── جلب شارتات تاريخية (من Etherscan أو CoinGecko) ──
        try:
            logger.info(f"  📈 جلب شارتات تاريخية...")
            
            # محاولة 1: Etherscan (قد يفشل بسبب 403)
            charts_data = await self._crawl_chart_pages(chain, chain_key=chain_key)
            
            # محاولة 2: CoinGecko fallback (للبيانات الأساسية فقط)
            if not charts_data or len(charts_data) < 3:
                logger.info(f"  🔄 جلب بيانات أساسية من CoinGecko...")
                coingecko_data = await self._fetch_coingecko_charts(chain_key)
                if coingecko_data:
                    # دمج بيانات CoinGecko مع ما لدينا
                    if not charts_data:
                        charts_data = {}
                    charts_data.update(coingecko_data)
                    logger.info(f"  ✅ تم جلب {len(coingecko_data)} شارت من CoinGecko")
            
            if charts_data:
                snapshot.etherscan_charts = charts_data
                logger.info(f"  ✅ إجمالي الشارتات: {len(charts_data)}")
            else:
                logger.warning(f"  ⚠️ لم يتم جلب شارتات تاريخية")
                
        except Exception as e:
            logger.error(f"  ❌ فشل جلب الشارتات التاريخية: {e}")
            snapshot.errors.append(f"chart_pages: {str(e)}")

        # ── إثراء ببيانات RPC العامة (بلوكات، غاز، وقت البلوك) ──
        try:
            await enrich_from_rpc(chain_key, snapshot)
        except Exception as e:
            logger.error(f"  ❌ فشل إثراء RPC: {e}")
            snapshot.errors.append(f"rpc_enricher: {str(e)}")

        # ── فحص صحة البيانات ──
        self._sanitize_snapshot(snapshot, chain_key)

        # حساب مدة الزحف
        snapshot.crawl_duration_seconds = round(time.time() - start_time, 2)
        
        logger.info(f"{'─' * 60}")
        logger.info(
            f"✅ اكتمل زحف {chain.name}: "
            f"{len(snapshot.pages_crawled)} ناجح، "
            f"{len(snapshot.pages_failed)} فشل، "
            f"{snapshot.crawl_duration_seconds}ث"
        )
        logger.info(f"{'═' * 60}")
        
        return snapshot

    async def crawl_all(
        self,
        chain_keys: List[str] = None,
        pages: List[str] = None,
    ) -> Dict[str, ChainSnapshot]:
        """
        زحف عدة سلاسل بالتوازي (مع حد أقصى).
        
        Args:
            chain_keys: قائمة السلاسل (None = الكل المفعّلة)
            pages: الصفحات المطلوبة (None = الكل)
            
        Returns:
            dict: chain_key → ChainSnapshot
        """
        keys = chain_keys or [
            k for k, v in self.chains.items() if v.enabled
        ]
        
        logger.info(f"🚀 بدء زحف {len(keys)} سلسلة...")
        
        results = {}
        semaphore = asyncio.Semaphore(self.settings.max_concurrent_chains)
        
        async def _crawl_with_limit(key: str):
            async with semaphore:
                snapshot = await self.crawl_chain(key, pages)
                if snapshot:
                    results[key] = snapshot
        
        tasks = [_crawl_with_limit(key) for key in keys]
        await asyncio.gather(*tasks, return_exceptions=True)
        
        # ملخص
        total_success = sum(len(s.pages_crawled) for s in results.values())
        total_failed = sum(len(s.pages_failed) for s in results.values())
        total_time = sum(s.crawl_duration_seconds for s in results.values())
        
        logger.info(f"\n{'═' * 60}")
        logger.info(f"📊 ملخص الزحف الكلي:")
        logger.info(f"   سلاسل: {len(results)}/{len(keys)}")
        logger.info(f"   صفحات ناجحة: {total_success}")
        logger.info(f"   صفحات فاشلة: {total_failed}")
        logger.info(f"   وقت إجمالي: {total_time:.1f}ث")
        logger.info(f"{'═' * 60}")
        
        return results

    async def quick_crawl(self, chain_key: str) -> Optional[ChainSnapshot]:
        """
        زحف سريع — فقط الصفحة الرئيسية و /charts.
        للتحديثات المتكررة (كل ساعة).
        """
        return await self.crawl_chain(chain_key, pages=["homepage", "charts"])

    def _get_available_pages(self, chain: ChainConfig) -> List[str]:
        """تحديد الصفحات المتوفرة لسلسلة معينة"""
        pages = ["homepage"]
        
        if chain.has_charts:
            pages.append("charts")
        if chain.has_accounts:
            pages.append("accounts")
        if chain.has_tokens:
            pages.append("tokens")
        if chain.has_gas_tracker:
            pages.append("gas_tracker")
        pages.append("blocks")
        if chain.has_supply:
            pages.append("supply")
        if chain.has_node_tracker:
            pages.append("node_tracker")
        if chain.has_dex:
            pages.append("dex")
        return pages

    def _apply_parsed_data(
        self,
        snapshot: ChainSnapshot,
        page_name: str,
        soup,
        chain: ChainConfig,
    ):
        """تطبيق البيانات المحللة على اللقطة"""
        
        if page_name == "homepage":
            data = parse_homepage(soup, chain.symbol)
            self._merge_network(snapshot, data.get("network"))
            self._merge_transactions(snapshot, data.get("transactions"))
            self._merge_tokens(snapshot, data.get("tokens"))
            self._merge_health(snapshot, data.get("health"))
        
        elif page_name == "charts":
            data = parse_charts(soup)
            self._merge_network(snapshot, data.get("network"))
            self._merge_transactions(snapshot, data.get("transactions"))
            self._merge_tokens(snapshot, data.get("tokens"))
            self._merge_contracts(snapshot, data.get("contracts"))
            self._merge_health(snapshot, data.get("health"))
        
        elif page_name == "accounts":
            data = parse_accounts(soup, chain.symbol)
            self._merge_wallets(snapshot, data.get("wallets"))
        
        elif page_name == "tokens":
            data = parse_tokens(soup)
            if data.get("tokens") and data["tokens"].top_tokens:
                snapshot.tokens.top_tokens = data["tokens"].top_tokens
        
        elif page_name == "gas_tracker":
            data = parse_gas_tracker(soup)
            self._merge_transactions(snapshot, data.get("transactions"))
            self._merge_health(snapshot, data.get("health"))
            snapshot.gas_estimates = data.get("gas_estimates", [])
            snapshot.contracts.top_gas_guzzlers = data.get("top_gas_guzzlers", [])
        
        elif page_name == "blocks":
            data = parse_blocks(soup)
            snapshot.recent_blocks = data.get("recent_blocks", [])
        
        elif page_name == "supply":
            data = parse_supply(soup)
            wallets_data = data.get("wallets")
            if wallets_data:
                if wallets_data.total_supply:
                    snapshot.wallets.total_supply = wallets_data.total_supply
                if wallets_data.supply_details:
                    snapshot.wallets.supply_details = wallets_data.supply_details
        
        elif page_name == "node_tracker":
            data = parse_node_tracker(soup)
            self._merge_health(snapshot, data.get("health"))
        
        elif page_name == "dex":
            data = parse_dex(soup)
            snapshot.recent_dex_trades = data.get("recent_dex_trades", [])

    # ═══════════════════════════════════════════
    # فحص صحة البيانات — Sanity Checks
    # ═══════════════════════════════════════════

    def _sanitize_snapshot(self, snapshot: ChainSnapshot, chain_key: str):
        """فحص وتصحيح القيم غير المنطقية."""
        # ── total_token_contracts: يجب أن يكون أقل من 100M ──
        if snapshot.tokens.total_token_contracts is not None:
            if snapshot.tokens.total_token_contracts > 100_000_000:
                logger.warning(
                    f"  🔧 تصحيح total_token_contracts: "
                    f"{snapshot.tokens.total_token_contracts:,} → None (overflow)"
                )
                snapshot.tokens.total_token_contracts = None

        # ── total_transactions: يجب أن يكون أقل من 100T ──
        if snapshot.network.total_transactions is not None:
            if snapshot.network.total_transactions > 100_000_000_000_000:
                logger.warning(
                    f"  🔧 تصحيح total_transactions: "
                    f"{snapshot.network.total_transactions:,} → None (overflow)"
                )
                snapshot.network.total_transactions = None

        # ── total_addresses: يجب أن يكون أقل من 10B ──
        if snapshot.network.total_addresses is not None:
            if snapshot.network.total_addresses > 10_000_000_000:
                logger.warning(
                    f"  🔧 تصحيح total_addresses: "
                    f"{snapshot.network.total_addresses:,} → None (overflow)"
                )
                snapshot.network.total_addresses = None

        # ── gas_price: يجب أن يكون أقل من 100,000 Gwei ──
        if snapshot.transactions.gas_price_avg is not None:
            if snapshot.transactions.gas_price_avg > 100_000:
                logger.warning(
                    f"  🔧 تصحيح gas_price_avg: "
                    f"{snapshot.transactions.gas_price_avg} → None (overflow)"
                )
                snapshot.transactions.gas_price_avg = None

        # ── tps: يجب أن يكون أقل من 100,000 ──
        if snapshot.network.tps is not None:
            if snapshot.network.tps > 100_000 or snapshot.network.tps < 0:
                snapshot.network.tps = None

        # ── native_price: يجب أن يكون أقل من $1M ──
        if snapshot.tokens.native_price_usd is not None:
            if snapshot.tokens.native_price_usd > 1_000_000:
                snapshot.tokens.native_price_usd = None

    # ═══════════════════════════════════════════
    # دوال الدمج — تُحدّث القيم فقط إذا كانت جديدة
    # ═══════════════════════════════════════════

    def _merge_network(self, snapshot: ChainSnapshot, data):
        """دمج بيانات الشبكة — القيمة الجديدة تأخذ أولوية"""
        if not data:
            return
        # Some pages (e.g., homepage) may provide partial/rounded totals.
        # /charts is typically more authoritative for cumulative counters.
        prefer_max_fields = {
            "total_addresses",
            "total_transactions",
            "total_blocks",
        }

        for field_name in [
            "total_addresses", "active_addresses_daily",
            "total_transactions", "tps", "txs_per_day",
            "total_blocks", "avg_block_time_seconds",
            "new_addresses_daily", "new_addresses_pct",
        ]:
            new_val = getattr(data, field_name, None)
            if new_val is None:
                continue

            old_val = getattr(snapshot.network, field_name, None)
            if old_val is None:
                setattr(snapshot.network, field_name, new_val)
                continue

            if field_name in prefer_max_fields:
                try:
                    if float(new_val) > float(old_val):
                        setattr(snapshot.network, field_name, new_val)
                except Exception:
                    # If comparison fails, fall back to keeping existing.
                    pass

    def _merge_transactions(self, snapshot: ChainSnapshot, data):
        if not data:
            return
        for field_name in [
            "avg_tx_fee_usd", "total_fees_24h", "total_fees_24h_usd",
            "gas_price_low", "gas_price_avg", "gas_price_high",
            "daily_gas_used", "daily_burned",
            "network_utilization_pct", "pending_txs",
        ]:
            new_val = getattr(data, field_name, None)
            if new_val is not None:
                old_val = getattr(snapshot.transactions, field_name, None)
                if old_val is None:
                    setattr(snapshot.transactions, field_name, new_val)

    def _merge_tokens(self, snapshot: ChainSnapshot, data):
        if not data:
            return
        for field_name in [
            "native_price_usd", "native_price_btc",
            "native_price_change_pct", "native_market_cap",
            "total_token_contracts", "erc20_daily_transfers",
        ]:
            new_val = getattr(data, field_name, None)
            if new_val is not None:
                old_val = getattr(snapshot.tokens, field_name, None)
                if old_val is None:
                    setattr(snapshot.tokens, field_name, new_val)

    def _merge_contracts(self, snapshot: ChainSnapshot, data):
        if not data:
            return
        for field_name in [
            "new_contracts_daily", "verified_contracts_daily",
            "staking_balance", "staking_pct",
        ]:
            new_val = getattr(data, field_name, None)
            if new_val is not None:
                old_val = getattr(snapshot.contracts, field_name, None)
                if old_val is None:
                    setattr(snapshot.contracts, field_name, new_val)

    def _merge_wallets(self, snapshot: ChainSnapshot, data):
        if not data:
            return
        if data.top_accounts:
            snapshot.wallets.top_accounts = data.top_accounts
        if data.top10_concentration_pct is not None:
            snapshot.wallets.top10_concentration_pct = data.top10_concentration_pct
        if data.exchange_balances:
            snapshot.wallets.exchange_balances = data.exchange_balances

    def _merge_health(self, snapshot: ChainSnapshot, data):
        if not data:
            return
        for field_name in [
            "total_nodes", "node_growth_24h_pct",
            "node_growth_7d_pct", "node_growth_30d_pct",
            "confirmation_time_seconds",
            "last_finalized_block", "last_safe_block",
        ]:
            new_val = getattr(data, field_name, None)
            if new_val is not None:
                old_val = getattr(snapshot.health, field_name, None)
                if old_val is None:
                    setattr(snapshot.health, field_name, new_val)

    async def _crawl_chart_pages(
        self,
        chain: ChainConfig,
        chain_key: str = "",
        max_charts: int = 14,
    ) -> Dict[str, Any]:
        """
        🔥 جلب بيانات تاريخية من صفحات الشارتات باستخدام متصفح حقيقي (DrissionPage)
        لتجاوز حماية Cloudflare.
        
        Args:
            chain: إعدادات السلسلة
            chain_key: مفتاح السلسلة (e.g. "ethereum")
            max_charts: أقصى عدد شارتات للجلب
            
        Returns:
            Dict[metric_key, ChartTimeSeries]
        """
        if not chain_key:
            # استخراج المفتاح من base_url
            for k, v in ETHERSCAN_CHAINS.items():
                if v.base_url == chain.base_url:
                    chain_key = k
                    break

        try:
            logger.info(f"    🌐 جلب الشارتات بالمتصفح لـ {chain.name}...")
            fetcher = BrowserChartFetcher(headless=False)
            try:
                results = await asyncio.to_thread(
                    fetcher.crawl_chain_charts,
                    chain_key,
                    max_charts,
                    4.0,  # delay
                )
                return results or {}
            finally:
                await asyncio.to_thread(fetcher.close)
        except Exception as e:
            logger.error(f"    ❌ فشل جلب الشارتات بالمتصفح: {e}")
            return {}

    async def _fetch_coingecko_charts(
        self,
        chain_key: str,
        days: int = 180,
    ) -> Dict[str, Any]:
        """
        💎 جلب بيانات أساسية من CoinGecko (fallback)
        
        Args:
            chain_key: مفتاح السلسلة
            days: عدد الأيام (default: 180)
            
        Returns:
            Dict[metric_key, ChartTimeSeries]
        """
        try:
            fetcher = CoinGeckoFetcher()
            charts = await fetcher.fetch_chain_charts(chain_key, days)
            await fetcher.close()
            return charts or {}
        except Exception as e:
            logger.error(f"    ❌ خطأ في جلب من CoinGecko: {e}")
            return {}

