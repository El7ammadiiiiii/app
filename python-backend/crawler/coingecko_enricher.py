"""
🪙 CoinGecko Enricher — بيانات سوقية مكملة لـ StakingRewards
══════════════════════════════════════════════════════════════
يجلب من CoinGecko Free API:
  • price_usd, market_cap, total_volume
  • price_change_24h, price_change_7d, price_change_30d
  • circulating_supply, total_supply
  • sparkline_7d

يُستخدم لملء الأعمدة: marketcap, daily_trading_volume,
    price, price_change_*, staking_ratio (= staked / circulating)

API مجاني: 10-30 req/min → نقسّم batch إلى مجموعات من 250 id
"""

import asyncio
import time
from datetime import datetime
from typing import Dict, List, Optional, Any

import aiohttp
from loguru import logger

from .asset_registry import ASSET_REGISTRY, get_coingecko_ids


# ── CoinGecko Free API ──
COINGECKO_BASE = "https://api.coingecko.com/api/v3"
COINS_MARKETS = f"{COINGECKO_BASE}/coins/markets"

# batch = 250 ids max per request (CoinGecko limit)
BATCH_SIZE = 250
# rate limit: pause between requests
REQUEST_DELAY = 2.5  # seconds — conservative for free tier


def _build_id_batches() -> List[List[str]]:
    """تقسيم CoinGecko IDs إلى batches."""
    all_ids = sorted(set(
        meta.coingecko_id
        for meta in ASSET_REGISTRY.values()
        if meta.coingecko_id
    ))
    batches = []
    for i in range(0, len(all_ids), BATCH_SIZE):
        batches.append(all_ids[i:i + BATCH_SIZE])
    return batches


async def fetch_coingecko_markets(
    session: aiohttp.ClientSession,
    ids: List[str],
    vs_currency: str = "usd",
) -> List[Dict[str, Any]]:
    """
    جلب بيانات السوق لمجموعة IDs من /coins/markets.
    Returns: list of coin objects.
    """
    params = {
        "vs_currency": vs_currency,
        "ids": ",".join(ids),
        "order": "market_cap_desc",
        "per_page": str(len(ids)),
        "page": "1",
        "sparkline": "false",
        "price_change_percentage": "24h,7d,30d",
        "locale": "en",
    }

    try:
        async with session.get(
            COINS_MARKETS,
            params=params,
            timeout=aiohttp.ClientTimeout(total=30),
        ) as resp:
            if resp.status == 200:
                data = await resp.json()
                logger.info(f"✅ CoinGecko /coins/markets → {len(data)} coins")
                return data
            elif resp.status == 429:
                logger.warning("⏳ CoinGecko 429 Rate Limit — waiting 60s")
                await asyncio.sleep(60)
                return []
            else:
                text = await resp.text()
                logger.warning(f"⚠️ CoinGecko {resp.status}: {text[:200]}")
                return []
    except Exception as e:
        logger.error(f"❌ CoinGecko fetch error: {e}")
        return []


def _parse_coin(coin: Dict[str, Any]) -> Dict[str, Any]:
    """
    تحويل coin object من CoinGecko إلى dict مسطح.
    """
    def _num(v):
        if v is None:
            return None
        try:
            return float(v)
        except (ValueError, TypeError):
            return None

    return {
        "coingecko_id": coin.get("id", ""),
        "symbol": (coin.get("symbol") or "").upper(),
        "name": coin.get("name", ""),
        "logo_url": coin.get("image", ""),

        # السعر
        "price_usd": _num(coin.get("current_price")),
        "market_cap": _num(coin.get("market_cap")),
        "market_cap_rank": coin.get("market_cap_rank"),
        "total_volume": _num(coin.get("total_volume")),

        # التغيرات
        "price_change_24h": _num(coin.get("price_change_percentage_24h")),
        "price_change_7d": _num(coin.get("price_change_percentage_7d_in_currency")),
        "price_change_30d": _num(coin.get("price_change_percentage_30d_in_currency")),

        # المعروض
        "circulating_supply": _num(coin.get("circulating_supply")),
        "total_supply": _num(coin.get("total_supply")),
        "max_supply": _num(coin.get("max_supply")),

        # ATH/ATL
        "ath": _num(coin.get("ath")),
        "atl": _num(coin.get("atl")),
    }


async def fetch_all_coingecko_data(
    api_key: Optional[str] = None,
) -> Dict[str, Dict[str, Any]]:
    """
    جلب بيانات كل الأصول المسجلة من CoinGecko.

    Returns:
        Dict[coingecko_id → parsed coin data]
    """
    batches = _build_id_batches()
    logger.info(f"🪙 CoinGecko: {sum(len(b) for b in batches)} IDs في {len(batches)} batch(es)")

    headers = {
        "Accept": "application/json",
    }
    if api_key:
        # Demo/Pro key
        headers["x-cg-demo-key"] = api_key

    result: Dict[str, Dict[str, Any]] = {}

    async with aiohttp.ClientSession(headers=headers) as session:
        for i, batch in enumerate(batches):
            if i > 0:
                await asyncio.sleep(REQUEST_DELAY)

            logger.debug(f"📦 Batch {i + 1}/{len(batches)}: {len(batch)} IDs")
            coins = await fetch_coingecko_markets(session, batch)

            for coin in coins:
                parsed = _parse_coin(coin)
                cg_id = parsed["coingecko_id"]
                if cg_id:
                    result[cg_id] = parsed

    logger.info(f"🪙 CoinGecko: {len(result)} coins fetched")
    return result


