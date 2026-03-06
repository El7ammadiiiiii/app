"""
🟣 زاحف عائلة Subscan — Subscan Family Scraper
═══════════════════════════════════════════════════
زاحف ذكي يعمل على 6 سلاسل Substrate عبر Subscan POST API.

الاستراتيجية الذكية:
═══════════════════
1. POST API مباشر (JSON) — يبدو كطلب AJAX من متصفح
2. كل السلاسل تشترك بنفس البنية: $network.api.subscan.io
3. تأخير 2.5ث بين الطلبات (rate limit بدون مفتاح API)
4. تدوير User-Agent + ترتيب عشوائي للنقاط
5. زيارة الصفحة الرئيسية أولاً (جلب كوكيز)
6. Referer من موقع subscan نفسه

السلاسل المدعومة (6):
─────────────────────
Polkadot, Kusama, Astar, Acala, Phala, Bifrost
"""

import asyncio
import json
import time
import random
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

import aiohttp
from loguru import logger

from .base_scraper import BaseScraper
from .config import (
    CrawlerSettings,
    DEFAULT_SETTINGS,
    SUBSCAN_CHAINS,
    SUBSCAN_API_ENDPOINTS,
    SubscanChainConfig,
)
from .models import ChainSnapshot
from .utils import get_random_user_agent

from .parsers.subscan_api import get_parser, parse_token


