"""
🔵 زاحف عائلة Cosmos — Cosmos LCD REST API Scraper
═══════════════════════════════════════════════════════
زاحف ذكي يعمل على 12 سلسلة Cosmos عبر LCD REST API.

الاستراتيجية الذكية:
═══════════════════
1. GET LCD API عبر rest.cosmos.directory (بوابة عامة آمنة)
2. كل السلاسل تشترك بنفس المسارات: /cosmos/{module}/...
3. يبدو كطلب AJAX من متصفح (headers ذكية)
4. ترتيب عشوائي للنقاط
5. chain registry من cosmos.directory لبيانات إضافية

السلاسل المدعومة (12):
─────────────────────
Cosmos Hub, Osmosis, Persistence, Juno, Fetch.ai,
Axelar, Band, Stargaze, Saga, Neutron,
Injective, Kava
"""

import asyncio
import json
import time
import random
from datetime import datetime
from typing import Optional, List, Dict, Any

import aiohttp
from loguru import logger

from .base_scraper import BaseScraper
from .config import (
    CrawlerSettings,
    DEFAULT_SETTINGS,
    COSMOS_CHAINS,
    COSMOS_LCD_ENDPOINTS,
    CosmosChainConfig,
)
from .models import ChainSnapshot
from .utils import get_random_user_agent

from .parsers.cosmos_api import get_parser, parse_staking_pool, parse_validators


