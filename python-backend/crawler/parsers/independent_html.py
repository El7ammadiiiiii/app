"""
🕸️ محللات HTML للمواقع المستقلة — Independent HTML Parsers
═══════════════════════════════════════════════════════════════
تحليل صفحات HTML للمواقع التي لا توفر API عام.

المواقع المدعومة:
- XRPScan (xrpscan.com)
- TON (tonscan.org)
- Stellar (stellarchain.io)
- Mina (minaexplorer.com)
- Nervos (explorer.nervos.org)
- Wax (waxblock.io)
- ViewBlock (viewblock.io) — Zilliqa, Arweave
- EOS (bloks.io)
- NEO (neotube.io)
- والمزيد...

كل هذه المواقع SSR — أي أن البيانات موجودة في HTML مباشرة.
"""

import re
from typing import Any, Dict, List, Optional

from bs4 import BeautifulSoup
from loguru import logger

from ..models import (
    NetworkBasics,
    TransactionMetrics,
    TokenInfo,
    TokenMetrics,
    AccountInfo,
    WalletMetrics,
    BlockInfo,
    NetworkHealth,
)


# ═══════════════════════════════════════════════════════════════════
# 🔧 أنماط ودوال مشتركة
# ═══════════════════════════════════════════════════════════════════

# أنماط لاستخراج الأرقام من النص
NUM_PATTERNS = [
    # 1,234,567,890 أو 1.234.567 (فواصل/نقاط كمجموعات آلاف)
    re.compile(r'([\d,]+(?:\.\d+)?)\s*(M|B|K|T|m|b|k|t)?'),
]


def _extract_number(text: str) -> Optional[float]:
    """استخراج رقم من نص — يتعامل مع K, M, B, T"""
    if not text:
        return None
    text = text.strip().replace("$", "").replace("€", "").replace("¥", "")
    text = text.replace("\xa0", " ").replace("\u202f", " ")

    # محاولة 1: أرقام مع لواحق
    m = re.search(r'([\d,]+(?:\.\d+)?)\s*(T|B|M|K|t|b|m|k)?', text)
    if m:
        num_str = m.group(1).replace(",", "")
        try:
            num = float(num_str)
        except ValueError:
            return None

        suffix = (m.group(2) or "").upper()
        multipliers = {"K": 1e3, "M": 1e6, "B": 1e9, "T": 1e12}
        num *= multipliers.get(suffix, 1)
        return num

    return None


def _extract_int(text: str) -> Optional[int]:
    """استخراج عدد صحيح"""
    n = _extract_number(text)
    return int(n) if n is not None else None


def _extract_float(text: str) -> Optional[float]:
    """استخراج عدد عشري"""
    return _extract_number(text)


def _extract_price(text: str) -> Optional[float]:
    """استخراج سعر من نص مثل $4.62 أو 0.00123 USD"""
    if not text:
        return None
    m = re.search(r'\$?([\d,]+\.?\d*)', text.replace(",", ""))
    if m:
        try:
            return float(m.group(1))
        except ValueError:
            return None
    return None


def _extract_percentage(text: str) -> Optional[float]:
    """استخراج نسبة مئوية من نص"""
    if not text:
        return None
    m = re.search(r'([+-]?[\d.]+)\s*%', text)
    if m:
        try:
            return float(m.group(1))
        except ValueError:
            return None
    return None


