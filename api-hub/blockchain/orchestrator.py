# omnichain/orchestrator/orchestrator.py
"""
🧠 Omnichain Orchestrator
Master coordinator powered by Claude 3.5 Sonnet
Routes requests to specialized agents and aggregates results
"""

import asyncio
import json
import logging
import re
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Union

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
# 🗺️ CHAIN ROUTING
# ═══════════════════════════════════════════════════════════════════════════════

# Chain name aliases for natural language parsing
CHAIN_ALIASES: Dict[str, str] = {
    # Bitcoin
    "btc": "bitcoin", "bitcoin": "bitcoin", "بتكوين": "bitcoin",
    
    # Ethereum
    "eth": "ethereum", "ethereum": "ethereum", "إيثريوم": "ethereum",
    
    # Layer 1
    "bnb": "bnb_chain", "bsc": "bnb_chain", "binance": "bnb_chain",
    "avax": "avalanche", "avalanche": "avalanche",
    "ftm": "fantom", "fantom": "fantom",
    "cro": "cronos", "cronos": "cronos",
    "gnosis": "gnosis", "xdai": "gnosis",
    "moonbeam": "moonbeam", "glmr": "moonbeam",
    "celo": "celo",
    "aurora": "aurora",
    "kava": "kava",
    "klaytn": "klaytn", "klay": "klaytn",
    
    # Layer 2 Optimistic
    "polygon": "polygon", "matic": "polygon", "بوليجون": "polygon",
    "arbitrum": "arbitrum", "arb": "arbitrum",
    "optimism": "optimism", "op": "optimism",
    "base": "base",
    "linea": "linea",
    "scroll": "scroll",
    "blast": "blast",
    "mantle": "mantle", "mnt": "mantle",
    "mode": "mode",
    "zora": "zora",
    "metis": "metis",
    
    # Layer 2 ZK
    "zksync": "zksync", "zksync era": "zksync",
    "polygon zkevm": "polygon_zkevm",
    "taiko": "taiko",
    "xlayer": "xlayer",
    
    # Bitcoin L2
    "merlin": "merlin",
    "bitlayer": "bitlayer",
    "core": "core_dao",
    
    # App Chains
    "astar": "astar",
    "sei": "sei",
    "ronin": "ronin",
    "harmony": "harmony", "one": "harmony",
    
    # Non-EVM
    "solana": "solana", "sol": "solana", "سولانا": "solana",
    "litecoin": "litecoin", "ltc": "litecoin",
    "dogecoin": "dogecoin", "doge": "dogecoin",
    "tron": "tron", "trx": "tron",
    "ton": "ton",
    "ripple": "ripple", "xrp": "ripple",
    "near": "near",
    "algorand": "algorand", "algo": "algorand",
    "aptos": "aptos", "apt": "aptos",
    "sui": "sui",
    "cosmos": "cosmos", "atom": "cosmos",
    "flow": "flow",
    "starknet": "starknet", "strk": "starknet",
    "immutable": "immutable_x", "imx": "immutable_x",
}

# Chain to agent mapping
CHAIN_TO_AGENT: Dict[str, str] = {
    # Special handlers
    "bitcoin": "bitcoin",
    "ethereum": "ethereum",
    "solana": "solscan",
    
    # Non-EVM -> non_evm agent
    "litecoin": "non_evm",
    "dogecoin": "non_evm",
    "tron": "non_evm",
    "ton": "non_evm",
    "ripple": "non_evm",
    "near": "non_evm",
    "algorand": "non_evm",
    "aptos": "non_evm",
    "sui": "non_evm",
    "cosmos": "non_evm",
    "flow": "non_evm",
    "starknet": "non_evm",
    "immutable_x": "non_evm",
    
    # Layer 1 EVM
    "bnb_chain": "layer1",
    "avalanche": "layer1",
    "fantom": "layer1",
    "cronos": "layer1",
    "gnosis": "layer1",
    "moonbeam": "layer1",
    "celo": "layer1",
    "aurora": "layer1",
    "kava": "layer1",
    "klaytn": "layer1",
    
    # Layer 2 Optimistic
    "polygon": "layer2_optimistic",
    "arbitrum": "layer2_optimistic",
    "optimism": "layer2_optimistic",
    "base": "layer2_optimistic",
    "linea": "layer2_optimistic",
    "scroll": "layer2_optimistic",
    "blast": "layer2_optimistic",
    "mantle": "layer2_optimistic",
    "mode": "layer2_optimistic",
    "zora": "layer2_optimistic",
    "metis": "layer2_optimistic",
    
    # Layer 2 ZK
    "zksync": "layer2_zk",
    "polygon_zkevm": "layer2_zk",
    "taiko": "layer2_zk",
    "xlayer": "layer2_zk",
    
    # Bitcoin L2
    "merlin": "bitcoin_l2",
    "bitlayer": "bitcoin_l2",
    "core_dao": "bitcoin_l2",
    
    # App Chains
    "astar": "app_chains",
    "sei": "app_chains",
    "ronin": "app_chains",
    "harmony": "app_chains",
}

