# omnichain/providers/etherscan_v2/__init__.py
"""
🔷 Etherscan V2 Provider
Single API key for 62+ EVM chains
"""

from .client import EtherscanV2Client
from .chains import ETHERSCAN_V2_CHAINS, ETHERSCAN_V2_TESTNETS, get_chain_by_id, get_chains_by_type

__all__ = [
    "EtherscanV2Client",
    "ETHERSCAN_V2_CHAINS",
    "ETHERSCAN_V2_TESTNETS",
    "get_chain_by_id",
    "get_chains_by_type",
]
