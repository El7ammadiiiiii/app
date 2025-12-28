# omnichain/providers/etherscan_v2/layer2_optimistic/agent.py
"""
🔴 Layer 2 Optimistic Rollups Agent
Expert for Optimistic Rollup L2 chains:
- Optimism (chain_id: 10)
- Arbitrum One (chain_id: 42161)
- Arbitrum Nova (chain_id: 42170)
- Base (chain_id: 8453)
- Mantle (chain_id: 5000)
- Mode (chain_id: 34443)
- Blast (chain_id: 81457)
- Linea (chain_id: 59144)
- Scroll (chain_id: 534352)
- Zora (chain_id: 7777777)
- Fraxtal (chain_id: 252)
- Manta Pacific (chain_id: 169)
- Boba Network (chain_id: 288)
- opBNB (chain_id: 204)
- And more...

Powered by GPT-4o-mini with Etherscan V2 API
"""

import json
from typing import Any, Dict, List, Optional

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from providers.base import BaseAgent
from providers.etherscan_v2.client import EtherscanV2Client
from providers.etherscan_v2.chains import get_chains_by_type


# Optimistic Rollup chain IDs
LAYER2_OPTIMISTIC_CHAIN_IDS = [
    10,         # Optimism
    42161,      # Arbitrum One
    42170,      # Arbitrum Nova
    8453,       # Base
    5000,       # Mantle
    34443,      # Mode
    81457,      # Blast
    59144,      # Linea
    534352,     # Scroll
    7777777,    # Zora
    252,        # Fraxtal
    169,        # Manta Pacific
    288,        # Boba Network
    204,        # opBNB
    1088,       # Metis
    1135,       # Lisk
    7560,       # Cyber
    690,        # Redstone
    185,        # Mint
    48900,      # Zircuit
    255,        # Kroma
    291,        # Orderly Network
]


