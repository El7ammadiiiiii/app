# omnichain/config.py
"""
🔐 Omnichain Configuration
All API keys and settings for 101+ blockchain multi-agent system
"""

import os
from dataclasses import dataclass, field
from typing import Dict, Optional
from pathlib import Path

# ═══════════════════════════════════════════════════════════════════════════════
# 🔑 API KEYS
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class APIKeys:
    """All API keys for the system"""
    
    # 🧠 Orchestrator - Claude 3.5 Sonnet
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    
    # 🔗 Etherscan V2 - 62 EVM chains with single key
    ETHERSCAN_API_KEY: str = os.getenv("ETHERSCAN_API_KEY", "")
    
    # 🤖 Agent API Keys (GPT-4o-mini)
    OPENAI_BITCOIN: str = os.getenv("OPENAI_BITCOIN", "")
    OPENAI_ETHEREUM: str = os.getenv("OPENAI_ETHEREUM", "")
    OPENAI_ALCHEMY: str = os.getenv("OPENAI_ALCHEMY", "")
    OPENAI_MORALIS: str = os.getenv("OPENAI_MORALIS", "")
    OPENAI_SOLSCAN: str = os.getenv("OPENAI_SOLSCAN", "")
    OPENAI_LAYER1: str = os.getenv("OPENAI_LAYER1", "")
    OPENAI_LAYER2_OPTIMISTIC: str = os.getenv("OPENAI_LAYER2_OPTIMISTIC", "")
    OPENAI_LAYER2_ZK: str = os.getenv("OPENAI_LAYER2_ZK", "")
    OPENAI_BITCOIN_L2: str = os.getenv("OPENAI_BITCOIN_L2", "")
    OPENAI_APP_CHAINS: str = os.getenv("OPENAI_APP_CHAINS", "")
    OPENAI_NON_EVM: str = os.getenv("OPENAI_NON_EVM", "")


# ═══════════════════════════════════════════════════════════════════════════════
# 🌐 BLOCKCHAIN APIs (Free - No Key Required)
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class BlockchainAPIs:
    """Free blockchain API endpoints"""
    
    # Non-EVM Chains
    BITCOIN: str = "https://mempool.space/api"
    LITECOIN: str = "https://litecoinspace.org/api"
    DOGECOIN: str = "https://dogechain.info/api/v1"
    TRON: str = "https://api.trongrid.io"
    TON: str = "https://toncenter.com/api/v2"
    RIPPLE: str = "https://xrplcluster.com"
    NEAR: str = "https://api.nearblocks.io/v1"
    ALGORAND: str = "https://mainnet-api.algonode.cloud"
    APTOS: str = "https://fullnode.mainnet.aptoslabs.com/v1"
    SUI: str = "https://fullnode.mainnet.sui.io"
    COSMOS: str = "https://cosmos-rest.publicnode.com"
    FLOW: str = "https://rest-mainnet.onflow.org/v1"
    IMMUTABLE_X: str = "https://api.x.immutable.com/v1"
    STARKNET: str = "https://starknet-mainnet.public.blastapi.io"
    
    # Etherscan V2 (Single endpoint for 62 chains)
    ETHERSCAN_V2: str = "https://api.etherscan.io/v2/api"


# ═══════════════════════════════════════════════════════════════════════════════
# 🎯 AGENT CONFIGURATIONS
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class AgentConfig:
    """Configuration for a single agent"""
    name: str
    model: str
    api_key: str
    system_prompt: str
    temperature: float = 0.3
    max_tokens: int = 4096


# Agent Registry - Maps agent names to their configurations
AGENT_CONFIGS: Dict[str, dict] = {
    # 🧠 Master Orchestrator
    "orchestrator": {
        "name": "Omnichain Orchestrator",
        "model": "claude-3-5-sonnet-20241022",
        "provider": "anthropic",
        "temperature": 0.5,
        "max_tokens": 8192,
    },
    
    # ⭐ Expert Agents (Bitcoin & Ethereum)
    "bitcoin": {
        "name": "Bitcoin Expert",
        "model": "gpt-4o-mini",
        "provider": "openai",
        "api_key_name": "OPENAI_BITCOIN",
        "temperature": 0.3,
    },
    "ethereum": {
        "name": "Ethereum Expert",
        "model": "gpt-4o-mini",
        "provider": "openai",
        "api_key_name": "OPENAI_ETHEREUM",
        "temperature": 0.3,
    },
    
    # 🔗 Etherscan V2 Layer Agents
    "layer1": {
        "name": "Layer 1 Expert",
        "model": "gpt-4o-mini",
        "provider": "openai",
        "api_key_name": "OPENAI_LAYER1",
        "chains_count": 24,
    },
    "layer2_optimistic": {
        "name": "Layer 2 Optimistic Expert",
        "model": "gpt-4o-mini",
        "provider": "openai",
        "api_key_name": "OPENAI_LAYER2_OPTIMISTIC",
        "chains_count": 22,
    },
    "layer2_zk": {
        "name": "Layer 2 ZK Expert",
        "model": "gpt-4o-mini",
        "provider": "openai",
        "api_key_name": "OPENAI_LAYER2_ZK",
        "chains_count": 5,
    },
    "bitcoin_l2": {
        "name": "Bitcoin L2 Expert",
        "model": "gpt-4o-mini",
        "provider": "openai",
        "api_key_name": "OPENAI_BITCOIN_L2",
        "chains_count": 3,
    },
    "app_chains": {
        "name": "App Chains Expert",
        "model": "gpt-4o-mini",
        "provider": "openai",
        "api_key_name": "OPENAI_APP_CHAINS",
        "chains_count": 8,
    },
    
    # 🌐 External Provider Agents
    "alchemy": {
        "name": "Alchemy Expert",
        "model": "gpt-4o-mini",
        "provider": "openai",
        "api_key_name": "OPENAI_ALCHEMY",
        "chains_count": 10,
    },
    "moralis": {
        "name": "Moralis Expert",
        "model": "gpt-4o-mini",
        "provider": "openai",
        "api_key_name": "OPENAI_MORALIS",
        "chains_count": 3,
    },
    "solscan": {
        "name": "Solscan Expert",
        "model": "gpt-4o-mini",
        "provider": "openai",
        "api_key_name": "OPENAI_SOLSCAN",
        "chains_count": 1,
    },
    
    # 🔷 Non-EVM Agent
    "non_evm": {
        "name": "Non-EVM Expert",
        "model": "gpt-4o-mini",
        "provider": "openai",
        "api_key_name": "OPENAI_NON_EVM",
        "chains_count": 14,
    },
}


