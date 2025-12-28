# omnichain/providers/__init__.py
"""
🔌 Omnichain Providers
Multi-blockchain data providers supporting 101+ chains

Providers:
- bitcoin: Bitcoin via Mempool.space API
- ethereum: Ethereum via Etherscan API
- etherscan_v2: 62+ EVM chains via Etherscan V2 API
  - layer1: Layer 1 chains (ETH, BNB, AVAX, etc.)
  - layer2_optimistic: Optimistic Rollups (Arbitrum, Optimism, Base, etc.)
  - layer2_zk: ZK Rollups (zkSync, Polygon zkEVM, Taiko, etc.)
  - bitcoin_l2: Bitcoin L2s (BOB, Merlin, Bitlayer, etc.)
  - app_chains: App-specific chains (Immutable, Ronin, Xai, etc.)
- non_evm: 14 non-EVM chains (Solana, TON, Tron, XRP, etc.)
"""

from .base import BaseClient, BaseAgent, ChainConfig

# Bitcoin Provider
from .bitcoin import BitcoinClient, BitcoinAgent

# Ethereum Provider
from .ethereum import EthereumClient, EthereumAgent

# Etherscan V2 Providers (62+ EVM chains)
from .etherscan_v2 import EtherscanV2Client
from .etherscan_v2.layer1 import Layer1Agent
from .etherscan_v2.layer2_optimistic import Layer2OptimisticAgent
from .etherscan_v2.layer2_zk import Layer2ZKAgent
from .etherscan_v2.bitcoin_l2 import BitcoinL2Agent
from .etherscan_v2.app_chains import AppChainsAgent

# Non-EVM Provider (14 chains)
from .non_evm import NonEVMClient, NonEVMAgent


__all__ = [
    # Base
    "BaseClient",
    "BaseAgent", 
    "ChainConfig",
    
    # Bitcoin
    "BitcoinClient",
    "BitcoinAgent",
    
    # Ethereum
    "EthereumClient",
    "EthereumAgent",
    
    # Etherscan V2 (62+ EVM chains)
    "EtherscanV2Client",
    "Layer1Agent",
    "Layer2OptimisticAgent",
    "Layer2ZKAgent",
    "BitcoinL2Agent",
    "AppChainsAgent",
    
    # Non-EVM (14 chains)
    "NonEVMClient",
    "NonEVMAgent",
]
