"""
📈 CryptoQuant Studio — Auto-Discovery Pipeline
================================================
اكتشاف تلقائي لكل المقاييس المتاحة من CryptoQuant لـ 4 أصول مجانية:
BTC, ETH, XRP, All Stablecoins (ERC20)

الوحدات:
    config     — ثوابت، مسارات، إعدادات
    discovery  — اكتشاف تلقائي للأصول والفئات والمقاييس
    registry   — إدارة السجل المحلي (cache + TTL)
    fetcher    — جلب البيانات عبر DrissionPage (page crawl 90+ يوم)
    pipeline   — خط أنابيب متكامل: اكتشاف → جلب → حفظ
"""

from crawler.cryptoquant.config import (
    TARGET_ASSETS,
    ASSET_JSON_MAP,
    BASE_URL,
    SITE_URL,
)

__all__ = [
    "TARGET_ASSETS",
    "ASSET_JSON_MAP",
    "BASE_URL",
    "SITE_URL",
]
