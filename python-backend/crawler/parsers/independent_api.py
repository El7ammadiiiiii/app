"""
🔌 محللات API للمواقع المستقلة — Independent API Parsers
═══════════════════════════════════════════════════════════
كل موقع مستقل له هيكل JSON فريد.
هذا الملف يحتوي محلل خاص لكل عائلة API:

1. MultiversX — api.multiversx.com
   /stats, /economics, /tokens?size=50, /accounts?size=50
   أغنى API مجاني: شبكة + اقتصاد + توكنات بالأسعار + أكبر محافظ بتسميات

2. TronScan — apilist.tronscan.org/api
   /system/status, /account/list?sort=-balance&limit=50
   364M+ حساب مع ترتيب

3. Kaspa — api.kaspa.org
   /info/network, /info/coinsupply, /info/hashrate, /info/blockreward
   بيانات شبكة خام (PoW)

4. Ergo — api.ergoplatform.com/api/v1
   /networkState, /blocks?limit=10
   بيانات شبكة + بلوكات حديثة

5. Decred — dcrdata.decred.org/api
   /status, /supply, /block/best
   بيانات شبكة + عرض العملة + آخر بلوك
"""

from typing import Any, Dict, List, Optional
from loguru import logger

from ..models import (
    NetworkBasics,
    TransactionMetrics,
    TokenInfo,
    TokenMetrics,
    AccountInfo,
    WalletMetrics,
    ContractMetrics,
    BlockInfo,
    NetworkHealth,
)


# ═══════════════════════════════════════════════════════════════════
# 1️⃣  MultiversX — api.multiversx.com
# ═══════════════════════════════════════════════════════════════════


def parse_multiversx_stats(data: dict) -> dict:
    """
    تحليل /stats
    مثال الاستجابة:
    {"shards":3,"blocks":116098073,"accounts":9162380,
     "transactions":586399267,"refreshRate":6000,"epoch":1587,
     "roundsPassed":14282,"roundsPerEpoch":14400,...}
    """
    result = {}
    try:
        net = NetworkBasics()
        net.total_addresses = _safe_int(data.get("accounts"))
        net.total_transactions = _safe_int(data.get("transactions"))
        net.total_blocks = _safe_int(data.get("blocks"))

        # TPS تقريبي من rounds
        refresh = data.get("refreshRate", 6000)
        if refresh > 0:
            net.avg_block_time_seconds = refresh / 1000.0

        result["network"] = net

        # صحة الشبكة — عدد الأجزاء (shards)
        health = NetworkHealth()
        shards = data.get("shards")
        if shards:
            health.total_nodes = shards  # نستخدمه كعدد shards
        result["health"] = health

    except Exception as e:
        logger.error(f"❌ خطأ تحليل MultiversX stats: {e}")

    return result


def parse_multiversx_economics(data: dict) -> dict:
    """
    تحليل /economics
    {"totalSupply":29289783,"circulatingSupply":27089217,"staked":14254629,
     "price":4.62,"marketCap":135318797,"apr":0.089,"topUpApr":0.053,...}
    """
    result = {}
    try:
        tokens = TokenMetrics()
        tokens.native_price_usd = _safe_float(data.get("price"))
        tokens.native_market_cap = _safe_float(data.get("marketCap"))

        wallets = WalletMetrics()
        wallets.total_supply = _safe_float(data.get("totalSupply"))
        wallets.supply_details = {
            "circulating_supply": _safe_float(data.get("circulatingSupply")),
            "staked": _safe_float(data.get("staked")),
            "apr": _safe_float(data.get("apr")),
            "top_up_apr": _safe_float(data.get("topUpApr")),
        }

        # Staking
        contracts = ContractMetrics()
        staked = _safe_float(data.get("staked"))
        total = _safe_float(data.get("totalSupply"))
        if staked and total and total > 0:
            contracts.staking_balance = staked
            contracts.staking_pct = round(staked / total * 100, 2)

        result["tokens"] = tokens
        result["wallets"] = wallets
        result["contracts"] = contracts

    except Exception as e:
        logger.error(f"❌ خطأ تحليل MultiversX economics: {e}")

    return result


