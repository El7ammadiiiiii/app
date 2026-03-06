"""
🔌 RPC Data Enricher — Public EVM RPC Endpoints
================================================
يستخدم نقاط RPC العامة المجانية لملء البيانات الناقصة:
- رقم آخر بلوك
- سعر الغاز (Low/Avg/High)
- بلوكات حديثة (عدد المعاملات، الغاز)
- حساب وقت البلوك
- المعاملات المعلقة

هذا المُثري يعمل كـ fallback عندما يفشل زحف HTML
بسبب حماية Cloudflare أو أي حظر آخر.
"""

import asyncio
from datetime import datetime
from typing import Optional, Dict, Any, List

import aiohttp
from loguru import logger

from .models import BlockInfo, GasEstimate

# ═══════════════════════════════════════════════════════
# نقاط RPC العامة المجانية (لا تحتاج مفتاح API)
# ═══════════════════════════════════════════════════════

CHAIN_RPC_URLS: Dict[str, str] = {
    "ethereum": "https://ethereum-rpc.publicnode.com",
    "polygon": "https://polygon-rpc.com",
    "bsc": "https://bsc-dataseed.binance.org",
    "arbitrum": "https://arb1.arbitrum.io/rpc",
    "optimism": "https://mainnet.optimism.io",
    "base": "https://base-mainnet.public.blastapi.io",
    "avalanche": "https://api.avax.network/ext/bc/C/rpc",
    "fantom": "https://fantom-rpc.publicnode.com",
    "celo": "https://forno.celo.org",
    "gnosis": "https://rpc.gnosischain.com",
    "moonbeam": "https://rpc.api.moonbeam.network",
    "moonriver": "https://rpc.api.moonriver.moonbeam.network",
    "linea": "https://rpc.linea.build",
    "scroll": "https://rpc.scroll.io",
    "zksync": "https://mainnet.era.zksync.io",
    "mantle": "https://rpc.mantle.xyz",
    "blast": "https://rpc.blast.io",
    "berachain": "https://rpc.berachain.com",
    "worldcoin": "https://worldchain-mainnet.g.alchemy.com/public",
    "core_dao": "https://rpc.coredao.org",
    "polygon_zkevm": "https://zkevm-rpc.com",
    "cronos": "https://evm.cronos.org",
    "taiko": "https://rpc.mainnet.taiko.xyz",
    "fraxtal": "https://rpc.frax.com",
}

# Fallback RPC URLs (if primary fails)
CHAIN_RPC_FALLBACKS: Dict[str, List[str]] = {
    "ethereum": ["https://1rpc.io/eth", "https://eth.drpc.org"],
    "polygon": ["https://rpc.ankr.com/polygon", "https://polygon.llamarpc.com"],
    "bsc": ["https://bsc-dataseed1.binance.org", "https://rpc.ankr.com/bsc"],
    "arbitrum": ["https://arbitrum.llamarpc.com", "https://rpc.ankr.com/arbitrum"],
    "optimism": ["https://optimism.llamarpc.com", "https://rpc.ankr.com/optimism"],
    "base": ["https://base.llamarpc.com", "https://rpc.ankr.com/base"],
    "avalanche": ["https://avalanche.public-rpc.com", "https://rpc.ankr.com/avalanche"],
    "fantom": ["https://rpc.ankr.com/fantom", "https://fantom.publicnode.com"],
    "linea": ["https://rpc.ankr.com/linea"],
    "scroll": ["https://rpc.ankr.com/scroll"],
    "gnosis": ["https://rpc.ankr.com/gnosis"],
    "celo": ["https://rpc.ankr.com/celo"],
    "blast": ["https://rpc.ankr.com/blast"],
    "polygon_zkevm": ["https://rpc.ankr.com/polygon_zkevm"],
    "cronos": ["https://cronos-evm-rpc.publicnode.com"],
}

