"""
📊 محلل صفحة الإحصائيات — Etherscan /charts Parser
=====================================================
أغنى صفحة في Etherscan — تحتوي 20+ مقياس بقيم فعلية.
يستخرج: عناوين، معاملات يومية، عناوين نشطة، رسوم، حرق ETH،
عقود منشورة، توكنات، عُقد الشبكة.
"""

import re
from typing import Optional
from bs4 import BeautifulSoup
from loguru import logger

from ..models import (
    NetworkBasics, TransactionMetrics, TokenMetrics,
    ContractMetrics, NetworkHealth
)
from ..utils import parse_number, parse_int, clean_text


def parse_charts(soup: BeautifulSoup) -> dict:
    """
    تحليل صفحة /charts.
    
    Returns:
        dict مع مفاتيح: network, transactions, tokens, contracts, health
    """
    result = {
        "network": NetworkBasics(),
        "transactions": TransactionMetrics(),
        "tokens": TokenMetrics(),
        "contracts": ContractMetrics(),
        "health": NetworkHealth(),
    }
    
    try:
        text = soup.get_text(" ", strip=True)
        
        # ═══════════════════════════════════════════
        # استخراج Overview Stats (الأرقام في أعلى الصفحة)
        # ═══════════════════════════════════════════
        _extract_overview_stats(text, result)
        
        # ═══════════════════════════════════════════
        # استخراج أسماء الرسوم البيانية وقيمها
        # ═══════════════════════════════════════════
        _extract_chart_metrics(soup, text, result)
        
    except Exception as e:
        logger.error(f"❌ خطأ في تحليل صفحة /charts: {e}")
    
    return result


