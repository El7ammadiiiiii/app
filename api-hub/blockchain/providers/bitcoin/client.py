# omnichain/providers/bitcoin/client.py
"""
⭐ Bitcoin Client
Uses Mempool.space API for Bitcoin data (Free, no API key required)
"""

import asyncio
from typing import Any, Dict, List, Optional

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from providers.base import BaseClient, log_request


class BitcoinClient(BaseClient):
    """
    Bitcoin blockchain client using Mempool.space API.
    Free API with generous rate limits.
    
    API Docs: https://mempool.space/docs/api
    """
    
    def __init__(self, rate_limit: float = 10.0, **kwargs):
        """
        Initialize Bitcoin client.
        
        Args:
            rate_limit: Requests per second (default: 10)
        """
        super().__init__(
            base_url="https://mempool.space/api",
            rate_limit=rate_limit,
            **kwargs
        )
    
    def _get_headers(self) -> Dict[str, str]:
        """Override headers - no auth needed"""
        return {
            "Accept": "application/json",
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 💰 ADDRESS APIs
    # ─────────────────────────────────────────────────────────────────────────
    
    @log_request
    async def get_balance(self, address: str, **kwargs) -> Dict[str, Any]:
        """
        Get address balance and statistics.
        
        Args:
            address: Bitcoin address
        
        Returns:
            Address info including balance, tx count, etc.
        """
        data = await self.get(f"address/{address}")
        
        # Calculate balance
        chain_stats = data.get("chain_stats", {})
        mempool_stats = data.get("mempool_stats", {})
        
        confirmed_balance = chain_stats.get("funded_txo_sum", 0) - chain_stats.get("spent_txo_sum", 0)
        unconfirmed_balance = mempool_stats.get("funded_txo_sum", 0) - mempool_stats.get("spent_txo_sum", 0)
        
        return {
            "address": address,
            "chain": "bitcoin",
            "symbol": "BTC",
            "balance_satoshi": confirmed_balance,
            "balance_btc": confirmed_balance / 100_000_000,
            "unconfirmed_satoshi": unconfirmed_balance,
            "unconfirmed_btc": unconfirmed_balance / 100_000_000,
            "total_received_satoshi": chain_stats.get("funded_txo_sum", 0),
            "total_sent_satoshi": chain_stats.get("spent_txo_sum", 0),
            "tx_count": chain_stats.get("tx_count", 0),
            "funded_txo_count": chain_stats.get("funded_txo_count", 0),
            "spent_txo_count": chain_stats.get("spent_txo_count", 0),
        }
    
    @log_request
    async def get_transactions(
        self,
        address: str,
        after_txid: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Get address transactions.
        
        Args:
            address: Bitcoin address
            after_txid: Fetch transactions after this txid (for pagination)
        
        Returns:
            List of transactions
        """
        endpoint = f"address/{address}/txs"
        if after_txid:
            endpoint = f"address/{address}/txs/chain/{after_txid}"
        
        txs = await self.get(endpoint)
        
        # Format transactions
        formatted_txs = []
        for tx in txs:
            formatted_txs.append({
                "txid": tx.get("txid"),
                "version": tx.get("version"),
                "locktime": tx.get("locktime"),
                "size": tx.get("size"),
                "weight": tx.get("weight"),
                "fee": tx.get("fee"),
                "status": {
                    "confirmed": tx.get("status", {}).get("confirmed", False),
                    "block_height": tx.get("status", {}).get("block_height"),
                    "block_time": tx.get("status", {}).get("block_time"),
                },
                "vin_count": len(tx.get("vin", [])),
                "vout_count": len(tx.get("vout", [])),
            })
        
        return {
            "address": address,
            "chain": "bitcoin",
            "transactions": formatted_txs,
            "count": len(formatted_txs),
        }
    
    @log_request
    async def get_utxos(self, address: str, **kwargs) -> Dict[str, Any]:
        """
        Get unspent transaction outputs (UTXOs) for an address.
        
        Args:
            address: Bitcoin address
        
        Returns:
            List of UTXOs
        """
        utxos = await self.get(f"address/{address}/utxo")
        
        total_value = sum(u.get("value", 0) for u in utxos)
        
        return {
            "address": address,
            "chain": "bitcoin",
            "utxos": utxos,
            "count": len(utxos),
            "total_value_satoshi": total_value,
            "total_value_btc": total_value / 100_000_000,
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 📦 TRANSACTION APIs
    # ─────────────────────────────────────────────────────────────────────────
    
    @log_request
    async def get_transaction(self, txid: str, **kwargs) -> Dict[str, Any]:
        """
        Get transaction details.
        
        Args:
            txid: Transaction ID
        
        Returns:
            Transaction details
        """
        tx = await self.get(f"tx/{txid}")
        
        return {
            "txid": tx.get("txid"),
            "chain": "bitcoin",
            "version": tx.get("version"),
            "locktime": tx.get("locktime"),
            "size": tx.get("size"),
            "weight": tx.get("weight"),
            "fee": tx.get("fee"),
            "fee_rate": tx.get("fee") / (tx.get("weight", 1) / 4) if tx.get("weight") else None,
            "status": {
                "confirmed": tx.get("status", {}).get("confirmed", False),
                "block_height": tx.get("status", {}).get("block_height"),
                "block_hash": tx.get("status", {}).get("block_hash"),
                "block_time": tx.get("status", {}).get("block_time"),
            },
            "inputs": [
                {
                    "txid": vin.get("txid"),
                    "vout": vin.get("vout"),
                    "prevout": vin.get("prevout"),
                    "scriptsig": vin.get("scriptsig"),
                    "witness": vin.get("witness"),
                    "sequence": vin.get("sequence"),
                }
                for vin in tx.get("vin", [])
            ],
            "outputs": [
                {
                    "scriptpubkey": vout.get("scriptpubkey"),
                    "scriptpubkey_type": vout.get("scriptpubkey_type"),
                    "scriptpubkey_address": vout.get("scriptpubkey_address"),
                    "value": vout.get("value"),
                }
                for vout in tx.get("vout", [])
            ],
        }
    
    @log_request
    async def get_tx_hex(self, txid: str, **kwargs) -> str:
        """Get raw transaction hex"""
        return await self.get(f"tx/{txid}/hex")
    
    @log_request
    async def get_tx_status(self, txid: str, **kwargs) -> Dict[str, Any]:
        """Get transaction confirmation status"""
        return await self.get(f"tx/{txid}/status")
    
    # ─────────────────────────────────────────────────────────────────────────
    # 🧱 BLOCK APIs
    # ─────────────────────────────────────────────────────────────────────────
    
    @log_request
    async def get_block(self, block_hash: str, **kwargs) -> Dict[str, Any]:
        """
        Get block details.
        
        Args:
            block_hash: Block hash
        
        Returns:
            Block details
        """
        block = await self.get(f"block/{block_hash}")
        
        return {
            "hash": block.get("id"),
            "chain": "bitcoin",
            "height": block.get("height"),
            "version": block.get("version"),
            "timestamp": block.get("timestamp"),
            "bits": block.get("bits"),
            "nonce": block.get("nonce"),
            "difficulty": block.get("difficulty"),
            "merkle_root": block.get("merkle_root"),
            "tx_count": block.get("tx_count"),
            "size": block.get("size"),
            "weight": block.get("weight"),
            "previousblockhash": block.get("previousblockhash"),
        }
    
    @log_request
    async def get_block_height(self, height: int, **kwargs) -> str:
        """Get block hash at height"""
        return await self.get(f"block-height/{height}")
    
    @log_request
    async def get_blocks(self, start_height: Optional[int] = None, **kwargs) -> List[Dict]:
        """
        Get recent blocks.
        
        Args:
            start_height: Start from this height (default: tip)
        
        Returns:
            List of recent blocks
        """
        endpoint = "blocks"
        if start_height:
            endpoint = f"blocks/{start_height}"
        
        return await self.get(endpoint)
    
    @log_request
    async def get_tip_height(self, **kwargs) -> int:
        """Get current blockchain tip height"""
        return await self.get("blocks/tip/height")
    
    @log_request
    async def get_tip_hash(self, **kwargs) -> str:
        """Get current blockchain tip hash"""
        return await self.get("blocks/tip/hash")
    
    # ─────────────────────────────────────────────────────────────────────────
    # ⛽ FEE APIs
    # ─────────────────────────────────────────────────────────────────────────
    
    @log_request
    async def get_fees(self, **kwargs) -> Dict[str, Any]:
        """
        Get recommended fee rates.
        
        Returns:
            Fee rates for different confirmation targets
        """
        fees = await self.get("v1/fees/recommended")
        
        return {
            "chain": "bitcoin",
            "unit": "sat/vB",
            "fastest": fees.get("fastestFee"),  # Next block
            "half_hour": fees.get("halfHourFee"),  # ~30 min
            "hour": fees.get("hourFee"),  # ~1 hour
            "economy": fees.get("economyFee"),  # Low priority
            "minimum": fees.get("minimumFee"),  # Minimum relay
        }
    
    @log_request
    async def get_mempool_blocks(self, **kwargs) -> List[Dict]:
        """Get projected mempool blocks with fees"""
        return await self.get("v1/fees/mempool-blocks")
    
    # ─────────────────────────────────────────────────────────────────────────
    # 📊 MEMPOOL APIs
    # ─────────────────────────────────────────────────────────────────────────
    
    @log_request
    async def get_mempool(self, **kwargs) -> Dict[str, Any]:
        """
        Get mempool statistics.
        
        Returns:
            Mempool size, fees, etc.
        """
        mempool = await self.get("mempool")
        
        return {
            "chain": "bitcoin",
            "count": mempool.get("count"),
            "vsize": mempool.get("vsize"),
            "total_fee": mempool.get("total_fee"),
            "fee_histogram": mempool.get("fee_histogram"),
        }
    
    @log_request
    async def get_mempool_txids(self, **kwargs) -> List[str]:
        """Get all transaction IDs in mempool"""
        return await self.get("mempool/txids")
    
    @log_request
    async def get_mempool_recent(self, **kwargs) -> List[Dict]:
        """Get recent mempool transactions"""
        return await self.get("mempool/recent")
    
    # ─────────────────────────────────────────────────────────────────────────
    # ⚡ LIGHTNING APIs
    # ─────────────────────────────────────────────────────────────────────────
    
    @log_request
    async def get_lightning_stats(self, **kwargs) -> Dict[str, Any]:
        """
        Get Lightning Network statistics.
        
        Returns:
            Network capacity, node/channel counts, etc.
        """
        stats = await self.get("v1/lightning/statistics/latest")
        
        return {
            "chain": "bitcoin_lightning",
            "added": stats.get("added"),
            "channel_count": stats.get("channel_count"),
            "node_count": stats.get("node_count"),
            "total_capacity": stats.get("total_capacity"),
            "avg_capacity": stats.get("avg_capacity"),
            "avg_fee_rate": stats.get("avg_fee_rate"),
            "avg_base_fee_mtokens": stats.get("avg_base_fee_mtokens"),
        }
    
    @log_request
    async def get_lightning_nodes_ranking(self, **kwargs) -> Dict[str, Any]:
        """Get top Lightning nodes by connectivity"""
        return await self.get("v1/lightning/nodes/rankings/connectivity")
    
    @log_request
    async def get_lightning_node(self, pubkey: str, **kwargs) -> Dict[str, Any]:
        """Get Lightning node details"""
        return await self.get(f"v1/lightning/nodes/{pubkey}")
    
    # ─────────────────────────────────────────────────────────────────────────
    # 💹 PRICE APIs
    # ─────────────────────────────────────────────────────────────────────────
    
    @log_request
    async def get_price(self, **kwargs) -> Dict[str, Any]:
        """
        Get current Bitcoin price.
        
        Returns:
            Price in USD and other currencies
        """
        prices = await self.get("v1/prices")
        
        return {
            "chain": "bitcoin",
            "symbol": "BTC",
            "prices": prices,
            "usd": prices.get("USD"),
            "eur": prices.get("EUR"),
            "gbp": prices.get("GBP"),
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # ⛏️ MINING APIs
    # ─────────────────────────────────────────────────────────────────────────
    
    @log_request
    async def get_hashrate(self, timePeriod: str = "1m", **kwargs) -> Dict[str, Any]:
        """
        Get network hashrate.
        
        Args:
            timePeriod: 1m, 3m, 6m, 1y, 2y, 3y, all
        
        Returns:
            Hashrate data
        """
        return await self.get(f"v1/mining/hashrate/{timePeriod}")
    
    @log_request
    async def get_difficulty_adjustment(self, **kwargs) -> Dict[str, Any]:
        """Get difficulty adjustment progress and estimate"""
        return await self.get("v1/difficulty-adjustment")
    
    @log_request
    async def get_mining_pools(self, timePeriod: str = "1w", **kwargs) -> Dict[str, Any]:
        """
        Get mining pool statistics.
        
        Args:
            timePeriod: 24h, 3d, 1w, 1m, 3m, 6m, 1y, 2y, 3y, all
        
        Returns:
            Mining pool distribution
        """
        return await self.get(f"v1/mining/pools/{timePeriod}")
    
    # ─────────────────────────────────────────────────────────────────────────
    # 📈 SUMMARY METHODS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def get_address_summary(self, address: str, **kwargs) -> Dict[str, Any]:
        """
        Get comprehensive address summary.
        
        Args:
            address: Bitcoin address
        
        Returns:
            Complete address data
        """
        balance, txs, utxos = await asyncio.gather(
            self.get_balance(address),
            self.get_transactions(address),
            self.get_utxos(address),
            return_exceptions=True,
        )
        
        return {
            "address": address,
            "chain": "bitcoin",
            "balance": balance if not isinstance(balance, Exception) else {"error": str(balance)},
            "recent_transactions": txs if not isinstance(txs, Exception) else {"error": str(txs)},
            "utxos": utxos if not isinstance(utxos, Exception) else {"error": str(utxos)},
        }
    
    async def get_network_summary(self, **kwargs) -> Dict[str, Any]:
        """
        Get comprehensive network summary.
        
        Returns:
            Network statistics, fees, mempool, etc.
        """
        tip_height, fees, mempool, price, difficulty = await asyncio.gather(
            self.get_tip_height(),
            self.get_fees(),
            self.get_mempool(),
            self.get_price(),
            self.get_difficulty_adjustment(),
            return_exceptions=True,
        )
        
        return {
            "chain": "bitcoin",
            "tip_height": tip_height if not isinstance(tip_height, Exception) else None,
            "fees": fees if not isinstance(fees, Exception) else {"error": str(fees)},
            "mempool": mempool if not isinstance(mempool, Exception) else {"error": str(mempool)},
            "price": price if not isinstance(price, Exception) else {"error": str(price)},
            "difficulty": difficulty if not isinstance(difficulty, Exception) else {"error": str(difficulty)},
        }


# ═══════════════════════════════════════════════════════════════════════════════
# 🧪 TESTING
# ═══════════════════════════════════════════════════════════════════════════════

async def test_client():
    """Test the Bitcoin client"""
    async with BitcoinClient() as client:
        # Test address
        address = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"  # Example address
        
        print("🔍 Testing Bitcoin Client...")
        
        # Test balance
        balance = await client.get_balance(address)
        print(f"\n💰 Balance: {balance}")
        
        # Test fees
        fees = await client.get_fees()
        print(f"\n⛽ Fees: {fees}")
        
        # Test mempool
        mempool = await client.get_mempool()
        print(f"\n📊 Mempool: {mempool}")
        
        # Test network summary
        summary = await client.get_network_summary()
        print(f"\n📈 Network Summary: {summary}")


if __name__ == "__main__":
    asyncio.run(test_client())
