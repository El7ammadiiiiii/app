#!/usr/bin/env python3
"""Detailed expand test — shows full node/edge data."""
import urllib.request, json

url = 'http://127.0.0.1:8001/ccways/expand'
body = json.dumps({
    'address': '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    'nodeId': 'root-vitalik',
    'direction': 'both',
    'limit': 10,
}).encode()

req = urllib.request.Request(url, data=body, headers={'Content-Type': 'application/json'})

with urllib.request.urlopen(req, timeout=120) as r:
    data = json.loads(r.read().decode())
    print(f"Success: {data.get('success')}")
    print(f"Provider: {data.get('provider')}")
    
    nodes = data.get('nodes', [])
    edges = data.get('edges', [])
    print(f"Nodes: {len(nodes)}")
    print(f"Edges: {len(edges)}")
    
    print("\n=== NODES ===")
    for i, n in enumerate(nodes):
        chains = n.get('activeChains', [])
        chains_str = ','.join(chains[:3]) if chains else n.get('chain', '?')
        print(f"  [{i}] {n.get('label','?'):<30} | addr={n['address'][:16]}... | USD=${n.get('totalValueUSD',0):>12,.0f} | txs={n.get('txCount',0):>6} | type={n.get('type','?'):<10} | chains={chains_str}")
    
    print("\n=== EDGES ===")
    for i, e in enumerate(edges):
        src_short = e['source'].split(':')[-1][:10] if ':' in e['source'] else e['source'][:10]
        tgt_short = e['target'].split(':')[-1][:10] if ':' in e['target'] else e['target'][:10]
        print(f"  [{i}] {src_short}... -> {tgt_short}... | dir={e['direction']:<3} | val=${e.get('totalValue',0):>12,.0f} | txs={e.get('transferCount',0):>6} | chain={e.get('chain','?')} | xchain={e.get('isCrossChain',False)}")
