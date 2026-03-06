"""
⚙️ CryptoQuant Studio — Configuration
=======================================
كل الثوابت والمسارات وإعدادات التشغيل
"""

import os
from pathlib import Path


# ══════════════════════════════════════════════════════════════════
# 🌐 عناوين API
# ══════════════════════════════════════════════════════════════════
BASE_URL = "https://api.cryptoquant.com"
SITE_URL = "https://cryptoquant.com"

# Discovery endpoints
ASSETS_ENDPOINT = f"{BASE_URL}/live/v4/assets"
ASSET_METRICS_ENDPOINT = f"{BASE_URL}/live/v4/assets/{{asset_id}}/ms"
PREVIEW_ENDPOINT = f"{BASE_URL}/live/v4/ms/{{metric_id}}/charts/preview"

# Page URL pattern (for network intercept crawl)
CHART_PAGE_URL = f"{SITE_URL}/asset/{{symbol}}/chart/{{metric_slug}}"


# ══════════════════════════════════════════════════════════════════
# 🎯 الأصول المستهدفة (مجانية)
# ══════════════════════════════════════════════════════════════════
TARGET_ASSETS = ["btc", "eth", "xrp", "usdt(eth)", "usdc"]

# تعيين الأصل → اسم ملف JSON الوجهة
ASSET_JSON_MAP = {
    "btc": "bitcoin.json",
    "eth": "ethereum.json",
    "xrp": "xrp.json",
    "usdt(eth)": "tether_erc20.json",
    "usdc": "usdc_erc20.json",
}

# تعيين الأصل → معلومات أساسية
ASSET_INFO = {
    "btc": {"name": "Bitcoin", "symbol": "BTC", "chain_id": 0},
    "eth": {"name": "Ethereum", "symbol": "ETH", "chain_id": 1},
    "xrp": {"name": "XRP", "symbol": "XRP", "chain_id": 0},
    "usdt(eth)": {"name": "Tether USD (ERC20)", "symbol": "USDT", "chain_id": 1},
    "usdc": {"name": "USD Coin (ERC20)", "symbol": "USDC", "chain_id": 1},
}


# ══════════════════════════════════════════════════════════════════
# 📂 المسارات
# ══════════════════════════════════════════════════════════════════
CRAWLER_ROOT = Path(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = CRAWLER_ROOT / "data" / "latest"
REGISTRY_DIR = CRAWLER_ROOT / "data" / "registry"
STATE_DIR = CRAWLER_ROOT / "data" / "state"
LOG_DIR = CRAWLER_ROOT / "logs"

# إنشاء المجلدات
for d in [DATA_DIR, REGISTRY_DIR, STATE_DIR, LOG_DIR]:
    d.mkdir(parents=True, exist_ok=True)


# ══════════════════════════════════════════════════════════════════
# ⏱️ إعدادات التوقيت
# ══════════════════════════════════════════════════════════════════
REGISTRY_TTL_HOURS = 24       # مدة صلاحية السجل (24 ساعة)
FETCH_STATE_TTL_HOURS = 6     # مدة صلاحية حالة الجلب
DELAY_BETWEEN_METRICS = 3.0   # تأخير بين المقاييس (ثواني)
WARMUP_WAIT = 6               # انتظار تسخين Cloudflare
CHALLENGE_WAIT = 5            # انتظار تحدي Cloudflare
MAX_CHALLENGE_RETRIES = 5     # محاولات تجاوز Cloudflare
PAGE_LOAD_WAIT = 4            # انتظار تحميل الصفحة
NETWORK_INTERCEPT_WAIT = 8    # انتظار اعتراض الشبكة


# ══════════════════════════════════════════════════════════════════
# 🏷️ مفاتيح المصدر في JSON
# ══════════════════════════════════════════════════════════════════
CHARTS_SOURCE_KEY = "cryptoquant_studio_charts"
CATEGORIES_SOURCE_KEY = "cryptoquant_studio_categories"


# ══════════════════════════════════════════════════════════════════
# 🔧 إعدادات المتصفح (DrissionPage)
# ══════════════════════════════════════════════════════════════════
BROWSER_ARGS = [
    "--disable-blink-features=AutomationControlled",
    "--no-first-run",
    "--disable-extensions",
    "--disable-gpu",
    "--no-sandbox",
]

CHROME_PATHS = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe"),
    r"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe",
    os.path.expandvars(r"%LOCALAPPDATA%\BraveSoftware\Brave-Browser\Application\brave.exe"),
]


# ══════════════════════════════════════════════════════════════════
# 📊 أنواع المقاييس
# ══════════════════════════════════════════════════════════════════
class MetricType:
    """أنواع عرض المقاييس"""
    LINE = "line"
    AREA = "area"
    BAR = "bar"
    STACKED = "stacked"
    CANDLE = "candle"
    SCATTER = "scatter"

# تعيين فئة → نوع الرسم المفضل
CATEGORY_CHART_TYPE = {
    "exchange-flows": MetricType.BAR,
    "flow-indicator": MetricType.AREA,
    "market-indicator": MetricType.LINE,
    "network-indicator": MetricType.AREA,
    "miner-flows": MetricType.BAR,
    "derivatives": MetricType.LINE,
    "fund-data": MetricType.BAR,
    "market-data": MetricType.CANDLE,
    "addresses": MetricType.AREA,
    "fees-and-revenue": MetricType.BAR,
    "network-stats": MetricType.LINE,
    "supply": MetricType.STACKED,
    "transactions": MetricType.AREA,
    "inter-entity-flows": MetricType.BAR,
    "research": MetricType.SCATTER,
    "dex-data": MetricType.BAR,
    "dex-indicator": MetricType.LINE,
    "amm-data": MetricType.AREA,
}
