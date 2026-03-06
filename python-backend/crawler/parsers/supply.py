"""
💎 محلل صفحة المعروض — Etherscan /stat/supply Parser
=======================================================
يستخرج: إجمالي المعروض مع التفاصيل (تعدين، ستاكينغ، حرق، Genesis)
"""

import re
from bs4 import BeautifulSoup
from loguru import logger

from ..models import WalletMetrics
from ..utils import parse_number, clean_text


def parse_supply(soup: BeautifulSoup) -> dict:
    """
    تحليل صفحة /stat/supply.
    
    Returns:
        dict مع مفتاح: wallets (WalletMetrics)
    """
    result = {"wallets": WalletMetrics()}
    
    try:
        text = soup.get_text(" ", strip=True)
        
        # إجمالي المعروض: 120,692,631.85 Ether
        m = re.search(r'(?:Total\s*Supply|Ether\s*Supply)[:\s]*([\d,]+(?:\.\d+)?)\s*(?:Ether|ETH|BNB|MATIC)', text, re.IGNORECASE)
        if m:
            result["wallets"].total_supply = parse_number(m.group(1))
        
        # تفاصيل المعروض
        details = {}
        
        # Genesis Supply
        m = re.search(r'Genesis[:\s]*([\d,]+(?:\.\d+)?)', text, re.IGNORECASE)
        if m:
            details["genesis"] = parse_number(m.group(1))
        
        # Mining / PoW Rewards
        m = re.search(r'(?:Mining|PoW)\s*(?:Rewards?)?[:\s]*([\d,]+(?:\.\d+)?)', text, re.IGNORECASE)
        if m:
            details["mining_rewards"] = parse_number(m.group(1))
        
        # Staking / Eth2 Rewards
        m = re.search(r'(?:Staking|Eth2|PoS|Beacon)\s*(?:Rewards?)?[:\s]*([\d,]+(?:\.\d+)?)', text, re.IGNORECASE)
        if m:
            details["staking_rewards"] = parse_number(m.group(1))
        
        # Burnt
        m = re.search(r'(?:Burn[st]?|EIP.?1559)[:\s]*([\d,]+(?:\.\d+)?)', text, re.IGNORECASE)
        if m:
            details["burnt"] = parse_number(m.group(1))
        
        result["wallets"].supply_details = details
        
        if result["wallets"].total_supply:
            logger.info(f"✅ إجمالي المعروض: {result['wallets'].total_supply:,.2f}")
        
    except Exception as e:
        logger.error(f"❌ خطأ في تحليل /stat/supply: {e}")
    
    return result
