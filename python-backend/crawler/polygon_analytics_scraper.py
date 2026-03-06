"""
🟣 زاحف Polygon التحليلي — بيانات متخصصة لكل صفحة Polygon
═══════════════════════════════════════════════════════════════

يجمع بيانات من عدة مصادر مجانية:

1. DeFiLlama APIs:
   - /v2/historicalChainTvl/Polygon          — TVL التاريخي
   - /overview/dexs/polygon                   — أحجام DEX
   - /overview/fees/polygon                   — الرسوم
   - /stablecoins                             — العملات المستقرة على Polygon
   - /v2/chains                               — مقارنة السلاسل

2. CoinGecko Free API:
   - /coins/matic-network/market_chart        — سعر POL التاريخي
   - /coins/matic-network                     — بيانات السوق

3. Dune Analytics (إن توفر API key):
   - NFT volumes, marketplace data
   - Polygon PoS payments

4. PolygonScan (etherscan_scraper موجود):
   - Gas, Transactions, Contracts

الإخراج: polygon_analytics.json في crawler/data/latest/
"""

import asyncio
import json
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List

import aiohttp
from loguru import logger

from .base_scraper import BaseScraper
from .config import CrawlerSettings, DEFAULT_SETTINGS
from .utils import get_random_user_agent


# ════════════════════════════════════════════════════════════════
# نقاط API المجانية
# ════════════════════════════════════════════════════════════════

DEFILLAMA_BASE = "https://api.llama.fi"
COINGECKO_BASE = "https://api.coingecko.com/api/v3"
POLYGONSCAN_API = "https://api.polygonscan.com/api"
DUNE_API_BASE = "https://api.dune.com/api/v1"

# Polymarket CLOB API
POLYMARKET_CLOB = "https://clob.polymarket.com"
POLYMARKET_GAMMA = "https://gamma-api.polymarket.com"


