"""
🟠 محللات API المستوى 2 — Level 2 Sites API Parsers
═══════════════════════════════════════════════════════
يحلل استجابات APIs المتنوعة لـ 10 سلاسل مختلفة:
  Celestia, Stacks, Litecoin, Tezos, Hedera,
  Aptos, IOTA, Telos, Radix, Theta
"""

from typing import Any, Dict, Optional

from ..models import (
    NetworkBasics,
    TransactionMetrics,
    TokenMetrics,
    WalletMetrics,
    ContractMetrics,
    NetworkHealth,
    AccountInfo,
    BlockInfo,
    LightningMetrics,
)


# ═══════════════════════════════════════════════════════════════
# 🌌 Celestia (celenium.io)
# ═══════════════════════════════════════════════════════════════

def parse_celestia_head(data: dict) -> dict:
    """
    تحليل api.celenium.io/v1/head
    غني جداً: blocks, txs, accounts, supply, validators, fee
    """
    network = NetworkBasics()
    health = NetworkHealth()
    wallets = WalletMetrics()
    contracts = ContractMetrics()

    # ── بلوكات ──
    height = data.get("last_height")
    if height:
        network.total_blocks = _safe_int(height)

    # ── معاملات ──
    total_tx = data.get("total_tx")
    if total_tx:
        network.total_transactions = _safe_int(total_tx)

    # ── محافظ ──
    total_accounts = data.get("total_accounts")
    if total_accounts:
        network.total_addresses = _safe_int(total_accounts)

    # ── مدققون ──
    total_validators = data.get("total_validators")
    if total_validators:
        health.total_nodes = _safe_int(total_validators)

    # ── العرض ──
    total_supply = data.get("total_supply")
    if total_supply:
        try:
            wallets.total_supply = int(total_supply) / 1e6  # utia → TIA
        except (ValueError, TypeError):
            pass

    # ── القوة التصويتية ──
    voting_power = data.get("total_voting_power")
    if voting_power:
        wallets.supply_details["total_voting_power"] = _safe_int(voting_power)

    # ── الرسوم ──
    total_fee = data.get("total_fee")
    if total_fee:
        wallets.supply_details["total_fee_utia"] = total_fee

    # ── Blobs ──
    blobs_size = data.get("total_blobs_size")
    if blobs_size:
        wallets.supply_details["total_blobs_size_bytes"] = blobs_size

    result = {
        "network": network,
        "health": health,
    }
    if wallets.total_supply:
        result["wallets"] = wallets
    if contracts.staking_balance:
        result["contracts"] = contracts

    return result


# ═══════════════════════════════════════════════════════════════
# 📦 Stacks/Hiro
# ═══════════════════════════════════════════════════════════════

def parse_stacks_info(data: dict) -> dict:
    """تحليل api.hiro.so/v2/info"""
    network = NetworkBasics()

    tip_height = data.get("stacks_tip_height")
    if tip_height:
        network.total_blocks = _safe_int(tip_height)

    burn_height = data.get("burn_block_height")
    if burn_height:
        network.txs_per_day = None  # لا يوجد

    return {"network": network} if network.total_blocks else {}


def parse_stacks_extended(data: dict) -> dict:
    """تحليل api.hiro.so/extended/v1/status"""
    network = NetworkBasics()

    chain_tip = data.get("chain_tip", {})
    block_height = chain_tip.get("block_height")
    if block_height:
        network.total_blocks = _safe_int(block_height)

    return {"network": network} if network.total_blocks else {}


# ═══════════════════════════════════════════════════════════════
# 💰 Litecoin (mempool.space fork)
# ═══════════════════════════════════════════════════════════════

def parse_litecoin_pools(data: dict) -> dict:
    """تحليل /api/v1/mining/pools/1w"""
    wallets = WalletMetrics()
    accounts = []

    pools = data.get("pools", data) if isinstance(data, dict) else data
    if isinstance(pools, list):
        for i, pool in enumerate(pools[:20]):
            name = pool.get("name", f"Pool #{i + 1}")
            slug = pool.get("slug", "")
            block_count = pool.get("blockCount", 0)
            rank = pool.get("rank", i + 1)

            accounts.append(AccountInfo(
                rank=rank,
                address=slug,
                label=name,
                balance=float(block_count) if block_count else 0,
                tx_count=block_count,
            ))

    if accounts:
        wallets.top_accounts = accounts

    return {"wallets": wallets} if accounts else {}


