import sys
import asyncio
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from config import API_KEYS
from providers.etherscan_v2.client import EtherscanV2Client

async def test_etherscan():
    address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
    chain_id = 1
    
    print(f"Testing Etherscan V2 for {address} on chain {chain_id}")
    print(f"API Key set: {bool(API_KEYS.ETHERSCAN_API_KEY)}")
    
    async with EtherscanV2Client(API_KEYS.ETHERSCAN_API_KEY) as client:
        # Test native transactions
        txs_result = await client.get_transactions(address, chain_id=chain_id, page=1, offset=10)
        print(f"\nNative transactions:")
        print(f"  Status: {txs_result.get('status')}")
        print(f"  Message: {txs_result.get('message')}")
        print(f"  Count: {len(txs_result.get('transactions', []))}")
        
        if txs_result.get('transactions'):
            tx = txs_result['transactions'][0]
            print(f"  First tx: from={tx.get('from')[:10]}... to={tx.get('to')[:10] if tx.get('to') else 'None'}...")
        
        # Test token transfers
        token_result = await client.get_token_transfers(address, chain_id=chain_id, page=1, offset=10)
        print(f"\nToken transfers:")
        print(f"  Status: {token_result.get('status')}")
        print(f"  Message: {token_result.get('message')}")
        print(f"  Count: {len(token_result.get('token_transfers', []))}")

if __name__ == "__main__":
    asyncio.run(test_etherscan())
