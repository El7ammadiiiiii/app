#!/usr/bin/env python3
"""Check ALPHA balance response format."""
import hashlib, time, urllib.request, json
from email.utils import parsedate_to_datetime

key = 'gh67j345kl6hj5k432'
base = 'https://api.arkm.com'
offset = 0
try:
    req0 = urllib.request.Request(base + '/chains', headers={
        'Accept': 'application/json', 'User-Agent': 'M',
        'Referer': 'https://intel.arkm.com/', 'Origin': 'https://intel.arkm.com'
    })
    urllib.request.urlopen(req0, timeout=10)
except Exception as e:
    sd = e.headers.get('Date', '')
    if sd:
        offset = parsedate_to_datetime(sd).timestamp() - time.time()

path = '/balances/address/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
ts = str(int(time.time() + offset))
inner = hashlib.sha256(f'{path}:{ts}:{key}'.encode()).hexdigest()
outer = hashlib.sha256(f'{key}:{inner}'.encode()).hexdigest()
req = urllib.request.Request(f'{base}{path}', headers={
    'Accept': 'application/json', 'User-Agent': 'M',
    'Referer': 'https://intel.arkm.com/', 'Origin': 'https://intel.arkm.com',
    'X-Timestamp': ts, 'X-Payload': outer
})
with urllib.request.urlopen(req, timeout=30) as r:
    data = json.loads(r.read().decode())
    print("totalBalance:", data.get('totalBalance'))
    print("totalBalance24hAgo:", data.get('totalBalance24hAgo'))
    bals = data.get('balances', [])
    print(f"balances count: {len(bals)}")
    if bals:
        print(f"First balance keys: {list(bals[0].keys())}")
        for b in bals[:5]:
            chain = b.get('chain', '?')
            sym = b.get('symbol', b.get('token', {}).get('symbol', '?'))
            usd = b.get('balance', b.get('usd', 0))
            print(f"  chain={chain} sym={sym} usd={usd}")
        print(f"\nFirst balance raw:")
        print(json.dumps(bals[0], indent=2)[:500])