# حجم البلوكتشين (تقريبي — يُحدث يدوياً كل فترة)
CHAIN_SIZE_GB: Dict[str, float] = {
    "ethereum": 1200.0,
    "bsc": 850.0,
    "polygon": 600.0,
    "arbitrum": 350.0,
    "optimism": 250.0,
    "base": 180.0,
    "avalanche": 300.0,
    "fantom": 150.0,
    "gnosis": 200.0,
    "linea": 80.0,
    "scroll": 60.0,
    "zksync": 100.0,
    "mantle": 70.0,
    "blast": 50.0,
    "celo": 120.0,
    "moonbeam": 90.0,
    "moonriver": 40.0,
    "berachain": 30.0,
    "worldcoin": 20.0,
    "core_dao": 150.0,
    "polygon_zkevm": 60.0,
    "cronos": 100.0,
    "taiko": 40.0,
    "fraxtal": 25.0,
}

# ═══════════════════════════════════════════════════════
# RPC JSON-RPC Helper
# ═══════════════════════════════════════════════════════

async def _rpc_call(
    session: aiohttp.ClientSession,
    rpc_url: str,
    method: str,
    params: list = None,
    call_id: int = 1,
) -> Any:
    """إجراء استدعاء JSON-RPC واحد."""
    payload = {
        "jsonrpc": "2.0",
        "id": call_id,
        "method": method,
        "params": params or [],
    }
    try:
        async with session.post(
            rpc_url,
            json=payload,
            timeout=aiohttp.ClientTimeout(total=15),
        ) as resp:
            if resp.status == 200:
                data = await resp.json(content_type=None)
                if "result" in data:
                    return data["result"]
                if "error" in data:
                    logger.debug(f"⚠️ RPC error ({method}): {data['error']}")
            else:
                logger.debug(f"⚠️ RPC HTTP {resp.status} for {method}")
            return None
    except asyncio.TimeoutError:
        logger.debug(f"⏰ RPC timeout: {method} on {rpc_url}")
        return None
    except Exception as e:
        logger.debug(f"❌ RPC call failed ({method}): {type(e).__name__}: {e}")
        return None


async def _rpc_batch(
    session: aiohttp.ClientSession,
    rpc_url: str,
    calls: List[Dict[str, Any]],
) -> List[Any]:
    """إجراء دفعة من استدعاءات JSON-RPC."""
    payload = [
        {
            "jsonrpc": "2.0",
            "id": i + 1,
            "method": c["method"],
            "params": c.get("params", []),
        }
        for i, c in enumerate(calls)
    ]
    try:
        async with session.post(
            rpc_url,
            json=payload,
            timeout=aiohttp.ClientTimeout(total=20),
        ) as resp:
            if resp.status == 200:
                data = await resp.json(content_type=None)
                if isinstance(data, list):
                    # ترتيب حسب id
                    data.sort(key=lambda x: x.get("id", 0))
                    return [d.get("result") for d in data]
            return [None] * len(calls)
    except Exception as e:
        logger.debug(f"❌ RPC batch failed: {type(e).__name__}: {e}")
        return [None] * len(calls)


# ═══════════════════════════════════════════════════════
# الدالة الرئيسية للإثراء
# ═══════════════════════════════════════════════════════

async def enrich_from_rpc(chain_key: str, snapshot) -> None:
    """
    إثراء ChainSnapshot ببيانات من RPC العامة.
    يملأ فقط الحقول الناقصة (None).
    يحاول الـ URL الأساسي أولاً، ثم البدائل.
    
    Args:
        chain_key: مفتاح السلسلة (مثل "ethereum", "base")
        snapshot: كائن ChainSnapshot المراد إثراؤه
    """
    rpc_url = CHAIN_RPC_URLS.get(chain_key)
    if not rpc_url:
        logger.debug(f"⏭️ لا يوجد RPC URL لـ {chain_key}")
        return

    logger.info(f"  🔌 إثراء RPC لـ {chain_key}...")

    # قائمة URLs للمحاولة (أساسي + بدائل)
    urls_to_try = [rpc_url] + CHAIN_RPC_FALLBACKS.get(chain_key, [])

    try:
        timeout = aiohttp.ClientTimeout(total=20, connect=10)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            # محاولة كل URL حتى ينجح أحدها
            success = False
            for url in urls_to_try:
                block_num = await _fetch_basics(session, url, chain_key, snapshot)
                if block_num is not None:
                    success = True
                    # ── جلب بلوكات حديثة ──
                    await _fetch_recent_blocks(session, url, chain_key, snapshot, block_num)
                    break
                else:
                    logger.debug(f"  ⚠️ RPC فشل: {url}, محاولة التالي...")

            if not success:
                logger.warning(f"  ⚠️ فشل جميع RPC URLs لـ {chain_key}")

            # ── حجم البلوكتشين (تقريبي) ──
            if snapshot.network.blockchain_size_gb is None:
                size = CHAIN_SIZE_GB.get(chain_key)
                if size:
                    snapshot.network.blockchain_size_gb = size

            # ── تقديرات الغاز ──
            if not snapshot.gas_estimates and snapshot.transactions.gas_price_avg is not None:
                _generate_gas_estimates(snapshot, chain_key)

        logger.info(f"  ✅ اكتمل إثراء RPC لـ {chain_key}")

    except Exception as e:
        logger.error(f"  ❌ فشل إثراء RPC لـ {chain_key}: {e}")


