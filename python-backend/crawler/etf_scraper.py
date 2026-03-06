"""
₿ زاحف صناديق ETF — Bitcoin ETF & Ethereum ETF
═══════════════════════════════════════════════════

يجمع بيانات ETF من مصادر مجانية:

1. CoinGlass API (مجاني محدود):
   - Bitcoin Spot ETF flows
   - Ethereum Spot ETF flows

2. CoinGecko (مجاني):
   - أسعار BTC/ETH التاريخية
   - Market caps

3. DeFiLlama:
   - BTC/ETH TVL cross-chain

4. Web Scraping (Farside Investors):
   - ETF daily flows table
   - Issuer comparison

الإخراج: __etf_data__.json في crawler/data/latest/
"""

import asyncio
import json
import time
import re
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List

import aiohttp
from bs4 import BeautifulSoup
from loguru import logger

from .base_scraper import BaseScraper
from .config import CrawlerSettings, DEFAULT_SETTINGS
from .utils import get_random_user_agent


COINGECKO_BASE = "https://api.coingecko.com/api/v3"
COINGLASS_BASE = "https://open-api.coinglass.com/public/v2"


# ══════════════════════════════════════════════════════════════════
# معلومات ثابتة عن مُصدري ETF
# ══════════════════════════════════════════════════════════════════

BTC_ETF_ISSUERS = [
    {"ticker": "IBIT", "name": "iShares Bitcoin Trust", "issuer": "BlackRock", "fee": 0.25},
    {"ticker": "FBTC", "name": "Fidelity Wise Origin Bitcoin Fund", "issuer": "Fidelity", "fee": 0.25},
    {"ticker": "GBTC", "name": "Grayscale Bitcoin Trust", "issuer": "Grayscale", "fee": 1.50},
    {"ticker": "ARKB", "name": "ARK 21Shares Bitcoin ETF", "issuer": "ARK/21Shares", "fee": 0.21},
    {"ticker": "BITB", "name": "Bitwise Bitcoin ETF", "issuer": "Bitwise", "fee": 0.20},
    {"ticker": "HODL", "name": "VanEck Bitcoin Trust", "issuer": "VanEck", "fee": 0.20},
    {"ticker": "BRRR", "name": "Valkyrie Bitcoin Fund", "issuer": "Valkyrie", "fee": 0.25},
    {"ticker": "EZBC", "name": "Franklin Bitcoin ETF", "issuer": "Franklin Templeton", "fee": 0.19},
    {"ticker": "BTCO", "name": "Invesco Galaxy Bitcoin ETF", "issuer": "Invesco", "fee": 0.25},
    {"ticker": "BTCW", "name": "WisdomTree Bitcoin Fund", "issuer": "WisdomTree", "fee": 0.30},
    {"ticker": "DEFI", "name": "Hashdex Bitcoin ETF", "issuer": "Hashdex", "fee": 0.90},
]

ETH_ETF_ISSUERS = [
    {"ticker": "ETHA", "name": "iShares Ethereum Trust", "issuer": "BlackRock", "fee": 0.25},
    {"ticker": "FETH", "name": "Fidelity Ethereum Fund", "issuer": "Fidelity", "fee": 0.25},
    {"ticker": "ETHE", "name": "Grayscale Ethereum Trust", "issuer": "Grayscale", "fee": 2.50},
    {"ticker": "ETH", "name": "Grayscale Ethereum Mini Trust", "issuer": "Grayscale Mini", "fee": 0.15},
    {"ticker": "ETHW", "name": "Bitwise Ethereum ETF", "issuer": "Bitwise", "fee": 0.20},
    {"ticker": "CETH", "name": "21Shares Core Ethereum ETF", "issuer": "21Shares", "fee": 0.21},
    {"ticker": "ETHV", "name": "VanEck Ethereum Trust", "issuer": "VanEck", "fee": 0.20},
    {"ticker": "QETH", "name": "Invesco Galaxy Ethereum ETF", "issuer": "Invesco", "fee": 0.25},
    {"ticker": "EZET", "name": "Franklin Ethereum ETF", "issuer": "Franklin Templeton", "fee": 0.19},
]


