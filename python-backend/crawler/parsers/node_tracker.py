"""
🌐 محلل صفحة متعقب العُقد — Etherscan /nodetracker Parser
============================================================
يستخرج: عدد العُقد، التوزيع الجغرافي، أنظمة التشغيل، النمو
"""

import re
from typing import List, Dict, Any
from bs4 import BeautifulSoup
from loguru import logger

from ..models import NetworkHealth
from ..utils import parse_number, parse_int, parse_percentage, clean_text


def parse_node_tracker(soup: BeautifulSoup) -> dict:
    """
    تحليل صفحة /nodetracker.
    
    Returns:
        dict مع مفتاح: health (NetworkHealth)
    """
    result = {"health": NetworkHealth()}
    
    try:
        text = soup.get_text(" ", strip=True)
        
        # عدد العُقد: 13,708 nodes found
        m = re.search(r'([\d,]+)\s*(?:nodes?\s*found|Total\s*Nodes?)', text, re.IGNORECASE)
        if m:
            result["health"].total_nodes = parse_int(m.group(1))
        
        # النمو
        # 0.60% (24h) | 1.23% (7d) | 17.32% (30d)
        growth_24h = re.search(r'([\d.]+)\s*%\s*(?:\(\s*24\s*h?\s*\)|24\s*h)', text, re.IGNORECASE)
        if growth_24h:
            result["health"].node_growth_24h_pct = float(growth_24h.group(1))
        
        growth_7d = re.search(r'([\d.]+)\s*%\s*(?:\(\s*7\s*d?\s*\)|7\s*d)', text, re.IGNORECASE)
        if growth_7d:
            result["health"].node_growth_7d_pct = float(growth_7d.group(1))
        
        growth_30d = re.search(r'([\d.]+)\s*%\s*(?:\(\s*30\s*d?\s*\)|30\s*d)', text, re.IGNORECASE)
        if growth_30d:
            result["health"].node_growth_30d_pct = float(growth_30d.group(1))
        
        # التوزيع الجغرافي
        _extract_countries(soup, result)
        
        # توزيع البرامج (Clients)
        _extract_clients(soup, result)
        
        if result["health"].total_nodes:
            logger.info(f"✅ عدد العُقد: {result['health'].total_nodes:,}")
        
    except Exception as e:
        logger.error(f"❌ خطأ في تحليل /nodetracker: {e}")
    
    return result


def _extract_countries(soup: BeautifulSoup, result: dict):
    """استخراج التوزيع الجغرافي للعُقد"""
    try:
        countries = []
        # البحث عن جدول أو قائمة الدول
        # النمط: "United States 5,617 (40.67%)"
        text = soup.get_text(" ", strip=True)
        
        country_patterns = re.findall(
            r'([A-Z][a-zA-Z\s]+?)\s+([\d,]+)\s*\(\s*([\d.]+)\s*%\s*\)',
            text
        )
        
        for name, count, pct in country_patterns[:10]:
            name = name.strip()
            if len(name) > 2 and not any(kw in name.lower() for kw in ["node", "total", "block", "transaction"]):
                countries.append({
                    "country": name,
                    "count": parse_int(count),
                    "percentage": float(pct),
                })
        
        result["health"].top_countries = countries
        
    except Exception as e:
        logger.debug(f"⚠️ خطأ استخراج الدول: {e}")


def _extract_clients(soup: BeautifulSoup, result: dict):
    """استخراج توزيع البرامج"""
    try:
        clients = []
        text = soup.get_text(" ", strip=True)
        
        # النمط: "Geth/v1.14.12 3,258 (23.76%)"
        client_patterns = re.findall(
            r'((?:Geth|reth|erigon|Nethermind|Besu|OpenEthereum|Parity)[/\w.-]*)\s+([\d,]+)\s*\(\s*([\d.]+)\s*%\s*\)',
            text, re.IGNORECASE
        )
        
        for name, count, pct in client_patterns[:10]:
            clients.append({
                "client": name.strip(),
                "count": parse_int(count),
                "percentage": float(pct),
            })
        
        result["health"].top_clients = clients
        
    except Exception as e:
        logger.debug(f"⚠️ خطأ استخراج العملاء: {e}")
