"""
⛽ محلل صفحة متعقب الغاز — Etherscan /gastracker Parser
=========================================================
يستخرج: أسعار الغاز (Low/Avg/High)، تكلفة العمليات،
أكبر 50 عقد استهلاكاً، المعاملات المعلقة، وقت التأكيد
"""

import re
from typing import List, Dict, Any
from bs4 import BeautifulSoup
from loguru import logger

from ..models import TransactionMetrics, GasEstimate, NetworkHealth
from ..utils import parse_number, parse_int, clean_text


def parse_gas_tracker(soup: BeautifulSoup) -> dict:
    """
    تحليل صفحة /gastracker.
    
    Returns:
        dict مع مفاتيح: transactions, gas_estimates, contracts, health
    """
    result = {
        "transactions": TransactionMetrics(),
        "gas_estimates": [],
        "top_gas_guzzlers": [],
        "health": NetworkHealth(),
    }
    
    try:
        text = soup.get_text(" ", strip=True)
        
        # أسعار الغاز: Low / Avg / High
        _extract_gas_prices(soup, text, result)
        
        # تقديرات تكلفة العمليات
        _extract_gas_estimates(soup, text, result)
        
        # أكبر 50 عقد استهلاكاً (Gas Guzzlers)
        _extract_gas_guzzlers(soup, result)
        
        # معاملات معلقة ووقت التأكيد
        _extract_pending_and_confirmation(text, result)
        
        # Network Utilization
        _extract_utilization(text, result)
        
    except Exception as e:
        logger.error(f"❌ خطأ في تحليل /gastracker: {e}")
    
    return result


def _extract_gas_prices(soup: BeautifulSoup, text: str, result: dict):
    """استخراج أسعار الغاز الثلاثة"""
    try:
        # Low: 0.055 Gwei | Avg: 0.055 Gwei | High: 0.056 Gwei
        patterns = {
            "low": r'(?:Low|🐢|Slow)[:\s]*([\d.]+)\s*(?:Gwei|gwei)',
            "avg": r'(?:Avg|Average|🚗|Standard)[:\s]*([\d.]+)\s*(?:Gwei|gwei)',
            "high": r'(?:High|Fast|🚀|Rapid)[:\s]*([\d.]+)\s*(?:Gwei|gwei)',
        }
        
        for key, pattern in patterns.items():
            m = re.search(pattern, text, re.IGNORECASE)
            if m:
                val = parse_number(m.group(1))
                if key == "low":
                    result["transactions"].gas_price_low = val
                elif key == "avg":
                    result["transactions"].gas_price_avg = val
                elif key == "high":
                    result["transactions"].gas_price_high = val
        
        # إذا لم نجد بالأنماط، نبحث عن أي Gwei
        if result["transactions"].gas_price_avg is None:
            gwei_matches = re.findall(r'([\d.]+)\s*Gwei', text, re.IGNORECASE)
            if len(gwei_matches) >= 3:
                result["transactions"].gas_price_low = parse_number(gwei_matches[0])
                result["transactions"].gas_price_avg = parse_number(gwei_matches[1])
                result["transactions"].gas_price_high = parse_number(gwei_matches[2])
            elif len(gwei_matches) == 1:
                result["transactions"].gas_price_avg = parse_number(gwei_matches[0])
                
    except Exception as e:
        logger.debug(f"⚠️ خطأ استخراج أسعار الغاز: {e}")