def parse_litecoin_difficulty(data: dict) -> dict:
    """تحليل /api/v1/difficulty-adjustment"""
    network = NetworkBasics()

    remaining_blocks = data.get("remainingBlocks")
    progress = data.get("progressPercent")

    # معلومات إضافية في supply_details
    wallets = WalletMetrics()
    details = {}

    diff_change = data.get("difficultyChange")
    if diff_change is not None:
        details["difficulty_change_pct"] = round(diff_change, 4)

    time_avg = data.get("timeAvg")
    if time_avg:
        network.avg_block_time_seconds = round(time_avg / 1000, 2) if time_avg > 1000 else round(float(time_avg), 2)

    if details:
        wallets.supply_details = details

    result = {}
    if network.avg_block_time_seconds:
        result["network"] = network
    if details:
        result["wallets"] = wallets
    return result


def parse_litecoin_blocks_tip(data) -> dict:
    """تحليل /api/blocks/tip/height — رقم فقط"""
    network = NetworkBasics()

    if isinstance(data, (int, float)):
        network.total_blocks = int(data)
    elif isinstance(data, str):
        try:
            network.total_blocks = int(data)
        except (ValueError, TypeError):
            return {}

    return {"network": network} if network.total_blocks else {}


def parse_litecoin_hashrate(data: dict) -> dict:
    """تحليل /api/v1/mining/hashrate/1w"""
    wallets = WalletMetrics()

    if isinstance(data, dict):
        hashrates = data.get("hashrates", [])
        if hashrates and len(hashrates) > 0:
            last = hashrates[-1]
            hr = last.get("avgHashrate")
            if hr:
                wallets.supply_details["hashrate"] = hr

    return {"wallets": wallets} if wallets.supply_details else {}


# ═══════════════════════════════════════════════════════════════
# 🫕 Tezos (tzkt.io)
# ═══════════════════════════════════════════════════════════════

def parse_tezos_head(data: dict) -> dict:
    """تحليل api.tzkt.io/v1/head"""
    network = NetworkBasics()
    tokens = TokenMetrics()

    level = data.get("level")
    if level:
        network.total_blocks = _safe_int(level)

    # أسعار (Tezos يوفر أسعار في head!)
    quote_usd = data.get("quoteUsd")
    if quote_usd:
        try:
            tokens.native_price_usd = round(float(quote_usd), 6)
        except (ValueError, TypeError):
            pass

    quote_btc = data.get("quoteBtc")
    if quote_btc:
        try:
            tokens.native_price_btc = float(quote_btc)
        except (ValueError, TypeError):
            pass

    result = {"network": network}
    if tokens.native_price_usd:
        result["tokens"] = tokens
    return result


def parse_tezos_statistics(data: dict) -> dict:
    """تحليل api.tzkt.io/v1/statistics/current"""
    wallets = WalletMetrics()
    health = NetworkHealth()
    contracts = ContractMetrics()

    # ── العرض ──
    total_supply = data.get("totalSupply")
    if total_supply:
        try:
            wallets.total_supply = int(total_supply) / 1e6  # mutez → XTZ
        except (ValueError, TypeError):
            pass

    circulating = data.get("circulatingSupply")
    if circulating:
        try:
            wallets.supply_details["circulating"] = int(circulating) / 1e6
        except (ValueError, TypeError):
            pass

    # ── التخزين ──
    total_frozen = data.get("totalFrozen")
    if total_frozen:
        try:
            contracts.staking_balance = int(total_frozen) / 1e6
            if wallets.total_supply and wallets.total_supply > 0:
                contracts.staking_pct = round(
                    (contracts.staking_balance / wallets.total_supply) * 100, 2
                )
        except (ValueError, TypeError):
            pass

    # ── المدققون ──
    total_bakers = data.get("totalBakers")
    if total_bakers:
        health.total_nodes = _safe_int(total_bakers)

    # ── المُفوّضون ──
    total_delegators = data.get("totalDelegators")
    if total_delegators:
        wallets.supply_details["total_delegators"] = total_delegators

    total_stakers = data.get("totalStakers")
    if total_stakers:
        wallets.supply_details["total_stakers"] = total_stakers

    # ── المحروق ──
    total_burned = data.get("totalBurned")
    if total_burned:
        try:
            wallets.supply_details["total_burned"] = int(total_burned) / 1e6
        except (ValueError, TypeError):
            pass

    result = {}
    if wallets.total_supply:
        result["wallets"] = wallets
    if health.total_nodes:
        result["health"] = health
    if contracts.staking_balance:
        result["contracts"] = contracts
    return result


