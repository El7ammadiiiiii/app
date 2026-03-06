"""
💰 محلل صفحة أكبر الحسابات — Etherscan /accounts Parser
=========================================================
يستخرج: أكبر المحافظ، أرصدتها، تصنيفاتها (بورصات، عقود، ...)
"""

import re
from typing import List
from bs4 import BeautifulSoup
from loguru import logger

from ..models import AccountInfo, WalletMetrics
from ..utils import parse_number, clean_text


# كلمات دالة على محافظ البورصات
EXCHANGE_KEYWORDS = [
    "binance", "coinbase", "kraken", "okx", "bybit", "bitfinex",
    "huobi", "htx", "kucoin", "gate.io", "gemini", "crypto.com",
    "upbit", "robinhood", "deribit", "bitstamp", "poloniex",
    "mexc", "bitget", "bingx", "phemex", "lbank",
]

# Well-known exchange addresses (Ethereum mainnet)
KNOWN_EXCHANGE_ADDRESSES = {
    "0xbe0eb53f46cd790cd13851d5eff43d12404d33e8": "Binance 7",
    "0xf977814e90da44bfa03b6295a0616a897441acec": "Binance 8",
    "0x5a52e96bacdabb82fd05763e25335261b270efcb": "Binance 12",
    "0x28c6c06298d514db089934071355e5743bf21d60": "Binance 14",
    "0x21a31ee1afc51d94c2efccaa2092ad1028285549": "Binance 15",
    "0xdfd5293d8e347dfe59e90efd55b2956a1343963d": "Binance 16",
    "0x56eddb7aa87536c09ccc2793473599fd21a8b17f": "Binance 17",
    "0xa7efae728d2936e78bda97dc267687568dd593f3": "OKX",
    "0x6cc5f688a315f3dc28a7781717a9a798a59fda7b": "OKX 2",
    "0x539c7d3c72e14f27c0d5fdf19f4fe80cebf6b8fb": "OKX 3",
    "0xd24400ae8bfebb18ca49be86258a3c749cf46853": "Gemini 4",
    "0x267be1c1d684f78cb4f6a176c4911b741e4ffdc0": "Kraken 4",
    "0x2910543af39aba0cd09dbb2d50200b3e800a63d2": "Kraken 13",
    "0x503828976d22510aad0201ac7ec88293211d23da": "Coinbase 1",
    "0xddfabcdc4d8ffc6d5beaf154f18b778f892a0740": "Coinbase 3",
    "0x3cd751e6b0078be393132286c442345e68ff0aff": "Coinbase 4",
    "0xb5d85cbf7cb3ee0d56b3bb207d5fc4b82f43f511": "Coinbase 5",
    "0xeb2629a2734e272bcc07bda959863f316f4bd4cf": "Coinbase 6",
    "0xff6b1cdfd2d3e37977d7938b7a7083e4c5270da0": "Bitfinex",
    "0x876eabf441b2ee5b5b0554fd502a8e0600950cfa": "Bitfinex 4",
    "0xccd6a9afc4ec6e1ad5e382a8918b02e6feda12b3": "Bitfinex 5",
    "0xdc76cd25977e0a5ae17155770273ad58648900d3": "Huobi",
    "0xab5c66752a9e8167967685f1450532fb96d5d24f": "Huobi 7",
    "0x1db92e2eebc8e0c075a02bea49a2935bcd2dfcf4": "ByBit",
    "0xa270f3ad1a7a82e6a3157f12a900f1e25bc4fbfd": "Gate.io 1",
    "0x0d0707963952f2fba59dd06f2b425ace40b492fe": "Gate.io 2",
}


def parse_accounts(soup: BeautifulSoup, chain_symbol: str = "ETH") -> dict:
    """
    تحليل صفحة /accounts.
    
    Returns:
        dict مع مفتاح: wallets (WalletMetrics)
    """
    result = {"wallets": WalletMetrics()}
    
    try:
        accounts = _extract_account_table(soup, chain_symbol)
        result["wallets"].top_accounts = accounts
        
        # حساب تركيز الملكية لأكبر 10
        if len(accounts) >= 10:
            top10_pct = sum(
                acc.percentage for acc in accounts[:10]
                if acc.percentage is not None
            )
            result["wallets"].top10_concentration_pct = round(top10_pct, 4)
        
        # استخراج أرصدة البورصات
        exchange_balances = {}
        for acc in accounts:
            if acc.is_exchange and acc.label and acc.balance is not None:
                # تجميع أرصدة نفس البورصة
                exchange_name = _get_exchange_name(acc.label)
                if exchange_name:
                    if exchange_name not in exchange_balances:
                        exchange_balances[exchange_name] = 0.0
                    exchange_balances[exchange_name] += acc.balance
        
        result["wallets"].exchange_balances = exchange_balances
        
        logger.info(f"✅ تم استخراج {len(accounts)} حساب، {len(exchange_balances)} بورصة")
        
    except Exception as e:
        logger.error(f"❌ خطأ في تحليل /accounts: {e}")
    
    return result