def merge_coingecko_into_asset(
    asset_dict: dict,
    cg_data: Dict[str, Dict[str, Any]],
    registry_slug_map: Optional[Dict[str, str]] = None,
) -> dict:
    """
    دمج بيانات CoinGecko في أصل StakingRewards.

    يبحث عن coingecko_id من Registry ثم يملأ الحقول الفارغة.
    """
    slug = asset_dict.get("slug", "")

    # البحث عن coingecko_id من Registry
    meta = ASSET_REGISTRY.get(slug)
    if not meta or not meta.coingecko_id:
        return asset_dict

    cg_id = meta.coingecko_id
    coin = cg_data.get(cg_id)
    if not coin:
        return asset_dict

    # ── ملء الحقول الفارغة ──

    # السعر — يفضّل SR على CG
    if asset_dict.get("price_usd") is None and coin.get("price_usd") is not None:
        asset_dict["price_usd"] = coin["price_usd"]

    # Logo — يفضّل SR
    if not asset_dict.get("logo_url") and coin.get("logo_url"):
        asset_dict["logo_url"] = coin["logo_url"]

    # ── timeframe_metrics enrichment ──
    if "timeframe_metrics" not in asset_dict:
        asset_dict["timeframe_metrics"] = {}

    for tf in ["24h", "7d", "30d", "90d", "1y"]:
        if tf not in asset_dict["timeframe_metrics"]:
            asset_dict["timeframe_metrics"][tf] = {}
        metrics = asset_dict["timeframe_metrics"][tf]

        # Market Cap
        if metrics.get("marketcap") is None and coin.get("market_cap") is not None:
            metrics["marketcap"] = coin["market_cap"]

        # Daily Volume
        if metrics.get("daily_trading_volume") is None and coin.get("total_volume") is not None:
            metrics["daily_trading_volume"] = coin["total_volume"]

        # Price
        if metrics.get("price") is None and coin.get("price_usd") is not None:
            metrics["price"] = coin["price_usd"]

        # Staking Market Cap = price * staked_tokens
        if metrics.get("staking_marketcap") is None:
            price = coin.get("price_usd") or asset_dict.get("price_usd")
            staked = metrics.get("staked_tokens") or asset_dict.get("staked_tokens")
            if price is not None and staked is not None:
                metrics["staking_marketcap"] = price * staked

    # ── حساب staking_ratio إذا متوفر ──
    staked = asset_dict.get("staked_tokens")
    circ = coin.get("circulating_supply")
    if asset_dict.get("staking_ratio") is None and staked and circ and circ > 0:
        asset_dict["staking_ratio"] = round((staked / circ) * 100, 2)

    # ── حفظ بيانات CG الإضافية ──
    if "coingecko_data" not in asset_dict:
        asset_dict["coingecko_data"] = {}

    asset_dict["coingecko_data"] = {
        "market_cap": coin.get("market_cap"),
        "market_cap_rank": coin.get("market_cap_rank"),
        "total_volume": coin.get("total_volume"),
        "circulating_supply": coin.get("circulating_supply"),
        "total_supply": coin.get("total_supply"),
        "price_change_24h": coin.get("price_change_24h"),
        "price_change_7d": coin.get("price_change_7d"),
        "price_change_30d": coin.get("price_change_30d"),
        "ath": coin.get("ath"),
        "atl": coin.get("atl"),
    }

    # تغيرات السعر — level أعلى
    if asset_dict.get("price_change_24h") is None:
        asset_dict["price_change_24h"] = coin.get("price_change_24h")

    return asset_dict


async def run_coingecko_enrichment(
    assets: List[dict],
    api_key: Optional[str] = None,
) -> List[dict]:
    """
    إثراء قائمة أصول StakingRewards ببيانات CoinGecko.

    Args:
        assets: list of asset dicts (from crawler JSON)
        api_key: optional CoinGecko API key

    Returns:
        enriched asset list
    """
    start = time.time()
    logger.info(f"🪙 بدء إثراء CoinGecko لـ {len(assets)} أصل...")

    cg_data = await fetch_all_coingecko_data(api_key)

    enriched = 0
    for asset in assets:
        before_keys = set(k for k, v in asset.items() if v is not None)
        merge_coingecko_into_asset(asset, cg_data)
        after_keys = set(k for k, v in asset.items() if v is not None)
        if after_keys - before_keys:
            enriched += 1

    elapsed = time.time() - start
    logger.info(f"🪙 CoinGecko enrichment done: {enriched}/{len(assets)} assets enriched ({elapsed:.1f}s)")
    return assets