# ═══════════════════════════════════════════════════════════════
# #️⃣ Hedera
# ═══════════════════════════════════════════════════════════════

def parse_hedera_supply(data: dict) -> dict:
    """تحليل /network/supply"""
    wallets = WalletMetrics()

    total = data.get("total_supply")
    released = data.get("released_supply")

    if total:
        try:
            wallets.total_supply = int(total) / 1e8  # tinybar → HBAR
        except (ValueError, TypeError):
            pass

    if released:
        try:
            wallets.supply_details["released_supply"] = int(released) / 1e8
        except (ValueError, TypeError):
            pass

    return {"wallets": wallets} if wallets.total_supply else {}


def parse_hedera_blocks(data: dict) -> dict:
    """تحليل /blocks?limit=1&order=desc"""
    network = NetworkBasics()

    blocks = data.get("blocks", [])
    if blocks and len(blocks) > 0:
        latest = blocks[0]
        number = latest.get("number")
        if number:
            network.total_blocks = _safe_int(number)

        count = latest.get("count")
        if count:
            network.txs_per_day = _safe_int(count)  # txs في آخر بلوك

    return {"network": network} if network.total_blocks else {}


# ═══════════════════════════════════════════════════════════════
# 🔴 Aptos
# ═══════════════════════════════════════════════════════════════

def parse_aptos_ledger(data: dict) -> dict:
    """تحليل fullnode.mainnet.aptoslabs.com/v1"""
    network = NetworkBasics()

    block_height = data.get("block_height")
    if block_height:
        network.total_blocks = _safe_int(block_height)

    ledger_version = data.get("ledger_version")
    if ledger_version:
        network.total_transactions = _safe_int(ledger_version)

    epoch = data.get("epoch")
    if epoch:
        wallets = WalletMetrics()
        wallets.supply_details["epoch"] = _safe_int(epoch)
        return {"network": network, "wallets": wallets}

    return {"network": network} if network.total_blocks else {}


# ═══════════════════════════════════════════════════════════════
# 🟢 IOTA
# ═══════════════════════════════════════════════════════════════

def parse_iota_info(data: dict) -> dict:
    """تحليل api.stardust-mainnet.iotaledger.net/api/core/v2/info"""
    network = NetworkBasics()
    wallets = WalletMetrics()
    health = NetworkHealth()

    # ── الحالة ──
    status = data.get("status", {})
    is_healthy = status.get("isHealthy")

    latest_ms = status.get("latestMilestone", {})
    ms_index = latest_ms.get("index")
    if ms_index:
        network.total_blocks = _safe_int(ms_index)

    # ── البروتوكول ──
    protocol = data.get("protocol", {})
    token_supply = protocol.get("tokenSupply")
    if token_supply:
        try:
            wallets.total_supply = int(token_supply) / 1e6  # micro → IOTA
        except (ValueError, TypeError):
            pass

    network_name = protocol.get("networkName")
    if network_name:
        wallets.supply_details["network_name"] = network_name

    # ── التوكن الأساسي ──
    base_token = data.get("baseToken", {})
    token_name = base_token.get("name")
    if token_name:
        wallets.supply_details["token_name"] = token_name

    result = {"network": network}
    if wallets.total_supply:
        result["wallets"] = wallets
    return result


