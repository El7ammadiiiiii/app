"""
🦙 محللات بيانات DeFiLlama — Parsers
══════════════════════════════════════════
كل دالة تحلل استجابة API محددة وتحولها إلى نماذج بيانات.

النقاط المدعومة (8):
─────────────────────
1. /v2/chains          — TVL لكل السلاسل
2. /protocols          — كل البروتوكولات + TVL
3. /overview/dexs      — أحجام DEX اليومية
4. /overview/fees      — الرسوم والإيرادات
5. yields.llama.fi/pools — مسابح العوائد + APY + Staking
6. stablecoins.llama.fi/stablecoins — العملات المستقرة
7. bridges.llama.fi/bridges — الجسور
8. /overview/open-interest — Perps OI
"""

from typing import Dict, List, Optional, Any
from loguru import logger

from ..models_defillama import (
    ChainTVL,
    DefiProtocol,
    DexVolume,
    FeesRevenue,
    YieldPool,
    Stablecoin,
    Bridge,
)


def _safe_float(val, default=None):
    if val is None:
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def _safe_int(val, default=0):
    if val is None:
        return default
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return default


# ═══════════════════════════════════════════════════════════
# 1. /v2/chains — TVL لكل السلاسل
# ═══════════════════════════════════════════════════════════

def parse_chains_tvl(data: list) -> dict:
    """تحليل قائمة السلاسل — TVL لكل سلسلة."""
    if not isinstance(data, list):
        return {}

    chains = []
    total_tvl = 0.0

    for item in data:
        tvl = _safe_float(item.get("tvl"), 0)
        chain = ChainTVL(
            name=item.get("name", ""),
            gecko_id=item.get("gecko_id", ""),
            token_symbol=item.get("tokenSymbol", ""),
            chain_id=_safe_int(item.get("chainId")) or None,
            tvl=tvl,
        )
        chains.append(chain)
        total_tvl += tvl

    # ترتيب بالـ TVL
    chains.sort(key=lambda c: c.tvl or 0, reverse=True)

    return {
        "chains_tvl": chains,
        "total_defi_tvl": total_tvl,
    }


# ═══════════════════════════════════════════════════════════
# 2. /protocols — كل البروتوكولات
# ═══════════════════════════════════════════════════════════

def parse_protocols(data: list) -> dict:
    """تحليل قائمة البروتوكولات — أكبر 100 بـ TVL."""
    if not isinstance(data, list):
        return {}

    # ترتيب بالـ TVL
    sorted_protos = sorted(data, key=lambda p: p.get("tvl") or 0, reverse=True)

    top_protocols = []
    for item in sorted_protos[:100]:
        proto = DefiProtocol(
            name=item.get("name", ""),
            symbol=item.get("symbol", ""),
            category=item.get("category", ""),
            chains=item.get("chains", []),
            tvl=_safe_float(item.get("tvl")),
            change_1d=_safe_float(item.get("change_1d")),
            change_7d=_safe_float(item.get("change_7d")),
            chain_tvls={k: v for k, v in (item.get("chainTvls") or {}).items()
                        if isinstance(v, (int, float))},
            url=item.get("url", ""),
        )
        top_protocols.append(proto)

    return {
        "top_protocols": top_protocols,
        "protocols_count": len(data),
    }


# ═══════════════════════════════════════════════════════════
# 3. /overview/dexs — أحجام DEX
# ═══════════════════════════════════════════════════════════

