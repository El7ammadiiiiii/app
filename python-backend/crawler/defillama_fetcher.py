"""
🦙 جالب بيانات DeFiLlama التاريخية
===================================
يجلب بيانات تاريخية لسلسلة blockhain عبر DeFiLlama API:
  - TVL (Total Value Locked)
  - DEX Volume (chain-level aggregate)
  - Fees (chain-level aggregate)
  - Revenue (chain-level aggregate)
  - Stablecoin Supply

يستخدم chain-level endpoints (/overview/fees/{chain})
بدلاً من protocol-level (/summary/fees/{slug}).
"""

import aiohttp
import asyncio
from typing import Optional, List, Dict, Any
from datetime import datetime
from loguru import logger

from .models import ChartTimeSeries, ChartDataPoint
from .utils import get_random_user_agent

# الثوابت
API_BASE = "https://api.llama.fi"
TIMEOUT = 30
MAX_POINTS = 365  # الحد الأقصى للنقاط المخزنة (سنة واحدة)

# تحويل أسماء السلاسل من slug الداخلي إلى اسم DeFiLlama
# معظم الأسماء تعمل كما هي، لكن بعضها يحتاج تكبير الحرف الأول
CHAIN_NAME_MAP: Dict[str, str] = {
    "ethereum": "Ethereum",
    "bsc": "BSC",
    "polygon": "Polygon",
    "arbitrum": "Arbitrum",
    "optimism": "Optimism",
    "avalanche": "Avalanche",
    "fantom": "Fantom",
    "base": "Base",
    "linea": "Linea",
    "mantle": "Mantle",
    "scroll": "Scroll",
    "blast": "Blast",
    "zksync era": "zkSync Era",
    "zksync": "zkSync Era",
    "cronos": "Cronos",
    "gnosis": "Gnosis",
    "celo": "Celo",
    "moonbeam": "Moonbeam",
    "moonriver": "Moonriver",
    "boba": "Boba",
    "aurora": "Aurora",
    "metis": "Metis",
    "taiko": "Taiko",
    "fraxtal": "Fraxtal",
    "mode": "Mode",
    "manta": "Manta",
    "zora": "Zora",
    "opbnb": "opBNB",
    "kava": "Kava",
    "sei": "Sei",
    "wemix": "WEMIX",
    "klaytn": "Klaytn",
    "berachain": "Berachain",
    "worldcoin": "World Chain",
    "core_dao": "CORE",
}


def _get_chain_name(slug: str) -> str:
    """تحويل slug إلى اسم السلسلة المتوافق مع DeFiLlama"""
    lower = slug.lower().strip()
    if lower in CHAIN_NAME_MAP:
        return CHAIN_NAME_MAP[lower]
    # fallback: capitalize first letter
    return slug.capitalize()


def _downsample(points: List[ChartDataPoint], max_points: int = MAX_POINTS) -> List[ChartDataPoint]:
    """الاحتفاظ بأحدث max_points نقطة فقط لتقليل حجم JSON"""
    if len(points) <= max_points:
        return points
    return points[-max_points:]


def _parse_chart_array(chart_data: list, value_key: str = None) -> List[ChartDataPoint]:
    """
    تحويل مصفوفة DeFiLlama إلى قائمة ChartDataPoint.
    يدعم الأنساق:
      - [[timestamp, value], ...]
      - [{date: ts, tvl: val}, ...]
      - [{date: ts, totalCirculatingUSD: {peggedUSD: val}}, ...]
    """
    points = []
    for item in chart_data:
        ts = 0
        val = 0.0

        if isinstance(item, list) and len(item) >= 2:
            ts = int(item[0])
            val = float(item[1])
        elif isinstance(item, dict):
            ts = int(item.get("date", item.get("timestamp", 0)))
            if value_key and value_key in item:
                raw = item[value_key]
                if isinstance(raw, dict):
                    # Stablecoins: {peggedUSD: val, peggedEUR: val, ...}
                    val = sum(float(v) for v in raw.values() if isinstance(v, (int, float)))
                else:
                    val = float(raw)
            elif "tvl" in item:
                val = float(item["tvl"])
            elif "total24h" in item:
                val = float(item["total24h"])
            else:
                # try first numeric value
                for v in item.values():
                    if isinstance(v, (int, float)) and v != ts:
                        val = float(v)
                        break

        if ts > 0 and val >= 0:
            dt = datetime.fromtimestamp(ts)
            points.append(ChartDataPoint(
                date=dt.strftime("%Y-%m-%d"),
                value=round(val, 2),
                timestamp=ts * 1000,
            ))

    points.sort(key=lambda x: x.timestamp)
    return points


async def fetch_defillama_history(
    slug: str,
    session: Optional[aiohttp.ClientSession] = None,
) -> Dict[str, ChartTimeSeries]:
    """
    جلب كل البيانات التاريخية المتاحة لسلسلة معينة.
    يجمع 5 مقاييس: TVL, Fees, Volume, Revenue, Stablecoins.
    """
    results: Dict[str, ChartTimeSeries] = {}
    local_session = False
    chain_name = _get_chain_name(slug)

    if session is None:
        session = aiohttp.ClientSession(headers={"User-Agent": get_random_user_agent()})
        local_session = True

    try:
        # جلب جميع المقاييس بالتوازي
        tasks = {
            "tvl": _fetch_tvl(session, slug),
            "fees": _fetch_chain_fees(session, chain_name),
            "volume": _fetch_chain_dex_volume(session, chain_name),
            "revenue": _fetch_chain_revenue(session, chain_name),
            "stablecoins": _fetch_stablecoin_supply(session, chain_name),
        }

        gathered = await asyncio.gather(*tasks.values(), return_exceptions=True)

        for key, result in zip(tasks.keys(), gathered):
            if isinstance(result, Exception):
                logger.warning(f"DeFiLlama {key} failed for {slug}: {result}")
            elif result is not None:
                results[key] = result

        logger.info(
            f"🦙 DeFiLlama {slug}: "
            f"{len(results)}/5 metrics fetched "
            f"({', '.join(results.keys())})"
        )

    except Exception as e:
        logger.error(f"Error fetching DeFiLlama history for {slug}: {e}")
    finally:
        if local_session:
            await session.close()

    return results