# ═══════════════════════════════════════════════════════════════
# 🟣 Telos (EOSIO)
# ═══════════════════════════════════════════════════════════════

def parse_telos_info(data: dict) -> dict:
    """تحليل mainnet.telos.net/v1/chain/get_info"""
    network = NetworkBasics()

    head_num = data.get("head_block_num")
    if head_num:
        network.total_blocks = _safe_int(head_num)

    # لا يوجد TPS مباشرة لكن block_cpu_limit يعطي فكرة
    server_version = data.get("server_version_string")
    wallets = WalletMetrics()
    if server_version:
        wallets.supply_details["server_version"] = server_version

    chain_id = data.get("chain_id")
    if chain_id:
        wallets.supply_details["chain_id"] = chain_id

    result = {"network": network}
    if wallets.supply_details:
        result["wallets"] = wallets
    return result


# ═══════════════════════════════════════════════════════════════
# 🔵 Radix (POST API)
# ═══════════════════════════════════════════════════════════════

def parse_radix_status(data: dict) -> dict:
    """تحليل /status/gateway-status"""
    network = NetworkBasics()

    ledger = data.get("ledger_state", {})
    state_version = ledger.get("state_version")
    if state_version:
        network.total_transactions = _safe_int(state_version)

    epoch = ledger.get("epoch")
    if epoch:
        network.total_blocks = _safe_int(epoch)

    wallets = WalletMetrics()
    network_name = ledger.get("network")
    if network_name:
        wallets.supply_details["network_name"] = network_name

    round_num = ledger.get("round")
    if round_num:
        wallets.supply_details["current_round"] = round_num

    # Release info
    release = data.get("release_info", {})
    version = release.get("release_version")
    if version:
        wallets.supply_details["version"] = version

    result = {"network": network}
    if wallets.supply_details:
        result["wallets"] = wallets
    return result


def parse_radix_config(data: dict) -> dict:
    """تحليل /status/network-configuration"""
    wallets = WalletMetrics()

    network_id = data.get("network_id")
    network_name = data.get("network_name")

    if network_name:
        wallets.supply_details["network_name"] = network_name
    if network_id:
        wallets.supply_details["network_id"] = network_id

    # العناوين المعروفة
    well_known = data.get("well_known_addresses", {})
    xrd_address = well_known.get("xrd")
    if xrd_address:
        wallets.supply_details["xrd_resource"] = xrd_address

    return {"wallets": wallets} if wallets.supply_details else {}


# ═══════════════════════════════════════════════════════════════
# 🔷 Theta
# ═══════════════════════════════════════════════════════════════

def parse_theta_blocks(data: dict) -> dict:
    """تحليل explorer-api.thetatoken.org/api/blocks/top_blocks"""
    network = NetworkBasics()
    recent_blocks = []

    body = data.get("body", [])
    if isinstance(body, list) and len(body) > 0:
        # أحدث بلوك
        latest = body[0]
        height = latest.get("height")
        if height:
            network.total_blocks = _safe_int(height)

        # بلوكات أخيرة
        for b in body[:10]:
            block_info = BlockInfo(
                number=_safe_int(b.get("height")),
                timestamp=b.get("timestamp", ""),
                txn_count=_safe_int(b.get("num_txs", 0)),
            )
            recent_blocks.append(block_info)

    result = {}
    if network.total_blocks:
        result["network"] = network
    if recent_blocks:
        result["blocks"] = recent_blocks
    return result


# ═══════════════════════════════════════════════════════════════
# ₿ Bitcoin — Blockchair + Blockchain.com + Mempool.space
# ═══════════════════════════════════════════════════════════════

