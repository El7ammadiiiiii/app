"""
🟠 زاحف مواقع المستوى الثاني — Level 2 Sites Scraper
═══════════════════════════════════════════════════════════
زاحف ذكي يعمل على 10 سلاسل متنوعة بـ Adapter Pattern.

الاستراتيجية:
═════════════
1. كل سلسلة لها API مختلف (GET أو POST)
2. محلل مخصص لكل سلسلة ونقطة API
3. تدوير User-Agent + تأخير عشوائي
4. Referer من موقع المستكشف الأصلي

السلاسل المدعومة (11):
─────────────────
API GET:  Celestia, Stacks, Litecoin, Tezos, Hedera, Aptos, IOTA, Telos, Theta
API POST: Radix
Multi-API: Bitcoin (Blockchair + Blockchain.com + Mempool.space)
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
    LEVEL2_CHAINS,
    Level2ChainConfig,
)
from .models import ChainSnapshot
from .utils import get_random_user_agent

from .parsers.level2_api import get_parser


class Level2Scraper(BaseScraper):
    """
    زاحف مواقع المستوى 2 — يغطي 10 سلاسل متنوعة.
    
    يستخدم نمط Adapter: كل سلسلة لها API ومحلل خاص.
    بعض السلاسل تستخدم GET وبعضها POST.
    
    الاستخدام:
        scraper = Level2Scraper()
        
        # زحف سلسلة واحدة
        snapshot = await scraper.crawl_chain("celestia")
        
        # زحف كل السلاسل
        results = await scraper.crawl_all()
    """

    def __init__(self, settings: CrawlerSettings = None):
        super().__init__(settings)
        self.chains = LEVEL2_CHAINS.copy()

    # ══════════════════════════════════════════════════════════════
    # 🔌 جلب JSON (GET أو POST)
    # ══════════════════════════════════════════════════════════════

    async def fetch_json(
        self,
        url: str,
        method: str = "GET",
        body: dict = None,
        delay: float = None,
        retries: int = 3,
        referer: str = None,
    ) -> Optional[Any]:
        """جلب بيانات JSON — يدعم GET و POST."""
        delay = delay or self.settings.default_delay * 0.5
        retries = retries or 3

        await self._rate_limit(url, delay)

        session = await self._get_session()

        for attempt in range(1, retries + 1):
            try:
                headers = self._get_api_headers(referer, method)

                logger.debug(f"🟠 [{attempt}/{retries}] {method}: {url}")

                if method == "POST":
                    async with session.post(
                        url, headers=headers, json=body or {},
                        allow_redirects=True,
                    ) as response:
                        result = await self._handle_response(response, url)
                        if result is not None:
                            return result
                        elif response.status == 429:
                            wait = 10 * attempt + random.uniform(3, 8)
                            await asyncio.sleep(wait)
                            continue
                        elif response.status >= 500:
                            wait = 5 * attempt
                            await asyncio.sleep(wait)
                            continue
                        else:
                            return None
                else:
                    async with session.get(
                        url, headers=headers,
                        allow_redirects=True,
                    ) as response:
                        result = await self._handle_response(response, url)
                        if result is not None:
                            return result
                        elif response.status == 429:
                            wait = 10 * attempt + random.uniform(3, 8)
                            await asyncio.sleep(wait)
                            continue
                        elif response.status >= 500:
                            wait = 5 * attempt
                            await asyncio.sleep(wait)
                            continue
                        else:
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

        logger.error(f"💀 فشل بعد {retries} محاولات: {url}")
        return None

    async def _handle_response(self, response, url: str) -> Optional[Any]:
        """معالجة الاستجابة مشتركة بين GET و POST"""
        status = response.status

        if status == 200:
            text = await response.text()
            self._request_count += 1

            try:
                data = json.loads(text)
                logger.debug(f"✅ OK: {url}")
                return data
            except json.JSONDecodeError:
                # قد يكون رقم فقط (مثل blocks tip height)
                text = text.strip()
                if text and _is_numeric(text):
                    return text
                logger.warning(f"⚠️ استجابة غير JSON: {url}")
                return None

        elif status in (429,):
            logger.warning(f"⏳ 429 Rate Limited: {url}")
            self._error_count += 1
            return None  # caller سيعيد المحاولة

        elif status in (400, 403, 401, 404):
            logger.warning(f"🚫 {status}: {url}")
            self._error_count += 1
            return None

        elif status >= 500:
            logger.warning(f"💥 خطأ سيرفر {status}: {url}")
            self._error_count += 1
            return None

        else:
            logger.warning(f"❌ حالة {status}: {url}")
            self._error_count += 1
            return None

    def _get_api_headers(self, referer: str = None, method: str = "GET") -> dict:
        """ترويسات ذكية"""
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
        if method == "POST":
            headers["Content-Type"] = "application/json"
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
        """زحف سلسلة Level 2 واحدة."""
        if chain_key not in self.chains:
            logger.error(f"❌ سلسلة غير معروفة: {chain_key}")
            return None

        chain: Level2ChainConfig = self.chains[chain_key]
        if not chain.enabled:
            logger.info(f"⏭️ السلسلة {chain.name} معطلة")
            return None

        start_time = time.time()
        logger.info(f"{'═' * 60}")
        logger.info(f"🟠 بدء زحف Level2: {chain.name} ({chain.api_base})")
        logger.info(f"{'═' * 60}")

        snapshot = ChainSnapshot(
            chain_name=chain.name,
            chain_symbol=chain.symbol,
            chain_id=chain.chain_id,
            timestamp=datetime.now().isoformat(),
        )

        referer = chain.base_url + "/"
        method = chain.api_method

        # ── زحف كل النقاط ──
        endpoints = list(chain.api_endpoints.items())
        random.shuffle(endpoints)

        for ep_name, ep_path in endpoints:
            # دعم URLs كاملة (Multi-API مثل Bitcoin)
            if ep_path.startswith("http"):
                url = ep_path
                # Referer مطابق للنطاق
                from urllib.parse import urlparse
                ep_referer = f"{urlparse(url).scheme}://{urlparse(url).netloc}/"
            else:
                url = f"{chain.api_base}{ep_path}"
                ep_referer = referer

            try:
                logger.info(f"  🟠 {method}: {ep_name} → {url}")

                # تأخير عشوائي
                jitter = random.uniform(0.5, 1.5)
                await asyncio.sleep(jitter)

                data = await self.fetch_json(
                    url=url,
                    method=method,
                    delay=chain.request_delay,
                    referer=ep_referer,
                )

                if data is not None:
                    parser = get_parser(chain_key, ep_name)
                    if parser:
                        parsed = parser(data)
                        self._merge_all(snapshot, parsed)
                        snapshot.pages_crawled.append(f"api_{ep_name}")
                        logger.info(f"  ✅ تم: {ep_name}")
                    else:
                        logger.warning(f"  ⚠️ لا يوجد محلل لـ {chain_key}/{ep_name}")
                        snapshot.pages_failed.append(ep_name)
                else:
                    snapshot.pages_failed.append(ep_name)
                    logger.warning(f"  ❌ فشل: {ep_name}")

            except Exception as e:
                logger.error(f"  ❌ خطأ في {ep_name}: {e}")
                snapshot.pages_failed.append(ep_name)
                snapshot.errors.append(f"{ep_name}: {str(e)}")

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
            f"✅ اكتمل Level2 {chain.name}: "
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
        """زحف عدة سلاسل Level 2"""
        keys = chain_keys or [
            k for k, c in self.chains.items() if c.enabled
        ]

        logger.info(f"🟠 بدء زحف {len(keys)} سلسلة Level 2...")

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
        logger.info(f"📊 ملخص Level 2:")
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
        """زحف سريع — أول نقطة فقط"""
        return await self.crawl_chain(chain_key)

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
            sn.total_addresses = n.total_addresses or sn.total_addresses
            sn.active_addresses_daily = n.active_addresses_daily or sn.active_addresses_daily
            sn.total_transactions = n.total_transactions or sn.total_transactions
            sn.tps = n.tps or sn.tps
            sn.txs_per_day = n.txs_per_day or sn.txs_per_day
            sn.total_blocks = n.total_blocks or sn.total_blocks
            sn.avg_block_time_seconds = n.avg_block_time_seconds or sn.avg_block_time_seconds
            sn.blockchain_size_gb = n.blockchain_size_gb or sn.blockchain_size_gb

        # ── المعاملات ──
        if "transactions" in parsed:
            tx = parsed["transactions"]
            stx = snapshot.transactions
            stx.avg_tx_fee_usd = tx.avg_tx_fee_usd or stx.avg_tx_fee_usd
            stx.median_tx_fee_usd = tx.median_tx_fee_usd or stx.median_tx_fee_usd
            stx.suggested_fee_per_byte = tx.suggested_fee_per_byte or stx.suggested_fee_per_byte
            stx.total_fees_24h = tx.total_fees_24h or stx.total_fees_24h
            stx.total_fees_24h_usd = tx.total_fees_24h_usd or stx.total_fees_24h_usd
            stx.gas_price_low = tx.gas_price_low or stx.gas_price_low
            stx.gas_price_avg = tx.gas_price_avg or stx.gas_price_avg
            stx.gas_price_high = tx.gas_price_high or stx.gas_price_high
            stx.pending_txs = tx.pending_txs or stx.pending_txs

        # ── التوكنات ──
        if "tokens" in parsed:
            t = parsed["tokens"]
            stk = snapshot.tokens
            stk.native_price_usd = t.native_price_usd or stk.native_price_usd
            stk.native_price_btc = t.native_price_btc or stk.native_price_btc
            stk.native_price_change_pct = t.native_price_change_pct or stk.native_price_change_pct
            stk.native_market_cap = t.native_market_cap or stk.native_market_cap
            stk.market_dominance_pct = t.market_dominance_pct or stk.market_dominance_pct

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

        # ── Lightning Network ──
        if "lightning" in parsed:
            snapshot.lightning = parsed["lightning"]

        # ── البلوكات ──
        if "blocks" in parsed:
            blocks = parsed["blocks"]
            if blocks and not snapshot.recent_blocks:
                snapshot.recent_blocks = blocks


def _is_numeric(text: str) -> bool:
    """هل النص رقم؟"""
    try:
        float(text.strip())
        return True
    except (ValueError, TypeError):
        return False
