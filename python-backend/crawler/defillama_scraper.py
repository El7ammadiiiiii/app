"""
🦙 زاحف DeFiLlama — TVL, DEX, الرسوم, العوائد, الجسور, الستاكينغ
══════════════════════════════════════════════════════════════════════

زاحف شامل يجمع بيانات cross-chain من كل نقاط DeFiLlama API المجانية.

النقاط المدعومة (8 نقاط، 4 نطاقات فرعية):
──────────────────────────────────────────────
api.llama.fi:
  1. /v2/chains              — TVL لـ 430+ سلسلة
  2. /protocols              — 7000+ بروتوكول DeFi
  3. /overview/dexs          — أحجام DEX اليومية
  4. /overview/fees          — الرسوم والإيرادات
  5. /overview/open-interest — Perps OI

yields.llama.fi:
  6. /pools                  — 19000+ مسبح عوائد/APY/Staking

stablecoins.llama.fi:
  7. /stablecoins            — 333 عملة مستقرة

bridges.llama.fi:
  8. /bridges                — 89 جسر بين السلاسل

الاستخدام:
    scraper = DefiLlamaScraper()
    snapshot = await scraper.crawl_all()
    # snapshot.total_defi_tvl, snapshot.top_protocols, etc.
"""

import asyncio
import json
import time
import random
from datetime import datetime
from typing import Optional, Dict, Any, List

import aiohttp
from loguru import logger

from .base_scraper import BaseScraper
from .config import CrawlerSettings, DEFAULT_SETTINGS
from .models_defillama import DefiLlamaSnapshot
from .utils import get_random_user_agent
from .parsers.defillama_api import get_parser


# ── نقاط API ──
DEFILLAMA_ENDPOINTS = {
    "chains_tvl": {
        "url": "https://api.llama.fi/v2/chains",
        "desc": "TVL لكل السلاسل",
        "priority": 1,
    },
    "protocols": {
        "url": "https://api.llama.fi/protocols",
        "desc": "كل البروتوكولات",
        "priority": 2,
    },
    "dex_volumes": {
        "url": "https://api.llama.fi/overview/dexs",
        "desc": "أحجام DEX",
        "priority": 3,
    },
    "fees": {
        "url": "https://api.llama.fi/overview/fees",
        "desc": "الرسوم والإيرادات",
        "priority": 4,
    },
    "yield_pools": {
        "url": "https://yields.llama.fi/pools",
        "desc": "مسابح العوائد + APY",
        "priority": 5,
    },
    "stablecoins": {
        "url": "https://stablecoins.llama.fi/stablecoins",
        "desc": "العملات المستقرة",
        "priority": 6,
    },
    "bridges": {
        "url": "https://bridges.llama.fi/bridges",
        "desc": "الجسور",
        "priority": 7,
    },
    "open_interest": {
        "url": "https://api.llama.fi/overview/open-interest",
        "desc": "Perps OI",
        "priority": 8,
    },
}