def parse_bitcoin_blockchair_stats(data: dict) -> dict:
    """
    تحليل api.blockchair.com/bitcoin/stats
    المصدر الأساسي — 32 حقل في استدعاء واحد
    """
    # Blockchair يغلّف البيانات في data.data
    d = data.get("data", data)

    network = NetworkBasics()
    transactions = TransactionMetrics()
    tokens = TokenMetrics()
    wallets = WalletMetrics()
    health = NetworkHealth()

    # ── البلوكات والمعاملات ──
    network.total_blocks = _safe_int(d.get("blocks"))
    network.total_transactions = _safe_int(d.get("transactions"))
    network.txs_per_day = _safe_int(d.get("transactions_24h"))
    network.total_addresses = _safe_int(d.get("hodling_addresses"))

    # TPS من mempool
    tps = d.get("mempool_tps")
    if tps:
        network.tps = round(float(tps), 3)

    # حجم البلوكتشين بالـ GB
    size_bytes = d.get("blockchain_size")
    if size_bytes:
        network.blockchain_size_gb = round(int(size_bytes) / (1024 ** 3), 2)

    # ── الرسوم ──
    transactions.avg_tx_fee_usd = _safe_float(d.get("average_transaction_fee_usd_24h"))
    transactions.median_tx_fee_usd = _safe_float(d.get("median_transaction_fee_usd_24h"))
    suggested = d.get("suggested_transaction_fee_per_byte_sat")
    if suggested:
        transactions.suggested_fee_per_byte = _safe_int(suggested)

    # Mempool
    transactions.pending_txs = _safe_int(d.get("mempool_transactions"))

    # ── السعر والسوق ──
    tokens.native_price_usd = _safe_float(d.get("market_price_usd"))
    tokens.native_price_btc = 1.0
    tokens.native_price_change_pct = _safe_float(
        d.get("market_price_usd_change_24h_percentage")
    )
    tokens.native_market_cap = _safe_float(d.get("market_cap_usd"))
    tokens.market_dominance_pct = _safe_float(
        d.get("market_dominance_percentage")
    )

    # ── المعروض ──
    circulation_sat = d.get("circulation")
    if circulation_sat:
        wallets.total_supply = round(int(circulation_sat) / 1e8, 8)

    # ── supply_details — بيانات حصرية ──
    sd = {}

    hashrate = d.get("hashrate_24h")
    if hashrate:
        sd["hashrate_24h"] = str(hashrate)
        # تحويل إلى EH/s
        try:
            sd["hashrate_eh_s"] = round(float(hashrate) / 1e18, 2)
        except (ValueError, TypeError):
            pass

    difficulty = d.get("difficulty")
    if difficulty:
        sd["difficulty"] = float(difficulty)
        sd["difficulty_t"] = round(float(difficulty) / 1e12, 2)

    next_diff = d.get("next_difficulty_estimate")
    if next_diff:
        sd["next_difficulty_estimate"] = float(next_diff)

    next_retarget = d.get("next_retarget_time_estimate")
    if next_retarget:
        sd["next_retarget_time"] = str(next_retarget)

    inflation = d.get("inflation_24h")
    if inflation:
        sd["inflation_24h_btc"] = round(int(inflation) / 1e8, 8)

    inflation_usd = d.get("inflation_usd_24h")
    if inflation_usd:
        sd["inflation_usd_24h"] = float(inflation_usd)

    cdd = d.get("cdd_24h")
    if cdd:
        sd["cdd_24h"] = float(cdd)  # Coin-Days Destroyed

    volume = d.get("volume_24h")
    if volume:
        sd["volume_24h_btc"] = round(int(volume) / 1e8, 2)

    mempool_size = d.get("mempool_size")
    if mempool_size:
        sd["mempool_size_mb"] = round(int(mempool_size) / (1024 * 1024), 2)

    mempool_fee = d.get("mempool_total_fee_usd")
    if mempool_fee:
        sd["mempool_total_fee_usd"] = float(mempool_fee)

    blocks_24h = d.get("blocks_24h")
    if blocks_24h:
        sd["blocks_24h"] = int(blocks_24h)

    largest_tx = d.get("largest_transaction_24h")
    if largest_tx:
        sd["largest_tx_24h"] = largest_tx

    if sd:
        wallets.supply_details = sd

    # ── العقد ──
    health.total_nodes = _safe_int(d.get("nodes"))

    result = {}
    result["network"] = network
    result["transactions"] = transactions
    result["tokens"] = tokens
    result["wallets"] = wallets
    result["health"] = health
    return result


