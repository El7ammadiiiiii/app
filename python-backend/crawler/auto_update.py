"""
🔄 تحديث تلقائي موحد — Unified Auto Updater
==============================================
يشغّل كل الزواحف بشكل دوري ومتتابع:

1. زاحف السلاسل (6 عائلات: Etherscan, Blockscout, Independent, Subscan, Cosmos, Level2)
2. زاحف DeFiLlama (TVL, DEX, Fees, Yields, Stablecoins, Bridges)
3. زاحف StakingRewards (19+ أصل)
4. زاحف TokenTerminal (Top 200 Holders)

الجدولة:
- تحديث سريع كل 60 دقيقة (stats أساسية + DeFiLlama)
- تحديث كامل كل 6 ساعات (كل الصفحات + كل الزواحف)
- تنظيف الأرشيف القديم يومياً (3:00 AM)

الاستخدام:
  python -m crawler.auto_update                          # تشغيل مستمر
  python -m crawler.auto_update --once                   # مرة واحدة فقط
  python -m crawler.auto_update --once --quick            # مرة سريعة
  python -m crawler.auto_update --interval 30             # كل 30 دقيقة
  python -m crawler.auto_update --chains-only             # سلاسل فقط
  python -m crawler.auto_update --defillama-only          # DeFiLlama فقط
"""

import sys
import os
import asyncio
import argparse
import signal
from datetime import datetime
from typing import Optional

# إضافة المسار الجذري
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from loguru import logger

from crawler.config import (
    DEFAULT_SETTINGS,
    ETHERSCAN_CHAINS, BLOCKSCOUT_CHAINS, INDEPENDENT_CHAINS,
    SUBSCAN_CHAINS, COSMOS_CHAINS, LEVEL2_CHAINS,
)
from crawler.scheduler import (
    run_once, run_once_blockscout, run_once_independent,
    run_once_subscan, run_once_cosmos, run_once_level2,
    run_once_defillama, run_once_stakingrewards,
)
from crawler.tokenterminal_scraper import run_tokenterminal_scraper
from crawler.storage import DataStorage


# ─── إعداد السجلات ────────────────────────────────────────────
LOG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")
os.makedirs(LOG_DIR, exist_ok=True)

logger.add(
    os.path.join(LOG_DIR, "auto_update_{time:YYYY-MM-DD}.log"),
    rotation="1 day",
    retention="30 days",
    level="INFO",
    encoding="utf-8",
)