# ════════════════════════════════════════════════════════════════
# 1. TVL — Historical Chain TVL (uses slug, works already)
# ════════════════════════════════════════════════════════════════

async def _fetch_tvl(session: aiohttp.ClientSession, slug: str) -> Optional[ChartTimeSeries]:
    """جلب TVL التاريخي — GET /v2/historicalChainTvl/{slug}"""
    url = f"{API_BASE}/v2/historicalChainTvl/{slug}"
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=TIMEOUT)) as resp:
            if resp.status != 200:
                return None
            data = await resp.json()
            if not isinstance(data, list):
                return None

            points = _parse_chart_array(data, value_key="tvl")
            points = _downsample(points)

            if not points:
                return None

            return ChartTimeSeries(
                metric_key="tvl",
                metric_name="Total Value Locked (TVL)",
                data=points,
                unit="USD",
                description="Source: DeFiLlama",
            )

    except Exception as e:
        logger.warning(f"Failed to fetch TVL for {slug}: {e}")
        return None


# ════════════════════════════════════════════════════════════════
# 2. Fees — Chain-level aggregate (NOT protocol-level)
# ════════════════════════════════════════════════════════════════

async def _fetch_chain_fees(session: aiohttp.ClientSession, chain_name: str) -> Optional[ChartTimeSeries]:
    """جلب رسوم السلسلة — GET /overview/fees/{chain}"""
    url = f"{API_BASE}/overview/fees/{chain_name}"
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=TIMEOUT)) as resp:
            if resp.status != 200:
                return None
            data = await resp.json()

            chart_data = data.get("totalDataChart")
            if not chart_data:
                return None

            points = _parse_chart_array(chart_data)
            points = _downsample(points)

            if not points:
                return None

            return ChartTimeSeries(
                metric_key="fees",
                metric_name="Daily Fees",
                data=points,
                unit="USD",
                description="Source: DeFiLlama (chain aggregate)",
            )

    except Exception as e:
        logger.warning(f"Failed to fetch chain fees for {chain_name}: {e}")
        return None


# ════════════════════════════════════════════════════════════════
# 3. DEX Volume — Chain-level aggregate
# ════════════════════════════════════════════════════════════════

async def _fetch_chain_dex_volume(session: aiohttp.ClientSession, chain_name: str) -> Optional[ChartTimeSeries]:
    """جلب حجم DEX للسلسلة — GET /overview/dexs/{chain}"""
    url = f"{API_BASE}/overview/dexs/{chain_name}"
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=TIMEOUT)) as resp:
            if resp.status != 200:
                return None
            data = await resp.json()

            chart_data = data.get("totalDataChart")
            if not chart_data:
                return None

            points = _parse_chart_array(chart_data)
            points = _downsample(points)

            if not points:
                return None

            return ChartTimeSeries(
                metric_key="volume",
                metric_name="DEX Volume (24h)",
                data=points,
                unit="USD",
                description="Source: DeFiLlama (chain aggregate)",
            )

    except Exception as e:
        logger.warning(f"Failed to fetch DEX volume for {chain_name}: {e}")
        return None


# ════════════════════════════════════════════════════════════════
# 4. Revenue — Chain-level aggregate (dailyRevenue)
# ════════════════════════════════════════════════════════════════

async def _fetch_chain_revenue(session: aiohttp.ClientSession, chain_name: str) -> Optional[ChartTimeSeries]:
    """جلب إيرادات السلسلة — GET /overview/fees/{chain}?dataType=dailyRevenue"""
    url = f"{API_BASE}/overview/fees/{chain_name}?dataType=dailyRevenue"
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=TIMEOUT)) as resp:
            if resp.status != 200:
                return None
            data = await resp.json()

            chart_data = data.get("totalDataChart")
            if not chart_data:
                return None

            points = _parse_chart_array(chart_data)
            points = _downsample(points)

            if not points:
                return None

            return ChartTimeSeries(
                metric_key="revenue",
                metric_name="Daily Revenue",
                data=points,
                unit="USD",
                description="Source: DeFiLlama (chain aggregate)",
            )

    except Exception as e:
        logger.warning(f"Failed to fetch revenue for {chain_name}: {e}")
        return None


# ════════════════════════════════════════════════════════════════
# 5. Stablecoin Supply — Historical stablecoin circulation
# ════════════════════════════════════════════════════════════════

async def _fetch_stablecoin_supply(session: aiohttp.ClientSession, chain_name: str) -> Optional[ChartTimeSeries]:
    """جلب حجم العملات المستقرة — GET /stablecoins/stablecoincharts/{chain}"""
    url = f"https://stablecoins.llama.fi/stablecoincharts/{chain_name}"
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=TIMEOUT)) as resp:
            if resp.status != 200:
                return None
            data = await resp.json()
            if not isinstance(data, list):
                return None

            points = _parse_chart_array(data, value_key="totalCirculatingUSD")
            points = _downsample(points)

            if not points:
                return None

            return ChartTimeSeries(
                metric_key="stablecoins",
                metric_name="Stablecoin Supply",
                data=points,
                unit="USD",
                description="Source: DeFiLlama",
            )

    except Exception as e:
        logger.warning(f"Failed to fetch stablecoin supply for {chain_name}: {e}")
        return None