def parse_bitcoin_blockchain_stats(data: dict) -> dict:
    """
    تحليل api.blockchain.info/stats
    حقول حصرية: miners_revenue + trade_volume
    """
    wallets = WalletMetrics()
    network = NetworkBasics()

    sd = {}

    # إيراد المُعدّنين
    miners_rev_usd = data.get("miners_revenue_usd")
    if miners_rev_usd:
        sd["miners_revenue_usd"] = float(miners_rev_usd)

    miners_rev_btc = data.get("miners_revenue_btc")
    if miners_rev_btc:
        sd["miners_revenue_btc"] = round(float(miners_rev_btc) / 1e8, 8) \
            if miners_rev_btc > 1000 else float(miners_rev_btc)

    # حجم التداول
    trade_vol_btc = data.get("trade_volume_btc")
    if trade_vol_btc:
        sd["trade_volume_btc"] = float(trade_vol_btc)

    trade_vol_usd = data.get("trade_volume_usd")
    if trade_vol_usd:
        sd["trade_volume_usd"] = float(trade_vol_usd)

    # estimated transaction volume
    est_vol = data.get("estimated_transaction_volume_usd")
    if est_vol:
        sd["estimated_tx_volume_usd"] = float(est_vol)

    # متوسط وقت البلوك
    mins = data.get("minutes_between_blocks")
    if mins:
        network.avg_block_time_seconds = round(float(mins) * 60, 1)
        sd["minutes_between_blocks"] = float(mins)

    # blocks size 24h
    blocks_size = data.get("blocks_size")
    if blocks_size:
        sd["blocks_size_24h_mb"] = round(int(blocks_size) / (1024 * 1024), 2)

    if sd:
        wallets.supply_details = sd

    result = {}
    if network.avg_block_time_seconds:
        result["network"] = network
    result["wallets"] = wallets
    return result


def parse_bitcoin_mempool_fees(data: dict) -> dict:
    """
    تحليل mempool.space/api/v1/fees/recommended
    رسوم دقيقة بالـ sat/vB
    """
    transactions = TransactionMetrics()

    # sat/vB → نمثلها كـ gas_price (نفس المفهوم)
    transactions.gas_price_high = _safe_float(data.get("fastestFee"))  # أسرع
    transactions.gas_price_avg = _safe_float(data.get("halfHourFee"))  # نصف ساعة
    transactions.gas_price_low = _safe_float(data.get("economyFee"))   # اقتصادي

    return {"transactions": transactions}


def parse_bitcoin_mempool_pools(data: dict) -> dict:
    """
    تحليل mempool.space/api/v1/mining/pools/1w
    أكبر Mining Pools — نخزنها كـ top_accounts
    """
    wallets = WalletMetrics()

    pools = data.get("pools", [])
    total_blocks = data.get("blockCount", 0)

    accounts = []
    for pool in pools[:25]:  # أكبر 25 pool
        pct = None
        if total_blocks > 0:
            bc = pool.get("blockCount", 0)
            pct = round(bc / total_blocks * 100, 2)

        acc = AccountInfo(
            rank=pool.get("rank", 0),
            address=pool.get("slug", ""),
            label=pool.get("name", "Unknown"),
            balance=float(pool.get("blockCount", 0)),
            percentage=pct,
            tx_count=pool.get("blockCount"),
        )
        accounts.append(acc)

    wallets.top_accounts = accounts

    # hashrate في supply_details
    sd = {}
    hashrate = data.get("lastEstimatedHashrate")
    if hashrate:
        sd["hashrate_1w"] = str(hashrate)
        try:
            sd["hashrate_1w_eh_s"] = round(float(hashrate) / 1e18, 2)
        except (ValueError, TypeError):
            pass

    hashrate_avg = data.get("lastEstimatedHashrate1w")
    if hashrate_avg:
        try:
            sd["hashrate_avg_1w_eh_s"] = round(float(hashrate_avg) / 1e18, 2)
        except (ValueError, TypeError):
            pass

    sd["total_pools"] = len(pools)
    sd["total_blocks_1w"] = total_blocks
    wallets.supply_details = sd

    return {"wallets": wallets}


