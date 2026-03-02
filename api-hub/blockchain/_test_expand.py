#!/usr/bin/env python3
"""Quick test for expand endpoint."""
import urllib.request, json

url = 'http://127.0.0.1:8000/ccways/expand'
body = json.dumps({
    'address': '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    'nodeId': 'root-vitalik',
    'direction': 'both',
    'limit': 5,
}).encode()

req = urllib.request.Request(url, data=body, headers={'Content-Type': 'application/json'})

try:
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read().decode())
        print(f"Status: {resp.status}")
        nodes = data.get('nodes', [])
        edges = data.get('edges', [])
        print(f"Nodes: {len(nodes)}")
        print(f"Edges: {len(edges)}")
        print(f"Provider: {data.get('provider', '?')}")
        print(f"Count: {data.get('count', 0)}")
        print()
        for i, n in enumerate(nodes[:5]):
            print(f"  [{i}] {n.get('label','?')} | addr={n['address'][:16]}... | USD={n.get('totalValueUSD',0)} | txs={n.get('txCount',0)} | type={n.get('type','?')}")
        print()
        for i, e in enumerate(edges[:5]):
            s = e['source'][:25]
            t = e['target'][:25]
            print(f"  [{i}] {s}... -> {t}... | dir={e['direction']} | val=${e.get('totalValue',0):,.0f} | txs={e.get('transferCount',0)}")
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}: {e.read().decode()[:500]}")
except Exception as e:
    print(f"Error: {e}")