def parse_dex_volumes(data: dict) -> dict:
    """تحليل أحجام DEX الإجمالية + أكبر 50 DEX."""
    if not isinstance(data, dict):
        return {}

    top_dexes = []
    protocols = data.get("protocols", [])

    # ترتيب بأحجام 24 ساعة
    sorted_protos = sorted(
        protocols,
        key=lambda p: p.get("total24h") or 0,
        reverse=True,
    )

    for item in sorted_protos[:50]:
        dex = DexVolume(
            name=item.get("name", ""),
            chains=item.get("chains", []),
            total_24h=_safe_float(item.get("total24h")),
            total_7d=_safe_float(item.get("total7d")),
            total_30d=_safe_float(item.get("total30d")),
            change_1d=_safe_float(item.get("change_1d")),
        )
        top_dexes.append(dex)

    return {
        "dex_total_24h": _safe_float(data.get("total24h")),
        "dex_total_7d": _safe_float(data.get("total7d")),
        "dex_total_30d": _safe_float(data.get("total30d")),
        "dex_change_1d": _safe_float(data.get("change_1d")),
        "top_dexes": top_dexes,
        "dex_chains_count": len(data.get("allChains", [])),
    }


# ═══════════════════════════════════════════════════════════
# 4. /overview/fees — الرسوم والإيرادات
# ═══════════════════════════════════════════════════════════

def parse_fees(data: dict) -> dict:
    """تحليل الرسوم والإيرادات — أكبر 50 بروتوكول."""
    if not isinstance(data, dict):
        return {}

    top_fees = []
    protocols = data.get("protocols", [])

    sorted_protos = sorted(
        protocols,
        key=lambda p: p.get("total24h") or 0,
        reverse=True,
    )

    for item in sorted_protos[:50]:
        fee = FeesRevenue(
            name=item.get("name", ""),
            chains=item.get("chains", []),
            total_24h=_safe_float(item.get("total24h")),
            total_30d=_safe_float(item.get("total30d")),
            revenue_24h=_safe_float(item.get("revenue24h")),
        )
        top_fees.append(fee)

    return {
        "fees_total_24h": _safe_float(data.get("total24h")),
        "fees_total_30d": _safe_float(data.get("total30d")),
        "top_fees": top_fees,
    }


# ═══════════════════════════════════════════════════════════
# 5. yields.llama.fi/pools — العوائد + APY + Staking
# ═══════════════════════════════════════════════════════════

def parse_yield_pools(data: dict) -> dict:
    """
    تحليل مسابح العوائد — أكبر 100 بـ TVL.
    يشمل: Staking APY, Liquid Staking, Lending, LP
    """
    if not isinstance(data, dict):
        return {}

    pools_raw = data.get("data", [])
    if not isinstance(pools_raw, list):
        return {}

    # ترتيب بالـ TVL
    sorted_pools = sorted(
        pools_raw,
        key=lambda p: p.get("tvlUsd") or 0,
        reverse=True,
    )

    top_pools = []
    for item in sorted_pools[:100]:
        pool = YieldPool(
            pool_id=item.get("pool", ""),
            chain=item.get("chain", ""),
            project=item.get("project", ""),
            symbol=item.get("symbol", ""),
            tvl_usd=_safe_float(item.get("tvlUsd")),
            apy=_safe_float(item.get("apy")),
            apy_base=_safe_float(item.get("apyBase")),
            apy_reward=_safe_float(item.get("apyReward")),
            stablecoin=bool(item.get("stablecoin")),
            il_risk=item.get("ilRisk", ""),
            exposure=item.get("exposure", ""),
        )
        top_pools.append(pool)

    return {
        "total_yield_pools": len(pools_raw),
        "top_yield_pools": top_pools,
    }


# ═══════════════════════════════════════════════════════════
# 6. stablecoins.llama.fi/stablecoins — العملات المستقرة
# ═══════════════════════════════════════════════════════════