def parse_bitcoin_mempool_lightning(data: dict) -> dict:
    """
    تحليل mempool.space/api/v1/lightning/statistics/latest
    بيانات شبكة Lightning Network
    """
    ln = data.get("latest", data)

    lightning = LightningMetrics(
        channel_count=_safe_int(ln.get("channel_count")),
        node_count=_safe_int(ln.get("node_count")),
        tor_nodes=_safe_int(ln.get("tor_nodes")),
        clearnet_nodes=_safe_int(ln.get("clearnet_nodes")),
        unannounced_nodes=_safe_int(ln.get("unannounced_nodes")),
        avg_capacity_sat=_safe_int(ln.get("avg_capacity")),
        avg_fee_rate=_safe_int(ln.get("avg_fee_rate")),
        avg_base_fee_mtokens=_safe_int(ln.get("avg_base_fee_mtokens")),
        med_capacity_sat=_safe_int(ln.get("med_capacity")),
        med_fee_rate=_safe_int(ln.get("med_fee_rate")),
        clearnet_tor_nodes=_safe_int(ln.get("clearnet_tor_nodes")),
    )

    # total_capacity بالـ satoshis → BTC
    capacity_sat = ln.get("total_capacity")
    if capacity_sat:
        lightning.total_capacity_btc = round(int(capacity_sat) / 1e8, 4)

    return {"lightning": lightning}


# ═══════════════════════════════════════════════════════════════
# 🔧 خريطة المحللات
# ═══════════════════════════════════════════════════════════════

PARSER_MAP = {
    # Celestia
    ("celestia", "head"): parse_celestia_head,
    # Stacks
    ("stacks", "info"): parse_stacks_info,
    ("stacks", "extended"): parse_stacks_extended,
    # Litecoin
    ("litecoin", "pools"): parse_litecoin_pools,
    ("litecoin", "difficulty"): parse_litecoin_difficulty,
    ("litecoin", "blocks_tip"): parse_litecoin_blocks_tip,
    ("litecoin", "hashrate"): parse_litecoin_hashrate,
    # Tezos
    ("tezos", "head"): parse_tezos_head,
    ("tezos", "statistics"): parse_tezos_statistics,
    # Hedera
    ("hedera", "supply"): parse_hedera_supply,
    ("hedera", "blocks"): parse_hedera_blocks,
    # Aptos
    ("aptos", "ledger"): parse_aptos_ledger,
    # IOTA
    ("iota", "info"): parse_iota_info,
    # Telos
    ("telos", "info"): parse_telos_info,
    # Radix
    ("radix", "status"): parse_radix_status,
    ("radix", "config"): parse_radix_config,
    # Theta
    ("theta", "blocks"): parse_theta_blocks,
    # Bitcoin (3 مصادر: Blockchair + Blockchain.com + Mempool.space)
    ("bitcoin", "blockchair_stats"): parse_bitcoin_blockchair_stats,
    ("bitcoin", "blockchain_stats"): parse_bitcoin_blockchain_stats,
    ("bitcoin", "mempool_fees"): parse_bitcoin_mempool_fees,
    ("bitcoin", "mempool_pools"): parse_bitcoin_mempool_pools,
    ("bitcoin", "mempool_lightning"): parse_bitcoin_mempool_lightning,
}


def get_parser(chain_key: str, endpoint: str):
    """الحصول على المحلل المناسب"""
    return PARSER_MAP.get((chain_key, endpoint))


def _safe_int(val) -> Optional[int]:
    """تحويل آمن إلى int"""
    if val is None:
        return None
    try:
        return int(val)
    except (ValueError, TypeError):
        try:
            return int(float(str(val)))
        except (ValueError, TypeError):
            return None


def _safe_float(val) -> Optional[float]:
    """تحويل آمن إلى float"""
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None
