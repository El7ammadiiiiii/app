"""
🏃 نقطة الدخول الرئيسية — Crawler Runner
==========================================

الاستخدام:
  # زحف Etherscan
  python -m crawler.runner --chain ethereum
  python -m crawler.runner --chain ethereum bsc --quick

  # زحف Blockscout
  python -m crawler.runner --family blockscout --chain harmony
  python -m crawler.runner --family blockscout --all

  # زحف كل العائلات
  python -m crawler.runner --family all --all

  # تشغيل مستمر
  python -m crawler.runner --auto
  python -m crawler.runner --family blockscout --auto

  # عرض السلاسل
  python -m crawler.runner --list
  python -m crawler.runner --family blockscout --list

  # Phase 5 — بيانات عبر-سلاسل
  python -m crawler.runner --family defillama          # DeFiLlama كامل
  python -m crawler.runner --family stakingrewards     # StakingRewards
"""

import sys
import os
import asyncio
import argparse
import json
import socket
import time
from datetime import datetime, timedelta

# إضافة المسار الجذري
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from loguru import logger

from crawler.config import (
    ETHERSCAN_CHAINS, BLOCKSCOUT_CHAINS, INDEPENDENT_CHAINS,
    SUBSCAN_CHAINS, COSMOS_CHAINS, LEVEL2_CHAINS,
    DEFAULT_SETTINGS,
)
from crawler.etherscan_scraper import EtherscanScraper
from crawler.blockscout_scraper import BlockscoutScraper
from crawler.independent_scraper import IndependentScraper
from crawler.subscan_scraper import SubscanScraper
from crawler.cosmos_scraper import CosmosScraper
from crawler.level2_scraper import Level2Scraper
from crawler.defillama_scraper import DefiLlamaScraper
from crawler.stakingrewards_scraper import StakingRewardsScraper
from crawler.polygon_analytics_scraper import PolygonAnalyticsScraper
from crawler.etf_scraper import ETFScraper
from crawler.tokenterminal_scraper import TokenTerminalScraper, run_tokenterminal_scraper
from crawler.storage import DataStorage
from crawler.scheduler import (
    CrawlerScheduler, run_once, run_once_blockscout, run_once_independent,
    run_once_subscan, run_once_cosmos, run_once_level2,
    run_once_defillama, run_once_stakingrewards,
)


def _has_internet(timeout: float = 3.0) -> bool:
    """تحقق بسيط من اتصال الإنترنت عبر DNS socket."""
    try:
        with socket.create_connection(("1.1.1.1", 53), timeout=timeout):
            return True
    except OSError:
        return False


def _load_stakingrewards_last_success(storage: DataStorage) -> datetime | None:
    """تحميل وقت آخر نجاح من snapshot الحالي إن وُجد."""
    try:
        latest = storage.load_latest("__stakingrewards__")
        if not latest:
            return None
        ts = latest.get("timestamp")
        if not ts:
            return None
        # دعم ISO بصيغة Z أو بدونها
        ts = str(ts).replace("Z", "+00:00")
        return datetime.fromisoformat(ts).replace(tzinfo=None)
    except Exception:
        return None