# Chain ID mapping
CHAIN_NAME_TO_ID: Dict[str, int] = {
    "ethereum": 1,
    "bnb_chain": 56,
    "polygon": 137,
    "arbitrum": 42161,
    "optimism": 10,
    "avalanche": 43114,
    "fantom": 250,
    "base": 8453,
    "zksync": 324,
    "linea": 59144,
    "scroll": 534352,
    "blast": 81457,
    "mantle": 5000,
    "cronos": 25,
    "gnosis": 100,
    "moonbeam": 1284,
    "celo": 42220,
    "aurora": 1313161554,
    "kava": 2222,
    "klaytn": 8217,
    "polygon_zkevm": 1101,
    "taiko": 167000,
    "merlin": 4200,
    "bitlayer": 200901,
    "core_dao": 1116,
    "astar": 592,
    "sei": 1329,
    "ronin": 2020,
    "harmony": 1666600000,
    "mode": 34443,
    "zora": 7777777,
    "metis": 1088,
}


# ═══════════════════════════════════════════════════════════════════════════════
# 🎯 ACTION DETECTION
# ═══════════════════════════════════════════════════════════════════════════════

# Action patterns for natural language parsing
ACTION_PATTERNS: Dict[str, List[str]] = {
    "get_balance": [
        r"balance", r"رصيد", r"how much", r"كم",
        r"holdings?", r"ممتلكات",
    ],
    "get_transactions": [
        r"transactions?", r"معاملات", r"txs?", r"history",
        r"السجل", r"المعاملات",
    ],
    "get_tokens": [
        r"tokens?", r"توكن", r"erc-?20", r"assets?",
        r"الأصول",
    ],
    "get_nfts": [
        r"nfts?", r"collectibles?", r"erc-?721",
        r"المقتنيات",
    ],
    "get_gas": [
        r"gas", r"fees?", r"رسوم", r"الغاز",
    ],
    "analyze": [
        r"analyze", r"تحليل", r"حلل", r"insights?",
        r"summary", r"ملخص",
    ],
}


# ═══════════════════════════════════════════════════════════════════════════════
# 📋 REQUEST/RESPONSE MODELS
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class AgentRequest:
    """Request to be sent to an agent"""
    agent_id: str
    action: str
    chain: str
    chain_id: Optional[int] = None
    address: Optional[str] = None
    params: Dict[str, Any] = None
    query: Optional[str] = None
    
    def to_dict(self) -> dict:
        return {
            "agent_id": self.agent_id,
            "action": self.action,
            "chain": self.chain,
            "chain_id": self.chain_id,
            "address": self.address,
            "params": self.params or {},
            "query": self.query,
        }


@dataclass
class AgentResponse:
    """Response from an agent"""
    agent_id: str
    success: bool
    data: Optional[Dict] = None
    analysis: Optional[str] = None
    error: Optional[str] = None
    
    def to_dict(self) -> dict:
        return {
            "agent_id": self.agent_id,
            "success": self.success,
            "data": self.data,
            "analysis": self.analysis,
            "error": self.error,
        }


# ═══════════════════════════════════════════════════════════════════════════════
# 🧠 ORCHESTRATOR
# ═══════════════════════════════════════════════════════════════════════════════

