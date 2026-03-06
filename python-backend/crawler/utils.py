"""
🔧 أدوات مساعدة للزاحف
"""

import re
import random
from typing import Optional
from .config import USER_AGENTS


def get_random_user_agent() -> str:
    """اختيار User-Agent عشوائي"""
    return random.choice(USER_AGENTS)


def get_request_headers(referer: Optional[str] = None) -> dict:
    """بناء ترويسات HTTP تشبه المتصفح الحقيقي"""
    headers = {
        "User-Agent": get_random_user_agent(),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Cache-Control": "max-age=0",
    }
    if referer:
        headers["Referer"] = referer
        headers["Sec-Fetch-Site"] = "same-origin"
    return headers


def parse_number(text: str) -> Optional[float]:
    """
    تحويل نص رقمي إلى float.
    يتعامل مع: "381,957,257" / "$253.19B" / "27.0" / "50.7%" / "267.40 ETH"
    """
    if not text or not isinstance(text, str):
        return None
    
    text = text.strip()
    if not text:
        return None

    # إزالة رموز العملات
    text = text.replace("$", "").replace("€", "").replace("£", "")
    # إزالة أسماء العملات الرقمية في النهاية
    text = re.sub(r'\s*(ETH|BTC|MATIC|BNB|GWEI|Gwei|gwei|Ether|Wei)\s*$', '', text, flags=re.IGNORECASE)
    # إزالة النسبة المئوية
    text = text.replace("%", "").strip()
    # إزالة + و أحرف عشوائية
    text = text.replace("+", "").replace("−", "-").replace("–", "-")

    # التعامل مع المضاعفات K, M, B, T
    multiplier = 1.0
    text_upper = text.upper().strip()
    if text_upper.endswith("T"):
        multiplier = 1e12
        text = text[:-1]
    elif text_upper.endswith("B"):
        multiplier = 1e9
        text = text[:-1]
    elif text_upper.endswith("M"):
        multiplier = 1e6
        text = text[:-1]
    elif text_upper.endswith("K"):
        multiplier = 1e3
        text = text[:-1]

    # إزالة الفواصل
    text = text.replace(",", "").strip()

    # التعامل مع الأقواس (أرقام سالبة)
    if text.startswith("(") and text.endswith(")"):
        text = "-" + text[1:-1]

    try:
        return float(text) * multiplier
    except (ValueError, TypeError):
        return None


def parse_int(text: str) -> Optional[int]:
    """تحويل نص إلى عدد صحيح"""
    val = parse_number(text)
    if val is not None:
        return int(val)
    return None


def parse_percentage(text: str) -> Optional[float]:
    """استخراج نسبة مئوية من نص. المدخل: '3.54%' → 3.54"""
    if not text:
        return None
    text = text.strip().replace("%", "").replace("+", "")
    try:
        return float(text.replace(",", ""))
    except (ValueError, TypeError):
        return None


def clean_text(text: str) -> str:
    """تنظيف نص من المسافات الزائدة"""
    if not text:
        return ""
    return re.sub(r'\s+', ' ', text).strip()


def extract_between(text: str, start: str, end: str) -> Optional[str]:
    """استخراج نص بين علامتين"""
    try:
        s = text.index(start) + len(start)
        e = text.index(end, s)
        return text[s:e]
    except (ValueError, IndexError):
        return None


def safe_divide(a: Optional[float], b: Optional[float]) -> Optional[float]:
    """قسمة آمنة"""
    if a is None or b is None or b == 0:
        return None
    return a / b
