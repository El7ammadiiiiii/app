# omnichain/test_system.py
"""
🧪 Omnichain System Test
Quick validation of the multi-agent system setup
"""

import asyncio
import sys
from pathlib import Path

# Ensure imports work
sys.path.insert(0, str(Path(__file__).parent))


async def test_imports():
    """Test that all modules can be imported"""
    print("🔍 Testing Imports...")
    
    try:
        # Config
        from config import API_KEYS, AGENT_CONFIGS
        print("  ✅ config.py")
        
        # Base
        from providers.base import BaseClient, BaseAgent, ChainConfig
        print("  ✅ providers/base.py")
        
        # Bitcoin
        from providers.bitcoin import BitcoinClient, BitcoinAgent
        print("  ✅ providers/bitcoin/")
        
        # Ethereum
        from providers.ethereum import EthereumClient, EthereumAgent
        print("  ✅ providers/ethereum/")
        
        # Etherscan V2
        from providers.etherscan_v2 import EtherscanV2Client
        from providers.etherscan_v2.chains import ETHERSCAN_V2_CHAINS
        print("  ✅ providers/etherscan_v2/")
        
        # Layer agents
        from providers.etherscan_v2.layer1 import Layer1Agent
        print("  ✅ providers/etherscan_v2/layer1/")
        
        from providers.etherscan_v2.layer2_optimistic import Layer2OptimisticAgent
        print("  ✅ providers/etherscan_v2/layer2_optimistic/")
        
        from providers.etherscan_v2.layer2_zk import Layer2ZKAgent
        print("  ✅ providers/etherscan_v2/layer2_zk/")
        
        from providers.etherscan_v2.bitcoin_l2 import BitcoinL2Agent
        print("  ✅ providers/etherscan_v2/bitcoin_l2/")
        
        from providers.etherscan_v2.app_chains import AppChainsAgent
        print("  ✅ providers/etherscan_v2/app_chains/")
        
        # Non-EVM
        from providers.non_evm import NonEVMClient, NonEVMAgent
        print("  ✅ providers/non_evm/")
        
        # Orchestrator
        from orchestrator import Orchestrator
        print("  ✅ orchestrator/")
        
        print("\n✨ All imports successful!")
        return True
        
    except ImportError as e:
        print(f"\n❌ Import Error: {e}")
        return False


async def test_chain_configs():
    """Test chain configuration data"""
    print("\n📊 Testing Chain Configurations...")
    
    from providers.etherscan_v2.chains import (
        ETHERSCAN_V2_CHAINS,
        ETHERSCAN_V2_TESTNETS,
        get_chain_by_id,
        get_chains_by_type,
    )
    
    print(f"  📈 EVM Mainnets: {len(ETHERSCAN_V2_CHAINS)} chains")
    print(f"  🧪 EVM Testnets: {len(ETHERSCAN_V2_TESTNETS)} chains")
    
    # Test chain lookup
    eth = get_chain_by_id(1)
    print(f"  🔷 Ethereum: {eth}")
    
    # Test by type
    l2_zk = get_chains_by_type("layer2_zk")
    print(f"  🔵 ZK Rollups: {len(l2_zk)} chains")
    
    # Non-EVM
    from providers.non_evm.client import NON_EVM_CHAINS
    print(f"  🌐 Non-EVM Chains: {len(NON_EVM_CHAINS)} chains")
    
    total = len(ETHERSCAN_V2_CHAINS) + len(NON_EVM_CHAINS) + 1  # +1 for Bitcoin
    print(f"\n  📊 Total Supported Chains: ~{total}+")
    
    return True


async def test_agent_configs():
    """Test agent configurations"""
    print("\n🤖 Testing Agent Configurations...")
    
    from config import AGENT_CONFIGS, API_KEYS
    
    print(f"  📋 Configured Agents: {len(AGENT_CONFIGS)}")
    
    for name, config in AGENT_CONFIGS.items():
        has_key = bool(config.get("api_key"))
        model = config.get("model", "N/A")
        print(f"    • {name}: {model} {'✅' if has_key else '❌'}")
    
    print(f"\n  🔑 Etherscan API Key: {'✅' if API_KEYS.ETHERSCAN_API_KEY else '❌'}")
    print(f"  🔑 Anthropic API Key: {'✅' if API_KEYS.ANTHROPIC_API_KEY else '❌'}")
    
    return True


async def test_client_creation():
    """Test that clients can be instantiated"""
    print("\n🔌 Testing Client Creation...")
    
    from config import API_KEYS
    
    # Bitcoin client (no API key needed for mempool.space)
    from providers.bitcoin.client import BitcoinClient
    btc_client = BitcoinClient()
    print("  ✅ BitcoinClient created")
    
    # Ethereum client
    from providers.ethereum.client import EthereumClient
    eth_client = EthereumClient(API_KEYS.ETHERSCAN_API_KEY)
    print("  ✅ EthereumClient created")
    
    # Etherscan V2 client
    from providers.etherscan_v2.client import EtherscanV2Client
    v2_client = EtherscanV2Client(API_KEYS.ETHERSCAN_API_KEY)
    print("  ✅ EtherscanV2Client created")
    
    # Non-EVM client
    from providers.non_evm.client import NonEVMClient
    non_evm_client = NonEVMClient()
    print("  ✅ NonEVMClient created")
    
    return True


async def main():
    """Run all tests"""
    print("=" * 60)
    print("🌐 OMNICHAIN SYSTEM TEST")
    print("=" * 60)
    
    tests = [
        ("Imports", test_imports),
        ("Chain Configs", test_chain_configs),
        ("Agent Configs", test_agent_configs),
        ("Client Creation", test_client_creation),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = await test_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n❌ {name} failed: {e}")
            results.append((name, False))
    
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    all_passed = True
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {status} - {name}")
        if not result:
            all_passed = False
    
    print("\n" + "=" * 60)
    if all_passed:
        print("🎉 ALL TESTS PASSED!")
        print("\nNext steps:")
        print("  1. Install dependencies: pip install -r requirements.txt")
        print("  2. Start the server: python main.py server")
        print("  3. Or use CLI: python main.py cli")
    else:
        print("⚠️ SOME TESTS FAILED - Please check the errors above")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