async def run_stakingrewards_auto(interval_hours: int = 24, check_seconds: int = 60):
    """
    تشغيل تلقائي ذكي لـ StakingRewards:
    - إذا الإنترنت غير متاح: ينتظر
    - إذا الإنترنت متاح + مرّت 24 ساعة من آخر نجاح: ينفّذ تحديثًا فورًا
    - يعيد الفحص دوريًا
    """
    storage = DataStorage()
    interval = timedelta(hours=interval_hours)

    logger.info("═" * 70)
    logger.info("🥩 وضع StakingRewards التلقائي مفعّل")
    logger.info(f"🌐 شرط التشغيل: توفر الإنترنت")
    logger.info(f"⏱️ الفترة: كل {interval_hours} ساعة من آخر نجاح")
    logger.info("═" * 70)

    while True:
        now = datetime.utcnow()
        last_success = _load_stakingrewards_last_success(storage)

        if not _has_internet():
            logger.warning("📴 لا يوجد إنترنت — سأعيد المحاولة لاحقًا...")
            await asyncio.sleep(check_seconds)
            continue

        due = False
        if last_success is None:
            due = True
        else:
            due = (now - last_success) >= interval

        if due:
            try:
                logger.info("🚀 الإنترنت متاح والتحديث مستحق — بدء زحف StakingRewards...")
                sr_result = await run_once_stakingrewards()
                if sr_result:
                    logger.success("✅ تم تحديث StakingRewards بنجاح")
                    try:
                        _show_stakingrewards_results(sr_result)
                    except Exception:
                        pass
                else:
                    logger.error("❌ فشل التحديث (لم يتم إرجاع snapshot)")
                    # retry أسرع عند الفشل
                    await asyncio.sleep(min(check_seconds * 5, 900))
                    continue
            except Exception as e:
                logger.error(f"❌ خطأ أثناء التحديث التلقائي: {e}")
                await asyncio.sleep(min(check_seconds * 5, 900))
                continue
        else:
            next_run = last_success + interval
            remaining = max(0, int((next_run - now).total_seconds()))
            logger.info(f"⏳ غير مستحق بعد — التحديث القادم خلال ~{remaining // 60} دقيقة")

        await asyncio.sleep(check_seconds)


def list_chains(family: str = "etherscan"):
    """عرض السلاسل المتوفرة"""
    families = {}
    if family in ("etherscan", "all"):
        families["Etherscan"] = ETHERSCAN_CHAINS
    if family in ("blockscout", "all"):
        families["Blockscout"] = BLOCKSCOUT_CHAINS
    if family in ("independent", "all"):
        families["Independent"] = INDEPENDENT_CHAINS
    if family in ("subscan", "all"):
        families["Subscan"] = SUBSCAN_CHAINS
    if family in ("cosmos", "all"):
        families["Cosmos"] = COSMOS_CHAINS
    if family in ("level2", "all"):
        families["Level2"] = LEVEL2_CHAINS

    for fam_name, chains in families.items():
        print(f"\n{'═' * 70}")
        print(f"  🕷️ زاحف عائلة {fam_name} — السلاسل المتوفرة ({len(chains)})")
        print(f"{'═' * 70}")
        print(f"  {'#':<4} {'المفتاح':<18} {'الاسم':<20} {'الرمز':<8} {'الموقع'}")
        print(f"  {'─' * 66}")

        for i, (key, chain) in enumerate(chains.items(), 1):
            status = "✅" if chain.enabled else "❌"
            print(f"  {status} {i:<3} {key:<18} {chain.name:<20} {chain.symbol:<8} {chain.base_url}")

        print(f"{'═' * 70}")
    print()

    # Phase 5 — Cross-chain aggregators
    if family in ("defillama", "all"):
        print(f"\n{'═' * 70}")
        print(f"  🦙 DeFiLlama — بيانات DeFi عبر كل السلاسل (8 نقاط API)")
        print(f"{'═' * 70}")
        endpoints = [
            ("chains_tvl",    "TVL لـ 430+ سلسلة",        "api.llama.fi/v2/chains"),
            ("protocols",     "7000+ بروتوكول DeFi",      "api.llama.fi/protocols"),
            ("dex_volumes",   "أحجام DEX اليومية",        "api.llama.fi/overview/dexs"),
            ("fees",          "الرسوم والإيرادات",        "api.llama.fi/overview/fees"),
            ("yield_pools",   "19000+ مسبح عوائد/APY",    "yields.llama.fi/pools"),
            ("stablecoins",   "333 عملة مستقرة",          "stablecoins.llama.fi/stablecoins"),
            ("bridges",       "89 جسر بين السلاسل",       "bridges.llama.fi/bridges"),
            ("open_interest", "Perps OI",                  "api.llama.fi/overview/open-interest"),
        ]
        for i, (key, desc, url) in enumerate(endpoints, 1):
            print(f"  ✅ {i:<3} {key:<18} {desc:<25} {url}")
        print(f"{'═' * 70}")

    if family in ("stakingrewards", "all"):
        print(f"\n{'═' * 70}")
        print(f"  🥩 StakingRewards — بيانات ستاكينغ عبر 19+ أصل")
        print(f"{'═' * 70}")
        assets_list = [
            "ETH", "SOL", "HYPE", "TRX", "SUI", "ADA", "BTC", "AVAX",
            "DOT", "CRO", "APT", "NEAR", "ATOM", "IP", "MATIC", "SEI",
            "XTZ", "MON", "INJ",
        ]
        print(f"  الأصول: {', '.join(assets_list)}")
        print(f"  المقاييس: reward_rate, price, staked_tokens, providers")
        print(f"  المصدر: RSC payload (HTML) — بدون API key")
        print(f"{'═' * 70}")

    print()