def parse_multiversx_tokens(data: Any) -> dict:
    """
    تحليل /tokens?size=50
    قائمة من العناصر:
    [{"identifier":"USDC-c76f1f","name":"WrappedUSDC","ticker":"USDC",
      "price":1.0,"marketCap":5476533,"supply":"5517744230174",
      "accounts":9817,...}, ...]
    """
    result = {}
    try:
        tokens = TokenMetrics()
        top_tokens = []

        items = data if isinstance(data, list) else []

        for i, item in enumerate(items[:50]):
            tok = TokenInfo(
                rank=i + 1,
                name=item.get("name", ""),
                symbol=item.get("ticker", item.get("identifier", "")),
                address=item.get("identifier", ""),
                price_usd=_safe_float(item.get("price")),
                market_cap=_safe_float(item.get("marketCap")),
                holders=_safe_int(item.get("accounts")),
            )
            top_tokens.append(tok)

        tokens.top_tokens = top_tokens
        tokens.total_token_contracts = len(items)  # تقريبي
        result["tokens"] = tokens

    except Exception as e:
        logger.error(f"❌ خطأ تحليل MultiversX tokens: {e}")

    return result


def parse_multiversx_accounts(data: Any, symbol: str = "EGLD") -> dict:
    """
    تحليل /accounts?size=50&sort=balance&order=desc
    [{"address":"erd1...","balance":"5678901234567890",
      "nonce":12345,"shard":0,"ownerAddress":"erd1...",
      "username":"binance1.elrond"}, ...]
    """
    result = {}
    try:
        wallets = WalletMetrics()
        top_accounts = []
        total_balance = 0.0

        items = data if isinstance(data, list) else []

        for i, item in enumerate(items[:50]):
            raw_balance = item.get("balance", "0")
            # MultiversX: 18 decimals
            balance = int(raw_balance) / 1e18

            username = item.get("username", "")
            label = _extract_label(username, item.get("address", ""))

            acc = AccountInfo(
                rank=i + 1,
                address=item.get("address", ""),
                label=label,
                balance=round(balance, 4),
                tx_count=_safe_int(item.get("nonce")),
                is_contract=bool(item.get("code")),
                is_exchange=_is_exchange(label),
            )

            if acc.is_exchange and balance > 0:
                wallets.exchange_balances[label] = round(balance, 2)

            total_balance += balance
            top_accounts.append(acc)

        wallets.top_accounts = top_accounts
        result["wallets"] = wallets

    except Exception as e:
        logger.error(f"❌ خطأ تحليل MultiversX accounts: {e}")

    return result


# ═══════════════════════════════════════════════════════════════════
# 2️⃣  TronScan — apilist.tronscan.org/api
# ═══════════════════════════════════════════════════════════════════


def parse_tron_status(data: dict) -> dict:
    """
    تحليل /system/status
    {"database":{"block":79975232,"confirmedBlock":79975215},
     "full":{"block":79975232},"solidity":{"block":79975215},
     "sync":{"progress":99.99}}
    """
    result = {}
    try:
        net = NetworkBasics()

        db = data.get("database", {})
        net.total_blocks = _safe_int(db.get("block"))

        sync = data.get("sync", {})
        progress = _safe_float(sync.get("progress"))

        health = NetworkHealth()
        if progress:
            health.confirmation_time_seconds = (
                round(100 - progress, 2) if progress < 100 else 0
            )

        result["network"] = net
        result["health"] = health

    except Exception as e:
        logger.error(f"❌ خطأ تحليل Tron status: {e}")

    return result


