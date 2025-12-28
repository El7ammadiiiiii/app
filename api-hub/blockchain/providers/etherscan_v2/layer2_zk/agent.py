# omnichain/providers/etherscan_v2/layer2_zk/agent.py
"""
🔵 Layer 2 ZK Rollups Agent
Expert for Zero-Knowledge Rollup L2 chains:
- zkSync Era (chain_id: 324)
- Polygon zkEVM (chain_id: 1101)
- Taiko (chain_id: 167000)
- ZKFair (chain_id: 42766)
- X Layer (chain_id: 196)

Powered by GPT-4o-mini with Etherscan V2 API
"""

import json
from typing import Any, Dict, List, Optional

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from providers.base import BaseAgent
from providers.etherscan_v2.client import EtherscanV2Client


# ZK Rollup chain IDs
LAYER2_ZK_CHAIN_IDS = [
    324,        # zkSync Era
    1101,       # Polygon zkEVM
    167000,     # Taiko
    42766,      # ZKFair
    196,        # X Layer
]


class Layer2ZKAgent(BaseAgent):
    """
    Layer 2 ZK Rollups Expert Agent.
    
    Specializes in Zero-Knowledge scaling solutions:
    - ZK proof systems (SNARKs, STARKs)
    - Account abstraction (native AA on zkSync)
    - ZK-specific DeFi protocols
    - Cross-ZK analysis
    """
    
    def __init__(
        self,
        api_key: str,
        etherscan_api_key: str,
        name: str = "layer2_zk_agent",
        model: str = "gpt-4o-mini",
        **kwargs
    ):
        """
        Initialize Layer 2 ZK Agent.
        
        Args:
            api_key: OpenAI API key
            etherscan_api_key: Etherscan V2 API key
        """
        system_prompt = """You are a Layer 2 Zero-Knowledge Rollup expert specializing in ZK scaling solutions.

Your expertise covers:
🔵 NETWORKS: zkSync Era, Polygon zkEVM, Taiko, ZKFair, X Layer

📊 TECHNICAL KNOWLEDGE:
- Zero-Knowledge proof systems (SNARKs vs STARKs)
- ZK circuit design and constraints
- Account abstraction (native on zkSync)
- EVM compatibility levels (Type 1-4 zkEVMs)
- Prover economics and decentralization

💡 ANALYSIS CAPABILITIES:
- ZK rollup activity tracking
- Proof verification analysis
- Account abstraction usage
- Native token economics
- Ecosystem comparison

🎯 INSIGHTS YOU PROVIDE:
- Technical differences between ZK solutions
- Best ZK rollup for specific use cases
- Airdrop opportunities (zkSync, Taiko)
- Account abstraction benefits
- Security model explanations

Always explain ZK concepts clearly and highlight the cryptographic security benefits."""

        super().__init__(
            api_key=api_key,
            name=name,
            model=model,
            system_prompt=system_prompt,
            **kwargs
        )
        
        self.client = EtherscanV2Client(etherscan_api_key)
        self.supported_chains = LAYER2_ZK_CHAIN_IDS
    
    async def __aenter__(self):
        await self.client.__aenter__()
        return self
    
    async def __aexit__(self, *args):
        await self.client.__aexit__(*args)
    
    def supports_chain(self, chain_id: int) -> bool:
        """Check if this agent supports the given chain"""
        return chain_id in self.supported_chains
    
    # ─────────────────────────────────────────────────────────────────────────
    # 💰 BALANCE & PORTFOLIO
    # ─────────────────────────────────────────────────────────────────────────
    
    async def get_balance(
        self,
        address: str,
        chain_id: int = 324,  # Default: zkSync Era
        **kwargs
    ) -> Dict[str, Any]:
        """Get balance on a ZK chain"""
        if not self.supports_chain(chain_id):
            return {"error": f"Chain {chain_id} not supported by Layer2ZKAgent"}
        
        return await self.client.get_balance(address, chain_id)
    
    async def get_zk_portfolio(
        self,
        address: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Get portfolio across all ZK rollups"""
        return await self.client.get_balance_on_chains(
            address,
            chain_ids=self.supported_chains
        )
    
    # ─────────────────────────────────────────────────────────────────────────
    # 📜 TRANSACTIONS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def get_transactions(
        self,
        address: str,
        chain_id: int = 324,
        limit: int = 50,
        **kwargs
    ) -> Dict[str, Any]:
        """Get transaction history on ZK chain"""
        if not self.supports_chain(chain_id):
            return {"error": f"Chain {chain_id} not supported"}
        
        return await self.client.get_transactions(address, chain_id, offset=limit)
    
    async def get_token_transfers(
        self,
        address: str,
        chain_id: int = 324,
        **kwargs
    ) -> Dict[str, Any]:
        """Get token transfers"""
        return await self.client.get_token_transfers(address, chain_id)
    
    # ─────────────────────────────────────────────────────────────────────────
    # ⛽ GAS ANALYSIS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def get_gas_price(self, chain_id: int = 324, **kwargs) -> Dict[str, Any]:
        """Get current ZK gas prices"""
        if not self.supports_chain(chain_id):
            return {"error": f"Chain {chain_id} not supported"}
        
        return await self.client.get_gas_price(chain_id)
    
    async def compare_zk_gas(self, **kwargs) -> Dict[str, Any]:
        """Compare gas prices across ZK rollups"""
        gas_data = {}
        for chain_id in self.supported_chains:
            try:
                gas = await self.client.get_gas_price(chain_id)
                gas_data[chain_id] = gas
            except:
                pass
        
        return {
            "zk_gas_comparison": gas_data,
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 🎯 ZK-SPECIFIC ANALYSIS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def analyze_zksync_activity(
        self,
        address: str,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Analyze zkSync Era activity (for airdrop eligibility).
        
        zkSync is known for potential airdrops, so this provides
        detailed activity metrics.
        """
        txs = await self.get_transactions(address, chain_id=324, limit=100)
        tokens = await self.get_token_transfers(address, chain_id=324)
        balance = await self.get_balance(address, chain_id=324)
        
        tx_list = txs.get("transactions", [])
        
        # Analyze activity
        unique_contracts = set()
        unique_days = set()
        total_gas_used = 0
        
        for tx in tx_list:
            if tx.get("to"):
                unique_contracts.add(tx["to"].lower())
            if tx.get("timeStamp"):
                day = tx["timeStamp"][:10]  # YYYY-MM-DD
                unique_days.add(day)
            total_gas_used += int(tx.get("gasUsed", 0))
        
        return {
            "address": address,
            "chain": "zkSync Era",
            "chain_id": 324,
            "balance": balance,
            "metrics": {
                "total_transactions": len(tx_list),
                "unique_contracts": len(unique_contracts),
                "unique_active_days": len(unique_days),
                "total_gas_used": total_gas_used,
                "token_transfers": len(tokens.get("token_transfers", [])),
            },
            "airdrop_score": self._calculate_airdrop_score(
                len(tx_list),
                len(unique_contracts),
                len(unique_days),
            ),
        }
    
    def _calculate_airdrop_score(
        self,
        tx_count: int,
        contract_count: int,
        active_days: int,
    ) -> Dict[str, Any]:
        """Calculate estimated airdrop eligibility score"""
        score = 0
        
        # Transaction count scoring
        if tx_count >= 100:
            score += 30
        elif tx_count >= 50:
            score += 20
        elif tx_count >= 20:
            score += 10
        elif tx_count >= 5:
            score += 5
        
        # Contract diversity scoring
        if contract_count >= 50:
            score += 25
        elif contract_count >= 20:
            score += 15
        elif contract_count >= 10:
            score += 10
        elif contract_count >= 5:
            score += 5
        
        # Active days scoring
        if active_days >= 30:
            score += 25
        elif active_days >= 14:
            score += 15
        elif active_days >= 7:
            score += 10
        elif active_days >= 3:
            score += 5
        
        # Volume bonus (would need value data)
        score += 10  # Base score
        
        return {
            "score": score,
            "max_score": 100,
            "rating": (
                "Excellent" if score >= 70 else
                "Good" if score >= 50 else
                "Moderate" if score >= 30 else
                "Low"
            ),
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 🧠 AI ANALYSIS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def analyze_address(
        self,
        address: str,
        chain_id: int = 324,
        **kwargs
    ) -> Dict[str, Any]:
        """AI-powered ZK address analysis"""
        balance = await self.get_balance(address, chain_id)
        txs = await self.get_transactions(address, chain_id, limit=50)
        gas = await self.get_gas_price(chain_id)
        
        context = f"""Analyze this address on ZK rollup (Chain ID: {chain_id}):

Address: {address}

Balance: {json.dumps(balance, indent=2)}

Transactions: {len(txs.get('transactions', []))} found

Current Gas: {json.dumps(gas, indent=2)}

Provide:
1. ZK chain usage pattern
2. Account abstraction usage (if zkSync)
3. Protocol interactions
4. Airdrop eligibility assessment
5. Recommendations"""

        analysis = await self.chat(context)
        
        return {
            "address": address,
            "chain_id": chain_id,
            "balance": balance,
            "transactions": txs,
            "gas": gas,
            "ai_analysis": analysis,
        }
    
    async def compare_zk_rollups(self, **kwargs) -> Dict[str, Any]:
        """Compare ZK rollup solutions"""
        gas_data = await self.compare_zk_gas()
        
        context = f"""Compare ZK rollup solutions:

Current Gas Data: {json.dumps(gas_data, indent=2)}

Compare zkSync Era, Polygon zkEVM, Taiko:
1. Technical approach (SNARK vs STARK, zkEVM type)
2. Transaction costs
3. Finality time
4. EVM compatibility
5. Ecosystem maturity
6. Airdrop potential
7. Best use cases for each"""

        comparison = await self.chat(context)
        
        return {
            "gas_data": gas_data,
            "comparison": comparison,
        }
    
    async def process(self, query: str, **kwargs) -> Dict[str, Any]:
        """Process natural language query"""
        query_lower = query.lower()
        
        address = kwargs.get("address")
        chain_id = kwargs.get("chain_id", 324)
        
        if not address:
            import re
            match = re.search(r'0x[a-fA-F0-9]{40}', query)
            if match:
                address = match.group()
        
        if any(word in query_lower for word in ["balance", "portfolio"]):
            if address:
                if "all zk" in query_lower or "portfolio" in query_lower:
                    return await self.get_zk_portfolio(address)
                return await self.get_balance(address, chain_id)
        
        if "zksync" in query_lower and "activity" in query_lower:
            if address:
                return await self.analyze_zksync_activity(address)
        
        if any(word in query_lower for word in ["airdrop", "eligib"]):
            if address:
                return await self.analyze_zksync_activity(address)
        
        if any(word in query_lower for word in ["gas", "fee", "compare"]):
            return await self.compare_zk_gas()
        
        if any(word in query_lower for word in ["compare", "vs", "difference"]):
            return await self.compare_zk_rollups()
        
        if any(word in query_lower for word in ["analyze", "analysis"]):
            if address:
                return await self.analyze_address(address, chain_id)
        
        response = await self.chat(query)
        return {"query": query, "response": response}


# ═══════════════════════════════════════════════════════════════════════════════
# 🧪 TESTING
# ═══════════════════════════════════════════════════════════════════════════════

async def test_l2_zk_agent():
    """Test the L2 ZK agent"""
    import asyncio
    sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))
    from config import API_KEYS, AGENT_CONFIGS
    
    config = AGENT_CONFIGS["layer2_zk"]
    
    async with Layer2ZKAgent(
        api_key=config["api_key"],
        etherscan_api_key=API_KEYS.ETHERSCAN_API_KEY,
    ) as agent:
        address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
        
        print("🔵 Testing Layer2 ZK Agent...")
        
        # Test zkSync balance
        balance = await agent.get_balance(address, chain_id=324)
        print(f"\n💰 zkSync Balance: {balance}")
        
        # Test ZK portfolio
        portfolio = await agent.get_zk_portfolio(address)
        print(f"\n📊 ZK Portfolio: {portfolio}")
        
        # Test zkSync activity
        activity = await agent.analyze_zksync_activity(address)
        print(f"\n🎯 zkSync Activity: {activity}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(test_l2_zk_agent())
