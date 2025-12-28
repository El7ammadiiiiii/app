# omnichain/providers/etherscan_v2/layer1/agent.py
"""
🔵 Layer 1 Chains Agent
Expert for foundational Layer 1 EVM chains:
- Ethereum (chain_id: 1)
- BNB Smart Chain (chain_id: 56)
- Avalanche C-Chain (chain_id: 43114)
- Polygon (chain_id: 137)
- Fantom (chain_id: 250)
- Cronos (chain_id: 25)
- Gnosis (chain_id: 100)
- Moonbeam (chain_id: 1284)
- Moonriver (chain_id: 1285)
- Celo (chain_id: 42220)
- Kava (chain_id: 2222)
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


# Layer 1 chain IDs supported by this agent
LAYER1_CHAIN_IDS = [
    1,          # Ethereum
    56,         # BNB Smart Chain
    137,        # Polygon
    43114,      # Avalanche C-Chain
    250,        # Fantom
    25,         # Cronos
    100,        # Gnosis
    1284,       # Moonbeam
    1285,       # Moonriver
    42220,      # Celo
    2222,       # Kava EVM
    122,        # Fuse
    1313161554, # Aurora
    9001,       # Evmos
    7700,       # Canto
    40,         # Telos EVM
    57,         # Syscoin
    20,         # Elastos
    1030,       # Conflux eSpace
    148,        # Shimmer EVM
    4689,       # IoTeX
    14,         # Flare
    8217,       # Klaytn
    1111,       # WEMIX
    248,        # Oasys
]


class Layer1Agent(BaseAgent):
    """
    Layer 1 Chains Expert Agent.
    
    Specializes in analyzing foundational blockchain networks:
    - Native balance tracking
    - Transaction history analysis
    - Cross-chain comparisons
    - Gas optimization
    - DeFi ecosystem insights
    """
    
    def __init__(
        self,
        api_key: str,
        etherscan_api_key: str,
        name: str = "layer1_agent",
        model: str = "gpt-4o-mini",
        **kwargs
    ):
        """
        Initialize Layer 1 Agent.
        
        Args:
            api_key: OpenAI API key
            etherscan_api_key: Etherscan V2 API key
            name: Agent name
            model: OpenAI model to use
        """
        system_prompt = """You are a Layer 1 blockchain expert specializing in foundational EVM networks.

Your expertise covers:
🔵 NETWORKS: Ethereum, BNB Chain, Polygon, Avalanche, Fantom, Cronos, Gnosis, Moonbeam, Moonriver, Celo, Kava, Aurora, and more

📊 ANALYSIS CAPABILITIES:
- Balance and portfolio tracking across L1 chains
- Transaction pattern analysis
- Gas fee optimization strategies
- DeFi protocol interactions
- Staking and validator analysis
- Cross-chain bridge detection
- Whale wallet identification

💡 INSIGHTS YOU PROVIDE:
- Network health and congestion status
- Optimal times for transactions
- Chain-specific optimizations
- Gas-saving strategies
- DeFi yield opportunities
- Security recommendations