def show_results(results: dict):
    """عرض ملخص النتائج"""
    print(f"\n{'═' * 70}")
    print(f"  📊 نتائج الزحف — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'═' * 70}")
    
    for key, snapshot in results.items():
        # ── Phase 5: DeFiLlama ──
        if key == "__defillama__":
            _show_defillama_results(snapshot)
            continue

        # ── Phase 5: StakingRewards ──
        if key == "__stakingrewards__":
            _show_stakingrewards_results(snapshot)
            continue

        # ── Phases 1-4: Per-chain snapshots ──
        print(f"\n  🔗 {snapshot.chain_name} ({snapshot.chain_symbol})")
        print(f"  {'─' * 50}")
        
        # الشبكة
        n = snapshot.network
        if n.total_addresses:
            print(f"    📍 إجمالي العناوين:    {n.total_addresses:>15,}")
        if n.active_addresses_daily:
            print(f"    🟢 العناوين النشطة:    {n.active_addresses_daily:>15,}")
        if n.total_transactions:
            print(f"    📝 إجمالي المعاملات:   {n.total_transactions:>15,}")
        if n.tps:
            print(f"    ⚡ TPS:                 {n.tps:>15.1f}")
        if n.new_addresses_daily:
            print(f"    🆕 عناوين جديدة/يوم:  {n.new_addresses_daily:>15,}")
        
        # السوق
        t = snapshot.tokens
        if t.native_price_usd:
            print(f"    💰 السعر:              ${t.native_price_usd:>14,.2f}")
        if t.native_market_cap:
            print(f"    📈 القيمة السوقية:     ${t.native_market_cap:>14,.0f}")
        if t.total_token_contracts:
            print(f"    🪙 عقود التوكنات:      {t.total_token_contracts:>15,}")
        if t.top_tokens:
            print(f"    🔝 أعلى التوكنات:      {len(t.top_tokens)}")
        
        # الغاز
        tx = snapshot.transactions
        if tx.gas_price_avg is not None:
            print(f"    ⛽ الغاز (Avg):         {tx.gas_price_avg:>15} Gwei")
        if tx.avg_tx_fee_usd:
            print(f"    💸 متوسط الرسوم:       ${tx.avg_tx_fee_usd:>14,.4f}")
        if tx.pending_txs:
            print(f"    ⏳ معاملات معلقة:      {tx.pending_txs:>15,}")
        if tx.network_utilization_pct:
            print(f"    📊 استخدام الشبكة:     {tx.network_utilization_pct:>14.1f}%")
        
        # المحافظ
        w = snapshot.wallets
        if w.total_supply:
            print(f"    💎 المعروض الإجمالي:   {w.total_supply:>15,.2f}")
        if w.top_accounts:
            print(f"    👛 أكبر المحافظ:       {len(w.top_accounts)}")
        if w.top10_concentration_pct:
            print(f"    🏦 تركيز أكبر 10:      {w.top10_concentration_pct:>14.2f}%")
        if w.exchange_balances:
            print(f"    🏪 بورصات مكتشفة:      {len(w.exchange_balances)}")
            for ex, bal in list(w.exchange_balances.items())[:5]:
                print(f"       • {ex:<15} {bal:>15,.2f}")
        
        # العقود
        c = snapshot.contracts
        if c.new_contracts_daily:
            print(f"    📜 عقود جديدة/يوم:    {c.new_contracts_daily:>15,}")
        if c.top_gas_guzzlers:
            print(f"    ⛽ Gas Guzzlers:        {len(c.top_gas_guzzlers)}")
        
        # الصحة
        h = snapshot.health
        if h.total_nodes:
            print(f"    🖥️  عُقد الشبكة:        {h.total_nodes:>15,}")
        
        # البلوكات و DEX
        if snapshot.recent_blocks:
            print(f"    🧱 بلوكات حديثة:       {len(snapshot.recent_blocks)}")
        if snapshot.recent_dex_trades:
            print(f"    🔄 صفقات DEX:          {len(snapshot.recent_dex_trades)}")
        
        # حالة الزحف
        print(f"    ⏱️  مدة الزحف:          {snapshot.crawl_duration_seconds:.1f}ث")
        print(f"    ✅ صفحات ناجحة:        {len(snapshot.pages_crawled)}")
        if snapshot.pages_failed:
            print(f"    ❌ صفحات فاشلة:        {snapshot.pages_failed}")
    
    print(f"\n{'═' * 70}\n")