async def _fetch_basics(
    session: aiohttp.ClientSession,
    rpc_url: str,
    chain_key: str,
    snapshot,
) -> Optional[int]:
    """جلب رقم البلوك وسعر الغاز. يستخدم استدعاءات فردية لتوافق أفضل."""

    block_num = None

    # رقم البلوك
    block_hex = await _rpc_call(session, rpc_url, "eth_blockNumber")
    if block_hex:
        try:
            block_num = int(block_hex, 16)
            if snapshot.network.total_blocks is None:
                snapshot.network.total_blocks = block_num
            logger.debug(f"  📦 آخر بلوك: {block_num:,}")
        except (ValueError, TypeError):
            pass

    # سعر الغاز
    gas_hex = await _rpc_call(session, rpc_url, "eth_gasPrice")
    if gas_hex:
        try:
            gas_wei = int(gas_hex, 16)
            gas_gwei = gas_wei / 1e9
            gas_gwei = round(gas_gwei, 6)

            if snapshot.transactions.gas_price_avg is None:
                snapshot.transactions.gas_price_avg = gas_gwei
            if snapshot.transactions.gas_price_low is None:
                snapshot.transactions.gas_price_low = round(gas_gwei * 0.8, 6)
            if snapshot.transactions.gas_price_high is None:
                snapshot.transactions.gas_price_high = round(gas_gwei * 1.5, 6)

            logger.debug(f"  ⛽ غاز: {gas_gwei:.6f} Gwei")
        except (ValueError, TypeError):
            pass

    return block_num


