"""
🔌 محلل استجابات API v2 لعائلة Blockscout
=============================================
يحوّل استجابات JSON من API v2 إلى نماذج البيانات الموحدة.

نقاط API المدعومة:
- /api/v2/stats → إحصائيات الشبكة
- /api/v2/addresses → أكبر المحافظ
- /api/v2/tokens → قائمة التوكنات
- /api/v2/main-page/blocks → بلوكات حديثة
- /api/v2/main-page/transactions → معاملات حديثة
- /api/v2/stats/charts/transactions → رسم بياني للمعاملات
- /api/v2/stats/charts/market → رسم بياني للسوق
"""

from typing import Any, Dict, List, Optional
from loguru import logger

from ..models import (
    NetworkBasics, TransactionMetrics, TokenMetrics, TokenInfo,
    WalletMetrics, AccountInfo, ContractMetrics, NetworkHealth,
    BlockInfo, DexTrade, GasEstimate, ChainSnapshot,
)


def parse_stats(data: dict, chain_symbol: str = "") -> dict:
    """
    تحليل /api/v2/stats
    
    مثال الاستجابة:
    {
        "total_addresses": "8337437",
        "total_blocks": "84814571",
        "total_transactions": "807819631",
        "transactions_today": "4655",
        "average_block_time": 2001.0,
        "coin_price": "0.00253341",
        "coin_price_change_percentage": -5.98,
        "market_cap": "37602154.80",
        "gas_prices": {"average": 235.77, "fast": 236.1, "slow": 227.97},
        "gas_used_today": "646016682",
        "network_utilization_percentage": 0.0028,
        "tvl": null
    }
    """
    result = {
        "network": NetworkBasics(),
        "transactions": TransactionMetrics(),
        "tokens": TokenMetrics(),
        "health": NetworkHealth(),
    }

    if not data or not isinstance(data, dict):
        return result

    try:
        net = result["network"]
        tx = result["transactions"]
        tok = result["tokens"]
        health = result["health"]

        # ═══ الشبكة ═══
        net.total_addresses = _safe_int(data.get("total_addresses"))
        net.total_blocks = _safe_int(data.get("total_blocks"))
        net.total_transactions = _safe_int(data.get("total_transactions"))
        net.txs_per_day = _safe_int(data.get("transactions_today"))

        # وقت البلوك (يأتي بالمللي ثانية)
        avg_block = data.get("average_block_time")
        if avg_block is not None:
            try:
                avg_val = float(avg_block)
                # بعض سلاسل Blockscout ترسل بالمللي ثانية، وبعضها بالثواني
                net.avg_block_time_seconds = avg_val / 1000.0 if avg_val > 1000 else avg_val
            except (TypeError, ValueError):
                pass

        # TPS = معاملات اليوم / 86400
        if net.txs_per_day and net.txs_per_day > 0:
            net.tps = round(net.txs_per_day / 86400.0, 2)

        # ═══ السعر والسوق ═══
        tok.native_price_usd = _safe_float(data.get("coin_price"))
        tok.native_price_change_pct = _safe_float(data.get("coin_price_change_percentage"))
        tok.native_market_cap = _safe_float(data.get("market_cap"))

        # ═══ الغاز ═══
        gas = data.get("gas_prices")
        if gas and isinstance(gas, dict):
            tx.gas_price_low = _safe_float(gas.get("slow"))
            tx.gas_price_avg = _safe_float(gas.get("average"))
            tx.gas_price_high = _safe_float(gas.get("fast"))

        # ═══ استخدام الشبكة ═══
        utilization = _safe_float(data.get("network_utilization_percentage"))
        if utilization is not None:
            tx.network_utilization_pct = utilization * 100 if utilization <= 1 else utilization
        
        # الغاز المستخدم اليوم
        gas_today = data.get("gas_used_today")
        gas_today_val = _safe_int(gas_today)
        if gas_today_val is not None:
            tx.daily_gas_used = str(gas_today_val)

        logger.debug(
            f"📊 Stats: addresses={net.total_addresses:,}, "
            f"txns={net.total_transactions:,}, "
            f"price=${tok.native_price_usd or 0:.4f}, "
            f"gas_avg={tx.gas_price_avg}"
        )

    except Exception as e:
        logger.error(f"❌ خطأ تحليل stats: {e}")

    return result