# ═══════════════════════════════════════════════════════════════════════════════
# 📊 CHAIN MAPPINGS
# ═══════════════════════════════════════════════════════════════════════════════

# Chain ID to Agent mapping for routing
CHAIN_TO_AGENT: Dict[int, str] = {
    # Bitcoin (special - uses name not chain_id)
    0: "bitcoin",
    
    # Ethereum mainnet - dedicated expert
    1: "ethereum",
    
    # Layer 1 chains
    56: "layer1",      # BNB Chain
    43114: "layer1",   # Avalanche
    250: "layer1",     # Fantom
    25: "layer1",      # Cronos
    100: "layer1",     # Gnosis
    1284: "layer1",    # Moonbeam
    1285: "layer1",    # Moonriver
    42220: "layer1",   # Celo
    122: "layer1",     # Fuse
    1313161554: "layer1",  # Aurora
    9001: "layer1",    # Evmos
    7700: "layer1",    # Canto
    2222: "layer1",    # Kava
    40: "layer1",      # Telos
    57: "layer1",      # Syscoin
    30: "layer1",      # Rootstock
    20: "layer1",      # Elastos
    1030: "layer1",    # Conflux
    148: "layer1",     # Shimmer
    4689: "layer1",    # IoTeX
    14: "layer1",      # Flare
    8217: "layer1",    # Klaytn
    1111: "layer1",    # WEMIX
    248: "layer1",     # Oasys
    
    # Layer 2 Optimistic
    137: "layer2_optimistic",    # Polygon
    42161: "layer2_optimistic",  # Arbitrum One
    10: "layer2_optimistic",     # Optimism
    8453: "layer2_optimistic",   # Base
    59144: "layer2_optimistic",  # Linea
    534352: "layer2_optimistic", # Scroll
    81457: "layer2_optimistic",  # Blast
    5000: "layer2_optimistic",   # Mantle
    34443: "layer2_optimistic",  # Mode
    7777777: "layer2_optimistic", # Zora
    252: "layer2_optimistic",    # Fraxtal
    169: "layer2_optimistic",    # Manta Pacific
    1088: "layer2_optimistic",   # Metis
    288: "layer2_optimistic",    # Boba
    42170: "layer2_optimistic",  # Arbitrum Nova
    204: "layer2_optimistic",    # opBNB
    1135: "layer2_optimistic",   # Lisk
    60808: "layer2_optimistic",  # BOB
    7560: "layer2_optimistic",   # Cyber
    690: "layer2_optimistic",    # Redstone
    185: "layer2_optimistic",    # Mint
    48900: "layer2_optimistic",  # Zircuit
    
    # Layer 2 ZK
    324: "layer2_zk",     # zkSync Era
    1101: "layer2_zk",    # Polygon zkEVM
    167000: "layer2_zk",  # Taiko
    42766: "layer2_zk",   # ZKFair
    196: "layer2_zk",     # X Layer
    
    # Bitcoin L2
    4200: "bitcoin_l2",   # Merlin
    200901: "bitcoin_l2", # Bitlayer
    1116: "bitcoin_l2",   # Core DAO
    
    # App Chains
    592: "app_chains",      # Astar
    336: "app_chains",      # Shiden
    1329: "app_chains",     # Sei
    666666666: "app_chains", # Degen
    245022934: "app_chains", # Neon EVM
    1666600000: "app_chains", # Harmony
    2020: "app_chains",     # Ronin
    369: "app_chains",      # PulseChain
}

