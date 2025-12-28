# omnichain/providers/non_evm/__init__.py
"""
Non-EVM Chains Provider Package

Supports 14 non-EVM blockchains using free public APIs:
- Litecoin (litecoinspace.org)
- Dogecoin (dogechain.info)
- Tron (TronGrid)
- TON (TONCenter)
- XRP/Ripple (XRPL Cluster)
- NEAR (Nearblocks)
- Algorand (Algonode)
- Aptos (Aptoslabs)
- Sui (Sui fullnode)
- Cosmos (Publicnode)
- Flow (Onflow)
- Immutable X (Immutable X API)
- Starknet (Blastapi)
"""

from .client import NonEVMClient
from .agent import NonEVMAgent

__all__ = ["NonEVMClient", "NonEVMAgent"]