def parse_tron_accounts(data: dict) -> dict:
    """
    تحليل /account/list?sort=-balance&limit=50&start=0
    {"total":364274924,"rangeTotal":61000000,
     "data":[{"address":"THPvaUhoh2Qn2y9THCZML3H4...","balance":30879637451432700,
              "totalTransactionCount":4419,"addressTag":"HTX-Cold",...}, ...]}
    """
    result = {}
    try:
        wallets = WalletMetrics()
        top_accounts = []

        total_accounts = _safe_int(data.get("total"))
        items = data.get("data", [])

        net = NetworkBasics()
        if total_accounts:
            net.total_addresses = total_accounts
        result["network"] = net

        for i, item in enumerate(items[:50]):
            raw_balance = item.get("balance", 0)
            # TRX: 6 decimals
            balance = raw_balance / 1e6

            label = item.get("addressTag", "") or item.get("addressTagLogo", "")

            acc = AccountInfo(
                rank=i + 1,
                address=item.get("address", ""),
                label=label,
                balance=round(balance, 2),
                tx_count=_safe_int(item.get("totalTransactionCount")),
                is_exchange=_is_exchange(label),
            )

            if acc.is_exchange and balance > 0:
                wallets.exchange_balances[label] = round(balance, 2)

            top_accounts.append(acc)

        wallets.top_accounts = top_accounts
        result["wallets"] = wallets

    except Exception as e:
        logger.error(f"❌ خطأ تحليل Tron accounts: {e}")

    return result


# ═══════════════════════════════════════════════════════════════════
# 3️⃣  Kaspa — api.kaspa.org
# ═══════════════════════════════════════════════════════════════════


def parse_kaspa_network(data: dict) -> dict:
    """
    تحليل /info/network
    {"networkName":"kaspa-mainnet","blockCount":26336039,
     "headerCount":26336039,"tipHashes":[...],"difficulty":2.35e15,
     "pastMedianTime":1749748284038,"virtualParentHashes":[...],
     "pruningPointHash":"...","virtualDaaScore":141606003}
    """
    result = {}
    try:
        net = NetworkBasics()
        net.total_blocks = _safe_int(data.get("blockCount"))

        health = NetworkHealth()

        result["network"] = net
        result["health"] = health
        result["_raw"] = {
            "difficulty": data.get("difficulty"),
            "network_name": data.get("networkName"),
            "virtual_daa_score": data.get("virtualDaaScore"),
        }

    except Exception as e:
        logger.error(f"❌ خطأ تحليل Kaspa network: {e}")

    return result


def parse_kaspa_supply(data: dict) -> dict:
    """
    تحليل /info/coinsupply
    {"circulatingSupply":"2718672071487837200",
     "maxSupply":"2870000000000000000"}
    
    أو /info/coinsupply/circulating
    "27186720714.878372" (رقم كنص)
    """
    result = {}
    try:
        wallets = WalletMetrics()

        if isinstance(data, dict):
            circ_raw = data.get("circulatingSupply", "0")
            max_raw = data.get("maxSupply", "0")

            # Kaspa: 8 decimals
            circ = int(circ_raw) / 1e8
            max_supply = int(max_raw) / 1e8

            wallets.total_supply = max_supply
            wallets.supply_details = {
                "circulating_supply": round(circ, 2),
                "max_supply": round(max_supply, 2),
                "circulating_pct": round(circ / max_supply * 100, 2) if max_supply > 0 else 0,
            }

        elif isinstance(data, (str, int, float)):
            # /info/coinsupply/circulating → رقم مباشر
            circ = _safe_float(data)
            if circ:
                wallets.supply_details["circulating_supply"] = round(circ, 2)

        result["wallets"] = wallets

    except Exception as e:
        logger.error(f"❌ خطأ تحليل Kaspa supply: {e}")

    return result


def parse_kaspa_hashrate(data: dict) -> dict:
    """
    تحليل /info/hashrate
    {"hashrate":424982.80}
    """
    result = {}
    try:
        health = NetworkHealth()
        hashrate = _safe_float(data.get("hashrate"))
        result["health"] = health
        result["_raw_hashrate"] = hashrate  # TH/s

    except Exception as e:
        logger.error(f"❌ خطأ تحليل Kaspa hashrate: {e}")

    return result


def parse_kaspa_blockreward(data: dict) -> dict:
    """
    تحليل /info/blockreward
    {"blockreward":3.27...}
    """
    result = {}
    try:
        reward = _safe_float(data.get("blockreward"))
        result["_raw_blockreward"] = reward

    except Exception as e:
        logger.error(f"❌ خطأ تحليل Kaspa blockreward: {e}")

    return result


# ═══════════════════════════════════════════════════════════════════
# 4️⃣  Ergo — api.ergoplatform.com/api/v1
# ═══════════════════════════════════════════════════════════════════