def parse_addresses(data: dict, chain_symbol: str = "") -> dict:
    """
    تحليل /api/v2/addresses  
    يُرجع أكبر المحافظ بالرصيد.
    
    مثال عنصر:
    {
        "coin_balance": "4657423171072404544333610648",
        "tx_count": "332",
        "hash": "0x5b2E...",
        "is_contract": false,
        "name": "ONE for BSC",
        "public_tags": [...],
    }
    """
    result = {"wallets": WalletMetrics()}

    items = _extract_items(data)
    if not items:
        return result

    try:
        # exchange_rate لحساب القيمة بالدولار
        exchange_rate = _safe_float(data.get("exchange_rate")) or 0

        accounts = []
        exchange_balances = {}
        total_balance = 0.0

        for i, item in enumerate(items[:50]):
            balance_raw = _safe_int(item.get("coin_balance")) or 0
            # Blockscout يخزن الرصيد بـ Wei (18 أصفار)
            balance = balance_raw / 1e18
            total_balance += balance
            balance_usd = balance * exchange_rate if exchange_rate else None

            # تحديد التسمية
            label = item.get("name") or ""
            tags = item.get("public_tags") or []
            if tags and isinstance(tags, list):
                for tag in tags:
                    if isinstance(tag, dict):
                        label = tag.get("display_name", label)
                    elif isinstance(tag, str):
                        label = tag

            is_contract = item.get("is_contract", False)
            is_exchange = _is_exchange_label(label)

            acc = AccountInfo(
                rank=i + 1,
                address=item.get("hash", ""),
                label=label,
                balance=round(balance, 4),
                balance_usd=round(balance_usd, 2) if balance_usd else None,
                tx_count=_safe_int(item.get("tx_count")),
                is_contract=is_contract,
                is_exchange=is_exchange,
            )
            accounts.append(acc)

            if is_exchange and label:
                exchange_balances[label] = round(balance, 4)

        result["wallets"].top_accounts = accounts

        # تركيز أكبر 10
        if accounts and total_balance > 0:
            top10_balance = sum(a.balance or 0 for a in accounts[:10])
            # نحتاج total supply — نحصل عليها من stats
            # مؤقتاً نحسب كنسبة من مجموع أكبر 50
            result["wallets"].top10_concentration_pct = round(
                (top10_balance / total_balance) * 100, 2
            ) if total_balance > 0 else None

        result["wallets"].exchange_balances = exchange_balances

        logger.info(f"✅ تم استخراج {len(accounts)} محفظة، {len(exchange_balances)} بورصة")

    except Exception as e:
        logger.error(f"❌ خطأ تحليل addresses: {e}")

    return result


def parse_tokens(data: dict) -> dict:
    """
    تحليل /api/v2/tokens?type=ERC-20
    
    مثال عنصر:
    {
        "address_hash": "0x...",
        "name": "Zora Bridged WETH",
        "symbol": "WETH",
        "decimals": "18",
        "holders_count": "117122",
        "total_supply": "202112767837190707549",
        "exchange_rate": null,
        "circulating_market_cap": null,
        "volume_24h": null,
        "type": "ERC-20"
    }
    """
    result = {"tokens": TokenMetrics()}

    items = _extract_items(data)
    if not items:
        return result

    try:
        top_tokens = []
        token_count = 0

        for i, item in enumerate(items[:50]):
            decimals = _safe_int(item.get("decimals")) or 18
            total_supply_raw = _safe_int(item.get("total_supply")) or 0
            total_supply = total_supply_raw / (10 ** decimals) if decimals > 0 else total_supply_raw

            price_usd = _safe_float(item.get("exchange_rate"))
            market_cap = _safe_float(item.get("circulating_market_cap"))
            if market_cap is None and price_usd is not None and total_supply > 0:
                market_cap = price_usd * total_supply

            token = TokenInfo(
                rank=i + 1,
                name=item.get("name", ""),
                symbol=item.get("symbol", ""),
                address=item.get("address_hash", ""),
                price_usd=price_usd,
                volume_24h=_safe_float(item.get("volume_24h")),
                market_cap=market_cap,
                holders=_safe_int(item.get("holders_count")),
            )
            top_tokens.append(token)
            token_count += 1

        result["tokens"].top_tokens = top_tokens
        result["tokens"].total_token_contracts = token_count

        logger.info(f"✅ تم استخراج {len(top_tokens)} توكن")

    except Exception as e:
        logger.error(f"❌ خطأ تحليل tokens: {e}")

    return result


