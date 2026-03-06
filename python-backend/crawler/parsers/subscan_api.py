"""
🟣 محللات API عائلة Subscan — POST API Parsers
═══════════════════════════════════════════════
يحلل استجابات Subscan POST API:
  - metadata → بيانات الشبكة (بلوكات، محافظ، معاملات)
  - token → بيانات العملة (سعر، عرض، staking)
  - validators → قائمة المدققين
  - daily → إحصائيات يومية
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
)


def parse_metadata(data: dict) -> dict:
    """
    تحليل /api/scan/metadata
    
    يُرجع:
      network: NetworkBasics — بلوكات، محافظ، معاملات
      health: NetworkHealth — المدققون
      contracts: ContractMetrics — التخزين
    """
    d = data.get("data", {})
    if not d:
        return {}

    network = NetworkBasics()
    health = NetworkHealth()
    contracts = ContractMetrics()

    # ── بلوكات ──
    block_num = d.get("blockNum") or d.get("finalized_blockNum")
    if block_num:
        network.total_blocks = _safe_int(block_num)

    avg_bt = d.get("avgBlockTime")
    if avg_bt:
        try:
            network.avg_block_time_seconds = round(float(avg_bt), 3)
        except (ValueError, TypeError):
            pass

    # ── محافظ ──
    total_accounts = d.get("count_account_all")
    if total_accounts:
        network.total_addresses = _safe_int(total_accounts)

    active_accounts = d.get("count_account")
    if active_accounts:
        network.active_addresses_daily = _safe_int(active_accounts)

    # ── معاملات ──
    total_extrinsics = d.get("count_signed_extrinsic")
    if total_extrinsics:
        network.total_transactions = _safe_int(total_extrinsics)

    # TPS
    tps = d.get("tps_15min")
    if tps:
        try:
            tps_val = float(tps)
            if tps_val > 0:
                network.tps = round(tps_val, 2)
        except (ValueError, TypeError):
            pass

    # ── المدققون ──
    validator_count = d.get("current_validator_count") or d.get("validator_count")
    if validator_count:
        health.total_nodes = _safe_int(validator_count)

    # ── التخزين (إذا متوفر في metadata) ──
    # نُحدث لاحقاً من token endpoint

    result = {"network": network, "health": health}

    # إضافة بيانات إضافية
    waiting = d.get("waiting_validator")
    if waiting:
        health.total_nodes = (_safe_int(validator_count) or 0) + (_safe_int(waiting) or 0)

    return result


def parse_token(data: dict, decimals: int = 10) -> dict:
    """
    تحليل /api/scan/token
    
    يُرجع:
      tokens: TokenMetrics — سعر، عرض، تغيّر السعر
      wallets: WalletMetrics — العرض الكلي، تفاصيل العرض
      contracts: ContractMetrics — التخزين
    """
    d = data.get("data", {})
    if not d:
        return {}

    detail = d.get("detail", {})
    token_list = d.get("token", [])

    tokens = TokenMetrics()
    wallets = WalletMetrics()
    contracts = ContractMetrics()

    # أول عملة (عادة العملة الأصلية)
    if token_list and isinstance(token_list, list) and len(token_list) > 0:
        symbol = token_list[0]
        info = detail.get(symbol, {})

        # ── السعر ──
        price = info.get("price")
        if price:
            try:
                tokens.native_price_usd = float(price)
            except (ValueError, TypeError):
                pass

        # ── تغيّر السعر ──
        price_change = info.get("price_change")
        if price_change:
            try:
                tokens.native_price_change_pct = round(float(price_change) * 100, 2)
            except (ValueError, TypeError):
                pass

        # ── العرض الكلي ──
        total_issuance = info.get("total_issuance")
        if total_issuance:
            try:
                raw = int(total_issuance)
                wallets.total_supply = raw / (10 ** decimals)
            except (ValueError, TypeError):
                pass

        # ── التضخم ──
        inflation = info.get("inflation")
        if inflation:
            wallets.supply_details["inflation_pct"] = inflation

        # ── تفاصيل العرض ──
        supply_details = {}
        for key in ["free_balance", "available_balance", "reserved_balance",
                     "locked_balance", "treasury_balance"]:
            val = info.get(key)
            if val and val != "0":
                try:
                    supply_details[key] = int(val) / (10 ** decimals)
                except (ValueError, TypeError):
                    pass
        if supply_details:
            wallets.supply_details.update(supply_details)

        # ── التخزين ──
        validator_bonded = info.get("validator_bonded", "0")
        nominator_bonded = info.get("nominator_bonded", "0")
        try:
            v_bond = int(validator_bonded) / (10 ** decimals)
            n_bond = int(nominator_bonded) / (10 ** decimals)
            total_staked = v_bond + n_bond
            if total_staked > 0:
                contracts.staking_balance = total_staked
                if wallets.total_supply and wallets.total_supply > 0:
                    contracts.staking_pct = round(
                        (total_staked / wallets.total_supply) * 100, 2
                    )
        except (ValueError, TypeError):
            pass

    result = {}
    if tokens.native_price_usd:
        result["tokens"] = tokens
    if wallets.total_supply:
        result["wallets"] = wallets
        # حساب القيمة السوقية
        if tokens.native_price_usd and wallets.total_supply:
            tokens.native_market_cap = round(
                tokens.native_price_usd * wallets.total_supply, 0
            )
            result["tokens"] = tokens
    if contracts.staking_balance:
        result["contracts"] = contracts

    return result


def parse_validators(data: dict, decimals: int = 10) -> dict:
    """
    تحليل /api/scan/staking/validators
    
    يُرجع:
      wallets: WalletMetrics — أكبر المدققين كأكبر المحافظ
    """
    d = data.get("data", {})
    if not d:
        return {}

    validators = d.get("list", [])
    if not validators:
        return {}

    wallets = WalletMetrics()
    accounts = []

    for i, v in enumerate(validators[:20]):
        stash = v.get("stash_account_display", {})
        address = stash.get("address", "")
        people = stash.get("people", {})
        display = people.get("display", "")

        bonded_total = v.get("bonded_total", "0")
        try:
            balance = int(bonded_total) / (10 ** decimals)
        except (ValueError, TypeError):
            balance = 0

        nominators = v.get("count_nominators", 0)

        accounts.append(AccountInfo(
            rank=i + 1,
            address=address,
            label=display or f"Validator #{i + 1}",
            balance=balance,
            tx_count=nominators,
        ))

    if accounts:
        wallets.top_accounts = accounts

    return {"wallets": wallets} if accounts else {}


def parse_daily(data: dict) -> dict:
    """
    تحليل /api/scan/daily
    
    يُرجع:
      network: NetworkBasics — معاملات يومية
    """
    d = data.get("data", {})
    if not d:
        return {}

    daily_list = d.get("list", [])
    if not daily_list:
        return {}

    network = NetworkBasics()

    # آخر يوم في القائمة
    last = daily_list[-1] if daily_list else None
    if last:
        total = last.get("total")
        if total:
            network.txs_per_day = _safe_int(total)

    return {"network": network} if network.txs_per_day else {}


# ═══════════════════════════════════════════════════════════════
# 🔧 دوال مساعدة
# ═══════════════════════════════════════════════════════════════

PARSER_MAP = {
    "metadata": parse_metadata,
    "token": parse_token,
    "validators": parse_validators,
    "daily": parse_daily,
}


def get_parser(endpoint: str):
    """الحصول على المحلل المناسب لنقطة API"""
    return PARSER_MAP.get(endpoint)


def _safe_int(val) -> Optional[int]:
    """تحويل آمن إلى int"""
    if val is None:
        return None
    try:
        return int(val)
    except (ValueError, TypeError):
        try:
            return int(float(val))
        except (ValueError, TypeError):
            return None
