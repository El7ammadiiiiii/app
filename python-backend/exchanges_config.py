"""
📊 exchanges_config.py — Central exchange configuration for scanner providers
Maps exchanges → scanner pages, refresh intervals, and failover chains.

File 1 (CryptoFeed) → 16 exchanges → 4 pages: pattern, fibonacci, divergence, levels
File 2 (WebSocket)  → 15 exchanges → 5 pages: trend, volume, rsi-heatmap, macd-heatmap, favorites
"""

# ═══════════════════════════════════════════════════════════════════════
# 🔷 File 1 — CryptoFeed exchanges (OHLCV-based analysis)
# ═══════════════════════════════════════════════════════════════════════

CRYPTOFEED_EXCHANGES = [
    "BINANCE", "BYBIT", "COINBASE", "CRYPTO_COM",
    "BINANCE_FUTURES", "BINANCE_US", "BITGET", "GATEIO",
    "GEMINI", "KRAKEN", "KUCOIN", "OKX",
    "PHEMEX", "POLONIEX", "PROBIT", "UPBIT",
]

# Class name mapping: CONFIG_NAME → cryptofeed class attribute names (try in order)
CRYPTOFEED_CLASS_MAP = {
    "BINANCE":          ["Binance"],
    "BYBIT":            ["Bybit"],
    "COINBASE":         ["Coinbase"],
    "CRYPTO_COM":       ["CryptoCom", "CryptoDotCom"],
    "BINANCE_FUTURES":  ["BinanceFutures"],
    "BINANCE_US":       ["BinanceUS"],
    "BITGET":           ["Bitget"],
    "GATEIO":           ["Gateio", "GateIO"],
    "GEMINI":           ["Gemini"],
    "KRAKEN":           ["Kraken"],
    "KUCOIN":           ["KuCoin", "Kucoin"],
    "OKX":              ["OKX"],
    "PHEMEX":           ["Phemex"],
    "POLONIEX":         ["Poloniex"],
    "PROBIT":           ["Probit"],
    "UPBIT":            ["Upbit"],
}

# Pages fed by CryptoFeed (File 1)
CRYPTOFEED_PAGES = ["pattern", "fibonacci", "divergence", "levels"]


# ═══════════════════════════════════════════════════════════════════════
# 🔶 File 2 — WebSocket exchanges (real-time / multi-TF scoring)
# ═══════════════════════════════════════════════════════════════════════

WS_SCANNER_EXCHANGES = [
    "binance", "bybit", "okx", "coinbase", "kraken",
    "kucoin", "mexc", "gateio", "bitget", "htx",
    "cryptocom", "bingx", "phemex", "pionex", "bitmart",
]

# Pages fed by WebSocket scanner (File 2)
WS_SCANNER_PAGES = ["trend", "volume", "rsi-heatmap", "macd-heatmap", "favorites"]


# ═══════════════════════════════════════════════════════════════════════
# ⏱ Refresh intervals per timeframe (seconds)
# ═══════════════════════════════════════════════════════════════════════

REFRESH_INTERVALS = {
    "15m": 5 * 60,       # every 5 minutes
    "1h":  15 * 60,      # every 15 minutes
    "4h":  60 * 60,      # every 1 hour
    "1d":  4 * 60 * 60,  # every 4 hours
    "1w":  12 * 60 * 60, # every 12 hours
}

SCANNER_TIMEFRAMES = ["15m", "1h", "4h", "1d", "1w"]


# ═══════════════════════════════════════════════════════════════════════
# 🔄 Failover chain — if primary fails, try next
# ═══════════════════════════════════════════════════════════════════════

FAILOVER_CHAIN = [
    "binance", "bybit", "okx", "coinbase", "kraken",
    "kucoin", "gateio", "bitget",
]


# ═══════════════════════════════════════════════════════════════════════
# 📊 Top symbols to scan (same as config.TOP_SYMBOLS but lowercased)
# ═══════════════════════════════════════════════════════════════════════

SCANNER_SYMBOLS = [
    "BTC-USDT", "ETH-USDT", "BNB-USDT", "SOL-USDT", "XRP-USDT",
    "DOGE-USDT", "ADA-USDT", "AVAX-USDT", "DOT-USDT", "TRX-USDT",
    "LINK-USDT", "MATIC-USDT", "SHIB-USDT", "LTC-USDT", "BCH-USDT",
    "NEAR-USDT", "UNI-USDT", "APT-USDT", "OP-USDT", "ARB-USDT",
    "FIL-USDT", "ATOM-USDT", "IMX-USDT", "GRT-USDT", "INJ-USDT",
    "STX-USDT", "RENDER-USDT", "FET-USDT", "SUI-USDT", "SEI-USDT",
    "TIA-USDT", "JUP-USDT", "WIF-USDT", "PEPE-USDT", "FLOKI-USDT",
    "RUNE-USDT", "AAVE-USDT", "MKR-USDT", "SNX-USDT", "LDO-USDT",
    "ENA-USDT", "PENDLE-USDT", "EIGEN-USDT", "ETHENA-USDT", "ONDO-USDT",
    "WLD-USDT", "KAS-USDT", "THETA-USDT", "ALGO-USDT", "VET-USDT",
]

# Same symbols as USDT pairs (no dash, for REST APIs)
SCANNER_SYMBOLS_COMPACT = [s.replace("-", "") for s in SCANNER_SYMBOLS]


# ═══════════════════════════════════════════════════════════════════════
# 🗺 Firebase path template
# ═══════════════════════════════════════════════════════════════════════

def firebase_path(page_id: str, exchange: str, timeframe: str, symbol: str) -> str:
    """
    Returns Firestore document path:
    scanners_results/{pageId}/exchanges/{exchange}/timeframes/{tf}/data/{symbol}
    """
    return f"scanners_results/{page_id}/exchanges/{exchange}/timeframes/{timeframe}/data/{symbol}"


def firebase_meta_path(page_id: str, exchange: str, timeframe: str) -> str:
    """
    Returns Firestore meta document path:
    scanners_results/{pageId}/exchanges/{exchange}/timeframes/{tf}/_meta
    """
    return f"scanners_results/{page_id}/exchanges/{exchange}/timeframes/{timeframe}"
