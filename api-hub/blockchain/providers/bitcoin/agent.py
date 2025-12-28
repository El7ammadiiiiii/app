# omnichain/providers/bitcoin/agent.py
"""
⭐ Bitcoin Expert Agent
Specialized GPT-4o-mini agent for Bitcoin blockchain analysis
"""

import json
import logging
from typing import Any, Dict, Optional

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from providers.base import BaseAgent
from providers.bitcoin.client import BitcoinClient

logger = logging.getLogger(__name__)


class BitcoinAgent(BaseAgent):
    """
    Bitcoin Expert Agent powered by GPT-4o-mini.
    
    Specializes in:
    - UTXO analysis
    - Fee estimation and optimization
    - Transaction decoding
    - Lightning Network insights
    - Mining/hashrate analysis
    """
    
    def __init__(self, api_key: str, **kwargs):
        """
        Initialize Bitcoin agent.
        
        Args:
            api_key: OpenAI API key
        """
        super().__init__(
            name="Bitcoin Expert",
            api_key=api_key,
            model="gpt-4o-mini",
            **kwargs
        )
        
        # Initialize Bitcoin client
        self._bitcoin_client = BitcoinClient()
    
    def _default_system_prompt(self) -> str:
        """Bitcoin-specific system prompt"""
        return """You are the Bitcoin Expert, a specialized AI agent for Bitcoin blockchain analysis.

Your expertise includes:
🔗 **UTXO Model**: Deep understanding of Bitcoin's Unspent Transaction Output model
⛽ **Fee Optimization**: Expert at analyzing mempool and recommending optimal fees
📊 **Transaction Analysis**: Decode and explain Bitcoin transactions
⚡ **Lightning Network**: Knowledge of L2 scaling, channels, and routing
⛏️ **Mining**: Hashrate trends, difficulty adjustments, pool distribution

When analyzing Bitcoin data:
1. Always consider the UTXO model (different from account model)
2. Calculate fees in sat/vB for accuracy
3. Note confirmation status and block depth
4. Identify transaction types (P2PKH, P2SH, P2WPKH, P2WSH, P2TR)
5. Check for multisig, timelocks, or other scripts

Formatting guidelines:
- Use satoshis for precision, BTC for readability
- Format large numbers with commas
- Show fee rates as sat/vB
- Include USD estimates when price available

Always be precise with Bitcoin amounts:
- 1 BTC = 100,000,000 satoshis
- Typical fees: 1-100 sat/vB depending on urgency"""
    
    async def initialize(self) -> None:
        """Initialize both AI client and Bitcoin data client"""
        await super().initialize()
        await self._bitcoin_client.initialize()
        self.set_data_client(self._bitcoin_client)
        logger.info("Bitcoin Expert initialized")
    
    async def close(self) -> None:
        """Close all resources"""
        await self._bitcoin_client.close()
        await super().close()
    
    async def process_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a request from the orchestrator.
        
        Args:
            request: Request dict with action, params, query
        
        Returns:
            Response with data and analysis
        """
        action = request.get("action", "analyze")
        params = request.get("params", {})
        address = request.get("address")
        query = request.get("query")
        
        try:
            # Route to appropriate method
            if action == "get_balance" and address:
                data = await self._bitcoin_client.get_balance(address)
                
            elif action == "get_transactions" and address:
                data = await self._bitcoin_client.get_transactions(address)
                
            elif action == "get_utxos" and address:
                data = await self._bitcoin_client.get_utxos(address)
                
            elif action == "get_fees":
                data = await self._bitcoin_client.get_fees()
                
            elif action == "get_mempool":
                data = await self._bitcoin_client.get_mempool()
                
            elif action == "get_price":
                data = await self._bitcoin_client.get_price()
                
            elif action == "get_lightning":
                data = await self._bitcoin_client.get_lightning_stats()
                
            elif action == "get_network":
                data = await self._bitcoin_client.get_network_summary()
                
            elif action == "get_transaction":
                txid = params.get("txid")
                if txid:
                    data = await self._bitcoin_client.get_transaction(txid)
                else:
                    return {"success": False, "error": "txid required for get_transaction"}
                
            elif action == "analyze" and address:
                data = await self._bitcoin_client.get_address_summary(address)
                
            else:
                # Default: get network summary for general queries
                data = await self._bitcoin_client.get_network_summary()
            
            # Generate AI analysis if query provided
            analysis = None
            if query:
                analysis = await self.analyze(query, data)
            
            return {
                "success": True,
                "data": data,
                "analysis": analysis,
            }
            
        except Exception as e:
            logger.error(f"Bitcoin agent error: {e}")
            return {
                "success": False,
                "error": str(e),
            }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 🔍 SPECIALIZED ANALYSIS METHODS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def analyze_address(self, address: str) -> Dict[str, Any]:
        """
        Comprehensive address analysis.
        
        Args:
            address: Bitcoin address
        
        Returns:
            Detailed analysis with AI insights
        """
        # Fetch all address data
        data = await self._bitcoin_client.get_address_summary(address)
        
        # Prepare analysis query
        query = f"""Analyze this Bitcoin address comprehensively:

