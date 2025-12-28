# omnichain/providers/non_evm/agent.py
"""
🌐 Non-EVM Chains Agent
Expert for non-EVM blockchains:
- Litecoin, Dogecoin (Bitcoin forks)
- Tron (TRC-20 ecosystem)
- TON (Telegram ecosystem)
- XRP/Ripple (Payment network)
- NEAR (Sharded blockchain)
- Algorand (Pure PoS)
- Aptos, Sui (Move-based)
- Cosmos (IBC ecosystem)
- Flow (NFT/Gaming)
- Solana (High-performance)
- Starknet (Cairo-based ZK)

Powered by GPT-4o-mini with free public APIs
"""

import json
from typing import Any, Dict, List, Optional

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from providers.base import BaseAgent
from providers.non_evm.client import NonEVMClient, NON_EVM_CHAINS


class NonEVMAgent(BaseAgent):
    """
    Non-EVM Chains Expert Agent.
    
    Specializes in alternative blockchain architectures:
    - UTXO chains (Litecoin, Dogecoin)
    - Account-based alternatives (Tron, TON, XRP)
    - Move-based chains (Aptos, Sui)
    - Sharded chains (NEAR)
    - IBC ecosystem (Cosmos)
    """
    
    def __init__(
        self,
        api_key: str,
        name: str = "non_evm_agent",
        model: str = "gpt-4o-mini",
        **kwargs
    ):
        """
        Initialize Non-EVM Agent.
        
        Args:
            api_key: OpenAI API key
        """
        system_prompt = """You are a multi-chain blockchain expert specializing in non-EVM ecosystems.

Your expertise covers:
🌐 CHAINS:
- UTXO: Litecoin (LTC), Dogecoin (DOGE)
- Account: Tron (TRX), TON, XRP/Ripple
- Move: Aptos (APT), Sui (SUI)
- Sharded: NEAR Protocol
- IBC: Cosmos Hub (ATOM)
- High-performance: Solana (SOL)
- ZK: Starknet (STRK)

📊 TECHNICAL KNOWLEDGE:
- Different consensus mechanisms (PoW, PoS, DPoS, BFT)
- UTXO vs Account models
- Move language specifics
- IBC (Inter-Blockchain Communication)
- Sharding architectures
- Cairo/Starknet programming

💡 ANALYSIS CAPABILITIES:
- Cross-chain portfolio tracking
- Chain-specific transaction analysis
- Staking/delegation analysis
- Token standard differences (TRC-20, ASA, etc.)
- Bridge activity detection

🎯 INSIGHTS YOU PROVIDE:
- Best chain for specific use cases
- Staking yield comparisons
- Transaction cost analysis
- Ecosystem health assessment
- Security model comparisons

Always explain chain-specific concepts and highlight architectural differences."""

        super().__init__(
            api_key=api_key,
            name=name,
            model=model,
            system_prompt=system_prompt,
            **kwargs
        )
        
        self.client = NonEVMClient()
        self.supported_chains = list(NON_EVM_CHAINS.keys())
    
    async def __aenter__(self):
        await self.client.__aenter__()
        return self
    
    async def __aexit__(self, *args):
        await self.client.__aexit__(*args)
    
    def supports_chain(self, chain: str) -> bool:
        """Check if this agent supports the given chain"""
        return chain.lower() in self.supported_chains
    
    def get_chain_info(self, chain: str) -> Dict[str, Any]:
        """Get chain configuration"""
        return NON_EVM_CHAINS.get(chain.lower(), {})
    
    # ─────────────────────────────────────────────────────────────────────────
    # 💰 BALANCE
    # ─────────────────────────────────────────────────────────────────────────
    
    async def get_balance(
        self,
        address: str,
        chain: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Get balance on any supported non-EVM chain"""
        if not self.supports_chain(chain):
            return {"error": f"Chain '{chain}' not supported"}
        
        return await self.client.get_balance(address, chain, **kwargs)
    
    async def get_multi_chain_balance(
        self,
        addresses: Dict[str, str],
        **kwargs
    ) -> Dict[str, Any]:
        """
        Get balances across multiple non-EVM chains.
        
        Args:
            addresses: Dict mapping chain name to address
                       e.g., {"solana": "...", "ton": "...", "aptos": "..."}
        
        Returns:
            Balances for each chain
        """
        results = {}
        
        for chain, address in addresses.items():
            try:
                balance = await self.get_balance(address, chain)
                results[chain] = balance
            except Exception as e:
                results[chain] = {"error": str(e)}
        
        return {
            "multi_chain_portfolio": results,
            "chains_checked": len(addresses),
            "chains_with_balance": len([
                r for r in results.values() 
                if not r.get("error") and r.get("balance", 0) > 0
            ]),
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 📜 CHAIN-SPECIFIC METHODS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def get_tron_account(
        self,
        address: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Get detailed Tron account info"""
        balance = await self.client.get_tron_balance(address)
        txs = await self.client.get_tron_transactions(address)
        
        return {
            **balance,
            "transactions": txs,
        }
    
    async def get_ton_account(
        self,
        address: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Get detailed TON account info"""
        balance = await self.client.get_ton_balance(address)
        txs = await self.client.get_ton_transactions(address)
        
        return {
            **balance,
            "transactions": txs,
        }
    
    async def get_solana_account(
        self,
        address: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Get Solana account info"""
        return await self.client.get_solana_balance(address)
    
    # ─────────────────────────────────────────────────────────────────────────
    # 📊 CHAIN COMPARISON
    # ─────────────────────────────────────────────────────────────────────────
    
    async def compare_chains(
        self,
        chains: Optional[List[str]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Compare non-EVM chain characteristics.
        
        Args:
            chains: List of chains to compare (default: popular ones)
        
        Returns:
            Chain comparison data
        """
        chains = chains or ["solana", "ton", "aptos", "sui", "near", "cosmos"]
        
        chain_data = {}
        for chain in chains:
            info = self.get_chain_info(chain)
            if info:
                chain_data[chain] = {
                    "name": info.get("name"),
                    "symbol": info.get("symbol"),
                    "decimals": info.get("decimals"),
                    "explorer": info.get("explorer"),
                }
        
        return {
            "chains": chain_data,
            "count": len(chain_data),
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 🧠 AI ANALYSIS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def analyze_address(
        self,
        address: str,
        chain: str,
        **kwargs
    ) -> Dict[str, Any]:
        """AI-powered address analysis for any non-EVM chain"""
        if not self.supports_chain(chain):
            return {"error": f"Chain '{chain}' not supported"}
        
        balance = await self.get_balance(address, chain)
        chain_info = self.get_chain_info(chain)
        
        context = f"""Analyze this address on {chain_info.get('name', chain)}:

Address: {address}

Balance: {json.dumps(balance, indent=2)}

Chain Info:
- Symbol: {chain_info.get('symbol')}
- Decimals: {chain_info.get('decimals')}
- Explorer: {chain_info.get('explorer')}

Provide:
1. Balance assessment
2. Chain-specific insights
3. Recommendations for this ecosystem
4. Notable features of {chain_info.get('name', chain)}"""

        analysis = await self.chat(context)
        
        return {
            "address": address,
            "chain": chain,
            "balance": balance,
            "chain_info": chain_info,
            "ai_analysis": analysis,
        }
    
    async def recommend_chain(
        self,
        use_case: str = "general",
        **kwargs
    ) -> Dict[str, Any]:
        """Recommend best non-EVM chain for a specific use case"""
        
        chain_recommendations = {
            "payments": ["xrp", "litecoin", "ton"],
            "defi": ["solana", "sui", "aptos"],
            "nfts": ["solana", "flow", "immutablex"],
            "gaming": ["flow", "immutablex", "sui"],
            "staking": ["cosmos", "near", "algorand"],
            "speed": ["solana", "sui", "aptos"],
            "meme": ["dogecoin", "solana"],
            "privacy": ["starknet"],
            "ibc": ["cosmos"],
        }
        
        use_case_lower = use_case.lower()
        recommended = chain_recommendations.get(
            use_case_lower,
            ["solana", "aptos", "sui"]  # Default high-performance chains
        )
        
        context = f"""User looking for: {use_case}

Recommended chains: {recommended}

Chain details:
{json.dumps({c: self.get_chain_info(c) for c in recommended}, indent=2)}

Provide:
1. Ranked recommendations with explanations
2. Pros and cons of each
3. Getting started tips for each chain
4. Ecosystem highlights"""

        recommendation = await self.chat(context)
        
        return {
            "use_case": use_case,
            "recommended_chains": recommended,
            "recommendation": recommendation,
        }
    
    async def explain_chain(self, chain: str, **kwargs) -> Dict[str, Any]:
        """Get detailed explanation of a non-EVM chain"""
        chain_info = self.get_chain_info(chain)
        
        if not chain_info:
            return {"error": f"Chain '{chain}' not found"}
        
        context = f"""Explain {chain_info.get('name', chain)} blockchain:

Basic Info:
- Name: {chain_info.get('name')}
- Native Token: {chain_info.get('symbol')}
- Explorer: {chain_info.get('explorer')}

Provide comprehensive explanation:
1. Architecture and consensus mechanism
2. Key differentiators from Ethereum
3. Token standards and smart contracts
4. Ecosystem highlights (DeFi, NFTs, etc.)
5. Staking/rewards if applicable
6. Development language/tooling
7. Pros and cons
8. Best use cases"""

        explanation = await self.chat(context)
        
        return {
            "chain": chain,
            "info": chain_info,
            "explanation": explanation,
        }
    
    async def process(self, query: str, **kwargs) -> Dict[str, Any]:
        """Process natural language query"""
        query_lower = query.lower()
        
        # Try to detect chain from query
        detected_chain = None
        for chain in self.supported_chains:
            if chain in query_lower:
                detected_chain = chain
                break
        
        # Also check symbols
        symbol_to_chain = {
            "ltc": "litecoin",
            "doge": "dogecoin",
            "trx": "tron",
            "sol": "solana",
            "apt": "aptos",
            "sui": "sui",
            "atom": "cosmos",
            "algo": "algorand",
            "strk": "starknet",
        }
        for symbol, chain in symbol_to_chain.items():
            if symbol in query_lower:
                detected_chain = chain
                break
        
        chain = kwargs.get("chain") or detected_chain
        address = kwargs.get("address")
        
        if any(word in query_lower for word in ["balance", "portfolio", "holdings"]):
            if address and chain:
                return await self.get_balance(address, chain)
        
        if any(word in query_lower for word in ["compare", "vs", "versus"]):
            return await self.compare_chains()
        
        if any(word in query_lower for word in ["recommend", "best", "which"]):
            return await self.recommend_chain(query)
        
        if any(word in query_lower for word in ["explain", "what is", "how does"]):
            if detected_chain:
                return await self.explain_chain(detected_chain)
        
        if any(word in query_lower for word in ["analyze", "analysis"]):
            if address and chain:
                return await self.analyze_address(address, chain)
        
        # Default: AI response
        response = await self.chat(query)
        return {"query": query, "response": response}


# ═══════════════════════════════════════════════════════════════════════════════
# 🧪 TESTING
# ═══════════════════════════════════════════════════════════════════════════════

async def test_non_evm_agent():
    """Test the Non-EVM agent"""
    import asyncio
    sys.path.insert(0, str(Path(__file__).parent.parent.parent))
    from config import AGENT_CONFIGS
    
    config = AGENT_CONFIGS["non_evm"]
    
    async with NonEVMAgent(api_key=config["api_key"]) as agent:
        print("🌐 Testing Non-EVM Agent...")
        print(f"Supported chains: {agent.supported_chains}")
        
        # Test chain comparison
        comparison = await agent.compare_chains()
        print(f"\n📊 Chain Comparison: {comparison}")
        
        # Test recommendation
        rec = await agent.recommend_chain("defi")
        print(f"\n💡 Recommendation: {rec}")
        
        # Test chain explanation
        explanation = await agent.explain_chain("solana")
        print(f"\n📚 Solana Explanation: {explanation.get('explanation', 'N/A')[:500]}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(test_non_evm_agent())
