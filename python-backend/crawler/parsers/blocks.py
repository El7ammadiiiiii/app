"""
🧱 محلل صفحة البلوكات — Etherscan /blocks Parser
====================================================
يستخرج: بلوكات حديثة مع تفاصيل (معاملات، فشل، غاز، مكافأة، Builder)
"""

import re
from typing import List
from bs4 import BeautifulSoup
from loguru import logger

from ..models import BlockInfo
from ..utils import parse_number, parse_int, clean_text


def parse_blocks(soup: BeautifulSoup) -> dict:
    """
    تحليل صفحة /blocks.
    
    Returns:
        dict مع مفتاح: recent_blocks (List[BlockInfo])
    """
    result = {"recent_blocks": []}
    
    try:
        blocks = _extract_blocks_table(soup)
        result["recent_blocks"] = blocks
        
        if blocks:
            logger.info(f"✅ تم استخراج {len(blocks)} بلوك")
            
    except Exception as e:
        logger.error(f"❌ خطأ في تحليل /blocks: {e}")
    
    return result


def _extract_blocks_table(soup: BeautifulSoup) -> List[BlockInfo]:
    """استخراج جدول البلوكات"""
    blocks = []
    
    table = soup.find("table")
    if not table:
        logger.warning("⚠️ لم يتم العثور على جدول البلوكات")
        return blocks
    
    rows = table.find_all("tr")
    
    for row in rows:
        cells = row.find_all("td")
        if len(cells) < 3:
            continue
        
        try:
            block = BlockInfo()
            row_text = clean_text(row.get_text())
            
            # رقم البلوك
            block_link = row.find("a", href=re.compile(r'/block/\d+'))
            if block_link:
                m = re.search(r'/block/(\d+)', block_link.get("href", ""))
                if m:
                    block.number = int(m.group(1))
            
            # عدد المعاملات
            txn_match = re.search(r'(\d+)\s*txn', row_text, re.IGNORECASE)
            if txn_match:
                block.txn_count = int(txn_match.group(1))
            
            # Gas Used / Gas Limit: "25,100,647 (41.83%) / 60,000,000"
            # !! يجب أن يكون قبل failed_match لتجنب التقاط gas_used كـ failed
            gas_match = re.search(
                r'([\d,]+)\s*\(\s*([\d.]+)\s*%\s*\)\s*/\s*([\d,]+)',
                row_text
            )
            gas_used_value = None
            if gas_match:
                gas_used_value = parse_int(gas_match.group(1))
                block.gas_used = gas_used_value
                block.gas_used_pct = float(gas_match.group(2))
                block.gas_limit = parse_int(gas_match.group(3))
            
            # المعاملات الفاشلة: "5(24%)" أو "0(0%)"
            # يعمل فقط على الأرقام الصغيرة — تجاهل الأرقام > 1M (هذه gas_used)
            for m in re.finditer(r'(\d+)\s*\(\s*([\d.]+)\s*%\s*\)', row_text):
                val = int(m.group(1))
                # تجاهل القيم الكبيرة: هذه gas_used وليست failed
                if val > 1_000_000:
                    continue
                # تجاهل إذا كانت نفس gas_used
                if gas_used_value is not None and val == gas_used_value:
                    continue
                block.failed_txn_count = val
                block.failed_pct = float(m.group(2))
                break
            
            # المكافأة
            reward_match = re.search(r'([\d.]+)\s*(?:ETH|BNB|MATIC|Ether)', row_text, re.IGNORECASE)
            if reward_match:
                block.reward = parse_number(reward_match.group(1))
            
            # الوقت
            time_match = re.search(r'(\d+\s*(?:sec|min|hr)s?\s*ago)', row_text, re.IGNORECASE)
            if time_match:
                block.timestamp = time_match.group(1)
            
            # Builder / Validator
            fee_recipient = row.find("a", href=re.compile(r'/address/'))
            if fee_recipient:
                builder_text = clean_text(fee_recipient.get_text())
                if not builder_text.startswith("0x") or len(builder_text) < 42:
                    block.builder = builder_text
            
            if block.number > 0:
                blocks.append(block)
                
        except Exception as e:
            logger.debug(f"⚠️ خطأ في صف بلوك: {e}")
            continue
    
    return blocks
