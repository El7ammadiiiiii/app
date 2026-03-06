"""
💾 نظام تخزين البيانات — Data Storage
========================================
يحفظ لقطات السلاسل كملفات JSON مع أرشيف تاريخي.
البنية:
  crawler/data/
  ├── latest/              ← آخر لقطة لكل سلسلة
  │   ├── ethereum.json
  │   ├── bsc.json
  │   └── ...
  ├── history/             ← أرشيف بالتاريخ
  │   ├── 2026-02-09/
  │   │   ├── ethereum_14-30.json
  │   │   └── ...
  │   └── ...
  └── summary.json         ← ملخص آخر تحديث
"""

import os
import json
from datetime import datetime
from typing import Dict, Optional, Any

from loguru import logger

from .models import ChainSnapshot
from .config import DEFAULT_SETTINGS


class DataStorage:
    """نظام تخزين وأرشفة البيانات"""

    def __init__(self, data_dir: str = None):
        self.data_dir = data_dir or DEFAULT_SETTINGS.data_dir
        self.latest_dir = os.path.join(self.data_dir, "latest")
        self.history_dir = os.path.join(self.data_dir, "history")
        
        # إنشاء المجلدات
        os.makedirs(self.latest_dir, exist_ok=True)
        os.makedirs(self.history_dir, exist_ok=True)

    def save_snapshot(self, chain_key: str, snapshot: ChainSnapshot):
        """حفظ لقطة سلسلة (آخر + أرشيف)"""
        try:
            data = snapshot.to_dict()
            
            # 1. حفظ في latest/
            latest_path = os.path.join(self.latest_dir, f"{chain_key}.json")
            self._write_json(latest_path, data)
            
            # 2. حفظ في history/YYYY-MM-DD/
            now = datetime.now()
            date_dir = os.path.join(
                self.history_dir,
                now.strftime("%Y-%m-%d"),
            )
            os.makedirs(date_dir, exist_ok=True)
            
            history_path = os.path.join(
                date_dir,
                f"{chain_key}_{now.strftime('%H-%M')}.json",
            )
            self._write_json(history_path, data)
            
            logger.info(f"💾 تم حفظ {chain_key}: {latest_path}")
            
        except Exception as e:
            logger.error(f"❌ خطأ حفظ {chain_key}: {e}")

    def save_raw(self, chain_key: str, data: dict):
        """حفظ dict مباشرة بدون .to_dict() — يُستخدم للتحديثات الخفيفة."""
        try:
            latest_path = os.path.join(self.latest_dir, f"{chain_key}.json")
            self._write_json(latest_path, data)
            logger.info(f"💾 تم حفظ (raw) {chain_key}: {latest_path}")
        except Exception as e:
            logger.error(f"❌ خطأ حفظ raw {chain_key}: {e}")

    def save_all(self, results: Dict[str, ChainSnapshot]):
        """حفظ كل النتائج + ملخص"""
        for key, snapshot in results.items():
            self.save_snapshot(key, snapshot)
        
        # حفظ ملخص
        self._save_summary(results)

    def load_latest(self, chain_key: str) -> Optional[Dict[str, Any]]:
        """تحميل آخر لقطة لسلسلة"""
        path = os.path.join(self.latest_dir, f"{chain_key}.json")
        return self._read_json(path)

    def load_all_latest(self) -> Dict[str, Dict[str, Any]]:
        """تحميل آخر لقطات لكل السلاسل"""
        result = {}
        if not os.path.exists(self.latest_dir):
            return result
        
        for filename in os.listdir(self.latest_dir):
            if filename.endswith(".json"):
                key = filename.replace(".json", "")
                data = self._read_json(os.path.join(self.latest_dir, filename))
                if data:
                    result[key] = data
        
        return result

    def _save_summary(self, results: Dict[str, ChainSnapshot]):
        """حفظ ملخص آخر تحديث"""
        summary = {
            "last_update": datetime.now().isoformat(),
            "chains_crawled": len(results),
            "chains": {},
        }
        
        for key, snapshot in results.items():
            summary["chains"][key] = {
                "name": snapshot.chain_name,
                "symbol": snapshot.chain_symbol,
                "pages_ok": len(snapshot.pages_crawled),
                "pages_fail": len(snapshot.pages_failed),
                "duration": snapshot.crawl_duration_seconds,
                "price_usd": snapshot.tokens.native_price_usd,
                "total_txns": snapshot.network.total_transactions,
                "total_addresses": snapshot.network.total_addresses,
            }
        
        summary_path = os.path.join(self.data_dir, "summary.json")
        self._write_json(summary_path, summary)

    def _write_json(self, path: str, data: dict):
        """كتابة JSON مع معالجة الأخطاء"""
        try:
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2, default=str)
        except Exception as e:
            logger.error(f"❌ خطأ كتابة {path}: {e}")

    def _read_json(self, path: str) -> Optional[dict]:
        """قراءة JSON"""
        try:
            if os.path.exists(path):
                with open(path, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"❌ خطأ قراءة {path}: {e}")
        return None

    def cleanup_old_history(self, keep_days: int = 30):
        """حذف الأرشيف القديم"""
        if not os.path.exists(self.history_dir):
            return
        
        import shutil
        now = datetime.now()
        
        for date_folder in os.listdir(self.history_dir):
            folder_path = os.path.join(self.history_dir, date_folder)
            if not os.path.isdir(folder_path):
                continue
            
            try:
                folder_date = datetime.strptime(date_folder, "%Y-%m-%d")
                age = (now - folder_date).days
                if age > keep_days:
                    shutil.rmtree(folder_path)
                    logger.info(f"🗑️ تم حذف أرشيف قديم: {date_folder}")
            except ValueError:
                continue
