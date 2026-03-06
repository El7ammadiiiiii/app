"""
👑 زاحف Token Terminal — Top 200 Token Holders (v2 — ذكي بدون API مخزن)
=====================================================================
يجلب أكبر 200 حامل لكل عملة من tokenterminal.com

الطريقة (v2 — استخراج تلقائي):
1. جلب صفحة HTML واستخراج روابط JS
2. مسح ملفات JS للعثور على JWT و Bearer token (التي يستخدمها كل زائر مجهول)
3. استدعاء tRPC API مباشرة بنفس الطريقة التي يستدعيها المتصفح
4. حفظ النتائج محلياً كـ JSON

لا يتم تخزين أي مفاتيح — يتم اكتشافها حيّاً من ملفات JS العامة
(نفس ما يفعله أي متصفح يزور الموقع)

ذكاء مضاد للرصد:
- تأخير عشوائي 3-8 ثوانٍ بين الطلبات
- تدوير User-Agent
- تقسيم العمل على دفعات
- عدم الزحف بنمط ثابت
"""

import asyncio
import json
import os
import re
import random
import time
import base64
from datetime import datetime
from typing import Optional, Dict, Any, List

import aiohttp
from loguru import logger

from .base_scraper import BaseScraper
from .config import DEFAULT_SETTINGS, CrawlerSettings
from .utils import get_random_user_agent


# ─── ثوابت ───────────────────────────────────────────────────────────
BASE_URL = "https://tokenterminal.com"
EXPLORER_URL = f"{BASE_URL}/explorer"
DATASETS_URL = f"{EXPLORER_URL}/datasets/top-tokenholders"
API_BASE = "https://api.tokenterminal.com"
TRPC_URL = f"{API_BASE}/trpc/marts.postMart?batch=1"

# قائمة احتياطية للمشاريع الكبرى (تُستخدم عند فشل API)
FALLBACK_PROJECTS = [
    {"id": "ethereum", "name": "Ethereum", "symbol": "ETH", "chain": "Ethereum"},
    {"id": "bitcoin", "name": "Bitcoin", "symbol": "BTC", "chain": "Bitcoin"},
    {"id": "solana", "name": "Solana", "symbol": "SOL", "chain": "Solana"},
    {"id": "binance-coin", "name": "BNB", "symbol": "BNB", "chain": "BSC"},
    {"id": "ripple", "name": "XRP", "symbol": "XRP", "chain": "XRP Ledger"},
    {"id": "cardano", "name": "Cardano", "symbol": "ADA", "chain": "Cardano"},
    {"id": "tron", "name": "TRON", "symbol": "TRX", "chain": "Tron"},
    {"id": "avalanche", "name": "Avalanche", "symbol": "AVAX", "chain": "Avalanche"},
    {"id": "polkadot", "name": "Polkadot", "symbol": "DOT", "chain": "Polkadot"},
    {"id": "chainlink", "name": "Chainlink", "symbol": "LINK", "chain": "Ethereum"},
    {"id": "polygon", "name": "Polygon", "symbol": "MATIC", "chain": "Polygon"},
    {"id": "uniswap", "name": "Uniswap", "symbol": "UNI", "chain": "Ethereum"},
    {"id": "aave", "name": "Aave", "symbol": "AAVE", "chain": "Ethereum"},
    {"id": "lido", "name": "Lido", "symbol": "LDO", "chain": "Ethereum"},
    {"id": "maker", "name": "Maker", "symbol": "MKR", "chain": "Ethereum"},
    {"id": "arbitrum", "name": "Arbitrum", "symbol": "ARB", "chain": "Arbitrum"},
    {"id": "optimism", "name": "Optimism", "symbol": "OP", "chain": "Optimism"},
    {"id": "aptos", "name": "Aptos", "symbol": "APT", "chain": "Aptos"},
    {"id": "cosmos", "name": "Cosmos", "symbol": "ATOM", "chain": "Cosmos"},
    {"id": "near", "name": "NEAR Protocol", "symbol": "NEAR", "chain": "NEAR"},
    {"id": "injective", "name": "Injective", "symbol": "INJ", "chain": "Injective"},
    {"id": "celestia", "name": "Celestia", "symbol": "TIA", "chain": "Celestia"},
    {"id": "sui", "name": "Sui", "symbol": "SUI", "chain": "Sui"},
    {"id": "stacks", "name": "Stacks", "symbol": "STX", "chain": "Stacks"},
    {"id": "hedera", "name": "Hedera", "symbol": "HBAR", "chain": "Hedera"},
    {"id": "filecoin", "name": "Filecoin", "symbol": "FIL", "chain": "Filecoin"},
    {"id": "the-graph", "name": "The Graph", "symbol": "GRT", "chain": "Ethereum"},
    {"id": "render", "name": "Render", "symbol": "RNDR", "chain": "Ethereum"},
    {"id": "pendle", "name": "Pendle", "symbol": "PENDLE", "chain": "Ethereum"},
    {"id": "eigenlayer", "name": "EigenLayer", "symbol": "EIGEN", "chain": "Ethereum"},
    {"id": "jupiter", "name": "Jupiter", "symbol": "JUP", "chain": "Solana"},
    {"id": "raydium", "name": "Raydium", "symbol": "RAY", "chain": "Solana"},
    {"id": "compound", "name": "Compound", "symbol": "COMP", "chain": "Ethereum"},
    {"id": "curve-finance", "name": "Curve Finance", "symbol": "CRV", "chain": "Ethereum"},
    {"id": "gmx", "name": "GMX", "symbol": "GMX", "chain": "Arbitrum"},
]


