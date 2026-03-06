"""
🪙 محلل صفحة التوكنات — Etherscan /tokens Parser
====================================================
يستخرج: قائمة التوكنات مع السعر، حجم التداول، القيمة السوقية، عدد الحاملين
"""

import re
from typing import List
from bs4 import BeautifulSoup
from loguru import logger

from ..models import TokenInfo, TokenMetrics
from ..utils import parse_number, parse_int, clean_text


def parse_tokens(soup: BeautifulSoup) -> dict:
    """
    تحليل صفحة /tokens.
    
    Returns:
        dict مع مفتاح: tokens (TokenMetrics)
    """
    result = {"tokens": TokenMetrics()}
    
    try:
        tokens = _extract_token_table(soup)
        result["tokens"].top_tokens = tokens
        
        if tokens:
            logger.info(f"✅ تم استخراج {len(tokens)} توكن")
        
    except Exception as e:
        logger.error(f"❌ خطأ في تحليل /tokens: {e}")
    
    return result


def _extract_token_table(soup: BeautifulSoup) -> List[TokenInfo]:
    """استخراج جدول التوكنات"""
    tokens = []
    
    table = soup.find("table")
    if not table:
        logger.warning("⚠️ لم يتم العثور على جدول التوكنات")
        return tokens
    
    rows = table.find_all("tr")
    
    for i, row in enumerate(rows):
        cells = row.find_all(["td"])
        if len(cells) < 3:
            continue
        
        try:
            token = TokenInfo()
            token.rank = i
            
            # استخراج اسم التوكن والرمز
            name_link = row.find("a", href=re.compile(r'/token/0x'))
            if name_link:
                # استخراج العنوان
                href = name_link.get("href", "")
                m = re.search(r'/token/(0x[a-fA-F0-9]+)', href)
                if m:
                    token.address = m.group(1)
                
                # الاسم والرمز
                full_text = clean_text(name_link.get_text())
                # "Tether USD (USDT)" أو "USDT Tether USD"
                name_match = re.match(r'(.+?)\s*\((\w+)\)', full_text)
                if name_match:
                    token.name = name_match.group(1).strip()
                    token.symbol = name_match.group(2).strip()
                else:
                    # البحث عن الرمز بشكل منفصل
                    token.name = full_text
                    symbol_span = row.find("span", class_=re.compile(r"text-muted|small"))
                    if symbol_span:
                        token.symbol = clean_text(symbol_span.get_text()).strip("()")
            
            # استخراج البيانات من الخلايا
            for cell in cells:
                cell_text = clean_text(cell.get_text())
                
                # السعر: "$0.9994" أو "$644.20"
                if cell_text.startswith("$") and token.price_usd is None:
                    price_match = re.match(r'\$\s*([\d,]+\.?\d*)', cell_text)
                    if price_match:
                        token.price_usd = parse_number(price_match.group(1))
                    
                    # تغير %
                    pct_match = re.search(r'([+-]?\d+\.?\d*)\s*%', cell_text)
                    if pct_match:
                        token.price_change_pct = float(pct_match.group(1))
                
                # الحاملين: "12,321,212"
                holders_match = re.search(r'([\d,]+)\s*(?:holders?)?', cell_text)
                if holders_match and "holder" in cell_text.lower():
                    token.holders = parse_int(holders_match.group(1))
                
                # القيمة السوقية أو الحجم (أرقام كبيرة بعلامة $)
                big_val = re.match(r'\$\s*([\d,]+(?:\.\d+)?(?:\s*[TBMK])?)', cell_text)
                if big_val:
                    val = parse_number(big_val.group(1))
                    if val:
                        if val > 1e9 and token.market_cap is None:
                            # من المرجح أنها قيمة سوقية
                            token.market_cap = val
                        elif token.volume_24h is None and val != token.market_cap:
                            token.volume_24h = val
            
            # التأكد من أن هناك بيانات مفيدة
            if token.name or token.address:
                tokens.append(token)
                
        except Exception as e:
            logger.debug(f"⚠️ خطأ في صف التوكن {i}: {e}")
            continue
    
    return tokens