def parse_ergo_network(data: dict) -> dict:
    """
    تحليل /networkState
    {"lastBlocks":[...],"params":{"height":1717782,
     "blockVersion":3,"storageFeeFactor":1250000,
     "minValuePerByte":360,"maxBlockSize":1271009,...}}
    """
    result = {}
    try:
        net = NetworkBasics()

        params = data.get("params", {})
        net.total_blocks = _safe_int(params.get("height"))

        # حجم بلوك أقصى
        max_block_size = params.get("maxBlockSize")

        last_blocks = data.get("lastBlocks", [])
        if last_blocks:
            # متوسط وقت البلوك من آخر البلوكات
            times = []
            for i in range(len(last_blocks) - 1):
                t1 = last_blocks[i].get("timestamp", 0)
                t2 = last_blocks[i + 1].get("timestamp", 0)
                if t1 and t2:
                    diff = abs(t1 - t2) / 1000  # ms → s
                    times.append(diff)
            if times:
                net.avg_block_time_seconds = round(sum(times) / len(times), 1)

        result["network"] = net

    except Exception as e:
        logger.error(f"❌ خطأ تحليل Ergo network: {e}")

    return result


def parse_ergo_blocks(data: dict) -> dict:
    """
    تحليل /blocks?limit=10
    {"items":[{"id":"...","height":1717782,"timestamp":1718000000000,
     "transactionsCount":5,"miner":{"address":"...","name":"2miners"},
     "difficulty":"2.1P","minerReward":3.0,...}],"total":1717782}
    """
    result = {}
    try:
        items = data.get("items", [])
        blocks = []

        for item in items[:10]:
            miner = item.get("miner", {})
            block = BlockInfo(
                number=_safe_int(item.get("height")) or 0,
                timestamp=_format_timestamp(item.get("timestamp")),
                txn_count=_safe_int(item.get("transactionsCount")) or 0,
                reward=_safe_float(item.get("minerReward")),
                builder=miner.get("name", "") or miner.get("address", "")[:12],
            )

            # difficulty
            difficulty_str = item.get("difficulty", "")
            if difficulty_str:
                block.gas_limit = _safe_int(item.get("size"))

            blocks.append(block)

        result["blocks"] = blocks

        # أيضاً نحدّث إجمالي البلوكات من الـ API
        total = _safe_int(data.get("total"))
        if total:
            net = NetworkBasics()
            net.total_blocks = total
            result["network"] = net

    except Exception as e:
        logger.error(f"❌ خطأ تحليل Ergo blocks: {e}")

    return result


# ═══════════════════════════════════════════════════════════════════
# 5️⃣  Decred — dcrdata.decred.org/api
# ═══════════════════════════════════════════════════════════════════


def parse_decred_status(data: dict) -> dict:
    """
    تحليل /status
    {"ready":true,"db_height":1052578,"db_block_hash":"...",
     "node_connections":29,"node_version":"8.1.0"}
    """
    result = {}
    try:
        net = NetworkBasics()
        net.total_blocks = _safe_int(data.get("db_height"))

        health = NetworkHealth()
        health.total_nodes = _safe_int(data.get("node_connections"))

        result["network"] = net
        result["health"] = health

    except Exception as e:
        logger.error(f"❌ خطأ تحليل Decred status: {e}")

    return result


def parse_decred_supply(data: dict) -> dict:
    """
    تحليل /supply
    {"supply_mined":1726608833790166,"supply_ultimate":2099999998394320,
     "coin_value_mined":...}
    """
    result = {}
    try:
        wallets = WalletMetrics()

        mined = _safe_int(data.get("supply_mined"))
        ultimate = _safe_int(data.get("supply_ultimate"))

        # Decred: 8 decimals (atoms)
        if mined:
            wallets.total_supply = round(mined / 1e8, 2) if mined else None
            wallets.supply_details = {
                "supply_mined": round(mined / 1e8, 2) if mined else 0,
                "supply_ultimate": round(ultimate / 1e8, 2) if ultimate else 0,
                "mined_pct": (
                    round(mined / ultimate * 100, 2)
                    if mined and ultimate and ultimate > 0
                    else 0
                ),
            }

        result["wallets"] = wallets

    except Exception as e:
        logger.error(f"❌ خطأ تحليل Decred supply: {e}")

    return result