def _show_defillama_results(snapshot):
    """عرض نتائج DeFiLlama"""
    print(f"\n  🦙 DeFiLlama — بيانات DeFi عبر السلاسل")
    print(f"  {'─' * 50}")

    if snapshot.total_defi_tvl:
        print(f"    💰 إجمالي TVL:          ${snapshot.total_defi_tvl:>14,.0f}")
    if snapshot.chains_tvl:
        print(f"    🔗 سلاسل TVL:           {len(snapshot.chains_tvl):>15,}")
        for ch in snapshot.chains_tvl[:5]:
            print(f"       • {ch.name:<15} ${ch.tvl:>14,.0f}" if ch.tvl else "")
    if snapshot.protocols_count:
        print(f"    📋 بروتوكولات:          {snapshot.protocols_count:>15,}")
    if snapshot.top_protocols:
        print(f"    🔝 أعلى البروتوكولات:")
        for p in snapshot.top_protocols[:5]:
            print(f"       • {p.name:<20} ${p.tvl:>14,.0f}" if p.tvl else "")

    if snapshot.dex_total_24h:
        print(f"    🔄 حجم DEX (24h):       ${snapshot.dex_total_24h:>14,.0f}")
    if snapshot.fees_total_24h:
        print(f"    💸 رسوم (24h):           ${snapshot.fees_total_24h:>14,.0f}")
    if snapshot.total_yield_pools:
        print(f"    🌾 مسابح العوائد:       {snapshot.total_yield_pools:>15,}")
    if snapshot.total_stablecoin_mcap:
        print(f"    💵 Stablecoins MCap:    ${snapshot.total_stablecoin_mcap:>14,.0f}")
    if snapshot.bridges_count:
        print(f"    🌉 جسور:                {snapshot.bridges_count:>15,}")
    if snapshot.perps_oi_total:
        print(f"    📊 Perps OI:            ${snapshot.perps_oi_total:>14,.0f}")

    print(f"    ⏱️  مدة الزحف:          {snapshot.crawl_duration_seconds:.1f}ث")
    print(f"    ✅ أقسام ناجحة:        {snapshot.sections_crawled}")
    if snapshot.sections_failed:
        print(f"    ❌ أقسام فاشلة:        {snapshot.sections_failed}")


