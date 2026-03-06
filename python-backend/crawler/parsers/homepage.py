"""
🏠 محلل الصفحة الرئيسية — Etherscan Homepage Parser
=====================================================
يستخرج: سعر ETH, Market Cap, إجمالي المعاملات, TPS, الغاز,
البلوك الأخير, Finalized Block, Pending Txns
"""

import re
from typing import Optional
from bs4 import BeautifulSoup
from loguru import logger

from ..models import NetworkBasics, TransactionMetrics, TokenMetrics, NetworkHealth
from ..utils import parse_number, parse_percentage, clean_text


def parse_homepage(soup: BeautifulSoup, chain_symbol: str = "ETH") -> dict:
    """
    تحليل الصفحة الرئيسية لموقع Etherscan.
    
    Returns:
        dict مع مفاتيح: network, transactions, tokens, health
    """
    result = {
        "network": NetworkBasics(),
        "transactions": TransactionMetrics(),
        "tokens": TokenMetrics(),
        "health": NetworkHealth(),
    }
    
    try:
        text = soup.get_text(" ", strip=True)
        
        # ═══════════════════════════════════════════
        # سعر التوكن الأصلي
        # ═══════════════════════════════════════════
        _extract_price(soup, text, result, chain_symbol)
        
        # ═══════════════════════════════════════════
        # إجمالي المعاملات و TPS
        # ═══════════════════════════════════════════
        _extract_transactions(soup, text, result)
        
        # ═══════════════════════════════════════════
        # الغاز
        # ═══════════════════════════════════════════
        _extract_gas(soup, text, result)
        
        # ═══════════════════════════════════════════
        # البلوك الأخير
        # ═══════════════════════════════════════════
        _extract_block_info(soup, text, result)
        
        # ═══════════════════════════════════════════
        # الشبكة
        # ═══════════════════════════════════════════
        _extract_network_utilization(soup, text, result)
        
    except Exception as e:
        logger.error(f"❌ خطأ في تحليل الصفحة الرئيسية: {e}")
    
    return result


def _extract_price(soup: BeautifulSoup, text: str, result: dict, symbol: str):
    """استخراج سعر التوكن الأصلي"""
    try:
        # البحث عن نمط السعر: $2,097.81 أو $0.2792
        price_patterns = [
            r'(?:ETHER|ETH|MATIC|BNB|' + re.escape(symbol) + r')\s*(?:PRICE|Price)\s*\$?([\d,]+\.?\d*)',
            r'\$\s*([\d,]+\.?\d*)\s*@',
            r'Price[:\s]*\$\s*([\d,]+\.?\d*)',
        ]
        
        # البحث في عنصر السعر
        price_el = soup.find(id="ContentPlaceHolder1_lblEthPrice") or \
                   soup.find(attrs={"data-bs-toggle": "tooltip"}, string=re.compile(r'\$'))
        
        if price_el:
            price_text = price_el.get_text()
            # $2,097.81 @ 0.029714 BTC
            m = re.search(r'\$\s*([\d,]+\.?\d*)', price_text)
            if m:
                result["tokens"].native_price_usd = parse_number(m.group(1))
            # BTC pair
            m_btc = re.search(r'@\s*([\d.]+)\s*BTC', price_text)
            if m_btc:
                result["tokens"].native_price_btc = parse_number(m_btc.group(1))
        else:
            for pattern in price_patterns:
                m = re.search(pattern, text, re.IGNORECASE)
                if m:
                    result["tokens"].native_price_usd = parse_number(m.group(1))
                    break
        
        # Market Cap — حذر من التقاط T/B من كلمات مجاورة
        m = re.search(r'Market\s*Cap[:\s]*\$\s*([\d,.]+)\s*([TBMK])(?:\b|[^a-zA-Z])', text, re.IGNORECASE)
        if m:
            val_str = m.group(1) + m.group(2)
            result["tokens"].native_market_cap = parse_number(val_str)
        else:
            # محاولة بدون suffix
            m = re.search(r'Market\s*Cap[:\s]*\$\s*([\d,.]+)', text, re.IGNORECASE)
            if m:
                result["tokens"].native_market_cap = parse_number(m.group(1))
            
    except Exception as e:
        logger.debug(f"⚠️ خطأ استخراج السعر: {e}")


