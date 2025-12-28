# omnichain/providers/etherscan_v2/app_chains/agent.py
"""
🟢 App Chains Agent
Expert for Application-Specific and Gaming chains:
- Immutable zkEVM (chain_id: 13371)
- Ronin (chain_id: 2020)
- Xai (chain_id: 660279)
- ApeChain (chain_id: 33139)
- Degen (chain_id: 666666666)
- Abstract (chain_id: 2741)
- World Chain (chain_id: 480)
- Sei (chain_id: 1329)
- And more specialized chains...

Powered by GPT-4o-mini with Etherscan V2 API
"""

import json
from typing import Any, Dict, List, Optional

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from providers.base import BaseAgent
from providers.etherscan_v2.client import EtherscanV2Client


# App Chain / Gaming chain IDs
APP_CHAIN_IDS = [
    # Gaming Chains
    13371,      # Immutable zkEVM
    2020,       # Ronin
    660279,     # Xai
    33139,      # ApeChain
    
    # Social/Meme Chains
    666666666,  # Degen
    2741,       # Abstract
    480,        # World Chain (Worldcoin)
    
    # DeFi Focused
    1329,       # Sei
    592,        # Astar
    336,        # Shiden
    
    # Infrastructure
    245022934,  # Neon EVM
    1666600000, # Harmony
    369,        # PulseChain
    
    # Other specialized
    122,        # Fuse
    1313161554, # Aurora
    9001,       # Evmos
    7700,       # Canto
]