class Orchestrator:
    """
    Master Orchestrator powered by Claude 3.5 Sonnet.
    
    Responsibilities:
    1. Parse natural language queries
    2. Route requests to appropriate agents
    3. Aggregate multi-chain responses
    4. Provide unified analysis
    """
    
    def __init__(self, api_key: str):
        """
        Args:
            api_key: Anthropic API key for Claude 3.5 Sonnet
        """
        self.api_key = api_key
        self.model = "claude-3-5-sonnet-20241022"
        self._client = None
        self._agents: Dict[str, Any] = {}
        
        # System prompt for Claude
        self.system_prompt = """You are the Omnichain Orchestrator, a master AI coordinator for blockchain data analysis.

Your capabilities:
- Route queries to 12 specialized blockchain agents
- Analyze data from 101+ blockchains
- Aggregate multi-chain results
- Provide comprehensive insights

Supported chains by agent:
1. **Bitcoin Expert**: Bitcoin (BTC)
2. **Ethereum Expert**: Ethereum (ETH)
3. **Layer 1 Agent**: BNB Chain, Avalanche, Fantom, Cronos, Gnosis, Moonbeam, Celo, Aurora, Kava, Klaytn (24 chains)
4. **Layer 2 Optimistic Agent**: Polygon, Arbitrum, Optimism, Base, Linea, Scroll, Blast, Mantle, Mode, Zora, Metis (22 chains)
5. **Layer 2 ZK Agent**: zkSync Era, Polygon zkEVM, Taiko, X Layer (5 chains)
6. **Bitcoin L2 Agent**: Merlin, Bitlayer, Core DAO (3 chains)
7. **App Chains Agent**: Astar, Sei, Ronin, Harmony (8 chains)
8. **Alchemy Agent**: Enhanced NFT/Token APIs (10 chains)
9. **Moralis Agent**: Portfolio analytics (3 chains)
10. **Solscan Agent**: Solana (SOL)
11. **Non-EVM Agent**: Litecoin, Dogecoin, Tron, TON, XRP, NEAR, Algorand, Aptos, Sui, Cosmos, Flow, Immutable X, Starknet (14 chains)

When responding:
- Identify the chain(s) involved
- Route to appropriate agent(s)
- Aggregate results if multi-chain
- Provide clear, structured analysis

For addresses, always extract them from the query.
For chain names, use the canonical name (e.g., "polygon" not "matic").
"""
    
    async def initialize(self) -> None:
        """Initialize the Anthropic client"""
        try:
            from anthropic import AsyncAnthropic
            self._client = AsyncAnthropic(api_key=self.api_key)
            logger.info("Orchestrator initialized with Claude 3.5 Sonnet")
        except ImportError:
            raise ImportError("anthropic package required. Install with: pip install anthropic")
    
    async def close(self) -> None:
        """Close all resources"""
        for agent in self._agents.values():
            if hasattr(agent, 'close'):
                await agent.close()
        self._client = None
        logger.info("Orchestrator closed")
    
    async def __aenter__(self):
        await self.initialize()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
    
    def register_agent(self, agent_id: str, agent: Any) -> None:
        """Register an agent with the orchestrator"""
        self._agents[agent_id] = agent
        logger.info(f"Registered agent: {agent_id}")
    
    def get_agent(self, agent_id: str) -> Optional[Any]:
        """Get a registered agent"""
        return self._agents.get(agent_id)
    
    # ─────────────────────────────────────────────────────────────────────────
    # 🔍 QUERY PARSING
    # ─────────────────────────────────────────────────────────────────────────
    
    def _extract_addresses(self, text: str) -> List[str]:
        """Extract blockchain addresses from text"""
        patterns = [
            r'0x[a-fA-F0-9]{40}',  # EVM address
            r'[13][a-km-zA-HJ-NP-Z1-9]{25,34}',  # Bitcoin P2PKH/P2SH
            r'bc1[a-z0-9]{39,59}',  # Bitcoin Bech32
            r'[1-9A-HJ-NP-Za-km-z]{32,44}',  # Solana
        ]
        
        addresses = []
        for pattern in patterns:
            matches = re.findall(pattern, text)
            addresses.extend(matches)
        
        return list(set(addresses))
    
    def _extract_chains(self, text: str) -> List[str]:
        """Extract chain names from text"""
        text_lower = text.lower()
        found_chains = []
        
        for alias, canonical in CHAIN_ALIASES.items():
            if alias in text_lower:
                if canonical not in found_chains:
                    found_chains.append(canonical)
        
        return found_chains
    
    def _detect_action(self, text: str) -> str:
        """Detect the action from natural language"""
        text_lower = text.lower()
        
        for action, patterns in ACTION_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, text_lower):
                    return action
        
        return "analyze"  # Default to analysis
    
    def _route_chain_to_agent(self, chain: str) -> str:
        """Get the agent ID for a chain"""
        return CHAIN_TO_AGENT.get(chain, "layer1")
    
    def _get_chain_id(self, chain: str) -> Optional[int]:
        """Get the chain ID for a chain name"""
        return CHAIN_NAME_TO_ID.get(chain)
    
    # ─────────────────────────────────────────────────────────────────────────
    # 🧠 CLAUDE INTERACTION
    # ─────────────────────────────────────────────────────────────────────────
    
    async def _call_claude(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.5,
    ) -> str:
        """Call Claude 3.5 Sonnet"""
        if not self._client:
            await self.initialize()
        
        response = await self._client.messages.create(
            model=self.model,
            max_tokens=8192,
            system=self.system_prompt,
            messages=messages,
        )
        
        return response.content[0].text
    
    async def _parse_query_with_claude(self, query: str) -> Dict[str, Any]:
        """Use Claude to parse complex queries"""
        parse_prompt = f"""Parse this blockchain query and extract:
1. chains: List of blockchain names (use canonical names)
2. addresses: List of addresses
3. action: One of [get_balance, get_transactions, get_tokens, get_nfts, get_gas, analyze]
4. params: Any additional parameters

Query: {query}

Respond in JSON format only:
{{"chains": [], "addresses": [], "action": "", "params": {{}}}}"""
        
        response = await self._call_claude([{"role": "user", "content": parse_prompt}])
        
        # Extract JSON from response
        try:
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
        except json.JSONDecodeError:
            pass
        
        # Fallback to manual parsing
        return {
            "chains": self._extract_chains(query),
            "addresses": self._extract_addresses(query),
            "action": self._detect_action(query),
            "params": {},
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 📤 REQUEST HANDLING
    # ─────────────────────────────────────────────────────────────────────────
    
    async def _dispatch_to_agent(self, request: AgentRequest) -> AgentResponse:
        """Dispatch a request to the appropriate agent"""
        agent = self._agents.get(request.agent_id)
        
        if not agent:
            return AgentResponse(
                agent_id=request.agent_id,
                success=False,
                error=f"Agent not registered: {request.agent_id}",
            )
        
        try:
            result = await agent.process_request(request.to_dict())
            return AgentResponse(
                agent_id=request.agent_id,
                success=result.get("success", True),
                data=result.get("data"),
                analysis=result.get("analysis"),
                error=result.get("error"),
            )
        except Exception as e:
            logger.error(f"Agent {request.agent_id} error: {e}")
            return AgentResponse(
                agent_id=request.agent_id,
                success=False,
                error=str(e),
            )
    
    async def _dispatch_parallel(self, requests: List[AgentRequest]) -> List[AgentResponse]:
        """Dispatch multiple requests in parallel"""
        tasks = [self._dispatch_to_agent(req) for req in requests]
        return await asyncio.gather(*tasks)
    
    # ─────────────────────────────────────────────────────────────────────────
    # 📊 RESPONSE AGGREGATION
    # ─────────────────────────────────────────────────────────────────────────
    
    async def _aggregate_responses(
        self,
        query: str,
        responses: List[AgentResponse],
    ) -> str:
        """Aggregate multiple agent responses into unified analysis"""
        
        # Format responses for Claude
        responses_text = ""
        for resp in responses:
            responses_text += f"\n### Agent: {resp.agent_id}\n"
            if resp.success:
                if resp.data:
                    responses_text += f"Data:\n```json\n{json.dumps(resp.data, indent=2)[:2000]}\n```\n"
                if resp.analysis:
                    responses_text += f"Analysis: {resp.analysis}\n"
            else:
                responses_text += f"Error: {resp.error}\n"
        
        aggregate_prompt = f"""Original query: {query}

Agent responses:
{responses_text}

Please provide a unified, comprehensive analysis based on all agent responses.
Format the response clearly with sections and bullet points.
Highlight key findings and insights."""
        
        return await self._call_claude([{"role": "user", "content": aggregate_prompt}])
    
    # ─────────────────────────────────────────────────────────────────────────
    # 🚀 MAIN INTERFACE
    # ─────────────────────────────────────────────────────────────────────────
    
    async def process_query(self, query: str) -> Dict[str, Any]:
        """
        Process a natural language query.
        
        Args:
            query: Natural language query about blockchain data
        
        Returns:
            Dict with 'success', 'responses', 'analysis', 'metadata'
        """
        logger.info(f"Processing query: {query[:100]}...")
        
        # Parse query
        parsed = await self._parse_query_with_claude(query)
        chains = parsed.get("chains", [])
        addresses = parsed.get("addresses", [])
        action = parsed.get("action", "analyze")
        params = parsed.get("params", {})
        
        logger.info(f"Parsed: chains={chains}, addresses={addresses}, action={action}")
        
        # Build requests for each chain
        requests = []
        for chain in chains or ["ethereum"]:  # Default to Ethereum
            agent_id = self._route_chain_to_agent(chain)
            chain_id = self._get_chain_id(chain)
            
            for address in addresses or [None]:
                requests.append(AgentRequest(
                    agent_id=agent_id,
                    action=action,
                    chain=chain,
                    chain_id=chain_id,
                    address=address,
                    params=params,
                    query=query,
                ))
        
        # If no chains/addresses, just analyze the query
        if not requests:
            analysis = await self._call_claude([{"role": "user", "content": query}])
            return {
                "success": True,
                "responses": [],
                "analysis": analysis,
                "metadata": {
                    "chains": [],
                    "addresses": [],
                    "action": "analyze",
                },
            }
        
        # Dispatch to agents
        responses = await self._dispatch_parallel(requests)
        
        # Aggregate results
        analysis = await self._aggregate_responses(query, responses)
        
        return {
            "success": any(r.success for r in responses),
            "responses": [r.to_dict() for r in responses],
            "analysis": analysis,
            "metadata": {
                "chains": chains,
                "addresses": addresses,
                "action": action,
                "agents_used": list(set(r.agent_id for r in requests)),
            },
        }
    
    async def get_balance(
        self,
        address: str,
        chains: List[str] = None,
    ) -> Dict[str, Any]:
        """
        Get balance for an address on multiple chains.
        
        Args:
            address: Blockchain address
            chains: List of chains (default: all EVM)
        
        Returns:
            Dict with balances by chain
        """
        chains = chains or ["ethereum", "polygon", "arbitrum", "base", "optimism"]
        
        requests = [
            AgentRequest(
                agent_id=self._route_chain_to_agent(chain),
                action="get_balance",
                chain=chain,
                chain_id=self._get_chain_id(chain),
                address=address,
            )
            for chain in chains
        ]
        
        responses = await self._dispatch_parallel(requests)
        
        balances = {}
        for req, resp in zip(requests, responses):
            if resp.success and resp.data:
                balances[req.chain] = resp.data
            else:
                balances[req.chain] = {"error": resp.error}
        
        return {
            "address": address,
            "balances": balances,
            "chains_checked": len(chains),
        }
    
    async def get_portfolio(self, address: str) -> Dict[str, Any]:
        """
        Get complete portfolio across all supported chains.
        
        Args:
            address: Blockchain address
        
        Returns:
            Comprehensive portfolio data
        """
        query = f"Get complete portfolio for address {address} across all chains"
        return await self.process_query(query)
    
    async def analyze_address(self, address: str, chain: str = "ethereum") -> Dict[str, Any]:
        """
        Deep analysis of an address.
        
        Args:
            address: Blockchain address
            chain: Chain name
        
        Returns:
            Detailed analysis
        """
        query = f"Provide a comprehensive analysis of address {address} on {chain}"
        return await self.process_query(query)
    
    async def compare_chains(self, chains: List[str], metric: str = "gas") -> Dict[str, Any]:
        """
        Compare metrics across chains.
        
        Args:
            chains: List of chains to compare
            metric: Metric to compare (gas, tvl, etc.)
        
        Returns:
            Comparison results
        """
        query = f"Compare {metric} across these chains: {', '.join(chains)}"
        return await self.process_query(query)


# ═══════════════════════════════════════════════════════════════════════════════
# 🧪 TESTING
# ═══════════════════════════════════════════════════════════════════════════════

async def test_orchestrator():
    """Test the orchestrator"""
    import sys
    sys.path.append(str(Path(__file__).parent.parent))
    from config import API_KEYS
    
    async with Orchestrator(API_KEYS.ANTHROPIC_API_KEY) as orchestrator:
        # Test query parsing
        result = await orchestrator.process_query(
            "What is the balance of 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 on Ethereum and Polygon?"
        )
        print(json.dumps(result, indent=2))


if __name__ == "__main__":
    from pathlib import Path
    asyncio.run(test_orchestrator())