def _find_by_label(soup: BeautifulSoup, labels: List[str]) -> Optional[str]:
    """
    البحث عن قيمة مرتبطة بتسمية معينة.
    يبحث في العناصر التي تحتوي على أحد الأسماء المحددة
    ثم يأخذ القيمة من العنصر المجاور أو الحاوي.
    """
    for label in labels:
        # طريقة 1: بحث في نص العناصر
        for el in soup.find_all(string=re.compile(label, re.IGNORECASE)):
            parent = el.parent
            if not parent:
                continue

            # القيمة في العنصر المجاور (sibling)
            next_el = parent.find_next_sibling()
            if next_el and next_el.get_text(strip=True):
                return next_el.get_text(strip=True)

            # القيمة في العنصر الأب (parent container)
            container = parent.parent
            if container:
                texts = [
                    t.strip()
                    for t in container.get_text(" | ", strip=True).split("|")
                    if t.strip() and label.lower() not in t.lower()
                ]
                if texts:
                    return texts[0]

        # طريقة 2: بحث في th → td
        for th in soup.find_all("th"):
            if label.lower() in th.get_text(strip=True).lower():
                td = th.find_next_sibling("td")
                if td:
                    return td.get_text(strip=True)

        # طريقة 3: بحث في dt → dd
        for dt in soup.find_all("dt"):
            if label.lower() in dt.get_text(strip=True).lower():
                dd = dt.find_next_sibling("dd")
                if dd:
                    return dd.get_text(strip=True)

    return None


# ═══════════════════════════════════════════════════════════════════
# 📄 محلل عام للصفحة الرئيسية — Generic Homepage Parser
# ═══════════════════════════════════════════════════════════════════


def parse_generic_homepage(soup: BeautifulSoup, symbol: str = "") -> dict:
    """
    محلل عام يحاول استخراج أي بيانات متاحة من صفحة رئيسية.
    يعمل مع أي موقع SSR — يبحث عن أنماط شائعة.
    """
    result = {}
    try:
        net = NetworkBasics()
        tokens = TokenMetrics()
        wallets = WalletMetrics()
        health = NetworkHealth()

        full_text = soup.get_text(" ", strip=True)

        # ── Transactions ──
        val = _find_by_label(soup, [
            "Transactions", "Total Transactions", "Total Txns",
            "Txn Count", "Total Txs",
        ])
        if val:
            net.total_transactions = _extract_int(val)

        # ── Blocks ──
        val = _find_by_label(soup, [
            "Blocks", "Block Height", "Total Blocks",
            "Height", "Latest Block",
        ])
        if val:
            net.total_blocks = _extract_int(val)

        # ── Addresses / Accounts ──
        val = _find_by_label(soup, [
            "Addresses", "Accounts", "Total Addresses",
            "Total Accounts", "Wallet",
        ])
        if val:
            net.total_addresses = _extract_int(val)

        # ── TPS ──
        val = _find_by_label(soup, [
            "TPS", "Transactions Per Second",
        ])
        if val:
            net.tps = _extract_float(val)

        # ── Block Time ──
        val = _find_by_label(soup, [
            "Block Time", "Average Block", "Avg Block",
        ])
        if val:
            net.avg_block_time_seconds = _extract_float(val)

        # ── Price ──
        val = _find_by_label(soup, [
            "Price", f"{symbol} Price", "Current Price",
        ])
        if val:
            tokens.native_price_usd = _extract_price(val)

        # ── Market Cap ──
        val = _find_by_label(soup, [
            "Market Cap", "Marketcap", "Market Capitalization",
        ])
        if val:
            tokens.native_market_cap = _extract_number(val)

        # ── Supply ──
        val = _find_by_label(soup, [
            "Total Supply", "Supply", "Circulating",
            "Circulating Supply",
        ])
        if val:
            wallets.total_supply = _extract_number(val)

        # ── Nodes ──
        val = _find_by_label(soup, [
            "Nodes", "Validators", "Active Validators",
            "Total Nodes",
        ])
        if val:
            health.total_nodes = _extract_int(val)

        # ── Staking ──
        val = _find_by_label(soup, [
            "Staked", "Staking", "Total Staked",
        ])
        if val:
            staked = _extract_number(val)
            if staked:
                wallets.supply_details["staked"] = staked

        result["network"] = net
        result["tokens"] = tokens
        result["wallets"] = wallets
        result["health"] = health

    except Exception as e:
        logger.error(f"❌ خطأ تحليل الصفحة العامة: {e}")

    return result


