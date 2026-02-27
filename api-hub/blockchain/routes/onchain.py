from __future__ import annotations

import asyncio
import logging
import os
import time
import re
from typing import Any, Dict, List, Optional, Tuple
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from config import API_KEYS
from providers.base import shorten_address
from providers.etherscan_v2.client import EtherscanV2Client
from providers.etherscan_v2.chains import ETHERSCAN_V2_CHAINS
from providers.non_evm.client import NON_EVM_CHAINS as NON_EVM_CHAIN_INFO, NonEVMClient
from providers.bitcoin.client import BitcoinClient
from utils.caip import make_caip10, parse_caip10, get_chain_info as get_caip_chain_info

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/onchain", tags=["Onchain"])


_TRACE_VERBOSE = os.getenv("TRACE_VERBOSE", "0").strip().lower() in {"1", "true", "yes", "on"}


def _trace_log(message: str) -> None:
    """Log verbose trace details only when TRACE_VERBOSE=1."""
    if _TRACE_VERBOSE:
        logger.info(message)
    else:
        logger.debug(message)


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _parse_chain_uid(chain_uid: str) -> Tuple[str, Optional[int], Optional[str]]:
    if chain_uid.startswith("eip155:"):
        parts = chain_uid.split(":")
        if len(parts) >= 2:
            return "evm", int(parts[1]), None
    # Bitcoin (CAIP-122: bip122:000000000019d6689c085ae165831e93)
    if chain_uid.startswith("bip122:") or chain_uid.startswith("bitcoin:"):
        return "non-evm", None, "bitcoin"
    # Non-EVM chains (solana, tron, etc)
    if chain_uid.startswith("non-evm:") or chain_uid.startswith("non_evm:"):
        parts = chain_uid.split(":")
        if len(parts) >= 2:
            return "non-evm", None, parts[1]
    # Direct chain names (fallback)
    if chain_uid in ["solana", "tron", "ton", "xrp"]:
        return "non-evm", None, chain_uid
    # Common EVM chain names → chain IDs
    _COMMON_EVM_NAMES = {
        "ethereum": 1, "eth": 1,
        "bsc": 56, "binance": 56, "bnb": 56,
        "polygon": 137, "matic": 137,
        "arbitrum": 42161,
        "optimism": 10,
        "avalanche": 43114, "avax": 43114,
        "base": 8453,
        "fantom": 250, "ftm": 250,
        "gnosis": 100, "xdai": 100,
        "celo": 42220,
        "cronos": 25,
        "zksync": 324,
        "linea": 59144,
        "scroll": 534352,
        "mantle": 5000,
        "blast": 81457,
    }
    if chain_uid.lower() in _COMMON_EVM_NAMES:
        return "evm", _COMMON_EVM_NAMES[chain_uid.lower()], None
    # Common non-EVM names
    if chain_uid.lower() in ["bitcoin", "btc"]:
        return "non-evm", None, "bitcoin"
    return "unknown", None, None


def _make_chain_uid(chain_id: int) -> str:
    """Create CAIP-2 chain identifier"""
    return f"eip155:{chain_id}"


def _make_account_id(chain_uid: str, address: str) -> str:
    """Create CAIP-10 account identifier"""
    # Extract chain_id from chain_uid (e.g., "eip155:1" -> "1")
    chain_id = chain_uid.split(":")[-1] if ":" in chain_uid else chain_uid
    return make_caip10(address.lower(), chain_id)


def _format_value_label(value_raw: str, decimals: Optional[int], symbol: Optional[str]) -> str:
    """تنسيق قيمة المبلغ للعرض على السهم"""
    try:
        value = int(value_raw)
        if value == 0:
            return ""
        
        # تحويل من Wei إلى القيمة الحقيقية
        decimals = decimals or 18
        real_value = value / (10 ** decimals)
        
        # تنسيق العرض
        if real_value >= 1_000_000:
            formatted = f"{real_value / 1_000_000:.2f}M"
        elif real_value >= 1_000:
            formatted = f"{real_value / 1_000:.2f}K"
        elif real_value >= 1:
            formatted = f"{real_value:.4f}"
        elif real_value >= 0.0001:
            formatted = f"{real_value:.6f}"
        else:
            formatted = f"{real_value:.8f}"
        
        # إضافة الرمز
        if symbol:
            return f"{formatted} {symbol}"
        return formatted
    except:
        return ""


def _capabilities_evm() -> Dict[str, bool]:
    return {
        "balances": True,
        "transactions": True,
        "internalTransactions": True,
        "tokenTransfersErc20": True,
        "tokenTransfersErc721": True,
        "tokenTransfersErc1155": True,
        "logs": True,
        "contractMetadata": True,
        "rateLimited": True,
    }


def _capabilities_non_evm(chain_key: str) -> Dict[str, bool]:
    supports_txs = chain_key in {"litecoin", "tron", "ton"}
    return {
        "balances": True,
        "transactions": supports_txs,
        "internalTransactions": False,
        "tokenTransfersErc20": False,
        "tokenTransfersErc721": False,
        "tokenTransfersErc1155": False,
        "logs": False,
        "contractMetadata": False,
        "rateLimited": True,
    }


def _get_enabled_defaults() -> set[int]:
    return {1, 137, 42161, 10, 8453}


def _build_registry(view: str = "enabled") -> List[Dict[str, Any]]:
    enabled_defaults = _get_enabled_defaults()
    chains: List[Dict[str, Any]] = []

    for chain_id, info in ETHERSCAN_V2_CHAINS.items():
        chain_uid = _make_chain_uid(chain_id)
        enabled_by_default = chain_id in enabled_defaults

        chains.append({
            "chainUid": chain_uid,
            "chainKey": info.get("name", f"chain_{chain_id}").lower().replace(" ", "_"),
            "displayName": info.get("name", f"Chain {chain_id}"),
            "family": "evm",
            "network": "mainnet",
            "reference": {"eip155ChainId": chain_id},
            "nativeAsset": {
                "symbol": info.get("symbol", "ETH"),
                "decimals": info.get("decimals", 18)
            },
            "sources": [{"provider": "etherscan_v2"}],
            "capabilities": _capabilities_evm(),
            "enabled": enabled_by_default,
            "enabledByDefault": enabled_by_default,
            "disabledReasons": [] if enabled_by_default else ["disabled_by_default"],
        })

    for chain_key, info in NON_EVM_CHAIN_INFO.items():
        chain_uid = f"non-evm:{chain_key}"
        chains.append({
            "chainUid": chain_uid,
            "chainKey": chain_key,
            "displayName": info.get("name", chain_key),
            "family": "utxo" if chain_key in {"litecoin", "dogecoin"} else "account",
            "network": "mainnet",
            "reference": {"chain": chain_key},
            "nativeAsset": {
                "symbol": info.get("symbol", ""),
                "decimals": info.get("decimals", 0)
            },
            "explorer": {"url": info.get("explorer", "")},
            "sources": [{"provider": "non_evm"}],
            "capabilities": _capabilities_non_evm(chain_key),
            "enabled": False,
            "enabledByDefault": False,
            "disabledReasons": ["tracer_not_supported"],
        })

    if view == "enabled":
        return [c for c in chains if c.get("enabled")]

    return chains


