# omnichain/providers/etherscan_v2/bitcoin_l2/agent.py
"""
🟠 Bitcoin Layer 2 Agent
Expert for Bitcoin sidechains and L2 solutions:
- BOB (Build on Bitcoin) (chain_id: 60808)
- Merlin (chain_id: 4200)
- Bitlayer (chain_id: 200901)
- Core DAO (chain_id: 1116)
- Rootstock/RSK (chain_id: 30)

Powered by GPT-4o-mini with Etherscan V2 API
"""

import json
from typing import Any, Dict, List, Optional

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from providers.base import BaseAgent
from providers.etherscan_v2.client import EtherscanV2Client


# Bitcoin L2/Sidechain chain IDs
BITCOIN_L2_CHAIN_IDS = [
    60808,      # BOB (Build on Bitcoin)
    4200,       # Merlin
    200901,     # Bitlayer
    1116,       # Core DAO
    30,         # Rootstock (RSK)
]


class BitcoinL2Agent(BaseAgent):
    """
    Bitcoin Layer 2 Expert Agent.
    
    Specializes in Bitcoin scaling solutions:
    - Bitcoin-backed assets analysis
    - Cross-chain BTC tracking
    - BTC L2 ecosystem comparison
    - DeFi on Bitcoin L2s
    """
    
    def __init__(
        self,
        api_key: str,
        etherscan_api_key: str,
        name: str = "bitcoin_l2_agent",
        model: str = "gpt-4o-mini",
        **kwargs
    ):
        """
        Initialize Bitcoin L2 Agent.
        
        Args:
            api_key: OpenAI API key
            etherscan_api_key: Etherscan V2 API key
        """
        system_prompt = """You are a Bitcoin Layer 2 and sidechain expert.

Your expertise covers:
🟠 NETWORKS: BOB (Build on Bitcoin), Merlin, Bitlayer, Core DAO, Rootstock/RSK

📊 TECHNICAL KNOWLEDGE:
- Bitcoin-backed token standards (wBTC, rBTC, etc.)
- Sidechain architectures and security models
- Federated pegs vs trust-minimized bridges
- Ordinals and BRC-20 interactions
- Bitcoin script limitations and L2 solutions

💡 ANALYSIS CAPABILITIES:
- BTC-denominated portfolio tracking
- Cross-chain BTC movement analysis
- Bitcoin L2 DeFi opportunities
- Bridge security assessment
- Yield opportunities on Bitcoin L2s

🎯 INSIGHTS YOU PROVIDE:
- Best Bitcoin L2 for different use cases
- Security trade-offs of each solution
- Yield farming opportunities
- Bridge recommendations
- Ordinals/BRC-20 integration status

Always emphasize Bitcoin's security model and how each L2 inherits or diverges from it."""

        super().__init__(
            api_key=api_key,
            name=name,
            model=model,
            system_prompt=system_prompt,
            **kwargs
        )
        
        self.client = EtherscanV2Client(etherscan_api_key)
        self.supported_chains = BITCOIN_L2_CHAIN_IDS
    
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
        chain_id: int = 60808,  # Default: BOB
        **kwargs
    ) -> Dict[str, Any]:
        """Get balance on a Bitcoin L2 chain"""
        if not self.supports_chain(chain_id):
            return {"error": f"Chain {chain_id} not supported by BitcoinL2Agent"}
        
        return await self.client.get_balance(address, chain_id)
    
    async def get_btc_l2_portfolio(
        self,
        address: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Get portfolio across all Bitcoin L2 chains"""
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
        chain_id: int = 60808,
        limit: int = 50,
        **kwargs
    ) -> Dict[str, Any]:
        """Get transaction history"""
        if not self.supports_chain(chain_id):
            return {"error": f"Chain {chain_id} not supported"}
        
        return await self.client.get_transactions(address, chain_id, offset=limit)
    
    async def get_token_transfers(
        self,
        address: str,
        chain_id: int = 60808,
        **kwargs
    ) -> Dict[str, Any]:
        """Get token transfers (wBTC, etc.)"""
        return await self.client.get_token_transfers(address, chain_id)
    
    # ─────────────────────────────────────────────────────────────────────────
    # ⛽ GAS ANALYSIS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def get_gas_price(self, chain_id: int = 60808, **kwargs) -> Dict[str, Any]:
        """Get current gas prices"""
        if not self.supports_chain(chain_id):
            return {"error": f"Chain {chain_id} not supported"}
        
        return await self.client.get_gas_price(chain_id)
    
    async def compare_btc_l2_gas(self, **kwargs) -> Dict[str, Any]:
        """Compare gas prices across Bitcoin L2s"""
        gas_data = {}
        for chain_id in self.supported_chains:
            try:
                gas = await self.client.get_gas_price(chain_id)
                gas_data[chain_id] = gas
            except:
                pass
        
        return {
            "btc_l2_gas_comparison": gas_data,
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 🟠 BTC-SPECIFIC ANALYSIS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def analyze_btc_holdings(
        self,
        address: str,
        chain_id: int = 60808,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Analyze BTC-related holdings on a Bitcoin L2.
        
        Tracks:
        - Native balance (often BTC-denominated)
        - wBTC holdings
        - Other BTC-backed tokens
        """
        balance = await self.get_balance(address, chain_id)
        tokens = await self.get_token_transfers(address, chain_id)
        
        # Known BTC-backed token contracts (varies by chain)
        btc_tokens = {
            "wbtc": "Wrapped Bitcoin",
            "rbtc": "Rootstock Bitcoin",
            "btcb": "Bitcoin BEP20",
        }
        
        btc_related = []
        for transfer in tokens.get("token_transfers", []):
            symbol = transfer.get("tokenSymbol", "").lower()
            if any(btc_sym in symbol for btc_sym in btc_tokens.keys()):
                btc_related.append(transfer)
        
        return {
            "address": address,
            "chain_id": chain_id,
            "native_balance": balance,
            "btc_token_transfers": btc_related,
            "btc_transfer_count": len(btc_related),
        }
    
    async def compare_btc_l2s(self, **kwargs) -> Dict[str, Any]:
        """
        Compare Bitcoin L2 solutions.
        
        Analyzes:
        - Security model
        - BTC peg mechanism
        - DeFi ecosystem
        - Transaction costs
        """
        gas_data = await self.compare_btc_l2_gas()
        
        l2_info = {
            60808: {
                "name": "BOB (Build on Bitcoin)",
                "type": "Optimistic Rollup",
                "peg": "Merged Mining + BitVM",
                "native_token": "ETH",
            },
            4200: {
                "name": "Merlin",
                "type": "ZK Rollup",
                "peg": "Oracle Network",
                "native_token": "BTC",
            },
            200901: {
                "name": "Bitlayer",
                "type": "BitVM-based",
                "peg": "BitVM Bridge",
                "native_token": "BTC",
            },
            1116: {
                "name": "Core DAO",
                "type": "Sidechain",
                "peg": "Satoshi Plus Consensus",
                "native_token": "CORE",
            },
            30: {
                "name": "Rootstock (RSK)",
                "type": "Sidechain",
                "peg": "Federated Peg (PowPeg)",
                "native_token": "RBTC",
            },
        }
        
        return {
            "btc_l2_comparison": l2_info,
            "gas_data": gas_data,
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 🧠 AI ANALYSIS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def analyze_address(
        self,
        address: str,
        chain_id: int = 60808,
        **kwargs
    ) -> Dict[str, Any]:
        """AI-powered Bitcoin L2 address analysis"""
        balance = await self.get_balance(address, chain_id)
        txs = await self.get_transactions(address, chain_id, limit=50)
        btc_holdings = await self.analyze_btc_holdings(address, chain_id)
        gas = await self.get_gas_price(chain_id)
        
        context = f"""Analyze this address on Bitcoin L2 (Chain ID: {chain_id}):

Address: {address}

Balance: {json.dumps(balance, indent=2)}

BTC Holdings: {json.dumps(btc_holdings, indent=2)}

Transactions: {len(txs.get('transactions', []))} found

Current Gas: {json.dumps(gas, indent=2)}

Provide:
1. Bitcoin L2 usage pattern
2. BTC exposure assessment
3. DeFi protocol interactions
4. Bridge activity
5. Recommendations for Bitcoin-focused portfolio"""

        analysis = await self.chat(context)
        
        return {
            "address": address,
            "chain_id": chain_id,
            "balance": balance,
            "btc_holdings": btc_holdings,
            "transactions": txs,
            "gas": gas,
            "ai_analysis": analysis,
        }
    
    async def recommend_btc_l2(
        self,
        use_case: str = "general",
        **kwargs
    ) -> Dict[str, Any]:
        """Recommend best Bitcoin L2 for a use case"""
        comparison = await self.compare_btc_l2s()
        
        context = f"""Based on Bitcoin L2 comparison:

{json.dumps(comparison, indent=2)}

User Use Case: {use_case}

Recommend the best Bitcoin L2 considering:
1. Security model (trust assumptions)
2. BTC native support
3. DeFi ecosystem
4. Transaction costs
5. Bridge safety

Provide ranked recommendations with pros/cons."""

        recommendation = await self.chat(context)
        
        return {
            "use_case": use_case,
            "comparison": comparison,
            "recommendation": recommendation,
        }
    
    async def process(self, query: str, **kwargs) -> Dict[str, Any]:
        """Process natural language query"""
        query_lower = query.lower()
        
        address = kwargs.get("address")
        chain_id = kwargs.get("chain_id", 60808)
        
        if not address:
            import re
            match = re.search(r'0x[a-fA-F0-9]{40}', query)
            if match:
                address = match.group()
        
        if any(word in query_lower for word in ["balance", "portfolio"]):
            if address:
                if "all" in query_lower or "portfolio" in query_lower:
                    return await self.get_btc_l2_portfolio(address)
                return await self.get_balance(address, chain_id)
        
        if any(word in query_lower for word in ["btc", "bitcoin", "wbtc"]):
            if address:
                return await self.analyze_btc_holdings(address, chain_id)
        
        if any(word in query_lower for word in ["compare", "vs", "which"]):
            return await self.compare_btc_l2s()
        
        if any(word in query_lower for word in ["recommend", "best"]):
            return await self.recommend_btc_l2(query)
        
        if any(word in query_lower for word in ["analyze", "analysis"]):
            if address:
                return await self.analyze_address(address, chain_id)
        
        response = await self.chat(query)
        return {"query": query, "response": response}


# ═══════════════════════════════════════════════════════════════════════════════
# 🧪 TESTING
# ═══════════════════════════════════════════════════════════════════════════════

async def test_bitcoin_l2_agent():
    """Test the Bitcoin L2 agent"""
    import asyncio
    sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))
    from config import API_KEYS, AGENT_CONFIGS
    
    config = AGENT_CONFIGS["bitcoin_l2"]
    
    async with BitcoinL2Agent(
        api_key=config["api_key"],
        etherscan_api_key=API_KEYS.ETHERSCAN_API_KEY,
    ) as agent:
        address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
        
        print("🟠 Testing Bitcoin L2 Agent...")
        
        # Test balance on BOB
        balance = await agent.get_balance(address, chain_id=60808)
        print(f"\n💰 BOB Balance: {balance}")
        
        # Test BTC L2 portfolio
        portfolio = await agent.get_btc_l2_portfolio(address)
        print(f"\n📊 BTC L2 Portfolio: {portfolio}")
        
        # Test comparison
        comparison = await agent.compare_btc_l2s()
        print(f"\n🔍 Comparison: {comparison}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(test_bitcoin_l2_agent())