# ═══════════════════════════════════════════════════════════════════
# 📊 محللات متخصصة لكل موقع
# ═══════════════════════════════════════════════════════════════════


def parse_xrpscan_homepage(soup: BeautifulSoup) -> dict:
    """
    تحليل xrpscan.com — XRP Ledger
    البيانات المتوقعة: Transactions, Ledgers, Accounts, TPS, Price
    """
    result = {}
    try:
        net = NetworkBasics()
        tokens = TokenMetrics()

        # XRPScan يعرض الإحصائيات في cards
        cards = soup.find_all("div", class_=re.compile(r"card|stat|metric", re.I))

        for card in cards:
            text = card.get_text(" ", strip=True)

            if re.search(r"transaction", text, re.I):
                net.total_transactions = _extract_int(text)
            elif re.search(r"ledger|block", text, re.I):
                net.total_blocks = _extract_int(text)
            elif re.search(r"account|address", text, re.I):
                net.total_addresses = _extract_int(text)
            elif re.search(r"tps|per second", text, re.I):
                net.tps = _extract_float(text)

        # سعر XRP عادة في header
        price_el = soup.find(string=re.compile(r'\$[\d.]+', re.I))
        if price_el:
            tokens.native_price_usd = _extract_price(price_el)

        result["network"] = net
        result["tokens"] = tokens

    except Exception as e:
        logger.error(f"❌ خطأ XRPScan: {e}")

    return result


def parse_tonscan_homepage(soup: BeautifulSoup) -> dict:
    """
    تحليل tonscan.org — TON Blockchain
    """
    result = {}
    try:
        net = NetworkBasics()
        tokens = TokenMetrics()

        # TONScan يعرض الإحصائيات في عناصر مختلفة
        stat_sections = soup.find_all(
            ["div", "span", "p"],
            class_=re.compile(r"stat|info|metric|summary|value", re.I)
        )

        for el in stat_sections:
            text = el.get_text(" ", strip=True)
            if not text or len(text) > 200:
                continue

            label_el = el.find_previous_sibling() or el.parent
            if label_el:
                label = label_el.get_text(strip=True).lower()
            else:
                label = text.lower()

            if "transaction" in label:
                net.total_transactions = _extract_int(text)
            elif "block" in label or "height" in label:
                net.total_blocks = _extract_int(text)
            elif "account" in label or "wallet" in label or "address" in label:
                net.total_addresses = _extract_int(text)
            elif "validator" in label or "node" in label:
                pass  # مسبقاً

        # fallback: محاول عام
        generic = parse_generic_homepage(soup, "TON")
        if generic.get("network"):
            gn = generic["network"]
            net.total_addresses = net.total_addresses or gn.total_addresses
            net.total_transactions = net.total_transactions or gn.total_transactions
            net.total_blocks = net.total_blocks or gn.total_blocks

        result["network"] = net
        result["tokens"] = tokens

    except Exception as e:
        logger.error(f"❌ خطأ TONScan: {e}")

    return result


def parse_stellarchain_homepage(soup: BeautifulSoup) -> dict:
    """تحليل stellarchain.io — Stellar"""
    return parse_generic_homepage(soup, "XLM")


def parse_mina_homepage(soup: BeautifulSoup) -> dict:
    """تحليل minaexplorer.com — Mina Protocol"""
    return parse_generic_homepage(soup, "MINA")


def parse_nervos_homepage(soup: BeautifulSoup) -> dict:
    """تحليل explorer.nervos.org — Nervos CKB"""
    return parse_generic_homepage(soup, "CKB")


def parse_wax_homepage(soup: BeautifulSoup) -> dict:
    """تحليل waxblock.io — Wax"""
    return parse_generic_homepage(soup, "WAXP")


