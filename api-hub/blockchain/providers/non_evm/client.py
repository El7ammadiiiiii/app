# omnichain/providers/non_evm/client.py
"""
🌐 Non-EVM Chains Client
Free public APIs for 14 non-EVM blockchains

Each chain uses its own API endpoint and address format.
"""

import asyncio
from typing import Any, Dict, List, Optional
from decimal import Decimal

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from providers.base import BaseClient, log_request


# ═══════════════════════════════════════════════════════════════════════════════
# 📋 NON-EVM CHAIN CONFIGURATIONS
# ═══════════════════════════════════════════════════════════════════════════════

NON_EVM_CHAINS: Dict[str, Dict[str, Any]] = {
    "litecoin": {
        "name": "Litecoin",
        "symbol": "LTC",
        "decimals": 8,
        "api_base": "https://litecoinspace.org/api",
        "explorer": "https://litecoinspace.org",
        "address_prefix": ["L", "M", "ltc1"],
    },
    "dogecoin": {
        "name": "Dogecoin",
        "symbol": "DOGE",
        "decimals": 8,
        "api_base": "https://dogechain.info/api/v1",
        "explorer": "https://dogechain.info",
        "address_prefix": ["D"],
    },
    "tron": {
        "name": "Tron",
        "symbol": "TRX",
        "decimals": 6,
        "api_base": "https://api.trongrid.io",
        "explorer": "https://tronscan.org",
        "address_prefix": ["T"],
    },
    "ton": {
        "name": "TON",
        "symbol": "TON",
        "decimals": 9,
        "api_base": "https://toncenter.com/api/v2",
        "explorer": "https://tonscan.org",
        "address_prefix": ["EQ", "UQ"],
    },
    "xrp": {
        "name": "XRP Ledger",
        "symbol": "XRP",
        "decimals": 6,
        "api_base": "https://xrplcluster.com",
        "explorer": "https://xrpscan.com",
        "address_prefix": ["r"],
    },
    "near": {
        "name": "NEAR Protocol",
        "symbol": "NEAR",
        "decimals": 24,
        "api_base": "https://api.nearblocks.io/v1",
        "explorer": "https://nearblocks.io",
        "address_prefix": [],  # .near names or hex
    },
    "algorand": {
        "name": "Algorand",
        "symbol": "ALGO",
        "decimals": 6,
        "api_base": "https://mainnet-api.algonode.cloud",
        "explorer": "https://algoexplorer.io",
        "address_prefix": [],  # 58 char base32
    },
    "aptos": {
        "name": "Aptos",
        "symbol": "APT",
        "decimals": 8,
        "api_base": "https://fullnode.mainnet.aptoslabs.com/v1",
        "explorer": "https://aptoscan.com",
        "address_prefix": ["0x"],
    },
    "sui": {
        "name": "Sui",
        "symbol": "SUI",
        "decimals": 9,
        "api_base": "https://fullnode.mainnet.sui.io",
        "explorer": "https://suiscan.xyz",
        "address_prefix": ["0x"],
    },
    "cosmos": {
        "name": "Cosmos Hub",
        "symbol": "ATOM",
        "decimals": 6,
        "api_base": "https://cosmos-rest.publicnode.com",
        "explorer": "https://mintscan.io/cosmos",
        "address_prefix": ["cosmos1"],
    },
    "flow": {
        "name": "Flow",
        "symbol": "FLOW",
        "decimals": 8,
        "api_base": "https://rest-mainnet.onflow.org",
        "explorer": "https://flowscan.org",
        "address_prefix": ["0x"],
    },
    "immutablex": {
        "name": "Immutable X",
        "symbol": "IMX",
        "decimals": 18,
        "api_base": "https://api.x.immutable.com/v1",
        "explorer": "https://immutascan.io",
        "address_prefix": ["0x"],
    },
    "starknet": {
        "name": "Starknet",
        "symbol": "STRK",
        "decimals": 18,
        "api_base": "https://starknet-mainnet.public.blastapi.io",
        "explorer": "https://starkscan.co",
        "address_prefix": ["0x"],
    },
    "solana": {
        "name": "Solana",
        "symbol": "SOL",
        "decimals": 9,
        "api_base": "https://api.mainnet-beta.solana.com",
        "explorer": "https://solscan.io",
        "address_prefix": [],  # Base58
    },
}