def _aggregate_edges(edges: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    aggregated: Dict[str, Dict[str, Any]] = {}
    for edge in edges:
        key = edge["data"]["id"]
        if key not in aggregated:
            aggregated[key] = edge
        else:
            existing = aggregated[key]
            total = int(existing["data"]["summary"].get("totalValueRaw", "0"))
            total += int(edge["data"]["summary"].get("totalValueRaw", "0"))
            existing["data"]["summary"]["count"] += edge["data"]["summary"]["count"]
            existing["data"]["summary"]["totalValueRaw"] = str(total)
            
            # تحديث valueLabel بعد التجميع
            token = existing["data"]["summary"].get("token")
            symbol = token.get("symbol") if token else "ETH"
            decimals = token.get("decimals") if token else 18
            existing["data"]["valueLabel"] = _format_value_label(str(total), decimals, symbol)
    
    return list(aggregated.values())


# ─────────────────────────────────────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────────────────────────────────────

class TraceBuildRequest(BaseModel):
    chains: List[str]
    start: Dict[str, str]
    direction: str = Field("both")
    maxDepth: int = Field(10, ge=1, le=10)  # مستوى كامل افتراضياً
    limits: Dict[str, int] = Field(default_factory=lambda: {"maxNeighborsPerNode": 25, "maxTotalEdges": 600})
    include: Dict[str, bool] = Field(default_factory=lambda: {
        "nativeTransfers": True,      # دائماً مفعل
        "erc20Transfers": True,        # تلقائي حسب الشبكة
        "internalTransactions": True,  # تلقائي مفعل
    })


class TraceEdgeRequest(BaseModel):
    traceId: str
    edgeId: str
    pagination: Optional[Dict[str, Optional[str]]] = None
    detailLevel: Optional[str] = None


class TraceNodeRequest(BaseModel):
    chainUid: str
    nodeId: str
    include: Dict[str, bool]


# ─────────────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/chains")
async def list_onchain_chains(
    view: str = Query("enabled", pattern="^(enabled|all)$"),
    include_testnets: bool = Query(False, alias="includeTestnets")
):
    chains = _build_registry(view=view)
    return {
        "success": True,
        "data": {
            "registryVersion": "2026-01-30",
            "defaultView": {"enabledOnly": True},
            "chains": chains,
            "includeTestnets": include_testnets,
        },
        "error": None,
    }


@router.post("/trace/build")
async def build_trace(request: TraceBuildRequest):
    try:
        _trace_log(f"Trace build request: chains={request.chains}, start={request.start}, direction={request.direction}")
        
        if not request.chains:
            raise HTTPException(status_code=400, detail="CHAIN_REQUIRED")

        chain_uid = request.chains[0]
        kind, chain_id, chain_key = _parse_chain_uid(chain_uid)

        address = request.start.get("accountId", "").split(":")[-1]
        _trace_log(f"Parsed address: '{address}' from start={request.start}")
        if not address:
            return {
                "success": False,
                "error": {"message": "ADDRESS_REQUIRED"},
            }

        # ═══════════════════════════════════════════════════════════════════
        # EVM CHAINS
        # ═══════════════════════════════════════════════════════════════════
        if kind == "evm" and chain_id is not None:
            if not API_KEYS.ETHERSCAN_API_KEY:
                return {
                    "success": False,
                    "error": {"message": "ETHERSCAN_API_KEY_MISSING"},
                }

            async with EtherscanV2Client(API_KEYS.ETHERSCAN_API_KEY) as client:
                tasks = []
                if request.include.get("nativeTransfers", True):
                    tasks.append(client.get_transactions(address, chain_id=chain_id, page=1, offset=200))
                if request.include.get("internalTransactions", False):
                    tasks.append(client.get_internal_transactions(address, chain_id=chain_id))
                if request.include.get("erc20Transfers", True):
                    tasks.append(client.get_token_transfers(address, chain_id=chain_id))

                _trace_log(f"Fetching {len(tasks)} task(s) for address {address}")
                results = await asyncio.gather(*tasks, return_exceptions=True)
                _trace_log(f"Got {len(results)} results")
                for i, result in enumerate(results):
                    if isinstance(result, Exception):
                        logger.error(f"Task {i} error: {type(result).__name__}: {result}")
                    elif isinstance(result, dict):
                        tx_count = len(result.get("transactions", [])) if "transactions" in result else 0
                        token_count = len(result.get("token_transfers", [])) if "token_transfers" in result else 0
                        _trace_log(f"Task {i}: {tx_count} txs, {token_count} tokens")
                    else:
                        logger.warning(f"Task {i}: unexpected type {type(result)}")

            edges: List[Dict[str, Any]] = []
            nodes: Dict[str, Dict[str, Any]] = {}

            def ensure_node(addr: str, is_center: bool = False) -> None:
                node_id = _make_account_id(chain_uid, addr)
                if node_id not in nodes:
                    nodes[node_id] = {
                        "group": "nodes",
                        "data": {
                            "id": node_id,
                            "chainUid": chain_uid,
                            "address": addr,
                            "label": shorten_address(addr),
                            "isCenter": is_center,  # تحديد العنوان المركزي
                        }
                    }

            # إضافة العنوان المركزي أولاً
            ensure_node(address, is_center=True)

            def add_edge(src: str, dst: str, kind: str, value_raw: str, token: Optional[Dict[str, Any]] = None):
                ensure_node(src)
                ensure_node(dst)
                
                # تنسيق قيمة المبلغ
                symbol = token.get("symbol") if token else "ETH"
                decimals = token.get("decimals") if token else 18
                value_label = _format_value_label(value_raw, decimals, symbol)
                
                # تحديد اتجاه التحويل بالنسبة للعنوان المركزي
                direction = "in" if dst.lower() == address.lower() else "out"
                
                edge_id = f"edge:{chain_uid}:{src.lower()}->{dst.lower()}:{kind}:{token.get('contract') if token else 'native'}"
                edges.append({
                    "group": "edges",
                    "data": {
                        "id": edge_id,
                        "edgeId": edge_id,
                        "source": _make_account_id(chain_uid, src),
                        "target": _make_account_id(chain_uid, dst),
                        "chainUid": chain_uid,
                        "kind": kind,
                        "direction": direction,
                        "valueLabel": value_label,  # قيمة المبلغ للعرض
                        "summary": {
                            "count": 1,
                            "totalValueRaw": value_raw,
                            "token": token,
                        }
                    }
                })

            for result in results:
                if isinstance(result, Exception):
                    logger.error(f"Skipping exception result: {type(result).__name__}: {result}")
                    continue
                
                if not isinstance(result, dict):
                    logger.warning(f"Skipping non-dict result: {type(result)}")
                    continue

                if "transactions" in result:
                    for tx in result.get("transactions", []):
                        src = tx.get("from")
                        dst = tx.get("to")
                        if not src or not dst:
                            continue
                        # Apply direction filter
                        if request.direction == "in":
                            if dst.lower() != address.lower():
                                continue
                        elif request.direction == "out":
                            if src.lower() != address.lower():
                                continue
                        # 'both' passes through without filtering
                        add_edge(src, dst, "native", str(tx.get("value", "0")))

                if "internal_transactions" in result:
                    for tx in result.get("internal_transactions", []):
                        src = tx.get("from")
                        dst = tx.get("to")
                        if not src or not dst:
                            continue
                        # Apply direction filter
                        if request.direction == "in":
                            if dst.lower() != address.lower():
                                continue
                        elif request.direction == "out":
                            if src.lower() != address.lower():
                                continue
                        # 'both' passes through without filtering
                        add_edge(src, dst, "internal", str(tx.get("value", "0")))

                if "token_transfers" in result:
                    for tx in result.get("token_transfers", []):
                        src = tx.get("from")
                        dst = tx.get("to")
                        if not src or not dst:
                            continue
                        # Apply direction filter
                        if request.direction == "in":
                            if dst.lower() != address.lower():
                                continue
                        elif request.direction == "out":
                            if src.lower() != address.lower():
                                continue
                        # 'both' passes through without filtering
                        token = {
                            "contract": f"{chain_uid}:{tx.get('contractAddress', '')}",
                            "symbol": tx.get("tokenSymbol"),
                            "decimals": int(tx.get("tokenDecimal") or 0) if str(tx.get("tokenDecimal")).isdigit() else None,
                        }
                        add_edge(src, dst, "erc20", str(tx.get("value", "0")), token=token)

            aggregated_edges = _aggregate_edges(edges)
            elements = list(nodes.values()) + aggregated_edges
            
            # Collect warnings
            warnings = []
            error_count = sum(1 for r in results if isinstance(r, Exception))
            if error_count > 0:
                warnings.append(f"{error_count} of {len(results)} data fetch tasks failed. Check logs for details.")
            if len(elements) == 0 and len(results) > 0:
                warnings.append("No transactions found. This could mean: no recent activity, DNS/network issues, or rate limiting.")

            return {
                "success": True,
                "data": {
                    "traceId": f"trace:{chain_uid}:{address.lower()}",
                    "createdAt": int(time.time()),
                    "graph": {
                        "elements": elements,
                        "stats": {
                            "nodes": len(nodes),
                            "edges": len(aggregated_edges),
                            "depthBuilt": 1,
                            "chainsUsed": [chain_uid],
                        }
                    },
                    "warnings": warnings,
                }
            }

        # ═══════════════════════════════════════════════════════════════════
        # NON-EVM CHAINS (Bitcoin, Solana, Tron, etc)
        # ═══════════════════════════════════════════════════════════════════
        elif kind == "non-evm" and chain_key:
            chain_name = chain_key.lower()
            nodes: Dict[str, Dict[str, Any]] = {}
            edges: List[Dict[str, Any]] = []
            warnings = []
            
            def ensure_node_nonevm(addr: str, is_center: bool = False) -> None:
                node_id = f"{chain_uid}:{addr}"
                if node_id not in nodes:
                    nodes[node_id] = {
                        "group": "nodes",
                        "data": {
                            "id": node_id,
                            "chainUid": chain_uid,
                            "address": addr,
                            "label": shorten_address(addr),
                            "isCenter": is_center,
                        }
                    }
            
            def add_edge_nonevm(src: str, dst: str, value: int, symbol: str, decimals: int, tx_hash: str):
                ensure_node_nonevm(src)
                ensure_node_nonevm(dst)
                
                value_label = _format_value_label(str(value), decimals, symbol)
                edge_id = f"edge:{chain_uid}:{src.lower()}->{dst.lower()}:native:{tx_hash[:16]}"
                
                edges.append({
                    "group": "edges",
                    "data": {
                        "id": edge_id,
                        "edgeId": edge_id,
                        "source": f"{chain_uid}:{src}",
                        "target": f"{chain_uid}:{dst}",
                        "chainUid": chain_uid,
                        "kind": "native",
                        "valueLabel": value_label,
                        "summary": {
                            "count": 1,
                            "totalValueRaw": str(value),
                            "token": {"symbol": symbol, "decimals": decimals}
                        }
                    }
                })
            
            ensure_node_nonevm(address, is_center=True)
            
            # ─────────────────────────────────────────────────────────────
            # BITCOIN
            # ─────────────────────────────────────────────────────────────
            if chain_name in ["bitcoin", "btc"]:
                try:
                    async with BitcoinClient() as client:
                        tx_data = await client.get_transactions(address)
                        transactions = tx_data.get("transactions", [])[:50]
                        _trace_log(f"Bitcoin: Found {len(transactions)} transactions")
                        
                        for tx in transactions:
                            tx_hash = tx.get("txid", "")
                            if not tx_hash:
                                continue
                            
                            try:
                                tx_details = await client.get_transaction(tx_hash)
                                
                                for inp in tx_details.get("vin", []):
                                    prevout = inp.get("prevout", {})
                                    sender_addr = prevout.get("scriptpubkey_address")
                                    if not sender_addr:
                                        continue
                                    
                                    for out in tx_details.get("vout", []):
                                        receiver_addr = out.get("scriptpubkey_address")
                                        value_sats = out.get("value", 0)
                                        if not receiver_addr or value_sats <= 0:
                                            continue
                                        
                                        # Apply direction filter
                                        if request.direction == "in":
                                            if receiver_addr.lower() != address.lower():
                                                continue
                                        elif request.direction == "out":
                                            if sender_addr.lower() != address.lower():
                                                continue
                                        
                                        # Check if address is involved
                                        if sender_addr.lower() == address.lower() or receiver_addr.lower() == address.lower():
                                            add_edge_nonevm(sender_addr, receiver_addr, value_sats, "BTC", 8, tx_hash)
                            except Exception as e:
                                logger.warning(f"Failed to get Bitcoin tx details for {tx_hash}: {e}")
                                continue
                except Exception as e:
                    logger.error(f"Bitcoin trace failed: {e}", exc_info=True)
                    warnings.append(f"Bitcoin API error: {str(e)}")
            
            # ─────────────────────────────────────────────────────────────
            # SOLANA
            # ─────────────────────────────────────────────────────────────
            elif chain_name in ["solana", "sol"]:
                try:
                    async with NonEVMClient() as client:
                        balance_data = await client.get_solana_balance(address)
                        _trace_log(f"Solana: Got balance {balance_data.get('balance')} SOL")
                        warnings.append("Solana transaction history requires Helius/Solana RPC - showing balance only")
                except Exception as e:
                    logger.error(f"Solana trace failed: {e}", exc_info=True)
                    warnings.append(f"Solana API error: {str(e)}")
            
            # ─────────────────────────────────────────────────────────────
            # TRON
            # ─────────────────────────────────────────────────────────────
            elif chain_name in ["tron", "trx"]:
                try:
                    async with NonEVMClient() as client:
                        tx_data = await client.get_tron_transactions(address, limit=50)
                        transactions = tx_data.get("transactions", [])
                        _trace_log(f"Tron: Found {len(transactions)} transactions")
                        
                        for tx in transactions:
                            try:
                                raw_data = tx.get("raw_data", {})
                                contracts = raw_data.get("contract", [])
                                tx_hash = tx.get("txID", "")
                                
                                for contract in contracts:
                                    if contract.get("type") == "TransferContract":
                                        value_param = contract.get("parameter", {}).get("value", {})
                                        sender_addr = value_param.get("owner_address", "")
                                        receiver_addr = value_param.get("to_address", "")
                                        amount_sun = value_param.get("amount", 0)
                                        
                                        if sender_addr and receiver_addr and amount_sun > 0:
                                            # Apply direction filter
                                            if request.direction == "in":
                                                if receiver_addr.lower() != address.lower():
                                                    continue
                                            elif request.direction == "out":
                                                if sender_addr.lower() != address.lower():
                                                    continue
                                            
                                            add_edge_nonevm(sender_addr, receiver_addr, amount_sun, "TRX", 6, tx_hash)
                            except Exception as e:
                                logger.warning(f"Failed to parse Tron tx: {e}")
                                continue
                except Exception as e:
                    logger.error(f"Tron trace failed: {e}", exc_info=True)
                    warnings.append(f"Tron API error: {str(e)}")
            else:
                return {
                    "success": False,
                    "error": {"message": f"CHAIN_NOT_SUPPORTED: {chain_name}"},
                }
            
            # Build final response
            aggregated_edges = _aggregate_edges(edges)
            elements = list(nodes.values()) + aggregated_edges
            
            if len(elements) == 1 and len(warnings) == 0:
                warnings.append("No transactions found for this address")
            
            return {
                "success": True,
                "data": {
                    "traceId": f"trace:{chain_uid}:{address.lower()}",
                    "createdAt": int(time.time()),
                    "graph": {
                        "elements": elements,
                        "stats": {
                            "nodes": len(nodes),
                            "edges": len(aggregated_edges),
                            "depthBuilt": 1,
                            "chainsUsed": [chain_uid],
                        }
                    },
                    "warnings": warnings,
                }
            }
        
        # ═══════════════════════════════════════════════════════════════════
        # UNKNOWN CHAIN
        # ═══════════════════════════════════════════════════════════════════
        else:
            return {
                "success": False,
                "error": {"message": "CHAIN_NOT_SUPPORTED"},
            }
            
    except Exception as e:
        logger.error(f"Trace build failed: {e}", exc_info=True)
        return {
            "success": False,
            "error": {"message": f"INTERNAL_ERROR: {str(e)}"},
        }


@router.post("/trace/expand")
async def expand_trace(request: TraceBuildRequest):
    result = await build_trace(request)
    if not result.get("success"):
        return result

    return {
        "success": True,
        "data": {
            "traceId": result["data"]["traceId"],
            "delta": {
                "elementsAdded": result["data"]["graph"]["elements"],
                "elementsUpdated": []
            },
            "stats": {
                "newNodes": result["data"]["graph"]["stats"]["nodes"],
                "newEdges": result["data"]["graph"]["stats"]["edges"],
            }
        }
    }


@router.post("/trace/edge")
async def edge_drilldown(request: TraceEdgeRequest):
    edge_id = request.edgeId
    try:
        raw = edge_id.split("edge:", 1)[1]
        parts = raw.split(":")
        kind = parts[-2]
        token = parts[-1]
        rest = ":".join(parts[:-2])
        chain_uid, pair = rest.rsplit(":", 1)
        src, dst = pair.split("->")
    except Exception:
        return {"success": False, "error": {"message": "EDGE_ID_INVALID"}}

    chain_kind, chain_id, _ = _parse_chain_uid(chain_uid)
    if chain_kind != "evm" or chain_id is None:
        return {"success": False, "error": {"message": "CHAIN_NOT_SUPPORTED"}}

    if not API_KEYS.ETHERSCAN_API_KEY:
        return {"success": False, "error": {"message": "ETHERSCAN_API_KEY_MISSING"}}

    limit = 25
    if request.pagination and request.pagination.get("limit"):
        limit = int(request.pagination.get("limit") or 25)

    async with EtherscanV2Client(API_KEYS.ETHERSCAN_API_KEY) as client:
        if kind == "erc20":
            data = await client.get_token_transfers(src, chain_id=chain_id, contract=token.split(":")[-1])
            items = [tx for tx in data.get("token_transfers", []) if tx.get("to", "").lower() == dst.lower()]
        elif kind == "internal":
            data = await client.get_internal_transactions(src, chain_id=chain_id)
            items = [tx for tx in data.get("internal_transactions", []) if tx.get("to", "").lower() == dst.lower()]
        else:
            data = await client.get_transactions(src, chain_id=chain_id, page=1, offset=200)
            items = [tx for tx in data.get("transactions", []) if tx.get("to", "").lower() == dst.lower()]

    items = items[:limit]

    return {
        "success": True,
        "data": {
            "edge": {
                "edgeId": edge_id,
                "source": _make_account_id(chain_uid, src),
                "target": _make_account_id(chain_uid, dst),
                "chainUid": chain_uid,
                "kind": kind,
                "summary": {
                    "count": len(items),
                }
            },
            "items": items,
            "nextCursor": None,
        }
    }


@router.post("/trace/node")
async def node_details(request: TraceNodeRequest):
    chain_kind, chain_id, _ = _parse_chain_uid(request.chainUid)
    if chain_kind != "evm" or chain_id is None:
        return {"success": False, "error": {"message": "CHAIN_NOT_SUPPORTED"}}

    if not API_KEYS.ETHERSCAN_API_KEY:
        return {"success": False, "error": {"message": "ETHERSCAN_API_KEY_MISSING"}}

    address = request.nodeId.split(":")[-1]
    async with EtherscanV2Client(API_KEYS.ETHERSCAN_API_KEY) as client:
        balance = await client.get_balance(address, chain_id=chain_id)

    return {
        "success": True,
        "data": {
            "node": {
                "nodeId": request.nodeId,
                "chainUid": request.chainUid,
                "address": address,
                "displayLabel": shorten_address(address),
            },
            "balance": balance,
        }
    }


# ─────────────────────────────────────────────────────────────────────────────
# Trace Populate (cways-tracker style auto-refresh)
# ─────────────────────────────────────────────────────────────────────────────

class PopulateRequest(BaseModel):
    uuid: str
    addresses: List[str]
    chains: List[str]
    direction: str = "both"
    since: Optional[int] = None


@router.post("/trace/populate")
async def populate_trace(request: PopulateRequest):
    """
    Auto-populate: fetch new transfers for tracked addresses.
    Called every 10s by the frontend (cways-tracker style).
    Returns only *new* nodes + edges not previously seen.
    """
    new_nodes: List[Dict[str, Any]] = []
    new_edges: List[Dict[str, Any]] = []

    for chain_uid in request.chains[:5]:  # limit chains per poll
        chain_kind, chain_id, non_evm_key = _parse_chain_uid(chain_uid)

        for address in request.addresses[:TRACER_POPULATE_MAX_ADDRESSES]:
            try:
                if chain_kind == "evm" and chain_id is not None:
                    if not API_KEYS.ETHERSCAN_API_KEY:
                        continue
                    async with EtherscanV2Client(API_KEYS.ETHERSCAN_API_KEY) as client:
                        txs = await client.get_normal_transactions(
                            address, chain_id=chain_id, page=1, offset=5
                        )
                    if txs:
                        for tx in txs[:5]:
                            peer = tx.get("to", "") or tx.get("from", "")
                            if not peer or peer.lower() == address.lower():
                                continue
                            peer_lower = peer.lower()
                            value_raw = tx.get("value", "0")
                            value_eth = int(value_raw) / 1e18 if value_raw else 0

                            node_data = {
                                "id": peer_lower,
                                "label": shorten_address(peer),
                                "address": peer,
                                "chain": chain_uid,
                                "type": "unknown",
                                "gridX": 0,
                                "gridY": 0,
                                "x": 0,
                                "y": 0,
                                "isRoot": False,
                                "isSelected": False,
                                "isExpanded": False,
                                "isLoading": False,
                                "flowsIn": 0,
                                "flowsOut": 0,
                                "chainIconUrl": f"/icons/chains/{chain_uid}.png",
                            }
                            new_nodes.append(node_data)

                            is_incoming = tx.get("to", "").lower() == address.lower()
                            edge_data = {
                                "id": f"{tx.get('hash', '')[:16]}",
                                "source": peer_lower if is_incoming else address.lower(),
                                "target": address.lower() if is_incoming else peer_lower,
                                "chain": chain_uid,
                                "direction": "in" if is_incoming else "out",
                                "isCurve": False,
                                "curveOffset": 0,
                                "totalValue": value_eth,
                                "valueLabel": _format_value_label(value_eth, "ETH"),
                                "tokenSymbol": "ETH",
                                "transferCount": 1,
                                "color": "#22c55e" if is_incoming else "#ef4444",
                                "isHighlighted": False,
                            }
                            new_edges.append(edge_data)
            except Exception as e:
                _trace_log(f"Populate error for {address} on {chain_uid}: {e}")
                continue

    # Deduplicate nodes by id
    seen_nodes = set()
    unique_nodes = []
    for n in new_nodes:
        if n["id"] not in seen_nodes:
            seen_nodes.add(n["id"])
            unique_nodes.append(n)

    return {
        "success": True,
        "data": {
            "uuid": request.uuid,
            "newNodes": unique_nodes,
            "newEdges": new_edges,
            "stats": {
                "fetched": len(request.addresses),
                "newTransfers": len(new_edges),
            },
        },
    }


TRACER_POPULATE_MAX_ADDRESSES = 8


# ─────────────────────────────────────────────────────────────────────────────
# Intelligence — Address lookup (entity, labels, balance)
# ─────────────────────────────────────────────────────────────────────────────

import json
from pathlib import Path

_ENTITIES_DATA: Optional[Dict[str, List[Dict]]] = None
_ADDRESS_MAP: Optional[Dict[str, Dict]] = None
_INTEL_INDEX_LOADED: bool = False
_INTEL_INDEX: Dict[str, List[Dict[str, Any]]] = {
    "entities": [],
    "addresses": [],
    "tokens": [],
}
_INTEL_ADDRESS_MAP: Dict[str, Dict[str, Any]] = {}


def _load_entities():
    global _ENTITIES_DATA, _ADDRESS_MAP
    if _ENTITIES_DATA is not None:
        return

    entities_path = Path(__file__).parent.parent.parent.parent / "public" / "data" / "known-entities.json"
    if not entities_path.exists():
        _ENTITIES_DATA = {}
        _ADDRESS_MAP = {}
        return

    with open(entities_path, "r", encoding="utf-8") as f:
        _ENTITIES_DATA = json.load(f)

    _ADDRESS_MAP = {}
    for category, entities in _ENTITIES_DATA.items():
        for entity in entities:
            addr = entity.get("address", "").lower()
            if addr:
                _ADDRESS_MAP[addr] = {
                    "name": entity.get("name", "Unknown"),
                    "type": category.rstrip("s"),  # "exchanges" → "exchange"
                    "icon": entity.get("icon", ""),
                    "address": addr,
                }


def _get_intel_root() -> Optional[Path]:
    """Locate local intel mirror folder across common project layouts."""
    here = Path(__file__).resolve()
    candidates = [
        here.parents[4] / "intel.arkm.com",  # c:/Users/.../elhammadi/intel.arkm.com
        here.parents[3] / "intel.arkm.com",  # c:/.../nexus-webapp/intel.arkm.com (if moved)
        Path.cwd() / "intel.arkm.com",
    ]
    for candidate in candidates:
        if candidate.exists() and candidate.is_dir():
            return candidate
    return None


def _safe_load_json(path: Path) -> Optional[Any]:
    def _sanitize_relaxed_json_text(raw: str) -> str:
        """
        Some archived intel files contain raw newlines inside quoted strings.
        Convert only in-string control characters into escaped forms so json.loads can parse.
        """
        out: List[str] = []
        in_string = False
        escaped = False

        for ch in raw:
            if in_string:
                if escaped:
                    out.append(ch)
                    escaped = False
                    continue

                if ch == "\\":
                    out.append(ch)
                    escaped = True
                    continue

                if ch == '"':
                    out.append(ch)
                    in_string = False
                    continue

                if ch == "\n":
                    out.append("\\n")
                    continue
                if ch == "\r":
                    out.append("\\r")
                    continue
                if ch == "\t":
                    out.append("\\t")
                    continue

                out.append(ch)
                continue

            # not in string
            if ch == '"':
                in_string = True
                out.append(ch)
            else:
                out.append(ch)

        return "".join(out)

    try:
        text = path.read_text(encoding="utf-8", errors="ignore").strip()
        if not text:
            return None
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return json.loads(_sanitize_relaxed_json_text(text))
    except Exception:
        return None


def _append_unique(items: List[Dict[str, Any]], seen: set[str], key: str, payload: Dict[str, Any]) -> None:
    if key in seen:
        return
    seen.add(key)
    items.append(payload)


def _load_intel_index() -> None:
    """Build local search index from intel mirror search/address snapshots."""
    global _INTEL_INDEX_LOADED, _INTEL_INDEX, _INTEL_ADDRESS_MAP
    if _INTEL_INDEX_LOADED:
        return

    _INTEL_INDEX_LOADED = True
    intel_root = _get_intel_root()
    if not intel_root:
        logger.info("intel mirror not found; using known-entities only")
        return

    intelligence_dir = intel_root / "api.arkm.com" / "intelligence"
    if not intelligence_dir.exists():
        return

    entity_seen: set[str] = set()
    address_seen: set[str] = set()
    token_seen: set[str] = set()

    def _clean_text(value: Any) -> str:
        return re.sub(r"\s+", " ", str(value or "")).strip()

    # 1) Parse search snapshots: entities, addresses, token deployments
    for search_file in intelligence_dir.glob("search-*.html"):
        data = _safe_load_json(search_file)
        if not isinstance(data, dict):
            continue

        for ent in data.get("arkhamEntities", []) or []:
            if not isinstance(ent, dict):
                continue
            ent_id = _clean_text(ent.get("id"))
            name = _clean_text(ent.get("name"))
            if not name:
                continue
            search_text = f"{name} {ent_id} {ent.get('type', '')}".lower()
            key = f"entity:{ent_id or name.lower()}"
            _append_unique(
                _INTEL_INDEX["entities"],
                entity_seen,
                key,
                {
                    "kind": "entity",
                    "id": ent_id or name.lower().replace(" ", "-"),
                    "name": name,
                    "type": ent.get("type") or "entity",
                    "searchText": search_text,
                    "source": "intel-search",
                },
            )

        for adr in data.get("arkhamAddresses", []) or []:
            if not isinstance(adr, dict):
                continue
            address = _clean_text(adr.get("address"))
            chain = _clean_text(adr.get("chain")) or "unknown"
            if not address:
                continue
            entity_name = _clean_text((adr.get("arkhamEntity") or {}).get("name") if isinstance(adr.get("arkhamEntity"), dict) else "")
            label_name = _clean_text((adr.get("arkhamLabel") or {}).get("name") if isinstance(adr.get("arkhamLabel"), dict) else "")
            search_text = f"{address} {chain} {entity_name} {label_name}".lower()
            key = f"address:{chain}:{address.lower()}"
            payload = {
                "kind": "address",
                "id": key,
                "address": address,
                "chain": chain,
                "entityName": entity_name or None,
                "label": label_name or None,
                "name": entity_name or label_name or shorten_address(address),
                "searchText": search_text,
                "source": "intel-search",
            }
            _append_unique(_INTEL_INDEX["addresses"], address_seen, key, payload)
            _INTEL_ADDRESS_MAP[address.lower()] = payload

        for token in data.get("tokens", []) or []:
            if not isinstance(token, dict):
                continue
            token_name = _clean_text(token.get("name"))
            symbol = _clean_text(token.get("symbol"))
            pricing_id = ""
            identifier = token.get("identifier")
            if isinstance(identifier, dict):
                pricing_id = _clean_text(identifier.get("pricingID"))

            for dep in token.get("deployments", []) or []:
                if not isinstance(dep, dict):
                    continue
                chain = _clean_text(dep.get("chain"))
                address = _clean_text(dep.get("address"))
                if not address:
                    continue
                key = f"token:{pricing_id or token_name}:{chain}:{address.lower()}"
                search_text = f"{token_name} {symbol} {pricing_id} {chain} {address}".lower()
                _append_unique(
                    _INTEL_INDEX["tokens"],
                    token_seen,
                    key,
                    {
                        "kind": "token",
                        "id": key,
                        "name": token_name or symbol or "Token",
                        "symbol": symbol or None,
                        "pricingId": pricing_id or None,
                        "chain": chain,
                        "address": address,
                        "searchText": search_text,
                        "source": "intel-search",
                    },
                )

    # 2) Parse direct address snapshots for exact address intelligence
    for address_file in intelligence_dir.glob("address/*.html"):
        data = _safe_load_json(address_file)
        if not isinstance(data, dict):
            continue
        address = _clean_text(data.get("address"))
        chain = _clean_text(data.get("chain")) or "unknown"
        if not address:
            continue

        ent = data.get("arkhamEntity") if isinstance(data.get("arkhamEntity"), dict) else {}
        lbl = data.get("arkhamLabel") if isinstance(data.get("arkhamLabel"), dict) else {}
        entity_name = _clean_text(ent.get("name"))
        label_name = _clean_text(lbl.get("name"))
        payload = {
            "kind": "address",
            "id": f"address:{chain}:{address.lower()}",
            "address": address,
            "chain": chain,
            "entityName": entity_name or None,
            "label": label_name or None,
            "name": entity_name or label_name or shorten_address(address),
            "searchText": f"{address} {chain} {entity_name} {label_name}".lower(),
            "source": "intel-address",
        }
        _INTEL_ADDRESS_MAP[address.lower()] = payload

    logger.info(
        "Intel index loaded: entities=%s addresses=%s tokens=%s",
        len(_INTEL_INDEX["entities"]),
        len(_INTEL_INDEX["addresses"]),
        len(_INTEL_INDEX["tokens"]),
    )


@router.get("/intelligence/address/{address}")
async def get_address_intelligence(address: str, chain: str = "ethereum"):
    """Return entity classification and balance for an address."""
    _load_entities()
    _load_intel_index()

    addr_lower = address.lower()
    result: Dict[str, Any] = {
        "address": address,
        "chain": chain,
        "labels": [],
        "tags": [],
    }

    # Check known entities
    if _ADDRESS_MAP and addr_lower in _ADDRESS_MAP:
        entity = _ADDRESS_MAP[addr_lower]
        result["entityName"] = entity["name"]
        result["entityType"] = entity["type"]
        result["entityIconUrl"] = entity.get("icon", "")
    elif addr_lower in _INTEL_ADDRESS_MAP:
        intel = _INTEL_ADDRESS_MAP[addr_lower]
        if intel.get("entityName"):
            result["entityName"] = intel.get("entityName")
            result["entityType"] = "entity"
        if intel.get("label"):
            result["labels"] = [intel.get("label")]
        if intel.get("chain") and chain == "ethereum":
            result["chain"] = intel.get("chain")

    # Try to get balance for EVM
    chain_uid = chain if ":" in chain else f"eip155:1"
    chain_kind, chain_id, _ = _parse_chain_uid(chain_uid)

    if chain_kind == "evm" and chain_id and API_KEYS.ETHERSCAN_API_KEY:
        try:
            async with EtherscanV2Client(API_KEYS.ETHERSCAN_API_KEY) as client:
                balance = await client.get_balance(address, chain_id=chain_id)
                result["balance"] = {
                    "totalUsd": 0,  # Would need price feed
                    "tokens": [{"symbol": "ETH", "amount": balance, "valueUsd": 0}],
                }
        except Exception:
            pass

    return {"success": True, "data": result}


@router.get("/intelligence/search")
async def search_intelligence(q: str = Query("", min_length=1)):
    """Search entities, addresses, and token deployments by keyword."""
    _load_entities()
    _load_intel_index()

    query = q.strip().lower()
    query_tokens = [t for t in re.split(r"\s+", query) if t]
    results: List[Dict[str, Any]] = []
    seen: set[str] = set()

    def _matches(text: str) -> bool:
        text_l = text.lower()
        return all(token in text_l for token in query_tokens)

    def _add(item: Dict[str, Any]) -> None:
        item_id = str(item.get("id") or "")
        if not item_id:
            return
        if item_id in seen:
            return
        seen.add(item_id)
        results.append(item)

    # 1) Known entities (fast local seed)
    for category, entities in (_ENTITIES_DATA or {}).items():
        for entity in entities:
            name = entity.get("name", "")
            text = f"{name} {entity.get('address', '')} {category}"
            if _matches(text):
                _add({
                    "id": f"known:{entity.get('address', '')}",
                    "kind": "entity",
                    "name": name,
                    "type": category.rstrip("s"),
                    "iconUrl": entity.get("icon", ""),
                    "addresses": [{"address": entity.get("address", ""), "chain": "ethereum"}],
                    "source": "known-entities",
                })
            if len(results) >= 20:
                break
        if len(results) >= 20:
            break

    # 2) Intel entities
    if len(results) < 40:
        for entity in _INTEL_INDEX.get("entities", []):
            if _matches(entity.get("searchText", "")):
                _add({
                    "id": f"intel-entity:{entity.get('id')}",
                    "kind": "entity",
                    "name": entity.get("name"),
                    "type": entity.get("type") or "entity",
                    "source": entity.get("source", "intel-search"),
                    "addresses": [],
                })
            if len(results) >= 40:
                break

    # 3) Intel addresses
    if len(results) < 60:
        for adr in _INTEL_INDEX.get("addresses", []):
            if _matches(adr.get("searchText", "")):
                _add({
                    "id": f"intel-address:{adr.get('chain')}:{str(adr.get('address', '')).lower()}",
                    "kind": "address",
                    "name": adr.get("name") or shorten_address(str(adr.get("address", ""))),
                    "type": "address",
                    "chain": adr.get("chain"),
                    "entityName": adr.get("entityName"),
                    "label": adr.get("label"),
                    "addresses": [{"address": adr.get("address"), "chain": adr.get("chain")}],
                    "source": adr.get("source", "intel-search"),
                })
            if len(results) >= 60:
                break

    # 4) Intel token deployments
    if len(results) < 80:
        for token in _INTEL_INDEX.get("tokens", []):
            if _matches(token.get("searchText", "")):
                _add({
                    "id": f"intel-token:{token.get('id')}",
                    "kind": "token",
                    "name": token.get("name"),
                    "type": "token",
                    "symbol": token.get("symbol"),
                    "pricingId": token.get("pricingId"),
                    "chain": token.get("chain"),
                    "addresses": [{"address": token.get("address"), "chain": token.get("chain")}],
                    "source": token.get("source", "intel-search"),
                })
            if len(results) >= 80:
                break

    return {"success": True, "data": results}


@router.get("/intelligence/entity/{entity_id}")
async def get_entity_by_id(entity_id: str):
    """Get entity details by ID (address)."""
    _load_entities()

    if _ADDRESS_MAP and entity_id.lower() in _ADDRESS_MAP:
        entity = _ADDRESS_MAP[entity_id.lower()]
        return {
            "success": True,
            "data": {
                "id": entity_id,
                "name": entity["name"],
                "type": entity["type"],
                "iconUrl": entity.get("icon", ""),
                "addresses": [{"address": entity["address"], "chain": "ethereum"}],
            },
        }

    return {"success": False, "error": {"message": "ENTITY_NOT_FOUND"}}


# ─────────────────────────────────────────────────────────────────────────────
# Trace Save / Load (Stub — will use Firebase Firestore)
# ─────────────────────────────────────────────────────────────────────────────

# In-memory store for now (replace with Firestore)
_TRACE_STORE: Dict[str, Dict[str, Any]] = {}


class TraceSaveRequest(BaseModel):
    uuid: str
    title: str = ""
    rootAddress: str = ""
    rootChain: str = ""
    nodes: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []
    displayOptions: Dict[str, Any] = {}
    filter: Dict[str, Any] = {}
    isShareable: bool = False


@router.post("/trace/save")
async def save_trace(request: TraceSaveRequest):
    """Save trace state."""
    import uuid as uuid_mod
    trace_uuid = request.uuid or str(uuid_mod.uuid4())

    _TRACE_STORE[trace_uuid] = {
        "uuid": trace_uuid,
        "title": request.title,
        "rootAddress": request.rootAddress,
        "rootChain": request.rootChain,
        "nodes": request.nodes,
        "edges": request.edges,
        "displayOptions": request.displayOptions,
        "filter": request.filter,
        "isShareable": request.isShareable,
        "createdAt": int(time.time() * 1000),
        "updatedAt": int(time.time() * 1000),
    }

    return {"success": True, "uuid": trace_uuid}


@router.get("/trace/all")
async def get_all_traces():
    """List all saved traces."""
    traces = []
    for uuid, trace in _TRACE_STORE.items():
        traces.append({
            "uuid": uuid,
            "title": trace.get("title", ""),
            "rootAddress": trace.get("rootAddress", ""),
            "rootChain": trace.get("rootChain", ""),
            "createdAt": trace.get("createdAt", 0),
            "updatedAt": trace.get("updatedAt", 0),
            "nodeCount": len(trace.get("nodes", [])),
            "edgeCount": len(trace.get("edges", [])),
        })
    return {"success": True, "data": traces}


@router.get("/trace/get/{uuid}")
async def get_trace(uuid: str):
    """Get a specific saved trace."""
    if uuid in _TRACE_STORE:
        return {"success": True, "data": _TRACE_STORE[uuid]}
    return {"success": False, "error": {"message": "TRACE_NOT_FOUND"}}


@router.get("/trace/recent")
async def get_recent_traces():
    """Get recent traces sorted by updatedAt."""
    traces = sorted(
        [
            {
                "uuid": t.get("uuid", k),
                "title": t.get("title", ""),
                "rootAddress": t.get("rootAddress", ""),
                "updatedAt": t.get("updatedAt", 0),
            }
            for k, t in _TRACE_STORE.items()
        ],
        key=lambda x: x["updatedAt"],
        reverse=True,
    )[:10]
    return {"success": True, "data": traces}


class SetShareableRequest(BaseModel):
    uuid: str
    shareable: bool


@router.post("/trace/setShareable")
async def set_trace_shareable(request: SetShareableRequest):
    """Toggle shareability of a trace."""
    if request.uuid in _TRACE_STORE:
        _TRACE_STORE[request.uuid]["isShareable"] = request.shareable
        return {"success": True}
    return {"success": False, "error": {"message": "TRACE_NOT_FOUND"}}


# ─────────────────────────────────────────────────────────────────────────────
# Visualizer — Transfers (entity & token mode)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/transfers")
async def get_visualizer_transfers(
    base: str = Query(..., description="Comma-separated base entity IDs or addresses"),
    flow: str = Query("all", pattern="^(all|in|out|self)$"),
    sortKey: str = Query("blockTimestamp"),
    sortDir: str = Query("desc", pattern="^(asc|desc)$"),
    limit: int = Query(1000, ge=1, le=5000),
    offset: int = Query(0, ge=0),
    usdGte: float = Query(0.1),
    usdLte: Optional[float] = Query(None),
    timeGte: Optional[int] = Query(None),
    timeLte: Optional[int] = Query(None),
    chains: Optional[str] = Query(None, description="Comma-separated chain filter"),
    tokens: Optional[str] = Query(None, description="Comma-separated token filter"),
    negatedEntities: Optional[str] = Query(None, description="Comma-separated negated entity IDs"),
):
    """
    Fetch transfers involving the given base addresses/entities.
    Simulates the cways-tracker /transfers endpoint for the Visualizer.
    """
    _load_entities()

    base_addresses = [b.strip().lower() for b in base.split(",") if b.strip()]
    negated = set(n.strip().lower() for n in (negatedEntities or "").split(",") if n.strip())
    chain_filter = set(c.strip() for c in (chains or "").split(",") if c.strip()) if chains else None

    if not base_addresses:
        raise HTTPException(status_code=400, detail="BASE_ADDRESS_REQUIRED")

    # Resolve entity IDs to addresses if needed
    resolved_addresses: List[str] = []
    for addr in base_addresses:
        if _ADDRESS_MAP and addr in _ADDRESS_MAP:
            resolved_addresses.append(addr)
        elif len(addr) == 42 and addr.startswith("0x"):
            resolved_addresses.append(addr)
        else:
            resolved_addresses.append(addr)

    # Collect transfers from all base addresses
    all_transfers: List[Dict[str, Any]] = []

    for address in resolved_addresses[:8]:  # Max 8 addresses per request
        # Default to Ethereum mainnet, expand chains if filter provided
        target_chains = list(chain_filter) if chain_filter else ["eip155:1"]

        for chain_uid in target_chains:
            kind, chain_id, chain_key = _parse_chain_uid(chain_uid)

            if kind == "evm" and chain_id is not None and API_KEYS.ETHERSCAN_API_KEY:
                try:
                    async with EtherscanV2Client(API_KEYS.ETHERSCAN_API_KEY) as client:
                        tasks = [
                            client.get_transactions(address, chain_id=chain_id, page=1, offset=min(limit, 500)),
                            client.get_token_transfers(address, chain_id=chain_id),
                        ]
                        results = await asyncio.gather(*tasks, return_exceptions=True)

                    for result in results:
                        if isinstance(result, Exception) or not isinstance(result, dict):
                            continue

                        txs = result.get("transactions", []) + result.get("token_transfers", [])
                        for tx in txs:
                            from_addr = (tx.get("from") or "").lower()
                            to_addr = (tx.get("to") or "").lower()

                            if not from_addr or not to_addr:
                                continue

                            # Skip negated entities
                            if from_addr in negated or to_addr in negated:
                                continue

                            # Flow direction filter
                            is_inflow = to_addr == address
                            is_outflow = from_addr == address
                            is_self = from_addr == to_addr

                            if flow == "in" and not is_inflow:
                                continue
                            if flow == "out" and not is_outflow:
                                continue
                            if flow == "self" and not is_self:
                                continue

                            # Build Transfer object matching EVMTransfer interface
                            value_raw = tx.get("value", "0")
                            token_decimals = int(tx.get("tokenDecimal", tx.get("decimals", 18)) or 18)
                            token_symbol = tx.get("tokenSymbol", tx.get("symbol", "ETH"))
                            token_name = tx.get("tokenName", tx.get("name", ""))
                            token_contract = tx.get("contractAddress", "")

                            try:
                                unit_value = int(value_raw) / (10 ** token_decimals)
                            except (ValueError, TypeError):
                                unit_value = 0

                            # Simple USD estimation (for now, 1:1 for stablecoins, basic for ETH)
                            usd_value = unit_value  # Placeholder — needs price feed
                            if token_symbol and token_symbol.upper() in {"ETH", "WETH"}:
                                usd_value = unit_value * 2500  # Rough estimate
                            elif token_symbol and token_symbol.upper() in {"USDT", "USDC", "DAI", "BUSD"}:
                                usd_value = unit_value

                            # Apply USD filter
                            if usd_value < usdGte:
                                continue
                            if usdLte is not None and usd_value > usdLte:
                                continue

                            # Build entity reference
                            from_entity = _ADDRESS_MAP.get(from_addr) if _ADDRESS_MAP else None
                            to_entity = _ADDRESS_MAP.get(to_addr) if _ADDRESS_MAP else None

                            transfer = {
                                "id": tx.get("hash", "") + "_" + str(tx.get("transactionIndex", 0)),
                                "transactionHash": tx.get("hash", ""),
                                "fromAddress": {
                                    "address": from_addr,
                                    "chain": chain_uid,
                                    "entity": {
                                        "id": from_addr,
                                        "name": from_entity["name"] if from_entity else shorten_address(from_addr),
                                        "type": from_entity["type"] if from_entity else "unknown",
                                        "iconUrl": from_entity.get("icon", "") if from_entity else "",
                                    } if True else None,
                                },
                                "toAddress": {
                                    "address": to_addr,
                                    "chain": chain_uid,
                                    "entity": {
                                        "id": to_addr,
                                        "name": to_entity["name"] if to_entity else shorten_address(to_addr),
                                        "type": to_entity["type"] if to_entity else "unknown",
                                        "iconUrl": to_entity.get("icon", "") if to_entity else "",
                                    } if True else None,
                                },
                                "tokenAddress": token_contract or None,
                                "tokenName": token_name,
                                "tokenSymbol": token_symbol,
                                "tokenDecimals": token_decimals,
                                "unitValue": unit_value,
                                "historicalUSD": round(usd_value, 2),
                                "chain": chain_uid,
                                "blockTimestamp": tx.get("timeStamp", ""),
                                "blockNumber": int(tx.get("blockNumber", 0)),
                                "blockHash": tx.get("blockHash", ""),
                                "type": "erc20" if token_contract else "native",
                            }
                            all_transfers.append(transfer)

                except Exception as e:
                    logger.error(f"Visualizer transfer fetch error for {address} on {chain_uid}: {e}")
                    continue

    # Sort
    reverse = sortDir == "desc"
    if sortKey == "historicalUSD":
        all_transfers.sort(key=lambda t: t.get("historicalUSD", 0), reverse=reverse)
    else:
        all_transfers.sort(key=lambda t: t.get("blockTimestamp", ""), reverse=reverse)

    # Paginate
    paginated = all_transfers[offset : offset + limit]

    return {
        "success": True,
        "data": {
            "transfers": paginated,
            "count": len(paginated),
            "total": len(all_transfers),
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# Visualizer — Token Holders
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/token/holders")
async def get_token_holders(
    address: Optional[str] = Query(None, description="Token contract address"),
    chain: str = Query("eip155:1", description="Chain UID"),
    pricingID: Optional[str] = Query(None, description="CoinGecko pricing ID"),
    limit: int = Query(200, ge=1, le=1000),
):
    """
    Fetch top token holders for a given token.
    Uses Etherscan v2 or CoinGecko as data source.
    """
    if not address and not pricingID:
        raise HTTPException(status_code=400, detail="TOKEN_ADDRESS_OR_PRICING_ID_REQUIRED")

    token_address = address
    chain_uid = chain

    # If pricingID provided, try to resolve token address
    if pricingID and not token_address:
        token_address = pricingID  # Fallback — ideally resolve via CoinGecko

    kind, chain_id, chain_key = _parse_chain_uid(chain_uid)
    _load_entities()

    holders: List[Dict[str, Any]] = []

    if kind == "evm" and chain_id is not None and API_KEYS.ETHERSCAN_API_KEY and token_address:
        try:
            async with EtherscanV2Client(API_KEYS.ETHERSCAN_API_KEY) as client:
                # Get token info first for decimals
                token_info = {}
                try:
                    info_result = await client._get(
                        module="token",
                        action="tokeninfo",
                        contractaddress=token_address,
                        chainid=chain_id,
                    )
                    if isinstance(info_result, list) and len(info_result) > 0:
                        token_info = info_result[0]
                    elif isinstance(info_result, dict):
                        token_info = info_result
                except Exception:
                    pass

                # Get top holders using Etherscan v2 token holder list
                try:
                    result = await client._get(
                        module="token",
                        action="tokenholderlist",
                        contractaddress=token_address,
                        page=1,
                        offset=min(limit, 100),
                        chainid=chain_id,
                    )
                    if isinstance(result, list):
                        token_decimals = int(token_info.get("divisor", 18))
                        for i, h in enumerate(result[:limit]):
                            holder_addr = (h.get("TokenHolderAddress", "") or "").lower()
                            quantity = h.get("TokenHolderQuantity", "0")
                            try:
                                balance = int(quantity) / (10 ** token_decimals)
                            except (ValueError, TypeError):
                                balance = 0

                            entity = _ADDRESS_MAP.get(holder_addr) if _ADDRESS_MAP else None

                            holders.append({
                                "address": {
                                    "address": holder_addr,
                                    "chain": chain_uid,
                                    "entity": {
                                        "id": holder_addr,
                                        "name": entity["name"] if entity else shorten_address(holder_addr),
                                        "type": entity["type"] if entity else "unknown",
                                        "iconUrl": entity.get("icon", "") if entity else "",
                                    } if True else None,
                                },
                                "balance": round(balance, 6),
                                "usd": 0,  # Needs price feed
                            })
                except Exception as e:
                    logger.warning(f"Token holder list failed for {token_address}: {e}")

        except Exception as e:
            logger.error(f"Token holder fetch error: {e}")

    return {
        "success": True,
        "data": {
            "holders": holders,
            "count": len(holders),
            "tokenAddress": token_address,
            "chain": chain_uid,
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# Visualizer — Entity Icon
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/entity-icon/{entity_id}")
async def get_entity_icon(entity_id: str):
    """
    Serve entity icon image. Checks known-entities data
    and falls back to a generated SVG placeholder.
    """
    _load_entities()

    icon_url = ""
    entity_name = entity_id[:2].upper()

    if _ADDRESS_MAP:
        entity = _ADDRESS_MAP.get(entity_id.lower())
        if entity:
            icon_url = entity.get("icon", "")
            entity_name = entity.get("name", entity_id[:2].upper())[:2].upper()

    # Try to fetch the external icon
    if icon_url:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(icon_url)
                if resp.status_code == 200:
                    content_type = resp.headers.get("content-type", "image/png")
                    from fastapi.responses import Response
                    return Response(
                        content=resp.content,
                        media_type=content_type,
                        headers={"Cache-Control": "public, max-age=86400"},
                    )
        except Exception:
            pass

    # Fallback: generate SVG placeholder
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <circle cx="64" cy="64" r="64" fill="#2C2F37"/>
  <text x="64" y="72" text-anchor="middle" fill="white"
        font-family="monospace" font-size="24">{entity_name}</text>
</svg>'''

    from fastapi.responses import Response
    return Response(
        content=svg.encode("utf-8"),
        media_type="image/svg+xml",
        headers={"Cache-Control": "public, max-age=3600"},
    )
