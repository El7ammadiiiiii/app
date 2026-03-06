"""
🔄 محلل صفحة صفقات DEX — Etherscan /dex Parser
==================================================
يستخرج: صفقات DEX الأخيرة (Buy/Sell/Swap) مع الأسعار والأحجام
"""

import re
from typing import List
from bs4 import BeautifulSoup
from loguru import logger

from ..models import DexTrade
from ..utils import parse_number, clean_text


def parse_dex(soup: BeautifulSoup) -> dict:
    """
    تحليل صفحة /dex.
    
    Returns:
        dict مع مفتاح: recent_dex_trades (List[DexTrade])
    """
    result = {"recent_dex_trades": []}
    
    try:
        trades = _extract_dex_table(soup)
        result["recent_dex_trades"] = trades
        
        if trades:
            logger.info(f"✅ تم استخراج {len(trades)} صفقة DEX")
            
    except Exception as e:
        logger.error(f"❌ خطأ في تحليل /dex: {e}")
    
    return result


def _extract_dex_table(soup: BeautifulSoup) -> List[DexTrade]:
    """استخراج جدول صفقات DEX"""
    trades = []
    
    table = soup.find("table")
    if not table:
        logger.warning("⚠️ لم يتم العثور على جدول DEX")
        return trades
    
    rows = table.find_all("tr")
    
    for row in rows:
        cells = row.find_all("td")
        if len(cells) < 3:
            continue
        
        try:
            trade = DexTrade()
            row_text = clean_text(row.get_text())
            
            # البلوك
            block_link = row.find("a", href=re.compile(r'/block/\d+'))
            if block_link:
                m = re.search(r'/block/(\d+)', block_link.get("href", ""))
                if m:
                    trade.block = int(m.group(1))
            
            # نوع العملية: Buy / Sell / Swap
            for action_type in ["Buy", "Sell", "Swap"]:
                if action_type.lower() in row_text.lower():
                    trade.action = action_type
                    break
            
            # البحث عن التوكنات والمبالغ
            token_links = row.find_all("a", href=re.compile(r'/token/'))
            if len(token_links) >= 2:
                trade.token_in = clean_text(token_links[0].get_text())
                trade.token_out = clean_text(token_links[1].get_text())
            elif len(token_links) == 1:
                trade.token_in = clean_text(token_links[0].get_text())
            
            # القيمة بالدولار
            usd_match = re.search(r'\$\s*([\d,]+(?:\.\d+)?)', row_text)
            if usd_match:
                trade.value_usd = parse_number(usd_match.group(1))
            
            # الوقت
            time_match = re.search(r'(\d+\s*(?:sec|min|hr)s?\s*ago)', row_text, re.IGNORECASE)
            if time_match:
                trade.timestamp = time_match.group(1)
            
            # DEX
            for dex_name in ["Uniswap", "SushiSwap", "PancakeSwap", "1inch", "Curve", "Balancer"]:
                if dex_name.lower() in row_text.lower():
                    trade.dex = dex_name
                    break
            
            if trade.action or trade.token_in:
                trades.append(trade)
                
        except Exception as e:
            logger.debug(f"⚠️ خطأ في صفقة DEX: {e}")
            continue
    
    return trades
