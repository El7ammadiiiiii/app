"""
🌐 محلل HTML الاحتياطي لعائلة Blockscout
==========================================
يُستخدم عندما يفشل API v2 أو لا يتوفر.
يستخرج البيانات من صفحات HTML لمواقع Blockscout.

الصفحات:
- / (الرئيسية): إحصائيات عامة
- /tokens (التوكنات): قائمة التوكنات
- /accounts (الحسابات): أكبر المحافظ
- /blocks (البلوكات): بلوكات حديثة
"""

import re
from typing import Optional, Dict, Any
from bs4 import BeautifulSoup
from loguru import logger

from ..models import (
    NetworkBasics, TransactionMetrics, TokenMetrics, TokenInfo,
    WalletMetrics, AccountInfo, NetworkHealth, BlockInfo,
)
from ..utils import parse_number, parse_int, clean_text


def parse_blockscout_homepage(soup: BeautifulSoup, chain_symbol: str = "") -> dict:
    """
    تحليل الصفحة الرئيسية لموقع Blockscout.
    بنية مختلفة عن Etherscan — تعتمد على data-test attributes و divs.
    """
    result = {
        "network": NetworkBasics(),
        "transactions": TransactionMetrics(),
        "tokens": TokenMetrics(),
        "health": NetworkHealth(),
    }

    try:
        text = soup.get_text(" ", strip=True)

        # ═══ إجمالي البلوكات ═══
        m = re.search(r'(?:Total\s*blocks?|Blocks?)[:\s]*(?:#\s*)?([\d,]+)', text, re.IGNORECASE)
        if m:
            result["network"].total_blocks = parse_int(m.group(1))

        # ═══ متوسط وقت البلوك ═══
        m = re.search(r'(?:Average\s*block\s*time|Block\s*time)[:\s]*([\d.]+)\s*s', text, re.IGNORECASE)
        if m:
            result["network"].avg_block_time_seconds = parse_number(m.group(1))

        # ═══ إجمالي المعاملات ═══
        m = re.search(r'(?:Total\s*transactions?|Transactions?)[:\s]*([\d,]+\.?\d*)\s*([TBMK])?', text, re.IGNORECASE)
        if m:
            val = m.group(1)
            if m.group(2):
                val += m.group(2)
            result["network"].total_transactions = parse_int(val)

        # ═══ عدد المحافظ ═══
        m = re.search(r'(?:Total\s*)?(?:Wallet|Address)\s*(?:addresses?)?[:\s]*([\d,]+\.?\d*)\s*([TBMK])?', text, re.IGNORECASE)
        if m:
            val = m.group(1)
            if m.group(2):
                val += m.group(2)
            result["network"].total_addresses = parse_int(val)

        # ═══ الغاز ═══
        m = re.search(r'Gas\s*(?:tracker|price)?[:\s]*([\d.]+)\s*Gwei', text, re.IGNORECASE)
        if m:
            result["transactions"].gas_price_avg = parse_number(m.group(1))

        # ═══ السعر ═══
        m = re.search(r'\$\s*([\d,]+\.?\d*)', text)
        if m:
            price = parse_number(m.group(1))
            if price and price < 1_000_000:
                result["tokens"].native_price_usd = price

        # ═══ القيمة السوقية ═══
        m = re.search(r'Market\s*[Cc]ap[:\s]*\$?\s*([\d,.]+)\s*([TBMK])?', text, re.IGNORECASE)
        if m:
            val = m.group(1)
            if m.group(2):
                val += m.group(2)
            result["tokens"].native_market_cap = parse_number(val)

        # ═══ TPS ═══
        m = re.search(r'([\d.]+)\s*(?:TPS|tx/s|tps)', text, re.IGNORECASE)
        if m:
            result["network"].tps = parse_number(m.group(1))

    except Exception as e:
        logger.error(f"❌ خطأ في تحليل صفحة Blockscout الرئيسية: {e}")

    return result


