"""
📋 CryptoQuant Studio — Registry Manager
==========================================
إدارة سجل المقاييس المكتشفة مع نظام Cache + TTL.

الوظائف الرئيسية:
    - is_registry_fresh(symbol) → هل السجل صالح؟
    - get_all_metric_ids(symbol) → كل IDs المقاييس
    - get_metrics_by_category(symbol) → مقاييس مرتبة حسب الفئة
    - get_category_names(symbol) → أسماء الفئات
    - get_metric_info(symbol, metric_id) → معلومات مقياس محدد
"""

import json
import os
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Tuple
from pathlib import Path
from loguru import logger

from crawler.cryptoquant.config import (
    REGISTRY_DIR, REGISTRY_TTL_HOURS, TARGET_ASSETS,
    CATEGORY_CHART_TYPE, MetricType,
)


class RegistryManager:
    """مدير سجل المقاييس — يقرأ ملفات السجل المحلية ويوفر واجهة استعلام"""

    def __init__(self):
        self._cache: Dict[str, dict] = {}

    # ─── TTL & Freshness ──────────────────────────────────

    def _registry_path(self, symbol: str) -> Path:
        return REGISTRY_DIR / f"cryptoquant_{symbol}.json"

    def is_registry_fresh(self, symbol: str) -> bool:
        """هل السجل لا يزال صالحاً (ضمن TTL)؟"""
        path = self._registry_path(symbol)
        if not path.exists():
            return False

        reg = self._load_registry(symbol)
        if not reg:
            return False

        discovered_at = reg.get("discovered_at", "")
        if not discovered_at:
            return False

        try:
            disc_time = datetime.fromisoformat(discovered_at.replace("Z", "+00:00"))
            age = datetime.now(timezone.utc) - disc_time
            return age < timedelta(hours=REGISTRY_TTL_HOURS)
        except (ValueError, TypeError):
            return False

    def _load_registry(self, symbol: str) -> Optional[dict]:
        """تحميل سجل أصل (مع cache في الذاكرة)"""
        if symbol in self._cache:
            return self._cache[symbol]

        path = self._registry_path(symbol)
        if not path.exists():
            logger.warning(f"⚠️ سجل {symbol} غير موجود")
            return None

        try:
            with open(path, "r", encoding="utf-8") as f:
                reg = json.load(f)
            self._cache[symbol] = reg
            return reg
        except Exception as e:
            logger.error(f"❌ خطأ قراءة سجل {symbol}: {e}")
            return None

    def invalidate_cache(self, symbol: Optional[str] = None):
        """إبطال cache الذاكرة"""
        if symbol:
            self._cache.pop(symbol, None)
        else:
            self._cache.clear()

    # ─── استعلامات ──────────────────────────────────────────

    def get_all_metric_ids(self, symbol: str) -> List[str]:
        """كل IDs المقاييس المجانية لأصل"""
        reg = self._load_registry(symbol)
        if not reg:
            return []

        ids = []
        for cat_data in reg.get("categories", {}).values():
            for metric in cat_data.get("metrics", []):
                mid = metric.get("id", "")
                if mid:
                    ids.append(mid)
        return ids

    def get_metrics_by_category(self, symbol: str) -> Dict[str, List[dict]]:
        """مقاييس مرتبة حسب الفئة"""
        reg = self._load_registry(symbol)
        if not reg:
            return {}

        result = {}
        for cat_slug, cat_data in reg.get("categories", {}).items():
            metrics = cat_data.get("metrics", [])
            if metrics:
                result[cat_slug] = metrics
        return result

    def get_category_names(self, symbol: str) -> Dict[str, str]:
        """أسماء الفئات {slug: name}"""
        reg = self._load_registry(symbol)
        if not reg:
            return {}

        return {
            slug: cat.get("name", slug)
            for slug, cat in reg.get("categories", {}).items()
        }

    def get_category_list(self, symbol: str) -> List[dict]:
        """قائمة الفئات مع إحصاءات"""
        reg = self._load_registry(symbol)
        if not reg:
            return []

        cats = []
        for slug, cat in reg.get("categories", {}).items():
            cats.append({
                "slug": slug,
                "name": cat.get("name", slug),
                "free_count": cat.get("free_count", len(cat.get("metrics", []))),
                "total_count": cat.get("total_count", len(cat.get("metrics", []))),
                "chart_type": CATEGORY_CHART_TYPE.get(slug, MetricType.LINE),
            })
        return cats

    def get_metric_info(self, symbol: str, metric_id: str) -> Optional[dict]:
        """معلومات مقياس محدد"""
        reg = self._load_registry(symbol)
        if not reg:
            return None

        for cat_data in reg.get("categories", {}).values():
            for metric in cat_data.get("metrics", []):
                if metric.get("id") == metric_id:
                    return metric
        return None

    def get_metric_by_key(self, symbol: str, metric_key: str) -> Optional[dict]:
        """بحث عن مقياس بالاسم أو الـ slug"""
        reg = self._load_registry(symbol)
        if not reg:
            return None

        key_lower = metric_key.lower()
        for cat_data in reg.get("categories", {}).values():
            for metric in cat_data.get("metrics", []):
                if (metric.get("slug", "").lower() == key_lower or
                    metric.get("name", "").lower() == key_lower):
                    return metric
        return None

    def get_flat_metrics(self, symbol: str) -> List[dict]:
        """قائمة مسطحة لكل المقاييس مع فئتها"""
        reg = self._load_registry(symbol)
        if not reg:
            return []

        flat = []
        for cat_slug, cat_data in reg.get("categories", {}).items():
            cat_name = cat_data.get("name", cat_slug)
            chart_type = CATEGORY_CHART_TYPE.get(cat_slug, MetricType.LINE)
            for metric in cat_data.get("metrics", []):
                flat.append({
                    **metric,
                    "category_slug": cat_slug,
                    "category_name": cat_name,
                    "preferred_chart_type": chart_type,
                })
        return flat

    # ─── إحصاءات ──────────────────────────────────────────

    def get_summary(self) -> Dict[str, dict]:
        """ملخص كل الأصول المسجلة"""
        summary = {}
        for symbol in TARGET_ASSETS:
            reg = self._load_registry(symbol)
            if reg:
                summary[symbol] = {
                    "name": reg.get("name", symbol),
                    "asset_id": reg.get("asset_id", ""),
                    "categories": reg.get("total_categories", 0),
                    "free_metrics": reg.get("total_free_metrics", 0),
                    "discovered_at": reg.get("discovered_at", ""),
                    "is_fresh": self.is_registry_fresh(symbol),
                }
            else:
                summary[symbol] = {
                    "name": symbol,
                    "asset_id": "",
                    "categories": 0,
                    "free_metrics": 0,
                    "discovered_at": "",
                    "is_fresh": False,
                }
        return summary

    def get_stale_assets(self) -> List[str]:
        """الأصول التي تحتاج تحديث"""
        return [s for s in TARGET_ASSETS if not self.is_registry_fresh(s)]

    def get_total_metrics_count(self) -> Tuple[int, int]:
        """(total_free, total_categories) عبر كل الأصول"""
        total_free = 0
        total_cats = 0
        for symbol in TARGET_ASSETS:
            reg = self._load_registry(symbol)
            if reg:
                total_free += reg.get("total_free_metrics", 0)
                total_cats += reg.get("total_categories", 0)
        return total_free, total_cats


# ══════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    manager = RegistryManager()
    summary = manager.get_summary()

    print("\n📋 ملخص سجلات CryptoQuant Studio:")
    print("=" * 50)
    for sym, info in summary.items():
        status = "✅ صالح" if info["is_fresh"] else "⛔ منتهي/غير موجود"
        print(f"  {sym}: {info['free_metrics']} مقياس مجاني في {info['categories']} فئة — {status}")

    total_m, total_c = manager.get_total_metrics_count()
    print(f"\n  المجموع: {total_m} مقياس مجاني في {total_c} فئة")

    stale = manager.get_stale_assets()
    if stale:
        print(f"\n  ⚠️ يحتاج تحديث: {stale}")
