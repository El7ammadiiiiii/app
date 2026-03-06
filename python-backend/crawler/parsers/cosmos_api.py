"""
🔵 محللات API عائلة Cosmos — LCD REST API Parsers
══════════════════════════════════════════════════
يحلل استجابات Cosmos LCD REST API عبر rest.cosmos.directory:
  - blocks_latest → ارتفاع البلوك الأخير، وقته
  - node_info → معلومات العقدة، إصدار الشبكة
  - staking_pool → التوكنات المرتبطة/غير المرتبطة
  - staking_params → معلمات التخزين
  - validators → قائمة المدققين النشطين
  - chain_registry → بيانات التسجيل من cosmos.directory
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from ..models import (
    NetworkBasics,
    TransactionMetrics,
    TokenMetrics,
    WalletMetrics,
    ContractMetrics,
    NetworkHealth,
    AccountInfo,
)


def parse_blocks_latest(data: dict) -> dict:
    """
    تحليل /cosmos/base/tendermint/v1beta1/blocks/latest
    
    يُرجع:
      network: NetworkBasics — ارتفاع البلوك، وقت البلوك
    """
    block = data.get("block", {})
    header = block.get("header", {})

    if not header:
        return {}

    network = NetworkBasics()

    # ── ارتفاع البلوك ──
    height = header.get("height")
    if height:
        network.total_blocks = _safe_int(height)

    # ── وقت البلوك ──
    time_str = header.get("time")
    if time_str:
        try:
            # تقريب وقت البلوك من الفرق بين أوقات البلوكات
            # هذا وقت البلوك الأخير — سنحسب avg block time من معلومات أخرى
            pass
        except Exception:
            pass

    return {"network": network} if network.total_blocks else {}


def parse_node_info(data: dict) -> dict:
    """
    تحليل /cosmos/base/tendermint/v1beta1/node_info
    
    يُرجع:
      health: NetworkHealth — إصدار البرنامج
    """
    node_info = data.get("default_node_info", {})
    app_version = data.get("application_version", {})

    if not node_info and not app_version:
        return {}

    health = NetworkHealth()

    # معلومات إضافية في supply_details
    extra = {}

    network_name = node_info.get("network", "")
    if network_name:
        extra["chain_id"] = network_name

    version = app_version.get("version", "")
    if version:
        extra["software_version"] = version

    app_name = app_version.get("app_name", "")
    if app_name:
        extra["app_name"] = app_name

    return {"extra": extra} if extra else {}


def parse_staking_pool(data: dict, decimals: int = 6) -> dict:
    """
    تحليل /cosmos/staking/v1beta1/pool
    
    يُرجع:
      contracts: ContractMetrics — التخزين (bonded + not_bonded)
      wallets: WalletMetrics — تفاصيل العرض
    """
    pool = data.get("pool", {})
    if not pool:
        return {}

    contracts = ContractMetrics()
    wallets = WalletMetrics()

    bonded = pool.get("bonded_tokens")
    not_bonded = pool.get("not_bonded_tokens")

    if bonded:
        try:
            bonded_val = int(bonded) / (10 ** decimals)
            contracts.staking_balance = bonded_val
        except (ValueError, TypeError):
            pass

    if bonded and not_bonded:
        try:
            b = int(bonded) / (10 ** decimals)
            nb = int(not_bonded) / (10 ** decimals)
            total = b + nb
            wallets.total_supply = total
            wallets.supply_details["bonded"] = b
            wallets.supply_details["not_bonded"] = nb

            if total > 0:
                contracts.staking_pct = round((b / total) * 100, 2)
        except (ValueError, TypeError):
            pass

    result = {}
    if contracts.staking_balance:
        result["contracts"] = contracts
    if wallets.total_supply:
        result["wallets"] = wallets

    return result


def parse_staking_params(data: dict) -> dict:
    """
    تحليل /cosmos/staking/v1beta1/params
    
    يُرجع:
      extra: dict — معلمات التخزين
    """
    params = data.get("params", {})
    if not params:
        return {}

    extra = {}

    unbonding = params.get("unbonding_time")
    if unbonding:
        # تحويل "1814400s" → أيام
        try:
            seconds = int(unbonding.replace("s", ""))
            extra["unbonding_days"] = round(seconds / 86400, 1)
        except (ValueError, TypeError):
            pass

    max_validators = params.get("max_validators")
    if max_validators:
        extra["max_validators"] = max_validators

    bond_denom = params.get("bond_denom")
    if bond_denom:
        extra["bond_denom"] = bond_denom

    min_commission = params.get("min_commission_rate")
    if min_commission:
        try:
            extra["min_commission_pct"] = round(float(min_commission) * 100, 2)
        except (ValueError, TypeError):
            pass

    return {"extra": extra} if extra else {}


def parse_validators(data: dict, decimals: int = 6) -> dict:
    """
    تحليل /cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED
    
    يُرجع:
      wallets: WalletMetrics — أكبر المدققين
      health: NetworkHealth — عدد المدققين
    """
    validators = data.get("validators", [])
    if not validators:
        return {}

    wallets = WalletMetrics()
    health = NetworkHealth()
    accounts = []

    # ترتيب حسب التوكنات
    sorted_vals = sorted(
        validators,
        key=lambda v: int(v.get("tokens", "0")),
        reverse=True,
    )

    for i, v in enumerate(sorted_vals[:20]):
        description = v.get("description", {})
        moniker = description.get("moniker", f"Validator #{i + 1}")
        operator = v.get("operator_address", "")

        tokens_raw = v.get("tokens", "0")
        try:
            balance = int(tokens_raw) / (10 ** decimals)
        except (ValueError, TypeError):
            balance = 0

        commission_rate = "0"
        commission = v.get("commission", {})
        rates = commission.get("commission_rates", {})
        commission_rate = rates.get("rate", "0")

        try:
            comm_pct = round(float(commission_rate) * 100, 2)
        except (ValueError, TypeError):
            comm_pct = 0

        accounts.append(AccountInfo(
            rank=i + 1,
            address=operator,
            label=moniker,
            balance=balance,
            percentage=comm_pct,  # نستخدم percentage لحفظ العمولة
        ))

    if accounts:
        wallets.top_accounts = accounts

    # عدد المدققين النشطين
    pagination = data.get("pagination", {})
    total = pagination.get("total")
    if total:
        health.total_nodes = _safe_int(total)
    else:
        health.total_nodes = len(validators)

    result = {}
    if accounts:
        result["wallets"] = wallets
    if health.total_nodes:
        result["health"] = health

    return result


def parse_chain_registry(data: dict) -> dict:
    """
    تحليل chains.cosmos.directory/{chain}
    
    يُرجع:
      extra: dict — بيانات metadata من التسجيل
    """
    chain = data.get("chain", {})
    if not chain:
        return {}

    extra = {}

    pretty_name = chain.get("pretty_name")
    if pretty_name:
        extra["pretty_name"] = pretty_name

    status = chain.get("status")
    if status:
        extra["status"] = status

    network_type = chain.get("network_type")
    if network_type:
        extra["network_type"] = network_type

    # Fees
    fees = chain.get("fees", {})
    fee_tokens = fees.get("fee_tokens", [])
    if fee_tokens:
        first_fee = fee_tokens[0]
        extra["avg_gas_price"] = first_fee.get("average_gas_price")
        extra["low_gas_price"] = first_fee.get("low_gas_price")
        extra["high_gas_price"] = first_fee.get("high_gas_price")

    return {"extra": extra} if extra else {}


# ═══════════════════════════════════════════════════════════════
# 🔧 دوال مساعدة  
# ═══════════════════════════════════════════════════════════════

PARSER_MAP = {
    "blocks_latest": parse_blocks_latest,
    "node_info": parse_node_info,
    "staking_pool": parse_staking_pool,
    "staking_params": parse_staking_params,
    "validators": parse_validators,
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