class CosmosScraper(BaseScraper):
    """
    زاحف عائلة Cosmos — يغطي 12 سلسلة.
    
    يستخدم LCD REST API عبر rest.cosmos.directory:
      GET https://rest.cosmos.directory/{chain}/cosmos/{module}/...
    
    الاستخدام:
        scraper = CosmosScraper()
        
        # زحف سلسلة واحدة
        snapshot = await scraper.crawl_chain("cosmos")
        
        # زحف كل السلاسل
        results = await scraper.crawl_all()
    """

    def __init__(self, settings: CrawlerSettings = None):
        super().__init__(settings)
        self.chains = COSMOS_CHAINS.copy()

    # ══════════════════════════════════════════════════════════════
    # 🔌 جلب JSON عبر GET API
    # ══════════════════════════════════════════════════════════════

    async def fetch_json(
        self,
        url: str,
        delay: float = None,
        retries: int = 3,
        referer: str = None,
    ) -> Optional[dict]:
        """جلب بيانات JSON من LCD REST API."""
        delay = delay or self.settings.default_delay * 0.5
        retries = retries or 3

        await self._rate_limit(url, delay)

        session = await self._get_session()

        for attempt in range(1, retries + 1):
            try:
                headers = self._get_api_headers(referer)

                logger.debug(f"🔵 [{attempt}/{retries}] GET: {url}")

                async with session.get(
                    url,
                    headers=headers,
                    allow_redirects=True,
                ) as response:
                    status = response.status

                    if status == 200:
                        text = await response.text()
                        self._request_count += 1

                        try:
                            data = json.loads(text)
                            logger.debug(f"✅ LCD OK: {url}")
                            return data
                        except json.JSONDecodeError:
                            logger.warning(f"⚠️ استجابة غير JSON: {url}")
                            return None

                    elif status == 429:
                        wait = 10 * attempt + random.uniform(3, 8)
                        logger.warning(f"⏳ 429 Rate Limited — انتظار {wait:.0f}ث")
                        self._error_count += 1
                        await asyncio.sleep(wait)
                        continue

                    elif status in (501, 400):
                        # بعض العقد لا تدعم كل النقاط
                        logger.warning(f"⚠️ {status} Not Supported: {url}")
                        self._error_count += 1
                        return None

                    elif status in (403, 401):
                        logger.warning(f"🚫 {status}: {url}")
                        self._error_count += 1
                        return None

                    elif status >= 500:
                        wait = 5 * attempt + random.uniform(2, 5)
                        logger.warning(f"💥 خطأ سيرفر {status}: {url}")
                        self._error_count += 1
                        await asyncio.sleep(wait)
                        continue

                    else:
                        logger.warning(f"❌ حالة {status}: {url}")
                        self._error_count += 1
                        return None

            except asyncio.CancelledError:
                return None

            except asyncio.TimeoutError:
                logger.warning(f"⏰ انتهت المهلة: {url} (محاولة {attempt})")
                self._error_count += 1
                if attempt < retries:
                    await asyncio.sleep(5 * attempt)
                    continue

            except aiohttp.ClientError as e:
                logger.error(f"🔌 خطأ: {type(e).__name__}: {e}")
                self._error_count += 1
                if attempt < retries:
                    await asyncio.sleep(min(8 * attempt, 30))
                    continue

            except Exception as e:
                logger.error(f"❗ خطأ غير متوقع: {e}")
                self._error_count += 1
                return None

        logger.error(f"💀 فشل LCD بعد {retries} محاولات: {url}")
        return None

    def _get_api_headers(self, referer: str = None) -> dict:
        """ترويسات ذكية لـ LCD API"""
        headers = {
            "User-Agent": get_random_user_agent(),
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "DNT": "1",
            "Connection": "keep-alive",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "cross-site",
        }
        if referer:
            headers["Referer"] = referer
            headers["Origin"] = referer.rstrip("/")
        return headers

    # ══════════════════════════════════════════════════════════════
    # 🕷️ زحف سلسلة واحدة
    # ══════════════════════════════════════════════════════════════

    async def crawl_chain(
        self,
        chain_key: str,
    ) -> Optional[ChainSnapshot]:
        """زحف سلسلة Cosmos واحدة عبر LCD REST API."""
        if chain_key not in self.chains:
            logger.error(f"❌ سلسلة غير معروفة: {chain_key}")
            return None

        chain: CosmosChainConfig = self.chains[chain_key]
        if not chain.enabled:
            logger.info(f"⏭️ السلسلة {chain.name} معطلة")
            return None

        start_time = time.time()
        logger.info(f"{'═' * 60}")
        logger.info(f"🔵 بدء زحف Cosmos: {chain.name} ({chain.cosmos_chain_id})")
        logger.info(f"{'═' * 60}")

        snapshot = ChainSnapshot(
            chain_name=chain.name,
            chain_symbol=chain.symbol,
            chain_id=chain.chain_id,
            timestamp=datetime.now().isoformat(),
        )

        lcd_base = f"https://rest.cosmos.directory/{chain.cosmos_chain_id}"
        referer = chain.base_url + "/"

        # ── ترتيب عشوائي (staking_pool أولاً — الأغنى بالبيانات) ──
        endpoints = list(COSMOS_LCD_ENDPOINTS.items())
        priority = [e for e in endpoints if e[0] in ("staking_pool", "blocks_latest")]
        rest = [e for e in endpoints if e[0] not in ("staking_pool", "blocks_latest")]
        random.shuffle(rest)
        ordered = priority + rest

        for ep_name, ep_path in ordered:
            url = f"{lcd_base}{ep_path}"

            try:
                logger.info(f"  🔵 LCD: {ep_name} → {url}")

                # تأخير عشوائي
                jitter = random.uniform(0.5, 1.5)
                await asyncio.sleep(jitter)

                data = await self.fetch_json(
                    url=url,
                    delay=chain.request_delay,
                    referer=referer,
                )

                if data is not None:
                    parser = get_parser(ep_name)
                    if parser:
                        # staking_pool & validators تحتاج decimals
                        if ep_name == "staking_pool":
                            parsed = parse_staking_pool(data, chain.token_decimals)
                        elif ep_name == "validators":
                            parsed = parse_validators(data, chain.token_decimals)
                        else:
                            parsed = parser(data)

                        self._merge_all(snapshot, parsed)
                        snapshot.pages_crawled.append(f"lcd_{ep_name}")
                        logger.info(f"  ✅ تم: {ep_name}")
                    else:
                        logger.warning(f"  ⚠️ لا يوجد محلل لـ {ep_name}")
                        snapshot.pages_failed.append(ep_name)
                else:
                    snapshot.pages_failed.append(ep_name)
                    logger.warning(f"  ❌ فشل: {ep_name}")

            except Exception as e:
                logger.error(f"  ❌ خطأ في {ep_name}: {e}")
                snapshot.pages_failed.append(ep_name)
                snapshot.errors.append(f"{ep_name}: {str(e)}")

        # ── Chain Registry (بيانات إضافية) ──
        try:
            logger.info(f"  🔵 Chain Registry...")
            registry_url = f"https://chains.cosmos.directory/{chain.cosmos_chain_id}"
            await asyncio.sleep(random.uniform(0.5, 1.0))
            reg_data = await self.fetch_json(url=registry_url, delay=1.0)
            if reg_data:
                from .parsers.cosmos_api import parse_chain_registry
                parsed = parse_chain_registry(reg_data)
                if parsed.get("extra"):
                    snapshot.wallets.supply_details.update(parsed["extra"])
                snapshot.pages_crawled.append("chain_registry")
                logger.info(f"  ✅ تم: chain_registry")
        except Exception as e:
            logger.warning(f"  ⚠️ chain_registry: {e}")

        # ── إثراء ببيانات DeFiLlama التاريخية ──
        if chain.defillama_slug:
            try:
                from .defillama_fetcher import fetch_defillama_history
                logger.info(f"  🦙 جلب تاريخ DeFiLlama: {chain.defillama_slug}")
                defillama_data = await fetch_defillama_history(chain.defillama_slug)
                if defillama_data:
                    snapshot.defillama_series = defillama_data
                    logger.info(f"  ✅ تم جلب {len(defillama_data)} سلاسل DeFiLlama")
                else:
                    logger.warning(f"  ⚠️ لا توجد بيانات DeFiLlama لـ {chain.defillama_slug}")
            except Exception as e:
                logger.error(f"  ❌ فشل جلب DeFiLlama: {e}")
                snapshot.errors.append(f"defillama: {str(e)}")

        # حساب مدة الزحف
        snapshot.crawl_duration_seconds = round(time.time() - start_time, 2)

        logger.info(f"{'─' * 60}")
        logger.info(
            f"✅ اكتمل Cosmos {chain.name}: "
            f"{len(snapshot.pages_crawled)} ناجح، "
            f"{len(snapshot.pages_failed)} فشل، "
            f"{snapshot.crawl_duration_seconds}ث"
        )
        logger.info(f"{'═' * 60}")

        return snapshot

    # ══════════════════════════════════════════════════════════════
    # 🚀 زحف عدة سلاسل
    # ══════════════════════════════════════════════════════════════

    async def crawl_all(
        self,
        chain_keys: List[str] = None,
    ) -> Dict[str, ChainSnapshot]:
        """زحف عدة سلاسل Cosmos بالتوازي"""
        keys = chain_keys or [
            k for k, c in self.chains.items() if c.enabled
        ]

        logger.info(f"🔵 بدء زحف {len(keys)} سلسلة Cosmos...")

        results = {}
        semaphore = asyncio.Semaphore(self.settings.max_concurrent_chains)

        async def _crawl_with_limit(key):
            async with semaphore:
                return key, await self.crawl_chain(key)

        tasks = [_crawl_with_limit(k) for k in keys]
        completed = await asyncio.gather(*tasks, return_exceptions=True)

        for item in completed:
            if isinstance(item, Exception):
                logger.error(f"❌ خطأ: {item}")
                continue
            key, snapshot = item
            if snapshot:
                results[key] = snapshot

        # ملخص
        total_pages = sum(len(s.pages_crawled) for s in results.values())
        total_failed = sum(len(s.pages_failed) for s in results.values())
        total_time = sum(s.crawl_duration_seconds for s in results.values())

        logger.info(f"{'═' * 60}")
        logger.info(f"📊 ملخص Cosmos:")
        logger.info(f"  سلاسل: {len(results)}/{len(keys)}")
        logger.info(f"  صفحات ناجحة: {total_pages}")
        logger.info(f"  صفحات فاشلة: {total_failed}")
        logger.info(f"  وقت إجمالي: {total_time:.1f}ث")
        logger.info(f"{'═' * 60}")

        return results

    async def quick_crawl(
        self,
        chain_key: str,
    ) -> Optional[ChainSnapshot]:
        """زحف سريع — staking pool + latest block فقط"""
        if chain_key not in self.chains:
            return None

        chain = self.chains[chain_key]
        snapshot = ChainSnapshot(
            chain_name=chain.name,
            chain_symbol=chain.symbol,
            chain_id=chain.chain_id,
            timestamp=datetime.now().isoformat(),
        )

        lcd_base = f"https://rest.cosmos.directory/{chain.cosmos_chain_id}"

        # Staking pool
        data = await self.fetch_json(
            url=f"{lcd_base}/cosmos/staking/v1beta1/pool",
            delay=chain.request_delay,
        )
        if data:
            parsed = parse_staking_pool(data, chain.token_decimals)
            self._merge_all(snapshot, parsed)
            snapshot.pages_crawled.append("lcd_staking_pool")

        return snapshot

    # ══════════════════════════════════════════════════════════════
    # 🔀 دمج البيانات
    # ══════════════════════════════════════════════════════════════

    def _merge_all(self, snapshot: ChainSnapshot, parsed: dict):
        """دمج كل البيانات المحللة"""
        if not parsed:
            return

        # ── الشبكة ──
        if "network" in parsed:
            n = parsed["network"]
            sn = snapshot.network
            sn.total_blocks = n.total_blocks or sn.total_blocks
            sn.total_transactions = n.total_transactions or sn.total_transactions
            sn.total_addresses = n.total_addresses or sn.total_addresses

        # ── المحافظ ──
        if "wallets" in parsed:
            w = parsed["wallets"]
            sw = snapshot.wallets
            if w.top_accounts and not sw.top_accounts:
                sw.top_accounts = w.top_accounts
            if w.total_supply:
                sw.total_supply = w.total_supply
            if w.supply_details:
                sw.supply_details.update(w.supply_details)

        # ── العقود ──
        if "contracts" in parsed:
            c = parsed["contracts"]
            sc = snapshot.contracts
            sc.staking_balance = c.staking_balance or sc.staking_balance
            sc.staking_pct = c.staking_pct or sc.staking_pct

        # ── صحة الشبكة ──
        if "health" in parsed:
            h = parsed["health"]
            sh = snapshot.health
            sh.total_nodes = h.total_nodes or sh.total_nodes

        # ── بيانات إضافية ──
        if "extra" in parsed:
            snapshot.wallets.supply_details.update(parsed["extra"])