Address: {address}

Provide:
1. Balance overview (confirmed vs unconfirmed)
2. Transaction activity summary
3. UTXO analysis (consolidation needed?)
4. Address type identification
5. Any notable patterns or concerns
6. Recommendations for the address holder"""
        
        analysis = await self.analyze(query, data)
        
        return {
            "success": True,
            "data": data,
            "analysis": analysis,
        }
    
    async def analyze_transaction(self, txid: str) -> Dict[str, Any]:
        """
        Deep transaction analysis.
        
        Args:
            txid: Transaction ID
        
        Returns:
            Transaction analysis with AI insights
        """
        data = await self._bitcoin_client.get_transaction(txid)
        
        query = f"""Analyze this Bitcoin transaction in detail:

TXID: {txid}

Provide:
1. Transaction summary (inputs, outputs, fee)
2. Fee efficiency analysis (sat/vB)
3. Script types used
4. Privacy analysis (any concerns?)
5. Confirmation status and security
6. Any unusual characteristics"""
        
        analysis = await self.analyze(query, data)
        
        return {
            "success": True,
            "data": data,
            "analysis": analysis,
        }
    
    async def optimize_fee(self, urgency: str = "normal") -> Dict[str, Any]:
        """
        Get optimal fee recommendation.
        
        Args:
            urgency: 'urgent', 'normal', 'low', 'economy'
        
        Returns:
            Fee recommendation with reasoning
        """
        fees = await self._bitcoin_client.get_fees()
        mempool = await self._bitcoin_client.get_mempool()
        
        data = {
            "fees": fees,
            "mempool": mempool,
            "urgency": urgency,
        }
        
        query = f"""Based on current mempool conditions, recommend the optimal fee for a {urgency} priority transaction.

Provide:
1. Recommended fee rate (sat/vB)
2. Estimated confirmation time
3. Mempool analysis
4. Cost comparison for a typical transaction (~250 vB)
5. Alternative strategies if saving fees is important"""
        
        analysis = await self.analyze(query, data)
        
        return {
            "success": True,
            "data": data,
            "analysis": analysis,
        }
    
    async def analyze_lightning(self) -> Dict[str, Any]:
        """
        Lightning Network analysis.
        
        Returns:
            Lightning Network insights
        """
        stats = await self._bitcoin_client.get_lightning_stats()
        
        query = """Analyze the current state of the Lightning Network:

Provide:
1. Network capacity and growth trends
2. Node and channel statistics
3. Average fees and routing costs
4. Network health assessment
5. Recommendations for users/node operators"""
        
        analysis = await self.analyze(query, stats)
        
        return {
            "success": True,
            "data": stats,
            "analysis": analysis,
        }
    
    async def analyze_mining(self) -> Dict[str, Any]:
        """
        Mining and hashrate analysis.
        
        Returns:
            Mining insights
        """
        difficulty = await self._bitcoin_client.get_difficulty_adjustment()
        pools = await self._bitcoin_client.get_mining_pools("1w")
        
        data = {
            "difficulty": difficulty,
            "pools": pools,
        }
        
        query = """Analyze the current Bitcoin mining landscape:

Provide:
1. Difficulty adjustment progress and prediction
2. Mining pool distribution analysis
3. Decentralization assessment
4. Hashrate trends
5. Notable changes or concerns"""
        
        analysis = await self.analyze(query, data)
        
        return {
            "success": True,
            "data": data,
            "analysis": analysis,
        }


# ═══════════════════════════════════════════════════════════════════════════════
# 🧪 TESTING
# ═══════════════════════════════════════════════════════════════════════════════

async def test_agent():
    """Test the Bitcoin agent"""
    import asyncio
    
    # Get API key from config
    sys.path.insert(0, str(Path(__file__).parent.parent.parent))
    from config import API_KEYS
    
    async with BitcoinAgent(API_KEYS.OPENAI_BITCOIN) as agent:
        print("🔍 Testing Bitcoin Agent...")
        
        # Test fee optimization
        result = await agent.optimize_fee("normal")
        print(f"\n⛽ Fee Optimization:\n{result.get('analysis', '')[:500]}...")
        
        # Test network analysis
        result = await agent.process_request({
            "action": "get_network",
            "query": "Summarize the current state of the Bitcoin network"
        })
        print(f"\n📊 Network Analysis:\n{result.get('analysis', '')[:500]}...")


if __name__ == "__main__":
    import asyncio
    asyncio.run(test_agent())