class Layer2OptimisticAgent(BaseAgent):
    """
    Layer 2 Optimistic Rollups Expert Agent.
    
    Specializes in Optimistic Rollup scaling solutions:
    - Fraud proof systems
    - Bridge analysis
    - L1<>L2 message tracking
    - Gas optimization for L2
    - Cross-L2 analysis
    """
    
    def __init__(
        self,
        api_key: str,
        etherscan_api_key: str,
        name: str = "layer2_optimistic_agent",
        model: str = "gpt-4o-mini",
        **kwargs
    ):
        """
        Initialize Layer 2 Optimistic Agent.
        
        Args:
            api_key: OpenAI API key
            etherscan_api_key: Etherscan V2 API key
        """
        system_prompt = """You are a Layer 2 Optimistic Rollup expert specializing in Ethereum scaling solutions.

Your expertise covers:
🔴 NETWORKS: Optimism, Arbitrum, Base, Blast, Mantle, Mode, Linea, Scroll, Zora, Fraxtal, Manta, Boba, opBNB

📊 TECHNICAL KNOWLEDGE:
- Optimistic rollup architecture (fraud proofs, challenge period)
- L1 to L2 message passing
- Bridge security and withdrawal times
- Sequencer operations
- Gas fee structures (L1 data vs L2 execution)

💡 ANALYSIS CAPABILITIES:
- Cross-L2 portfolio tracking
- Bridge transaction detection
- Airdrop eligibility analysis
- Gas cost comparisons (L2 vs L1)
- DeFi protocol comparisons across L2s
- Sequencer centralization analysis

🎯 INSIGHTS YOU PROVIDE:
- Optimal L2 for different use cases
- Bridge recommendations (speed vs cost)
- Airdrop hunting strategies
- Gas-efficient transaction timing
- Security considerations

Always emphasize the trade-offs between different L2s (decentralization, speed, cost, ecosystem)."""

        super().__init__(
            api_key=api_key,
            name=name,
            model=model,
            system_prompt=system_prompt,
            **kwargs
        )
        
        self.client = EtherscanV2Client(etherscan_api_key)
        self.supported_chains = LAYER2_OPTIMISTIC_CHAIN_IDS
    
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
        chain_id: int = 10,  # Default: Optimism
        **kwargs
    ) -> Dict[str, Any]:
        """Get balance on an L2 chain"""
        if not self.supports_chain(chain_id):
            return {"error": f"Chain {chain_id} not supported by Layer2OptimisticAgent"}
        
        return await self.client.get_balance(address, chain_id)
    
    async def get_l2_portfolio(
        self,
        address: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Get portfolio across all supported L2 chains"""
        return await self.client.get_balance_on_chains(
            address,
            chain_ids=self.supported_chains
        )
    
    async def get_top_l2_portfolio(
        self,
        address: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Get portfolio on top 5 L2s"""
        top_l2s = [10, 42161, 8453, 81457, 59144]  # OP, Arb, Base, Blast, Linea
        return await self.client.get_balance_on_chains(address, chain_ids=top_l2s)
    
    # ─────────────────────────────────────────────────────────────────────────
    # 📜 TRANSACTIONS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def get_transactions(
        self,
        address: str,
        chain_id: int = 10,
        limit: int = 50,
        **kwargs
    ) -> Dict[str, Any]:
        """Get transaction history on an L2"""
        if not self.supports_chain(chain_id):
            return {"error": f"Chain {chain_id} not supported"}
        
        return await self.client.get_transactions(address, chain_id, offset=limit)
    
    async def get_token_transfers(
        self,
        address: str,
        chain_id: int = 10,
        **kwargs
    ) -> Dict[str, Any]:
        """Get ERC-20 transfers on an L2"""
        return await self.client.get_token_transfers(address, chain_id)
    
    async def get_internal_transactions(
        self,
        address: str,
        chain_id: int = 10,
        **kwargs
    ) -> Dict[str, Any]:
        """Get internal transactions (for bridge detection)"""
        return await self.client.get_internal_transactions(address, chain_id)
    
    # ─────────────────────────────────────────────────────────────────────────
    # ⛽ GAS ANALYSIS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def get_gas_price(self, chain_id: int = 10, **kwargs) -> Dict[str, Any]:
        """Get current L2 gas prices"""
        if not self.supports_chain(chain_id):
            return {"error": f"Chain {chain_id} not supported"}
        
        return await self.client.get_gas_price(chain_id)
    
    async def compare_l2_gas(self, **kwargs) -> Dict[str, Any]:
        """Compare gas prices across all L2s"""
        top_l2s = [10, 42161, 8453, 81457, 59144, 5000, 34443]
        
        gas_data = {}
        for chain_id in top_l2s:
            try:
                gas = await self.client.get_gas_price(chain_id)
                gas_data[chain_id] = gas
            except:
                pass
        
        return {
            "l2_gas_comparison": gas_data,
            "cheapest": min(
                gas_data.items(),
                key=lambda x: float(x[1].get("average", 999999)) if not x[1].get("error") else 999999
            )[0] if gas_data else None
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 🌉 BRIDGE ANALYSIS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def detect_bridge_activity(
        self,
        address: str,
        chain_id: int = 10,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Detect bridge-related transactions.
        
        Looks for:
        - L1->L2 deposits
        - L2->L1 withdrawals
        - Cross-L2 bridges (Hop, Across, Stargate)
        """
        # Get internal transactions (bridges often use internal calls)
        internal_txs = await self.get_internal_transactions(address, chain_id)
        
        # Get regular transactions
        txs = await self.get_transactions(address, chain_id, limit=100)
        
        # Known bridge contracts (partial list)
        bridge_contracts = {
            # Optimism Official Bridge
            "0x4200000000000000000000000000000000000010": "Optimism Gateway",
            "0x99C9fc46f92E8a1c0deC1b1747d010903E884bE1": "Optimism L1 Bridge",
            # Arbitrum
            "0x8315177aB297bA92A06054cE80a67Ed4DBd7ed3a": "Arbitrum Bridge",
            # Hop Protocol
            "0x3666f603cc164936c1b87e207f36beba4ac5f18a": "Hop Bridge",
            # Across
            "0x5c7BCd6E7De5423a257D81B442095A1a6ced35C5": "Across Bridge",
        }
        
        bridge_txs = []
        for tx in txs.get("transactions", []):
            to_addr = tx.get("to", "").lower()
            for bridge_addr, bridge_name in bridge_contracts.items():
                if to_addr == bridge_addr.lower():
                    bridge_txs.append({
                        **tx,
                        "bridge_name": bridge_name
                    })
        
        return {
            "address": address,
            "chain_id": chain_id,
            "bridge_transactions": bridge_txs,
            "bridge_count": len(bridge_txs),
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 🎯 AIRDROP ANALYSIS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def analyze_airdrop_eligibility(
        self,
        address: str,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Analyze potential airdrop eligibility across L2s.
        
        Checks:
        - Activity on each L2
        - Transaction count
        - Unique contracts interacted
        - Time span of activity
        """
        l2_activity = {}
        
        for chain_id in [10, 42161, 8453, 81457, 59144, 324]:  # Major L2s
            try:
                txs = await self.get_transactions(address, chain_id, limit=100)
                tx_list = txs.get("transactions", [])
                
                if tx_list:
                    unique_contracts = set(tx.get("to", "") for tx in tx_list)
                    l2_activity[chain_id] = {
                        "chain_name": txs.get("chain_name"),
                        "transaction_count": len(tx_list),
                        "unique_contracts": len(unique_contracts),
                        "first_tx": tx_list[-1].get("timeStamp") if tx_list else None,
                        "last_tx": tx_list[0].get("timeStamp") if tx_list else None,
                    }
            except:
                pass
        
        return {
            "address": address,
            "l2_activity": l2_activity,
            "active_on_chains": len(l2_activity),
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 🧠 AI ANALYSIS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def analyze_address(
        self,
        address: str,
        chain_id: int = 10,
        **kwargs
    ) -> Dict[str, Any]:
        """AI-powered L2 address analysis"""
        # Gather data
        balance = await self.get_balance(address, chain_id)
        txs = await self.get_transactions(address, chain_id, limit=50)
        gas = await self.get_gas_price(chain_id)
        bridges = await self.detect_bridge_activity(address, chain_id)
        
        context = f"""Analyze this address on L2 chain (ID: {chain_id}):

Address: {address}

Balance: {json.dumps(balance, indent=2)}

Transactions: {len(txs.get('transactions', []))} found
Bridge Activity: {bridges.get('bridge_count', 0)} bridge transactions

Current Gas: {json.dumps(gas, indent=2)}

Provide:
1. L2 usage pattern analysis
2. Bridge behavior assessment
3. Potential airdrop eligibility
4. Recommendations for L2 optimization"""

        analysis = await self.chat(context)
        
        return {
            "address": address,
            "chain_id": chain_id,
            "balance": balance,
            "transactions": txs,
            "bridges": bridges,
            "gas": gas,
            "ai_analysis": analysis,
        }
    
    async def recommend_l2(self, use_case: str = "general", **kwargs) -> Dict[str, Any]:
        """
        Recommend the best L2 for a specific use case.
        
        Use cases: defi, nft, gaming, low_cost, speed, security
        """
        gas_comparison = await self.compare_l2_gas()
        
        context = f"""Based on current L2 conditions:

Gas Data: {json.dumps(gas_comparison, indent=2)}

User Use Case: {use_case}

Recommend the best L2 considering:
1. Transaction costs
2. Ecosystem strength for {use_case}
3. Decentralization level
4. Bridge options
5. Airdrop potential

Provide a ranked recommendation with pros/cons for each."""

        recommendation = await self.chat(context)
        
        return {
            "use_case": use_case,
            "gas_data": gas_comparison,
            "recommendation": recommendation,
        }
    
    async def process(self, query: str, **kwargs) -> Dict[str, Any]:
        """Process natural language query"""
        query_lower = query.lower()
        
        address = kwargs.get("address")
        chain_id = kwargs.get("chain_id", 10)
        
        # Extract address
        if not address:
            import re
            match = re.search(r'0x[a-fA-F0-9]{40}', query)
            if match:
                address = match.group()
        
        # Route
        if any(word in query_lower for word in ["balance", "portfolio"]):
            if address:
                if "all l2" in query_lower or "portfolio" in query_lower:
                    return await self.get_l2_portfolio(address)
                return await self.get_balance(address, chain_id)
        
        if any(word in query_lower for word in ["bridge", "bridg"]):
            if address:
                return await self.detect_bridge_activity(address, chain_id)
        
        if any(word in query_lower for word in ["airdrop", "eligib"]):
            if address:
                return await self.analyze_airdrop_eligibility(address)
        
        if any(word in query_lower for word in ["gas", "fee", "compare"]):
            return await self.compare_l2_gas()
        
        if any(word in query_lower for word in ["recommend", "best l2", "which l2"]):
            return await self.recommend_l2(query)
        
        if any(word in query_lower for word in ["analyze", "analysis"]):
            if address:
                return await self.analyze_address(address, chain_id)
        
        response = await self.chat(query)
        return {"query": query, "response": response}


# ═══════════════════════════════════════════════════════════════════════════════
# 🧪 TESTING
# ═══════════════════════════════════════════════════════════════════════════════

async def test_l2_optimistic_agent():
    """Test the L2 Optimistic agent"""
    import asyncio
    sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))
    from config import API_KEYS, AGENT_CONFIGS
    
    config = AGENT_CONFIGS["layer2_optimistic"]
    
    async with Layer2OptimisticAgent(
        api_key=config["api_key"],
        etherscan_api_key=API_KEYS.ETHERSCAN_API_KEY,
    ) as agent:
        address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
        
        print("🔴 Testing Layer2 Optimistic Agent...")
        
        # Test balance on Optimism
        balance = await agent.get_balance(address, chain_id=10)
        print(f"\n💰 OP Balance: {balance}")
        
        # Test L2 portfolio
        portfolio = await agent.get_top_l2_portfolio(address)
        print(f"\n📊 L2 Portfolio: {portfolio}")
        
        # Test gas comparison
        gas = await agent.compare_l2_gas()
        print(f"\n⛽ Gas Comparison: {gas}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(test_l2_optimistic_agent())
