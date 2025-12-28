# omnichain/providers/ethereum/__init__.py
"""
⭐ Ethereum Expert Provider
Specialized agent for Ethereum mainnet analysis
"""

from .client import EthereumClient
from .agent import EthereumAgent

__all__ = ["EthereumClient", "EthereumAgent"]
