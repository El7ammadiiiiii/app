#!/usr/bin/env python3
"""Full system test — all endpoints."""
import urllib.request, json, time

BASE = 'http://127.0.0.1:8001/ccways'
ADDR = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'

def get(path):
    url = f"{BASE}{path}"
    with urllib.request.urlopen(url, timeout=120) as r:
        return json.loads(r.read().decode())

def post(path, body):
    url = f"{BASE}{path}"
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read().decode())

print("=" * 60)
print("1. CHAINS")
print("=" * 60)
data = get("/chains")
chains = data.get("chains", [])
print(f"   Success: {data.get('success')}")
print(f"   Count: {len(chains)}")
if chains:
    for c in chains[:5]:
        print(f"   - {c.get('id')}: {c.get('name')}")
print()

time.sleep(1)

print("=" * 60)
print("2. INTEL")
print("=" * 60)
data = get(f"/intel/{ADDR}")
ent = data.get("entity", {})
print(f"   Success: {data.get('success')}")
print(f"   Label: {ent.get('label')}")
print(f"   Type: {ent.get('type')}")
print(f"   Tags: {len(ent.get('tags', []))}")
print(f"   Contract: {ent.get('isContract')}")
print()

time.sleep(1)

print("=" * 60)
print("3. EXPAND")
print("=" * 60)
data = post("/expand", {
    "address": ADDR,
    "nodeId": "root-vitalik",
    "direction": "both",
    "limit": 10,
})
nodes = data.get("nodes", [])
edges = data.get("edges", [])
print(f"   Success: {data.get('success')}")
print(f"   Provider: {data.get('provider')}")
print(f"   Nodes: {len(nodes)}")
print(f"   Edges: {len(edges)}")
if nodes:
    for n in nodes[:5]:
        usd = n.get("totalValueUSD", 0)
        print(f"   - {n.get('label'):<30s} ${usd:>14,.0f}  txs={n.get('txCount',0)}")
print()

time.sleep(1)

print("=" * 60)
print("4. BALANCE")
print("=" * 60)
data = get(f"/balance/{ADDR}")
print(f"   Success: {data.get('success')}")
print(f"   Provider: {data.get('provider')}")
print(f"   Total USD: ${data.get('totalUSD', 0):,.2f}")
cb = data.get("chainBalances", {})
print(f"   Chains: {len(cb)}")
for cid, info in sorted(cb.items(), key=lambda x: -(x[1].get('usd',0) if isinstance(x[1],dict) else 0))[:5]:
    usd = info.get("usd", 0) if isinstance(info, dict) else 0
    print(f"   - {cid}: ${usd:,.2f}")
print()

print("=" * 60)
print("5. STATS")
print("=" * 60)
data = get("/stats")
print(f"   Alpha calls: {data.get('alpha', {}).get('total_calls', '?')}")
print(f"   Beta calls: {data.get('beta', {}).get('total_calls', '?')}")
lb = data.get("loadBalancer", {})
if lb:
    print(f"   LB Alpha health: {lb.get('alpha_health', '?')}")
    print(f"   LB Beta health: {lb.get('beta_health', '?')}")

print()
print("DONE!")