def _show_stakingrewards_results(snapshot):
    """عرض نتائج StakingRewards"""
    print(f"\n  🥩 StakingRewards — بيانات الستاكينغ")
    print(f"  {'─' * 50}")

    if snapshot.assets_count:
        print(f"    🪙 أصول:                {snapshot.assets_count:>15,}")
    if snapshot.avg_reward_rate:
        print(f"    📈 متوسط المكافآت:     {snapshot.avg_reward_rate:>14.2f}%")
    if snapshot.total_staked_value_usd:
        print(f"    💰 إجمالي المحجوز:     ${snapshot.total_staked_value_usd:>14,.0f}")

    if snapshot.assets:
        print(f"    🔝 أعلى الأصول:")
        # ترتيب حسب reward_rate
        sorted_assets = sorted(
            [a for a in snapshot.assets if a.reward_rate],
            key=lambda x: x.reward_rate or 0,
            reverse=True,
        )
        for a in sorted_assets[:10]:
            price_str = f"${a.price_usd:>10,.2f}" if a.price_usd else "     —     "
            rate_str = f"{a.reward_rate:>6.2f}%" if a.reward_rate else "    —  "
            range_str = ""
            if a.reward_rate_min and a.reward_rate_max:
                range_str = f" ({a.reward_rate_min:.1f}%-{a.reward_rate_max:.1f}%)"
            print(f"       • {a.symbol:<8} {rate_str} {price_str}{range_str}")

    print(f"    ⏱️  مدة الزحف:          {snapshot.crawl_duration_seconds:.1f}ث")
    if snapshot.pages_failed:
        print(f"    ❌ صفحات فاشلة:        {snapshot.pages_failed}")