# Non-EVM chain name to API mapping
NON_EVM_CHAINS: Dict[str, dict] = {
    "bitcoin": {"symbol": "BTC", "api": "BITCOIN"},
    "litecoin": {"symbol": "LTC", "api": "LITECOIN"},
    "dogecoin": {"symbol": "DOGE", "api": "DOGECOIN"},
    "tron": {"symbol": "TRX", "api": "TRON"},
    "ton": {"symbol": "TON", "api": "TON"},
    "ripple": {"symbol": "XRP", "api": "RIPPLE"},
    "near": {"symbol": "NEAR", "api": "NEAR"},
    "algorand": {"symbol": "ALGO", "api": "ALGORAND"},
    "aptos": {"symbol": "APT", "api": "APTOS"},
    "sui": {"symbol": "SUI", "api": "SUI"},
    "cosmos": {"symbol": "ATOM", "api": "COSMOS"},
    "flow": {"symbol": "FLOW", "api": "FLOW"},
    "immutable_x": {"symbol": "IMX", "api": "IMMUTABLE_X"},
    "starknet": {"symbol": "STRK", "api": "STARKNET"},
    "solana": {"symbol": "SOL", "api": "SOLSCAN"},
}


# ═══════════════════════════════════════════════════════════════════════════════
# ⚙️ SYSTEM SETTINGS
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class Settings:
    """Global system settings"""
    
    # Rate limiting
    RATE_LIMIT_REQUESTS_PER_SECOND: int = 5
    RATE_LIMIT_BURST: int = 10
    
    # Caching
    CACHE_TTL_SECONDS: int = 300  # 5 minutes
    CACHE_MAX_SIZE: int = 1000
    
    # Timeouts
    HTTP_TIMEOUT_SECONDS: int = 30
    AGENT_TIMEOUT_SECONDS: int = 60
    
    # Retries
    MAX_RETRIES: int = 3
    RETRY_DELAY_SECONDS: float = 1.0
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    # Paths
    BASE_DIR: Path = Path(__file__).parent
    CHAINS_DIR: Path = BASE_DIR / "providers"


# Global instances
API_KEYS = APIKeys()
BLOCKCHAIN_APIS = BlockchainAPIs()
SETTINGS = Settings()


# ═══════════════════════════════════════════════════════════════════════════════
# 🔧 HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def get_agent_api_key(agent_name: str) -> str:
    """Get the API key for a specific agent"""
    config = AGENT_CONFIGS.get(agent_name)
    if not config:
        raise ValueError(f"Unknown agent: {agent_name}")
    
    if config.get("provider") == "anthropic":
        return API_KEYS.ANTHROPIC_API_KEY
    
    key_name = config.get("api_key_name")
    if key_name:
        return getattr(API_KEYS, key_name)
    
    raise ValueError(f"No API key configured for agent: {agent_name}")


def get_chain_agent(chain_id: int = None, chain_name: str = None) -> str:
    """Determine which agent should handle a chain"""
    
    # Handle non-EVM by name
    if chain_name:
        chain_name_lower = chain_name.lower()
        if chain_name_lower in NON_EVM_CHAINS:
            if chain_name_lower == "solana":
                return "solscan"
            return "non_evm"
    
    # Handle EVM by chain_id
    if chain_id is not None:
        return CHAIN_TO_AGENT.get(chain_id, "layer1")
    
    return "orchestrator"


def get_blockchain_api(chain_name: str) -> str:
    """Get the API URL for a non-EVM chain"""
    chain_info = NON_EVM_CHAINS.get(chain_name.lower())
    if chain_info:
        api_attr = chain_info.get("api")
        return getattr(BLOCKCHAIN_APIS, api_attr, None)
    return None


# ═══════════════════════════════════════════════════════════════════════════════
# 📊 SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════

SYSTEM_SUMMARY = """
╔══════════════════════════════════════════════════════════════════════════════╗
║                    🌐 OMNICHAIN MULTI-AGENT SYSTEM                           ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  🧠 Orchestrator: Claude 3.5 Sonnet                                          ║
║  🤖 Agents: 12 × GPT-4o-mini                                                 ║
║  🔗 Total Chains: 101+                                                       ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  PROVIDERS                          │  CHAINS                                ║
╠─────────────────────────────────────┼────────────────────────────────────────╣
║  ⭐ Bitcoin Expert                   │  1 (BTC)                               ║
║  ⭐ Ethereum Expert                  │  1 (ETH)                               ║
║  🔷 Etherscan V2 Layer 1             │  24 chains                             ║
║  🔷 Etherscan V2 Layer 2 Optimistic  │  22 chains                             ║
║  🔷 Etherscan V2 Layer 2 ZK          │  5 chains                              ║
║  🔷 Etherscan V2 Bitcoin L2          │  3 chains                              ║
║  🔷 Etherscan V2 App Chains          │  8 chains                              ║
║  🟣 Alchemy                          │  10 chains                             ║
║  🟡 Moralis                          │  3 chains                              ║
║  🟢 Solscan                          │  1 (Solana)                            ║
║  🔵 Non-EVM                          │  14 chains                             ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Total: 92 unique chains (some overlap between providers)                    ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

if __name__ == "__main__":
    print(SYSTEM_SUMMARY)
