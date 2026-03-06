"""
🕷️ زاحف المواقع المستقلة — Independent Sites Scraper
═══════════════════════════════════════════════════════
زاحف ذكي يعمل على ~24 سلسلة مستقلة بهندسة الـ Adapter Pattern.

الاستراتيجية:
═════════════
1. مواقع API أولاً (MultiversX, TronScan, Kaspa, Ergo, Decred)
   - JSON مباشر → أسرع وأدق وأصعب في الاكتشاف
   - كل موقع له API ونقاط وصول فريدة

2. مواقع HTML (XRP, TON, Stellar, Mina, ...)
   - زيارة الصفحة كمتصفح عادي
   - تحليل HTML مع محللات متخصصة
   - fallback إلى المحلل العام إذا فشل المتخصص

3. تقنيات مكافحة الاكتشاف:
   - تدوير User-Agent (8 UAs)
   - تأخير عشوائي بين الطلبات
   - زيارة الصفحة الرئيسية أولاً (كوكيز + بصمة متصفح)
   - ترتيب عشوائي للنقاط
   - Referer + Origin من الموقع نفسه
   - X-Requested-With للطلبات AJAX

السلاسل المدعومة (24):
─────────────────────
API:  MultiversX, Tron, Kaspa, Ergo, Decred
HTML: XRP, TON, Stellar, Mina, Nervos, Wax, Zilliqa, Arweave,
      EOS, Waves, NEO, Ontology, Icon, Flux, Firo, Siacoin,
      opBNB, Cronos
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
    INDEPENDENT_CHAINS,
    IndependentChainConfig,
)
from .models import ChainSnapshot
from .utils import get_request_headers, get_random_user_agent

from .parsers.independent_api import get_parser as get_api_parser
from .parsers.independent_html import get_html_parser


class IndependentScraper(BaseScraper):
    """
    زاحف المواقع المستقلة — يغطي ~24 سلسلة.
    
    يستخدم نمط Adapter: كل موقع له محلل خاص
    لأن كل موقع له هيكل API/HTML فريد.
    
    الاستخدام:
        scraper = IndependentScraper()
        
        # زحف سلسلة واحدة
        snapshot = await scraper.crawl_chain("multiversx")
        
        # زحف كل السلاسل
        results = await scraper.crawl_all()
        
        # زحف مجموعة محددة
        api_results = await scraper.crawl_all(["multiversx", "tron", "kaspa"])
    """

    def __init__(self, settings: CrawlerSettings = None):
        super().__init__(settings)
        self.chains = INDEPENDENT_CHAINS.copy()

    # ══════════════════════════════════════════════════════════════
    # 🔌 جلب JSON من API خاص
    # ══════════════════════════════════════════════════════════════

    async def fetch_json(
        self,
        url: str,
        delay: float = None,
        retries: int = 3,
        referer: str = None,
    ) -> Optional[Any]:
        """
        جلب بيانات JSON من API مستقل.
        
        يتكيف مع أنواع الاستجابة:
        - JSON object
        - JSON array
        - نص عادي (مثل Kaspa coinsupply/circulating)
        """
        delay = delay or self.settings.default_delay * 0.5
        retries = retries or 3

        await self._rate_limit(url, delay)

        session = await self._get_session()

        for attempt in range(1, retries + 1):
            try:
                headers = self._get_api_headers(referer)

                logger.debug(f"🔌 [{attempt}/{retries}] API: {url}")

                async with session.get(
                    url,
                    headers=headers,
                    allow_redirects=True,
                ) as response:
                    status = response.status

                    if status == 200:
                        content_type = response.headers.get("Content-Type", "")
                        text = await response.text()
                        self._request_count += 1

                        # محاولة JSON أولاً
                        try:
                            data = json.loads(text)
                            logger.debug(f"✅ API OK: {url}")
                            return data
                        except json.JSONDecodeError:
                            # قد يكون نص عادي (رقم مثلاً)
                            text = text.strip()
                            if text and _is_numeric(text):
                                return text
                            logger.warning(f"⚠️ استجابة غير JSON: {url}")
                            return None

                    elif status == 429:
                        wait = 10 * attempt + random.uniform(3, 8)
                        logger.warning(f"⏳ 429 Rate Limited — انتظار {wait:.0f}ث: {url}")
                        self._error_count += 1
                        await asyncio.sleep(wait)
                        continue

                    elif status in (400, 403, 401):
                        logger.warning(f"🚫 {status}: {url}")
                        self._error_count += 1
                        return None

                    elif status == 404:
                        logger.warning(f"❌ 404 Not Found: {url}")
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

        logger.error(f"💀 فشل API بعد {retries} محاولات: {url}")
        return None

    def _get_api_headers(self, referer: str = None) -> dict:
        """ترويسات ذكية — تبدو كـ AJAX من المتصفح"""
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
            headers["Sec-Fetch-Site"] = "same-origin"
        return headers

    # ══════════════════════════════════════════════════════════════
    # 🕷️ زحف سلسلة واحدة
    # ══════════════════════════════════════════════════════════════

    async def crawl_chain(
        self,
        chain_key: str,
    ) -> Optional[ChainSnapshot]:
        """
        زحف سلسلة مستقلة واحدة.
        
        يختار الاستراتيجية المناسبة تلقائياً:
        - API → إذا الموقع يوفر API مجاني
        - HTML → إذا لا يوجد API (زحف صفحة HTML)
        """
        if chain_key not in self.chains:
            logger.error(f"❌ سلسلة غير معروفة: {chain_key}")
            return None

        chain: IndependentChainConfig = self.chains[chain_key]
        if not chain.enabled:
            logger.info(f"⏭️ السلسلة {chain.name} معطلة")
            return None

        start_time = time.time()
        logger.info(f"{'═' * 60}")
        logger.info(f"🌐 بدء زحف Independent: {chain.name} ({chain.base_url})")
        logger.info(f"  📋 النوع: {chain.site_type.upper()}")
        logger.info(f"{'═' * 60}")

        snapshot = ChainSnapshot(
            chain_name=chain.name,
            chain_symbol=chain.symbol,
            chain_id=chain.chain_id,
            timestamp=datetime.now().isoformat(),
        )

        # ── الخطوة 1: زيارة الصفحة الرئيسية (كوكيز + بيانات HTML) ──
        logger.info("  🌐 زيارة الصفحة الرئيسية...")
        homepage_soup = await self.fetch_page(
            url=chain.base_url,
            delay=chain.request_delay,
        )

        if homepage_soup:
            # استخراج بيانات HTML (احتياطي أو أساسي)
            html_parser = get_html_parser(chain_key)
            try:
                html_data = html_parser(homepage_soup)
                self._merge_all(snapshot, html_data)
                snapshot.pages_crawled.append("homepage_html")
                logger.info("  ✅ تم: homepage HTML")
            except Exception as e:
                logger.error(f"  ❌ خطأ HTML parser: {e}")
                snapshot.errors.append(f"html_homepage: {e}")

        # ── الخطوة 2: API endpoints (إذا متوفرة) ──
        if chain.site_type == "api" and chain.api_base and chain.api_endpoints:
            await self._crawl_api_endpoints(snapshot, chain, chain_key)

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
            f"✅ اكتمل Independent {chain.name}: "
            f"{len(snapshot.pages_crawled)} ناجح، "
            f"{len(snapshot.pages_failed)} فشل، "
            f"{snapshot.crawl_duration_seconds}ث"
        )
        logger.info(f"{'═' * 60}")

        return snapshot

    async def _crawl_api_endpoints(
        self,
        snapshot: ChainSnapshot,
        chain: IndependentChainConfig,
        chain_key: str,
    ):
        """زحف كل endpoints الـ API لسلسلة معينة"""
        endpoints = list(chain.api_endpoints.items())

        # ترتيب عشوائي (لا نمط ثابت)
        # لكن stats/status دائماً أولاً
        priority_keys = {"stats", "status", "info", "network"}
        priority = [(k, v) for k, v in endpoints if k in priority_keys]
        rest = [(k, v) for k, v in endpoints if k not in priority_keys]
        random.shuffle(rest)
        ordered = priority + rest

        for ep_name, ep_path in ordered:
            url = f"{chain.api_base}{ep_path}"

            try:
                logger.info(f"  🔌 API: {ep_name} → {url}")

                # تأخير عشوائي صغير
                jitter = random.uniform(0.5, 1.5)
                await asyncio.sleep(jitter)

                data = await self.fetch_json(
                    url=url,
                    delay=chain.request_delay * 0.5,
                    referer=chain.base_url + "/",
                )

                if data is not None:
                    parser = get_api_parser(chain_key, ep_name)
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

    # ══════════════════════════════════════════════════════════════
    # 🚀 زحف عدة سلاسل
    # ══════════════════════════════════════════════════════════════

    async def crawl_all(
        self,
        chain_keys: List[str] = None,
    ) -> Dict[str, ChainSnapshot]:
        """زحف عدة سلاسل مستقلة"""
        keys = chain_keys or [
            k for k, c in self.chains.items() if c.enabled
        ]

        logger.info(f"🚀 بدء زحف {len(keys)} سلسلة مستقلة...")

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
        logger.info(f"📊 ملخص Independent:")
        logger.info(f"  سلاسل: {len(results)}/{len(keys)}")
        logger.info(f"  صفحات ناجحة: {total_pages}")
        logger.info(f"  صفحات فاشلة: {total_failed}")
        logger.info(f"  وقت إجمالي: {total_time:.1f}ث")
        logger.info(f"{'═' * 60}")

        return results

    async def crawl_api_only(
        self,
        chain_keys: List[str] = None,
    ) -> Dict[str, ChainSnapshot]:
        """زحف المواقع ذات API فقط (أسرع)"""
        api_keys = [
            k for k, c in self.chains.items()
            if c.enabled and c.site_type == "api"
        ]
        if chain_keys:
            api_keys = [k for k in chain_keys if k in api_keys]

        return await self.crawl_all(api_keys)

    async def crawl_html_only(
        self,
        chain_keys: List[str] = None,
    ) -> Dict[str, ChainSnapshot]:
        """زحف مواقع HTML فقط"""
        html_keys = [
            k for k, c in self.chains.items()
            if c.enabled and c.site_type == "html"
        ]
        if chain_keys:
            html_keys = [k for k in chain_keys if k in html_keys]

        return await self.crawl_all(html_keys)

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
            sn.new_addresses_daily = n.new_addresses_daily or sn.new_addresses_daily

        # ── المعاملات ──
        if "transactions" in parsed:
            t = parsed["transactions"]
            st = snapshot.transactions
            st.gas_price_low = t.gas_price_low or st.gas_price_low
            st.gas_price_avg = t.gas_price_avg or st.gas_price_avg
            st.gas_price_high = t.gas_price_high or st.gas_price_high
            st.avg_tx_fee_usd = t.avg_tx_fee_usd or st.avg_tx_fee_usd

        # ── التوكنات ──
        if "tokens" in parsed:
            t = parsed["tokens"]
            stk = snapshot.tokens
            stk.native_price_usd = t.native_price_usd or stk.native_price_usd
            stk.native_price_change_pct = t.native_price_change_pct or stk.native_price_change_pct
            stk.native_market_cap = t.native_market_cap or stk.native_market_cap
            if t.top_tokens and not stk.top_tokens:
                stk.top_tokens = t.top_tokens
            if t.total_token_contracts:
                stk.total_token_contracts = t.total_token_contracts or stk.total_token_contracts

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
            if w.exchange_balances:
                sw.exchange_balances.update(w.exchange_balances)
            if w.top10_concentration_pct:
                sw.top10_concentration_pct = w.top10_concentration_pct

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

        # ── البلوكات ──
        if "blocks" in parsed:
            blocks = parsed["blocks"]
            if blocks and not snapshot.recent_blocks:
                snapshot.recent_blocks = blocks


# ═══════════════════════════════════════════════════════════════════
# 🔧 دوال مساعدة
# ═══════════════════════════════════════════════════════════════════


def _is_numeric(text: str) -> bool:
    """هل النص رقم؟"""
    try:
        float(text.strip())
        return True
    except (ValueError, TypeError):
        return False