class AppChainsAgent(BaseAgent):
    """
    App Chains Expert Agent.
    
    Specializes in application-specific blockchains:
    - Gaming ecosystems (Immutable, Ronin, Xai)
    - Social chains (Degen, World Chain)
    - DeFi-optimized chains (Sei)
    - Specialized app chains
    """
    
    def __init__(
        self,
        api_key: str,
        etherscan_api_key: str,
        name: str = "app_chains_agent",
        model: str = "gpt-4o-mini",
        **kwargs
    ):
        """
        Initialize App Chains Agent.
        
        Args:
            api_key: OpenAI API key
            etherscan_api_key: Etherscan V2 API key
        """
        system_prompt = """You are an Application-Specific Blockchain expert.

Your expertise covers:
🟢 GAMING CHAINS: Immutable zkEVM, Ronin, Xai, ApeChain
🔵 SOCIAL CHAINS: Degen, World Chain, Abstract
💰 DEFI CHAINS: Sei, Astar, Shiden
🔧 SPECIALIZED: Neon EVM, Aurora, Harmony, PulseChain

📊 TECHNICAL KNOWLEDGE:
- App chain architecture benefits
- Gaming asset standards (NFTs, in-game items)
- Social token mechanics
- Parallel execution (Sei)
- Cross-chain gaming assets

💡 ANALYSIS CAPABILITIES:
- Gaming wallet analysis
- NFT portfolio tracking
- Social token holdings
- DeFi positions on specialized chains
- Airdrop eligibility (gaming airdrops)

🎯 INSIGHTS YOU PROVIDE:
- Best chains for specific use cases (gaming, social, DeFi)
- NFT marketplace activity
- Gaming ecosystem health
- Token utility analysis
- Investment opportunities in app chains

Focus on the unique value proposition of each specialized chain."""

        super().__init__(
            api_key=api_key,
            name=name,
            model=model,
            system_prompt=system_prompt,
            **kwargs
        )
        
        self.client = EtherscanV2Client(etherscan_api_key)
        self.supported_chains = APP_CHAIN_IDS
        
        # Chain categories
        self.gaming_chains = [13371, 2020, 660279, 33139]
        self.social_chains = [666666666, 2741, 480]
        self.defi_chains = [1329, 592, 336]
    
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
        chain_id: int = 13371,  # Default: Immutable zkEVM
        **kwargs
    ) -> Dict[str, Any]:
        """Get balance on an app chain"""
        if not self.supports_chain(chain_id):
            return {"error": f"Chain {chain_id} not supported by AppChainsAgent"}
        
        return await self.client.get_balance(address, chain_id)
    
    async def get_app_chains_portfolio(
        self,
        address: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Get portfolio across all app chains"""
        return await self.client.get_balance_on_chains(
            address,
            chain_ids=self.supported_chains
        )
    
    async def get_gaming_portfolio(
        self,
        address: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Get portfolio across gaming chains only"""
        return await self.client.get_balance_on_chains(
            address,
            chain_ids=self.gaming_chains
        )
    
    # ─────────────────────────────────────────────────────────────────────────
    # 📜 TRANSACTIONS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def get_transactions(
        self,
        address: str,
        chain_id: int = 13371,
        limit: int = 50,
        **kwargs
    ) -> Dict[str, Any]:
        """Get transaction history"""
        if not self.supports_chain(chain_id):
            return {"error": f"Chain {chain_id} not supported"}
        
        return await self.client.get_transactions(address, chain_id, offset=limit)
    
    async def get_nft_transfers(
        self,
        address: str,
        chain_id: int = 13371,
        **kwargs
    ) -> Dict[str, Any]:
        """Get NFT transfers (important for gaming)"""
        return await self.client.get_nft_transfers(address, chain_id)
    
    async def get_token_transfers(
        self,
        address: str,
        chain_id: int = 13371,
        **kwargs
    ) -> Dict[str, Any]:
        """Get token transfers"""
        return await self.client.get_token_transfers(address, chain_id)
    
    # ─────────────────────────────────────────────────────────────────────────
    # 🎮 GAMING ANALYSIS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def analyze_gaming_activity(
        self,
        address: str,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Analyze gaming-related activity across gaming chains.
        
        Tracks:
        - NFT holdings (game assets)
        - Game token holdings
        - Gaming transaction patterns
        """
        gaming_data = {}
        
        for chain_id in self.gaming_chains:
            try:
                balance = await self.get_balance(address, chain_id)
                nfts = await self.get_nft_transfers(address, chain_id)
                txs = await self.get_transactions(address, chain_id, limit=50)
                
                gaming_data[chain_id] = {
                    "balance": balance,
                    "nft_count": len(nfts.get("nft_transfers", [])),
                    "transaction_count": len(txs.get("transactions", [])),
                }
            except:
                pass
        
        return {
            "address": address,
            "gaming_activity": gaming_data,
            "active_gaming_chains": len([c for c in gaming_data.values() if c.get("transaction_count", 0) > 0]),
        }
    
    async def analyze_immutable_activity(
        self,
        address: str,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Detailed Immutable zkEVM analysis.
        
        Immutable is a major gaming L2, so detailed analysis is valuable.
        """
        chain_id = 13371
        
        balance = await self.get_balance(address, chain_id)
        txs = await self.get_transactions(address, chain_id, limit=100)
        nfts = await self.get_nft_transfers(address, chain_id)
        tokens = await self.get_token_transfers(address, chain_id)
        
        tx_list = txs.get("transactions", [])
        
        # Analyze contracts interacted
        unique_contracts = set(tx.get("to", "").lower() for tx in tx_list if tx.get("to"))
        
        return {
            "address": address,
            "chain": "Immutable zkEVM",
            "chain_id": chain_id,
            "balance": balance,
            "metrics": {
                "total_transactions": len(tx_list),
                "unique_contracts": len(unique_contracts),
                "nft_transfers": len(nfts.get("nft_transfers", [])),
                "token_transfers": len(tokens.get("token_transfers", [])),
            },
        }
    
    async def analyze_ronin_activity(
        self,
        address: str,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Detailed Ronin (Axie Infinity) analysis.
        """
        chain_id = 2020
        
        balance = await self.get_balance(address, chain_id)
        txs = await self.get_transactions(address, chain_id, limit=100)
        nfts = await self.get_nft_transfers(address, chain_id)
        
        return {
            "address": address,
            "chain": "Ronin (Axie Infinity)",
            "chain_id": chain_id,
            "balance": balance,
            "metrics": {
                "total_transactions": len(txs.get("transactions", [])),
                "nft_transfers": len(nfts.get("nft_transfers", [])),
            },
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 🧠 AI ANALYSIS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def analyze_address(
        self,
        address: str,
        chain_id: int = 13371,
        **kwargs
    ) -> Dict[str, Any]:
        """AI-powered app chain address analysis"""
        balance = await self.get_balance(address, chain_id)
        txs = await self.get_transactions(address, chain_id, limit=50)
        nfts = await self.get_nft_transfers(address, chain_id)
        
        context = f"""Analyze this address on app chain (Chain ID: {chain_id}):

Address: {address}

Balance: {json.dumps(balance, indent=2)}

Transactions: {len(txs.get('transactions', []))} found
NFT Transfers: {len(nfts.get('nft_transfers', []))} found

Provide:
1. User profile (gamer, trader, developer)
2. NFT/gaming activity assessment
3. Notable protocol interactions
4. Recommendations"""

        analysis = await self.chat(context)
        
        return {
            "address": address,
            "chain_id": chain_id,
            "balance": balance,
            "transactions": txs,
            "nfts": nfts,
            "ai_analysis": analysis,
        }
    
    async def recommend_app_chain(
        self,
        use_case: str = "gaming",
        **kwargs
    ) -> Dict[str, Any]:
        """Recommend best app chain for a specific use case"""
        
        chain_info = {
            "gaming": {
                13371: {"name": "Immutable zkEVM", "focus": "AAA gaming, NFT trading"},
                2020: {"name": "Ronin", "focus": "Axie Infinity ecosystem"},
                660279: {"name": "Xai", "focus": "Arbitrum gaming L3"},
                33139: {"name": "ApeChain", "focus": "Bored Ape ecosystem"},
            },
            "social": {
                666666666: {"name": "Degen", "focus": "Farcaster/social tipping"},
                2741: {"name": "Abstract", "focus": "Consumer crypto"},
                480: {"name": "World Chain", "focus": "Worldcoin identity"},
            },
            "defi": {
                1329: {"name": "Sei", "focus": "High-speed DeFi"},
                592: {"name": "Astar", "focus": "Multi-VM DeFi"},
            },
        }
        
        relevant_chains = chain_info.get(use_case.lower(), chain_info.get("gaming"))
        
        context = f"""Recommend best app chain for: {use_case}

Available options: {json.dumps(relevant_chains, indent=2)}

Provide:
1. Ranked recommendations
2. Pros and cons of each
3. Best for beginners vs experienced
4. Ecosystem highlights"""

        recommendation = await self.chat(context)
        
        return {
            "use_case": use_case,
            "options": relevant_chains,
            "recommendation": recommendation,
        }
    
    async def process(self, query: str, **kwargs) -> Dict[str, Any]:
        """Process natural language query"""
        query_lower = query.lower()
        
        address = kwargs.get("address")
        chain_id = kwargs.get("chain_id", 13371)
        
        if not address:
            import re
            match = re.search(r'0x[a-fA-F0-9]{40}', query)
            if match:
                address = match.group()
        
        if any(word in query_lower for word in ["balance", "portfolio"]):
            if address:
                if "gaming" in query_lower:
                    return await self.get_gaming_portfolio(address)
                if "all" in query_lower or "portfolio" in query_lower:
                    return await self.get_app_chains_portfolio(address)
                return await self.get_balance(address, chain_id)
        
        if any(word in query_lower for word in ["gaming", "game", "nft"]):
            if address:
                return await self.analyze_gaming_activity(address)
        
        if "immutable" in query_lower:
            if address:
                return await self.analyze_immutable_activity(address)
        
        if "ronin" in query_lower or "axie" in query_lower:
            if address:
                return await self.analyze_ronin_activity(address)
        
        if any(word in query_lower for word in ["recommend", "best", "which"]):
            use_case = "gaming" if "game" in query_lower else query_lower
            return await self.recommend_app_chain(use_case)
        
        if any(word in query_lower for word in ["analyze", "analysis"]):
            if address:
                return await self.analyze_address(address, chain_id)
        
        response = await self.chat(query)
        return {"query": query, "response": response}


# ═══════════════════════════════════════════════════════════════════════════════
# 🧪 TESTING
# ═══════════════════════════════════════════════════════════════════════════════

async def test_app_chains_agent():
    """Test the App Chains agent"""
    import asyncio
    sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))
    from config import API_KEYS, AGENT_CONFIGS
    
    config = AGENT_CONFIGS["app_chains"]
    
    async with AppChainsAgent(
        api_key=config["api_key"],
        etherscan_api_key=API_KEYS.ETHERSCAN_API_KEY,
    ) as agent:
        address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
        
        print("🟢 Testing App Chains Agent...")
        
        # Test balance on Immutable
        balance = await agent.get_balance(address, chain_id=13371)
        print(f"\n💰 Immutable Balance: {balance}")
        
        # Test gaming portfolio
        gaming = await agent.get_gaming_portfolio(address)
        print(f"\n🎮 Gaming Portfolio: {gaming}")
        
        # Test recommendation
        rec = await agent.recommend_app_chain("gaming")
        print(f"\n💡 Recommendation: {rec}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(test_app_chains_agent())
