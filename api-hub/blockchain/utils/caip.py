"""
CAIP-10 (Chain Agnostic Improvement Proposal 10) Implementation
Multi-chain account identifier standard

Format: {namespace}:{reference}:{address}
Example: eip155:1:0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
"""

from dataclasses import dataclass
from typing import Optional, Dict, Tuple


@dataclass
class CAIPAccount:
    """CAIP-10 Account representation"""
    namespace: str      # e.g., "eip155" for Ethereum-compatible chains
    reference: str      # Chain ID (e.g., "1" for Ethereum mainnet)
    address: str        # Account address
    
    def __str__(self) -> str:
        return f"{self.namespace}:{self.reference}:{self.address}"
    
    @property
    def chain_id(self) -> str:
        """Get the full chain identifier (namespace:reference)"""
        return f"{self.namespace}:{self.reference}"


# Chain metadata based on CAIP-2 standard
CHAIN_INFO: Dict[str, Dict[str, str]] = {
    "eip155:1": {
        "name": "Ethereum Mainnet",
        "namespace": "eip155",
        "reference": "1",
        "explorer": "https://etherscan.io",
        "symbol": "ETH"
    },
    "eip155:56": {
        "name": "BNB Smart Chain",
        "namespace": "eip155",
        "reference": "56",
        "explorer": "https://bscscan.com",
        "symbol": "BNB"
    },
    "eip155:137": {
        "name": "Polygon",
        "namespace": "eip155",
        "reference": "137",
        "explorer": "https://polygonscan.com",
        "symbol": "MATIC"
    },
    "eip155:42161": {
        "name": "Arbitrum One",
        "namespace": "eip155",
        "reference": "42161",
        "explorer": "https://arbiscan.io",
        "symbol": "ETH"
    },
    "eip155:10": {
        "name": "Optimism",
        "namespace": "eip155",
        "reference": "10",
        "explorer": "https://optimistic.etherscan.io",
        "symbol": "ETH"
    },
    "eip155:43114": {
        "name": "Avalanche C-Chain",
        "namespace": "eip155",
        "reference": "43114",
        "explorer": "https://snowtrace.io",
        "symbol": "AVAX"
    },
    "eip155:250": {
        "name": "Fantom Opera",
        "namespace": "eip155",
        "reference": "250",
        "explorer": "https://ftmscan.com",
        "symbol": "FTM"
    },
    "eip155:8453": {
        "name": "Base",
        "namespace": "eip155",
        "reference": "8453",
        "explorer": "https://basescan.org",
        "symbol": "ETH"
    },
}


def parse_caip10(caip_string: str) -> Optional[CAIPAccount]:
    """
    Parse CAIP-10 formatted string into CAIPAccount object
    
    Args:
        caip_string: CAIP-10 formatted string (e.g., "eip155:1:0xAddress")
    
    Returns:
        CAIPAccount object or None if invalid format
    
    Example:
        >>> account = parse_caip10("eip155:1:0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb")
        >>> print(account.namespace)  # "eip155"
        >>> print(account.reference)  # "1"
    """
    try:
        parts = caip_string.split(":", 2)
        if len(parts) != 3:
            return None
        
        namespace, reference, address = parts
        
        # Basic validation
        if not namespace or not reference or not address:
            return None
        
        return CAIPAccount(
            namespace=namespace,
            reference=reference,
            address=address
        )
    except Exception:
        return None


def make_caip10(address: str, chain_id: str = "1", namespace: str = "eip155") -> str:
    """
    Create CAIP-10 formatted string from components
    
    Args:
        address: Account address
        chain_id: Chain reference ID (default: "1" for Ethereum mainnet)
        namespace: Chain namespace (default: "eip155" for Ethereum-compatible)
    
    Returns:
        CAIP-10 formatted string
    
    Example:
        >>> caip10 = make_caip10("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb", "1")
        >>> print(caip10)  # "eip155:1:0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
    """
    return f"{namespace}:{chain_id}:{address}"


def validate_caip10(caip_string: str) -> bool:
    """
    Validate CAIP-10 formatted string
    
    Args:
        caip_string: String to validate
    
    Returns:
        True if valid CAIP-10 format, False otherwise
    """
    account = parse_caip10(caip_string)
    return account is not None


def get_chain_info(chain_id: str) -> Optional[Dict[str, str]]:
    """
    Get chain metadata for a given chain ID
    
    Args:
        chain_id: Full chain ID (e.g., "eip155:1") or just reference (e.g., "1")
    
    Returns:
        Dictionary with chain information or None if not found
    
    Example:
        >>> info = get_chain_info("eip155:1")
        >>> print(info["name"])  # "Ethereum Mainnet"
        >>> print(info["symbol"])  # "ETH"
    """
    # Handle both "eip155:1" and "1" formats
    if ":" not in chain_id:
        chain_id = f"eip155:{chain_id}"
    
    return CHAIN_INFO.get(chain_id)


def extract_address(caip_string: str) -> Optional[str]:
    """
    Extract just the address from a CAIP-10 string
    
    Args:
        caip_string: CAIP-10 formatted string
    
    Returns:
        Address string or None if invalid
    """
    account = parse_caip10(caip_string)
    return account.address if account else None


def extract_chain_id(caip_string: str) -> Optional[Tuple[str, str]]:
    """
    Extract namespace and reference from CAIP-10 string
    
    Args:
        caip_string: CAIP-10 formatted string
    
    Returns:
        Tuple of (namespace, reference) or None if invalid
    """
    account = parse_caip10(caip_string)
    return (account.namespace, account.reference) if account else None


def is_same_chain(caip1: str, caip2: str) -> bool:
    """
    Check if two CAIP-10 addresses are on the same chain
    
    Args:
        caip1: First CAIP-10 address
        caip2: Second CAIP-10 address
    
    Returns:
        True if both addresses are on the same chain
    """
    account1 = parse_caip10(caip1)
    account2 = parse_caip10(caip2)
    
    if not account1 or not account2:
        return False
    
    return account1.chain_id == account2.chain_id


# Convenience function for common EVM chains
def make_ethereum_caip10(address: str, chain_id: str = "1") -> str:
    """
    Create CAIP-10 for Ethereum-compatible chains (shorthand)
    
    Args:
        address: Account address
        chain_id: Chain ID (default: "1" for mainnet)
    
    Returns:
        CAIP-10 formatted string with eip155 namespace
    """
    return make_caip10(address, chain_id, "eip155")