async def main():
    parser = argparse.ArgumentParser(
        description="🕷️ Smart Blockchain Crawler — 8 Families, 79+ Chains + Cross-Chain",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
أمثلة:
  python -m crawler.runner --chain ethereum                    # Etherscan
  python -m crawler.runner --family blockscout --chain harmony  # Blockscout
  python -m crawler.runner --family blockscout --all            # كل Blockscout
  python -m crawler.runner --family all --all                   # كل السلاسل
  python -m crawler.runner --family defillama                   # DeFiLlama
  python -m crawler.runner --family stakingrewards              # StakingRewards (full crawl + CoinGecko)
  python -m crawler.runner --family stakingrewards-refresh       # Quick CoinGecko price refresh
  python -m crawler.runner --auto                               # تشغيل مستمر
  python -m crawler.runner --list                               # عرض الكل
        """
    )

    parser.add_argument(
        "--family", type=str, default="etherscan",
        choices=[
            "etherscan", "blockscout", "independent", "subscan",
            "cosmos", "level2", "defillama", "stakingrewards",
            "stakingrewards-refresh",
            "polygon-analytics", "etf", "tokenterminal", "all",
        ],
        help="عائلة الزاحف"
    )
    parser.add_argument(
        "--chain", nargs="+",
        help="مفاتيح السلاسل المراد زحفها"
    )
    parser.add_argument(
        "--all", action="store_true",
        help="زحف كل السلاسل المتوفرة"
    )
    parser.add_argument(
        "--auto", action="store_true",
        help="تشغيل مستمر مع جدولة تلقائية"
    )
    parser.add_argument(
        "--quick", action="store_true",
        help="زحف سريع (stats/homepage فقط)"
    )
    parser.add_argument(
        "--list", action="store_true",
        help="عرض السلاسل المتوفرة"
    )
    parser.add_argument(
        "--pages", nargs="+",
        help="صفحات/endpoints محددة للزحف"
    )
    parser.add_argument(
        "--delay", type=float, default=3.0,
        help="تأخير بين الطلبات (ثواني)"
    )
    parser.add_argument(
        "--output", type=str,
        help="مسار حفظ النتائج (JSON)"
    )
    parser.add_argument(
        "--interval-hours", type=int, default=24,
        help="الفاصل الزمني للتحديث التلقائي (ساعات) — يستخدم مع stakingrewards --auto"
    )
    parser.add_argument(
        "--check-seconds", type=int, default=60,
        help="فترة فحص الإنترنت والاستحقاق (ثواني) — يستخدم مع stakingrewards --auto"
    )

    args = parser.parse_args()
    family = args.family

    # عرض السلاسل
    if args.list:
        list_chains(family)
        return

    # ═══ Phase 5+6: العائلات العابرة للسلاسل لا تحتاج --chain أو --all ═══
    is_crosschain = family in ("defillama", "stakingrewards", "stakingrewards-refresh", "polygon-analytics", "etf", "tokenterminal")

    # بدون معاملات → عرض المساعدة
    if not args.chain and not args.all and not args.auto and not is_crosschain:
        parser.print_help()
        print("\n💡 أمثلة سريعة:")
        print("   Etherscan:       python -m crawler.runner --chain ethereum")
        print("   Blockscout:      python -m crawler.runner --family blockscout --chain harmony")
        print("   DeFiLlama:       python -m crawler.runner --family defillama")
        print("   StakingRewards:  python -m crawler.runner --family stakingrewards\n")
        return

    # إعداد التأخير
    settings = DEFAULT_SETTINGS
    settings.default_delay = args.delay

    # ═══════════════════════════════════════════════════════
    # Phase 5: Cross-chain families (لا تحتاج chain keys)
    # ═══════════════════════════════════════════════════════
    if family == "defillama" and not args.auto:
        print(f"\n🦙 بدء زحف DeFiLlama — 8 نقاط API...")
        dl_result = await run_once_defillama(quick=args.quick)
        if dl_result:
            results = {"__defillama__": dl_result}
            show_results(results)
            if args.output:
                with open(args.output, "w", encoding="utf-8") as f:
                    json.dump(dl_result.to_dict(), f, ensure_ascii=False, indent=2, default=str)
                print(f"💾 تم الحفظ في: {args.output}")
        else:
            print("❌ فشل زحف DeFiLlama")
        return

    if family == "stakingrewards" and not args.auto:
        print(f"\n🥩 بدء زحف StakingRewards — بيانات الستاكينغ + CoinGecko + Registry...")
        sr_result = await run_once_stakingrewards()
        if sr_result:
            results = {"__stakingrewards__": sr_result}
            show_results(results)
            if args.output:
                with open(args.output, "w", encoding="utf-8") as f:
                    json.dump(sr_result.to_dict(), f, ensure_ascii=False, indent=2, default=str)
                print(f"💾 تم الحفظ في: {args.output}")
        else:
            print("❌ فشل زحف StakingRewards")
        return

    if family == "stakingrewards-refresh":
        print(f"\n🔄 تحديث سريع — CoinGecko prices/volumes...")
        from crawler.coingecko_refresh import refresh_prices
        success = await refresh_prices()
        if success:
            print("✅ تحديث CoinGecko ناجح")
        else:
            print("❌ فشل التحديث السريع")
        return

    # ═══ Phase 6: Polygon Analytics ═══
    if family == "polygon-analytics" and not args.auto:
        print(f"\n🟣 بدء زحف Polygon Analytics — بيانات تحليلية متخصصة...")
        etherscan_key = os.environ.get("ETHERSCAN_API_KEY", "")
        dune_key = os.environ.get("DUNE_API_KEY", "")
        pa_scraper = PolygonAnalyticsScraper(
            etherscan_api_key=etherscan_key,
            dune_api_key=dune_key,
        )
        storage = DataStorage()
        try:
            if args.quick:
                pa_result = await pa_scraper.quick_crawl()
            else:
                pa_result = await pa_scraper.crawl_all()
            if pa_result:
                storage._write_json(
                    os.path.join(storage.latest_dir, "__polygon_analytics__.json"),
                    pa_result,
                )
                print(f"✅ Polygon Analytics — تم ({pa_result.get('crawl_duration_seconds', 0)}ث)")
                print(f"   أقسام: {pa_result.get('sections_crawled', [])}")
                if args.output:
                    with open(args.output, "w", encoding="utf-8") as f:
                        json.dump(pa_result, f, ensure_ascii=False, indent=2, default=str)
            else:
                print("❌ فشل زحف Polygon Analytics")
        finally:
            await pa_scraper.close()
        return

    # ═══ Phase 7: Token Terminal — Top 200 Holders ═══
    if family == "tokenterminal" and not args.auto:
        print(f"\n👑 بدء زحف Token Terminal — Top 200 Holders...")
        max_p = int(args.delay) if args.quick else 0  # quick mode = use delay as max_projects
        tt_result = await run_tokenterminal_scraper(
            batch_size=50,
            max_projects=5 if args.quick else max_p,
        )
        if tt_result and tt_result.get("success"):
            print(f"✅ Token Terminal — {tt_result['success_count']}/{tt_result['total_projects']} مشروع")
            print(f"   المدة: {tt_result['duration_seconds']}ث")
            if args.output:
                with open(args.output, "w", encoding="utf-8") as f:
                    json.dump(tt_result, f, ensure_ascii=False, indent=2, default=str)
                print(f"💾 تم الحفظ في: {args.output}")
        else:
            print(f"❌ فشل زحف Token Terminal: {tt_result}")
        return

    # ═══ Phase 6: ETF Data ═══
    if family == "etf" and not args.auto:
        print(f"\n₿ بدء زحف ETF Data — Bitcoin & Ethereum ETFs...")
        etf_scraper = ETFScraper()
        storage = DataStorage()
        try:
            if args.quick:
                etf_result = await etf_scraper.quick_crawl()
            else:
                etf_result = await etf_scraper.crawl_all()
            if etf_result:
                storage._write_json(
                    os.path.join(storage.latest_dir, "__etf_data__.json"),
                    etf_result,
                )
                print(f"✅ ETF Data — تم ({etf_result.get('crawl_duration_seconds', 0)}ث)")
                if args.output:
                    with open(args.output, "w", encoding="utf-8") as f:
                        json.dump(etf_result, f, ensure_ascii=False, indent=2, default=str)
            else:
                print("❌ فشل زحف ETF Data")
        finally:
            await etf_scraper.close()
        return

    # ═══════════════════════════════════════════════════════
    # تحديد السلاسل حسب العائلة
    # ═══════════════════════════════════════════════════════
    all_chains = {}
    if family in ("etherscan", "all"):
        all_chains.update(ETHERSCAN_CHAINS)
    if family in ("blockscout", "all"):
        all_chains.update(BLOCKSCOUT_CHAINS)
    if family in ("independent", "all"):
        all_chains.update(INDEPENDENT_CHAINS)
    if family in ("subscan", "all"):
        all_chains.update(SUBSCAN_CHAINS)
    if family in ("cosmos", "all"):
        all_chains.update(COSMOS_CHAINS)
    if family in ("level2", "all"):
        all_chains.update(LEVEL2_CHAINS)

    chain_keys = None
    if args.chain:
        invalid = [k for k in args.chain if k not in all_chains]
        if invalid:
            print(f"❌ سلاسل غير معروفة: {invalid}")
            print(f"💡 استخدم --list لعرض السلاسل المتوفرة")
            return
        chain_keys = args.chain
    elif args.all:
        chain_keys = list(all_chains.keys())

    # الصفحات
    pages = args.pages
    if args.quick:
        if family == "blockscout":
            pages = ["stats"]
        else:
            pages = ["homepage", "charts"]

    # التشغيل المستمر
    if args.auto:
        # StakingRewards له وضع تلقائي مخصص (إنترنت + 24 ساعة من آخر نجاح)
        if family == "stakingrewards":
            await run_stakingrewards_auto(
                interval_hours=max(1, args.interval_hours),
                check_seconds=max(10, args.check_seconds),
            )
            return

        scheduler = CrawlerScheduler(settings, chain_keys, family=family)
        await scheduler.start()
        return

    # ═══════════════════════════════════════════════════════
    # تشغيل مرة واحدة
    # ═══════════════════════════════════════════════════════
    print(f"\n🕷️ بدء الزحف [{family.upper()}]: {chain_keys or 'الكل'}")
    print(f"   الصفحات: {pages or 'الكل'}")
    print(f"   التأخير: {args.delay}ث\n")

    results = {}

    # فصل السلاسل حسب العائلة
    eth_keys = [k for k in (chain_keys or []) if k in ETHERSCAN_CHAINS]
    bs_keys = [k for k in (chain_keys or []) if k in BLOCKSCOUT_CHAINS]
    ind_keys = [k for k in (chain_keys or []) if k in INDEPENDENT_CHAINS]
    sub_keys = [k for k in (chain_keys or []) if k in SUBSCAN_CHAINS]
    cos_keys = [k for k in (chain_keys or []) if k in COSMOS_CHAINS]
    lv2_keys = [k for k in (chain_keys or []) if k in LEVEL2_CHAINS]

    if family == "all" and args.all:
        eth_keys = list(ETHERSCAN_CHAINS.keys())
        bs_keys = list(BLOCKSCOUT_CHAINS.keys())
        ind_keys = list(INDEPENDENT_CHAINS.keys())
        sub_keys = list(SUBSCAN_CHAINS.keys())
        cos_keys = list(COSMOS_CHAINS.keys())
        lv2_keys = list(LEVEL2_CHAINS.keys())
    elif family == "etherscan" and args.all:
        eth_keys = list(ETHERSCAN_CHAINS.keys())
    elif family == "blockscout" and args.all:
        bs_keys = list(BLOCKSCOUT_CHAINS.keys())
    elif family == "independent" and args.all:
        ind_keys = list(INDEPENDENT_CHAINS.keys())
    elif family == "subscan" and args.all:
        sub_keys = list(SUBSCAN_CHAINS.keys())
    elif family == "cosmos" and args.all:
        cos_keys = list(COSMOS_CHAINS.keys())
    elif family == "level2" and args.all:
        lv2_keys = list(LEVEL2_CHAINS.keys())

    # تشغيل Etherscan
    if eth_keys:
        eth_results = await run_once(eth_keys, pages)
        if eth_results:
            results.update(eth_results)

    # تشغيل Blockscout (لا يحتاج pages — يزحف كل النقاط دائماً)
    if bs_keys:
        bs_results = await run_once_blockscout(bs_keys)
        if bs_results:
            results.update(bs_results)

    # تشغيل Independent
    if ind_keys:
        ind_results = await run_once_independent(ind_keys)
        if ind_results:
            results.update(ind_results)

    # تشغيل Subscan
    if sub_keys:
        sub_results = await run_once_subscan(sub_keys)
        if sub_results:
            results.update(sub_results)

    # تشغيل Cosmos
    if cos_keys:
        cos_results = await run_once_cosmos(cos_keys)
        if cos_results:
            results.update(cos_results)

    # تشغيل Level2
    if lv2_keys:
        lv2_results = await run_once_level2(lv2_keys)
        if lv2_results:
            results.update(lv2_results)

    # تشغيل DeFiLlama + StakingRewards عند --family all
    if family == "all":
        dl_result = await run_once_defillama(quick=args.quick)
        if dl_result:
            results["__defillama__"] = dl_result

        sr_result = await run_once_stakingrewards()
        if sr_result:
            results["__stakingrewards__"] = sr_result

    if results:
        show_results(results)

        if args.output:
            combined = {}
            for key, snapshot in results.items():
                combined[key] = snapshot.to_dict()

            with open(args.output, "w", encoding="utf-8") as f:
                json.dump(combined, f, ensure_ascii=False, indent=2, default=str)
            print(f"💾 تم الحفظ في: {args.output}")
    else:
        print("❌ لم يتم جمع أي بيانات")


if __name__ == "__main__":
    asyncio.run(main())