Always provide data-driven insights with specific numbers and actionable recommendations.
Format your responses clearly with sections and bullet points."""

        super().__init__(
            api_key=api_key,
            name=name,
            model=model,
            system_prompt=system_prompt,
            **kwargs
        )
        
        self.client = EtherscanV2Client(etherscan_api_key)
        self.supported_chains = LAYER1_CHAIN_IDS
    
    async def __aenter__(self):
        await self.client.__aenter__()
        return self
    
    async def __aexit__(self, *args):
        await self.client.__aexit__(*args)
    
    def supports_chain(self, chain_id: int) -> bool:
        """Check if this agent supports the given chain"""
        return chain_id in self.supported_chains
    
    async def get_supported_chains(self) -> Dict[str, Any]:
        """Get info about all supported chains"""
        chains = get_chains_by_type("layer1")
        return {
            "agent": self.name,
            "chain_count": len(self.supported_chains),
            "chains": chains,
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 💰 BALANCE & PORTFOLIO
    # ─────────────────────────────────────────────────────────────────────────
    
    async def get_balance(
        self,
        address: str,
        chain_id: int = 1,
        **kwargs
    ) -> Dict[str, Any]:
        """Get balance on a specific L1 chain"""
        if not self.supports_chain(chain_id):
            return {"error": f"Chain {chain_id} not supported by Layer1Agent"}
        
        return await self.client.get_balance(address, chain_id)
    
    async def get_portfolio(
        self,
        address: str,
        chain_ids: Optional[List[int]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Get portfolio across multiple L1 chains"""
        chains = chain_ids or self.supported_chains[:10]  # Default top 10
        
        return await self.client.get_balance_on_chains(
            address,
            chain_ids=[c for c in chains if self.supports_chain(c)]
        )
    
    async def get_address_summary(
        self,
        address: str,
        chain_id: int = 1,
        **kwargs
    ) -> Dict[str, Any]:
        """Get comprehensive address summary on a chain"""
        if not self.supports_chain(chain_id):
            return {"error": f"Chain {chain_id} not supported"}
        
        return await self.client.get_address_summary(address, chain_id)
    
    # ─────────────────────────────────────────────────────────────────────────
    # 📜 TRANSACTIONS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def get_transactions(
        self,
        address: str,
        chain_id: int = 1,
        limit: int = 50,
        **kwargs
    ) -> Dict[str, Any]:
        """Get transaction history"""
        if not self.supports_chain(chain_id):
            return {"error": f"Chain {chain_id} not supported"}
        
        return await self.client.get_transactions(
            address, chain_id, offset=limit
        )
    
    async def get_token_transfers(
        self,
        address: str,
        chain_id: int = 1,
        **kwargs
    ) -> Dict[str, Any]:
        """Get ERC-20 token transfer history"""
        if not self.supports_chain(chain_id):
            return {"error": f"Chain {chain_id} not supported"}
        
        return await self.client.get_token_transfers(address, chain_id)
    
    async def get_nft_transfers(
        self,
        address: str,
        chain_id: int = 1,
        **kwargs
    ) -> Dict[str, Any]:
        """Get NFT transfer history"""
        if not self.supports_chain(chain_id):
            return {"error": f"Chain {chain_id} not supported"}
        
        return await self.client.get_nft_transfers(address, chain_id)
    
    # ─────────────────────────────────────────────────────────────────────────
    # ⛽ GAS & CONTRACTS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def get_gas_price(self, chain_id: int = 1, **kwargs) -> Dict[str, Any]:
        """Get current gas prices"""
        if not self.supports_chain(chain_id):
            return {"error": f"Chain {chain_id} not supported"}
        
        return await self.client.get_gas_price(chain_id)
    
    async def get_contract_info(
        self,
        contract: str,
        chain_id: int = 1,
        **kwargs
    ) -> Dict[str, Any]:
        """Get contract ABI and source code"""
        if not self.supports_chain(chain_id):
            return {"error": f"Chain {chain_id} not supported"}
        
        abi = await self.client.get_contract_abi(contract, chain_id)
        source = await self.client.get_source_code(contract, chain_id)
        
        return {
            "contract": contract,
            "chain_id": chain_id,
            "abi": abi,
            "source": source,
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 🧠 AI ANALYSIS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def analyze_address(
        self,
        address: str,
        chain_id: int = 1,
        **kwargs
    ) -> Dict[str, Any]:
        """
        AI-powered address analysis.
        
        Gathers on-chain data and provides intelligent insights.
        """
        # Gather data
        summary = await self.get_address_summary(address, chain_id)
        gas = await self.get_gas_price(chain_id)
        
        # Build context for AI
        context = f"""Analyze this address on {summary.get('chain_name', 'Unknown')} (Chain ID: {chain_id}):

Address: {address}

Balance: {json.dumps(summary.get('balance', {}), indent=2)}

Recent Transactions: {len(summary.get('transactions', {}).get('transactions', []))} found
Token Transfers: {len(summary.get('token_transfers', {}).get('token_transfers', []))} found
NFT Transfers: {len(summary.get('nft_transfers', {}).get('nft_transfers', []))} found

Current Gas Prices: {json.dumps(gas, indent=2)}

Provide:
1. Wallet classification (whale, retail, bot, etc.)
2. Activity patterns
3. Portfolio health assessment
4. Recommendations"""

        analysis = await self.chat(context)
        
        return {
            "address": address,
            "chain_id": chain_id,
            "data": summary,
            "gas": gas,
            "ai_analysis": analysis,
        }
    
    async def compare_chains(
        self,
        chain_ids: Optional[List[int]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Compare multiple L1 chains.
        
        Analyzes gas prices, activity, and provides recommendations.
        """
        chains = chain_ids or [1, 56, 137, 43114, 250]  # Default top chains
        
        # Gather gas prices
        gas_data = {}
        for chain_id in chains:
            if self.supports_chain(chain_id):
                try:
                    gas = await self.get_gas_price(chain_id)
                    gas_data[chain_id] = gas
                except Exception as e:
                    gas_data[chain_id] = {"error": str(e)}
        
        # AI comparison
        context = f"""Compare these Layer 1 chains based on current gas data:

{json.dumps(gas_data, indent=2)}

Provide:
1. Current gas cost comparison (cheapest to most expensive)
2. Best chain for different transaction types
3. Network congestion status
4. Recommendations for users"""

        comparison = await self.chat(context)
        
        return {
            "chains_compared": len(chains),
            "gas_data": gas_data,
            "ai_comparison": comparison,
        }
    
    async def process(self, query: str, **kwargs) -> Dict[str, Any]:
        """
        Process a natural language query.
        
        Routes to appropriate method based on query content.
        """
        query_lower = query.lower()
        
        # Extract address if present
        address = kwargs.get("address")
        chain_id = kwargs.get("chain_id", 1)
        
        if not address:
            # Try to extract from query
            import re
            match = re.search(r'0x[a-fA-F0-9]{40}', query)
            if match:
                address = match.group()
        
        # Route based on intent
        if any(word in query_lower for word in ["balance", "portfolio", "holdings"]):
            if address:
                if "all chains" in query_lower or "portfolio" in query_lower:
                    return await self.get_portfolio(address)
                return await self.get_balance(address, chain_id)
        
        if any(word in query_lower for word in ["transaction", "history", "transfers"]):
            if address:
                return await self.get_transactions(address, chain_id)
        
        if any(word in query_lower for word in ["analyze", "analysis", "insights"]):
            if address:
                return await self.analyze_address(address, chain_id)
        
        if any(word in query_lower for word in ["gas", "fee", "cost"]):
            return await self.get_gas_price(chain_id)
        
        if any(word in query_lower for word in ["compare", "comparison", "vs"]):
            return await self.compare_chains()
        
        # Default: AI response
        response = await self.chat(query)
        return {"query": query, "response": response}


# ═══════════════════════════════════════════════════════════════════════════════
# 🧪 TESTING
# ═══════════════════════════════════════════════════════════════════════════════

async def test_layer1_agent():
    """Test the Layer1 agent"""
    import asyncio
    sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))
    from config import API_KEYS, AGENT_CONFIGS
    
    config = AGENT_CONFIGS["layer1"]
    
    async with Layer1Agent(
        api_key=config["api_key"],
        etherscan_api_key=API_KEYS.ETHERSCAN_API_KEY,
    ) as agent:
        address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"  # Vitalik
        
        print("🔵 Testing Layer1 Agent...")
        
        # Test balance
        balance = await agent.get_balance(address, chain_id=1)
        print(f"\n💰 ETH Balance: {balance}")
        
        # Test portfolio
        portfolio = await agent.get_portfolio(address, chain_ids=[1, 56, 137])
        print(f"\n📊 Portfolio: {portfolio}")
        
        # Test gas
        gas = await agent.get_gas_price(chain_id=1)
        print(f"\n⛽ Gas: {gas}")
        
        # Test analysis
        analysis = await agent.analyze_address(address, chain_id=1)
        print(f"\n🧠 Analysis: {analysis.get('ai_analysis', 'N/A')[:500]}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(test_layer1_agent())
