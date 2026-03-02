#!/usr/bin/env python3
"""Test Gateway methods directly (no HTTP)."""
import asyncio
import traceback
import json

from providers.ccways_gateway import CCWaysGateway

ADDR = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"

async def test():
    gw = CCWaysGateway()
    
    print("=" * 60)
    print("1. chains()")
    print("=" * 60)
    try:
        r = await gw.chains()
        print(f"   success: {r.get('success')}")
        ch = r.get("chains", [])
        print(f"   count: {len(ch)}")
        if ch:
            for c in ch[:3]:
                print(f"   - {c.get('id')}: {c.get('name')}")
    except Exception:
        traceback.print_exc()

    await asyncio.sleep(1)

    print()
    print("=" * 60)
    print("2. intel()")
    print("=" * 60)
    try:
        r = await gw.intel(ADDR)
        print(f"   success: {r.get('success')}")
        ent = r.get("entity", {})
        print(f"   label: {ent.get('label')}")
        print(f"   type: {ent.get('type')}")
        print(f"   tags: {ent.get('tags')}")
    except Exception:
        traceback.print_exc()

    await asyncio.sleep(1)

    print()
    print("=" * 60)
    print("3. expand()")
    print("=" * 60)
    try:
        r = await gw.expand(ADDR, "root-vitalik", direction="both", limit=10)
        print(f"   success: {r.get('success')}")
        print(f"   provider: {r.get('provider')}")
        nodes = r.get("nodes", [])
        edges = r.get("edges", [])
        print(f"   nodes: {len(nodes)}")
        print(f"   edges: {len(edges)}")
        for n in nodes[:5]:
            uv = n.get("totalValueUSD", 0)
            print(f"   - {n.get('label','?'):<30s} ${uv:>12,.0f}  txs={n.get('txCount',0)}")
    except Exception:
        traceback.print_exc()

    await asyncio.sleep(1)

    print()
    print("=" * 60)
    print("4. balance()")
    print("=" * 60)
    try:
        r = await gw.balance(ADDR)
        print(f"   success: {r.get('success')}")
        print(f"   provider: {r.get('provider')}")
        print(f"   totalUSD: ${r.get('totalUSD', 0):,.2f}")
        cb = r.get("chainBalances", {})
        print(f"   chains: {len(cb)}")
        for cid, info in sorted(cb.items(), key=lambda x: -(x[1].get('usd',0) if isinstance(x[1],dict) else 0))[:5]:
            usd = info.get("usd", 0) if isinstance(info, dict) else 0
            print(f"   - {cid}: ${usd:,.2f}")
    except Exception:
        traceback.print_exc()

    await gw.close()

asyncio.run(test())
