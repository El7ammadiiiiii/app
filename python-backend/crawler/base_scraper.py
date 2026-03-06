"""
🌐 محرك الزحف الأساسي — Base Scraper Engine
==============================================
يوفر:
- طلبات HTTP مع تدوير User-Agents
- إعادة المحاولة التلقائية مع تأخير تصاعدي
- معالجة أخطاء 429/403/5xx
- rate limiting لحماية الموقع المستهدف
- تسجيل شامل
"""

import asyncio
import time
import random
import os
from datetime import datetime
from typing import Optional, Dict, Any

import aiohttp
from bs4 import BeautifulSoup
from loguru import logger

from .config import CrawlerSettings, DEFAULT_SETTINGS
from .utils import get_request_headers, get_random_user_agent


class BaseScraper:
    """محرك الزحف الأساسي — يرث منه كل عائلة مستكشفات"""

    def __init__(self, settings: CrawlerSettings = None):
        self.settings = settings or DEFAULT_SETTINGS
        self._session: Optional[aiohttp.ClientSession] = None
        self._request_count = 0
        self._error_count = 0
        self._last_request_time: Dict[str, float] = {}  # domain → timestamp
        
        # إعداد المسجل
        os.makedirs(self.settings.log_dir, exist_ok=True)
        logger.add(
            os.path.join(self.settings.log_dir, "crawler_{time:YYYY-MM-DD}.log"),
            rotation="1 day",
            retention="30 days",
            level="DEBUG",
            encoding="utf-8",
            format="{time:YYYY-MM-DD HH:mm:ss} | {level:<7} | {message}",
        )

    async def _get_session(self) -> aiohttp.ClientSession:
        """إنشاء أو استرجاع جلسة HTTP"""
        if self._session is None or self._session.closed:
            timeout = aiohttp.ClientTimeout(total=self.settings.request_timeout)
            # استخدام ThreadedResolver بدل aiodns لتجنب مشاكل DNS
            resolver = aiohttp.resolver.ThreadedResolver()
            connector = aiohttp.TCPConnector(
                limit=10,
                limit_per_host=3,
                ttl_dns_cache=300,
                ssl=False,
                resolver=resolver,
            )
            self._session = aiohttp.ClientSession(
                timeout=timeout,
                connector=connector,
            )
        return self._session

    async def close(self):
        """إغلاق الجلسة بشكل نظيف"""
        if self._session and not self._session.closed:
            await self._session.close()
            await asyncio.sleep(0.5)  # انتظار إغلاق المنافذ

    def _get_domain(self, url: str) -> str:
        """استخراج النطاق من URL"""
        from urllib.parse import urlparse
        return urlparse(url).netloc

    async def _rate_limit(self, url: str, delay: float):
        """التحكم بسرعة الطلبات لكل نطاق"""
        domain = self._get_domain(url)
        now = time.time()
        
        if domain in self._last_request_time:
            elapsed = now - self._last_request_time[domain]
            if elapsed < delay:
                wait = delay - elapsed + random.uniform(0.5, 1.5)
                logger.debug(f"⏳ انتظار {wait:.1f}ث لـ {domain}")
                await asyncio.sleep(wait)
        
        self._last_request_time[domain] = time.time()

    async def fetch_page(
        self,
        url: str,
        delay: float = None,
        retries: int = None,
        referer: str = None,
    ) -> Optional[BeautifulSoup]:
        """
        جلب صفحة HTML وإرجاعها كـ BeautifulSoup.
        
        يتضمن:
        - تدوير User-Agent
        - إعادة محاولة تلقائية (حتى 5 مرات)
        - تأخير تصاعدي عند الخطأ
        - معالجة 429/403/5xx
        
        Returns:
            BeautifulSoup أو None إذا فشل الجلب
        """
        delay = delay or self.settings.default_delay
        retries = retries or self.settings.max_retries
        
        await self._rate_limit(url, delay)
        
        session = await self._get_session()

        for attempt in range(1, retries + 1):
            try:
                headers = get_request_headers(referer=referer)
                
                logger.debug(f"🔗 [{attempt}/{retries}] جلب: {url}")
                
                async with session.get(url, headers=headers, allow_redirects=True) as response:
                    status = response.status
                    
                    # ✅ نجاح
                    if status == 200:
                        html = await response.text()
                        self._request_count += 1
                        
                        # فحص سريع: هل الصفحة فعلاً تحتوي بيانات؟
                        if len(html) < 500:
                            logger.warning(f"⚠️ صفحة قصيرة جداً ({len(html)} بايت): {url}")
                        
                        soup = BeautifulSoup(html, "html.parser")
                        
                        # كشف صفحة Cloudflare Challenge
                        title = soup.title.string if soup.title else ""
                        if "just a moment" in title.lower() or "attention required" in title.lower():
                            logger.warning(f"🛡️ تم اكتشاف Cloudflare Challenge في {url}")
                            self._error_count += 1
                            wait = 30 * attempt + random.uniform(5, 15)
                            logger.info(f"⏳ انتظار {wait:.0f}ث قبل إعادة المحاولة...")
                            await asyncio.sleep(wait)
                            continue
                        
                        # كشف صفحة AWS WAF
                        if "awswaf" in html.lower() or "verify you" in html.lower()[:2000]:
                            logger.warning(f"🛡️ تم اكتشاف AWS WAF في {url}")
                            self._error_count += 1
                            return None  # WAF لا يمكن تجاوزه بسهولة
                        
                        logger.debug(f"✅ تم جلب {url} ({len(html):,} بايت)")
                        return soup
                    
                    # ⏳ Rate Limited
                    elif status == 429:
                        retry_after = int(response.headers.get("Retry-After", 10))
                        wait = retry_after * attempt + random.uniform(5, 15)
                        logger.warning(f"⏳ 429 Rate Limited — انتظار {wait:.0f}ث: {url}")
                        self._error_count += 1
                        await asyncio.sleep(wait)
                        continue
                    
                    # 🚫 محظور
                    elif status == 403:
                        logger.error(f"🚫 403 Forbidden — الموقع يحظر الزحف: {url}")
                        self._error_count += 1
                        # محاولة واحدة إضافية فقط — Cloudflare 403 لن يتغير بالانتظار
                        if attempt < min(retries, 2):
                            wait = 10 + random.uniform(3, 8)
                            logger.info(f"🔄 إعادة محاولة بعد {wait:.0f}ث مع UA جديد...")
                            await asyncio.sleep(wait)
                            continue
                        logger.warning(f"⛔ تخطي الصفحة بعد {attempt} محاولات 403: {url}")
                        return None
                    
                    # 💥 خطأ سيرفر
                    elif status >= 500:
                        logger.warning(f"💥 خطأ سيرفر {status}: {url}")
                        self._error_count += 1
                        wait = 10 * attempt + random.uniform(2, 8)
                        await asyncio.sleep(wait)
                        continue
                    
                    # أخطاء أخرى
                    else:
                        logger.warning(f"❌ حالة غير متوقعة {status}: {url}")
                        self._error_count += 1
                        if attempt < retries:
                            await asyncio.sleep(5 * attempt)
                            continue
                        return None

            except asyncio.CancelledError:
                logger.warning(f"🚫 تم إلغاء الطلب: {url}")
                return None
            
            except asyncio.TimeoutError:
                logger.warning(f"⏰ انتهت المهلة: {url} (محاولة {attempt})")
                self._error_count += 1
                if attempt < retries:
                    await asyncio.sleep(10 * attempt)
                    continue
            
            except aiohttp.ClientError as e:
                logger.error(f"🔌 خطأ اتصال: {type(e).__name__}: {e}")
                self._error_count += 1
                # DNS errors won't resolve by retrying — fail fast
                if "DNS" in type(e).__name__ or "getaddrinfo" in str(e):
                    logger.warning(f"⛔ خطأ DNS — تخطي: {url}")
                    return None
                if attempt < retries:
                    await asyncio.sleep(min(15 * attempt, 60))
                    continue
            
            except Exception as e:
                logger.error(f"❗ خطأ غير متوقع: {type(e).__name__}: {e}")
                self._error_count += 1
                if attempt < retries:
                    await asyncio.sleep(5 * attempt)
                    continue

        logger.error(f"💀 فشل نهائي بعد {retries} محاولات: {url}")
        return None

    def get_stats(self) -> Dict[str, Any]:
        """إحصائيات الزاحف"""
        return {
            "total_requests": self._request_count,
            "total_errors": self._error_count,
            "success_rate": (
                f"{(self._request_count / (self._request_count + self._error_count) * 100):.1f}%"
                if (self._request_count + self._error_count) > 0
                else "N/A"
            ),
        }

    async def fetch_page_html(
        self,
        url: str,
        delay: float = None,
        retries: int = None,
        referer: str = None,
    ) -> Optional[str]:
        """
        جلب صفحة HTML وإرجاع النص الخام (بدون BeautifulSoup).
        مفيد لاستخراج JavaScript data من السكربتات.
        
        Returns:
            HTML string أو None إذا فشل الجلب
        """
        delay = delay or self.settings.default_delay
        retries = retries or self.settings.max_retries
        
        await self._rate_limit(url, delay)
        
        session = await self._get_session()

        for attempt in range(1, retries + 1):
            try:
                headers = get_request_headers(referer=referer)
                
                async with session.get(url, headers=headers, allow_redirects=True) as response:
                    if response.status == 200:
                        html = await response.text()
                        self._request_count += 1
                        
                        if len(html) < 500:
                            logger.warning(f"⚠️ صفحة قصيرة جداً ({len(html)} بايت): {url}")
                        
                        # كشف Cloudflare/WAF
                        if "just a moment" in html.lower()[:2000] or "verify you" in html.lower()[:2000]:
                            logger.warning(f"🛡️ تم اكتشاف حماية في {url}")
                            self._error_count += 1
                            if attempt < retries:
                                wait = 20 * attempt + random.uniform(5, 10)
                                await asyncio.sleep(wait)
                                continue
                            return None
                        
                        return html
                    
                    elif response.status == 429:
                        retry_after = int(response.headers.get("Retry-After", 10))
                        wait = retry_after * attempt + random.uniform(5, 15)
                        logger.warning(f"⏳ 429 Rate Limited — انتظار {wait:.0f}ث: {url}")
                        self._error_count += 1
                        await asyncio.sleep(wait)
                        continue
                    
                    elif response.status >= 500:
                        logger.warning(f"💥 خطأ سيرفر {response.status}: {url}")
                        self._error_count += 1
                        if attempt < retries:
                            wait = 10 * attempt + random.uniform(2, 8)
                            await asyncio.sleep(wait)
                            continue
                    
                    else:
                        logger.warning(f"❌ حالة {response.status}: {url}")
                        self._error_count += 1
                        if attempt < retries:
                            await asyncio.sleep(5 * attempt)
                            continue
                        return None

            except Exception as e:
                logger.error(f"❗ خطأ في جلب HTML: {type(e).__name__}: {e}")
                self._error_count += 1
                if attempt < retries:
                    await asyncio.sleep(5 * attempt)
                    continue

        logger.error(f"💀 فشل نهائي بعد {retries} محاولات: {url}")
        return None