class UnifiedAutoUpdater:
    """
    مُحدّث تلقائي موحد — يشغّل كل الزواحف بشكل دوري.
    البيانات تُحفظ في crawler/data/latest/ وتُقرأ مباشرة من webapp.
    """

    def __init__(
        self,
        interval_minutes: int = 60,
        full_interval_hours: int = 6,
        chains_only: bool = False,
        defillama_only: bool = False,
        skip_holders: bool = False,
    ):
        self.interval_minutes = interval_minutes
        self.full_interval_hours = full_interval_hours
        self.chains_only = chains_only
        self.defillama_only = defillama_only
        self.skip_holders = skip_holders
        self.storage = DataStorage(DEFAULT_SETTINGS.data_dir)
        self._running = True
        self._cycle = 0
        self._stats = {
            "total_runs": 0,
            "successful_chains": 0,
            "failed_chains": 0,
            "last_full_update": None,
            "last_quick_update": None,
        }

    def stop(self):
        logger.info("⏹️ جاري الإيقاف...")
        self._running = False

    async def run_once(self, quick: bool = False):
        """تشغيل جميع الزواحف مرة واحدة."""
        start = datetime.now()
        logger.info(f"\n{'═' * 60}")
        logger.info(f"🚀 بدء التحديث {'السريع' if quick else 'الكامل'} — {start.strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info(f"{'═' * 60}")

        results_summary = {}

        # ── 1. زاحف DeFiLlama (أسرع، لا يعتمد على مواقع خارجية كثيرة) ──
        if not self.chains_only:
            results_summary["defillama"] = await self._run_defillama(quick)
            results_summary["stakingrewards"] = await self._run_stakingrewards()

        # ── 2. زواحف السلاسل ──
        if not self.defillama_only:
            results_summary["chains"] = await self._run_all_chains(quick)

        # ── 3. CryptoQuant Studio (Multi-Asset Pipeline) ──
        if not self.chains_only and not self.defillama_only and not quick:
            results_summary["cryptoquant_studio"] = await self._run_cryptoquant_studio()

        # ── 4. زاحف TokenTerminal (Top Holders) ──
        if not self.chains_only and not self.defillama_only and not self.skip_holders and not quick:
            results_summary["tokenterminal"] = await self._run_tokenterminal()

        duration = (datetime.now() - start).total_seconds()
        self._stats["total_runs"] += 1

        logger.info(f"\n{'═' * 60}")
        logger.info(f"✅ اكتمل التحديث — {duration:.0f}ث")
        for key, val in results_summary.items():
            logger.info(f"   {key}: {val}")
        logger.info(f"{'═' * 60}\n")

        return results_summary

    async def run_continuous(self):
        """حلقة تحديث مستمرة."""
        # إشارات الإيقاف
        def handle_signal(sig, frame):
            logger.info(f"\n📛 تم استلام إشارة إيقاف ({sig})")
            self.stop()

        try:
            signal.signal(signal.SIGINT, handle_signal)
            signal.signal(signal.SIGTERM, handle_signal)
        except (OSError, ValueError):
            pass

        families = []
        if not self.defillama_only:
            families.append("Chains(6 families)")
        if not self.chains_only:
            families.append("DeFiLlama")
            families.append("StakingRewards")
        if not self.skip_holders:
            families.append("TokenTerminal")
        families.append("CryptoQuant Studio")

        logger.info(f"{'═' * 60}")
        logger.info(f"🔄 بدء التحديث التلقائي الموحد")
        logger.info(f"   الزواحف: {' + '.join(families)}")
        logger.info(f"   تحديث سريع: كل {self.interval_minutes} دقيقة")
        logger.info(f"   تحديث كامل: كل {self.full_interval_hours} ساعة")
        logger.info(f"{'═' * 60}")

        # تحديث كامل أول مرة
        await self.run_once(quick=False)
        self._stats["last_full_update"] = datetime.now()

        cycles_per_full = (self.full_interval_hours * 60) // self.interval_minutes

        while self._running:
            try:
                self._cycle += 1

                # انتظار
                logger.info(f"😴 انتظار {self.interval_minutes} دقيقة حتى التحديث التالي...")
                for _ in range(self.interval_minutes * 60):
                    if not self._running:
                        break
                    await asyncio.sleep(1)

                if not self._running:
                    break

                # هل حان وقت تحديث كامل؟
                is_full = (self._cycle % cycles_per_full == 0)
                await self.run_once(quick=not is_full)

                if is_full:
                    self._stats["last_full_update"] = datetime.now()
                else:
                    self._stats["last_quick_update"] = datetime.now()

                # تنظيف يومي
                if datetime.now().hour == 3 and datetime.now().minute < self.interval_minutes:
                    self.storage.cleanup_old_history(keep_days=30)
                    logger.info("🧹 تم تنظيف الأرشيف القديم")

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"❗ خطأ في الحلقة: {e}")
                logger.info("🔄 إعادة المحاولة بعد 60 ثانية...")
                await asyncio.sleep(60)

        logger.info("👋 تم إيقاف المُحدّث التلقائي")

    # ─── تشغيل الزواحف الفردية ────────────────────────────────────

    async def _run_defillama(self, quick: bool = False) -> str:
        """تشغيل زاحف DeFiLlama."""
        try:
            logger.info("🦙 زاحف DeFiLlama...")
            result = await run_once_defillama(quick=quick)
            if result:
                tvl = getattr(result, 'total_defi_tvl', None)
                tvl_str = f"${tvl:,.0f}" if tvl else "?"
                return f"✅ TVL={tvl_str}"
            return "❌ لا بيانات"
        except Exception as e:
            logger.error(f"❌ DeFiLlama: {e}")
            return f"❌ {e}"

    async def _run_stakingrewards(self) -> str:
        """تشغيل زاحف StakingRewards."""
        try:
            logger.info("🥩 زاحف StakingRewards...")
            result = await run_once_stakingrewards()
            if result and result.assets:
                return f"✅ {len(result.assets)} أصل"
            return "❌ لا بيانات"
        except Exception as e:
            logger.error(f"❌ StakingRewards: {e}")
            return f"❌ {e}"

    async def _run_all_chains(self, quick: bool = False) -> str:
        """تشغيل كل عائلات زواحف السلاسل."""
        total_ok = 0
        total_fail = 0
        families_done = []

        # Etherscan
        count = await self._run_family(
            "Etherscan", list(ETHERSCAN_CHAINS.keys()),
            run_once, quick
        )
        if count is not None:
            total_ok += count
            families_done.append(f"ETH({count})")

        # Blockscout
        count = await self._run_family(
            "Blockscout", list(BLOCKSCOUT_CHAINS.keys()),
            run_once_blockscout, quick
        )
        if count is not None:
            total_ok += count
            families_done.append(f"BS({count})")

        # Independent
        count = await self._run_family(
            "Independent", list(INDEPENDENT_CHAINS.keys()),
            run_once_independent, quick
        )
        if count is not None:
            total_ok += count
            families_done.append(f"IND({count})")

        # Subscan
        count = await self._run_family(
            "Subscan", list(SUBSCAN_CHAINS.keys()),
            run_once_subscan, quick
        )
        if count is not None:
            total_ok += count
            families_done.append(f"SUB({count})")

        # Cosmos
        count = await self._run_family(
            "Cosmos", list(COSMOS_CHAINS.keys()),
            run_once_cosmos, quick
        )
        if count is not None:
            total_ok += count
            families_done.append(f"COS({count})")

        # Level2
        count = await self._run_family(
            "Level2", list(LEVEL2_CHAINS.keys()),
            run_once_level2, quick
        )
        if count is not None:
            total_ok += count
            families_done.append(f"LV2({count})")

        self._stats["successful_chains"] += total_ok
        return f"✅ {total_ok} سلسلة — {', '.join(families_done)}"

    async def _run_family(self, name: str, keys: list, runner, quick: bool) -> Optional[int]:
        """تشغيل عائلة زاحف واحدة."""
        try:
            mode_str = "سريع" if quick else "كامل"
            logger.info(f"   🔗 [{name}] زحف {len(keys)} سلسلة ({mode_str})...")

            # تمرير وضع Quick لعائلة Etherscan (تدعم pages parameter)
            import inspect
            sig = inspect.signature(runner)
            if quick and "pages" in sig.parameters:
                results = await runner(keys, pages=["homepage", "charts"])
            else:
                results = await runner(keys)

            count = len(results) if results else 0
            logger.info(f"   ✅ [{name}] {count}/{len(keys)} نجح")
            return count
        except Exception as e:
            logger.error(f"   ❌ [{name}] خطأ: {e}")
            return 0

    async def _run_cryptoquant_studio(self) -> str:
        """تشغيل CryptoQuant Studio Pipeline."""
        try:
            logger.info("📈 CryptoQuant Studio Pipeline...")
            from crawler.cryptoquant.pipeline import CryptoQuantPipeline
            pipeline = CryptoQuantPipeline(
                headless=True,
                max_metrics_per_asset=0,
                use_page_crawl=True,
            )
            result = pipeline.run()
            summary = result.get("summary", {})
            total = summary.get("total_charts", 0)
            saved = summary.get("assets_saved", 0)
            return f"✅ {total} شارت لـ {saved} أصل"
        except Exception as e:
            logger.error(f"❌ CryptoQuant Studio: {e}")
            return f"❌ {e}"

    async def _run_tokenterminal(self) -> str:
        """تشغيل زاحف TokenTerminal (Top Holders)."""
        try:
            logger.info("👑 زاحف TokenTerminal (Top 200 Holders)...")
            result = await run_tokenterminal_scraper(batch_size=50, max_projects=0)
            if result and result.get("success"):
                count = result.get("success_count", 0)
                return f"✅ {count} مشروع"
            return f"❌ {result}"
        except Exception as e:
            logger.error(f"❌ TokenTerminal: {e}")
            return f"❌ {e}"


async def main():
    parser = argparse.ArgumentParser(
        description="🔄 مُحدّث تلقائي موحد — يشغّل كل الزواحف بشكل دوري",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--once", action="store_true", help="تشغيل مرة واحدة فقط")
    parser.add_argument("--quick", action="store_true", help="تحديث سريع")
    parser.add_argument("--interval", type=int, default=60, help="فترة التحديث (دقائق)")
    parser.add_argument("--full-interval", type=int, default=6, help="فترة التحديث الكامل (ساعات)")
    parser.add_argument("--chains-only", action="store_true", help="سلاسل فقط")
    parser.add_argument("--defillama-only", action="store_true", help="DeFiLlama فقط")
    parser.add_argument("--skip-holders", action="store_true", help="تخطي TokenTerminal")

    args = parser.parse_args()

    updater = UnifiedAutoUpdater(
        interval_minutes=args.interval,
        full_interval_hours=args.full_interval,
        chains_only=args.chains_only,
        defillama_only=args.defillama_only,
        skip_holders=args.skip_holders,
    )

    if args.once:
        await updater.run_once(quick=args.quick)
    else:
        await updater.run_continuous()


if __name__ == "__main__":
    asyncio.run(main())