def _extract_gas_estimates(soup: BeautifulSoup, text: str, result: dict):
    """استخراج تقديرات تكلفة العمليات"""
    try:
        # OpenSea Sale: $0.07 | Uniswap Swap: $0.04 | USDT Transfer: $0.02
        estimate_patterns = [
            (r'(?:Swap|Uniswap)[:\s]*\$\s*([\d.]+)', "Swap"),
            (r'(?:NFT\s*Sale|OpenSea)[:\s]*\$\s*([\d.]+)', "NFT Sale"),
            (r'(?:Transfer|ERC.?20|USDT)[:\s]*\$\s*([\d.]+)', "Token Transfer"),
            (r'(?:Bridge|Bridging)[:\s]*\$\s*([\d.]+)', "Bridge"),
            (r'(?:Borrow|Lending)[:\s]*\$\s*([\d.]+)', "Borrow"),
            (r'(?:ENS\s*Register)[:\s]*\$\s*([\d.]+)', "ENS Register"),
        ]
        
        for pattern, action in estimate_patterns:
            m = re.search(pattern, text, re.IGNORECASE)
            if m:
                result["gas_estimates"].append(GasEstimate(
                    action=action,
                    cost_usd=parse_number(m.group(1)),
                ))
                
    except Exception as e:
        logger.debug(f"⚠️ خطأ استخراج تقديرات الغاز: {e}")


def _extract_gas_guzzlers(soup: BeautifulSoup, result: dict):
    """استخراج أكبر العقود استهلاكاً للغاز"""
    try:
        # البحث عن جدول Gas Guzzlers
        tables = soup.find_all("table")
        
        for table in tables:
            header_text = ""
            prev = table.find_previous(["h2", "h3", "h4", "div"])
            if prev:
                header_text = clean_text(prev.get_text()).lower()
            
            if "guzzler" in header_text or "gas" in header_text:
                rows = table.find_all("tr")
                for row in rows[1:21]:  # أول 20 فقط
                    cells = row.find_all("td")
                    if len(cells) < 2:
                        continue
                    
                    guzzler = {}
                    
                    # العنوان/الاسم
                    addr_link = row.find("a", href=re.compile(r'/address/'))
                    if addr_link:
                        guzzler["name"] = clean_text(addr_link.get_text())
                        href = addr_link.get("href", "")
                        m = re.search(r'/address/(0x[a-fA-F0-9]+)', href)
                        if m:
                            guzzler["address"] = m.group(1)
                    
                    # النسبة المئوية من الغاز
                    for cell in cells:
                        ct = clean_text(cell.get_text())
                        pct = re.search(r'([\d.]+)\s*%', ct)
                        if pct:
                            guzzler["gas_pct"] = float(pct.group(1))
                        
                        # الرسوم بالدولار
                        fee = re.search(r'\$\s*([\d,]+(?:\.\d+)?)', ct)
                        if fee and "fee_usd" not in guzzler:
                            guzzler["fee_usd"] = parse_number(fee.group(1))
                    
                    if guzzler.get("name") or guzzler.get("address"):
                        result["top_gas_guzzlers"].append(guzzler)
        
        if result["top_gas_guzzlers"]:
            logger.debug(f"⛽ تم استخراج {len(result['top_gas_guzzlers'])} Gas Guzzler")
                
    except Exception as e:
        logger.debug(f"⚠️ خطأ استخراج Gas Guzzlers: {e}")


def _extract_pending_and_confirmation(text: str, result: dict):
    """استخراج المعاملات المعلقة ووقت التأكيد"""
    try:
        # Pending: 123,883
        m = re.search(r'(?:Pending\s*(?:Queue|Pool|Txns?|Transactions?))[:\s]*([\d,]+)', text, re.IGNORECASE)
        if m:
            result["transactions"].pending_txs = parse_int(m.group(1))
        
        # Confirmation Time: ~30 secs
        m = re.search(r'(?:~|≈)\s*([\d.]+)\s*(?:sec|ثانية)', text, re.IGNORECASE)
        if m:
            result["health"].confirmation_time_seconds = parse_number(m.group(1))
            
    except Exception as e:
        logger.debug(f"⚠️ خطأ: {e}")


def _extract_utilization(text: str, result: dict):
    """استخراج Network Utilization"""
    try:
        m = re.search(r'(?:Network\s*)?Utilization[:\s]*([\d.]+)\s*%', text, re.IGNORECASE)
        if m:
            result["transactions"].network_utilization_pct = float(m.group(1))
    except Exception as e:
        logger.debug(f"⚠️ خطأ: {e}")