class DefiLlamaScraper(BaseScraper):
    """
    🦙 زاحف DeFiLlama — بيانات DeFi عبر كل السلاسل.
    
    لا يحتاج مفتاح API — كل النقاط مجانية.
    يُنتج DefiLlamaSnapshot بدلاً من ChainSnapshot لأنه cross-chain.
    """

    def __init__(self, settings: CrawlerSettings = None):
        super().__init__(settings)

    # ══════════════════════════════════════════════════════════════
    # 🔌 جلب JSON من DeFiLlama
    # ══════════════════════════════════════════════════════════════

    async def fetch_json(
        self,
        url: str,
        delay: float = 1.0,
        retries: int = 3,
    ) -> Optional[Any]:
        """جلب بيانات JSON من أي نطاق DeFiLlama."""
        await self._rate_limit(url, delay)

        # زيادة timeout للنقاط التي تُرجع بيانات ضخمة
        large_endpoints = ["yields.llama.fi", "stablecoins.llama.fi"]
        is_large = any(ep in url for ep in large_endpoints)
        timeout_val = 120 if is_large else self.settings.request_timeout
        req_timeout = aiohttp.ClientTimeout(total=timeout_val)

        session = await self._get_session()

        for attempt in range(1, retries + 1):
            try:
                headers = self._get_api_headers(url)

                logger.debug(f"🦙 [{attempt}/{retries}] GET: {url}")

                async with session.get(
                    url, headers=headers, allow_redirects=True, timeout=req_timeout,
                ) as response:
                    status = response.status

                    if status == 200:
                        text = await response.text()
                        self._request_count += 1
                        try:
                            data = json.loads(text)
                            logger.debug(f"✅ OK: {url}")
                            return data
                        except json.JSONDecodeError:
                            logger.warning(f"⚠️ استجابة غير JSON: {url}")
                            return None

                    elif status == 429:
                        wait = 15 * attempt + random.uniform(5, 15)
                        logger.warning(f"⏳ 429 Rate Limited: {url} — انتظار {wait:.0f}ث")
                        self._error_count += 1
                        await asyncio.sleep(wait)
                        continue

                    elif status >= 500:
                        wait = 5 * attempt
                        logger.warning(f"💥 خطأ سيرفر {status}: {url}")
                        self._error_count += 1
                        await asyncio.sleep(wait)
                        continue

                    else:
                        logger.warning(f"🚫 {status}: {url}")
                        self._error_count += 1
                        return None

            except asyncio.CancelledError:
                return None

            except asyncio.TimeoutError:
                logger.warning(f"⏰ انتهت المهلة: {url} (محاولة {attempt})")
                self._error_count += 1
                if attempt < retries:
                    await asyncio.sleep(5 * attempt)

            except aiohttp.ClientError as e:
                logger.error(f"🔌 خطأ: {type(e).__name__}: {e}")
                self._error_count += 1
                if attempt < retries:
                    await asyncio.sleep(min(8 * attempt, 30))

            except Exception as e:
                logger.error(f"❗ خطأ غير متوقع: {e}")
                self._error_count += 1
                return None

        logger.error(f"💀 فشل بعد {retries} محاولات: {url}")
        return None

    def _get_api_headers(self, url: str) -> dict:
        """ترويسات ذكية لـ DeFiLlama."""
        headers = {
            "User-Agent": get_random_user_agent(),
            "Accept": "application/json",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "DNT": "1",
            "Connection": "keep-alive",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-site",
            "Referer": "https://defillama.com/",
            "Origin": "https://defillama.com",
        }
        return headers

    # ══════════════════════════════════════════════════════════════
    # 🕷️ زحف كل النقاط
    # ══════════════════════════════════════════════════════════════

    async def crawl_all(
        self,
        sections: List[str] = None,
    ) -> DefiLlamaSnapshot:
        """
        زحف كل نقاط DeFiLlama وإنتاج لقطة شاملة.
        
        sections: قائمة أقسام محددة (None = الكل)
        """
        start_time = time.time()

        logger.info(f"{'═' * 60}")
        logger.info(f"🦙 بدء زحف DeFiLlama — كل النقاط")
        logger.info(f"{'═' * 60}")

        snapshot = DefiLlamaSnapshot(
            timestamp=datetime.now().isoformat(),
        )

        # ── تحديد النقاط ──
        endpoints = dict(DEFILLAMA_ENDPOINTS)
        if sections:
            endpoints = {k: v for k, v in endpoints.items() if k in sections}

        # ── ترتيب بالأولوية ──
        sorted_eps = sorted(endpoints.items(), key=lambda x: x[1]["priority"])

        # ── زحف كل نقطة ──
        for ep_name, ep_info in sorted_eps:
            url = ep_info["url"]
            desc = ep_info["desc"]

            try:
                logger.info(f"  🦙 {desc} → {url}")

                # تأخير عشوائي بين النقاط
                jitter = random.uniform(0.3, 1.0)
                await asyncio.sleep(jitter)

                data = await self.fetch_json(url, delay=1.0)

                if data is not None:
                    parser = get_parser(ep_name)
                    if parser:
                        parsed = parser(data)
                        self._merge(snapshot, parsed)
                        snapshot.sections_crawled.append(ep_name)
                        logger.info(f"  ✅ تم: {ep_name}")
                    else:
                        logger.warning(f"  ⚠️ لا يوجد محلل لـ {ep_name}")
                        snapshot.sections_failed.append(ep_name)
                else:
                    snapshot.sections_failed.append(ep_name)
                    logger.warning(f"  ❌ فشل: {ep_name}")

            except Exception as e:
                logger.error(f"  ❌ خطأ في {ep_name}: {e}")
                snapshot.sections_failed.append(ep_name)
                snapshot.errors.append(f"{ep_name}: {str(e)}")

        snapshot.crawl_duration_seconds = round(time.time() - start_time, 2)

        logger.info(f"{'─' * 60}")
        logger.info(
            f"✅ اكتمل DeFiLlama: "
            f"{len(snapshot.sections_crawled)} ناجح، "
            f"{len(snapshot.sections_failed)} فشل، "
            f"{snapshot.crawl_duration_seconds}ث"
        )
        logger.info(f"{'═' * 60}")

        return snapshot

    async def quick_crawl(self) -> DefiLlamaSnapshot:
        """زحف سريع — TVL + DEX فقط"""
        return await self.crawl_all(sections=["chains_tvl", "dex_volumes"])

    # ══════════════════════════════════════════════════════════════
    # 🔀 دمج البيانات
    # ══════════════════════════════════════════════════════════════

    def _merge(self, snapshot: DefiLlamaSnapshot, parsed: dict):
        """دمج البيانات المحللة في اللقطة."""
        if not parsed:
            return

        for key, value in parsed.items():
            if hasattr(snapshot, key) and value is not None:
                setattr(snapshot, key, value)