class PolygonAnalyticsScraper(BaseScraper):
    """
    🟣 زاحف متخصص لصفحات Polygon التحليلية.
    يجمع البيانات من APIs مجانية ويحولها إلى تنسيقات جاهزة للرسوم البيانية.
    """

    def __init__(self, settings: CrawlerSettings = None,
                 etherscan_api_key: str = None,
                 dune_api_key: str = None):
        super().__init__(settings)
        self.etherscan_api_key = etherscan_api_key or ""
        self.dune_api_key = dune_api_key or ""

    # ══════════════════════════════════════════════════════════════
    # 🔌 HTTP JSON Fetcher
    # ══════════════════════════════════════════════════════════════

    async def _fetch_json(self, url: str, delay: float = 1.5,
                          retries: int = 3) -> Optional[Any]:
        """جلب JSON مع إعادة محاولة."""
        await self._rate_limit(url, delay)
        session = await self._get_session()

        for attempt in range(1, retries + 1):
            try:
                headers = {"User-Agent": get_random_user_agent()}
                async with session.get(url, headers=headers) as resp:
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

    # ══════════════════════════════════════════════════════════════
    # 📊 1. بيانات الشبكة والمقارنة (لصفحات polygon, polygon-network, evm-comparison, chain-usage)
    # ══════════════════════════════════════════════════════════════

    async def fetch_polygon_tvl_history(self) -> List[Dict]:
        """TVL التاريخي لـ Polygon من DeFiLlama."""
        url = f"{DEFILLAMA_BASE}/v2/historicalChainTvl/Polygon"
        data = await self._fetch_json(url)
        if data and isinstance(data, list):
            return [{"date": d.get("date"), "tvl": d.get("tvl")} for d in data]
        return []

    async def fetch_chains_tvl_comparison(self) -> List[Dict]:
        """TVL لكل السلاسل — للمقارنة."""
        url = f"{DEFILLAMA_BASE}/v2/chains"
        data = await self._fetch_json(url)
        if data and isinstance(data, list):
            # أخذ أكبر 20 سلسلة
            sorted_chains = sorted(data, key=lambda x: x.get("tvl", 0) or 0, reverse=True)[:20]
            return [{
                "name": c.get("name", ""),
                "gecko_id": c.get("gecko_id", ""),
                "token_symbol": c.get("tokenSymbol", ""),
                "chain_id": c.get("chainId"),
                "tvl": c.get("tvl"),
            } for c in sorted_chains]
        return []

    async def fetch_evm_chains_comparison(self) -> Dict:
        """مقارنة EVM Chains — TVL + DEX + Fees."""
        evm_chains = ["Ethereum", "Polygon", "BSC", "Arbitrum", "Optimism",
                       "Avalanche", "Base", "Fantom", "Gnosis", "zkSync Era"]
        result = {"chains": []}

        # TVL
        tvl_data = await self._fetch_json(f"{DEFILLAMA_BASE}/v2/chains")
        tvl_map = {}
        if tvl_data:
            for c in tvl_data:
                tvl_map[c.get("name", "")] = c.get("tvl", 0)

        # DEX volumes
        dex_data = await self._fetch_json(f"{DEFILLAMA_BASE}/overview/dexs?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true")
        dex_map = {}
        if dex_data and "protocols" in dex_data:
            for p in dex_data["protocols"]:
                for chain in p.get("chains", []):
                    if chain in evm_chains:
                        dex_map[chain] = dex_map.get(chain, 0) + (p.get("total24h") or 0)

        # Fees
        fees_data = await self._fetch_json(f"{DEFILLAMA_BASE}/overview/fees?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true")
        fees_map = {}
        if fees_data and "protocols" in fees_data:
            for p in fees_data["protocols"]:
                for chain in p.get("chains", []):
                    if chain in evm_chains:
                        fees_map[chain] = fees_map.get(chain, 0) + (p.get("total24h") or 0)

        for chain_name in evm_chains:
            result["chains"].append({
                "name": chain_name,
                "tvl": tvl_map.get(chain_name, 0),
                "dex_volume_24h": dex_map.get(chain_name, 0),
                "fees_24h": fees_map.get(chain_name, 0),
            })

        return result

    # ══════════════════════════════════════════════════════════════
    # 💎 2. بيانات DeFi (لصفحة polygon-defi)
    # ══════════════════════════════════════════════════════════════

    async def fetch_polygon_defi(self) -> Dict:
        """بيانات DeFi على Polygon — البروتوكولات والعوائد."""
        result = {
            "protocols": [],
            "tvl_history": [],
            "yield_pools": [],
            "dex_volumes": {},
        }

        # البروتوكولات على Polygon
        protocols = await self._fetch_json(f"{DEFILLAMA_BASE}/protocols")
        if protocols:
            polygon_protocols = [p for p in protocols
                                  if "Polygon" in p.get("chains", [])]
            polygon_protocols.sort(key=lambda x: (x.get("chainTvls", {}).get("Polygon", 0) or 0), reverse=True)
            result["protocols"] = [{
                "name": p.get("name", ""),
                "symbol": p.get("symbol", ""),
                "category": p.get("category", ""),
                "tvl": p.get("chainTvls", {}).get("Polygon", 0),
                "change_1d": p.get("change_1d"),
                "change_7d": p.get("change_7d"),
                "url": p.get("url", ""),
            } for p in polygon_protocols[:50]]

        # TVL التاريخي
        result["tvl_history"] = await self.fetch_polygon_tvl_history()

        # Yield pools على Polygon
        yield_data = await self._fetch_json("https://yields.llama.fi/pools")
        if yield_data and "data" in yield_data:
            polygon_pools = [p for p in yield_data["data"]
                             if p.get("chain") == "Polygon"]
            polygon_pools.sort(key=lambda x: x.get("tvlUsd", 0) or 0, reverse=True)
            result["yield_pools"] = [{
                "pool_id": p.get("pool", ""),
                "project": p.get("project", ""),
                "symbol": p.get("symbol", ""),
                "tvl_usd": p.get("tvlUsd"),
                "apy": p.get("apy"),
                "apy_base": p.get("apyBase"),
                "apy_reward": p.get("apyReward"),
                "stablecoin": p.get("stablecoin", False),
            } for p in polygon_pools[:50]]

        # DEX volumes
        dex_data = await self._fetch_json(f"{DEFILLAMA_BASE}/overview/dexs/Polygon")
        if dex_data:
            result["dex_volumes"] = {
                "total_24h": dex_data.get("total24h"),
                "total_7d": dex_data.get("total7d"),
                "change_1d": dex_data.get("change_1d"),
                "protocols": [{
                    "name": p.get("name", ""),
                    "total_24h": p.get("total24h"),
                    "change_1d": p.get("change_1d"),
                } for p in (dex_data.get("protocols") or [])[:20]],
            }

        return result

    # ══════════════════════════════════════════════════════════════
    # 💵 3. بيانات العملات المستقرة (لصفحة polygon-stablecoin)
    # ══════════════════════════════════════════════════════════════

    async def fetch_polygon_stablecoins(self) -> Dict:
        """العملات المستقرة على Polygon."""
        result = {
            "stablecoins": [],
            "total_mcap_polygon": 0,
            "total_mcap_global": 0,
        }

        data = await self._fetch_json("https://stablecoins.llama.fi/stablecoins?includePrices=true")
        if data and "peggedAssets" in data:
            polygon_stables = []
            for s in data["peggedAssets"]:
                chain_circ = s.get("chainCirculating", {})
                if "Polygon" in chain_circ:
                    polygon_amount = chain_circ["Polygon"].get("current", {}).get("peggedUSD", 0)
                    if polygon_amount and polygon_amount > 0:
                        polygon_stables.append({
                            "name": s.get("name", ""),
                            "symbol": s.get("symbol", ""),
                            "peg_type": s.get("pegType", ""),
                            "peg_mechanism": s.get("pegMechanism", ""),
                            "circulating_polygon": polygon_amount,
                            "circulating_total": sum(
                                ch.get("current", {}).get("peggedUSD", 0)
                                for ch in chain_circ.values()
                            ),
                            "price": s.get("price"),
                        })
                        result["total_mcap_polygon"] += polygon_amount

            polygon_stables.sort(key=lambda x: x["circulating_polygon"], reverse=True)
            result["stablecoins"] = polygon_stables

        # Historical stablecoin chart (total)
        hist = await self._fetch_json("https://stablecoins.llama.fi/stablecoincharts/Polygon")
        if hist and isinstance(hist, list):
            result["history"] = [{
                "date": h.get("date"),
                "totalCirculating": h.get("totalCirculating", {}).get("peggedUSD", 0),
            } for h in hist[-365:]]  # آخر سنة

        return result

    # ══════════════════════════════════════════════════════════════
    # 🪙 4. بيانات POL Token (لصفحة pol-token)
    # ══════════════════════════════════════════════════════════════

    async def fetch_pol_token_data(self) -> Dict:
        """بيانات POL/MATIC Token من CoinGecko."""
        result = {
            "current": {},
            "price_history": [],
            "market_chart": {},
        }

        # بيانات السوق الحالية
        current = await self._fetch_json(
            f"{COINGECKO_BASE}/coins/matic-network"
            "?localization=false&tickers=false&community_data=false&developer_data=false"
        )
        if current:
            md = current.get("market_data", {})
            result["current"] = {
                "price_usd": md.get("current_price", {}).get("usd"),
                "price_btc": md.get("current_price", {}).get("btc"),
                "market_cap": md.get("market_cap", {}).get("usd"),
                "total_volume": md.get("total_volume", {}).get("usd"),
                "high_24h": md.get("high_24h", {}).get("usd"),
                "low_24h": md.get("low_24h", {}).get("usd"),
                "price_change_24h": md.get("price_change_percentage_24h"),
                "price_change_7d": md.get("price_change_percentage_7d"),
                "price_change_30d": md.get("price_change_percentage_30d"),
                "circulating_supply": md.get("circulating_supply"),
                "total_supply": md.get("total_supply"),
                "max_supply": md.get("max_supply"),
                "ath": md.get("ath", {}).get("usd"),
                "ath_date": md.get("ath_date", {}).get("usd"),
                "atl": md.get("atl", {}).get("usd"),
                "atl_date": md.get("atl_date", {}).get("usd"),
                "fully_diluted_valuation": md.get("fully_diluted_valuation", {}).get("usd"),
            }

        # سعر تاريخي — آخر 365 يوم
        await asyncio.sleep(1.5)  # rate limit CoinGecko
        chart = await self._fetch_json(
            f"{COINGECKO_BASE}/coins/matic-network/market_chart"
            "?vs_currency=usd&days=365&interval=daily"
        )
        if chart:
            prices = chart.get("prices", [])
            volumes = chart.get("total_volumes", [])
            mcaps = chart.get("market_caps", [])
            result["price_history"] = [{
                "date": int(p[0] / 1000),  # Unix timestamp (seconds)
                "price": p[1],
                "volume": volumes[i][1] if i < len(volumes) else None,
                "market_cap": mcaps[i][1] if i < len(mcaps) else None,
            } for i, p in enumerate(prices)]

        return result

    # ══════════════════════════════════════════════════════════════
    # 💱 5. بيانات FX Dashboard (لصفحة fx-dash)
    # ══════════════════════════════════════════════════════════════

    async def fetch_fx_dashboard(self) -> Dict:
        """بيانات العملات الرقمية مقابل العملات التقليدية."""
        result = {"pairs": [], "polygon_gas_history": []}

        # أسعار العملات الرئيسية بعدة عملات
        coins = ["bitcoin", "ethereum", "matic-network"]
        vs_currencies = "usd,eur,gbp,jpy,try,sar,aed"

        prices = await self._fetch_json(
            f"{COINGECKO_BASE}/simple/price"
            f"?ids={','.join(coins)}&vs_currencies={vs_currencies}"
            "&include_24hr_change=true&include_24hr_vol=true"
        )
        if prices:
            result["pairs"] = prices

        return result

    # ══════════════════════════════════════════════════════════════
    # 🖼️ 6. بيانات NFT (لصفحة polygon-nft)
    # ══════════════════════════════════════════════════════════════

    async def fetch_polygon_nft(self) -> Dict:
        """بيانات NFT على Polygon — من DeFiLlama + CoinGecko."""
        result = {
            "collections": [],
            "marketplaces": [],
            "volume_history": [],
        }

        # NFT Marketplaces volume from DeFiLlama
        nft_data = await self._fetch_json(f"{DEFILLAMA_BASE}/overview/dexs/Polygon")
        # DeFiLlama doesn't have NFT-specific endpoints easily, 
        # use generic volume as proxy

        # CoinGecko NFT data (limited free)
        nft_list = await self._fetch_json(
            f"{COINGECKO_BASE}/nfts/list?per_page=50&page=1"
        )
        if nft_list:
            polygon_nfts = [n for n in nft_list
                            if n.get("asset_platform_id") == "polygon-pos"]
            for nft in polygon_nfts[:20]:
                nft_id = nft.get("id", "")
                await asyncio.sleep(1.5)
                detail = await self._fetch_json(
                    f"{COINGECKO_BASE}/nfts/{nft_id}"
                )
                if detail:
                    result["collections"].append({
                        "name": detail.get("name", ""),
                        "symbol": detail.get("symbol", ""),
                        "contract_address": detail.get("contract_address", ""),
                        "floor_price_usd": detail.get("floor_price", {}).get("usd"),
                        "market_cap_usd": detail.get("market_cap", {}).get("usd"),
                        "volume_24h_usd": detail.get("volume_24h", {}).get("usd"),
                        "total_supply": detail.get("total_supply"),
                        "unique_addresses": detail.get("number_of_unique_addresses"),
                        "floor_price_change_24h": detail.get("floor_price_in_usd_24h_percentage_change"),
                    })

        return result

    # ══════════════════════════════════════════════════════════════
    # 💳 7. بيانات PoS Payments (لصفحة polygon-pos-payments)
    # ══════════════════════════════════════════════════════════════

    async def fetch_pos_payments(self) -> Dict:
        """بيانات المدفوعات على Polygon PoS — من Polygonscan API."""
        result = {
            "daily_tx_count": [],
            "gas_prices": [],
            "token_transfers": [],
        }

        if self.etherscan_api_key:
            # Daily transaction count
            tx_data = await self._fetch_json(
                f"{POLYGONSCAN_API}?module=stats&action=dailytx"
                f"&startdate=2025-01-01&enddate=2026-02-10&sort=asc"
                f"&apikey={self.etherscan_api_key}"
            )
            if tx_data and tx_data.get("status") == "1":
                result["daily_tx_count"] = [{
                    "date": d.get("UTCDate"),
                    "tx_count": int(d.get("transactionCount", 0)),
                } for d in tx_data.get("result", [])]

            await asyncio.sleep(0.3)

            # Daily gas price
            gas_data = await self._fetch_json(
                f"{POLYGONSCAN_API}?module=stats&action=dailyavggasprice"
                f"&startdate=2025-01-01&enddate=2026-02-10&sort=asc"
                f"&apikey={self.etherscan_api_key}"
            )
            if gas_data and gas_data.get("status") == "1":
                result["gas_prices"] = [{
                    "date": d.get("UTCDate"),
                    "avg_gas_gwei": float(d.get("avgGasPrice_Wei", 0)) / 1e9,
                } for d in gas_data.get("result", [])]

        return result

    # ══════════════════════════════════════════════════════════════
    # 📊 8. Polymarket (لصفحة polymarket-markets)
    # ══════════════════════════════════════════════════════════════

    async def fetch_polymarket(self) -> Dict:
        """بيانات Polymarket — Markets & Liquidity."""
        result = {
            "markets": [],
            "total_markets": 0,
            "total_volume": 0,
            "total_liquidity": 0,
        }

        # Gamma API for market data
        markets = await self._fetch_json(
            f"{POLYMARKET_GAMMA}/markets"
            "?limit=100&active=true&closed=false&order=volume24hr&ascending=false"
        )
        if markets and isinstance(markets, list):
            result["total_markets"] = len(markets)
            for m in markets[:50]:
                vol = float(m.get("volume24hr", 0) or 0)
                liq = float(m.get("liquidityNum", 0) or 0)
                result["total_volume"] += vol
                result["total_liquidity"] += liq
                result["markets"].append({
                    "id": m.get("id", ""),
                    "question": m.get("question", ""),
                    "slug": m.get("slug", ""),
                    "category": m.get("category", ""),
                    "volume_24h": vol,
                    "liquidity": liq,
                    "end_date": m.get("endDate"),
                    "outcomes": m.get("outcomes", []),
                    "outcome_prices": m.get("outcomePrices", ""),
                    "active": m.get("active", True),
                })

        return result

    # ══════════════════════════════════════════════════════════════
    # 📚 Data Catalog + Agora (لصفحات polygon-data-catalog, agora-pos)
    # ══════════════════════════════════════════════════════════════

    async def fetch_data_catalog(self) -> Dict:
        """تجميع كل مصادر البيانات المتاحة لـ Polygon."""
        result = {
            "data_sources": [
                {
                    "name": "DeFiLlama",
                    "type": "API",
                    "endpoints": 8,
                    "categories": ["TVL", "DEX", "Fees", "Yields", "Stablecoins",
                                    "Bridges", "Perps OI"],
                    "free": True,
                    "update_frequency": "5 minutes",
                },
                {
                    "name": "PolygonScan",
                    "type": "API + Web Scraping",
                    "endpoints": 20,
                    "categories": ["Transactions", "Tokens", "Gas", "Contracts",
                                    "Accounts", "Blocks"],
                    "free": True,
                    "update_frequency": "Real-time",
                },
                {
                    "name": "CoinGecko",
                    "type": "API",
                    "endpoints": 5,
                    "categories": ["Price", "Market Data", "NFTs", "Exchanges"],
                    "free": True,
                    "update_frequency": "Every 60 seconds",
                },
                {
                    "name": "Dune Analytics",
                    "type": "SQL API",
                    "endpoints": "Unlimited",
                    "categories": ["Custom Queries", "NFT", "DeFi", "Wallets"],
                    "free": False,
                    "update_frequency": "On-demand",
                },
                {
                    "name": "Polymarket",
                    "type": "API",
                    "endpoints": 3,
                    "categories": ["Prediction Markets", "Liquidity", "Volumes"],
                    "free": True,
                    "update_frequency": "Real-time",
                },
            ],
            "total_endpoints": 0,
            "chains_covered": 0,
        }

        # Count from DeFiLlama
        chains_data = await self._fetch_json(f"{DEFILLAMA_BASE}/v2/chains")
        if chains_data:
            result["chains_covered"] = len(chains_data)
            result["total_endpoints"] = sum(
                s["endpoints"] if isinstance(s["endpoints"], int) else 0
                for s in result["data_sources"]
            )

        return result

    # ══════════════════════════════════════════════════════════════
    # 🔄 تشغيل الكل
    # ══════════════════════════════════════════════════════════════

    async def crawl_all(self) -> Dict:
        """زحف كامل لكل بيانات Polygon التحليلية."""
        logger.info("🟣 بدء زحف Polygon Analytics الشامل...")
        start = time.time()

        result = {
            "timestamp": datetime.now().isoformat(),
            "crawler_version": "2.0.0",
            "sections": {},
        }

        sections = {
            "polygon_tvl_history": self.fetch_polygon_tvl_history,
            "evm_comparison": self.fetch_evm_chains_comparison,
            "defi": self.fetch_polygon_defi,
            "stablecoins": self.fetch_polygon_stablecoins,
            "pol_token": self.fetch_pol_token_data,
            "fx_dashboard": self.fetch_fx_dashboard,
            "nft": self.fetch_polygon_nft,
            "pos_payments": self.fetch_pos_payments,
            "polymarket": self.fetch_polymarket,
            "data_catalog": self.fetch_data_catalog,
        }

        sections_ok = []
        sections_failed = []

        for name, fetch_fn in sections.items():
            try:
                logger.info(f"  📥 جلب {name}...")
                data = await fetch_fn()
                result["sections"][name] = data
                sections_ok.append(name)
                logger.info(f"  ✅ {name} — تم")
            except Exception as e:
                logger.error(f"  ❌ {name} — خطأ: {e}")
                sections_failed.append(name)
                result["sections"][name] = {"error": str(e)}

        result["sections_crawled"] = sections_ok
        result["sections_failed"] = sections_failed
        result["crawl_duration_seconds"] = round(time.time() - start, 2)

        logger.info(
            f"🟣 Polygon Analytics: {len(sections_ok)}/{len(sections)} أقسام"
            f" [{result['crawl_duration_seconds']}s]"
        )

        return result

    async def quick_crawl(self) -> Dict:
        """زحف سريع — الأقسام الأساسية فقط."""
        logger.info("⚡ زحف سريع Polygon Analytics...")
        start = time.time()

        result = {
            "timestamp": datetime.now().isoformat(),
            "crawler_version": "2.0.0",
            "sections": {},
        }

        # الأقسام السريعة (بدون NFT و Data Catalog)
        quick_sections = {
            "polygon_tvl_history": self.fetch_polygon_tvl_history,
            "stablecoins": self.fetch_polygon_stablecoins,
            "pol_token": self.fetch_pol_token_data,
            "polymarket": self.fetch_polymarket,
        }

        for name, fetch_fn in quick_sections.items():
            try:
                data = await fetch_fn()
                result["sections"][name] = data
            except Exception as e:
                logger.error(f"⚡ خطأ {name}: {e}")

        result["crawl_duration_seconds"] = round(time.time() - start, 2)
        return result