class ETFScraper(BaseScraper):
    """
    ₿📈 زاحف بيانات ETF — Bitcoin & Ethereum Spot ETFs.
    """

    def __init__(self, settings: CrawlerSettings = None):
        super().__init__(settings)

    async def _fetch_json(self, url: str, delay: float = 1.5,
                          retries: int = 3, headers: dict = None) -> Optional[Any]:
        """جلب JSON مع إعادة محاولة."""
        await self._rate_limit(url, delay)
        session = await self._get_session()

        for attempt in range(1, retries + 1):
            try:
                req_headers = headers or {"User-Agent": get_random_user_agent()}
                async with session.get(url, headers=req_headers) as resp:
                    if resp.status == 200:
                        return await resp.json()
                    elif resp.status == 429:
                        wait = 2 ** attempt * 5
                        logger.warning(f"⚠️ 429 من {url} — انتظار {wait}s")
                        await asyncio.sleep(wait)
                    else:
                        logger.warning(f"⚠️ HTTP {resp.status} من {url}")
                        if attempt < retries:
                            await asyncio.sleep(2 ** attempt)
            except Exception as e:
                logger.error(f"❌ خطأ جلب {url}: {e}")
                if attempt < retries:
                    await asyncio.sleep(2 ** attempt)
        return None

    async def _fetch_html(self, url: str, delay: float = 2.0) -> Optional[str]:
        """جلب HTML."""
        await self._rate_limit(url, delay)
        session = await self._get_session()
        try:
            headers = {"User-Agent": get_random_user_agent()}
            async with session.get(url, headers=headers) as resp:
                if resp.status == 200:
                    return await resp.text()
        except Exception as e:
            logger.error(f"❌ خطأ HTML {url}: {e}")
        return None

    # ══════════════════════════════════════════════════════════════
    # 📊 Bitcoin ETF Data
    # ══════════════════════════════════════════════════════════════

    async def fetch_btc_etf(self) -> Dict:
        """بيانات Bitcoin ETF من عدة مصادر."""
        result = {
            "issuers": BTC_ETF_ISSUERS,
            "btc_price_history": [],
            "btc_current": {},
            "flows": [],
            "total_aum_estimate": 0,
        }

        # 1. سعر BTC التاريخي (365 يوم)
        chart = await self._fetch_json(
            f"{COINGECKO_BASE}/coins/bitcoin/market_chart"
            "?vs_currency=usd&days=365&interval=daily"
        )
        if chart:
            prices = chart.get("prices", [])
            volumes = chart.get("total_volumes", [])
            mcaps = chart.get("market_caps", [])
            result["btc_price_history"] = [{
                "date": int(p[0] / 1000),
                "price": p[1],
                "volume": volumes[i][1] if i < len(volumes) else None,
                "market_cap": mcaps[i][1] if i < len(mcaps) else None,
            } for i, p in enumerate(prices)]

        # 2. بيانات BTC الحالية
        await asyncio.sleep(1.5)
        btc_data = await self._fetch_json(
            f"{COINGECKO_BASE}/coins/bitcoin"
            "?localization=false&tickers=false&community_data=false&developer_data=false"
        )
        if btc_data:
            md = btc_data.get("market_data", {})
            result["btc_current"] = {
                "price_usd": md.get("current_price", {}).get("usd"),
                "market_cap": md.get("market_cap", {}).get("usd"),
                "total_volume": md.get("total_volume", {}).get("usd"),
                "price_change_24h": md.get("price_change_percentage_24h"),
                "price_change_7d": md.get("price_change_percentage_7d"),
                "price_change_30d": md.get("price_change_percentage_30d"),
                "circulating_supply": md.get("circulating_supply"),
                "total_supply": md.get("total_supply"),
                "dominance": md.get("market_cap_percentage", {}).get("btc") if hasattr(md, "get") else None,
            }

        # 3. محاولة جلب ETF Flows من Farside (web scraping)
        try:
            await asyncio.sleep(2)
            flows = await self._scrape_farside_etf_flows("btc")
            if flows:
                result["flows"] = flows
        except Exception as e:
            logger.warning(f"⚠️ فشل جلب ETF flows: {e}")

        return result

    async def fetch_eth_etf(self) -> Dict:
        """بيانات Ethereum ETF من عدة مصادر."""
        result = {
            "issuers": ETH_ETF_ISSUERS,
            "eth_price_history": [],
            "eth_current": {},
            "flows": [],
            "total_aum_estimate": 0,
        }

        # 1. سعر ETH التاريخي
        chart = await self._fetch_json(
            f"{COINGECKO_BASE}/coins/ethereum/market_chart"
            "?vs_currency=usd&days=365&interval=daily"
        )
        if chart:
            prices = chart.get("prices", [])
            volumes = chart.get("total_volumes", [])
            mcaps = chart.get("market_caps", [])
            result["eth_price_history"] = [{
                "date": int(p[0] / 1000),
                "price": p[1],
                "volume": volumes[i][1] if i < len(volumes) else None,
                "market_cap": mcaps[i][1] if i < len(mcaps) else None,
            } for i, p in enumerate(prices)]

        # 2. ETH الحالي
        await asyncio.sleep(1.5)
        eth_data = await self._fetch_json(
            f"{COINGECKO_BASE}/coins/ethereum"
            "?localization=false&tickers=false&community_data=false&developer_data=false"
        )
        if eth_data:
            md = eth_data.get("market_data", {})
            result["eth_current"] = {
                "price_usd": md.get("current_price", {}).get("usd"),
                "market_cap": md.get("market_cap", {}).get("usd"),
                "total_volume": md.get("total_volume", {}).get("usd"),
                "price_change_24h": md.get("price_change_percentage_24h"),
                "price_change_7d": md.get("price_change_percentage_7d"),
                "price_change_30d": md.get("price_change_percentage_30d"),
                "circulating_supply": md.get("circulating_supply"),
                "total_supply": md.get("total_supply"),
            }

        # 3. ETH ETF Flows
        try:
            await asyncio.sleep(2)
            flows = await self._scrape_farside_etf_flows("eth")
            if flows:
                result["flows"] = flows
        except Exception as e:
            logger.warning(f"⚠️ فشل جلب ETF flows: {e}")

        return result

    # ══════════════════════════════════════════════════════════════
    # 🌐 Web Scraping — Farside Investors ETF Flows
    # ══════════════════════════════════════════════════════════════

    async def _scrape_farside_etf_flows(self, asset: str = "btc") -> List[Dict]:
        """محاولة جلب ETF flows من Farside Investors."""
        url = f"https://farside.co.uk/btc/" if asset == "btc" else "https://farside.co.uk/eth/"
        html = await self._fetch_html(url)
        if not html:
            return []

        flows = []
        try:
            soup = BeautifulSoup(html, "html.parser")
            tables = soup.find_all("table")
            if not tables:
                return []

            table = tables[0]
            rows = table.find_all("tr")
            headers = []

            for row in rows:
                cells = row.find_all(["th", "td"])
                texts = [c.get_text(strip=True) for c in cells]

                if not headers:
                    headers = texts
                    continue

                if len(texts) >= 3:
                    flow_entry = {"date": texts[0]}
                    for i, header in enumerate(headers[1:], 1):
                        if i < len(texts):
                            val = texts[i].replace(",", "").replace("(", "-").replace(")", "")
                            try:
                                flow_entry[header] = float(val)
                            except ValueError:
                                flow_entry[header] = 0
                    flows.append(flow_entry)
        except Exception as e:
            logger.warning(f"⚠️ خطأ تحليل Farside: {e}")

        return flows[-90:]  # آخر 90 يوم

    # ══════════════════════════════════════════════════════════════
    # 🔄 تشغيل
    # ══════════════════════════════════════════════════════════════

    async def crawl_all(self) -> Dict:
        """زحف كامل لبيانات ETF."""
        logger.info("₿ بدء زحف ETF Data...")
        start = time.time()

        result = {
            "timestamp": datetime.now().isoformat(),
            "crawler_version": "2.0.0",
        }

        # Bitcoin ETF
        try:
            result["bitcoin_etf"] = await self.fetch_btc_etf()
            logger.info("✅ Bitcoin ETF — تم")
        except Exception as e:
            logger.error(f"❌ Bitcoin ETF: {e}")
            result["bitcoin_etf"] = {"error": str(e)}

        # Ethereum ETF
        try:
            result["ethereum_etf"] = await self.fetch_eth_etf()
            logger.info("✅ Ethereum ETF — تم")
        except Exception as e:
            logger.error(f"❌ Ethereum ETF: {e}")
            result["ethereum_etf"] = {"error": str(e)}

        result["crawl_duration_seconds"] = round(time.time() - start, 2)
        logger.info(f"₿ ETF Data: [{result['crawl_duration_seconds']}s]")

        return result

    async def quick_crawl(self) -> Dict:
        """زحف سريع — أسعار فقط."""
        result = {
            "timestamp": datetime.now().isoformat(),
            "crawler_version": "2.0.0",
        }

        # أسعار BTC + ETH فقط (بدون flows)
        chart_btc = await self._fetch_json(
            f"{COINGECKO_BASE}/coins/bitcoin/market_chart"
            "?vs_currency=usd&days=7&interval=daily"
        )
        if chart_btc:
            result["bitcoin_etf"] = {
                "btc_price_history": [{
                    "date": int(p[0] / 1000), "price": p[1]
                } for p in chart_btc.get("prices", [])],
                "issuers": BTC_ETF_ISSUERS,
            }

        await asyncio.sleep(1.5)

        chart_eth = await self._fetch_json(
            f"{COINGECKO_BASE}/coins/ethereum/market_chart"
            "?vs_currency=usd&days=7&interval=daily"
        )
        if chart_eth:
            result["ethereum_etf"] = {
                "eth_price_history": [{
                    "date": int(p[0] / 1000), "price": p[1]
                } for p in chart_eth.get("prices", [])],
                "issuers": ETH_ETF_ISSUERS,
            }

        return result
