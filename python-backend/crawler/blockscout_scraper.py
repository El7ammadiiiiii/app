"""
🕷️ زاحف عائلة Blockscout — Blockscout Family Scraper
=======================================================
زاحف ذكي يعمل على 8 سلاسل Blockscout بنفس الكود.

الاستراتيجية الذكية:
═══════════════════
1. API v2 أولاً (JSON مباشر، أسرع وأدق، أصعب في الاكتشاف)
2. HTML Fallback إذا فشل API (تحليل الصفحة كاحتياطي)
3. تدوير User-Agent + تأخير عشوائي بين الطلبات
4. جلب الكوكيز من الصفحة الرئيسية أولاً (يبدو كمستخدم حقيقي)
5. ترتيب عشوائي لـ endpoints (لا نمط ثابت قابل للاكتشاف)
6. Referer header من الموقع نفسه (يبدو كتصفح داخلي)

السلاسل المدعومة:
- Harmony (explorer.harmony.one) — Blockscout SSR كامل
- Manta Pacific (pacific-explorer.manta.network) — Blockscout v8
- Aurora (explorer.aurora.dev) — Blockscout v9
- Zora (explorer.zora.energy) — Blockscout v9
- BOB (explorer.gobob.xyz) — Blockscout v9
- Metis (andromeda-explorer.metis.io) — Blockscout مرجع
- LUKSO (explorer.lukso.network) — Blockscout مرجع
- Neon EVM (neonscan.org) — Blockscout مرجع
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
    ChainConfig, CrawlerSettings, DEFAULT_SETTINGS,
    BLOCKSCOUT_CHAINS, BLOCKSCOUT_API_ENDPOINTS,
)
from .models import ChainSnapshot
from .utils import get_request_headers, get_random_user_agent

from .parsers.blockscout_api import (
    parse_stats, parse_addresses, parse_tokens as api_parse_tokens,
    parse_blocks as api_parse_blocks, parse_transactions,
    parse_tx_chart, parse_market_chart,
)
from .parsers.blockscout_html import (
    parse_blockscout_homepage,
    parse_blockscout_tokens as html_parse_tokens,
    parse_blockscout_accounts as html_parse_accounts,
    parse_blockscout_blocks as html_parse_blocks,
)


class BlockscoutScraper(BaseScraper):
    """
    زاحف عائلة Blockscout — يغطي 8 سلاسل.
    
    يستخدم API v2 مباشرة (JSON) مع احتياطي HTML.
    أذكى وأسرع من الزحف التقليدي.
    
    الاستخدام:
        scraper = BlockscoutScraper()
        
        # زحف سلسلة واحدة
        snapshot = await scraper.crawl_chain("harmony")
        
        # زحف كل السلاسل
        results = await scraper.crawl_all()
    """

    def __init__(self, settings: CrawlerSettings = None):
        super().__init__(settings)
        self.chains = BLOCKSCOUT_CHAINS.copy()

    # ══════════════════════════════════════════════════════════════
    # 🔌 جلب JSON من API v2
    # ══════════════════════════════════════════════════════════════

    async def fetch_json(
        self,
        url: str,
        delay: float = None,
        retries: int = 3,
        referer: str = None,
    ) -> Optional[dict]:
        """
        جلب بيانات JSON من API v2.
        
        مميزات الذكاء:
        - يتظاهر بأنه طلب AJAX من المتصفح (X-Requested-With)
        - يستخدم Accept: application/json
        - يضيف Referer من الموقع نفسه
        """
        delay = delay or self.settings.default_delay * 0.5  # API أسرع
        retries = retries or 3

        await self._rate_limit(url, delay)

        session = await self._get_session()

        for attempt in range(1, retries + 1):
            try:
                headers = self._get_api_headers(referer)

                logger.debug(f"🔌 [{attempt}/{retries}] API: {url}")

                async with session.get(
                    url,headers=headers,
                    allow_redirects=True,
                ) as response:
                    status = response.status

                    if status == 200:
                        content_type = response.headers.get("Content-Type", "")

                        # هل الاستجابة JSON؟
                        if "json" in content_type or "text" in content_type:
                            text = await response.text()
                            self._request_count += 1

                            try:
                                data = json.loads(text)
                                logger.debug(f"✅ API OK: {url}")
                                return data
                            except json.JSONDecodeError:
                                logger.warning(f"⚠️ استجابة غير JSON: {url}")
                                return None
                        else:
                            logger.warning(f"⚠️ Content-Type غير متوقع: {content_type}")
                            # قد تكون صفحة HTML (fallback)
                            return None

                    elif status == 429:
                        wait = 10 * attempt + random.uniform(3, 8)
                        logger.warning(f"⏳ 429 Rate Limited — انتظار {wait:.0f}ث: {url}")
                        self._error_count += 1
                        await asyncio.sleep(wait)
                        continue

                    elif status in (403, 401):
                        logger.warning(f"🚫 {status} — الموقع يحظر API: {url}")
                        self._error_count += 1
                        return None  # ننتقل لـ HTML fallback

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
        """ترويسات ذكية لطلبات API — تبدو كـ AJAX من المتصفح"""
        headers = {
            "User-Agent": get_random_user_agent(),
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "X-Requested-With": "XMLHttpRequest",  # يبدو كطلب AJAX
            "DNT": "1",
            "Connection": "keep-alive",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
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
        endpoints: List[str] = None,
    ) -> Optional[ChainSnapshot]:
        """
        زحف سلسلة Blockscout واحدة.
        
        يجمع البيانات من API v2 أولاً، ثم HTML كاحتياطي.
        """
        if chain_key not in self.chains:
            logger.error(f"❌ سلسلة غير معروفة: {chain_key}")
            return None

        chain = self.chains[chain_key]
        if not chain.enabled:
            logger.info(f"⏭️ السلسلة {chain.name} معطلة")
            return None

        start_time = time.time()
        logger.info(f"{'═' * 60}")
        logger.info(f"🔗 بدء زحف Blockscout: {chain.name} ({chain.base_url})")
        logger.info(f"{'═' * 60}")

        snapshot = ChainSnapshot(
            chain_name=chain.name,
            chain_symbol=chain.symbol,
            chain_id=chain.chain_id,
            timestamp=datetime.now().isoformat(),
        )

        # ── الخطوة 1: زيارة الصفحة الرئيسية أولاً (جلب الكوكيز) ──
        logger.info("  🌐 زيارة الصفحة الرئيسية (جلب كوكيز)...")
        homepage_soup = await self.fetch_page(
            url=chain.base_url,
            delay=chain.request_delay,
        )
        if homepage_soup:
            # استخراج بيانات HTML الأساسية كاحتياطي
            html_data = parse_blockscout_homepage(homepage_soup, chain.symbol)
            self._merge_data(snapshot, html_data)
            snapshot.pages_crawled.append("homepage_html")

        referer = chain.base_url + "/"

        # ── الخطوة 2: API v2 — الترتيب العشوائي ──
        target_endpoints = endpoints or list(BLOCKSCOUT_API_ENDPOINTS.keys())
        
        # ترتيب عشوائي (لا نمط ثابت)
        # لكن stats دائماً أولاً لأنها الأهم
        if "stats" in target_endpoints:
            target_endpoints.remove("stats")
            random.shuffle(target_endpoints)
            target_endpoints.insert(0, "stats")
        else:
            random.shuffle(target_endpoints)

        for ep_name in target_endpoints:
            ep_path = BLOCKSCOUT_API_ENDPOINTS.get(ep_name)
            if not ep_path:
                continue

            url = f"{chain.base_url}{ep_path}"

            try:
                logger.info(f"  🔌 API: {ep_name} → {url}")

                # تأخير عشوائي صغير بين كل طلب
                jitter = random.uniform(0.3, 1.2)
                await asyncio.sleep(jitter)

                data = await self.fetch_json(
                    url=url,
                    delay=chain.request_delay * 0.5,
                    referer=referer,
                )

                if data is not None:
                    self._apply_api_data(snapshot, ep_name, data, chain)
                    snapshot.pages_crawled.append(f"api_{ep_name}")
                    logger.info(f"  ✅ تم: {ep_name}")
                else:
                    # HTML Fallback
                    fallback_ok = await self._html_fallback(
                        snapshot, ep_name, chain, referer
                    )
                    if fallback_ok:
                        snapshot.pages_crawled.append(f"html_{ep_name}")
                    else:
                        snapshot.pages_failed.append(ep_name)

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
            f"✅ اكتمل زحف Blockscout {chain.name}: "
            f"{len(snapshot.pages_crawled)} ناجح، "
            f"{len(snapshot.pages_failed)} فشل، "
            f"{snapshot.crawl_duration_seconds}ث"
        )
        logger.info(f"{'═' * 60}")

        return snapshot

    async def crawl_all(
        self,
        chain_keys: List[str] = None,
        endpoints: List[str] = None,
    ) -> Dict[str, ChainSnapshot]:
        """زحف عدة سلاسل Blockscout بالتوازي"""
        keys = chain_keys or [
            k for k, c in self.chains.items() if c.enabled
        ]

        logger.info(f"🚀 بدء زحف {len(keys)} سلسلة Blockscout...")

        results = {}
        semaphore = asyncio.Semaphore(self.settings.max_concurrent_chains)

        async def _crawl_with_limit(key):
            async with semaphore:
                return key, await self.crawl_chain(key, endpoints)

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
        logger.info(f"📊 ملخص Blockscout:")
        logger.info(f"  سلاسل: {len(results)}/{len(keys)}")
        logger.info(f"  صفحات ناجحة: {total_pages}")
        logger.info(f"  صفحات فاشلة: {total_failed}")
        logger.info(f"  وقت إجمالي: {total_time:.1f}ث")
        logger.info(f"{'═' * 60}")

        return results

    async def quick_crawl(
        self,
        chain_keys: List[str] = None,
    ) -> Dict[str, ChainSnapshot]:
        """زحف سريع — stats فقط"""
        return await self.crawl_all(chain_keys, endpoints=["stats"])

    # ══════════════════════════════════════════════════════════════
    # 🔄 تطبيق البيانات المحللة
    # ══════════════════════════════════════════════════════════════

    def _apply_api_data(
        self,
        snapshot: ChainSnapshot,
        endpoint: str,
        data: Any,
        chain: ChainConfig,
    ):
        """توزيع بيانات API على حقول الـ snapshot"""
        try:
            if endpoint == "stats":
                parsed = parse_stats(data, chain.symbol)
                self._merge_data(snapshot, parsed)

            elif endpoint == "addresses":
                parsed = parse_addresses(data, chain.symbol)
                self._merge_wallets(snapshot, parsed)

            elif endpoint == "tokens":
                parsed = api_parse_tokens(data)
                self._merge_tokens(snapshot, parsed)

            elif endpoint == "blocks":
                parsed = api_parse_blocks(data)
                if parsed.get("blocks"):
                    snapshot.recent_blocks = parsed["blocks"]

            elif endpoint == "transactions":
                parsed = parse_transactions(data)
                if parsed.get("avg_fee") and not snapshot.transactions.avg_tx_fee_usd:
                    # تقريبي: fee * price
                    price = snapshot.tokens.native_price_usd or 0
                    if price > 0:
                        snapshot.transactions.avg_tx_fee_usd = round(
                            parsed["avg_fee"] * price, 6
                        )

            elif endpoint == "tx_chart":
                parsed = parse_tx_chart(data)
                if parsed.get("avg_daily_txns"):
                    snapshot.network.txs_per_day = (
                        snapshot.network.txs_per_day or parsed["avg_daily_txns"]
                    )

            elif endpoint == "market_chart":
                parsed = parse_market_chart(data)
                if parsed.get("available_supply"):
                    snapshot.wallets.total_supply = parsed["available_supply"]

        except Exception as e:
            logger.error(f"❌ خطأ تطبيق {endpoint}: {e}")

    async def _html_fallback(
        self,
        snapshot: ChainSnapshot,
        endpoint: str,
        chain: ChainConfig,
        referer: str,
    ) -> bool:
        """
        احتياطي HTML — يُستخدم عند فشل API.
        يزحف الصفحة HTML المقابلة ويحلل البيانات منها.
        """
        html_pages = {
            "tokens": "/tokens",
            "addresses": "/accounts",
            "blocks": "/blocks",
        }

        page_path = html_pages.get(endpoint)
        if not page_path:
            return False

        url = f"{chain.base_url}{page_path}"
        logger.info(f"  🔄 HTML Fallback: {url}")

        soup = await self.fetch_page(
            url=url,
            delay=chain.request_delay,
            referer=referer,
        )

        if not soup:
            return False

        try:
            if endpoint == "tokens":
                parsed = html_parse_tokens(soup)
                self._merge_tokens(snapshot, parsed)
            elif endpoint == "addresses":
                parsed = html_parse_accounts(soup, chain.symbol)
                self._merge_wallets(snapshot, parsed)
            elif endpoint == "blocks":
                parsed = html_parse_blocks(soup)
                if parsed.get("blocks"):
                    snapshot.recent_blocks = parsed["blocks"]
            return True
        except Exception as e:
            logger.error(f"❌ خطأ HTML fallback: {e}")
            return False

    # ══════════════════════════════════════════════════════════════
    # 🔀 دمج البيانات
    # ══════════════════════════════════════════════════════════════

    def _merge_data(self, snapshot: ChainSnapshot, parsed: dict):
        """دمج بيانات عامة مع الـ snapshot"""
        if "network" in parsed:
            n = parsed["network"]
            sn = snapshot.network
            if n.total_addresses is not None:
                sn.total_addresses = n.total_addresses
            if n.active_addresses_daily is not None:
                sn.active_addresses_daily = n.active_addresses_daily
            if n.total_transactions is not None:
                sn.total_transactions = n.total_transactions
            if n.tps is not None:
                sn.tps = n.tps
            if n.txs_per_day is not None:
                sn.txs_per_day = n.txs_per_day
            if n.total_blocks is not None:
                sn.total_blocks = n.total_blocks
            if n.avg_block_time_seconds is not None:
                sn.avg_block_time_seconds = n.avg_block_time_seconds
            if n.new_addresses_daily is not None:
                sn.new_addresses_daily = n.new_addresses_daily

        if "transactions" in parsed:
            t = parsed["transactions"]
            st = snapshot.transactions
            if t.gas_price_low is not None:
                st.gas_price_low = t.gas_price_low
            if t.gas_price_avg is not None:
                st.gas_price_avg = t.gas_price_avg
            if t.gas_price_high is not None:
                st.gas_price_high = t.gas_price_high
            if t.network_utilization_pct is not None:
                st.network_utilization_pct = t.network_utilization_pct
            if t.daily_gas_used is not None:
                st.daily_gas_used = t.daily_gas_used
            if t.avg_tx_fee_usd is not None:
                st.avg_tx_fee_usd = t.avg_tx_fee_usd

        if "tokens" in parsed:
            t = parsed["tokens"]
            stk = snapshot.tokens
            if t.native_price_usd is not None:
                stk.native_price_usd = t.native_price_usd
            if t.native_price_change_pct is not None:
                stk.native_price_change_pct = t.native_price_change_pct
            if t.native_market_cap is not None:
                stk.native_market_cap = t.native_market_cap

        if "health" in parsed:
            h = parsed["health"]
            sh = snapshot.health
            if h.total_nodes is not None:
                sh.total_nodes = h.total_nodes

    def _merge_wallets(self, snapshot: ChainSnapshot, parsed: dict):
        """دمج بيانات المحافظ"""
        if "wallets" in parsed:
            w = parsed["wallets"]
            if w.top_accounts and not snapshot.wallets.top_accounts:
                snapshot.wallets.top_accounts = w.top_accounts
            if w.exchange_balances:
                snapshot.wallets.exchange_balances.update(w.exchange_balances)
            if w.top10_concentration_pct is not None:
                snapshot.wallets.top10_concentration_pct = w.top10_concentration_pct

    def _merge_tokens(self, snapshot: ChainSnapshot, parsed: dict):
        """دمج بيانات التوكنات"""
        if "tokens" in parsed:
            t = parsed["tokens"]
            if t.top_tokens and not snapshot.tokens.top_tokens:
                snapshot.tokens.top_tokens = t.top_tokens
            if t.total_token_contracts is not None:
                snapshot.tokens.total_token_contracts = t.total_token_contracts

    # ══════════════════════════════════════════════════════════════
    # 📂 مساعدات
    # ══════════════════════════════════════════════════════════════

    def _get_available_endpoints(self, chain: ChainConfig) -> List[str]:
        """قائمة الـ endpoints المتاحة حسب إمكانيات السلسلة"""
        available = ["stats", "addresses", "tokens", "blocks", "transactions"]
        # charts دائماً متاحة
        available.extend(["tx_chart", "market_chart"])
        return available
