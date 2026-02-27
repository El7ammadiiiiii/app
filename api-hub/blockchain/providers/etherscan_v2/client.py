# omnichain/providers/etherscan_v2/client.py
"""
🔷 Etherscan V2 Client
Single API key for 62+ EVM chains using chainid parameter
API Docs: https://docs.etherscan.io/v/v2-api
"""

import asyncio
from typing import Any, Dict, List, Optional, Union

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from ..base import BaseClient, log_request, wei_to_eth
try:
    from .chains import ETHERSCAN_V2_CHAINS, get_chain_by_id
except ImportError:
    from omnichain.providers.etherscan_v2.chains import ETHERSCAN_V2_CHAINS, get_chain_by_id


class EtherscanV2Client(BaseClient):
    """
    Etherscan API V2 Client.
    Single API key supports 62+ EVM chains via chainid parameter.
    
    URL format: https://api.etherscan.io/v2/api?chainid={CHAIN_ID}&...
    """
    
    BASE_URL = "https://217.79.243.34/v2/api"  # Using IP directly to bypass DNS
    
    def __init__(
        self,
        api_key: str,
        rate_limit: float = 5.0,
        **kwargs
    ):
        """
        Initialize Etherscan V2 client.
        
        Args:
            api_key: Etherscan API key (works for all 62+ chains)
            rate_limit: Requests per second
        """
        super().__init__(
            base_url=self.BASE_URL,
            api_key=api_key,
            rate_limit=rate_limit,
            **kwargs
        )
        self._api_key = api_key
    
    def _get_headers(self) -> Dict[str, str]:
        """Override - Etherscan uses query params for auth. Add Host header for IP connection"""
        return {
            "Accept": "application/json",
            "Host": "api.etherscan.io"  # Required when using IP address
        }
    
    async def _request_v2(
        self,
        chain_id: int,
        module: str,
        action: str,
        **params
    ) -> Dict[str, Any]:
        """
        Make Etherscan V2 API request.
        
        Args:
            chain_id: Target chain ID (the key difference in V2!)
            module: API module
            action: API action
            **params: Additional parameters
        
        Returns:
            API response
        """
        request_params = {
            "chainid": chain_id,  # ← The magic parameter!
            "module": module,
            "action": action,
            "apikey": self._api_key,
            **params
        }
        
        data = await self.get(params=request_params)
        
        # Handle rate limiting
        if data.get("status") == "0":
            message = str(data.get("message", "")).lower()
            if "rate limit" in message:
                await asyncio.sleep(0.25)
                return await self._request_v2(chain_id, module, action, **params)
        
        return data
    
    def _get_chain_info(self, chain_id: int) -> Dict[str, Any]:
        """Get chain metadata"""
        return get_chain_by_id(chain_id) or {
            "name": f"Chain {chain_id}",
            "symbol": "???",
            "decimals": 18,
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 💰 ACCOUNT APIs
    # ─────────────────────────────────────────────────────────────────────────
    
    @log_request
    async def get_balance(
        self,
        address: str,
        chain_id: int = 1,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Get native token balance for an address on any chain.
        
        Args:
            address: Wallet address
            chain_id: Target chain ID (default: 1 = Ethereum)
        
        Returns:
            Balance in wei and native units
        """
        data = await self._request_v2(
            chain_id=chain_id,
            module="account",
            action="balance",
            address=address,
            tag="latest"
        )
        
        chain_info = self._get_chain_info(chain_id)
        balance_wei = int(data.get("result", 0))
        
        return {
            "address": address,
            "chain_id": chain_id,
            "chain_name": chain_info.get("name"),
            "symbol": chain_info.get("symbol"),
            "balance_wei": balance_wei,
            "balance": wei_to_eth(balance_wei, chain_info.get("decimals", 18)),
        }
    
    @log_request
    async def get_multi_balance(
        self,
        addresses: List[str],
        chain_id: int = 1,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Get balances for multiple addresses (max 20).
        
        Args:
            addresses: List of addresses
            chain_id: Target chain ID
        
        Returns:
            Balances for each address
        """
        data = await self._request_v2(
            chain_id=chain_id,
            module="account",
            action="balancemulti",
            address=",".join(addresses[:20]),
            tag="latest"
        )
        
        chain_info = self._get_chain_info(chain_id)
        
        balances = []
        for item in data.get("result", []):
            balance_wei = int(item.get("balance", 0))
            balances.append({
                "address": item.get("account"),
                "balance_wei": balance_wei,
                "balance": wei_to_eth(balance_wei, chain_info.get("decimals", 18)),
            })
        
        return {
            "chain_id": chain_id,
            "chain_name": chain_info.get("name"),
            "balances": balances,
            "count": len(balances),
        }
    
    @log_request
    async def get_transactions(
        self,
        address: str,
        chain_id: int = 1,
        page: int = 1,
        offset: int = 50,
        sort: str = "desc",
        **kwargs
    ) -> Dict[str, Any]:
        """
        Get normal transactions for an address.
        
        Args:
            address: Wallet address
            chain_id: Target chain ID
            page: Page number
            offset: Results per page (max 10000)
            sort: Sort order (asc/desc)
        
        Returns:
            Transaction list
        """
        data = await self._request_v2(
            chain_id=chain_id,
            module="account",
            action="txlist",
            address=address,
            startblock=0,
            endblock=99999999,
            page=page,
            offset=offset,
            sort=sort
        )
        
        chain_info = self._get_chain_info(chain_id)
        
        return {
            "address": address,
            "chain_id": chain_id,
            "chain_name": chain_info.get("name"),
            "transactions": data.get("result", []),
            "count": len(data.get("result", [])),
        }
    
    @log_request
    async def get_internal_transactions(
        self,
        address: str,
        chain_id: int = 1,
        **kwargs
    ) -> Dict[str, Any]:
        """Get internal transactions"""
        data = await self._request_v2(
            chain_id=chain_id,
            module="account",
            action="txlistinternal",
            address=address,
            sort="desc"
        )
        
        return {
            "address": address,
            "chain_id": chain_id,
            "internal_transactions": data.get("result", []),
        }
    
    @log_request
    async def get_token_transfers(
        self,
        address: str,
        chain_id: int = 1,
        contract: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Get ERC-20 token transfers.
        
        Args:
            address: Wallet address
            chain_id: Target chain ID
            contract: Optional specific token contract
        
        Returns:
            Token transfer history
        """
        params = {"address": address, "sort": "desc"}
        if contract:
            params["contractaddress"] = contract
        
        data = await self._request_v2(
            chain_id=chain_id,
            module="account",
            action="tokentx",
            **params
        )
        
        return {
            "address": address,
            "chain_id": chain_id,
            "token_transfers": data.get("result", []),
        }
    
    @log_request
    async def get_nft_transfers(
        self,
        address: str,
        chain_id: int = 1,
        **kwargs
    ) -> Dict[str, Any]:
        """Get ERC-721 NFT transfers"""
        data = await self._request_v2(
            chain_id=chain_id,
            module="account",
            action="tokennfttx",
            address=address,
            sort="desc"
        )
        
        return {
            "address": address,
            "chain_id": chain_id,
            "nft_transfers": data.get("result", []),
        }
    
    @log_request
    async def get_erc1155_transfers(
        self,
        address: str,
        chain_id: int = 1,
        **kwargs
    ) -> Dict[str, Any]:
        """Get ERC-1155 transfers"""
        data = await self._request_v2(
            chain_id=chain_id,
            module="account",
            action="token1155tx",
            address=address,
            sort="desc"
        )
        
        return {
            "address": address,
            "chain_id": chain_id,
            "erc1155_transfers": data.get("result", []),
        }
    
    @log_request
    async def get_token_balance(
        self,
        address: str,
        contract: str,
        chain_id: int = 1,
        **kwargs
    ) -> Dict[str, Any]:
        """Get specific token balance"""
        data = await self._request_v2(
            chain_id=chain_id,
            module="account",
            action="tokenbalance",
            address=address,
            contractaddress=contract,
            tag="latest"
        )
        
        return {
            "address": address,
            "contract": contract,
            "chain_id": chain_id,
            "balance": data.get("result"),
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 📜 CONTRACT APIs
    # ─────────────────────────────────────────────────────────────────────────
    
    @log_request
    async def get_contract_abi(
        self,
        contract: str,
        chain_id: int = 1,
        **kwargs
    ) -> Dict[str, Any]:
        """Get verified contract ABI"""
        data = await self._request_v2(
            chain_id=chain_id,
            module="contract",
            action="getabi",
            address=contract
        )
        
        return {
            "contract": contract,
            "chain_id": chain_id,
            "abi": data.get("result"),
        }
    
    @log_request
    async def get_source_code(
        self,
        contract: str,
        chain_id: int = 1,
        **kwargs
    ) -> Dict[str, Any]:
        """Get verified contract source code"""
        data = await self._request_v2(
            chain_id=chain_id,
            module="contract",
            action="getsourcecode",
            address=contract
        )
        
        result = data.get("result", [{}])
        source = result[0] if result else {}
        
        return {
            "contract": contract,
            "chain_id": chain_id,
            "verified": source.get("ABI") != "Contract source code not verified",
            "contract_name": source.get("ContractName"),
            "compiler_version": source.get("CompilerVersion"),
            "source_code": source.get("SourceCode"),
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # ⛽ GAS APIs
    # ─────────────────────────────────────────────────────────────────────────
    
    @log_request
    async def get_gas_price(self, chain_id: int = 1, **kwargs) -> Dict[str, Any]:
        """Get current gas price"""
        data = await self._request_v2(
            chain_id=chain_id,
            module="gastracker",
            action="gasoracle"
        )
        
        chain_info = self._get_chain_info(chain_id)
        result = data.get("result", {})
        
        return {
            "chain_id": chain_id,
            "chain_name": chain_info.get("name"),
            "unit": "gwei",
            "safe_low": result.get("SafeGasPrice"),
            "average": result.get("ProposeGasPrice"),
            "fast": result.get("FastGasPrice"),
            "base_fee": result.get("suggestBaseFee"),
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 🧱 BLOCK APIs
    # ─────────────────────────────────────────────────────────────────────────
    
    @log_request
    async def get_block_by_timestamp(
        self,
        timestamp: int,
        chain_id: int = 1,
        closest: str = "before",
        **kwargs
    ) -> Dict[str, Any]:
        """Get block number by timestamp"""
        data = await self._request_v2(
            chain_id=chain_id,
            module="block",
            action="getblocknobytime",
            timestamp=timestamp,
            closest=closest
        )
        
        return {
            "chain_id": chain_id,
            "timestamp": timestamp,
            "block_number": data.get("result"),
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 📊 TOKEN APIs
    # ─────────────────────────────────────────────────────────────────────────
    
    @log_request
    async def get_token_supply(
        self,
        contract: str,
        chain_id: int = 1,
        **kwargs
    ) -> Dict[str, Any]:
        """Get token total supply"""
        data = await self._request_v2(
            chain_id=chain_id,
            module="stats",
            action="tokensupply",
            contractaddress=contract
        )
        
        return {
            "chain_id": chain_id,
            "contract": contract,
            "total_supply": data.get("result"),
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 📝 LOG APIs
    # ─────────────────────────────────────────────────────────────────────────
    
    @log_request
    async def get_logs(
        self,
        address: str,
        chain_id: int = 1,
        from_block: int = 0,
        to_block: Union[int, str] = "latest",
        topic0: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Get event logs"""
        params = {
            "address": address,
            "fromBlock": from_block,
            "toBlock": to_block,
        }
        if topic0:
            params["topic0"] = topic0
        
        data = await self._request_v2(
            chain_id=chain_id,
            module="logs",
            action="getLogs",
            **params
        )
        
        return {
            "chain_id": chain_id,
            "address": address,
            "logs": data.get("result", []),
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 🌐 MULTI-CHAIN METHODS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def get_balance_on_chains(
        self,
        address: str,
        chain_ids: Optional[List[int]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Get balance for an address across multiple chains.
        
        Args:
            address: Wallet address
            chain_ids: List of chain IDs (default: all supported)
        
        Returns:
            Balances on each chain
        """
        chain_ids = chain_ids or list(ETHERSCAN_V2_CHAINS.keys())
        
        tasks = [
            self.get_balance(address, chain_id=cid)
            for cid in chain_ids
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        balances = {}
        for chain_id, result in zip(chain_ids, results):
            if isinstance(result, Exception):
                balances[chain_id] = {"error": str(result)}
            elif result.get("balance", 0) > 0:
                balances[chain_id] = result
        
        return {
            "address": address,
            "chains_checked": len(chain_ids),
            "chains_with_balance": len([b for b in balances.values() if not b.get("error")]),
            "balances": balances,
        }
    
    async def get_address_summary(
        self,
        address: str,
        chain_id: int = 1,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Get comprehensive address summary on a specific chain.
        
        Args:
            address: Wallet address
            chain_id: Target chain ID
        
        Returns:
            Complete address data
        """
        balance, txs, tokens, nfts = await asyncio.gather(
            self.get_balance(address, chain_id),
            self.get_transactions(address, chain_id),
            self.get_token_transfers(address, chain_id),
            self.get_nft_transfers(address, chain_id),
            return_exceptions=True,
        )
        
        chain_info = self._get_chain_info(chain_id)
        
        return {
            "address": address,
            "chain_id": chain_id,
            "chain_name": chain_info.get("name"),
            "balance": balance if not isinstance(balance, Exception) else {"error": str(balance)},
            "transactions": txs if not isinstance(txs, Exception) else {"error": str(txs)},
            "token_transfers": tokens if not isinstance(tokens, Exception) else {"error": str(tokens)},
            "nft_transfers": nfts if not isinstance(nfts, Exception) else {"error": str(nfts)},
        }


# ═══════════════════════════════════════════════════════════════════════════════
# 🧪 TESTING
# ═══════════════════════════════════════════════════════════════════════════════

async def test_client():
    """Test the Etherscan V2 client"""
    sys.path.insert(0, str(Path(__file__).parent.parent.parent))
    from config import API_KEYS
    
    async with EtherscanV2Client(API_KEYS.ETHERSCAN_API_KEY) as client:
        address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"  # Vitalik
        
        print("🔍 Testing Etherscan V2 Client...")
        
        # Test on Ethereum (chain_id=1)
        eth_balance = await client.get_balance(address, chain_id=1)
        print(f"\n💰 Ethereum: {eth_balance}")
        
        # Test on Polygon (chain_id=137)
        poly_balance = await client.get_balance(address, chain_id=137)
        print(f"\n💰 Polygon: {poly_balance}")
        
        # Test on Arbitrum (chain_id=42161)
        arb_balance = await client.get_balance(address, chain_id=42161)
        print(f"\n💰 Arbitrum: {arb_balance}")
        
        # Test on Base (chain_id=8453)
        base_balance = await client.get_balance(address, chain_id=8453)
        print(f"\n💰 Base: {base_balance}")
        
        # Test multi-chain balance
        print("\n🌐 Checking all chains...")
        all_balances = await client.get_balance_on_chains(
            address,
            chain_ids=[1, 137, 42161, 10, 8453]  # ETH, Polygon, Arb, OP, Base
        )
        print(f"Found balance on {all_balances['chains_with_balance']} chains")


if __name__ == "__main__":
    asyncio.run(test_client())