class SubscanScraper(BaseScraper):
    """
    زاحف عائلة Subscan — يغطي 6 سلاسل Substrate.
    
    يستخدم POST API مع نقاط موحدة:
      POST https://{subdomain}.api.subscan.io/api/scan/{endpoint}
    
    الاستخدام:
        scraper = SubscanScraper()
        
        # زحف سلسلة واحدة
        snapshot = await scraper.crawl_chain("polkadot")
        
        # زحف كل السلاسل
        results = await scraper.crawl_all()
    """

    def __init__(self, settings: CrawlerSettings = None):
        super().__init__(settings)
        self.chains = SUBSCAN_CHAINS.copy()

    # ══════════════════════════════════════════════════════════════
    # 🔌 جلب JSON عبر POST API
    # ══════════════════════════════════════════════════════════════

    async def fetch_post_json(
        self,
        url: str,
        body: dict = None,
        delay: float = None,
        retries: int = 3,
        referer: str = None,
    ) -> Optional[dict]:
        """
        جلب بيانات JSON عبر POST.
        
        Subscan يستخدم POST لكل نقاط الـ API.
        """
        if body is None:
            body = {}
        delay = delay or self.settings.default_delay * 0.8
        retries = retries or 3

        await self._rate_limit(url, delay)

        session = await self._get_session()

        for attempt in range(1, retries + 1):
            try:
                headers = self._get_api_headers(referer)

                logger.debug(f"🟣 [{attempt}/{retries}] POST: {url}")

                async with session.post(
                    url,
                    headers=headers,
                    json=body,
                    allow_redirects=True,
                ) as response:
                    status = response.status

                    if status == 200:
                        text = await response.text()
                        self._request_count += 1

                        try:
                            data = json.loads(text)
                            # التحقق من كود النجاح (Subscan يُرجع code: 0 للنجاح)
                            code = data.get("code", -1)
                            if code == 0:
                                logger.debug(f"✅ POST OK: {url}")
                                return data
                            else:
                                msg = data.get("message", "Unknown error")
                                logger.warning(f"⚠️ Subscan code {code}: {msg} — {url}")
                                return data  # نُرجعها على أي حال
                        except json.JSONDecodeError:
                            logger.warning(f"⚠️ استجابة غير JSON: {url}")
                            return None

                    elif status == 429:
                        wait = 15 * attempt + random.uniform(5, 10)
                        logger.warning(f"⏳ 429 Rate Limited — انتظار {wait:.0f}ث: {url}")
                        self._error_count += 1
                        await asyncio.sleep(wait)
                        continue

                    elif status in (403, 401):
                        logger.warning(f"🚫 {status}: {url}")
                        self._error_count += 1
                        if attempt < retries:
                            wait = 30 * attempt
                            await asyncio.sleep(wait)
                            continue
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

        logger.error(f"💀 فشل POST بعد {retries} محاولات: {url}")
        return None

    def _get_api_headers(self, referer: str = None) -> dict:
        """ترويسات ذكية لـ Subscan POST API"""
        headers = {
            "User-Agent": get_random_user_agent(),
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Content-Type": "application/json",
            "DNT": "1",
            "Connection": "keep-alive",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-site",
        }
        if referer:
            headers["Referer"] = referer
            headers["Origin"] = referer.rstrip("/").split("/")[0] + "//" + referer.split("//")[1].split("/")[0]
        return headers

    # ══════════════════════════════════════════════════════════════
    # 🕷️ زحف سلسلة واحدة
    # ══════════════════════════════════════════════════════════════

    async def crawl_chain(
        self,
        chain_key: str,
    ) -> Optional[ChainSnapshot]:
        """زحف سلسلة Subscan واحدة عبر POST API."""
        if chain_key not in self.chains:
            logger.error(f"❌ سلسلة غير معروفة: {chain_key}")
            return None

        chain: SubscanChainConfig = self.chains[chain_key]
        if not chain.enabled:
            logger.info(f"⏭️ السلسلة {chain.name} معطلة")
            return None

        start_time = time.time()
        logger.info(f"{'═' * 60}")
        logger.info(f"🟣 بدء زحف Subscan: {chain.name} ({chain.api_subdomain}.api.subscan.io)")
        logger.info(f"{'═' * 60}")

        snapshot = ChainSnapshot(
            chain_name=chain.name,
            chain_symbol=chain.symbol,
            chain_id=chain.chain_id,
            timestamp=datetime.now().isoformat(),
        )

        api_base = f"https://{chain.api_subdomain}.api.subscan.io"
        referer = chain.base_url + "/"

        # ── ترتيب عشوائي (metadata أولاً دائماً) ──
        endpoints = list(SUBSCAN_API_ENDPOINTS.items())
        priority = [e for e in endpoints if e[0] == "metadata"]
        rest = [e for e in endpoints if e[0] != "metadata"]
        random.shuffle(rest)
        ordered = priority + rest

        for ep_name, ep_path in ordered:
            url = f"{api_base}{ep_path}"

            try:
                logger.info(f"  🟣 POST: {ep_name} → {url}")

                # تأخير عشوائي
                jitter = random.uniform(0.8, 2.0)
                await asyncio.sleep(jitter)

                # بناء الجسم حسب النقطة
                body = self._build_body(ep_name)

                data = await self.fetch_post_json(
                    url=url,
                    body=body,
                    delay=chain.request_delay,
                    referer=referer,
                )

                if data is not None:
                    parser = get_parser(ep_name)
                    if parser:
                        # token parser يحتاج decimals
                        if ep_name == "token":
                            parsed = parse_token(data, chain.token_decimals)
                        elif ep_name == "validators":
                            from .parsers.subscan_api import parse_validators
                            parsed = parse_validators(data, chain.token_decimals)
                        else:
                            parsed = parser(data)

                        self._merge_all(snapshot, parsed)
                        snapshot.pages_crawled.append(f"api_{ep_name}")
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
            f"✅ اكتمل Subscan {chain.name}: "
            f"{len(snapshot.pages_crawled)} ناجح، "
            f"{len(snapshot.pages_failed)} فشل، "
            f"{snapshot.crawl_duration_seconds}ث"
        )
        logger.info(f"{'═' * 60}")

        return snapshot

    def _build_body(self, endpoint: str) -> dict:
        """بناء جسم POST حسب النقطة"""
        if endpoint == "validators":
            return {"row": 20, "page": 0, "order_field": "bonded_total", "order": "desc"}
        elif endpoint == "daily":
            # آخر يومين
            today = datetime.now()
            yesterday = today - timedelta(days=1)
            return {
                "start": yesterday.strftime("%Y-%m-%d"),
                "end": today.strftime("%Y-%m-%d"),
                "category": "transfer",
            }
        else:
            return {}

    # ══════════════════════════════════════════════════════════════
    # 🚀 زحف عدة سلاسل
    # ══════════════════════════════════════════════════════════════

    async def crawl_all(
        self,
        chain_keys: List[str] = None,
    ) -> Dict[str, ChainSnapshot]:
        """زحف عدة سلاسل Subscan"""
        keys = chain_keys or [
            k for k, c in self.chains.items() if c.enabled
        ]

        logger.info(f"🟣 بدء زحف {len(keys)} سلسلة Subscan...")

        results = {}
        # Subscan rate limit صارم — زحف سلسلة تلو أخرى
        for key in keys:
            try:
                snapshot = await self.crawl_chain(key)
                if snapshot:
                    results[key] = snapshot
                # تأخير بين السلاسل
                await asyncio.sleep(random.uniform(3, 5))
            except Exception as e:
                logger.error(f"❌ خطأ في {key}: {e}")

        # ملخص
        total_pages = sum(len(s.pages_crawled) for s in results.values())
        total_failed = sum(len(s.pages_failed) for s in results.values())
        total_time = sum(s.crawl_duration_seconds for s in results.values())

        logger.info(f"{'═' * 60}")
        logger.info(f"📊 ملخص Subscan:")
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
        """زحف سريع — metadata فقط"""
        if chain_key not in self.chains:
            return None

        chain = self.chains[chain_key]
        snapshot = ChainSnapshot(
            chain_name=chain.name,
            chain_symbol=chain.symbol,
            chain_id=chain.chain_id,
            timestamp=datetime.now().isoformat(),
        )

        api_base = f"https://{chain.api_subdomain}.api.subscan.io"
        data = await self.fetch_post_json(
            url=f"{api_base}/api/scan/metadata",
            delay=chain.request_delay,
            referer=chain.base_url + "/",
        )
        if data:
            parser = get_parser("metadata")
            if parser:
                parsed = parser(data)
                self._merge_all(snapshot, parsed)
                snapshot.pages_crawled.append("api_metadata")

        return snapshot

    # ══════════════════════════════════════════════════════════════
    # 🔀 دمج البيانات
    # ══════════════════════════════════════════════════════════════

    def _merge_all(self, snapshot: ChainSnapshot, parsed: dict):
        """دمج كل البيانات المحللة في snapshot"""
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

        # ── التوكنات ──
        if "tokens" in parsed:
            t = parsed["tokens"]
            stk = snapshot.tokens
            stk.native_price_usd = t.native_price_usd or stk.native_price_usd
            stk.native_price_change_pct = t.native_price_change_pct or stk.native_price_change_pct
            stk.native_market_cap = t.native_market_cap or stk.native_market_cap

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