class TokenTerminalScraper(BaseScraper):
    """زاحف Token Terminal — Top 200 Holders (v2 بدون API مخزن)"""

    def __init__(self, settings: CrawlerSettings = None):
        super().__init__(settings or DEFAULT_SETTINGS)
        self._jwt: Optional[str] = None
        self._bearer: Optional[str] = None
        self._data_dir = os.path.join(self.settings.data_dir, "latest", "tokenterminal_holders")
        os.makedirs(self._data_dir, exist_ok=True)

    # ─── استخراج التوثيق تلقائياً من JS ─────────────────────────────

    async def _extract_credentials(self) -> bool:
        """
        استخراج JWT و Bearer token من ملفات JS العامة.
        هذه نفس التوكنات التي يستخدمها أي زائر مجهول للموقع.
        يتم اكتشافها حيّاً — لا شيء مخزن.
        """
        if self._jwt and self._bearer:
            return True

        logger.info("🔑 استخراج التوثيق من ملفات JS العامة...")

        # 1. جلب صفحة HTML
        session = await self._get_session()
        headers = {
            "User-Agent": get_random_user_agent(),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }

        try:
            async with session.get(DATASETS_URL, headers=headers, allow_redirects=True) as resp:
                if resp.status != 200:
                    logger.error(f"❌ فشل جلب الصفحة: HTTP {resp.status}")
                    return False
                html = await resp.text()
        except Exception as e:
            logger.error(f"❌ خطأ جلب الصفحة: {e}")
            return False

        # 2. استخراج روابط JS
        js_urls = set()
        for m in re.finditer(r'src="(/_next/[^"]+\.js)"', html):
            js_urls.add(f"{EXPLORER_URL}{m.group(1)}")
        for m in re.finditer(r'(/_next/static/chunks/[^"\']+\.js)', html):
            js_urls.add(f"{EXPLORER_URL}{m.group(1)}")

        logger.info(f"📦 {len(js_urls)} ملف JS للفحص")

        # 3. فحص ملفات JS — حد أقصى 15 ملف (عادة التوكنات في أول 5-10)
        all_jwts: List[str] = []
        uuid_context_bearer: Optional[str] = None  # Bearer المكتشف بالسياق
        uuid_frequency: Dict[str, int] = {}  # تكرار UUID عبر الملفات

        checked = 0
        for js_url in js_urls:
            if self._jwt and self._bearer:
                break
            if checked >= 20:
                break
            checked += 1

            await asyncio.sleep(random.uniform(0.3, 1.0))

            try:
                async with session.get(js_url, headers={
                    "User-Agent": get_random_user_agent(),
                    "Accept": "*/*",
                    "Referer": DATASETS_URL,
                }) as resp:
                    if resp.status != 200:
                        continue
                    js_text = await resp.text()
            except Exception:
                continue

            # JWT: eyJ... (3 أجزاء base64url مفصولة بنقطة، > 80 حرف)
            for jm in re.findall(r'(eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)', js_text):
                if len(jm) > 80 and jm not in all_jwts:
                    all_jwts.append(jm)

            # UUID: البحث عن UUID بالقرب من "Bearer" أو "apiToken" أو "DEFAULT_TOKEN"
            for um in re.findall(
                r'(?:Bearer|apiToken|DEFAULT_TOKEN|authorization)[^"]*"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"',
                js_text, re.IGNORECASE
            ):
                uuid_context_bearer = um

            # تتبع تكرار UUID عبر الملفات
            for um in re.findall(r'"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"', js_text):
                uuid_frequency[um] = uuid_frequency.get(um, 0) + 1

        # 4. اختيار Bearer: الأولوية للمكتشف بالسياق، ثم الأكثر تكراراً
        if uuid_context_bearer:
            self._bearer = uuid_context_bearer
        elif uuid_frequency:
            self._bearer = max(uuid_frequency, key=uuid_frequency.get)

        # 5. اختيار JWT: الذي يحتوي على "frontEnd" في payload
        for jm in all_jwts:
            try:
                parts = jm.split(".")
                payload_b64 = parts[1] + "=" * (4 - len(parts[1]) % 4)
                payload_data = json.loads(base64.urlsafe_b64decode(payload_b64))
                if "frontEnd" in payload_data:
                    # التحقق من عدم انتهاء الصلاحية
                    exp = payload_data.get("exp", 0)
                    if exp > time.time():
                        self._jwt = jm
                        logger.info(f"✅ JWT صالح حتى {datetime.fromtimestamp(exp).isoformat()}")
                        break
                    else:
                        logger.warning(f"⚠️ JWT منتهي الصلاحية: {datetime.fromtimestamp(exp).isoformat()}")
            except Exception:
                continue

        # إذا لم نجد JWT مع frontEnd، نأخذ أول واحد صالح
        if not self._jwt and all_jwts:
            self._jwt = all_jwts[0]
            logger.warning("⚠️ استخدام أول JWT متاح (بدون التحقق من frontEnd)")

        if self._jwt and self._bearer:
            logger.info(f"✅ تم الاستخراج — Bearer: {self._bearer[:12]}... JWT: {self._jwt[:30]}...")
            return True
        else:
            logger.error(f"❌ فشل الاستخراج — JWT: {'✅' if self._jwt else '❌'} Bearer: {'✅' if self._bearer else '❌'}")
            return False

    # ─── جلب بيانات الحاملين ─────────────────────────────────────────

    def _build_trpc_headers(self) -> dict:
        """بناء ترويسات tRPC المطلوبة"""
        return {
            "User-Agent": get_random_user_agent(),
            "Content-Type": "application/json",
            "Accept": "application/json",
            "x-tt-terminal-jwt": self._jwt or "",
            "Authorization": f"Bearer {self._bearer}" if self._bearer else "",
            "x-app-path": "/explorer/datasets/top-tokenholders",
            "Origin": BASE_URL,
            "Referer": f"{BASE_URL}/",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-site",
        }

    def _build_rows_request(
        self,
        start_row: int = 0,
        end_row: int = 200,
        filter_model: dict = None,
        sort_model: list = None,
    ) -> dict:
        """بناء rows_request بتنسيق AG Grid SSRM"""
        return {
            "startRow": start_row,
            "endRow": end_row,
            "rowGroupCols": [],
            "valueCols": [],
            "pivotCols": [],
            "pivotMode": False,
            "groupKeys": [],
            "filterModel": filter_model or {},
            "sortModel": sort_model or [{"sort": "desc", "colId": "account_balance_usd"}],
        }

    async def _fetch_holders_trpc(
        self,
        project_name: str,
        project_id: str = "",
        max_rows: int = 200,
    ) -> Optional[List[dict]]:
        """
        جلب Top holders لمشروع عبر tRPC API.
        
        تنسيق tRPC v11 (بدون {"json":...} wrapper):
        POST {"0": {"mart_id": "top_tokenholders", "rows_request": {...}}}
        
        يحاول الفلترة بـ project_name أولاً، ثم project_id إذا لم يجد نتائج.
        """
        session = await self._get_session()
        headers = self._build_trpc_headers()

        # فلتر حسب اسم المشروع (الأدق)
        filter_model = {
            "project_name": {
                "filterType": "set",
                "values": [project_name]
            }
        }

        all_rows = []
        start_row = 0
        page_size = min(max_rows, 200)

        while start_row < max_rows:
            end_row = min(start_row + page_size, max_rows)

            # تنسيق tRPC v11 — بدون {"json":...} wrapper
            payload = {
                "0": {
                    "mart_id": "top_tokenholders",
                    "rows_request": self._build_rows_request(
                        start_row=start_row,
                        end_row=end_row,
                        filter_model=filter_model,
                    ),
                }
            }

            delay = random.uniform(3.0, 8.0)
            await self._rate_limit(TRPC_URL, delay)

            for attempt in range(1, 4):
                try:
                    async with session.post(
                        TRPC_URL, json=payload, headers=headers
                    ) as resp:
                        if resp.status == 200:
                            text = await resp.text()
                            self._request_count += 1
                            try:
                                data = json.loads(text)
                                rows, last_row = self._parse_trpc_response(data)
                                if rows:
                                    all_rows.extend(rows)
                                    logger.debug(
                                        f"  📥 {project_name}: {len(rows)} صف "
                                        f"({start_row}-{end_row})"
                                    )
                                    # إذا وصلنا لآخر صف، نتوقف
                                    if last_row is not None and end_row >= last_row:
                                        start_row = max_rows  # إنهاء الحلقة
                                    else:
                                        start_row = end_row
                                else:
                                    start_row = max_rows  # لا مزيد من البيانات
                                break  # خروج من حلقة المحاولات
                            except json.JSONDecodeError:
                                logger.error(f"❌ {project_name}: JSON فاسد")
                                return all_rows if all_rows else None

                        elif resp.status == 429:
                            wait = 60 * attempt + random.uniform(15, 45)
                            logger.warning(f"⏳ 429 على {project_name} — انتظار {wait:.0f}ث")
                            await asyncio.sleep(wait)
                            continue
                        elif resp.status == 401:
                            logger.warning(f"🔑 401 — إعادة استخراج التوثيق...")
                            self._jwt = None
                            self._bearer = None
                            if await self._extract_credentials():
                                headers = self._build_trpc_headers()
                                continue
                            else:
                                return all_rows if all_rows else None
                        else:
                            logger.warning(f"❌ {project_name}: HTTP {resp.status}")
                            self._error_count += 1
                            if attempt < 3:
                                await asyncio.sleep(15 * attempt)
                                continue
                            return all_rows if all_rows else None
                except Exception as e:
                    logger.error(f"❗ {project_name}: {e}")
                    self._error_count += 1
                    if attempt < 3:
                        await asyncio.sleep(10 * attempt)
                        continue
                    return all_rows if all_rows else None

        # إذا لم نجد نتائج بالاسم، نجرب بـ project_id
        if not all_rows and project_id:
            logger.info(f"🔄 {project_name}: لا نتائج بالاسم، تجربة project_id='{project_id}'")
            filter_model_id = {
                "project_id": {
                    "filterType": "set",
                    "values": [project_id]
                }
            }
            payload_id = {
                "0": {
                    "mart_id": "top_tokenholders",
                    "rows_request": self._build_rows_request(
                        start_row=0,
                        end_row=max_rows,
                        filter_model=filter_model_id,
                    ),
                }
            }
            delay = random.uniform(3.0, 6.0)
            await self._rate_limit(TRPC_URL, delay)
            try:
                async with session.post(TRPC_URL, json=payload_id, headers=headers) as resp:
                    if resp.status == 200:
                        data = json.loads(await resp.text())
                        self._request_count += 1
                        rows, _ = self._parse_trpc_response(data)
                        if rows:
                            all_rows = rows
            except Exception as e:
                logger.debug(f"  ⚠️ fallback project_id فشل: {e}")

        if all_rows:
            logger.info(f"✅ {project_name}: {len(all_rows)} holders")
        else:
            logger.warning(f"⚠️ {project_name}: لا بيانات")

        return all_rows

    def _parse_trpc_response(self, data: Any) -> tuple:
        """
        تحليل استجابة tRPC batch.
        
        تنسيق v11 (بدون superjson):
        [{"result": {"data": {"data": [...], "lastRow": N}}}]
        
        Returns: (rows, lastRow)
        """
        rows = []
        last_row = None

        if isinstance(data, list) and len(data) > 0:
            result = data[0]
            rdata = result.get("result", {}).get("data", {})

            # v11: data.data (array of rows) — المفتاح الصحيح
            rows = rdata.get("data", [])
            last_row = rdata.get("lastRow")

            # fallback: data.rows
            if not rows:
                rows = rdata.get("rows", [])

            # fallback: v10 مع json wrapper
            if not rows and "json" in rdata:
                jd = rdata["json"]
                rows = jd.get("data", jd.get("rows", []))
                last_row = jd.get("lastRow", last_row)

        elif isinstance(data, dict):
            rows = data.get("data", data.get("rows", []))
            last_row = data.get("lastRow")

        return rows, last_row

    # ─── الحفظ ────────────────────────────────────────────────────────

    def _save_project_holders(self, project_id: str, holders: List[dict], meta: dict = None):
        """حفظ بيانات حاملي مشروع واحد"""
        data = {
            "project_id": project_id,
            "project_name": meta.get("name", project_id) if meta else project_id,
            "token_symbol": meta.get("symbol", "") if meta else "",
            "chain": meta.get("chain", "") if meta else "",
            "logo_url": meta.get("logo_url", "") if meta else "",
            "holders_count": len(holders),
            "holders": holders,
            "crawled_at": datetime.now().isoformat(),
        }

        path = os.path.join(self._data_dir, f"{project_id}.json")
        try:
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2, default=str)
            logger.debug(f"💾 حفظ {project_id}: {len(holders)} holders")
        except Exception as e:
            logger.error(f"❌ فشل حفظ {project_id}: {e}")

    def _save_index(self, projects: List[dict]):
        """حفظ فهرس المشاريع"""
        index = {
            "total": len(projects),
            "total_projects": len(projects),
            "projects": projects,
            "last_update": datetime.now().isoformat(),
        }
        path = os.path.join(self._data_dir, "_index.json")
        try:
            with open(path, "w", encoding="utf-8") as f:
                json.dump(index, f, ensure_ascii=False, indent=2, default=str)
            logger.info(f"📋 حفظ فهرس: {len(projects)} مشروع")
        except Exception as e:
            logger.error(f"❌ فشل حفظ الفهرس: {e}")

    def _rebuild_index(self):
        """إعادة بناء الفهرس من الملفات المحفوظة — يتضمن holders_count و crawled_at"""
        projects = []
        try:
            for fname in sorted(os.listdir(self._data_dir)):
                if fname.startswith("_") or not fname.endswith(".json"):
                    continue
                fpath = os.path.join(self._data_dir, fname)
                try:
                    with open(fpath, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    holders_count = data.get("holders_count", 0)
                    if holders_count == 0:
                        continue  # تخطي المشاريع الفارغة
                    projects.append({
                        "id": data.get("project_id", fname.replace(".json", "")),
                        "name": data.get("project_name", ""),
                        "symbol": data.get("token_symbol", ""),
                        "chain": data.get("chain", ""),
                        "logo_url": data.get("logo_url", ""),
                        "holders_count": holders_count,
                        "crawled_at": data.get("crawled_at", ""),
                    })
                except Exception:
                    continue
        except Exception as e:
            logger.error(f"❌ فشل إعادة بناء الفهرس: {e}")
            return
        self._save_index(projects)
        logger.info(f"📋 إعادة بناء الفهرس: {len(projects)} مشروع ببيانات")

    def _load_index(self) -> Optional[dict]:
        """تحميل فهرس المشاريع"""
        path = os.path.join(self._data_dir, "_index.json")
        try:
            if os.path.exists(path):
                with open(path, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception:
            pass
        return None

    # ─── اكتشاف المشاريع ديناميكياً ──────────────────────────────────

    async def _discover_projects(self) -> List[dict]:
        """
        محاولة اكتشاف المشاريع المتاحة عبر طلب بدون فلتر.
        إذا فشل، نستخدم القائمة الاحتياطية.
        """
        logger.info("🔍 محاولة اكتشاف المشاريع المتاحة...")

        session = await self._get_session()
        headers = self._build_trpc_headers()

        # طلب كبير بدون فلتر لاكتشاف أكبر عدد من المشاريع
        # تمت زيادة الحد لضمان تغطية جميع المشاريع (بناءً على طلب المستخدم: 433 مشروع)
        # 433 مشروع * 200 هولدر = 86,600 صف. نطلب 100,000 للتأكد.
        payload = {
            "0": {
                "mart_id": "top_tokenholders",
                "rows_request": self._build_rows_request(
                    start_row=0,
                    end_row=100000,
                    sort_model=[{"sort": "desc", "colId": "account_balance_usd"}],
                ),
            }
        }

        try:
            delay = random.uniform(2.0, 5.0)
            await self._rate_limit(TRPC_URL, delay)

            async with session.post(TRPC_URL, json=payload, headers=headers) as resp:
                if resp.status == 200:
                    data = json.loads(await resp.text())
                    rows, _ = self._parse_trpc_response(data)
                    if rows:
                        # استخراج أسماء المشاريع الفريدة
                        seen = set()
                        discovered = []
                        for r in rows:
                            pid = r.get("project_id", "")
                            if pid and pid not in seen:
                                seen.add(pid)
                                symbol = r.get("token_symbol", "").lower()
                                logo = ""
                                if symbol:
                                    # استخدام مصدر أيقونات خارجي موثوق
                                    logo = f"https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/{symbol}.png"

                                discovered.append({
                                    "id": pid,
                                    "name": r.get("project_name", pid),
                                    "symbol": r.get("token_symbol", ""),
                                    "chain": r.get("chain_name", ""),
                                    "logo_url": logo,
                                })
                        if discovered:
                            logger.info(f"🔍 تم اكتشاف {len(discovered)} مشروع من API")
                            return discovered
        except Exception as e:
            logger.warning(f"⚠️ فشل اكتشاف المشاريع: {e}")

        return []

    # ─── التنفيذ الرئيسي ──────────────────────────────────────────────

    async def crawl_all(
        self,
        batch_size: int = 50,
        max_projects: int = 0,
        project_ids: List[str] = None,
    ) -> Dict[str, Any]:
        """
        الزحف الرئيسي: جلب Top 200 holders لكل المشاريع

        Args:
            batch_size: عدد المشاريع في كل دفعة (50 افتراضياً)
            max_projects: الحد الأقصى (0 = بدون حد)
            project_ids: قائمة مشاريع محددة (اختياري)
        """
        start_time = time.time()
        logger.info("🚀 بدء زحف Token Terminal — Top 200 Holders (v2)")

        # 1. استخراج التوثيق من JS
        if not await self._extract_credentials():
            logger.error("❌ فشل استخراج التوثيق — تجربة القائمة الاحتياطية")
            return {"success": False, "error": "Failed to extract credentials from JS"}

        # 2. جلب قائمة المشاريع — دمج المكتشفة + الاحتياطية
        all_projects = []
        seen_ids = set()

        # محاولة اكتشاف ديناميكي (أولوية — أسماء صحيحة من API)
        discovered = await self._discover_projects()
        if discovered:
            for p in discovered:
                pid = p["id"]
                if pid not in seen_ids:
                    seen_ids.add(pid)
                    all_projects.append(p)
            logger.info(f"🔍 {len(all_projects)} مشروع مكتشف من API")

        # إضافة مشاريع من القائمة الاحتياطية (التي لم تُكتشف)
        for p in FALLBACK_PROJECTS:
            pid = p["id"]
            if pid not in seen_ids:
                seen_ids.add(pid)
                all_projects.append(p)

        if len(all_projects) > len(discovered or []):
            logger.info(f"📋 +{len(all_projects) - len(discovered or [])} مشروع من القائمة الاحتياطية (المجموع: {len(all_projects)})")

        if not all_projects:
            # الفهرس المحلي كملاذ أخير
            cached_index = self._load_index()
            if cached_index:
                all_projects = cached_index.get("projects", [])
                logger.info(f"📋 {len(all_projects)} مشروع من الفهرس المحلي")

        if not all_projects:
            logger.error("❌ لا توجد مشاريع لزحفها")
            return {"success": False, "error": "No projects found"}

        # حفظ الفهرس
        self._save_index(all_projects)

        # 3. فلترة المشاريع
        if project_ids:
            all_projects = [p for p in all_projects if p["id"] in project_ids]

        if max_projects > 0:
            all_projects = all_projects[:max_projects]

        total = len(all_projects)
        logger.info(f"🎯 سيتم زحف {total} مشروع بدفعات من {batch_size}")

        # 4. الزحف بالدفعات
        success_count = 0
        fail_count = 0

        for batch_start in range(0, total, batch_size):
            batch_end = min(batch_start + batch_size, total)
            batch = all_projects[batch_start:batch_end]
            batch_num = (batch_start // batch_size) + 1
            total_batches = (total + batch_size - 1) // batch_size

            logger.info(f"📦 دفعة {batch_num}/{total_batches} ({len(batch)} مشروع)")

            for i, project in enumerate(batch):
                pid = project["id"]
                pname = project.get("name", pid)

                # تأخير عشوائي بين المشاريع
                if i > 0:
                    jitter = random.uniform(3.0, 8.0)
                    logger.debug(f"⏳ تأخير {jitter:.1f}ث...")
                    await asyncio.sleep(jitter)

                try:
                    holders = await self._fetch_holders_trpc(pname, project_id=pid, max_rows=200)
                    if holders is not None and len(holders) > 0:
                        self._save_project_holders(pid, holders, project)
                        success_count += 1
                    elif holders is not None and len(holders) == 0:
                        # مشروع بدون حاملين — نحفظ ملف فارغ
                        self._save_project_holders(pid, [], project)
                        logger.info(f"📭 {pname}: لا حاملين (ملف فارغ)")
                        success_count += 1
                    else:
                        fail_count += 1
                        logger.warning(f"⚠️ فشل {pname}")
                except Exception as e:
                    fail_count += 1
                    logger.error(f"❗ خطأ في {pname}: {e}")

                # تقرير تقدم كل 10 مشاريع
                done = batch_start + i + 1
                if done % 10 == 0 or done == total:
                    elapsed = time.time() - start_time
                    rate = done / elapsed * 60 if elapsed > 0 else 0
                    logger.info(
                        f"📊 تقدم: {done}/{total} "
                        f"(✅{success_count} ❌{fail_count}) "
                        f"— {rate:.1f} مشروع/دقيقة"
                    )

            # استراحة بين الدفعات
            if batch_end < total:
                rest = random.uniform(15, 30)
                logger.info(f"💤 استراحة بين الدفعات: {rest:.0f}ث")
                await asyncio.sleep(rest)

        # 5. ملخص
        elapsed = time.time() - start_time
        stats = {
            "success": True,
            "total_projects": total,
            "success_count": success_count,
            "fail_count": fail_count,
            "duration_seconds": round(elapsed, 1),
            "rate_per_minute": round(total / elapsed * 60, 1) if elapsed > 0 else 0,
            "timestamp": datetime.now().isoformat(),
        }

        # إعادة بناء الفهرس ببيانات فعلية (holders_count, crawled_at)
        self._rebuild_index()

        # حفظ ملخص الزحف
        summary_path = os.path.join(self._data_dir, "_summary.json")
        with open(summary_path, "w", encoding="utf-8") as f:
            json.dump(stats, f, ensure_ascii=False, indent=2)

        logger.info(
            f"🏁 اكتمل الزحف: {success_count}/{total} مشروع "
            f"في {elapsed:.0f}ث ({stats['rate_per_minute']:.1f}/دقيقة)"
        )

        await self.close()
        return stats


# ─── دالة مساعدة للتشغيل المباشر ─────────────────────────────────────

async def run_tokenterminal_scraper(
    batch_size: int = 50,
    max_projects: int = 0,
    project_ids: List[str] = None,
) -> Dict[str, Any]:
    """تشغيل الزاحف"""
    scraper = TokenTerminalScraper()
    try:
        return await scraper.crawl_all(
            batch_size=batch_size,
            max_projects=max_projects,
            project_ids=project_ids,
        )
    finally:
        await scraper.close()


if __name__ == "__main__":
    # تشغيل تجريبي — 5 مشاريع فقط
    result = asyncio.run(run_tokenterminal_scraper(max_projects=5))
    print(json.dumps(result, indent=2, ensure_ascii=False))