def _extract_transactions(soup: BeautifulSoup, text: str, result: dict):
    """استخراج إجمالي المعاملات و TPS"""
    try:
        # إجمالي المعاملات: TRANSACTIONS (14s) 3,253.15 M
        patterns_txns = [
            r'TRANSACTIONS.*?([\d,]+\.?\d*)\s*[TBMK]',
            r'Total\s*Transactions[:\s]*([\d,]+\.?\d*)\s*([TBMK])?',
            r'([\d,]+\.?\d*)\s*[TBMK]\s*\(\s*[\d.]+\s*TPS',
        ]
        for p in patterns_txns:
            m = re.search(p, text, re.IGNORECASE)
            if m:
                val = m.group(1)
                # إضافة المضاعف
                suffix_match = re.search(r'([\d,]+\.?\d*)\s*([TBMK])', m.group(0))
                if suffix_match:
                    val = suffix_match.group(1) + suffix_match.group(2)
                result["network"].total_transactions = int(parse_number(val) or 0)
                break
        
        # TPS
        m = re.search(r'([\d.]+)\s*TPS', text, re.IGNORECASE)
        if m:
            result["network"].tps = parse_number(m.group(1))
            
    except Exception as e:
        logger.debug(f"⚠️ خطأ استخراج المعاملات: {e}")


def _extract_gas(soup: BeautifulSoup, text: str, result: dict):
    """استخراج أسعار الغاز"""
    try:
        # MED GAS PRICE 0.055 Gwei
        m = re.search(r'(?:MED|MEDIAN)\s*GAS\s*PRICE\s*([\d.]+)\s*Gwei', text, re.IGNORECASE)
        if m:
            result["transactions"].gas_price_avg = parse_number(m.group(1))
        
        # أنماط بديلة
        m = re.search(r'Gas[:\s]*([\d.]+)\s*Gwei', text, re.IGNORECASE)
        if m and result["transactions"].gas_price_avg is None:
            result["transactions"].gas_price_avg = parse_number(m.group(1))
            
    except Exception as e:
        logger.debug(f"⚠️ خطأ استخراج الغاز: {e}")


def _extract_block_info(soup: BeautifulSoup, text: str, result: dict):
    """استخراج معلومات البلوك"""
    try:
        # LAST FINALIZED BLOCK 24414494
        m = re.search(r'LAST\s*FINALIZED\s*BLOCK\s*([\d,]+)', text, re.IGNORECASE)
        if m:
            result["health"].last_finalized_block = int(parse_number(m.group(1)) or 0)
        
        # LAST SAFE BLOCK
        m = re.search(r'LAST\s*SAFE\s*BLOCK\s*([\d,]+)', text, re.IGNORECASE)
        if m:
            result["health"].last_safe_block = int(parse_number(m.group(1)) or 0)
        
        # آخر بلوك (من أول بلوك في الصفحة)
        block_links = soup.find_all("a", href=re.compile(r'/block/\d+'))
        if block_links:
            for bl in block_links:
                num = re.search(r'/block/(\d+)', bl.get("href", ""))
                if num:
                    block_num = int(num.group(1))
                    if result["network"].total_blocks is None or block_num > result["network"].total_blocks:
                        result["network"].total_blocks = block_num
                    break
                    
    except Exception as e:
        logger.debug(f"⚠️ خطأ استخراج البلوك: {e}")


def _extract_network_utilization(soup: BeautifulSoup, text: str, result: dict):
    """استخراج Network Utilization"""
    try:
        m = re.search(r'Network\s*Utilization[:\s]*([\d.]+)\s*%', text, re.IGNORECASE)
        if m:
            result["transactions"].network_utilization_pct = parse_number(m.group(1))
            
    except Exception as e:
        logger.debug(f"⚠️ خطأ استخراج utilization: {e}")
