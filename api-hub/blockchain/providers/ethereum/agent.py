# omnichain/providers/ethereum/agent.py
"""
⭐ Ethereum Expert Agent
Specialized GPT-4o-mini agent for Ethereum mainnet analysis
"""

import logging
from typing import Any, Dict, Optional

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from providers.base import BaseAgent
from providers.ethereum.client import EthereumClient

logger = logging.getLogger(__name__)


class EthereumAgent(BaseAgent):
    """
    Ethereum Expert Agent powered by GPT-4o-mini.
    
    Specializes in:
    - Gas optimization and MEV analysis
    - DeFi protocol interactions
    - Smart contract analysis
    - NFT and token analysis
    - Wallet profiling
    """
    
    def __init__(self, api_key: str, etherscan_key: str, **kwargs):
        """
        Initialize Ethereum agent.
        
        Args:
            api_key: OpenAI API key
            etherscan_key: Etherscan API key
        """
        super().__init__(
            name="Ethereum Expert",
            api_key=api_key,
            model="gpt-4o-mini",
            **kwargs
        )
        
        # Initialize Ethereum client
        self._eth_client = EthereumClient(etherscan_key)
    
    def _default_system_prompt(self) -> str:
        """Ethereum-specific system prompt"""
        return """You are the Ethereum Expert, a specialized AI agent for Ethereum mainnet analysis.

Your expertise includes:
⛽ **Gas Optimization**: Expert at analyzing gas usage, base fees, priority fees, and MEV
💰 **DeFi Analysis**: Understanding of major protocols (Uniswap, Aave, Compound, etc.)
📜 **Smart Contracts**: Contract verification, ABI analysis, interaction patterns
🎨 **NFTs**: ERC-721/ERC-1155 analysis, collection tracking, marketplace activity
👛 **Wallet Analysis**: Transaction patterns, portfolio composition, risk assessment

When analyzing Ethereum data:
1. Always convert wei to ETH for readability (1 ETH = 10^18 wei)
2. Calculate gas costs in USD when price available
3. Identify contract interactions vs EOA transfers
4. Note failed transactions and their reasons
5. Recognize common DeFi patterns (swaps, loans, staking)

Key metrics to highlight:
- ETH balance and value in USD
- Gas spending analysis
- Top token holdings
- NFT collections owned
- Contract interaction frequency

Format numbers clearly:
- ETH: up to 4 decimal places
- USD: 2 decimal places with $ symbol
- Gas: in Gwei
- Percentages: 1-2 decimal places"""
    
    async def initialize(self) -> None:
        """Initialize both AI client and Ethereum data client"""
        await super().initialize()
        await self._eth_client.initialize()
        self.set_data_client(self._eth_client)
        logger.info("Ethereum Expert initialized")
    
    async def close(self) -> None:
        """Close all resources"""
        await self._eth_client.close()
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
                data = await self._eth_client.get_balance(address)
                
            elif action == "get_transactions" and address:
                data = await self._eth_client.get_transactions(address)
                
            elif action == "get_tokens" and address:
                data = await self._eth_client.get_token_transfers(address)
                
            elif action == "get_nfts" and address:
                data = await self._eth_client.get_nft_transfers(address)
                
            elif action == "get_gas":
                data = await self._eth_client.get_gas_price()
                
            elif action == "get_contract":
                contract = params.get("contract") or address
                if contract:
                    data = await self._eth_client.get_source_code(contract)
                else:
                    return {"success": False, "error": "contract address required"}
                
            elif action == "get_price":
                data = await self._eth_client.get_eth_price()
                
            elif action == "get_network":
                data = await self._eth_client.get_network_summary()
                
            elif action == "analyze" and address:
                data = await self._eth_client.get_address_summary(address)
                
            else:
                # Default: get network summary for general queries
                data = await self._eth_client.get_network_summary()
            
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
            logger.error(f"Ethereum agent error: {e}")
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
            address: Ethereum address
        
        Returns:
            Detailed analysis with AI insights
        """
        # Fetch all address data
        data = await self._eth_client.get_address_summary(address)
        price = await self._eth_client.get_eth_price()
        
        data["price"] = price
        
        # Prepare analysis query
        query = f"""Analyze this Ethereum address comprehensively:

