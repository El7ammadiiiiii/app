# omnichain/providers/etherscan_v2/chains.py
"""
🔷 Etherscan V2 Supported Chains
62+ EVM chains supported by Etherscan API V2
https://docs.etherscan.io/v/v2-api
"""

from typing import Dict, Any, Optional, List

# ═══════════════════════════════════════════════════════════════════════════════
# 📊 MAINNET CHAINS (62+ chains)
# ═══════════════════════════════════════════════════════════════════════════════

ETHERSCAN_V2_CHAINS: Dict[int, Dict[str, Any]] = {
    # Layer 1 Chains
    1: {"name": "Ethereum", "symbol": "ETH", "decimals": 18, "type": "layer1"},
    56: {"name": "BNB Chain", "symbol": "BNB", "decimals": 18, "type": "layer1"},
    43114: {"name": "Avalanche C-Chain", "symbol": "AVAX", "decimals": 18, "type": "layer1"},
    250: {"name": "Fantom", "symbol": "FTM", "decimals": 18, "type": "layer1"},
    25: {"name": "Cronos", "symbol": "CRO", "decimals": 18, "type": "layer1"},
    100: {"name": "Gnosis", "symbol": "xDAI", "decimals": 18, "type": "layer1"},
    1284: {"name": "Moonbeam", "symbol": "GLMR", "decimals": 18, "type": "layer1"},
    1285: {"name": "Moonriver", "symbol": "MOVR", "decimals": 18, "type": "layer1"},
    42220: {"name": "Celo", "symbol": "CELO", "decimals": 18, "type": "layer1"},
    122: {"name": "Fuse", "symbol": "FUSE", "decimals": 18, "type": "layer1"},
    1313161554: {"name": "Aurora", "symbol": "ETH", "decimals": 18, "type": "layer1"},
    9001: {"name": "Evmos", "symbol": "EVMOS", "decimals": 18, "type": "layer1"},
    7700: {"name": "Canto", "symbol": "CANTO", "decimals": 18, "type": "layer1"},
    2222: {"name": "Kava EVM", "symbol": "KAVA", "decimals": 18, "type": "layer1"},
    40: {"name": "Telos EVM", "symbol": "TLOS", "decimals": 18, "type": "layer1"},
    57: {"name": "Syscoin", "symbol": "SYS", "decimals": 18, "type": "layer1"},
    30: {"name": "Rootstock", "symbol": "RBTC", "decimals": 18, "type": "layer1"},
    20: {"name": "Elastos", "symbol": "ELA", "decimals": 18, "type": "layer1"},
    1030: {"name": "Conflux eSpace", "symbol": "CFX", "decimals": 18, "type": "layer1"},
    148: {"name": "Shimmer EVM", "symbol": "SMR", "decimals": 18, "type": "layer1"},
    4689: {"name": "IoTeX", "symbol": "IOTX", "decimals": 18, "type": "layer1"},
    14: {"name": "Flare", "symbol": "FLR", "decimals": 18, "type": "layer1"},
    8217: {"name": "Klaytn", "symbol": "KLAY", "decimals": 18, "type": "layer1"},
    1111: {"name": "WEMIX", "symbol": "WEMIX", "decimals": 18, "type": "layer1"},
    248: {"name": "Oasys", "symbol": "OAS", "decimals": 18, "type": "layer1"},
    
    # Layer 2 Optimistic Rollups
    137: {"name": "Polygon", "symbol": "MATIC", "decimals": 18, "type": "layer2_optimistic"},
    42161: {"name": "Arbitrum One", "symbol": "ETH", "decimals": 18, "type": "layer2_optimistic"},
    10: {"name": "Optimism", "symbol": "ETH", "decimals": 18, "type": "layer2_optimistic"},
    8453: {"name": "Base", "symbol": "ETH", "decimals": 18, "type": "layer2_optimistic"},
    59144: {"name": "Linea", "symbol": "ETH", "decimals": 18, "type": "layer2_optimistic"},
    534352: {"name": "Scroll", "symbol": "ETH", "decimals": 18, "type": "layer2_optimistic"},
    81457: {"name": "Blast", "symbol": "ETH", "decimals": 18, "type": "layer2_optimistic"},
    5000: {"name": "Mantle", "symbol": "MNT", "decimals": 18, "type": "layer2_optimistic"},
    34443: {"name": "Mode", "symbol": "ETH", "decimals": 18, "type": "layer2_optimistic"},
    7777777: {"name": "Zora", "symbol": "ETH", "decimals": 18, "type": "layer2_optimistic"},
    252: {"name": "Fraxtal", "symbol": "frxETH", "decimals": 18, "type": "layer2_optimistic"},
    169: {"name": "Manta Pacific", "symbol": "ETH", "decimals": 18, "type": "layer2_optimistic"},
    1088: {"name": "Metis", "symbol": "METIS", "decimals": 18, "type": "layer2_optimistic"},
    288: {"name": "Boba Network", "symbol": "ETH", "decimals": 18, "type": "layer2_optimistic"},
    42170: {"name": "Arbitrum Nova", "symbol": "ETH", "decimals": 18, "type": "layer2_optimistic"},
    204: {"name": "opBNB", "symbol": "BNB", "decimals": 18, "type": "layer2_optimistic"},
    1135: {"name": "Lisk", "symbol": "LSK", "decimals": 18, "type": "layer2_optimistic"},
    60808: {"name": "BOB", "symbol": "ETH", "decimals": 18, "type": "layer2_optimistic"},
    7560: {"name": "Cyber", "symbol": "ETH", "decimals": 18, "type": "layer2_optimistic"},
    690: {"name": "Redstone", "symbol": "ETH", "decimals": 18, "type": "layer2_optimistic"},
    185: {"name": "Mint", "symbol": "ETH", "decimals": 18, "type": "layer2_optimistic"},
    48900: {"name": "Zircuit", "symbol": "ETH", "decimals": 18, "type": "layer2_optimistic"},
    
    # Layer 2 ZK Rollups
    324: {"name": "zkSync Era", "symbol": "ETH", "decimals": 18, "type": "layer2_zk"},
    1101: {"name": "Polygon zkEVM", "symbol": "ETH", "decimals": 18, "type": "layer2_zk"},
    167000: {"name": "Taiko", "symbol": "ETH", "decimals": 18, "type": "layer2_zk"},
    42766: {"name": "ZKFair", "symbol": "USDC", "decimals": 18, "type": "layer2_zk"},
    196: {"name": "X Layer", "symbol": "OKB", "decimals": 18, "type": "layer2_zk"},
    
    # Bitcoin Layer 2
    4200: {"name": "Merlin", "symbol": "BTC", "decimals": 18, "type": "bitcoin_l2"},
    200901: {"name": "Bitlayer", "symbol": "BTC", "decimals": 18, "type": "bitcoin_l2"},
    1116: {"name": "Core DAO", "symbol": "CORE", "decimals": 18, "type": "bitcoin_l2"},
    
    # App Chains
    592: {"name": "Astar", "symbol": "ASTR", "decimals": 18, "type": "app_chain"},
    336: {"name": "Shiden", "symbol": "SDN", "decimals": 18, "type": "app_chain"},
    1329: {"name": "Sei", "symbol": "SEI", "decimals": 18, "type": "app_chain"},
    666666666: {"name": "Degen", "symbol": "DEGEN", "decimals": 18, "type": "app_chain"},
    245022934: {"name": "Neon EVM", "symbol": "NEON", "decimals": 18, "type": "app_chain"},
    1666600000: {"name": "Harmony", "symbol": "ONE", "decimals": 18, "type": "app_chain"},
    2020: {"name": "Ronin", "symbol": "RON", "decimals": 18, "type": "app_chain"},
    369: {"name": "PulseChain", "symbol": "PLS", "decimals": 18, "type": "app_chain"},
}