def parse_blockscout_tokens(soup: BeautifulSoup) -> dict:
    """تحليل صفحة /tokens لموقع Blockscout"""
    result = {"tokens": TokenMetrics()}

    try:
        # البحث عن جدول التوكنات
        rows = soup.find_all("tr")
        tokens = []
        
        for i, row in enumerate(rows[:60]):
            cells = row.find_all("td")
            if len(cells) < 2:
                continue

            # استخراج الاسم والرمز من الروابط
            link = row.find("a", href=re.compile(r'/token/'))
            if not link:
                continue

            name_text = clean_text(link.get_text())
            address_match = re.search(r'/token/(0x[a-fA-F0-9]+)', link.get("href", ""))
            address = address_match.group(1) if address_match else ""

            # فصل الاسم والرمز
            name_parts = re.match(r'(.+?)\s*\(([^)]+)\)', name_text)
            name = name_parts.group(1).strip() if name_parts else name_text
            symbol = name_parts.group(2).strip() if name_parts else ""

            # حاملين
            holders = None
            for cell in cells:
                cell_text = clean_text(cell.get_text())
                h_match = re.search(r'([\d,]+)\s*(?:holders?|addresses?)', cell_text, re.IGNORECASE)
                if h_match:
                    holders = parse_int(h_match.group(1))

            token = TokenInfo(
                rank=len(tokens) + 1,
                name=name,
                symbol=symbol,
                address=address,
                holders=holders,
            )
            tokens.append(token)

        result["tokens"].top_tokens = tokens[:50]
        result["tokens"].total_token_contracts = len(tokens)

        if tokens:
            logger.info(f"✅ HTML: تم استخراج {len(tokens)} توكن")

    except Exception as e:
        logger.error(f"❌ خطأ تحليل tokens HTML: {e}")

    return result


def parse_blockscout_accounts(soup: BeautifulSoup, chain_symbol: str = "") -> dict:
    """تحليل صفحة /accounts لموقع Blockscout"""
    result = {"wallets": WalletMetrics()}

    try:
        rows = soup.find_all("tr")
        accounts = []

        for row in rows[:60]:
            cells = row.find_all("td")
            if len(cells) < 2:
                continue

            # العنوان
            link = row.find("a", href=re.compile(r'/address/'))
            if not link:
                continue

            address_match = re.search(r'/address/(0x[a-fA-F0-9]+)', link.get("href", ""))
            address = address_match.group(1) if address_match else ""
            label = ""

            # التسمية (إذا وجدت)
            name_span = link.find("span") or link
            label_text = clean_text(name_span.get_text())
            if label_text and not label_text.startswith("0x"):
                label = label_text

            # الرصيد
            balance = None
            for cell in cells:
                cell_text = clean_text(cell.get_text())
                # البحث عن أرقام كبيرة (الأرصدة)
                b_match = re.search(r'([\d,]+\.?\d*)\s*' + re.escape(chain_symbol), cell_text)
                if not b_match:
                    b_match = re.search(r'([\d,]+\.?\d{2,})', cell_text)
                if b_match and balance is None:
                    balance = parse_number(b_match.group(1))

            acc = AccountInfo(
                rank=len(accounts) + 1,
                address=address,
                label=label,
                balance=balance,
            )
            accounts.append(acc)

        result["wallets"].top_accounts = accounts[:50]

        if accounts:
            logger.info(f"✅ HTML: تم استخراج {len(accounts)} حساب")

    except Exception as e:
        logger.error(f"❌ خطأ تحليل accounts HTML: {e}")

    return result


def parse_blockscout_blocks(soup: BeautifulSoup) -> dict:
    """تحليل صفحة /blocks لموقع Blockscout"""
    result = {"blocks": []}

    try:
        rows = soup.find_all("tr")
        blocks = []

        for row in rows[:30]:
            cells = row.find_all("td")
            if len(cells) < 2:
                continue

            # رقم البلوك
            link = row.find("a", href=re.compile(r'/block/'))
            if not link:
                continue

            block_match = re.search(r'/block/(\d+)', link.get("href", ""))
            if not block_match:
                continue

            block_num = int(block_match.group(1))

            # عدد المعاملات
            txn_count = 0
            for cell in cells:
                ct = clean_text(cell.get_text())
                m = re.search(r'(\d+)\s*(?:txn|transaction|tx)', ct, re.IGNORECASE)
                if m:
                    txn_count = int(m.group(1))

            block = BlockInfo(
                number=block_num,
                txn_count=txn_count,
            )
            blocks.append(block)

        result["blocks"] = blocks[:25]

        if blocks:
            logger.info(f"✅ HTML: تم استخراج {len(blocks)} بلوك")

    except Exception as e:
        logger.error(f"❌ خطأ تحليل blocks HTML: {e}")

    return result
