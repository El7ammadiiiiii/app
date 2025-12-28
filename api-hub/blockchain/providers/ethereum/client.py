# omnichain/providers/ethereum/client.py
"""
⭐ Ethereum Client
Uses Etherscan API for Ethereum mainnet data
"""

import asyncio
from typing import Any, Dict, List, Optional, Union

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from providers.base import BaseClient, log_request, wei_to_eth


class EthereumClient(BaseClient):
    """
    Ethereum mainnet client using Etherscan API.
    Dedicated for ETH mainnet with specialized endpoints.
    """
    
    CHAIN_ID = 1
    CHAIN_NAME = "Ethereum"
    SYMBOL = "ETH"
    
    def __init__(
        self,
        api_key: str,
        rate_limit: float = 5.0,
        **kwargs
    ):
        """
        Initialize Ethereum client.
        
        Args:
            api_key: Etherscan API key
            rate_limit: Requests per second
        """
        super().__init__(
            base_url="https://api.etherscan.io/api",
            api_key=api_key,
            rate_limit=rate_limit,
            **kwargs
        )
        self._api_key = api_key
    
    def _get_headers(self) -> Dict[str, str]:
        """Override - Etherscan uses query params for auth"""
        return {"Accept": "application/json"}
    
    async def _etherscan_request(
        self,
        module: str,
        action: str,
        **params
    ) -> Dict[str, Any]:
        """
        Make Etherscan API request.
        
        Args:
            module: API module (account, contract, etc.)
            action: API action
            **params: Additional parameters
        
        Returns:
            API response result
        """
        request_params = {
            "module": module,
            "action": action,
            "apikey": self._api_key,
            **params
        }
        
        data = await self.get(params=request_params)
        
        # Handle rate limiting
        if data.get("status") == "0" and "rate limit" in str(data.get("message", "")).lower():
            await asyncio.sleep(0.25)
            return await self._etherscan_request(module, action, **params)
        
        return data
    
    # ─────────────────────────────────────────────────────────────────────────
    # 💰 ACCOUNT APIs
    # ─────────────────────────────────────────────────────────────────────────
    
    @log_request
    async def get_balance(self, address: str, **kwargs) -> Dict[str, Any]:
        """
        Get ETH balance for an address.
        
        Args:
            address: Ethereum address
        
        Returns:
            Balance in wei and ETH
        """
        data = await self._etherscan_request(
            module="account",
            action="balance",
            address=address,
            tag="latest"
        )
        
        balance_wei = int(data.get("result", 0))
        
        return {
            "address": address,
            "chain": "ethereum",
            "chain_id": self.CHAIN_ID,
            "symbol": self.SYMBOL,
            "balance_wei": balance_wei,
            "balance": wei_to_eth(balance_wei),
        }
    
    @log_request
    async def get_multi_balance(self, addresses: List[str], **kwargs) -> Dict[str, Any]:
        """
        Get ETH balance for multiple addresses (max 20).
        
        Args:
            addresses: List of Ethereum addresses
        
        Returns:
            Balances for each address
        """
        data = await self._etherscan_request(
            module="account",
            action="balancemulti",
            address=",".join(addresses[:20]),
            tag="latest"
        )
        
        balances = []
        for item in data.get("result", []):
            balance_wei = int(item.get("balance", 0))
            balances.append({
                "address": item.get("account"),
                "balance_wei": balance_wei,
                "balance": wei_to_eth(balance_wei),
            })
        
        return {
            "chain": "ethereum",
            "balances": balances,
            "count": len(balances),
        }
    
    @log_request
    async def get_transactions(
        self,
        address: str,
        start_block: int = 0,
        end_block: int = 99999999,
        page: int = 1,
        offset: int = 50,
        sort: str = "desc",
        **kwargs
    ) -> Dict[str, Any]:
        """
        Get normal transactions for an address.
        
        Args:
            address: Ethereum address
            start_block: Starting block
            end_block: Ending block
            page: Page number
            offset: Results per page
            sort: Sort order (asc/desc)
        
        Returns:
            List of transactions
        """
        data = await self._etherscan_request(
            module="account",
            action="txlist",
            address=address,
            startblock=start_block,
            endblock=end_block,
            page=page,
            offset=offset,
            sort=sort
        )
        
        txs = data.get("result", [])
        
        return {
            "address": address,
            "chain": "ethereum",
            "transactions": txs,
            "count": len(txs),
        }
    
    @log_request
    async def get_internal_transactions(
        self,
        address: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Get internal transactions"""
        data = await self._etherscan_request(
            module="account",
            action="txlistinternal",
            address=address,
            sort="desc"
        )
        
        return {
            "address": address,
            "chain": "ethereum",
            "internal_transactions": data.get("result", []),
        }
    
    @log_request
    async def get_token_transfers(
        self,
        address: str,
        contract: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Get ERC-20 token transfers.
        
        Args:
            address: Ethereum address
            contract: Optional specific token contract
        
        Returns:
            Token transfer history
        """
        params = {"address": address, "sort": "desc"}
        if contract:
            params["contractaddress"] = contract
        
        data = await self._etherscan_request(
            module="account",
            action="tokentx",
            **params
        )
        
        return {
            "address": address,
            "chain": "ethereum",
            "token_transfers": data.get("result", []),
        }
    
    @log_request
    async def get_nft_transfers(self, address: str, **kwargs) -> Dict[str, Any]:
        """Get ERC-721 NFT transfers"""
        data = await self._etherscan_request(
            module="account",
            action="tokennfttx",
            address=address,
            sort="desc"
        )
        
        return {
            "address": address,
            "chain": "ethereum",
            "nft_transfers": data.get("result", []),
        }
    
    @log_request
    async def get_erc1155_transfers(self, address: str, **kwargs) -> Dict[str, Any]:
        """Get ERC-1155 transfers"""
        data = await self._etherscan_request(
            module="account",
            action="token1155tx",
            address=address,
            sort="desc"
        )
        
        return {
            "address": address,
            "chain": "ethereum",
            "erc1155_transfers": data.get("result", []),
        }
    
    @log_request
    async def get_token_balance(
        self,
        address: str,
        contract: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Get specific token balance"""
        data = await self._etherscan_request(
            module="account",
            action="tokenbalance",
            address=address,
            contractaddress=contract,
            tag="latest"
        )
        
        return {
            "address": address,
            "contract": contract,
            "chain": "ethereum",
            "balance": data.get("result"),
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 📜 CONTRACT APIs
    # ─────────────────────────────────────────────────────────────────────────
    
    @log_request
    async def get_contract_abi(self, contract: str, **kwargs) -> Dict[str, Any]:
        """Get verified contract ABI"""
        data = await self._etherscan_request(
            module="contract",
            action="getabi",
            address=contract
        )
        
        return {
            "contract": contract,
            "chain": "ethereum",
            "abi": data.get("result"),
        }
    
    @log_request
    async def get_source_code(self, contract: str, **kwargs) -> Dict[str, Any]:
        """Get verified contract source code"""
        data = await self._etherscan_request(
            module="contract",
            action="getsourcecode",
            address=contract
        )
        
        result = data.get("result", [{}])
        source = result[0] if result else {}
        
        return {
            "contract": contract,
            "chain": "ethereum",
            "verified": source.get("ABI") != "Contract source code not verified",
            "contract_name": source.get("ContractName"),
            "compiler_version": source.get("CompilerVersion"),
            "optimization": source.get("OptimizationUsed"),
            "source_code": source.get("SourceCode"),
            "abi": source.get("ABI"),
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # ⛽ GAS APIs
    # ─────────────────────────────────────────────────────────────────────────
    
    @log_request
    async def get_gas_price(self, **kwargs) -> Dict[str, Any]:
        """Get current gas price"""
        data = await self._etherscan_request(
            module="gastracker",
            action="gasoracle"
        )
        
        result = data.get("result", {})
        
        return {
            "chain": "ethereum",
            "unit": "gwei",
            "safe_low": int(result.get("SafeGasPrice", 0)),
            "average": int(result.get("ProposeGasPrice", 0)),
            "fast": int(result.get("FastGasPrice", 0)),
            "base_fee": float(result.get("suggestBaseFee", 0)),
            "gas_used_ratio": result.get("gasUsedRatio"),
        }
    
    @log_request
    async def estimate_gas(
        self,
        to: str,
        value: str = "0x0",
        data: str = "0x",
        **kwargs
    ) -> Dict[str, Any]:
        """Estimate gas for a transaction"""
        result = await self._etherscan_request(
            module="proxy",
            action="eth_estimateGas",
            to=to,
            value=value,
            data=data
        )
        
        gas_hex = result.get("result", "0x0")
        gas_int = int(gas_hex, 16) if gas_hex else 0
        
        return {
            "chain": "ethereum",
            "estimated_gas": gas_int,
            "estimated_gas_hex": gas_hex,
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 🧱 BLOCK APIs
    # ─────────────────────────────────────────────────────────────────────────
    
    @log_request
    async def get_block_number(self, **kwargs) -> int:
        """Get current block number"""
        data = await self._etherscan_request(
            module="proxy",
            action="eth_blockNumber"
        )
        
        return int(data.get("result", "0x0"), 16)
    
    @log_request
    async def get_block(self, block_number: Union[int, str], **kwargs) -> Dict[str, Any]:
        """Get block by number"""
        if isinstance(block_number, int):
            block_number = hex(block_number)
        
        data = await self._etherscan_request(
            module="proxy",
            action="eth_getBlockByNumber",
            tag=block_number,
            boolean="true"
        )
        
        block = data.get("result", {})
        
        return {
            "chain": "ethereum",
            "number": int(block.get("number", "0x0"), 16),
            "hash": block.get("hash"),
            "timestamp": int(block.get("timestamp", "0x0"), 16),
            "transactions_count": len(block.get("transactions", [])),
            "gas_used": int(block.get("gasUsed", "0x0"), 16),
            "gas_limit": int(block.get("gasLimit", "0x0"), 16),
            "base_fee": int(block.get("baseFeePerGas", "0x0"), 16) if block.get("baseFeePerGas") else None,
            "miner": block.get("miner"),
        }
    
    @log_request
    async def get_block_by_timestamp(
        self,
        timestamp: int,
        closest: str = "before",
        **kwargs
    ) -> Dict[str, Any]:
        """Get block number by timestamp"""
        data = await self._etherscan_request(
            module="block",
            action="getblocknobytime",
            timestamp=timestamp,
            closest=closest
        )
        
        return {
            "chain": "ethereum",
            "timestamp": timestamp,
            "block_number": int(data.get("result", 0)),
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 📊 STATS APIs
    # ─────────────────────────────────────────────────────────────────────────
    
    @log_request
    async def get_eth_supply(self, **kwargs) -> Dict[str, Any]:
        """Get ETH total supply"""
        data = await self._etherscan_request(
            module="stats",
            action="ethsupply"
        )
        
        supply_wei = int(data.get("result", 0))
        
        return {
            "chain": "ethereum",
            "symbol": "ETH",
            "total_supply_wei": supply_wei,
            "total_supply": wei_to_eth(supply_wei),
        }
    
    @log_request
    async def get_eth_price(self, **kwargs) -> Dict[str, Any]:
        """Get ETH price"""
        data = await self._etherscan_request(
            module="stats",
            action="ethprice"
        )
        
        result = data.get("result", {})
        
        return {
            "chain": "ethereum",
            "symbol": "ETH",
            "usd": float(result.get("ethusd", 0)),
            "btc": float(result.get("ethbtc", 0)),
            "timestamp": int(result.get("ethusd_timestamp", 0)),
        }
    
    @log_request
    async def get_token_supply(self, contract: str, **kwargs) -> Dict[str, Any]:
        """Get token total supply"""
        data = await self._etherscan_request(
            module="stats",
            action="tokensupply",
            contractaddress=contract
        )
        
        return {
            "chain": "ethereum",
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
        
        data = await self._etherscan_request(
            module="logs",
            action="getLogs",
            **params
        )
        
        return {
            "chain": "ethereum",
            "address": address,
            "logs": data.get("result", []),
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 📈 SUMMARY METHODS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def get_address_summary(self, address: str, **kwargs) -> Dict[str, Any]:
        """
        Get comprehensive address summary.
        
        Args:
            address: Ethereum address
        
        Returns:
            Complete address data
        """
        balance, txs, tokens, nfts = await asyncio.gather(
            self.get_balance(address),
            self.get_transactions(address),
            self.get_token_transfers(address),
            self.get_nft_transfers(address),
            return_exceptions=True,
        )
        
        return {
            "address": address,
            "chain": "ethereum",
            "balance": balance if not isinstance(balance, Exception) else {"error": str(balance)},
            "transactions": txs if not isinstance(txs, Exception) else {"error": str(txs)},
            "token_transfers": tokens if not isinstance(tokens, Exception) else {"error": str(tokens)},
            "nft_transfers": nfts if not isinstance(nfts, Exception) else {"error": str(nfts)},
        }
    
    async def get_network_summary(self, **kwargs) -> Dict[str, Any]:
        """
        Get comprehensive network summary.
        
        Returns:
            Network statistics
        """
        block_number, gas, price, supply = await asyncio.gather(
            self.get_block_number(),
            self.get_gas_price(),
            self.get_eth_price(),
            self.get_eth_supply(),
            return_exceptions=True,
        )
        
        return {
            "chain": "ethereum",
            "block_number": block_number if not isinstance(block_number, Exception) else None,
            "gas": gas if not isinstance(gas, Exception) else {"error": str(gas)},
            "price": price if not isinstance(price, Exception) else {"error": str(price)},
            "supply": supply if not isinstance(supply, Exception) else {"error": str(supply)},
        }


# ═══════════════════════════════════════════════════════════════════════════════
# 🧪 TESTING
# ═══════════════════════════════════════════════════════════════════════════════

async def test_client():
    """Test the Ethereum client"""
    sys.path.insert(0, str(Path(__file__).parent.parent.parent))
    from config import API_KEYS
    
    async with EthereumClient(API_KEYS.ETHERSCAN_API_KEY) as client:
        # Test address (Vitalik)
        address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
        
        print("🔍 Testing Ethereum Client...")
        
        # Test balance
        balance = await client.get_balance(address)
        print(f"\n💰 Balance: {balance}")
        
        # Test gas
        gas = await client.get_gas_price()
        print(f"\n⛽ Gas: {gas}")
        
        # Test price
        price = await client.get_eth_price()
        print(f"\n💹 Price: {price}")
        
        # Test network summary
        summary = await client.get_network_summary()
        print(f"\n📊 Network Summary: {summary}")


if __name__ == "__main__":
    asyncio.run(test_client())