# ═══════════════════════════════════════════════════════════════════════════════
# 🧪 TESTNET CHAINS
# ═══════════════════════════════════════════════════════════════════════════════

ETHERSCAN_V2_TESTNETS: Dict[int, Dict[str, Any]] = {
    # Ethereum Testnets
    11155111: {"name": "Sepolia", "symbol": "ETH", "decimals": 18, "type": "testnet"},
    17000: {"name": "Holesky", "symbol": "ETH", "decimals": 18, "type": "testnet"},
    
    # BNB Chain Testnet
    97: {"name": "BNB Chain Testnet", "symbol": "tBNB", "decimals": 18, "type": "testnet"},
    
    # Polygon Testnets
    80002: {"name": "Polygon Amoy", "symbol": "MATIC", "decimals": 18, "type": "testnet"},
    
    # Arbitrum Testnet
    421614: {"name": "Arbitrum Sepolia", "symbol": "ETH", "decimals": 18, "type": "testnet"},
    
    # Optimism Testnet
    11155420: {"name": "Optimism Sepolia", "symbol": "ETH", "decimals": 18, "type": "testnet"},
    
    # Base Testnet
    84532: {"name": "Base Sepolia", "symbol": "ETH", "decimals": 18, "type": "testnet"},
    
    # zkSync Testnet
    300: {"name": "zkSync Sepolia", "symbol": "ETH", "decimals": 18, "type": "testnet"},
    
    # Linea Testnet
    59141: {"name": "Linea Sepolia", "symbol": "ETH", "decimals": 18, "type": "testnet"},
    
    # Scroll Testnet
    534351: {"name": "Scroll Sepolia", "symbol": "ETH", "decimals": 18, "type": "testnet"},
    
    # Blast Testnet
    168587773: {"name": "Blast Sepolia", "symbol": "ETH", "decimals": 18, "type": "testnet"},
}


# ═══════════════════════════════════════════════════════════════════════════════
# 🔧 HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def get_chain_by_id(chain_id: int) -> Optional[Dict[str, Any]]:
    """
    Get chain information by chain ID.
    
    Args:
        chain_id: The chain ID to look up
        
    Returns:
        Chain info dict or None if not found
    """
    # Check mainnets first
    if chain_id in ETHERSCAN_V2_CHAINS:
        return {**ETHERSCAN_V2_CHAINS[chain_id], "chain_id": chain_id}
    
    # Check testnets
    if chain_id in ETHERSCAN_V2_TESTNETS:
        return {**ETHERSCAN_V2_TESTNETS[chain_id], "chain_id": chain_id}
    
    return None


def get_chains_by_type(chain_type: str) -> Dict[int, Dict[str, Any]]:
    """
    Get all chains of a specific type.
    
    Args:
        chain_type: Type of chain (layer1, layer2_optimistic, layer2_zk, bitcoin_l2, app_chain, testnet)
        
    Returns:
        Dictionary of chains matching the type
    """
    chains = {}
    
    for chain_id, info in ETHERSCAN_V2_CHAINS.items():
        if info.get("type") == chain_type:
            chains[chain_id] = info
    
    if chain_type == "testnet":
        chains.update(ETHERSCAN_V2_TESTNETS)
    
    return chains


def get_all_chain_ids() -> List[int]:
    """Get all supported chain IDs (mainnets only)"""
    return list(ETHERSCAN_V2_CHAINS.keys())


def get_all_chains() -> Dict[int, Dict[str, Any]]:
    """Get all chains (mainnets and testnets)"""
    return {**ETHERSCAN_V2_CHAINS, **ETHERSCAN_V2_TESTNETS}