def _extract_overview_stats(text: str, result: dict):
    """استخراج الإحصائيات العامة من Overview Stats"""

    # ─────────────────────────────────────────────────────────────
    # New (current) Overview Stats format on Etherscan-like sites:
    #   ADDRESSES (TOTAL) … 381,957,257(0.09%)
    #   TRANSACTIONS (TOTAL) … 3,253.24 M (27.8 TPS)
    #   NEW ADDRESSES (24H) … 326,602(3.54%)
    #   TRANSACTIONS (24H) … 2,896,853(19.78%)
    #   TOKENS (TOTAL) … 1,873,195(0.05%)
    #   PENDING TRANSACTIONS (1H) … 123,514(Average)
    #   TOTAL TRANSACTION FEE (24H) … 267.40 ETH(39.73%)
    # We try to parse these first to avoid ambiguous matches.
    # ─────────────────────────────────────────────────────────────

    if result["network"].total_addresses is None:
        m = re.search(r'Addresses\s*\(\s*Total\s*\)\s*[^\d]*([\d,]+(?:\.\d+)?)\s*([TBMK])?', text, re.IGNORECASE)
        if m:
            val = m.group(1)
            if m.group(2):
                val += m.group(2)
            result["network"].total_addresses = parse_int(val)

    if result["network"].total_transactions is None:
        m = re.search(r'Transactions\s*\(\s*Total\s*\)\s*[^\d]*([\d,]+(?:\.\d+)?)\s*([TBMK])\b', text, re.IGNORECASE)
        if m:
            result["network"].total_transactions = parse_int(m.group(1) + m.group(2))

    if result["network"].txs_per_day is None:
        m = re.search(r'Transactions\s*\(\s*24H\s*\)\s*[^\d]*([\d,]+)\b', text, re.IGNORECASE)
        if m:
            result["network"].txs_per_day = parse_int(m.group(1))

    if result["network"].new_addresses_daily is None:
        m = re.search(r'New\s*Addresses\s*\(\s*24H\s*\)\s*[^\d]*([\d,]+)\s*\(\s*([\d.]+)\s*%\s*\)', text, re.IGNORECASE)
        if not m:
            m = re.search(r'New\s*Addresses\s*\(\s*24H\s*\)\s*[^\d]*([\d,]+)\b', text, re.IGNORECASE)
        if m:
            result["network"].new_addresses_daily = parse_int(m.group(1))
            if len(m.groups()) >= 2 and m.group(2):
                try:
                    result["network"].new_addresses_pct = float(m.group(2))
                except Exception:
                    pass

    if result["tokens"].total_token_contracts is None:
        # Try with explicit suffix first (must be word boundary after suffix)
        m = re.search(r'Tokens\s*\(\s*Total\s*\)\s*[^\d]*([\d,]+(?:\.\d+)?)\s*([TBMK])\b', text, re.IGNORECASE)
        if not m:
            # Without suffix — just a number
            m = re.search(r'Tokens\s*\(\s*Total\s*\)\s*[^\d]*([\d,]+(?:\.\d+)?)\b', text, re.IGNORECASE)
        if m:
            val = m.group(1)
            if len(m.groups()) >= 2 and m.group(2) and m.group(2).upper() in "TBMK":
                val += m.group(2)
            parsed = parse_int(val)
            if parsed is not None and parsed < 100_000_000:
                result["tokens"].total_token_contracts = parsed

    if result["transactions"].pending_txs is None:
        m = re.search(r'Pending\s*Transactions\s*\(\s*1H\s*\)\s*[^\d]*([\d,]+)\b', text, re.IGNORECASE)
        if m:
            result["transactions"].pending_txs = parse_int(m.group(1))

    if result["transactions"].total_fees_24h is None:
        # keep as a display string (native) like "267.40 native"
        m = re.search(r'Total\s*Transaction\s*Fee\s*\(\s*24H\s*\)\s*[^\d]*([\d,.]+)\s*([A-Z]{2,6})\b', text, re.IGNORECASE)
        if m:
            result["transactions"].total_fees_24h = f"{m.group(1).strip()} native"
    
    # Total / Unique Addresses
    # Old format: "Total Addresses: 381,957,257"
    # New format: "ADDRESSES (TOTAL) … 381,957,257(0.09%)"
    if result["network"].total_addresses is None:
        m = re.search(r'(?:Total\s*)?(?:Unique\s*)?Addresses?[:\s]*([\d,]+(?:\.\d+)?)\s*([TBMK])?', text, re.IGNORECASE)
        if not m:
            m = re.search(r'Addresses\s*\(\s*Total\s*\).*?([\d,]+(?:\.\d+)?)\s*([TBMK])?', text, re.IGNORECASE)
        if m:
            val = m.group(1)
            if m.group(2):
                val += m.group(2)
            result["network"].total_addresses = parse_int(val)
    
    # Active Addresses (Daily)
    # Old: "Active Addresses: 7,659,319"
    # New: "Daily Active Ethereum Addresses (7D) 7,659,319[View …]"
    if result["network"].active_addresses_daily is None:
        m = re.search(r'(?:Daily\s*)?Active\s*(?:Ethereum\s*)?Addresses?[:\s]*([\d,]+(?:\.\d+)?)\s*([TBMK])?', text, re.IGNORECASE)
        if not m:
            m = re.search(r'Daily\s*Active\s*(?:ERC20\s*)?(?:Ethereum\s*)?Addresses?\s*\(\s*7D\s*\)\s*([\d,]+)\b', text, re.IGNORECASE)
        if m:
            val = m.group(1)
            if len(m.groups()) >= 2 and m.group(2):
                val += m.group(2)
            result["network"].active_addresses_daily = parse_int(val)
    
    # Total Transactions
    # Old: "Total Transactions: 3,253.24 M"
    # New: "TRANSACTIONS (TOTAL) … 3,253.24 M (27.8 TPS)"
    if result["network"].total_transactions is None:
        m = re.search(r'(?:Total\s*)?Transactions?[:\s]*([\d,]+(?:\.\d+)?)\s*([TBMK])', text, re.IGNORECASE)
        if not m:
            m = re.search(r'Transactions\s*\(\s*Total\s*\).*?([\d,]+(?:\.\d+)?)\s*([TBMK])\b', text, re.IGNORECASE)
        if m:
            val = m.group(1) + m.group(2)
            result["network"].total_transactions = parse_int(val)
    
    # Daily Transactions (24H) — fallback (avoid broad "(24H)" capture)
    if result["network"].txs_per_day is None:
        m = re.search(r'Transactions\s*\(\s*24H\s*\).*?([\d,]+)\b', text, re.IGNORECASE)
        if m:
            result["network"].txs_per_day = parse_int(m.group(1))
    
    # TPS: 27.8 TPS
    if result["network"].tps is None:
        m = re.search(r'([\d.]+)\s*TPS', text, re.IGNORECASE)
        if m:
            result["network"].tps = float(m.group(1))
    
    # New Addresses (24H)
    # Old: "New Addresses: 326,602 (3.54%)"
    # New: "NEW ADDRESSES (24H) … 326,602(3.54%)"
    if result["network"].new_addresses_daily is None:
        m = re.search(r'New\s*Address(?:es)?[:\s]*([\d,]+)(?:\s*\(\s*([\d.]+)\s*%\s*\))?', text, re.IGNORECASE)
        if not m:
            m = re.search(r'New\s*Addresses\s*\(\s*24H\s*\).*?([\d,]+)\s*\(\s*([\d.]+)\s*%\s*\)', text, re.IGNORECASE)
        if not m:
            m = re.search(r'New\s*Addresses\s*\(\s*24H\s*\).*?([\d,]+)\b', text, re.IGNORECASE)
        if m:
            result["network"].new_addresses_daily = parse_int(m.group(1))
            if len(m.groups()) >= 2 and m.group(2):
                try:
                    result["network"].new_addresses_pct = float(m.group(2))
                except Exception:
                    pass
    
    # Transaction Fee (24H): 267.40 ETH
    m = re.search(r'(?:Transaction\s*)?(?:Network\s*)?Fee(?:s)?\s*(?:\(\s*24H?\s*\))?[:\s]*([\d,.]+)\s*(?:ETH|BNB|MATIC)', text, re.IGNORECASE)
    if m:
        result["transactions"].total_fees_24h = m.group(1).strip() + " native"
    
    # Avg Fee: $0.49
    m = re.search(r'(?:Average|Avg)\s*(?:Transaction\s*)?Fee[:\s]*\$\s*([\d,.]+)', text, re.IGNORECASE)
    if m:
        result["transactions"].avg_tx_fee_usd = parse_number(m.group(1))
    
    # Token Contracts (Total)
    if result["tokens"].total_token_contracts is None:
        # Match "Token Contracts: 20,242,091" but NOT random "Contracts" in other contexts
        # Use \b after optional suffix to avoid false suffix capture from adjacent words
        m = re.search(r'Token\s*Contracts?[:\s]*([\d,]+(?:\.\d+)?)\s*([TBMK])\b', text, re.IGNORECASE)
        if not m:
            m = re.search(r'Tokens\s*\(\s*Total\s*\)\s*[^\d]*([\d,]+(?:\.\d+)?)\s*([TBMK])\b', text, re.IGNORECASE)
        if not m:
            # Without suffix — just the number
            m = re.search(r'Token\s*Contracts?[:\s]*([\d,]+(?:\.\d+)?)\b', text, re.IGNORECASE)
        if not m:
            m = re.search(r'Tokens\s*\(\s*Total\s*\)\s*[^\d]*([\d,]+(?:\.\d+)?)\b', text, re.IGNORECASE)
        if m:
            val = m.group(1)
            if len(m.groups()) >= 2 and m.group(2) and m.group(2).upper() in "TBMK":
                val += m.group(2)
            parsed = parse_int(val)
            # Sanity: token contracts should be < 100M for any chain
            if parsed is not None and parsed < 100_000_000:
                result["tokens"].total_token_contracts = parsed
    
    # Contracts Deployed Daily: 71,608 (or "Daily Deployed Contracts Chart (7D) 71,608")
    m = re.search(r'(?:Daily\s*)?(?:Deployed\s*)?Contracts?\s*(?:Deployed\s*)?(?:Chart\s*)?(?:\(\s*\w+\s*\)\s*)?[:\s]*([\d,]+)\b', text, re.IGNORECASE)
    if m:
        val = parse_int(m.group(1))
        # Sanity: daily contract deploys should be < 10M
        if val is not None and val < 10_000_000:
            result["contracts"].new_contracts_daily = val
    
    # Verified Contracts: 1,792
    m = re.search(r'Verified\s*Contracts?[:\s]*([\d,]+)', text, re.IGNORECASE)
    if m:
        result["contracts"].verified_contracts_daily = parse_int(m.group(1))
    
    # Nodes
    if result["health"].total_nodes is None:
        m = re.search(r'(?:Total\s*)?Nodes?[:\s]*([\d,]+)', text, re.IGNORECASE)
        if not m:
            m = re.search(r'Node\s*Tracker\s*\(\s*7D\s*\)\s*([\d,]+)\s*Nodes\b', text, re.IGNORECASE)
        if m:
            result["health"].total_nodes = parse_int(m.group(1))
    
    # Network Utilization
    if result["transactions"].network_utilization_pct is None:
        m = re.search(r'(?:Network\s*)?Utilization[:\s]*([\d.]+)\s*%', text, re.IGNORECASE)
        if not m:
            m = re.search(r'Network\s*Utilization\s*Chart\s*\(\s*7D\s*\)\s*([\d.]+)\s*%\b', text, re.IGNORECASE)
        if m:
            result["transactions"].network_utilization_pct = float(m.group(1))
    
    # Pending Transactions
    if result["transactions"].pending_txs is None:
        m = re.search(r'Pending\s*(?:Transactions?|Txns?)[:\s]*([\d,]+)', text, re.IGNORECASE)
        if not m:
            m = re.search(r'Pending\s*Transactions\s*\(\s*1H\s*\).*?([\d,]+)\b', text, re.IGNORECASE)
        if m:
            result["transactions"].pending_txs = parse_int(m.group(1))
    
    # Eth Burnt: 1,188.03 ETH
    m = re.search(r'(?:Daily\s*)?(?:Eth|ETH|Token)\s*Burn(?:t|ed)?[:\s]*([\d,.]+)', text, re.IGNORECASE)
    if m:
        result["transactions"].daily_burned = m.group(1).strip()


def _extract_chart_metrics(soup: BeautifulSoup, text: str, result: dict):
    """استخراج عناوين الرسوم البيانية — كمرجع للبيانات المتاحة"""
    try:
        # جمع كل روابط الرسوم البيانية
        chart_links = soup.find_all("a", href=re.compile(r'/chart/'))
        available_charts = []
        for link in chart_links:
            chart_name = clean_text(link.get_text())
            chart_href = link.get("href", "")
            if chart_name and chart_href:
                available_charts.append({
                    "name": chart_name,
                    "url": chart_href,
                })
        
        if available_charts:
            logger.debug(f"📊 تم العثور على {len(available_charts)} رسم بياني متاح")
            
    except Exception as e:
        logger.debug(f"⚠️ خطأ استخراج الرسوم: {e}")