async def _fetch_recent_blocks(
    session: aiohttp.ClientSession,
    rpc_url: str,
    chain_key: str,
    snapshot,
    latest_block: int,
) -> None:
    """جلب آخر 10 بلوكات لحساب وقت البلوك وملء recent_blocks."""

    num_blocks = 25
    
    # جلب البلوكات بالتوازي (individual calls — أكثر توافقاً)
    tasks = []
    for i in range(num_blocks):
        bn = hex(latest_block - i)
        tasks.append(
            _rpc_call(session, rpc_url, "eth_getBlockByNumber", [bn, False])
        )

    results = await asyncio.gather(*tasks, return_exceptions=True)

    blocks_data = []
    for bd in results:
        if isinstance(bd, dict) and "number" in bd:
            blocks_data.append(bd)

    if not blocks_data:
        logger.debug(f"  ⚠️ لم يتم جلب أي بلوكات من RPC")
        return

    # ── حساب وقت البلوك ──
    if len(blocks_data) >= 2:
        timestamps = []
        for b in blocks_data:
            try:
                ts = int(b["timestamp"], 16)
                timestamps.append(ts)
            except (ValueError, TypeError, KeyError):
                pass

        if len(timestamps) >= 2:
            timestamps.sort(reverse=True)
            diffs = [timestamps[i] - timestamps[i + 1] for i in range(len(timestamps) - 1)]
            diffs = [d for d in diffs if 0 < d < 600]  # تجاهل قيم غير منطقية
            if diffs:
                avg_block_time = sum(diffs) / len(diffs)
                snapshot.network.avg_block_time_seconds = round(avg_block_time, 2)
                logger.debug(f"  ⏱️ وقت البلوك: {avg_block_time:.2f}ث")

    # ── ملء recent_blocks (دائماً — بيانات RPC أدق من HTML) ──
    rpc_blocks = []
    if True:
        for b in blocks_data:
            try:
                bi = BlockInfo()
                bi.number = int(b["number"], 16)

                # عدد المعاملات
                txns = b.get("transactions", [])
                bi.txn_count = len(txns) if isinstance(txns, list) else 0

                # الغاز
                gas_used = int(b.get("gasUsed", "0x0"), 16)
                gas_limit = int(b.get("gasLimit", "0x0"), 16)
                bi.gas_used = gas_used
                bi.gas_limit = gas_limit
                if gas_limit > 0:
                    bi.gas_used_pct = round(gas_used / gas_limit * 100, 2)

                # الوقت
                ts = int(b["timestamp"], 16)
                bi.timestamp = datetime.fromtimestamp(ts).strftime("%Y-%m-%d %H:%M:%S")

                # Builder / validator
                miner = b.get("miner", "")
                if miner:
                    bi.builder = miner[:10] + "..."

                # دمج المكافأة من بيانات Etherscan إن وجدت
                for old_b in snapshot.recent_blocks:
                    if old_b.number == bi.number and old_b.reward is not None:
                        bi.reward = old_b.reward
                        if old_b.builder and not old_b.builder.startswith("0x"):
                            bi.builder = old_b.builder
                        break

                rpc_blocks.append(bi)
            except Exception as e:
                logger.debug(f"  ⚠️ خطأ تحليل بلوك RPC: {e}")

        if rpc_blocks:
            snapshot.recent_blocks = rpc_blocks
            logger.info(f"  📦 {len(rpc_blocks)} بلوك من RPC (overwrite)")

    # ── حساب TPS من آخر بلوكين (أدق من HTML) ──
    if len(blocks_data) >= 2:
        try:
            b0 = blocks_data[0]
            b1 = blocks_data[-1]
            ts0 = int(b0["timestamp"], 16)
            ts1 = int(b1["timestamp"], 16)
            dt = ts0 - ts1
            if dt > 0:
                total_txns = sum(
                    len(b.get("transactions", [])) if isinstance(b.get("transactions", []), list) else 0
                    for b in blocks_data
                )
                tps = total_txns / dt
                snapshot.network.tps = round(tps, 2)
                logger.debug(f"  🔄 TPS: {tps:.2f}")
        except Exception:
            pass


def _generate_gas_estimates(snapshot, chain_key: str) -> None:
    """
    توليد تقديرات تكلفة العمليات من سعر الغاز الحالي.
    هذه تقديرات تقريبية بناءً على gas_price و native_price.
    """
    gas_gwei = snapshot.transactions.gas_price_avg
    native_price = snapshot.tokens.native_price_usd

    if gas_gwei is None or native_price is None:
        return

    # حساب تكلفة الغاز بالدولار: gas_used * gas_price_gwei * 1e-9 * native_price_usd
    gas_price_eth = gas_gwei * 1e-9

    # تقديرات Gas Units للعمليات الشائعة
    operations = [
        ("ETH Transfer", 21_000),
        ("ERC-20 Transfer", 65_000),
        ("ERC-20 Approve", 46_000),
        ("NFT Transfer", 85_000),
        ("Uniswap Swap", 150_000),
        ("OpenSea Sale", 200_000),
        ("Bridge Deposit", 120_000),
        ("Contract Deploy", 500_000),
        ("Multi-Sig Tx", 250_000),
        ("Lending/Borrow", 350_000),
    ]

    for action, gas_units in operations:
        cost_usd = gas_units * gas_price_eth * native_price
        snapshot.gas_estimates.append(
            GasEstimate(
                action=action,
                cost_usd=round(cost_usd, 4),
                gas_used=gas_units,
            )
        )

    logger.debug(f"  💰 تم توليد {len(operations)} تقدير غاز")