Address: {address}

Provide:
1. Balance overview (ETH + estimated USD value)
2. Transaction activity summary (volume, frequency, patterns)
3. Token holdings analysis
4. NFT activity summary
5. Wallet classification (trader, holder, DeFi user, etc.)
6. Risk assessment
7. Notable observations and recommendations"""
        
        analysis = await self.analyze(query, data)
        
        return {
            "success": True,
            "data": data,
            "analysis": analysis,
        }
    
    async def analyze_gas(self) -> Dict[str, Any]:
        """
        Gas market analysis.
        
        Returns:
            Gas insights with recommendations
        """
        gas = await self._eth_client.get_gas_price()
        price = await self._eth_client.get_eth_price()
        
        data = {
            "gas": gas,
            "eth_price": price,
        }
        
        query = """Analyze the current Ethereum gas market:

Provide:
1. Current gas prices (Safe, Standard, Fast)
2. Base fee analysis
3. Cost estimates for common operations:
   - Simple ETH transfer (~21,000 gas)
   - ERC-20 transfer (~65,000 gas)
   - Uniswap swap (~150,000 gas)
   - NFT mint (~100,000 gas)
4. Recommendations for optimal transaction timing
5. MEV considerations"""
        
        analysis = await self.analyze(query, data)
        
        return {
            "success": True,
            "data": data,
            "analysis": analysis,
        }
    
    async def analyze_contract(self, contract: str) -> Dict[str, Any]:
        """
        Smart contract analysis.
        
        Args:
            contract: Contract address
        
        Returns:
            Contract analysis
        """
        source = await self._eth_client.get_source_code(contract)
        
        query = f"""Analyze this Ethereum smart contract:

Contract: {contract}

Provide:
1. Verification status
2. Contract type identification (token, DEX, NFT, etc.)
3. Key functions and capabilities
4. Security observations
5. Notable code patterns
6. Recommendations for interacting safely"""
        
        analysis = await self.analyze(query, source)
        
        return {
            "success": True,
            "data": source,
            "analysis": analysis,
        }
    
    async def analyze_portfolio(self, address: str) -> Dict[str, Any]:
        """
        Portfolio analysis with token breakdown.
        
        Args:
            address: Ethereum address
        
        Returns:
            Portfolio analysis
        """
        balance = await self._eth_client.get_balance(address)
        tokens = await self._eth_client.get_token_transfers(address)
        nfts = await self._eth_client.get_nft_transfers(address)
        price = await self._eth_client.get_eth_price()
        
        data = {
            "eth_balance": balance,
            "token_activity": tokens,
            "nft_activity": nfts,
            "eth_price": price,
        }
        
        query = f"""Analyze the portfolio of this Ethereum address:

Address: {address}

Provide:
1. ETH holdings (amount and USD value)
2. Token holdings breakdown (top tokens by value)
3. NFT collections held
4. Portfolio diversification analysis
5. Historical value estimation
6. Risk assessment
7. Portfolio optimization suggestions"""
        
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
    """Test the Ethereum agent"""
    import asyncio
    
    sys.path.insert(0, str(Path(__file__).parent.parent.parent))
    from config import API_KEYS
    
    agent = EthereumAgent(
        api_key=API_KEYS.OPENAI_ETHEREUM,
        etherscan_key=API_KEYS.ETHERSCAN_API_KEY
    )
    
    async with agent:
        print("🔍 Testing Ethereum Agent...")
        
        # Test gas analysis
        result = await agent.analyze_gas()
        print(f"\n⛽ Gas Analysis:\n{result.get('analysis', '')[:500]}...")
        
        # Test address analysis
        address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
        result = await agent.process_request({
            "action": "get_balance",
            "address": address,
            "query": f"Summarize the balance and recent activity of {address}"
        })
        print(f"\n💰 Address Analysis:\n{result.get('analysis', '')[:500]}...")


if __name__ == "__main__":
    import asyncio
    asyncio.run(test_agent())