def parse_blocks(data: Any) -> dict:
    """
    تحليل /api/v2/main-page/blocks
    
    مثال عنصر:
    {
        "height": 41948135,
        "timestamp": "2026-02-08T...",
        "gas_used": "46242",
        "gas_limit": "30000000",
        "gas_used_percentage": 0.15414,
        "miner": {"hash": "0x...", "name": "Proxy"},
        "base_fee_per_gas": "252",
        "burnt_fees": "11652984"
    }
    """
    result = {"blocks": []}

    items = data if isinstance(data, list) else _extract_items(data)
    if not items:
        return result

    try:
        blocks = []
        for item in items[:25]:
            block = BlockInfo(
                number=item.get("height", 0),
                timestamp=item.get("timestamp", ""),
                gas_used=_safe_int(item.get("gas_used")),
                gas_limit=_safe_int(item.get("gas_limit")),
                gas_used_pct=_safe_float(item.get("gas_used_percentage")) or 0,
            )

            # txn count
            txn_count = item.get("tx_count")
            if txn_count is not None:
                block.txn_count = _safe_int(txn_count) or 0

            # المُعدّن
            miner = item.get("miner")
            if miner and isinstance(miner, dict):
                block.builder = miner.get("name") or miner.get("hash", "")[:12]

            # المكافأة
            reward = item.get("rewards")
            if reward:
                if isinstance(reward, list) and reward:
                    block.reward = _safe_float(reward[0].get("reward")) 
                    if block.reward:
                        block.reward = block.reward / 1e18
                elif isinstance(reward, (int, float, str)):
                    block.reward = _safe_float(reward)
                    if block.reward and block.reward > 1e15:
                        block.reward = block.reward / 1e18

            blocks.append(block)

        result["blocks"] = blocks
        logger.info(f"✅ تم استخراج {len(blocks)} بلوك")

    except Exception as e:
        logger.error(f"❌ خطأ تحليل blocks: {e}")

    return result


def parse_transactions(data: Any) -> dict:
    """
    تحليل /api/v2/main-page/transactions
    يُستخدم لتقدير رسوم المعاملات.
    """
    result = {"avg_fee": None, "tx_types": {}}

    items = data if isinstance(data, list) else _extract_items(data)
    if not items:
        return result

    try:
        fees = []
        tx_types = {}

        for item in items[:50]:
            # الرسوم
            fee = _safe_int(item.get("fee", {}).get("value") if isinstance(item.get("fee"), dict) else item.get("fee"))
            if fee and fee > 0:
                fees.append(fee / 1e18)

            # نوع المعاملة
            tx_type = item.get("tx_types") or item.get("type")
            if tx_type:
                if isinstance(tx_type, str):
                    tx_types[tx_type] = tx_types.get(tx_type, 0) + 1

        if fees:
            result["avg_fee"] = sum(fees) / len(fees)

        result["tx_types"] = tx_types

    except Exception as e:
        logger.error(f"❌ خطأ تحليل transactions: {e}")

    return result


def parse_tx_chart(data: dict) -> dict:
    """
    تحليل /api/v2/stats/charts/transactions
    يُرجع تاريخ المعاملات اليومية.
    
    مثال:
    {"chart_data": [{"date": "2026-02-07", "tx_count": 4655}, ...]}
    """
    result = {"tx_history": [], "avg_daily_txns": None}

    try:
        chart = data.get("chart_data", [])
        if chart:
            result["tx_history"] = chart[:30]
            if len(chart) >= 7:
                last_7 = [d.get("tx_count", 0) for d in chart[:7]]
                result["avg_daily_txns"] = int(sum(last_7) / len(last_7))

    except Exception as e:
        logger.error(f"❌ خطأ تحليل tx_chart: {e}")

    return result


def parse_market_chart(data: dict) -> dict:
    """
    تحليل /api/v2/stats/charts/market
    يُرجع تاريخ الأسعار والقيمة السوقية.
    
    مثال:
    {
        "available_supply": "14842506661.26291",
        "chart_data": [
            {"date": "2026-01-16", "closing_price": "0.00253341", "market_cap": "59688149.58"},
            ...
        ]
    }
    """
    result = {
        "available_supply": None,
        "price_history": [],
    }

    try:
        result["available_supply"] = _safe_float(data.get("available_supply"))

        chart = data.get("chart_data", [])
        if chart:
            result["price_history"] = chart[:30]

    except Exception as e:
        logger.error(f"❌ خطأ تحليل market_chart: {e}")

    return result


# ══════════════════════════════════════════════════════════════════
# أدوات مساعدة
# ══════════════════════════════════════════════════════════════════

def _extract_items(data: Any) -> list:
    """استخراج قائمة العناصر من الاستجابة"""
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        return data.get("items", [])
    return []


def _safe_int(val: Any) -> Optional[int]:
    """تحويل آمن إلى int"""
    if val is None:
        return None
    try:
        return int(float(str(val).replace(",", "")))
    except (ValueError, TypeError):
        return None


def _safe_float(val: Any) -> Optional[float]:
    """تحويل آمن إلى float"""
    if val is None:
        return None
    try:
        return float(str(val).replace(",", ""))
    except (ValueError, TypeError):
        return None


_EXCHANGE_KEYWORDS = [
    "binance", "coinbase", "kraken", "okx", "bitfinex", "huobi",
    "kucoin", "gate.io", "bybit", "bitget", "mexc", "crypto.com",
    "gemini", "bitstamp", "robinhood", "upbit", "bithumb",
    "bridge", "exchange", "swap", "dex",
]


def _is_exchange_label(label: str) -> bool:
    """هل التسمية تشير لبورصة؟"""
    if not label:
        return False
    label_lower = label.lower()
    return any(kw in label_lower for kw in _EXCHANGE_KEYWORDS)
