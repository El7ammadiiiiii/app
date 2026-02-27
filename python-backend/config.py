"""
⚙️ Configuration for the FastAPI backend
All exchange connection settings and defaults
"""
import os
from dotenv import load_dotenv

load_dotenv()

# ─── Server ───
HOST = os.getenv("FASTAPI_HOST", "0.0.0.0")
PORT = int(os.getenv("FASTAPI_PORT", "8000"))
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3001,http://localhost:3002").split(",")

# ─── Binance (PRIMARY) ───
BINANCE_API_KEY = os.getenv("BINANCE_API_KEY", "")
BINANCE_API_SECRET = os.getenv("BINANCE_API_SECRET", "")
BINANCE_WS_URL = "wss://stream.binance.com:9443/ws/"
BINANCE_REST_URL = "https://api.binance.com"

# ─── Bybit ───
BYBIT_WS_URL = "wss://stream.bybit.com/v5/public/spot"
BYBIT_REST_URL = "https://api.bybit.com"

# ─── OKX ───
OKX_WS_URL = "wss://ws.okx.com:8443/ws/v5/public"
OKX_REST_URL = "https://www.okx.com"

# ─── Coinbase ───
COINBASE_WS_URL = "wss://advanced-trade-ws.coinbase.com"
COINBASE_REST_URL = "https://api.coinbase.com"

# ─── Gate.io ───
GATEIO_WS_URL = "wss://api.gateio.ws/ws/v4/"
GATEIO_REST_URL = "https://api.gateio.ws/api/v4"

# ─── Bitfinex ───
BITFINEX_WS_URL = "wss://api-pub.bitfinex.com/ws/2"
BITFINEX_REST_URL = "https://api-pub.bitfinex.com/v2"

# ─── Defaults ───
DEFAULT_EXCHANGE = "binance"
DEFAULT_TIMEFRAME = "1h"
DEFAULT_LIMIT = 500
TOP_COINS_COUNT = 50

# ─── Cache TTLs (seconds) ───
OHLCV_CACHE_TTL = 60
TICKER_CACHE_TTL = 10
TOP_COINS_CACHE_TTL = 300
RSI_HEATMAP_CACHE_TTL = 30
MACD_HEATMAP_CACHE_TTL = 30

# ─── Exchange list for REST (File 1) ───
REST_EXCHANGES = [
    "binance", "bybit", "okx", "coinbase", "kraken",
    "kucoin", "mexc", "gateio", "bitget", "htx",
    "cryptocom", "bingx", "bitfinex", "gemini", "bitstamp"
]

# ─── Exchange list for WS (File 2) ───
WS_EXCHANGES = [
    "binance", "bybit", "okx", "coinbase", "gateio", "bitfinex"
]

# ─── Cryptofeed exchanges (File 3) ───
AGGREGATOR_EXCHANGES = [
    "BINANCE", "BYBIT", "OKX", "COINBASE", "KRAKEN",
    "KUCOIN", "GATEIO", "BITGET", "HTX", "BITFINEX",
    "GEMINI", "BITSTAMP", "MEXC", "BINGX", "PHEMEX",
]

# ─── Top symbols for scanning ───
TOP_SYMBOLS = [
    "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT",
    "DOGEUSDT", "ADAUSDT", "AVAXUSDT", "DOTUSDT", "TRXUSDT",
    "LINKUSDT", "MATICUSDT", "SHIBUSDT", "LTCUSDT", "BCHUSDT",
    "NEARUSDT", "UNIUSDT", "APTUSDT", "OPUSDT", "ARBUSDT",
    "FILUSDT", "ATOMUSDT", "IMXUSDT", "GRTUSDT", "INJUSDT",
    "STXUSDT", "RENDERUSDT", "FETUSDT", "SUIUSDT", "SEIUSDT",
    "TIAUSDT", "JUPUSDT", "WIFUSDT", "PEPEUSDT", "FLOKIUSDT",
    "RUNEUSDT", "AAVEUSDT", "MKRUSDT", "SNXUSDT", "LDOUSDT",
    "ENAUSDT", "PENDLEUSDT", "EIGENUSDT", "ETHENAUSDT", "ONDOUSDT",
    "WLDUSDT", "KASUSDT", "THETAUSDT", "ALGOUSDT", "VETUSDT",
]