def parse_viewblock_homepage(soup: BeautifulSoup, symbol: str = "ZIL") -> dict:
    """
    تحليل viewblock.io/zilliqa أو viewblock.io/arweave
    ViewBlock لديه تصميم موحد للعديد من السلاسل.
    """
    result = {}
    try:
        net = NetworkBasics()
        tokens = TokenMetrics()

        # ViewBlock يستخدم divs مع data attributes أو classes
        # البيانات عادة في شبكة (grid) من العناصر
        stat_els = soup.find_all(
            ["div", "span"],
            class_=re.compile(r"ds-|stat|metric|info-value|hash-tag", re.I)
        )

        for el in stat_els:
            text = el.get_text(" ", strip=True)
            if not text or len(text) > 150:
                continue

            # ابحث عن التسمية
            parent = el.parent
            if not parent:
                continue
            parent_text = parent.get_text(" ", strip=True).lower()

            if "transaction" in parent_text or "txn" in parent_text:
                val = _extract_int(text)
                if val:
                    net.total_transactions = val
            elif "block" in parent_text or "height" in parent_text:
                val = _extract_int(text)
                if val:
                    net.total_blocks = val
            elif "address" in parent_text or "account" in parent_text:
                val = _extract_int(text)
                if val:
                    net.total_addresses = val
            elif "price" in parent_text:
                val = _extract_price(text)
                if val:
                    tokens.native_price_usd = val

        # fallback
        generic = parse_generic_homepage(soup, symbol)
        if generic.get("network"):
            gn = generic["network"]
            net.total_addresses = net.total_addresses or gn.total_addresses
            net.total_transactions = net.total_transactions or gn.total_transactions
            net.total_blocks = net.total_blocks or gn.total_blocks
        if generic.get("tokens"):
            gt = generic["tokens"]
            tokens.native_price_usd = tokens.native_price_usd or gt.native_price_usd
            tokens.native_market_cap = tokens.native_market_cap or gt.native_market_cap

        result["network"] = net
        result["tokens"] = tokens

    except Exception as e:
        logger.error(f"❌ خطأ ViewBlock: {e}")

    return result


def parse_bloks_homepage(soup: BeautifulSoup) -> dict:
    """تحليل bloks.io — EOS"""
    return parse_generic_homepage(soup, "EOS")


def parse_neo_homepage(soup: BeautifulSoup) -> dict:
    """تحليل neotube.io — NEO"""
    return parse_generic_homepage(soup, "NEO")


def parse_waves_homepage(soup: BeautifulSoup) -> dict:
    """تحليل wavesexplorer.com — Waves"""
    return parse_generic_homepage(soup, "WAVES")


# ═══════════════════════════════════════════════════════════════════
# 🗺️  خريطة المحللات — Parser Map
# ═══════════════════════════════════════════════════════════════════

HTML_PARSER_MAP = {
    "xrp": parse_xrpscan_homepage,
    "ton": parse_tonscan_homepage,
    "stellar": parse_stellarchain_homepage,
    "mina": parse_mina_homepage,
    "nervos": parse_nervos_homepage,
    "wax": parse_wax_homepage,
    "zilliqa": lambda soup: parse_viewblock_homepage(soup, "ZIL"),
    "arweave": lambda soup: parse_viewblock_homepage(soup, "AR"),
    "eos": parse_bloks_homepage,
    "waves": parse_waves_homepage,
    "neo": parse_neo_homepage,
    "ontology": lambda soup: parse_generic_homepage(soup, "ONT"),
    "icon": lambda soup: parse_generic_homepage(soup, "ICX"),
    "flux": lambda soup: parse_generic_homepage(soup, "FLUX"),
    "firo": lambda soup: parse_generic_homepage(soup, "FIRO"),
    "siacoin": lambda soup: parse_generic_homepage(soup, "SC"),
    "opbnb": lambda soup: parse_generic_homepage(soup, "BNB"),
    "cronos": lambda soup: parse_generic_homepage(soup, "CRO"),
}


def get_html_parser(chain_key: str):
    """جلب محلل HTML المناسب للسلسلة"""
    return HTML_PARSER_MAP.get(chain_key, parse_generic_homepage)
