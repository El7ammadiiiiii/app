"""
📈 محلل صفحات الرسوم البيانية — Etherscan Charts Parser
=====================================================
استخراج البيانات التاريخية من صفحات الرسوم البيانية الفردية
مثل /chart/tx, /chart/address, إلخ.

يستخرج سلاسل Highcharts الزمنية (التاريخ + القيمة) + الإحصائيات الفردية.
"""

import re
import json
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, List, Dict, Any
from bs4 import BeautifulSoup
from loguru import logger

from ..models import ChartTimeSeries, ChartDataPoint
from ..utils import parse_number, clean_text


@dataclass
class ChartPageData:
    """بيانات مستخرجة من صفحة الرسم البياني: السلسلة الزمنية + إحصائيات عامة"""
    series: Optional[ChartTimeSeries] = None
    total_blocks: Optional[int] = None
    total_transactions: Optional[int] = None
    verified_contracts_total: Optional[int] = None
    deployed_contracts_total: Optional[int] = None
    block_rewards_24h: Optional[float] = None


# خريطة المقاييس المدعومة
CHART_METRICS = {
    "daily_price": {"path": "/chart/etherprice", "name": "Daily Price (USD)", "unit": "USD"},
    "market_cap": {"path": "/chart/marketcap", "name": "Market Capitalization", "unit": "USD"},
    "daily_transactions": {"path": "/chart/tx", "name": "Daily Transactions", "unit": "Txns"},
    "unique_addresses": {"path": "/chart/address", "name": "Unique Addresses Growth", "unit": "Addrs"},
    "active_addresses": {"path": "/chart/active-address", "name": "Daily Active Addresses", "unit": "Addrs"},
    "avg_gas_price": {"path": "/chart/gasprice", "name": "Average Gas Price", "unit": "Gwei"},
    "avg_gas_limit": {"path": "/chart/gaslimit", "name": "Average Gas Limit", "unit": "Gas"},
    "daily_gas_used": {"path": "/chart/gasused", "name": "Daily Gas Used", "unit": "Gas"},
    "block_count_rewards": {"path": "/chart/blocks", "name": "Block Count & Rewards", "unit": "Blocks"},
    "daily_block_rewards": {"path": "/chart/blockreward", "name": "Daily Block Rewards", "unit": "Native"},
    "avg_block_size": {"path": "/chart/blocksize", "name": "Average Block Size", "unit": "Bytes"},
    "avg_block_time": {"path": "/chart/blocktime", "name": "Average Block Time", "unit": "s"},
    "network_tx_fee": {"path": "/chart/transactionfee", "name": "Network Transaction Fee", "unit": "Native"},
    "network_utilization": {"path": "/chart/networkutilization", "name": "Network Utilization", "unit": "%"},
    "pending_transactions": {"path": "/chart/pendingtx", "name": "Pending Transactions", "unit": "Txns"},
    "verified_contracts": {"path": "/chart/verified-contracts", "name": "Daily Verified Contracts", "unit": "Contracts"},
    "deployed_contracts": {"path": "/chart/deployed-contracts", "name": "Daily Deployed Contracts", "unit": "Contracts"},
    "total_supply": {"path": "/chart/ethersupplygrowth", "name": "Total Supply", "unit": "Native"},
}