def parse_stablecoins(data: dict) -> dict:
    """تحليل العملات المستقرة — أكبر 30."""
    if not isinstance(data, dict):
        return {}

    assets = data.get("peggedAssets", [])
    if not isinstance(assets, list):
        return {}

    total_mcap = 0.0
    top_stablecoins = []

    # ترتيب بالعرض المتداول
    sorted_assets = sorted(
        assets,
        key=lambda a: _extract_circulating(a),
        reverse=True,
    )

    for item in sorted_assets[:30]:
        circ = _extract_circulating(item)
        circ_prev_day = _extract_circulating_prev(item, "circulatingPrevDay")
        circ_prev_week = _extract_circulating_prev(item, "circulatingPrevWeek")

        # chain_circulating تفصيل
        chain_circ = {}
        for chain_key, chain_data in (item.get("chainCirculating") or {}).items():
            if isinstance(chain_data, dict):
                for sub_key, sub_val in chain_data.items():
                    if isinstance(sub_val, dict):
                        val = sum(v for v in sub_val.values() if isinstance(v, (int, float)))
                    elif isinstance(sub_val, (int, float)):
                        val = sub_val
                    else:
                        continue
                    if val > 0:
                        chain_circ[chain_key] = val
                        break

        sc = Stablecoin(
            name=item.get("name", ""),
            symbol=item.get("symbol", ""),
            peg_type=item.get("pegType", ""),
            peg_mechanism=item.get("pegMechanism", ""),
            circulating=circ,
            circulating_prev_day=circ_prev_day,
            circulating_prev_week=circ_prev_week,
            chain_circulating=chain_circ,
            price=_safe_float(item.get("price")),
        )
        top_stablecoins.append(sc)
        total_mcap += circ

    return {
        "total_stablecoin_mcap": total_mcap,
        "stablecoins_count": len(assets),
        "top_stablecoins": top_stablecoins,
    }


def _extract_circulating(item: dict) -> float:
    """استخراج العرض المتداول الإجمالي"""
    circ = item.get("circulating", {})
    if isinstance(circ, dict):
        return sum(v for v in circ.values() if isinstance(v, (int, float)))
    return _safe_float(circ, 0)


def _extract_circulating_prev(item: dict, key: str) -> float:
    val = item.get(key, {})
    if isinstance(val, dict):
        return sum(v for v in val.values() if isinstance(v, (int, float)))
    return _safe_float(val, 0)


# ═══════════════════════════════════════════════════════════
# 7. bridges.llama.fi/bridges — الجسور
# ═══════════════════════════════════════════════════════════

def parse_bridges(data: dict) -> dict:
    """تحليل الجسور — أكبر 30."""
    if not isinstance(data, dict):
        return {}

    bridges_raw = data.get("bridges", [])
    if not isinstance(bridges_raw, list):
        return {}

    # ترتيب بالحجم الأسبوعي
    sorted_bridges = sorted(
        bridges_raw,
        key=lambda b: _safe_float(b.get("weeklyVolume"), 0),
        reverse=True,
    )

    top_bridges = []
    for item in sorted_bridges[:30]:
        bridge = Bridge(
            name=item.get("name", ""),
            display_name=item.get("displayName", ""),
            volume_24h=_safe_float(item.get("last24hVolume")),
            volume_7d=_safe_float(item.get("weeklyVolume")),
            volume_30d=_safe_float(item.get("monthlyVolume")),
            chains=item.get("chains", []),
            url=item.get("url", ""),
        )
        top_bridges.append(bridge)

    return {
        "bridges_count": len(bridges_raw),
        "top_bridges": top_bridges,
    }


# ═══════════════════════════════════════════════════════════
# 8. /overview/open-interest — Perps
# ═══════════════════════════════════════════════════════════

def parse_open_interest(data: dict) -> dict:
    """تحليل الفائدة المفتوحة لـ Perps."""
    if not isinstance(data, dict):
        return {}

    return {
        "perps_oi_total": _safe_float(data.get("total24h")),
        "perps_protocols_count": len(data.get("protocols", [])),
    }


# ═══════════════════════════════════════════════════════════
# خريطة المحللات
# ═══════════════════════════════════════════════════════════

PARSER_MAP = {
    "chains_tvl": parse_chains_tvl,
    "protocols": parse_protocols,
    "dex_volumes": parse_dex_volumes,
    "fees": parse_fees,
    "yield_pools": parse_yield_pools,
    "stablecoins": parse_stablecoins,
    "bridges": parse_bridges,
    "open_interest": parse_open_interest,
}


def get_parser(endpoint: str):
    return PARSER_MAP.get(endpoint)