def parse_decred_block(data: dict) -> dict:
    """
    تحليل /block/best
    {"hash":"...","height":1052578,"size":5234,
     "difficulty":6.16e10,"stakeDiff":301.76,
     "time":1718000000,"nonce":...,"ticket_pool":{...},
     "numtx":7,"numstx":3,...}
    """
    result = {}
    try:
        block = BlockInfo(
            number=_safe_int(data.get("height")) or 0,
            timestamp=_format_timestamp(data.get("time")),
            txn_count=_safe_int(data.get("numtx")) or 0,
            gas_used=_safe_int(data.get("size")),
            reward=_safe_float(data.get("stakeDiff")),
            builder=data.get("hash", "")[:16],
        )

        result["blocks"] = [block]
        result["_raw"] = {
            "difficulty": data.get("difficulty"),
            "stake_diff": data.get("stakeDiff"),
            "ticket_price": data.get("sdiff"),
            "num_stx": data.get("numstx"),
        }

    except Exception as e:
        logger.error(f"❌ خطأ تحليل Decred block: {e}")

    return result


# ═══════════════════════════════════════════════════════════════════
# 🗺️  موجّه المحللات — Parser Router
# ═══════════════════════════════════════════════════════════════════

# خريطة: (chain_key, endpoint_name) → parser function
PARSER_MAP: Dict[str, Dict[str, callable]] = {
    "multiversx": {
        "stats": parse_multiversx_stats,
        "economics": parse_multiversx_economics,
        "tokens": parse_multiversx_tokens,
        "accounts": parse_multiversx_accounts,
    },
    "tron": {
        "status": parse_tron_status,
        "accounts": parse_tron_accounts,
    },
    "kaspa": {
        "network": parse_kaspa_network,
        "supply": parse_kaspa_supply,
        "supply_circulating": parse_kaspa_supply,  # نفس المحلل
        "hashrate": parse_kaspa_hashrate,
        "blockreward": parse_kaspa_blockreward,
    },
    "ergo": {
        "info": parse_ergo_network,
        "blocks": parse_ergo_blocks,
    },
    "decred": {
        "status": parse_decred_status,
        "supply": parse_decred_supply,
        "best_block": parse_decred_block,
    },
}


def get_parser(chain_key: str, endpoint: str):
    """جلب الدالة المناسبة لتحليل استجابة API"""
    chain_parsers = PARSER_MAP.get(chain_key, {})
    return chain_parsers.get(endpoint)


# ═══════════════════════════════════════════════════════════════════
# 🔧 دوال مساعدة
# ═══════════════════════════════════════════════════════════════════


def _safe_int(val) -> Optional[int]:
    """تحويل آمن إلى عدد صحيح"""
    if val is None:
        return None
    try:
        return int(val)
    except (ValueError, TypeError):
        return None


def _safe_float(val) -> Optional[float]:
    """تحويل آمن إلى عدد عشري"""
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def _format_timestamp(ts) -> str:
    """تحويل timestamp إلى نص ISO"""
    if not ts:
        return ""
    try:
        if isinstance(ts, (int, float)):
            # ملي ثانية أو ثواني؟
            if ts > 1e12:
                ts = ts / 1000  # ms → s
            from datetime import datetime
            return datetime.fromtimestamp(ts).isoformat()
        return str(ts)
    except Exception:
        return str(ts)


EXCHANGE_KEYWORDS = [
    "binance", "coinbase", "kraken", "bybit", "okx", "upbit",
    "crypto.com", "huobi", "htx", "kucoin", "gate", "bitfinex",
    "gemini", "bitstamp", "robinhood", "bitget", "mexc",
    "deribit", "bitmex", "poloniex", "lbank",
]


def _is_exchange(label: str) -> bool:
    """هل هذا حساب بورصة؟"""
    if not label:
        return False
    label_lower = label.lower()
    return any(kw in label_lower for kw in EXCHANGE_KEYWORDS)


def _extract_label(username: str, address: str) -> str:
    """استخراج تسمية من اسم المستخدم"""
    if username:
        # MultiversX style: "binance1.elrond" → "Binance"
        parts = username.split(".")
        if parts:
            return parts[0].capitalize()
    return ""