def parse_chart_page(html: str, metric_key: str) -> Optional[ChartPageData]:
    """
    تحليل صفحة رسم بياني فردية واستخراج البيانات + الإحصائيات
    
    Args:
        html: محتوى HTML الخام للصفحة
        metric_key: مفتاح المقياس (مثل 'daily_transactions')
        
    Returns:
        ChartPageData يحتوي على السلسلة الزمنية وأي إحصائيات تم العثور عليها
    """
    if metric_key not in CHART_METRICS:
        return None
        
    meta = CHART_METRICS[metric_key]
    result = ChartPageData()
    
    try:
        # 1. استخراج الإحصائيات الرقمية (Scalars) من الصفحة
        soup = BeautifulSoup(html, 'html.parser')
        _extract_scalars(soup, result)

        # 2. البحث عن بيانات Highcharts
        data_points = []
        
        # محاولة 1: البحث عن المصفوفة داخل السكربتات
        scripts = re.findall(r'<script>(.*?)</script>', html, re.DOTALL)
        
        target_script = None
        for script in scripts:
            if "Highcharts.chart" in script or "series:" in script:
                if "data:" in script:
                    target_script = script
                    break
        
        # البحث عن أكبر سكربت يحتوي على بيانات الشارت
        if not target_script:
            for script in scripts:
                if "litChartData" in script or "chartData" in script:
                    target_script = script
                    break

        if not target_script:
            target_script = html

        # ═══════════════════════════════════════════
        # محاولة 0 (الأولوية): تنسيق Etherscan الحديث
        # var litChartData = [{y: 8893, dt: 'Thursday, July 30, 2015', ...}, ...]
        # ═══════════════════════════════════════════
        raw_data = None
        etherscan_objects = re.findall(
            r'(?:var|let|const)\s+(?:lit)?[Cc]hartData\s*=\s*\[(.*?)\];',
            target_script, re.DOTALL
        )
        if etherscan_objects:
            longest = max(etherscan_objects, key=len)
            # استخراج {y: ..., dt: '...', ...} objects
            obj_matches = re.findall(
                r'\{\s*y\s*:\s*([\d\.eE\+\-]+)\s*,.*?dt\s*:\s*[\'"]([^\'"]+)[\'"]',
                longest, re.DOTALL
            )
            if obj_matches:
                for val_str, date_str in obj_matches:
                    try:
                        val = float(val_str)
                        # تحويل التاريخ النصي "Thursday, July 30, 2015"
                        dt = None
                        for fmt in [
                            "%A, %B %d, %Y",      # Thursday, July 30, 2015
                            "%B %d, %Y",           # July 30, 2015
                            "%Y-%m-%d",            # 2015-07-30
                            "%m/%d/%Y",            # 07/30/2015
                        ]:
                            try:
                                dt = datetime.strptime(date_str.strip(), fmt)
                                break
                            except ValueError:
                                continue
                        if dt:
                            ts = int(dt.timestamp() * 1000)
                            data_points.append(ChartDataPoint(
                                date=dt.strftime("%Y-%m-%d"),
                                value=val,
                                timestamp=ts
                            ))
                    except (ValueError, TypeError):
                        continue
                
                if data_points:
                    logger.debug(f"✅ Etherscan object format: {len(data_points)} points")

        # ═══════════════════════════════════════════
        # محاولة 1: تنسيق Highcharts الكلاسيكي
        # data: [[timestamp, value], ...]
        # ═══════════════════════════════════════════
        raw_data = None
        if not data_points:
            # استخراج مصفوفة البيانات: يبحث عن data: [[timestamp, value], ...]
            matches = re.findall(r'data\s*:\s*(\[\[.*?\]\])', target_script, re.DOTALL)
        
            if matches:
                longest_match = max(matches, key=len)
                try:
                    # تنظيف النص ليصبح JSON صالحاً
                    json_str = longest_match.replace("'", '"')
                    # أحيانًا يكون هناك فاصلة زائدة قبل القوس المغلق
                    json_str = re.sub(r',\s*\]', ']', json_str)
                    raw_data = json.loads(json_str)
                except Exception:
                    pass

            # محاولة Regex بديلة للأزواج المباشرة
            if not raw_data:
                # نمط: [1438214400000,27713.45]
                pairs = re.findall(r'\[\s*(\d{10,13})\s*,\s*([\d\.]+)\s*\]', target_script)
                if pairs:
                    raw_data = [[int(ts), float(val)] for ts, val in pairs]

            # محاولة 3: البحث عن متغيرات Highcharts الشائعة مثل var chartData = [...]
            if not raw_data:
                matches_var = re.findall(r'(?:var|let|const)\s+\w+\s*=\s*(\[\[.*?\]\])', target_script, re.DOTALL)
                if matches_var:
                    longest = max(matches_var, key=len)
                    try:
                        raw_data = json.loads(longest.replace("'", '"'))
                    except Exception:
                        pass

            if raw_data and isinstance(raw_data, list):
                # ترتيب البيانات وتصفيتها
                raw_data.sort(key=lambda x: x[0] if isinstance(x, list) and len(x) > 0 else 0)
                
                # نأخذ آخر 180 يوم لتوفير المساحة
                cutoff_index = max(0, len(raw_data) - 180)
                recent_data = raw_data[cutoff_index:]
                
                for point in recent_data:
                    if isinstance(point, list) and len(point) >= 2:
                        ts = point[0]
                        val = point[1]
                        
                        try:
                            dt = datetime.fromtimestamp(ts / 1000.0)
                            date_str = dt.strftime("%Y-%m-%d")
                            
                            data_points.append(ChartDataPoint(
                                date=date_str,
                                value=float(val),
                                timestamp=ts
                            ))
                        except Exception:
                            continue

        if data_points:
            # ترتيب وتقليص البيانات إلى آخر 180 يوم
            data_points.sort(key=lambda p: p.timestamp if p.timestamp else 0)
            if len(data_points) > 180:
                data_points = data_points[-180:]
            
            result.series = ChartTimeSeries(
                metric_key=metric_key,
                metric_name=meta["name"],
                data=data_points,
                unit=meta["unit"],
                description=f"Extracted from {meta['path']}"
            )
        else:
            logger.warning(f"⚠️ No chart data extracted for {metric_key}")

        return result

    except Exception as e:
        logger.error(f"❌ Error parsing chart {metric_key}: {e}")
        return result

def _extract_scalars(soup: BeautifulSoup, result: ChartPageData):
    """
    استخراج القيم المفردة (Totals) من مربعات المعلومات في أعلى الصفحة
    """
    try:
        text_content = soup.get_text(" ", strip=True)
        
        # Helper helpers
        def find_metric(labels: List[str]) -> Optional[str]:
            for label in labels:
                pattern = re.escape(label) + r'[:\s]+([\d,]+(\.\d+)?)'
                match = re.search(pattern, text_content, re.IGNORECASE)
                if match:
                    return match.group(1)
            return None

        # 1. Total Blocks
        val = find_metric(["Total Blocks", "Highest Block"])
        if val:
            result.total_blocks = int(parse_number(val))

        # 2. Total Transactions
        val = find_metric(["Total Transactions", "Total Txns"])
        if val:
            result.total_transactions = int(parse_number(val))

        # 3. Verified Contracts
        val = find_metric(["Verified Contracts", "Total Verified Contracts"])
        if val:
            result.verified_contracts_total = int(parse_number(val))

        # 4. Deployed Contracts
        val = find_metric(["Total Contracts Deployed", "Total Deployed Contracts"])
        if val:
            result.deployed_contracts_total = int(parse_number(val))
            
        # 5. Block Rewards (24h)
        rewards_match = re.search(r'Block Rewards \(24h\)[:\s]+([\d,]+\.?\d*)', text_content, re.IGNORECASE)
        if rewards_match:
            result.block_rewards_24h = float(parse_number(rewards_match.group(1)))
            
    except Exception as e:
        logger.debug(f"Scalar extraction warning: {e}")

