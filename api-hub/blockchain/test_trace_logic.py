import sys
import asyncio
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from config import API_KEYS
from providers.etherscan_v2.client import EtherscanV2Client

async def test_trace_build_local():
    address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
    chain_id = 1
    chain_uid = f"eip155:{chain_id}"
    
    print(f"Testing trace build logic locally for {address}")
    
    async with EtherscanV2Client(API_KEYS.ETHERSCAN_API_KEY) as client:
        # Fetch transactions
        txs = await client.get_transactions(address, chain_id=chain_id, page=1, offset=50)
        tokens = await client.get_token_transfers(address, chain_id=chain_id, page=1, offset=50)
        
        print(f"\nRaw results:")
        print(f"  Native txs: {len(txs.get('transactions', []))}")
        print(f"  Token transfers: {len(tokens.get('token_transfers', []))}")
        
        # Simulate edge building
        edges = []
        nodes = set()
        
        direction = "both"
        
        if "transactions" in txs:
            for tx in txs.get("transactions", []):
                src = tx.get("from")
                dst = tx.get("to")
                
                if not src or not dst:
                    print(f"  Skipped tx (missing src/dst): {tx}")
                    continue
                
                # Check direction filter
                if direction == "in":
                    if dst.lower() != address.lower():
                        continue
                elif direction == "out":
                    if src.lower() != address.lower():
                        continue
                
                nodes.add(src.lower())
                nodes.add(dst.lower())
                edges.append({"from": src[:10], "to": dst[:10] if dst else "None", "type": "native"})
        
        if "token_transfers" in tokens:
            for tx in tokens.get("token_transfers", []):
                src = tx.get("from")
                dst = tx.get("to")
                
                if not src or not dst:
                    continue
                
                # Check direction filter
                if direction == "in":
                    if dst.lower() != address.lower():
                        continue
                elif direction == "out":
                    if src.lower() != address.lower():
                        continue
                
                nodes.add(src.lower())
                nodes.add(dst.lower())
                edges.append({"from": src[:10], "to": dst[:10] if dst else "None", "type": "erc20", "symbol": tx.get("tokenSymbol")})
        
        print(f"\nAfter filtering (direction={direction}):")
        print(f"  Unique nodes: {len(nodes)}")
        print(f"  Edges: {len(edges)}")
        
        if edges:
            print(f"\nFirst 3 edges:")
            for edge in edges[:3]:
                print(f"    {edge}")

if __name__ == "__main__":
    asyncio.run(test_trace_build_local())