def _extract_account_table(soup: BeautifulSoup, chain_symbol: str) -> List[AccountInfo]:
    """استخراج جدول الحسابات"""
    accounts = []
    
    # البحث عن الجدول الرئيسي
    table = soup.find("table")
    if not table:
        # محاولة بديلة
        table = soup.find("div", class_=re.compile(r"table"))
    
    if not table:
        logger.warning("⚠️ لم يتم العثور على جدول الحسابات")
        return accounts
    
    rows = table.find_all("tr")
    
    for i, row in enumerate(rows):
        cells = row.find_all(["td", "th"])
        if len(cells) < 3 or i == 0:  # تخطي الترويسة
            # التحقق من أنها ترويسة
            if cells and cells[0].name == "th":
                continue
            if i == 0:
                continue
        
        try:
            account = AccountInfo()
            account.rank = i
            
            # استخراج العنوان
            addr_link = row.find("a", href=re.compile(r'/address/'))
            if addr_link:
                href = addr_link.get("href", "")
                m = re.search(r'/address/(0x[a-fA-F0-9]+)', href)
                if m:
                    account.address = m.group(1)
            
            # استخراج التصنيف (Label)
            # Etherscan يظهر labels مثل "Binance 7" أو "Beacon Deposit Contract"
            # Look for label in first 2 cells only (name column, not balance cells)
            for cell_idx, cell in enumerate(cells[:3]):
                label_span = cell.find("span", attrs={"data-bs-toggle": "tooltip"})
                if label_span:
                    txt = clean_text(label_span.get("title") or label_span.get_text())
                    # Skip if it looks like a balance (contains ETH/Ether/BNB + numbers)
                    if txt and not re.match(r'^[\d,]+\.?\d*\s*(ETH|Ether|BNB|MATIC)', txt, re.IGNORECASE):
                        account.label = txt
                        break
            if not account.label and addr_link:
                # أحياناً التصنيف يكون في نص الرابط
                link_text = clean_text(addr_link.get_text())
                if not link_text.startswith("0x"):
                    # Also skip balance-like text
                    if not re.match(r'^[\d,]+\.?\d*\s*(ETH|Ether|BNB|MATIC)', link_text, re.IGNORECASE):
                        account.label = link_text
            # Check for label in a separate <a> or text node after address
            if not account.label:
                all_links = row.find_all("a")
                for lnk in all_links:
                    href = lnk.get("href", "")
                    if "/address/" not in href:
                        continue
                    # Look for sibling text that contains a name
                    parent = lnk.parent
                    if parent:
                        for sibling in parent.find_all(["span", "small"]):
                            sib_text = clean_text(sibling.get_text())
                            if sib_text and not sib_text.startswith("0x") and not re.match(r'^[\d,]+\.?\d*\s*(ETH|Ether)', sib_text, re.IGNORECASE):
                                account.label = sib_text
                                break
                    if account.label:
                        break
            
            # استخراج الرصيد
            for cell in cells:
                cell_text = clean_text(cell.get_text())
                
                # الرصيد: "1,996,008.123 ETH" أو "80,535,880 Ether"
                balance_match = re.search(
                    r'([\d,]+(?:\.\d+)?)\s*(?:' + re.escape(chain_symbol) + r'|Ether|BNB|MATIC)',
                    cell_text, re.IGNORECASE
                )
                if balance_match and account.balance is None:
                    account.balance = parse_number(balance_match.group(1))
                
                # النسبة المئوية: "66.73%" أو "1.6540%"
                pct_match = re.search(r'(\d+\.?\d*)\s*%', cell_text)
                if pct_match and account.percentage is None:
                    account.percentage = float(pct_match.group(1))
                
                # عدد المعاملات
                if re.match(r'^[\d,]+$', cell_text.replace(' ', '')):
                    val = parse_number(cell_text)
                    if val and val > 0 and account.balance is not None and val != account.balance:
                        if account.tx_count is None:
                            account.tx_count = int(val)
            
            # تحديد إذا كان عقد ذكي
            if row.find("i", class_=re.compile(r"contract|file")):
                account.is_contract = True
            if "contract" in (account.label or "").lower():
                account.is_contract = True
            
            # تحديد إذا كان بورصة
            account.is_exchange = _is_exchange(account.label, account.address)
            
            # Use known address label as fallback
            if (not account.label or re.match(r'^[\d,]+\.?\d*\s*(ETH|Ether|BNB|MATIC)', account.label or "", re.IGNORECASE)):
                addr_lower = (account.address or "").lower()
                if addr_lower in KNOWN_EXCHANGE_ADDRESSES:
                    account.label = KNOWN_EXCHANGE_ADDRESSES[addr_lower]
                elif account.label and re.match(r'^[\d,]+\.?\d*\s*(ETH|Ether|BNB|MATIC)', account.label, re.IGNORECASE):
                    # Label is a balance string, use address prefix instead
                    account.label = account.address[:12] + "..." if account.address else None
            
            if account.address or account.label:
                accounts.append(account)
                
        except Exception as e:
            logger.debug(f"⚠️ خطأ في صف {i}: {e}")
            continue
    
    return accounts


def _is_exchange(label: str, address: str = None) -> bool:
    """التحقق إذا كان العنوان يخص بورصة"""
    # Check known addresses first
    if address and address.lower() in KNOWN_EXCHANGE_ADDRESSES:
        return True
    if not label:
        return False
    label_lower = label.lower()
    return any(kw in label_lower for kw in EXCHANGE_KEYWORDS)


def _get_exchange_name(label: str) -> str:
    """استخراج اسم البورصة من التصنيف"""
    if not label:
        return ""
    label_lower = label.lower()
    for kw in EXCHANGE_KEYWORDS:
        if kw in label_lower:
            return kw.capitalize()
    return ""