class NonEVMClient(BaseClient):
    """
    Multi-chain Non-EVM client.
    
    Supports multiple non-EVM blockchains through their free public APIs.
    Each chain has different address formats and API structures.
    """
    
    def __init__(self, rate_limit: float = 5.0, **kwargs):
        """
        Initialize Non-EVM client.
        
        Args:
            rate_limit: Requests per second (shared across all chains)
        """
        # Use a placeholder base_url, actual URLs vary by chain
        super().__init__(
            base_url="https://placeholder.com",
            rate_limit=rate_limit,
            **kwargs
        )
        self.chains = NON_EVM_CHAINS
    
    def _get_chain_info(self, chain: str) -> Dict[str, Any]:
        """Get chain configuration"""
        return self.chains.get(chain.lower(), {})
    
    def _to_units(self, raw_amount: int, decimals: int) -> float:
        """Convert raw amount to human-readable units"""
        return float(Decimal(str(raw_amount)) / Decimal(10 ** decimals))
    
    # ─────────────────────────────────────────────────────────────────────────
    # 🪙 LITECOIN (litecoinspace.org)
    # ─────────────────────────────────────────────────────────────────────────
    
    @log_request
    async def get_litecoin_balance(self, address: str, **kwargs) -> Dict[str, Any]:
        """Get Litecoin balance using Litecoinspace API"""
        chain_info = self._get_chain_info("litecoin")
        url = f"{chain_info['api_base']}/address/{address}"
        
        data = await self.get(url=url)
        
        # Balance is in satoshis
        balance_sats = data.get("chain_stats", {}).get("funded_txo_sum", 0) - \
                       data.get("chain_stats", {}).get("spent_txo_sum", 0)
        
        return {
            "chain": "litecoin",
            "address": address,
            "balance_sats": balance_sats,
            "balance": self._to_units(balance_sats, chain_info["decimals"]),
            "symbol": chain_info["symbol"],
            "tx_count": data.get("chain_stats", {}).get("tx_count", 0),
        }
    
    @log_request
    async def get_litecoin_transactions(
        self,
        address: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Get Litecoin transaction history"""
        chain_info = self._get_chain_info("litecoin")
        url = f"{chain_info['api_base']}/address/{address}/txs"
        
        data = await self.get(url=url)
        
        return {
            "chain": "litecoin",
            "address": address,
            "transactions": data if isinstance(data, list) else [],
            "count": len(data) if isinstance(data, list) else 0,
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 🐕 DOGECOIN (dogechain.info)
    # ─────────────────────────────────────────────────────────────────────────
    
    @log_request
    async def get_dogecoin_balance(self, address: str, **kwargs) -> Dict[str, Any]:
        """Get Dogecoin balance"""
        chain_info = self._get_chain_info("dogecoin")
        url = f"{chain_info['api_base']}/address/balance/{address}"
        
        data = await self.get(url=url)
        
        balance_str = data.get("balance", "0")
        balance = float(balance_str) if balance_str else 0.0
        
        return {
            "chain": "dogecoin",
            "address": address,
            "balance": balance,
            "symbol": chain_info["symbol"],
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # ⚡ TRON (TronGrid)
    # ─────────────────────────────────────────────────────────────────────────
    
    @log_request
    async def get_tron_balance(self, address: str, **kwargs) -> Dict[str, Any]:
        """Get Tron balance using TronGrid API"""
        chain_info = self._get_chain_info("tron")
        url = f"{chain_info['api_base']}/v1/accounts/{address}"
        
        data = await self.get(url=url)
        
        account = data.get("data", [{}])[0] if data.get("data") else {}
        balance_sun = account.get("balance", 0)
        
        return {
            "chain": "tron",
            "address": address,
            "balance_sun": balance_sun,
            "balance": self._to_units(balance_sun, chain_info["decimals"]),
            "symbol": chain_info["symbol"],
            "bandwidth": account.get("free_net_limit", 0),
            "energy": account.get("account_resource", {}).get("energy_usage", 0),
        }
    
    @log_request
    async def get_tron_transactions(
        self,
        address: str,
        limit: int = 50,
        **kwargs
    ) -> Dict[str, Any]:
        """Get Tron transactions"""
        chain_info = self._get_chain_info("tron")
        url = f"{chain_info['api_base']}/v1/accounts/{address}/transactions"
        
        data = await self.get(url=url, params={"limit": limit})
        
        return {
            "chain": "tron",
            "address": address,
            "transactions": data.get("data", []),
            "count": len(data.get("data", [])),
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 💎 TON (TONCenter)
    # ─────────────────────────────────────────────────────────────────────────
    
    @log_request
    async def get_ton_balance(self, address: str, **kwargs) -> Dict[str, Any]:
        """Get TON balance using TONCenter API"""
        chain_info = self._get_chain_info("ton")
        url = f"{chain_info['api_base']}/getAddressInformation"
        
        data = await self.get(url=url, params={"address": address})
        
        result = data.get("result", {})
        balance_nano = int(result.get("balance", 0))
        
        return {
            "chain": "ton",
            "address": address,
            "balance_nano": balance_nano,
            "balance": self._to_units(balance_nano, chain_info["decimals"]),
            "symbol": chain_info["symbol"],
            "state": result.get("state"),
        }
    
    @log_request
    async def get_ton_transactions(
        self,
        address: str,
        limit: int = 50,
        **kwargs
    ) -> Dict[str, Any]:
        """Get TON transactions"""
        chain_info = self._get_chain_info("ton")
        url = f"{chain_info['api_base']}/getTransactions"
        
        data = await self.get(url=url, params={"address": address, "limit": limit})
        
        return {
            "chain": "ton",
            "address": address,
            "transactions": data.get("result", []),
            "count": len(data.get("result", [])),
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 💧 XRP (XRPL Cluster)
    # ─────────────────────────────────────────────────────────────────────────
    
    @log_request
    async def get_xrp_balance(self, address: str, **kwargs) -> Dict[str, Any]:
        """Get XRP balance using XRPL JSON-RPC"""
        chain_info = self._get_chain_info("xrp")
        
        payload = {
            "method": "account_info",
            "params": [{"account": address}]
        }
        
        data = await self.post(url=chain_info["api_base"], json=payload)
        
        result = data.get("result", {})
        account_data = result.get("account_data", {})
        balance_drops = int(account_data.get("Balance", 0))
        
        return {
            "chain": "xrp",
            "address": address,
            "balance_drops": balance_drops,
            "balance": self._to_units(balance_drops, chain_info["decimals"]),
            "symbol": chain_info["symbol"],
            "sequence": account_data.get("Sequence"),
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 🌐 NEAR (Nearblocks)
    # ─────────────────────────────────────────────────────────────────────────
    
    @log_request
    async def get_near_balance(self, address: str, **kwargs) -> Dict[str, Any]:
        """Get NEAR balance using Nearblocks API"""
        chain_info = self._get_chain_info("near")
        url = f"{chain_info['api_base']}/account/{address}"
        
        data = await self.get(url=url)
        
        account = data.get("account", [{}])[0] if data.get("account") else {}
        balance_yocto = int(account.get("amount", 0))
        
        return {
            "chain": "near",
            "address": address,
            "balance_yocto": balance_yocto,
            "balance": self._to_units(balance_yocto, chain_info["decimals"]),
            "symbol": chain_info["symbol"],
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 🔷 ALGORAND (Algonode)
    # ─────────────────────────────────────────────────────────────────────────
    
    @log_request
    async def get_algorand_balance(self, address: str, **kwargs) -> Dict[str, Any]:
        """Get Algorand balance using Algonode API"""
        chain_info = self._get_chain_info("algorand")
        url = f"{chain_info['api_base']}/v2/accounts/{address}"
        
        data = await self.get(url=url)
        
        balance_microalgo = data.get("amount", 0)
        
        return {
            "chain": "algorand",
            "address": address,
            "balance_microalgo": balance_microalgo,
            "balance": self._to_units(balance_microalgo, chain_info["decimals"]),
            "symbol": chain_info["symbol"],
            "status": data.get("status"),
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 🍎 APTOS (Aptoslabs)
    # ─────────────────────────────────────────────────────────────────────────
    
    @log_request
    async def get_aptos_balance(self, address: str, **kwargs) -> Dict[str, Any]:
        """Get Aptos balance"""
        chain_info = self._get_chain_info("aptos")
        url = f"{chain_info['api_base']}/accounts/{address}/resources"
        
        data = await self.get(url=url)
        
        # Find APT coin resource
        balance_octas = 0
        for resource in data if isinstance(data, list) else []:
            if resource.get("type") == "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>":
                balance_octas = int(resource.get("data", {}).get("coin", {}).get("value", 0))
                break
        
        return {
            "chain": "aptos",
            "address": address,
            "balance_octas": balance_octas,
            "balance": self._to_units(balance_octas, chain_info["decimals"]),
            "symbol": chain_info["symbol"],
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 🌊 SUI (Sui Fullnode)
    # ─────────────────────────────────────────────────────────────────────────
    
    @log_request
    async def get_sui_balance(self, address: str, **kwargs) -> Dict[str, Any]:
        """Get Sui balance using JSON-RPC"""
        chain_info = self._get_chain_info("sui")
        
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "suix_getBalance",
            "params": [address, "0x2::sui::SUI"]
        }
        
        data = await self.post(url=chain_info["api_base"], json=payload)
        
        result = data.get("result", {})
        balance_mist = int(result.get("totalBalance", 0))
        
        return {
            "chain": "sui",
            "address": address,
            "balance_mist": balance_mist,
            "balance": self._to_units(balance_mist, chain_info["decimals"]),
            "symbol": chain_info["symbol"],
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # ⚛️ COSMOS (Publicnode)
    # ─────────────────────────────────────────────────────────────────────────
    
    @log_request
    async def get_cosmos_balance(self, address: str, **kwargs) -> Dict[str, Any]:
        """Get Cosmos Hub balance"""
        chain_info = self._get_chain_info("cosmos")
        url = f"{chain_info['api_base']}/cosmos/bank/v1beta1/balances/{address}"
        
        data = await self.get(url=url)
        
        # Find uatom balance
        balance_uatom = 0
        for coin in data.get("balances", []):
            if coin.get("denom") == "uatom":
                balance_uatom = int(coin.get("amount", 0))
                break
        
        return {
            "chain": "cosmos",
            "address": address,
            "balance_uatom": balance_uatom,
            "balance": self._to_units(balance_uatom, chain_info["decimals"]),
            "symbol": chain_info["symbol"],
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 💜 SOLANA (Solana RPC - already in Solscan agent, but basic here)
    # ─────────────────────────────────────────────────────────────────────────
    
    @log_request
    async def get_solana_balance(self, address: str, **kwargs) -> Dict[str, Any]:
        """Get Solana balance using RPC"""
        chain_info = self._get_chain_info("solana")
        
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getBalance",
            "params": [address]
        }
        
        data = await self.post(url=chain_info["api_base"], json=payload)
        
        result = data.get("result", {})
        balance_lamports = result.get("value", 0)
        
        return {
            "chain": "solana",
            "address": address,
            "balance_lamports": balance_lamports,
            "balance": self._to_units(balance_lamports, chain_info["decimals"]),
            "symbol": chain_info["symbol"],
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 🌐 GENERIC BALANCE ROUTER
    # ─────────────────────────────────────────────────────────────────────────
    
    async def get_balance(
        self,
        address: str,
        chain: str,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Get balance on any supported non-EVM chain.
        
        Args:
            address: Chain-specific address format
            chain: Chain name (litecoin, dogecoin, tron, ton, xrp, near, algorand, aptos, sui, cosmos, solana)
        
        Returns:
            Balance data
        """
        chain_lower = chain.lower()
        
        method_map = {
            "litecoin": self.get_litecoin_balance,
            "ltc": self.get_litecoin_balance,
            "dogecoin": self.get_dogecoin_balance,
            "doge": self.get_dogecoin_balance,
            "tron": self.get_tron_balance,
            "trx": self.get_tron_balance,
            "ton": self.get_ton_balance,
            "xrp": self.get_xrp_balance,
            "ripple": self.get_xrp_balance,
            "near": self.get_near_balance,
            "algorand": self.get_algorand_balance,
            "algo": self.get_algorand_balance,
            "aptos": self.get_aptos_balance,
            "apt": self.get_aptos_balance,
            "sui": self.get_sui_balance,
            "cosmos": self.get_cosmos_balance,
            "atom": self.get_cosmos_balance,
            "solana": self.get_solana_balance,
            "sol": self.get_solana_balance,
        }
        
        method = method_map.get(chain_lower)
        if not method:
            return {"error": f"Chain '{chain}' not supported"}
        
        return await method(address, **kwargs)
    
    def get_supported_chains(self) -> List[str]:
        """Get list of supported chains"""
        return list(self.chains.keys())


# ═══════════════════════════════════════════════════════════════════════════════
# 🧪 TESTING
# ═══════════════════════════════════════════════════════════════════════════════

async def test_non_evm_client():
    """Test the Non-EVM client"""
    async with NonEVMClient() as client:
        print("🌐 Testing Non-EVM Client...")
        print(f"Supported chains: {client.get_supported_chains()}")
        
        # Test Solana
        sol_address = "vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg"
        sol_balance = await client.get_solana_balance(sol_address)
        print(f"\n💜 Solana: {sol_balance}")
        
        # Test TON
        ton_address = "EQDrLq-X6jKZNHAScgghh0h1iog3StK71zn8dcmrOj8jPWRA"
        try:
            ton_balance = await client.get_ton_balance(ton_address)
            print(f"\n💎 TON: {ton_balance}")
        except:
            print("\n💎 TON: API unavailable")


if __name__ == "__main__":
    asyncio.run(test_non_evm_client())
